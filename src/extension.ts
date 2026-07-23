import * as vscode from "vscode";
import { ExtensionBootstrap } from "./bootstrap/ExtensionBootstrap";

export function activate(context: vscode.ExtensionContext) {
  const app = ExtensionBootstrap.create(context);
  app.start();
  context.subscriptions.push(app);
}

export function deactivate() {}
