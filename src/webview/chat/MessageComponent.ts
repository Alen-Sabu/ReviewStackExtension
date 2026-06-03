import { formatTime } from "../utils/time";
import { renderMessageContent } from "../utils/markdown";
import { ClipboardService } from "../services/ClipboardService";

export class MessageComponent {
    private static readonly clipboard = new ClipboardService();

    static create(text: string, role: string): HTMLElement {
        const li = document.createElement("li");
        li.className = `msg ${role}`;

        const meta = this.createMeta(role);

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.appendChild(renderMessageContent(text));
        bubble.appendChild(this.createCopyButton(text));

        const content = document.createElement("div");
        content.className = "message-content";

        content.append(bubble);

        if(role === "user"){
            li.append(meta, content);
        }else{
            li.append(content, meta);
        }

        return li;
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

    private static createMeta(role: string) {
        const meta = document.createElement('div');
        meta.className = 'meta';

        meta.innerHTML = `
        <div>${role === "user" ? "👤" : "⚇"}</div>
        <div class="time">${formatTime()}</div>
        `

        return meta;
    }
}