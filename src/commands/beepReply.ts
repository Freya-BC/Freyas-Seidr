/** Hover Reply on Club beep chat rows → /beep id + reply indicator. */
import { Seidr } from "../seidr";
import { seidrGetCommandInput } from "./autocomplete";
import { seidrCmdBeepReplyEnabled } from "./store";

declare const ElementButton: any;
declare const ElementMenu: any;
declare const ElementGenerateID: any;
declare const TextGet: any;
declare const Player: any;

const STRIP_TARGET_RE = /^\/(beep|whisper|w)\s+\S+\s?/iu;

let activeBeepReply = false;
let activeBeepName = "";
let installed = false;

function replyLabelPrefix(): string {
	try {
		if (typeof TextGet === "function") {
			const t = TextGet("ChatRoomReply");
			if (t) return String(t);
		}
	} catch (e) { /* ignore */ }
	return "Reply";
}

function friendName(mn: number, fallback?: string): string {
	if (fallback) return fallback;
	try {
		if (
			typeof Player !== "undefined" &&
			Player &&
			Player.FriendNames &&
			typeof Player.FriendNames.get === "function"
		) {
			const n = Player.FriendNames.get(mn);
			if (n) return String(n);
		}
	} catch (e) { /* ignore */ }
	return String(mn);
}

function getCompose(): HTMLTextAreaElement | HTMLInputElement | null {
	const override = seidrGetCommandInput();
	if (override && override.isConnected) return override;
	const el = document.getElementById("InputChat");
	if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
	return null;
}

/** Prefill /beep {mn} on active compose; strip existing beep/whisper target prefix. */
export function seidrBeepPrefill(memberNumber: number, keepRest?: boolean): void {
	const mn = Number(memberNumber);
	if (!Number.isFinite(mn) || mn <= 0) return;
	const input = getCompose();
	if (!input) return;
	let rest = "";
	if (keepRest !== false) {
		rest = String(input.value || "").replace(STRIP_TARGET_RE, "");
	}
	const next = "/beep " + mn + " " + rest;
	input.value = next;
	input.focus();
	const caret = ("/beep " + mn + " ").length;
	if (typeof input.setSelectionRange === "function") {
		input.setSelectionRange(caret, caret);
	}
	try {
		input.dispatchEvent(new Event("input", { bubbles: true }));
	} catch (e) { /* ignore */ }
}

export function seidrBeepClearReply(): void {
	activeBeepReply = false;
	activeBeepName = "";
	try {
		const replyIndicator = document.getElementById("chat-room-reply-indicator");
		if (replyIndicator && !replyIndicator.hasAttribute("hidden")) {
			const clubInput = document.getElementById("InputChat");
			const hasClubReply =
				clubInput &&
				clubInput instanceof HTMLElement &&
				clubInput.hasAttribute("reply-id");
			if (!hasClubReply) {
				replyIndicator.toggleAttribute("hidden", true);
			}
		}
	} catch (e) { /* ignore */ }
}

export function seidrBeepStartReply(memberNumber: number, name?: string): void {
	if (!seidrCmdBeepReplyEnabled()) return;
	const mn = Number(memberNumber);
	if (!Number.isFinite(mn) || mn <= 0) return;
	const display = friendName(mn, name);
	seidrBeepPrefill(mn, true);
	activeBeepReply = true;
	activeBeepName = display;
	try {
		const replyIndicator = document.getElementById("chat-room-reply-indicator");
		const labelHost = document.getElementById("chat-room-reply-indicator-text");
		const label = labelHost
			? (labelHost.querySelector(".button-label") as HTMLElement | null)
			: null;
		if (label) {
			label.textContent = replyLabelPrefix() + ": " + display;
		}
		if (replyIndicator) {
			replyIndicator.toggleAttribute("hidden", false);
		}
		const clubInput = document.getElementById("InputChat");
		if (clubInput instanceof HTMLElement) {
			clubInput.removeAttribute("reply-id");
		}
	} catch (e) { /* ignore */ }
}

function beepMemberFromDiv(div: HTMLElement): { mn: number; name: string } | null {
	try {
		const sender = Number.parseInt(div.getAttribute("data-sender") || "", 10);
		const target = Number.parseInt(div.getAttribute("data-target") || "", 10);
		const self =
			typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number"
				? Player.MemberNumber
				: NaN;
		let mn = sender;
		if (Number.isFinite(self) && sender === self && Number.isFinite(target)) {
			mn = target;
		}
		if (!Number.isFinite(mn) || mn <= 0) return null;
		if (Number.isFinite(self) && mn === self) return null;
		return { mn: mn, name: friendName(mn) };
	} catch (e) {
		return null;
	}
}

