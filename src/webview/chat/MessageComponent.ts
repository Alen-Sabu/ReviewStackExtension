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

        const copyBtn = this.createCopyButton(text);

        const content = document.createElement("div");
        content.className = 'message-content';

        content.append(bubble, copyBtn);

        if(role === "user"){
            li.append(meta, content);
        }else{
            li.append(content, meta);
        }

        return li;
    }

    private static createCopyButton(text: string): HTMLElement {
        const btn = document.createElement("button");

        btn.className = "copy-btn";
        btn.textContent = "Copy";

        btn.addEventListener("click", async () => {
            try {
                await MessageComponent.clipboard.copy(text);
                btn.textContent = "Copied";
            } catch {
                btn.textContent = "Error";
            }

            setTimeout(() => {
                btn.textContent = "Copy";
            }, 1000);
        })

        return btn
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