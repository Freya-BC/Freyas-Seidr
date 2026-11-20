/** Settings → Reaction tab */
import { SEIDR_ACTION_CHAT_MAX } from "../actions/model";
import {
	seidrNormalizeWiggleSlots,
	seidrWiggleSlotsLabel,
	type SeidrWiggleSlot,
} from "../animations/model";
import { seidrListAnimations } from "../animations/store";
import {
	seidrCmdListAllActivities,
	seidrCmdListActivitiesForSlot,
	seidrCmdListSlots,
} from "../commands/catalog";
import { seidrListCmdActions } from "../commands/store";
import {
	SEIDR_REACTIONS_MAX,
	SEIDR_REACTION_ACTIVITIES_MAX,
	SEIDR_REACTION_NAME_MAX,
	SEIDR_REACTION_PHRASE_MAX,
	SEIDR_REACTION_STEPS_MAX,
	seidrDefaultReactionActionStep,
	seidrDefaultReactionActivityTrigger,
	seidrDefaultReactionAnimationStep,
	seidrDefaultReactionSayStep,
	seidrDefaultReactionWiggleStep,
	type SeidrReaction,
	type SeidrReactionActivityTrigger,
	type SeidrReactionStep,
} from "./model";
import {
	seidrAddReaction,
	seidrDeleteReaction,
	seidrListReactions,
	seidrUpsertReaction,
} from "./store";

let editId: number | null = null;
let draft: SeidrReaction | null = null;
/** UI-only: activity-list filter slot per trigger index (not persisted). */
let trigFilters: string[] = [];

function syncTrigFiltersLen(n: number) {
	while (trigFilters.length < n) trigFilters.push("");
	if (trigFilters.length > n) trigFilters.length = n;
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function setMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-rxn-msg");
	if (el) el.textContent = text || "";
}

function updateCap(root: HTMLElement) {
	const el = root.querySelector("#seidr-rxn-cap");
	if (!el) return;
	el.textContent = seidrListReactions().length + "/" + SEIDR_REACTIONS_MAX + " Reactions";
}

function renderList(root: HTMLElement) {
	const list = seidrListReactions();
	const box = root.querySelector("#seidr-rxn-list");
	if (!box) return;
	updateCap(root);
	if (!list.length) {
		box.innerHTML = '<p class="seidr-settings-hint">No reactions yet. Add one, pick triggers, then define up to 5 steps.</p>';
		return;
	}
	const optsHtml = list.map(function (r) {
		const mark = r.enabled ? "" : " [off]";
		return '<option value="' + r.id + '"' + (editId === r.id ? " selected" : "") + ">" +
			escapeHtml(r.name) + " (" + r.steps.length + ")" + mark + "</option>";
	}).join("");
	box.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Reaction</span>',
		'<select id="seidr-rxn-pick">' + optsHtml + "</select>",
		"</div>",
	].join("");
}

/**
 * Activity dropdown — filtered by UI "Filter by Slot" (not the match On-slot).
 * Empty filter → full Club/Seidr/mod list (same as Commands catalog).
 */
