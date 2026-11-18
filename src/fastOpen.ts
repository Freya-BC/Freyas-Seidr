/** Modifier-click a room or map character → Club Activity View (Fast Open Actions). */
import { Seidr } from "./seidr";
import type { SeidrFastOpenModifier } from "./settings/model";
import { seidrGetSettings } from "./settings/storage";

declare var ChatRoomMapViewFocusedCharacter: any;
declare var ChatRoomMapViewEditMode: string | undefined;
declare var ChatRoomMapViewEditStarted: boolean | undefined;
declare var MouseX: number;
declare const MouseIn: ((x: number, y: number, w: number, h: number) => boolean) | undefined;
declare const ChatRoomPlayerIsAdmin: (() => boolean) | undefined;

let clickShift = false;
let clickCtrl = false;
let clickAlt = false;
let clickMeta = false;
let installed = false;
let mapClickHooked = false;

/** Prefer zones that usually have Club activities. */
const PREFERRED_ACTIVITY_GROUPS = [
	"ItemTorso",
	"ItemArms",
	"ItemMouth",
	"ItemBreast",
	"ItemPelvis",
	"ItemLegs",
	"ItemHead",
];

function rememberClickMods(e: MouseEvent | PointerEvent) {
	if (!e) return;
	clickShift = !!e.shiftKey;
	clickCtrl = !!e.ctrlKey;
	clickAlt = !!e.altKey;
	clickMeta = !!e.metaKey;
}

function clearClickMods() {
	clickShift = false;
	clickCtrl = false;
	clickAlt = false;
	clickMeta = false;
}

function modifierFromEvent(mod: SeidrFastOpenModifier, e: any): boolean | null {
	if (!e || typeof e !== "object") return null;
	if (typeof e.shiftKey !== "boolean" && typeof e.ctrlKey !== "boolean") return null;
	switch (mod) {
		case "Ctrl":
			return !!e.ctrlKey;
		case "Alt":
			return !!e.altKey;
		case "Meta":
			return !!e.metaKey;
		case "Shift":
		default:
			return !!e.shiftKey;
	}
}

function modifierHeld(mod: SeidrFastOpenModifier, e?: any): boolean {
	const fromEvent = modifierFromEvent(mod, e);
	if (fromEvent != null) return fromEvent;
	switch (mod) {
		case "Ctrl":
			return clickCtrl;
		case "Alt":
			return clickAlt;
		case "Meta":
			return clickMeta;
		case "Shift":
		default:
			return clickShift;
	}
}

/**
 * Club DialogDraw draws nothing useful when mode is activities/items and FocusGroup
 * is null — that was the empty view. Open dialog, pick a zone, then switch to activities.
 */
function tryGroup(C: any, family: string, name: string): any {
	if (!name) return null;
	let g: any = null;
	if (typeof AssetGroupGet === "function") {
		try {
			g = AssetGroupGet(family as any, name as any) || null;
		} catch (e) {
			g = null;
		}
	}
	if (!g) return null;
	if (typeof ActivityAllowedForGroup === "function") {
		try {
			const list = ActivityAllowedForGroup(C, name as any);
			if (list && list.length) return g;
			return null;
		} catch (e) {
			return null;
		}
	}
	return g;
}

function pickActivityGroup(C: any): any {
	if (!C) return null;
	const family = C.AssetFamily || "Female3DCG";
	let preferred = "ItemTorso";
	try {
		preferred = seidrGetSettings().fastOpenActionsSlot || "ItemTorso";
	} catch (e) { /* ignore */ }
	const hit = tryGroup(C, family, preferred);
	if (hit) return hit;
	for (let i = 0; i < PREFERRED_ACTIVITY_GROUPS.length; i++) {
		const name = PREFERRED_ACTIVITY_GROUPS[i];
		if (name === preferred) continue;
		const g = tryGroup(C, family, name);
		if (g) return g;
	}
	if (typeof AssetGroupGet === "function") {
		try {
			return AssetGroupGet(family as any, preferred as any) ||
				AssetGroupGet(family as any, "ItemTorso" as any) || null;
		} catch (e2) {
			return null;
		}
	}
	return null;
}

