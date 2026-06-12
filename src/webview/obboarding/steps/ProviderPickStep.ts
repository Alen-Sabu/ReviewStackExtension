import type { ProviderId } from "../../../types/provider";
import { PROVIDER_LABELS } from "./providerDefaults";

const PROVIDER_ORDER: ProviderId[] = [
  "ollama",
  "google",
  "openai",
  "anthropic",
  "deepseek",
  "groq",
  "openrouter",
  "azure",
  "aws",
  "ibm",
  "oracle",
];

export function render(
  root: HTMLElement,
  onSelect: (provider: ProviderId) => void,
): void {
  const options = PROVIDER_ORDER.map(
    (id) =>
      `<button type="button" class="onboarding-provider-btn" data-provider="${id}">${PROVIDER_LABELS[id]}</button>`,
  ).join("");

  root.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div class="onboarding-card-header">
          <p class="onboarding-eyebrow">Step 2 of 3</p>
          <h1 class="onboarding-title">Choose a provider</h1>
          <p class="onboarding-text">Select the AI provider you want to use for code reviews.</p>
        </div>
        <div class="onboarding-provider-list">${options}</div>
      </div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-provider]").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSelect(btn.dataset.provider as ProviderId);
    });
  });
}
