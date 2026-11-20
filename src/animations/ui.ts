/** Settings → Animations tab (clip animations + Wiggle) */
import {
	SEIDR_ACTION_CHAT_MAX,
	SEIDR_ACTION_CHAT_TOKENS,
	SEIDR_ACTION_POSES,
	seidrPoseLabel,
} from "../actions/model";
import {
	SEIDR_ANIMATIONS_MAX,
	SEIDR_ANIM_FACE_DURATIONS,
	SEIDR_ANIM_FACE_MAP,
	SEIDR_ANIM_STEPS_MAX,
	SEIDR_ANIM_WAIT_TOTAL_MAX,
	SEIDR_WIGGLES_MAX,
	SEIDR_WIGGLE_COUNT_MAX,
	SEIDR_WIGGLE_DEFAULTS,
	SEIDR_WIGGLE_DELAY_MIN_MS,
	SEIDR_WIGGLE_DELAY_MAX_MS,
	SEIDR_WIGGLE_SLOTS,
	seidrAnimIsWiggle,
	seidrAnimWaitTotal,
	seidrCountClipAnimations,
	seidrCountWiggleAnimations,
	seidrDefaultAnimFaceStep,
	seidrDefaultAnimPoseStep,
	seidrDefaultAnimWiggleStep,
	seidrDefaultWiggleAnimation,
	seidrNormalizeWiggleSlots,
	seidrWiggleFramesDiffer,
	seidrWiggleSlotsLabel,
	type SeidrAnimFaceFeature,
	type SeidrAnimStep,
	type SeidrAnimation,
	type SeidrWiggleColorMode,
	type SeidrWiggleFrame,
	type SeidrWiggleSlot,
} from "./model";
import {
	seidrAddAnimation,
	seidrDeleteAnimation,
	seidrGetAnimationsBag,
	seidrListClipAnimations,
	seidrListWiggleAnimations,
	seidrUpsertAnimation,
} from "./store";
import {
	seidrCancelWiggleFramePreview,
	seidrPlayWiggleTest,
	seidrToggleWiggleFramePreview,
} from "./wigglePlay";
import {
	seidrCaptureWornFrame,
	seidrFindAutomatchSecondaryFrame,
	seidrListWiggleSecondaryCandidates,
	seidrScanWornWiggleItems,
	seidrWiggleAssetLabel,
	seidrWiggleAssetLoadable,
	seidrWiggleNameEquals,
	seidrWornToFrame,
	type SeidrWornWiggleItem,
} from "./wiggleSlots";

let editId: number | null = null;
let draft: SeidrAnimation | null = null;
let wiggleEditId: number | null = null;
let wiggleDraft: SeidrAnimation | null = null;

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

function setWiggleMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-wiggle-msg");
	if (el) el.textContent = text || "";
}

function chatTokenChips(): string {
	return SEIDR_ACTION_CHAT_TOKENS.map(function (t) {
		return '<button type="button" class="seidr-act-ph" data-anim-chat-token="' +
			escapeHtml(t.token) + '" title="' + escapeHtml(t.hint) + '">' +
			escapeHtml(t.token) + "</button>";
	}).join("");
}

function insertChatToken(ta: HTMLTextAreaElement, token: string): boolean {
	const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
	const end = ta.selectionEnd != null ? ta.selectionEnd : start;
	const next = ta.value.slice(0, start) + token + ta.value.slice(end);
	if (next.length > SEIDR_ACTION_CHAT_MAX) return false;
	ta.value = next;
	ta.focus();
	const pos = start + token.length;
	ta.setSelectionRange(pos, pos);
	return true;
}

function syncAnimChatCount(root: HTMLElement) {
	const ta = root.querySelector("#seidr-anim-chat") as HTMLTextAreaElement | null;
	const count = root.querySelector("#seidr-anim-chat-count");
	if (ta && count) count.textContent = ta.value.length + "/" + SEIDR_ACTION_CHAT_MAX;
}

function updateCap(root: HTMLElement) {
	const bag = seidrGetAnimationsBag();
	const clipEl = root.querySelector("#seidr-anim-cap");
	if (clipEl) {
		clipEl.textContent = seidrCountClipAnimations(bag.list) + "/" + SEIDR_ANIMATIONS_MAX + " Animations";
	}
	const wigEl = root.querySelector("#seidr-wiggle-cap");
	if (wigEl) {
		wigEl.textContent = seidrCountWiggleAnimations(bag.list) + "/" + SEIDR_WIGGLES_MAX + " Wiggles";
	}
}

