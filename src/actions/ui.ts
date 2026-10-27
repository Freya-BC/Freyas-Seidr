/** Settings → Actions tab: list + editor */
import { Seidr } from "../seidr";
import {
	SEIDR_ACTION_AUDIENCES,
	SEIDR_ACTION_CHAT_MAX,
	SEIDR_ACTION_CHAT_TOKENS,
	SEIDR_ACTION_ITEMS_MAX,
	SEIDR_ACTION_POSES,
	SEIDR_ACTION_SLOTS,
	SEIDR_ACTION_SOUNDS,
	SEIDR_ACTIONS_MAX,
	SEIDR_AROUSAL_ACTIVITY_IDS,
	SEIDR_COND_TYPES,
	seidrActionActivityName,
	seidrArousalActivityLabel,
	seidrArousalPickerGroups,
	seidrDefaultAction,
	seidrDefaultActionIcon,
	seidrDefaultChatOther,
	seidrDefaultChatSelf,
	seidrNormalizeActionIcon,
	seidrRestraintSlots,
	type SeidrAction,
	type SeidrActionIcon,
	type SeidrActionItemRef,
	type SeidrArousalActivityGroup,
	type SeidrCondGroup,
	type SeidrCondRule,
	type SeidrCondType,
} from "./model";
import {
	SEIDR_ACTIVITY_ICON_IDS,
	SEIDR_BUILTIN_ICONS,
	seidrActivityIconUrl,
	seidrIconLabel,
	seidrResolveActionIconUrl,
	seidrResolveIconRef,
} from "./icons";
import { seidrExportActionsString, seidrParseActionsImport } from "./io";
import {
	seidrAddAction,
	seidrDeleteAction,
	seidrImportSelectedActions,
	seidrListActions,
	seidrUpdateAction,
} from "./store";
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";

let editId: number | null = null;
let draft: SeidrAction | null = null;
let lastChatArea: HTMLTextAreaElement | null = null;
let arousalPickerOpen = false;
let itemsPickerOpen = false;
let itemsPickerSlot = "ItemMouth";
let itemsPickerFilter = "";
/** Parsed import candidates awaiting checkbox selection. */
let importCandidates: SeidrAction[] | null = null;

const SEIDR_ITEMS_RESULT_CAP = 80;

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

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
			escapeHtml(o) + "</option>";
	}).join("");
}

function arousalResultsHtml(selected: string, filter: string): string {
	const q = (filter || "").trim().toLowerCase();
	const groups = seidrArousalPickerGroups();
	const parts: string[] = [];
	groups.forEach(function (g: SeidrArousalActivityGroup) {
		const rows = g.activities.filter(function (a) {
			if (!q) return true;
			return a.label.toLowerCase().indexOf(q) >= 0 || a.id.toLowerCase().indexOf(q) >= 0;
		});
		if (!rows.length) return;
		parts.push('<div class="seidr-act-arousal-group">' + escapeHtml(g.label) + "</div>");
		rows.forEach(function (a) {
			parts.push(
				'<button type="button" class="seidr-act-arousal-opt' +
				(a.id === selected ? " seidr-act-arousal-opt-on" : "") +
				'" data-arousal-id="' + escapeHtml(a.id) + '">' +
				escapeHtml(a.label) +
				' <span class="seidr-settings-hint">' + escapeHtml(a.id) + "</span></button>",
			);
		});
	});
	if (!parts.length) {
		return '<p class="seidr-settings-hint">No activities match.</p>';
	}
	return parts.join("");
}

function arousalPickerHtml(selected: string): string {
	const id = selected && SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(selected) >= 0 ? selected : "Caress";
	const open = arousalPickerOpen;
	return [
		'<div class="seidr-act-arousal-picker' + (open ? " seidr-act-arousal-open" : "") + '">',
		'<input type="hidden" id="seidr-act-arousal-act" value="' + escapeHtml(id) + '" />',
		'<button type="button" class="seidr-act-arousal-toggle" id="seidr-act-arousal-toggle" title="Choose Club arousal template">',
		'<span class="seidr-act-arousal-toggle-lab">Template</span>',
		'<strong id="seidr-act-arousal-label">' + escapeHtml(seidrArousalActivityLabel(id)) + "</strong>",
		'<span class="seidr-act-arousal-caret" aria-hidden="true">' + (open ? "▴" : "▾") + "</span>",
		"</button>",
		'<div class="seidr-act-arousal-dropdown" id="seidr-act-arousal-dropdown"' +
		(open ? "" : " hidden") + ">",
		'<input type="search" id="seidr-act-arousal-filter" placeholder="Search activities…" autocomplete="off" />',
		'<div class="seidr-act-arousal-results" id="seidr-act-arousal-results">' +
		arousalResultsHtml(id, "") + "</div>",
		"</div>",
		"</div>",
	].join("");
}

function restraintAssetLabel(a: any): string {
	if (!a) return "";
	try {
		if (typeof a.Description === "string" && a.Description) return a.Description;
		if (typeof a.DynamicDescription === "function" && typeof Player !== "undefined" && Player) {
			return String(a.DynamicDescription(Player) || a.Name || "");
		}
	} catch (e) { /* ignore */ }
	return a.Name ? String(a.Name) : "";
}

function itemRefLabel(ref: SeidrActionItemRef): string {
	const slotMeta = seidrRestraintSlots().filter(function (s) { return s.id === ref.slot; })[0];
	const slotLab = slotMeta ? slotMeta.label : ref.slot;
	let nameLab = ref.name;
	try {
		if (typeof AssetGet === "function") {
			const a = AssetGet("Female3DCG", ref.slot as any, ref.name as any);
			if (a) nameLab = restraintAssetLabel(a) || ref.name;
		}
	} catch (e) { /* ignore */ }
	return slotLab + ": " + nameLab;
}

