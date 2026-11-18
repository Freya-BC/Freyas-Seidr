/** Floating launcher + resizable panel chrome */
import { Seidr } from "../seidr";
import { rmInjectStyles } from "./styles";
import { rmGetStore } from "./storage";
import { rmIsAdmin } from "./roomApply";
import { rmRefreshUi, rmBuildPanelBody } from "./ui";
import { seidrGetSettings } from "../settings/storage";
import type { RmLauncherPosition } from "../settings/model";

declare const MainCanvas: { canvas?: HTMLCanvasElement } | undefined;

let root: HTMLElement | null = null;
let btn: HTMLButtonElement | null = null;
let panel: HTMLElement | null = null;
/** Session drag as viewport fractions (0–1) so resize keeps relative placement. */
let sessionBtnPos: { fx: number; fy: number } | null = null;
let dragMoved = false;
let chatLogObserver: ResizeObserver | null = null;
let panelObserver: ResizeObserver | null = null;

const BTN_BASE = 44;
const PAD = 16;

/** Same scale as Club `ElementSetFontSize` / chatFont (min canvas side / 1000). */
function clubScale(): number {
	try {
		const canvas = MainCanvas && MainCanvas.canvas;
		if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
			const scale = Math.min(canvas.clientWidth, canvas.clientHeight) / 1000;
			if (Number.isFinite(scale) && scale > 0) return scale;
		}
	} catch (e) { /* ignore */ }
	return 1;
}

function btnSize(): number {
	return Math.max(28, Math.round(BTN_BASE * clubScale()));
}

function applyBtnSize() {
	if (!btn) return;
	const s = btnSize();
	btn.style.width = s + "px";
	btn.style.height = s + "px";
}

function chatLogEl(): HTMLElement | null {
	return document.getElementById("TextAreaChatLog");
}

