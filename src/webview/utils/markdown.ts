function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendInlineMarkdown(container: HTMLElement, text: string): void {
  const inlineRe = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRe.exec(text)) !== null) {
    if (match.index > last) {
      container.appendChild(document.createTextNode(text.slice(last, match.index)));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else {
      const code = document.createElement("code");
      code.className = "inline-code";
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    container.appendChild(document.createTextNode(text.slice(last)));
  }
}

function createParagraph(text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  appendInlineMarkdown(paragraph, text);
  return paragraph;
}

function createCodeBlock(language: string, code: string): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = "code-block";

  const codeEl = document.createElement("code");
  codeEl.className = language ? `markdown-code language-${language}` : "markdown-code";
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  return pre;
}

function parseListBlock(lines: string[], startIndex: number): { node: HTMLElement; nextIndex: number } {
  const first = lines[startIndex].trim();
  const ordered = /^\d+\.\s+/.test(first);
  const list = document.createElement(ordered ? "ol" : "ul");
  let index = startIndex;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    const itemMatch = ordered
      ? trimmed.match(/^\d+\.\s+(.*)$/)
      : trimmed.match(/^[-*]\s+(.*)$/);

    if (!itemMatch) {
      break;
    }

    const item = document.createElement("li");
    appendInlineMarkdown(item, itemMatch[1]);
    list.appendChild(item);
    index += 1;
  }

  return { node: list, nextIndex: index };
}

export function renderMessageContent(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return frag;
  }

  const codeBlocks: string[] = [];
  const placeholderPrefix = "@@CODE_BLOCK_";
  const withoutCode = normalized.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const token = `${placeholderPrefix}${codeBlocks.length}@@`;
    codeBlocks.push(JSON.stringify({ language: String(lang ?? "").trim(), code: String(code).trimEnd() }));
    return token;
  });

  const lines = withoutCode.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codePlaceholder = trimmed.match(/^@@CODE_BLOCK_(\d+)@@$/);
    if (codePlaceholder) {
      const stored = JSON.parse(codeBlocks[Number(codePlaceholder[1])]) as {
        language: string;
        code: string;
      };
      frag.appendChild(createCodeBlock(stored.language, stored.code));
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = document.createElement(`h${Math.min(level + 1, 3)}`);
      appendInlineMarkdown(heading, headingMatch[2]);
      frag.appendChild(heading);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const listBlock = parseListBlock(lines, index);
      frag.appendChild(listBlock.node);
      index = listBlock.nextIndex;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      frag.appendChild(document.createElement("hr"));
      index += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        /^#{1,3}\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        /^@@CODE_BLOCK_\d+@@$/.test(next) ||
        /^---+$/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }

    frag.appendChild(createParagraph(paragraphLines.join(" ")));
  }

  return frag;
}

export function enhanceRenderedContent(root: HTMLElement): void {
  root.querySelectorAll("pre.code-block").forEach((pre) => {
    if (pre.querySelector(".code-copy-btn")) {
      return;
    }

    const code = pre.querySelector("code");
    if (!code) {
      return;
    }

    pre.classList.add("code-block-wrapper");

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.title = "Copy code";
    copyBtn.setAttribute("aria-label", "Copy code");

    copyBtn.addEventListener("click", async () => {
      const source = code.textContent ?? "";
      try {
        await navigator.clipboard.writeText(source);
        copyBtn.textContent = "Copied";
        window.setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1200);
      } catch {
        copyBtn.textContent = "Failed";
        window.setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1200);
      }
    });

    pre.appendChild(copyBtn);
  });
}

export { escapeHtml };
