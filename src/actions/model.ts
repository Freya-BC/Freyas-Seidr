/** Seidr user Actions — model + conditions + normalize */

export type SeidrActionAudience = "selfOnly" | "othersOnly" | "both";

export type SeidrCondWho = "source" | "target";

export type SeidrCondType =
	| "wearing"
	| "isGagged"
	| "isBlind"
	| "isDeaf"
	| "canUseHands"
	| "canMoveLegs"
	| "canChangePose"
	| "accessible"
	| "hasPenis"
	| "hasVagina"
	| "hasBreasts";

export type SeidrCondRule = {
	who: SeidrCondWho;
	type: SeidrCondType;
	not?: boolean;
	slot?: string;
	pose?: string;
	zone?: "penis" | "vagina" | "nipples";
};

export type SeidrCondGroup = { rules: SeidrCondRule[] };

export type SeidrActionEffects = {
	arousal?: { enabled: boolean; activity: string };
	sound?: { enabled: boolean; sound: string };
	pose?: { enabled: boolean; pose: string };
};

/** Optional restraint allowlist entry (Asset.Name on an Item* group). Empty list = no filter. */
export type SeidrActionItemRef = { slot: string; name: string };

export type SeidrActionIconSource = "seidr" | "activity" | "custom";

/** Activity Menu button image. */
export type SeidrActionIcon = { source: SeidrActionIconSource; id: string };

export type SeidrAction = {
	id: number;
	name: string;
	slots: string[];
	audience: SeidrActionAudience;
	/** Club ActivityDictionary Other text (SourceCharacter / TargetCharacter / Pronoun*). */
	chatOther: string;
	/** Club ActivityDictionary Self text. */
	chatSelf: string;
	/** Activity Menu icon (Seidr SVG / Club Activity PNG / custom URL id). */
	icon: SeidrActionIcon;
	/** If non-empty, acted must wear one of these restraints for the action to show. */
	items: SeidrActionItemRef[];
	conditions: { groups: SeidrCondGroup[] };
	effects: SeidrActionEffects;
};

export const SEIDR_ACTION_ITEMS_MAX = 12;
export const SEIDR_CUSTOM_ICONS_MAX = 10;

export type SeidrCustomActionIcon = { id: string; url: string; label: string };

export type SeidrActionsBag = {
	nextId: number;
	list: SeidrAction[];
};

export const SEIDR_ACTION_PREFIX = "Seidr_Act_";
export const SEIDR_ACTIONS_MAX = 50;
export const SEIDR_COND_MAX_GROUPS = 4;
export const SEIDR_COND_MAX_RULES = 8;
export const SEIDR_ACTION_CHAT_MAX = 500;

export function seidrDefaultActionIcon(): SeidrActionIcon {
	return { source: "seidr", id: "mark" };
}

export function seidrNormalizeActionIcon(raw: unknown): SeidrActionIcon {
	const def = seidrDefaultActionIcon();
	if (!raw || typeof raw !== "object") return def;
	const d = raw as Partial<SeidrActionIcon>;
	const source = d.source;
	const id = typeof d.id === "string" ? d.id.trim() : "";
	if (!id) return def;
	if (source === "seidr" || source === "activity" || source === "custom") {
		return { source: source, id: id.slice(0, 128) };
	}
	return def;
}

