/** Seidr settings panel body */
import { Seidr } from "../seidr";
import {
	AROUSAL_BAR_MODES,
	AROUSAL_BAR_SCOPES,
	CLUSTER_NAME_MODES,
	FAST_OPEN_MODIFIERS,
	RM_LAUNCHER_POSITIONS,
	seidrCloneDrawOffsets,
	seidrDefaultDrawOffsets,
	seidrNormalizeDrawOffsets,
	SEIDR_DRAW_OFFSET_MAX,
	SEIDR_DRAW_OFFSET_MIN,
	type RmLauncherPosition,
	type SeidrArousalBarMode,
	type SeidrArousalBarScope,
	type SeidrClusterNameMode,
	type SeidrDrawOffsets,
	type SeidrFastOpenModifier,
} from "./model";
import { seidrRestraintSlots } from "../actions/model";
import { seidrApplyDrawOffsets } from "./drawOffsets";
import { seidrGetSettings, seidrSaveSettings } from "./storage";
import { seidrBuildActionsTab, seidrRefreshActionsTab } from "../actions/ui";
import { seidrBuildAnimationsTab, seidrRefreshAnimationsTab } from "../animations/ui";
import {
	SEIDR_CMD_ENABLE_LABELS,
	SEIDR_FAST_SELECT_EMPTY_OPTS,
	SEIDR_FAST_SELECT_KEY_LABELS,
	seidrNormalizeCmdEnabled,
	seidrNormalizeFastSelectEmpty,
	seidrNormalizeFastSelectKeys,
	type SeidrCmdEnableKey,
	type SeidrFastSelectEmpty,
	type SeidrFastSelectKey,
} from "../commands/model";
import { seidrBuildCommandsTab, seidrRefreshCommandsTab } from "../commands/ui";
import { seidrGetCommandsBag, seidrSaveCommandsBag } from "../commands/store";
import { rmFormatBytes, rmUsageBreakdown } from "../roomManager/storage";
import { rmIsShown } from "../roomManager/model";
import { seidrBuildMapsTab, seidrRefreshMapsTab } from "../roomManager/mapsUi";
import { rmLocalMapsStats } from "../roomManager/maps";
import { seidrBuildAboutTab } from "./about";

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

/** Draft Drawing offsets while Settings is open (Save persists). */
let drawDraft: SeidrDrawOffsets | null = null;
let drawDirty = false;

function drawNumInput(id: string, min: string, max: string): string {
	return [
		'<span class="seidr-num-wrap">',
		'<input type="number" class="seidr-settings-num" id="' + id + '" min="' + min +
		'" max="' + max + '" step="1" />',
		'<span class="seidr-num-spin" aria-hidden="true">',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="1" tabindex="-1" title="Increase">▲</button>',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="-1" tabindex="-1" title="Decrease">▼</button>',
		"</span>",
		"</span>",
	].join("");
}

function poseRow(id: string, label: string): string {
	const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
	const max = String(SEIDR_DRAW_OFFSET_MAX);
	return [
		'<div class="seidr-settings-draw-row" data-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		drawNumInput("seidr-set-draw-" + id + "-x", xMin, max),
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		drawNumInput("seidr-set-draw-" + id + "-y", String(SEIDR_DRAW_OFFSET_MIN), max),
		"</label>",
		'<button type="button" data-draw-reset="' + id + '">Reset</button>',
		"</div>",
	].join("");
}

