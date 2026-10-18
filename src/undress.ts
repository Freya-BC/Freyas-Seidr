/** FAM undress clothing slots → Club activities. */
import { Seidr } from "./seidr";

var SEIDR_ECHO_SUFFIXES = ["_笨笨蛋Luzi", "_笨笨笨蛋Luzi2"];

var SEIDR_UNDRESS_TEXT_GENERIC_SELF = [
	"{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}",
];
var SEIDR_UNDRESS_TEXT_GENERIC_OTHER = [
	"{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} pulls off {TargetName}'s {ClothingItem(Slot1)}",
	"{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off",
];
var SEIDR_UNDRESS_TEXT_SHOES_SELF = [
	"{SourceName} kicks off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} unlaces {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} slips out of {SourcePronounPossessive} {ClothingItem(Slot1)}",
];
var SEIDR_UNDRESS_TEXT_SHOES_OTHER = [
	"{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} free",
	"{SourceName} works {TargetName}'s {ClothingItem(Slot1)} off",
];
var SEIDR_UNDRESS_TEXT_SOCKS_SELF = [
	"{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} rolls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}",
];
var SEIDR_UNDRESS_TEXT_SOCKS_OTHER = [
	"{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} rolls {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
];
var SEIDR_UNDRESS_TEXT_HAT_SELF = [
	"{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} lifts off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} sets aside {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
];
var SEIDR_UNDRESS_TEXT_HAT_OTHER = [
	"{SourceName} lifts {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off",
];
var SEIDR_UNDRESS_TEXT_GLOVES_SELF = [
	"{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
	"{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}",
];
var SEIDR_UNDRESS_TEXT_GLOVES_OTHER = [
	"{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off",
	"{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
];

var SEIDR_UNDRESS_TEXTS = {
	generic: { self: SEIDR_UNDRESS_TEXT_GENERIC_SELF, other: SEIDR_UNDRESS_TEXT_GENERIC_OTHER },
	shoes: { self: SEIDR_UNDRESS_TEXT_SHOES_SELF, other: SEIDR_UNDRESS_TEXT_SHOES_OTHER },
	socks: { self: SEIDR_UNDRESS_TEXT_SOCKS_SELF, other: SEIDR_UNDRESS_TEXT_SOCKS_OTHER },
	hat: { self: SEIDR_UNDRESS_TEXT_HAT_SELF, other: SEIDR_UNDRESS_TEXT_HAT_OTHER },
	gloves: { self: SEIDR_UNDRESS_TEXT_GLOVES_SELF, other: SEIDR_UNDRESS_TEXT_GLOVES_OTHER },
};

