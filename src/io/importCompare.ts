/**
 * Shared import classification + picker chrome for Seidr domain I/O.
 * New / Different → checked; Same → unchecked; Different rows get Overwrite|Add mode.
 */

export type SeidrImportStatus = "new" | "same" | "different";
export type SeidrImportMode = "add" | "overwrite";

export type SeidrImportClassified<T> = {
	item: T;
	status: SeidrImportStatus;
	/** Local id when status is same or different. */
	localId: number | null;
	defaultChecked: boolean;
	/** Display label (usually name/alias). */
	label: string;
	/** Optional secondary hint (e.g. Clip / Wiggle). */
	hint?: string;
};

export type SeidrImportSelection = {
	index: number;
	mode: SeidrImportMode;
};

/** Deep-clone via JSON, drop `id`, stable-stringify for equality. */
export function seidrImportFingerprint(obj: unknown): string {
	let clone: unknown;
	try {
		clone = JSON.parse(JSON.stringify(obj == null ? null : obj));
	} catch (e) {
		return "";
	}
	if (clone && typeof clone === "object" && !Array.isArray(clone)) {
		delete (clone as { id?: unknown }).id;
	}
	return stableStringify(clone);
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return "[" + value.map(stableStringify).join(",") + "]";
	}
	const keys = Object.keys(value as Record<string, unknown>).sort();
	const parts: string[] = [];
	for (let i = 0; i < keys.length; i++) {
		const k = keys[i];
		parts.push(JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]));
	}
	return "{" + parts.join(",") + "}";
}

/**
 * Classify import candidates against local items.
 * Match key is case-insensitive string from `getKey`; local id from `getId`.
 */
export function seidrClassifyImportRows<T>(
	candidates: T[],
	locals: T[],
	getKey: (item: T) => string,
	getId: (item: T) => number,
	getLabel?: (item: T) => string,
	getHint?: (item: T) => string | undefined,
): SeidrImportClassified<T>[] {
	const localByKey = new Map<string, T>();
	for (let i = 0; i < locals.length; i++) {
		const key = String(getKey(locals[i]) || "").trim().toLowerCase();
		if (!key || localByKey.has(key)) continue;
		localByKey.set(key, locals[i]);
	}
	const out: SeidrImportClassified<T>[] = [];
	for (let i = 0; i < candidates.length; i++) {
		const item = candidates[i];
		const key = String(getKey(item) || "").trim().toLowerCase();
		const label = getLabel ? getLabel(item) : String(getKey(item) || "");
		const hint = getHint ? getHint(item) : undefined;
		const local = key ? localByKey.get(key) : undefined;
		if (!local) {
			out.push({
				item: item,
				status: "new",
				localId: null,
				defaultChecked: true,
				label: label,
				hint: hint,
			});
			continue;
		}
		const localId = getId(local);
		const same = seidrImportFingerprint(item) === seidrImportFingerprint(local);
		out.push({
			item: item,
			status: same ? "same" : "different",
			localId: localId,
			defaultChecked: !same,
			label: label,
			hint: hint,
		});
	}
	return out;
}