function seidrBuildGeneralHtml(): string {
	const opts = RM_LAUNCHER_POSITIONS.map(function (p) {
		return '<option value="' + p.id + '">' + p.label + "</option>";
	}).join("");
	const modeOpts = AROUSAL_BAR_MODES.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const scopeOpts = AROUSAL_BAR_SCOPES.map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	const nameOpts = CLUSTER_NAME_MODES.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const modOpts = FAST_OPEN_MODIFIERS.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const slotOpts = seidrRestraintSlots().map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	return [
		'<details class="seidr-settings-sec" data-seidr-tour="fast-open">',
		"<summary>Fast Open Actions</summary>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-fast-open" /> Enable Fast Open Actions</label>',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Modifier</span>',
		'<select id="seidr-set-fast-open-mod">' + modOpts + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Default slot</span>',
		'<select id="seidr-set-fast-open-slot">' + slotOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Hold the modifier and click a room character to open Club Activity View on the default slot (falls back if that zone has no activities). If FAM Shift-click is installed, pick another modifier or disable this.</p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Room Manager</summary>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-rm-enabled" /> Activate Room Manager</label>',
		"</div>",
		'<p class="seidr-settings-hint">Master switch for Room Manager (ChatAdmin button and floating quickmenu).</p>',
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-quickmenu" /> Show Quickmenu Button</label>',
		"</div>",
		'<p class="seidr-settings-hint">Floating ⌂ in the chat room. Off hides it completely. ChatAdmin Room Manager button is unaffected.</p>',
		'<div class="seidr-settings-row">',
		'<button type="button" id="seidr-set-open-rm">Open Room Manager</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-open-rm-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Launcher position</summary>",
		'<div class="seidr-settings-row">',
		'<select id="seidr-set-rm-pos">' + opts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Drawing</summary>",
		'<p class="seidr-settings-hint">Echo pair spacing: Pull X is half-gap from center (hub shifts on one-side pull). Pull Y raises both sides. Cuddle moves the holder. Models only — hitboxes stay put. Save Drawing to keep.</p>',
		poseRow("pull", "Pull"),
		poseRow("cuddle", "Cuddle"),
		'<div class="seidr-settings-field-row" style="margin-top:10px;">',
		'<span class="seidr-settings-field-label">Names</span>',
		'<select id="seidr-set-cluster-names">' + nameOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Cuddle / pull nicknames only (raised and centered over the arousal bar). Hitbox always shows; Hover shows only while the cursor is on that seat; Hide never. Does not change status icons or art.</p>',
		'<div class="seidr-settings-row seidr-settings-draw-actions">',
		'<button type="button" id="seidr-set-draw-save">Save Drawing</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-draw-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Arousal bars</summary>",
		'<p class="seidr-settings-hint">Hide or relocate Club / BCTweaks arousal meters (on-character thermometer and split orgasm track).</p>',
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Mode</span>',
		'<select id="seidr-set-arousal-mode">' + modeOpts + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Who</span>',
		'<select id="seidr-set-arousal-scope">' + scopeOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Seidr holds = hub, pull left/right, or cuddle. Show on change: bar appears when arousal moves, hides 1s after. Bottom bar: under each name inside the character hitbox (two slots; BCTweaks fills both).</p>',
		"</details>",
		'<details class="seidr-settings-sec" data-seidr-tour="commands-enable">',
		"<summary>Commands</summary>",
		'<p class="seidr-settings-hint">Enable or disable Seidr chat commands. Off = not registered / ignored.</p>',
		'<div id="seidr-set-cmd-enable">' +
		SEIDR_CMD_ENABLE_LABELS.map(function (row) {
			return (
				'<div class="seidr-settings-row">' +
				'<label><input type="checkbox" data-seidr-cmd-en="' + row.key + '" /> ' +
				row.label + "</label></div>"
			);
		}).join("") +
		"</div>",
		Seidr.SHOW_CMD_FAST_SELECT !== false
			? [
				'<p class="seidr-settings-hint" style="margin-top:12px;">Fast Select (Dev) — letter + Tab in chat. Last successful /a /strip /poses target is preselected in member autocomplete.</p>',
				'<div class="seidr-settings-row">',
				'<label><input type="checkbox" id="seidr-set-fast-select" /> Enable Fast Select</label>',
				"</div>",
				'<div id="seidr-set-fast-select-keys" style="margin-top:8px;">' +
				SEIDR_FAST_SELECT_KEY_LABELS.map(function (row) {
					return (
						'<div class="seidr-settings-row">' +
						'<label><input type="checkbox" data-seidr-fs-key="' + row.key + '" /> ' +
						row.label + "</label></div>"
					);
				}).join("") +
				"</div>",
				'<div class="seidr-settings-field-row" style="margin-top:8px;">',
				'<span class="seidr-settings-field-label">Empty Tab</span>',
				'<select id="seidr-set-fast-select-empty">' +
				SEIDR_FAST_SELECT_EMPTY_OPTS.map(function (o) {
					return '<option value="' + o.id + '">' + o.label + "</option>";
				}).join("") +
				"</select>",
				"</div>",
				'<p class="seidr-settings-hint">Letter checkboxes gate a/s/d/p + Tab. Empty Tab uses the dropdown (Disabled = Club Tab).</p>',
			].join("")
			: "",
		'<p class="seidr-settings-hint" id="seidr-set-cmd-en-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec" open>',
		"<summary>Storage</summary>",
		'<p class="seidr-settings-hint" id="seidr-set-storage-total">—</p>',
		'<div class="seidr-set-storage-bar" aria-hidden="true"><div class="seidr-set-storage-bar-fill" id="seidr-set-storage-bar"></div></div>',
		'<div class="seidr-set-storage-rows" id="seidr-set-storage-rows"></div>',
		'<p class="seidr-settings-hint" id="seidr-set-storage-maps-hint"></p>',
		"</details>",
	].join("");
}

