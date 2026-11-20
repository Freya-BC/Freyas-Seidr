/** Preflight checks before playing an Autoreaction */
import { seidrFindAnimationById } from "../animations/store";
import { seidrCmdActivityAvailable, seidrCmdFindCharacter } from "../commands/catalog";
import { seidrCmdResolveAction } from "../commands/resolve";
import type { SeidrReaction, SeidrReactionStep } from "./model";

declare const Player: any;
declare const ServerChatRoomGetAllowItem: any;

export type SeidrReactionValidateResult = { ok: true } | { ok: false; reason: string };

function myMember(): number | null {
	try {
		if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
			return Player.MemberNumber;
		}
	} catch (e) { /* ignore */ }
	return null;
}

function resolveActionTarget(
	step: Extract<SeidrReactionStep, { kind: "action" }>,
	issuerMemberNumber: number
): { ok: true; character: any } | { ok: false; reason: string } {
	const me = myMember();
	if (me == null || typeof Player === "undefined" || !Player) {
		return { ok: false, reason: "Not logged in" };
	}
	if (step.target === "self") {
		return { ok: true, character: Player };
	}
	if (issuerMemberNumber === me) {
		return { ok: true, character: Player };
	}
	const C = seidrCmdFindCharacter(issuerMemberNumber);
	if (!C) {
		return { ok: false, reason: "Issuer is not in the room" };
	}
	return { ok: true, character: C };
}

function validateStep(
	step: SeidrReactionStep,
	issuerMemberNumber: number,
	index: number
): SeidrReactionValidateResult {
	const label = "step " + (index + 1);
	if (step.kind === "say") {
		if (!String(step.text || "").trim()) {
			return { ok: false, reason: label + " Say text is empty" };
		}
		return { ok: true };
	}
	if (step.kind === "animation") {
		if (!step.animationId || step.animationId < 1) {
			return { ok: false, reason: label + " Animation is not selected" };
		}
		const anim = seidrFindAnimationById(step.animationId);
		if (!anim) {
			return { ok: false, reason: label + " Animation is missing or empty" };
		}
		if (anim.kind === "wiggle") {
			if (!anim.primary || !anim.secondary || !anim.slot) {
				return { ok: false, reason: label + " Wiggle animation is incomplete" };
			}
			return { ok: true };
		}
		if (!anim.steps.length) {
			return { ok: false, reason: label + " Animation is missing or empty" };
		}
		return { ok: true };
	}
	if (step.kind === "wiggle") {
		if (!step.slots || !step.slots.length) {
			return { ok: false, reason: label + " Wiggle needs at least one slot" };
		}
		return { ok: true };
	}
	if (step.kind === "action") {
		if (!String(step.actionName || "").trim()) {
			return { ok: false, reason: label + " Action is not selected" };
		}
		const resolved = seidrCmdResolveAction(step.actionName);
		if (resolved.ok === false) {
			return { ok: false, reason: label + " " + (resolved.error || "Unknown action") };
		}
		const target = resolveActionTarget(step, issuerMemberNumber);
		if (target.ok === false) return target;
		try {
			if (
				typeof ServerChatRoomGetAllowItem === "function" &&
				!ServerChatRoomGetAllowItem(Player, target.character)
			) {
				return { ok: false, reason: label + " Cannot act on that person right now" };
			}
		} catch (e) { /* ignore */ }
		const binding = resolved.action;
		if (!seidrCmdActivityAvailable(target.character, binding.slot, binding.activity)) {
			return {
				ok: false,
				reason: label + " Action \"" + binding.name + "\" is not available right now",
			};
		}
		return { ok: true };
	}
	return { ok: false, reason: label + " Unknown step kind" };
}

/** Validate every step of a reaction for the current room context. */
export function seidrValidateReaction(
	reaction: SeidrReaction,
	issuerMemberNumber: number
): SeidrReactionValidateResult {
	if (!reaction || !reaction.steps || !reaction.steps.length) {
		return { ok: false, reason: "No steps defined" };
	}
	for (let i = 0; i < reaction.steps.length; i++) {
		const r = validateStep(reaction.steps[i], issuerMemberNumber, i);
		if (r.ok === false) return r;
	}
	return { ok: true };
}
