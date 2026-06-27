import * as fs from "fs";
import * as vscode from "vscode";
import { ProviderConfigService } from "../services/ProviderConfigService";
import { ProviderId } from "../types/provider";
import { reviewFunctionStream, submitFeedback, type ReviewResponse } from "../utils/api";
import { CONFIG } from "../utils/config";
import { StatusBarManager } from "../managers/StatusBarManager";
import { DecorationManager } from "../managers/DecorationManager";
import { ReviewSession } from "../services/ReviewSession";

let conversation: { role: string; content: string }[] = [];
let currentReview: {
  filePath: string;
  functionCode: string;
  language: string;
} | null = null;

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message === "Aborted")
  );
}

export class SecondarySidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _webviewReady = false;
  private _pendingMessages: unknown[] = [];
  private _activeAbortController: AbortController | null = null;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _repoPath: string,
    private readonly _statusBar: StatusBarManager,
    private readonly _decorationManager: DecorationManager,
    private readonly _providerConfig: ProviderConfigService,
    private readonly _reviewSession: ReviewSession,
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
      const webview = webviewView.webview;

      if (data.type === "webviewReady") {
        this._webviewReady = true;

        const onboardingComplete =
          await this._providerConfig.isOnboardingComplete();
        webview.postMessage({ type: "init", onboardingComplete});

        if (currentReview) {
          webview.postMessage({
            type: "restoreSession",
            payload: {
              review: currentReview,
              messages: conversation,
            },
          });
        }
        this._flushPendingMessages();
        return;
      }

      if (data.requestId) {
        if (data.type === "getProviderConfig") {
          const config = await this._providerConfig.getConfig();
          webview.postMessage({
            type: "response",
            requestId: data.requestId,
            payload: config,
          });
          return;
        }

        if (data.type === "saveProvider") {
          try {
            await this._providerConfig.saveConfig(
              {
                provider: data.provider as ProviderId,
                model: String(data.model ?? ""),
                baseUrl: data.baseUrl ? String(data.baseUrl) : undefined,
              },
              data.apiKey ? String(data.apiKey) : undefined,
            );
            webview.postMessage({
              type: "response",
              requestId: data.requestId,
              payload: { ok: true },
            });
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            webview.postMessage({
              type: "response",
              requestId: data.requestId,
              error: message,
            });
          }
          return;
        }

        if (data.type === "testProvider") {
          try {
            const response = await fetch(`${CONFIG.serverUrl}/settings/test`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: data.provider,
                model: data.model,
                api_key: data.apiKey,
                base_url: data.baseUrl,
              }),
            });
            const result = (await response.json()) as {
              ok: boolean;
              error?: string;
            };
            webview.postMessage({
              type: "response",
              requestId: data.requestId,
              payload: result,
            });
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            webview.postMessage({
              type: "response",
              requestId: data.requestId,
              payload: { ok: false, error: message },
            });
          }
          return;
        }
      }

      if (data.type === "openExternal" && data.url) {
        await vscode.env.openExternal(vscode.Uri.parse(String(data.url)));
        return;
      }

      if (data.type === "stopGeneration") {
        this._activeAbortController?.abort();
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

        await this._handleUserMessage(webviewView.webview, data.text);
        return;
      }

      if (data.type === "startReview") {
        await this._handleStartReview(webviewView.webview, data.payload);
        return;
      }

      if (data.type === "retryLastReview") {
        await this._handleRetry(webviewView.webview);
        return;
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
    this._activeAbortController?.abort();
    const abortController = new AbortController();
    this._activeAbortController = abortController;

    let streamStarted = false;
    let streamedText = "";

    try {
      const result = await reviewFunctionStream(
        payload,
        (chunk) => {
          if (chunk.delta && !streamStarted) {
            streamStarted = true;
            webview.postMessage({ type: "botReplyStart" });
          }
          if (chunk.delta) {
            streamedText += chunk.delta;
            webview.postMessage({ type: "botReplyChunk", text: chunk.delta });
          }
        },
        abortController.signal,
      );

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
    } catch (error: unknown) {
      if (isAbortError(error)) {
        webview.postMessage({ type: "loading", value: false });
        if (streamStarted) {
          webview.postMessage({ type: "botReplyEnd" });
        }

        if (payload.user_reply) {
          conversation.push({ role: "user", content: payload.user_reply });
        }
        if (streamedText) {
          conversation.push({ role: "assistant", content: streamedText });
        }

        this._statusBar.setReady();
        throw error;
      }

      if(streamStarted) {
        webview.postMessage({ type: "streamCancel" });
      }
      this._postReviewFailed(webview, error); 
      throw error;
    } finally {
      if (this._activeAbortController === abortController) {
        this._activeAbortController = null;
      }
    }
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
    const onboardingComplete = this._providerConfig.isOnboardingCompleteSync();
    const chatHidden = onboardingComplete ? "" : "hidden";
    const onboardingHidden = onboardingComplete ? "hidden" : "";

    return template
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{styleUri\}\}/g, styleUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{chatHidden\}\}/g, chatHidden)
      .replace(/\{\{onboardingHidden\}\}/g, onboardingHidden);
  }

  // review failed message to the webview
  private _postReviewFailed(webview: vscode.Webview, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    webview.postMessage({ type: "loading", value: false });
    webview.postMessage({ type: "reviewFailed", error: message }); 
    this._statusBar.setError(message);
  }

  // handle start review request
  private async _handleStartReview(webview: vscode.Webview, payload: {
    filePath: string;
    code: string;
    language: string;
  }): Promise<void> {
    this._reviewSession.setLastRequest({ kind: "startReview", payload });

    conversation = [];
    currentReview = {
      filePath: payload.filePath,
      functionCode: payload.code,
      language: payload.language,
    };

    const prevEditor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath === currentReview!.filePath,
    );
    if(prevEditor) {
      this._decorationManager.clear(prevEditor);
    }

    try {
      webview.postMessage({ type: "loading", value: true }); 
      
      const result = await this._runReviewStream(webview, {
        repo_path: this._repoPath,
        file_path: currentReview.filePath,
        function_code: currentReview.functionCode,
        language: currentReview.language,
        conversation: [],
      })

      conversation.push({ role: "assistant", content: result.message }); 
      this._statusBar.setReady();
      this._applyDecoration(result.message)
    } catch (e: unknown) {
      if (isAbortError(e)) {
        return;
      }

    }
  }

  // apply decoration to the editor based on the message
  private _applyDecoration(message: string): void {
    if(!currentReview) {
      return;
    }

    const hasIssues = message.toLowerCase().includes("issue") ||
                      message.toLowerCase().includes("problem") ||
                      message.toLowerCase().includes("fix");

    const reviewedEditor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath === currentReview!.filePath,
    );

    if(!reviewedEditor) {
      return;
    }

    const docLines = reviewedEditor.document.getText().split("\n");
    const fnFirstLine = currentReview.functionCode.split("\n")[0].trim();
    const startLine = docLines.findIndex((l) => l.trim() === fnFirstLine);
    const endLine =
      startLine !== -1
        ? startLine + currentReview.functionCode.split("\n").length - 1
        : -1;

    if(hasIssues) {
      this._decorationManager.markHasIssues(reviewedEditor, startLine, endLine);
    } else {
      this._decorationManager.markClean(reviewedEditor, startLine, endLine);
    }

  }

  // handle user message request
  private async _handleUserMessage(webview: vscode.Webview, text: string): Promise<void> {
    if(!currentReview) {
      return;
    }

    this._reviewSession.setLastRequest({ kind: "userMessage", text });

    try {
      webview.postMessage({ type: "loading", value: true });

      const result = await this._runReviewStream(webview, {
        repo_path: this._repoPath,
        file_path: currentReview.filePath,
        function_code: currentReview.functionCode,
        language: currentReview.language,
        conversation: [...conversation, { role: "user", content: text }],
        user_reply: text,
      })

      conversation.push({ role: "user", content: text });
      conversation.push({ role: "assistant", content: result.message });
      this._statusBar.setReady();
    
    } catch (e: unknown) {
      if (isAbortError(e)) {
        return;
      }

    }
  }

  // handle retry review 
  private async _handleRetry(webview: vscode.Webview): Promise<void> {
    const last = this._reviewSession.getLastRequest(); 
    if(!last) {
      return;
    }

    if(last.kind === "startReview") {
      webview.postMessage({
        type: "reviewFunction", 
        payload: last.payload,
      })
    } else {
      await this._handleUserMessage(webview, last.text);
    }

    
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
