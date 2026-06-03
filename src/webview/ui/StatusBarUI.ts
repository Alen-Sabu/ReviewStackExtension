export type ReviewStatus = "ready" | "indexing" | "reviewing" | "error";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  ready: "Ready",
  indexing: "Indexing...",
  reviewing: "Reviewing...",
  error: "Error",
};

export class StatusBarUI {
  constructor(
    private readonly statusDot: HTMLElement,
    private readonly reviewState: HTMLElement,
  ) {}

  setStatus(state: ReviewStatus): void {
    this.statusDot.className = `status-dot ${state}`;
    this.reviewState.textContent = STATUS_LABELS[state] ?? "Ready";
  }
}
