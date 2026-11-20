/** Execute Seidr chat commands */
import { seidrPoseAvailable, seidrPoseLabel } from "../actions/model";
import { seidrPlayAnimation } from "../animations/play";
import { seidrFindAnimationByName } from "../animations/store";
import { seidrPublishActionText } from "../chat/actionText";
import { seidrApplyClubPose, seidrCanPoseTarget } from "../poses/apply";
import { Seidr } from "../seidr";
import { seidrRunItemActivity } from "./activityRun";
import { seidrCmdEnableKeyForTag, type SeidrCmdEnableKey } from "./model";
import { seidrParseCmdLine } from "./parse";
import { seidrPoseChatTemplate } from "./poseChat";
import { seidrCmdResolveAction, seidrCmdResolveMember } from "./resolve";
import { seidrGetCommandsBag } from "./store";
import { seidrGetSettings } from "../settings/storage";
import { seidrCmdSetLastActor } from "./lastActor";
import { seidrCmdResolveStripSlot } from "./stripCatalog";
import { seidrCmdError, seidrCmdWarn } from "./warn";

declare const Player: any;
declare const ServerChatRoomGetAllowItem: any;
declare const ChatRoomAppearanceLoadCharacter: ((C: unknown) => void) | undefined;

export function seidrCmdIsEnabled(tag: string): boolean {
	const key = seidrCmdEnableKeyForTag(tag);
	if (!key) return false;
	const bag = seidrGetCommandsBag();
	return bag.enabled[key] !== false;
}

function runItemActivity(target: any, zone: string, activityName: string): boolean {
	const result = seidrRunItemActivity(target, zone, activityName);
	if (!result.ok) {
		seidrCmdError(result.error || "Failed to run activity.");
		return false;
	}
	return true;
}

function executeActionCommand(memberRaw: string, actionRaw: string): boolean {
	const mem = seidrCmdResolveMember(memberRaw);
	if (mem.ok === false) {
		seidrCmdWarn(mem.error);
		return true;
	}
	const act = seidrCmdResolveAction(actionRaw);
	if (act.ok === false) {
		seidrCmdWarn(act.error);
		return true;
	}
	const target = mem.character;
	const binding = act.action;
	try {
		if (typeof ServerChatRoomGetAllowItem === "function" && !ServerChatRoomGetAllowItem(Player, target)) {
			seidrCmdError("You cannot act on that person right now.");
			return true;
		}
	} catch (e) { /* ignore */ }
	if (runItemActivity(target, binding.slot, binding.activity)) {
		seidrCmdSetLastActor(mem.memberNumber);
	}
	return true;
}

function executeStripCommand(tag: "strip" | "stripe", memberRaw: string, slotRaw: string): boolean {
	const includeBundles = tag === "strip";
	const mem = seidrCmdResolveMember(memberRaw);
	if (mem.ok === false) {
		seidrCmdWarn(mem.error);
		return true;
	}
	const target = mem.character;
	try {
		if (typeof ServerChatRoomGetAllowItem === "function" && !ServerChatRoomGetAllowItem(Player, target)) {
			seidrCmdError("You cannot act on that person right now.");
			return true;
		}
	} catch (e) { /* ignore */ }

	const slot = seidrCmdResolveStripSlot(slotRaw, Player, target, includeBundles);
	if (slot.ok === false) {
		seidrCmdWarn(slot.error);
		return true;
	}
	if (runItemActivity(target, slot.option.zone, slot.option.activityName)) {
		seidrCmdSetLastActor(mem.memberNumber);
	}
	return true;
}

