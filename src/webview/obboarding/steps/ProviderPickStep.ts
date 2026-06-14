import type { ProviderId } from "../../../types/provider";
import { ENABLED_PROVIDERS, PROVIDER_LABELS } from "./providerDefaults";

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

function isProviderEnabled(id: ProviderId): boolean {
  return ENABLED_PROVIDERS.includes(id);
}

function renderProviderButton(id: ProviderId): string {
  const enabled = isProviderEnabled(id);
  const label = PROVIDER_LABELS[id];
  const badge = enabled
    ? ""
    : `<span class="onboarding-provider-badge">Coming soon</span>`;

  return `
    <button
      type="button"
      class="onboarding-provider-btn${enabled ? "" : " is-disabled"}"
      data-provider="${id}"
      ${enabled ? "" : "disabled"}
      aria-disabled="${enabled ? "false" : "true"}"
    >
      <span class="onboarding-provider-label">${label}</span>
      ${badge}
    </button>
  `;
}

export function render(
  root: HTMLElement,
  onSelect: (provider: ProviderId) => void,
): void {
  const enabledProviders = PROVIDER_ORDER.filter(isProviderEnabled);
  const disabledProviders = PROVIDER_ORDER.filter((id) => !isProviderEnabled(id));

  const enabledOptions = enabledProviders.map(renderProviderButton).join("");
  const disabledOptions = disabledProviders.map(renderProviderButton).join("");

  root.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div class="onboarding-card-header">
          <p class="onboarding-eyebrow">Step 2 of 3</p>
          <h1 class="onboarding-title">Choose a provider</h1>
          <p class="onboarding-text">Select the AI provider you want to use for code reviews.</p>
        </div>
        <div class="onboarding-provider-list">${enabledOptions}</div>
        ${
          disabledProviders.length > 0
            ? `
          <p class="onboarding-coming-soon-label">More providers coming soon</p>
          <div class="onboarding-provider-list is-disabled-section">${disabledOptions}</div>
        `
            : ""
        }
      </div>
    </div>
  `;

  root
    .querySelectorAll<HTMLButtonElement>("[data-provider]:not(:disabled)")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        onSelect(btn.dataset.provider as ProviderId);
      });
    });
}