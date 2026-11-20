/** Slot / activity lists for Commands settings + availability checks */

export type SeidrCmdSlotOpt = { id: string; label: string };
export type SeidrCmdActivityOpt = { id: string; label: string };

declare const AssetGroup: any;
declare const ActivityFemale3DCG: any;
declare const ActivityAllowedForGroup: any;
declare const ActivityDictionaryLoad: any;
declare const ScreenFileGetPath: any;
declare const CommonCSVCache: Record<string, string[][]> | undefined;
declare const ChatRoomCharacter: any;
declare const Player: any;

/** EN ActivityDictionary.csv rows (Club keeps these in CommonCSVCache before CN/TW overlay). */
let enActivityDict: Record<string, string> | null = null;

function activityDictPath(): string {
	try {
		if (typeof ScreenFileGetPath === "function") {
			return String(ScreenFileGetPath("ActivityDictionary.csv", "Character", "Preference") || "");
		}
	} catch (e) { /* ignore */ }
	return "Screens/Character/Preference/ActivityDictionary.csv";
}

function ensureEnActivityDict(): Record<string, string> {
	if (enActivityDict && Object.keys(enActivityDict).length > 0) return enActivityDict;
	const next: Record<string, string> = {};
	try {
		// Ensure Club has fetched the CSV (even if TextCache is localized).
		if (typeof ActivityDictionaryLoad === "function") ActivityDictionaryLoad();
		const path = activityDictPath();
		const lines = typeof CommonCSVCache !== "undefined" && path ? CommonCSVCache[path] : null;
		if (Array.isArray(lines)) {
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || !line[0] || line[1] == null) continue;
				next[String(line[0])] = String(line[1]);
			}
		}
	} catch (e) { /* ignore */ }
	// Only pin the cache once rows exist (CSV may still be loading on first open).
	if (Object.keys(next).length > 0) enActivityDict = next;
	return next;
}

/**
 * Resolve a display label without ActivityDictionaryText / TextCache.get.
 * Club logs console.debug(Error) for every unknown key; Commands UI lists many
 * Target-only activities under ChatSelf tags that do not exist (e.g. Rub on
 * ItemTorso is Label-ChatOther-… only).
 */
function activityDictLookup(key: string): string | null {
	try {
		if (typeof ActivityDictionaryLoad !== "function") return null;
		const tc = ActivityDictionaryLoad();
		if (!tc) return null;
		let t: unknown;
		if (typeof tc.getOptional === "function") t = tc.getOptional(key);
		else if (tc.cache) t = tc.cache[key];
		if (typeof t !== "string" || !t) return null;
		if (String(t).indexOf("MISSING") >= 0) return null;
		return String(t);
	} catch (e) {
		return null;
	}
}

/** Prefer English dictionary text so Seidr UI stays EN even when Club language is CN/TW. */
function activityLookupPreferEn(key: string): string | null {
	const en = ensureEnActivityDict()[key];
	if (typeof en === "string" && en && en.indexOf("MISSING") < 0) return en;
	return activityDictLookup(key);
}

function findActivityDef(name: string): any | null {
	try {
		if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return null;
		for (let i = 0; i < ActivityFemale3DCG.length; i++) {
			const a = ActivityFemale3DCG[i] as any;
			if (a && a.Name === name) return a;
		}
	} catch (e) { /* ignore */ }
	return null;
}

/**
 * Display label for an activity. Prefer EN ActivityDictionary, then zone Labels
 * (so BrushItem → "Brush Hair" not generic "Brush"), then localized fallback, then Name.
 * Echo/mod activities whose Name is already Chinese keep that Name (no EN entry).
 */
