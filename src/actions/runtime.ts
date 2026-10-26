/** Register user Actions as Club activities + ActivityRun side effects. */
import { Seidr } from "../seidr";
import { seidrActionAvailable } from "./conditions";
import {
	SEIDR_ACTION_SOUNDS,
	seidrActionActivityName,
	seidrDefaultChatOther,
	seidrDefaultChatSelf,
	seidrParseActionActivityName,
	seidrStripClubSoundSuffix,
	type SeidrAction,
} from "./model";
import { seidrResolveActionIconUrl } from "./icons";
import { seidrGetActionById, seidrListActions } from "./store";

const PREREQ_PREFIX = "Seidr_CanAct_";
/** Dictionary Tag so roommates with Seidr can play Action sounds (Club Spank path). */
const SEIDR_SOUND_TAG = "SeidrSound";
/** Club AudioActions: Activity Content ending in these plays SpankSkin for everyone. */
const CLUB_SPANK_SUFFIX = "-Spank";

function nextActivityId(): number {
	let max = 9500;
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return max + 1;
	for (let i = 0; i < ActivityFemale3DCG.length; i++) {
		const id = ActivityFemale3DCG[i] && (ActivityFemale3DCG[i] as any).ActivityID;
		if (typeof id === "number" && id > max) max = id;
	}
	return max + 1;
}

function findFemale3(name: string): any | null {
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return null;
	for (let i = 0; i < ActivityFemale3DCG.length; i++) {
		if (ActivityFemale3DCG[i] && (ActivityFemale3DCG[i] as any).Name === name) return ActivityFemale3DCG[i];
	}
	return null;
}

function arousalMax(action: SeidrAction): number {
	if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return 0;
	const baseName = action.effects.arousal.activity;
	const base = findFemale3(baseName);
	if (base && typeof base.MaxProgress === "number" && base.MaxProgress > 0) return base.MaxProgress;
	return 80;
}

function arousalMaxSelf(action: SeidrAction): number {
	if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return 0;
	const baseName = action.effects.arousal.activity;
	const base = findFemale3(baseName);
	if (base && typeof base.MaxProgressSelf === "number") return base.MaxProgressSelf;
	if (base && typeof base.MaxProgress === "number") return base.MaxProgress;
	return 100;
}

function chatOther(action: SeidrAction): string {
	return (action.chatOther && action.chatOther.trim())
		? action.chatOther.trim()
		: seidrDefaultChatOther(action.name);
}

function chatSelf(action: SeidrAction): string {
	return (action.chatSelf && action.chatSelf.trim())
		? action.chatSelf.trim()
		: seidrDefaultChatSelf(action.name);
}

function arousalTemplate(action: SeidrAction): string | null {
	if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return null;
	const name = action.effects.arousal.activity;
	return typeof name === "string" && name ? name : "Caress";
}

function activityNameFromArgs(A: unknown): string {
	if (typeof A === "string") return A;
	if (A && typeof A === "object" && typeof (A as { Name?: unknown }).Name === "string") {
		return (A as { Name: string }).Name;
	}
	return "";
}

function seidrActNameFromChatData(data: any): string {
	if (!data) return "";
	if (typeof data.Content === "string") {
		const m = /Chat(?:Other|Self)-[^-]+-(.+)$/.exec(data.Content);
		if (m) return seidrStripClubSoundSuffix(m[1]);
	}
	if (Array.isArray(data.Dictionary)) {
		for (let i = 0; i < data.Dictionary.length; i++) {
			const entry = data.Dictionary[i];
			if (entry && typeof entry.ActivityName === "string"
				&& seidrParseActionActivityName(entry.ActivityName) != null) {
				return seidrStripClubSoundSuffix(entry.ActivityName);
			}
		}
	}
	return "";
}

function contentTriggersClubSpank(content: string): boolean {
	return typeof content === "string"
		&& (content.slice(-6) === "-Spank" || content.slice(-5) === "-Slap");
}

