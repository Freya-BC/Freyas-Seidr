/** Parse `/a` / `/action` with optional quoted member (1B). */

export type SeidrCmdParsed = {
	ok: true;
	tag: "a" | "action";
	/** Raw member token as typed (quotes stripped). */
	memberRaw: string;
	/** True if member was quoted. */
	memberQuoted: boolean;
	/** Remainder of line = action alias (may contain spaces). */
	actionRaw: string;
	/** Full original message trimmed. */
	raw: string;
} | {
	ok: false;
	error: string;
	raw: string;
};

export type SeidrCmdTokenFocus =
	| { kind: "none" }
	| { kind: "tag" }
	| { kind: "member"; prefix: string; quoted: boolean; start: number; end: number }
	| { kind: "action"; prefix: string; start: number; end: number };

const TAG_RE = /^\/(a|action)(?:\s|$)/i;

export function seidrCmdIsCommandLine(msg: string): boolean {
	return TAG_RE.test(String(msg || "").trim());
}

/**
 * Parse `/a <member> <action>` / `/action …`.
 * Member: first token, or `"quoted name"` / `'quoted name'`.
 * Action: rest of the line (trimmed); may contain spaces.
 */
export function seidrParseCmdLine(msg: string): SeidrCmdParsed {
	const raw = String(msg || "").trim();
	const m = raw.match(/^\/(a|action)(?:\s+(.*))?$/i);
	if (!m) return { ok: false, error: "Not a Seidr command", raw: raw };
	const tag = m[1].toLowerCase() === "action" ? "action" : "a";
	const rest = (m[2] || "").trim();
	if (!rest) {
		return { ok: false, error: "Usage: /a <member> <action>", raw: raw };
	}

	let memberRaw = "";
	let memberQuoted = false;
	let actionRaw = "";
	const q = rest.charAt(0);
	if (q === '"' || q === "'") {
		let i = 1;
		let closed = false;
		while (i < rest.length) {
			if (rest.charAt(i) === "\\" && i + 1 < rest.length) {
				memberRaw += rest.charAt(i + 1);
				i += 2;
				continue;
			}
			if (rest.charAt(i) === q) {
				closed = true;
				i += 1;
				break;
			}
			memberRaw += rest.charAt(i);
			i += 1;
		}
		if (!closed) return { ok: false, error: "Unclosed quote in member name", raw: raw };
		memberQuoted = true;
		actionRaw = rest.slice(i).trim();
	} else {
		const sp = rest.search(/\s/);
		if (sp < 0) {
			memberRaw = rest;
			actionRaw = "";
		} else {
			memberRaw = rest.slice(0, sp);
			actionRaw = rest.slice(sp).trim();
		}
	}

	if (!memberRaw) return { ok: false, error: "Missing member", raw: raw };
	if (!actionRaw) return { ok: false, error: "Missing action — Usage: /a <member> <action>", raw: raw };

	return {
		ok: true,
		tag: tag,
		memberRaw: memberRaw,
		memberQuoted: memberQuoted,
		actionRaw: actionRaw,
		raw: raw,
	};
}

/**
 * Which token the caret is editing for Tab autocomplete.
 * `value` = full InputChat contents; `caret` = selectionStart.
 */
export function seidrCmdTokenAtCaret(value: string, caret: number): SeidrCmdTokenFocus {
	const text = String(value || "");
	const pos = Math.max(0, Math.min(caret || 0, text.length));
	const before = text.slice(0, pos);
	const trimmedStart = text.match(/^\s*/);
	const startOffset = trimmedStart ? trimmedStart[0].length : 0;
	const body = text.slice(startOffset);
	const bodyCaret = pos - startOffset;
	if (bodyCaret < 0) return { kind: "none" };

	const tagMatch = body.match(/^\/(a|action)(\s+)?/i);
	if (!tagMatch) return { kind: "none" };
	const tagEnd = tagMatch[0].length;
	if (bodyCaret <= tagEnd && !tagMatch[2]) {
		return { kind: "tag" };
	}
	if (bodyCaret <= tagEnd) {
		// In whitespace after tag → start of member
		return {
			kind: "member",
			prefix: "",
			quoted: false,
			start: startOffset + tagEnd,
			end: startOffset + tagEnd,
		};
	}

	const rest = body.slice(tagEnd);
	const restCaret = bodyCaret - tagEnd;
	const q = rest.charAt(0);
	if (q === '"' || q === "'") {
		let i = 1;
		let closed = false;
		while (i < rest.length) {
			if (rest.charAt(i) === "\\" && i + 1 < rest.length) {
				i += 2;
				continue;
			}
			if (rest.charAt(i) === q) {
				closed = true;
				i += 1;
				break;
			}
			i += 1;
		}
		const memberEnd = closed ? i : rest.length;
		if (restCaret <= memberEnd) {
			const inner = rest.slice(1, Math.min(restCaret, closed ? i - 1 : rest.length));
			return {
				kind: "member",
				prefix: inner.replace(/\\(.)/g, "$1"),
				quoted: true,
				start: startOffset + tagEnd,
				end: startOffset + tagEnd + memberEnd,
			};
		}
		// Past member → action
		const actionStart = tagEnd + memberEnd;
		const actionPrefix = body.slice(actionStart, bodyCaret).replace(/^\s+/, "");
		const ws = body.slice(actionStart).match(/^\s*/);
		const wsLen = ws ? ws[0].length : 0;
		return {
			kind: "action",
			prefix: actionPrefix,
			start: startOffset + actionStart + wsLen,
			end: pos,
		};
	}

	const sp = rest.search(/\s/);
	if (sp < 0 || restCaret <= sp) {
		return {
			kind: "member",
			prefix: rest.slice(0, restCaret),
			quoted: false,
			start: startOffset + tagEnd,
			end: startOffset + tagEnd + (sp < 0 ? rest.length : sp),
		};
	}
	const actionStart = tagEnd + sp;
	const ws = body.slice(actionStart).match(/^\s*/);
	const wsLen = ws ? ws[0].length : 0;
	return {
		kind: "action",
		prefix: body.slice(actionStart + wsLen, bodyCaret),
		start: startOffset + actionStart + wsLen,
		end: pos,
	};
}

/** Rebuild input replacing the member or action span with `insert`. */
export function seidrCmdReplaceSpan(
	value: string,
	start: number,
	end: number,
	insert: string,
	trailingSpace: boolean
): { value: string; caret: number } {
	const mid = insert + (trailingSpace ? " " : "");
	const next = value.slice(0, start) + mid + value.slice(end);
	return { value: next, caret: start + mid.length };
}
