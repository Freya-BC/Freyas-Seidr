/** Seidr settings — Preference Extensions entry */
import { Seidr } from "../seidr";
import { seidrLoadCommittedDrawOffsets } from "./drawOffsets";
import { seidrRegisterPreference } from "./shell";

export function installSeidrSettings() {
	try { seidrLoadCommittedDrawOffsets(); } catch (e) { /* ignore */ }
	seidrRegisterPreference();
}

Seidr.installSeidrSettings = installSeidrSettings;
