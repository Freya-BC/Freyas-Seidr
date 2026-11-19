/** Floating Seidr-styled autocomplete over #InputChat (or setCommandInput override) */
import { seidrPosesForCharacter } from "../actions/model";
import { seidrFilterAnimationsByPrefix } from "../animations/store";
import { seidrCmdActivityAvailable, seidrCmdRoomPeople } from "./catalog";
import { seidrFilterOnlineFriends } from "./onlineFriends";
import {
	seidrCmdAssistTagFromLine,
	seidrCmdAssistTokenAtCaret,
	seidrCmdIsAssistLine,
	seidrCmdIsCommandLine,
	seidrCmdPeekAssistLine,
	seidrCmdPeekLine,
	seidrCmdReplaceSpan,
	seidrCmdStartsWithAssistTag,
	seidrCmdStartsWithTag,
	seidrCmdTagFromLine,
	seidrCmdTokenAtCaret,
	type SeidrCmdAssistTag,
	type SeidrCmdTokenFocus,
} from "./parse";
import { seidrFastSelectApply } from "./fastSelect";
import { seidrCmdPreferMemberIndex } from "./lastActor";
import { seidrCmdFilterPeople, seidrCmdResolveMember } from "./resolve";
import { seidrCmdIsEnabled } from "./run";
import {
	seidrCmdAcBeepEnabled,
	seidrCmdAcWhisperEnabled,
	seidrListCmdActions,
} from "./store";
import { seidrCmdFilterStripOptions, seidrCmdListStripOptions } from "./stripCatalog";
import { seidrCmdCss } from "./styles";

declare const Player: any;

/** Optional compose field (e.g. FBM #fbm-fc-input) while focused. */
let commandInputOverride: HTMLTextAreaElement | HTMLInputElement | null = null;

export type SeidrCmdAcItem = {
	/** Inserted into the chat input. */
	insert: string;
	/** Shown in the list. */
	label: string;
	/** Optional secondary hint. */
	hint?: string;
};

type AcKind = "member" | "action" | "slot" | "pose" | "animation";

type AcState = {
	open: boolean;
	kind: AcKind | null;
	items: SeidrCmdAcItem[];
	index: number;
	spanStart: number;
	spanEnd: number;
	quoted: boolean;
	/** When set, member AC is for Club /beep or /whisper (assist-only). */
	assistTag: SeidrCmdAssistTag | null;
};

const state: AcState = {
	open: false,
	kind: null,
	items: [],
	index: 0,
	spanStart: 0,
	spanEnd: 0,
	quoted: false,
	assistTag: null,
};

function ensureStyles() {
	let style = document.getElementById("seidr-cmd-styles") as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = "seidr-cmd-styles";
		(document.head || document.documentElement).appendChild(style);
	}
	style.textContent = seidrCmdCss();
}

function getInput(): HTMLTextAreaElement | HTMLInputElement | null {
	if (
		commandInputOverride &&
		commandInputOverride.isConnected &&
		(commandInputOverride instanceof HTMLTextAreaElement ||
			commandInputOverride instanceof HTMLInputElement)
	) {
		return commandInputOverride;
	}
	const el = document.getElementById("InputChat");
	if (!el) return null;
	if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
	return null;
}

/** Active compose field: override if set, else #InputChat. */
export function seidrGetCommandInput(): HTMLTextAreaElement | HTMLInputElement | null {
	return getInput();
}

/**
 * Redirect Tab / Fast Select AC to another textarea (e.g. FBM float chat).
 * Pass null to restore #InputChat.
 */
