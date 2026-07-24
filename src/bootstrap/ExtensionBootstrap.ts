import * as vscode from "vscode"; 
import { registerCommands } from "../commands/registerCommands";
import { ReviewStore } from "../store/ReviewStore";
import { DiffService } from "../git/DiffService";

export class ExtensionBootstrap implements vscode.Disposable {
  private started = false; 
  
  private constructor(private readonly context: vscode.ExtensionContext) {}

  static create(context: vscode.ExtensionContext) : ExtensionBootstrap{
    return new ExtensionBootstrap(context);
  }

  start(): void {
    if (this.started) return; 
    this.started = true; 

    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; 
    if(!root) {
      void vscode.window.showWarningMessage(
        "Open a folder to use ReviewStack"
      ); 
      return; 
    }

    const store = new ReviewStore(root); 
    const diff = new DiffService(root); 

    void store.ensureInitialized(); 
    this.context.subscriptions.push(...registerCommands(store, diff)); 

    void vscode.window.showInformationMessage("ReviewStack extension started");
  }

  dispose() : void{}
}