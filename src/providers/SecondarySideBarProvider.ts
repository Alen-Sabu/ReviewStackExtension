import * as vscode from "vscode";

export class SecondarySidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  // Typed getter to expose visibility state safely
  public get isVisible(): boolean {
    return !!this._view?.visible;
  }

  // Public method to send messages to the webview safely
  public sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    // keep VS Code context in sync so other commands or UI can know visibility
    const updateContext = () => {
      const visible = !!this._view?.visible;
      vscode.commands.executeCommand(
        "setContext",
        "reviewstack.sidebarVisible",
        visible,
      );
    };
    // initial context
    updateContext();
    // update when visibility changes
    webviewView.onDidChangeVisibility(() => {
      this._view = webviewView;
      updateContext();
    });

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "userMessage") {
        // Call your AI API here and send response back
        const reply = await getAIResponse(data.text);
        webviewView.webview.postMessage({ type: "botReply", text: reply });
      }
    });
  }

  private _getHtml() {
    return `<!DOCTYPE html>
  <html>
  <head>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: var(--vscode-font-family);
        background: var(--vscode-sideBar-background);
        color: var(--vscode-foreground);
      }
      
      #reviewSection {
        background: var(--vscode-editorGroupHeader-tabsBackground);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 12px;
        min-height: 60px;
      }
      
      .review-header {
        font-size: 12px;
        font-weight: bold;
        color: var(--vscode-foreground);
        margin-bottom: 8px;
      }
      
      .review-item {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 8px;
      }
      
      .function-chip {
        display: inline-flex;
        align-items: center;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .function-chip:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      .code-display {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 8px;
        font-family: var(--vscode-editor-font-family);
        font-size: 11px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-top: 8px;
      }
      
      .code-display .line-number {
        color: var(--vscode-lineNumber-foreground);
        margin-right: 8px;
      }
      
      .file-info {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 6px;
      }
      
      #messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .msg {
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 85%;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .user {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        align-self: flex-end;
      }
      
      .bot {
        background: var(--vscode-input-background);
        align-self: flex-start;
      }
      
      #inputRow {
        display: flex;
        padding: 8px;
        gap: 6px;
        border-top: 1px solid var(--vscode-panel-border);
      }
      
      #input {
        flex: 1;
        padding: 6px 10px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        resize: none;
      }
      
      #send {
        padding: 6px 12px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      
      #send:hover { background: var(--vscode-button-hoverBackground); }
    </style>
  </head>
  <body>
    <div id="reviewSection">
      <div class="review-header">📋 Review Stack</div>
      <div id="reviewContent"></div>
    </div>
    
    <div id="messages">
      <div class="msg bot">👋 Hi! How can I help you?</div>
    </div>

    <div id="inputRow">
      <textarea id="input" rows="2" placeholder="Ask anything..."></textarea>
      <button id="send">Send</button>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      const messages = document.getElementById('messages');
      const input = document.getElementById('input');
      const send = document.getElementById('send');
      const reviewContent = document.getElementById('reviewContent');
      const LINE_THRESHOLD = 10; // If more than this, show chip; otherwise show full code

      function addMessage(text, role) {
        const div = document.createElement('div');
        div.className = 'msg ' + role;
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      }

      function displayReviewFunction(payload) {
        const { code, filePath, language } = payload;
        const lines = code.split('\\n');
        const lineCount = lines.length;
        const fileName = filePath.split('/').pop() || filePath;

        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.textContent = \`📄 \${fileName}\`;
        reviewItem.appendChild(fileInfo);

        if (lineCount > LINE_THRESHOLD) {
          // Show as chip with line numbers
          const chip = document.createElement('div');
          chip.className = 'function-chip';
          chip.textContent = \`Lines: 1–\${lineCount} (\${language})\`;
          chip.title = 'Click to expand function code';
          chip.style.cursor = 'pointer';

          let expanded = false;
          chip.addEventListener('click', () => {
            if (!expanded) {
              const codeDisplay = document.createElement('div');
              codeDisplay.className = 'code-display';
              codeDisplay.textContent = code;
              reviewItem.appendChild(codeDisplay);
              expanded = true;
              chip.textContent = \`▼ Lines: 1–\${lineCount} (\${language})\`;
            } else {
              const codeDisplay = reviewItem.querySelector('.code-display');
              if (codeDisplay) codeDisplay.remove();
              expanded = false;
              chip.textContent = \`Lines: 1–\${lineCount} (\${language})\`;
            }
          });

          reviewItem.appendChild(chip);
        } else {
          // Show full code directly
          const codeDisplay = document.createElement('div');
          codeDisplay.className = 'code-display';
          codeDisplay.textContent = code;
          reviewItem.appendChild(codeDisplay);
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
        const { type, text, payload } = event.data;

        if (type === 'botReply') {
          addMessage(text, 'bot');
        }

        if (type === 'reviewFunction') {
          displayReviewFunction(payload);
          addMessage(\`📌 Function from \${payload.filePath.split('/').pop()} added to review\`, 'bot');
        }
      });
    <\/script>
  </body>
  </html>`;
  }
}

// Placeholder — replace with real Claude/OpenAI API call
async function getAIResponse(text: string): Promise<string> {
  return `You said: "${text}" — wire up your AI API here!`;
}
