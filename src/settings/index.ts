/** Seidr settings — Preference Extensions entry */
import { Seidr } from "../seidr";
import { seidrLoadCommittedDrawOffsets } from "./drawOffsets";
import { seidrRegisterPreference } from "./shell";
import "./tutorial";
import { seidrInstallWelcome } from "./welcome";

export function installSeidrSettings() {
	try { seidrLoadCommittedDrawOffsets(); } catch (e) { /* ignore */ }
	seidrRegisterPreference();
	try { seidrInstallWelcome(); } catch (e) { /* ignore */ }
}

Seidr.installSeidrSettings = installSeidrSettings;