function activityOptionsHtml(selected: string, filterSlot: string): string {
	const list = filterSlot
		? seidrCmdListActivitiesForSlot(filterSlot)
		: seidrCmdListAllActivities();
	const extra = selected && !list.some(function (o) { return o.id === selected; })
		? '<option value="' + escapeHtml(selected) + '" selected>' + escapeHtml(selected) + " (saved)</option>"
		: "";
	const empty = !selected
		? '<option value="" selected>— Activity —</option>'
		: '<option value="">— Activity —</option>';
	const opts = list.map(function (o) {
		return '<option value="' + escapeHtml(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" +
			escapeHtml(o.label) + "</option>";
	}).join("");
	return empty + extra + opts;
}

function animationOptionsHtml(selectedId: number): string {
	const list = seidrListAnimations();
	if (!list.length) {
		return '<option value="0">No animations defined</option>';
	}
	return '<option value="0">— Animation —</option>' + list.map(function (a) {
		const tag = a.kind === "wiggle" ? " [wiggle]" : "";
		return '<option value="' + a.id + '"' + (a.id === selectedId ? " selected" : "") + ">" +
			escapeHtml(a.name) + tag + "</option>";
	}).join("");
}

function cmdActionOptionsHtml(selected: string): string {
	const list = seidrListCmdActions();
	if (!list.length) {
		return '<option value="">No Commands actions — add under Commands</option>';
	}
	const extra = selected && !list.some(function (a) { return a.name === selected; })
		? '<option value="' + escapeHtml(selected) + '" selected>' + escapeHtml(selected) + " (missing)</option>"
		: "";
	return '<option value="">— Action —</option>' + extra + list.map(function (a) {
		return '<option value="' + escapeHtml(a.name) + '"' + (a.name === selected ? " selected" : "") + ">" +
			escapeHtml(a.name) + " (" + escapeHtml(a.activity) + ")</option>";
	}).join("");
}

/** Club AssetGroup Item* list (same as Commands), plus empty = Any. */
function slotOptionsHtml(selected: string, emptyLabel: string): string {
	const sel = String(selected || "");
	const slots = seidrCmdListSlots();
	const known = slots.some(function (s) { return s.id === sel; });
	const extra = sel && !known
		? '<option value="' + escapeHtml(sel) + '" selected>' + escapeHtml(sel) + " (saved)</option>"
		: "";
	return '<option value="">' + escapeHtml(emptyLabel) + "</option>" + extra + slots.map(function (s) {
		return '<option value="' + escapeHtml(s.id) + '"' + (s.id === sel ? " selected" : "") + ">" +
			escapeHtml(s.label) + " (" + escapeHtml(s.id) + ")</option>";
	}).join("");
}

function triggerRowHtml(t: SeidrReactionActivityTrigger, index: number): string {
	const filterSlot = trigFilters[index] || "";
	const matchSlot = t.slot || "";
	return [
		'<div class="seidr-settings-sec" data-rxn-trig="' + index + '" style="margin-top:8px;padding:8px;">',
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Filter by Slot</span>',
		'<select data-rxn-trig-filter>' + slotOptionsHtml(filterSlot, "All activities") + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:6px;">',
		'<span class="seidr-settings-field-label">Activity</span>',
		'<select data-rxn-trig-act>' + activityOptionsHtml(t.activity, filterSlot) + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:6px;">',
		'<span class="seidr-settings-field-label">On slot</span>',
		'<select data-rxn-trig-slot>' + slotOptionsHtml(matchSlot, "Any slot") + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Filter by Slot narrows the Activity list (Caress lives on many zones). On slot is the match filter when the activity fires (Any = activity name only).</p>',
		'<div class="seidr-settings-row" style="margin-top:6px;gap:12px;display:flex;flex-wrap:wrap;align-items:center;">',
		'<label class="seidr-settings-check"><input type="checkbox" data-rxn-trig-perf' +
		(t.whenIPerform ? " checked" : "") + " /> I perform</label>",
		'<label class="seidr-settings-check"><input type="checkbox" data-rxn-trig-onme' +
		(t.whenOnMe ? " checked" : "") + " /> On me</label>",
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-rxn-trig-del="' +
		index + '">Remove</button>',
		"</div>",
		"</div>",
	].join("");
}

function stepSummary(step: SeidrReactionStep): string {
	if (step.kind === "say") {
		const t = String(step.text || "").trim();
		return "Say · " + (t ? (t.length > 28 ? t.slice(0, 28) + "…" : t) : "(empty)");
	}
	if (step.kind === "animation") {
		const a = seidrListAnimations().find(function (x) { return x.id === step.animationId; });
		return "Animation · " + (a ? a.name : "(none)");
	}
	if (step.kind === "wiggle") {
		return "Wiggle · " + seidrWiggleSlotsLabel(step.slots);
	}
	return "Action · " + (step.actionName || "(none)") + " → " +
		(step.target === "self" ? "Self" : "Issuer");
}

function rxnSlotChecksHtml(slots: SeidrWiggleSlot[]): string {
	const order: { id: SeidrWiggleSlot; label: string }[] = [
		{ id: "ear", label: "Ear" },
		{ id: "tail", label: "Tail" },
		{ id: "wing", label: "Wing" },
	];
	return order.map(function (o) {
		const checked = slots.indexOf(o.id) >= 0 ? " checked" : "";
		return '<label class="seidr-settings-check"><input type="checkbox" data-rxn-step-slot value="' +
			o.id + '"' + checked + " /> " + o.label + "</label>";
	}).join("");
}

function stepCardHtml(step: SeidrReactionStep, index: number): string {
	const kindSel = [
		'<select data-rxn-step-kind>',
		'<option value="say"' + (step.kind === "say" ? " selected" : "") + ">Say</option>",
		'<option value="animation"' + (step.kind === "animation" ? " selected" : "") + ">Animation</option>",
		'<option value="wiggle"' + (step.kind === "wiggle" ? " selected" : "") + ">Wiggle</option>",
		'<option value="action"' + (step.kind === "action" ? " selected" : "") + ">Perform action</option>",
		"</select>",
	].join("");
	let body = "";
	if (step.kind === "say") {
		body = [
			'<p class="seidr-settings-hint" style="margin-top:8px;">Message (chat, max ' +
			SEIDR_ACTION_CHAT_MAX + ")</p>",
			'<textarea data-rxn-step-say maxlength="' + SEIDR_ACTION_CHAT_MAX + '" rows="2">' +
			escapeHtml(step.text || "") + "</textarea>",
		].join("");
	} else if (step.kind === "animation") {
		body = [
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Animation</span>',
			'<select data-rxn-step-anim>' + animationOptionsHtml(step.animationId) + "</select>",
			"</div>",
		].join("");
	} else if (step.kind === "wiggle") {
		body = [
			'<p class="seidr-settings-hint" style="margin-top:8px;">Plays configured Wiggle sets in parallel. Missing / not worn → skipped.</p>',
			'<div class="seidr-settings-row" style="margin-top:8px;gap:12px;display:flex;flex-wrap:wrap;">',
			rxnSlotChecksHtml(step.slots),
			"</div>",
		].join("");
	} else {
		body = [
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Action</span>',
			'<select data-rxn-step-action>' + cmdActionOptionsHtml(step.actionName) + "</select>",
			"</div>",
			'<div class="seidr-settings-row" style="margin-top:8px;gap:12px;display:flex;flex-wrap:wrap;">',
			'<label class="seidr-settings-check"><input type="radio" name="seidr-rxn-tgt-' + index +
			'" data-rxn-step-tgt value="self"' + (step.target === "self" ? " checked" : "") +
			" /> Self</label>",
			'<label class="seidr-settings-check"><input type="radio" name="seidr-rxn-tgt-' + index +
			'" data-rxn-step-tgt value="issuer"' + (step.target !== "self" ? " checked" : "") +
			" /> Issuer</label>",
			"</div>",
		].join("");
	}
	return [
		'<details class="seidr-settings-sec" data-rxn-step="' + index + '" open>',
		"<summary>" + escapeHtml(stepSummary(step)) + "</summary>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Kind</span>',
		kindSel,
		"</div>",
		body,
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-rxn-del-step="' +
		index + '">Remove</button>',
		"</div>",
		"</details>",
	].join("");
}

function readDraftFromDom(root: HTMLElement): SeidrReaction | null {
	if (!draft) return null;
	const nameEl = root.querySelector("#seidr-rxn-name") as HTMLInputElement | null;
	const enEl = root.querySelector("#seidr-rxn-enabled") as HTMLInputElement | null;
	const phraseEl = root.querySelector("#seidr-rxn-phrase") as HTMLInputElement | null;
	const climaxEl = root.querySelector("#seidr-rxn-climax") as HTMLInputElement | null;
	const name = (nameEl && nameEl.value || "").trim() || draft.name;
	const enabled = !enEl || enEl.checked;
	const phrase = (phraseEl && phraseEl.value || "").trim().slice(0, SEIDR_REACTION_PHRASE_MAX);
	const onClimax = !!(climaxEl && climaxEl.checked);

	const activities: SeidrReactionActivityTrigger[] = [];
	const nextFilters: string[] = [];
	root.querySelectorAll("[data-rxn-trig]").forEach(function (row) {
		const act = (row.querySelector("[data-rxn-trig-act]") as HTMLSelectElement | null)?.value || "";
		const filter = (row.querySelector("[data-rxn-trig-filter]") as HTMLSelectElement | null)?.value || "";
		const slot = (row.querySelector("[data-rxn-trig-slot]") as HTMLSelectElement | null)?.value || "";
		const whenIPerform = !!(row.querySelector("[data-rxn-trig-perf]") as HTMLInputElement | null)?.checked;
		const whenOnMe = !!(row.querySelector("[data-rxn-trig-onme]") as HTMLInputElement | null)?.checked;
		nextFilters.push(String(filter).trim());
		activities.push({
			activity: String(act).trim(),
			whenIPerform: whenIPerform,
			whenOnMe: whenOnMe,
			slot: String(slot).trim(),
		});
	});
	trigFilters = nextFilters;

	const steps: SeidrReactionStep[] = [];
	root.querySelectorAll("[data-rxn-step]").forEach(function (card) {
		const kind = (card.querySelector("[data-rxn-step-kind]") as HTMLSelectElement | null)?.value || "say";
		if (kind === "animation") {
			const id = parseInt(
				(card.querySelector("[data-rxn-step-anim]") as HTMLSelectElement | null)?.value || "0",
				10
			);
			steps.push({ kind: "animation", animationId: Number.isFinite(id) ? id : 0 });
			return;
		}
		if (kind === "wiggle") {
			const raw: string[] = [];
			card.querySelectorAll("[data-rxn-step-slot]").forEach(function (el) {
				const inp = el as HTMLInputElement;
				if (inp.checked) raw.push(inp.value);
			});
			const slots = seidrNormalizeWiggleSlots(raw.length ? raw : ["tail"]);
			steps.push({ kind: "wiggle", slots: slots.length ? slots : ["tail"] });
			return;
		}
		if (kind === "action") {
			const actionName = (card.querySelector("[data-rxn-step-action]") as HTMLSelectElement | null)?.value || "";
			const tgtEl = card.querySelector("[data-rxn-step-tgt]:checked") as HTMLInputElement | null;
			const target = tgtEl && tgtEl.value === "self" ? "self" : "issuer";
			steps.push({ kind: "action", actionName: actionName, target: target });
			return;
		}
		const text = (card.querySelector("[data-rxn-step-say]") as HTMLTextAreaElement | null)?.value || "";
		steps.push({ kind: "say", text: text.slice(0, SEIDR_ACTION_CHAT_MAX) });
	});

	return {
		id: draft.id,
		name: name.slice(0, SEIDR_REACTION_NAME_MAX),
		enabled: enabled,
		activities: activities,
		phrase: phrase,
		onClimax: onClimax,
		steps: steps.length ? steps : [seidrDefaultReactionSayStep()],
	};
}

function renderEditor(root: HTMLElement) {
	const host = root.querySelector("#seidr-rxn-editor") as HTMLElement | null;
	if (!host) return;
	if (!draft) {
		host.innerHTML = "";
		return;
	}
	syncTrigFiltersLen(draft.activities.length);
	const firstAnim = seidrListAnimations()[0];
	const triggersHtml = draft.activities.length
		? draft.activities.map(triggerRowHtml).join("")
		: '<p class="seidr-settings-hint">No activity triggers. Add one, a Phrase, or On climax.</p>';
	const stepsHtml = draft.steps.map(stepCardHtml).join("");
	host.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Name</span>',
		'<input type="text" id="seidr-rxn-name" maxlength="' + SEIDR_REACTION_NAME_MAX + '" value="' +
		escapeHtml(draft.name) + '" />',
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<label class="seidr-settings-check"><input type="checkbox" id="seidr-rxn-enabled"' +
		(draft.enabled ? " checked" : "") + " /> Enabled</label>",
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:12px;">Triggers — activity (I perform / On me), a Phrase you say, and/or On climax.</p>',
		'<div id="seidr-rxn-trigs">' + triggersHtml + "</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add-trig">+ Activity</button>',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:10px;">',
		'<span class="seidr-settings-field-label">Phrase</span>',
		'<input type="text" id="seidr-rxn-phrase" maxlength="' + SEIDR_REACTION_PHRASE_MAX +
		'" placeholder="Only when you say this exact line" value="' +
		escapeHtml(draft.phrase || "") + '" />',
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<label class="seidr-settings-check"><input type="checkbox" id="seidr-rxn-climax"' +
		(draft.onClimax ? " checked" : "") +
		' /> On climax <span class="seidr-settings-hint">(your orgasm, ruin, or resist)</span></label>',
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:12px;">Response script — up to ' +
		SEIDR_REACTION_STEPS_MAX + " steps, run in order (local).</p>",
		'<div id="seidr-rxn-steps">' + stepsHtml + "</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add-say">+ Say</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add-anim">+ Animation</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add-wiggle">+ Wiggle</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add-act">+ Action</button>',
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:12px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-save">Save</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-rxn-del">Delete</button>',
		"</div>",
		'<p class="seidr-cmd-msg" id="seidr-rxn-msg"></p>',
		firstAnim ? "" : '<p class="seidr-settings-hint">Tip: define Animations first if you want Animation steps.</p>',
	].join("");
	wireEditor(root);
}

