import * as fs from "fs";
import * as vscode from "vscode";
import { reviewFunctionStream, submitFeedback, type ReviewResponse } from "../utils/api";
import { StatusBarManager } from "../managers/StatusBarManager";
import { DecorationManager } from "../managers/DecorationManager";

let conversation: { role: string; content: string }[] = [];
let currentReview: {
  filePath: string;
  functionCode: string;
  language: string;
} | null = null;

export class SecondarySidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _webviewReady = false;
  private _pendingMessages: unknown[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _repoPath: string,
    private readonly _statusBar: StatusBarManager,
    private readonly _decorationManager: DecorationManager,
  ) {}

  public get isVisible(): boolean {
    return !!this._view?.visible;
  }

  public sendMessage(message: unknown): void {
    if (!this._view || !this._webviewReady) {
      this._pendingMessages.push(message);
      return;
    }
    this._view.webview.postMessage(message);
  }

  private _flushPendingMessages(): void {
    if (!this._view || !this._webviewReady || !this._pendingMessages.length) {
      return;
    }
    const messages = [...this._pendingMessages];
    this._pendingMessages = [];
    for (const message of messages) {
      this._view.webview.postMessage(message);
    }
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    const updateContext = () => {
      vscode.commands.executeCommand(
        "setContext",
        "reviewstack.sidebarVisible",
        !!this._view?.visible,
      );
    };

    updateContext();

    webviewView.onDidChangeVisibility(() => {
      this._view = webviewView;
      updateContext();
      if (this._view?.visible) {
        setTimeout(() => this._flushPendingMessages(), 50);
      }
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media"),
        vscode.Uri.joinPath(this._extensionUri, "dist", "media"),
      ],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "webviewReady") {
        this._webviewReady = true;

        if(currentReview) {
          webviewView.webview.postMessage({
            type: "restoreSession", 
            payload: {
              review: currentReview,
              messages: conversation, 
            }
          })
        }
        this._flushPendingMessages();
        return;
      }

      if (data.type === "userMessage") {
        if (!currentReview) {
          webviewView.webview.postMessage({
            type: "botReply",
            text: "Click Review on a function first to start a review.",
          });
          return;
        }

        try {
          webviewView.webview.postMessage({ type: "loading", value: true });

          const result = await this._runReviewStream(webviewView.webview, {
            repo_path: this._repoPath,
            file_path: currentReview.filePath,
            function_code: currentReview.functionCode,
            language: currentReview.language,
            conversation,
            user_reply: data.text,
          });

          conversation.push({ role: "user", content: data.text });
          conversation.push({ role: "assistant", content: result.message });

          this._statusBar.setReady();
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: `Error: ${message}`,
          });
          this._statusBar.setError(message);
        }
      }

      if (data.type === "startReview") {
        conversation = [];
        currentReview = {
          filePath: data.payload.filePath,
          functionCode: data.payload.code,
          language: data.payload.language,
        };

        const prevEditor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.fsPath === currentReview!.filePath,
        );
        if (prevEditor) {
          this._decorationManager.clear(prevEditor);
        }

        try {
          webviewView.webview.postMessage({ type: "loading", value: true });

          const result = await this._runReviewStream(webviewView.webview, {
            repo_path: this._repoPath,
            file_path: currentReview.filePath,
            function_code: currentReview.functionCode,
            language: currentReview.language,
            conversation: [],
          });

          conversation.push({ role: "assistant", content: result.message });

          this._statusBar.setReady();

          const hasIssues =
            result.message.includes("⚠️") ||
            result.message.toLowerCase().includes("issue") ||
            result.message.toLowerCase().includes("problem") ||
            result.message.toLowerCase().includes("fix");

          const reviewedEditor = vscode.window.visibleTextEditors.find(
            (e) => e.document.uri.fsPath === currentReview!.filePath,
          );

          if (reviewedEditor) {
            const docLines = reviewedEditor.document.getText().split("\n");
            const fnFirstLine = currentReview!.functionCode
              .split("\n")[0]
              .trim();
            const startLine = docLines.findIndex(
              (l) => l.trim() === fnFirstLine,
            );
            const endLine =
              startLine !== -1
                ? startLine + currentReview!.functionCode.split("\n").length - 1
                : -1;

            if (startLine !== -1) {
              hasIssues
                ? this._decorationManager.markHasIssues(
                    reviewedEditor,
                    startLine,
                    endLine,
                  )
                : this._decorationManager.markClean(
                    reviewedEditor,
                    startLine,
                    endLine,
                  );
            }
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: ` ${message}`,
          });
          this._statusBar.setError(message);
        }
      }

      if (data.type === "feedback") {
        const value = data.value as string;
        if (value !== "up" && value !== "down") {
          return;
        }
        try {
          await submitFeedback({
            repo_path: this._repoPath,
            message_id: String(data.messageId ?? ""),
            value,
            preview: String(data.preview ?? ""),
            file_path: currentReview?.filePath ?? "",
          });
          void vscode.window.showInformationMessage(
            value === "up" ? "Thanks for the feedback!" : "Feedback recorded.",
          );
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          void vscode.window.showWarningMessage(`Feedback failed: ${message}`);
        }
        return;
      }
    });
  }

  private async _runReviewStream(
    webview: vscode.Webview,
    payload: {
      repo_path: string;
      file_path: string;
      function_code: string;
      language: string;
      conversation: { role: string; content: string }[];
      user_reply?: string;
    },
  ): Promise<ReviewResponse> {
    let streamStarted = false;

    const result = await reviewFunctionStream(payload, (chunk) => {
      if (chunk.delta && !streamStarted) {
        streamStarted = true;
        webview.postMessage({ type: "botReplyStart" });
      }
      if (chunk.delta) {
        webview.postMessage({ type: "botReplyChunk", text: chunk.delta });
      }
    });

    if (!streamStarted) {
      webview.postMessage({ type: "botReplyStart" });
    }

    webview.postMessage({ type: "botReplyEnd" });
    webview.postMessage({ type: "loading", value: false });

    const files = result.retrieved_context ?? [];
    if (files.length > 0 || result.context_limit_hit) {
      webview.postMessage({
        type: "contextInfo",
        payload: {
          files,
          limitHit: result.context_limit_hit ?? false,
          candidatesConsidered: result.candidates_considered ?? 0,
        },
      });
    }

    return result;
  }

  private _getHtml(webview: vscode.Webview): string {
    const mediaRoot = vscode.Uri.joinPath(this._extensionUri, "dist", "media");
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaRoot, "style.css"),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaRoot, "webview.js"),
    );

    const htmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "index.html",
    );
    const template = fs.readFileSync(htmlPath.fsPath, "utf8");
    const nonce = getNonce();

    return template
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{styleUri\}\}/g, styleUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