export function seidrNormalizeCustomActionIcons(raw: unknown): SeidrCustomActionIcon[] {
	const out: SeidrCustomActionIcon[] = [];
	if (!Array.isArray(raw)) return out;
	const seen: Record<string, boolean> = {};
	for (let i = 0; i < raw.length && out.length < SEIDR_CUSTOM_ICONS_MAX; i++) {
		const row = raw[i];
		if (!row || typeof row !== "object") continue;
		const r = row as Partial<SeidrCustomActionIcon>;
		const id = typeof r.id === "string" ? r.id.trim().slice(0, 64) : "";
		const url = typeof r.url === "string" ? r.url.trim().slice(0, 2048) : "";
		if (!id || !url || seen[id]) continue;
		if (!/^https?:\/\//i.test(url)) continue;
		seen[id] = true;
		const label = typeof r.label === "string" && r.label.trim()
			? r.label.trim().slice(0, 48)
			: id;
		out.push({ id: id, url: url, label: label });
	}
	return out;
}

/**
 * Club ActivityDictionary insert tokens (stock CSV usage).
 * Club substitutes these; prefer TargetCharacter's … and PronounPossessive on Self.
 */
export const SEIDR_ACTION_CHAT_TOKENS: { token: string; hint: string }[] = [
	{ token: "SourceCharacter", hint: "Actor name" },
	{ token: "TargetCharacter", hint: "Target name (Other); often TargetCharacter's …" },
	{ token: "PronounPossessive", hint: "Actor her/his/their (Self lines)" },
	{ token: "PronounSelf", hint: "Actor herself/himself/themself" },
	{ token: "TargetPronounPossessive", hint: "Target her/his/their (rare)" },
	{ token: "ActivityAsset", hint: "Used item name (item activities)" },
];

export function seidrDefaultChatOther(name: string): string {
	return 'SourceCharacter performs "' + name + '" on TargetCharacter.';
}

export function seidrDefaultChatSelf(name: string): string {
	return 'SourceCharacter performs "' + name + '" on PronounSelf.';
}

export const SEIDR_ACTION_AUDIENCES: { id: SeidrActionAudience; label: string }[] = [
	{ id: "both", label: "Self and others" },
	{ id: "selfOnly", label: "Self only" },
	{ id: "othersOnly", label: "Others only" },
];

export const SEIDR_COND_TYPES: { id: SeidrCondType; label: string; extra: null | "slot" | "pose" | "zone" }[] = [
	{ id: "wearing", label: "wearing", extra: "slot" },
	{ id: "isGagged", label: "is gagged", extra: null },
	{ id: "isBlind", label: "is blindfolded", extra: null },
	{ id: "isDeaf", label: "is deaf", extra: null },
	{ id: "canUseHands", label: "can use hands", extra: null },
	{ id: "canMoveLegs", label: "can move legs", extra: null },
	{ id: "canChangePose", label: "can change pose to", extra: "pose" },
	{ id: "accessible", label: "is accessible", extra: "zone" },
	{ id: "hasPenis", label: "has a penis", extra: null },
	{ id: "hasVagina", label: "has a vagina", extra: null },
	{ id: "hasBreasts", label: "has breasts", extra: null },
];

/** Common item/clothing groups for slot picker + wearing conditions. */
export const SEIDR_ACTION_SLOTS: { id: string; label: string }[] = [
	{ id: "ItemArms", label: "Arms" },
	{ id: "ItemHands", label: "Hands" },
	{ id: "ItemMouth", label: "Mouth" },
	{ id: "ItemMouth2", label: "Mouth 2" },
	{ id: "ItemMouth3", label: "Mouth 3" },
	{ id: "ItemHead", label: "Head" },
	{ id: "ItemHood", label: "Hood" },
	{ id: "ItemEars", label: "Ears" },
	{ id: "ItemNeck", label: "Neck" },
	{ id: "ItemNeckAccessories", label: "Neck Acc." },
	{ id: "ItemTorso", label: "Torso" },
	{ id: "ItemPelvis", label: "Pelvis" },
	{ id: "ItemBreast", label: "Breast" },
	{ id: "ItemNipples", label: "Nipples" },
	{ id: "ItemVulva", label: "Vulva" },
	{ id: "ItemVulvaPiercings", label: "Vulva Pierc." },
	{ id: "ItemButt", label: "Butt" },
	{ id: "ItemLegs", label: "Legs" },
	{ id: "ItemFeet", label: "Feet" },
	{ id: "ItemBoots", label: "Boots" },
	{ id: "ItemDevices", label: "Devices" },
	{ id: "Cloth", label: "Cloth" },
	{ id: "ClothLower", label: "Cloth Lower" },
	{ id: "ClothAccessory", label: "Cloth Acc." },
	{ id: "Bra", label: "Bra" },
	{ id: "Panties", label: "Panties" },
	{ id: "Socks", label: "Socks" },
	{ id: "Shoes", label: "Shoes" },
	{ id: "Gloves", label: "Gloves" },
	{ id: "Hat", label: "Hat" },
];

/** Item* slots only (restraints / toys) — used by the Items picker. */
export function seidrRestraintSlots(): { id: string; label: string }[] {
	return SEIDR_ACTION_SLOTS.filter(function (s) {
		return s.id.indexOf("Item") === 0;
	});
}

export const SEIDR_ACTION_POSES: { id: string; label: string }[] = [
	{ id: "BaseLower", label: "Standing (legs)" },
	{ id: "BaseUpper", label: "Hands relaxed" },
	{ id: "LegsClosed", label: "Legs closed" },
	{ id: "Kneel", label: "Kneel" },
	{ id: "KneelingSpread", label: "Kneeling spread" },
	{ id: "Yoked", label: "Yoked" },
	{ id: "OverTheHead", label: "Over the head" },
	{ id: "BackBoxTie", label: "Back box tie" },
	{ id: "BackElbowTouch", label: "Back elbow touch" },
	{ id: "AllFours", label: "All fours" },
];

export const SEIDR_ACTION_SOUNDS: string[] = [
	"SpankSkin",
	"SmackCrop",
	"Whip1",
	"Whip2",
	"ClothSlip",
	"Zipper1",
	"LockSmall",
	"Unlock",
	"ChainShort",
	"CuffsMetal",
	"BellSmall",
	"Squeak",
	"Inflation",
	"Deflation",
	"VibrationTeaseLow",
	"VibrationTeaseMedium",
	"VibrationEdgeLow",
	"VibrationEdgeMedium",
	"VibrationEdgeHigh",
	"VibrationMaximum",
];

export type SeidrArousalActivity = { id: string; label: string };
export type SeidrArousalActivityGroup = { label: string; activities: SeidrArousalActivity[] };

function act(id: string, label: string): SeidrArousalActivity {
	return { id: id, label: label };
}

/** Pinned most-used Club activities (shown first in the arousal picker). */
export const SEIDR_AROUSAL_COMMON: SeidrArousalActivity[] = [
	act("Caress", "Caress"),
	act("Kiss", "Kiss"),
	act("FrenchKiss", "French kiss"),
	act("Lick", "Lick"),
	act("Suck", "Suck"),
	act("DeepThroat", "Deep throat"),
	act("Nibble", "Nibble"),
	act("Bite", "Bite"),
	act("Grope", "Grope"),
	act("Pinch", "Pinch"),
	act("Spank", "Spank"),
	act("Slap", "Slap"),
	act("Tickle", "Tickle"),
	act("Rub", "Rub"),
	act("Cuddle", "Cuddle"),
	act("MassageHands", "Massage (hands)"),
	act("MassageFeet", "Massage (feet)"),
	act("MasturbateHand", "Masturbate (hand)"),
	act("MasturbateFist", "Masturbate (fist)"),
	act("MasturbateTongue", "Masturbate (tongue)"),
	act("MasturbateFoot", "Masturbate (foot)"),
	act("MasturbateItem", "Masturbate (item)"),
	act("PenetrateSlow", "Penetrate (slow)"),
	act("PenetrateFast", "Penetrate (fast)"),
	act("Choke", "Choke"),
	act("Pet", "Pet"),
];

/** All Club ActivityFemale3DCG activities by Club source section (includes Common ids). */
export const SEIDR_AROUSAL_ACTIVITY_GROUPS: SeidrArousalActivityGroup[] = [
	{
		label: "Mouth",
		activities: [
			act("Whisper", "Whisper"),
			act("MoanGag", "Moan (gag)"),
			act("MoanGagTalk", "Moan talk (gag)"),
			act("MoanGagWhimper", "Whimper (gag)"),
			act("MoanGagGroan", "Groan (gag)"),
			act("MoanGagAngry", "Angry moan (gag)"),
			act("MoanGagGiggle", "Giggle (gag)"),
			act("GagKiss", "Gag kiss"),
			act("ChewItem", "Chew item"),
			act("SpitOutGag", "Spit out gag"),
			act("Nibble", "Nibble"),
			act("Lick", "Lick"),
			act("PoliteKiss", "Polite kiss"),
			act("Kiss", "Kiss"),
			act("GaggedKiss", "Gagged kiss"),
			act("FrenchKiss", "French kiss"),
			act("Suck", "Suck"),
			act("MasturbateTongue", "Masturbate (tongue)"),
			act("Bite", "Bite"),
		],
	},
	{
		label: "Hand",
		activities: [
			act("Caress", "Caress"),
			act("Clean", "Clean"),
			act("MassageHands", "Massage (hands)"),
			act("TakeCare", "Take care"),
			act("Tickle", "Tickle"),
			act("Pet", "Pet"),
			act("Grope", "Grope"),
			act("Pinch", "Pinch"),
			act("HandGag", "Hand gag"),
			act("Slap", "Slap"),
			act("Spank", "Spank"),
			act("Pull", "Pull"),
			act("Choke", "Choke"),
			act("MasturbateHand", "Masturbate (hand)"),
			act("MasturbateFist", "Masturbate (fist)"),
		],
	},
	{
		label: "Feet",
		activities: [
			act("MassageFeet", "Massage (feet)"),
			act("MasturbateFoot", "Masturbate (foot)"),
			act("Step", "Step"),
			act("Kick", "Kick"),
		],
	},
	{
		label: "Body",
		activities: [
			act("Cuddle", "Cuddle"),
			act("Rub", "Rub"),
			act("StruggleArms", "Struggle (arms)"),
			act("StruggleLegs", "Struggle (legs)"),
			act("Sit", "Sit"),
			act("RestHead", "Rest head"),
		],
	},
	{
		label: "Head",
		activities: [
			act("Nod", "Nod"),
			act("Wiggle", "Wiggle"),
		],
	},
	{
		label: "Item",
		activities: [
			act("ShakeItem", "Shake item"),
			act("PowderItem", "Powder item"),
			act("SpankItem", "Spank item"),
			act("TickleItem", "Tickle item"),
			act("RubItem", "Rub item"),
			act("SqueezeItem", "Squeeze item"),
			act("RollItem", "Roll item"),
			act("MasturbateItem", "Masturbate (item)"),
			act("PourItem", "Pour item"),
			act("ShockItem", "Shock item"),
			act("Inject", "Inject"),
			act("PenetrateSlow", "Penetrate (slow)"),
			act("PenetrateFast", "Penetrate (fast)"),
			act("SipItem", "Sip item"),
			act("EatItem", "Eat item"),
			act("Scratch", "Scratch"),
			act("ThrowItem", "Throw item"),
			act("CollarGrab", "Collar grab"),
		],
	},
	{
		label: "Family",
		activities: [
			act("SistersHug", "Sisters hug"),
			act("BrothersHandshake", "Brothers handshake"),
			act("SiblingsCheekKiss", "Siblings cheek kiss"),
			act("SiblingsHug", "Siblings hug"),
			act("BrushItem", "Brush item"),
			act("DeepThroat", "Deep throat"),
			act("SuckPenetrateItem", "Suck penetrate item"),
		],
	},
];

/** Flat allowlist of all Club activity Names (for normalize). */
export const SEIDR_AROUSAL_ACTIVITY_IDS: string[] = (function () {
	const ids: string[] = [];
	const seen: Record<string, boolean> = {};
	function add(list: SeidrArousalActivity[]) {
		list.forEach(function (a) {
			if (seen[a.id]) return;
			seen[a.id] = true;
			ids.push(a.id);
		});
	}
	add(SEIDR_AROUSAL_COMMON);
	SEIDR_AROUSAL_ACTIVITY_GROUPS.forEach(function (g) { add(g.activities); });
	return ids;
})();

/** @deprecated use SEIDR_AROUSAL_ACTIVITY_IDS — kept for any leftover imports */
export const SEIDR_AROUSAL_ACTIVITIES: string[] = SEIDR_AROUSAL_ACTIVITY_IDS;

export function seidrArousalActivityLabel(id: string): string {
	for (let i = 0; i < SEIDR_AROUSAL_COMMON.length; i++) {
		if (SEIDR_AROUSAL_COMMON[i].id === id) return SEIDR_AROUSAL_COMMON[i].label;
	}
	for (let g = 0; g < SEIDR_AROUSAL_ACTIVITY_GROUPS.length; g++) {
		const list = SEIDR_AROUSAL_ACTIVITY_GROUPS[g].activities;
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === id) return list[i].label;
		}
	}
	return id || "Caress";
}

