/** Seidr Animations — pose/face clips (Player-only playback) */
import { SEIDR_ACTION_POSES } from "../actions/model";

export const SEIDR_ANIMATIONS_MAX = 50;
export const SEIDR_ANIM_STEPS_MAX = 20;
export const SEIDR_ANIM_WAIT_TOTAL_MAX = 60;
export const SEIDR_ANIM_NAME_MAX = 40;

export type SeidrAnimFaceFeature = "Eyebrows" | "Eyes" | "Mouth" | "Blush" | "Fluids";
export type SeidrAnimFaceDuration = "keep" | "5" | "15" | "30";

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

export type SeidrAnimStep = SeidrAnimPoseStep | SeidrAnimFaceStep;

export type SeidrAnimation = {
	id: number;
	name: string;
	steps: SeidrAnimStep[];
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

const POSE_IDS = SEIDR_ACTION_POSES.map(function (p) { return p.id; });
const FACE_FEATURES: SeidrAnimFaceFeature[] = ["Eyebrows", "Eyes", "Mouth", "Blush", "Fluids"];

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

export function seidrDefaultAnimPoseStep(): SeidrAnimPoseStep {
	return { kind: "pose", pose: "Kneel", wait: 0.5 };
}

export function seidrDefaultAnimFaceStep(): SeidrAnimFaceStep {
	return { kind: "face", feature: "Eyes", expression: "Closed", duration: "keep", wait: 0.5 };
}

export function seidrDefaultAnimation(id: number): SeidrAnimation {
	return { id: id, name: "Animation " + id, steps: [seidrDefaultAnimPoseStep()] };
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

export function seidrNormalizeAnimStep(raw: unknown): SeidrAnimStep | null {
	if (!raw || typeof raw !== "object") return null;
	const kind = (raw as { kind?: string }).kind;
	if (kind === "pose") return sanitizePoseStep(raw);
	if (kind === "face") return sanitizeFaceStep(raw);
	return null;
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
	const steps: SeidrAnimStep[] = [];
	if (Array.isArray(d.steps)) {
		for (let i = 0; i < d.steps.length && steps.length < SEIDR_ANIM_STEPS_MAX; i++) {
			const st = seidrNormalizeAnimStep(d.steps[i]);
			if (st) steps.push(st);
		}
	}
	// Clamp total wait by shrinking from the end if over budget
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
	return { id: id, name: name, steps: steps };
}

export function seidrNormalizeAnimationsBag(raw: unknown): SeidrAnimationsBag {
	const base = seidrDefaultAnimationsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrAnimationsBag>;
	const list: SeidrAnimation[] = [];
	const seen: Record<number, boolean> = {};
	if (Array.isArray(d.list)) {
		for (let i = 0; i < d.list.length && list.length < SEIDR_ANIMATIONS_MAX; i++) {
			const a = seidrNormalizeAnimation(d.list[i]);
			if (!a || seen[a.id]) continue;
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