function enhanceBeepDiv(div: HTMLElement): void {
	if (!div || !div.classList || !div.classList.contains("ChatMessageBeep")) return;
	if (!seidrCmdBeepReplyEnabled()) return;
	if (div.getAttribute("data-seidr-beep-reply") === "1") return;
	const info = beepMemberFromDiv(div);
	if (!info) return;
	div.setAttribute("data-seidr-beep-reply", "1");

	const onReply = function () {
		if (!seidrCmdBeepReplyEnabled()) return;
		seidrBeepStartReply(info.mn, info.name);
	};

	try {
		if (
			typeof ElementMenu !== "undefined" &&
			ElementMenu &&
			typeof ElementMenu.Create === "function" &&
			typeof ElementButton !== "undefined" &&
			ElementButton &&
			typeof ElementButton.Create === "function"
		) {
			const id =
				typeof ElementGenerateID === "function"
					? ElementGenerateID()
					: "seidr-beep-reply-" + info.mn + "-" + Date.now();
			const menu = ElementMenu.Create(
				id,
				[
					ElementButton.Create(
						null,
						onReply,
						{ noStyling: true, tooltip: "Reply" },
						{ button: { attributes: { name: "reply" } } }
					),
				],
				{ direction: "rtl", role: "menu" },
				{
					menu: {
						classList: ["chat-room-message-popup", "seidr-beep-reply-menu"],
						attributes: { "aria-direction": "horizontal" },
					},
				}
			);
			div.appendChild(menu);
			return;
		}
	} catch (e) {
		console.warn("[Seidr] beep hover Reply menu failed", e);
	}

	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "seidr-beep-reply-btn ReplyButton";
	btn.title = "Reply";
	btn.textContent = "Reply";
	btn.addEventListener("click", function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		onReply();
	});
	div.appendChild(btn);
}

function onComposeKeyDown(ev: KeyboardEvent): void {
	if (!activeBeepReply) return;
	if (ev.key !== "Escape") return;
	const t = ev.target as HTMLElement | null;
	if (!t) return;
	if (t.id !== "InputChat" && t.id !== "fbm-fc-input") return;
	seidrBeepClearReply();
}

function wireReplyIndicatorClose(): void {
	const close = document.getElementById("chat-room-reply-indicator-close");
	if (!close || (close as any).__seidrBeepClose) return;
	(close as any).__seidrBeepClose = true;
	close.addEventListener("click", function () {
		seidrBeepClearReply();
	});
}

export function seidrInstallBeepReply(): void {
	if (installed) return;
	installed = true;
	if (!Seidr.hookFunction) return;

	Seidr.hookFunction(
		"ChatRoomAppendChat",
		6,
		function (args: unknown[], next: (a?: unknown[]) => unknown) {
			const ret = next(args);
			try {
				const div = args && (args[0] as HTMLElement);
				if (div && div.classList && div.classList.contains("ChatMessageBeep")) {
					enhanceBeepDiv(div);
				}
			} catch (e) {
				console.warn("[Seidr] beep reply enhance", e);
			}
			return ret;
		}
	);

	Seidr.hookFunction(
		"ChatRoomSendChat",
		9,
		function (args: unknown[], next: (a?: unknown[]) => unknown) {
			try {
				const club = document.getElementById("InputChat") as HTMLTextAreaElement | null;
				const msg = club ? String(club.value || "").trim() : "";
				if (/^\/beep\b/i.test(msg) && activeBeepReply) {
					seidrBeepClearReply();
				}
			} catch (e) { /* ignore */ }
			return next(args);
		}
	);

	document.addEventListener("keydown", onComposeKeyDown, true);
	wireReplyIndicatorClose();
	setTimeout(wireReplyIndicatorClose, 2000);

	seidrBeepReplyRescan();
}

/** Re-apply hover Reply to existing Club beep rows (e.g. after Settings toggle on). */
export function seidrBeepReplyRescan(): void {
	if (!seidrCmdBeepReplyEnabled()) return;
	try {
		const log = document.getElementById("TextAreaChatLog");
		if (!log) return;
		log.querySelectorAll(".ChatMessageBeep").forEach(function (node) {
			enhanceBeepDiv(node as HTMLElement);
		});
	} catch (e) { /* ignore */ }
}

/** Remove Seidr hover Reply controls when the setting is turned off. */
export function seidrBeepReplyStrip(): void {
	try {
		const log = document.getElementById("TextAreaChatLog");
		if (!log) return;
		log.querySelectorAll(".ChatMessageBeep[data-seidr-beep-reply='1']").forEach(function (node) {
			const div = node as HTMLElement;
			div.querySelectorAll(".seidr-beep-reply-menu, .seidr-beep-reply-btn").forEach(function (el) {
				if (el.parentNode) el.parentNode.removeChild(el);
			});
			div.removeAttribute("data-seidr-beep-reply");
		});
	} catch (e) { /* ignore */ }
	seidrBeepClearReply();
}
