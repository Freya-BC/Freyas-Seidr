/** Seidr Animations — pose/face clips + ear/tail/wing wiggle (Player-only playback) */
import { SEIDR_ACTION_CHAT_MAX, SEIDR_ACTION_POSES } from "../actions/model";

/** Cap for pose/face clips only (wiggles use SEIDR_WIGGLES_MAX). */
export const SEIDR_ANIMATIONS_MAX = 50;
/** Cap for Ear/Tail/Wing wiggle sets (separate from clip animations). */
export const SEIDR_WIGGLES_MAX = 50;
export const SEIDR_ANIM_STEPS_MAX = 20;
export const SEIDR_ANIM_WAIT_TOTAL_MAX = 60;
export const SEIDR_ANIM_NAME_MAX = 40;

export const SEIDR_WIGGLE_COUNT_MAX = 24;
export const SEIDR_WIGGLE_DELAY_MIN_MS = 100;
export const SEIDR_WIGGLE_DELAY_MAX_MS = 5000;

export type SeidrAnimFaceFeature = "Eyebrows" | "Eyes" | "Mouth" | "Blush" | "Fluids";
export type SeidrAnimFaceDuration = "keep" | "5" | "15" | "30";

export type SeidrWiggleSlot = "ear" | "tail" | "wing";
export type SeidrWiggleColorMode = "snapshot" | "autoupdate";

const WIGGLE_SLOT_ORDER: SeidrWiggleSlot[] = ["ear", "tail", "wing"];

/** Dedupe and order Ear → Tail → Wing. */
export function seidrNormalizeWiggleSlots(raw: unknown): SeidrWiggleSlot[] {
	const seen: Record<string, boolean> = {};
	if (Array.isArray(raw)) {
		for (let i = 0; i < raw.length; i++) {
			const s = String(raw[i] || "");
			if (WIGGLE_SLOT_ORDER.indexOf(s as SeidrWiggleSlot) >= 0) seen[s] = true;
		}
	}
	const out: SeidrWiggleSlot[] = [];
	for (let i = 0; i < WIGGLE_SLOT_ORDER.length; i++) {
		if (seen[WIGGLE_SLOT_ORDER[i]]) out.push(WIGGLE_SLOT_ORDER[i]);
	}
	return out;
}

export function seidrWiggleSlotsLabel(slots: SeidrWiggleSlot[]): string {
	if (!slots.length) return "(none)";
	return slots.map(function (s) {
		if (s === "ear") return "Ear";
		if (s === "wing") return "Wing";
		return "Tail";
	}).join(" + ");
}

export type SeidrAnimPoseStep = {
	kind: "pose";
	pose: string;
	wait: number;
};

export type SeidrAnimFaceStep = {
	kind: "face";
	feature: SeidrAnimFaceFeature;
	expression: string;
	duration: SeidrAnimFaceDuration;
	wait: number;
};

/** Clip step: play configured ready wiggles for these slots in parallel (skip missing). */
export type SeidrAnimWiggleStep = {
	kind: "wiggle";
	slots: SeidrWiggleSlot[];
	wait: number;
};

export type SeidrAnimStep = SeidrAnimPoseStep | SeidrAnimFaceStep | SeidrAnimWiggleStep;

export type SeidrWiggleFrame = {
	assetName: string;
	color?: string | string[];
	property?: unknown;
	typedState?: string;
};

/** Clip = pose/face steps; wiggle = asset-swap loop (empty steps). */
export type SeidrAnimation = {
	id: number;
	name: string;
	steps: SeidrAnimStep[];
	/** Optional public Action Text when playback starts (Club tokens). Empty = no post. */
	chatText?: string;
	kind?: "clip" | "wiggle";
	slot?: SeidrWiggleSlot;
	/** Appearance group used for swaps (may be an Echo alias). */
	group?: string;
	primary?: SeidrWiggleFrame;
	secondary?: SeidrWiggleFrame;
	colorMode?: SeidrWiggleColorMode;
	count?: number;
	delayMs?: number;
};

export type SeidrAnimationsBag = {
	nextId: number;
	list: SeidrAnimation[];
};

