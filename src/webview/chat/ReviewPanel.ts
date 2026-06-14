import { ChatManager } from "./ChatManager";
import { LoadingManager } from "./Loading";
import { ReviewState } from "../state/ReviewState";
import { VSCodeService } from "../services/VSCodeService";

const MAX_INPUT_HEIGHT = 120;

type ReviewPanelOptions = {
  inputEl: HTMLTextAreaElement;
  sendButtonEl: HTMLButtonElement;
  stopButtonEl: HTMLButtonElement;
  promptComposerEl: HTMLElement;
  chatManager: ChatManager;
  loadingManager: LoadingManager;
  vscodeService: VSCodeService;
  reviewState: ReviewState;
};

export class ReviewPanel {
  constructor(private readonly options: ReviewPanelOptions) {
    this.bindEvents();
    this.syncControls();
    this.resizeInput();
  }

  public onReviewStarted(): void {
    this.options.inputEl.value = "";
    this.resizeInput();
    this.syncControls();
    this.options.inputEl.focus();
  }

  public onReviewFinished(): void {
    this.syncControls();
  }

  public setLoading(isLoading: boolean): void {
    this.syncControls(isLoading);
  }

  private bindEvents(): void {
    const { inputEl, sendButtonEl, stopButtonEl, chatManager, vscodeService, reviewState } =
      this.options;

    const sendCurrentMessage = () => {
      if (!reviewState.currentReview || reviewState.isLoading) {
        return;
      }

      const text = inputEl.value.trim();
      if (!text) {
        return;
      }

      chatManager.addMessage(text, "user");
      this.options.loadingManager.show();
      reviewState.setLoading(true);
      this.syncControls(true);
      vscodeService.send("userMessage", { text });
      inputEl.value = "";
      this.resizeInput();
    };

    sendButtonEl.addEventListener("click", sendCurrentMessage);

    stopButtonEl.addEventListener("click", () => {
      if (!reviewState.isLoading) {
        return;
      }
      vscodeService.send("stopGeneration");
    });

    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });

    inputEl.addEventListener("input", () => this.resizeInput());
  }

  private resizeInput(): void {
    const { inputEl } = this.options;
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }

  private syncControls(forceLoading?: boolean): void {
    const hasReview = !!this.options.reviewState.currentReview;
    const isLoading = forceLoading ?? this.options.reviewState.isLoading;
    const enabled = hasReview && !isLoading;

    this.options.inputEl.disabled = !enabled;
    this.options.sendButtonEl.disabled = !enabled;
    this.options.stopButtonEl.hidden = !isLoading;
    this.options.stopButtonEl.disabled = !isLoading;
    this.options.promptComposerEl.classList.toggle("is-disabled", !enabled);
    this.options.promptComposerEl.classList.toggle("is-loading", isLoading);
  }
}
