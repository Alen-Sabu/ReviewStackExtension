import * as vscode from "vscode";
import { CONFIG } from "../utils/config";

const ACCESS_KEY = "reviewstack.accessToken";
const REFRESH_KEY = "reviewstack.refreshToken";
const GITHUB_SCOPES = ["read:user", "user:email"];

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
};

export class AuthService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async ensureSignedIn(): Promise<boolean> {
    if (await this.trySilentSignIn()) {
      return true;
    }

    try {
      await this.signIn();
      return true;
    } catch {
      return false;
    }
  }

  async signIn(): Promise<void> {
    const session = await vscode.authentication.getSession(
      "github",
      GITHUB_SCOPES,
      { createIfNone: true },
    );

    if (!session?.accessToken) {
      throw new Error("Github sign-in was cancelled");
    }

    await this.exchangeGithubToken(session.accessToken);
  }

  async getAccessToken(): Promise<string | undefined> {
    return this.context.secrets.get(ACCESS_KEY);
  }

  async isSignedIn(): Promise<boolean> {
    return !!(await this.getAccessToken());
  }

  async signOut(): Promise<void> {
    await this.context.secrets.delete(ACCESS_KEY);
    await this.context.secrets.delete(REFRESH_KEY);
  }

  async authFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const doFetch = async (accessToken: string | undefined) => {
      const headers = new Headers(init.headers);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return fetch(url, { ...init, headers });
    };

    let access = await this.getAccessToken();
    let res = await doFetch(access);

    if (res.status !== 401) {
      return res;
    }

    const refreshed = await this.tryRefresh();
    if (!refreshed) {
      await this.signOut();
      throw new Error("Session expired. Please sign in again");
    }

    access = await this.getAccessToken();
    res = await doFetch(access);
    if (res.status === 401) {
      await this.signOut();
      throw new Error("Session expired. Please sign in again");
    }
    return res;
  }

  async trySilentSignIn(): Promise<boolean> {
    if (await this.isSignedIn()) {
        return true; 
    }

    try {
        const session = await vscode.authentication.getSession(
            "github",
            GITHUB_SCOPES, 
            { createIfNone: false },
        );
        
        if(!session?.accessToken) {
            return false; 
        }

        await this.exchangeGithubToken(session.accessToken); 
        return true; 
    } catch {
        return false; 
    }
  }

  private async exchangeGithubToken(githubAccessToken: string): Promise<void> {
    const res = await fetch(`${CONFIG.serverUrl}/auth/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: githubAccessToken }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || "Failed to sign in");
    }

    const data = (await res.json()) as TokenResponse;
    await this.context.secrets.store(ACCESS_KEY, data.access_token);
    await this.context.secrets.store(REFRESH_KEY, data.refresh_token);
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = await this.context.secrets.get(REFRESH_KEY);
    if (!refresh) {
      return false;
    }

    try {
      const res = await fetch(`${CONFIG.serverUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as { access_token: string };
      await this.context.secrets.store(ACCESS_KEY, data.access_token);
      return true;
    } catch {
      return false;
    }
  }
}
