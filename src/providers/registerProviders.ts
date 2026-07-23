import * as vscode from "vscode";
import { ReviewCodeLensProvider } from "./CodeLensProvider";
import { SecondarySidebarProvider } from "./SecondarySideBarProvider";

const SUPPORTED_LANGUAGES: vscode.DocumentSelector = [
  { language: "python" },
  { language: "typescript" },
  { language: "javascript" },
  { language: "typescriptreact" },
  { language: "javascriptreact" },
];

export function registerProviders(
  sidebar: SecondarySidebarProvider,
  codeLensProvider: ReviewCodeLensProvider,
): vscode.Disposable[] {
  return [
    vscode.window.registerWebviewViewProvider("reviewstackView", sidebar),
    vscode.languages.registerCodeLensProvider(
      SUPPORTED_LANGUAGES,
      codeLensProvider,
    ),
  ];
}
