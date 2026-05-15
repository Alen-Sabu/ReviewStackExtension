import * as vscode from "vscode";

// Matches function starts across Python, TS, JS
const FUNCTION_PATTERNS: Record<string, RegExp> = {
  python: /^\s*(async\s+)?def\s+\w+\s*\(/,
  typescript:
    /^\s*(export\s+)?(default\s+)?(async\s+)?(function\s+\w+|\w+\s*[:=]\s*(async\s+)?(function|\())/,
  javascript:
    /^\s*(export\s+)?(default\s+)?(async\s+)?(function\s+\w+|\w+\s*[:=]\s*(async\s+)?(function|\())/,
  typescriptreact:
    /^\s*(export\s+)?(default\s+)?(async\s+)?(function\s+\w+|\w+\s*[:=]\s*(async\s+)?(function|\())/,
  javascriptreact:
    /^\s*(export\s+)?(default\s+)?(async\s+)?(function\s+\w+|\w+\s*[:=]\s*(async\s+)?(function|\())/,
};

export class ReviewCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  public refresh() {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const pattern = FUNCTION_PATTERNS[document.languageId];
    if (!pattern) return lenses;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (pattern.test(line.text)) {
        const range = new vscode.Range(i, 0, i, line.text.length);
        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(eye) Review",
            tooltip: "Open ReviewStack and analyse this function",
            command: "reviewstack.reviewFunction",
            arguments: [document, i],
          }),
        );

        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(x) Dismiss",
            tooltip: "Dismiss",
            command: "reviewstack.dismissLens",
          }),
        );
      }
    }
    return lenses;
  }
}
