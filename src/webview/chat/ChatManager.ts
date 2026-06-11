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