export const SEIDR_ANIM_FACE_MAP: Record<SeidrAnimFaceFeature, string[]> = {
	Eyebrows: ["Raised", "Lowered", "OneRaised", "Harsh", "Angry", "Soft"],
	Eyes: [
		"Closed", "Dazed", "Shy", "Sad", "Horny", "Lewd", "VeryLewd", "Heart", "HeartPink",
		"LewdHeart", "LewdHeartPink", "Dizzy", "Daydream", "ShylyHappy", "Angry", "Surprised", "Scared",
	],
	Mouth: [
		"Frown", "Sad", "Pained", "Angry", "HalfOpen", "Open", "Ahegao", "Moan", "TonguePinch",
		"LipBite", "Happy", "Devious", "Laughing", "Grin", "Smirk", "Pout",
	],
	Blush: ["Low", "Medium", "High", "VeryHigh", "Extreme", "ShortBreath"],
	Fluids: [
		"DroolLow", "DroolMedium", "DroolHigh", "DroolSides", "DroolMessy",
		"TearsHigh", "TearsMedium", "TearsLow", "DroolTearsLow", "DroolTearsMedium", "DroolTearsHigh",
	],
};

export const SEIDR_ANIM_FACE_DURATIONS: SeidrAnimFaceDuration[] = ["keep", "5", "15", "30"];

export const SEIDR_WIGGLE_SLOTS: { id: SeidrWiggleSlot; label: string; baseGroup: string }[] = [
	{ id: "ear", label: "Ear", baseGroup: "HairAccessory2" },
	{ id: "tail", label: "Tail", baseGroup: "TailStraps" },
	{ id: "wing", label: "Wing", baseGroup: "Wings" },
];

export const SEIDR_WIGGLE_DEFAULTS: Record<SeidrWiggleSlot, { count: number; delayMs: number }> = {
	ear: { count: 12, delayMs: 175 },
	tail: { count: 6, delayMs: 800 },
	wing: { count: 6, delayMs: 500 },
};

const POSE_IDS = SEIDR_ACTION_POSES.map(function (p) { return p.id; });
const FACE_FEATURES: SeidrAnimFaceFeature[] = ["Eyebrows", "Eyes", "Mouth", "Blush", "Fluids"];
const WIGGLE_SLOT_IDS: SeidrWiggleSlot[] = ["ear", "tail", "wing"];

function clampWait(raw: unknown): number {
	let n = typeof raw === "number" ? raw : parseFloat(String(raw));
	if (!Number.isFinite(n) || n < 0) n = 0.5;
	if (n > SEIDR_ANIM_WAIT_TOTAL_MAX) n = SEIDR_ANIM_WAIT_TOTAL_MAX;
	return Math.round(n * 100) / 100;
}

export function seidrAnimWaitTotal(steps: SeidrAnimStep[]): number {
	let sum = 0;
	for (let i = 0; i < steps.length; i++) sum += Number(steps[i].wait) || 0;
	return Math.round(sum * 100) / 100;
}

export function seidrCountClipAnimations(list: SeidrAnimation[]): number {
	let n = 0;
	for (let i = 0; i < list.length; i++) {
		if (!seidrAnimIsWiggle(list[i])) n++;
	}
	return n;
}

export function seidrCountWiggleAnimations(list: SeidrAnimation[]): number {
	let n = 0;
	for (let i = 0; i < list.length; i++) {
		if (seidrAnimIsWiggle(list[i])) n++;
	}
	return n;
}

export function seidrAnimIsWiggle(anim: SeidrAnimation | null | undefined): boolean {
	return !!(anim && anim.kind === "wiggle");
}

export function seidrDefaultAnimPoseStep(): SeidrAnimPoseStep {
	return { kind: "pose", pose: "Kneel", wait: 0.5 };
}

export function seidrDefaultAnimFaceStep(): SeidrAnimFaceStep {
	return { kind: "face", feature: "Eyes", expression: "Closed", duration: "keep", wait: 0.5 };
}

export function seidrDefaultAnimWiggleStep(slots?: SeidrWiggleSlot[]): SeidrAnimWiggleStep {
	const s = seidrNormalizeWiggleSlots(slots && slots.length ? slots : ["tail"]);
	return { kind: "wiggle", slots: s.length ? s : ["tail"], wait: 0.5 };
}

export function seidrDefaultAnimation(id: number): SeidrAnimation {
	return { id: id, name: "Animation " + id, kind: "clip", steps: [seidrDefaultAnimPoseStep()], chatText: "" };
}

export function seidrDefaultWiggleAnimation(
	id: number,
	slot: SeidrWiggleSlot,
	group: string,
	primary: SeidrWiggleFrame,
	secondary: SeidrWiggleFrame
): SeidrAnimation {
	const defs = SEIDR_WIGGLE_DEFAULTS[slot] || SEIDR_WIGGLE_DEFAULTS.tail;
	const slotLabel = slot === "ear" ? "Ear" : slot === "wing" ? "Wing" : "Tail";
	return {
		id: id,
		name: slotLabel + " · " + (primary.assetName || "Wiggle").slice(0, 28),
		kind: "wiggle",
		steps: [],
		chatText: "",
		slot: slot,
		group: group,
		primary: primary,
		secondary: secondary,
		colorMode: "snapshot",
		count: defs.count,
		delayMs: defs.delayMs,
	};
}