/** Groups for the picker: Common first, then Club sections without duplicating Common ids. */
export function seidrArousalPickerGroups(): SeidrArousalActivityGroup[] {
	const commonIds: Record<string, boolean> = {};
	SEIDR_AROUSAL_COMMON.forEach(function (a) { commonIds[a.id] = true; });
	const out: SeidrArousalActivityGroup[] = [
		{ label: "Common", activities: SEIDR_AROUSAL_COMMON.slice() },
	];
	SEIDR_AROUSAL_ACTIVITY_GROUPS.forEach(function (g) {
		const rest = g.activities.filter(function (a) { return !commonIds[a.id]; });
		if (rest.length) out.push({ label: g.label, activities: rest });
	});
	return out;
}

const AUDIENCE_IDS = SEIDR_ACTION_AUDIENCES.map(function (a) { return a.id; });
const COND_TYPE_IDS = SEIDR_COND_TYPES.map(function (t) { return t.id; });

export function seidrActionActivityName(id: number): string {
	return SEIDR_ACTION_PREFIX + String(id);
}

/**
 * Strip Club Activity Content sound suffixes (-Spank / -Slap) used so vanilla
 * clients play SpankSkin via AudioActions.
 */
export function seidrStripClubSoundSuffix(name: string): string {
	if (typeof name !== "string" || !name) return name;
	if (name.length >= 6 && name.slice(-6) === "-Spank") return name.slice(0, -6);
	if (name.length >= 5 && name.slice(-5) === "-Slap") return name.slice(0, -5);
	return name;
}