function soundOk(name: string): boolean {
	return typeof name === "string" && SEIDR_ACTION_SOUNDS.indexOf(name) >= 0;
}

function soundFromDictionary(data: any): string | null {
	if (!data || !Array.isArray(data.Dictionary)) return null;
	for (let i = 0; i < data.Dictionary.length; i++) {
		const entry = data.Dictionary[i];
		if (entry && entry.Tag === SEIDR_SOUND_TAG && soundOk(entry.Text)) return entry.Text;
	}
	return null;
}

function upsertDictTag(data: any, tag: string, text: string) {
	if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
	for (let i = 0; i < data.Dictionary.length; i++) {
		const entry = data.Dictionary[i];
		if (entry && entry.Tag === tag) {
			entry.Text = text;
			return;
		}
	}
	data.Dictionary.push({ Tag: tag, Text: text });
}

function focusGroupFromContent(content: string): string {
	const m = /^Chat(?:Other|Self)-([^-]+)-/.exec(content || "");
	return m ? m[1] : "";
}

function targetMemberFromDictionary(data: any): number | null {
	if (!data || !Array.isArray(data.Dictionary)) return null;
	for (let i = 0; i < data.Dictionary.length; i++) {
		const entry = data.Dictionary[i];
		if (!entry) continue;
		if (typeof entry.TargetCharacter === "number") return entry.TargetCharacter;
		if (typeof entry.MemberNumber === "number" && entry.Tag === "TargetCharacter") {
			return entry.MemberNumber;
		}
	}
	return null;
}

function findCharacterByMember(member: number | null): any | null {
	if (member == null) return null;
	try {
		if (typeof Player !== "undefined" && Player && Player.MemberNumber === member) return Player;
	} catch (e) { /* ignore */ }
	try {
		if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
			for (let i = 0; i < ChatRoomCharacter.length; i++) {
				const C = ChatRoomCharacter[i];
				if (C && C.MemberNumber === member) return C;
			}
		}
	} catch (e2) { /* ignore */ }
	return null;
}

function wornItemOn(C: any, group: string): any | null {
	if (!C || !group || typeof InventoryGet !== "function") return null;
	try {
		return InventoryGet(C, group as any) || null;
	} catch (e) {
		return null;
	}
}

/** Club asset-reference entry so ActivityAsset substitutes the worn item name. */
function injectActivityAsset(data: any, action: SeidrAction) {
	if (!data || typeof data.Content !== "string") return;
	if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
	for (let i = 0; i < data.Dictionary.length; i++) {
		const e = data.Dictionary[i];
		if (e && e.Tag === "ActivityAsset") return;
	}
	const group = focusGroupFromContent(data.Content);
	const targetN = targetMemberFromDictionary(data);
	let acted = findCharacterByMember(targetN);
	if (!acted && typeof Player !== "undefined") acted = Player;
	let item = group ? wornItemOn(acted, group) : null;
	if (!item && action.slots) {
		for (let s = 0; s < action.slots.length; s++) {
			item = wornItemOn(acted, action.slots[s]);
			if (item) break;
		}
	}
	if (!item || !item.Asset || !item.Asset.Name || !item.Asset.Group) return;
	const entry: any = {
		Tag: "ActivityAsset",
		AssetName: item.Asset.Name,
		GroupName: item.Asset.Group.Name,
	};
	if (item.Craft && item.Craft.Name) entry.CraftName = item.Craft.Name;
	data.Dictionary.push(entry);
}

