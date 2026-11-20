/** Sequential Autoreaction runner (local only) */
import { seidrPlayAnimation } from "../animations/play";
import { seidrPlayWiggleSlots } from "../animations/wigglePlay";
import { seidrRunItemActivity } from "../commands/activityRun";
import { seidrCmdFindCharacter } from "../commands/catalog";
import { seidrCmdResolveAction } from "../commands/resolve";
import type { SeidrReaction, SeidrReactionStep } from "./model";
import { seidrValidateReaction } from "./validate";

declare const Player: any;
declare const ChatRoomSendChatMessage: any;
declare const ServerChatRoomGetAllowItem: any;

export type SeidrReactionRunResult = { ok: boolean; error?: string };

function myMember(): number | null {
	try {
		if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
			return Player.MemberNumber;
		}
	} catch (e) { /* ignore */ }
	return null;
}

function actionTargetCharacter(
	step: Extract<SeidrReactionStep, { kind: "action" }>,
	issuerMemberNumber: number
): any | null {
	const me = myMember();
	if (me == null || !Player) return null;
	if (step.target === "self" || issuerMemberNumber === me) return Player;
	return seidrCmdFindCharacter(issuerMemberNumber);
}

function runSay(text: string): SeidrReactionRunResult {
	const msg = String(text || "").trim();
	if (!msg) return { ok: false, error: "Empty Say text" };
	try {
		if (typeof ChatRoomSendChatMessage === "function") {
			ChatRoomSendChatMessage(msg);
			return { ok: true };
		}
	} catch (e) {
		console.warn("[Seidr Reaction] Say failed", e);
	}
	return { ok: false, error: "Could not send chat message" };
}

async function runStep(
	step: SeidrReactionStep,
	issuerMemberNumber: number
): Promise<SeidrReactionRunResult> {
	if (step.kind === "say") return runSay(step.text);
	if (step.kind === "animation") {
		return seidrPlayAnimation(step.animationId);
	}
	if (step.kind === "wiggle") {
		const r = await seidrPlayWiggleSlots(step.slots);
		return { ok: r.ok, error: r.error };
	}
	if (step.kind === "action") {
		const resolved = seidrCmdResolveAction(step.actionName);
		if (resolved.ok === false) {
			return { ok: false, error: resolved.error || "Unknown action" };
		}
		const target = actionTargetCharacter(step, issuerMemberNumber);
		if (!target) return { ok: false, error: "Action target missing" };
		try {
			if (
				typeof ServerChatRoomGetAllowItem === "function" &&
				!ServerChatRoomGetAllowItem(Player, target)
			) {
				return { ok: false, error: "Cannot act on that person right now" };
			}
		} catch (e) { /* ignore */ }
		return seidrRunItemActivity(target, resolved.action.slot, resolved.action.activity);
	}
	return { ok: false, error: "Unknown step kind" };
}

/** Preflight then run all steps in order. */
export async function seidrPlayReaction(
	reaction: SeidrReaction,
	issuerMemberNumber: number
): Promise<SeidrReactionRunResult> {
	const pre = seidrValidateReaction(reaction, issuerMemberNumber);
	if (pre.ok === false) {
		return { ok: false, error: pre.reason };
	}
	const steps = reaction.steps.slice();
	for (let i = 0; i < steps.length; i++) {
		const result = await runStep(steps[i], issuerMemberNumber);
		if (!result.ok) {
			return {
				ok: false,
				error: "step " + (i + 1) + ": " + (result.error || "failed"),
			};
		}
	}
	return { ok: true };
}
