/** Modifier-click a room character → Club Activity View (Fast Open Actions). */
import { Seidr } from "./seidr";
import type { SeidrFastOpenModifier } from "./settings/model";
import { seidrGetSettings } from "./settings/storage";

let clickShift = false;
let clickCtrl = false;
let clickAlt = false;
let clickMeta = false;
let installed = false;

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

function modifierHeld(mod: SeidrFastOpenModifier): boolean {
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

export function seidrInstallFastOpen() {
	if (installed) return;
	installed = true;
	if (typeof document !== "undefined") {
		document.addEventListener("mousedown", rememberClickMods, true);
		document.addEventListener("pointerdown", rememberClickMods, true);
	}
	Seidr.hookFunction("ChatRoomCharacterViewClickCharacter", 12, function (args, next) {
		const s = seidrGetSettings();
		const enabled = s.fastOpenActionsEnabled !== false;
		const mod = (s.fastOpenActionsModifier || "Shift") as SeidrFastOpenModifier;
		if (enabled && modifierHeld(mod)) {
			clearClickMods();
			if (openActivitiesOn(args[0])) return;
		}
		clearClickMods();
		return next(args);
	});
}

Seidr.installFastOpen = seidrInstallFastOpen;
