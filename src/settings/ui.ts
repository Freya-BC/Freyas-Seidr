/** Seidr settings panel body */
import { Seidr } from "../seidr";
import {
	AROUSAL_BAR_MODES,
	AROUSAL_BAR_SCOPES,
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
	type SeidrDrawOffsets,
	type SeidrFastOpenModifier,
} from "./model";
import { seidrRestraintSlots } from "../actions/model";
import { seidrApplyDrawOffsets } from "./drawOffsets";
import { seidrGetSettings, seidrSaveSettings } from "./storage";
import { seidrBuildActionsTab, seidrRefreshActionsTab } from "../actions/ui";
import { rmFormatBytes, rmUsageBreakdown } from "../roomManager/storage";

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

/** Draft Drawing offsets while Settings is open (Save persists). */
let drawDraft: SeidrDrawOffsets | null = null;
let drawDirty = false;

function poseRow(id: string, label: string): string {
	const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
	return [
		'<div class="seidr-settings-draw-row" data-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		'<input type="number" id="seidr-set-draw-' + id + '-x" min="' + xMin + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		'<input type="number" id="seidr-set-draw-' + id + '-y" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
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
	const modOpts = FAST_OPEN_MODIFIERS.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const slotOpts = seidrRestraintSlots().map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	return [
		'<details class="seidr-settings-sec">',
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
			storageRow("Settings", b.settings),
			storageRow("UI", b.ui),
		].join("");
	}
	if (mapsHint) {
		mapsHint.textContent = "Maps budget (75%): " + rmFormatBytes(b.maps) +
			" / " + rmFormatBytes(b.mapBudget);
	}
}

export function seidrBuildSettingsBody() {
	const body = $("seidr-settings-body");
	const tabs = $("seidr-settings-tabs");
	if (!body) return;
	const showActions = Seidr.SHOW_ACTIONS !== false;
	if (tabs) {
		tabs.innerHTML = [
			'<button type="button" class="seidr-settings-tab seidr-settings-tab-on" data-seidr-tab="general">General</button>',
			showActions
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="actions">Actions</button>'
				: "",
		].join("");
	}
	body.innerHTML = [
		'<div class="seidr-settings-pane seidr-settings-pane-on" id="seidr-settings-pane-general" data-seidr-pane="general">',
		seidrBuildGeneralHtml(),
		"</div>",
		showActions
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-actions" data-seidr-pane="actions"></div>'
			: "",
	].join("");
	if (showActions) {
		const actPane = $("seidr-settings-pane-actions");
		if (actPane) seidrBuildActionsTab(actPane);
	}
	const tabRoot = tabs || body;
	tabRoot.querySelectorAll("[data-seidr-tab]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const tab = (btn as HTMLElement).getAttribute("data-seidr-tab");
			tabRoot.querySelectorAll(".seidr-settings-tab").forEach(function (t) {
				t.classList.toggle("seidr-settings-tab-on", t.getAttribute("data-seidr-tab") === tab);
			});
			body.querySelectorAll(".seidr-settings-pane").forEach(function (p) {
				p.classList.toggle("seidr-settings-pane-on", p.getAttribute("data-seidr-pane") === tab);
			});
		});
	});
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
	const fo = $("seidr-set-fast-open") as HTMLInputElement | null;
	const fom = $("seidr-set-fast-open-mod") as HTMLSelectElement | null;
	const fos = $("seidr-set-fast-open-slot") as HTMLSelectElement | null;
	if (en) en.checked = !!s.roomManagerEnabled;
	if (qm) qm.checked = s.showQuickmenuButton !== false;
	if (pos) pos.value = s.launcherPosition;
	if (am) am.value = s.arousalBarMode;
	if (as) as.value = s.arousalBarScope;
	if (fo) fo.checked = s.fastOpenActionsEnabled !== false;
	if (fom) fom.value = s.fastOpenActionsModifier || "Shift";
	if (fos) fos.value = s.fastOpenActionsSlot || "ItemTorso";
	seidrBeginDrawDraft();
	seidrRefreshStorageUi();
	if (Seidr.SHOW_ACTIONS !== false) seidrRefreshActionsTab();
}

export function seidrBindSettingsUi(onChange?: () => void) {
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const am = $("seidr-set-arousal-mode") as HTMLSelectElement | null;
	const ascope = $("seidr-set-arousal-scope") as HTMLSelectElement | null;
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
	if (fo) fo.addEventListener("change", persist);
	if (fos) fos.addEventListener("change", persist);
	if (fom) fom.addEventListener("change", persist);
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