/** Club Item* wearables (gags, armbinders, strap-ons, …) — not clothing / hair. */
function listRestraintAssets(slot: string, filter: string): { name: string; label: string }[] {
	const out: { name: string; label: string }[] = [];
	if (!slot || typeof Asset === "undefined" || !Array.isArray(Asset)) return out;
	const q = (filter || "").trim().toLowerCase();
	let family = "Female3DCG";
	try {
		if (typeof Player !== "undefined" && Player && Player.AssetFamily) {
			family = String(Player.AssetFamily);
		}
	} catch (e0) { /* ignore */ }
	try {
		for (let i = 0; i < Asset.length; i++) {
			const a = Asset[i];
			if (!a || !a.Name || !a.Group || a.Group.Name !== slot) continue;
			if (a.Group.Family && a.Group.Family !== family) continue;
			if (a.IsLock) continue;
			if (a.Wear === false) continue;
			if (a.Enable === false) continue;
			const label = restraintAssetLabel(a) || a.Name;
			if (q) {
				const hay = (label + " " + a.Name).toLowerCase();
				if (hay.indexOf(q) < 0) continue;
			}
			out.push({ name: String(a.Name), label: String(label) });
		}
	} catch (e) { /* ignore */ }
	out.sort(function (x, y) {
		return x.label.localeCompare(y.label);
	});
	return out.slice(0, SEIDR_ITEMS_RESULT_CAP);
}

function itemsResultsHtml(slot: string, filter: string, selected: SeidrActionItemRef[]): string {
	const rows = listRestraintAssets(slot, filter);
	if (!rows.length) {
		return '<p class="seidr-settings-hint">No restraints match' +
			(typeof Asset === "undefined" ? " (Asset catalog not loaded)." : ".") + "</p>";
	}
	return rows.map(function (r) {
		const on = selected.some(function (it) {
			return it.slot === slot && it.name === r.name;
		});
		return '<button type="button" class="seidr-act-item-opt' +
			(on ? " seidr-act-item-opt-on" : "") +
			'" data-item-add-slot="' + escapeHtml(slot) +
			'" data-item-add-name="' + escapeHtml(r.name) + '">' +
			escapeHtml(r.label) +
			' <span class="seidr-settings-hint">' + escapeHtml(r.name) + "</span></button>";
	}).join("");
}

function itemsBlockHtml(items: SeidrActionItemRef[]): string {
	const list = items || [];
	const slots = seidrRestraintSlots();
	if (!slots.some(function (s) { return s.id === itemsPickerSlot; })) {
		itemsPickerSlot = slots[0] ? slots[0].id : "ItemMouth";
	}
	const chips = list.length
		? list.map(function (it, idx) {
			return '<button type="button" class="seidr-act-item-chip" data-item-del="' + idx + '" title="Remove">' +
				escapeHtml(itemRefLabel(it)) + " ×</button>";
		}).join("")
		: '<span class="seidr-settings-hint">None — action shows without a specific restraint.</span>';
	const open = itemsPickerOpen;
	return [
		'<p class="seidr-settings-hint" style="margin-top:10px;">Items (optional — acted must wear one listed restraint)</p>',
		'<div class="seidr-act-items" id="seidr-act-items">' + chips + "</div>",
		'<div class="seidr-act-items-picker' + (open ? " seidr-act-items-open" : "") + '">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-items-toggle" title="Browse Club restraints">',
		(open ? "Hide restraint catalog ▴" : "Add restraint ▾") + "</button>",
		'<div class="seidr-act-items-dropdown" id="seidr-act-items-dropdown"' + (open ? "" : " hidden") + ">",
		'<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; margin-bottom:6px;">',
		'<select id="seidr-act-items-slot">' + opts(slots, itemsPickerSlot) + "</select>",
		'<input type="search" id="seidr-act-items-filter" placeholder="Search gags, armbinders…" autocomplete="off" value="' +
		escapeHtml(itemsPickerFilter) + '" />',
		"</div>",
		'<div class="seidr-act-items-results" id="seidr-act-items-results">' +
		itemsResultsHtml(itemsPickerSlot, itemsPickerFilter, list) + "</div>",
		"</div>",
		"</div>",
	].join("");
}

function slotChips(selected: string[]): string {
	return SEIDR_ACTION_SLOTS.map(function (s) {
		const on = selected.indexOf(s.id) >= 0;
		return '<button type="button" class="seidr-act-slot' + (on ? " seidr-act-slot-on" : "") +
			'" data-slot="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + "</button>";
	}).join("");
}

function ruleRowHtml(rule: SeidrCondRule, index: number): string {
	const typeMeta = SEIDR_COND_TYPES.filter(function (t) { return t.id === rule.type; })[0];
	const extra = typeMeta ? typeMeta.extra : null;
	let extraHtml = "";
	if (extra === "slot") {
		extraHtml = '<select data-rule-extra="slot">' +
			opts(SEIDR_ACTION_SLOTS, rule.slot || "ItemArms") + "</select>";
	} else if (extra === "pose") {
		extraHtml = '<select data-rule-extra="pose">' +
			opts(SEIDR_ACTION_POSES, rule.pose || "Kneel") + "</select>";
	} else if (extra === "zone") {
		extraHtml = '<select data-rule-extra="zone">' +
			'<option value="penis"' + (rule.zone === "penis" ? " selected" : "") + ">penis</option>" +
			'<option value="vagina"' + (rule.zone === "vagina" || !rule.zone ? " selected" : "") + ">vagina</option>" +
			'<option value="nipples"' + (rule.zone === "nipples" ? " selected" : "") + ">nipples</option>" +
			"</select>";
	}
	return [
		'<div class="seidr-act-rule" data-rule-index="' + index + '">',
		'<select data-rule-who>',
		'<option value="target"' + (rule.who !== "source" ? " selected" : "") + ">They</option>",
		'<option value="source"' + (rule.who === "source" ? " selected" : "") + ">I</option>",
		"</select>",
		'<select data-rule-not>',
		'<option value="0"' + (!rule.not ? " selected" : "") + ">is</option>",
		'<option value="1"' + (rule.not ? " selected" : "") + ">is not</option>",
		"</select>",
		'<select data-rule-type>' +
		SEIDR_COND_TYPES.map(function (t) {
			return '<option value="' + t.id + '"' + (t.id === rule.type ? " selected" : "") + ">" +
				escapeHtml(t.label) + "</option>";
		}).join("") +
		"</select>",
		extraHtml,
		'<button type="button" class="seidr-act-btn seidr-act-btn-icon" data-rule-del="' + index +
		'" title="Remove rule">×</button>',
		"</div>",
	].join("");
}

