/** Floating launcher + resizable panel chrome */
import { Seidr } from "../seidr";
import { rmInjectStyles } from "./styles";
import { rmGetStore, rmSaveStore } from "./storage";
import { rmIsAdmin, rmInLiveRoom, rmOnChatAdmin } from "./roomApply";
import { rmRefreshUi, rmBuildPanelBody } from "./ui";
import { seidrGetSettings } from "../settings/storage";
import type { RmLauncherPosition } from "../settings/model";

let root: HTMLElement | null = null;
let btn: HTMLButtonElement | null = null;
let panel: HTMLElement | null = null;
let sessionBtnPos: { x: number; y: number } | null = null;
let dragMoved = false;

const BTN = 44;
const PAD = 16;

function chatLogRect(): DOMRect | null {
	const el = document.getElementById("TextAreaChatLog");
	if (!el) return null;
	return el.getBoundingClientRect();
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
	const maxL = Math.max(pad, window.innerWidth - w - pad);
	const maxT = Math.max(pad, window.innerHeight - h - pad);
	left = Math.min(Math.max(pad, left), maxL);
	top = Math.min(Math.max(pad, top), maxT);
	panel.style.left = left + "px";
	panel.style.top = top + "px";
	panel.style.right = "auto";
}

function applyDefaultPanelGeometry() {
	if (!panel) return;
	const store = rmGetStore();
	const ui = store.ui || {};
	if (ui.w && ui.h && ui.x != null && ui.y != null) {
		panel.style.width = ui.w + "px";
		panel.style.height = ui.h + "px";
		panel.style.left = ui.x + "px";
		panel.style.top = ui.y + "px";
		panel.style.right = "auto";
		clampPanel();
		return;
	}
	const rect = chatLogRect();
	if (rect && rect.width > 80 && rect.height > 80) {
		panel.style.width = Math.max(480, Math.min(rect.width, window.innerWidth - 16)) + "px";
		panel.style.height = Math.max(360, Math.min(rect.height, window.innerHeight - 16)) + "px";
		panel.style.left = Math.max(8, rect.left) + "px";
		panel.style.top = Math.max(8, rect.top) + "px";
		panel.style.right = "auto";
	}
	clampPanel();
}

function persistPanelGeometry() {
	if (!panel || !panel.classList.contains("seidr-rm-open")) return;
	const store = rmGetStore();
	store.ui = {
		x: parseFloat(panel.style.left) || panel.offsetLeft,
		y: parseFloat(panel.style.top) || panel.offsetTop,
		w: panel.offsetWidth,
		h: panel.offsetHeight,
	};
	rmSaveStore();
}

function makeDraggable(el: HTMLElement, onEnd?: () => void) {
	let ox = 0;
	let oy = 0;
	let startX = 0;
	let startY = 0;
	function down(ev: PointerEvent) {
		const t = ev.target as HTMLElement;
		// Ignore nested controls, but allow dragging the element itself (e.g. the launcher button).
		if (t !== el && t.closest && t.closest("button, select, input, a")) return;
		dragMoved = false;
		startX = ev.clientX;
		startY = ev.clientY;
		const r = el.getBoundingClientRect();
		ox = ev.clientX - r.left;
		oy = ev.clientY - r.top;
		el.setPointerCapture(ev.pointerId);
		ev.preventDefault();
	}
	function move(ev: PointerEvent) {
		if (!el.hasPointerCapture(ev.pointerId)) return;
		if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) dragMoved = true;
		el.style.left = (ev.clientX - ox) + "px";
		el.style.top = (ev.clientY - oy) + "px";
		el.style.right = "auto";
	}
	function up(ev: PointerEvent) {
		if (!el.hasPointerCapture(ev.pointerId)) return;
		el.releasePointerCapture(ev.pointerId);
		if (onEnd) onEnd();
	}
	el.addEventListener("pointerdown", down);
	el.addEventListener("pointermove", move);
	el.addEventListener("pointerup", up);
	el.addEventListener("pointercancel", up);
}

function rmChatAdminCreateMode(): boolean {
	try {
		const mode = (window as any).ChatAdminMode;
		if (mode === "create" || mode === "Create") return true;
	} catch (e) { /* ignore */ }
	return rmOnChatAdmin() && !rmInLiveRoom();
}