function openActivitiesOn(C: any): boolean {
	if (!C) return false;
	if (typeof ChatRoomFocusCharacter !== "function") return false;
	try {
		// Establish dialog screen + AllowItem (do not open activities yet — empty without FocusGroup).
		ChatRoomFocusCharacter(C);
		const group = pickActivityGroup(C);
		if (group && typeof DialogChangeFocusToGroup === "function") {
			DialogChangeFocusToGroup(C, group);
		}
		if (typeof DialogChangeMode === "function") {
			DialogChangeMode("activities");
		}
		return true;
	} catch (e) {
		console.warn("[Seidr] Fast Open Actions", e);
		return false;
	}
}

/** Club map UI buttons handled before character focus in ChatRoomMapViewClick. */
function mapClickHitsChrome(): boolean {
	if (typeof MouseIn !== "function") return false;
	if (typeof ChatRoomPlayerIsAdmin === "function" && ChatRoomPlayerIsAdmin() && MouseIn(790, 860, 60, 60)) {
		return true;
	}
	if (MouseIn(930, 860, 60, 60) || MouseIn(860, 860, 60, 60) || MouseIn(790, 930, 60, 60) ||
		MouseIn(860, 930, 60, 60) || MouseIn(930, 930, 60, 60)) {
		return true;
	}
	return false;
}

/** Same guards Club uses before ChatRoomFocusCharacter on the map. */
function mapWouldFocusCharacter(): boolean {
	if (typeof MouseX === "undefined" || MouseX > 1000) return false;
	if (ChatRoomMapViewFocusedCharacter == null) return false;
	if (ChatRoomMapViewEditMode === "Tile" || ChatRoomMapViewEditMode === "Object") return false;
	if (ChatRoomMapViewEditStarted) return false;
	if (mapClickHitsChrome()) return false;
	return true;
}

function tryFastOpenFromSettings(C: any, e?: any): boolean {
	const s = seidrGetSettings();
	const enabled = s.fastOpenActionsEnabled !== false;
	const mod = (s.fastOpenActionsModifier || "Shift") as SeidrFastOpenModifier;
	if (!enabled || !modifierHeld(mod, e)) return false;
	return openActivitiesOn(C);
}

/**
 * Club routes map clicks through ChatRoomViews.Map.Click (a captured reference),
 * not the global ChatRoomMapViewClick name — same as FBM.
 */
function installMapClickHook(): boolean {
	if (mapClickHooked) return true;
	const ok = Seidr.tryHook(
		"fastOpenMapClick",
		"ChatRoomViews.Map.Click",
		12,
		function (args, next) {
			const ev = args && args[0];
			if (ev && typeof ev === "object") rememberClickMods(ev as MouseEvent);
			if (mapWouldFocusCharacter() && tryFastOpenFromSettings(ChatRoomMapViewFocusedCharacter, ev)) {
				clearClickMods();
				return;
			}
			clearClickMods();
			return next(args);
		},
	);
	if (ok) mapClickHooked = true;
	return ok;
}

export function seidrInstallFastOpen() {
	if (installed) return;
	installed = true;
	if (typeof document !== "undefined") {
		document.addEventListener("mousedown", rememberClickMods, true);
		document.addEventListener("pointerdown", rememberClickMods, true);
	}
	Seidr.hookFunction("ChatRoomCharacterViewClickCharacter", 12, function (args, next) {
		if (tryFastOpenFromSettings(args[0])) {
			clearClickMods();
			return;
		}
		clearClickMods();
		return next(args);
	});
	installMapClickHook();
	// ChatRoomViews may not exist until room scripts settle — retry like FBM.
	Seidr.tryHook("fastOpenMapClickRetryLoad", "ChatRoomLoad", 0, function (args, next) {
		installMapClickHook();
		return next(args);
	});
	Seidr.tryHook("fastOpenMapClickRetrySync", "ChatRoomSync", 0, function (args, next) {
		installMapClickHook();
		return next(args);
	});
}

Seidr.installFastOpen = seidrInstallFastOpen;
