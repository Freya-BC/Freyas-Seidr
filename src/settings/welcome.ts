/**
 * One-time local chat welcome — only in a live ChatRoom.
 * If Seidr boots outside a room, wait until the next ChatRoom enter/sync.
 */
import { Seidr } from "../seidr";
import { seidrGetSettings, seidrSaveSettings } from "./storage";

/** Sticky (Club removes LocalMessage only when Timeout > 0). */
const WELCOME_MS = 0;
const WELCOME_DEFER_MS = 400;

var seidrWelcomeHooked = false;
var seidrWelcomeTimer: ReturnType<typeof setTimeout> | null = null;

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** True when the player is in ChatRoom with a chat log we can write to. */
function seidrInLiveChatRoom(): boolean {
	try {
		if (typeof ServerPlayerIsInChatRoom === "function" && !ServerPlayerIsInChatRoom()) return false;
	} catch (e) {
		return false;
	}
	try {
		if (typeof CurrentScreen === "string" && CurrentScreen !== "ChatRoom") return false;
	} catch (e) { /* ignore screen check */ }
	if (typeof ChatRoomSendLocal !== "function") return false;
	if (
		!document.getElementById("TextChat")
		&& !document.getElementById("TextAreaChatLog")
		&& !document.getElementById("ChatRoomChatLog")
	) {
		return false;
	}
	return true;
}

function seidrWelcomeHtml(): string {
	const text =
		"Welcome to Seidr. Holds (pull/cuddle), undress, custom actions, animations, and chat commands live here. " +
		"Open settings with /seidr. For a guided walkthrough, open About → Tutorial.";
	return (
		'<span style="color:#d4a017;">[Seidr]</span> ' +
		'<span style="color:#f0e6d4;">' + escapeHtml(text) + "</span>"
	);
}

/** Attempt send now; no-op if not in a live room or already seen. */
export function seidrMaybeSendWelcome(): void {
	try {
		if (seidrGetSettings().welcomeLocalSeen) return;
		if (!seidrInLiveChatRoom()) return;

		ChatRoomSendLocal(seidrWelcomeHtml(), WELCOME_MS);
		seidrSaveSettings({ welcomeLocalSeen: true });
	} catch (e) {
		console.warn("[Seidr] welcome", e);
	}
}

/** After room sync/load, wait briefly so TextChat exists, then welcome. */
function seidrScheduleWelcome(): void {
	try {
		if (seidrGetSettings().welcomeLocalSeen) return;
	} catch (e) {
		return;
	}
	if (seidrWelcomeTimer) clearTimeout(seidrWelcomeTimer);
	seidrWelcomeTimer = setTimeout(function () {
		seidrWelcomeTimer = null;
		seidrMaybeSendWelcome();
	}, WELCOME_DEFER_MS);
}

/** Hook room enter/sync so welcome appears in the next chatroom if we boot elsewhere. */
export function seidrInstallWelcome(): void {
	if (seidrWelcomeHooked) return;
	seidrWelcomeHooked = true;

	if (typeof Seidr.hookFunction === "function") {
		Seidr.hookFunction("ChatRoomSync", 8, function (args: unknown[], next: (a: unknown[]) => unknown) {
			const result = next(args);
			try { seidrScheduleWelcome(); } catch (e) { /* ignore */ }
			return result;
		});
	}
	if (typeof Seidr.tryHook === "function") {
		Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 8, function (args: unknown[], next: (a: unknown[]) => unknown) {
			const result = next(args);
			try { seidrScheduleWelcome(); } catch (e) { /* ignore */ }
			return result;
		});
	}

	// Already in a room (bookmark reload): schedule once TextChat is ready.
	try { seidrScheduleWelcome(); } catch (e) { /* ignore */ }
}

Seidr.maybeSendWelcome = seidrMaybeSendWelcome;
Seidr.installWelcome = seidrInstallWelcome;
