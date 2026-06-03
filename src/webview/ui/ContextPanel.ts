import type { ContextInfoPayload } from "../../types/review";

export type { ContextInfoPayload };

const REASON_LABELS: Record<string, string> = {
  target_file: "Target file",
  same_directory: "Same folder",
  import: "Import",
  symbol_reference: "Symbol",
  related_content: "Related",
};

export class ContextPanel {
  private expanded = false;

  constructor(
    private readonly rootEl: HTMLElement,
    private readonly toggleEl: HTMLElement,
    private readonly listEl: HTMLElement,
  ) {
    this.toggleEl.addEventListener("click", () => this.toggle());
  }

  display(payload: ContextInfoPayload): void {
    const { files, limitHit, candidatesConsidered } = payload;
    const count = files.length;
    const limitNote = limitHit ? " · limit reached" : "";

    this.toggleEl.textContent =
      `Context: ${count} file${count === 1 ? "" : "s"}` +
      ` (${candidatesConsidered} considered)${limitNote}` +
      (count > 0 ? (this.expanded ? " ▼" : " ▶") : "");

    this.listEl.innerHTML = "";

    if (count === 0) {
      this.rootEl.style.display = limitHit ? "block" : "none";
      this.listEl.hidden = true;
      return;
    }

    this.rootEl.style.display = "block";

    for (const file of files) {
      const li = document.createElement("li");
      li.className = "context-file-item";

      const reason = file.reason
        ? (REASON_LABELS[file.reason] ?? file.reason)
        : "Included";
      const trunc = file.truncated ? " · truncated" : "";
      const chars =
        file.chars >= 1000
          ? `${(file.chars / 1000).toFixed(1)}k chars`
          : `${file.chars} chars`;

      li.textContent = `${file.path} — ${reason} (${chars}${trunc})`;
      this.listEl.appendChild(li);
    }

    this.listEl.hidden = !this.expanded;
  }

  clear(): void {
    this.expanded = false;
    this.rootEl.style.display = "none";
    this.listEl.innerHTML = "";
    this.listEl.hidden = true;
    this.toggleEl.textContent = "";
  }

  private toggle(): void {
    if (this.listEl.children.length === 0) {
      return;
    }
    this.expanded = !this.expanded;
    this.listEl.hidden = !this.expanded;
    const base = this.toggleEl.textContent?.replace(/ [▶▼]$/, "") ?? "";
    this.toggleEl.textContent = base + (this.expanded ? " ▼" : " ▶");
  }
}
