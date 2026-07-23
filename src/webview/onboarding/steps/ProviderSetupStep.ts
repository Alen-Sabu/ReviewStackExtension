import type { ProviderId } from "../../../types/provider";
import type { VSCodeService } from "../../services/VSCodeService";
import {
  getDefaultModel,
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
  apiKey?: string;
  baseUrl?: string;
};

type SetupCallbacks = {
  onSave: (payload: SaveProviderPayload) => void;
  onTest: (payload: TestProviderPayload) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
};

function wireTestAndSaveGating(
  root: HTMLElement,
  callbacks: SetupCallbacks,
  getTestPayload: () => TestProviderPayload | null,
  getSavePayload: () => SaveProviderPayload | null,
): void {
  const testResultEl = root.querySelector("#testResult") as HTMLElement;
  const testBtn = root.querySelector("#testBtn") as HTMLButtonElement;
  const saveBtn = root.querySelector("#saveBtn") as HTMLButtonElement;

  saveBtn.disabled = true;

  const resetTestState = (): void => {
    saveBtn.disabled = true;
    testResultEl.hidden = true;
  };

  root.querySelectorAll(".onboarding-input").forEach((input) => {
    input.addEventListener("input", resetTestState);
  });

  testBtn.addEventListener("click", async () => {
    const payload = getTestPayload();
    if (!payload) {
      return;
    }

    testBtn.disabled = true;
    testResultEl.hidden = true;
    saveBtn.disabled = true;

    const result = await callbacks.onTest(payload);

    testResultEl.hidden = false;
    testResultEl.textContent = result.ok
      ? "Connection successful."
      : (result.error ?? "Could not connect. Please try again.");
    testResultEl.className = `onboarding-test-result ${result.ok ? "success" : "error"}`;
    saveBtn.disabled = !result.ok;
    testBtn.disabled = false;
  });

  saveBtn.addEventListener("click", () => {
    if (saveBtn.disabled) {
      return;
    }
    const payload = getSavePayload();
    if (!payload) {
      return;
    }
    callbacks.onSave(payload);
  });
}

export function render(
  root: HTMLElement,
  provider: ProviderId,
  callbacks: SetupCallbacks,
  vscodeService: VSCodeService,
  initial?: { model?: string; baseUrl?: string },
): void {
  const defaults = PROVIDER_DEFAULTS[provider];
  const label = PROVIDER_LABELS[provider];
  const defaultModel = getDefaultModel(provider);
  const modelValue = initial?.model || defaultModel;

  if (defaults.needsApiKey) {
    root.innerHTML = `
      <div class="onboarding-screen">
        <div class="onboarding-card">
          <div class="onboarding-card-header">
            <p class="onboarding-eyebrow">Step 3 of 3</p>
            <h1 class="onboarding-title">Configure ${label}</h1>
            <p class="onboarding-text">Enter your API key and preferred model, then test the connection.</p>
          </div>
          <label class="onboarding-field">
            <span class="onboarding-label">API Key</span>
            <input type="password" id="apiKey" class="onboarding-input" autocomplete="off" placeholder="Paste your API key" />
          </label>
          <label class="onboarding-field">
            <span class="onboarding-label">Model</span>
            <input type="text" id="model" class="onboarding-input" value="${modelValue}" />
          </label>
          <a href="#" id="getKeyLink" class="onboarding-link">Get API Key</a>
          <p id="testResult" class="onboarding-test-result" hidden></p>
          <div class="onboarding-actions">
            <button type="button" id="backBtn" class="onboarding-btn secondary">Back</button>
            <button type="button" id="testBtn" class="onboarding-btn secondary">Test Connection</button>
            <button type="button" id="saveBtn" class="onboarding-btn primary" disabled>Save &amp; Continue</button>
          </div>
        </div>
      </div>
    `;

    root.querySelector("#getKeyLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      vscodeService.send("openExternal", { url: defaults.keyUrl });
    });

    root.querySelector("#backBtn")?.addEventListener("click", callbacks.onBack);

    wireTestAndSaveGating(
      root,
      callbacks,
      () => {
        const apiKey = (root.querySelector("#apiKey") as HTMLInputElement).value.trim();
        const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
        if (!apiKey) {
          return null;
        }
        return {
          provider,
          model: model || defaultModel,
          apiKey,
        };
      },
      () => {
        const apiKey = (root.querySelector("#apiKey") as HTMLInputElement).value.trim();
        const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
        if (!apiKey) {
          return null;
        }
        return { provider, model: model || defaultModel, apiKey };
      },
    );
    return;
  }

  const ollamaDefaults = defaults as { model: string; baseUrl: string };
  const baseUrlValue = initial?.baseUrl || ollamaDefaults.baseUrl;
  const ollamaModelValue = initial?.model || defaultModel;

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
          <input type="text" id="baseUrl" class="onboarding-input" value="${baseUrlValue}" />
        </label>
        <label class="onboarding-field">
          <span class="onboarding-label">Model</span>
          <input type="text" id="model" class="onboarding-input" value="${ollamaModelValue}" />
        </label>
        <p id="testResult" class="onboarding-test-result" hidden></p>
        <div class="onboarding-actions">
          <button type="button" id="backBtn" class="onboarding-btn secondary">Back</button>
          <button type="button" id="testBtn" class="onboarding-btn secondary">Test Connection</button>
          <button type="button" id="saveBtn" class="onboarding-btn primary" disabled>Save &amp; Continue</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#backBtn")?.addEventListener("click", callbacks.onBack);

  wireTestAndSaveGating(
    root,
    callbacks,
    () => {
      const baseUrl = (root.querySelector("#baseUrl") as HTMLInputElement).value.trim();
      const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
      return {
        provider,
        model: model || defaultModel,
        baseUrl: baseUrl || ollamaDefaults.baseUrl,
      };
    },
    () => {
      const baseUrl = (root.querySelector("#baseUrl") as HTMLInputElement).value.trim();
      const model = (root.querySelector("#model") as HTMLInputElement).value.trim();
      return {
        provider,
        model: model || defaultModel,
        baseUrl: baseUrl || ollamaDefaults.baseUrl,
      };
    },
  );
}