/** Embed sound + ActivityAsset + remap ActivityName so peers hear FX / get Club arousal. */
function enrichOutboundSeidrActivity(data: any) {
	if (!data || data.Type !== "Activity") return;
	const actName = seidrActNameFromChatData(data);
	const id = seidrParseActionActivityName(actName);
	if (id == null) return;
	const action = seidrGetActionById(id);
	if (!action) return;
	if (!Array.isArray(data.Dictionary)) data.Dictionary = [];

	try { injectActivityAsset(data, action); } catch (eAsset) { /* ignore */ }

	const fx = action.effects || {};
	if (fx.sound && fx.sound.enabled && soundOk(fx.sound.sound)) {
		upsertDictTag(data, SEIDR_SOUND_TAG, fx.sound.sound);
		// Vanilla clients: only SpankSkin has an Activity Content suffix rule.
		if (fx.sound.sound === "SpankSkin" && typeof data.Content === "string"
			&& !contentTriggersClubSpank(data.Content)) {
			data.Content = data.Content + CLUB_SPANK_SUFFIX;
		}
	}

	const template = arousalTemplate(action);
	if (!template) return;
	for (let j = 0; j < data.Dictionary.length; j++) {
		const entry = data.Dictionary[j];
		if (entry && typeof entry.ActivityName === "string") {
			entry.ActivityName = template;
			return;
		}
	}
	data.Dictionary.push({ ActivityName: template });
}

function writeLabels(cache: any, actions: SeidrAction[]) {
	if (!cache || !cache.cache) return;
	actions.forEach(function (action) {
		const actName = seidrActionActivityName(action.id);
		const other = chatOther(action);
		const self = chatSelf(action);
		cache.cache["Activity" + actName] = action.name;
		action.slots.forEach(function (group) {
			cache.cache["Label-ChatOther-" + group + "-" + actName] = action.name;
			cache.cache["Label-ChatSelf-" + group + "-" + actName] = action.name;
			cache.cache["ChatOther-" + group + "-" + actName] = other;
			cache.cache["ChatSelf-" + group + "-" + actName] = self;
			// Content may gain -Spank for vanilla audio; keep dialog keys in sync.
			cache.cache["ChatOther-" + group + "-" + actName + CLUB_SPANK_SUFFIX] = other;
			cache.cache["ChatSelf-" + group + "-" + actName + CLUB_SPANK_SUFFIX] = self;
		});
	});
}

function ensureLabels(actions: SeidrAction[]) {
	if (typeof ActivityDictionaryLoad !== "function") return;
	const cache = ActivityDictionaryLoad();
	writeLabels(cache, actions);
}

function removeStaleActivities(keep: Record<string, boolean>) {
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
	for (let i = ActivityFemale3DCG.length - 1; i >= 0; i--) {
		const row = ActivityFemale3DCG[i] as any;
		if (!row || typeof row.Name !== "string") continue;
		if (row.Name.indexOf("Seidr_Act_") !== 0) continue;
		if (keep[row.Name]) continue;
		ActivityFemale3DCG.splice(i, 1);
	}
	if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
		for (let j = ActivityFemale3DCGOrdering.length - 1; j >= 0; j--) {
			const n = ActivityFemale3DCGOrdering[j];
			if (typeof n === "string" && n.indexOf("Seidr_Act_") === 0 && !keep[n]) {
				ActivityFemale3DCGOrdering.splice(j, 1);
			}
		}
	}
}

function bindAction(action: SeidrAction): any {
	const zones = action.slots.slice();
	const max = arousalMax(action);
	const maxSelf = arousalMaxSelf(action);
	const selfOk = action.audience === "selfOnly" || action.audience === "both";
	const otherOk = action.audience === "othersOnly" || action.audience === "both";
	const bound: any = {
		Name: seidrActionActivityName(action.id),
		ActivityID: 0,
		MaxProgress: max,
		MaxProgressSelf: maxSelf,
		Prerequisite: [PREREQ_PREFIX + action.id],
		Target: otherOk ? zones.slice() : (selfOk ? zones.slice() : zones.slice()),
	};
	if (selfOk) bound.TargetSelf = zones.slice();
	return bound;
}