function setBtnXY(x: number, y: number) {
	if (!btn) return;
	const maxX = Math.max(8, window.innerWidth - BTN - 8);
	const maxY = Math.max(8, window.innerHeight - BTN - 8);
	btn.style.left = Math.min(Math.max(8, x), maxX) + "px";
	btn.style.top = Math.min(Math.max(8, y), maxY) + "px";
	btn.style.right = "auto";
}

function applyLauncherPosition(pos: RmLauncherPosition) {
	if (!btn) return;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const chat = chatLogRect();

	if (pos === "chatLeft" || pos === "chatTop" || pos === "chatBottom") {
		if (chat && chat.width > 40) {
			const x = chat.left - BTN - 8;
			let y: number;
			if (pos === "chatTop") y = chat.top + 8;
			else if (pos === "chatBottom") y = chat.bottom - BTN - 8;
			else y = chat.top + chat.height / 2 - BTN / 2;
			setBtnXY(x, y);
			return;
		}
		// Fallback: middle-right of viewport
		setBtnXY(vw - BTN - PAD, vh * 0.42);
		return;
	}

	const leftX = PAD;
	const rightX = vw - BTN - PAD;
	const topY = PAD;
	const bottomY = vh - BTN - PAD;
	const midY = vh / 2 - BTN / 2;

	switch (pos) {
		case "topLeft": setBtnXY(leftX, topY); break;
		case "topRight": setBtnXY(rightX, topY); break;
		case "bottomLeft": setBtnXY(leftX, bottomY); break;
		case "bottomRight": setBtnXY(rightX, bottomY); break;
		case "middleLeft": setBtnXY(leftX, midY); break;
		case "middleRight": setBtnXY(rightX, midY); break;
		default: setBtnXY(rightX, midY); break;
	}
}

function placeBtnDefault() {
	if (!btn) return;
	if (sessionBtnPos) {
		setBtnXY(sessionBtnPos.x, sessionBtnPos.y);
		return;
	}
	if (rmOnChatAdmin()) {
		const save = document.querySelector("#ChatAdmin button, button[name='Save']");
		// Prefer left of InputName / Save region
		const name = document.getElementById("InputName");
		const anchor = name || (save as HTMLElement | null);
		const create = rmChatAdminCreateMode();
		if (anchor) {
			const r = anchor.getBoundingClientRect();
			const preferredTop = create
				? Math.min(r.top, window.innerHeight * 0.28)
				: r.top;
			setBtnXY(r.left - BTN - 8, preferredTop);
			return;
		}
		if (create) {
			setBtnXY(window.innerWidth - BTN - PAD, window.innerHeight * 0.28);
			return;
		}
	}
	const settings = seidrGetSettings();
	applyLauncherPosition(settings.launcherPosition || "chatTop");
}

export function rmClearSessionBtnPos() {
	sessionBtnPos = null;
}

let enterPlaceTimers: ReturnType<typeof setTimeout>[] = [];

function clearEnterPlaceTimers() {
	enterPlaceTimers.forEach(function (t) { clearTimeout(t); });
	enterPlaceTimers = [];
}

function isChatAnchorPos(pos: string): boolean {
	return pos === "chatLeft" || pos === "chatTop" || pos === "chatBottom";
}

function chatLogReady(): boolean {
	const r = chatLogRect();
	return !!(r && r.width > 40);
}

/** After ChatAdmin → live room: apply settings position; retry Chat* until chat DOM exists. */
export function rmEnterLiveRoomPlacement() {
	clearEnterPlaceTimers();
	rmClearSessionBtnPos();
	rmEnsureShell();
	rmUpdateLauncherVisibility();
	placeBtnDefault();

	const pos = seidrGetSettings().launcherPosition || "chatTop";
	if (!isChatAnchorPos(pos) || chatLogReady()) return;

	const delays = [100, 300, 800];
	delays.forEach(function (ms, i) {
		enterPlaceTimers.push(setTimeout(function () {
			if (sessionBtnPos) {
				clearEnterPlaceTimers();
				return;
			}
			const last = i === delays.length - 1;
			if (!chatLogReady() && !last) return;
			placeBtnDefault();
			if (chatLogReady() || last) clearEnterPlaceTimers();
		}, ms));
	});
}

export function rmOnSettingsChanged() {
	clearEnterPlaceTimers();
	rmClearSessionBtnPos();
	rmUpdateLauncherVisibility();
}

