import * as vscode from "vscode";

export function extractFunctionAt(
  document: vscode.TextDocument,
  startLine: number
): string {
  const lang = document.languageId;
  const lines = document.getText().split("\n");
  const result: string[] = [];

  if (lang === "python") {
    const baseIndent = lines[startLine].match(/^(\s*)/)?.[1].length ?? 0;
    result.push(lines[startLine]);

    for (let i = startLine + 1; i < lines.length; i++) {
      const l = lines[i];
      const trimmed = l.trim();
      if (trimmed === "") { result.push(l); continue; }
      const indent = l.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent <= baseIndent) break;
      result.push(l);
    }
  } else {
    // TS / JS — brace counting
    let depth = 0;
    let started = false;

    for (let i = startLine; i < lines.length; i++) {
      const l = lines[i];
      result.push(l);

      for (const ch of l) {
        if (ch === "{") { depth++; started = true; }
        if (ch === "}") { depth--; }
      }

      // arrow fn on one line with no braces
      if (!started && i > startLine) break;
      if (started && depth === 0) break;
    }
  }

  return result.join("\n");
}