/** Floating Fast Wiggle button — Room Manager placement rules + anti-overlap */
import { Seidr } from "../seidr";
import "../core/sdk";
import { seidrGetSettings } from "../settings/storage";
import type { RmLauncherPosition } from "../settings/model";
import type { SeidrAnimation, SeidrWiggleSlot } from "./model";
import { seidrPlayAnimation } from "./play";
import { seidrReadyWiggleBySlot } from "./wiggleSlots";

declare const MainCanvas: { canvas?: HTMLCanvasElement } | undefined;
declare const CurrentScreen: string | undefined;
declare const CurrentCharacter: unknown;

let root: HTMLElement | null = null;
let btn: HTMLButtonElement | null = null;
let menu: HTMLElement | null = null;
let sessionBtnPos: { fx: number; fy: number } | null = null;
let chatAnchorY: number | null = null;
let dragMoved = false;
let chatLogObserver: ResizeObserver | null = null;
let installed = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const BTN_BASE = 44;
const PAD = 16;
const GAP = 8;

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

function chatLogEl(): HTMLElement | null {
	return document.getElementById("TextAreaChatLog");
}

function chatLogRect(): DOMRect | null {
	const el = chatLogEl();
	if (!el) return null;
	return el.getBoundingClientRect();
}

function onChatRoomScreen(): boolean {
	try {
		return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
	} catch (e) {
		return false;
	}
}

function noCharacterDialog(): boolean {
	try {
		return typeof CurrentCharacter === "undefined" || CurrentCharacter == null;
	} catch (e) {
		return true;
	}
}

const MENU_PAD = 6;
const MENU_GAP = 6;

function fwStylesCss(): string {
	// Match Room Manager chrome (Seidr floating launcher).
	return [
		"#seidr-fw-root { position: fixed; inset: 0; z-index: 114; pointer-events: none; }",
		"#seidr-fw-root * { box-sizing: border-box; }",
		"#seidr-fw-btn {",
		"  pointer-events: auto; position: fixed; z-index: 115;",
		"  display: none; place-items: center; padding: 0;",
		"  border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);",
		"  background: rgba(36, 28, 48, 0.92); color: #f0e6d4; cursor: grab;",
		"  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);",
		"  box-shadow: 0 4px 18px rgba(0,0,0,0.4);",
		"  font: 600 0.72em/1 system-ui, -apple-system, Segoe UI, sans-serif;",
		"  letter-spacing: 0.04em; text-transform: uppercase;",
		"}",
		"#seidr-fw-btn.seidr-fw-visible { display: grid; }",
		"#seidr-fw-btn:hover { border-color: #d4a017; }",
		"#seidr-fw-btn .seidr-fw-icon {",
		"  user-select: none; pointer-events: none;",
		"  display: grid; place-items: center; line-height: 1;",
		"  width: 100%; height: 100%;",
		"}",
		"#seidr-fw-btn .seidr-fw-icon svg {",
		"  display: block; width: 100%; height: 100%;",
		"}",
		"#seidr-fw-menu {",
		"  pointer-events: auto; position: fixed; z-index: 116;",
		"  display: none; flex-direction: column; gap: " + MENU_GAP + "px;",
		"  padding: " + MENU_PAD + "px; border-radius: 10px;",
		"  border: 1px solid rgba(255,255,255,0.14);",
		"  background: rgba(36, 28, 48, 0.95); color: #f0e6d4;",
		"  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);",
		"  box-shadow: 0 4px 18px rgba(0,0,0,0.4);",
		"}",
		"#seidr-fw-menu.seidr-fw-open { display: flex; }",
		"#seidr-fw-menu button {",
		"  flex: 0 0 auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14);",
		"  background: rgba(42, 34, 56, 0.9); color: #f0e6d4; cursor: pointer;",
		"  font: 600 0.72em/1 system-ui, -apple-system, Segoe UI, sans-serif;",
		"  letter-spacing: 0.04em; text-transform: uppercase;",
		"  display: grid; place-items: center; padding: 0;",
		"}",
		"#seidr-fw-menu button:hover { border-color: #d4a017; color: #d4a017; }",
		"#seidr-fw-menu button svg { display: block; width: 100%; height: 100%; }",
	].join("\n");
}

function injectStyles() {
	let style = document.getElementById("seidr-fw-styles") as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = "seidr-fw-styles";
		document.head.appendChild(style);
	}
	style.textContent = fwStylesCss();
}

/** Seidr chrome gold (Room Manager / Fast Wiggle accent). */
const SEIDR_ICON_GOLD = "#d4a017";

function slotIconLabel(slot: SeidrWiggleSlot): string {
	if (slot === "ear") return "EAR";
	if (slot === "wing") return "WNG";
	return "TAL";
}

