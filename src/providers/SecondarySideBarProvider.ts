import * as vscode from "vscode";
import { reviewFunction } from "../utils/api";
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
  private _pendingMessages: any[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _repoPath: string,
    private readonly _statusBar: StatusBarManager,
    private readonly _decorationManager: DecorationManager,
  ) {}

  public get isVisible(): boolean {
    return !!this._view?.visible;
  }

  public sendMessage(message: any): void {
    if (!this._view || !this._webviewReady) {
      this._pendingMessages.push(message);
      return;
    }
    this._view.webview.postMessage(message);
  }

  private _flushPendingMessages() {
    if (!this._view || !this._webviewReady || !this._pendingMessages.length) {
      return;
    }
    const messages = [...this._pendingMessages];
    this._pendingMessages = [];
    for (const message of messages) {
      this._view.webview.postMessage(message);
    }
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
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
        vscode.Uri.joinPath(this._extensionUri, "media"), // dev (F5)
        vscode.Uri.joinPath(this._extensionUri, "dist", "media"), // production
      ],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      // ── webview signals it is ready ──────────────────────────────────
      if (data.type === "webviewReady") {
        this._webviewReady = true;
        this._flushPendingMessages();
        return;
      }

      // ── user typed a follow-up ───────────────────────────────────────
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

          const result = await reviewFunction({
            repo_path: this._repoPath,
            file_path: currentReview.filePath,
            function_code: currentReview.functionCode,
            language: currentReview.language,
            conversation,
            user_reply: data.text,
          });

          conversation.push({ role: "user", content: data.text });
          conversation.push({ role: "assistant", content: result.message });

          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: result.message,
          });
          this._statusBar.setReady();
        } catch (e: any) {
          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: `❌ Error: ${e.message}`,
          });
          this._statusBar.setError(e.message);
        }
      }

      // ── CodeLens Review button clicked ───────────────────────────────
      if (data.type === "startReview") {
        conversation = [];
        currentReview = {
          filePath: data.payload.filePath,
          functionCode: data.payload.code,
          language: data.payload.language,
        };

        // clear old decoration
        const prevEditor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.fsPath === currentReview!.filePath,
        );
        if (prevEditor) {
          this._decorationManager.clear(prevEditor);
        }

        try {
          webviewView.webview.postMessage({ type: "loading", value: true });

          const result = await reviewFunction({
            repo_path: this._repoPath,
            file_path: currentReview.filePath,
            function_code: currentReview.functionCode,
            language: currentReview.language,
            conversation: [],
          });

          conversation.push({ role: "assistant", content: result.message });

          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: result.message,
          });
          this._statusBar.setReady();

          // ── apply decoration ─────────────────────────────────────────
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
        } catch (e: any) {
          webviewView.webview.postMessage({ type: "loading", value: false });
          webviewView.webview.postMessage({
            type: "botReply",
            text: `❌ ${e.message}`,
          });
          this._statusBar.setError(e.message);
        }
      }
    });
  }

  private _getHtml(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "style.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="reviewSection">
    <div class="review-title-row">
      <span class="status-dot" id="statusDot"></span>
      <span class="review-title">ReviewStack</span>
      <span class="review-state" id="reviewState">Ready</span>
    </div>
    <div id="fileInfo" style="display:none">
      <span class="file-path" id="filePath"></span>
      <span class="lang-badge" id="langBadge"></span>
    </div>
    <div id="reviewContent"></div>
  </div>

  <div id="messagesContainer" class="messages-container" role="log" aria-live="polite">
    <ul id="messages" class="messages"></ul>
  </div>

  <div id="inputRow">
    <textarea id="input" rows="2" placeholder="Ask a follow-up..."></textarea>
    <button id="send">Send</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const reviewContent = document.getElementById('reviewContent');
    const LINE_THRESHOLD = 10;
    let loadingEl = null;

    // signal host that webview is ready to receive messages
    vscode.postMessage({ type: 'webviewReady' });

    function formatTime() {
      const d = new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function renderMessageContent(text) {
      const frag = document.createDocumentFragment();
      const codeRe = /\`\`\`([\s\S]*?)\`\`\`/g;
      let last = 0;
      let match;

      while ((match = codeRe.exec(text)) !== null) {
        const before = text.slice(last, match.index);
        if (before) {
          frag.appendChild(document.createTextNode(before));
        }

        const pre = document.createElement('pre');
        pre.className = 'code-block';

        const code = document.createElement('code');
        code.textContent = match[1].trim();

        pre.appendChild(code);
        frag.appendChild(pre);

        last = match.index + match[0].length;
      }

      if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
      }

      return frag;
    }

    function addMessage(text, role) {
      const list = document.getElementById('messages');
      const li = document.createElement('li');
      li.className = 'msg ' + role;

      const meta = document.createElement('div');
      meta.className = 'meta';

      const avatar = document.createElement('div');
      avatar.textContent = role === 'user' ? '👤' : '⚇';

      const time = document.createElement('div');
      time.className = 'time';
      time.textContent = formatTime();

      meta.appendChild(avatar);
      meta.appendChild(time);

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.appendChild(renderMessageContent(text));

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = 'Copied';
        } catch (error) {
          copyBtn.textContent = 'Error';
        }

        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 1000);
      });

      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.alignItems = 'center';
      content.style.gap = '8px';
      content.appendChild(bubble);
      content.appendChild(copyBtn);

      if (role === 'user') {
        li.appendChild(content);
        li.appendChild(meta);
      } else {
        li.appendChild(meta);
        li.appendChild(content);
      }

      list.appendChild(li);
      const container = document.getElementById('messagesContainer');
      container.scrollTop = container.scrollHeight;
    }

    function showLoading() {
      if (loadingEl) return;
      loadingEl = document.createElement('div');
      loadingEl.className = 'loading';
      loadingEl.innerText = 'Reviewing...';
      messages.appendChild(loadingEl);
      messages.scrollTop = messages.scrollHeight;
    }

    function hideLoading() {
      if (loadingEl) { loadingEl.remove(); loadingEl = null; }
    }

    function setStatus(state) {
      const dot = document.getElementById('statusDot');
      const label = document.getElementById('reviewState');
      dot.className = 'status-dot ' + state;
      const labels = {
        ready: 'Ready',
        indexing: 'Indexing...',
        reviewing: 'Reviewing...',
        error: 'Error',
      };
      label.textContent = labels[state] || 'Ready';
    }

    function displayReviewFunction(payload) {
      const { code, filePath, language } = payload;

      const fileInfoEl  = document.getElementById('fileInfo');
      const filePathEl  = document.getElementById('filePath');
      const langBadgeEl = document.getElementById('langBadge');

      filePathEl.textContent  = (filePath.split('/').pop() || filePath.split('\\\\').pop() || filePath);
      langBadgeEl.textContent = language;
      fileInfoEl.style.display = 'flex';

      const lines = code.split('\\n');
      const reviewItem = document.createElement('div');
      reviewItem.className = 'review-item';

      if (lines.length > LINE_THRESHOLD) {
        const chip = document.createElement('div');
        chip.className = 'function-chip';
        chip.textContent = 'Lines 1–' + lines.length + ' (' + language + ') ▶';
        let expanded = false;
        chip.addEventListener('click', () => {
          if (!expanded) {
            const cd = document.createElement('div');
            cd.className = 'code-display';
            cd.textContent = code;
            reviewItem.appendChild(cd);
            chip.textContent = 'Lines 1–' + lines.length + ' (' + language + ') ▼';
            expanded = true;
          } else {
            reviewItem.querySelector('.code-display')?.remove();
            chip.textContent = 'Lines 1–' + lines.length + ' (' + language + ') ▶';
            expanded = false;
          }
        });
        reviewItem.appendChild(chip);
      } else {
        const cd = document.createElement('div');
        cd.className = 'code-display';
        cd.textContent = code;
        reviewItem.appendChild(cd);
      }

      reviewContent.innerHTML = '';
      reviewContent.appendChild(reviewItem);
    }

    send.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';
      vscode.postMessage({ type: 'userMessage', text });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send.click();
      }
    });

    window.addEventListener('message', (event) => {
      const { type, text, payload, value } = event.data;

      if (type === 'loading') {
        value ? showLoading() : hideLoading();
        setStatus(value ? 'reviewing' : 'ready');
      }

      if (type === 'botReply') {
        hideLoading();
        setStatus('ready');
        addMessage(text, 'bot');
      }

      if (type === 'reviewFunction') {
        messages.innerHTML = '';
        displayReviewFunction(payload);
        setStatus('reviewing');
        showLoading();
        vscode.postMessage({ type: 'startReview', payload });
      }
    });
  <\/script>
</body>
</html>`;
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
