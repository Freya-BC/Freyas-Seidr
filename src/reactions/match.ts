/** Match ChatRoomMessage events to Autoreaction definitions */
import { Seidr } from "../seidr";
import type { SeidrReaction } from "./model";
import { seidrListReactions } from "./store";

export type SeidrReactionMatchContext = {
	reaction: SeidrReaction;
	/** Other party for action steps (Source when on-me; Target when I-perform; Self for phrase/climax). */
	issuerMemberNumber: number;
	kind: "activity" | "phrase" | "climax";
};

declare const Player: any;

function myMember(): number | null {
	try {
		if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
			return Player.MemberNumber;
		}
	} catch (e) { /* ignore */ }
	return null;
}

function activityNamesFromMessage(data: any): string[] {
	const names: string[] = [];
	const seen: Record<string, boolean> = {};
	function add(n: string) {
		const s = String(n || "").trim();
		if (!s || seen[s]) return;
		seen[s] = true;
		names.push(s);
	}
	try {
		if (typeof Seidr.activityNameFromMessage === "function") {
			add(Seidr.activityNameFromMessage(data));
		}
	} catch (e) { /* ignore */ }
	const match = /Chat(?:Other|Self)-[^-]+-(.+)$/.exec((data && data.Content) || "");
	if (match) add(match[1]);
	return names;
}

/** Club zone from Content `ChatOther-ItemEars-Caress` or Dictionary FocusGroup / Group. */
export function seidrActivitySlotFromMessage(data: any): string {
	const match = /^Chat(?:Other|Self)-([^-]+)-/.exec((data && data.Content) || "");
	if (match) return match[1];
	try {
		if (typeof Seidr.dictValue === "function") {
			const keys = ["FocusGroup", "Group", "ActivityGroup", "TargetGroup"];
			for (let i = 0; i < keys.length; i++) {
				const v = Seidr.dictValue(data && data.Dictionary, keys[i]);
				if (typeof v === "string" && v.trim()) return v.trim();
				if (v && typeof v === "object" && typeof (v as { Name?: string }).Name === "string") {
					return String((v as { Name: string }).Name);
				}
			}
		}
	} catch (e) { /* ignore */ }
	return "";
}

function dictMember(data: any, key: string): number | null {
	try {
		if (typeof Seidr.dictValue === "function") {
			const v = Seidr.dictValue(data && data.Dictionary, key);
			if (typeof v === "number") return v;
		}
	} catch (e) { /* ignore */ }
	return null;
}

function activityMatchesTrigger(
	names: string[],
	iPerform: boolean,
	onMe: boolean,
	messageSlot: string,
	trigger: { activity: string; whenIPerform: boolean; whenOnMe: boolean; slot?: string }
): boolean {
	const want = String(trigger.activity || "").trim().toLowerCase();
	if (!want) return false;
	let nameHit = false;
	for (let i = 0; i < names.length; i++) {
		if (names[i].toLowerCase() === want) {
			nameHit = true;
			break;
		}
	}
	if (!nameHit) return false;
	const wantSlot = String(trigger.slot || "").trim();
	if (wantSlot) {
		if (!messageSlot || messageSlot.toLowerCase() !== wantSlot.toLowerCase()) return false;
	}
	if (iPerform && trigger.whenIPerform) return true;
	if (onMe && trigger.whenOnMe) return true;
	return false;
}

/**
 * Club orgasm-related Activity Content from the local player:
 * - climax: Orgasm0…Orgasm9
 * - ruined: OrgasmFailTimeout* / OrgasmFailSurrender*
 * - resist mini-game success: OrgasmResist0…
 */
export function seidrIsClimaxActivityContent(content: string): boolean {
	const c = String(content || "").trim();
	return /^Orgasm\d+$/.test(c) || /^OrgasmFail/.test(c) || /^OrgasmResist/.test(c);
}

/** First enabled reaction matching my climax Activity, or null. */
export function seidrMatchClimaxReaction(data: any): SeidrReactionMatchContext | null {
	if (!data || data.Type !== "Activity") return null;
	if (!seidrIsClimaxActivityContent(data.Content)) return null;
	const me = myMember();
	if (me == null) return null;
	let source = dictMember(data, "SourceCharacter");
	if (typeof source !== "number") {
		source = typeof data.Sender === "number" ? data.Sender : null;
	}
	if (source !== me) return null;

	const list = seidrListReactions();
	for (let i = 0; i < list.length; i++) {
		const r = list[i];
		if (!r.enabled || !r.onClimax) continue;
		return { reaction: r, issuerMemberNumber: me, kind: "climax" };
	}
	return null;
}

/** First enabled reaction matching an Activity message, or null. */
export function seidrMatchActivityReaction(data: any): SeidrReactionMatchContext | null {
	if (!data || data.Type !== "Activity") return null;
	// Climax lines are handled separately (onClimax), not as named activities.
	if (seidrIsClimaxActivityContent(data.Content)) return null;
	const me = myMember();
	if (me == null) return null;
	const names = activityNamesFromMessage(data);
	if (!names.length) return null;
	const messageSlot = seidrActivitySlotFromMessage(data);

	let source = dictMember(data, "SourceCharacter");
	if (typeof source !== "number") {
		source = typeof data.Sender === "number" ? data.Sender : null;
	}
	const target = dictMember(data, "TargetCharacter");
	if (typeof source !== "number" || typeof target !== "number") return null;

	const iPerform = source === me;
	const onMe = target === me;
	if (!iPerform && !onMe) return null;

	const list = seidrListReactions();
	for (let i = 0; i < list.length; i++) {
		const r = list[i];
		if (!r.enabled) continue;
		let hit = false;
		for (let j = 0; j < r.activities.length; j++) {
			if (activityMatchesTrigger(names, iPerform, onMe, messageSlot, r.activities[j])) {
				hit = true;
				break;
			}
		}
		if (!hit) continue;
		// Issuer = other party: Source when on-me; Target when I-perform.
		let issuer = me;
		if (onMe && source !== me) issuer = source;
		else if (iPerform && target !== me) issuer = target;
		return { reaction: r, issuerMemberNumber: issuer, kind: "activity" };
	}
	return null;
}

/** First enabled reaction matching my own Chat phrase, or null. */
export function seidrMatchPhraseReaction(data: any): SeidrReactionMatchContext | null {
	if (!data || data.Type !== "Chat") return null;
	const me = myMember();
	if (me == null) return null;
	if (typeof data.Sender !== "number" || data.Sender !== me) return null;
	const content = String(data.Content || "").trim();
	if (!content) return null;
	const key = content.toLowerCase();

	const list = seidrListReactions();
	for (let i = 0; i < list.length; i++) {
		const r = list[i];
		if (!r.enabled) continue;
		const phrase = String(r.phrase || "").trim();
		if (!phrase) continue;
		if (phrase.toLowerCase() !== key) continue;
		return { reaction: r, issuerMemberNumber: me, kind: "phrase" };
	}
	return null;
}
