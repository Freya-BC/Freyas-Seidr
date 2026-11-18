/** Seidr-styled confirm / prompt modals (Room Manager + Settings Maps). */
import { rmInjectStyles } from "./styles";

export type RmConfirmOpts = {
	title?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Red-ish confirm button for destructive actions. */
	danger?: boolean;
};

export type RmPromptOpts = {
	/** Optional hint under the title. */
	message?: string;
	initial?: string;
	placeholder?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	maxlength?: number;
};

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function removeOverlay(overlay: HTMLElement) {
	if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

/** Confirm dialog. Resolves true on Confirm, false on Cancel / backdrop / Escape. */
export function rmConfirm(message: string, opts?: RmConfirmOpts): Promise<boolean> {
	rmInjectStyles();
	const title = (opts && opts.title) || "Confirm";
	const okLabel = (opts && opts.confirmLabel) || "Confirm";
	const cancelLabel = (opts && opts.cancelLabel) || "Cancel";
	const danger = !!(opts && opts.danger);
	const okClass = danger ? "seidr-rm-btn-danger" : "seidr-rm-btn-primary";

	return new Promise(function (resolve) {
		const overlay = document.createElement("div");
		overlay.className = "seidr-rm-overlay";
		overlay.innerHTML = [
			'<div class="seidr-rm-dialog" role="dialog" aria-modal="true" aria-labelledby="seidr-rm-dlg-title">',
			'<h4 id="seidr-rm-dlg-title">' + escapeHtml(title) + "</h4>",
			'<p class="seidr-rm-dialog-msg">' + escapeHtml(message) + "</p>",
			'<div class="seidr-rm-dialog-actions">',
			'<button type="button" data-act="cancel">' + escapeHtml(cancelLabel) + "</button>",
			'<button type="button" data-act="ok" class="' + okClass + '">' + escapeHtml(okLabel) + "</button>",
			"</div></div>",
		].join("");
		document.body.appendChild(overlay);

		let settled = false;
		function finish(ok: boolean) {
			if (settled) return;
			settled = true;
			document.removeEventListener("keydown", onKey, true);
			removeOverlay(overlay);
			resolve(ok);
		}
		function onKey(ev: KeyboardEvent) {
			if (ev.key === "Escape") {
				ev.preventDefault();
				ev.stopPropagation();
				finish(false);
			} else if (ev.key === "Enter") {
				ev.preventDefault();
				ev.stopPropagation();
				finish(true);
			}
		}
		document.addEventListener("keydown", onKey, true);
		overlay.addEventListener("click", function (ev) {
			if (ev.target === overlay) finish(false);
		});
		overlay.querySelector('[data-act="cancel"]')!.addEventListener("click", function () {
			finish(false);
		});
		overlay.querySelector('[data-act="ok"]')!.addEventListener("click", function () {
			finish(true);
		});
		const okBtn = overlay.querySelector('[data-act="ok"]') as HTMLButtonElement;
		try { okBtn.focus(); } catch (e) { /* ignore */ }
	});
}

/** Text prompt. Resolves trimmed string, or null on Cancel / backdrop / Escape. */
export function rmPrompt(title: string, opts?: RmPromptOpts): Promise<string | null> {
	rmInjectStyles();
	const body = (opts && opts.message) || "";
	const initial = (opts && opts.initial) || "";
	const placeholder = (opts && opts.placeholder) || "";
	const okLabel = (opts && opts.confirmLabel) || "OK";
	const cancelLabel = (opts && opts.cancelLabel) || "Cancel";
	const maxlength = (opts && opts.maxlength) || 64;

	return new Promise(function (resolve) {
		const overlay = document.createElement("div");
		overlay.className = "seidr-rm-overlay";
		overlay.innerHTML = [
			'<div class="seidr-rm-dialog" role="dialog" aria-modal="true" aria-labelledby="seidr-rm-dlg-title">',
			'<h4 id="seidr-rm-dlg-title">' + escapeHtml(title) + "</h4>",
			body ? '<p class="seidr-rm-dialog-msg">' + escapeHtml(body) + "</p>" : "",
			'<div class="seidr-settings-field-row">',
			'<input type="text" id="seidr-rm-prompt-input" maxlength="' + maxlength + '"'
			+ (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : "") + " />",
			"</div>",
			'<div class="seidr-rm-dialog-actions">',
			'<button type="button" data-act="cancel">' + escapeHtml(cancelLabel) + "</button>",
			'<button type="button" data-act="ok" class="seidr-rm-btn-primary">' + escapeHtml(okLabel) + "</button>",
			"</div></div>",
		].join("");
		document.body.appendChild(overlay);

		const input = overlay.querySelector("#seidr-rm-prompt-input") as HTMLInputElement;
		input.value = initial;

		let settled = false;
		function finish(value: string | null) {
			if (settled) return;
			settled = true;
			document.removeEventListener("keydown", onKey, true);
			removeOverlay(overlay);
			resolve(value);
		}
		function submit() {
			const t = (input.value || "").trim();
			finish(t || null);
		}
		function onKey(ev: KeyboardEvent) {
			if (ev.key === "Escape") {
				ev.preventDefault();
				ev.stopPropagation();
				finish(null);
			} else if (ev.key === "Enter") {
				ev.preventDefault();
				ev.stopPropagation();
				submit();
			}
		}
		document.addEventListener("keydown", onKey, true);
		overlay.addEventListener("click", function (ev) {
			if (ev.target === overlay) finish(null);
		});
		overlay.querySelector('[data-act="cancel"]')!.addEventListener("click", function () {
			finish(null);
		});
		overlay.querySelector('[data-act="ok"]')!.addEventListener("click", submit);
		try {
			input.focus();
			input.select();
		} catch (e) { /* ignore */ }
	});
}
