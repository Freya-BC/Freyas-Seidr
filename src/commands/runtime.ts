/** Install /a + /action + Tab autocomplete */
import { Seidr } from "../seidr";
import { seidrCmdAcClose, seidrCmdAcHandleKeyDown, seidrCmdAcIsOpen } from "./autocomplete";
import { seidrCmdIsCommandLine } from "./parse";
import { seidrCmdExecuteLine } from "./run";

declare const CommandCombine: any;
declare const ElementValue: any;

function clearInput() {
	try {
		if (typeof ElementValue === "function") ElementValue("InputChat", "");
		else {
			const el = document.getElementById("InputChat") as HTMLTextAreaElement | null;
			if (el) el.value = "";
		}
	} catch (e) { /* ignore */ }
}

function onCommand(_args: string) {
	const el = document.getElementById("InputChat") as HTMLTextAreaElement | null;
	const msg = el ? String(el.value || "").trim() : "";
	const line = msg || "";
	// CommandExecute may pass remainder only — prefer full InputChat if it looks like our command
	const full = seidrCmdIsCommandLine(line) ? line : ("/a " + String(_args || "").trim());
	seidrCmdAcClose();
	const handled = seidrCmdExecuteLine(full.startsWith("/") ? full : "/a " + full);
	if (handled) clearInput();
}

function registerCommands() {
	if (typeof CommandCombine !== "function") return;
	const common = {
		Description: "Seidr: /a <member> <action> — run a bound activity",
		Reference: "a",
		Clear: false,
		Action: function (_args: string) {
			onCommand(_args);
		},
	};
	try {
		CommandCombine([
			Object.assign({}, common, { Tag: "a" }),
			Object.assign({}, common, {
				Tag: "action",
				Reference: "action",
				Description: "Seidr: /action <member> <action>",
			}),
		]);
	} catch (e) {
		console.warn("[Seidr Cmd] CommandCombine failed", e);
	}
}

function onKeyDownCapture(ev: KeyboardEvent) {
	if (seidrCmdAcHandleKeyDown(ev)) return;
}

function onBlurClose() {
	// Delay so mousedown on AC item can fire first
	setTimeout(function () {
		if (!seidrCmdAcIsOpen()) return;
		const ae = document.activeElement;
		const root = document.getElementById("seidr-cmd-ac");
		if (root && ae && root.contains(ae)) return;
		seidrCmdAcClose();
	}, 50);
}

function hookInput() {
	const el = document.getElementById("InputChat");
	if (!el || (el as any).__seidrCmdHooked) return;
	(el as any).__seidrCmdHooked = true;
	el.addEventListener("keydown", onKeyDownCapture, true);
	el.addEventListener("blur", onBlurClose);
}

function installInputWatch() {
	hookInput();
	// Chat rebuilds InputChat — rebind periodically / on focus
	document.addEventListener(
		"focusin",
		function (ev) {
			const t = ev.target as HTMLElement | null;
			if (t && t.id === "InputChat") hookInput();
		},
		true
	);
}

/** Also intercept ChatRoomSendChat so /a works even if CommandCombine races. */
function hookSendChat() {
	if (!Seidr.hookFunction) return;
	Seidr.hookFunction("ChatRoomSendChat", 8, function (args: unknown[], next: (a?: unknown[]) => unknown) {
		try {
			const el = document.getElementById("InputChat") as HTMLTextAreaElement | null;
			const msg = el ? String(el.value || "").trim() : "";
			if (seidrCmdIsCommandLine(msg)) {
				seidrCmdAcClose();
				seidrCmdExecuteLine(msg);
				clearInput();
				return;
			}
		} catch (e) {
			console.warn("[Seidr Cmd] send hook", e);
		}
		return next(args);
	});
}

export function seidrInstallCommands() {
	if (Seidr.SHOW_COMMANDS === false) return;
	if (Seidr._hookState && Seidr._hookState.commands) return;
	if (!Seidr._hookState) Seidr._hookState = {};
	Seidr._hookState.commands = true;
	registerCommands();
	installInputWatch();
	hookSendChat();
}

Seidr.installCommands = seidrInstallCommands;
