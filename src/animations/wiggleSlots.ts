/** Ear / Tail / Wing group resolution, worn scan, Echo mirror automatch */
import {
	SEIDR_WIGGLE_SLOTS,
	type SeidrAnimation,
	type SeidrWiggleFrame,
	type SeidrWiggleSlot,
} from "./model";
import { seidrListAnimations } from "./store";

declare const Player: any;
declare const InventoryGet: any;
declare const Asset: any;
declare const AssetGet: any;
declare const ExtendedArchetype: any;

/** Same Echo group suffixes as undress.ts */
const ECHO_SUFFIXES = ["_笨笨蛋Luzi", "_笨笨笨蛋Luzi2"];

export type SeidrWornWiggleItem = {
	slot: SeidrWiggleSlot;
	group: string;
	assetName: string;
	description: string;
	color: string | string[] | undefined;
	property: unknown;
	typedState: string | undefined;
};

function slotMeta(slot: SeidrWiggleSlot) {
	return SEIDR_WIGGLE_SLOTS.find(function (s) { return s.id === slot; }) || SEIDR_WIGGLE_SLOTS[1];
}

export function seidrWiggleBaseGroup(slot: SeidrWiggleSlot): string {
	return slotMeta(slot).baseGroup;
}

/** Candidate appearance groups for a slot (vanilla + Echo aliases). */
export function seidrWiggleGroupsForSlot(slot: SeidrWiggleSlot): string[] {
	const base = seidrWiggleBaseGroup(slot);
	const groups = [base];
	for (let i = 0; i < ECHO_SUFFIXES.length; i++) {
		groups.push(base + ECHO_SUFFIXES[i]);
	}
	// Echo clothing-ext also uses Luzi_TailStraps_0 style for some copies
	if (slot === "tail") {
		groups.push("Luzi_TailStraps_0");
		groups.push("Luzi_TailStraps_1");
	}
	if (slot === "wing") {
		groups.push("Wings_笨笨蛋Luzi");
	}
	return groups;
}

function itemDescription(item: any): string {
	try {
		if (item && item.Asset) {
			if (item.Asset.Description) return String(item.Asset.Description);
			if (item.Asset.Name) return String(item.Asset.Name);
		}
	} catch (e) { /* ignore */ }
	return "";
}

function itemTypedState(item: any): string | undefined {
	try {
		const typed = item && item.Property && item.Property.TypeRecord && item.Property.TypeRecord.typed;
		if (typed != null && String(typed).trim()) return String(typed);
	} catch (e) { /* ignore */ }
	return undefined;
}

export function seidrCaptureWornFrame(character: any, group: string): SeidrWornWiggleItem | null {
	if (!character || !group || typeof InventoryGet !== "function") return null;
	let item: any;
	try {
		item = InventoryGet(character, group);
	} catch (e) {
		return null;
	}
	if (!item || !item.Asset || !item.Asset.Name) return null;
	const slotEntry = SEIDR_WIGGLE_SLOTS.find(function (s) {
		return seidrWiggleGroupsForSlot(s.id).indexOf(group) >= 0;
	});
	if (!slotEntry) return null;
	let color: string | string[] | undefined;
	try {
		if (typeof item.Color === "string" || Array.isArray(item.Color)) color = item.Color;
	} catch (e) { /* ignore */ }
	let property: unknown;
	try {
		if (item.Property && typeof item.Property === "object") {
			property = JSON.parse(JSON.stringify(item.Property));
		}
	} catch (e) { /* ignore */ }
	return {
		slot: slotEntry.id,
		group: group,
		assetName: String(item.Asset.Name),
		description: itemDescription(item) || String(item.Asset.Name),
		color: color,
		property: property,
		typedState: itemTypedState(item),
	};
}

