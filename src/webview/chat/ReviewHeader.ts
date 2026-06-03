export type ReviewFunctionPayload = {
  code: string;
  filePath: string;
  language: string;
};

const LINE_THRESHOLD = 10;

export class ReviewHeader {
  constructor(
    private readonly fileInfoEl: HTMLElement,
    private readonly filePathEl: HTMLElement,
    private readonly langBadgeEl: HTMLElement,
    private readonly reviewContentEl: HTMLElement,
  ) {}

  display(payload: ReviewFunctionPayload): void {
    const { code, filePath, language } = payload;

    const fileName =
      filePath.split("/").pop() || filePath.split("\\").pop() || filePath;

    this.filePathEl.textContent = fileName;
    this.langBadgeEl.textContent = language;
    this.fileInfoEl.style.display = "flex";

    const lines = code.split("\n");
    const reviewItem = document.createElement("div");
    reviewItem.className = "review-item";

    if (lines.length > LINE_THRESHOLD) {
      const chip = document.createElement("div");
      chip.className = "function-chip";
      chip.textContent = `Lines 1–${lines.length} (${language}) ▶`;
      let expanded = false;

      chip.addEventListener("click", () => {
        if (!expanded) {
          const codeDisplay = document.createElement("div");
          codeDisplay.className = "code-display";
          codeDisplay.textContent = code;
          reviewItem.appendChild(codeDisplay);
          chip.textContent = `Lines 1–${lines.length} (${language}) ▼`;
          expanded = true;
        } else {
          reviewItem.querySelector(".code-display")?.remove();
          chip.textContent = `Lines 1–${lines.length} (${language}) ▶`;
          expanded = false;
        }
      });

      reviewItem.appendChild(chip);
    } else {
      const codeDisplay = document.createElement("div");
      codeDisplay.className = "code-display";
      codeDisplay.textContent = code;
      reviewItem.appendChild(codeDisplay);
    }

    this.reviewContentEl.innerHTML = "";
    this.reviewContentEl.appendChild(reviewItem);
  }
}
