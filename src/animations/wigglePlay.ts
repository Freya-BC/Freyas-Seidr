/** Play wiggle animations: alternate two assets; one loop per Ear/Tail/Wing slot (parallel OK) */
import type { SeidrAnimation, SeidrWiggleFrame, SeidrWiggleSlot } from "./model";
import {
	seidrClampWiggleCount,
	seidrClampWiggleDelayMs,
	seidrNormalizeWiggleSlots,
	SEIDR_WIGGLE_DEFAULTS,
	SEIDR_WIGGLE_SLOTS,
} from "./model";
import {
	seidrCaptureWornFrame,
	seidrFindWiggleByPrimary,
	seidrReadyWiggleBySlot,
	seidrResolveWigglePlayGroup,
	seidrScanWornWiggleItems,
	seidrWiggleBaseGroup,
	seidrWiggleGroupsForSlot,
	SEIDR_WIGGLE_COUNTERPART_MISSING,
	seidrWiggleCounterpartReady,
	seidrWiggleNameEquals,
	seidrWigglePrimaryIsWorn,
	seidrWiggleRealAssetName,
	seidrWornToFrame,
} from "./wiggleSlots";

declare const Player: any;
declare const InventoryWear: any;
declare const InventoryGet: any;
declare const InventoryRemove: any;
declare const CharacterRefresh: any;
declare const ChatRoomCharacterItemUpdate: any;
declare const ChatRoomCharacter: any;

type SlotRun = {
	generation: number;
	timers: ReturnType<typeof setTimeout>[];
	playing: boolean;
};

function emptyRun(): SlotRun {
	return { generation: 0, timers: [], playing: false };
}

const bySlot: Record<SeidrWiggleSlot, SlotRun> = {
	ear: emptyRun(),
	tail: emptyRun(),
	wing: emptyRun(),
};

function cancelSlot(slot: SeidrWiggleSlot): void {
	const s = bySlot[slot];
	s.generation++;
	for (let i = 0; i < s.timers.length; i++) clearTimeout(s.timers[i]);
	s.timers = [];
	s.playing = false;
}

export function seidrWiggleIsPlaying(slot?: SeidrWiggleSlot): boolean {
	if (slot) return bySlot[slot].playing;
	for (let i = 0; i < SEIDR_WIGGLE_SLOTS.length; i++) {
		if (bySlot[SEIDR_WIGGLE_SLOTS[i].id].playing) return true;
	}
	return false;
}

/** Cancel one slot, or all slots when omitted. */
export function seidrCancelWiggle(slot?: SeidrWiggleSlot): void {
	if (slot) {
		cancelSlot(slot);
		return;
	}
	cancelSlot("ear");
	cancelSlot("tail");
	cancelSlot("wing");
}

function roomHasOthers(): boolean {
	try {
		if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) return false;
		const me = Player && (Player as any).MemberNumber;
		for (let i = 0; i < ChatRoomCharacter.length; i++) {
			const C = ChatRoomCharacter[i] as any;
			if (C && typeof C.MemberNumber === "number" && C.MemberNumber !== me) return true;
		}
	} catch (e) { /* ignore */ }
	return false;
}

function currentAssetName(group: string): string {
	try {
		const item = typeof InventoryGet === "function" ? InventoryGet(Player, group) : null;
		if (item && item.Asset && item.Asset.Name) return String(item.Asset.Name);
	} catch (e) { /* ignore */ }
	return "";
}

function currentTypedState(group: string): string {
	try {
		const item = typeof InventoryGet === "function" ? InventoryGet(Player, group) : null;
		const typed = item && item.Property && item.Property.TypeRecord && item.Property.TypeRecord.typed;
		if (typed != null) return String(typed);
	} catch (e) { /* ignore */ }
	return "";
}

function coerceTyped(raw: string | undefined): string | number | undefined {
	if (raw == null || raw === "") return undefined;
	if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
	return raw;
}

function applyFrame(group: string, frame: SeidrWiggleFrame, syncWire: boolean): void {
	if (!frame || !frame.assetName || typeof InventoryWear !== "function") return;
	const wearName = seidrWiggleRealAssetName(frame.assetName);
	const wornName = currentAssetName(group);
	const wornTyped = currentTypedState(group);
	const nextTyped = frame.typedState != null ? String(frame.typedState) : "";
	if (seidrWiggleNameEquals(wornName, frame.assetName) && wornTyped === nextTyped) return;
	const color = frame.color !== undefined ? frame.color : undefined;
	let item: any;
	try {
		item = InventoryWear(Player, wearName, group, color, undefined, undefined, undefined, false);
	} catch (e) {
		try {
			item = InventoryWear(Player, wearName, group, color);
		} catch (e2) {
			return;
		}
	}
	if (item) {
		if (frame.property != null && typeof frame.property === "object") {
			try {
				item.Property = JSON.parse(JSON.stringify(frame.property));
			} catch (e) { /* ignore */ }
		}
		if (nextTyped !== "") {
			try {
				if (!item.Property) item.Property = {};
				if (!item.Property.TypeRecord) item.Property.TypeRecord = {};
				item.Property.TypeRecord.typed = coerceTyped(nextTyped);
			} catch (e) { /* ignore */ }
		}
	}
	try {
		if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false);
	} catch (e) { /* ignore */ }
	if (syncWire && typeof ChatRoomCharacterItemUpdate === "function") {
		try {
			ChatRoomCharacterItemUpdate(Player, group);
		} catch (e) { /* ignore */ }
	}
}