/** Append " (2)", " (3)", … until the lowercased name is not in `taken`. */
export function seidrUniqueImportName(base: string, taken: Set<string>, maxLen?: number): string {
	const limit = maxLen && maxLen > 0 ? maxLen : 80;
	let name = String(base || "").trim() || "Import";
	if (name.length > limit) name = name.slice(0, limit);
	const key0 = name.toLowerCase();
	if (!taken.has(key0)) return name;
	let n = 2;
	while (n < 1000) {
		const suffix = " (" + n + ")";
		const room = Math.max(1, limit - suffix.length);
		const candidate = name.slice(0, room) + suffix;
		if (!taken.has(candidate.toLowerCase())) return candidate;
		n += 1;
	}
	return name.slice(0, Math.max(1, limit - 6)) + " (x)";
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function statusBadge(status: SeidrImportStatus): string {
	const label = status === "new" ? "New" : status === "same" ? "Same" : "Different";
	return '<span class="seidr-import-badge seidr-import-badge-' + status + '">' + label + "</span>";
}

export type SeidrImportPickerSection = {
	/** Optional section heading (e.g. People / Actions). */
	title?: string;
	/** Unique section key for Select-all scoping (`data-import-section`). */
	sectionKey: string;
	rows: SeidrImportClassified<unknown>[];
	/** Index offset into the flat candidate list when collecting selection. */
	indexOffset: number;
};

/**
 * Build picker HTML: hint, per-section Select all/Deselect all, rows with
 * checkbox + badge + optional Overwrite/Add select, Import selected / Cancel.
 */
export function seidrImportPickerHtml(opts: {
	idPrefix: string;
	hint: string;
	sections: SeidrImportPickerSection[];
}): string {
	const prefix = opts.idPrefix;
	const parts: string[] = [
		'<p class="seidr-settings-hint">' + escapeHtml(opts.hint) + "</p>",
	];
	for (let s = 0; s < opts.sections.length; s++) {
		const sec = opts.sections[s];
		if (sec.title) {
			parts.push('<p class="seidr-import-section-title">' + escapeHtml(sec.title) + "</p>");
		}
		parts.push(
			'<div class="seidr-settings-row" style="margin-top:4px; gap:6px;">',
			'<button type="button" class="seidr-act-btn seidr-import-select-all" data-import-section="' +
				escapeHtml(sec.sectionKey) + '">Select all</button>',
			'<button type="button" class="seidr-act-btn seidr-import-deselect-all" data-import-section="' +
				escapeHtml(sec.sectionKey) + '">Deselect all</button>',
			"</div>",
			'<div class="seidr-act-import-list" data-import-section="' + escapeHtml(sec.sectionKey) + '">',
		);
		for (let i = 0; i < sec.rows.length; i++) {
			const row = sec.rows[i];
			const idx = sec.indexOffset + i;
			const checked = row.defaultChecked ? " checked" : "";
			const hintBit = row.hint
				? ' <span class="seidr-settings-hint">(' + escapeHtml(row.hint) + ")</span>"
				: "";
			let modeHtml = "";
			if (row.status === "different") {
				modeHtml =
					'<select class="seidr-import-mode" data-import-idx="' + idx + '">' +
					'<option value="overwrite" selected>Overwrite</option>' +
					'<option value="add">Add as new</option>' +
					"</select>";
			}
			parts.push(
				'<label class="seidr-act-import-row" data-import-section="' + escapeHtml(sec.sectionKey) + '">',
				'<input type="checkbox" data-import-idx="' + idx + '" data-import-section="' +
					escapeHtml(sec.sectionKey) + '"' + checked + " /> ",
				'<span class="seidr-import-row-label">' + escapeHtml(row.label) + hintBit + "</span> ",
				statusBadge(row.status),
				modeHtml,
				"</label>",
			);
		}
		parts.push("</div>");
	}
	parts.push(
		'<div class="seidr-settings-row" style="margin-top:8px; gap:6px;">',
		'<button type="button" class="seidr-act-btn" id="' + prefix + '-import-do">Import selected</button>',
		'<button type="button" class="seidr-act-btn" id="' + prefix + '-import-cancel">Cancel</button>',
		"</div>",
	);
	return parts.join("");
}

/**
 * Bind Select all / Deselect all on a picker host. Call after setting innerHTML.
 * Returns helpers to read selection and wire do/cancel if desired by the caller.
 */
export function seidrBindImportPickerToolbar(host: HTMLElement): void {
	host.querySelectorAll(".seidr-import-select-all").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const section = (btn as HTMLElement).getAttribute("data-import-section") || "";
			host.querySelectorAll('input[type="checkbox"][data-import-idx]').forEach(function (el) {
				const cb = el as HTMLInputElement;
				if ((cb.getAttribute("data-import-section") || "") === section) cb.checked = true;
			});
		});
	});
	host.querySelectorAll(".seidr-import-deselect-all").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const section = (btn as HTMLElement).getAttribute("data-import-section") || "";
			host.querySelectorAll('input[type="checkbox"][data-import-idx]').forEach(function (el) {
				const cb = el as HTMLInputElement;
				if ((cb.getAttribute("data-import-section") || "") === section) cb.checked = false;
			});
		});
	});
}

/** Gather checked rows and their mode (default add for new/same). */
export function seidrCollectImportSelection(host: HTMLElement): SeidrImportSelection[] {
	const selected: SeidrImportSelection[] = [];
	host.querySelectorAll('input[type="checkbox"][data-import-idx]').forEach(function (el) {
		const cb = el as HTMLInputElement;
		if (!cb.checked) return;
		const idx = parseInt(cb.getAttribute("data-import-idx") || "", 10);
		if (!Number.isFinite(idx)) return;
		let mode: SeidrImportMode = "add";
		const modeEl = host.querySelector('select.seidr-import-mode[data-import-idx="' + idx + '"]') as HTMLSelectElement | null;
		if (modeEl && modeEl.value === "overwrite") mode = "overwrite";
		else if (modeEl && modeEl.value === "add") mode = "add";
		else {
			// No mode select → New (or Same). Same is no-op later; New adds.
			mode = "add";
		}
		selected.push({ index: idx, mode: mode });
	});
	return selected;
}

/** Shared clipboard copy helper for export textareas. */
export function seidrCopyExportText(
	exportOut: HTMLTextAreaElement | null,
	onOk: () => void,
	onFail: () => void,
): void {
	if (!exportOut || !exportOut.value) {
		onFail();
		return;
	}
	const text = exportOut.value;
	try {
		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			navigator.clipboard.writeText(text).then(onOk, onFail);
			return;
		}
	} catch (e) { /* fall through */ }
	try {
		exportOut.focus();
		exportOut.select();
		if (typeof document.execCommand === "function" && document.execCommand("copy")) onOk();
		else onFail();
	} catch (e2) {
		onFail();
	}
}
