/** Parse `/a`|/action` and `/strip`|/stripe` with optional quoted member. */

export type SeidrCmdTag = "a" | "action" | "strip" | "stripe";
export type SeidrCmdFamily = "action" | "strip";

export type SeidrCmdParsed = {
	ok: true;
	tag: SeidrCmdTag;
	family: SeidrCmdFamily;
	/** Raw member token as typed (quotes stripped). */
	memberRaw: string;
	/** True if member was quoted. */
	memberQuoted: boolean;
	/**
	 * Second argument:
	 * - action family: call name (may contain spaces)
	 * - strip family: clothing slot / all:Group token (single token preferred)
	 */
	secondRaw: string;
	/** @deprecated use secondRaw — kept for /a call sites */
	actionRaw: string;
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
	| { kind: "action"; prefix: string; start: number; end: number }
	| { kind: "slot"; prefix: string; start: number; end: number };

const TAG_RE = /^\/(a|action|strip|stripe)(?:\s|$)/i;

function tagFamily(tag: SeidrCmdTag): SeidrCmdFamily {
	return tag === "strip" || tag === "stripe" ? "strip" : "action";
}

function normalizeTag(raw: string): SeidrCmdTag {
	const t = String(raw || "").toLowerCase();
	if (t === "action") return "action";
	if (t === "strip") return "strip";
	if (t === "stripe") return "stripe";
	return "a";
}

export function seidrCmdIsCommandLine(msg: string): boolean {
	return TAG_RE.test(String(msg || "").trim());
}

export function seidrCmdTagFromLine(msg: string): SeidrCmdTag | null {
	const m = String(msg || "").trim().match(/^\/(a|action|strip|stripe)(?:\s|$)/i);
	if (!m) return null;
	return normalizeTag(m[1]);
}

/**
 * Partial parse for Tab autocomplete — allows missing second token.
 * Still requires a recognized tag; member may be empty while typing.
 */
export function seidrCmdPeekLine(msg: string): {
	tag: SeidrCmdTag;
	family: SeidrCmdFamily;
	memberRaw: string;
	memberQuoted: boolean;
	secondRaw: string;
} | null {
	const raw = String(msg || "").trim();
	const m = raw.match(/^\/(a|action|strip|stripe)(?:\s+(.*))?$/i);
	if (!m) return null;
	const tag = normalizeTag(m[1]);
	const family = tagFamily(tag);
	const rest = (m[2] || "").trim();
	if (!rest) {
		return { tag: tag, family: family, memberRaw: "", memberQuoted: false, secondRaw: "" };
	}
	let memberRaw = "";
	let memberQuoted = false;
	let secondRaw = "";
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
		memberQuoted = true;
		if (!closed) {
			// Still typing inside quotes — treat whole rest as member prefix
			return {
				tag: tag,
				family: family,
				memberRaw: memberRaw,
				memberQuoted: true,
				secondRaw: "",
			};
		}
		secondRaw = rest.slice(i).trim();
	} else {
		const sp = rest.search(/\s/);
		if (sp < 0) {
			memberRaw = rest;
			secondRaw = "";
		} else {
			memberRaw = rest.slice(0, sp);
			secondRaw = rest.slice(sp).trim();
		}
	}
	return {
		tag: tag,
		family: family,
		memberRaw: memberRaw,
		memberQuoted: memberQuoted,
		secondRaw: secondRaw,
	};
}

/**
 * Parse `/a|/action <member> <action>` or `/strip|/stripe <member> <slot>`.
 * Member: first token, or `"quoted name"` / `'quoted name'`.
 * Second: rest of the line (trimmed).
 */
export function seidrParseCmdLine(msg: string): SeidrCmdParsed {
	const raw = String(msg || "").trim();
	const m = raw.match(/^\/(a|action|strip|stripe)(?:\s+(.*))?$/i);
	if (!m) return { ok: false, error: "Not a Seidr command", raw: raw };
	const tag = normalizeTag(m[1]);
	const family = tagFamily(tag);
	const rest = (m[2] || "").trim();
	const usage = family === "strip"
		? "Usage: /" + tag + " <member> <slot>"
		: "Usage: /a <member> <action>";
	if (!rest) {
		return { ok: false, error: usage, raw: raw };
	}

	let memberRaw = "";
	let memberQuoted = false;
	let secondRaw = "";
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
		secondRaw = rest.slice(i).trim();
	} else {
		const sp = rest.search(/\s/);
		if (sp < 0) {
			memberRaw = rest;
			secondRaw = "";
		} else {
			memberRaw = rest.slice(0, sp);
			secondRaw = rest.slice(sp).trim();
		}
	}

	if (!memberRaw) return { ok: false, error: "Missing member", raw: raw };
	if (!secondRaw) {
		return {
			ok: false,
			error: family === "strip"
				? "Missing slot — " + usage
				: "Missing action — " + usage,
			raw: raw,
		};
	}

	return {
		ok: true,
		tag: tag,
		family: family,
		memberRaw: memberRaw,
		memberQuoted: memberQuoted,
		secondRaw: secondRaw,
		actionRaw: secondRaw,
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
	const trimmedStart = text.match(/^\s*/);
	const startOffset = trimmedStart ? trimmedStart[0].length : 0;
	const body = text.slice(startOffset);
	const bodyCaret = pos - startOffset;
	if (bodyCaret < 0) return { kind: "none" };

	const tagMatch = body.match(/^\/(a|action|strip|stripe)(\s+)?/i);
	if (!tagMatch) return { kind: "none" };
	const tag = normalizeTag(tagMatch[1]);
	const family = tagFamily(tag);
	const secondKind = family === "strip" ? "slot" : "action";
	const tagEnd = tagMatch[0].length;
	if (bodyCaret <= tagEnd && !tagMatch[2]) {
		return { kind: "tag" };
	}
	if (bodyCaret <= tagEnd) {
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
		const actionStart = tagEnd + memberEnd;
		const actionPrefix = body.slice(actionStart, bodyCaret).replace(/^\s+/, "");
		const ws = body.slice(actionStart).match(/^\s*/);
		const wsLen = ws ? ws[0].length : 0;
		return {
			kind: secondKind,
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
		kind: secondKind,
		prefix: body.slice(actionStart + wsLen, bodyCaret),
		start: startOffset + actionStart + wsLen,
		end: pos,
	};
}

/**
 * Rebuild input replacing the member or action/slot span with `insert`.
 * Always keeps a space before the insert when glued to the previous token
 * (e.g. `/strip` + Tab → `/strip 12345 `, never `/strip12345`).
 */
export function seidrCmdReplaceSpan(
	value: string,
	start: number,
	end: number,
	insert: string,
	trailingSpace: boolean
): { value: string; caret: number } {
	let mid = String(insert || "");
	if (start > 0 && !/\s/.test(value.charAt(start - 1))) {
		mid = " " + mid;
	}
	if (trailingSpace) {
		const after = end < value.length ? value.charAt(end) : "";
		if (!after || !/\s/.test(after)) mid = mid + " ";
	}
	const next = value.slice(0, start) + mid + value.slice(end);
	return { value: next, caret: start + mid.length };
}
