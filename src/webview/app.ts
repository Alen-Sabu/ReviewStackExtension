import { ChatManager } from "./chat/ChatManager";
import { LoadingManager } from "./chat/Loading";
import { ReviewHeader } from "./chat/ReviewHeader";
import { ReviewPanel } from "./chat/ReviewPanel";
import { MessageHandler } from "./handlers/MessageHandler";
import { ReviewState } from "./state/ReviewState";
import { VSCodeService } from "./services/VSCodeService";
import { StatusBarUI } from "./ui/StatusBarUI";

const messagesEl = document.getElementById("messages");
const messagesContainerEl = document.getElementById("messagesContainer");
const emptyStateEl = document.getElementById("emptyState");
const inputEl = document.getElementById("input") as HTMLTextAreaElement | null;
const sendButtonEl = document.getElementById("send") as HTMLButtonElement | null;
const promptComposerEl = document.getElementById("promptComposer");
const fileInfoEl = document.getElementById("fileInfo");
const filePathEl = document.getElementById("filePath");
const langBadgeEl = document.getElementById("langBadge");
const reviewContentEl = document.getElementById("reviewContent");
const statusDotEl = document.getElementById("statusDot");
const reviewStateEl = document.getElementById("reviewState");

if (
  !messagesEl ||
  !messagesContainerEl ||
  !emptyStateEl ||
  !inputEl ||
  !sendButtonEl ||
  !promptComposerEl ||
  !fileInfoEl ||
  !filePathEl ||
  !langBadgeEl ||
  !reviewContentEl ||
  !statusDotEl ||
  !reviewStateEl
) {
  throw new Error("ReviewStack webview is missing required DOM elements.");
}

const vscodeService = new VSCodeService();
const reviewState = new ReviewState();
const chatManager = new ChatManager(messagesEl, messagesContainerEl, emptyStateEl);
const loadingManager = new LoadingManager(messagesEl);
const statusBar = new StatusBarUI(statusDotEl, reviewStateEl);
const reviewHeader = new ReviewHeader(
  fileInfoEl,
  filePathEl,
  langBadgeEl,
  reviewContentEl,
);

const reviewPanel = new ReviewPanel({
  inputEl,
  sendButtonEl,
  promptComposerEl,
  chatManager,
  vscodeService,
  reviewState,
});

const handler = new MessageHandler(
  chatManager,
  loadingManager,
  reviewState,
  reviewPanel,
  reviewHeader,
  statusBar,
  vscodeService,
);

vscodeService.send("webviewReady");

window.addEventListener("message", (e) => handler.handle(e));
