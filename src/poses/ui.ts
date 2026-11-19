/** Dialog pose button + Seidr-styled pose grid (other characters only). */
import { SEIDR_ACTION_POSES, seidrPoseAvailable } from "../actions/model";
import { Seidr } from "../seidr";
import { seidrApplyPoseOnOther } from "./apply";
import { seidrInjectPoseStyles } from "./styles";

declare const Player: any;
declare const CurrentCharacter: any;
declare const DialogMenuMode: string | undefined;
declare const DialogMenuButton: string[] | undefined;
declare const DrawButton: ((
	Left: number,
	Top: number,
	Width: number,
	Height: number,
	Label: string,
	Color: string,
	Image?: string | null,
	HoveringText?: string | null,
	Disabled?: boolean,
) => void) | undefined;
declare const MouseIn: ((Left: number, Top: number, Width: number, Height: number) => boolean) | undefined;
declare const MainCanvas: CanvasRenderingContext2D & { canvas?: HTMLCanvasElement } | undefined;
declare const ElementButton: {
	Create: (
		id: string | null,
		onClick: () => void,
		options?: Record<string, unknown>,
		htmlOptions?: Record<string, unknown>,
	) => HTMLButtonElement;
} | undefined;

const BTN_ID = "seidr-pose-btn";
const DIALOG_MENUBAR_ID = "dialog-dialog-menubar";
const PANEL_ID = "seidr-pose-panel";
const GRID_ID = "seidr-pose-grid";

/** Club pose icons; Hogtied has none in Icons/Poses. */
const CLUB_POSE_ICON: Record<string, string> = {
	BaseUpper: "Icons/Poses/BaseUpper.png",
	Yoked: "Icons/Poses/Yoked.png",
	OverTheHead: "Icons/Poses/OverTheHead.png",
	BackBoxTie: "Icons/Poses/BackBoxTie.png",
	BackElbowTouch: "Icons/Poses/BackElbowTouch.png",
	BackCuffs: "Icons/Poses/BackCuffs.png",
	BaseLower: "Icons/Poses/BaseLower.png",
	LegsClosed: "Icons/Poses/LegsClosed.png",
	Kneel: "Icons/Poses/Kneel.png",
	KneelingSpread: "Icons/Poses/KneelingSpread.png",
	AllFours: "Icons/Poses/AllFours.png",
};

