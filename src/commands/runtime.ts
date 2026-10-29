/** Install Seidr chat commands + Tab autocomplete */
import { Seidr } from "../seidr";
import { seidrCmdAcClose, seidrCmdAcHandleKeyDown, seidrCmdAcIsOpen } from "./autocomplete";
import { seidrCmdIsCommandLine } from "./parse";
import { seidrCmdExecuteLine, seidrCmdIsEnabled } from "./run";
import { seidrGetCommandsBag } from "./store";

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

function onCommand(fallbackTag: string, _args: string) {
	if (!seidrCmdIsEnabled(fallbackTag)) {
		seidrCmdExecuteLine("/" + fallbackTag);
		clearInput();
		return;
	}
	const el = document.getElementById("InputChat") as HTMLTextAreaElement | null;
	const msg = el ? String(el.value || "").trim() : "";
	const line = msg || "";
	const full = seidrCmdIsCommandLine(line)
		? line
		: ("/" + fallbackTag + " " + String(_args || "").trim());
	seidrCmdAcClose();
	const handled = seidrCmdExecuteLine(full.startsWith("/") ? full : "/" + fallbackTag + " " + full);
	if (handled) clearInput();
}

function onMetaCommand(tag: string) {
	seidrCmdAcClose();
	seidrCmdExecuteLine("/" + tag);
	clearInput();
}

export function seidrRegisterCommands(): void {
	if (typeof CommandCombine !== "function") return;
	const en = seidrGetCommandsBag().enabled;
	const defs: any[] = [];
	if (en.a !== false) {
		defs.push({
			Tag: "a",
			Description: "Seidr: /a <member> <action> — run a bound activity",
			Clear: false,
			Action: function (args: string) { onCommand("a", args); },
		});
	}
	if (en.action !== false) {
		defs.push({
			Tag: "action",
			Description: "Seidr: /action <member> <action> (Fast Select: a+Tab)",
			Clear: false,
			Action: function (args: string) { onCommand("action", args); },
		});
	}
	if (en.strip !== false) {
		defs.push({
			Tag: "strip",
			Description: "Seidr: /strip <member> <slot> — undress all layers (Fast Select: s+Tab)",
			Clear: false,
			Action: function (args: string) { onCommand("strip", args); },
		});
	}
	if (en.stripe !== false) {
		defs.push({
			Tag: "stripe",
			Description: "Seidr: /stripe <member> <slot> — undress one layer",
			Clear: false,
			Action: function (args: string) { onCommand("stripe", args); },
		});
	}
	if (en.poses !== false) {
		defs.push({
			Tag: "poses",
			Description: "Seidr: /poses <member> <pose> — set Club pose (Fast Select: p+Tab)",
			Clear: false,
			Action: function (args: string) { onCommand("poses", args); },
		});
	}
	if (en.p !== false) {
		defs.push({
			Tag: "p",
			Description: "Seidr: /p <member> <pose> — short for /poses",
			Clear: false,
			Action: function (args: string) { onCommand("p", args); },
		});
	}
	if (en.animation !== false) {
		defs.push({
			Tag: "animation",
			Description: "Seidr: /animation <name> — play your animation (Fast Select: d+Tab)",
			Clear: false,
			Action: function (args: string) { onCommand("animation", args); },
		});
	}
	if (en.ani !== false) {
		defs.push({
			Tag: "ani",
			Description: "Seidr: /ani <name> — short for /animation",
			Clear: false,
			Action: function (args: string) { onCommand("ani", args); },
		});
	}
	if (en.seidr !== false) {
		defs.push({
			Tag: "seidr",
			Description: "Seidr: open Settings",
			Clear: false,
			Action: function () { onMetaCommand("seidr"); },
		});
	}
	if (en.roommanager !== false) {
		defs.push({
			Tag: "roommanager",
			Description: "Seidr: open Room Manager",
			Clear: false,
			Action: function () { onMetaCommand("roommanager"); },
		});
	}
	if (!defs.length) return;
	try {
		CommandCombine(defs);
	} catch (e) {
		console.warn("[Seidr Cmd] CommandCombine failed", e);
	}
}

function onKeyDownCapture(ev: KeyboardEvent) {
	if (seidrCmdAcHandleKeyDown(ev)) return;
}

function onBlurClose() {
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
	document.addEventListener(
		"focusin",
		function (ev) {
			const t = ev.target as HTMLElement | null;
			if (t && t.id === "InputChat") hookInput();
		},
		true
	);
}

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
	if (Seidr._hookState && Seidr._hookState.commands) {
		seidrRegisterCommands();
		return;
	}
	if (!Seidr._hookState) Seidr._hookState = {};
	Seidr._hookState.commands = true;
	seidrRegisterCommands();
	installInputWatch();
	hookSendChat();
}

Seidr.installCommands = seidrInstallCommands;
Seidr.registerCommands = seidrRegisterCommands;
