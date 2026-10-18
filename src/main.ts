/** Seidr — boot after login */
import { Seidr } from "./seidr";

import "./defaults";
import "./state";
import "./room";
import "./undress";
import "./core/sdk";
import "./activities";
import "./draw";
import "./net";

const session = (window.__SeidrSession = window.__SeidrSession || { hubs: {} });

Seidr.getHubs = function () {
	return session.hubs || {};
};

Seidr.setHubs = function (hubs: Record<string, unknown>) {
	session.hubs = hubs || {};
};

Seidr.prepareReload = function () {
	if (typeof Seidr.restoreFallbackHooks === "function") {
		try { Seidr.restoreFallbackHooks(); } catch (e) { /* ignore */ }
	}
	Seidr._booted = false;
	Seidr._hookState = {};
	["seidr-styles", "seidr-loaded"].forEach(function (id) {
		const node = document.getElementById(id);
		if (node && node.parentNode) node.parentNode.removeChild(node);
	});
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
		"  bottom: 18px;",
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
	Seidr.installDraw();
	Seidr.installNet();
}

function boot() {
	if (Seidr._booted) return;
	if (typeof Player === "undefined" || !Player || Player.MemberNumber == null) return;
	if (typeof ActivityFemale3DCG === "undefined") return;
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
	if (typeof Player !== "undefined" && Player && Player.MemberNumber != null && typeof ActivityFemale3DCG !== "undefined") {
		boot();
		return;
	}
	setTimeout(wait, 250);
}

wait();