/** All currently worn ear/tail/wing items across Echo aliases. */
export function seidrScanWornWiggleItems(character?: any): SeidrWornWiggleItem[] {
	const C = character || (typeof Player !== "undefined" ? Player : null);
	if (!C) return [];
	const out: SeidrWornWiggleItem[] = [];
	const seen: Record<string, boolean> = {};
	for (let s = 0; s < SEIDR_WIGGLE_SLOTS.length; s++) {
		const slot = SEIDR_WIGGLE_SLOTS[s].id;
		const groups = seidrWiggleGroupsForSlot(slot);
		for (let g = 0; g < groups.length; g++) {
			const worn = seidrCaptureWornFrame(C, groups[g]);
			if (!worn) continue;
			const key = worn.group + "::" + worn.assetName;
			if (seen[key]) continue;
			seen[key] = true;
			out.push(worn);
		}
	}
	return out;
}

export function seidrWornToFrame(worn: SeidrWornWiggleItem): SeidrWiggleFrame {
	const frame: SeidrWiggleFrame = { assetName: seidrWiggleCanonicalName(worn.assetName) };
	if (worn.color !== undefined) frame.color = worn.color;
	if (worn.property !== undefined) frame.property = worn.property;
	if (worn.typedState) frame.typedState = worn.typedState;
	return frame;
}

/** Names that count as the same wardrobe asset (English id + Chinese Echo Name). */
export function seidrWiggleNameEquals(a: string, b: string): boolean {
	if (!a || !b) return false;
	if (a === b) return true;
	return seidrWiggleCanonicalName(a) === seidrWiggleCanonicalName(b);
}

/**
 * Echo assets whose Club/Asset Name is still Chinese. Seidr stores English ids;
 * wear / AssetGet resolve through this map.
 */
export const SEIDR_WIGGLE_ECHO_REAL_NAME: Record<string, string> = {
	PuppyTailStrapMirror: "穿戴式狗尾镜像",
	WolfTailStrap3Mirror: "白色穿戴式狼尾镜像",
	KittenTailStrap1Mirror: "穿戴式浅色猫尾镜像",
	PuppyTailStrap1Mirror: "穿戴式软小狗尾镜像",
	WolfTailStrap1Mirror: "大型穿戴式狼尾镜像",
	WolfTailStrap2Mirror: "小型穿戴式狼尾镜像",
	KittenTailStrap2Mirror: "小型穿戴式软猫尾镜像",
	TailStrapMirror: "穿戴式猫尾镜像",
	RaccoonStrapMirror: "穿戴式浣熊尾镜像",
	SnowLeopardTail: "雪豹尾巴",
	SnowLeopardTailMirror: "雪豹尾巴镜像",
	/** Echo HA2 sibling of Club KittenEars1 (High) — not Club HA1 BlackCatEarsMirror (Low). */
	BlackKittyEarsEcho: "黑猫耳镜像",
	ElfEars2: "精灵耳2",
	/** Echo EN "Droopy Bunny Ears" — sibling of Club BunnyEars1. */
	DroopyBunnyEars: "耷拉下来的耳朵",
};

/** Chinese Echo Name → English Seidr id. */
export const SEIDR_WIGGLE_ECHO_ENGLISH_ID: Record<string, string> = (function () {
	const out: Record<string, string> = {};
	const keys = Object.keys(SEIDR_WIGGLE_ECHO_REAL_NAME);
	for (let i = 0; i < keys.length; i++) {
		out[SEIDR_WIGGLE_ECHO_REAL_NAME[keys[i]]] = keys[i];
	}
	return out;
})();

/** English labels for Seidr ids / known assets (UI; never show Chinese Names). */
export const SEIDR_WIGGLE_ASSET_LABEL: Record<string, string> = {
	PuppyTailStrapMirror: "Puppy Tail Strap (Mirror)",
	WolfTailStrap3Mirror: "Wolf White Tail Strap (Mirror)",
	KittenTailStrap1Mirror: "Light Kitten Tail Strap (Mirror)",
	PuppyTailStrap1Mirror: "Puppy Fluffy Tail Strap (Mirror)",
	WolfTailStrap1Mirror: "Wolf Large Tail Strap (Mirror)",
	WolfTailStrap2Mirror: "Wolf Small Tail Strap (Mirror)",
	KittenTailStrap2Mirror: "Small Fluffy Kitten Tail Strap (Mirror)",
	TailStrapMirror: "Kitty Tail Strap (Mirror)",
	RaccoonStrapMirror: "Raccoon Tail Strap (Mirror)",
	SnowLeopardTail: "Snow Leopard Tail",
	SnowLeopardTailMirror: "Snow Leopard Tail (Mirror)",
	BlackKittyEarsEcho: "Black Kitty Ears - Echo",
	ElfEars2: "Elf Ears 2",
	DroopyBunnyEars: "Droopy Bunny Ears",
	KittenEars1: "Black Kitty Ears - High",
	BlackCatEarsMirror: "Black Kitty Ears - Low",
	ElfEars: "Elf Ears",
	BunnyEars1: "Bunny Ears",
};