/** Hogtied / Belly tile — light fill for dark Seidr tiles. */
const BELLY_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" aria-hidden="true">' +
	'<path fill="#f0e6d4" d="M1260.5 265.1c-6.6 1.5-21.5 9.5-30.5 16.3-4.7 3.5-14.3 11.4-21.4 17.6-7.1 6.1-21.8 18.3-32.7 27.1-10.8 8.7-20.9 17.3-22.4 19-7.8 9.3-9.9 20.3-5.7 29 1.2 2.4 5.4 8.4 9.3 13.3 18.6 23.5 20 33.4 17.9 125.8-1.4 64.2-.8 90.5 2.9 112.9l1.7 10.7 7.6 8.3c4.2 4.6 7.5 8.5 7.4 8.6-.2.2-5.1-2-11-4.8-26.8-12.6-70.8-28.4-100.1-35.9-8.8-2.3-17.7-4.6-19.8-5.1-3.3-.9-4.1-1.8-7.2-8-11.2-22.1-26.3-40.6-44.5-54.2-43.5-32.7-105.4-37.7-157.5-12.8-18.5 8.9-31.2 17.6-64 43.7-38.3 30.5-54.8 40.8-73 45.4-12.8 3.3-30.4 4.5-44.2 3.1-32.9-3.3-61.3-13.5-113.4-40.7-51.5-26.8-71.9-36.2-97.4-44.8-32.9-11.1-63.3-15.5-79.5-11.6-15.6 3.7-26.8 14.2-31.9 30-1.1 3.6-4.3 17.5-7.1 31-4.9 24-10.8 48.2-20.6 84.6l-4.8 18.1-38.6.6c-57.5.9-99.6 5-125 12.3-23.9 6.9-36.3 24.6-28.6 40.9 2.9 6.1 6.5 9.7 13.1 12.7l5 2.3h221l4.1-2.2c7.1-3.8 11.5-10 18.9-26.5 11.3-25.4 30.8-70.6 35.9-83.1 2.7-6.4 5.2-11.7 5.6-11.7 1.7 0 5 5.3 5 7.9 0 5-15.3 46.5-30.1 81.8-3.5 8.4-4 10.4-3 11.7 1.9 2.3 18.8 10.3 25.6 12.2 3.9 1.1 11.6 1.8 22 2.1 19.6.6 28.2-.9 49-8.7 23.6-8.8 15.1-8.2 129-8.4 106.5-.2 105.6-.2 164.6-5.6 58.4-5.4 69.9-4.5 152.9 11.9 53.2 10.5 69.8 13.2 105 17.5 84.3 10.3 193.9 7.7 235-5.6 27.4-8.8 41.1-27.5 38-52.1-2.3-18.8-6.3-31.7-25.7-83.7-22.8-61-24.7-66.2-33.8-92.6-28-81.3-35.9-120.1-29.6-146.4 5.4-22.8 19.5-48.6 40.5-74.5 11.6-14.2 13.6-17.8 13.6-24.3 0-12.2-11.9-18.7-27.5-15.1"/>' +
	'<path fill="#f0e6d4" d="M288 289.7c-13.3 1.4-33.7 8-49 15.9-42.7 22.2-72.4 61.2-77 101.2-1.8 16.3 1.7 37.8 8.9 53.6 2.7 5.9 3.1 6.3 6.9 6.9 2.2.4 5 1.5 6.3 2.6 2.3 1.8 2.4 2.5 2.3 13.3 0 13.1-1.5 19.2-9.9 41.9-7.1 19.1-7.8 22.4-7.3 31.9.7 12 5.1 20.2 17.3 32.2 10.6 10.3 12.5 13.5 12.5 20.2 0 6.9-2.4 11.4-9.2 17.9-5.6 5.2-6 5.9-4.6 7.3.8.8 4.6 2 8.4 2.6 13.5 2.1 29.7-3.3 43.8-14.7 3.8-3 7.2-5.5 7.6-5.5 2 0 8.8 7.4 9.9 10.8 2.7 8.1-.2 19.6-6.6 26.4-1.6 1.7-2.3 3.3-1.9 4.4.5 1.4 1.9 1.6 10.4 1.2 17.6-.8 35.7-9.3 52.1-24.4l7.7-7.2 3.2-14.8c1.7-8.2 4.6-22.6 6.3-31.9 6.2-34.2 9.8-43.6 21-54.8 11.8-11.8 26.2-17.1 46.4-17 23.5.1 49.1 6.6 89.9 22.8l11.9 4.7 6.5-3.4c8.4-4.2 17.4-12.9 20.7-19.9 4.4-9.6 3.5-10.8-6.5-8.3-10.3 2.5-20.8 1.6-29.3-2.4-3.7-1.7-6.7-3.5-6.7-3.9s3.1-2.1 6.8-3.8c8.9-4 20.1-14.9 22.5-22 2.2-6.4 2.1-10.7-.3-13.8-1.9-2.4-2.5-2.5-14.2-2.9-10.4-.3-13.3-.8-18.6-3-23.8-9.9-37.1-26.4-57.2-71.3-14.9-33.2-22.9-47.3-34.2-59.9-15.2-17.1-36.9-28.5-60.8-32.1-8.6-1.4-27-1.7-36-.8m1092.5 10.7c-13.6 3.1-23.3 8.3-46.3 24.4-16.4 11.5-25.9 17.4-40.7 25.2-34.1 18-40.9 29.5-31.3 52.4 6.2 14.7 7.8 21.1 7.8 31 0 10.4-2.6 26.7-7 43.2l-3 11.2 6.4 17.8c12.6 35 35.6 94.7 36.3 94 .6-.6 4.6-27.3 8.8-58.1 5.6-41.1 11.4-78.8 14.4-94 7.2-35.5 20.6-57.3 58.1-94.6 20.8-20.7 26-26.9 27.4-33.2.8-3.5-.8-9.7-3.4-13-4.7-5.9-16.8-8.7-27.5-6.3"/>' +
	"</svg>";

