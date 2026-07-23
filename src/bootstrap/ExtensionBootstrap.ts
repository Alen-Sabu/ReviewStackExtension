import * as vscode from "vscode";
import { ApiClient } from "../api/ApiClient";
import { registerCommands } from "../commands/registerCommands";
import { registerListeners } from "../listeners/registerListeners";
import { DecorationManager } from "../managers/DecorationManager";
import { StatusBarManager } from "../managers/StatusBarManager";
import { ReviewCodeLensProvider } from "../providers/CodeLensProvider";
import { registerProviders } from "../providers/registerProviders";
import { SecondarySidebarProvider } from "../providers/SecondarySideBarProvider";
import { AuthService } from "../services/AuthService";
import { IndexingService } from "../services/IndexingService";
import { ProviderConfigService } from "../services/ProviderConfigService";
import { ReviewSession } from "../services/ReviewSession";
import { StartupOrchestrator } from "../services/StartupOrchestrator";

export class ExtensionBootstrap implements vscode.Disposable {
  private started = false;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly statusBar: StatusBarManager,
    private readonly decorationManager: DecorationManager,
    private readonly auth: AuthService,
    private readonly api: ApiClient,
    private readonly providerConfig: ProviderConfigService,
    private readonly indexing: IndexingService,
    private readonly startup: StartupOrchestrator,
  ) {}

  static create(context: vscode.ExtensionContext): ExtensionBootstrap {
    const repoPath =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    const statusBar = new StatusBarManager();
    const decorationManager = new DecorationManager();
    const auth = new AuthService(context);
    const api = new ApiClient(auth);
    const providerConfig = new ProviderConfigService(context, auth);
    const indexing = new IndexingService(
      repoPath,
      api,
      statusBar,
      auth,
      providerConfig,
    );
    const startup = new StartupOrchestrator(
      auth,
      providerConfig,
      indexing,
      statusBar,
    );

    return new ExtensionBootstrap(
      context,
      statusBar,
      decorationManager,
      auth,
      api,
      providerConfig,
      indexing,
      startup,
    );
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const repoPath =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    const codeLensProvider = new ReviewCodeLensProvider();
    const sidebar = new SecondarySidebarProvider(
      this.context.extensionUri,
      repoPath,
      this.statusBar,
      this.decorationManager,
      this.providerConfig,
      new ReviewSession(),
      this.auth,
      this.api,
      () => this.indexing.start(),
    );

    this.context.subscriptions.push(
      ...registerProviders(sidebar, codeLensProvider),
      ...registerCommands({
        auth: this.auth,
        sidebar,
        startup: this.startup,
        statusBar: this.statusBar,
        providerConfig: this.providerConfig,
      }),
      ...registerListeners(codeLensProvider, this.indexing),
    );

    void this.startup.run();
  }

  dispose(): void {
    this.statusBar.dispose();
    this.decorationManager.dispose();
  }
}