export function seidrSetCommandInput(
	el: HTMLTextAreaElement | HTMLInputElement | null
): void {
	if (
		el &&
		(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
	) {
		commandInputOverride = el;
	} else {
		commandInputOverride = null;
		seidrCmdAcClose();
	}
}

function ensureRoot(): HTMLElement {
	ensureStyles();
	let root = document.getElementById("seidr-cmd-ac");
	if (root) return root;
	root = document.createElement("div");
	root.id = "seidr-cmd-ac";
	root.className = "seidr-cmd-ac";
	root.setAttribute("role", "listbox");
	root.hidden = true;
	document.body.appendChild(root);
	return root;
}

export function seidrCmdAcIsOpen(): boolean {
	return state.open;
}

export function seidrCmdAcClose(): void {
	state.open = false;
	state.kind = null;
	state.items = [];
	state.index = 0;
	state.assistTag = null;
	const root = document.getElementById("seidr-cmd-ac");
	if (root) {
		root.hidden = true;
		root.innerHTML = "";
	}
}

function positionOverInput(root: HTMLElement, input: HTMLElement) {
	const rect = input.getBoundingClientRect();
	const maxH = Math.min(240, Math.max(120, window.innerHeight - 24));
	root.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 280)) + "px";
	root.style.width = Math.max(220, Math.min(rect.width, 420)) + "px";
	root.style.maxHeight = maxH + "px";
	// Prefer above the input; fall back below if no room
	const above = rect.top - 8;
	if (above > maxH + 8) {
		root.style.top = "auto";
		root.style.bottom = (window.innerHeight - rect.top + 6) + "px";
	} else {
		root.style.bottom = "auto";
		root.style.top = (rect.bottom + 6) + "px";
	}
}

function render() {
	const root = ensureRoot();
	const input = getInput();
	if (!state.open || !state.items.length || !input) {
		seidrCmdAcClose();
		return;
	}
	root.hidden = false;
	positionOverInput(root, input);
	root.innerHTML = state.items.map(function (it, i) {
		const on = i === state.index ? " seidr-cmd-ac-on" : "";
		const hint = it.hint
			? '<span class="seidr-cmd-ac-hint">' + escapeHtml(it.hint) + "</span>"
			: "";
		return (
			'<button type="button" class="seidr-cmd-ac-item' + on + '" data-i="' + i + '" role="option">' +
			'<span class="seidr-cmd-ac-label">' + escapeHtml(it.label) + "</span>" +
			hint +
			"</button>"
		);
	}).join("");
	root.querySelectorAll("[data-i]").forEach(function (btn) {
		btn.addEventListener("mousedown", function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			const i = parseInt((btn as HTMLElement).getAttribute("data-i") || "0", 10);
			state.index = i;
			seidrCmdAcAccept();
		});
	});
	const on = root.querySelector(".seidr-cmd-ac-on") as HTMLElement | null;
	if (on && typeof on.scrollIntoView === "function") {
		on.scrollIntoView({ block: "nearest" });
	}
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildMemberItems(prefix: string): SeidrCmdAcItem[] {
	return seidrCmdFilterPeople(prefix).map(function (p) {
		// Insert MemberNumber so resolution is unambiguous after Tab.
		return {
			insert: String(p.memberNumber),
			label: p.label,
			hint: "#" + p.memberNumber,
		};
	});
}

function nameIdLabel(name: string, memberNumber: number): string {
	const n = String(name || "").trim() || String(memberNumber);
	return n + " (" + memberNumber + ")";
}

function selfMemberNumber(): number {
	try {
		if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
			return Player.MemberNumber;
		}
	} catch (e) { /* ignore */ }
	return NaN;
}

function assistTagEnabled(tag: SeidrCmdAssistTag): boolean {
	if (tag === "beep") return seidrCmdAcBeepEnabled();
	return seidrCmdAcWhisperEnabled();
}

function buildAssistMemberItems(tag: SeidrCmdAssistTag, prefix: string): SeidrCmdAcItem[] {
	if (tag === "beep") {
		return seidrFilterOnlineFriends(prefix).map(function (f) {
			return {
				insert: String(f.memberNumber),
				label: nameIdLabel(f.memberName, f.memberNumber),
				hint: "#" + f.memberNumber,
			};
		});
	}
	const self = selfMemberNumber();
	const pfx = String(prefix || "").trim().toLowerCase();
	const room = seidrCmdRoomPeople();
	const out: SeidrCmdAcItem[] = [];
	for (let i = 0; i < room.length; i++) {
		const p = room[i];
		if (Number.isFinite(self) && p.memberNumber === self) continue;
		const display = (p.nickname || p.name || String(p.memberNumber)).trim();
		const search = (p.nickname + " " + p.name + " " + p.memberNumber).toLowerCase();
		if (pfx && search.indexOf(pfx) < 0 && String(p.memberNumber).indexOf(pfx) !== 0) {
			continue;
		}
		out.push({
			insert: String(p.memberNumber),
			label: nameIdLabel(display, p.memberNumber),
			hint: "#" + p.memberNumber,
		});
	}
	return out;
}