function chatLogRect(): DOMRect | null {
	const el = chatLogEl();
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

type PanelGeom = { x?: number; y?: number; w?: number; h?: number };

/** Panel geometry is per device: localStorage only, never ExtensionSettings (no server traffic). */
function geomKey(): string {
	const id = typeof Player !== "undefined" && Player && Player.MemberNumber != null ? Player.MemberNumber : "0";
	return "SeidrRmUi_" + id;
}

function readLocalGeom(): PanelGeom | null {
	try {
		const raw = localStorage.getItem(geomKey());
		return raw ? (JSON.parse(raw) as PanelGeom) : null;
	} catch (e) {
		return null;
	}
}

function applyDefaultPanelGeometry() {
	if (!panel) return;
	// Legacy fallback: older builds kept geometry in the synced store (read-only now).
	const ui: PanelGeom = readLocalGeom() || rmGetStore().ui || {};
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

let geomTimer: ReturnType<typeof setTimeout> | null = null;

function writePanelGeometry() {
	geomTimer = null;
	if (!panel || !panel.classList.contains("seidr-rm-open")) return;
	const geom: PanelGeom = {
		x: parseFloat(panel.style.left) || panel.offsetLeft,
		y: parseFloat(panel.style.top) || panel.offsetTop,
		w: panel.offsetWidth,
		h: panel.offsetHeight,
	};
	try {
		localStorage.setItem(geomKey(), JSON.stringify(geom));
	} catch (e) { /* ignore */ }
}

/** Debounced (resize fires every frame while dragging); local only. */
function persistPanelGeometry(immediate?: boolean) {
	if (immediate) {
		if (geomTimer) clearTimeout(geomTimer);
		writePanelGeometry();
		return;
	}
	if (geomTimer) clearTimeout(geomTimer);
	geomTimer = setTimeout(writePanelGeometry, 400);
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

function setBtnXY(x: number, y: number) {
	if (!btn) return;
	const size = btnSize();
	const maxX = Math.max(8, window.innerWidth - size - 8);
	const maxY = Math.max(8, window.innerHeight - size - 8);
	btn.style.left = Math.min(Math.max(8, x), maxX) + "px";
	btn.style.top = Math.min(Math.max(8, y), maxY) + "px";
	btn.style.right = "auto";
}

function storeSessionBtnPosFromPx(x: number, y: number) {
	const vw = Math.max(1, window.innerWidth);
	const vh = Math.max(1, window.innerHeight);
	sessionBtnPos = {
		fx: x / vw,
		fy: y / vh,
	};
}

function placeSessionBtn() {
	if (!btn || !sessionBtnPos) return;
	const x = sessionBtnPos.fx * window.innerWidth;
	const y = sessionBtnPos.fy * window.innerHeight;
	setBtnXY(x, y);
}

function applyLauncherPosition(pos: RmLauncherPosition) {
	if (!btn) return;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const size = btnSize();
	const chat = chatLogRect();

	if (pos === "chatLeft" || pos === "chatTop" || pos === "chatBottom") {
		if (chat && chat.width > 40) {
			const x = chat.left - size - 8;
			let y: number;
			if (pos === "chatTop") y = chat.top + 8;
			else if (pos === "chatBottom") y = chat.bottom - size - 8;
			else y = chat.top + chat.height / 2 - size / 2;
			setBtnXY(x, y);
			return;
		}
		// Fallback: middle-right of viewport
		setBtnXY(vw - size - PAD, vh * 0.42);
		return;
	}

	const leftX = PAD;
	const rightX = vw - size - PAD;
	const topY = PAD;
	const bottomY = vh - size - PAD;
	const midY = vh / 2 - size / 2;

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
	applyBtnSize();
	if (sessionBtnPos) {
		placeSessionBtn();
		return;
	}
	const settings = seidrGetSettings();
	applyLauncherPosition(settings.launcherPosition || "chatTop");
}

/** Scale + reposition launcher (settings anchor or session fractions). */
export function rmRelayoutLauncher() {
	if (!btn) return;
	if (!btn.classList.contains("seidr-rm-visible")) {
		applyBtnSize();
		return;
	}
	placeBtnDefault();
	syncChatLogObserver();
}

function rmOnChatRoomScreen(): boolean {
	try {
		return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
	} catch (e) {
		return false;
	}
}

function rmNoCharacterDialog(): boolean {
	try {
		return typeof CurrentCharacter === "undefined" || CurrentCharacter == null;
	} catch (e) {
		return true;
	}
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

function disconnectChatLogObserver() {
	if (chatLogObserver) {
		chatLogObserver.disconnect();
		chatLogObserver = null;
	}
}

/** Observe chat log size/position when using chat-anchor presets (no session drag). */
function syncChatLogObserver() {
	disconnectChatLogObserver();
	if (!btn || !btn.classList.contains("seidr-rm-visible")) return;
	if (sessionBtnPos) return;
	const pos = seidrGetSettings().launcherPosition || "chatTop";
	if (!isChatAnchorPos(pos)) return;
	const el = chatLogEl();
	if (!el || typeof ResizeObserver === "undefined") return;
	chatLogObserver = new ResizeObserver(function () {
		if (sessionBtnPos) return;
		placeBtnDefault();
	});
	chatLogObserver.observe(el);
}

/** After ChatAdmin → live room: apply settings position; retry Chat* until chat DOM exists. */
export function rmEnterLiveRoomPlacement() {
	clearEnterPlaceTimers();
	rmClearSessionBtnPos();
	rmEnsureShell();
	rmUpdateLauncherVisibility();
	rmRelayoutLauncher();

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
			rmRelayoutLauncher();
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
	const logo = document.createElement("img");
	logo.src = Seidr.LOGO_URL || "https://freya-bc.github.io/Freyas-Seidr/assets/SEIDR-Logo-Transparent.png";
	logo.alt = "";
	logo.draggable = false;
	btn.appendChild(logo);
	applyBtnSize();
	panel = document.createElement("div");
	panel.id = "seidr-rm-panel";
	panel.innerHTML = [
		'<div class="seidr-rm-header">',
		'  <div class="seidr-rm-header-title">Room Manager<span>Dev</span></div>',
		'  <button type="button" class="seidr-rm-icon-btn" data-rm="settings" title="Seidr Settings" aria-label="Seidr Settings">',
		'    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">',
		'      <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.63 8.47a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.75 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54c.05.24.24.41.48.41h4c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>',
		"    </svg>",
		"  </button>",
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
		const x = parseFloat(btn.style.left) || btn.offsetLeft;
		const y = parseFloat(btn.style.top) || btn.offsetTop;
		storeSessionBtnPosFromPx(x, y);
		disconnectChatLogObserver();
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
			persistPanelGeometry(true);
		});
	})();

	// Toggle on pointerup after a non-drag press (click may be swallowed by preventDefault).
	btn.addEventListener("pointerup", function () {
		if (dragMoved) return;
		rmTogglePanel();
	});
	panel.querySelector('[data-rm="settings"]')!.addEventListener("click", function () {
		if (typeof Seidr.openSettings === "function") {
			try { Seidr.openSettings(); } catch (e) { /* ignore */ }
		}
	});
	panel.querySelector('[data-rm="close"]')!.addEventListener("click", function () {
		rmClosePanel();
	});

	if (typeof ResizeObserver !== "undefined") {
		panelObserver = new ResizeObserver(function () {
			clampPanel();
			persistPanelGeometry();
		});
		panelObserver.observe(panel);
	}

	rmBuildPanelBody();
}

/** FBM float chat already has a Room Manager toolbar button — hide Seidr ⌂ while it is open. */
function fbmFloatChatActive(): boolean {
	try {
		const el = document.getElementById("fbm-float-chat");
		return !!(el && !el.hidden);
	} catch (e) {
		return false;
	}
}

export function rmUpdateLauncherVisibility() {
	const s = seidrGetSettings();
	const enabled = s.roomManagerEnabled !== false;
	const quickmenu = s.showQuickmenuButton !== false;
	if (!Seidr.SHOW_ROOM_MANAGER || !enabled || !quickmenu) {
		if (btn) btn.classList.remove("seidr-rm-visible");
		disconnectChatLogObserver();
		return;
	}
	rmEnsureShell();
	// Floating ⌂: plain ChatRoom only (no Preference / ChatAdmin / character dialog).
	// Hide while Freyas Better Maps float chat is visible (duplicate ⌂ / Manager).
	const show =
		rmOnChatRoomScreen() &&
		rmIsAdmin() &&
		rmNoCharacterDialog() &&
		!fbmFloatChatActive();
	if (btn) {
		btn.classList.toggle("seidr-rm-visible", show);
		if (show) rmRelayoutLauncher();
		else disconnectChatLogObserver();
	}
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
	try {
		if (typeof Seidr.rmUpdateApplyUi === "function") Seidr.rmUpdateApplyUi();
	} catch (e) { /* ignore */ }
}

export function rmClosePanel() {
	if (!panel) return;
	persistPanelGeometry(true);
	panel.classList.remove("seidr-rm-open");
	panel.setAttribute("hidden", "true");
}

export function rmTogglePanel() {
	if (panel && panel.classList.contains("seidr-rm-open")) rmClosePanel();
	else rmOpenPanel();
}

export function rmDestroyShell() {
	clearEnterPlaceTimers();
	disconnectChatLogObserver();
	if (panelObserver) {
		panelObserver.disconnect();
		panelObserver = null;
	}
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
Seidr.rmRelayoutLauncher = rmRelayoutLauncher;