function executePosesCommand(memberRaw: string, poseRaw: string): boolean {
	const mem = seidrCmdResolveMember(memberRaw);
	if (mem.ok === false) {
		seidrCmdWarn(mem.error);
		return true;
	}
	const target = mem.character;
	const pose = String(poseRaw || "").trim();
	if (!pose) {
		seidrCmdWarn("Missing pose");
		return true;
	}
	const self = target === Player
		|| (typeof target.MemberNumber === "number" && target.MemberNumber === Player.MemberNumber);
	if (!self && !seidrCanPoseTarget(Player, target)) {
		seidrCmdError("You cannot change that person's pose right now.");
		return true;
	}
	if (!seidrPoseAvailable(target, pose, { aided: !self })) {
		seidrCmdWarn("Pose \"" + (seidrPoseLabel(pose) || pose) + "\" is not available on that person.");
		return true;
	}
	seidrApplyClubPose(target, pose);
	seidrCmdSetLastActor(mem.memberNumber);
	const side = self ? "self" : "other";
	seidrPublishActionText(seidrPoseChatTemplate(pose, side), Player, target);
	return true;
}

function executeAnimationCommand(nameRaw: string): boolean {
	const name = String(nameRaw || "").trim();
	if (!name) {
		seidrCmdWarn("Usage: /animation <name>");
		return true;
	}
	if (!seidrFindAnimationByName(name)) {
		seidrCmdWarn("Unknown animation \"" + name + "\". Define it under Settings → Animations.");
		return true;
	}
	seidrPlayAnimation(name).then(function (r) {
		if (!r.ok && r.error) seidrCmdWarn(r.error);
	});
	return true;
}

function executeWardrobeCommand(): boolean {
	try {
		/* Bypass ChatRoomOpenWardrobeScreen / CanChangeOwnClothes — always open. */
		if (typeof ChatRoomAppearanceLoadCharacter === "function" && Player) {
			ChatRoomAppearanceLoadCharacter(Player);
		} else {
			seidrCmdWarn("Wardrobe unavailable");
		}
	} catch (e) {
		console.warn("[Seidr Cmd] wardrobe open failed", e);
		seidrCmdWarn("Wardrobe unavailable");
	}
	return true;
}

function executeMetaCommand(tag: "seidr" | "roommanager" | "wardrobe"): boolean {
	if (tag === "wardrobe") return executeWardrobeCommand();
	if (tag === "seidr") {
		if (typeof Seidr.openSettings === "function") Seidr.openSettings();
		else seidrCmdWarn("Settings unavailable");
		return true;
	}
	try {
		const s = seidrGetSettings();
		if (Seidr.SHOW_ROOM_MANAGER === false || s.roomManagerEnabled === false) {
			seidrCmdWarn("Activate Room Manager in Settings → General first.");
			return true;
		}
		if (typeof Seidr.rmOpenPanel === "function") Seidr.rmOpenPanel();
		else seidrCmdWarn("Room Manager unavailable");
	} catch (e) {
		seidrCmdWarn("Room Manager unavailable");
	}
	return true;
}

export function seidrCmdExecuteLine(msg: string): boolean {
	const parsed = seidrParseCmdLine(msg);
	if (parsed.ok === false) {
		if (parsed.error !== "Not a Seidr command") seidrCmdWarn(parsed.error);
		return false;
	}

	if (!seidrCmdIsEnabled(parsed.tag)) {
		const key = seidrCmdEnableKeyForTag(parsed.tag) as SeidrCmdEnableKey;
		seidrCmdWarn("/" + parsed.tag + " is disabled in Settings → General → Commands"
			+ (key ? " (" + key + ")" : ""));
		return true;
	}

	if (parsed.family === "meta") {
		const metaTag =
			parsed.tag === "roommanager" ? "roommanager"
				: parsed.tag === "wardrobe" ? "wardrobe"
					: "seidr";
		return executeMetaCommand(metaTag);
	}
	if (parsed.family === "animation") {
		return executeAnimationCommand(parsed.secondRaw);
	}
	if (parsed.family === "poses") {
		return executePosesCommand(parsed.memberRaw, parsed.secondRaw);
	}
	if (parsed.family === "strip") {
		return executeStripCommand(
			parsed.tag === "stripe" ? "stripe" : "strip",
			parsed.memberRaw,
			parsed.secondRaw
		);
	}
	return executeActionCommand(parsed.memberRaw, parsed.secondRaw || parsed.actionRaw);
}