/** Canonical English id for storage / compare (maps Chinese Names → English ids). */
export function seidrWiggleCanonicalName(assetName: string): string {
	const raw = String(assetName || "");
	if (!raw) return raw;
	if (SEIDR_WIGGLE_ECHO_ENGLISH_ID[raw]) return SEIDR_WIGGLE_ECHO_ENGLISH_ID[raw];
	return raw;
}

/** Real Club/Echo Asset Name for InventoryWear / AssetGet. */
export function seidrWiggleRealAssetName(assetName: string): string {
	const raw = String(assetName || "");
	if (!raw) return raw;
	if (SEIDR_WIGGLE_ECHO_REAL_NAME[raw]) return SEIDR_WIGGLE_ECHO_REAL_NAME[raw];
	return raw;
}

/** UI label — prefer English map, then Club Description. */
export function seidrWiggleAssetLabel(assetName: string, fallbackDesc?: string): string {
	const canon = seidrWiggleCanonicalName(assetName);
	if (SEIDR_WIGGLE_ASSET_LABEL[canon]) return SEIDR_WIGGLE_ASSET_LABEL[canon];
	if (fallbackDesc && fallbackDesc !== assetName && !/[\u4e00-\u9fff]/.test(fallbackDesc)) {
		return fallbackDesc;
	}
	return canon;
}

/**
 * Secondary → primary for automatch / stock (English ids).
 * Black Kitty High ↔ Echo (HA2); Club Low (BlackCatEarsMirror) is a different HA1 asset.
 */
export const SEIDR_WIGGLE_MIRROR_TO_PRIMARY: Record<string, string> = {
	PuppyTailStrapMirror: "PuppyTailStrap",
	WolfTailStrap3Mirror: "WolfTailStrap3",
	KittenTailStrap1Mirror: "KittenTailStrap1",
	PuppyTailStrap1Mirror: "PuppyTailStrap1",
	WolfTailStrap1Mirror: "WolfTailStrap1",
	WolfTailStrap2Mirror: "WolfTailStrap2",
	KittenTailStrap2Mirror: "KittenTailStrap2",
	TailStrapMirror: "TailStrap",
	RaccoonStrapMirror: "RaccoonStrap",
	SnowLeopardTailMirror: "SnowLeopardTail",
	BlackKittyEarsEcho: "KittenEars1",
	ElfEars2: "ElfEars",
};

/** Primary → secondary (mirror / sibling / Echo). */
export const SEIDR_WIGGLE_PRIMARY_TO_MIRROR: Record<string, string> = (function () {
	const out: Record<string, string> = {};
	const keys = Object.keys(SEIDR_WIGGLE_MIRROR_TO_PRIMARY);
	for (let i = 0; i < keys.length; i++) {
		out[SEIDR_WIGGLE_MIRROR_TO_PRIMARY[keys[i]]] = keys[i];
	}
	return out;
})();

const ECHO_MIRROR_TO_PRIMARY = SEIDR_WIGGLE_MIRROR_TO_PRIMARY;
const ECHO_PRIMARY_TO_MIRROR = SEIDR_WIGGLE_PRIMARY_TO_MIRROR;