function groupsHtml(groups: SeidrCondGroup[]): string {
	if (!groups.length) {
		return '<p class="seidr-settings-hint">No conditions — always available when audience matches.</p>';
	}
	return groups.map(function (g, gi) {
		const rules = (g.rules || []).map(function (r, ri) {
			return ruleRowHtml(r, gi * 100 + ri);
		}).join("");
		return [
			'<div class="seidr-act-group" data-group="' + gi + '">',
			'<div class="seidr-act-group-head">Group ' + (gi + 1) + " (AND)" +
			(gi > 0 ? ' <span class="seidr-settings-hint">OR previous</span>' : "") +
			' <button type="button" class="seidr-act-btn seidr-act-btn-danger" data-group-del="' + gi +
			'">Remove group</button></div>',
			rules,
			'<button type="button" class="seidr-act-btn" data-rule-add="' + gi + '">+ Rule</button>',
			"</div>",
		].join("");
	}).join("");
}

function chatTokenChips(): string {
	return SEIDR_ACTION_CHAT_TOKENS.map(function (t) {
		return '<button type="button" class="seidr-act-ph" data-chat-token="' +
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

function updateCapHint(root: HTMLElement) {
	const el = root.querySelector("#seidr-act-cap");
	if (!el) return;
	const n = seidrListActions().length;
	el.textContent = n + "/" + SEIDR_ACTIONS_MAX + " Actions";
}

function renderList(root: HTMLElement) {
	const list = seidrListActions();
	const box = root.querySelector("#seidr-act-list");
	if (!box) return;
	updateCapHint(root);
	if (!list.length) {
		box.innerHTML = '<p class="seidr-settings-hint">No actions yet. Add one to appear in the Club Activity Menu.</p>';
		return;
	}
	const optsHtml = list.map(function (a) {
		return '<option value="' + a.id + '"' + (editId === a.id ? " selected" : "") + ">" +
			escapeHtml(a.name) + " (" + escapeHtml(a.slots.join(", ")) + ")</option>";
	}).join("");
	box.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Action</span>',
		'<select id="seidr-act-pick">' + optsHtml + "</select>",
		"</div>",
	].join("");
}

function renderEditor(root: HTMLElement) {
	const wrap = root.querySelector("#seidr-act-editor") as HTMLElement | null;
	if (!wrap) return;
	if (!draft) {
		wrap.innerHTML = '<p class="seidr-settings-hint">Select an action or add a new one.</p>';
		return;
	}
	const a = draft;
	const arousal = a.effects.arousal || { enabled: false, activity: "Caress" };
	const sound = a.effects.sound || { enabled: false, sound: SEIDR_ACTION_SOUNDS[0] };
	const pose = a.effects.pose || { enabled: false, pose: "Kneel" };
	const chatOther = a.chatOther || seidrDefaultChatOther(a.name);
	const chatSelf = a.chatSelf || seidrDefaultChatSelf(a.name);
	if (!a.icon) a.icon = seidrDefaultActionIcon();
	const icon = seidrNormalizeActionIcon(a.icon);
	const iconUrl = seidrResolveIconRef(icon);
	const iconLab = seidrIconLabel(icon);
	wrap.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Name</span>',
		'<input type="text" id="seidr-act-name" maxlength="48" value="' + escapeHtml(a.name) + '" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Who</span>',
		'<select id="seidr-act-audience">' + opts(SEIDR_ACTION_AUDIENCES, a.audience) + "</select>",
		"</div>",
		'<div class="seidr-act-icon-row" style="margin-top:10px;">',
		'<img class="seidr-act-icon-preview" id="seidr-act-icon-preview" src="' + escapeHtml(iconUrl) +
		'" alt="" width="40" height="40" />',
		'<div>',
		'<p class="seidr-settings-hint" id="seidr-act-icon-label">' + escapeHtml(iconLab) + "</p>",
		'<button type="button" class="seidr-act-btn" id="seidr-act-icon-pick">Select icon</button>',
		"</div>",
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:10px;">Slots (Activity Menu zones)</p>',
		'<div class="seidr-act-slots" id="seidr-act-slots">' + slotChips(a.slots) + "</div>",
		itemsBlockHtml(a.items || []),
		'<p class="seidr-settings-hint" style="margin-top:10px;">When visible</p>',
		'<div id="seidr-act-conds">' + groupsHtml(a.conditions.groups) + "</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-add-group">+ Or this instead</button>',
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:10px;">Action text (Club tags, max ' +
		SEIDR_ACTION_CHAT_MAX + ")</p>",
		'<div class="seidr-act-ph-row" id="seidr-act-ph">' + chatTokenChips() + "</div>",
		'<p class="seidr-settings-hint">Club style: SourceCharacter kisses TargetCharacter\'s lips. / SourceCharacter touches PronounPossessive arms.</p>',
		'<label class="seidr-settings-field-label" style="display:block;margin-top:8px;">Other</label>',
		'<textarea id="seidr-act-chat-other" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' +
		escapeHtml(chatOther) + "</textarea>",
		'<p class="seidr-settings-hint" id="seidr-act-chat-other-count">' +
		chatOther.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
		'<label class="seidr-settings-field-label" style="display:block;margin-top:8px;">Self</label>',
		'<textarea id="seidr-act-chat-self" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' +
		escapeHtml(chatSelf) + "</textarea>",
		'<p class="seidr-settings-hint" id="seidr-act-chat-self-count">' +
		chatSelf.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
		'<p class="seidr-settings-hint" style="margin-top:10px;">Effects</p>',
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-act-arousal-on"' + (arousal.enabled ? " checked" : "") +
		" /> Add arousal</label>",
		"</div>",
		arousalPickerHtml(arousal.activity || "Caress"),
		'<p class="seidr-settings-hint">Click Template to search Club activities. Chat text stays your action name.</p>',
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<label><input type="checkbox" id="seidr-act-sound-on"' + (sound.enabled ? " checked" : "") +
		" /> Play sound</label>",
		'<select id="seidr-act-sound">' + stringOpts(SEIDR_ACTION_SOUNDS, sound.sound) + "</select>",
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<label><input type="checkbox" id="seidr-act-pose-on"' + (pose.enabled ? " checked" : "") +
		" /> Set pose</label>",
		'<select id="seidr-act-pose">' + opts(SEIDR_ACTION_POSES, pose.pose) + "</select>",
		"</div>",
		'<div class="seidr-settings-row seidr-settings-draw-actions" style="margin-top:12px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-save">Save action</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-act-delete">Delete</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-act-msg"></p>',
	].join("");
}

function readDraftFromDom(root: HTMLElement): SeidrAction | null {
	if (!draft) return null;
	const nameEl = root.querySelector("#seidr-act-name") as HTMLInputElement | null;
	const audEl = root.querySelector("#seidr-act-audience") as HTMLSelectElement | null;
	const chatOtherEl = root.querySelector("#seidr-act-chat-other") as HTMLTextAreaElement | null;
	const chatSelfEl = root.querySelector("#seidr-act-chat-self") as HTMLTextAreaElement | null;
	const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : draft.name;
	const next: SeidrAction = {
		id: draft.id,
		name: name,
		slots: draft.slots.slice(),
		audience: (audEl && audEl.value ? audEl.value : draft.audience) as SeidrAction["audience"],
		chatOther: chatOtherEl && chatOtherEl.value.trim()
			? chatOtherEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
			: seidrDefaultChatOther(name),
		chatSelf: chatSelfEl && chatSelfEl.value.trim()
			? chatSelfEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX)
			: seidrDefaultChatSelf(name),
		icon: seidrNormalizeActionIcon(draft.icon || seidrDefaultActionIcon()),
		items: (draft.items || []).slice(),
		conditions: { groups: [] },
		effects: {},
	};
	const slotBtns = root.querySelectorAll(".seidr-act-slot-on");
	const slots: string[] = [];
	slotBtns.forEach(function (btn) {
		const s = (btn as HTMLElement).getAttribute("data-slot");
		if (s && slots.indexOf(s) < 0) slots.push(s);
	});
	if (slots.length) next.slots = slots;

	const groups: SeidrCondGroup[] = [];
	root.querySelectorAll(".seidr-act-group").forEach(function (gEl) {
		const rules: SeidrCondRule[] = [];
		gEl.querySelectorAll(".seidr-act-rule").forEach(function (rEl) {
			const who = ((rEl.querySelector("[data-rule-who]") as HTMLSelectElement) || { value: "target" }).value;
			const not = ((rEl.querySelector("[data-rule-not]") as HTMLSelectElement) || { value: "0" }).value === "1";
			const type = ((rEl.querySelector("[data-rule-type]") as HTMLSelectElement) || { value: "wearing" }).value as SeidrCondType;
			const rule: SeidrCondRule = {
				who: who === "source" ? "source" : "target",
				type: type,
				not: not,
			};
			const slotEl = rEl.querySelector('[data-rule-extra="slot"]') as HTMLSelectElement | null;
			const poseEl = rEl.querySelector('[data-rule-extra="pose"]') as HTMLSelectElement | null;
			const zoneEl = rEl.querySelector('[data-rule-extra="zone"]') as HTMLSelectElement | null;
			if (slotEl) rule.slot = slotEl.value;
			if (poseEl) rule.pose = poseEl.value;
			if (zoneEl) rule.zone = zoneEl.value as SeidrCondRule["zone"];
			rules.push(rule);
		});
		if (rules.length) groups.push({ rules: rules });
	});
	next.conditions = { groups: groups };

	const aOn = root.querySelector("#seidr-act-arousal-on") as HTMLInputElement | null;
	const aAct = root.querySelector("#seidr-act-arousal-act") as HTMLInputElement | null;
	const actVal = (aAct && aAct.value) || "Caress";
	next.effects.arousal = {
		enabled: !!(aOn && aOn.checked),
		activity: SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(actVal) >= 0 ? actVal : "Caress",
	};
	const sOn = root.querySelector("#seidr-act-sound-on") as HTMLInputElement | null;
	const sSel = root.querySelector("#seidr-act-sound") as HTMLSelectElement | null;
	next.effects.sound = {
		enabled: !!(sOn && sOn.checked),
		sound: (sSel && sSel.value) || SEIDR_ACTION_SOUNDS[0],
	};
	const pOn = root.querySelector("#seidr-act-pose-on") as HTMLInputElement | null;
	const pSel = root.querySelector("#seidr-act-pose") as HTMLSelectElement | null;
	next.effects.pose = {
		enabled: !!(pOn && pOn.checked),
		pose: (pSel && pSel.value) || "Kneel",
	};
	draft = next;
	return next;
}

function setMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-act-msg");
	if (el) el.textContent = text || "";
}

function afterSave() {
	if (typeof Seidr.syncUserActions === "function") {
		try { Seidr.syncUserActions(); } catch (e) { /* ignore */ }
	}
}

function bindArousalPicker(root: HTMLElement) {
	const picker = root.querySelector(".seidr-act-arousal-picker") as HTMLElement | null;
	const toggle = root.querySelector("#seidr-act-arousal-toggle") as HTMLButtonElement | null;
	const dropdown = root.querySelector("#seidr-act-arousal-dropdown") as HTMLElement | null;
	const filter = root.querySelector("#seidr-act-arousal-filter") as HTMLInputElement | null;
	const hidden = root.querySelector("#seidr-act-arousal-act") as HTMLInputElement | null;
	const results = root.querySelector("#seidr-act-arousal-results") as HTMLElement | null;
	const labelEl = root.querySelector("#seidr-act-arousal-label");
	const caret = root.querySelector(".seidr-act-arousal-caret");
	if (!toggle || !dropdown || !hidden) return;

	function setOpen(open: boolean) {
		arousalPickerOpen = open;
		if (picker) picker.classList.toggle("seidr-act-arousal-open", open);
		if (dropdown) {
			if (open) dropdown.removeAttribute("hidden");
			else dropdown.setAttribute("hidden", "");
		}
		if (caret) caret.textContent = open ? "▴" : "▾";
		if (open && filter) {
			try { filter.focus(); } catch (e) { /* ignore */ }
		}
	}

	function refreshResults() {
		if (!results || !hidden) return;
		const q = filter ? filter.value || "" : "";
		results.innerHTML = arousalResultsHtml(hidden.value || "Caress", q);
	}

	toggle.addEventListener("click", function (ev) {
		ev.preventDefault();
		ev.stopPropagation();
		setOpen(!arousalPickerOpen);
		if (arousalPickerOpen) refreshResults();
	});

	if (filter) {
		filter.addEventListener("input", function () { refreshResults(); });
		filter.addEventListener("keydown", function (ev) {
			if (ev.key === "Escape") {
				ev.preventDefault();
				setOpen(false);
			}
		});
	}

	if (results) {
		results.addEventListener("click", function (ev) {
			const btn = (ev.target as HTMLElement).closest("[data-arousal-id]") as HTMLElement | null;
			if (!btn || !hidden) return;
			const id = btn.getAttribute("data-arousal-id");
			if (!id || SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(id) < 0) return;
			hidden.value = id;
			if (labelEl) labelEl.textContent = seidrArousalActivityLabel(id);
			if (draft) {
				if (!draft.effects) draft.effects = {};
				if (!draft.effects.arousal) draft.effects.arousal = { enabled: false, activity: id };
				else draft.effects.arousal.activity = id;
			}
			setOpen(false);
		});
	}

	const onDoc = function (ev: MouseEvent) {
		if (!arousalPickerOpen || !picker) return;
		if (picker.contains(ev.target as Node)) return;
		setOpen(false);
		document.removeEventListener("mousedown", onDoc, true);
	};
	toggle.addEventListener("click", function () {
		if (arousalPickerOpen) {
			setTimeout(function () {
				document.addEventListener("mousedown", onDoc, true);
			}, 0);
		}
	});
}

