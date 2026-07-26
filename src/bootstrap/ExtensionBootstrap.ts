import * as vscode from "vscode";
import { registerCommands } from "../commands/registerCommands";
import { DiffService } from "../git/DiffService";
import { GitCommitWatcher } from "../git/GitCommitWatcher";
import { ReviewPipeline } from "../review/ReviewPipeline";
import { ReviewStore } from "../store/ReviewStore";
import { CommitHistoryProvider } from "../views/CommitHistoryProvider";

export class ExtensionBootstrap implements vscode.Disposable {
  private started = false;

  private constructor(private readonly context: vscode.ExtensionContext) {}

  static create(context: vscode.ExtensionContext): ExtensionBootstrap {
    return new ExtensionBootstrap(context);
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      void vscode.window.showWarningMessage(
        "Open a folder to use ReviewStack",
      );
      return;
    }

    const store = new ReviewStore(root);
    const diff = new DiffService(root);
    const history = new CommitHistoryProvider(store);

    const statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    statusBar.text = "$(check) ReviewStack";
    statusBar.tooltip = "ReviewStack: Review Last Commit";
    statusBar.command = "reviewstack.reviewLastCommit";
    statusBar.show();

    const pipeline = new ReviewPipeline(store, diff, history, statusBar);
    const watcher = new GitCommitWatcher(root, diff);

    void store.ensureInitialized().then(async () => {
      const config = await store.getConfig();
      diff.setMaxDiffBytes(config.maxDiffBytes);
    });

    const treeView = vscode.window.createTreeView("reviewstack.commitHistory", {
      treeDataProvider: history,
      showCollapseAll: false,
    });

    watcher.onCommit(() => {
      void pipeline.reviewHead({ interactive: false }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showWarningMessage(
          `ReviewStack auto-review failed: ${message}`,
        );
      });
    });
    void watcher.start();

    this.context.subscriptions.push(
      treeView,
      watcher,
      statusBar,
      ...registerCommands(store, history, pipeline),
    );
  }

  dispose(): void {}
}