/** Silhouette used by the canvas Positions DrawButton. */
const POSE_BTN_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 89 102">' +
	'<path fill="black" d="M23 13Q18 17 16 25L13 55Q11 66 17 70Q20 73 25 71L26 74Q25 81 21 89L69 89Q65 81 63 74L64 71Q70 73 74 68Q79 63 77 55L74 25Q71 15 64 12Q57 8 51 9L50 6L38 6L37 9Q29 9 23 13Z"/>' +
	'<path d="M25.7 25.6C21 32 18.4 39 18.4 43C18.4 49 22 53 26.2 55C32 59 38.6 59 43.4 54.7Q45.3 52.5 45.9 50.2" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
	'<path d="M25.7 25.6C21 32 18.4 39 18.4 43C18.4 49 22 53 26.2 55C32 59 38.6 59 43.4 54.7Q45.3 52.5 45.9 50.2" transform="translate(89 0) scale(-1 1)" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
	'<path d="M25.4 57.5C25.9 63.4 27.1 67.3 26.9 70.5C26.6 76.4 22.6 83.8 19.4 89.6" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
	'<path d="M25.4 57.5C25.9 63.4 27.1 67.3 26.9 70.5C26.6 76.4 22.6 83.8 19.4 89.6" transform="translate(89 0) scale(-1 1)" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
	"</svg>";

const POSE_BTN_ICON_URL = "data:image/svg+xml," + encodeURIComponent(POSE_BTN_SVG);

let panel: HTMLElement | null = null;
let escBound = false;
/** Preloaded silhouette — Club ImageCache mishandles data: URLs in DrawButton. */
let poseBtnImg: HTMLImageElement | null = null;
/** Last Club-space button rect — used to anchor the HTML panel from canvas mode. */
let lastBtnRect: { x: number; y: number; w: number; h: number } | null = null;
let lastTargetMember: number | null = null;

function ensurePoseBtnImg(): HTMLImageElement {
	if (!poseBtnImg) {
		poseBtnImg = new Image();
		poseBtnImg.src = POSE_BTN_ICON_URL;
	}
	return poseBtnImg;
}

function isDialogIntroMode(): boolean {
	return (typeof DialogMenuMode !== "undefined" ? DialogMenuMode : "") === "dialog";
}

/** Other online players only — hide for self and Club NPCs (IsNpc). */
function isOtherDialogTarget(C: any): boolean {
	if (!C || typeof Player === "undefined" || !Player) return false;
	try {
		if (C.IsPlayer && C.IsPlayer()) return false;
	} catch (e) { /* ignore */ }
	if (C === Player) return false;
	try {
		if (typeof C.IsNpc === "function" && C.IsNpc()) return false;
	} catch (e2) { /* ignore */ }
	if (typeof C.MemberNumber !== "number") return false;
	if (C.MemberNumber === Player.MemberNumber) return false;
	return true;
}

/**
 * Club keeps CurrentScreen as ChatRoom while CurrentCharacter is set;
 * Drawing.js calls DialogDraw() instead of the room Run/Draw. Do not require
 * CurrentScreen === "Dialog".
 *
 * Modes: initial character view (`dialog`, Exit only) + items/activities grids.
 */
function dialogPoseContextOk(): boolean {
	const mode = typeof DialogMenuMode !== "undefined" ? DialogMenuMode : "";
	const C = typeof CurrentCharacter !== "undefined" ? CurrentCharacter : null;
	if (!isOtherDialogTarget(C)) return false;
	if (mode === "dialog") return true;
	if (mode !== "items" && mode !== "activities") return false;
	if (!C.FocusGroup) return false;
	return true;
}