/** Ear slot icon — silhouette filled with Seidr gold. */
function earIconHtml(): string {
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="250 20 1040 1000" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
		'<g fill="' + SEIDR_ICON_GOLD + '">' +
		'<path d="M410.5 25.6c-71.3 11-131.1 67.8-143.6 136.4-2 10.9-2.1 685.2-.1 697.8 10.2 64.6 60.6 121 123.6 138.2 19.7 5.4-4.9 5.1 377.6 5 234.3 0 355.7-.4 360-1.1 33-5.2 65.3-22.6 90.5-49 13.4-14 21.1-25 29.5-41.8 10.9-21.8 15.7-41 17-68.1 1.4-25.6 1.3-650.4 0-666.6-1.3-15.5-3-24.4-7.6-38.5-17.5-54.4-65.9-97.7-124.2-111.1l-9.7-2.3-352-.1c-296.3-.2-353.4 0-361 1.2M1136 63.3c34.7 10.1 65.4 35.7 81.8 68.2 2.8 5.5 6.5 14.3 8.2 19.5 6.4 19.4 6.1-1.9 5.7 369-.3 371.4.2 340.1-6.2 359.5-6.5 19.5-16.6 35.6-32.5 51.6-21.7 22-48 35.6-75 38.9-7 .8-100.6 1-357.5.8l-348-.3-10.3-2.8c-40.6-11.2-71.7-37.1-90.4-75.4-3.7-7.6-7.1-16.7-9.1-24l-3.2-11.8v-688l2.8-10c4.1-15.1 13.8-33.8 24-46.5 20.8-26 47.9-43.1 78.2-49.5l11-2.4 355.5.2 355.5.2z"/>' +
		'<path d="M426.5 258c-13.3 2.9-20.3 10.1-28.7 29.3-15 34.4-23.4 71.8-26.8 119.2-1.8 25.6-.9 49.7 3.1 80.5 5.4 41.8 18.1 84 35 115.9l5 9.4-2.7 6.6c-21.5 53.2-29.8 118.8-17 135.5 5.2 6.9 15.7 8.5 22.6 3.6 5.9-4.2 7.7-9 11.5-31.6 4.3-25.6 7.2-37.6 13.7-56.4 29.1-84.2 93.8-155.7 174-192.1 63.2-28.8 136.3-38.1 209.3-26.8 61.8 9.6 127.2 41.4 171.5 83.4 25.8 24.5 43.2 47.9 59.2 79.8 18.1 36.1 27.3 65.1 34.8 109.8 4 24 5.6 28.7 11 33.2 8 6.8 20.6 3.7 25.7-6.3 3.2-6.4 4.7-20.4 3.9-37.5-1.2-27.8-6.9-55.8-17.4-86.2l-3.8-11.2 2.3-3.8c4.4-7 15.3-29.2 19.2-39.1 18.6-46.8 26.8-93.2 26.5-148.7-.3-44.2-6.7-84-19.2-120-9.8-28.3-17.5-40.2-29-44.6-10.2-3.9-32.8-2.4-56.7 3.7-61.4 15.7-130.8 57.4-189.1 113.7l-12.3 11.8-11.8-2.6c-49.7-11.2-96.2-11.1-149.6.1l-11.9 2.5-10.1-9.8C595.9 308.7 505.1 260.1 441 257.5c-5.8-.2-12.3 0-14.5.5m25 43.5c48.6 7.8 107 38.3 157 81.8 9.6 8.4 24.5 22.7 24.5 23.6 0 .3-3.3 1.9-7.3 3.5-3.9 1.6-12.8 5.6-19.6 8.8s-12.9 5.8-13.6 5.8-1.9-.8-2.6-1.7c-6.5-7.8-37.3-32.2-54.5-43-27.3-17.2-60-31.1-71.2-30.1-3.5.3-3.6.5-6.4 8.1-6.6 18.3-10 43.9-10 74.7 0 34 4.4 63.1 13.9 92.5l2.6 8-6.6 9.3c-3.6 5.1-9.1 13.3-12.2 18.2-3.1 5-6 9-6.5 9-1.1 0-7.3-14.8-10.8-26-9.9-31.3-14.1-55.9-16.3-93.8-2.6-46.5 5-101.3 19.1-136.7 4.4-11 5.7-12.7 10.3-13.4.4 0 5 .6 10.2 1.4m643 1.9c5.8 8.8 13.9 36.9 18 62 4.1 25.3 4.8 35 4.8 63.6 0 22.2-.5 30.8-2.2 44.5-4.9 39.1-15 76.1-25.7 94.3l-2.6 4.4-3.1-4.8c-1.7-2.7-7-10.8-11.8-18.1l-8.7-13.2 1.9-5.2c15.7-41.3 21.1-104.1 12.8-150-2.5-13.9-7.5-29.8-9.6-30.6-.9-.4-4.4-.1-7.7.6-31.1 6.3-80.4 34.9-111.7 64.9l-10.3 9.9-15.1-7.3c-8.2-3.9-17.4-8-20.2-9-2.9-1-5.3-2.2-5.3-2.6 0-1 21.6-21.9 29.7-28.7 44.9-37.4 97.3-65.1 140.8-74.5 9.8-2.1 11.2-2.3 18.2-2.5 5.5-.1 6.4.2 7.8 2.3"/>' +
		"</g></svg>"
	);
}

