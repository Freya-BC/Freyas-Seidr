/** Slot / activity lists for Commands settings + availability checks */

export type SeidrCmdSlotOpt = { id: string; label: string };
export type SeidrCmdActivityOpt = { id: string; label: string };

declare const AssetGroup: any;
declare const ActivityFemale3DCG: any;
declare const ActivityAllowedForGroup: any;
declare const ActivityDictionaryLoad: any;
declare const ActivityBuildChatTag: any;
declare const ActivityDictionaryText: any;
declare const ChatRoomCharacter: any;
declare const Player: any;

function activityLabel(name: string, group?: string): string {
	try {
		if (typeof ActivityBuildChatTag === "function" && typeof ActivityDictionaryText === "function" && group) {
			const key = ActivityBuildChatTag(Player, { Name: group }, { Name: name }, true);
			const t = ActivityDictionaryText(key);
			if (t && String(t).indexOf("MISSING") < 0) return String(t);
		}
	} catch (e) { /* ignore */ }
	try {
		const cache = typeof ActivityDictionaryLoad === "function" && ActivityDictionaryLoad().cache;
		if (cache && cache["Activity" + name]) return String(cache["Activity" + name]);
	} catch (e2) { /* ignore */ }
	return name;
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
			const t = Array.isArray(a.Target) && a.Target.indexOf(s) >= 0;
			const ts = Array.isArray(a.TargetSelf) && a.TargetSelf.indexOf(s) >= 0;
			if (!t && !ts) continue;
			if (seen[a.Name]) continue;
			seen[a.Name] = true;
			out.push({ id: a.Name, label: activityLabel(a.Name, s) });
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
