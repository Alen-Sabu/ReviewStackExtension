import * as vscode from "vscode";
import { SecondarySidebarProvider } from "./providers/SecondarySideBarProvider";
import { ReviewCodeLensProvider } from "./providers/CodeLensProvider";
import { ProviderConfigService } from "./services/ProviderConfigService";
import { extractFunctionAt } from "./utils/extractFunction";
import { indexRepo } from "./utils/api";
import { StatusBarManager } from "./managers/StatusBarManager";
import { DecorationManager } from "./managers/DecorationManager";

export function activate(context: vscode.ExtensionContext) {
  // status bar
  const statusBar = new StatusBarManager();
  const decorationManager = new DecorationManager();

  context.subscriptions.push(statusBar);
  context.subscriptions.push(decorationManager);

  // Index the repo on activation
  const folders = vscode.workspace.workspaceFolders;
  const repoPath = folders?.[0]?.uri?.fsPath ?? "";

  if (repoPath) {
    statusBar.setIndexing();
    indexRepo(repoPath)
      .then((fileCount) => statusBar.setReady(fileCount))
      .catch((e) =>
        statusBar.setError(e instanceof Error ? e.message : String(e)),
      );
  }

  const providerConfig = new ProviderConfigService(context);
  const chatProvider = new SecondarySidebarProvider(
    context.extensionUri,
    repoPath,
    statusBar,
    decorationManager,
    providerConfig,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("reviewstackView", chatProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("myChat.open", async () => {
      try {
        if (chatProvider.isVisible) {
          await vscode.commands.executeCommand(
            "workbench.action.toggleAuxiliaryBar",
          );
        } else {
          await openSecondarySidebar();
        }
      } catch (e) {
        console.error("Error toggling secondary sidebar", e);
      }
    }),
  );

  async function openSecondarySidebar(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.view.extension.reviewstackContainer",
    );
    await new Promise((r) => setTimeout(r, 80));
    await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
  }

  const codeLensProvider = new ReviewCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: "python" },
        { language: "typescript" },
        { language: "javascript" },
        { language: "typescriptreact" },
        { language: "javascriptreact" },
      ],
      codeLensProvider,
    ),
  );

  // Refresh lenses on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      codeLensProvider.refresh();
    }),
  );

  // Re-index if user saves any file
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      if (repoPath){
        indexRepo(repoPath)
          .then((fileCount) => statusBar.setReady(fileCount))
          .catch((e) =>
            statusBar.setError(e instanceof Error ? e.message : String(e)),
          );
      } 
    }),
  );

  // review function command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "reviewstack.reviewFunction",
      async (document: vscode.TextDocument, line: number) => {
        const functionCode = extractFunctionAt(document, line);
        const filePath = document.uri.fsPath;
        const language = document.languageId;

        // Send functionCode to your secondary sidebar or AI API for review
        if (!chatProvider.isVisible) {
          await openSecondarySidebar();
        }

        statusBar.setReviewing();

        // send function to sidebar
        chatProvider.sendMessage({
          type: "reviewFunction",
          payload: {
            code: functionCode,
            filePath,
            language,
          },
        });
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("reviewstack.dismissLens", () => {
      // No action needed, just a placeholder for the dismiss command
    }),
  );
}

export function deactivate() {}
