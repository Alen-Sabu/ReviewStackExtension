import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { DiffService } from "./DiffService";

/**
 * Detects new commits via .git file changes, but only notifies listeners
 * when the latest reflog entry is a real `git commit` (not checkout/switch).
 */
export class GitCommitWatcher implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private lastHash: string | undefined;
  private timer: NodeJS.Timeout | undefined;
  private readonly listeners: Array<(hash: string) => void> = [];

  constructor(
    private readonly workspaceRoot: string,
    private readonly diff: DiffService,
  ) {}

  async start(): Promise<void> {
    try {
      const head = await this.diff.getHeadCommit();
      this.lastHash = head.commitHash;
    } catch {
      this.lastHash = undefined;
    }

    const gitDir = path.join(this.workspaceRoot, ".git");
    if (!fs.existsSync(gitDir)) {
      return;
    }

    const headWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, ".git/HEAD"),
    );
    const refWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, ".git/refs/heads/**"),
    );

    const onMaybeCommit = () => this.scheduleCheck();

    this.disposables.push(
      headWatcher,
      refWatcher,
      headWatcher.onDidChange(onMaybeCommit),
      headWatcher.onDidCreate(onMaybeCommit),
      refWatcher.onDidChange(onMaybeCommit),
      refWatcher.onDidCreate(onMaybeCommit),
    );
  }

  onCommit(listener: (fullHash: string) => void): void {
    this.listeners.push(listener);
  }

  private scheduleCheck(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.checkHead(), 500);
  }

  private async checkHead(): Promise<void> {
    try {
      const head = await this.diff.getHeadCommit();
      if (head.commitHash === this.lastHash) {
        return;
      }

      // Always track HEAD so branch switches don't false-trigger later
      this.lastHash = head.commitHash;

      // Skip checkout / reset / merge / rebase — only plain commit or amend
      if (!(await this.diff.wasLastReflogACommit())) {
        return;
      }

      for (const listener of this.listeners) {
        listener(head.commitHash);
      }
    } catch {
      // ignore transient git errors
    }
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
