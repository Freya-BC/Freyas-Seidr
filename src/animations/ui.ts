/** Settings → Animations tab */
import { SEIDR_ACTION_POSES, seidrPoseLabel } from "../actions/model";
import {
	SEIDR_ANIMATIONS_MAX,
	SEIDR_ANIM_FACE_DURATIONS,
	SEIDR_ANIM_FACE_MAP,
	SEIDR_ANIM_STEPS_MAX,
	SEIDR_ANIM_WAIT_TOTAL_MAX,
	seidrAnimWaitTotal,
	seidrDefaultAnimFaceStep,
	seidrDefaultAnimPoseStep,
	type SeidrAnimFaceFeature,
	type SeidrAnimStep,
	type SeidrAnimation,
} from "./model";
import {
	seidrAddAnimation,
	seidrDeleteAnimation,
	seidrListAnimations,
	seidrUpsertAnimation,
} from "./store";

let editId: number | null = null;
let draft: SeidrAnimation | null = null;

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function opts(list: { id: string; label: string }[], selected: string): string {
	return list.map(function (o) {
		return '<option value="' + escapeHtml(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" +
			escapeHtml(o.label) + "</option>";
	}).join("");
}

function stringOpts(list: string[], selected: string): string {
	return list.map(function (o) {
		return '<option value="' + escapeHtml(o) + '"' + (o === selected ? " selected" : "") + ">" +
			escapeHtml(o || "(clear)") + "</option>";
	}).join("");
}

function setMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-anim-msg");
	if (el) el.textContent = text || "";
}

function updateCap(root: HTMLElement) {
	const el = root.querySelector("#seidr-anim-cap");
	if (!el) return;
	el.textContent = seidrListAnimations().length + "/" + SEIDR_ANIMATIONS_MAX + " Animations";
}

function renderList(root: HTMLElement) {
	const list = seidrListAnimations();
	const box = root.querySelector("#seidr-anim-list");
	if (!box) return;
	updateCap(root);
	if (!list.length) {
		box.innerHTML = '<p class="seidr-settings-hint">No animations yet. Add one, then play with /animation name.</p>';
		return;
	}
	const optsHtml = list.map(function (a) {
		return '<option value="' + a.id + '"' + (editId === a.id ? " selected" : "") + ">" +
			escapeHtml(a.name) + " (" + a.steps.length + ")</option>";
	}).join("");
	box.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Animation</span>',
		'<select id="seidr-anim-pick">' + optsHtml + "</select>",
		"</div>",
	].join("");
}

function faceSummaryLabel(step: Extract<SeidrAnimStep, { kind: "face" }>): string {
	const expr = step.expression ? step.expression : "Clear";
	return step.feature + " · " + expr;
}

function waitStepperHtml(wait: number): string {
	return [
		'<div class="seidr-num-wrap">',
		'<input type="number" class="seidr-settings-num" min="0" max="' + SEIDR_ANIM_WAIT_TOTAL_MAX +
		'" step="0.1" data-anim-wait value="' + escapeHtml(String(wait)) + '" />',
		'<div class="seidr-num-spin" aria-hidden="true">',
		'<button type="button" class="seidr-num-spin-btn" data-anim-wait-dir="1" tabindex="-1" title="Increase">▲</button>',
		'<button type="button" class="seidr-num-spin-btn" data-anim-wait-dir="-1" tabindex="-1" title="Decrease">▼</button>',
		"</div>",
		"</div>",
	].join("");
}

function stepCardHtml(step: SeidrAnimStep, index: number): string {
	const waitInput = waitStepperHtml(step.wait);
	if (step.kind === "pose") {
		const poseName = seidrPoseLabel(step.pose);
		return [
			'<details class="seidr-settings-sec" data-anim-step="' + index + '" open>',
			"<summary>Pose · " + escapeHtml(poseName) + "</summary>",
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Pose</span>',
			'<select data-anim-pose>' + opts(SEIDR_ACTION_POSES, step.pose) + "</select>",
			"</div>",
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Wait (s)</span>',
			waitInput,
			"</div>",
			'<div class="seidr-settings-row" style="margin-top:8px;">',
			'<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-anim-del-step="' +
			index + '">Remove</button>',
			"</div>",
			"</details>",
		].join("");
	}
	const feature = step.feature;
	const exprs = [""].concat(SEIDR_ANIM_FACE_MAP[feature] || []);
	return [
		'<details class="seidr-settings-sec" data-anim-step="' + index + '" open>',
		"<summary>Face · " + escapeHtml(faceSummaryLabel(step)) + "</summary>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Feature</span>',
		'<select data-anim-feature>' +
		stringOpts(Object.keys(SEIDR_ANIM_FACE_MAP), feature) +
		"</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Expression</span>',
		'<select data-anim-expr>' + stringOpts(exprs, step.expression) + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Duration</span>',
		'<select data-anim-dur>' + stringOpts(SEIDR_ANIM_FACE_DURATIONS as unknown as string[], step.duration) +
		"</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Wait (s)</span>',
		waitInput,
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-anim-del-step="' +
		index + '">Remove</button>',
		"</div>",
		"</details>",
	].join("");
}