function activityLabel(name: string, group?: string): string {
	if (group) {
		const keys = [
			"Label-ChatOther-" + group + "-" + name,
			"Label-ChatSelf-" + group + "-" + name,
		];
		for (let i = 0; i < keys.length; i++) {
			const t = activityLookupPreferEn(keys[i]);
			if (t) return t;
		}
	}
	const def = findActivityDef(name);
	const zones: string[] = [];
	if (def) {
		if (Array.isArray(def.Target)) {
			for (let i = 0; i < def.Target.length; i++) zones.push(String(def.Target[i]));
		}
		if (Array.isArray(def.TargetSelf)) {
			for (let i = 0; i < def.TargetSelf.length; i++) {
				const z = String(def.TargetSelf[i]);
				if (zones.indexOf(z) < 0) zones.push(z);
			}
		}
	}
	for (let i = 0; i < zones.length; i++) {
		const z = zones[i];
		const t =
			activityLookupPreferEn("Label-ChatOther-" + z + "-" + name) ||
			activityLookupPreferEn("Label-ChatSelf-" + z + "-" + name);
		if (t) return t;
	}
	const generic = activityLookupPreferEn("Activity" + name);
	if (generic) return generic;
	return name;
}

/** Club/mod activities that need a held / worn tool (Needs-* / TargetNeeds-*). */
function activityNeedsItem(def: any): boolean {
	const prereq = def && Array.isArray(def.Prerequisite) ? def.Prerequisite : [];
	for (let i = 0; i < prereq.length; i++) {
		const p = String(prereq[i] || "");
		if (p.indexOf("Needs-") === 0 || p.indexOf("TargetNeeds-") === 0) return true;
	}
	return false;
}

function activityOpt(name: string, group?: string): SeidrCmdActivityOpt {
	let label = activityLabel(name, group);
	const def = findActivityDef(name);
	if (def && activityNeedsItem(def)) label += " (item)";
	return { id: name, label: label };
}

/** Whether `slot` is a Target / TargetSelf zone for this activity def. */
function activityTargetsSlot(a: any, slot: string): boolean {
	if (!a || !slot) return false;
	if (Array.isArray(a.Target) && a.Target.indexOf(slot) >= 0) return true;
	if (Array.isArray(a.TargetSelf) && a.TargetSelf.indexOf(slot) >= 0) return true;
	// Club uses TargetSelf: true to mean "same zones as Target, on self".
	if (a.TargetSelf === true && Array.isArray(a.Target) && a.Target.indexOf(slot) >= 0) return true;
	return false;
}

/** First Target / TargetSelf zone for an activity (for Reaction Filter-by-Slot defaults). */
export function seidrCmdActivityPrimarySlot(activityName: string): string {
	const def = findActivityDef(String(activityName || ""));
	if (!def) return "";
	if (Array.isArray(def.Target) && def.Target[0]) return String(def.Target[0]);
	if (Array.isArray(def.TargetSelf) && def.TargetSelf[0]) return String(def.TargetSelf[0]);
	return "";
}

/** Item* (+ cloth) groups suitable for activity targets. */
export function seidrCmdListSlots(): SeidrCmdSlotOpt[] {
	const out: SeidrCmdSlotOpt[] = [];
	const seen: Record<string, boolean> = {};
	try {
		if (typeof AssetGroup !== "undefined" && Array.isArray(AssetGroup)) {
			for (let i = 0; i < AssetGroup.length; i++) {
				const g = AssetGroup[i] as any;
				if (!g || !g.Name) continue;
				if (typeof g.IsItem === "function" ? !g.IsItem() : (g.Category !== "Item" && String(g.Name).indexOf("Item") !== 0)) {
					continue;
				}
				if (g.MirrorActivitiesFrom) continue;
				if (seen[g.Name]) continue;
				seen[g.Name] = true;
				const label = g.Description || g.Name;
				out.push({ id: g.Name, label: String(label) });
			}
		}
	} catch (e) { /* ignore */ }
	if (!out.length) {
		return [
			{ id: "ItemTorso", label: "Torso" },
			{ id: "ItemArms", label: "Arms" },
			{ id: "ItemHands", label: "Hands" },
			{ id: "ItemMouth", label: "Mouth" },
			{ id: "ItemLegs", label: "Legs" },
			{ id: "ItemFeet", label: "Feet" },
			{ id: "ItemBoots", label: "Boots" },
		];
	}
	out.sort(function (a, b) { return a.label.localeCompare(b.label); });
	return out;
}