function buildActionItems(prefix: string, memberRaw: string): SeidrCmdAcItem[] {
	const pfx = String(prefix || "").trim().toLowerCase();
	let target: any = null;
	if (memberRaw) {
		const mem = seidrCmdResolveMember(memberRaw);
		if (mem.ok) target = mem.character;
	}
	const list = seidrListCmdActions();
	const out: SeidrCmdAcItem[] = [];
	for (let i = 0; i < list.length; i++) {
		const a = list[i];
		if (pfx && a.name.toLowerCase().indexOf(pfx) < 0) continue;
		if (target && !seidrCmdActivityAvailable(target, a.slot, a.activity)) continue;
		out.push({
			insert: a.name,
			label: a.name,
			hint: a.slot + " · " + a.activity,
		});
	}
	return out;
}

function buildStripSlotItems(
	prefix: string,
	memberRaw: string,
	includeBundles: boolean
): SeidrCmdAcItem[] {
	if (!memberRaw) return [];
	const mem = seidrCmdResolveMember(memberRaw);
	if (mem.ok === false) return [];
	const options = seidrCmdFilterStripOptions(
		seidrCmdListStripOptions(Player, mem.character, includeBundles),
		prefix
	);
	return options.map(function (o) {
		return { insert: o.insert, label: o.label, hint: o.hint };
	});
}

function buildPoseItems(prefix: string, memberRaw: string): SeidrCmdAcItem[] {
	if (!memberRaw) return [];
	const mem = seidrCmdResolveMember(memberRaw);
	if (mem.ok === false) return [];
	const target = mem.character;
	const self = typeof Player !== "undefined" && Player && (
		target === Player
		|| (typeof target.MemberNumber === "number" && target.MemberNumber === Player.MemberNumber)
	);
	const pfx = String(prefix || "").trim().toLowerCase();
	const list = seidrPosesForCharacter(target, { aided: !self });
	const out: SeidrCmdAcItem[] = [];
	for (let i = 0; i < list.length; i++) {
		const p = list[i];
		if (pfx && p.id.toLowerCase().indexOf(pfx) < 0 && p.label.toLowerCase().indexOf(pfx) < 0) {
			continue;
		}
		out.push({ insert: p.id, label: p.label, hint: p.id });
	}
	return out;
}

function buildAnimationItems(prefix: string): SeidrCmdAcItem[] {
	return seidrFilterAnimationsByPrefix(prefix).map(function (a) {
		return {
			insert: a.name,
			label: a.name,
			hint: a.steps.length + " step" + (a.steps.length === 1 ? "" : "s"),
		};
	});
}

function openForAssistFocus(focus: SeidrCmdTokenFocus, value: string): boolean {
	if (focus.kind !== "member") {
		seidrCmdAcClose();
		return false;
	}
	const peek = seidrCmdPeekAssistLine(value);
	const tag =
		(peek && peek.tag) ||
		seidrCmdAssistTagFromLine(value);
	if (!tag || !assistTagEnabled(tag)) {
		seidrCmdAcClose();
		return false;
	}
	const items = buildAssistMemberItems(tag, focus.prefix);
	if (!items.length) {
		seidrCmdAcClose();
		return false;
	}
	state.open = true;
	state.kind = "member";
	state.items = items;
	state.index = 0;
	state.spanStart = focus.start;
	state.spanEnd = focus.end;
	state.quoted = focus.quoted;
	state.assistTag = tag;
	render();
	return true;
}

function openForFocus(focus: SeidrCmdTokenFocus, value: string): boolean {
	const kind = focus.kind;
	if (
		kind !== "member" && kind !== "action" && kind !== "slot" &&
		kind !== "pose" && kind !== "animation"
	) {
		seidrCmdAcClose();
		return false;
	}
	const peek = seidrCmdPeekLine(value);
	if (peek && !seidrCmdIsEnabled(peek.tag)) {
		seidrCmdAcClose();
		return false;
	}
	let items: SeidrCmdAcItem[] = [];
	if (kind === "member") {
		items = buildMemberItems(focus.prefix);
	} else if (kind === "action") {
		if (!peek || peek.family !== "action") {
			seidrCmdAcClose();
			return false;
		}
		items = buildActionItems(focus.prefix, peek.memberRaw);
	} else if (kind === "slot") {
		if (!peek || peek.family !== "strip" || !peek.memberRaw) {
			seidrCmdAcClose();
			return false;
		}
		items = buildStripSlotItems(focus.prefix, peek.memberRaw, peek.tag === "strip");
	} else if (kind === "pose") {
		if (!peek || peek.family !== "poses" || !peek.memberRaw) {
			seidrCmdAcClose();
			return false;
		}
		items = buildPoseItems(focus.prefix, peek.memberRaw);
	} else {
		if (!peek || peek.family !== "animation") {
			seidrCmdAcClose();
			return false;
		}
		items = buildAnimationItems(focus.prefix);
	}
	if (!items.length) {
		seidrCmdAcClose();
		return false;
	}
	state.open = true;
	state.kind = kind;
	state.items = items;
	state.index = kind === "member" ? seidrCmdPreferMemberIndex(items) : 0;
	state.spanStart = focus.start;
	state.spanEnd = focus.end;
	state.quoted = kind === "member" ? focus.quoted : false;
	state.assistTag = null;
	render();
	return true;
}

