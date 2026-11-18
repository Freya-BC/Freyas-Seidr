/** Apply optional Club chat typeface / size (DOM only — not canvas DrawText). */
import { Seidr } from "../seidr";
import { seidrNormalizeChatFont, seidrNormalizeChatFontSize } from "./model";
import { seidrGetSettings } from "./storage";

declare function CommonGetFontName(): string;
declare const MainCanvas: { canvas?: HTMLCanvasElement } | undefined;

const STYLE_ID = "seidr-chat-font";

/**
 * Text + input only — never `#chat-room-div` / `#chat-room-bot`.
 * Club sizes the whole chat chrome from `#chat-room-div` font-size (em / inherit);
 * overriding that moves buttons and the compose row.
 */
const TEXT_SELECTORS = "#TextAreaChatLog, #InputChat";

let resizeHooked = false;

function clubFontFallback(): string {
	try {
		if (typeof CommonGetFontName === "function") {
			const stack = CommonGetFontName();
			if (typeof stack === "string" && stack.trim()) return stack.trim();
		}
	} catch (e) { /* ignore */ }
	return '"Arial", sans-serif';
}

/** Same scale as Club `ElementSetFontSize` (base × min(canvasW, canvasH) / 1000). */
function clubScaledPx(base: number): number {
	try {
		const canvas = MainCanvas && MainCanvas.canvas;
		if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
			const scale = Math.min(canvas.clientWidth, canvas.clientHeight) / 1000;
			const px = base * scale;
			if (Number.isFinite(px) && px > 0) return Math.round(px * 100) / 100;
		}
	} catch (e) { /* ignore */ }
	return base;
}

function removeChatFontStyle() {
	const el = document.getElementById(STYLE_ID);
	if (el && el.parentNode) el.parentNode.removeChild(el);
}

/**
 * Inject or clear `#seidr-chat-font`.
 * Empty font → Club Graphics typeface. Size `0` → Club Chat Font Size.
 * Custom font is listed first; Club `CommonGetFontName()` follows so missing faces fall back.
 */
export function seidrApplyChatFont(): void {
	if (typeof document === "undefined") return;
	const s = seidrGetSettings();
	const font = seidrNormalizeChatFont(s.chatFont);
	const size = seidrNormalizeChatFontSize(s.chatFontSize);
	if (!font && !size) {
		removeChatFontStyle();
		return;
	}
	const rules: string[] = [];
	if (font) {
		rules.push('  font-family: "' + font + '", ' + clubFontFallback() + " !important;");
	}
	if (size) {
		rules.push("  font-size: " + clubScaledPx(size) + "px !important;");
	}
	const css = TEXT_SELECTORS + " {\n" + rules.join("\n") + "\n}";
	let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement("style");
		el.id = STYLE_ID;
		(document.head || document.documentElement).appendChild(el);
	}
	el.textContent = css;
}

/** Re-apply size after Club rescales chat on window / room resize. */
export function seidrInstallChatFont(): void {
	seidrApplyChatFont();
	if (resizeHooked) return;
	resizeHooked = true;
	const hook = function (args: unknown[], next: (a?: unknown[]) => unknown) {
		const ret = next(args);
		try { seidrApplyChatFont(); } catch (e) { /* ignore */ }
		return ret;
	};
	try {
		if (typeof Seidr.tryHook === "function") {
			Seidr.tryHook("ChatRoomResize", "ChatRoomResize", 2, hook);
		} else if (typeof Seidr.hookFunction === "function") {
			Seidr.hookFunction("ChatRoomResize", 2, hook);
		}
	} catch (e) { /* ignore */ }
}