function storageRow(label: string, bytes: number): string {
	return (
		'<div class="seidr-settings-field-row seidr-set-storage-row">' +
		'<span class="seidr-settings-field-label">' + label + "</span>" +
		'<span class="seidr-set-storage-val">' + rmFormatBytes(bytes) + "</span>" +
		"</div>"
	);
}

export function seidrRefreshStorageUi() {
	const totalEl = $("seidr-set-storage-total");
	const bar = $("seidr-set-storage-bar");
	const rows = $("seidr-set-storage-rows");
	const mapsHint = $("seidr-set-storage-maps-hint");
	if (!totalEl && !rows) return;
	let b;
	try {
		b = rmUsageBreakdown();
	} catch (e) {
		if (totalEl) totalEl.textContent = "Storage unavailable";
		return;
	}
	const pct = b.max > 0 ? Math.min(100, Math.round((b.total / b.max) * 100)) : 0;
	if (totalEl) {
		totalEl.textContent = "Total " + rmFormatBytes(b.total) + " / " + rmFormatBytes(b.max) +
			" (" + pct + "%)";
	}
	if (bar) bar.style.width = pct + "%";
	if (rows) {
		rows.innerHTML = [
			storageRow("Maps", b.maps),
			storageRow("Rooms", b.room),
			storageRow("Access", b.access),
			storageRow("Backgrounds", b.backgrounds),
			storageRow("Actions", b.actions),
			storageRow("Commands", b.commands),
			storageRow("Animations", b.animations),
			storageRow("Settings", b.settings),
			storageRow("UI", b.ui),
		].join("");
	}
	if (mapsHint) {
		let localBit = "";
		try {
			const loc = rmLocalMapsStats();
			localBit = " · Local " + loc.label;
		} catch (e) { /* ignore */ }
		mapsHint.textContent = "Maps budget (75%): " + rmFormatBytes(b.maps) +
			" / " + rmFormatBytes(b.mapBudget) + localBit;
	}
}

export function seidrBuildSettingsBody() {
	const body = $("seidr-settings-body");
	const tabs = $("seidr-settings-tabs");
	if (!body) return;
	const showActions = Seidr.SHOW_ACTIONS !== false;
	const showCommands = Seidr.SHOW_COMMANDS !== false;
	const showAnimations = Seidr.SHOW_COMMANDS !== false;
	const showMaps = rmIsShown();
	if (tabs) {
		tabs.innerHTML = [
			'<button type="button" class="seidr-settings-tab seidr-settings-tab-on" data-seidr-tab="general">General</button>',
			showActions
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="actions">Actions</button>'
				: "",
			showCommands
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="commands">Commands</button>'
				: "",
			showAnimations
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="animations">Animations</button>'
				: "",
			showMaps
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="maps">Maps</button>'
				: "",
			'<button type="button" class="seidr-settings-tab" data-seidr-tab="about">About</button>',
		].join("");
	}
	body.innerHTML = [
		'<div class="seidr-settings-pane seidr-settings-pane-on" id="seidr-settings-pane-general" data-seidr-pane="general">',
		seidrBuildGeneralHtml(),
		"</div>",
		showActions
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-actions" data-seidr-pane="actions"></div>'
			: "",
		showCommands
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-commands" data-seidr-pane="commands"></div>'
			: "",
		showAnimations
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-animations" data-seidr-pane="animations"></div>'
			: "",
		showMaps
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-maps" data-seidr-pane="maps"></div>'
			: "",
		'<div class="seidr-settings-pane" id="seidr-settings-pane-about" data-seidr-pane="about"></div>',
	].join("");
	if (showActions) {
		const actPane = $("seidr-settings-pane-actions");
		if (actPane) seidrBuildActionsTab(actPane);
	}
	if (showCommands) {
		const cmdPane = $("seidr-settings-pane-commands");
		if (cmdPane) seidrBuildCommandsTab(cmdPane);
	}
	if (showAnimations) {
		const animPane = $("seidr-settings-pane-animations");
		if (animPane) seidrBuildAnimationsTab(animPane);
	}
	if (showMaps) {
		const mapsPane = $("seidr-settings-pane-maps");
		if (mapsPane) seidrBuildMapsTab(mapsPane);
	}
	const aboutPane = $("seidr-settings-pane-about");
	if (aboutPane) seidrBuildAboutTab(aboutPane);
	const tabRoot = tabs || body;
	tabRoot.querySelectorAll("[data-seidr-tab]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const tab = (btn as HTMLElement).getAttribute("data-seidr-tab");
			if (tab) seidrSelectSettingsTab(tab);
		});
	});
}