function addItemRef(root: HTMLElement, slot: string, name: string) {
	if (!draft || !slot || !name) return;
	readDraftFromDom(root);
	if (!draft.items) draft.items = [];
	const dup = draft.items.some(function (it) {
		return it.slot === slot && it.name === name;
	});
	if (dup) {
		setMsg(root, "Already added");
		return;
	}
	if (draft.items.length >= SEIDR_ACTION_ITEMS_MAX) {
		setMsg(root, "Item limit (" + SEIDR_ACTION_ITEMS_MAX + ")");
		return;
	}
	draft.items.push({ slot: slot, name: name });
	itemsPickerOpen = false;
	renderEditor(root);
	bindEditor(root);
}

function bindItemsPicker(root: HTMLElement) {
	const picker = root.querySelector(".seidr-act-items-picker") as HTMLElement | null;
	const toggle = root.querySelector("#seidr-act-items-toggle") as HTMLButtonElement | null;
	const dropdown = root.querySelector("#seidr-act-items-dropdown") as HTMLElement | null;
	const slotSel = root.querySelector("#seidr-act-items-slot") as HTMLSelectElement | null;
	const filterEl = root.querySelector("#seidr-act-items-filter") as HTMLInputElement | null;
	const results = root.querySelector("#seidr-act-items-results") as HTMLElement | null;

	function refreshResults() {
		if (!results || !draft) return;
		results.innerHTML = itemsResultsHtml(itemsPickerSlot, itemsPickerFilter, draft.items || []);
		results.querySelectorAll("[data-item-add-name]").forEach(function (btn) {
			btn.addEventListener("click", function () {
				const el = btn as HTMLElement;
				addItemRef(
					root,
					el.getAttribute("data-item-add-slot") || "",
					el.getAttribute("data-item-add-name") || "",
				);
			});
		});
	}

	function setOpen(open: boolean) {
		itemsPickerOpen = open;
		if (picker) picker.classList.toggle("seidr-act-items-open", open);
		if (dropdown) dropdown.hidden = !open;
		if (toggle) toggle.textContent = open ? "Hide restraint catalog ▴" : "Add restraint ▾";
		if (open) {
			refreshResults();
			if (filterEl) filterEl.focus();
		}
	}

	toggle?.addEventListener("click", function () {
		setOpen(!itemsPickerOpen);
	});

	slotSel?.addEventListener("change", function () {
		itemsPickerSlot = slotSel.value || "ItemMouth";
		refreshResults();
	});

	filterEl?.addEventListener("input", function () {
		itemsPickerFilter = filterEl.value || "";
		refreshResults();
	});

	if (itemsPickerOpen) refreshResults();

	root.querySelectorAll("[data-item-del]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			if (!draft) return;
			readDraftFromDom(root);
			const idx = parseInt((btn as HTMLElement).getAttribute("data-item-del") || "", 10);
			if (!Number.isFinite(idx) || !draft.items) return;
			draft.items.splice(idx, 1);
			renderEditor(root);
			bindEditor(root);
		});
	});
}

function syncChatCount(root: HTMLElement, which: "other" | "self") {
	const ta = root.querySelector(
		which === "other" ? "#seidr-act-chat-other" : "#seidr-act-chat-self",
	) as HTMLTextAreaElement | null;
	const count = root.querySelector(
		which === "other" ? "#seidr-act-chat-other-count" : "#seidr-act-chat-self-count",
	);
	if (ta && count) count.textContent = ta.value.length + "/" + SEIDR_ACTION_CHAT_MAX;
}

function closeIconModal() {
	const modal = document.getElementById("seidr-act-icon-modal");
	if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
}

/** Push saved icon onto any open Club Activity Menu buttons. */
function refreshOpenActivityMenuIcons() {
	const grid = document.getElementById("dialog-activity-grid");
	if (!grid) return;
	seidrListActions().forEach(function (action) {
		const name = seidrActionActivityName(action.id);
		const btn = grid.querySelector('button[name="' + name + '"]') as HTMLElement | null;
		if (!btn) return;
		const url = seidrResolveActionIconUrl(action);
		try {
			if (typeof ElementButton !== "undefined" && ElementButton && typeof ElementButton.SetImage === "function") {
				ElementButton.SetImage(btn, url);
				return;
			}
		} catch (e) { /* fall through */ }
		const img = btn.querySelector(".button-image") as HTMLImageElement | HTMLElement | null;
		if (img && img instanceof HTMLImageElement) img.src = url;
		else if (img) {
			const css = url.indexOf("data:image") === 0 || url.indexOf("http") === 0
				? 'url("' + url + '")'
				: 'url("./' + url + '")';
			img.style.setProperty("background-image", css);
			img.style.setProperty("mask-image", css);
		}
	});
}