function poseButtonRect(): { x: number; y: number; w: number; h: number } | null {
	if (!dialogPoseContextOk()) return null;
	const len = Array.isArray(DialogMenuButton) ? DialogMenuButton.length : 1;
	return { x: 1885 - len * 110, y: 15, w: 90, h: 90 };
}

/** Club 2000×1000 space → viewport pixels for panel anchoring. */
function clubRectToClient(r: { x: number; y: number; w: number; h: number }): {
	left: number;
	top: number;
	right: number;
	bottom: number;
} | null {
	try {
		const canvas = MainCanvas && MainCanvas.canvas;
		if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return null;
		const sx = canvas.clientWidth / 2000;
		const sy = canvas.clientHeight / 1000;
		const left = canvas.offsetLeft + r.x * sx;
		const top = canvas.offsetTop + r.y * sy;
		return {
			left,
			top,
			right: left + r.w * sx,
			bottom: top + r.h * sy,
		};
	} catch (e) {
		return null;
	}
}

function poseIconHtml(poseId: string): string {
	const src = CLUB_POSE_ICON[poseId];
	if (src) return '<img src="' + src + '" alt="" />';
	return BELLY_SVG;
}

function ensureDom(): void {
	seidrInjectPoseStyles();
	if (!panel || !document.body.contains(panel)) {
		panel = document.createElement("div");
		panel.id = PANEL_ID;
		panel.setAttribute("hidden", "");
		panel.innerHTML = [
			'<div class="seidr-pose-header">',
			'  <div class="seidr-pose-header-title">Pose</div>',
			'  <button type="button" class="seidr-pose-icon-btn" data-seidr-pose="settings" title="Seidr Settings" aria-label="Seidr Settings">',
			'    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">',
			'      <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.63 8.47a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.75 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54c.05.24.24.41.48.41h4c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>',
			"    </svg>",
			"  </button>",
			'  <button type="button" class="seidr-pose-icon-btn" data-seidr-pose="close" title="Close">×</button>',
			"</div>",
			'<div class="seidr-pose-body"><div class="seidr-pose-grid" id="' + GRID_ID + '"></div></div>',
		].join("");
		["pointerdown", "mousedown", "mouseup", "wheel", "touchstart"].forEach(function (type) {
			panel!.addEventListener(type, function (ev) {
				ev.stopPropagation();
			});
		});
		panel.addEventListener("click", function (ev) {
			ev.stopPropagation();
			const t = ev.target as HTMLElement;
			if (t && t.closest && t.closest('[data-seidr-pose="settings"]')) {
				if (typeof Seidr.openSettings === "function") {
					try { Seidr.openSettings(); } catch (e) { /* ignore */ }
				}
				return;
			}
			if (t && t.closest && t.closest('[data-seidr-pose="close"]')) {
				closePanel();
				return;
			}
			const tile = t && t.closest ? (t.closest("[data-pose-id]") as HTMLElement | null) : null;
			if (!tile || (tile as HTMLButtonElement).disabled) return;
			const poseId = tile.getAttribute("data-pose-id");
			if (!poseId) return;
			const C = typeof CurrentCharacter !== "undefined" ? CurrentCharacter : null;
			if (!isOtherDialogTarget(C)) return;
			if (seidrApplyPoseOnOther(C, poseId)) closePanel();
		});
		document.body.appendChild(panel);
	}
	if (!escBound) {
		escBound = true;
		document.addEventListener("keydown", onEsc, true);
	}
}

function onEsc(ev: KeyboardEvent): void {
	if (ev.key !== "Escape") return;
	if (!panel || !panel.classList.contains("seidr-pose-open")) return;
	closePanel();
	ev.preventDefault();
	ev.stopPropagation();
}

