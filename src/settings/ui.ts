/** Seidr settings panel body */
import { RM_LAUNCHER_POSITIONS, type RmLauncherPosition } from "./model";
import { seidrGetSettings, seidrSaveSettings } from "./storage";

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

export function seidrBuildSettingsBody() {
	const body = $("seidr-settings-body");
	if (!body) return;
	const opts = RM_LAUNCHER_POSITIONS.map(function (p) {
		return '<option value="' + p.id + '">' + p.label + "</option>";
	}).join("");
	body.innerHTML = [
		'<section class="seidr-settings-sec">',
		"<h3>Room Manager</h3>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-rm-enabled" /> Activate Room Manager</label>',
		"</div>",
		'<p class="seidr-settings-hint">Shows or hides the Room Manager launcher when you are a room admin.</p>',
		"</section>",
		'<section class="seidr-settings-sec">',
		"<h3>Launcher position</h3>",
		'<div class="seidr-settings-row">',
		'<select id="seidr-set-rm-pos">' + opts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
		"</section>",
	].join("");
}

export function seidrRefreshSettingsUi() {
	const s = seidrGetSettings();
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	if (en) en.checked = !!s.roomManagerEnabled;
	if (pos) pos.value = s.launcherPosition;
}

export function seidrBindSettingsUi(onChange?: () => void) {
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	function persist() {
		const patch = {
			roomManagerEnabled: !!(en && en.checked),
			launcherPosition: (pos && pos.value ? pos.value : "chatTop") as RmLauncherPosition,
		};
		seidrSaveSettings(patch);
		if (onChange) onChange();
	}
	if (en) en.addEventListener("change", persist);
	if (pos) pos.addEventListener("change", persist);
}
