/** Seidr Autoreaction — local trigger → script bags */
import { SEIDR_ACTION_CHAT_MAX } from "../actions/model";
import {
	seidrNormalizeWiggleSlots,
	type SeidrWiggleSlot,
} from "../animations/model";

export const SEIDR_REACTIONS_MAX = 50;
export const SEIDR_REACTION_STEPS_MAX = 5;
export const SEIDR_REACTION_NAME_MAX = 40;
export const SEIDR_REACTION_PHRASE_MAX = 80;
export const SEIDR_REACTION_ACTIVITIES_MAX = 12;

export type SeidrReactionActivityTrigger = {
	activity: string;
	whenIPerform: boolean;
	whenOnMe: boolean;
	/**
	 * Optional Club appearance / activity zone (e.g. ItemEars, ItemButt).
	 * Empty = any slot. Matched from ChatOther/Self-Group-Activity Content.
	 */
	slot?: string;
	/**
	 * Persisted Activity-list filter zone (Settings UI "Filter by Slot").
	 * Empty = show all activities. Independent of match `slot`.
	 */
	filterSlot?: string;
};

export type SeidrReactionSayStep = {
	kind: "say";
	text: string;
};

export type SeidrReactionAnimationStep = {
	kind: "animation";
	animationId: number;
};

/** Play ready Wiggle configs for these slots in parallel (skip missing / not worn). */
export type SeidrReactionWiggleStep = {
	kind: "wiggle";
	slots: SeidrWiggleSlot[];
};

export type SeidrReactionActionStep = {
	kind: "action";
	actionName: string;
	target: "self" | "issuer";
};

export type SeidrReactionStep =
	| SeidrReactionSayStep
	| SeidrReactionAnimationStep
	| SeidrReactionWiggleStep
	| SeidrReactionActionStep;

export type SeidrReaction = {
	id: number;
	name: string;
	enabled: boolean;
	activities: SeidrReactionActivityTrigger[];
	phrase?: string;
	/** Fires on your orgasm; older saves used this for all three outcomes. */
	onClimax?: boolean;
	onDeny?: boolean;
	onResist?: boolean;
	steps: SeidrReactionStep[];
};

export type SeidrReactionsBag = {
	nextId: number;
	list: SeidrReaction[];
};

export function seidrDefaultReactionActivityTrigger(): SeidrReactionActivityTrigger {
	return { activity: "", whenIPerform: false, whenOnMe: true, slot: "", filterSlot: "" };
}

export function seidrDefaultReactionSayStep(): SeidrReactionSayStep {
	return { kind: "say", text: "" };
}

export function seidrDefaultReactionAnimationStep(animationId?: number): SeidrReactionAnimationStep {
	return { kind: "animation", animationId: animationId && animationId > 0 ? animationId : 0 };
}

export function seidrDefaultReactionWiggleStep(slots?: SeidrWiggleSlot[]): SeidrReactionWiggleStep {
	const s = seidrNormalizeWiggleSlots(slots && slots.length ? slots : ["tail"]);
	return { kind: "wiggle", slots: s.length ? s : ["tail"] };
}

export function seidrDefaultReactionActionStep(): SeidrReactionActionStep {
	return { kind: "action", actionName: "", target: "issuer" };
}

export function seidrDefaultReaction(id: number): SeidrReaction {
	return {
		id: id,
		name: "Reaction " + id,
		enabled: true,
		activities: [seidrDefaultReactionActivityTrigger()],
		phrase: "",
		onClimax: false,
		onDeny: false,
		onResist: false,
		steps: [seidrDefaultReactionSayStep()],
	};
}

export function seidrDefaultReactionsBag(): SeidrReactionsBag {
	return { nextId: 1, list: [] };
}

function sanitizeActivityTrigger(raw: unknown): SeidrReactionActivityTrigger | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrReactionActivityTrigger>;
	const activity = String(d.activity || "").trim().slice(0, 64);
	const slot = typeof d.slot === "string" ? d.slot.trim().slice(0, 48) : "";
	let filterSlot = typeof d.filterSlot === "string" ? d.filterSlot.trim().slice(0, 48) : "";
	// Migrate older saves: restore list filter from match slot so Activity reappears on swap.
	if (!filterSlot && slot) filterSlot = slot;
	return {
		activity: activity,
		whenIPerform: d.whenIPerform === true,
		whenOnMe: d.whenOnMe === true,
		slot: slot,
		filterSlot: filterSlot,
	};
}

