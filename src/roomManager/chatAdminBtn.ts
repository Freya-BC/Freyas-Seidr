/** Club DrawButton on ChatAdmin — next to BCX (Room Manager plugin style), smaller to clear Language */
import { Seidr } from "../seidr";
import { seidrGetSettings } from "../settings/storage";
import { rmIsShown } from "./model";
import { rmOpenPanel } from "./shell";

function hasBcx(): boolean {
	try {
		return typeof (window as any).bcx !== "undefined" && (window as any).bcx != null;
	} catch (e) {
		return false;
	}
}

/** Entry rect: right of BCX when present; else BCX’s slot. Smaller than BCX (90) so Language is not clipped. */
function getEntryButtonRect(): { x: number; y: number; w: number; h: number } {
	const size = 64;
	const y = 132 + Math.floor((90 - size) / 2);
	if (hasBcx()) return { x: 222, y: y, w: size, h: size };
	return { x: 124, y: y, w: size, h: size };
}

function nativeChatAdminVisible(): boolean {
	try {
		if (typeof CurrentScreen !== "undefined" && CurrentScreen !== "ChatAdmin") return false;
		if (typeof ChatAdminPreviewBackgroundMode !== "undefined" && ChatAdminPreviewBackgroundMode) {
			return false;
		}
	} catch (e) {
		return false;
	}
	const el = document.getElementById("InputName");
	if (!el) return false;
	if (el.hasAttribute("hidden")) return false;
	if (el.style && el.style.display === "none") return false;
	return true;
}

function rmChatAdminBtnAllowed(): boolean {
	if (!rmIsShown()) return false;
	if (seidrGetSettings().roomManagerEnabled === false) return false;
	return nativeChatAdminVisible();
}

/** Draw after Club's ChatAdminRun (and BCX “More” button). */
export function rmChatAdminDrawButton() {
	if (!rmChatAdminBtnAllowed()) return;
	if (typeof DrawButton !== "function") return;
	const r = getEntryButtonRect();
	DrawButton(r.x, r.y, r.w, r.h, "", "White", "Icons/Preference.png");
	try {
		if (typeof MouseIn === "function" && MouseIn(r.x, r.y, r.w, r.h)
			&& typeof DrawButtonHover === "function") {
			DrawButtonHover(r.x, r.y, r.w, r.h, "Room Manager");
		}
	} catch (e) { /* ignore */ }
}

/** Handle click before Club processes the screen. Returns true if consumed. */
export function rmChatAdminClickButton(): boolean {
	if (!rmChatAdminBtnAllowed()) return false;
	try {
		const r = getEntryButtonRect();
		if (typeof MouseIn === "function" && MouseIn(r.x, r.y, r.w, r.h)) {
			rmOpenPanel();
			return true;
		}
	} catch (e) { /* ignore */ }
	return false;
}

Seidr.rmChatAdminDrawButton = rmChatAdminDrawButton;
Seidr.rmChatAdminClickButton = rmChatAdminClickButton;
