import { ApiClient } from "../api/ApiClient";
import { StatusBarManager } from "../managers/StatusBarManager";
import { AuthService } from "./AuthService";
import { ProviderConfigService } from "./ProviderConfigService";

export class IndexingService {
  constructor(
    private readonly repoPath: string,
    private readonly api: ApiClient,
    private readonly statusBar: StatusBarManager,
    private readonly auth: AuthService,
    private readonly providerConfig: ProviderConfigService,
  ) {}

  start(): void {
    if (!this.repoPath) {
      return;
    }

    this.statusBar.setIndexing();
    void this.api
      .indexRepo(this.repoPath)
      .then((fileCount) => this.statusBar.setReady(fileCount))
      .catch((error: unknown) =>
        this.statusBar.setError(
          error instanceof Error ? error.message : String(error),
        ),
      );
  }

  async reindexIfReady(): Promise<void> {
    if (
      !this.repoPath ||
      !(await this.auth.isSignedIn()) ||
      !(await this.providerConfig.isOnboardingComplete())
    ) {
      return;
    }

    this.start();
  }
}
