import * as vscode from "vscode";
import { ReviewPipeline } from "../review/ReviewPipeline";
import { ReviewStore } from "../store/ReviewStore";
import { CommitHistoryProvider } from "../views/CommitHistoryProvider";

export function registerCommands(
  store: ReviewStore,
  history: CommitHistoryProvider,
  pipeline: ReviewPipeline,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(
      "reviewstack.reviewLastCommit",
      async () => {
        try {
          await pipeline.reviewHead({ interactive: true });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(
            `Failed to review last commit: ${message}`,
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "reviewstack.openReviewsFolder",
      async () => {
        await store.ensureInitialized();
        await vscode.commands.executeCommand(
          "revealFileInOS",
          vscode.Uri.file(store.rootDir),
        );
      },
    ),
    vscode.commands.registerCommand(
      "reviewstack.openReview",
      async (shortHash?: string) => {
        if (!shortHash || typeof shortHash !== "string") {
          return;
        }

        const uri = await store.getReviewUri(shortHash);
        if (!uri) {
          void vscode.window.showWarningMessage(
            `No review.md for ${shortHash}`,
          );
          return;
        }

        const openEditor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.fsPath === uri.fsPath,
        );
        if (openEditor) {
          await vscode.window.showTextDocument(
            openEditor.document,
            openEditor.viewColumn,
          );
          return;
        }

        try {
          await vscode.window.showTextDocument(uri, {
            preview: false,
            preserveFocus: false,
          });
        } catch {
          // ignore race from rapid clicks
        }
      },
    ),
    vscode.commands.registerCommand("reviewstack.enable", async () => {
      await store.setEnabled(true);
      history.refresh();
      void vscode.window.showInformationMessage("ReviewStack enabled");
    }),
    vscode.commands.registerCommand("reviewstack.disable", async () => {
      await store.setEnabled(false);
      void vscode.window.showInformationMessage("ReviewStack disabled");
    }),
  ];
}
