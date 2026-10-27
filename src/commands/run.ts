/** Execute /a|/action and /strip|/stripe via Club ActivityRun */
import { seidrCmdActivityAvailable, seidrCmdFindItemActivity } from "./catalog";
import { seidrParseCmdLine } from "./parse";
import { seidrCmdResolveAction, seidrCmdResolveMember } from "./resolve";
import { seidrCmdResolveStripSlot } from "./stripCatalog";
import { seidrCmdError, seidrCmdWarn } from "./warn";

declare const Player: any;
declare const AssetGroupGet: any;
declare const ActivityRun: any;
declare const ServerChatRoomGetAllowItem: any;

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

export function seidrCmdExecuteLine(msg: string): boolean {
	const parsed = seidrParseCmdLine(msg);
	if (parsed.ok === false) {
		if (parsed.error !== "Not a Seidr command") seidrCmdWarn(parsed.error);
		return false;
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