/** FAM slot table (bundle flag kept for parity; Seidr v1 ignores bundles). */
var SEIDR_UNDRESS_SLOTS = [
	{ group: "Cloth", zone: "ItemTorso", family: "Upper Clothes", noun: "upper clothes", layers: "upper layers", texts: "generic", bundle: true },
	{ group: "ClothOuter", zone: "ItemTorso", family: "Outer Clothes", noun: "outer clothes", layers: "outer layers", texts: "generic", bundle: true },
	{ group: "Suit", zone: "ItemTorso", family: "Suit", noun: "suit", layers: "suit layers", texts: "generic", bundle: true },
	{ group: "ClothLower", zone: "ItemLegs", family: "Lower Clothes", noun: "lower clothes", layers: "lower layers", texts: "generic", bundle: true },
	{ group: "SuitLower", zone: "ItemLegs", family: "Lower Suit", noun: "lower suit", layers: "lower suit layers", texts: "generic", bundle: true },
	{ group: "Bra", zone: "ItemBreast", family: "Bra", noun: "bra", layers: "bra layers", texts: "generic", bundle: true },
	{ group: "ClothAccessory", zone: "ItemBreast", family: "Chest Accessory", noun: "chest accessory", layers: "chest accessory layers", texts: "generic", bundle: true },
	{ group: "Corset", zone: "ItemBreast", family: "Corset", noun: "corset", layers: "corset layers", texts: "generic", bundle: true },
	{ group: "Panties", zone: "ItemVulvaPiercings", family: "Panties", noun: "panties", layers: "panty layers", texts: "generic", bundle: true },
	{ group: "Socks", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: true },
	{ group: "SocksLeft", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: false },
	{ group: "SocksRight", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: false },
	{ group: "Shoes", zone: "ItemBoots", family: "Shoes", noun: "shoes", layers: "shoe layers", texts: "shoes", bundle: true },
	{ group: "Hat", zone: "ItemHead", family: "Hat", noun: "hat", layers: "hat layers", texts: "hat", bundle: true },
	{ group: "Glasses", zone: "ItemHead", family: "Glasses", noun: "glasses", layers: "glasses layers", texts: "hat", bundle: true },
	{ group: "Mask", zone: "ItemMouth", family: "Mask", noun: "mask", layers: "mask layers", texts: "generic", bundle: true },
	{ group: "Gloves", zone: "ItemArms", family: "Gloves", noun: "gloves", layers: "glove layers", texts: "gloves", bundle: true },
	{ group: "Necklace", zone: "ItemNeck", family: "Necklace", noun: "necklace", layers: "necklace layers", texts: "generic", bundle: true },
	{ group: "Bracelet", zone: "ItemArms", family: "Bracelet", noun: "bracelet", layers: "bracelet layers", texts: "generic", bundle: true },
	{ group: "Garters", zone: "ItemLegs", family: "Garters", noun: "garters", layers: "garter layers", texts: "generic", bundle: true },
	{ group: "AnkletLeft", zone: "ItemFeet", family: "Anklets", noun: "anklets", layers: "anklet layers", texts: "generic", bundle: false },
	{ group: "AnkletRight", zone: "ItemFeet", family: "Anklets", noun: "anklets", layers: "anklet layers", texts: "generic", bundle: false },
	{ group: "Decals", zone: "ItemTorso", family: "Decals", noun: "decals", layers: "decal layers", texts: "generic", bundle: true },
	{ group: "HairAccessory1", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
	{ group: "HairAccessory2", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
	{ group: "HairAccessory3", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
	{ group: "Luzi_HairAccessory3_1", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: false },
	{ group: "Luzi_HairAccessory3_2", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: false },
	{ group: "Jewelry", zone: "ItemHead", family: "Jewelry", noun: "jewelry", layers: "jewelry layers", texts: "generic", bundle: true },
	{ group: "Luzi_Jewelry_0", zone: "ItemHead", family: "Jewelry", noun: "jewelry", layers: "jewelry layers", texts: "generic", bundle: false },
	{ group: "长袖子_Luzi", zone: "ItemArms", family: "Long Sleeves", noun: "long sleeves", layers: "sleeve layers", texts: "gloves", bundle: false },
];

var seidrPendingUndressChat = null;
var seidrUndressCached = null;

function seidrHasCjk(s) {
	return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(String(s || ""));
}

function seidrPickLatin(candidates) {
	var fallback = "";
	for (var i = 0; i < (candidates || []).length; i++) {
		var s = String(candidates[i] || "").trim();
		if (!s) continue;
		if (!fallback) fallback = s;
		if (!seidrHasCjk(s)) return s;
	}
	return fallback;
}

/** Stable Activity.Name fragment; strip target stays the real AssetGroup. */
function seidrUndressSafeId(group) {
	return String(group || "").replace(/[^A-Za-z0-9_]/g, function (ch) {
		return "_" + ch.charCodeAt(0).toString(16) + "_";
	});
}

function seidrClothingGroupExists(name) {
	if (!name) return false;
	try {
		if (typeof AssetGroupGet === "function") {
			return !!AssetGroupGet("Female3DCG", name);
		}
	} catch (e) { /* fall through */ }
	if (typeof AssetGroup !== "undefined" && Array.isArray(AssetGroup)) {
		for (var i = 0; i < AssetGroup.length; i++) {
			if (AssetGroup[i] && AssetGroup[i].Name === name) return true;
		}
	}
	// Vanilla core groups: allow registration in tests / before AssetGroup loads.
	if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && name.indexOf("Luzi") < 0) return true;
	return false;
}

function seidrEchoGroup(base, suffixIndex) {
	return base + SEIDR_ECHO_SUFFIXES[suffixIndex];
}

function seidrWornClothName(character, group) {
	if (!character || !group || typeof InventoryGet !== "function") return "";
	try {
		var item = InventoryGet(character, group);
		if (!item || !item.Asset) return "";
		var craftName = item.Craft && item.Craft.Name ? String(item.Craft.Name) : "";
		var desc = item.Asset.Description ? String(item.Asset.Description) : "";
		var assetName = item.Asset.Name ? String(item.Asset.Name) : "";
		return seidrPickLatin([desc, craftName, assetName]) || "clothing";
	} catch (e) {
		return "";
	}
}

function seidrIsWearing(character, group) {
	if (!character || !group || typeof InventoryGet !== "function") return false;
	try {
		return !!InventoryGet(character, group);
	} catch (e) {
		return false;
	}
}

function seidrCanChangeClothes(acting, acted) {
	if (!acting || !acted) return false;
	try {
		if (typeof acting.CanChangeClothesOn === "function") {
			return !!acting.CanChangeClothesOn(acted);
		}
	} catch (e) { /* fall through */ }
	if (acting === acted || (acting.MemberNumber != null && acting.MemberNumber === acted.MemberNumber)) {
		try {
			if (typeof acted.CanChangeOwnClothes === "function") return !!acted.CanChangeOwnClothes();
		} catch (e2) { /* ignore */ }
		return true;
	}
	return false;
}

/** Map Club pronoun asset / GetPronouns key → possessive word. */
function seidrPronounPossessiveFromKey(key: unknown): string | null {
	const raw = String(key || "").replace(/[\/_\-\s]/g, "");
	if (!raw) return null;
	if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "her";
	if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "his";
	if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "their";
	return null;
}

/**
 * Possessive for undress self-texts (her/his/their).
 * Prefer GetPronouns / Pronouns asset Name (SheHer…); CharacterPronoun only if it
 * returns a known word — one Club API throw must not skip the asset map.
 */
function seidrPronounPossessive(character: any): string {
	if (!character) return "their";
	try {
		if (typeof character.GetPronouns === "function") {
			const mapped = seidrPronounPossessiveFromKey(character.GetPronouns());
			if (mapped) return mapped;
		}
	} catch (e) { /* ignore */ }
	try {
		if (typeof InventoryGet === "function") {
			const item = InventoryGet(character, "Pronouns");
			const name = item && item.Asset && item.Asset.Name;
			const mapped = seidrPronounPossessiveFromKey(name);
			if (mapped) return mapped;
		}
	} catch (e2) { /* ignore */ }
	try {
		if (typeof CharacterPronoun === "function") {
			const p = String(CharacterPronoun(character, "Possessive", false) || "")
				.trim()
				.toLowerCase();
			if (p === "her" || p === "his" || p === "their") return p;
		}
	} catch (e3) { /* ignore */ }
	return "their";
}

function seidrPickRandom(lines) {
	if (!lines || !lines.length) return "";
	var i = Math.floor(Math.random() * lines.length);
	return lines[i] || lines[0] || "";
}

/**
 * FAM template → Club Activity dictionary Text.
 * Source/Target stay as Club tags; pronouns + clothing name are baked in.
 */
function seidrUndressFillTemplate(template, clothingName, possessive) {
	var out = String(template || "");
	out = out.split("{SourceName}").join("SourceCharacter");
	out = out.split("{TargetName}").join("TargetCharacter");
	out = out.split("{SourcePronounPossessive}").join(possessive || "their");
	out = out.split("{ClothingItem(Slot1)}").join(clothingName || "clothing");
	return out;
}

function seidrUndressFallbackLabel(slot) {
	return "Undress " + (slot && slot.noun ? slot.noun : "clothes");
}

function seidrUndressMakeAct(slot, clothGroup) {
	var id = seidrUndressSafeId(clothGroup);
	var pack = SEIDR_UNDRESS_TEXTS[slot.texts] || SEIDR_UNDRESS_TEXTS.generic;
	return {
		name: "Seidr_Undress_" + id,
		undress: true,
		bundle: false,
		clothGroup: clothGroup,
		clothGroups: [clothGroup],
		zone: slot.zone,
		noun: slot.noun,
		family: slot.family,
		texts: slot.texts,
		prereq: "Seidr_CanUndress_" + id,
		needsHands: true,
		self: true,
		label: seidrUndressFallbackLabel(slot),
		chat: seidrUndressFillTemplate(pack.other[0], slot.noun, "their"),
		chatSelf: seidrUndressFillTemplate(pack.self[0], slot.noun, "their"),
		selfTexts: pack.self.slice(),
		otherTexts: pack.other.slice(),
	};
}

/** FAM "Undress all {family}" — strips base + Echo layers in one click. */
function seidrUndressMakeBundleAct(slot, layers) {
	var id = seidrUndressSafeId(slot.group);
	var selfTexts = [
		"{SourceName} strips off {SourcePronounPossessive} " + slot.noun,
		"{SourceName} peels away {SourcePronounPossessive} " + slot.layers,
		"{SourceName} pulls off {SourcePronounPossessive} " + slot.noun + " at once",
	];
	var otherTexts = [
		"{SourceName} strips off {TargetName}'s " + slot.noun,
		"{SourceName} peels away {TargetName}'s " + slot.layers,
		"{SourceName} pulls {TargetName}'s " + slot.noun + " off at once",
	];
	return {
		name: "Seidr_UndressAll_" + id,
		undress: true,
		bundle: true,
		clothGroup: layers[0],
		clothGroups: layers.slice(),
		zone: slot.zone,
		noun: slot.noun,
		layers: slot.layers,
		family: slot.family,
		texts: slot.texts,
		prereq: "Seidr_CanUndressAll_" + id,
		needsHands: true,
		self: true,
		label: "Undress all " + slot.family,
		chat: seidrUndressFillTemplate(otherTexts[0], slot.noun, "their"),
		chatSelf: seidrUndressFillTemplate(selfTexts[0], slot.noun, "their"),
		selfTexts: selfTexts,
		otherTexts: otherTexts,
	};
}

function seidrUndressShouldRegisterGroup(group, isEchoOrExtra) {
	if (!group) return false;
	if (!isEchoOrExtra) {
		// Core FAM base rows always register; AssetGroup may load late.
		if (group.indexOf("Luzi") >= 0 || seidrHasCjk(group)) {
			return seidrClothingGroupExists(group);
		}
		return true;
	}
	return seidrClothingGroupExists(group);
}

function seidrBuildUndressActivities() {
	if (seidrUndressCached) return seidrUndressCached;
	var out = [];
	SEIDR_UNDRESS_SLOTS.forEach(function (slot) {
		if (seidrUndressShouldRegisterGroup(slot.group, false)) {
			out.push(seidrUndressMakeAct(slot, slot.group));
		}
		var echo1 = seidrEchoGroup(slot.group, 0);
		var echo2 = seidrEchoGroup(slot.group, 1);
		var layers = [];
		if (seidrUndressShouldRegisterGroup(slot.group, false)) layers.push(slot.group);
		if (seidrUndressShouldRegisterGroup(echo1, true)) {
			out.push(seidrUndressMakeAct(slot, echo1));
			layers.push(echo1);
		}
		if (seidrUndressShouldRegisterGroup(echo2, true)) {
			out.push(seidrUndressMakeAct(slot, echo2));
			layers.push(echo2);
		}
		// FAM: bundle only when the slot allows it and Echo adds a second layer.
		if (slot.bundle && layers.length >= 2) {
			out.push(seidrUndressMakeBundleAct(slot, layers));
		}
	});
	seidrUndressCached = out;
	return out;
}

function seidrUndressGroupsOf(actOrGroups) {
	if (!actOrGroups) return [];
	if (Array.isArray(actOrGroups)) return actOrGroups.slice();
	if (actOrGroups.clothGroups && actOrGroups.clothGroups.length) {
		return actOrGroups.clothGroups.slice();
	}
	if (typeof actOrGroups === "string") return [actOrGroups];
	if (actOrGroups.clothGroup) return [actOrGroups.clothGroup];
	return [];
}

function seidrUndressCan(acting, acted, clothGroupOrGroups) {
	if (!acting || !acted) return false;
	if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
	var groups = seidrUndressGroupsOf(clothGroupOrGroups);
	if (!groups.length) return false;
	if (!seidrCanChangeClothes(acting, acted)) return false;
	for (var i = 0; i < groups.length; i++) {
		if (seidrIsWearing(acted, groups[i])) return true;
	}
	return false;
}

function seidrUndressDynamicLabel(act, character) {
	if (!act || !act.undress) return act && act.label ? act.label : "Undress";
	if (act.bundle) return act.label || ("Undress all " + (act.family || "clothes"));
	var worn = seidrWornClothName(character, act.clothGroup);
	if (worn) return "Undress " + worn;
	return seidrUndressFallbackLabel(act);
}

function seidrUndressBuildChat(act, actor, acted, selfRun) {
	if (!act || !act.undress) return "";
	var wearer = selfRun ? actor : acted;
	var clothing = act.bundle
		? (act.noun || "clothing")
		: (seidrWornClothName(wearer, act.clothGroup) || act.noun || "clothing");
	var possessive = seidrPronounPossessive(actor);
	var lines = selfRun ? act.selfTexts : act.otherTexts;
	var template = seidrPickRandom(lines);
	if (!template) {
		template = selfRun
			? "{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}"
			: "{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off";
	}
	return seidrUndressFillTemplate(template, clothing, possessive);
}

/** Write pronoun-correct dialog into ActivityDictionary so Club does not use stale "their". */
function seidrUndressWriteDialogCache(act: any, selfRun: boolean, text: string) {
	if (!act || !text || typeof ActivityDictionaryLoad !== "function") return;
	try {
		const cache = ActivityDictionaryLoad();
		if (!cache || !cache.cache) return;
		const zone = act.zone || "ItemTorso";
		const key = (selfRun ? "ChatSelf-" : "ChatOther-") + zone + "-" + act.name;
		cache.cache[key] = text;
	} catch (e) { /* ignore */ }
}

function seidrUndressPrepareChat(actor, acted, act) {
	if (!act || !act.undress) return;
	var selfRun = !!(actor && acted && actor.MemberNumber === acted.MemberNumber);
	var text = seidrUndressBuildChat(act, actor, acted, selfRun);
	seidrPendingUndressChat = {
		name: act.name,
		text: text,
	};
	seidrUndressWriteDialogCache(act, selfRun, text);
}

function seidrUndressConsumePending(activityName) {
	if (!seidrPendingUndressChat || seidrPendingUndressChat.name !== activityName) return "";
	var text = seidrPendingUndressChat.text || "";
	seidrPendingUndressChat = null;
	return text;
}

function seidrUndressStrip(acted, clothGroupOrGroups) {
	if (!acted) return false;
	var groups = seidrUndressGroupsOf(clothGroupOrGroups);
	if (!groups.length) return false;
	try {
		var removed = [];
		for (var i = 0; i < groups.length; i++) {
			var group = groups[i];
			if (!seidrIsWearing(acted, group)) continue;
			// Third arg refreshes the local canvas; required so DrawCharacter does not
			// keep a stale layer after the asset is gone (can black-screen the room).
			if (typeof InventoryRemove === "function") {
				InventoryRemove(acted, group, true);
			}
			removed.push(group);
		}
		if (!removed.length) return false;
		if (typeof CharacterLoadCanvas === "function") {
			try { CharacterLoadCanvas(acted); } catch (eCanvas) { /* ignore */ }
		}
		if (typeof ChatRoomCharacterItemUpdate === "function") {
			for (var r = 0; r < removed.length; r++) {
				ChatRoomCharacterItemUpdate(acted, removed[r]);
			}
		} else if (typeof ChatRoomCharacterUpdate === "function") {
			ChatRoomCharacterUpdate(acted);
		}
		return true;
	} catch (e) {
		console.warn("[Seidr] undress strip", e);
		return false;
	}
}

/** Run strip after ActivityRun / dialog teardown so the draw loop is not mid-frame. */
function seidrUndressStripDeferred(acted, clothGroupOrGroups) {
	var target = acted;
	var groups = seidrUndressGroupsOf(clothGroupOrGroups);
	setTimeout(function () {
		try {
			seidrUndressStrip(target, groups);
			if (typeof Seidr.undressRefreshLabels === "function") {
				Seidr.undressRefreshLabels();
			}
		} catch (e) {
			console.warn("[Seidr] undress deferred", e);
		}
	}, 0);
}

function seidrUndressWriteLabels(cache, character) {
	if (!cache || !cache.cache) return;
	seidrBuildUndressActivities().forEach(function (act) {
		var label = seidrUndressDynamicLabel(act, character);
		cache.cache["Activity" + act.name] = label;
		var zone = act.zone;
		cache.cache["Label-ChatOther-" + zone + "-" + act.name] = label;
		cache.cache["Label-ChatSelf-" + zone + "-" + act.name] = label;
		// Do not cache ChatOther/ChatSelf dialog here — static chatSelf bakes "their".
		// Pronoun-correct lines are written in seidrUndressPrepareChat at send time.
		delete cache.cache["ChatOther-" + zone + "-" + act.name];
		delete cache.cache["ChatSelf-" + zone + "-" + act.name];
	});
}

function seidrUndressRefreshLabels() {
	if (typeof ActivityDictionaryLoad !== "function") return;
	var focused = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : null;
	var character = focused || (typeof Player !== "undefined" ? Player : null);
	seidrUndressWriteLabels(ActivityDictionaryLoad(), character);
}

Seidr.undressSlotTable = function () {
	return SEIDR_UNDRESS_SLOTS.slice();
};
Seidr.undressEchoSuffixes = function () {
	return SEIDR_ECHO_SUFFIXES.slice();
};
Seidr.undressResetCache = function () {
	seidrUndressCached = null;
};
Seidr.undressSafeId = seidrUndressSafeId;
Seidr.undressActivities = seidrBuildUndressActivities;
Seidr.undressCan = seidrUndressCan;
Seidr.undressPrepareChat = seidrUndressPrepareChat;
Seidr.undressConsumePending = seidrUndressConsumePending;
Seidr.undressBuildChat = seidrUndressBuildChat;
Seidr.undressFillTemplate = seidrUndressFillTemplate;
Seidr.undressPronounPossessive = seidrPronounPossessive;
Seidr.undressStrip = seidrUndressStrip;
Seidr.undressStripDeferred = seidrUndressStripDeferred;
Seidr.undressWriteLabels = seidrUndressWriteLabels;
Seidr.undressRefreshLabels = seidrUndressRefreshLabels;
Seidr.undressDynamicLabel = seidrUndressDynamicLabel;
Seidr.undressWornName = seidrWornClothName;
Seidr.clothingGroupExists = seidrClothingGroupExists;