function buildPlayFrames(anim: SeidrAnimation, group: string): { primary: SeidrWiggleFrame; secondary: SeidrWiggleFrame } | null {
	if (!anim.primary || !anim.secondary) return null;
	const primary: SeidrWiggleFrame = {
		assetName: anim.primary.assetName,
		color: anim.primary.color,
		property: anim.primary.property,
		typedState: anim.primary.typedState,
	};
	const secondary: SeidrWiggleFrame = {
		assetName: anim.secondary.assetName,
		color: anim.secondary.color,
		property: anim.secondary.property,
		typedState: anim.secondary.typedState,
	};
	if (anim.colorMode === "autoupdate") {
		const worn = seidrCaptureWornFrame(Player, group);
		if (worn) {
			if (worn.color !== undefined) {
				primary.color = worn.color;
				secondary.color = worn.color;
			}
			if (worn.property !== undefined) {
				primary.property = worn.property;
			}
		}
	}
	return { primary: primary, secondary: secondary };
}

function clearSlotItem(group: string, syncWire: boolean): void {
	try {
		if (typeof InventoryRemove === "function") {
			InventoryRemove(Player, group, true);
		}
	} catch (e) {
		try {
			if (typeof InventoryRemove === "function") InventoryRemove(Player, group);
		} catch (e2) { /* ignore */ }
	}
	try {
		if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false);
	} catch (e3) { /* ignore */ }
	if (syncWire && typeof ChatRoomCharacterItemUpdate === "function") {
		try {
			ChatRoomCharacterItemUpdate(Player, group);
		} catch (e4) { /* ignore */ }
	}
}

/**
 * Settings → Wiggle → Test: if primary is not worn, stash the current slot item,
 * equip the wiggle primary, play, then restore (or clear) the slot.
 */
export function seidrPlayWiggleTest(
	anim: SeidrAnimation
): Promise<{ ok: boolean; error?: string; restored?: boolean }> {
	if (!anim || anim.kind !== "wiggle") {
		return Promise.resolve({ ok: false, error: "Not a wiggle animation" });
	}
	if (typeof Player === "undefined" || !Player) {
		return Promise.resolve({ ok: false, error: "Not logged in" });
	}
	if (!anim.primary || !anim.secondary || !anim.primary.assetName) {
		return Promise.resolve({ ok: false, error: "Incomplete wiggle frames" });
	}
	const slot = (anim.slot || "tail") as SeidrWiggleSlot;
	const preferGroup = anim.group || seidrWiggleBaseGroup(slot);
	if (!seidrWiggleCounterpartReady(anim, preferGroup)) {
		return Promise.resolve({ ok: false, error: SEIDR_WIGGLE_COUNTERPART_MISSING });
	}

	const syncWire = roomHasOthers();
	let restoreGroup: string | null = null;
	let restoreFrame: SeidrWiggleFrame | null = null;
	let didSwap = false;

	if (!seidrWigglePrimaryIsWorn(anim, Player)) {
		let group = preferGroup;
		let worn = seidrCaptureWornFrame(Player, preferGroup);
		if (!worn) {
			const groups = seidrWiggleGroupsForSlot(slot);
			for (let i = 0; i < groups.length; i++) {
				worn = seidrCaptureWornFrame(Player, groups[i]);
				if (worn) {
					group = groups[i];
					break;
				}
			}
		}
		restoreGroup = group;
		restoreFrame = worn ? seidrWornToFrame(worn) : null;
		const equip: SeidrWiggleFrame = {
			assetName: anim.primary.assetName,
			color: anim.primary.color,
			property: anim.primary.property,
			typedState: anim.primary.typedState,
		};
		applyFrame(group, equip, syncWire);
		if (!seidrWigglePrimaryIsWorn(anim, Player)) {
			return Promise.resolve({ ok: false, error: "Could not equip wiggle primary for test" });
		}
		didSwap = true;
	}

	return seidrPlayWiggle(anim).then(function (r) {
		if (didSwap && restoreGroup) {
			if (restoreFrame && restoreFrame.assetName) {
				applyFrame(restoreGroup, restoreFrame, syncWire);
			} else {
				clearSlotItem(restoreGroup, syncWire);
			}
		}
		return { ok: r.ok, error: r.error, restored: didSwap };
	});
}