/** Wing slot icon — silhouette filled with Seidr gold. */
function wingIconHtml(): string {
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="220 25 1010 1030" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
		'<g fill="' + SEIDR_ICON_GOLD + '">' +
		'<path d="M329.6 33.1c-11.1 1.2-17.4 2.6-30.1 6.6-51 16.3-90.2 61.9-99.6 115.7-1.8 10.5-1.9 21.5-1.9 387 0 369.3 0 376.3 2 388.1 2.5 15.2 8.6 33.4 15.2 45.3 22.5 40.4 59.7 67.5 104.3 75.8 9.7 1.8 23.4 1.9 404.5 1.9 374 0 395-.1 404-1.8 30.9-5.8 55-18.6 77.6-41.1 22-22.1 32.8-41.4 41.1-73.6 1.6-6 1.7-34.3 2.1-386.5.2-271.9 0-383.1-.8-390.9-1.9-19.3-11-43-23.6-61.8-21.6-32-56.9-55.5-95.4-63.5-8-1.6-31.5-1.7-400-1.9-215.3-.1-395.1.2-399.4.7m784.9 38.3c28.7 3.6 56.9 20.1 74.6 43.5 6.1 8.2 13.9 23.3 17 32.8 1.5 4.9 2.6 6.9 3.2 6 .5-.7.6-.4.2 1-.3 1.2.1 5.9 1 10.5 1.4 7.4 1.5 47.2 1.3 381.8l-.3 373.5-2.3 8.5c-2.8 10.6-5.3 17.2-9.3 25.3-14.7 29-41.1 50.2-73.4 59l-8 2.2-389 .3c-268.5.2-391.5-.1-397.1-.8-24-3.1-45.8-14.1-64-32.4-13.3-13.3-21.5-26.5-27.4-44-1.5-4.4-2.9-7.3-3.2-6.6-.2.7-.4-.4-.4-2.6 0-2.1-.6-8.2-1.3-13.4-.9-7.4-1.1-90.5-.9-379l.3-369.5 2.9-10.5c11.6-42.5 39.9-71.5 81.4-83.3l7.7-2.2 353-.5c417.6-.6 426.3-.6 434 .4"/>' +
		'<path d="M290.4 313.6c-2.1 1.5-4.5 3.4-5.2 4.3-10.2 12.5-15 56.9-9.7 90.1 4.5 27.5 16.3 56 32.7 78.2 3.3 4.6 7.2 9.5 8.6 11 3.4 3.7 2.3 4.4-3.4 2.4-20-6.8-30.8 7.7-27.6 37.2.6 5.9 2.3 14.7 3.7 19.7 3.2 10.9 12.4 30.1 19.6 40.9 12.6 18.8 33 37.5 51.8 47.7 5.5 3 10.1 5.7 10.1 6.2 0 .4-1.2 1.2-2.7 1.8-7.8 2.9-13.1 13.2-11.8 22.8 1.7 12.5 12.2 29.9 27.5 45.2 22.6 22.9 49.2 34.7 84.5 37.7l9 .7.6 5.2c.7 5.7 6.9 18 8.9 17.5.6-.1.9.1.6.6-.7 1.2 8 9.6 9.2 8.8.6-.3 1.4-.1 1.8.5.5.8.2 1-.7.5-2.8-1.5 2.7 2.6 6.9 5.1 21.4 12.7 52.4 16.3 79.2 9.2 10.3-2.7 24.1-8 23.4-9-.3-.5.1-.6.8-.4.8.3 6.5-2 12.8-5.1 18.8-9.2 23.3-10.7 33-10.7 10.3-.1 16.9 2.1 27 8.8 14.9 9.9 20.7 6.4 26.4-16.1 7.2-28.4 10.6-71.7 7.6-96.5-.6-4.6-1.5-12.5-2.1-17.4-4.4-36.5-19.8-78.4-40.4-109.5-28.3-42.7-68.3-71.6-124.5-89.8-6.9-2.2-20.6-6.6-30.5-9.7-57.8-18.3-101.8-41.3-146.4-76.8-12.6-10.1-40.7-37.3-53.6-52.1-8.5-9.7-11.4-11.6-18.1-11.6-3.9 0-6.1.6-9 2.6m33.6 68.3c44.7 44.9 107.5 81.9 176.8 104.2 60.4 19.5 76.7 26.6 100.6 43.7 9.7 7 28.1 24.4 35.2 33.3 12.7 16 23.8 36.5 32.4 60.1 2.6 7.2 5 12.4 5.4 11.7.3-.8.3-.4 0 .8-.2 1.2.4 5.7 1.5 10 2.6 10.1 5.7 26.3 7.3 38.3 1.4 10.3 1.8 65.1.5 68.3-.7 1.8-.8 1.8-3.4-.1-9.6-6.8-22.8-9.9-34.5-8.3-10.5 1.5-16.6 3.6-31.8 11.4-23.8 12.1-34.6 15.9-50.6 17.8-13.9 1.6-30-2-42.1-9.3-5.8-3.5-6.4-4.7-3-5.6 3.8-.9 21.8-10.4 29.7-15.6 9.3-6.2 27.6-23.9 26.5-25.6-.5-.8-.4-1.1.1-.7.6.3 2.3-1.5 3.9-4 3.4-5.5 4.2-12.9 1.3-12.7-1 .1-1.5-.2-1.2-.7 1.5-2.5-6.5-.1-29 9-40.8 16.4-77.4 18.9-108.1 7.4-9.7-3.6-21.9-11.1-29.7-18.3-7.3-6.6-13.4-13.8-12.5-14.6.3-.3 5.6-1 11.9-1.5 46.9-3.8 81.9-14.9 99.5-31.4 5.7-5.5 7-9.5 3.5-11.4-1.2-.6-11.2-.8-26.8-.4-44.8 1.1-70.1-3.9-99.4-19.4-24.9-13.2-45.5-33.6-57-56.4-4.1-8-8.4-19.8-7.6-20.6.2-.3 6.4 1.8 13.8 4.5 39.9 15.1 72.2 19.7 105.8 15.1 13.4-1.8 21-4.9 21-8.5 0-1.9-4.5-5-9.8-7-17.3-6.2-30.1-11.4-39.6-16-6-2.9-11.3-5.1-11.9-4.7-.5.3-.7.2-.4-.3.3-.6-2.8-2.9-6.8-5.3-24.5-14.5-49.2-39-63.9-63.5-9.2-15.4-16.7-34.5-20.1-51.8-1.7-8.2-3.2-35.8-2-35.8.4 0 6.9 6.2 14.5 13.9m-37.3 147.8c-.2 1.6-.4.3-.4-2.7s.2-4.3.4-2.8c.2 1.6.2 4 0 5.5m853.1-216.4c-2.1 1.2-9.3 8.5-16.1 16.2C1073.9 385.9 1008.5 427 929 452c-40.9 12.8-45.8 14.5-63.5 22.8-13.2 6.1-27.3 14.5-39.1 23.2-12.1 9-18.6 14.9-17.7 16.3.3.5.1.7-.4.4-.6-.4-4.6 3.1-8.9 7.6-31.4 33.2-53 78.9-61.5 130.1-6 36.3-5.4 75.8 1.7 111.1 6.4 32.2 12.3 38.1 27.6 27.5 9.4-6.7 16.9-9.3 26.3-9.4 9.9-.1 14 1.3 35 11.5 29.6 14.5 49.7 19.2 72.5 17 23.6-2.2 41.7-10 55.3-23.7 6.5-6.5 11.3-15.4 12.3-22.7l.6-4.7h5.2c6.9 0 26.5-3.3 35.4-5.9 8.8-2.7 23.6-9.5 31.3-14.4 19.9-12.8 37.6-33.3 45.6-52.8 5.4-13.2 2.6-26.9-6.4-31.4-2.3-1.1-4.2-2.5-4.2-3 0-.6 3.7-3 8.2-5.5 43.8-24 76.7-74.7 76.7-118.4 0-23.5-10.1-33.9-27.4-28-2.6.9-4.9 1.4-5.2 1.2-.2-.3 1.9-3.4 4.8-6.9 28.2-35 42.4-78.7 40.5-124.9-1-23.2-5.2-41.8-11.2-50.1-5.8-7.7-15.3-10.1-22.7-5.6m-1.2 59.3c.9 6-1.9 27.6-5.1 40.4-6.8 26.9-21.2 52.1-42 73.8-23.5 24.5-47.3 39.6-85.1 53.7-23.2 8.7-26.2 10.8-21.6 14.7 4.9 4.3 22.1 7.2 42.7 7.1 28.6 0 54.8-5.4 84.3-17.2 5.6-2.3 10.6-4.1 11.1-4.1 1.5 0-2.3 10.9-7.1 20.5-11.7 23.2-32.2 43.7-56.9 56.9-10.1 5.4-26.7 11.8-36.5 14.1-20.1 4.7-21.8 4.9-56.1 4.9-24.1.1-33.5.4-34.4 1.3-3.5 3.5 4.5 12.7 17.6 20.3 19.8 11.3 45.4 18.3 76.1 21 18.4 1.6 21.4 2 21.4 2.9 0 1.5-10.7 13.1-16 17.4-11.1 8.9-27 16.7-40.4 19.7-26.2 5.8-60.7 1.2-93.6-12.5-22.6-9.5-25.6-10.4-29.4-8.9-2.5 1-1.9 6.4 1.4 13.1 4 8 16.6 21.3 27.6 29.1 8.3 5.9 27.2 16.1 32.2 17.4 3.4.9 2.7 2.1-3.3 5.7-17.3 10.5-38.9 12.3-60.8 5-4.9-1.6-16.5-6.7-25.8-11.4-22.6-11.4-29.8-13.8-41.4-13.8-10.5 0-17.7 1.8-25.8 6.7l-5.6 3.4-.8-4.7c-1.5-9-.7-54.7 1.1-68.1 8.5-61.4 31.3-109 67.4-140.6 24.1-21.1 51.3-34.9 95.2-48.5 56.4-17.4 94.1-34.8 135.5-62.4 24.8-16.6 51.2-38.5 66.5-55.2 3-3.4 5.8-6.1 6.2-6.2.4 0 1 2 1.4 4.5"/>' +
		"</g></svg>"
	);
}

