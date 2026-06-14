export class LoadingManager {
  private loadingEl?: HTMLElement;

  constructor(
    private readonly messagesEl: HTMLElement,
    private readonly scrollContainerEl: HTMLElement,
  ) {}

  show(): void {
    if (this.loadingEl) {
      return;
    }

    const li = document.createElement("li");
    li.className = "msg bot typing-indicator";
    li.setAttribute("aria-live", "polite");
    li.setAttribute("aria-label", "Assistant is typing");

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "bubble typing-bubble";

    const dots = document.createElement("div");
    dots.className = "typing-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.append(
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span"),
    );

    bubble.appendChild(dots);
    content.appendChild(bubble);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = "<div>⚇</div>";

    li.append(content, meta);
    this.messagesEl.appendChild(li);
    this.loadingEl = li;
    this.scrollToBottom();
  }

  hide(): void {
    this.loadingEl?.remove();
    this.loadingEl = undefined;
  }

  private scrollToBottom(): void {
    this.scrollContainerEl.scrollTop = this.scrollContainerEl.scrollHeight;
  }
}
