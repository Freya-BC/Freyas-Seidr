/** Seidr Room Manager — install hooks */
import { Seidr } from "../seidr";
import { rmIsShown } from "./model";
import { rmInvalidateStore } from "./storage";
import {
	rmEnsureShell,
	rmUpdateLauncherVisibility,
	rmDestroyShell,
	rmEnterLiveRoomPlacement,
	rmRelayoutLauncher,
} from "./shell";
import { rmChatAdminMountButton, rmChatAdminMountButtonSoon } from "./chatAdminBtn";
import { rmUpdateApplyUi } from "./ui";
import { rmIsAdmin } from "./roomApply";

let installed = false;
let tick: ReturnType<typeof setInterval> | null = null;
let lastTickKey = "";

function onWindowResize() {
	try { rmRelayoutLauncher(); } catch (e) { /* ignore */ }
}

function detachResizeListeners() {
	window.removeEventListener("resize", onWindowResize);
	if (window.visualViewport) {
		window.visualViewport.removeEventListener("resize", onWindowResize);
		window.visualViewport.removeEventListener("scroll", onWindowResize);
	}
}

function attachResizeListeners() {
	detachResizeListeners();
	window.addEventListener("resize", onWindowResize);
	if (window.visualViewport) {
		window.visualViewport.addEventListener("resize", onWindowResize);
		window.visualViewport.addEventListener("scroll", onWindowResize);
	}
}

function tickStateKey(): string {
	let screen = "";
	let dialog = "0";
	let admin = "0";
	let fbm = "0";
	try {
		if (typeof CurrentScreen !== "undefined") screen = String(CurrentScreen || "");
	} catch (e) { /* ignore */ }
	try {
		dialog = typeof CurrentCharacter !== "undefined" && CurrentCharacter != null ? "1" : "0";
	} catch (e) { /* ignore */ }
	try {
		admin = rmIsAdmin() ? "1" : "0";
	} catch (e) { /* ignore */ }
	try {
		const el = document.getElementById("fbm-float-chat");
		fbm = el && !el.hidden ? "1" : "0";
	} catch (e) { /* ignore */ }
	return screen + "|" + dialog + "|" + admin + "|" + fbm;
}

function onScreenTick() {
	const key = tickStateKey();
	if (key !== lastTickKey) {
		lastTickKey = key;
		rmUpdateLauncherVisibility();
	}
	try { rmUpdateApplyUi(); } catch (e) { /* ignore */ }
	try { rmChatAdminMountButton(); } catch (e) { /* ignore */ }
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
	lastTickKey = tickStateKey();

	Seidr.tryHook("ChatAdminLoad", "ChatAdminLoad", 12, function (args, next) {
		const ret = next(args);
		const after = function () {
			try { rmChatAdminMountButtonSoon(); } catch (e) { /* ignore */ }
			try { rmUpdateLauncherVisibility(); } catch (e) { /* ignore */ }
		};
		if (ret && typeof (ret as Promise<unknown>).then === "function") {
			return (ret as Promise<unknown>).then(function (v) {
				after();
				return v;
			}, function (err) {
				after();
				throw err;
			});
		}
		after();
		return ret;
	});
	// Empty on R134 but still invoked each frame — reliable remount if Load hook missed.
	Seidr.tryHook("ChatAdminRun", "ChatAdminRun", 12, function (args, next) {
		const ret = next(args);
		try { rmChatAdminMountButton(); } catch (e) { /* ignore */ }
		return ret;
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
	// Immediate hide/show when leaving ChatRoom (Preference, MainHall, …).
	Seidr.tryHook("commonSetScreen", "CommonSetScreen", 0, function (args, next) {
		const ret = next(args);
		try {
			lastTickKey = tickStateKey();
			rmUpdateLauncherVisibility();
		} catch (e) { /* ignore */ }
		try { rmUpdateApplyUi(); } catch (e) { /* ignore */ }
		return ret;
	});
	// Club chat/canvas reflow — re-scale and re-anchor ⌂.
	Seidr.tryHook("ChatRoomResize", "ChatRoomResize", 2, function (args, next) {
		const ret = next(args);
		try { rmRelayoutLauncher(); } catch (e) { /* ignore */ }
		return ret;
	});

	if (tick) clearInterval(tick);
	tick = setInterval(onScreenTick, 1000);
	attachResizeListeners();
}

export function rmUninstall() {
	if (tick) {
		clearInterval(tick);
		tick = null;
	}
	detachResizeListeners();
	lastTickKey = "";
	rmDestroyShell();
	installed = false;
}

Seidr.installRoomManager = rmInstall;
Seidr.uninstallRoomManager = rmUninstall;
Seidr.rmUpdateLauncherVisibility = rmUpdateLauncherVisibility;
Seidr.rmRelayoutLauncher = rmRelayoutLauncher;