function readDraftFromDom(root: HTMLElement): SeidrAnimation | null {
	if (!draft) return null;
	const nameEl = root.querySelector("#seidr-anim-name") as HTMLInputElement | null;
	const name = (nameEl && nameEl.value || "").trim() || draft.name;
	const cards = root.querySelectorAll("[data-anim-step]");
	const steps: SeidrAnimStep[] = [];
	cards.forEach(function (card) {
		const waitEl = card.querySelector("[data-anim-wait]") as HTMLInputElement | null;
		const wait = waitEl ? parseFloat(waitEl.value) : 0.5;
		const poseEl = card.querySelector("[data-anim-pose]") as HTMLSelectElement | null;
		if (poseEl) {
			steps.push({ kind: "pose", pose: poseEl.value || "Kneel", wait: wait });
			return;
		}
		const featEl = card.querySelector("[data-anim-feature]") as HTMLSelectElement | null;
		const exprEl = card.querySelector("[data-anim-expr]") as HTMLSelectElement | null;
		const durEl = card.querySelector("[data-anim-dur]") as HTMLSelectElement | null;
		if (featEl) {
			steps.push({
				kind: "face",
				feature: (featEl.value || "Eyes") as SeidrAnimFaceFeature,
				expression: exprEl ? exprEl.value : "",
				duration: (durEl && durEl.value ? durEl.value : "keep") as any,
				wait: wait,
			});
		}
	});
	return { id: draft.id, name: name, steps: steps };
}

function renderEditor(root: HTMLElement) {
	const wrap = root.querySelector("#seidr-anim-editor") as HTMLElement | null;
	if (!wrap) return;
	if (!draft) {
		wrap.innerHTML = '<p class="seidr-settings-hint">Select an animation or add a new one.</p>';
		return;
	}
	const total = seidrAnimWaitTotal(draft.steps);
	wrap.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Name</span>',
		'<input type="text" id="seidr-anim-name" maxlength="40" value="' + escapeHtml(draft.name) + '" />',
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:8px;">Steps ' + draft.steps.length + "/" +
		SEIDR_ANIM_STEPS_MAX + " · Wait total " + total.toFixed(2) + "s / " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s</p>",
		'<div id="seidr-anim-steps">' + draft.steps.map(stepCardHtml).join("") + "</div>",
		'<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-add-pose">+ Pose</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-add-face">+ Face</button>',
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-save">Save</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-anim-del">Delete</button>',
		"</div>",
		'<p class="seidr-cmd-msg" id="seidr-anim-msg"></p>',
	].join("");
	wireEditor(root);
}

function openAnimation(root: HTMLElement, id: number) {
	const list = seidrListAnimations();
	let found: SeidrAnimation | null = null;
	for (let i = 0; i < list.length; i++) {
		if (list[i].id === id) {
			found = JSON.parse(JSON.stringify(list[i])) as SeidrAnimation;
			break;
		}
	}
	editId = found ? found.id : null;
	draft = found;
	renderList(root);
	renderEditor(root);
	wireList(root);
}

function ensureFirstOpen(root: HTMLElement) {
	if (editId != null && draft) return;
	const list = seidrListAnimations();
	if (!list.length) {
		editId = null;
		draft = null;
		renderList(root);
		renderEditor(root);
		wireList(root);
		return;
	}
	openAnimation(root, list[0].id);
}

