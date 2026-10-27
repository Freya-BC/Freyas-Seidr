/** Play a Seidr animation clip on the local Player */
import type { SeidrAnimStep, SeidrAnimation } from "./model";
import { seidrFindAnimationById, seidrFindAnimationByName } from "./store";

declare const Player: any;
declare const PoseSetActive: any;
declare const CharacterSetActivePose: any;
declare const CharacterSetFacialExpression: any;
declare const ChatRoomCharacterUpdate: any;
declare const ServerSend: any;

let playing = false;

function applyPose(C: any, pose: string): void {
	if (!C || !pose) return;
	try {
		if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
		else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
	} catch (e) { /* ignore */ }
	try {
		if (typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(C);
		else if (typeof ServerSend === "function" && C.IsPlayer && C.IsPlayer()) {
			ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
		}
	} catch (e2) { /* ignore */ }
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

function applyStep(step: SeidrAnimStep, C: any): void {
	if (!step || !C) return;
	if (step.kind === "pose") applyPose(C, step.pose);
	else if (step.kind === "face") applyFace(C, step);
}

function waitMs(sec: number): Promise<void> | null {
	const n = Number(sec) || 0;
	if (n <= 0) return null;
	return new Promise(function (resolve) {
		setTimeout(resolve, Math.round(n * 1000));
	});
}

export function seidrAnimIsPlaying(): boolean {
	return playing;
}

/** Play animation by id or exact name. Player only. */
export function seidrPlayAnimation(ref: number | string): Promise<{ ok: boolean; error?: string }> {
	let anim: SeidrAnimation | null = null;
	if (typeof ref === "number") anim = seidrFindAnimationById(ref);
	else anim = seidrFindAnimationByName(String(ref));
	if (!anim || !anim.steps.length) {
		return Promise.resolve({ ok: false, error: "Unknown or empty animation" });
	}
	if (typeof Player === "undefined" || !Player) {
		return Promise.resolve({ ok: false, error: "Not logged in" });
	}
	if (playing) {
		return Promise.resolve({ ok: false, error: "An animation is already playing" });
	}
	playing = true;
	const steps = anim.steps.slice();
	let i = 0;

	function next(): Promise<{ ok: boolean; error?: string }> {
		while (i < steps.length) {
			const st = steps[i++];
			if (!st) continue;
			applyStep(st, Player);
			const delay = waitMs(st.wait);
			if (delay) {
				return delay.then(next).catch(function () {
					playing = false;
					return { ok: false, error: "Animation interrupted" };
				});
			}
		}
		playing = false;
		return Promise.resolve({ ok: true });
	}

	return next();
}