/** Tail slot icon — silhouette filled with Seidr gold. */
function tailIconHtml(): string {
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="250 20 1050 980" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
		'<g fill="' + SEIDR_ICON_GOLD + '">' +
		'<path d="M410.7 25.6C336.5 37.1 274.5 98.2 266 168.2c-.8 6.8-1 102-.8 349.8l.3 340.5 2.2 9c10.8 45.6 36.7 83.7 73.4 108 22.1 14.6 44.9 23.3 70.4 27 9.9 1.4 47 1.5 362 1.3l351-.3 10-2.3c39.4-9.1 75.2-33.3 100-67.7 7.6-10.5 19.3-33.5 22.8-45 3.4-10.9 5.6-21.7 6.8-33.8.6-6.7.9-126.3.6-349.2-.3-316.1-.4-339.6-2-347.5-8.5-41.8-32.2-78.5-66.7-103.1-22.6-16.2-48.7-26.8-73.2-29.9-5.6-.7-121.9-1-355.8-.9-289.3.1-349 .3-356.3 1.5M1126 61c34.6 5.9 68.1 29.9 88.1 63.1 5.7 9.5 12 25.1 15.2 37.6l2.2 8.8v343c0 325.4-.1 343.4-1.8 351.3-6.8 31.7-25.1 60.3-51.2 80.3-12.5 9.5-27.7 17.2-45 22.6l-9 2.8-156.7.3-156.8.2v-3.1c0-6.7 3.3-23.9 6.6-34.1 5.2-15.9 14-32.3 33-61.3 20.2-30.7 27.2-42.6 35.2-60 27-59 32.7-118.3 17.2-178.6-13.5-52.7-42-98.3-89.8-143.9l-11.7-11.2-3.5 4.4c-18.5 22.8-44.7 42.4-72.7 54.3l-7.1 3.1 12 12.9c35.9 38.6 53.4 69.5 63.4 112.2 2.7 11 2.8 13.2 2.9 34.3 0 21.5-.1 23-2.8 33.5-6.7 25.7-15 42.9-32.3 67.2-5.6 7.8-5.8 8.1-25.5 32.3-29.4 36.1-44.1 60.8-56.5 94.8-3.4 9.5-8.7 30-10 38.4l-.6 4.8-118.7.2c-65.2.1-122.2.1-126.6-.1-17.8-.6-38.7-7.1-56.4-17.6-12.2-7.2-19.8-13.4-30.7-24.8-17.7-18.5-29.3-40.2-36.1-67.3-1.6-6.4-1.7-28.8-2.1-342.4-.2-248.7 0-337.8.8-344.5 6-46.4 39.4-87.6 86.7-106.8 8-3.2 22.5-6.6 32.2-7.5 13.6-1.2 700.7-.5 708.1.8"/>' +
		'<path d="M812.7 125.1c-19.9 1.9-44.4 8.5-64.7 17.5-32.1 14.1-65.9 40.4-89.7 69.9-27.8 34.4-46.2 76.6-51.3 117.5-3.4 27.8 1.2 63.7 11.6 90.1 7.3 18.7 22.4 45.3 32.1 56.7l2.8 3.4 8.2-2.1c27.6-7.1 56.4-23.3 75.5-42.5 12.3-12.3 11.9-10.3 4.9-24.7-10.4-21.5-13.7-36.4-12.8-58.4 1-23.6 6.8-39.5 21.7-59.3 12.4-16.5 30.1-28.7 50.6-34.8 7.3-2.1 11.1-2.6 20.9-2.7 14.8-.2 19.8.9 39.5 8.5 22.1 8.6 33.9 10.4 48.5 7.3 24.6-5.2 42.9-27 44.3-52.6 1.6-31.7-18.9-61-55.5-79.3-25.5-12.7-54.5-17.6-86.6-14.5"/>' +
		'<path d="M763 420.9c3 5.7-.3 11.3-15.2 25.7-11 10.6-15.3 14.1-27.3 22.1-22.1 14.8-52.2 26.3-68.8 26.3-5.5 0-6.7-.3-8.7-2.5l-2.4-2.6-1.3 2.3c-3.1 5.6.6 16.5 8.2 24.1l2.7 2.7-1.8 3.7c-2.6 5.4-2.4 13.7.4 19.4 2.6 5.3 2.7 5.9.8 5.9-.7 0-4.5 1.6-8.3 3.5-11.9 6-22.5 19-26.4 32.5-.7 2.5-1.8 5.2-2.6 6.1-1.3 1.6-1.8 6.9-.7 6.9.4 0 1.2-.7 1.8-1.5 2.1-2.8 12.3-4 34.1-3.9 27.6.2 56.8 3.9 65.7 8.5 3.4 1.8 3.9 1.8 4.5.4.3-.9.1-2.6-.5-3.8-.7-1.2-1.8-5.6-2.7-9.7-.8-4.1-2.6-9.8-4-12.6-3.6-7.3-13.1-17.2-20.9-21.8-5.9-3.4-8.1-5.6-5.8-5.6.5 0 1.9-1.9 3.2-4.2 3.3-5.9 3.4-15.7.3-21.1-3-4.9-2.9-5.7.5-5.7 3.9 0 10.1 6.5 10.9 11.4.7 4.3-.2 4.4 15.1-1.7 22.3-8.7 46.1-24.6 62.2-41.3 14.4-15 19.9-25 17-31.2-2.4-5.4-18.4-30.8-20.4-32.4-1.3-1.1-3.8-1.8-6.4-1.8-3.9 0-4.2.2-3.2 1.9M641.5 493c.3.5.1 1-.4 1-.6 0-1.1-.5-1.1-1 0-.6.2-1 .4-1 .3 0 .8.4 1.1 1m30.9 26.4c9.3 3.9 11.2 16.5 3.5 23.1-2.5 2-4.1 2.5-8.9 2.5h-5.9l-2.6-4.4c-4.9-8.3-2.8-16.7 5-20.6 4.8-2.4 4.7-2.4 8.9-.6m-55.2 81.3-4.3.4.6 3.7c2.1 12 8.9 24.9 16.9 31.9 4.8 4.1 18.9 11.3 22.3 11.3 1.3 0 2.3-.6 2.4-1.3 0-.6.4-.3.9.8q.9 1.95.9-6.9c.1-8-.1-9.1-2.4-11.8-3.8-4.5-3.5-10 .9-14.4 2.8-2.8 4.2-3.4 7.6-3.4s4.8.6 7.6 3.4c2.4 2.4 3.4 4.3 3.4 6.5 0 3.9-2.4 8.7-4.9 10-1.4.8-2 2.6-2.4 7.3-.3 3.5-.8 7.3-1.2 8.5-.7 2.1-.4 2.3 2.7 2.3 5.5 0 14.8-2.8 21.4-6.5 11-6.2 22.5-21 24.8-32.1.7-3 .6-3.1-4.6-4.2-20.1-4.4-71.3-7.4-92.6-5.5"/>' +
		"</g></svg>"
	);
}