/** Switch settings pane by tab id (general / actions / commands / …). */
export function seidrSelectSettingsTab(tab: string) {
	const body = $("seidr-settings-body");
	const tabs = $("seidr-settings-tabs");
	if (!body || !tab) return;
	const tabRoot = tabs || body;
	tabRoot.querySelectorAll(".seidr-settings-tab").forEach(function (t) {
		t.classList.toggle("seidr-settings-tab-on", t.getAttribute("data-seidr-tab") === tab);
	});
	body.querySelectorAll(".seidr-settings-pane").forEach(function (p) {
		p.classList.toggle("seidr-settings-pane-on", p.getAttribute("data-seidr-pane") === tab);
	});
	if (tab === "maps") {
		try { seidrRefreshMapsTab(); } catch (e) { /* ignore */ }
	}
}

function setDrawMsg(text: string) {
	const el = $("seidr-set-draw-msg");
	if (el) el.textContent = text || "";
}

function fillDrawInputs(o: SeidrDrawOffsets) {
	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) x.value = String(o[pose].x);
		if (y) y.value = String(o[pose].y);
	});
}

function readDrawDraftFromInputs(): SeidrDrawOffsets {
	const fallback = drawDraft ? drawDraft : seidrDefaultDrawOffsets();
	return seidrNormalizeDrawOffsets({
		pull: {
			x: ($("seidr-set-draw-pull-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-pull-y") as HTMLInputElement | null)?.value,
		},
		cuddle: {
			x: ($("seidr-set-draw-cuddle-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-cuddle-y") as HTMLInputElement | null)?.value,
		},
	}, fallback);
}

function liveApplyDraft() {
	if (!drawDraft) return;
	seidrApplyDrawOffsets(drawDraft);
}

export function seidrBeginDrawDraft() {
	drawDraft = seidrCloneDrawOffsets(seidrGetSettings().drawOffsets);
	drawDirty = false;
	fillDrawInputs(drawDraft);
	seidrApplyDrawOffsets(drawDraft);
	setDrawMsg("");
}

/** Discard unsaved Drawing draft and restore committed offsets. */
export function seidrDiscardDrawDraft() {
	if (!drawDirty && !drawDraft) {
		seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
		drawDraft = null;
		return;
	}
	drawDraft = null;
	drawDirty = false;
	seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
	setDrawMsg("");
}