/** Rebuild Club ActivityFemale3DCG entries from the Actions bag. */
export function seidrSyncUserActions() {
	if (Seidr.SHOW_ACTIONS === false) return;
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
	const actions = seidrListActions();
	const keep: Record<string, boolean> = {};
	actions.forEach(function (action) {
		const name = seidrActionActivityName(action.id);
		keep[name] = true;
		const bound = bindAction(action);
		let existing = findFemale3(name);
		if (existing) {
			if (typeof existing.ActivityID !== "number") existing.ActivityID = nextActivityId();
			existing.MaxProgress = bound.MaxProgress;
			existing.MaxProgressSelf = bound.MaxProgressSelf;
			existing.Prerequisite = bound.Prerequisite;
			existing.Target = bound.Target;
			if (bound.TargetSelf) existing.TargetSelf = bound.TargetSelf;
			else delete existing.TargetSelf;
		} else {
			bound.ActivityID = nextActivityId();
			(ActivityFemale3DCG as any[]).push(bound);
			if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
				(ActivityFemale3DCGOrdering as any[]).push(name);
			}
		}
	});
	removeStaleActivities(keep);
	ensureLabels(actions);
}

function applyPose(C: any, pose: string) {
	if (!C || !pose) return;
	try {
		if (typeof PoseSetActive === "function") PoseSetActive(C, pose as any, false);
		else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose as any);
	} catch (e) { /* ignore */ }
	try {
		if (typeof ChatRoomCharacterUpdate === "function") {
			ChatRoomCharacterUpdate(C);
		} else if (typeof ServerSend === "function" && C.IsPlayer && C.IsPlayer()) {
			ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
		}
	} catch (e2) { /* ignore */ }
}

function canPoseTarget(actor: any, acted: any): boolean {
	if (!actor || !acted) return false;
	if (actor === acted || (actor.IsPlayer && actor.IsPlayer() && acted.IsPlayer && acted.IsPlayer())) return true;
	try {
		if (typeof ServerChatRoomGetAllowItem === "function") {
			return !!ServerChatRoomGetAllowItem(actor, acted);
		}
	} catch (e) { /* ignore */ }
	return !!(acted.AllowItem);
}

function runSideEffects(action: SeidrAction, actor: any, acted: any) {
	const fx = action.effects || {};
	// Sound: embedded in Activity Dictionary (SeidrSound) and played via
	// AudioPlaySoundForChatMessage on every Seidr client — same as Club Spank.
	if (fx.pose && fx.pose.enabled && fx.pose.pose) {
		const self = actor === acted
			|| (typeof actor.MemberNumber === "number" && actor.MemberNumber === acted.MemberNumber);
		if (self || canPoseTarget(actor, acted)) {
			applyPose(self ? actor : acted, fx.pose.pose);
		}
	}
}

function prereqOk(actionId: number, acting: any, acted: any): boolean {
	const action = seidrGetActionById(actionId);
	if (!action) return false;
	return seidrActionAvailable(action, acting, acted);
}

export function seidrActionDialogForContent(content: string): string {
	const match = /^(Chat(?:Other|Self))-[^-]+-(.+)$/.exec(content || "");
	if (!match) return "";
	const id = seidrParseActionActivityName(seidrStripClubSoundSuffix(match[2]));
	if (id == null) return "";
	const action = seidrGetActionById(id);
	if (!action) return "";
	return match[1] === "ChatSelf" ? chatSelf(action) : chatOther(action);
}