function applySlotIcon(el: HTMLElement, slot: SeidrWiggleSlot) {
	if (slot === "ear") {
		el.innerHTML = earIconHtml();
		return;
	}
	if (slot === "wing") {
		el.innerHTML = wingIconHtml();
		return;
	}
	if (slot === "tail") {
		el.innerHTML = tailIconHtml();
		return;
	}
	el.textContent = slotIconLabel(slot);
}

/**
 * Main Fast Wiggle icon (multi-slot launcher). Silhouette from provided SVG,
 * filled with Seidr gold (bitmap speckles omitted).
 */
function popupIconHtml(): string {
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="250 20 1040 1000" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
		'<g fill="' + SEIDR_ICON_GOLD + '">' +
		'<path d="M418.3 25c-18.2 1.5-44.3 9.6-62.3 19.3-44.6 24-75.2 63.2-87.3 111.6l-2.1 8.6-.4 341c-.2 248.4 0 343.6.8 350.5 5.7 47.9 35.1 94.2 77.1 121.3 19.8 12.8 39.3 20.3 64.4 24.9 5.6 1 76.8 1.3 361 1.3 335.9 0 354.4-.1 362.8-1.8 34.9-7.1 69.2-27.6 92.5-55.2 18.7-22.3 31.8-48.8 37.2-75.8 1.2-5.6 2.4-17 2.9-25.2 1.3-24.4.5-670.6-.8-679.5-8.3-54.8-41.4-100-91.8-125.4-10.4-5.3-29.3-11.8-41.3-14.3-8-1.6-29.6-1.7-356-1.9-191.1-.1-351.6.2-356.7.6m708.2 36.7c22 4.2 42.4 14.4 60.1 30 18.8 16.6 33.3 39.1 39.9 61.8 5.8 20 5.6 1 5.2 366.5l-.2 335.5-2.2 9c-5.9 25.2-17.3 46-35.3 64.8-12.4 12.9-23.8 21.4-38.5 28.7-12.5 6.1-23.1 9.8-35 12.1-10.4 2.1-695.3 2.1-706.5 0-52.2-9.5-96.7-51.5-110.8-104.5l-2.7-10.1-.3-338c-.2-337.7-.2-338 1.8-348.8 4.7-24.8 15.6-45.6 34.1-65 18.9-20 41.5-33.6 67.3-40.5l10.1-2.7 346-.5c190.3-.3 348.9-.4 352.5-.2s10.1 1 14.5 1.9"/>' +
		'<path d="M823 178.7c-10.7 3.7-18.4 12.6-20.2 23.4-1 5.7-.9 7.3 1.1 13.7 1.2 4 3.4 8.6 5 10.4 5.2 6 18.9 25.7 25.6 36.8 22.7 37.7 32.6 72.4 31.2 109-1.1 28.3-6.9 44-31.8 86.5-24.1 41.2-30.7 54.4-37.3 74.6-6.3 19.2-8 29.2-8 48.4-.1 29 3.5 41.7 23.9 83.5 20 40.9 23 51.5 23 81 0 15.6-.4 20.1-2.3 28.8-3.1 13.7-8.2 28.3-14.5 41.1s-7.1 19.3-3.7 28.3c5.5 14.7 23.2 22.5 38.1 16.9 10-3.8 13.6-8 23.1-26.8 22.7-45.2 29.3-90.3 19.2-131.3-3.9-15.5-8.8-27.5-24.2-58-14.9-29.5-18.2-38.6-20.2-55.4-1.9-15.5 1.4-33.6 9.5-52.6 4.5-10.5 8.9-18.6 22.4-41 21.2-35.4 29.1-51.1 35.9-71.5 13.7-40.8 13-84.6-1.8-129.4-10.7-32.1-26.3-61.4-50.2-94.3-13.4-18.4-21.2-23.9-34.3-23.7-2.7 0-7 .7-9.5 1.6m-198.7 31.1c-10.1 3.6-16 10.1-18.8 20.7-1.9 7.6-1.9 9 .5 16.7 1.3 4.3 3.6 8.5 7 12.7 12.7 15.8 28.1 41.8 35.4 59.6 11 27 13.7 50.4 9 75.8-2.4 12.6-5.6 20.2-22.8 54.7-17.6 35.1-24.3 51.2-29.9 71.5-5 18.1-6.7 28.6-7.4 45.8-1.5 37.6 6.3 63 32.8 106.7 16.3 27 22.9 41.6 26.1 57.3 1.6 8.1 1.6 33.6 0 41.2-2.7 12.7-8.8 29.4-15.5 42.5-6.3 12.2-7 14.2-7.5 20.8-.4 6.6-.2 7.7 2.7 13.7 8.7 17.6 32.2 21.9 47.3 8.7 6.8-6 22.9-37.4 29.1-56.7 6.6-20.6 8.1-29.7 8.1-51.5.1-21.8-1-29-6.9-46.6-6.1-17.9-11.7-28.8-30.4-59.3C665.8 616 660 600 658.5 577c-1.8-28.3 8-59.1 33.6-105 22.7-40.8 31.1-71.3 29.6-107.5-.7-16.5-2.4-26.9-7.1-43.1-8.4-29.3-26.3-63.7-48.4-93.6-11.2-15.1-16.9-18.9-29.2-19.5-5.5-.3-8.9.1-12.7 1.5"/>' +
		'<path d="M459.2 345.9c-4.6 1.2-12.8 7-24.1 17.2-21.4 19.2-38.5 41.9-50.7 67.4-27.7 57.5-27.4 123 .6 180 11 22.3 23 38.6 41.4 56.2 13.6 12.9 18.9 15.8 27.8 15 9.7-.9 16.3-6.5 18.9-16 .8-3 .6-5.1-.6-9.5-1.5-5-2.7-6.6-10.6-14.1-25.4-23.9-42.5-54.6-49.9-89.6-2.7-12.9-3.7-38.4-2.1-52.1 3.5-28.7 15.2-57.8 32.5-81.1 6.7-9 20-22.8 30.9-32 8.8-7.5 12-11.9 13.2-18.4.8-4.6-1-11.5-4.2-15.7-4.6-6-15-9.3-23.1-7.3m602.8 0c-8.5 2.8-13.3 7.7-15.1 15.8-1 4.1-.9 6.1.1 9.9 1.2 4.2 3.4 6.8 18 21.3 12.6 12.6 18.4 19.2 23.9 27.4 14.1 20.9 23.3 43.2 28.7 69.5 2.4 11.4 2.7 15 2.8 34.7 0 17.6-.3 23.9-1.8 31.5-3.8 19.4-12.6 41-24 58.5-6.6 10-12.9 17.6-23.8 28.5-7.4 7.4-8.7 9.3-9.7 13.7-3.9 16.1 10.4 28.9 27.1 24.3 4.9-1.4 12.1-7.2 24.3-19.4 27-27.2 45.1-62.3 52.6-102.1 3.1-16.1 3.7-45.9 1.4-63.1-6.3-47.4-28.8-93.6-61.5-126.5-10.1-10.1-21.5-19.6-26.7-22.3-3.8-1.9-12.8-2.9-16.3-1.7"/>' +
		'<path d="M519.4 408.8c-13.5 4.7-35.9 30.9-47.1 54.9-8.7 18.8-12.6 36.4-12.7 57.8q-.15 50.7 33.9 89.7c9.1 10.5 17.4 14.3 26.2 11.9 11.3-3.1 17.6-13.1 15.2-24.3-.8-3.5-2.6-6.7-6.6-11.6-17.4-21.1-24-37.4-25-61.3-.5-10.6-.2-14.3 1.7-23 3.6-17.2 10.2-30.9 21.6-45.1 3-3.6 7.7-8.6 10.5-11 5.9-5 8.9-10.1 9.6-16.9 1-9.6-4.9-18.7-14-21.4-6.3-1.9-7-1.8-13.3.3m482.6-.9c-7.6 2.3-12.2 6.4-14.5 13-3.5 10.1-1.6 15.1 10.8 28 15.6 16.4 24.3 31.6 29.2 51.5 2.5 10.1 2.7 12 2.2 25.5-.3 10.7-1.1 16.6-2.6 22.1-3.1 10.7-11.2 26.4-17.6 34-9.6 11.4-10.8 13.6-11.3 20-1.1 14.9 12.4 25.2 27 20.5 4.3-1.4 6.7-3.2 12.6-9.2 15.9-16.6 27.4-39.3 32.9-65.3 2.5-11.7 2.5-38.9 0-51.3-5.9-29.3-19.5-54.6-41.2-76.4-8.7-8.7-10.8-10.3-15.5-11.7-5.8-1.7-8.1-1.9-12-.7"/>' +
		"</g></svg>"
	);
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

