export class ClipboardService {
	async copy(text: string): Promise<void> {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}

		const fallback = document.createElement("textarea");
		fallback.value = text;
		fallback.setAttribute("readonly", "true");
		fallback.style.position = "fixed";
		fallback.style.left = "-9999px";
		fallback.style.top = "0";

		document.body.appendChild(fallback);
		fallback.focus();
		fallback.select();

		document.execCommand("copy");
		fallback.remove();
	}
}
