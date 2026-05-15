import * as vscode from "vscode";
import { SecondarySidebarProvider } from "./providers/SecondarySideBarProvider";
import { ReviewCodeLensProvider } from "./providers/CodeLensProvider";
import { extractFunctionAt } from "./utils/extractFunction";

export function activate(context: vscode.ExtensionContext) {
  const chatProvider = new SecondarySidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("mySecondaryView", chatProvider),
  );

  // This command fires when user clicks the activity bar icon
  // Commands to open/focus the secondary sidebar view
  context.subscriptions.push(
    vscode.commands.registerCommand("myChat.open", async () => {
      // Toggle: if the view is visible, close the auxiliary bar; otherwise open+focus it
      try {
        const isVisible = chatProvider.isVisible;

        if (isVisible) {
          // Close the auxiliary bar
          await vscode.commands.executeCommand(
            "workbench.action.toggleAuxiliaryBar",
          );
        } else {
          // Reveal the container first, then focus the auxiliary bar so our view appears
          await vscode.commands.executeCommand(
            "workbench.view.extension.mySecondaryContainer",
          );
          // short delay to allow VS Code to reveal the container before focusing
          await new Promise((r) => setTimeout(r, 80));
          await vscode.commands.executeCommand(
            "workbench.action.focusAuxiliaryBar",
          );
        }
      } catch (e) {
        console.error("Error toggling secondary sidebar", e);
      }
    }),
  );

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
          await vscode.commands.executeCommand(
            "workbench.view.extension.mySecondaryContainer",
          );
          await new Promise((r) => setTimeout(r, 80));
          await vscode.commands.executeCommand(
            "workbench.action.focusAuxiliaryBar",
          );
        }

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