function stripMirrorMarkers(s: string): string {
	return String(s || "")
		.replace(/\(镜像\)/g, "")
		.replace(/镜像/g, "")
		.replace(/\(Mirror\)/gi, "")
		.replace(/\bMirror\b/gi, "")
		.replace(/_Luzi$/i, "")
		.replace(/[:：]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function looksLikeMirror(name: string, desc: string): boolean {
	const s = (name + " " + desc).toLowerCase();
	return s.indexOf("镜像") >= 0 || s.indexOf("mirror") >= 0;
}

function assetDescription(group: string, name: string): string {
	try {
		if (typeof AssetGet === "function") {
			const a = AssetGet("Female3DCG", group, name);
			if (a && a.Description) return String(a.Description);
		}
	} catch (e) { /* ignore */ }
	return name;
}

type AssetCandidate = { name: string; description: string };

function listAssetsInGroup(group: string): AssetCandidate[] {
	const out: AssetCandidate[] = [];
	const seen: Record<string, boolean> = {};
	function push(name: string, description: string) {
		if (!name || seen[name]) return;
		seen[name] = true;
		out.push({ name: name, description: description || name });
	}
	try {
		if (typeof Asset !== "undefined" && Array.isArray(Asset)) {
			for (let i = 0; i < Asset.length; i++) {
				const a = Asset[i] as any;
				if (!a || !a.Name) continue;
				const g = a.Group && (a.Group.Name || a.Group);
				if (String(g) !== group && String(a.GroupName || "") !== group) continue;
				push(String(a.Name), a.Description ? String(a.Description) : String(a.Name));
			}
		}
	} catch (e) { /* ignore */ }
	try {
		const bag = (window as any).AssetFemale3DCG;
		if (bag && typeof bag === "object") {
			const list = bag[group];
			if (Array.isArray(list)) {
				for (let j = 0; j < list.length; j++) {
					const a = list[j] as any;
					if (!a || !a.Name) continue;
					push(String(a.Name), a.Description ? String(a.Description) : String(a.Name));
				}
			}
		}
	} catch (e2) { /* ignore */ }
	// Known Echo mirrors may exist even if Asset enumeration missed them
	const echoNames = Object.keys(ECHO_MIRROR_TO_PRIMARY);
	for (let e = 0; e < echoNames.length; e++) {
		const n = echoNames[e];
		try {
			if (typeof AssetGet === "function" && AssetGet("Female3DCG", group, n)) {
				push(n, assetDescription(group, n));
			}
		} catch (err) { /* ignore */ }
	}
	return out;
}

function scoreMirrorMatch(
	primaryName: string,
	primaryDesc: string,
	candidate: AssetCandidate
): number {
	const pCanon = seidrWiggleCanonicalName(primaryName);
	const cCanon = seidrWiggleCanonicalName(candidate.name);
	if (seidrWiggleNameEquals(candidate.name, primaryName)) return 0;
	const mirror = looksLikeMirror(candidate.name, candidate.description);
	// Explicit Echo preview pairs (highest confidence)
	if (ECHO_PRIMARY_TO_MIRROR[pCanon] === cCanon) return 100;
	if (ECHO_MIRROR_TO_PRIMARY[cCanon] === pCanon) return 100;
	if (ECHO_PRIMARY_TO_MIRROR[cCanon] === pCanon) return 100;
	if (ECHO_MIRROR_TO_PRIMARY[pCanon] === cCanon) return 100;
	// Same-script: primary+"镜像" or strip-equal
	if (candidate.name === primaryName + "镜像" || primaryName === candidate.name + "镜像") return 90;
	const pKey = stripMirrorMarkers(primaryName);
	const cKey = stripMirrorMarkers(candidate.name);
	if (mirror && pKey && cKey && pKey === cKey) return 85;
	// Description: "Puppy Tail Strap (Mirror)" ↔ "Puppy Tail Strap"
	const pDesc = stripMirrorMarkers(primaryDesc || primaryName);
	const cDesc = stripMirrorMarkers(candidate.description || candidate.name);
	if (mirror && pDesc && cDesc && pDesc === cDesc) return 80;
	if (mirror && pDesc && cDesc && (cDesc.indexOf(pDesc) >= 0 || pDesc.indexOf(cDesc) >= 0) &&
		Math.min(pDesc.length, cDesc.length) >= 4) {
		return 60;
	}
	if (mirror && pKey && cKey && (cKey.indexOf(pKey) >= 0 || pKey.indexOf(cKey) >= 0) &&
		Math.min(pKey.length, cKey.length) >= 2) {
		return 40;
	}
	return 0;
}

/** Assets available for secondary picker (prefer mirror matches first). */
export function seidrListWiggleSecondaryCandidates(
	slot: SeidrWiggleSlot,
	group: string,
	primaryAssetName: string
): { name: string; description: string; automatch: boolean }[] {
	const baseGroup = seidrWiggleBaseGroup(slot);
	const candidates = listAssetsInGroup(group).concat(
		group !== baseGroup ? listAssetsInGroup(baseGroup) : []
	);
	const primaryDesc = assetDescription(baseGroup, primaryAssetName) ||
		assetDescription(group, primaryAssetName);
	const out: { name: string; description: string; automatch: boolean; score: number }[] = [];
	const seen: Record<string, boolean> = {};
	let bestScore = 0;
	for (let i = 0; i < candidates.length; i++) {
		const c = candidates[i];
		const cCanon = seidrWiggleCanonicalName(c.name);
		if (seen[cCanon] || seidrWiggleNameEquals(c.name, primaryAssetName)) continue;
		seen[cCanon] = true;
		seen[c.name] = true;
		const score = scoreMirrorMatch(primaryAssetName, primaryDesc, c);
		if (score > bestScore) bestScore = score;
		out.push({
			name: cCanon,
			description: seidrWiggleAssetLabel(cCanon, c.description),
			automatch: false,
			score: score,
		});
	}
	// Also inject known Echo mirror for this primary even if not enumerated
	const knownMirror = ECHO_PRIMARY_TO_MIRROR[seidrWiggleCanonicalName(primaryAssetName)];
	if (knownMirror && !seen[knownMirror] && !seen[seidrWiggleRealAssetName(knownMirror)]) {
		out.push({
			name: knownMirror,
			description: seidrWiggleAssetLabel(knownMirror),
			automatch: false,
			score: 100,
		});
		bestScore = 100;
	}
	if (bestScore > 0) {
		for (let j = 0; j < out.length; j++) {
			if (out[j].score === bestScore) out[j].automatch = true;
		}
	}
	out.sort(function (a, b) {
		if (a.automatch !== b.automatch) return a.automatch ? -1 : 1;
		if (b.score !== a.score) return b.score - a.score;
		return a.description.localeCompare(b.description);
	});
	return out.map(function (o) {
		const canon = seidrWiggleCanonicalName(o.name);
		return {
			name: canon,
			description: seidrWiggleAssetLabel(canon, o.description),
			automatch: o.automatch,
		};
	});
}

/** BCAR wing flap often uses the same asset with another typed option (e.g. DragonWings Spread↔Folded). */
function typedOptionCount(group: string, assetName: string): number {
	try {
		const bag = (window as any).AssetFemale3DCGExtended;
		const cfg = bag && bag[group] && bag[group][assetName];
		if (cfg && Array.isArray(cfg.Options) && cfg.Options.length >= 2) {
			const arch = cfg.Archetype;
			const isTyped = arch === "typed" ||
				(typeof ExtendedArchetype !== "undefined" && arch === (ExtendedArchetype as any).TYPED);
			if (isTyped) return cfg.Options.length;
		}
	} catch (e) { /* ignore */ }
	try {
		if (typeof AssetGet === "function") {
			const a = AssetGet("Female3DCG", group, assetName) as any;
			if (a && Array.isArray(a.CreateLayerTypes) && a.CreateLayerTypes.indexOf("typed") >= 0) {
				const data = a.ArchetypeData;
				if (data && Array.isArray(data.options) && data.options.length >= 2) {
					return data.options.length;
				}
				// DragonWings / SteampunkWings: at least two typed layers exist
				return 2;
			}
		}
	} catch (e2) { /* ignore */ }
	return 0;
}

export type SeidrWiggleAutomatch = {
	assetName: string;
	typedState?: string;
};

/**
 * Prefer Echo mirror asset; else for typed wings (etc.) the alternate TypeRecord.typed
 * on the same asset (0↔1), matching BCAR wing1/wing2 snapshots.
 */
export function seidrFindAutomatchSecondaryFrame(
	slot: SeidrWiggleSlot,
	group: string,
	primaryAssetName: string,
	primaryTypedState?: string
): SeidrWiggleAutomatch | null {
	const pCanon = seidrWiggleCanonicalName(primaryAssetName);
	if (ECHO_PRIMARY_TO_MIRROR[pCanon]) {
		return { assetName: ECHO_PRIMARY_TO_MIRROR[pCanon] };
	}
	if (ECHO_MIRROR_TO_PRIMARY[pCanon]) {
		return { assetName: ECHO_MIRROR_TO_PRIMARY[pCanon] };
	}
	const list = seidrListWiggleSecondaryCandidates(slot, group, primaryAssetName);
	for (let i = 0; i < list.length; i++) {
		if (list[i].automatch) return { assetName: list[i].name };
	}
	const n = typedOptionCount(group, primaryAssetName);
	if (n >= 2) {
		const cur = primaryTypedState != null && String(primaryTypedState).trim() !== ""
			? parseInt(String(primaryTypedState), 10)
			: 0;
		const curN = Number.isFinite(cur) ? cur : 0;
		// Prefer 0↔1 (Spread↔Folded on DragonWings); wrap if needed
		let alt = curN === 0 ? 1 : 0;
		if (alt >= n) alt = curN === 0 ? Math.min(1, n - 1) : 0;
		if (alt === curN && n > 1) alt = (curN + 1) % n;
		return { assetName: primaryAssetName, typedState: String(alt) };
	}
	return null;
}

/** @deprecated Prefer seidrFindAutomatchSecondaryFrame — returns asset name only. */
export function seidrFindAutomatchSecondary(
	slot: SeidrWiggleSlot,
	group: string,
	primaryAssetName: string
): string | null {
	const f = seidrFindAutomatchSecondaryFrame(slot, group, primaryAssetName);
	return f ? f.assetName : null;
}

function seidrWiggleAssetNamesToTry(assetName: string): string[] {
	const canon = seidrWiggleCanonicalName(assetName);
	const real = seidrWiggleRealAssetName(canon);
	const names: string[] = [];
	function push(n: string) {
		if (n && names.indexOf(n) < 0) names.push(n);
	}
	push(canon);
	push(real);
	push(assetName);
	return names;
}

/** True if AssetGet finds the named asset (or alias) on group / base group. */
export function seidrWiggleAssetLoadable(group: string, assetName: string): boolean {
	if (!group || !assetName || typeof AssetGet !== "function") return false;
	const names = seidrWiggleAssetNamesToTry(assetName);
	const groups = [group];
	const base = seidrWiggleBaseGroupFromGroup(group);
	if (base && base !== group) groups.push(base);
	for (let g = 0; g < groups.length; g++) {
		for (let n = 0; n < names.length; n++) {
			try {
				if (AssetGet("Female3DCG", groups[g], names[n])) return true;
			} catch (e) { /* ignore */ }
		}
	}
	return false;
}

function seidrWiggleBaseGroupFromGroup(group: string): string {
	for (let i = 0; i < SEIDR_WIGGLE_SLOTS.length; i++) {
		const groups = seidrWiggleGroupsForSlot(SEIDR_WIGGLE_SLOTS[i].id);
		if (groups.indexOf(group) >= 0) return SEIDR_WIGGLE_SLOTS[i].baseGroup;
	}
	return group;
}

/**
 * Secondary frame is usable: different asset that loads, or same asset with different typed state.
 */
export function seidrWiggleCounterpartReady(anim: SeidrAnimation, playGroup?: string | null): boolean {
	if (!anim || anim.kind !== "wiggle" || !anim.primary || !anim.secondary) return false;
	const group = playGroup || anim.group || (anim.slot ? seidrWiggleBaseGroup(anim.slot) : "");
	if (!group) return false;
	const primaryName = anim.primary.assetName;
	const secondaryName = anim.secondary.assetName;
	if (!primaryName || !secondaryName) return false;
	if (!seidrWiggleAssetLoadable(group, primaryName)) return false;
	const pTyped = anim.primary.typedState != null ? String(anim.primary.typedState) : "";
	const sTyped = anim.secondary.typedState != null ? String(anim.secondary.typedState) : "";
	if (seidrWiggleNameEquals(secondaryName, primaryName)) {
		return sTyped !== "" && sTyped !== pTyped;
	}
	return seidrWiggleAssetLoadable(group, secondaryName);
}

export const SEIDR_WIGGLE_COUNTERPART_MISSING = "Asset counterpart is missing";

/** Whether primary of this wiggle is currently worn on its group (or Echo aliases). */
export function seidrWigglePrimaryIsWorn(anim: SeidrAnimation, character?: any): boolean {
	if (!anim || anim.kind !== "wiggle" || !anim.primary || !anim.primary.assetName) return false;
	const C = character || (typeof Player !== "undefined" ? Player : null);
	if (!C) return false;
	const want = anim.primary.assetName;
	const groups = anim.group
		? [anim.group].concat(
			anim.slot ? seidrWiggleGroupsForSlot(anim.slot).filter(function (g) { return g !== anim.group; }) : []
		)
		: (anim.slot ? seidrWiggleGroupsForSlot(anim.slot) : []);
	for (let i = 0; i < groups.length; i++) {
		const worn = seidrCaptureWornFrame(C, groups[i]);
		if (worn && seidrWiggleNameEquals(worn.assetName, want)) return true;
	}
	return false;
}

/** Resolve actual group where the primary is worn (prefer configured group). */
export function seidrResolveWigglePlayGroup(anim: SeidrAnimation, character?: any): string | null {
	if (!anim || anim.kind !== "wiggle" || !anim.primary) return null;
	const C = character || (typeof Player !== "undefined" ? Player : null);
	if (!C) return null;
	const want = anim.primary.assetName;
	if (anim.group) {
		const onCfg = seidrCaptureWornFrame(C, anim.group);
		if (onCfg && seidrWiggleNameEquals(onCfg.assetName, want)) return anim.group;
	}
	if (!anim.slot) return anim.group || null;
	const groups = seidrWiggleGroupsForSlot(anim.slot);
	for (let i = 0; i < groups.length; i++) {
		const worn = seidrCaptureWornFrame(C, groups[i]);
		if (worn && seidrWiggleNameEquals(worn.assetName, want)) return groups[i];
	}
	return null;
}

export function seidrFindWiggleByPrimary(
	slot: SeidrWiggleSlot,
	assetName: string
): SeidrAnimation | null {
	const key = seidrWiggleCanonicalName(String(assetName || ""));
	const list = seidrListAnimations();
	for (let i = 0; i < list.length; i++) {
		const a = list[i];
		if (a.kind === "wiggle" && a.slot === slot && a.primary &&
			seidrWiggleNameEquals(a.primary.assetName, key)) {
			return a;
		}
	}
	return null;
}

/** Ready wiggle animations for currently worn items (one per slot family for Fast Wiggle). */
export function seidrReadyWiggleBySlot(character?: any): Partial<Record<SeidrWiggleSlot, SeidrAnimation>> {
	const worn = seidrScanWornWiggleItems(character);
	const out: Partial<Record<SeidrWiggleSlot, SeidrAnimation>> = {};
	for (let i = 0; i < worn.length; i++) {
		const w = worn[i];
		if (out[w.slot]) continue;
		const anim = seidrFindWiggleByPrimary(w.slot, w.assetName);
		if (!anim || !seidrWigglePrimaryIsWorn(anim, character)) continue;
		const group = seidrResolveWigglePlayGroup(anim, character);
		if (!seidrWiggleCounterpartReady(anim, group)) continue;
		out[w.slot] = anim;
	}
	return out;
}

export function seidrWiggleUniquenessKey(slot: SeidrWiggleSlot, assetName: string): string {
	return slot + "::" + assetName;
}