/**
 * Run one slot's swap loop. Cancels only that slot (other slots keep playing).
 * Alternates secondary then primary (BCAR order).
 */
export function seidrPlayWiggle(anim: SeidrAnimation): Promise<{ ok: boolean; error?: string }> {
	if (!anim || anim.kind !== "wiggle") {
		return Promise.resolve({ ok: false, error: "Not a wiggle animation" });
	}
	if (typeof Player === "undefined" || !Player) {
		return Promise.resolve({ ok: false, error: "Not logged in" });
	}
	if (!seidrWigglePrimaryIsWorn(anim, Player)) {
		return Promise.resolve({ ok: false, error: "Configured item is not worn" });
	}
	const group = seidrResolveWigglePlayGroup(anim, Player);
	if (!group) {
		return Promise.resolve({ ok: false, error: "Configured item is not worn" });
	}
	if (!seidrWiggleCounterpartReady(anim, group)) {
		return Promise.resolve({ ok: false, error: SEIDR_WIGGLE_COUNTERPART_MISSING });
	}
	const frames = buildPlayFrames(anim, group);
	if (!frames) {
		return Promise.resolve({ ok: false, error: "Incomplete wiggle frames" });
	}
	const slot = (anim.slot || "tail") as SeidrWiggleSlot;
	const defs = SEIDR_WIGGLE_DEFAULTS[slot];
	const count = seidrClampWiggleCount(anim.count, defs.count);
	const delayMs = seidrClampWiggleDelayMs(anim.delayMs, defs.delayMs);
	const syncWire = roomHasOthers();

	cancelSlot(slot);
	const run = bySlot[slot];
	const gen = run.generation;
	run.playing = true;

	const sequence: SeidrWiggleFrame[] = [];
	for (let i = 0; i < count; i++) {
		sequence.push(i % 2 === 0 ? frames.secondary : frames.primary);
	}

	return new Promise(function (resolve) {
		let idx = 0;
		function finish(ok: boolean, error?: string) {
			if (gen === run.generation) run.playing = false;
			resolve(ok ? { ok: true } : { ok: false, error: error });
		}
		function tick() {
			if (gen !== run.generation) {
				finish(false, "Wiggle cancelled");
				return;
			}
			if (idx >= sequence.length) {
				finish(true);
				return;
			}
			applyFrame(group, sequence[idx], syncWire);
			idx++;
			if (idx >= sequence.length) {
				finish(true);
				return;
			}
			const t = setTimeout(tick, delayMs);
			run.timers.push(t);
		}
		tick();
	});
}

function slotsHaveCounterpartMissing(slots: SeidrWiggleSlot[]): boolean {
	const worn = seidrScanWornWiggleItems(Player);
	for (let i = 0; i < slots.length; i++) {
		const slot = slots[i];
		for (let w = 0; w < worn.length; w++) {
			if (worn[w].slot !== slot) continue;
			const anim = seidrFindWiggleByPrimary(slot, worn[w].assetName);
			if (!anim || !seidrWigglePrimaryIsWorn(anim, Player)) continue;
			const group = seidrResolveWigglePlayGroup(anim, Player);
			if (!seidrWiggleCounterpartReady(anim, group)) return true;
		}
	}
	return false;
}

/**
 * Play ready wiggle configs for the given slots in parallel.
 * Not worn → soft skip. Worn but counterpart missing and nothing else played → error.
 */
export function seidrPlayWiggleSlots(
	slots: SeidrWiggleSlot[]
): Promise<{ ok: boolean; played: number; error?: string }> {
	if (typeof Player === "undefined" || !Player) {
		return Promise.resolve({ ok: false, played: 0, error: "Not logged in" });
	}
	const want = seidrNormalizeWiggleSlots(slots);
	if (!want.length) {
		return Promise.resolve({ ok: true, played: 0 });
	}
	const ready = seidrReadyWiggleBySlot(Player);
	const jobs: Promise<{ ok: boolean; error?: string }>[] = [];
	for (let i = 0; i < want.length; i++) {
		const anim = ready[want[i]];
		if (anim) jobs.push(seidrPlayWiggle(anim));
	}
	if (!jobs.length) {
		if (slotsHaveCounterpartMissing(want)) {
			return Promise.resolve({ ok: false, played: 0, error: SEIDR_WIGGLE_COUNTERPART_MISSING });
		}
		return Promise.resolve({ ok: true, played: 0 });
	}
	return Promise.all(jobs).then(function (results) {
		let played = 0;
		for (let i = 0; i < results.length; i++) {
			if (results[i].ok) played++;
		}
		return { ok: true, played: played };
	});
}