export function seidrRefreshSettingsUi() {
	const s = seidrGetSettings();
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const am = $("seidr-set-arousal-mode") as HTMLSelectElement | null;
	const as = $("seidr-set-arousal-scope") as HTMLSelectElement | null;
	const cn = $("seidr-set-cluster-names") as HTMLSelectElement | null;
	const fo = $("seidr-set-fast-open") as HTMLInputElement | null;
	const fom = $("seidr-set-fast-open-mod") as HTMLSelectElement | null;
	const fos = $("seidr-set-fast-open-slot") as HTMLSelectElement | null;
	if (en) en.checked = !!s.roomManagerEnabled;
	if (qm) qm.checked = s.showQuickmenuButton !== false;
	if (pos) pos.value = s.launcherPosition;
	if (am) am.value = s.arousalBarMode;
	if (as) as.value = s.arousalBarScope;
	if (cn) cn.value = s.clusterNameMode || "hitbox";
	if (fo) fo.checked = s.fastOpenActionsEnabled !== false;
	if (fom) fom.value = s.fastOpenActionsModifier || "Shift";
	if (fos) fos.value = s.fastOpenActionsSlot || "ItemTorso";
	seidrBeginDrawDraft();
	seidrRefreshStorageUi();
	try {
		const bag = seidrGetCommandsBag();
		document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-cmd-en") as SeidrCmdEnableKey | null;
			if (!key) return;
			(el as HTMLInputElement).checked = bag.enabled[key] !== false;
		});
		const fs = $("seidr-set-fast-select") as HTMLInputElement | null;
		const fse = $("seidr-set-fast-select-empty") as HTMLSelectElement | null;
		if (fs) fs.checked = bag.fastSelectEnabled !== false;
		if (fse) fse.value = bag.fastSelectEmpty || "disabled";
		const keys = bag.fastSelectKeys || seidrNormalizeFastSelectKeys(null);
		document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-fs-key") as SeidrFastSelectKey | null;
			if (!key) return;
			(el as HTMLInputElement).checked = keys[key] !== false;
		});
	} catch (e) { /* ignore */ }
	if (Seidr.SHOW_ACTIONS !== false) seidrRefreshActionsTab();
	if (Seidr.SHOW_COMMANDS !== false) {
		seidrRefreshCommandsTab();
		seidrRefreshAnimationsTab();
	}
}

