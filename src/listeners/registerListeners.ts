import * as vscode from "vscode";
import { ReviewCodeLensProvider } from "../providers/CodeLensProvider";
import { IndexingService } from "../services/IndexingService";

export function registerListeners(
  codeLensProvider: ReviewCodeLensProvider,
  indexing: IndexingService,
): vscode.Disposable[] {
  return [
    vscode.workspace.onDidSaveTextDocument(() => {
      codeLensProvider.refresh();
      void indexing.reindexIfReady();
    }),
  ];
}