function applyBtnSize() {
	if (!btn) return;
	const s = btnSize();
	btn.style.width = s + "px";
	btn.style.height = s + "px";
}

function rectsOverlap(a: DOMRect, b: DOMRect, pad: number): boolean {
	return !(
		a.right + pad <= b.left ||
		a.left - pad >= b.right ||
		a.bottom + pad <= b.top ||
		a.top - pad >= b.bottom
	);
}

/** Nudge Fast Wiggle away from Room Manager button. */
function antiOverlapRm() {
	if (!btn || !btn.classList.contains("seidr-fw-visible")) return;
	const rm = document.getElementById("seidr-rm-btn");
	if (!rm || !rm.classList.contains("seidr-rm-visible")) return;
	const size = btnSize();
	let guard = 0;
	while (guard < 24) {
		guard++;
		const a = btn.getBoundingClientRect();
		const b = rm.getBoundingClientRect();
		if (!rectsOverlap(a, b, GAP)) break;
		// Prefer push down; if near bottom, push left
		let nx = a.left;
		let ny = a.top + size + GAP;
		if (ny + size > window.innerHeight - 8) {
			ny = Math.max(8, b.top);
			nx = b.left - size - GAP;
			if (nx < 8) nx = b.right + GAP;
		}
		setBtnXY(nx, ny);
	}
	placeMenu();
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
			// Keep the launcher clear of Club’s map movement controls.
			const controls = document.getElementById("chat-room-map-controls");
			if (controls && getComputedStyle(controls).visibility !== "hidden") {
				const r = controls.getBoundingClientRect();
				if (r.width > 0 && r.height > 0 && x < r.right + GAP && x + size > r.left - GAP && y < r.bottom + GAP && y + size > r.top - GAP) {
					y = r.top - size - GAP;
				}
			}
			chatAnchorY = y / Math.max(1, vh);
			setBtnXY(x, y);
			return;
		}
		setBtnXY(vw - size - PAD, chatAnchorY == null ? vh * 0.55 : chatAnchorY * vh);
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

