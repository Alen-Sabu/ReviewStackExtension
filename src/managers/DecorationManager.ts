import * as vscode from "vscode";

export class DecorationManager {
  private cleanDecoration = vscode.window.createTextEditorDecorationType({
    borderWidth: "0 0 0 3px",
    borderStyle: "solid",
    borderColor: new vscode.ThemeColor("terminal.ansiGreen"),
    isWholeLine: true,
  });

  private issueDecoration = vscode.window.createTextEditorDecorationType({
    borderWidth: "0 0 0 3px",
    borderStyle: "solid",
    borderColor: new vscode.ThemeColor("terminal.ansiYellow"),
    isWholeLine: true,
  });

  markClean(editor: vscode.TextEditor, startLine: number, endLine: number) {
    const range = new vscode.Range(startLine, 0, endLine, 0);
    editor.setDecorations(this.cleanDecoration, [range]);
    editor.setDecorations(this.issueDecoration, []); // clear yellow
  }

  markHasIssues(editor: vscode.TextEditor, startLine: number, endLine: number) {
    const range = new vscode.Range(startLine, 0, endLine, 0);
    editor.setDecorations(this.issueDecoration, [range]);
    editor.setDecorations(this.cleanDecoration, []); // clear green
  }

  clear(editor: vscode.TextEditor) {
    editor.setDecorations(this.cleanDecoration, []);
    editor.setDecorations(this.issueDecoration, []);
  }

  dispose() {
    this.cleanDecoration.dispose();
    this.issueDecoration.dispose();
  }
}