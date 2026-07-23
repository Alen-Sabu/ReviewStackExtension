// reviewstack/src/webview/obboarding/steps/SignInStep.ts
import type { VSCodeService } from "../../services/VSCodeService";

export type AuthStatePayload = {
  signedIn: boolean;
  onboardingComplete?: boolean;
  error?: string;
};

type SignInCallbacks = {
  onSignedIn: (state: AuthStatePayload) => void;
};

const SIGN_IN_HTML = `
  <div class="onboarding-welcome">
    <div class="onboarding-card">
      <div class="onboarding-welcome-hero">
        <div class="onboarding-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="onboarding-logo-icon">
            <path fill="currentColor" d="M9.4 16.6 4.8 12l-1.4 1.4L9.4 19.4 21 7.8l-1.4-1.4z"/>
          </svg>
        </div>
        <p class="onboarding-eyebrow">ReviewStack</p>
        <h1 class="onboarding-title">Sign in to continue</h1>
        <p class="onboarding-text onboarding-lead">
          ReviewStack uses GitHub to authenticate, then reviews your code with full repository context.
        </p>
      </div>
      <ul class="onboarding-features">
        <li class="onboarding-feature">
          <span class="onboarding-feature-icon" aria-hidden="true">⌁</span>
          <span>Repository-aware reviews that understand your project</span>
        </li>
        <li class="onboarding-feature">
          <span class="onboarding-feature-icon" aria-hidden="true">◎</span>
          <span>Click <strong>Review</strong> on any function to get started</span>
        </li>
        <li class="onboarding-feature">
          <span class="onboarding-feature-icon" aria-hidden="true">↪</span>
          <span>Ask follow-up questions in the chat panel</span>
        </li>
      </ul>
      <div id="signInError" class="onboarding-test-result error" hidden></div>
      <button type="button" id="signInBtn" class="onboarding-btn primary onboarding-cta">
        Sign in with GitHub
      </button>
    </div>
  </div>
`;

export function render(
  root: HTMLElement,
  vscodeService: VSCodeService,
  callbacks: SignInCallbacks,
): void {
  root.innerHTML = SIGN_IN_HTML;

  const btn = root.querySelector("#signInBtn") as HTMLButtonElement;
  const errorEl = root.querySelector("#signInError") as HTMLElement;

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "Signing in…";
    errorEl.hidden = true;

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "authState") return;

      window.removeEventListener("message", onMessage);

      const state = e.data as AuthStatePayload;
      if (state.signedIn) {
        callbacks.onSignedIn(state);
        return;
      }

      btn.disabled = false;
      btn.textContent = "Sign in with GitHub";
      errorEl.hidden = false;
      errorEl.textContent = state.error || "Sign-in failed. Please try again.";
    };

    window.addEventListener("message", onMessage);
    vscodeService.send("signIn");
  });
}