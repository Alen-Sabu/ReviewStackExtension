import * as vscode from "vscode";
import { ProviderConfig, ProviderId } from "../types/provider";
import { CONFIG } from "../utils/config";

export class ProviderConfigService {
  constructor(private context: vscode.ExtensionContext) {}

  isOnboardingCompleteSync(): boolean {
    return this.context.globalState.get("reviewstack.onboardingComplete", false);
  }

  async isOnboardingComplete(): Promise<boolean> {
    return this.context.globalState.get("reviewstack.onboardingComplete", false);
  }

  async getConfig(): Promise<ProviderConfig | null> {
    const config = this.context.globalState.get("reviewstack.config") as
      | ProviderConfig
      | undefined;
    return config ?? null;
  }

  async saveConfig(config: ProviderConfig, apiKey?: string): Promise<void> {
    if (apiKey) {
      await this.context.secrets.store(
        `reviewstack.apiKey.${config.provider}`,
        apiKey,
      );
    }
    await this.context.globalState.update("reviewstack.config", config);
    await this.context.globalState.update("reviewstack.onboardingComplete", true);
    await syncProviderToBackend(config, apiKey);
  }

  async getApiKey(provider: ProviderId): Promise<string | undefined> {
    return this.context.secrets.get(`reviewstack.apiKey.${provider}`);
  }
}

async function syncProviderToBackend(
  config: ProviderConfig,
  apiKey?: string,
): Promise<void> {
  try {
    const body: Record<string, string | undefined> = {
      provider: config.provider,
      model: config.model,
      base_url: config.baseUrl,
    };
    if (apiKey) {
      body.api_key = apiKey;
    }

    const response = await fetch(`${CONFIG.serverUrl}/settings/provider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Failed to sync provider to backend: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to sync provider to backend:", error);
  }
}
