/** Seidr settings — Preference Extensions entry */
import { Seidr } from "../seidr";
import { seidrInstallChatFont } from "./chatFont";
import { seidrInstallClearUnreadOnFocus } from "./clearUnreadOnFocus";
import { seidrLoadCommittedDrawOffsets, seidrLoadCommittedMapDrawOffsets } from "./drawOffsets";
import { seidrRegisterPreference } from "./shell";
import "./tutorial";
import { seidrInstallWelcome } from "./welcome";

export function installSeidrSettings() {
	try { seidrLoadCommittedDrawOffsets(); } catch (e) { /* ignore */ }
	try { seidrLoadCommittedMapDrawOffsets(); } catch (e) { /* ignore */ }
	try { seidrInstallChatFont(); } catch (e) { /* ignore */ }
	try { seidrInstallClearUnreadOnFocus(); } catch (e) { /* ignore */ }
	seidrRegisterPreference();
	try { seidrInstallWelcome(); } catch (e) { /* ignore */ }
}

Seidr.installSeidrSettings = installSeidrSettings;
