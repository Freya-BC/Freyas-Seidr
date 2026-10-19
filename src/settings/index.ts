/** Seidr settings — Preference Extensions entry */
import { Seidr } from "../seidr";
import { seidrRegisterPreference } from "./shell";

export function installSeidrSettings() {
	seidrRegisterPreference();
}

Seidr.installSeidrSettings = installSeidrSettings;
