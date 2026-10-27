/** Execute Seidr chat commands */
import { seidrPoseAvailable, seidrPoseLabel } from "../actions/model";
import { seidrPlayAnimation } from "../animations/play";
import { seidrFindAnimationByName } from "../animations/store";
import { Seidr } from "../seidr";
import { seidrCmdActivityAvailable, seidrCmdFindItemActivity } from "./catalog";
import { seidrCmdEnableKeyForTag, type SeidrCmdEnableKey } from "./model";
import { seidrParseCmdLine } from "./parse";
import { seidrCmdResolveAction, seidrCmdResolveMember } from "./resolve";
import { seidrGetCommandsBag } from "./store";
import { seidrGetSettings } from "../settings/storage";
import { seidrCmdResolveStripSlot } from "./stripCatalog";
import { seidrCmdError, seidrCmdWarn } from "./warn";

declare const Player: any;
declare const AssetGroupGet: any;
declare const ActivityRun: any;
declare const ServerChatRoomGetAllowItem: any;
declare const PoseSetActive: any;
declare const CharacterSetActivePose: any;
declare const ChatRoomCharacterUpdate: any;
declare const ServerSend: any;

export function seidrCmdIsEnabled(tag: string): boolean {
	const key = seidrCmdEnableKeyForTag(tag);
	if (!key) return false;
	const bag = seidrGetCommandsBag();
	return bag.enabled[key] !== false;
}

function runItemActivity(target: any, zone: string, activityName: string): boolean {
	if (!seidrCmdActivityAvailable(target, zone, activityName)) {
		seidrCmdError(
			"Activity \"" + activityName + "\" on " + zone + " is not available on that person right now."
		);
		return false;
	}
	const ia = seidrCmdFindItemActivity(target, zone, activityName);
	if (!ia) {
		seidrCmdError("Could not resolve activity \"" + activityName + "\".");
		return false;
	}
	try {
		const family = (target && target.AssetFamily) || (Player && Player.AssetFamily) || "Female3DCG";
		const groupName = (ia.Group && (ia.Group.Name || ia.Group)) || zone;
		const group = typeof AssetGroupGet === "function"
			? AssetGroupGet(family, typeof groupName === "string" ? groupName : zone)
			: { Name: zone };
		if (typeof ActivityRun !== "function") {
			seidrCmdError("ActivityRun unavailable");
			return false;
		}
		ActivityRun(Player, target, group, ia, true);
		return true;
	} catch (e) {
		console.warn("[Seidr Cmd] ActivityRun failed", e);
		seidrCmdError("Failed to run activity.");
		return false;
	}
}

function canPoseTarget(actor: any, acted: any): boolean {
	if (!actor || !acted) return false;
	if (actor === acted || (actor.IsPlayer && actor.IsPlayer() && acted.IsPlayer && acted.IsPlayer())) return true;
	try {
		if (typeof ServerChatRoomGetAllowItem === "function") {
			return !!ServerChatRoomGetAllowItem(actor, acted);
		}
	} catch (e) { /* ignore */ }
	return !!(acted.AllowItem);
}

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
	runItemActivity(target, binding.slot, binding.activity);
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
	runItemActivity(target, slot.option.zone, slot.option.activityName);
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
	if (!self && !canPoseTarget(Player, target)) {
		seidrCmdError("You cannot change that person's pose right now.");
		return true;
	}
	if (!seidrPoseAvailable(target, pose)) {
		seidrCmdWarn("Pose \"" + (seidrPoseLabel(pose) || pose) + "\" is not available on that person.");
		return true;
	}
	applyPose(target, pose);
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

function executeMetaCommand(tag: "seidr" | "roommanager"): boolean {
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
		return executeMetaCommand(parsed.tag === "roommanager" ? "roommanager" : "seidr");
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
