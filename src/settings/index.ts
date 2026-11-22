/** Seidr settings — Preference Extensions entry */
import { seidrApplyColorScheme } from "./theme";
import { seidrGetSettings } from "./storage";
import { Seidr } from "../seidr";
import { seidrInstallChatFont } from "./chatFont";
import { seidrInstallClearUnreadOnFocus } from "./clearUnreadOnFocus";
import { seidrLoadCommittedDrawOffsets, seidrLoadCommittedMapDrawOffsets } from "./drawOffsets";
import { seidrRegisterPreference } from "./shell";
import "./tutorial";
import { seidrInstallWelcome } from "./welcome";
import { seidrInstallChangelog } from "./changelog";

export function installSeidrSettings() {
	try { seidrApplyColorScheme(seidrGetSettings().colorScheme); } catch (e) { /* ignore */ }
	try { seidrLoadCommittedDrawOffsets(); } catch (e) { /* ignore */ }
	try { seidrLoadCommittedMapDrawOffsets(); } catch (e) { /* ignore */ }
	try { seidrInstallChatFont(); } catch (e) { /* ignore */ }
	try { seidrInstallClearUnreadOnFocus(); } catch (e) { /* ignore */ }
	seidrRegisterPreference();
	try { seidrInstallChangelog(); } catch (e) { console.warn("[Seidr] update notice", e); }
	try { seidrInstallWelcome(); } catch (e) { /* ignore */ }
}

Seidr.installSeidrSettings = installSeidrSettings;
