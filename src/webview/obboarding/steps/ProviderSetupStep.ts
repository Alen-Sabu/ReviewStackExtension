import type { ProviderId } from "../../../types/provider";
import type { VSCodeService } from "../../services/VSCodeService";
import {
  PROVIDER_DEFAULTS,
  PROVIDER_LABELS,
} from "./providerDefaults";

export type SaveProviderPayload = {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

export type TestProviderPayload = {
  provider: ProviderId;
  model: string;
  baseUrl: string;
};

type SetupCallbacks = {
  onSave: (payload: SaveProviderPayload) => void;
  onTest: (payload: TestProviderPayload) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
};

export function render(
  root: HTMLElement,
  provider: ProviderId,
  callbacks: SetupCallbacks,
  vscodeService: VSCodeService,
): void {
  const defaults = PROVIDER_DEFAULTS[provider];
  const label = PROVIDER_LABELS[provider];

  if (defaults.needsApiKey) {
    root.innerHTML = `
      <div class="onboarding-screen">
        <div class="onboarding-card">
          <div class="onboarding-card-header">
            <p class="onboarding-eyebrow">Step 3 of 3</p>
            <h1 class="onboarding-title">Configure ${label}</h1>
            <p class="onboarding-text">Enter your API key and preferred model.</p>
          </div>
          <label class="onboarding-field">
            <span class="onboarding-label">API Key</span>
            <input type="password" id="apiKey" class="onboarding-input" autocomplete="off" placeholder="Paste your API key" />
          </label>
          <label class="onboarding-field">
            <span class="onboarding-label">Model</span>
            <input type="text" id="model" class="onboarding-input" value="${defaults.model}" />
          </label>
          <a href="#" id="getKeyLink" class="onboarding-link">Get API Key</a>
          <div class="onboarding-actions">
            <button type="button" id="backBtn" class="onboarding-btn secondary">Back</button>
            <button type="button" id="saveBtn" class="onboarding-btn primary">Save &amp; Continue</button>
          </div>
        </div>
      </div>
    `;

    root.querySelector("#getKeyLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      vscodeService.send("openExternal", { url: defaults.keyUrl });
    });

    root.querySelector("#backBtn")?.addEventListener("click", callbacks.onBack);

    root.querySelector("#saveBtn")?.addEventListener("click", () => {
      const apiKey = (root.querySelector("#apiKey") as HTMLInputElement).value.trim();
      const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
      if (!apiKey) {
        return;
      }
      callbacks.onSave({ provider, model: model || defaults.model, apiKey });
    });
    return;
  }

  const ollamaDefaults = defaults as { model: string; baseUrl: string };

  root.innerHTML = `
    <div class="onboarding-screen">
      <div class="onboarding-card">
        <div class="onboarding-card-header">
          <p class="onboarding-eyebrow">Step 3 of 3</p>
          <h1 class="onboarding-title">Configure ${label}</h1>
          <p class="onboarding-text">Connect to your local Ollama instance.</p>
        </div>
        <label class="onboarding-field">
          <span class="onboarding-label">Base URL</span>
          <input type="text" id="baseUrl" class="onboarding-input" value="${ollamaDefaults.baseUrl}" />
        </label>
        <label class="onboarding-field">
          <span class="onboarding-label">Model</span>
          <input type="text" id="model" class="onboarding-input" value="${ollamaDefaults.model}" />
        </label>
        <p id="testResult" class="onboarding-test-result" hidden></p>
        <div class="onboarding-actions">
          <button type="button" id="backBtn" class="onboarding-btn secondary">Back</button>
          <button type="button" id="testBtn" class="onboarding-btn secondary">Test Connection</button>
          <button type="button" id="saveBtn" class="onboarding-btn primary">Save &amp; Continue</button>
        </div>
      </div>
    </div>
  `;

  const testResultEl = root.querySelector("#testResult") as HTMLElement;

  root.querySelector("#backBtn")?.addEventListener("click", callbacks.onBack);

  root.querySelector("#testBtn")?.addEventListener("click", async () => {
    const baseUrl = (root.querySelector("#baseUrl") as HTMLInputElement).value.trim();
    const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
    const testBtn = root.querySelector("#testBtn") as HTMLButtonElement;
    testBtn.disabled = true;
    testResultEl.hidden = true;

    const result = await callbacks.onTest({
      provider,
      model: model || ollamaDefaults.model,
      baseUrl: baseUrl || ollamaDefaults.baseUrl,
    });

    testResultEl.hidden = false;
    testResultEl.textContent = result.ok
      ? "Connection successful."
      : `Connection failed: ${result.error ?? "Unknown error"}`;
    testResultEl.className = `onboarding-test-result ${result.ok ? "success" : "error"}`;
    testBtn.disabled = false;
  });

  root.querySelector("#saveBtn")?.addEventListener("click", () => {
    const baseUrl = (root.querySelector("#baseUrl") as HTMLInputElement).value.trim();
    const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
    callbacks.onSave({
      provider,
      model: model || ollamaDefaults.model,
      baseUrl: baseUrl || ollamaDefaults.baseUrl,
    });
  });
}