/** All Club/mod activity names (for Reaction activity triggers). */
export function seidrCmdListAllActivities(): SeidrCmdActivityOpt[] {
	const out: SeidrCmdActivityOpt[] = [];
	const seen: Record<string, boolean> = {};
	try {
		if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return out;
		for (let i = 0; i < ActivityFemale3DCG.length; i++) {
			const a = ActivityFemale3DCG[i] as any;
			if (!a || !a.Name || seen[a.Name]) continue;
			seen[a.Name] = true;
			out.push(activityOpt(a.Name));
		}
	} catch (e) { /* ignore */ }
	out.sort(function (a, b) { return a.label.localeCompare(b.label); });
	return out;
}

/** Activities that list `slot` in Target or TargetSelf (settings dropdown). */
export function seidrCmdListActivitiesForSlot(slot: string): SeidrCmdActivityOpt[] {
	const s = String(slot || "");
	const out: SeidrCmdActivityOpt[] = [];
	const seen: Record<string, boolean> = {};
	try {
		if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return out;
		for (let i = 0; i < ActivityFemale3DCG.length; i++) {
			const a = ActivityFemale3DCG[i] as any;
			if (!a || !a.Name) continue;
			if (!activityTargetsSlot(a, s)) continue;
			if (seen[a.Name]) continue;
			seen[a.Name] = true;
			out.push(activityOpt(a.Name, s));
		}
	} catch (e) { /* ignore */ }
	out.sort(function (a, b) { return a.label.localeCompare(b.label); });
	return out;
}

export type SeidrCmdRoomPerson = {
	memberNumber: number;
	name: string;
	nickname: string;
	/** Display line for autocomplete. */
	label: string;
	/** Search haystack (lower). */
	search: string;
};

export function seidrCmdRoomPeople(): SeidrCmdRoomPerson[] {
	const out: SeidrCmdRoomPerson[] = [];
	try {
		const list = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)
			? ChatRoomCharacter
			: [];
		for (let i = 0; i < list.length; i++) {
			const C = list[i] as any;
			if (!C || C.MemberNumber == null) continue;
			const mn = Number(C.MemberNumber);
			const name = String(C.Name || "");
			const nickname = String(C.Nickname || C.NickName || "");
			const label = (nickname ? nickname + " · " : "") + name + " #" + mn;
			const search = (nickname + " " + name + " " + mn).toLowerCase();
			out.push({
				memberNumber: mn,
				name: name,
				nickname: nickname,
				label: label,
				search: search,
			});
		}
	} catch (e) { /* ignore */ }
	return out;
}

export function seidrCmdFindCharacter(memberNumber: number): any | null {
	try {
		const list = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)
			? ChatRoomCharacter
			: [];
		for (let i = 0; i < list.length; i++) {
			const C = list[i] as any;
			if (C && Number(C.MemberNumber) === memberNumber) return C;
		}
	} catch (e) { /* ignore */ }
	return null;
}

/** Whether activity is currently allowed on target for slot. */
export function seidrCmdActivityAvailable(target: any, slot: string, activityName: string): boolean {
	if (!target || !slot || !activityName) return false;
	try {
		if (typeof ActivityAllowedForGroup !== "function") return false;
		const list = ActivityAllowedForGroup(target, slot) || [];
		for (let i = 0; i < list.length; i++) {
			const ia = list[i];
			if (!ia || !ia.Activity || ia.Blocked === "blocked") continue;
			if (ia.Activity.Name === activityName) return true;
		}
	} catch (e) { /* ignore */ }
	return false;
}

export function seidrCmdFindItemActivity(target: any, slot: string, activityName: string): any | null {
	if (!target || !slot || !activityName) return null;
	try {
		if (typeof ActivityAllowedForGroup !== "function") return null;
		const list = ActivityAllowedForGroup(target, slot) || [];
		for (let i = 0; i < list.length; i++) {
			const ia = list[i];
			if (!ia || !ia.Activity || ia.Blocked === "blocked") continue;
			if (ia.Activity.Name === activityName) return ia;
		}
	} catch (e) { /* ignore */ }
	return null;
}
