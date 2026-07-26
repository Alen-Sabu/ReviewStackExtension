import * as vscode from "vscode";
import { ReviewStore } from "../store/ReviewStore";
import { IndexEntry, ReviewStatus } from "../types/reviewStore";

export class CommitHistoryProvider 
    implements vscode.TreeDataProvider<IndexEntry>
{

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    IndexEntry | undefined | null | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly store: ReviewStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }


  getTreeItem(element: IndexEntry): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.labelFor(element),
      vscode.TreeItemCollapsibleState.None,
    );

    item.description = `${element.shortHash} · ${this.relativeDate(element.date)}`;
    item.iconPath = new vscode.ThemeIcon(
        this.iconFor(element.status),
        this.iconColor(element.status),
    );

    const md = new vscode.MarkdownString(undefined, true);
    md.appendMarkdown(`### ${element.message}\n\n`);
    md.appendMarkdown(`- **Status:** ${element.status}\n`);
    md.appendMarkdown(`- **Commit:** \`${element.shortHash}\`\n`);
    if (element.summary) {
        md.appendMarkdown(`\n${element.summary}`);
    }
    item.tooltip = md;
    if (element.status === "completed") {
      item.command = {
        command: "reviewstack.openReview",
        title: "Open Review",
        arguments: [element.shortHash],
      };
    }
    return item;
  }

  async getChildren(element?: IndexEntry): Promise<IndexEntry[]> {
    if (element) {
      return [];
    }

    const index = await this.store.getIndex();
    return index.commits;
  }

  private labelFor(entry: IndexEntry): string {
    const msg = entry.message.trim() || "(no message)";
    return msg.length > 60 ? `${msg.slice(0, 57)}...` : msg;
  }

  private iconColor(status: ReviewStatus): vscode.ThemeColor | undefined {
    switch (status) {
      case "completed":
        return new vscode.ThemeColor("charts.green");
      case "failed":
        return new vscode.ThemeColor("charts.red");
      case "pending":
        return new vscode.ThemeColor("charts.yellow");
      default:
        return undefined;
    }
  }
  
  private relativeDate(iso: string): string {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  private iconFor(status: ReviewStatus): string {
    switch (status) {
      case "completed":
        return "pass";
      case "pending":
        return "sync~spin";
      case "failed":
        return "error";
      default:
        return "circle-outline";
    }
  }
}
