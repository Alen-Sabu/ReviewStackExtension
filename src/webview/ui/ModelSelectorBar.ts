import type { ProviderConfig } from "../../types/provider";
import { VSCodeService } from "../services/VSCodeService";

const CHANGE_VALUE = "__change__";

export class ModelSelectorBar {
  constructor(
    private readonly selectEl: HTMLSelectElement,
    private readonly vscodeService: VSCodeService,
    private readonly onOpenSetup: (config: ProviderConfig) => void,
  ) {}

  async refresh(): Promise<void> {
    const config = await this.vscodeService.request<ProviderConfig | null>(
      "getProviderConfig",
    );
    const model = config?.model ?? "Not configured";
    this.selectEl.innerHTML = `
      <option value="${model}" selected>${model}</option>
      <option value="${CHANGE_VALUE}">Change model…</option>
    `;
    this.selectEl.dataset.provider = config?.provider ?? "";
  }

  bind(): void {
    this.selectEl.addEventListener("change", () => {
      if (this.selectEl.value !== CHANGE_VALUE) {
        return;
      }
      const provider = this.selectEl.dataset.provider;
      const model = this.selectEl.options[0]?.value;
      if (!provider) {
        return;
      }
      this.selectEl.value = model;
      this.onOpenSetup({
        provider: provider as ProviderConfig["provider"],
        model: model === "Not configured" ? "" : model,
      });
    });
  }
}
