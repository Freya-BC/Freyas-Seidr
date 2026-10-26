/** Floating Seidr-styled autocomplete over #InputChat */
import { seidrCmdActivityAvailable } from "./catalog";
import {
	seidrCmdReplaceSpan,
	seidrCmdTokenAtCaret,
	seidrParseCmdLine,
	type SeidrCmdTokenFocus,
} from "./parse";
import { seidrCmdFilterPeople, seidrCmdResolveMember } from "./resolve";
import { seidrListCmdActions } from "./store";
import { seidrCmdCss } from "./styles";

export type SeidrCmdAcItem = {
	/** Inserted into the chat input. */
	insert: string;
	/** Shown in the list. */
	label: string;
	/** Optional secondary hint. */
	hint?: string;
};

type AcState = {
	open: boolean;
	kind: "member" | "action" | null;
	items: SeidrCmdAcItem[];
	index: number;
	spanStart: number;
	spanEnd: number;
	quoted: boolean;
};

const state: AcState = {
	open: false,
	kind: null,
	items: [],
	index: 0,
	spanStart: 0,
	spanEnd: 0,
	quoted: false,
};

function ensureStyles() {
	if (document.getElementById("seidr-cmd-styles")) return;
	const style = document.createElement("style");
	style.id = "seidr-cmd-styles";
	style.textContent = seidrCmdCss();
	(document.head || document.documentElement).appendChild(style);
}

function getInput(): HTMLTextAreaElement | HTMLInputElement | null {
	const el = document.getElementById("InputChat");
	if (!el) return null;
	if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
	return null;
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

function openForFocus(focus: SeidrCmdTokenFocus, value: string): boolean {
	if (focus.kind !== "member" && focus.kind !== "action") {
		seidrCmdAcClose();
		return false;
	}
	let items: SeidrCmdAcItem[] = [];
	if (focus.kind === "member") {
		items = buildMemberItems(focus.prefix);
	} else {
		const parsed = seidrParseCmdLine(value);
		const memberRaw = parsed.ok ? parsed.memberRaw : "";
		items = buildActionItems(focus.prefix, memberRaw);
	}
	if (!items.length) {
		seidrCmdAcClose();
		return false;
	}
	state.open = true;
	state.kind = focus.kind;
	state.items = items;
	state.index = 0;
	state.spanStart = focus.start;
	state.spanEnd = focus.end;
	state.quoted = focus.kind === "member" ? focus.quoted : false;
	render();
	return true;
}

/** Tab: open or refresh autocomplete for the token under the caret. */
export function seidrCmdAcOnTab(): boolean {
	const input = getInput();
	if (!input) return false;
	const value = input.value || "";
	const caret = input.selectionStart != null ? input.selectionStart : value.length;
	const focus = seidrCmdTokenAtCaret(value, caret);
	if (focus.kind === "none" || focus.kind === "tag") return false;
	return openForFocus(focus, value);
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
	let insert = item.insert;
	if (state.kind === "member") {
		// Always insert MemberNumber for unambiguous resolution; label showed the name.
		insert = item.insert;
	}
	const trailing = state.kind === "member";
	const next = seidrCmdReplaceSpan(input.value || "", state.spanStart, state.spanEnd, insert, trailing);
	input.value = next.value;
	input.focus();
	if (typeof input.setSelectionRange === "function") {
		input.setSelectionRange(next.caret, next.caret);
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
	if (!input || document.activeElement !== input) {
		if (state.open) seidrCmdAcClose();
		return false;
	}

	const key = ev.key;

	if (key === "Tab") {
		ev.preventDefault();
		ev.stopPropagation();
		if (state.open) {
			seidrCmdAcAccept();
		} else {
			seidrCmdAcOnTab();
		}
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
