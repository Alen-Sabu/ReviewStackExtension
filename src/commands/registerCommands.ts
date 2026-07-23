import * as vscode from "vscode";
import { StatusBarManager } from "../managers/StatusBarManager";
import { SecondarySidebarProvider } from "../providers/SecondarySideBarProvider";
import { AuthService } from "../services/AuthService";
import { ProviderConfigService } from "../services/ProviderConfigService";
import { StartupOrchestrator } from "../services/StartupOrchestrator";
import { extractFunctionAt } from "../utils/extractFunction";

type CommandDependencies = {
  auth: AuthService;
  sidebar: SecondarySidebarProvider;
  startup: StartupOrchestrator;
  statusBar: StatusBarManager;
  providerConfig: ProviderConfigService;
};

export function registerCommands({
  auth,
  sidebar,
  startup,
  statusBar,
  providerConfig,
}: CommandDependencies): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand("reviewstack.signIn", async () => {
      await auth.signIn();
      await startup.run();
    }),
    vscode.commands.registerCommand("reviewstack.signOut", () => auth.signOut()),
    vscode.commands.registerCommand("myChat.open", async () => {
      try {
        if (sidebar.isVisible) {
          await vscode.commands.executeCommand(
            "workbench.action.toggleAuxiliaryBar",
          );
        } else {
          await openSecondarySidebar();
        }
      } catch (error) {
        console.error("Error toggling secondary sidebar", error);
      }
    }),
    vscode.commands.registerCommand(
      "reviewstack.reviewFunction",
      async (document: vscode.TextDocument, line: number) => {
        if (!(await auth.isSignedIn())) {
          if (!sidebar.isVisible) {
            await openSecondarySidebar();
          }
          return;
        }

        const functionCode = extractFunctionAt(document, line);

        if (!sidebar.isVisible) {
          await openSecondarySidebar();
        }

        statusBar.setReviewing();
        sidebar.sendMessage({
          type: "reviewFunction",
          payload: {
            code: functionCode,
            filePath: document.uri.fsPath,
            language: document.languageId,
          },
        });
      },
    ),
    vscode.commands.registerCommand(
      "reviewstack.resetOnboarding",
      async () => {
        await providerConfig.resetOnboarding();
        sidebar.sendMessage({
          type: "authState",
          signedIn: await auth.isSignedIn(),
          onboardingComplete: false,
        });
        void vscode.window.showInformationMessage(
          "ReviewStack onboarding reset. Re-open the sidebar if needed.",
        );
      },
    ),
    vscode.commands.registerCommand("reviewstack.dismissLens", () => undefined),
  ];
}

async function openSecondarySidebar(): Promise<void> {
  await vscode.commands.executeCommand(
    "workbench.view.extension.reviewstackContainer",
  );
  await new Promise((resolve) => setTimeout(resolve, 80));
  await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
}
