import { seidrApplyColorScheme } from "./settings/theme";
/** Seidr — boot after login */
import { Seidr } from "./seidr";

import "./defaults";
import "./state";
import "./room";
import "./undress";
import "./intimateActivities";
import "./core/sdk";
import "./activities";
import "./draw";
import "./mapHolds";
import "./arousalBars";
import "./actions/index";
import "./commands/index";
import "./animations/index";
import "./reactions/index";
import "./poses/index";
import "./fastOpen";
import { installRadial, installRadialMapGrid, uninstallRadial } from "./radial/runtime";
import { installRadialStyles } from "./radial/styles";
import "./net";
import { installStatusIcon } from "./statusIcon";
import "./roomManager/index";
import "./settings/index";
import "./testSurface";
import "./netStats";

const session = (window.__SeidrSession = window.__SeidrSession || { hubs: {} });

Seidr.getHubs = function () {
	return session.hubs || {};
};

Seidr.setHubs = function (hubs: Record<string, unknown>) {
	session.hubs = hubs || {};
};

Seidr.prepareReload = function () {
	seidrApplyColorScheme("classic");
	if (typeof Seidr.uninstallChangelog === "function") Seidr.uninstallChangelog();
	uninstallRadial();
	if (typeof Seidr.rmFlushStore === "function") {
		try { Seidr.rmFlushStore(); } catch (e) { /* ignore */ }
	}
	if (typeof Seidr.restoreFallbackHooks === "function") {
		try { Seidr.restoreFallbackHooks(); } catch (e) { /* ignore */ }
	}
	Seidr._booted = false;
	Seidr._hookState = {};
	["seidr-styles", "seidr-loaded", "seidr-rm-styles", "seidr-fw-styles", "seidr-settings-styles", "seidr-cmd-styles", "seidr-chat-font", "seidr-pose-styles", "seidr-radial-styles"].forEach(function (id) {
		const node = document.getElementById(id);
		if (node && node.parentNode) node.parentNode.removeChild(node);
	});
	["seidr-rm-root", "seidr-fw-root", "seidr-settings-root", "seidr-cmd-ac", "seidr-tour", "seidr-pose-btn", "seidr-pose-panel", "seidr-radial-editor"].forEach(function (id) {
		const node = document.getElementById(id);
		if (node && node.parentNode) node.parentNode.removeChild(node);
	});
	if (typeof Seidr.poseDestroyUi === "function") {
		try { Seidr.poseDestroyUi(); } catch (ePose) { /* ignore */ }
	}
	if (typeof Seidr.uninstallClearUnreadOnFocus === "function") {
		try { Seidr.uninstallClearUnreadOnFocus(); } catch (eUnread) { /* ignore */ }
	}
	window.__SeidrPageLoaded = false;
};

function injectStyle() {
	if (document.getElementById("seidr-styles")) return;
	const style = document.createElement("style");
	style.id = "seidr-styles";
	style.textContent = [
		"#dialog-activity-grid button.seidr-slot-active {",
		"  box-shadow: inset 0 0 0 3px #e0b15a;",
		"}",
		".seidr-loaded {",
		"  position: fixed;",
		"  z-index: 120;",
		"  right: 16px;",
		// Leave separate rows for Better Maps and Freyas Protection startup notices.
		"  bottom: 178px;",
		"  max-width: min(90vw, 320px);",
		"  padding: 10px 14px;",
		"  border-radius: 8px;",
		"  border: 1px solid rgba(255, 255, 255, 0.1);",
		"  background: rgba(36, 28, 48, 0.92);",
		"  backdrop-filter: blur(12px);",
		"  -webkit-backdrop-filter: blur(12px);",
		"  color: #f0e6d4;",
		"  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);",
		"  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
		"  pointer-events: none;",
		"  opacity: 1;",
		"  transition: opacity 0.4s ease;",
		"}",
		".seidr-loaded-hide { opacity: 0; }",
	].join("\n");
	(document.head || document.documentElement).appendChild(style);
}