export function seidrParseActionActivityName(name: string): number | null {
	const bare = seidrStripClubSoundSuffix(typeof name === "string" ? name : "");
	if (!bare || bare.indexOf(SEIDR_ACTION_PREFIX) !== 0) return null;
	const n = parseInt(bare.slice(SEIDR_ACTION_PREFIX.length), 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export function seidrDefaultActionsBag(): SeidrActionsBag {
	return { nextId: 1, list: [] };
}

function normalizeRule(raw: unknown): SeidrCondRule | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Partial<SeidrCondRule>;
	const type = typeof r.type === "string" && COND_TYPE_IDS.indexOf(r.type as SeidrCondType) >= 0
		? r.type as SeidrCondType
		: null;
	if (!type) return null;
	const who: SeidrCondWho = r.who === "source" ? "source" : "target";
	const out: SeidrCondRule = { who: who, type: type, not: !!r.not };
	if (type === "wearing" && typeof r.slot === "string" && r.slot) out.slot = r.slot;
	if (type === "canChangePose" && typeof r.pose === "string" && r.pose) out.pose = r.pose;
	if (type === "accessible" && (r.zone === "penis" || r.zone === "vagina" || r.zone === "nipples")) {
		out.zone = r.zone;
	}
	return out;
}

function normalizeGroups(raw: unknown): SeidrCondGroup[] {
	if (!raw || typeof raw !== "object") return [];
	const g = (raw as { groups?: unknown }).groups;
	if (!Array.isArray(g)) return [];
	const groups: SeidrCondGroup[] = [];
	let ruleCount = 0;
	for (let i = 0; i < g.length && groups.length < SEIDR_COND_MAX_GROUPS; i++) {
		const entry = g[i];
		const rulesRaw = entry && typeof entry === "object" ? (entry as { rules?: unknown }).rules : null;
		if (!Array.isArray(rulesRaw)) continue;
		const rules: SeidrCondRule[] = [];
		for (let j = 0; j < rulesRaw.length && ruleCount < SEIDR_COND_MAX_RULES; j++) {
			const rule = normalizeRule(rulesRaw[j]);
			if (!rule) continue;
			rules.push(rule);
			ruleCount++;
		}
		if (rules.length) groups.push({ rules: rules });
	}
	return groups;
}

function normalizeItems(raw: unknown): SeidrActionItemRef[] {
	if (!Array.isArray(raw)) return [];
	const out: SeidrActionItemRef[] = [];
	const seen: Record<string, boolean> = {};
	for (let i = 0; i < raw.length && out.length < SEIDR_ACTION_ITEMS_MAX; i++) {
		const entry = raw[i];
		if (!entry || typeof entry !== "object") continue;
		const slot = typeof (entry as SeidrActionItemRef).slot === "string"
			? (entry as SeidrActionItemRef).slot.trim()
			: "";
		const name = typeof (entry as SeidrActionItemRef).name === "string"
			? (entry as SeidrActionItemRef).name.trim()
			: "";
		if (!slot || !name) continue;
		const key = slot + "\0" + name;
		if (seen[key]) continue;
		seen[key] = true;
		out.push({ slot: slot, name: name });
	}
	return out;
}

function normalizeEffects(raw: unknown): SeidrActionEffects {
	const out: SeidrActionEffects = {};
	if (!raw || typeof raw !== "object") return out;
	const e = raw as SeidrActionEffects;
	if (e.arousal && typeof e.arousal === "object") {
		const rawAct = typeof e.arousal.activity === "string" ? e.arousal.activity : "";
		out.arousal = {
			enabled: !!e.arousal.enabled,
			activity: rawAct && SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(rawAct) >= 0 ? rawAct : "Caress",
		};
	}
	if (e.sound && typeof e.sound === "object") {
		out.sound = {
			enabled: !!e.sound.enabled,
			sound: typeof e.sound.sound === "string" && e.sound.sound
				? e.sound.sound
				: SEIDR_ACTION_SOUNDS[0],
		};
	}
	if (e.pose && typeof e.pose === "object") {
		out.pose = {
			enabled: !!e.pose.enabled,
			pose: typeof e.pose.pose === "string" && e.pose.pose
				? e.pose.pose
				: "Kneel",
		};
	}
	return out;
}

export function seidrNormalizeAction(raw: unknown, fallbackId?: number): SeidrAction | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrAction>;
	const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : (fallbackId || 0);
	if (!id) return null;
	const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 48) : "Action " + id;
	const slots: string[] = [];
	if (Array.isArray(d.slots)) {
		d.slots.forEach(function (s) {
			if (typeof s === "string" && s && slots.indexOf(s) < 0) slots.push(s);
		});
	}
	if (!slots.length) slots.push("ItemTorso");
	const audience: SeidrActionAudience =
		typeof d.audience === "string" && AUDIENCE_IDS.indexOf(d.audience as SeidrActionAudience) >= 0
			? d.audience as SeidrActionAudience
			: "both";
	const chatOther = typeof d.chatOther === "string" && d.chatOther.trim()
		? d.chatOther.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
		: seidrDefaultChatOther(name);
	const chatSelf = typeof d.chatSelf === "string" && d.chatSelf.trim()
		? d.chatSelf.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
		: seidrDefaultChatSelf(name);
	return {
		id: id,
		name: name,
		slots: slots.slice(0, 8),
		audience: audience,
		chatOther: chatOther,
		chatSelf: chatSelf,
		icon: seidrNormalizeActionIcon(d.icon),
		items: normalizeItems(d.items),
		conditions: { groups: normalizeGroups(d.conditions) },
		effects: normalizeEffects(d.effects),
	};
}