export function seidrInstallUserActions() {
	if (Seidr.SHOW_ACTIONS === false) return;
	seidrSyncUserActions();

	// Remap Seidr_Act_* preference factor → chosen BC activity (Caress, …).
	Seidr.hookFunction("PreferenceGetActivityFactor", 1, function (args, next) {
		const type = args[1];
		const id = typeof type === "string" ? seidrParseActionActivityName(type) : null;
		if (id == null) return next(args);
		const action = seidrGetActionById(id);
		if (!action) return 0;
		const template = arousalTemplate(action);
		if (template) {
			const nextArgs = args.slice();
			nextArgs[1] = template;
			return next(nextArgs);
		}
		return 2;
	});

	// Run Club arousal math on the template activity (Caress, …), not Seidr_Act_*.
	Seidr.hookFunction("ActivityEffect", 5, function (args, next) {
		const name = activityNameFromArgs(args[2]);
		const id = seidrParseActionActivityName(name);
		if (id == null) return next(args);
		const action = seidrGetActionById(id);
		if (!action) return;
		const template = arousalTemplate(action);
		if (!template) return;
		const nextArgs = args.slice();
		nextArgs[2] = template;
		return next(nextArgs);
	});

	// Embed SeidrSound + rewrite ActivityName for Club arousal on peers.
	Seidr.hookFunction("ServerSend", 6, function (args, next) {
		try {
			if (args && args[0] === "ChatRoomChat") enrichOutboundSeidrActivity(args[1]);
		} catch (e) { /* ignore */ }
		return next(args);
	});

	// Play Action sounds from Dictionary on every Seidr client (issuer + room).
	Seidr.hookFunction("AudioPlaySoundForChatMessage", 5, function (args, next) {
		try {
			const data = args[0];
			const metadata = args[3];
			// Club already plays SpankSkin when Content ends with -Spank/-Slap — skip double.
			if (data && data.Type === "Activity" && contentTriggersClubSpank(data.Content)) {
				return next(args);
			}
			const seidrSnd = soundFromDictionary(data);
			if (seidrSnd && data && data.Type === "Activity" && metadata) {
				const involved = typeof ChatRoomMessageInvolvesPlayer === "function"
					? ChatRoomMessageInvolvesPlayer(data)
					: true;
				if (typeof AudioShouldSilenceSound === "function" && AudioShouldSilenceSound(involved)) {
					return false;
				}
				const soundEffect: [string, number] = [seidrSnd, 0];
				const Target = metadata.TargetCharacter;
				if (Target) {
					try {
						if (Target.MemberNumber === Player.MemberNumber) soundEffect[1] += 3;
						else if (data.Sender !== Player.MemberNumber) soundEffect[1] -= 3;
					} catch (eVol) { /* ignore */ }
					if (typeof AudioPlaySoundEffect === "function") AudioPlaySoundEffect(soundEffect);
					return false;
				}
			}
		} catch (e) { /* ignore */ }
		return next(args);
	});

	Seidr.hookFunction("ActivityCheckPrerequisite", 110, function (args, next) {
		const name = args[0];
		if (typeof name === "string" && name.indexOf(PREREQ_PREFIX) === 0) {
			const id = parseInt(name.slice(PREREQ_PREFIX.length), 10);
			if (!Number.isFinite(id)) return false;
			try {
				return prereqOk(id, args[1], args[2]);
			} catch (e) {
				return false;
			}
		}
		return next(args);
	});

	Seidr.hookFunction("ActivityRun", 6, function (args, next) {
		const actor = args[0];
		const acted = args[1];
		const itemActivity = args[3];
		const actName = itemActivity && itemActivity.Activity && itemActivity.Activity.Name;
		const id = typeof actName === "string" ? seidrParseActionActivityName(actName) : null;
		const action = id != null ? seidrGetActionById(id) : null;
		const result = next(args);
		if (action && actor && typeof actor.IsPlayer === "function" && actor.IsPlayer()) {
			try {
				runSideEffects(action, actor, acted);
			} catch (e) {
				console.warn("[Seidr] action fx", e);
			}
		}
		return result;
	});

	Seidr.tryHook("ElementButton.CreateForActivity", "ElementButton.CreateForActivity", 6, function (args, next) {
		const activity = args[1];
		const actName = activity && activity.Activity && activity.Activity.Name;
		const id = typeof actName === "string" ? seidrParseActionActivityName(actName) : null;
		if (id != null) {
			const action = seidrGetActionById(id);
			const label = (action && action.name) || "Action";
			args[4] = Object.assign({}, args[4] || {}, {
				image: seidrResolveActionIconUrl(action),
				tooltip: label,
			});
		}
		return next(args);
	});

	Seidr.syncUserActions = seidrSyncUserActions;
	Seidr.actionDialogForContent = seidrActionDialogForContent;
}
