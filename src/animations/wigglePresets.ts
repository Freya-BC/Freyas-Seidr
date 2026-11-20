/** Stock Wiggle configs — merge missing on load (Autoupdate colors) */
import {
	SEIDR_WIGGLES_MAX,
	SEIDR_WIGGLE_DEFAULTS,
	SEIDR_WIGGLE_SLOTS,
	seidrCountWiggleAnimations,
	type SeidrAnimation,
	type SeidrAnimationsBag,
	type SeidrWiggleFrame,
	type SeidrWiggleSlot,
} from "./model";
import {
	SEIDR_WIGGLE_PRIMARY_TO_MIRROR,
	seidrWiggleCanonicalName,
	seidrWiggleNameEquals,
	seidrWiggleTypedOptionCount,
} from "./wiggleSlots";

type StockPair = {
	slot: SeidrWiggleSlot;
	primary: string;
	secondary: string;
	label: string;
	primaryTyped?: string;
	secondaryTyped?: string;
};

/** Friendly labels for common primaries (fallback: asset name). */
const PRIMARY_LABEL: Record<string, string> = {
	KittenTailStrap1: "Light Kitten",
	KittenTailStrap2: "Fluffy Kitten",
	PuppyTailStrap: "Puppy",
	PuppyTailStrap1: "Fluffy Puppy",
	WolfTailStrap1: "Wolf Large",
	WolfTailStrap2: "Wolf Small",
	WolfTailStrap3: "Wolf White",
	TailStrap: "Kitty",
	RaccoonStrap: "Raccoon",
	SnowLeopardTail: "Snow Leopard",
	KittenEars1: "Black Kitty High",
	BunnyEars1: "Bunny",
	ElfEars: "Elf",
	MouseEars1: "Mouse",
	DragonWings: "Dragon",
};

/** Stock ear pairs (no Fox / Wolf / Puppy / Ears1). */
const EAR_SIBLINGS: { primary: string; secondary: string; label: string }[] = [
	// Club High ↔ Echo HA2 (not Club HA1 BlackCatEarsMirror / Low)
	{ primary: "KittenEars1", secondary: "BlackKittyEarsEcho", label: "Black Kitty High" },
	// Club BunnyEars1 ↔ Echo Droopy Bunny Ears
	{ primary: "BunnyEars1", secondary: "DroopyBunnyEars", label: "Bunny" },
	{ primary: "ElfEars", secondary: "ElfEars2", label: "Elf" },
	{ primary: "MouseEars1", secondary: "MouseEars2", label: "Mouse" },
];

/** Removed from stock — delete matching bag entries on merge. */
const EAR_STOCK_REMOVED: string[] = [
	"WolfEars1",
	"FoxEars1",
	"PuppyEars1",
	"Ears1",
];

function baseGroup(slot: SeidrWiggleSlot): string {
	const meta = SEIDR_WIGGLE_SLOTS.find(function (s) { return s.id === slot; });
	return meta ? meta.baseGroup : "TailStraps";
}

function slotPrefix(slot: SeidrWiggleSlot): string {
	if (slot === "ear") return "Ear";
	if (slot === "wing") return "Wing";
	return "Tail";
}

function buildStockPairs(): StockPair[] {
	const out: StockPair[] = [];
	const seen: Record<string, boolean> = {};

	function push(p: StockPair) {
		const key = p.slot + "::" + p.primary;
		if (seen[key]) return;
		seen[key] = true;
		out.push(p);
	}

	const primaries = Object.keys(SEIDR_WIGGLE_PRIMARY_TO_MIRROR);
	for (let i = 0; i < primaries.length; i++) {
		const primary = primaries[i];
		const secondary = SEIDR_WIGGLE_PRIMARY_TO_MIRROR[primary];
		let slot: SeidrWiggleSlot = "tail";
		if (primary === "ElfEars" || primary.indexOf("Ears") >= 0 || primary === "BlackKittyEarsEcho") {
			slot = "ear";
		}
		if (slot === "ear") continue;
		// Light Kitten / Fox / Raccoon straps: TL↔TR typed on the same asset (not Echo mirror)
		const typedN = seidrWiggleTypedOptionCount(baseGroup(slot), primary);
		if (typedN >= 2) {
			push({
				slot: slot,
				primary: primary,
				secondary: primary,
				label: PRIMARY_LABEL[primary] || primary,
				primaryTyped: "0",
				secondaryTyped: "1",
			});
			continue;
		}
		push({
			slot: slot,
			primary: primary,
			secondary: secondary,
			label: PRIMARY_LABEL[primary] || primary,
		});
	}

	for (let e = 0; e < EAR_SIBLINGS.length; e++) {
		const row = EAR_SIBLINGS[e];
		push({
			slot: "ear",
			primary: row.primary,
			secondary: row.secondary,
			label: row.label,
		});
	}

	push({
		slot: "wing",
		primary: "DragonWings",
		secondary: "DragonWings",
		label: "Dragon",
		primaryTyped: "0",
		secondaryTyped: "1",
	});

	return out;
}