export function seidrDefaultAnimationsBag(): SeidrAnimationsBag {
	return { nextId: 1, list: [] };
}

function sanitizePoseStep(raw: unknown): SeidrAnimPoseStep | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrAnimPoseStep>;
	if (d.kind !== "pose") return null;
	const pose = POSE_IDS.indexOf(String(d.pose || "")) >= 0 ? String(d.pose) : "Kneel";
	return { kind: "pose", pose: pose, wait: clampWait(d.wait) };
}

function sanitizeFaceStep(raw: unknown): SeidrAnimFaceStep | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrAnimFaceStep>;
	if (d.kind !== "face") return null;
	let feature = String(d.feature || "Eyes") as SeidrAnimFaceFeature;
	if (FACE_FEATURES.indexOf(feature) < 0) feature = "Eyes";
	const allowed = SEIDR_ANIM_FACE_MAP[feature] || [];
	let expression = String(d.expression == null ? "" : d.expression);
	if (expression && allowed.indexOf(expression) < 0) expression = allowed[0] || "";
	let duration = String(d.duration || "keep") as SeidrAnimFaceDuration;
	if (SEIDR_ANIM_FACE_DURATIONS.indexOf(duration) < 0) duration = "keep";
	return {
		kind: "face",
		feature: feature,
		expression: expression,
		duration: duration,
		wait: clampWait(d.wait),
	};
}

function sanitizeWiggleStep(raw: unknown): SeidrAnimWiggleStep | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrAnimWiggleStep>;
	if (d.kind !== "wiggle") return null;
	const slots = seidrNormalizeWiggleSlots(d.slots);
	if (!slots.length) return null;
	return { kind: "wiggle", slots: slots, wait: clampWait(d.wait) };
}

export function seidrNormalizeAnimStep(raw: unknown): SeidrAnimStep | null {
	if (!raw || typeof raw !== "object") return null;
	const kind = (raw as { kind?: string }).kind;
	if (kind === "pose") return sanitizePoseStep(raw);
	if (kind === "face") return sanitizeFaceStep(raw);
	if (kind === "wiggle") return sanitizeWiggleStep(raw);
	return null;
}

function cloneColor(raw: unknown): string | string[] | undefined {
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) {
		const out: string[] = [];
		for (let i = 0; i < raw.length; i++) {
			const v = raw[i];
			if (typeof v === "string") out.push(v);
		}
		return out.length ? out : undefined;
	}
	return undefined;
}

function cloneProperty(raw: unknown): unknown {
	if (raw == null || typeof raw !== "object") return undefined;
	try {
		return JSON.parse(JSON.stringify(raw));
	} catch (e) {
		return undefined;
	}
}

export function seidrNormalizeWiggleFrame(raw: unknown): SeidrWiggleFrame | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrWiggleFrame>;
	const assetName = String(d.assetName || "").trim();
	if (!assetName) return null;
	const frame: SeidrWiggleFrame = { assetName: assetName.slice(0, 80) };
	const color = cloneColor(d.color);
	if (color !== undefined) frame.color = color;
	const prop = cloneProperty(d.property);
	if (prop !== undefined) frame.property = prop;
	if (d.typedState != null && String(d.typedState).trim() !== "") {
		frame.typedState = String(d.typedState).trim().slice(0, 40);
	}
	return frame;
}

/** True when two wiggle frames would look different (asset and/or typed state). */
export function seidrWiggleFramesDiffer(a: SeidrWiggleFrame | null | undefined, b: SeidrWiggleFrame | null | undefined): boolean {
	if (!a || !b || !a.assetName || !b.assetName) return false;
	if (a.assetName !== b.assetName) return true;
	const ta = a.typedState != null ? String(a.typedState) : "";
	const tb = b.typedState != null ? String(b.typedState) : "";
	if (ta !== tb) return true;
	return false;
}

export function seidrClampWiggleCount(raw: unknown, fallback: number): number {
	let n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
	if (!Number.isFinite(n) || n < 1) n = fallback;
	n = Math.floor(n);
	if (n > SEIDR_WIGGLE_COUNT_MAX) n = SEIDR_WIGGLE_COUNT_MAX;
	return n;
}

export function seidrClampWiggleDelayMs(raw: unknown, fallback: number): number {
	let n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
	if (!Number.isFinite(n)) n = fallback;
	n = Math.floor(n);
	if (n < SEIDR_WIGGLE_DELAY_MIN_MS) n = SEIDR_WIGGLE_DELAY_MIN_MS;
	if (n > SEIDR_WIGGLE_DELAY_MAX_MS) n = SEIDR_WIGGLE_DELAY_MAX_MS;
	return n;
}