/** Tab: open or refresh autocomplete for the token under the caret. */
export function seidrCmdAcOnTab(): boolean {
	const input = getInput();
	if (!input) return false;
	let value = input.value || "";
	const isAssist =
		seidrCmdIsAssistLine(value) || seidrCmdStartsWithAssistTag(value);
	const isSeidr =
		seidrCmdIsCommandLine(value) || seidrCmdStartsWithTag(value);
	if (!isAssist && !isSeidr) {
		return false;
	}
	const caret = input.selectionStart != null ? input.selectionStart : value.length;

	if (isAssist) {
		const assistTag = seidrCmdAssistTagFromLine(value) || seidrCmdPeekAssistLine(value)?.tag;
		if (assistTag && !assistTagEnabled(assistTag)) return false;
		let focus = seidrCmdAssistTokenAtCaret(value, caret);
		if (focus.kind === "tag") {
			const bare = value.match(/^\s*\/(whisper|beep)\s*$/i);
			if (!bare) return false;
			const tag = bare[1].toLowerCase() as SeidrCmdAssistTag;
			if (!assistTagEnabled(tag)) return false;
			const spaced = "/" + tag + " ";
			input.value = spaced;
			try {
				input.dispatchEvent(new Event("input", { bubbles: true }));
			} catch (e) { /* ignore */ }
			if (typeof input.setSelectionRange === "function") {
				input.setSelectionRange(spaced.length, spaced.length);
			}
			value = spaced;
			focus = {
				kind: "member",
				prefix: "",
				quoted: false,
				start: spaced.length,
				end: spaced.length,
			};
		}
		if (focus.kind === "none") return false;
		try {
			return openForAssistFocus(focus, value);
		} catch (e) {
			console.warn("[Seidr Cmd] assist autocomplete failed", e);
			seidrCmdAcClose();
			return false;
		}
	}

	let focus = seidrCmdTokenAtCaret(value, caret);
	// Bare tag — insert trailing space so next token is real
	if (focus.kind === "tag") {
		const bare = value.match(
			/^\s*\/(roommanager|wardrobe|animation|action|stripe|strip|poses|seidr|ani|a|p)\s*$/i
		);
		if (!bare) return false;
		const tag = bare[1].toLowerCase();
		if (!seidrCmdIsEnabled(tag)) return false;
		if (tag === "seidr" || tag === "roommanager" || tag === "wardrobe") return false;
		const spaced = "/" + tag + " ";
		input.value = spaced;
		try {
			input.dispatchEvent(new Event("input", { bubbles: true }));
		} catch (e) { /* ignore */ }
		if (typeof input.setSelectionRange === "function") {
			input.setSelectionRange(spaced.length, spaced.length);
		}
		value = spaced;
		if (tag === "animation" || tag === "ani") {
			focus = {
				kind: "animation",
				prefix: "",
				start: spaced.length,
				end: spaced.length,
			};
		} else {
			focus = {
				kind: "member",
				prefix: "",
				quoted: false,
				start: spaced.length,
				end: spaced.length,
			};
		}
	}
	if (focus.kind === "none") return false;
	try {
		return openForFocus(focus, value);
	} catch (e) {
		console.warn("[Seidr Cmd] autocomplete failed", e);
		seidrCmdAcClose();
		return false;
	}
}

export function seidrCmdAcMove(delta: number): boolean {
	if (!state.open || !state.items.length) return false;
	const n = state.items.length;
	state.index = (state.index + delta + n * 10) % n;
	render();
	return true;
}

