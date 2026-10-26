/** Preference Extensions entry + settings panel chrome */
import { Seidr } from "../seidr";
import { seidrInjectSettingsStyles } from "./styles";
import {
	seidrBindSettingsUi,
	seidrBuildSettingsBody,
	seidrDiscardDrawDraft,
	seidrRefreshSettingsUi,
} from "./ui";

let root: HTMLElement | null = null;
let panel: HTMLElement | null = null;

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

function clampPanel() {
	if (!panel) return;
	const pad = 8;
	const w = panel.offsetWidth;
	const h = panel.offsetHeight;
	let left = panel.offsetLeft;
	let top = panel.offsetTop;
	if (panel.style.left) left = parseFloat(panel.style.left) || left;
	if (panel.style.top) top = parseFloat(panel.style.top) || top;
	// Ignore transform centering once user has dragged (inline left/top set).
	const maxL = Math.max(pad, window.innerWidth - w - pad);
	const maxT = Math.max(pad, window.innerHeight - h - pad);
	left = Math.min(Math.max(pad, left), maxL);
	top = Math.min(Math.max(pad, top), maxT);
	panel.style.left = left + "px";
	panel.style.top = top + "px";
	panel.style.right = "auto";
	panel.style.transform = "none";
}

export function seidrEnsureSettingsShell() {
	seidrInjectSettingsStyles();
	if (root && document.body.contains(root)) return;
	root = document.createElement("div");
	root.id = "seidr-settings-root";
	panel = document.createElement("div");
	panel.id = "seidr-settings-panel";
	panel.innerHTML = [
		'<div class="seidr-settings-header">',
		'  <div class="seidr-settings-header-title">Seidr<span>Settings</span></div>',
		'  <button type="button" class="seidr-settings-icon-btn" data-seidr="close" title="Close">×</button>',
		"</div>",
		'<div class="seidr-settings-tabs" id="seidr-settings-tabs" role="tablist"></div>',
		'<div class="seidr-settings-body" id="seidr-settings-body"></div>',
	].join("");
	root.appendChild(panel);
	document.body.appendChild(root);
	["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"].forEach(function (type) {
		root!.addEventListener(type, function (ev) {
			ev.stopPropagation();
		});
	});
	const header = panel.querySelector(".seidr-settings-header") as HTMLElement;
	(function () {
		let ox = 0;
		let oy = 0;
		header.addEventListener("pointerdown", function (ev) {
			if ((ev.target as HTMLElement).closest("button")) return;
			const r = panel!.getBoundingClientRect();
			ox = ev.clientX - r.left;
			oy = ev.clientY - r.top;
			panel!.style.transform = "none";
			header.setPointerCapture(ev.pointerId);
			ev.preventDefault();
		});
		header.addEventListener("pointermove", function (ev) {
			if (!header.hasPointerCapture(ev.pointerId)) return;
			panel!.style.left = (ev.clientX - ox) + "px";
			panel!.style.top = (ev.clientY - oy) + "px";
			panel!.style.right = "auto";
		});
		header.addEventListener("pointerup", function (ev) {
			if (!header.hasPointerCapture(ev.pointerId)) return;
			header.releasePointerCapture(ev.pointerId);
			clampPanel();
		});
	})();
	panel.querySelector('[data-seidr="close"]')!.addEventListener("click", function () {
		seidrCloseSettings();
	});
	seidrBuildSettingsBody();
	seidrBindSettingsUi(function () {
		if (typeof Seidr.rmOnSettingsChanged === "function") {
			try { Seidr.rmOnSettingsChanged(); } catch (e) { /* ignore */ }
		}
	});
}

export function seidrOpenSettings() {
	seidrEnsureSettingsShell();
	if (!panel) return;
	seidrRefreshSettingsUi();
	panel.querySelectorAll("details").forEach(function (d) {
		d.removeAttribute("open");
	});
	panel.classList.add("seidr-settings-open");
	panel.removeAttribute("hidden");
}

export function seidrCloseSettings() {
	if (!panel) return;
	try { seidrDiscardDrawDraft(); } catch (e) { /* ignore */ }
	panel.classList.remove("seidr-settings-open");
	panel.setAttribute("hidden", "true");
}

export function seidrLeavePreferenceToGame() {
	try {
		if (typeof PreferenceExtensionsCurrent !== "undefined" && PreferenceExtensionsCurrent) {
			if (typeof PreferenceExtensionsCurrent.unload === "function") {
				PreferenceExtensionsCurrent.unload();
			}
			(window as any).PreferenceExtensionsCurrent = null;
		}
	} catch (e) { /* ignore */ }
	if (typeof ChatRoomData !== "undefined" && ChatRoomData && typeof CommonSetScreen === "function") {
		CommonSetScreen("Online", "ChatRoom");
		return;
	}
	if (
		typeof InformationSheetReturnScreen !== "undefined"
		&& InformationSheetReturnScreen
		&& typeof CommonSetScreen === "function"
	) {
		CommonSetScreen.apply(null, InformationSheetReturnScreen);
		return;
	}
	if (typeof CommonSetScreen === "function") CommonSetScreen("Room", "MainHall");
}

export function seidrRegisterPreference() {
	if (typeof PreferenceRegisterExtensionSetting !== "function") return;
	try {
		if (typeof PreferenceExtensionsSettings !== "undefined" && PreferenceExtensionsSettings.Seidr) return;
	} catch (e) { /* ignore */ }
	PreferenceRegisterExtensionSetting({
		Identifier: "Seidr",
		ButtonText: "Seidr",
		Image: Seidr.LOGO_URL || "https://freya-bc.github.io/Freyas-Seidr/assets/freyas-seidr-logo.png",
		load: function () {
			seidrOpenSettings();
			seidrLeavePreferenceToGame();
		},
		run: function () {},
		click: function () {},
		exit: function () { return true; },
		unload: function () {},
	});
}

export function seidrDestroySettingsShell() {
	seidrCloseSettings();
	if (root && root.parentNode) root.parentNode.removeChild(root);
	root = panel = null;
	const st = document.getElementById("seidr-settings-styles");
	if (st && st.parentNode) st.parentNode.removeChild(st);
}

Seidr.openSettings = seidrOpenSettings;
Seidr.closeSettings = seidrCloseSettings;
Seidr.registerPreference = seidrRegisterPreference;
