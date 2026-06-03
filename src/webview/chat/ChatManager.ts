import { MessageComponent } from "./MessageComponent";

type ClearOptions = {
  showWelcome?: boolean;
};

export class ChatManager {
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

  clear(options: ClearOptions = {}): void {
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
