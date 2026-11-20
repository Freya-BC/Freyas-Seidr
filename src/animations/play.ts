/** Play a Seidr animation clip or wiggle on the local Player */
import { seidrPublishActionText } from "../chat/actionText";
import { seidrSyncPose } from "../poses/apply";
import type { SeidrAnimStep, SeidrAnimation } from "./model";
import { seidrAnimIsWiggle } from "./model";
import { seidrFindAnimationById, seidrFindAnimationByName } from "./store";
import { seidrCancelWiggle, seidrPlayWiggle, seidrPlayWiggleSlots, seidrWiggleIsPlaying } from "./wigglePlay";

declare const Player: any;
declare const PoseSetActive: any;
declare const CharacterSetActivePose: any;
declare const CharacterSetFacialExpression: any;

let playing = false;

function applyPose(C: any, pose: string): void {
	if (!C || !pose) return;
	try {
		if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
		else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
	} catch (e) { /* ignore */ }
	seidrSyncPose(C);
}

function applyFace(C: any, step: Extract<SeidrAnimStep, { kind: "face" }>): void {
	if (!C || typeof CharacterSetFacialExpression !== "function") return;
	const group = String(step.feature || "Eyes");
	const expr = step.expression ? String(step.expression) : null;
	let timer: number | null = null;
	if (step.duration && step.duration !== "keep") timer = Number(step.duration) || null;
	try {
		CharacterSetFacialExpression(C, group, expr, timer);
	} catch (e) { /* ignore */ }
}

function waitMs(sec: number): Promise<void> | null {
	const n = Number(sec) || 0;
	if (n <= 0) return null;
	return new Promise(function (resolve) {
		setTimeout(resolve, Math.round(n * 1000));
	});
}

export function seidrAnimIsPlaying(): boolean {
	return playing || seidrWiggleIsPlaying();
}

async function runClipStep(step: SeidrAnimStep): Promise<void> {
	if (step.kind === "wiggle") {
		await seidrPlayWiggleSlots(step.slots);
	} else if (step.kind === "pose") {
		applyPose(Player, step.pose);
	} else if (step.kind === "face") {
		applyFace(Player, step);
	}
	const delay = waitMs(step.wait);
	if (delay) await delay;
}

function playClip(anim: SeidrAnimation): Promise<{ ok: boolean; error?: string }> {
	if (!anim.steps.length) {
		return Promise.resolve({ ok: false, error: "Unknown or empty animation" });
	}
	playing = true;
	if (anim.chatText && String(anim.chatText).trim()) {
		seidrPublishActionText(String(anim.chatText).trim(), Player, Player);
	}
	const steps = anim.steps.slice();

	return (async function () {
		try {
			for (let i = 0; i < steps.length; i++) {
				const st = steps[i];
				if (!st) continue;
				await runClipStep(st);
			}
			return { ok: true };
		} catch (e) {
			seidrCancelWiggle();
			return { ok: false, error: "Animation interrupted" };
		} finally {
			playing = false;
		}
	})();
}

/** Play animation by id or exact name. Player only. */
export function seidrPlayAnimation(ref: number | string): Promise<{ ok: boolean; error?: string }> {
	let anim: SeidrAnimation | null = null;
	if (typeof ref === "number") anim = seidrFindAnimationById(ref);
	else anim = seidrFindAnimationByName(String(ref));
	if (!anim) {
		return Promise.resolve({ ok: false, error: "Unknown or empty animation" });
	}
	if (typeof Player === "undefined" || !Player) {
		return Promise.resolve({ ok: false, error: "Not logged in" });
	}

	if (seidrAnimIsWiggle(anim)) {
		if (anim.chatText && String(anim.chatText).trim()) {
			seidrPublishActionText(String(anim.chatText).trim(), Player, Player);
		}
		// Slot-local cancel only — other slots may keep wiggling
		return seidrPlayWiggle(anim).catch(function () {
			return { ok: false, error: "Wiggle interrupted" };
		});
	}

	if (playing) {
		return Promise.resolve({ ok: false, error: "An animation is already playing" });
	}

	return playClip(anim);
}
