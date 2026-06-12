import * as vscode from "vscode";
import { ProviderConfig, ProviderId } from "../types/provider";

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
    await syncProviderToBackend(config);
  }

  async getApiKey(provider: ProviderId): Promise<string | undefined> {
    return this.context.secrets.get(`reviewstack.apiKey.${provider}`);
  }
}

async function syncProviderToBackend(_config: ProviderConfig): Promise<void> {
  // Backend sync will be wired when the provider API endpoint is available.
}