export function seidrNormalizeReactionStep(raw: unknown): SeidrReactionStep | null {
	if (!raw || typeof raw !== "object") return null;
	const kind = (raw as { kind?: string }).kind;
	if (kind === "say") {
		const text = typeof (raw as SeidrReactionSayStep).text === "string"
			? String((raw as SeidrReactionSayStep).text).slice(0, SEIDR_ACTION_CHAT_MAX)
			: "";
		return { kind: "say", text: text };
	}
	if (kind === "animation") {
		const id = Number((raw as SeidrReactionAnimationStep).animationId);
		return {
			kind: "animation",
			animationId: Number.isFinite(id) && id > 0 ? Math.floor(id) : 0,
		};
	}
	if (kind === "wiggle") {
		const slots = seidrNormalizeWiggleSlots((raw as SeidrReactionWiggleStep).slots);
		if (!slots.length) return null;
		return { kind: "wiggle", slots: slots };
	}
	if (kind === "action") {
		const actionName = String((raw as SeidrReactionActionStep).actionName || "").trim().slice(0, 48);
		const target = (raw as SeidrReactionActionStep).target === "self" ? "self" : "issuer";
		return { kind: "action", actionName: actionName, target: target };
	}
	return null;
}

export function seidrNormalizeReaction(raw: unknown, fallbackId?: number): SeidrReaction | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrReaction>;
	const id = typeof d.id === "number" && d.id > 0
		? Math.floor(d.id)
		: (fallbackId && fallbackId > 0 ? fallbackId : 0);
	if (!id) return null;
	let name = String(d.name || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_REACTION_NAME_MAX);
	if (!name) name = "Reaction " + id;
	const enabled = d.enabled !== false;
	const activities: SeidrReactionActivityTrigger[] = [];
	if (Array.isArray(d.activities)) {
		for (let i = 0; i < d.activities.length && activities.length < SEIDR_REACTION_ACTIVITIES_MAX; i++) {
			const t = sanitizeActivityTrigger(d.activities[i]);
			if (t) activities.push(t);
		}
	}
	const phraseRaw = typeof d.phrase === "string" ? d.phrase.trim() : "";
	const phrase = phraseRaw ? phraseRaw.slice(0, SEIDR_REACTION_PHRASE_MAX) : "";
	const onClimax = d.onClimax === true;
	// Preserve the combined trigger in older saved reactions.
	const legacy = d.onDeny === undefined && d.onResist === undefined;
	const onDeny = legacy ? onClimax : d.onDeny === true;
	const onResist = legacy ? onClimax : d.onResist === true;
	const steps: SeidrReactionStep[] = [];
	if (Array.isArray(d.steps)) {
		for (let i = 0; i < d.steps.length && steps.length < SEIDR_REACTION_STEPS_MAX; i++) {
			const st = seidrNormalizeReactionStep(d.steps[i]);
			if (st) steps.push(st);
		}
	}
	if (!steps.length) steps.push(seidrDefaultReactionSayStep());
	return {
		id: id,
		name: name,
		enabled: enabled,
		activities: activities,
		phrase: phrase,
		onClimax: onClimax,
		onDeny: onDeny,
		onResist: onResist,
		steps: steps,
	};
}

export function seidrNormalizeReactionsBag(raw: unknown): SeidrReactionsBag {
	const base = seidrDefaultReactionsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrReactionsBag>;
	const list: SeidrReaction[] = [];
	const seen: Record<number, boolean> = {};
	if (Array.isArray(d.list)) {
		for (let i = 0; i < d.list.length && list.length < SEIDR_REACTIONS_MAX; i++) {
			const r = seidrNormalizeReaction(d.list[i]);
			if (!r || seen[r.id]) continue;
			seen[r.id] = true;
			list.push(r);
			if (r.id >= base.nextId) base.nextId = r.id + 1;
		}
	}
	if (typeof d.nextId === "number" && d.nextId > base.nextId) {
		base.nextId = Math.floor(d.nextId);
	}
	base.list = list;
	return base;
}

/** True if the reaction has a usable activity, phrase, or climax trigger. */
export function seidrReactionHasTrigger(r: SeidrReaction): boolean {
	if (r.onClimax || r.onDeny || r.onResist) return true;
	if (r.phrase && String(r.phrase).trim()) return true;
	for (let i = 0; i < r.activities.length; i++) {
		const a = r.activities[i];
		if (a.activity && String(a.activity).trim() && (a.whenIPerform || a.whenOnMe)) return true;
	}
	return false;
}
