/**
 * Built-in receive Ride / Sit-on-Face / Strap-on Panties oral activities.
 * Actor receives (rides) the target's shaft or tongue; Club Penetrate* covers giving.
 */
import { Seidr } from "./seidr";
import { seidrActivityIconUrl } from "./actions/icons";

const ZONE_VULVA = "ItemVulva";
const ZONE_MOUTH = "ItemMouth";
const STRAPON_PANTIES = "StraponPanties";

export type SeidrIntimateKind = "fuck" | "fuckAnal" | "sitFace" | "oral";

export type SeidrIntimateDef = {
	name: string;
	prereq: string;
	label: string;
	/** One or more chat lines; a line is picked at send time. */
	chatLines: string[];
	zone: string;
	intimate: true;
	kind: SeidrIntimateKind;
	/** Club template for prefs / arousal math. */
	template: string;
	maxProgress: number;
	maxProgressSelf: number;
	/** Extra Club prereqs (e.g. TargetNeeds-PenetrateItem, UseMouth). */
	extraPrereqs: string[];
	/** Zone applied to the receiving actor for reverse arousal. */
	receiveZone?: "ItemVulva" | "ItemButt";
	/** Club Icons/Activity basename (e.g. PenetrateSlow). */
	icon?: string;
};

const SEIDR_INTIMATE: SeidrIntimateDef[] = [
	{
		name: "Seidr_FuckSlow",
		prereq: "Seidr_CanFuck",
		label: "Ride with Pussy (Gentle)",
		chatLines: [
			"SourceCharacter slowly rides TargetCharacter's ActivityAsset with PronounPossessive pussy.",
			"SourceCharacter gently rocks on TargetCharacter's ActivityAsset with PronounPossessive pussy.",
			"SourceCharacter moves PronounPossessive hips slowly on TargetCharacter's ActivityAsset.",
			"SourceCharacter rolls PronounPossessive hips gently around TargetCharacter's ActivityAsset.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "fuck",
		template: "PenetrateSlow",
		maxProgress: 80,
		maxProgressSelf: 100,
		extraPrereqs: ["TargetNeeds-PenetrateItem"],
		receiveZone: "ItemVulva",
		icon: "PenetrateSlow",
	},
	{
		name: "Seidr_FuckFast",
		prereq: "Seidr_CanFuck",
		label: "Ride with Pussy (Rough)",
		chatLines: [
			"SourceCharacter rides TargetCharacter's ActivityAsset hard with PronounPossessive pussy.",
			"SourceCharacter bounces on TargetCharacter's ActivityAsset with PronounPossessive pussy.",
			"SourceCharacter slams PronounPossessive hips on TargetCharacter's ActivityAsset.",
			"SourceCharacter fucks PronounPossessive pussy on TargetCharacter's ActivityAsset hard.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "fuck",
		template: "PenetrateFast",
		maxProgress: 100,
		maxProgressSelf: 100,
		extraPrereqs: ["TargetNeeds-PenetrateItem"],
		receiveZone: "ItemVulva",
		icon: "PenetrateFast",
	},
	{
		name: "Seidr_FuckAnalSlow",
		prereq: "Seidr_CanFuckAnal",
		label: "Ride with Ass (Gentle)",
		chatLines: [
			"SourceCharacter slowly rides TargetCharacter's ActivityAsset with PronounPossessive ass.",
			"SourceCharacter gently rocks PronounPossessive ass on TargetCharacter's ActivityAsset.",
			"SourceCharacter moves PronounPossessive hips slowly on TargetCharacter's ActivityAsset.",
			"SourceCharacter rolls PronounPossessive hips gently around TargetCharacter's ActivityAsset.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "fuckAnal",
		template: "PenetrateSlow",
		maxProgress: 80,
		maxProgressSelf: 100,
		extraPrereqs: ["TargetNeeds-PenetrateItem"],
		receiveZone: "ItemButt",
		icon: "PenetrateSlow",
	},
	{
		name: "Seidr_FuckAnalFast",
		prereq: "Seidr_CanFuckAnal",
		label: "Ride with Ass (Rough)",
		chatLines: [
			"SourceCharacter rides TargetCharacter's ActivityAsset hard with PronounPossessive ass.",
			"SourceCharacter bounces PronounPossessive ass on TargetCharacter's ActivityAsset.",
			"SourceCharacter slams PronounPossessive hips on TargetCharacter's ActivityAsset.",
			"SourceCharacter fucks PronounPossessive ass on TargetCharacter's ActivityAsset hard.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "fuckAnal",
		template: "PenetrateFast",
		maxProgress: 100,
		maxProgressSelf: 100,
		extraPrereqs: ["TargetNeeds-PenetrateItem"],
		receiveZone: "ItemButt",
		icon: "PenetrateFast",
	},
	{
		name: "Seidr_SitOnFace",
		prereq: "Seidr_CanSitOnFace",
		label: "Sit on Face",
		chatLines: [
			"SourceCharacter sits on TargetCharacter's face, pressing PronounPossessive pussy to TargetPronounPossessive mouth.",
			"SourceCharacter lowers PronounPossessive pussy onto TargetCharacter's face.",
			"SourceCharacter straddles TargetCharacter's face and presses PronounPossessive pussy to TargetPronounPossessive mouth.",
			"SourceCharacter sits down on TargetCharacter's face, covering TargetPronounPossessive mouth with PronounPossessive pussy.",
		],
		zone: ZONE_MOUTH,
		intimate: true,
		kind: "sitFace",
		template: "MasturbateTongue",
		maxProgress: 100,
		maxProgressSelf: 67,
		extraPrereqs: [],
		receiveZone: "ItemVulva",
		icon: "MasturbateTongue",
	},
	{
		name: "Seidr_RidePussyMouth",
		prereq: "Seidr_CanSitOnFace",
		label: "Ride with Pussy",
		chatLines: [
			"SourceCharacter rides TargetCharacter's face, grinding PronounPossessive pussy against TargetPronounPossessive tongue.",
			"SourceCharacter grinds PronounPossessive pussy on TargetCharacter's tongue.",
			"SourceCharacter rides TargetCharacter's mouth, rubbing PronounPossessive pussy over TargetPronounPossessive tongue.",
			"SourceCharacter rocks PronounPossessive hips on TargetCharacter's face, using TargetPronounPossessive tongue on PronounPossessive pussy.",
		],
		zone: ZONE_MOUTH,
		intimate: true,
		kind: "sitFace",
		template: "MasturbateTongue",
		maxProgress: 100,
		maxProgressSelf: 67,
		extraPrereqs: [],
		receiveZone: "ItemVulva",
		icon: "MasturbateTongue",
	},
	{
		name: "Seidr_SuckStraponPanties",
		prereq: "Seidr_CanSuckStraponPanties",
		label: "Suck",
		chatLines: [
			"SourceCharacter sucks on TargetCharacter's strap-on.",
			"SourceCharacter wraps PronounPossessive lips around TargetCharacter's strap-on and sucks.",
			"SourceCharacter takes TargetCharacter's strap-on into PronounPossessive mouth and sucks.",
			"SourceCharacter kisses and sucks TargetCharacter's strap-on.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "oral",
		template: "SuckPenetrateItem",
		maxProgress: 80,
		maxProgressSelf: 67,
		extraPrereqs: ["UseMouth"],
		icon: "Suck",
	},
	{
		name: "Seidr_DeepThroatStraponPanties",
		prereq: "Seidr_CanDeepThroatStraponPanties",
		label: "Deepthroat",
		chatLines: [
			"SourceCharacter deepthroats TargetCharacter's strap-on.",
			"SourceCharacter takes TargetCharacter's strap-on all the way into PronounPossessive throat.",
			"SourceCharacter pushes TargetCharacter's strap-on deep into PronounPossessive throat.",
			"SourceCharacter swallows TargetCharacter's strap-on down PronounPossessive throat.",
		],
		zone: ZONE_VULVA,
		intimate: true,
		kind: "oral",
		template: "DeepThroat",
		maxProgress: 80,
		maxProgressSelf: 67,
		extraPrereqs: ["UseMouth"],
		icon: "Suck",
	},
];

/** Picked chat line for the next outbound Activity message. */
var seidrPendingIntimateChat: { name: string; text: string } | null = null;

function labelGroupsFor(act: SeidrIntimateDef): string[] {
	const zone = act.zone || ZONE_VULVA;
	const groups = [zone];
	if (zone === ZONE_VULVA) groups.push("ItemPenis");
	return groups;
}

function seidrIntimateChatLines(act: SeidrIntimateDef): string[] {
	return Array.isArray(act.chatLines) ? act.chatLines.filter(Boolean) : [];
}

function seidrIntimatePickChat(act: SeidrIntimateDef): string {
	const lines = seidrIntimateChatLines(act);
	if (!lines.length) return "";
	return lines[Math.floor(Math.random() * lines.length)];
}

/** Fallback when no pending pick (first line). */
export function seidrIntimateDefaultChat(act: SeidrIntimateDef): string {
	const lines = seidrIntimateChatLines(act);
	return lines[0] || "";
}

/** Call before ActivityRun (player) so inject + local dict share one picked line. */
export function seidrIntimatePrepareChat(act: SeidrIntimateDef) {
	if (!act || !act.name) return;
	const text = seidrIntimatePickChat(act);
	seidrPendingIntimateChat = { name: act.name, text: text };
	if (typeof ActivityDictionaryLoad === "function" && text) {
		try {
			const cache = ActivityDictionaryLoad();
			if (cache && cache.cache) {
				labelGroupsFor(act).forEach(function (group) {
					cache.cache["ChatOther-" + group + "-" + act.name] = text;
					cache.cache["ChatSelf-" + group + "-" + act.name] = text;
				});
			}
		} catch (e) { /* ignore */ }
	}
}

export function seidrIntimateConsumePending(activityName: string): string {
	if (!seidrPendingIntimateChat || seidrPendingIntimateChat.name !== activityName) return "";
	const text = seidrPendingIntimateChat.text || "";
	seidrPendingIntimateChat = null;
	return text;
}

const BY_NAME: Record<string, SeidrIntimateDef> = {};
SEIDR_INTIMATE.forEach(function (act) {
	BY_NAME[act.name] = act;
});

function findClubActivity(name: string): any | null {
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return null;
	for (let i = 0; i < ActivityFemale3DCG.length; i++) {
		const row = ActivityFemale3DCG[i] as any;
		if (row && row.Name === name) return row;
	}
	return null;
}

function assetGroupName(asset: any): string {
	if (!asset) return "";
	if (asset.Group && typeof asset.Group === "object" && asset.Group.Name) return String(asset.Group.Name);
	if (typeof asset.Group === "string") return asset.Group;
	if (asset.GroupName) return String(asset.GroupName);
	return "";
}

function isBodyPenis(asset: any): boolean {
	if (!asset) return false;
	return assetGroupName(asset) === "Pussy" && asset.Name === "Penis";
}

/** Prefer the ItemActivity asset; if missing (chat peers), take the first penetrate item on the acted character. */
function resolvePenetrateAsset(acted: any, asset: any): any {
	if (asset) return asset;
	if (!acted) return null;
	try {
		if (typeof CharacterItemsForActivity === "function") {
			const items = CharacterItemsForActivity(acted, "PenetrateItem" as any);
			if (Array.isArray(items) && items.length && items[0] && items[0].Asset) return items[0].Asset;
		}
	} catch (e) { /* ignore */ }
	try {
		if (typeof InventoryGet === "function") {
			const pussy = InventoryGet(acted, "Pussy");
			if (pussy && pussy.Asset && pussy.Asset.Name === "Penis") return pussy.Asset;
		}
	} catch (e2) { /* ignore */ }
	return null;
}

/** Normalize Asset so Club's penis ActivityOnOther special-case sees Group.Name. */
function penisAssetForClub(asset: any): any {
	if (!isBodyPenis(asset)) return asset;
	if (asset.Group && typeof asset.Group === "object" && asset.Group.Name === "Pussy") return asset;
	return { Name: "Penis", Group: { Name: "Pussy" } };
}

function wearsStraponPanties(C: any): boolean {
	if (!C) return false;
	try {
		if (typeof InventoryGet === "function") {
			const item = InventoryGet(C, "ItemPelvis");
			if (item && item.Asset && item.Asset.Name === STRAPON_PANTIES) return true;
		}
	} catch (e) { /* ignore */ }
	if (Array.isArray(C.Appearance)) {
		for (let i = 0; i < C.Appearance.length; i++) {
			const a = C.Appearance[i];
			if (a && a.Asset && a.Asset.Name === STRAPON_PANTIES) return true;
		}
	}
	return false;
}

function accessOk(C: any, prereq: string): boolean {
	try {
		if (typeof InventoryPrerequisiteMessage === "function") {
			return InventoryPrerequisiteMessage(C, prereq as any) === "";
		}
	} catch (e) { /* ignore */ }
	return true;
}

function canFuckVaginal(acting: any, _acted: any): boolean {
	if (!acting) return false;
	try {
		if (typeof acting.HasVagina === "function" && !acting.HasVagina()) return false;
		if (typeof acting.IsVulvaFull === "function" && acting.IsVulvaFull()) return false;
		if (typeof acting.IsVulvaChaste === "function" && acting.IsVulvaChaste()) return false;
		if (!accessOk(acting, "AccessCrotch") || !accessOk(acting, "AccessVulva")) return false;
		return true;
	} catch (e) {
		return false;
	}
}

function canFuckAnal(acting: any, _acted: any): boolean {
	if (!acting) return false;
	try {
		if (typeof acting.IsPlugged === "function" && acting.IsPlugged()) return false;
		if (typeof acting.IsButtChaste === "function" && acting.IsButtChaste()) return false;
		if (!accessOk(acting, "AccessButt")) return false;
		return true;
	} catch (e) {
		return false;
	}
}

function canOralStraponPanties(_acting: any, acted: any): boolean {
	return wearsStraponPanties(acted);
}

/** Actor has accessible pussy; target can use tongue (face-sitting). */
function canSitOnFace(acting: any, acted: any): boolean {
	if (!canFuckVaginal(acting, acted)) return false;
	if (!acted) return false;
	try {
		if (typeof acted.IsMouthBlocked === "function" && acted.IsMouthBlocked()) return false;
		return true;
	} catch (e) {
		return false;
	}
}

function arousalEnabled(C: any): boolean {
	return !!(C && C.ArousalSettings
		&& (C.ArousalSettings.Active === "Hybrid" || C.ArousalSettings.Active === "Automatic"));
}

function isReverseKind(kind: SeidrIntimateKind): boolean {
	return kind === "fuck" || kind === "fuckAnal" || kind === "sitFace";
}

/**
 * Actor (receiver) — Club ActivityEffect with the template on the actor's receive zone.
 */
function applyActorReceive(actor: any, acted: any, def: SeidrIntimateDef, asset: any) {
	if (!actor || typeof actor.IsPlayer !== "function" || !actor.IsPlayer()) return;
	if (!acted || (typeof acted.IsPlayer === "function" && acted.IsPlayer())) return;
	if (!arousalEnabled(actor)) return;
	if (typeof ActivityEffect !== "function") return;
	const zone = def.receiveZone || "ItemVulva";
	try {
		ActivityEffect(acted, actor, def.template as any, zone as any, 1, asset || null);
	} catch (e) {
		console.warn("[Seidr] intimate receive", e);
	}
}

/**
 * Target (giver) arousal.
 * - Ride (penis): full Club ActivityRunSelf / penis orgasm path.
 * - Ride (dildo): ActivityRunSelf without penis Asset → Club caps ~67 (some excitement).
 * - Sit on face: tongue-giver ActivityRunSelf with MasturbateTongue.
 */
function applyTargetGive(actor: any, acted: any, def: SeidrIntimateDef, asset: any) {
	if (!acted || typeof acted.IsPlayer !== "function" || !acted.IsPlayer()) return;
	if (!actor || (typeof actor.IsPlayer === "function" && actor.IsPlayer())) return;
	if (!arousalEnabled(acted)) return;
	const template = findClubActivity(def.template);
	if (!template || typeof ActivityRunSelf !== "function") return;

	let clubAsset: any = null;
	let groupName = "ItemVulva";
	if (def.kind === "sitFace") {
		groupName = "ItemMouth";
		clubAsset = null;
	} else {
		const resolved = resolvePenetrateAsset(acted, asset);
		if (!resolved) return;
		clubAsset = isBodyPenis(resolved) ? penisAssetForClub(resolved) : resolved;
	}

	let group: any = { Name: groupName };
	try {
		if (typeof AssetGroupGet === "function") {
			group = AssetGroupGet(acted.AssetFamily, groupName as any) || group;
		}
	} catch (eG) { /* ignore */ }
	try {
		ActivityRunSelf(acted, actor, template, group, clubAsset);
	} catch (e) {
		console.warn("[Seidr] intimate give", e);
	}
}

function activityNameFromArgs(A: unknown): string {
	if (typeof A === "string") return A;
	if (A && typeof A === "object") {
		const o = A as { Name?: unknown; Activity?: { Name?: unknown } };
		if (typeof o.Name === "string") return o.Name;
		if (o.Activity && typeof o.Activity.Name === "string") return o.Activity.Name;
	}
	return "";
}

function assetFromItemActivity(itemActivity: any): any {
	if (!itemActivity) return null;
	if (itemActivity.Item && itemActivity.Item.Asset) return itemActivity.Item.Asset;
	return null;
}

export function seidrIntimateActivities(): SeidrIntimateDef[] {
	return SEIDR_INTIMATE.slice();
}

export function seidrIntimateByName(name: string): SeidrIntimateDef | null {
	return (name && BY_NAME[name]) || null;
}

export function seidrIntimateIsReverse(name: string): boolean {
	const def = seidrIntimateByName(name);
	return !!(def && isReverseKind(def.kind));
}

export function seidrIntimateCheckPrereq(name: string, acting: any, acted: any): boolean | null {
	if (name === "Seidr_CanFuck") return canFuckVaginal(acting, acted);
	if (name === "Seidr_CanFuckAnal") return canFuckAnal(acting, acted);
	if (name === "Seidr_CanSitOnFace") return canSitOnFace(acting, acted);
	if (name === "Seidr_CanSuckStraponPanties" || name === "Seidr_CanDeepThroatStraponPanties") {
		return canOralStraponPanties(acting, acted);
	}
	return null;
}

/** Club Activity PNG (Penetrate / MasturbateTongue / Suck) for the activity menu. */
export function seidrIntimateButtonImage(name: string): string | null {
	const def = seidrIntimateByName(name);
	if (!def || !def.icon) return null;
	return seidrActivityIconUrl(def.icon);
}

export function seidrIntimateWriteLabels(cache: any) {
	if (!cache || !cache.cache) return;
	SEIDR_INTIMATE.forEach(function (act) {
		const chat = seidrIntimateDefaultChat(act);
		cache.cache["Activity" + act.name] = act.label;
		labelGroupsFor(act).forEach(function (group) {
			cache.cache["Label-ChatOther-" + group + "-" + act.name] = act.label;
			cache.cache["Label-ChatSelf-" + group + "-" + act.name] = act.label;
			cache.cache["ChatOther-" + group + "-" + act.name] = chat;
			cache.cache["ChatSelf-" + group + "-" + act.name] = chat;
		});
	});
}

function seidrInstallIntimateHooks() {
	Seidr.hookFunction("PreferenceGetActivityFactor", 2, function (args: any[], next: (a: any[]) => any) {
		const type = args[1];
		if (typeof type !== "string") return next(args);
		const def = seidrIntimateByName(type);
		if (!def) return next(args);
		const nextArgs = args.slice();
		nextArgs[1] = def.template;
		if (isReverseKind(def.kind) && typeof args[2] === "boolean") {
			nextArgs[2] = !args[2];
		}
		return next(nextArgs);
	});

	Seidr.hookFunction("ActivityCheckPrerequisite", 105, function (args: any[], next: (a: any[]) => any) {
		const name = args[0];
		try {
			const checked = seidrIntimateCheckPrereq(name, args[1], args[2]);
			if (checked !== null) return checked;
		} catch (e) {
			return false;
		}
		return next(args);
	});

	Seidr.hookFunction("ActivityRunSelf", 5, function (args: any[], next: (a: any[]) => any) {
		const activity = args[2];
		const name = activity && activity.Name;
		const def = typeof name === "string" ? seidrIntimateByName(name) : null;
		if (!def || !isReverseKind(def.kind)) return next(args);
		try {
			applyActorReceive(args[0], args[1], def, args[4]);
		} catch (e) {
			console.warn("[Seidr] intimate ActivityRunSelf", e);
		}
		return;
	});

	Seidr.hookFunction("ActivityEffect", 6, function (args: any[], next: (a: any[]) => any) {
		const name = activityNameFromArgs(args[2]);
		const def = seidrIntimateByName(name);
		if (!def) return next(args);
		if (def.kind === "oral") {
			const nextArgs = args.slice();
			nextArgs[2] = def.template;
			return next(nextArgs);
		}
		if (!isReverseKind(def.kind)) return next(args);
		try {
			const asset = args[5] || (typeof args[2] === "object" ? assetFromItemActivity(args[2]) : null);
			applyTargetGive(args[0], args[1], def, asset);
		} catch (e) {
			console.warn("[Seidr] intimate ActivityEffect", e);
		}
		return;
	});
}

Seidr.intimateActivities = seidrIntimateActivities;
Seidr.intimateByName = seidrIntimateByName;
Seidr.intimateButtonImage = seidrIntimateButtonImage;
Seidr.intimateWriteLabels = seidrIntimateWriteLabels;
Seidr.intimateCheckPrereq = seidrIntimateCheckPrereq;
Seidr.intimatePrepareChat = seidrIntimatePrepareChat;
Seidr.intimateConsumePending = seidrIntimateConsumePending;
Seidr.intimateDefaultChat = seidrIntimateDefaultChat;
Seidr.installIntimateActivities = function () {
	seidrInstallIntimateHooks();
};
