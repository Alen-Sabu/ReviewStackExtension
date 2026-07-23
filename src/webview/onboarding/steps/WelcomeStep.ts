export const WELCOME_HTML = `
  <div class="onboarding-welcome">
    <div class="onboarding-card">
      <div class="onboarding-welcome-hero">
        <div class="onboarding-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="onboarding-logo-icon">
            <path fill="currentColor" d="M9.4 16.6 4.8 12l-1.4 1.4L9.4 19.4 21 7.8l-1.4-1.4z"/>
          </svg>
        </div>
        <p class="onboarding-eyebrow">Step 1 of 3</p>
        <h1 class="onboarding-title">Welcome aboard</h1>
        <p class="onboarding-text onboarding-lead">
          Set up your AI provider once, then review code with full repository context.
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
      <button type="button" id="getStarted" class="onboarding-btn primary onboarding-cta">
        Get Started
      </button>
    </div>
  </div>
`;

export function render(root: HTMLElement, onNext: () => void): void {
  root.innerHTML = WELCOME_HTML;
  root.querySelector("#getStarted")?.addEventListener("click", onNext, { once: true });
}
