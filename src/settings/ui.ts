/** Seidr settings panel body */
import { Seidr } from "../seidr";
import {
	RM_LAUNCHER_POSITIONS,
	seidrCloneDrawOffsets,
	seidrDefaultDrawOffsets,
	seidrNormalizeDrawOffsets,
	SEIDR_DRAW_OFFSET_MAX,
	SEIDR_DRAW_OFFSET_MIN,
	type RmLauncherPosition,
	type SeidrDrawOffsets,
} from "./model";
import { seidrApplyDrawOffsets } from "./drawOffsets";
import { seidrGetSettings, seidrSaveSettings } from "./storage";

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

/** Draft Drawing offsets while Settings is open (Save persists). */
let drawDraft: SeidrDrawOffsets | null = null;
let drawDirty = false;

function poseRow(id: string, label: string): string {
	return [
		'<div class="seidr-settings-draw-row" data-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		'<input type="number" id="seidr-set-draw-' + id + '-x" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		'<input type="number" id="seidr-set-draw-' + id + '-y" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
		"</label>",
		'<button type="button" data-draw-reset="' + id + '">Reset</button>',
		"</div>",
	].join("");
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
		'<p class="seidr-settings-hint">Master switch for Room Manager (ChatAdmin button and floating quickmenu).</p>',
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-quickmenu" /> Show Quickmenu Button</label>',
		"</div>",
		'<p class="seidr-settings-hint">Floating ⌂ in the chat room. Off hides it completely. ChatAdmin Room Manager button is unaffected.</p>',
		'<div class="seidr-settings-row">',
		'<button type="button" id="seidr-set-open-rm">Open Room Manager</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-open-rm-msg"></p>',
		"</section>",
		'<section class="seidr-settings-sec">',
		"<h3>Launcher position</h3>",
		'<div class="seidr-settings-row">',
		'<select id="seidr-set-rm-pos">' + opts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
		"</section>",
		'<section class="seidr-settings-sec">',
		"<h3>Drawing</h3>",
		'<p class="seidr-settings-hint">Live preview on character models only. Click hitboxes stay put. Save Drawing to keep.</p>',
		poseRow("pullLeft", "Pull Left"),
		poseRow("pullRight", "Pull Right"),
		poseRow("cuddle", "Cuddle"),
		'<div class="seidr-settings-row seidr-settings-draw-actions">',
		'<button type="button" id="seidr-set-draw-save">Save Drawing</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-draw-msg"></p>',
		"</section>",
	].join("");
}

function setDrawMsg(text: string) {
	const el = $("seidr-set-draw-msg");
	if (el) el.textContent = text || "";
}

function fillDrawInputs(o: SeidrDrawOffsets) {
	(["pullLeft", "pullRight", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) x.value = String(o[pose].x);
		if (y) y.value = String(o[pose].y);
	});
}

function readDrawDraftFromInputs(): SeidrDrawOffsets {
	const fallback = drawDraft ? drawDraft : seidrDefaultDrawOffsets();
	return seidrNormalizeDrawOffsets({
		pullLeft: {
			x: ($("seidr-set-draw-pullLeft-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-pullLeft-y") as HTMLInputElement | null)?.value,
		},
		pullRight: {
			x: ($("seidr-set-draw-pullRight-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-pullRight-y") as HTMLInputElement | null)?.value,
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
	if (en) en.checked = !!s.roomManagerEnabled;
	if (qm) qm.checked = s.showQuickmenuButton !== false;
	if (pos) pos.value = s.launcherPosition;
	seidrBeginDrawDraft();
}

export function seidrBindSettingsUi(onChange?: () => void) {
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const openRm = $("seidr-set-open-rm") as HTMLButtonElement | null;
	const openMsg = $("seidr-set-open-rm-msg");
	function persist() {
		const patch = {
			roomManagerEnabled: !!(en && en.checked),
			showQuickmenuButton: !!(qm && qm.checked),
			launcherPosition: (pos && pos.value ? pos.value : "chatTop") as RmLauncherPosition,
		};
		seidrSaveSettings(patch);
		if (onChange) onChange();
	}
	if (en) en.addEventListener("change", persist);
	if (qm) qm.addEventListener("change", persist);
	if (pos) pos.addEventListener("change", persist);
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

	(["pullLeft", "pullRight", "cuddle"] as const).forEach(function (pose) {
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