function openIconModal(root: HTMLElement) {
	if (!draft) return;
	closeIconModal();
	readDraftFromDom(root);
	const panel = document.getElementById("seidr-settings-panel") || document.body;
	const modal = document.createElement("div");
	modal.id = "seidr-act-icon-modal";
	modal.className = "seidr-act-icon-modal";
	modal.innerHTML = [
		'<div class="seidr-act-icon-modal-card">',
		'<div class="seidr-act-icon-modal-head">',
		"<strong>Select icon</strong>",
		'<button type="button" class="seidr-act-btn" id="seidr-act-icon-close">Close</button>',
		"</div>",
		'<input type="search" id="seidr-act-icon-search" placeholder="Search icons…" autocomplete="off" />',
		'<div class="seidr-act-icon-scroll" id="seidr-act-icon-scroll">',
		'<div class="seidr-act-icon-grid" id="seidr-act-icon-grid"></div>',
		"</div>",
		"</div>",
	].join("");
	panel.appendChild(modal);
	// Keep wheel scrolling inside the modal (Club canvas listens on document).
	modal.addEventListener("wheel", function (ev) {
		ev.stopPropagation();
	}, { passive: true });

	function pickIcon(icon: SeidrActionIcon) {
		if (!draft) return;
		readDraftFromDom(root);
		draft.icon = seidrNormalizeActionIcon(icon);
		const saved = seidrUpdateAction(draft);
		closeIconModal();
		renderEditor(root);
		bindEditor(root);
		if (saved.ok) {
			afterSave();
			refreshOpenActivityMenuIcons();
			setMsg(root, "Icon saved");
		} else {
			setMsg(root, saved.error || "Icon save failed — click Save action");
		}
	}

	function paintGrid(filter: string) {
		const grid = modal.querySelector("#seidr-act-icon-grid");
		if (!grid) return;
		const q = (filter || "").trim().toLowerCase();
		const parts: string[] = [];
		function pushSection(title: string, cells: string) {
			if (!cells) return;
			parts.push('<div class="seidr-act-icon-sec">' + escapeHtml(title) + "</div>");
			parts.push('<div class="seidr-act-icon-sec-grid">' + cells + "</div>");
		}
		const seidrCells = SEIDR_BUILTIN_ICONS.filter(function (b) {
			if (!q) return true;
			return b.label.toLowerCase().indexOf(q) >= 0 || b.id.toLowerCase().indexOf(q) >= 0;
		}).map(function (b) {
			return (
				'<button type="button" class="seidr-act-icon-cell" data-icon-source="seidr" data-icon-id="' +
				escapeHtml(b.id) + '" title="' + escapeHtml(b.label) + '">' +
				'<img src="' + escapeHtml(b.url) + '" alt="" />' +
				"<span>" + escapeHtml(b.label) + "</span></button>"
			);
		}).join("");
		pushSection("Seidr", seidrCells);
		const actCells = SEIDR_ACTIVITY_ICON_IDS.filter(function (id) {
			if (!q) return true;
			return id.toLowerCase().indexOf(q) >= 0;
		}).map(function (id) {
			return (
				'<button type="button" class="seidr-act-icon-cell" data-icon-source="activity" data-icon-id="' +
				escapeHtml(id) + '" title="' + escapeHtml(id) + '">' +
				'<img src="' + escapeHtml(seidrActivityIconUrl(id)) + '" alt="" />' +
				"<span>" + escapeHtml(id) + "</span></button>"
			);
		}).join("");
		pushSection("Club Activity", actCells);
		grid.innerHTML = parts.length ? parts.join("") : '<p class="seidr-settings-hint">No icons match.</p>';
		grid.querySelectorAll("[data-icon-id]").forEach(function (btn) {
			btn.addEventListener("click", function () {
				const el = btn as HTMLElement;
				const source = el.getAttribute("data-icon-source") as SeidrActionIcon["source"];
				const id = el.getAttribute("data-icon-id") || "";
				if (!source || !id) return;
				pickIcon({ source: source, id: id });
			});
		});
	}

	modal.querySelector("#seidr-act-icon-close")?.addEventListener("click", closeIconModal);
	modal.addEventListener("click", function (ev) {
		if (ev.target === modal) closeIconModal();
	});
	modal.querySelector("#seidr-act-icon-search")?.addEventListener("input", function (ev) {
		paintGrid((ev.target as HTMLInputElement).value || "");
	});

	paintGrid("");
}

