export function renderMessageContent(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();

  // Matches text between triple backticks
  const codeRe = /```([\s\S]*?)```/g;

  let last = 0;
  let match;

  while ((match = codeRe.exec(text))) {
    // Append text preceding the code block
    const before = text.slice(last, match.index);
    if (before) {
      frag.appendChild(document.createTextNode(before));
    }

    // Create the code block structure
    const pre = document.createElement("pre");
    pre.className = "code-block";

    const code = document.createElement("code");
    code.textContent = match[1];

    pre.appendChild(code);
    frag.appendChild(pre);

    last = match.index + match[0].length;
  }

  // Append remaining text after the last code block
  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }

  return frag;
}