function stockToAnimation(id: number, pair: StockPair): SeidrAnimation {
	const defs = SEIDR_WIGGLE_DEFAULTS[pair.slot];
	const primary: SeidrWiggleFrame = { assetName: pair.primary };
	const secondary: SeidrWiggleFrame = { assetName: pair.secondary };
	if (pair.primaryTyped != null) primary.typedState = pair.primaryTyped;
	if (pair.secondaryTyped != null) secondary.typedState = pair.secondaryTyped;
	return {
		id: id,
		name: (slotPrefix(pair.slot) + " · " + pair.label).slice(0, 40),
		kind: "wiggle",
		steps: [],
		chatText: "",
		slot: pair.slot,
		group: baseGroup(pair.slot),
		primary: primary,
		secondary: secondary,
		colorMode: "autoupdate",
		count: defs.count,
		delayMs: defs.delayMs,
	};
}

function hasWigglePrimary(bag: SeidrAnimationsBag, slot: SeidrWiggleSlot, assetName: string): boolean {
	for (let i = 0; i < bag.list.length; i++) {
		const a = bag.list[i];
		if (a.kind === "wiggle" && a.slot === slot && a.primary &&
			seidrWiggleNameEquals(a.primary.assetName, assetName)) {
			return true;
		}
	}
	return false;
}

/** Rewrite Chinese Echo Names → English ids; fix known wrong secondaries. */
function repairWiggleFrames(bag: SeidrAnimationsBag): number {
	let fixed = 0;
	for (let i = 0; i < bag.list.length; i++) {
		const a = bag.list[i];
		if (a.kind !== "wiggle") continue;
		let changed = false;
		if (a.primary && a.primary.assetName) {
			const c = seidrWiggleCanonicalName(a.primary.assetName);
			if (c !== a.primary.assetName) {
				a.primary.assetName = c;
				changed = true;
			}
		}
		if (a.secondary && a.secondary.assetName) {
			let c = seidrWiggleCanonicalName(a.secondary.assetName);
			// Club HA1 Low was wrongly stocked as High's secondary
			if (a.primary && seidrWiggleNameEquals(a.primary.assetName, "KittenEars1") &&
				(c === "BlackCatEarsMirror" || a.secondary.assetName === "BlackCatEarsMirror")) {
				c = "BlackKittyEarsEcho";
			}
			// Bunny stock secondary is Echo Droopy, not Club BunnyEars2 / FloppyBunnyEars
			if (a.primary && seidrWiggleNameEquals(a.primary.assetName, "BunnyEars1") &&
				(c === "BunnyEars2" || c === "FloppyBunnyEars" ||
					a.secondary.assetName === "BunnyEars2" ||
					a.secondary.assetName === "FloppyBunnyEars")) {
				c = "DroopyBunnyEars";
			}
			// Typed tails (Kitten TL↔TR etc.): migrate old Echo-mirror stock → same asset 0↔1
			if (a.primary && a.slot === "tail") {
				const pCanon = seidrWiggleCanonicalName(a.primary.assetName);
				const mirror = SEIDR_WIGGLE_PRIMARY_TO_MIRROR[pCanon];
				const typedN = seidrWiggleTypedOptionCount(baseGroup("tail"), pCanon);
				if (typedN >= 2 && mirror && seidrWiggleNameEquals(c, mirror)) {
					a.secondary.assetName = pCanon;
					a.secondary.typedState = "1";
					if (a.primary.typedState == null || String(a.primary.typedState).trim() === "") {
						a.primary.typedState = "0";
					}
					changed = true;
					c = pCanon;
				}
			}
			if (c !== a.secondary.assetName) {
				a.secondary.assetName = c;
				changed = true;
			}
		}
		if (changed) fixed++;
	}
	return fixed;
}

function pruneRemovedEarStock(bag: SeidrAnimationsBag): number {
	const before = bag.list.length;
	bag.list = bag.list.filter(function (a) {
		if (a.kind !== "wiggle" || a.slot !== "ear" || !a.primary) return true;
		const name = seidrWiggleCanonicalName(a.primary.assetName);
		for (let i = 0; i < EAR_STOCK_REMOVED.length; i++) {
			if (seidrWiggleNameEquals(name, EAR_STOCK_REMOVED[i])) return false;
		}
		return true;
	});
	return before - bag.list.length;
}

/**
 * Append stock wiggles missing from the bag. Does not overwrite existing primaries.
 * Repairs English ids / secondaries; prunes retired ear stock.
 */
export function seidrMergeStockWiggles(bag: SeidrAnimationsBag): { bag: SeidrAnimationsBag; added: number } {
	const pruned = pruneRemovedEarStock(bag);
	const repaired = repairWiggleFrames(bag);
	const pairs = buildStockPairs();
	let added = 0;
	let nextId = bag.nextId;
	for (let i = 0; i < pairs.length; i++) {
		if (seidrCountWiggleAnimations(bag.list) >= SEIDR_WIGGLES_MAX) break;
		const p = pairs[i];
		if (hasWigglePrimary(bag, p.slot, p.primary)) continue;
		const anim = stockToAnimation(nextId, p);
		nextId = anim.id + 1;
		bag.list.push(anim);
		added++;
	}
	bag.nextId = nextId;
	return { bag: bag, added: added + pruned + (repaired > 0 ? repaired : 0) };
}
