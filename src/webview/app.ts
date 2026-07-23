import { ChatManager } from "./chat/ChatManager";
import { LoadingManager } from "./chat/Loading";
import { ReviewHeader } from "./chat/ReviewHeader";
import { ReviewPanel } from "./chat/ReviewPanel";
import { MessageHandler } from "./handlers/MessageHandler";
import { OnboardingController } from "./onboarding/OnboardingController";
import { ReviewState } from "./state/ReviewState";
import { VSCodeService } from "./services/VSCodeService";
import { StatusBarUI } from "./ui/StatusBarUI";
import { ContextPanel } from "./ui/ContextPanel";
import { ModelSelectorBar } from "./ui/ModelSelectorBar";
import type { ProviderConfig } from "../types/provider";
import * as SignInStep from "./onboarding/steps/SignInStep";
import type { AuthStatePayload } from "./onboarding/steps/SignInStep"; 

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
const stopButtonEl = requireEl(
  document.getElementById("stop") as HTMLButtonElement | null,
  "stop",
);
const promptComposerEl = requireEl(
  document.getElementById("promptComposer"),
  "promptComposer",
);
const modelSelectEl = requireEl(
  document.getElementById("modelSelect") as HTMLSelectElement | null,
  "modelSelect",
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
const chatRootEl = requireEl(document.getElementById("chatRoot"), "chatRoot");
const onboardingRootEl = requireEl(
  document.getElementById("onboardingRoot"),
  "onboardingRoot",
);
const onboardingStepEl = requireEl(
  document.getElementById("onboardingStep"),
  "onboardingStep",
);

const vscodeService = new VSCodeService();
let signInMounted = false;
let chatMounted = false;
let onboardingMounted = false;
let modelSelector: ModelSelectorBar | null = null;

function setChatVisible(visible: boolean): void {
  chatRootEl.hidden = !visible;
  onboardingRootEl.hidden = visible;
}

function openProviderSetup(config: ProviderConfig): void {
  setChatVisible(false);
  onboardingMounted = true;

  new OnboardingController(
    onboardingStepEl,
    onboardingRootEl,
    vscodeService,
    () => {
      onboardingMounted = false;
      setChatVisible(true);
      void modelSelector?.refresh();
    },
  ).startAt("setup", config.provider, {
    model: config.model,
    baseUrl: config.baseUrl,
  });
}

function mountChatApp(): void {
  if (chatMounted) {
    setChatVisible(true);
    void modelSelector?.refresh();
    return;
  }
  chatMounted = true;
  setChatVisible(true);

  const reviewState = new ReviewState();
  const chatManager = new ChatManager(messagesEl, messagesContainerEl, emptyStateEl);
  const loadingManager = new LoadingManager(messagesEl, messagesContainerEl);
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
    stopButtonEl,
    promptComposerEl,
    chatManager,
    loadingManager,
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

  modelSelector = new ModelSelectorBar(modelSelectEl, vscodeService, openProviderSetup);
  modelSelector.bind();
  void modelSelector.refresh();

  window.addEventListener("message", (e) => handler.handle(e));
}

function mountOnboarding(): void {
  if (onboardingMounted) {
    return;
  }
  onboardingMounted = true;
  setChatVisible(false);

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

function routeFromAuth(signedIn: boolean, onboardingComplete: boolean): void {
  if (!signedIn) {
    mountSignIn(); 
    return; 
  }
  if (!onboardingComplete) {
    signInMounted = false; 
    mountOnboarding(); 
    return; 
  }
  signInMounted = false; 
  onboardingMounted = false; 
  mountChatApp(); 
}

function mountSignIn(): void {
  if(signInMounted) {
    return;
  }
  signInMounted = true; 
  onboardingMounted = false; 
  setChatVisible(false); 

  SignInStep.render(onboardingStepEl, vscodeService, {
    onSignedIn: (state: AuthStatePayload) => {
      routeFromAuth(true, !!state.onboardingComplete);
    }
  })
}

vscodeService.send("webviewReady");

window.addEventListener("message", (e) => {
  if (e.data?.type === "init") {
    routeFromAuth(!!e.data.signedIn, !!e.data.onboardingComplete);
    return;
  }

  if (e.data?.type === "authState" && e.data.signedIn) {
    routeFromAuth(true, !!e.data.onboardingComplete);
  }
});
