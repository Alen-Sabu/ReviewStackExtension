import * as vscode from 'vscode';

/**
 * Given a document and the line where a function starts,
 * returns the full function body as a string.
 *
 * Strategy:
 *  - Python  → collect until indent drops back to base level
 *  - TS/JS   → track brace depth until it hits 0
 */
export function extractFunctionAt(
  document: vscode.TextDocument,
  startLine: number
): string {
  const lang = document.languageId;
  const lines = document.getText().split('\n');
  const result: string[] = [];

  if (lang === 'python') {
    // Measure indent of def line
    const baseIndent = lines[startLine].match(/^(\s*)/)?.[1].length ?? 0;
    result.push(lines[startLine]);

    for (let i = startLine + 1; i < lines.length; i++) {
      const l = lines[i];
      const trimmed = l.trim();
      if (trimmed === '') { result.push(l); continue; }   // keep blank lines

      const indent = l.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent <= baseIndent && trimmed !== '') break;   // back to outer scope
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
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') { depth--; }
      }

      // Arrow functions without braces: single-line, grab and stop
      if (!started && i > startLine) break;
      if (started && depth === 0) break;
    }
  }

  return result.join('\n');
}