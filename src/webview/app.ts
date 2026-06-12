import { ChatManager } from "./chat/ChatManager";
import { LoadingManager } from "./chat/Loading";
import { ReviewHeader } from "./chat/ReviewHeader";
import { ReviewPanel } from "./chat/ReviewPanel";
import { MessageHandler } from "./handlers/MessageHandler";
import { OnboardingController } from "./obboarding/OnboardingController";
import { ReviewState } from "./state/ReviewState";
import { VSCodeService } from "./services/VSCodeService";
import { StatusBarUI } from "./ui/StatusBarUI";
import { ContextPanel } from "./ui/ContextPanel";

function requireEl<T extends HTMLElement>(el: T | null, id: string): T {
  if (!el) {
    throw new Error(`ReviewStack webview is missing required DOM element: #${id}`);
  }
  return el;
}

const messagesEl = requireEl(document.getElementById("messages"), "messages");
const messagesContainerEl = requireEl(
  document.getElementById("messagesContainer"),
  "messagesContainer",
);
const emptyStateEl = requireEl(document.getElementById("emptyState"), "emptyState");
const inputEl = requireEl(
  document.getElementById("input") as HTMLTextAreaElement | null,
  "input",
);
const sendButtonEl = requireEl(
  document.getElementById("send") as HTMLButtonElement | null,
  "send",
);
const promptComposerEl = requireEl(
  document.getElementById("promptComposer"),
  "promptComposer",
);
const fileInfoEl = requireEl(document.getElementById("fileInfo"), "fileInfo");
const filePathEl = requireEl(document.getElementById("filePath"), "filePath");
const langBadgeEl = requireEl(document.getElementById("langBadge"), "langBadge");
const reviewContentEl = requireEl(
  document.getElementById("reviewContent"),
  "reviewContent",
);
const contextInfoEl = requireEl(document.getElementById("contextInfo"), "contextInfo");
const contextToggleEl = requireEl(
  document.getElementById("contextToggle"),
  "contextToggle",
);
const contextFileListEl = requireEl(
  document.getElementById("contextFileList"),
  "contextFileList",
);
const statusDotEl = requireEl(document.getElementById("statusDot"), "statusDot");
const reviewStateEl = requireEl(document.getElementById("reviewState"), "reviewState");
const reviewSectionEl = requireEl(
  document.getElementById("reviewSection"),
  "reviewSection",
);
const onboardingRootEl = requireEl(
  document.getElementById("onboardingRoot"),
  "onboardingRoot",
);
const onboardingStepEl = requireEl(
  document.getElementById("onboardingStep"),
  "onboardingStep",
);

const vscodeService = new VSCodeService();
let chatMounted = false;
let onboardingMounted = false;

function setChatVisible(visible: boolean): void {
  reviewSectionEl.hidden = !visible;
  messagesContainerEl.hidden = !visible;
  promptComposerEl.hidden = !visible;
}

function mountChatApp(): void {
  if (chatMounted) {
    return;
  }
  chatMounted = true;
  onboardingRootEl.hidden = true;
  setChatVisible(true);

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

  const contextPanel = new ContextPanel(
    contextInfoEl,
    contextToggleEl as HTMLButtonElement,
    contextFileListEl,
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
    contextPanel,
    statusBar,
    vscodeService,
  );

  window.addEventListener("message", (e) => handler.handle(e));
}

function mountOnboarding(): void {
  if (onboardingMounted) {
    return;
  }
  onboardingMounted = true;
  setChatVisible(false);
  onboardingRootEl.hidden = false;

  new OnboardingController(
    onboardingStepEl,
    onboardingRootEl,
    vscodeService,
    () => {
      onboardingMounted = false;
      mountChatApp();
    },
  ).start();
}

function boot(): void {
  if (onboardingRootEl.hidden) {
    mountChatApp();
    return;
  }
  mountOnboarding();
}

boot();
vscodeService.send("webviewReady");

window.addEventListener("message", (e) => {
  if (e.data?.type !== "init") {
    return;
  }

  if (e.data.onboardingComplete) {
    if (!chatMounted) {
      onboardingMounted = false;
      mountChatApp();
    }
    return;
  }

  if (!onboardingMounted) {
    mountOnboarding();
  }
});
