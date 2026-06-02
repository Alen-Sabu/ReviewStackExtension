import * as vscode from "vscode";

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = "myChat.open";
    this.item.show();
    this.setReady();
  }

  setReady(fileCount?: number) {
    this.item.text = fileCount
      ? `$(check) ReviewStack: ${fileCount} files indexed`
      : "$(check) ReviewStack: Ready";
    this.item.tooltip = "Click to open ReviewStack";
    this.item.backgroundColor = undefined;
  }

  setIndexing() {
    this.item.text = "$(sync~spin) ReviewStack: Indexing...";
    this.item.tooltip = "Reading your repository";
    this.item.backgroundColor = undefined;
  }

  setReviewing() {
    this.item.text = "$(gear~spin) ReviewStack: Reviewing...";
    this.item.tooltip = "Qwen is analysing your function";
    this.item.backgroundColor = undefined;
  }

  setError(msg: string) {
    this.item.text = "$(error) ReviewStack: Error";
    this.item.tooltip = msg;
    this.item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
  }

  dispose() {
    this.item.dispose();
  }
}