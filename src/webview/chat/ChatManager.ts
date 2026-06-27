import { MessageComponent } from "./MessageComponent";
import { renderMessageContent, enhanceRenderedContent } from "../utils/markdown";

type ClearOptions = {
  showWelcome?: boolean;
};

export class ChatManager {
  private streamingMessageEl: HTMLElement | null = null;
  private streamingBubbleBody: HTMLElement | null = null;
  private streamingText = "";

  constructor(
    private readonly messageEl: HTMLElement,
    private readonly containerEl: HTMLElement,
    private readonly emptyStateEl: HTMLElement,
  ) {}

  addMessage(text: string, role: string): void {
    this.hideWelcome();
    const msg = MessageComponent.create(text, role);
    this.messageEl.appendChild(msg);
    this.scrollToBottom();
  }

  addFailedMessage(text: string, onRetry: () => void): void {
    this.hideWelcome();

    const li = document.createElement("li");
    li.className = "msg bot failed";

    const bubbleBody = document.createElement("div");
    bubbleBody.className = "bubble-body markdown-body";
    bubbleBody.appendChild(renderMessageContent(text));

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "retry-inline-btn";
    retryBtn.setAttribute("aria-label", "Retry last review");
    retryBtn.innerHTML = `
      <svg class="retry-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08a5.99 5.99 0 0 1-5.65 4c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      Retry
    `;
    retryBtn.addEventListener("click", () => {
      retryBtn.disabled = true;
      onRetry();
    });

    const retryRow = document.createElement("div");
    retryRow.className = "message-retry";
    retryRow.appendChild(retryBtn);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.append(bubbleBody, retryRow);

    const content = document.createElement("div");
    content.className = "message-content";
    content.appendChild(bubble);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = "<div>⚇</div>";

    li.append(content, meta);
    this.messageEl.appendChild(li);
    this.scrollToBottom();
  }

  startStreamingMessage(): void {
    this.hideWelcome();
    this.streamingText = "";

    const li = document.createElement("li");
    li.className = "msg bot streaming";

    const bubbleBody = document.createElement("div");
    bubbleBody.className = "bubble-body markdown-body streaming-body";
    bubbleBody.appendChild(document.createTextNode(""));

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.appendChild(bubbleBody);

    const content = document.createElement("div");
    content.className = "message-content";
    content.appendChild(bubble);

    li.appendChild(content);
    this.messageEl.appendChild(li);

    this.streamingMessageEl = li;
    this.streamingBubbleBody = bubbleBody;
    this.scrollToBottom();
  }

  appendStreamingChunk(delta: string): void {
    if (!this.streamingBubbleBody) {
      return;
    }

    this.streamingText += delta;
    this.streamingBubbleBody.textContent = this.streamingText;
    this.scrollToBottom();
  }

  finishStreamingMessage(): void {
    if (!this.streamingMessageEl || !this.streamingBubbleBody) {
      return;
    }

    this.streamingBubbleBody.replaceChildren(
      renderMessageContent(this.streamingText),
    );
    enhanceRenderedContent(this.streamingBubbleBody);

    const finalized = MessageComponent.finalizeBotMessage(
      this.streamingMessageEl,
      this.streamingText,
    );

    this.messageEl.replaceChild(finalized, this.streamingMessageEl);
    this.streamingMessageEl = null;
    this.streamingBubbleBody = null;
    this.streamingText = "";
    this.scrollToBottom();
  }

  cancelStreaming(): void {
    this.streamingMessageEl?.remove();
    this.streamingMessageEl = null;
    this.streamingBubbleBody = null;
    this.streamingText = "";
  }

  clear(options: ClearOptions = {}): void {
    this.streamingMessageEl = null;
    this.streamingBubbleBody = null;
    this.streamingText = "";
    this.messageEl.innerHTML = "";
    if (options.showWelcome !== false) {
      this.showWelcome();
    } else {
      this.hideWelcome();
    }
  }

  showWelcome(): void {
    this.emptyStateEl.hidden = false;
  }

  hideWelcome(): void {
    this.emptyStateEl.hidden = true;
  }

  private scrollToBottom(): void {
    this.containerEl.scrollTop = this.containerEl.scrollHeight;
  }
}