function bindEditor(root: HTMLElement) {
	bindArousalPicker(root);
	bindItemsPicker(root);

	root.querySelector("#seidr-act-icon-pick")?.addEventListener("click", function () {
		openIconModal(root);
	});

	root.querySelectorAll("#seidr-act-chat-other, #seidr-act-chat-self").forEach(function (el) {
		el.addEventListener("focus", function () {
			lastChatArea = el as HTMLTextAreaElement;
		});
		el.addEventListener("input", function () {
			const id = (el as HTMLElement).id;
			syncChatCount(root, id === "seidr-act-chat-self" ? "self" : "other");
		});
	});

	root.querySelector("#seidr-act-ph")?.addEventListener("click", function (ev) {
		const btn = (ev.target as HTMLElement).closest("[data-chat-token]") as HTMLElement | null;
		if (!btn) return;
		const token = btn.getAttribute("data-chat-token");
		if (!token) return;
		const other = root.querySelector("#seidr-act-chat-other") as HTMLTextAreaElement | null;
		const self = root.querySelector("#seidr-act-chat-self") as HTMLTextAreaElement | null;
		const ta = lastChatArea && (lastChatArea === other || lastChatArea === self)
			? lastChatArea
			: other;
		if (!ta) return;
		if (!insertChatToken(ta, token)) {
			setMsg(root, "Text max " + SEIDR_ACTION_CHAT_MAX + " characters");
		} else {
			syncChatCount(root, ta.id === "seidr-act-chat-self" ? "self" : "other");
		}
	});

	root.querySelector("#seidr-act-slots")?.addEventListener("click", function (ev) {
		const btn = (ev.target as HTMLElement).closest("[data-slot]") as HTMLElement | null;
		if (!btn || !draft) return;
		const slot = btn.getAttribute("data-slot");
		if (!slot) return;
		const i = draft.slots.indexOf(slot);
		if (i >= 0) {
			if (draft.slots.length > 1) draft.slots.splice(i, 1);
		} else {
			draft.slots.push(slot);
		}
		renderEditor(root);
		bindEditor(root);
	});

	root.querySelector("#seidr-act-add-group")?.addEventListener("click", function () {
		if (!draft) return;
		readDraftFromDom(root);
		draft.conditions.groups.push({
			rules: [{ who: "target", type: "wearing", slot: "ItemArms", not: false }],
		});
		renderEditor(root);
		bindEditor(root);
	});

	root.querySelectorAll("[data-group-del]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			if (!draft) return;
			readDraftFromDom(root);
			const gi = parseInt((btn as HTMLElement).getAttribute("data-group-del") || "", 10);
			if (!Number.isFinite(gi)) return;
			draft.conditions.groups.splice(gi, 1);
			renderEditor(root);
			bindEditor(root);
		});
	});

	root.querySelectorAll("[data-rule-add]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			if (!draft) return;
			readDraftFromDom(root);
			const gi = parseInt((btn as HTMLElement).getAttribute("data-rule-add") || "", 10);
			const g = draft.conditions.groups[gi];
			if (!g) return;
			g.rules.push({ who: "target", type: "isGagged", not: false });
			renderEditor(root);
			bindEditor(root);
		});
	});

	root.querySelectorAll("[data-rule-del]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			if (!draft) return;
			readDraftFromDom(root);
			const key = parseInt((btn as HTMLElement).getAttribute("data-rule-del") || "", 10);
			const gi = Math.floor(key / 100);
			const ri = key % 100;
			const g = draft.conditions.groups[gi];
			if (!g) return;
			g.rules.splice(ri, 1);
			if (!g.rules.length) draft.conditions.groups.splice(gi, 1);
			renderEditor(root);
			bindEditor(root);
		});
	});

	root.querySelectorAll("[data-rule-type]").forEach(function (sel) {
		sel.addEventListener("change", function () {
			if (!draft) return;
			readDraftFromDom(root);
			renderEditor(root);
			bindEditor(root);
		});
	});

	root.querySelector("#seidr-act-save")?.addEventListener("click", function () {
		const next = readDraftFromDom(root);
		if (!next) return;
		const saved = seidrUpdateAction(next);
		if (!saved.ok) {
			setMsg(root, saved.error || "Save failed");
			return;
		}
		draft = next;
		editId = next.id;
		setMsg(root, "Saved");
		renderList(root);
		afterSave();
		refreshOpenActivityMenuIcons();
		bindList(root);
	});

	root.querySelector("#seidr-act-delete")?.addEventListener("click", function () {
		if (!draft) return;
		const id = draft.id;
		seidrDeleteAction(id);
		editId = null;
		draft = null;
		renderList(root);
		renderEditor(root);
		afterSave();
		bindList(root);
	});
}

function selectActionById(root: HTMLElement, id: number) {
	const list = seidrListActions();
	const found = list.filter(function (a) { return a.id === id; })[0];
	if (!found) return;
	editId = id;
	draft = JSON.parse(JSON.stringify(found)) as SeidrAction;
	if (!draft.items) draft.items = [];
	if (!draft.icon) draft.icon = seidrDefaultActionIcon();
	arousalPickerOpen = false;
	renderList(root);
	renderEditor(root);
	bindList(root);
	bindEditor(root);
}

function bindList(root: HTMLElement) {
	const pick = root.querySelector("#seidr-act-pick") as HTMLSelectElement | null;
	if (!pick) return;
	pick.addEventListener("change", function () {
		const id = parseInt(pick.value || "", 10);
		if (!Number.isFinite(id)) return;
		selectActionById(root, id);
	});
}

function setIoMsg(container: HTMLElement, text: string) {
	const el = container.querySelector("#seidr-act-io-msg");
	if (el) el.textContent = text || "";
}