function showLoadedToast() {
	if (typeof document === "undefined" || !document.body) return;
	const prev = document.getElementById("seidr-loaded");
	if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
	const el = document.createElement("div");
	el.id = "seidr-loaded";
	el.className = "seidr-loaded";
	el.setAttribute("role", "status");
	el.textContent = (Seidr.FULL_NAME || "Seidr") + " Loaded: Version " + Seidr.VERSION;
	document.body.appendChild(el);
	setTimeout(function () {
		el.classList.add("seidr-loaded-hide");
		setTimeout(function () {
			if (el.parentNode) el.parentNode.removeChild(el);
		}, 500);
	}, 4000);
}

function installHooks() {
	Seidr.registerBcModSdk();
	Seidr.installActivities();
	installRadialStyles();
	Seidr.installDraw();
	if (typeof Seidr.installArousalBars === "function") {
		try { Seidr.installArousalBars(); } catch (e) { console.warn("[Seidr] Arousal bars", e); }
	}
	if (typeof Seidr.installFastOpen === "function") {
		try { Seidr.installFastOpen(); } catch (e) { console.warn("[Seidr] Fast Open", e); }
	}
	if (typeof Seidr.installActions === "function") {
		try { Seidr.installActions(); } catch (e) { console.warn("[Seidr] Actions", e); }
	}
	if (typeof Seidr.installCommands === "function") {
		try { Seidr.installCommands(); } catch (e) { console.warn("[Seidr] Commands", e); }
	}
	if (typeof Seidr.installPoses === "function") {
		try { Seidr.installPoses(); } catch (e) { console.warn("[Seidr] Poses", e); }
	}
	if (typeof Seidr.installAnimations === "function") {
		try { Seidr.installAnimations(); } catch (e) { console.warn("[Seidr] Animations", e); }
	}
	if (typeof Seidr.installReactions === "function") {
		try { Seidr.installReactions(); } catch (e) { console.warn("[Seidr] Reactions", e); }
	}
	Seidr.installNet();
	installStatusIcon();
	if (typeof Seidr.installNetStats === "function") {
		try { Seidr.installNetStats(); } catch (e) { console.warn("[Seidr] NetStats", e); }
	}
	if (typeof Seidr.installStorageFlush === "function") {
		try { Seidr.installStorageFlush(); } catch (e) { console.warn("[Seidr] Storage flush", e); }
	}
	if (typeof Seidr.installMapHolds === "function") {
		try { Seidr.installMapHolds(); } catch (e) { console.warn("[Seidr] Map holds", e); }
	}
	installRadial();
	installRadialMapGrid();
	if (typeof Seidr.installRoomManager === "function") {
		try { Seidr.installRoomManager(); } catch (e) { console.warn("[Seidr] Room Manager", e); }
	}
	if (typeof Seidr.installSeidrSettings === "function") {
		try { Seidr.installSeidrSettings(); } catch (e) { console.warn("[Seidr] Settings", e); }
	}
}

function ready(): boolean {
	return typeof Player !== "undefined" && !!Player && Player.MemberNumber != null
		&& typeof ActivityFemale3DCG !== "undefined"
		&& typeof PreferenceRegisterExtensionSetting === "function";
}

function boot() {
	if (Seidr._booted) return;
	if (!ready()) return;
	Seidr._booted = true;
	injectStyle();
	installHooks();
	if (typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom() && typeof Seidr.hello === "function") {
		try { Seidr.hello(true); } catch (e) { /* ignore */ }
	}
	try { showLoadedToast(); } catch (eToast) { /* ignore */ }
	console.log("[Seidr] " + Seidr.VERSION + " ready");
}

function wait() {
	if (ready()) {
		boot();
		return;
	}
	setTimeout(wait, 250);
}

wait();
