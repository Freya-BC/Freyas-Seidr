/** Force-clear Club ChatMessage tab badge when returning to the tab or focusing compose. */
import { Seidr } from "../seidr";
import { seidrGetSettings } from "./storage";

declare function NotificationReset(eventType: string): void;
declare const NotificationEventType: { CHATMESSAGE?: string } | undefined;

const CHAT_MESSAGE = "ChatMessage";
const DEBOUNCE_MS = 100;
const COMPOSE_IDS: Record<string, true> = { InputChat: true, "fbm-fc-input": true };

let installed = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let onWindowFocus: (() => void) | null = null;
let onFocusIn: ((ev: FocusEvent) => void) | null = null;

function chatMessageEventType(): string {
	try {
		if (NotificationEventType && typeof NotificationEventType.CHATMESSAGE === "string") {
			return NotificationEventType.CHATMESSAGE;
		}
	} catch (e) { /* ignore */ }
	return CHAT_MESSAGE;
}

function clearChatMessageBadge(): void {
	try {
		const s = seidrGetSettings();
		if (s.clearUnreadOnFocus === false) return;
		if (typeof NotificationReset !== "function") return;
		NotificationReset(chatMessageEventType());
	} catch (e) { /* ignore */ }
}

function scheduleClear(): void {
	if (debounceTimer != null) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(function () {
		debounceTimer = null;
		clearChatMessageBadge();
	}, DEBOUNCE_MS);
}

export function seidrUninstallClearUnreadOnFocus(): void {
	if (debounceTimer != null) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	if (onWindowFocus) {
		window.removeEventListener("focus", onWindowFocus);
		onWindowFocus = null;
	}
	if (onFocusIn) {
		document.removeEventListener("focusin", onFocusIn);
		onFocusIn = null;
	}
	installed = false;
}

export function seidrInstallClearUnreadOnFocus(): void {
	if (installed) return;
	installed = true;
	onWindowFocus = function () {
		scheduleClear();
	};
	onFocusIn = function (ev: FocusEvent) {
		const t = ev.target;
		if (!t || !(t instanceof Element)) return;
		const id = t.id || "";
		if (!COMPOSE_IDS[id]) return;
		scheduleClear();
	};
	window.addEventListener("focus", onWindowFocus);
	document.addEventListener("focusin", onFocusIn);
}

Seidr.installClearUnreadOnFocus = seidrInstallClearUnreadOnFocus;
Seidr.uninstallClearUnreadOnFocus = seidrUninstallClearUnreadOnFocus;