function rebuildGrid(): void {
	ensureDom();
	const grid = document.getElementById(GRID_ID);
	if (!grid) return;
	const C = typeof CurrentCharacter !== "undefined" ? CurrentCharacter : null;
	if (!isOtherDialogTarget(C)) {
		grid.innerHTML = '<div class="seidr-pose-empty">No target</div>';
		lastTargetMember = null;
		return;
	}
	lastTargetMember = typeof C.MemberNumber === "number" ? C.MemberNumber : null;
	const parts: string[] = [];
	for (let i = 0; i < SEIDR_ACTION_POSES.length; i++) {
		const p = SEIDR_ACTION_POSES[i];
		const ok = seidrPoseAvailable(C, p.id, { aided: true });
		parts.push(
			'<button type="button" class="seidr-pose-tile" data-pose-id="' + p.id + '"' +
			(ok ? "" : " disabled") +
			' title="' + p.label + '">' +
			poseIconHtml(p.id) +
			'<span class="seidr-pose-tile-label">' + p.label + "</span>" +
			"</button>"
		);
	}
	grid.innerHTML = parts.length
		? parts.join("")
		: '<div class="seidr-pose-empty">No poses available</div>';
}

function buttonClientRect(): { left: number; top: number; right: number; bottom: number } | null {
	const htmlBtn = document.getElementById(BTN_ID);
	if (htmlBtn) {
		const b = htmlBtn.getBoundingClientRect();
		if (b.width > 0 && b.height > 0) {
			return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
		}
	}
	if (lastBtnRect) return clubRectToClient(lastBtnRect);
	return null;
}

function placePanelNearButton(): void {
	if (!panel) return;
	const r = buttonClientRect();
	if (!r) return;
	const pad = 8;
	const pw = Math.min(window.innerWidth - pad * 2, 420);
	// Measure after layout; fall back to a typical open height.
	const ph = Math.min(
		Math.max(panel.offsetHeight || 0, 280),
		window.innerHeight - pad * 2,
		520
	);
	let left: number;
	let top = r.bottom + 8;
	// Prefer panel top-left aligned to button left when it fits on-screen.
	if (r.left + pw <= window.innerWidth - pad) {
		left = Math.max(pad, r.left);
	} else {
		left = Math.max(pad, Math.min(r.right - pw, window.innerWidth - pw - pad));
	}
	if (top + ph > window.innerHeight - pad) {
		top = Math.max(pad, r.top - ph - 8);
	}
	panel.style.left = left + "px";
	panel.style.top = top + "px";
	panel.style.right = "auto";
	panel.style.transform = "none";
}

function removeHtmlMenubarBtn(): void {
	const el = document.getElementById(BTN_ID);
	if (el && el.parentNode) el.parentNode.removeChild(el);
}

/**
 * First dialog screen uses an HTML menubar (`#dialog-dialog-menubar`) that
 * covers the canvas — canvas DrawButton is not clickable there. Mount a Club
 * ElementButton with the same Positions tooltip instead.
 */
function ensureHtmlMenubarBtn(): void {
	if (!dialogPoseContextOk() || !isDialogIntroMode()) {
		removeHtmlMenubarBtn();
		return;
	}
	const menubar = document.getElementById(DIALOG_MENUBAR_ID);
	if (!menubar) return;
	if (document.getElementById(BTN_ID)) return;
	if (typeof ElementButton === "undefined" || !ElementButton || typeof ElementButton.Create !== "function") {
		return;
	}
	ensurePoseBtnImg();
	try {
		const button = ElementButton.Create(
			BTN_ID,
			function () {
				togglePanel();
			},
			{
				image: POSE_BTN_ICON_URL,
				tooltip: "Positions",
				tooltipPosition: "left",
			},
			{ button: { classList: ["dialog-menubar-button"] } },
		);
		// RTL menubar → append places visually left of Exit.
		menubar.appendChild(button);
	} catch (e) { /* ignore */ }
}

function isPanelOpen(): boolean {
	return !!(panel && panel.classList.contains("seidr-pose-open"));
}

