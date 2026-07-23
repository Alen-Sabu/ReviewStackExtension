import type { ProviderId } from "../../types/provider";
import { VSCodeService } from "../services/VSCodeService";
import * as ProviderPickStep from "./steps/ProviderPickStep";
import * as ProviderSetupStep from "./steps/ProviderSetupStep";
import type {
  SaveProviderPayload,
  TestProviderPayload,
} from "./steps/ProviderSetupStep";
import * as WelcomeStep from "./steps/WelcomeStep";

type OnboardingStep = "welcome" | "pick" | "setup";

export class OnboardingController {
  private step: OnboardingStep = "welcome";
  private selectedProvider: ProviderId | null = null;

  constructor(
    private stepEl: HTMLElement,
    private rootEl: HTMLElement,
    private vscodeService: VSCodeService,
    private onComplete: () => void,
  ) {}

  startAt(
    step: OnboardingStep,
    provider: ProviderId,
    initial?: { model?: string; baseUrl?: string },
  ): void {
    this.step = step;
    this.selectedProvider = provider;
    this.initial = initial;
    this.rootEl.hidden = false;
    this.render();
  }

  private initial?: { model?: string; baseUrl?: string };

  start(): void {
    this.rootEl.hidden = false;
    this.render();
  }

  private render(): void {
    if (this.step === "welcome") {
      WelcomeStep.render(this.stepEl, () => {
        this.step = "pick";
        this.render();
      });
    } else if (this.step === "pick") {
      ProviderPickStep.render(this.stepEl, (provider) => {
        this.selectedProvider = provider;
        this.initial = undefined;
        this.step = "setup";
        this.render();
      });
    } else if (this.step === "setup" && this.selectedProvider) {
      ProviderSetupStep.render(
        this.stepEl,
        this.selectedProvider,
        {
          onSave: (payload) => void this.handleSave(payload),
          onTest: (payload) => this.handleTest(payload),
          onBack: () => {
            this.step = "pick";
            this.render();
          },
        },
        this.vscodeService,
        this.initial,
      );
    }
  }

  private async handleSave(payload: SaveProviderPayload): Promise<void> {
    await this.vscodeService.request("saveProvider", payload);
    this.rootEl.hidden = true;
    this.onComplete();
  }

  private async handleTest(
    payload: TestProviderPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.vscodeService.request<{ ok: boolean; error?: string }>(
      "testProvider",
      payload,
    );
  }
}