export function seidrCmdAcAccept(): boolean {
	if (!state.open || !state.items.length) return false;
	const input = getInput();
	if (!input) return false;
	const item = state.items[state.index];
	if (!item) return false;
	const insert = item.insert;
	const value = input.value || "";
	let nextValue: string;
	let nextCaret: number;

	if (state.kind === "member") {
		// Rebuild so Tab never yields `/strip12345` — always `/tag NUMBER …`
		let tag: string;
		let second = "";
		if (state.assistTag) {
			const peekA = seidrCmdPeekAssistLine(value);
			tag = state.assistTag || (peekA && peekA.tag) || seidrCmdAssistTagFromLine(value) || "beep";
			second = peekA && peekA.secondRaw ? peekA.secondRaw : "";
		} else {
			const peek = seidrCmdPeekLine(value);
			tag = (peek && peek.tag) || seidrCmdTagFromLine(value) || "a";
			second = peek && peek.secondRaw ? peek.secondRaw : "";
		}
		const head = "/" + tag + " " + insert + " ";
		nextValue = head + second;
		nextCaret = head.length;
	} else if (state.kind === "animation") {
		const peek = seidrCmdPeekLine(value);
		const tag = (peek && peek.tag) || seidrCmdTagFromLine(value) || "animation";
		nextValue = "/" + tag + " " + insert;
		nextCaret = nextValue.length;
	} else {
		const next = seidrCmdReplaceSpan(value, state.spanStart, state.spanEnd, insert, false);
		nextValue = next.value;
		nextCaret = next.caret;
	}

	input.value = nextValue;
	input.focus();
	if (typeof input.setSelectionRange === "function") {
		input.setSelectionRange(nextCaret, nextCaret);
	}
	try {
		input.dispatchEvent(new Event("input", { bubbles: true }));
	} catch (e) { /* ignore */ }
	seidrCmdAcClose();
	return true;
}

/** Keydown while InputChat focused — returns true if consumed. */
export function seidrCmdAcHandleKeyDown(ev: KeyboardEvent): boolean {
	const input = getInput();
	/* Hosts may call from document-capture; accept target === input as focused. */
	const focused =
		!!input &&
		(document.activeElement === input || ev.target === input);
	if (!focused) {
		if (state.open) seidrCmdAcClose();
		return false;
	}

	const key = ev.key;

	if (key === "Tab") {
		const value = input.value || "";
		// Fast Select: a/s/d/p or empty+Tab → slash command (AC closed only)
		if (!state.open && seidrFastSelectApply(input)) {
			ev.preventDefault();
			ev.stopPropagation();
			return true;
		}
		const onSeidrCmd =
			state.open ||
			seidrCmdIsCommandLine(value) ||
			seidrCmdStartsWithTag(value) ||
			seidrCmdIsAssistLine(value) ||
			seidrCmdStartsWithAssistTag(value);
		if (!onSeidrCmd) return false;
		if (state.open) {
			ev.preventDefault();
			ev.stopPropagation();
			seidrCmdAcAccept();
			return true;
		}
		// Only swallow Tab when Seidr AC actually opens; else Club CommandAutoComplete runs
		const opened = seidrCmdAcOnTab();
		if (!opened) return false;
		ev.preventDefault();
		ev.stopPropagation();
		return true;
	}

	if (!state.open) return false;

	if (key === "Escape") {
		ev.preventDefault();
		ev.stopPropagation();
		seidrCmdAcClose();
		return true;
	}

	if (key === "ArrowDown" || key === "s" || key === "S") {
		if (key === "s" || key === "S") {
			if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
		}
		ev.preventDefault();
		ev.stopPropagation();
		seidrCmdAcMove(1);
		return true;
	}
	if (key === "ArrowUp" || key === "w" || key === "W") {
		if (key === "w" || key === "W") {
			if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
		}
		ev.preventDefault();
		ev.stopPropagation();
		seidrCmdAcMove(-1);
		return true;
	}
	if (key === "Enter" || key === "e" || key === "E") {
		if (key === "e" || key === "E") {
			if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
		}
		ev.preventDefault();
		ev.stopPropagation();
		seidrCmdAcAccept();
		return true;
	}

	// While open, block further typing so W/S/E selection is clean — close on other printable
	if (key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
		seidrCmdAcClose();
		return false;
	}

	return false;
}
