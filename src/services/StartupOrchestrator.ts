import { StatusBarManager } from "../managers/StatusBarManager";
import { AuthService } from "./AuthService";
import { IndexingService } from "./IndexingService";
import { ProviderConfigService } from "./ProviderConfigService";

export class StartupOrchestrator {
  constructor(
    private readonly auth: AuthService,
    private readonly providerConfig: ProviderConfigService,
    private readonly indexing: IndexingService,
    private readonly statusBar: StatusBarManager,
  ) {}

  async run(): Promise<void> {
    const signedIn = await this.auth.trySilentSignIn();
    if (!signedIn) {
      this.statusBar.setError("Sign in to GitHub to use ReviewStack");
      return;
    }

    if (await this.providerConfig.isOnboardingComplete()) {
      this.indexing.start();
    }
  }
}