function placeFromFractions(fx: number, fy: number) {
	setBtnXY(fx * window.innerWidth, fy * window.innerHeight);
}

function placeBtnDefault() {
	if (!btn) return;
	applyBtnSize();
	if (sessionBtnPos) {
		placeFromFractions(sessionBtnPos.fx, sessionBtnPos.fy);
	} else {
		const settings = seidrGetSettings();
		applyLauncherPosition(settings.fastWigglePosition || "chatBottom");
	}
	antiOverlapRm();
}

/**
 * Vertical anchor inside the menu that should line up with WIG center:
 * - 1 item: that button's center
 * - 2 items: midpoint of the gap between the two button centers
 * - 3 items: middle button's center
 */
function menuAnchorOffsetY(n: number, itemH: number): number {
	if (n <= 0) return MENU_PAD;
	if (n % 2 === 1) {
		const mid = Math.floor(n / 2);
		return MENU_PAD + mid * (itemH + MENU_GAP) + itemH / 2;
	}
	const a = n / 2 - 1;
	const b = n / 2;
	const ca = MENU_PAD + a * (itemH + MENU_GAP) + itemH / 2;
	const cb = MENU_PAD + b * (itemH + MENU_GAP) + itemH / 2;
	return (ca + cb) / 2;
}

function placeMenu() {
	if (!btn || !menu || !menu.classList.contains("seidr-fw-open")) return;
	const r = btn.getBoundingClientRect();
	const size = btnSize();
	const items = menu.querySelectorAll("button");
	const n = items.length;
	for (let i = 0; i < items.length; i++) {
		const el = items[i] as HTMLElement;
		el.style.width = size + "px";
		el.style.height = size + "px";
	}
	const mw = MENU_PAD * 2 + size;
	menu.style.width = mw + "px";
	const btnCenterY = r.top + r.height / 2;
	const anchor = menuAnchorOffsetY(n, size);
	let top = btnCenterY - anchor;
	const menuH = n > 0
		? MENU_PAD * 2 + n * size + Math.max(0, n - 1) * MENU_GAP
		: menu.offsetHeight || size;
	const maxTop = Math.max(8, window.innerHeight - menuH - 8);
	top = Math.min(Math.max(8, top), maxTop);
	menu.style.left = Math.max(8, r.left - mw - GAP) + "px";
	menu.style.top = top + "px";
	menu.style.right = "auto";
}

function closeMenu() {
	if (menu) menu.classList.remove("seidr-fw-open");
}