function rebuildFromDom(root: HTMLElement) {
	const next = readDraftFromDom(root);
	if (!next) return;
	draft = next;
	renderEditor(root);
	renderList(root);
	wireList(root);
}

function wireList(root: HTMLElement) {
	const pick = root.querySelector("#seidr-rxn-pick") as HTMLSelectElement | null;
	pick?.addEventListener("change", function () {
		const id = parseInt(pick.value, 10);
		if (Number.isFinite(id)) openReaction(root, id);
	});
}

function wireEditor(root: HTMLElement) {
	root.querySelector("#seidr-rxn-add-trig")?.addEventListener("click", function () {
		const next = readDraftFromDom(root);
		if (!next) return;
		if (next.activities.length >= SEIDR_REACTION_ACTIVITIES_MAX) {
			setMsg(root, "Max " + SEIDR_REACTION_ACTIVITIES_MAX + " activity triggers");
			return;
		}
		next.activities.push(seidrDefaultReactionActivityTrigger());
		draft = next;
		renderEditor(root);
	});

	root.querySelectorAll("[data-rxn-trig-del]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const idx = parseInt((btn as HTMLElement).getAttribute("data-rxn-trig-del") || "-1", 10);
			const next = readDraftFromDom(root);
			if (!next || idx < 0) return;
			next.activities.splice(idx, 1);
			trigFilters.splice(idx, 1);
			draft = next;
			renderEditor(root);
		});
	});

	root.querySelectorAll("[data-rxn-trig-filter]").forEach(function (sel) {
		sel.addEventListener("change", function () {
			const next = readDraftFromDom(root);
			if (!next) return;
			draft = next;
			renderEditor(root);
		});
	});

	function addStep(step: SeidrReactionStep) {
		const next = readDraftFromDom(root);
		if (!next) return;
		if (next.steps.length >= SEIDR_REACTION_STEPS_MAX) {
			setMsg(root, "Max " + SEIDR_REACTION_STEPS_MAX + " steps");
			return;
		}
		next.steps.push(step);
		draft = next;
		renderEditor(root);
	}

	root.querySelector("#seidr-rxn-add-say")?.addEventListener("click", function () {
		addStep(seidrDefaultReactionSayStep());
	});
	root.querySelector("#seidr-rxn-add-anim")?.addEventListener("click", function () {
		const first = seidrListAnimations()[0];
		addStep(seidrDefaultReactionAnimationStep(first ? first.id : 0));
	});
	root.querySelector("#seidr-rxn-add-wiggle")?.addEventListener("click", function () {
		addStep(seidrDefaultReactionWiggleStep(["ear", "tail"]));
	});
	root.querySelector("#seidr-rxn-add-act")?.addEventListener("click", function () {
		const first = seidrListCmdActions()[0];
		const step = seidrDefaultReactionActionStep();
		if (first) step.actionName = first.name;
		addStep(step);
	});

	root.querySelectorAll("[data-rxn-del-step]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const idx = parseInt((btn as HTMLElement).getAttribute("data-rxn-del-step") || "-1", 10);
			const next = readDraftFromDom(root);
			if (!next || idx < 0) return;
			next.steps.splice(idx, 1);
			if (!next.steps.length) next.steps.push(seidrDefaultReactionSayStep());
			draft = next;
			renderEditor(root);
		});
	});

	root.querySelectorAll("[data-rxn-step-kind]").forEach(function (sel) {
		sel.addEventListener("change", function () {
			rebuildFromDom(root);
		});
	});

	root.querySelector("#seidr-rxn-save")?.addEventListener("click", function () {
		const next = readDraftFromDom(root);
		if (!next) return;
		const saved = seidrUpsertReaction(next);
		if (!saved.ok) {
			setMsg(root, saved.error || "Save failed");
			return;
		}
		draft = saved.reaction || next;
		editId = draft.id;
		renderList(root);
		wireList(root);
		renderEditor(root);
		setMsg(root, "Saved");
	});

	root.querySelector("#seidr-rxn-del")?.addEventListener("click", function () {
		if (!draft) return;
		const id = draft.id;
		const deleted = seidrDeleteReaction(id);
		if (!deleted.ok) {
			setMsg(root, deleted.error || "Delete failed");
			return;
		}
		const list = seidrListReactions();
		editId = list.length ? list[0].id : null;
		const found = editId != null
			? seidrListReactions().find(function (r) { return r.id === editId; })
			: null;
		draft = found ? (JSON.parse(JSON.stringify(found)) as SeidrReaction) : null;
		renderList(root);
		wireList(root);
		renderEditor(root);
		setMsg(root, "Deleted");
	});
}