export function seidrNormalizeActionsBag(raw: unknown): SeidrActionsBag {
	const base = seidrDefaultActionsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrActionsBag>;
	const list: SeidrAction[] = [];
	const seen: Record<number, boolean> = {};
	if (Array.isArray(d.list)) {
		for (let i = 0; i < d.list.length && list.length < SEIDR_ACTIONS_MAX; i++) {
			const act = seidrNormalizeAction(d.list[i]);
			if (!act || seen[act.id]) continue;
			seen[act.id] = true;
			list.push(act);
		}
	}
	let nextId = typeof d.nextId === "number" && d.nextId > 0 ? Math.floor(d.nextId) : 1;
	list.forEach(function (a) {
		if (a.id >= nextId) nextId = a.id + 1;
	});
	base.nextId = nextId;
	base.list = list;
	return base;
}

export function seidrDefaultAction(id: number): SeidrAction {
	const name = "Action " + id;
	return {
		id: id,
		name: name,
		slots: ["ItemTorso"],
		audience: "both",
		chatOther: seidrDefaultChatOther(name),
		chatSelf: seidrDefaultChatSelf(name),
		icon: seidrDefaultActionIcon(),
		items: [],
		conditions: { groups: [] },
		effects: {
			arousal: { enabled: false, activity: "Caress" },
			sound: { enabled: false, sound: "SpankSkin" },
			pose: { enabled: false, pose: "Kneel" },
		},
	};
}