function renderImportPicker(container: HTMLElement) {
	const host = container.querySelector("#seidr-act-import-pick") as HTMLElement | null;
	if (!host) return;
	if (!importCandidates || !importCandidates.length) {
		host.innerHTML = "";
		host.hidden = true;
		return;
	}
	host.hidden = false;
	const rows = importCandidates.map(function (a, idx) {
		return (
			'<label class="seidr-act-import-row">' +
			'<input type="checkbox" data-import-idx="' + idx + '" checked /> ' +
			escapeHtml(a.name) +
			"</label>"
		);
	}).join("");
	host.innerHTML = [
		'<p class="seidr-settings-hint">Select actions to import (new ids; skips when at the ' +
		SEIDR_ACTIONS_MAX + " limit).</p>",
		'<div class="seidr-act-import-list">' + rows + "</div>",
		'<div class="seidr-settings-row" style="margin-top:8px; gap:6px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-import-do">Import selected</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-act-import-cancel">Cancel</button>',
		"</div>",
	].join("");

	host.querySelector("#seidr-act-import-cancel")?.addEventListener("click", function () {
		importCandidates = null;
		const paste = container.querySelector("#seidr-act-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		renderImportPicker(container);
		setIoMsg(container, "");
	});

	host.querySelector("#seidr-act-import-do")?.addEventListener("click", function () {
		if (!importCandidates) return;
		const selected: SeidrAction[] = [];
		host.querySelectorAll("[data-import-idx]").forEach(function (el) {
			const cb = el as HTMLInputElement;
			if (!cb.checked) return;
			const idx = parseInt(cb.getAttribute("data-import-idx") || "", 10);
			if (Number.isFinite(idx) && importCandidates![idx]) selected.push(importCandidates![idx]);
		});
		if (!selected.length) {
			setIoMsg(container, "Select at least one action");
			return;
		}
		const result = seidrImportSelectedActions(selected);
		if (!result.ok) {
			setIoMsg(container, result.error || "Import failed");
			return;
		}
		importCandidates = null;
		const paste = container.querySelector("#seidr-act-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		const panel = container.querySelector("#seidr-act-import-panel") as HTMLElement | null;
		if (panel) panel.hidden = true;
		renderImportPicker(container);
		editId = null;
		draft = null;
		renderList(container);
		renderEditor(container);
		bindList(container);
		afterSave();
		let msg = "Imported " + result.imported;
		if (result.skipped) msg += " (skipped " + result.skipped + ")";
		setIoMsg(container, msg);
	});
}

function bindIoPanel(container: HTMLElement) {
	const exportOut = container.querySelector("#seidr-act-export-out") as HTMLTextAreaElement | null;
	const importPanel = container.querySelector("#seidr-act-import-panel") as HTMLElement | null;
	const importPaste = container.querySelector("#seidr-act-import-paste") as HTMLTextAreaElement | null;

	container.querySelector("#seidr-act-export")?.addEventListener("click", function () {
		try {
			const packed = seidrExportActionsString();
			const exportPanel = container.querySelector("#seidr-act-export-panel") as HTMLElement | null;
			if (exportPanel) exportPanel.hidden = false;
			if (exportOut) {
				exportOut.value = packed;
				exportOut.focus();
				exportOut.select();
			}
			setIoMsg(container, "Export ready — copy the string below");
		} catch (e) {
			setIoMsg(container, e instanceof Error ? e.message : "Export failed");
		}
	});

	container.querySelector("#seidr-act-export-copy")?.addEventListener("click", function () {
		if (!exportOut || !exportOut.value) {
			setIoMsg(container, "Export first");
			return;
		}
		const text = exportOut.value;
		function ok() {
			setIoMsg(container, "Copied to clipboard");
		}
		function fail() {
			exportOut.focus();
			exportOut.select();
			setIoMsg(container, "Select and copy manually (Ctrl/Cmd+C)");
		}
		try {
			if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
				navigator.clipboard.writeText(text).then(ok, fail);
				return;
			}
		} catch (e) { /* fall through */ }
		try {
			exportOut.focus();
			exportOut.select();
			if (typeof document.execCommand === "function" && document.execCommand("copy")) ok();
			else fail();
		} catch (e2) {
			fail();
		}
	});

	container.querySelector("#seidr-act-import")?.addEventListener("click", function () {
		if (!importPanel) return;
		importPanel.hidden = !importPanel.hidden;
		if (!importPanel.hidden && importPaste) importPaste.focus();
		if (importPanel.hidden) {
			importCandidates = null;
			renderImportPicker(container);
		}
		setIoMsg(container, "");
	});

	container.querySelector("#seidr-act-import-parse")?.addEventListener("click", function () {
		const raw = importPaste ? importPaste.value : "";
		const parsed = seidrParseActionsImport(raw);
		if (parsed.ok === false) {
			importCandidates = null;
			renderImportPicker(container);
			setIoMsg(container, parsed.error);
			return;
		}
		importCandidates = parsed.actions;
		renderImportPicker(container);
		setIoMsg(container, "Parsed " + parsed.actions.length + " action(s) — select which to import");
	});
}

export function seidrBuildActionsTab(container: HTMLElement) {
	importCandidates = null;
	closeIconModal();
	container.innerHTML = [
		'<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-add">Add action</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-act-export">Export</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-act-import">Import</button>',
		'<span class="seidr-settings-hint" id="seidr-act-cap">0/' + SEIDR_ACTIONS_MAX + " Actions</span>",
		"</div>",
		'<p class="seidr-settings-hint">Actions appear in the Club Activity Menu on the slots you pick. Arousal uses the selected BC activity for preferences only.</p>',
		'<p class="seidr-settings-hint" id="seidr-act-io-msg"></p>',
		'<div id="seidr-act-export-panel" hidden>',
		'<textarea id="seidr-act-export-out" class="seidr-act-io-text" rows="3" readonly></textarea>',
		'<div class="seidr-settings-row" style="gap:6px; margin-top:4px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-export-copy" title="Copy export string">Copy</button>',
		"</div>",
		"</div>",
		'<div id="seidr-act-import-panel" class="seidr-act-import-panel" hidden>',
		'<p class="seidr-settings-hint">Paste a SeidrAct1: export string, then Parse.</p>',
		'<textarea id="seidr-act-import-paste" class="seidr-act-io-text" rows="3" placeholder="SeidrAct1:…"></textarea>',
		'<div class="seidr-settings-row" style="gap:6px; margin-top:6px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-act-import-parse">Parse</button>',
		"</div>",
		'<div id="seidr-act-import-pick" hidden></div>',
		"</div>",
		'<div id="seidr-act-list" class="seidr-act-list"></div>',
		'<div id="seidr-act-editor" class="seidr-act-editor"></div>',
	].join("");
	renderList(container);
	renderEditor(container);
	bindList(container);
	bindEditor(container);
	bindIoPanel(container);

	// Open first action in the dropdown editor when available
	if (editId == null) {
		const list = seidrListActions();
		if (list.length) {
			editId = list[0].id;
			draft = seidrDefaultAction(list[0].id);
			Object.assign(draft, JSON.parse(JSON.stringify(list[0])));
			if (!draft.items) draft.items = [];
			if (!draft.icon) draft.icon = seidrDefaultActionIcon();
			arousalPickerOpen = false;
			renderList(container);
			renderEditor(container);
			bindList(container);
			bindEditor(container);
		}
	}

	container.querySelector("#seidr-act-add")?.addEventListener("click", function () {
		const created = seidrAddAction();
		if (!created) {
			setIoMsg(container, "Action limit reached (" + SEIDR_ACTIONS_MAX + ")");
			return;
		}
		editId = created.id;
		draft = seidrDefaultAction(created.id);
		Object.assign(draft, created);
		if (!draft.items) draft.items = [];
		if (!draft.icon) draft.icon = seidrDefaultActionIcon();
		arousalPickerOpen = false;
		renderList(container);
		renderEditor(container);
		bindList(container);
		bindEditor(container);
		afterSave();
	});
}

export function seidrRefreshActionsTab() {
	const pane = $("seidr-settings-pane-actions");
	if (!pane) return;
	editId = null;
	draft = null;
	importCandidates = null;
	seidrBuildActionsTab(pane);
}

Seidr.refreshOpenActivityMenuIcons = refreshOpenActivityMenuIcons;
