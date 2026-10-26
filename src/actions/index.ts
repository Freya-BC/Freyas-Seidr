/** Seidr Actions module — settings + Club Activity Menu registration */
import { Seidr } from "../seidr";
import { seidrInstallUserActions, seidrSyncUserActions } from "./runtime";

export function seidrInstallActions() {
	if (Seidr.SHOW_ACTIONS === false) return;
	seidrInstallUserActions();
}

Seidr.installActions = seidrInstallActions;
Seidr.syncUserActions = seidrSyncUserActions;
