import { formatTime } from "../utils/time";
import { renderMessageContent, enhanceRenderedContent } from "../utils/markdown";
import { ClipboardService } from "../services/ClipboardService";
import { VSCodeService } from "../services/VSCodeService";

export class MessageComponent {
  private static readonly clipboard = new ClipboardService();
  private static readonly vscodeService = new VSCodeService();

  static create(text: string, role: string): HTMLElement {
    const li = document.createElement("li");
    li.className = `msg ${role}`;

    const meta = this.createMeta(role);

    const bubbleBody = document.createElement("div");
    bubbleBody.className = "bubble-body markdown-body";
    bubbleBody.appendChild(renderMessageContent(text));
    enhanceRenderedContent(bubbleBody);

    const actions = document.createElement("div");
    actions.className = "message-actions";

    if (role === "bot") {
      actions.appendChild(this.createFeedbackBar(text));
    }

    actions.appendChild(this.createCopyButton(text));

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.append(bubbleBody, actions);

    const content = document.createElement("div");
    content.className = "message-content";
    content.append(bubble);

    if (role === "user") {
      li.append(meta, content);
    } else {
      li.append(content, meta);
    }

    return li;
  }

  static finalizeBotMessage(streamingEl: HTMLElement, text: string): HTMLElement {
    streamingEl.classList.remove("streaming");

    const meta = this.createMeta("bot");
    streamingEl.appendChild(meta);

    const bubble = streamingEl.querySelector(".bubble");
    if (bubble) {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      actions.appendChild(this.createFeedbackBar(text));
      actions.appendChild(this.createCopyButton(text));
      bubble.appendChild(actions);
    }

    return streamingEl;
  }

  private static createMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private static createFeedbackBar(text: string): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "feedback-bar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Rate this response");

    const label = document.createElement("span");
    label.className = "feedback-label";
    label.textContent = "Helpful?";

    const upBtn = this.createFeedbackButton("up", "Helpful", this.thumbsUpIconSvg());
    const downBtn = this.createFeedbackButton(
      "down",
      "Not helpful",
      this.thumbsDownIconSvg(),
    );

    bar.append(label, upBtn, downBtn);

    const messageId = this.createMessageId();

    const onSelect = (selected: HTMLButtonElement, value: "up" | "down") => {
      bar.querySelectorAll<HTMLButtonElement>(".feedback-btn").forEach((btn) => {
        btn.classList.remove("is-selected");
        btn.disabled = true;
      });
      selected.classList.add("is-selected");
      selected.disabled = false;

      MessageComponent.vscodeService.send("feedback", {
        messageId,
        value,
        preview: text.slice(0, 200),
      });
    };

    upBtn.addEventListener("click", () => onSelect(upBtn, "up"));
    downBtn.addEventListener("click", () => onSelect(downBtn, "down"));

    return bar;
  }

  private static createFeedbackButton(
    value: string,
    label: string,
    icon: SVGElement,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feedback-btn";
    btn.setAttribute("data-feedback", value);
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.append(icon);
    return btn;
  }

  private static createCopyButton(text: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.setAttribute("aria-label", "Copy message");
    btn.title = "Copy";

    const copyIcon = MessageComponent.copyIconSvg();
    const checkIcon = MessageComponent.checkIconSvg();
    checkIcon.style.display = "none";

    btn.append(copyIcon, checkIcon);

    btn.addEventListener("click", async () => {
      try {
        await MessageComponent.clipboard.copy(text);
        copyIcon.style.display = "none";
        checkIcon.style.display = "block";
        btn.title = "Copied";
        btn.setAttribute("aria-label", "Copied");
      } catch {
        btn.title = "Copy failed";
      }

      setTimeout(() => {
        copyIcon.style.display = "block";
        checkIcon.style.display = "none";
        btn.title = "Copy";
        btn.setAttribute("aria-label", "Copy message");
      }, 1200);
    });

    return btn;
  }

  private static thumbsUpIconSvg(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "feedback-btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>';
    return svg;
  }

  private static thumbsDownIconSvg(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "feedback-btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path fill="currentColor" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23 16.41 16.41c.37-.36.59-.86.59-1.41V6c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>';
    return svg;
  }

  private static copyIconSvg(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "copy-btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>';
    return svg;
  }

  private static checkIconSvg(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "copy-btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>';
    return svg;
  }

  private static createMeta(role: string): HTMLElement {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<div>${role === "user" ? "👤" : "⚇"}</div><div class="time">${formatTime()}</div>`;
    return meta;
  }
}
