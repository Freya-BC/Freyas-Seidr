/** Shared Club ActivityRun helper for Commands + Reactions */
import { seidrCmdActivityAvailable, seidrCmdFindItemActivity } from "./catalog";

declare const Player: any;
declare const AssetGroupGet: any;
declare const ActivityRun: any;

/** Run an ItemActivity on target. Returns ok/error without toasting. */
export function seidrRunItemActivity(
	target: any,
	zone: string,
	activityName: string
): { ok: boolean; error?: string } {
	if (!target || !zone || !activityName) {
		return { ok: false, error: "Missing target, slot, or activity" };
	}
	if (!seidrCmdActivityAvailable(target, zone, activityName)) {
		return {
			ok: false,
			error: "Activity \"" + activityName + "\" on " + zone + " is not available right now",
		};
	}
	const ia = seidrCmdFindItemActivity(target, zone, activityName);
	if (!ia) {
		return { ok: false, error: "Could not resolve activity \"" + activityName + "\"" };
	}
	try {
		const family = (target && target.AssetFamily) || (Player && Player.AssetFamily) || "Female3DCG";
		const groupName = (ia.Group && (ia.Group.Name || ia.Group)) || zone;
		const group = typeof AssetGroupGet === "function"
			? AssetGroupGet(family, typeof groupName === "string" ? groupName : zone)
			: { Name: zone };
		if (typeof ActivityRun !== "function") {
			return { ok: false, error: "ActivityRun unavailable" };
		}
		ActivityRun(Player, target, group, ia, true);
		return { ok: true };
	} catch (e) {
		console.warn("[Seidr] ActivityRun failed", e);
		return { ok: false, error: "Failed to run activity" };
	}
}