export function seidrBindSettingsUi(onChange?: () => void) {
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const am = $("seidr-set-arousal-mode") as HTMLSelectElement | null;
	const ascope = $("seidr-set-arousal-scope") as HTMLSelectElement | null;
	const cn = $("seidr-set-cluster-names") as HTMLSelectElement | null;
	const fo = $("seidr-set-fast-open") as HTMLInputElement | null;
	const fom = $("seidr-set-fast-open-mod") as HTMLSelectElement | null;
	const fos = $("seidr-set-fast-open-slot") as HTMLSelectElement | null;
	const openRm = $("seidr-set-open-rm") as HTMLButtonElement | null;
	const openMsg = $("seidr-set-open-rm-msg");
	function persist() {
		const patch = {
			roomManagerEnabled: !!(en && en.checked),
			showQuickmenuButton: !!(qm && qm.checked),
			launcherPosition: (pos && pos.value ? pos.value : "chatTop") as RmLauncherPosition,
			arousalBarMode: (am && am.value ? am.value : "off") as SeidrArousalBarMode,
			arousalBarScope: (ascope && ascope.value ? ascope.value : "seidrCluster") as SeidrArousalBarScope,
			clusterNameMode: (cn && cn.value ? cn.value : "hitbox") as SeidrClusterNameMode,
			fastOpenActionsEnabled: !!(fo && fo.checked),
			fastOpenActionsModifier: (fom && fom.value ? fom.value : "Shift") as SeidrFastOpenModifier,
			fastOpenActionsSlot: fos && fos.value ? fos.value : "ItemTorso",
		};
		seidrSaveSettings(patch);
		if (onChange) onChange();
	}
	if (en) en.addEventListener("change", persist);
	if (qm) qm.addEventListener("change", persist);
	if (pos) pos.addEventListener("change", persist);
	if (am) am.addEventListener("change", persist);
	if (ascope) ascope.addEventListener("change", persist);
	if (cn) cn.addEventListener("change", persist);
	if (fo) fo.addEventListener("change", persist);
	if (fos) fos.addEventListener("change", persist);
	if (fom) fom.addEventListener("change", persist);

	function persistCmdEnable() {
		const bag = seidrGetCommandsBag();
		const raw: Record<string, boolean> = {};
		document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-cmd-en");
			if (!key) return;
			raw[key] = !!(el as HTMLInputElement).checked;
		});
		bag.enabled = seidrNormalizeCmdEnabled(raw);
		const fs = $("seidr-set-fast-select") as HTMLInputElement | null;
		const fse = $("seidr-set-fast-select-empty") as HTMLSelectElement | null;
		if (fs) bag.fastSelectEnabled = !!fs.checked;
		if (fse) {
			bag.fastSelectEmpty = seidrNormalizeFastSelectEmpty(fse.value) as SeidrFastSelectEmpty;
		}
		const keyRaw: Record<string, boolean> = {};
		document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-fs-key");
			if (!key) return;
			keyRaw[key] = !!(el as HTMLInputElement).checked;
		});
		bag.fastSelectKeys = seidrNormalizeFastSelectKeys(keyRaw);
		const saved = seidrSaveCommandsBag(bag);
		const msg = $("seidr-set-cmd-en-msg");
		if (msg) msg.textContent = saved.ok ? "Saved — reload chat commands applied" : (saved.error || "Save failed");
		try {
			if (typeof Seidr.registerCommands === "function") Seidr.registerCommands();
		} catch (e) { /* ignore */ }
		if (onChange) onChange();
	}
	document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
		el.addEventListener("change", persistCmdEnable);
	});
	document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
		el.addEventListener("change", persistCmdEnable);
	});
	const fsEl = $("seidr-set-fast-select");
	const fseEl = $("seidr-set-fast-select-empty");
	if (fsEl) fsEl.addEventListener("change", persistCmdEnable);
	if (fseEl) fseEl.addEventListener("change", persistCmdEnable);

	if (openRm) {
		openRm.addEventListener("click", function () {
			const s = seidrGetSettings();
			if (!Seidr.SHOW_ROOM_MANAGER || s.roomManagerEnabled === false) {
				if (openMsg) openMsg.textContent = "Activate Room Manager first.";
				return;
			}
			if (openMsg) openMsg.textContent = "";
			if (typeof Seidr.rmOpenPanel === "function") Seidr.rmOpenPanel();
			else if (openMsg) openMsg.textContent = "Room Manager unavailable.";
		});
	}

	function onDrawLive() {
		const next = readDrawDraftFromInputs();
		drawDraft = next;
		drawDirty = true;
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	function onDrawCommit() {
		const next = readDrawDraftFromInputs();
		drawDraft = next;
		drawDirty = true;
		fillDrawInputs(next);
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) {
			x.addEventListener("input", onDrawLive);
			x.addEventListener("change", onDrawCommit);
		}
		if (y) {
			y.addEventListener("input", onDrawLive);
			y.addEventListener("change", onDrawCommit);
		}
	});

	document.querySelectorAll(".seidr-settings-draw-row [data-seidr-num-dir]").forEach(function (btn) {
		btn.addEventListener("click", function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			const wrap = (btn as HTMLElement).closest(".seidr-num-wrap");
			const input = wrap ? wrap.querySelector("input[type=\"number\"]") as HTMLInputElement | null : null;
			if (!input) return;
			const dir = parseInt((btn as HTMLElement).getAttribute("data-seidr-num-dir") || "0", 10);
			if (!dir) return;
			const step = parseFloat(input.step) || 1;
			const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
			const max = input.max !== "" ? parseFloat(input.max) : Infinity;
			let n = parseFloat(input.value);
			if (!Number.isFinite(n)) n = 0;
			n = Math.round(n + dir * step);
			if (n < min) n = min;
			if (n > max) n = max;
			input.value = String(n);
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
	});

	document.querySelectorAll("[data-draw-reset]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const pose = (btn as HTMLElement).getAttribute("data-draw-reset") as keyof SeidrDrawOffsets | null;
			if (!pose || !drawDraft) return;
			const def = seidrDefaultDrawOffsets();
			drawDraft[pose] = { x: def[pose].x, y: def[pose].y };
			drawDirty = true;
			fillDrawInputs(drawDraft);
			liveApplyDraft();
			setDrawMsg("Reset to default — Save Drawing to keep");
		});
	});

	const saveBtn = $("seidr-set-draw-save") as HTMLButtonElement | null;
	if (saveBtn) {
		saveBtn.addEventListener("click", function () {
			const next = readDrawDraftFromInputs();
			drawDraft = next;
			const saved = seidrSaveSettings({ drawOffsets: next });
			if (!saved.ok) {
				setDrawMsg(saved.error || "Save failed");
				return;
			}
			drawDirty = false;
			seidrApplyDrawOffsets(next);
			fillDrawInputs(next);
			setDrawMsg("Drawing saved");
		});
	}
}
