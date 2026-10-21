/** Seidr Room Manager — install hooks */
import { Seidr } from "../seidr";
import { rmIsShown } from "./model";
import { rmInvalidateStore } from "./storage";
import {
	rmEnsureShell,
	rmUpdateLauncherVisibility,
	rmDestroyShell,
	rmEnterLiveRoomPlacement,
} from "./shell";
import { rmChatAdminDrawButton, rmChatAdminClickButton } from "./chatAdminBtn";
import { rmUpdateApplyUi } from "./ui";

let installed = false;
let tick: ReturnType<typeof setInterval> | null = null;

function onScreenTick() {
	rmUpdateLauncherVisibility();
	try { rmUpdateApplyUi(); } catch (e) { /* ignore */ }
}

export function rmInstall() {
	if (!rmIsShown()) return;
	if (installed) {
		rmUpdateLauncherVisibility();
		return;
	}
	installed = true;
	rmInvalidateStore();
	rmEnsureShell();
	rmUpdateLauncherVisibility();

	Seidr.tryHook("ChatAdminRun", "ChatAdminRun", 12, function (args, next) {
		const ret = next(args);
		try { rmChatAdminDrawButton(); } catch (e) { /* ignore */ }
		try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
		return ret;
	});
	Seidr.tryHook("ChatAdminClick", "ChatAdminClick", 20, function (args, next) {
		try {
			if (rmChatAdminClickButton()) return;
		} catch (e) { /* ignore */ }
		return next(args);
	});
	Seidr.tryHook("ChatAdminExit", "ChatAdminExit", 0, function (args, next) {
		// Keep RM panel open when leaving ChatAdmin; Loads re-gate via tick/apply UI.
		const ret = next(args);
		try { rmEnterLiveRoomPlacement(); } catch (e) { /* ignore */ }
		try { rmUpdateApplyUi(); } catch (e) { /* ignore */ }
		return ret;
	});
	Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 5, function (args, next) {
		const ret = next(args);
		try { rmEnterLiveRoomPlacement(); } catch (e) { /* ignore */ }
		return ret;
	});
	Seidr.tryHook("ChatRoomSync", "ChatRoomSync", 0, function (args, next) {
		const ret = next(args);
		try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
		return ret;
	});
	Seidr.tryHook("CharacterSetCurrent", "CharacterSetCurrent", 0, function (args, next) {
		const ret = next(args);
		try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
		return ret;
	});
	Seidr.tryHook("DialogLeave", "DialogLeave", 0, function (args, next) {
		const ret = next(args);
		try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
		return ret;
	});

	if (tick) clearInterval(tick);
	tick = setInterval(onScreenTick, 1000);
	window.addEventListener("resize", function () {
		try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
	});
}

export function rmUninstall() {
	if (tick) {
		clearInterval(tick);
		tick = null;
	}
	rmDestroyShell();
	installed = false;
}

Seidr.installRoomManager = rmInstall;
Seidr.uninstallRoomManager = rmUninstall;
