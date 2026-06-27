import { ChatManager } from "../chat/ChatManager";
import { LoadingManager } from "../chat/Loading";
import { ReviewHeader, ReviewFunctionPayload } from "../chat/ReviewHeader";
import { ReviewPanel } from "../chat/ReviewPanel";
import { VSCodeService } from "../services/VSCodeService";
import { ReviewState } from "../state/ReviewState";
import { StatusBarUI } from "../ui/StatusBarUI";
import { ContextPanel, ContextInfoPayload } from "../ui/ContextPanel";

export class MessageHandler {
  constructor(
    private chatManager: ChatManager,
    private loadingManager: LoadingManager,
    private reviewState: ReviewState,
    private reviewPanel: ReviewPanel,
    private reviewHeader: ReviewHeader,
    private contextPanel: ContextPanel,
    private statusBar: StatusBarUI,
    private vscodeService: VSCodeService,
  ) {}

  handle(event: MessageEvent): void {
    const { type, text, payload, value, error } = event.data;

    switch (type) {
      case "loading":
        if (value) {
          this.loadingManager.show();
          this.statusBar.setStatus("reviewing");
          this.reviewState.setLoading(true);
        } else {
          this.loadingManager.hide();
          this.statusBar.setStatus("ready");
          this.reviewState.finishReview();
          this.reviewPanel.onReviewFinished();
        }
        this.reviewPanel.setLoading(!!value);
        break;
      
      case "restoreSession":
        this.chatManager.clear({ showWelcome: false });
        this.reviewHeader.display({
          filePath: payload.review.filePath,
          code: payload.review.functionCode,
          language: payload.review.language,
        })
        this.reviewState.startReview(payload.review); 
        this.reviewState.finishReview();

        for(const message of payload.messages) {
          this.chatManager.addMessage(message.content, message.role);
        }
        this.statusBar.setStatus("ready");
        break;

      case "botReply":
        this.loadingManager.hide();
        this.statusBar.setStatus("ready");
        this.chatManager.addMessage(text, "bot");
        this.reviewState.finishReview();
        this.reviewPanel.onReviewFinished();
        break;

      case "botReplyStart":
        this.loadingManager.hide();
        this.chatManager.startStreamingMessage();
        break;

      case "botReplyChunk":
        this.chatManager.appendStreamingChunk(text);
        break;

      case "botReplyEnd":
        this.loadingManager.hide();
        this.statusBar.setStatus("ready");
        this.chatManager.finishStreamingMessage();
        this.reviewState.finishReview();
        this.reviewState.setCanRetry(false);
        this.reviewPanel.onReviewFinished();
        break;

      case "reviewFunction":
        this.handleReviewFunction(payload as ReviewFunctionPayload);
        break;

      case "contextInfo":
        this.contextPanel.display(payload as ContextInfoPayload);
        break;

      case "streamCancel": 
        this.chatManager.cancelStreaming();
        break;

      case "reviewFailed":
        this.onReviewFailed(String(error ?? "Review failed."));
        break;
    }
  }

  private handleReviewFunction(payload: ReviewFunctionPayload): void {
    this.chatManager.clear({ showWelcome: false });
    this.contextPanel.clear();
    this.reviewHeader.display(payload);
    this.reviewState.startReview({
      filePath: payload.filePath,
      functionCode: payload.code,
      language: payload.language,
    });
    this.statusBar.setStatus("reviewing");
    this.loadingManager.show();
    this.reviewPanel.onReviewStarted();
    this.vscodeService.send("startReview", { payload });
  }

  private onReviewFailed(message: string): void {
    this.loadingManager.hide();
    this.chatManager.cancelStreaming();
    this.reviewState.finishReview();
    this.reviewState.setCanRetry(true);
    this.statusBar.setStatus("ready");
    this.reviewPanel.onReviewFinished();

    this.chatManager.addFailedMessage(`Review failed: ${message}`, () => {
      if (!this.reviewState.canRetry || this.reviewState.isLoading) {
        return;
      }
      this.reviewState.setCanRetry(false);
      this.vscodeService.send("retryLastReview");
    });
  }
}