function openPanel(): void {
	ensureDom();
	rebuildGrid();
	panel!.hidden = false;
	panel!.removeAttribute("hidden");
	panel!.classList.add("seidr-pose-open");
	placePanelNearButton();
	// Re-measure after flex layout so left-align / flip-above uses real height.
	requestAnimationFrame(function () {
		if (isPanelOpen()) placePanelNearButton();
	});
}

function closePanel(): void {
	if (!panel) return;
	panel.classList.remove("seidr-pose-open");
	panel.setAttribute("hidden", "");
}

function togglePanel(): void {
	if (isPanelOpen()) closePanel();
	else openPanel();
}

function hidePanel(): void {
	lastBtnRect = null;
	removeHtmlMenubarBtn();
	closePanel();
}

function drawPoseIconIntoButton(r: { x: number; y: number; w: number; h: number }): void {
	if (!MainCanvas) return;
	const img = ensurePoseBtnImg();
	if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
	const pad = 2;
	const bw = r.w - 2 * pad;
	const bh = r.h - 2 * pad;
	const scale = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
	const dw = img.naturalWidth * scale;
	const dh = img.naturalHeight * scale;
	const dx = r.x + pad + (bw - dw) / 2;
	const dy = r.y + pad + (bh - dh) / 2;
	MainCanvas.drawImage(img, dx, dy, dw, dh);
}

/**
 * Items/activities: Club canvas menubar — DrawButton so yellow tooltips sit above us.
 * Dialog intro: HTML menubar covers this area; skip canvas draw (see ensureHtmlMenubarBtn).
 */
export function seidrPoseDrawButton(): void {
	try {
		if (isDialogIntroMode()) {
			lastBtnRect = null;
			return;
		}
		const r = poseButtonRect();
		if (!r || typeof DrawButton !== "function") {
			lastBtnRect = null;
			return;
		}
		lastBtnRect = r;
		// No image URL — Club ImageCache breaks on data: SVG; paint silhouette ourselves.
		DrawButton(r.x, r.y, r.w, r.h, "", "White", null, "Positions");
		drawPoseIconIntoButton(r);
	} catch (e) {
		lastBtnRect = null;
	}
}

/** Consume canvas menubar click when the Positions slot is hit (items/activities). */
export function seidrPoseTryClick(): boolean {
	try {
		if (isDialogIntroMode()) return false;
		const r = poseButtonRect();
		if (!r || typeof MouseIn !== "function" || !MouseIn(r.x, r.y, r.w, r.h)) return false;
		lastBtnRect = r;
		togglePanel();
		return true;
	} catch (e) {
		return false;
	}
}

/** Called from DialogDraw / focus hooks — panel + dialog-mode HTML launcher. */
export function seidrPoseDialogTick(): void {
	try {
		if (!dialogPoseContextOk()) {
			hidePanel();
			return;
		}
		ensureHtmlMenubarBtn();
		// If panel is open on a different target, refresh once.
		if (isPanelOpen()) {
			const C = CurrentCharacter;
			const mem = C && typeof C.MemberNumber === "number" ? C.MemberNumber : null;
			if (mem !== lastTargetMember) rebuildGrid();
		}
	} catch (e) {
		hidePanel();
	}
}

/** After Club rebuilds the dialog intro menubar (replaceChildren). */
export function seidrPoseAfterDialogMenubar(): void {
	try {
		removeHtmlMenubarBtn();
		ensureHtmlMenubarBtn();
	} catch (e) { /* ignore */ }
}

export function seidrPoseDialogLeave(): void {
	hidePanel();
}

export function seidrPoseDestroyUi(): void {
	closePanel();
	removeHtmlMenubarBtn();
	if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
	panel = null;
	lastBtnRect = null;
	lastTargetMember = null;
	const style = document.getElementById("seidr-pose-styles");
	if (style && style.parentNode) style.parentNode.removeChild(style);
}
