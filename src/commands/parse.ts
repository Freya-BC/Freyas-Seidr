/** Parse Seidr chat commands with optional quoted member. */

export type SeidrCmdTag =
	| "a" | "action" | "strip" | "stripe"
	| "poses" | "p"
	| "animation" | "ani"
	| "seidr" | "roommanager";

export type SeidrCmdFamily =
	| "action"
	| "strip"
	| "poses"
	| "animation"
	| "meta";

export type SeidrCmdParsed = {
	ok: true;
	tag: SeidrCmdTag;
	family: SeidrCmdFamily;
	/** Raw member token as typed (quotes stripped). Empty for animation/meta. */
	memberRaw: string;
	memberQuoted: boolean;
	/**
	 * Second argument:
	 * - action: call name
	 * - strip: clothing slot
	 * - poses: pose id
	 * - animation: animation name
	 * - meta: unused
	 */
	secondRaw: string;
	/** @deprecated use secondRaw */
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
	| { kind: "slot"; prefix: string; start: number; end: number }
	| { kind: "pose"; prefix: string; start: number; end: number }
	| { kind: "animation"; prefix: string; start: number; end: number };

/** Longer tags first. */
const TAG_ALT =
	"roommanager|animation|action|stripe|strip|poses|seidr|ani|a|p";
const TAG_RE = new RegExp("^/(" + TAG_ALT + ")(?:\\s|$)", "i");
const TAG_LINE_RE = new RegExp("^/(" + TAG_ALT + ")(?:\\s+(.*))?$", "i");
const TAG_TOKEN_RE = new RegExp("^/(" + TAG_ALT + ")(\\s+)?", "i");

function tagFamily(tag: SeidrCmdTag): SeidrCmdFamily {
	if (tag === "strip" || tag === "stripe") return "strip";
	if (tag === "poses" || tag === "p") return "poses";
	if (tag === "animation" || tag === "ani") return "animation";
	if (tag === "seidr" || tag === "roommanager") return "meta";
	return "action";
}

function normalizeTag(raw: string): SeidrCmdTag {
	const t = String(raw || "").toLowerCase();
	if (t === "action") return "action";
	if (t === "strip") return "strip";
	if (t === "stripe") return "stripe";
	if (t === "poses") return "poses";
	if (t === "p") return "p";
	if (t === "animation") return "animation";
	if (t === "ani") return "ani";
	if (t === "seidr") return "seidr";
	if (t === "roommanager") return "roommanager";
	return "a";
}

function secondKindForFamily(family: SeidrCmdFamily): "action" | "slot" | "pose" | "animation" | null {
	if (family === "action") return "action";
	if (family === "strip") return "slot";
	if (family === "poses") return "pose";
	if (family === "animation") return "animation";
	return null;
}

export function seidrCmdIsCommandLine(msg: string): boolean {
	return TAG_RE.test(String(msg || "").trim());
}

export function seidrCmdTagFromLine(msg: string): SeidrCmdTag | null {
	const m = String(msg || "").trim().match(TAG_RE);
	if (!m) return null;
	return normalizeTag(m[1]);
}

export function seidrCmdStartsWithTag(msg: string): boolean {
	return new RegExp("^\\s*/(" + TAG_ALT + ")", "i").test(String(msg || ""));
}

function parseMemberAndRest(rest: string): {
	memberRaw: string;
	memberQuoted: boolean;
	secondRaw: string;
	ok: boolean;
	error?: string;
} {
	if (!rest) {
		return { memberRaw: "", memberQuoted: false, secondRaw: "", ok: true };
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
		if (!closed) {
			return { memberRaw: memberRaw, memberQuoted: true, secondRaw: "", ok: false, error: "Unclosed quote in member name" };
		}
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
	return { memberRaw: memberRaw, memberQuoted: memberQuoted, secondRaw: secondRaw, ok: true };
}

/**
 * Partial parse for Tab autocomplete — allows missing second token.
 */
export function seidrCmdPeekLine(msg: string): {
	tag: SeidrCmdTag;
	family: SeidrCmdFamily;
	memberRaw: string;
	memberQuoted: boolean;
	secondRaw: string;
} | null {
	const raw = String(msg || "").trim();
	const m = raw.match(TAG_LINE_RE);
	if (!m) return null;
	const tag = normalizeTag(m[1]);
	const family = tagFamily(tag);
	const rest = (m[2] || "").trim();
	if (family === "meta") {
		return { tag: tag, family: family, memberRaw: "", memberQuoted: false, secondRaw: "" };
	}
	if (family === "animation") {
		return { tag: tag, family: family, memberRaw: "", memberQuoted: false, secondRaw: rest };
	}
	if (!rest) {
		return { tag: tag, family: family, memberRaw: "", memberQuoted: false, secondRaw: "" };
	}
	const q = rest.charAt(0);
	if (q === '"' || q === "'") {
		let memberRaw = "";
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
		if (!closed) {
			return { tag: tag, family: family, memberRaw: memberRaw, memberQuoted: true, secondRaw: "" };
		}
		return {
			tag: tag,
			family: family,
			memberRaw: memberRaw,
			memberQuoted: true,
			secondRaw: rest.slice(i).trim(),
		};
	}
	const sp = rest.search(/\s/);
	if (sp < 0) {
		return { tag: tag, family: family, memberRaw: rest, memberQuoted: false, secondRaw: "" };
	}
	return {
		tag: tag,
		family: family,
		memberRaw: rest.slice(0, sp),
		memberQuoted: false,
		secondRaw: rest.slice(sp).trim(),
	};
}

export function seidrParseCmdLine(msg: string): SeidrCmdParsed {
	const raw = String(msg || "").trim();
	const m = raw.match(TAG_LINE_RE);
	if (!m) return { ok: false, error: "Not a Seidr command", raw: raw };
	const tag = normalizeTag(m[1]);
	const family = tagFamily(tag);
	const rest = (m[2] || "").trim();

	if (family === "meta") {
		return {
			ok: true,
			tag: tag,
			family: family,
			memberRaw: "",
			memberQuoted: false,
			secondRaw: "",
			actionRaw: "",
			raw: raw,
		};
	}

	if (family === "animation") {
		if (!rest) {
			return { ok: false, error: "Usage: /" + tag + " <animation name>", raw: raw };
		}
		return {
			ok: true,
			tag: tag,
			family: family,
			memberRaw: "",
			memberQuoted: false,
			secondRaw: rest,
			actionRaw: rest,
			raw: raw,
		};
	}

	const usage = family === "strip"
		? "Usage: /" + tag + " <member> <slot>"
		: family === "poses"
			? "Usage: /" + tag + " <member> <pose>"
			: "Usage: /a <member> <action>";
	if (!rest) return { ok: false, error: usage, raw: raw };

	const parts = parseMemberAndRest(rest);
	if (!parts.ok) return { ok: false, error: parts.error || "Parse error", raw: raw };
	if (!parts.memberRaw) return { ok: false, error: "Missing member", raw: raw };
	if (!parts.secondRaw) {
		return {
			ok: false,
			error: family === "strip"
				? "Missing slot — " + usage
				: family === "poses"
					? "Missing pose — " + usage
					: "Missing action — " + usage,
			raw: raw,
		};
	}

	return {
		ok: true,
		tag: tag,
		family: family,
		memberRaw: parts.memberRaw,
		memberQuoted: parts.memberQuoted,
		secondRaw: parts.secondRaw,
		actionRaw: parts.secondRaw,
		raw: raw,
	};
}

export function seidrCmdTokenAtCaret(value: string, caret: number): SeidrCmdTokenFocus {
	const text = String(value || "");
	const pos = Math.max(0, Math.min(caret || 0, text.length));
	const trimmedStart = text.match(/^\s*/);
	const startOffset = trimmedStart ? trimmedStart[0].length : 0;
	const body = text.slice(startOffset);
	const bodyCaret = pos - startOffset;
	if (bodyCaret < 0) return { kind: "none" };

	const tagMatch = body.match(TAG_TOKEN_RE);
	if (!tagMatch) return { kind: "none" };
	const tag = normalizeTag(tagMatch[1]);
	const family = tagFamily(tag);
	const secondKind = secondKindForFamily(family);
	const tagEnd = tagMatch[0].length;

	if (family === "meta") return { kind: "tag" };

	if (family === "animation") {
		if (bodyCaret <= tagEnd && !tagMatch[2]) return { kind: "tag" };
		const actionStart = tagEnd;
		const ws = body.slice(actionStart).match(/^\s*/);
		const wsLen = ws ? ws[0].length : 0;
		return {
			kind: "animation",
			prefix: body.slice(actionStart + wsLen, bodyCaret),
			start: startOffset + actionStart + wsLen,
			end: pos,
		};
	}

	if (bodyCaret <= tagEnd && !tagMatch[2]) return { kind: "tag" };
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
		if (!secondKind) return { kind: "none" };
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
	if (!secondKind) return { kind: "none" };
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