function renderList(root: HTMLElement) {
	const list = seidrListClipAnimations();
	const box = root.querySelector("#seidr-anim-list");
	if (!box) return;
	updateCap(root);
	if (!list.length) {
		box.innerHTML = '<p class="seidr-settings-hint">No pose/face animations yet. Add one, then play with /animation name.</p>';
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

function slotChecksHtml(prefix: string, slots: SeidrWiggleSlot[]): string {
	const order: { id: SeidrWiggleSlot; label: string }[] = [
		{ id: "ear", label: "Ear" },
		{ id: "tail", label: "Tail" },
		{ id: "wing", label: "Wing" },
	];
	return order.map(function (o) {
		const checked = slots.indexOf(o.id) >= 0 ? " checked" : "";
		return '<label class="seidr-settings-check"><input type="checkbox" data-' + prefix + '-slot value="' +
			o.id + '"' + checked + " /> " + o.label + "</label>";
	}).join("");
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
	if (step.kind === "wiggle") {
		return [
			'<details class="seidr-settings-sec" data-anim-step="' + index + '" open>',
			"<summary>Wiggle · " + escapeHtml(seidrWiggleSlotsLabel(step.slots)) + "</summary>",
			'<p class="seidr-settings-hint" style="margin-top:8px;">Plays configured Wiggle sets for checked slots in parallel. Missing / not worn → skipped.</p>',
			'<div class="seidr-settings-row" style="margin-top:8px;gap:12px;display:flex;flex-wrap:wrap;">',
			slotChecksHtml("anim", step.slots),
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
	if (!draft || seidrAnimIsWiggle(draft)) return null;
	const nameEl = root.querySelector("#seidr-anim-name") as HTMLInputElement | null;
	const name = (nameEl && nameEl.value || "").trim() || draft.name;
	const chatEl = root.querySelector("#seidr-anim-chat") as HTMLTextAreaElement | null;
	const chatText = chatEl && chatEl.value.trim()
		? chatEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
		: "";
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
		const slotBoxes = card.querySelectorAll("[data-anim-slot]");
		if (slotBoxes.length) {
			const raw: string[] = [];
			slotBoxes.forEach(function (el) {
				const inp = el as HTMLInputElement;
				if (inp.checked) raw.push(inp.value);
			});
			const slots = seidrNormalizeWiggleSlots(raw.length ? raw : ["tail"]);
			steps.push({ kind: "wiggle", slots: slots.length ? slots : ["tail"], wait: wait });
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
	return { id: draft.id, name: name, kind: "clip", steps: steps, chatText: chatText };
}

function renderEditor(root: HTMLElement) {
	const wrap = root.querySelector("#seidr-anim-editor") as HTMLElement | null;
	if (!wrap) return;
	if (!draft || seidrAnimIsWiggle(draft)) {
		wrap.innerHTML = '<p class="seidr-settings-hint">Select an animation or add a new one.</p>';
		return;
	}
	const total = seidrAnimWaitTotal(draft.steps);
	const chatText = draft.chatText || "";
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
		'<button type="button" class="seidr-act-btn" id="seidr-anim-add-wiggle">+ Wiggle</button>',
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:10px;">Action text (optional, posted when play starts; Club tags, max ' +
		SEIDR_ACTION_CHAT_MAX + ")</p>",
		'<div class="seidr-act-ph-row" id="seidr-anim-ph">' + chatTokenChips() + "</div>",
		'<p class="seidr-settings-hint">Club style: SourceCharacter raises PronounPossessive hands.</p>',
		'<textarea id="seidr-anim-chat" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' +
		escapeHtml(chatText) + "</textarea>",
		'<p class="seidr-settings-hint" id="seidr-anim-chat-count">' +
		chatText.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
		'<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-save">Save</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-anim-del">Delete</button>',
		"</div>",
		'<p class="seidr-cmd-msg" id="seidr-anim-msg"></p>',
	].join("");
	wireEditor(root);
}

function openAnimation(root: HTMLElement, id: number) {
	const list = seidrListClipAnimations();
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
	if (editId != null && draft && !seidrAnimIsWiggle(draft)) return;
	const list = seidrListClipAnimations();
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
		if (!cur || seidrAnimIsWiggle(cur)) return;
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
		if (!cur || seidrAnimIsWiggle(cur)) return;
		if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
			setMsg(root, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
			return;
		}
		cur.steps.push(seidrDefaultAnimFaceStep());
		draft = cur;
		renderEditor(root);
	});
	root.querySelector("#seidr-anim-add-wiggle")?.addEventListener("click", function () {
		const cur = readDraftFromDom(root) || draft;
		if (!cur || seidrAnimIsWiggle(cur)) return;
		if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
			setMsg(root, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
			return;
		}
		cur.steps.push(seidrDefaultAnimWiggleStep(["ear", "tail"]));
		draft = cur;
		renderEditor(root);
	});
	root.querySelectorAll("[data-anim-del-step]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const cur = readDraftFromDom(root) || draft;
			if (!cur || seidrAnimIsWiggle(cur)) return;
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
	root.querySelector("#seidr-anim-chat")?.addEventListener("input", function () {
		syncAnimChatCount(root);
	});
	root.querySelector("#seidr-anim-ph")?.addEventListener("click", function (ev) {
		const btn = (ev.target as HTMLElement).closest("[data-anim-chat-token]") as HTMLElement | null;
		if (!btn) return;
		const token = btn.getAttribute("data-anim-chat-token");
		if (!token) return;
		const ta = root.querySelector("#seidr-anim-chat") as HTMLTextAreaElement | null;
		if (!ta) return;
		if (!insertChatToken(ta, token)) {
			setMsg(root, "Text max " + SEIDR_ACTION_CHAT_MAX + " characters");
		} else {
			syncAnimChatCount(root);
		}
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
		updateCap(root);
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

/* ---------- Wiggle section ---------- */

function slotLabel(slot: SeidrWiggleSlot): string {
	const m = SEIDR_WIGGLE_SLOTS.find(function (s) { return s.id === slot; });
	return m ? m.label : slot;
}

function renderWiggleList(root: HTMLElement) {
	const list = seidrListWiggleAnimations();
	const box = root.querySelector("#seidr-wiggle-list");
	if (!box) return;
	updateCap(root);
	if (!list.length) {
		box.innerHTML = '<p class="seidr-settings-hint">No wiggle sets yet. Wear an ear, tail, or wing, then Add.</p>';
		return;
	}
	const optsHtml = list.map(function (a) {
		const slot = a.slot ? slotLabel(a.slot) : "?";
		const asset = a.primary ? seidrWiggleAssetLabel(a.primary.assetName) : "";
		return '<option value="' + a.id + '"' + (wiggleEditId === a.id ? " selected" : "") + ">" +
			escapeHtml(a.name) + " · " + escapeHtml(slot) +
			(asset ? " (" + escapeHtml(asset) + ")" : "") +
			"</option>";
	}).join("");
	box.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Wiggle</span>',
		'<select id="seidr-wiggle-pick">' + optsHtml + "</select>",
		"</div>",
	].join("");
}

function secondaryOptionsHtml(draftW: SeidrAnimation): string {
	if (!draftW.slot || !draftW.group || !draftW.primary) return "";
	const cands = seidrListWiggleSecondaryCandidates(draftW.slot, draftW.group, draftW.primary.assetName);
	const selected = draftW.secondary ? draftW.secondary.assetName : "";
	const sameAssetAlt = draftW.secondary &&
		seidrWiggleFramesDiffer(draftW.primary, draftW.secondary) &&
		(draftW.secondary.assetName === draftW.primary.assetName ||
			seidrWiggleNameEquals(draftW.secondary.assetName, draftW.primary.assetName));
	const opts: string[] = [];
	if (sameAssetAlt && selected) {
		const bits: string[] = [selected];
		if (draftW.secondary!.typedState != null && String(draftW.secondary!.typedState) !== "") {
			bits.push("typed " + String(draftW.secondary!.typedState));
		} else {
			bits.push("custom property");
		}
		opts.push(
			'<option value="' + escapeHtml(selected) + '" selected>' +
			escapeHtml(bits.join(" · ")) +
			"</option>"
		);
	}
	if (!cands.length && !opts.length) {
		return '<option value="' + escapeHtml(selected) + '" selected>' +
			escapeHtml(selected || "(none found)") + "</option>";
	}
	for (let i = 0; i < cands.length; i++) {
		const c = cands[i];
		const label = (c.automatch ? "★ " : "") + (c.description || seidrWiggleAssetLabel(c.name));
		const isSel = !sameAssetAlt && c.name === selected;
		opts.push(
			'<option value="' + escapeHtml(c.name) + '"' +
			(isSel ? " selected" : "") + ">" + escapeHtml(label) + "</option>"
		);
	}
	return opts.join("");
}

/** Hint when secondary asset is not in AssetGet (often Echo-only). */
function counterpartHintHtml(d: SeidrAnimation): string {
	if (!d.primary || !d.secondary) return "";
	let group = d.group || "";
	if (!group && d.slot) {
		const meta = SEIDR_WIGGLE_SLOTS.find(function (s) { return s.id === d.slot; });
		if (meta) group = meta.baseGroup;
	}
	const sec = d.secondary.assetName;
	if (!sec || !group) return "";
	if (seidrWiggleNameEquals(sec, d.primary.assetName)) {
		if (seidrWiggleFramesDiffer(d.primary, d.secondary)) return "";
		return '<p class="seidr-settings-hint" style="color:#c45;">Same-asset secondary needs another typed option (e.g. Top Left ↔ Top Right) or a different Property (rotation).</p>';
	}
	if (seidrWiggleAssetLoadable(group, sec)) return "";
	return '<p class="seidr-settings-hint" style="color:#c45;">Secondary <b>' +
		escapeHtml(seidrWiggleAssetLabel(sec)) +
		"</b> not loaded — install Echo (or the mod that adds it), then re-open.</p>";
}

function renderWiggleEditor(root: HTMLElement) {
	const wrap = root.querySelector("#seidr-wiggle-editor") as HTMLElement | null;
	if (!wrap) return;
	if (!wiggleDraft || !seidrAnimIsWiggle(wiggleDraft)) {
		wrap.innerHTML = '<p class="seidr-settings-hint">Select a wiggle or add a new set.</p>';
		return;
	}
	const d = wiggleDraft;
	const slot = d.slot || "tail";
	const defs = SEIDR_WIGGLE_DEFAULTS[slot];
	const colorMode = d.colorMode || "snapshot";
	wrap.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Name</span>',
		'<input type="text" id="seidr-wiggle-name" maxlength="40" value="' + escapeHtml(d.name) + '" />',
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:8px;">Slot: <b>' + escapeHtml(slotLabel(slot)) +
		"</b> · Group: <code>" + escapeHtml(d.group || "") + "</code></p>",
		'<p class="seidr-settings-hint">First: <b>' +
		escapeHtml(d.primary ? seidrWiggleAssetLabel(d.primary.assetName) : "") + "</b>" +
		(framePoseHint(d.primary) ? " · <code>" + escapeHtml(framePoseHint(d.primary)) + "</code>" : "") +
		"</p>",
		'<p class="seidr-settings-hint">Second: <b>' +
		escapeHtml(d.secondary ? seidrWiggleAssetLabel(d.secondary.assetName) : "") + "</b>" +
		(framePoseHint(d.secondary) ? " · <code>" + escapeHtml(framePoseHint(d.secondary)) + "</code>" : "") +
		"</p>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Secondary</span>',
		'<select id="seidr-wiggle-secondary">' + secondaryOptionsHtml(d) + "</select>",
		"</div>",
		counterpartHintHtml(d),
		'<div class="seidr-settings-row" style="margin-top:8px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-capture-first">Capture first</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-capture-second">Capture second</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-automatch">Automatch</button>',
		"</div>",
		'<p class="seidr-settings-hint">Capture stores whatever you are wearing on this slot (same item with another size/rotation/typed option is fine; or a different asset). Automatch: typed Top Left↔Top Right when available, else Echo mirror. <b>' +
		escapeHtml(slotLabel(slot)) + " 1 / 2</b> next to Save equips that frame for 30s (press again to restore). Colors Autoupdate keeps pose Property and only refreshes dye.</p>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Colors</span>',
		'<select id="seidr-wiggle-colors">',
		'<option value="snapshot"' + (colorMode === "snapshot" ? " selected" : "") + ">Snapshot (saved colors)</option>",
		'<option value="autoupdate"' + (colorMode === "autoupdate" ? " selected" : "") + ">Autoupdate (current worn)</option>",
		"</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Amount</span>',
		'<input type="number" class="seidr-settings-num" id="seidr-wiggle-count" min="1" max="' +
		SEIDR_WIGGLE_COUNT_MAX + '" step="1" value="' + (d.count || defs.count) + '" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Delay (ms)</span>',
		'<input type="number" class="seidr-settings-num" id="seidr-wiggle-delay" min="' +
		SEIDR_WIGGLE_DELAY_MIN_MS + '" max="' + SEIDR_WIGGLE_DELAY_MAX_MS + '" step="25" value="' +
		(d.delayMs || defs.delayMs) + '" />',
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-save">Save</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-test">Test</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-tail1">' +
		escapeHtml(slotLabel(slot)) + " 1</button>",
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-tail2">' +
		escapeHtml(slotLabel(slot)) + " 2</button>",
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-wiggle-del">Delete</button>',
		"</div>",
		'<p class="seidr-cmd-msg" id="seidr-wiggle-msg"></p>',
	].join("");
	wireWiggleEditor(root);
}

function readWiggleDraftFromDom(root: HTMLElement): SeidrAnimation | null {
	if (!wiggleDraft || !seidrAnimIsWiggle(wiggleDraft)) return null;
	const nameEl = root.querySelector("#seidr-wiggle-name") as HTMLInputElement | null;
	const secEl = root.querySelector("#seidr-wiggle-secondary") as HTMLSelectElement | null;
	const colorEl = root.querySelector("#seidr-wiggle-colors") as HTMLSelectElement | null;
	const countEl = root.querySelector("#seidr-wiggle-count") as HTMLInputElement | null;
	const delayEl = root.querySelector("#seidr-wiggle-delay") as HTMLInputElement | null;
	const name = (nameEl && nameEl.value || "").trim() || wiggleDraft.name;
	const secondaryName = secEl ? secEl.value : (wiggleDraft.secondary && wiggleDraft.secondary.assetName) || "";
	const secondary: SeidrWiggleFrame = {
		assetName: secondaryName,
		color: wiggleDraft.secondary ? wiggleDraft.secondary.color : undefined,
		property: wiggleDraft.secondary ? wiggleDraft.secondary.property : undefined,
		typedState: wiggleDraft.secondary ? wiggleDraft.secondary.typedState : undefined,
	};
	const colorMode = (colorEl && colorEl.value === "autoupdate" ? "autoupdate" : "snapshot") as SeidrWiggleColorMode;
	return {
		...wiggleDraft,
		name: name,
		secondary: secondary,
		colorMode: colorMode,
		count: countEl ? parseInt(countEl.value, 10) : wiggleDraft.count,
		delayMs: delayEl ? parseInt(delayEl.value, 10) : wiggleDraft.delayMs,
	};
}

function openWiggle(root: HTMLElement, id: number) {
	const list = seidrListWiggleAnimations();
	let found: SeidrAnimation | null = null;
	for (let i = 0; i < list.length; i++) {
		if (list[i].id === id) {
			found = JSON.parse(JSON.stringify(list[i])) as SeidrAnimation;
			break;
		}
	}
	wiggleEditId = found ? found.id : null;
	wiggleDraft = found;
	renderWiggleList(root);
	renderWiggleEditor(root);
	wireWiggleList(root);
}

function ensureFirstWiggle(root: HTMLElement) {
	if (wiggleEditId != null && wiggleDraft && seidrAnimIsWiggle(wiggleDraft)) return;
	const list = seidrListWiggleAnimations();
	if (!list.length) {
		wiggleEditId = null;
		wiggleDraft = null;
		renderWiggleList(root);
		renderWiggleEditor(root);
		wireWiggleList(root);
		return;
	}
	openWiggle(root, list[0].id);
}

function applyPrimaryColorsToSecondary(primary: SeidrWiggleFrame, secondary: SeidrWiggleFrame): SeidrWiggleFrame {
	const out: SeidrWiggleFrame = {
		assetName: secondary.assetName,
		property: secondary.property,
		typedState: secondary.typedState,
	};
	if (primary.color !== undefined) out.color = primary.color;
	else if (secondary.color !== undefined) out.color = secondary.color;
	return out;
}

/** Short label for typed / TypeRecord (size, rotation, show modules). */
function framePoseHint(frame: SeidrWiggleFrame | null | undefined): string {
	if (!frame) return "";
	const bits: string[] = [];
	if (frame.typedState != null && String(frame.typedState).trim() !== "") {
		bits.push("typed " + String(frame.typedState));
	}
	try {
		const prop = frame.property as { TypeRecord?: Record<string, unknown> } | undefined;
		const tr = prop && prop.TypeRecord;
		if (tr && typeof tr === "object") {
			const keys = Object.keys(tr).sort();
			for (let i = 0; i < keys.length; i++) {
				const k = keys[i];
				if (k === "typed" && bits.length) continue;
				bits.push(k + "=" + String(tr[k]));
			}
		}
	} catch (e) { /* ignore */ }
	return bits.length ? bits.join(", ") : "";
}

/** Currently worn item on this wiggle's slot (prefer configured group). */
function wornOnWiggleSlot(cur: SeidrAnimation): SeidrWornWiggleItem | null {
	if (!cur.slot) return null;
	if (cur.group) {
		const onGroup = seidrCaptureWornFrame(
			typeof Player !== "undefined" ? Player : null,
			cur.group
		);
		if (onGroup) return onGroup;
	}
	const onSlot = seidrScanWornWiggleItems().filter(function (w) {
		return w.slot === cur.slot;
	});
	if (!onSlot.length) return null;
	if (cur.primary && cur.primary.assetName) {
		const same = onSlot.find(function (w) {
			return seidrWiggleNameEquals(w.assetName, cur.primary!.assetName);
		});
		if (same) return same;
	}
	return onSlot[0];
}

function wireWiggleEditor(root: HTMLElement) {
	function onPreviewToggle(which: "primary" | "secondary") {
		const cur = readWiggleDraftFromDom(root) || wiggleDraft;
		if (!cur) return;
		wiggleDraft = cur;
		const label = slotLabel((cur.slot || "tail") as SeidrWiggleSlot) + (which === "secondary" ? " 2" : " 1");
		const r = seidrToggleWiggleFramePreview(cur, which);
		if (!r.ok) {
			setWiggleMsg(root, r.error || "Equip failed");
			return;
		}
		setWiggleMsg(root, r.active
			? label + " equipped (30s — press again to restore)"
			: label + " restored");
	}
	root.querySelector("#seidr-wiggle-tail1")?.addEventListener("click", function () {
		onPreviewToggle("primary");
	});
	root.querySelector("#seidr-wiggle-tail2")?.addEventListener("click", function () {
		onPreviewToggle("secondary");
	});
	root.querySelector("#seidr-wiggle-capture-first")?.addEventListener("click", function () {
		const cur = readWiggleDraftFromDom(root) || wiggleDraft;
		if (!cur || !cur.slot) return;
		const worn = wornOnWiggleSlot(cur);
		if (!worn) {
			setWiggleMsg(root, "Wear a " + slotLabel(cur.slot).toLowerCase() + " first");
			return;
		}
		cur.primary = seidrWornToFrame(worn);
		cur.group = worn.group;
		if (cur.secondary && cur.colorMode !== "autoupdate") {
			cur.secondary = applyPrimaryColorsToSecondary(cur.primary, cur.secondary);
		}
		wiggleDraft = cur;
		renderWiggleEditor(root);
		const hint = framePoseHint(cur.primary);
		setWiggleMsg(root, "Captured first " + worn.assetName + (hint ? " (" + hint + ")" : ""));
	});
	root.querySelector("#seidr-wiggle-capture-second")?.addEventListener("click", function () {
		const cur = readWiggleDraftFromDom(root) || wiggleDraft;
		if (!cur || !cur.slot || !cur.primary) return;
		const worn = wornOnWiggleSlot(cur);
		if (!worn) {
			setWiggleMsg(root, "Wear a " + slotLabel(cur.slot).toLowerCase() + " first");
			return;
		}
		const frame = seidrWornToFrame(worn);
		if (!seidrWiggleFramesDiffer(cur.primary, frame)) {
			setWiggleMsg(root, "Second must differ from first (typed, size/rotation Property, or other asset)");
			return;
		}
		cur.secondary = cur.colorMode === "autoupdate"
			? frame
			: applyPrimaryColorsToSecondary(cur.primary, frame);
		wiggleDraft = cur;
		renderWiggleEditor(root);
		const hint = framePoseHint(cur.secondary);
		setWiggleMsg(root, "Captured second " + worn.assetName + (hint ? " (" + hint + ")" : ""));
	});
	root.querySelector("#seidr-wiggle-automatch")?.addEventListener("click", function () {
		const cur = readWiggleDraftFromDom(root) || wiggleDraft;
		if (!cur || !cur.slot || !cur.group || !cur.primary) return;
		const match = seidrFindAutomatchSecondaryFrame(
			cur.slot,
			cur.group,
			cur.primary.assetName,
			cur.primary.typedState
		);
		if (!match) {
			setWiggleMsg(root, "No typed/mirror pair — Capture second after changing typed/size/rotation");
			return;
		}
		const secFrame: SeidrWiggleFrame = { assetName: match.assetName };
		if (match.typedState != null) secFrame.typedState = match.typedState;
		cur.secondary = applyPrimaryColorsToSecondary(cur.primary, secFrame);
		wiggleDraft = cur;
		renderWiggleEditor(root);
		setWiggleMsg(root, match.typedState != null
			? "Automatched typed " + match.assetName + " → " + match.typedState
			: "Automatched " + match.assetName);
	});
	root.querySelector("#seidr-wiggle-save")?.addEventListener("click", function () {
		const cur = readWiggleDraftFromDom(root);
		if (!cur || !cur.primary || !cur.secondary || !cur.secondary.assetName) {
			setWiggleMsg(root, "Second frame required");
			return;
		}
		if (!seidrWiggleFramesDiffer(cur.primary, cur.secondary)) {
			setWiggleMsg(root, "Second must differ (other asset, typed option, or Property)");
			return;
		}
		if (cur.colorMode !== "autoupdate" && cur.primary) {
			cur.secondary = applyPrimaryColorsToSecondary(cur.primary, cur.secondary);
		}
		const r = seidrUpsertAnimation(cur);
		if (!r.ok) {
			setWiggleMsg(root, r.error || "Save failed");
			return;
		}
		wiggleEditId = r.animation!.id;
		wiggleDraft = JSON.parse(JSON.stringify(r.animation)) as SeidrAnimation;
		setWiggleMsg(root, "Saved");
		renderWiggleList(root);
		renderWiggleEditor(root);
		wireWiggleList(root);
		updateCap(root);
	});
	root.querySelector("#seidr-wiggle-test")?.addEventListener("click", function () {
		const cur = readWiggleDraftFromDom(root) || wiggleDraft;
		if (!cur) return;
		seidrCancelWiggleFramePreview();
		const saved = seidrUpsertAnimation(cur);
		if (!saved.ok || !saved.animation) {
			setWiggleMsg(root, saved.error || "Save before test failed");
			return;
		}
		wiggleDraft = JSON.parse(JSON.stringify(saved.animation)) as SeidrAnimation;
		setWiggleMsg(root, "Testing…");
		seidrPlayWiggleTest(saved.animation).then(function (r) {
			if (!r.ok) {
				setWiggleMsg(root, r.error || "Play failed");
				return;
			}
			setWiggleMsg(root, r.restored ? "Played (slot restored)" : "Played");
		});
	});
	root.querySelector("#seidr-wiggle-del")?.addEventListener("click", function () {
		if (!wiggleDraft) return;
		seidrDeleteAnimation(wiggleDraft.id);
		wiggleEditId = null;
		wiggleDraft = null;
		ensureFirstWiggle(root);
		setWiggleMsg(root, "Deleted");
		updateCap(root);
	});
}

function wireWiggleList(root: HTMLElement) {
	const pick = root.querySelector("#seidr-wiggle-pick") as HTMLSelectElement | null;
	if (pick) {
		pick.addEventListener("change", function () {
			const id = parseInt(pick.value, 10);
			if (Number.isFinite(id)) openWiggle(root, id);
		});
	}
}

function startAddWiggle(root: HTMLElement, slot: SeidrWiggleSlot) {
	const worn = seidrScanWornWiggleItems().filter(function (w) { return w.slot === slot; });
	if (!worn.length) {
		setWiggleMsg(root, "Wear a " + slotLabel(slot).toLowerCase() + " first (including Echo slots)");
		return;
	}
	let pick: SeidrWornWiggleItem = worn[0];
	if (worn.length > 1) {
		const labels = worn.map(function (w, i) {
			return (i + 1) + ": " + w.description + " [" + w.group + "]";
		}).join("\n");
		const ans = window.prompt("Multiple worn. Enter number:\n" + labels, "1");
		const idx = parseInt(String(ans || "1"), 10) - 1;
		if (idx >= 0 && idx < worn.length) pick = worn[idx];
	}
	const bag = seidrGetAnimationsBag();
	if (seidrCountWiggleAnimations(bag.list) >= SEIDR_WIGGLES_MAX) {
		setWiggleMsg(root, "Wiggle limit reached (" + SEIDR_WIGGLES_MAX + ")");
		return;
	}
	const primary = seidrWornToFrame(pick);
	const match = seidrFindAutomatchSecondaryFrame(slot, pick.group, pick.assetName, primary.typedState);
	const secondaryRaw: SeidrWiggleFrame = match
		? { assetName: match.assetName, typedState: match.typedState }
		: { assetName: pick.assetName };
	const secondary = applyPrimaryColorsToSecondary(primary, secondaryRaw);
	const a = seidrDefaultWiggleAnimation(bag.nextId, slot, pick.group, primary, secondary);
	a.name = slotLabel(slot) + " · " + (pick.description || pick.assetName).slice(0, 28);
	const r = seidrUpsertAnimation(a);
	if (!r.ok || !r.animation) {
		setWiggleMsg(root, r.error || "Could not add wiggle");
		return;
	}
	openWiggle(root, r.animation.id);
	if (match && seidrWiggleFramesDiffer(primary, secondary)) {
		setWiggleMsg(root, match.typedState != null
			? "Added with typed automatch (" + match.typedState + ")"
			: "Added with automatch");
	} else {
		setWiggleMsg(root, "Added — Automatch, or Capture second after changing typed/size/rotation");
	}
	updateCap(root);
}

export function seidrBuildAnimationsTab(container: HTMLElement) {
	editId = null;
	draft = null;
	wiggleEditId = null;
	wiggleDraft = null;
	container.innerHTML = [
		'<details class="seidr-settings-sec" open>',
		"<summary>Animations</summary>",
		'<p class="seidr-settings-hint">Pose and face clips for yourself. Cap ' + SEIDR_ANIMATIONS_MAX +
		" clips (wiggles have their own cap), " + SEIDR_ANIM_STEPS_MAX + " steps, " + SEIDR_ANIM_WAIT_TOTAL_MAX +
		"s total wait. Play with /animation or /ani.</p>",
		'<div class="seidr-settings-row" style="gap:8px;display:flex;align-items:center;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-anim-add">Add animation</button>',
		'<span class="seidr-settings-hint" id="seidr-anim-cap">0/' + SEIDR_ANIMATIONS_MAX + " Animations</span>",
		"</div>",
		'<div id="seidr-anim-list" style="margin-top:10px;"></div>',
		'<div class="seidr-act-editor" id="seidr-anim-editor" style="margin-top:10px;"></div>',
		"</details>",
		'<details class="seidr-settings-sec" open style="margin-top:12px;">',
		"<summary>Wiggle</summary>",
		'<p class="seidr-settings-hint">Ear / Tail / Wing asset swaps (one set per base item). Cap ' +
		SEIDR_WIGGLES_MAX + " (separate from clips). Usable from Reactions and Fast Wiggle. Must wear the primary to play.</p>",
		'<div class="seidr-settings-row" style="gap:8px;display:flex;align-items:center;flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-add-tail">Add Tail</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-add-ear">Add Ear</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-wiggle-add-wing">Add Wing</button>',
		'<span class="seidr-settings-hint" id="seidr-wiggle-cap">0/' + SEIDR_WIGGLES_MAX + " Wiggles</span>",
		"</div>",
		'<div id="seidr-wiggle-list" style="margin-top:10px;"></div>',
		'<div class="seidr-act-editor" id="seidr-wiggle-editor" style="margin-top:10px;"></div>',
		"</details>",
	].join("");
	container.querySelector("#seidr-anim-add")?.addEventListener("click", function () {
		const a = seidrAddAnimation();
		if (!a) {
			setMsg(container, "Animation limit reached");
			return;
		}
		openAnimation(container, a.id);
	});
	container.querySelector("#seidr-wiggle-add-tail")?.addEventListener("click", function () {
		startAddWiggle(container, "tail");
	});
	container.querySelector("#seidr-wiggle-add-ear")?.addEventListener("click", function () {
		startAddWiggle(container, "ear");
	});
	container.querySelector("#seidr-wiggle-add-wing")?.addEventListener("click", function () {
		startAddWiggle(container, "wing");
	});
	ensureFirstOpen(container);
	ensureFirstWiggle(container);
}

export function seidrRefreshAnimationsTab() {
	const root = document.getElementById("seidr-settings-pane-animations");
	if (!root) return;
	seidrBuildAnimationsTab(root);
}