export function rmEnsureShell() {
	rmInjectStyles();
	if (root && document.body.contains(root)) return;
	root = document.createElement("div");
	root.id = "seidr-rm-root";
	btn = document.createElement("button");
	btn.type = "button";
	btn.id = "seidr-rm-btn";
	btn.title = "Room Manager";
	btn.setAttribute("aria-label", "Room Manager");
	btn.textContent = "⌂";
	panel = document.createElement("div");
	panel.id = "seidr-rm-panel";
	panel.innerHTML = [
		'<div class="seidr-rm-header">',
		'  <div class="seidr-rm-header-title">Room Manager<span>Dev</span></div>',
		'  <button type="button" class="seidr-rm-icon-btn" data-rm="close" title="Close">×</button>',
		"</div>",
		'<div class="seidr-rm-body" id="seidr-rm-body"></div>',
		'<div class="seidr-rm-footer" id="seidr-rm-footer">',
		'  <span class="seidr-rm-msg" id="seidr-rm-msg"></span>',
		'  <span class="seidr-rm-footer-usage" id="seidr-rm-footer-usage">Storage: —</span>',
		"</div>",
	].join("");
	root.appendChild(btn);
	root.appendChild(panel);
	document.body.appendChild(root);
	// Bubble-phase only: capture-phase stopPropagation blocks the button target.
	["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"].forEach(function (type) {
		root!.addEventListener(type, function (ev) {
			ev.stopPropagation();
		});
	});

	makeDraggable(btn, function () {
		if (!btn) return;
		sessionBtnPos = {
			x: parseFloat(btn.style.left) || btn.offsetLeft,
			y: parseFloat(btn.style.top) || btn.offsetTop,
		};
	});
	const header = panel.querySelector(".seidr-rm-header") as HTMLElement;
	// Drag panel by header: move the panel element
	(function () {
		let ox = 0;
		let oy = 0;
		header.addEventListener("pointerdown", function (ev) {
			if ((ev.target as HTMLElement).closest("button")) return;
			const r = panel!.getBoundingClientRect();
			ox = ev.clientX - r.left;
			oy = ev.clientY - r.top;
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
			persistPanelGeometry();
		});
	})();

	// Toggle on pointerup after a non-drag press (click may be swallowed by preventDefault).
	btn.addEventListener("pointerup", function () {
		if (dragMoved) return;
		rmTogglePanel();
	});
	panel.querySelector('[data-rm="close"]')!.addEventListener("click", function () {
		rmClosePanel();
	});

	const ro = new ResizeObserver(function () {
		clampPanel();
		persistPanelGeometry();
	});
	ro.observe(panel);

	rmBuildPanelBody();
}

export function rmUpdateLauncherVisibility() {
	const enabled = seidrGetSettings().roomManagerEnabled !== false;
	if (!Seidr.SHOW_ROOM_MANAGER || !enabled) {
		if (btn) btn.classList.remove("seidr-rm-visible");
		rmClosePanel();
		return;
	}
	rmEnsureShell();
	const show = rmIsAdmin() || rmOnChatAdmin();
	if (btn) {
		btn.classList.toggle("seidr-rm-visible", show);
		if (show) placeBtnDefault();
	}
	if (!show) rmClosePanel();
}

export function rmOpenPanel() {
	rmEnsureShell();
	if (!panel) return;
	try { applyDefaultPanelGeometry(); } catch (e) { /* ignore */ }
	panel.classList.add("seidr-rm-open");
	panel.removeAttribute("hidden");
	try { rmRefreshUi(); } catch (e) {
		console.warn("[Seidr RM] refresh", e);
	}
}

export function rmClosePanel() {
	if (!panel) return;
	persistPanelGeometry();
	panel.classList.remove("seidr-rm-open");
	panel.setAttribute("hidden", "true");
}

export function rmTogglePanel() {
	if (panel && panel.classList.contains("seidr-rm-open")) rmClosePanel();
	else rmOpenPanel();
}

export function rmDestroyShell() {
	rmClosePanel();
	if (root && root.parentNode) root.parentNode.removeChild(root);
	root = btn = panel = null;
	const st = document.getElementById("seidr-rm-styles");
	if (st && st.parentNode) st.parentNode.removeChild(st);
}

Seidr.rmOpenPanel = rmOpenPanel;
Seidr.rmClosePanel = rmClosePanel;
Seidr.rmOnSettingsChanged = rmOnSettingsChanged;
Seidr.rmClearSessionBtnPos = rmClearSessionBtnPos;
Seidr.rmEnterLiveRoomPlacement = rmEnterLiveRoomPlacement;