function normalizeClipAnimation(d: Partial<SeidrAnimation>, id: number, name: string): SeidrAnimation {
	const steps: SeidrAnimStep[] = [];
	if (Array.isArray(d.steps)) {
		for (let i = 0; i < d.steps.length && steps.length < SEIDR_ANIM_STEPS_MAX; i++) {
			const st = seidrNormalizeAnimStep(d.steps[i]);
			if (st) steps.push(st);
		}
	}
	let total = seidrAnimWaitTotal(steps);
	if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
		let over = total - SEIDR_ANIM_WAIT_TOTAL_MAX;
		for (let j = steps.length - 1; j >= 0 && over > 0; j--) {
			const w = steps[j].wait;
			const cut = Math.min(w, over);
			steps[j].wait = Math.round((w - cut) * 100) / 100;
			over -= cut;
		}
	}
	const chatText = typeof d.chatText === "string" && d.chatText.trim()
		? d.chatText.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
		: "";
	return { id: id, name: name, kind: "clip", steps: steps, chatText: chatText };
}

function normalizeWiggleAnimation(d: Partial<SeidrAnimation>, id: number, name: string): SeidrAnimation | null {
	let slot = String(d.slot || "tail") as SeidrWiggleSlot;
	if (WIGGLE_SLOT_IDS.indexOf(slot) < 0) slot = "tail";
	const defs = SEIDR_WIGGLE_DEFAULTS[slot];
	const primary = seidrNormalizeWiggleFrame(d.primary);
	const secondary = seidrNormalizeWiggleFrame(d.secondary);
	if (!primary || !secondary) return null;
	let group = String(d.group || "").trim();
	if (!group) {
		const meta = SEIDR_WIGGLE_SLOTS.find(function (s) { return s.id === slot; });
		group = meta ? meta.baseGroup : "TailStraps";
	}
	let colorMode: SeidrWiggleColorMode = d.colorMode === "autoupdate" ? "autoupdate" : "snapshot";
	const chatText = typeof d.chatText === "string" && d.chatText.trim()
		? d.chatText.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
		: "";
	return {
		id: id,
		name: name,
		kind: "wiggle",
		steps: [],
		chatText: chatText,
		slot: slot,
		group: group.slice(0, 80),
		primary: primary,
		secondary: secondary,
		colorMode: colorMode,
		count: seidrClampWiggleCount(d.count, defs.count),
		delayMs: seidrClampWiggleDelayMs(d.delayMs, defs.delayMs),
	};
}

export function seidrNormalizeAnimation(raw: unknown, fallbackId?: number): SeidrAnimation | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrAnimation>;
	const id = typeof d.id === "number" && d.id > 0
		? Math.floor(d.id)
		: (fallbackId && fallbackId > 0 ? fallbackId : 0);
	if (!id) return null;
	let name = String(d.name || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_ANIM_NAME_MAX);
	if (!name) name = "Animation " + id;
	if (d.kind === "wiggle") {
		return normalizeWiggleAnimation(d, id, name);
	}
	return normalizeClipAnimation(d, id, name);
}

export function seidrNormalizeAnimationsBag(raw: unknown): SeidrAnimationsBag {
	const base = seidrDefaultAnimationsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrAnimationsBag>;
	const list: SeidrAnimation[] = [];
	const seen: Record<number, boolean> = {};
	const wiggleKeys: Record<string, boolean> = {};
	let clipCount = 0;
	let wiggleCount = 0;
	if (Array.isArray(d.list)) {
		for (let i = 0; i < d.list.length; i++) {
			const a = seidrNormalizeAnimation(d.list[i]);
			if (!a || seen[a.id]) continue;
			if (seidrAnimIsWiggle(a)) {
				if (wiggleCount >= SEIDR_WIGGLES_MAX) continue;
				if (a.slot && a.primary) {
					const key = a.slot + "::" + a.primary.assetName;
					if (wiggleKeys[key]) continue;
					wiggleKeys[key] = true;
				}
				wiggleCount++;
			} else {
				if (clipCount >= SEIDR_ANIMATIONS_MAX) continue;
				clipCount++;
			}
			seen[a.id] = true;
			list.push(a);
			if (a.id >= base.nextId) base.nextId = a.id + 1;
		}
	}
	if (typeof d.nextId === "number" && d.nextId > base.nextId) {
		base.nextId = Math.floor(d.nextId);
	}
	base.list = list;
	return base;
}
