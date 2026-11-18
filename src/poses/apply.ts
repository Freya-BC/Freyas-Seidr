/** Apply Club poses on another character (Dialog picker + /poses other-path). */
import { seidrPoseAvailable, seidrPoseLabel } from "../actions/model";
import { seidrPublishActionText } from "../chat/actionText";
import { seidrPoseChatTemplate } from "../commands/poseChat";
import { seidrCmdError, seidrCmdWarn } from "../commands/warn";

declare const Player: any;
declare const ServerChatRoomGetAllowItem: ((actor: any, acted: any) => boolean) | undefined;
declare const PoseSetActive: ((C: any, pose: string, force?: boolean) => void) | undefined;
declare const CharacterSetActivePose: ((C: any, pose: string) => void) | undefined;
declare const ChatRoomCharacterUpdate: ((C: any) => void) | undefined;
declare const ServerPlayerIsInChatRoom: (() => boolean) | undefined;
declare const ServerSend: ((msg: string, data: unknown) => void) | undefined;

export function seidrCanPoseTarget(actor: any, acted: any): boolean {
	if (!actor || !acted) return false;
	if (actor === acted) return true;
	try {
		if (actor.IsPlayer && actor.IsPlayer() && acted.IsPlayer && acted.IsPlayer()) return true;
	} catch (e) { /* ignore */ }
	try {
		if (typeof ServerChatRoomGetAllowItem === "function") {
			return !!ServerChatRoomGetAllowItem(actor, acted);
		}
	} catch (e2) { /* ignore */ }
	return !!(acted.AllowItem);
}

export function seidrApplyClubPose(C: any, pose: string): void {
	if (!C || !pose) return;
	try {
		if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
		else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
	} catch (e) { /* ignore */ }
	seidrSyncPose(C);
}

/**
 * Push a pose change to the room. The own character only needs the tiny
 * ChatRoomCharacterPoseUpdate ({Pose}); other characters need the full
 * appearance update because the server has no pose-only path for them.
 */
export function seidrSyncPose(C: any): void {
	if (!C) return;
	try {
		const own = !!(C.IsPlayer && C.IsPlayer());
		if (own && typeof ServerSend === "function") {
			if (typeof ServerPlayerIsInChatRoom === "function" && !ServerPlayerIsInChatRoom()) return;
			ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
		} else if (typeof ChatRoomCharacterUpdate === "function") {
			ChatRoomCharacterUpdate(C);
		}
	} catch (e2) { /* ignore */ }
}

/**
 * Pose another character (Dialog picker). Returns false if blocked / unavailable.
 */
export function seidrApplyPoseOnOther(target: any, pose: string): boolean {
	if (!target || !pose) return false;
	const self = target === Player
		|| (typeof target.MemberNumber === "number"
			&& typeof Player !== "undefined"
			&& Player
			&& target.MemberNumber === Player.MemberNumber);
	if (self) {
		seidrCmdWarn("Use Club Pose menu on yourself.");
		return false;
	}
	try {
		if (typeof target.IsNpc === "function" && target.IsNpc()) {
			seidrCmdWarn("Poses only work on other players, not NPCs.");
			return false;
		}
	} catch (eNpc) { /* ignore */ }
	if (typeof target.MemberNumber !== "number") {
		seidrCmdWarn("Poses only work on other players, not NPCs.");
		return false;
	}
	if (!seidrCanPoseTarget(Player, target)) {
		seidrCmdError("You cannot change that person's pose right now.");
		return false;
	}
	if (!seidrPoseAvailable(target, pose, { aided: true })) {
		seidrCmdWarn("Pose \"" + (seidrPoseLabel(pose) || pose) + "\" is not available on that person.");
		return false;
	}
	seidrApplyClubPose(target, pose);
	seidrPublishActionText(seidrPoseChatTemplate(pose, "other"), Player, target);
	return true;
}
