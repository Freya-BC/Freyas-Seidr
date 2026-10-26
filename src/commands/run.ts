/** Execute resolved /a command via Club ActivityRun */
import { seidrCmdActivityAvailable, seidrCmdFindItemActivity } from "./catalog";
import { seidrParseCmdLine } from "./parse";
import { seidrCmdResolveAction, seidrCmdResolveMember } from "./resolve";
import { seidrCmdError, seidrCmdWarn } from "./warn";

declare const Player: any;
declare const AssetGroupGet: any;
declare const ActivityRun: any;
declare const ServerChatRoomGetAllowItem: any;

export function seidrCmdExecuteLine(msg: string): boolean {
	const parsed = seidrParseCmdLine(msg);
	if (parsed.ok === false) {
		if (parsed.error !== "Not a Seidr command") seidrCmdWarn(parsed.error);
		return false;
	}

	const mem = seidrCmdResolveMember(parsed.memberRaw);
	if (mem.ok === false) {
		seidrCmdWarn(mem.error);
		return true; // consumed
	}

	const act = seidrCmdResolveAction(parsed.actionRaw);
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

	if (!seidrCmdActivityAvailable(target, binding.slot, binding.activity)) {
		seidrCmdError(
			"Action \"" + binding.name + "\" (" + binding.activity + " on " + binding.slot +
			") is not available on that person right now."
		);
		return true;
	}

	const ia = seidrCmdFindItemActivity(target, binding.slot, binding.activity);
	if (!ia) {
		seidrCmdError("Could not resolve activity \"" + binding.activity + "\".");
		return true;
	}

	try {
		const family = (target && target.AssetFamily) || (Player && Player.AssetFamily) || "Female3DCG";
		const groupName = (ia.Group && (ia.Group.Name || ia.Group)) || binding.slot;
		const group = typeof AssetGroupGet === "function"
			? AssetGroupGet(family, typeof groupName === "string" ? groupName : binding.slot)
			: { Name: binding.slot };
		if (typeof ActivityRun !== "function") {
			seidrCmdError("ActivityRun unavailable");
			return true;
		}
		ActivityRun(Player, target, group, ia, true);
	} catch (e) {
		console.warn("[Seidr Cmd] ActivityRun failed", e);
		seidrCmdError("Failed to run activity.");
		return true;
	}

	return true;
}