function makeDraggable(el: HTMLElement, onEnd?: () => void) {
	let ox = 0;
	let oy = 0;
	let startX = 0;
	let startY = 0;
	function down(ev: PointerEvent) {
		const t = ev.target as HTMLElement;
		if (t !== el && t.closest && t.closest("button") && t.closest("button") !== el) return;
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
		placeMenu();
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

function playReady(anim: SeidrAnimation) {
	closeMenu();
	seidrPlayAnimation(anim.id).catch(function () { /* ignore */ });
}

function updateBtnIcon(ready: Partial<Record<SeidrWiggleSlot, SeidrAnimation>>) {
	if (!btn) return;
	const slots = (Object.keys(ready) as SeidrWiggleSlot[]);
	const icon = btn.querySelector(".seidr-fw-icon");
	if (!icon) return;
	if (slots.length === 1) {
		applySlotIcon(icon as HTMLElement, slots[0]);
		btn.title = "Fast Wiggle · " + slots[0];
	} else {
		icon.innerHTML = popupIconHtml();
		btn.title = "Fast Wiggle";
	}
}

function openSlotMenu(ready: Partial<Record<SeidrWiggleSlot, SeidrAnimation>>) {
	if (!menu || !btn) return;
	const order: SeidrWiggleSlot[] = ["ear", "tail", "wing"];
	menu.innerHTML = "";
	for (let i = 0; i < order.length; i++) {
		const slot = order[i];
		const anim = ready[slot];
		if (!anim) continue;
		const b = document.createElement("button");
		b.type = "button";
		applySlotIcon(b, slot);
		b.title = slot;
		b.addEventListener("click", function (ev) {
			ev.stopPropagation();
			playReady(anim);
		});
		menu.appendChild(b);
	}
	menu.classList.add("seidr-fw-open");
	// Layout after paint so sizes/offsetWidth are correct
	requestAnimationFrame(function () { placeMenu(); });
	placeMenu();
}

function onBtnActivate() {
	if (dragMoved) return;
	const ready = seidrReadyWiggleBySlot();
	const slots = Object.keys(ready) as SeidrWiggleSlot[];
	if (!slots.length) return;
	if (slots.length === 1) {
		playReady(ready[slots[0]]!);
		return;
	}
	if (menu && menu.classList.contains("seidr-fw-open")) closeMenu();
	else openSlotMenu(ready);
}

function ensureShell() {
	injectStyles();
	if (root && document.body.contains(root)) return;
	root = document.createElement("div");
	root.id = "seidr-fw-root";
	btn = document.createElement("button");
	btn.type = "button";
	btn.id = "seidr-fw-btn";
	btn.setAttribute("aria-label", "Fast Wiggle");
	const icon = document.createElement("span");
	icon.className = "seidr-fw-icon";
	icon.innerHTML = popupIconHtml();
	btn.appendChild(icon);
	menu = document.createElement("div");
	menu.id = "seidr-fw-menu";
	root.appendChild(btn);
	root.appendChild(menu);
	document.body.appendChild(root);
	["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"].forEach(function (type) {
		root!.addEventListener(type, function (ev) {
			ev.stopPropagation();
		});
	});
	makeDraggable(btn, function () {
		if (!btn) return;
		antiOverlapRm();
		const x = parseFloat(btn.style.left) || btn.offsetLeft;
		const y = parseFloat(btn.style.top) || btn.offsetTop;
		const fx = x / Math.max(1, window.innerWidth);
		const fy = y / Math.max(1, window.innerHeight);
		sessionBtnPos = { fx: fx, fy: fy };
		disconnectChatLogObserver();
	});
	btn.addEventListener("pointerup", function () {
		onBtnActivate();
	});
	document.addEventListener("pointerdown", function (ev) {
		if (!menu || !menu.classList.contains("seidr-fw-open")) return;
		const t = ev.target as Node;
		if (menu.contains(t) || (btn && btn.contains(t))) return;
		closeMenu();
	});
}

function disconnectChatLogObserver() {
	if (chatLogObserver) {
		chatLogObserver.disconnect();
		chatLogObserver = null;
	}
}

function syncChatLogObserver() {
	disconnectChatLogObserver();
	if (!btn || !btn.classList.contains("seidr-fw-visible")) return;
	if (sessionBtnPos) return;
	const pos = seidrGetSettings().fastWigglePosition || "chatBottom";
	if (pos !== "chatLeft" && pos !== "chatTop" && pos !== "chatBottom") return;
	const el = chatLogEl();
	if (!el || typeof ResizeObserver === "undefined") return;
	chatLogObserver = new ResizeObserver(function () {
		if (sessionBtnPos) return;
		placeBtnDefault();
	});
	chatLogObserver.observe(el);
}

export function seidrFwRelayout() {
	if (!btn) return;
	if (!btn.classList.contains("seidr-fw-visible")) {
		applyBtnSize();
		return;
	}
	placeBtnDefault();
	syncChatLogObserver();
}

export function seidrFwUpdateVisibility() {
	const s = seidrGetSettings();
	if (!s.showFastWiggleButton) {
		if (btn) btn.classList.remove("seidr-fw-visible");
		closeMenu();
		disconnectChatLogObserver();
		return;
	}
	const ready = seidrReadyWiggleBySlot();
	const slots = Object.keys(ready) as SeidrWiggleSlot[];
	const show = onChatRoomScreen() && noCharacterDialog() && slots.length > 0;
	ensureShell();
	if (btn) {
		btn.classList.toggle("seidr-fw-visible", show);
		if (show) {
			updateBtnIcon(ready);
			seidrFwRelayout();
		} else {
			closeMenu();
			disconnectChatLogObserver();
		}
	}
}

export function seidrFwOnSettingsChanged() {
	sessionBtnPos = null;
	chatAnchorY = null;
	seidrFwUpdateVisibility();
}

function onResize() {
	seidrFwRelayout();
}

export function seidrInstallFastWiggle() {
	if (installed) {
		seidrFwUpdateVisibility();
		return;
	}
	installed = true;
	ensureShell();
	Seidr.tryHook("FastWiggle:ChatRoomLoad", "ChatRoomLoad", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		sessionBtnPos = null;
		seidrFwUpdateVisibility();
		return r;
	});
	Seidr.tryHook("FastWiggle:ChatRoomSync", "ChatRoomSync", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		seidrFwUpdateVisibility();
		return r;
	});
	Seidr.tryHook("FastWiggle:ChatRoomResize", "ChatRoomResize", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		seidrFwRelayout();
		return r;
	});
	Seidr.tryHook("FastWiggle:CommonSetScreen", "CommonSetScreen", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		seidrFwUpdateVisibility();
		return r;
	});
	Seidr.tryHook("FastWiggle:CharacterSetCurrent", "CharacterSetCurrent", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		seidrFwUpdateVisibility();
		return r;
	});
	Seidr.tryHook("FastWiggle:DialogLeave", "DialogLeave", 11, function (args: unknown[], next: (a: unknown[]) => unknown) {
		const r = next(args);
		seidrFwUpdateVisibility();
		return r;
	});
	window.addEventListener("resize", onResize);
	if (pollTimer) clearInterval(pollTimer);
	pollTimer = setInterval(function () {
		if (seidrGetSettings().showFastWiggleButton) seidrFwUpdateVisibility();
	}, 2000);
	seidrFwUpdateVisibility();
}

export function seidrDestroyFastWiggle() {
	disconnectChatLogObserver();
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	window.removeEventListener("resize", onResize);
	closeMenu();
	if (root && root.parentNode) root.parentNode.removeChild(root);
	root = btn = menu = null;
	const st = document.getElementById("seidr-fw-styles");
	if (st && st.parentNode) st.parentNode.removeChild(st);
	installed = false;
}

Seidr.fwOnSettingsChanged = seidrFwOnSettingsChanged;
Seidr.fwUpdateVisibility = seidrFwUpdateVisibility;
Seidr.fwRelayout = seidrFwRelayout;