function openReaction(root: HTMLElement, id: number) {
	const r = seidrListReactions().find(function (x) { return x.id === id; });
	if (!r) return;
	editId = id;
	draft = JSON.parse(JSON.stringify(r)) as SeidrReaction;
	trigFilters = draft.activities.map(function () { return ""; });
	renderList(root);
	wireList(root);
	renderEditor(root);
}

function ensureFirstOpen(root: HTMLElement) {
	renderList(root);
	wireList(root);
	const list = seidrListReactions();
	if (!list.length) {
		draft = null;
		editId = null;
		renderEditor(root);
		return;
	}
	if (editId == null || !list.some(function (r) { return r.id === editId; })) {
		openReaction(root, list[0].id);
		return;
	}
	openReaction(root, editId);
}

export function seidrBuildReactionsTab(container: HTMLElement) {
	editId = null;
	draft = null;
	container.innerHTML = [
		'<p class="seidr-settings-hint">Auto-run a short local script when you perform an activity, someone acts on you, you say a phrase, or you climax. Cap ' +
		SEIDR_REACTIONS_MAX + " reactions, " + SEIDR_REACTION_STEPS_MAX + " steps. Action steps use Commands bindings.</p>",
		'<div class="seidr-settings-row" style="gap:8px;display:flex;align-items:center;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-rxn-add">Add reaction</button>',
		'<span class="seidr-settings-hint" id="seidr-rxn-cap">0/' + SEIDR_REACTIONS_MAX + " Reactions</span>",
		"</div>",
		'<div id="seidr-rxn-list" style="margin-top:10px;"></div>',
		'<div class="seidr-act-editor" id="seidr-rxn-editor" style="margin-top:10px;"></div>',
	].join("");
	container.querySelector("#seidr-rxn-add")?.addEventListener("click", function () {
		const r = seidrAddReaction();
		if (!r) {
			setMsg(container, "Reaction limit reached");
			return;
		}
		openReaction(container, r.id);
	});
	ensureFirstOpen(container);
}

export function seidrRefreshReactionsTab() {
	const root = document.getElementById("seidr-settings-pane-reaction");
	if (!root) return;
	seidrBuildReactionsTab(root);
}
