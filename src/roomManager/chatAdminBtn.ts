/** Club DrawButton on ChatAdmin — left of Create/Save */
import { Seidr } from "../seidr";
import { seidrGetSettings } from "../settings/storage";
import { rmIsShown } from "./model";
import { rmOpenPanel } from "./shell";

/** Same row as Create/Save (1325, 840, 250, 65). */
const BTN_X = 1065;
const BTN_Y = 840;
const BTN_W = 250;
const BTN_H = 65;

function rmChatAdminBtnAllowed(): boolean {
	if (!rmIsShown()) return false;
	if (seidrGetSettings().roomManagerEnabled === false) return false;
	try {
		if (typeof ChatAdminPreviewBackgroundMode !== "undefined" && ChatAdminPreviewBackgroundMode) {
			return false;
		}
	} catch (e) { /* ignore */ }
	try {
		if (!ChatAdminData || !ChatAdminBackgroundList) return false;
	} catch (e) {
		return false;
	}
	return true;
}

/** Draw after Club's ChatAdminRun commit row. */
export function rmChatAdminDrawButton() {
	if (!rmChatAdminBtnAllowed()) return;
	if (typeof DrawButton !== "function") return;
	DrawButton(BTN_X, BTN_Y, BTN_W, BTN_H, "Room Manager", "White");
}

/** Handle click before Club processes the screen. Returns true if consumed. */
export function rmChatAdminClickButton(): boolean {
	if (!rmChatAdminBtnAllowed()) return false;
	try {
		if (typeof MouseIn === "function" && MouseIn(BTN_X, BTN_Y, BTN_W, BTN_H)) {
			rmOpenPanel();
			return true;
		}
	} catch (e) { /* ignore */ }
	return false;
}

Seidr.rmChatAdminDrawButton = rmChatAdminDrawButton;
Seidr.rmChatAdminClickButton = rmChatAdminClickButton;