function wireEditor(root: HTMLElement) {
	root.querySelector("#seidr-anim-add-pose")?.addEventListener("click", function () {
		const cur = readDraftFromDom(root) || draft;
		if (!cur) return;
		if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
			setMsg(root, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
			return;
		}
		cur.steps.push(seidrDefaultAnimPoseStep());
		draft = cur;
		renderEditor(root);
	});
	root.querySelector("#seidr-anim-add-face")?.addEventListener("click", function () {
		const cur = readDraftFromDom(root) || draft;
		if (!cur) return;
		if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
			setMsg(root, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
			return;
		}
		cur.steps.push(seidrDefaultAnimFaceStep());
		draft = cur;
		renderEditor(root);
	});
	root.querySelectorAll("[data-anim-del-step]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const cur = readDraftFromDom(root) || draft;
			if (!cur) return;
			const idx = parseInt((btn as HTMLElement).getAttribute("data-anim-del-step") || "-1", 10);
			if (idx < 0) return;
			cur.steps.splice(idx, 1);
			draft = cur;
			renderEditor(root);
		});
	});
	function refreshFromDom() {
		const cur = readDraftFromDom(root);
		if (cur) {
			draft = cur;
			renderEditor(root);
		}
	}
	root.querySelectorAll("[data-anim-feature], [data-anim-pose], [data-anim-expr]").forEach(function (sel) {
		sel.addEventListener("change", refreshFromDom);
	});
	root.querySelectorAll("[data-anim-wait-dir]").forEach(function (btn) {
		btn.addEventListener("click", function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			const wrap = (btn as HTMLElement).closest(".seidr-num-wrap");
			const input = wrap ? wrap.querySelector("[data-anim-wait]") as HTMLInputElement | null : null;
			if (!input) return;
			const dir = parseInt((btn as HTMLElement).getAttribute("data-anim-wait-dir") || "0", 10);
			if (!dir) return;
			let n = parseFloat(input.value);
			if (!Number.isFinite(n)) n = 0.5;
			n = Math.round((n + dir * 0.1) * 10) / 10;
			if (n < 0) n = 0;
			if (n > SEIDR_ANIM_WAIT_TOTAL_MAX) n = SEIDR_ANIM_WAIT_TOTAL_MAX;
			input.value = String(n);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
	});
	root.querySelector("#seidr-anim-save")?.addEventListener("click", function () {
		const cur = readDraftFromDom(root);
		if (!cur) return;
		const total = seidrAnimWaitTotal(cur.steps);
		if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
			setMsg(root, "Total wait " + total.toFixed(2) + "s exceeds " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s");
			return;
		}
		const r = seidrUpsertAnimation(cur);
		if (!r.ok) {
			setMsg(root, r.error || "Save failed");
			return;
		}
		editId = r.animation!.id;
		draft = JSON.parse(JSON.stringify(r.animation)) as SeidrAnimation;
		setMsg(root, "Saved");
		renderList(root);
		renderEditor(root);
		wireList(root);
	});
	root.querySelector("#seidr-anim-del")?.addEventListener("click", function () {
		if (!draft) return;
		const id = draft.id;
		seidrDeleteAnimation(id);
		editId = null;
		draft = null;
		ensureFirstOpen(root);
		setMsg(root, "Deleted");
	});
}

function wireList(root: HTMLElement) {
	const pick = root.querySelector("#seidr-anim-pick") as HTMLSelectElement | null;
	if (pick) {
		pick.addEventListener("change", function () {
			const id = parseInt(pick.value, 10);
			if (Number.isFinite(id)) openAnimation(root, id);
		});
	}
}

export function seidrBuildAnimationsTab(container: HTMLElement) {
	editId = null;
	draft = null;
	container.innerHTML = [
		'<p class="seidr-settings-hint">Pose and face clips for yourself. Cap ' + SEIDR_ANIMATIONS_MAX +
		" animations, " + SEIDR_ANIM_STEPS_MAX + " steps, " + SEIDR_ANIM_WAIT_TOTAL_MAX +
		"s total wait. Play with /animation or /ani.</p>",
		'<div class="seidr-settings-row" style="gap:8px;display:flex;align-items:center;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-add">Add animation</button>',
		'<span class="seidr-settings-hint" id="seidr-anim-cap">0/' + SEIDR_ANIMATIONS_MAX + " Animations</span>",
		"</div>",
		'<div id="seidr-anim-list" style="margin-top:10px;"></div>',
		'<div class="seidr-act-editor" id="seidr-anim-editor" style="margin-top:10px;"></div>',
	].join("");
	const add = container.querySelector("#seidr-anim-add");
	add?.addEventListener("click", function () {
		const a = seidrAddAnimation();
		if (!a) {
			setMsg(container, "Animation limit reached");
			return;
		}
		openAnimation(container, a.id);
	});
	ensureFirstOpen(container);
}

export function seidrRefreshAnimationsTab() {
	const root = document.getElementById("seidr-settings-pane-animations");
	if (!root) return;
	seidrBuildAnimationsTab(root);
}
