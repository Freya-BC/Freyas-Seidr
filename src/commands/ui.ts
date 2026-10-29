/** Settings → Commands tab: People + Actions (Actions-tab style: dropdown + editor) */
import {
	SEIDR_CMD_ACTIONS_MAX,
	SEIDR_CMD_PEOPLE_MAX,
	seidrDefaultCmdAction,
	type SeidrCmdAction,
	type SeidrCmdPerson,
} from "./model";
import { seidrCmdListActivitiesForSlot, seidrCmdListSlots } from "./catalog";
import {
	seidrAddCmdAction,
	seidrAddCmdPerson,
	seidrDeleteCmdAction,
	seidrDeleteCmdPerson,
	seidrListCmdActions,
	seidrListCmdPeople,
	seidrUpsertCmdAction,
	seidrUpsertCmdPerson,
} from "./store";
import { seidrCmdCss } from "./styles";

let editPersonId: number | null = null;
let editActionId: number | null = null;
let draftPerson: SeidrCmdPerson | null = null;
let draftAction: SeidrCmdAction | null = null;

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function ensureCmdSettingsStyles() {
	if (document.getElementById("seidr-cmd-styles")) return;
	const style = document.createElement("style");
	style.id = "seidr-cmd-styles";
	style.textContent = seidrCmdCss();
	(document.head || document.documentElement).appendChild(style);
}

function opts(list: { id: string; label: string }[], selected: string): string {
	return list.map(function (o) {
		return '<option value="' + escapeHtml(o.id) + '"' +
			(o.id === selected ? " selected" : "") + ">" +
			escapeHtml(o.label) + "</option>";
	}).join("");
}

function setMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-cmd-msg");
	if (el) el.textContent = text || "";
}

function personLabel(p: SeidrCmdPerson): string {
	const mn = p.memberNumber > 0 ? String(p.memberNumber) : "?";
	return (p.alias || ("person" + p.id)) + " · #" + mn;
}

function actionLabel(a: SeidrCmdAction): string {
	const act = a.activity || "(no activity)";
	return (a.name || ("action" + a.id)) + " · " + (a.slot || "?") + " · " + act;
}

function renderPeoplePicker(root: HTMLElement) {
	const pick = root.querySelector("#seidr-cmd-person-pick") as HTMLSelectElement | null;
	const cap = root.querySelector("#seidr-cmd-people-cap");
	const list = seidrListCmdPeople();
	if (cap) cap.textContent = list.length + "/" + SEIDR_CMD_PEOPLE_MAX + " People";
	if (!pick) return;
	if (!list.length) {
		pick.innerHTML = '<option value="">No people yet</option>';
		pick.disabled = true;
		return;
	}
	pick.disabled = false;
	const sel = editPersonId != null ? String(editPersonId) : "";
	pick.innerHTML = list.map(function (p) {
		return '<option value="' + p.id + '"' + (String(p.id) === sel ? " selected" : "") + ">" +
			escapeHtml(personLabel(p)) + "</option>";
	}).join("");
	if (editPersonId == null && list[0]) {
		editPersonId = list[0].id;
		pick.value = String(list[0].id);
	} else if (editPersonId != null) {
		pick.value = String(editPersonId);
	}
}

function renderPersonEditor(root: HTMLElement) {
	const host = root.querySelector("#seidr-cmd-person-editor") as HTMLElement | null;
	if (!host) return;
	const list = seidrListCmdPeople();
	let p = draftPerson;
	if (!p && editPersonId != null) {
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === editPersonId) {
				p = Object.assign({}, list[i]);
				draftPerson = p;
				break;
			}
		}
	}
	if (!p) {
		host.innerHTML = '<p class="seidr-settings-hint">Add a person or pick one from the list.</p>';
		return;
	}
	host.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Alias</span>',
		'<input type="text" id="seidr-cmd-person-alias" maxlength="48" placeholder="Short name for /a" value="' +
			escapeHtml(p.alias) + '" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Member ID</span>',
		'<input type="text" id="seidr-cmd-person-mn" inputmode="numeric" autocomplete="off" placeholder="e.g. 12345" value="' +
			(p.memberNumber > 0 ? String(p.memberNumber) : "") + '" />',
		"</div>",
		'<div class="seidr-settings-row seidr-cmd-editor-actions">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-person-save">Save person</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-cmd-person-del">Delete</button>',
		"</div>",
	].join("");
}

function renderActionsPicker(root: HTMLElement) {
	const pick = root.querySelector("#seidr-cmd-action-pick") as HTMLSelectElement | null;
	const cap = root.querySelector("#seidr-cmd-actions-cap");
	const list = seidrListCmdActions();
	if (cap) cap.textContent = list.length + "/" + SEIDR_CMD_ACTIONS_MAX + " Actions";
	if (!pick) return;
	if (!list.length) {
		pick.innerHTML = '<option value="">No actions yet</option>';
		pick.disabled = true;
		return;
	}
	pick.disabled = false;
	const sel = editActionId != null ? String(editActionId) : "";
	pick.innerHTML = list.map(function (a) {
		return '<option value="' + a.id + '"' + (String(a.id) === sel ? " selected" : "") + ">" +
			escapeHtml(actionLabel(a)) + "</option>";
	}).join("");
	if (editActionId == null && list[0]) {
		editActionId = list[0].id;
		pick.value = String(list[0].id);
	} else if (editActionId != null) {
		pick.value = String(editActionId);
	}
}

function renderActionEditor(root: HTMLElement) {
	const host = root.querySelector("#seidr-cmd-action-editor") as HTMLElement | null;
	if (!host) return;
	const list = seidrListCmdActions();
	let a = draftAction;
	if (!a && editActionId != null) {
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === editActionId) {
				a = Object.assign({}, list[i]);
				draftAction = a;
				break;
			}
		}
	}
	if (!a) {
		host.innerHTML = '<p class="seidr-settings-hint">Add an action or pick one from the list.</p>';
		return;
	}
	const slots = seidrCmdListSlots();
	const slot = a.slot || (slots[0] ? slots[0].id : "ItemTorso");
	const acts = seidrCmdListActivitiesForSlot(slot);
	const hasAct = acts.some(function (x) { return x.id === a!.activity; });
	const extra = !hasAct && a.activity
		? '<option value="' + escapeHtml(a.activity) + '" selected>' + escapeHtml(a.activity) + " (saved)</option>"
		: "";
	const emptyOpt = !a.activity
		? '<option value="" selected>— pick activity —</option>'
		: '<option value="">— pick activity —</option>';
	host.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Call name</span>',
		'<input type="text" id="seidr-cmd-action-name" maxlength="48" placeholder="Used in /a … name" value="' +
			escapeHtml(a.name) + '" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Slot</span>',
		'<select id="seidr-cmd-action-slot">' + opts(slots, slot) + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Activity</span>',
		'<select id="seidr-cmd-action-activity">' + emptyOpt + extra + opts(acts, a.activity || "") + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Slot first, then activities available for that zone (Club / Seidr / mods).</p>',
		'<div class="seidr-settings-row seidr-cmd-editor-actions">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-action-save">Save action</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-cmd-action-del">Delete</button>',
		"</div>",
	].join("");
}

function readPersonDraft(root: HTMLElement): SeidrCmdPerson | null {
	if (editPersonId == null) return null;
	const alias = (root.querySelector("#seidr-cmd-person-alias") as HTMLInputElement | null)?.value || "";
	const mnRaw = (root.querySelector("#seidr-cmd-person-mn") as HTMLInputElement | null)?.value || "";
	const digits = String(mnRaw).replace(/[^\d]/g, "");
	return {
		id: editPersonId,
		alias: alias.trim(),
		memberNumber: digits ? parseInt(digits, 10) : 0,
	};
}

function readActionDraft(root: HTMLElement): SeidrCmdAction | null {
	if (editActionId == null) return null;
	return {
		id: editActionId,
		name: ((root.querySelector("#seidr-cmd-action-name") as HTMLInputElement | null)?.value || "").trim(),
		slot: ((root.querySelector("#seidr-cmd-action-slot") as HTMLSelectElement | null)?.value || "ItemTorso").trim(),
		activity: ((root.querySelector("#seidr-cmd-action-activity") as HTMLSelectElement | null)?.value || "").trim(),
	};
}

function syncPersonDraftFromDom(root: HTMLElement) {
	const d = readPersonDraft(root);
	if (d) draftPerson = d;
}

function syncActionDraftFromDom(root: HTMLElement) {
	const d = readActionDraft(root);
	if (d) draftAction = d;
}

function refreshPeopleSection(root: HTMLElement) {
	renderPeoplePicker(root);
	// Picker was replaced via innerHTML — clear bind flag
	const pick = root.querySelector("#seidr-cmd-person-pick") as HTMLSelectElement | null;
	if (pick) delete (pick as any).__seidrBound;
	renderPersonEditor(root);
	bindPeople(root);
}

function refreshActionsSection(root: HTMLElement) {
	renderActionsPicker(root);
	const pick = root.querySelector("#seidr-cmd-action-pick") as HTMLSelectElement | null;
	if (pick) delete (pick as any).__seidrBound;
	renderActionEditor(root);
	bindActions(root);
}

function bindPeoplePicker(root: HTMLElement) {
	const pick = root.querySelector("#seidr-cmd-person-pick") as HTMLSelectElement | null;
	if (!pick || (pick as any).__seidrBound) return;
	(pick as any).__seidrBound = true;
	pick.addEventListener("change", function () {
		const id = parseInt(pick.value || "0", 10);
		if (!id) return;
		editPersonId = id;
		draftPerson = null;
		const list = seidrListCmdPeople();
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === id) {
				draftPerson = Object.assign({}, list[i]);
				break;
			}
		}
		renderPersonEditor(root);
		bindPeopleEditorOnly(root);
	});
}

function bindPeople(root: HTMLElement) {
	bindPeoplePicker(root);
	bindPeopleEditorOnly(root);
}

function bindPeopleEditorOnly(root: HTMLElement) {
	root.querySelector("#seidr-cmd-person-save")?.addEventListener("click", function () {
		syncPersonDraftFromDom(root);
		if (!draftPerson) return;
		const r = seidrUpsertCmdPerson(draftPerson);
		setMsg(root, r.ok ? "Person saved" : (r.error || "Save failed"));
		if (r.ok && r.person) {
			editPersonId = r.person.id;
			draftPerson = Object.assign({}, r.person);
			refreshPeopleSection(root);
		}
	});
	root.querySelector("#seidr-cmd-person-del")?.addEventListener("click", function () {
		if (editPersonId == null) return;
		const id = editPersonId;
		const r = seidrDeleteCmdPerson(id);
		setMsg(root, r.ok ? "Person deleted" : (r.error || "Delete failed"));
		if (r.ok) {
			editPersonId = null;
			draftPerson = null;
			refreshPeopleSection(root);
		}
	});
}

function bindActionsPicker(root: HTMLElement) {
	const pick = root.querySelector("#seidr-cmd-action-pick") as HTMLSelectElement | null;
	if (!pick || (pick as any).__seidrBound) return;
	(pick as any).__seidrBound = true;
	pick.addEventListener("change", function () {
		const id = parseInt(pick.value || "0", 10);
		if (!id) return;
		editActionId = id;
		draftAction = null;
		const list = seidrListCmdActions();
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === id) {
				draftAction = Object.assign({}, list[i]);
				break;
			}
		}
		renderActionEditor(root);
		bindActionsEditorOnly(root);
	});
}

function bindActions(root: HTMLElement) {
	bindActionsPicker(root);
	bindActionsEditorOnly(root);
}

function bindActionsEditorOnly(root: HTMLElement) {
	root.querySelector("#seidr-cmd-action-slot")?.addEventListener("change", function () {
		syncActionDraftFromDom(root);
		if (!draftAction) return;
		const slot = ((root.querySelector("#seidr-cmd-action-slot") as HTMLSelectElement)?.value) || "ItemTorso";
		draftAction.slot = slot;
		const acts = seidrCmdListActivitiesForSlot(slot);
		if (!acts.some(function (x) { return x.id === draftAction!.activity; })) {
			draftAction.activity = "";
		}
		renderActionEditor(root);
		bindActionsEditorOnly(root);
	});
	root.querySelector("#seidr-cmd-action-save")?.addEventListener("click", function () {
		syncActionDraftFromDom(root);
		if (!draftAction) return;
		const r = seidrUpsertCmdAction(draftAction);
		setMsg(root, r.ok ? "Action saved" : (r.error || "Save failed"));
		if (r.ok && r.action) {
			editActionId = r.action.id;
			draftAction = Object.assign({}, r.action);
			refreshActionsSection(root);
		}
	});
	root.querySelector("#seidr-cmd-action-del")?.addEventListener("click", function () {
		if (editActionId == null) return;
		const id = editActionId;
		const r = seidrDeleteCmdAction(id);
		setMsg(root, r.ok ? "Action deleted" : (r.error || "Delete failed"));
		if (r.ok) {
			editActionId = null;
			draftAction = null;
			refreshActionsSection(root);
		}
	});
}

export function seidrBuildCommandsTab(container: HTMLElement) {
	ensureCmdSettingsStyles();
	editPersonId = null;
	editActionId = null;
	draftPerson = null;
	draftAction = null;
	container.innerHTML = [
		'<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-tour="cmd-people">',
		"<summary>People</summary>",
		'<p class="seidr-settings-hint">Alias → Member ID for /a targets and name collisions. Max ' +
			SEIDR_CMD_PEOPLE_MAX + ".</p>",
		'<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-add-person">Add person</button>',
		'<span class="seidr-settings-hint" id="seidr-cmd-people-cap">0/' + SEIDR_CMD_PEOPLE_MAX + " People</span>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Person</span>',
		'<select id="seidr-cmd-person-pick"></select>',
		"</div>",
		'<div class="seidr-act-editor" id="seidr-cmd-person-editor"></div>',
		"</details>",
		'<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-tour="cmd-actions">',
		"<summary>Actions</summary>",
		'<p class="seidr-settings-hint">Call name → slot + Club/Seidr/mod activity. Usage: /a &lt;member&gt; &lt;name&gt;. Max ' +
			SEIDR_CMD_ACTIONS_MAX + ".</p>",
		'<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-add-action">Add action</button>',
		'<span class="seidr-settings-hint" id="seidr-cmd-actions-cap">0/' + SEIDR_CMD_ACTIONS_MAX + " Actions</span>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Action</span>',
		'<select id="seidr-cmd-action-pick"></select>',
		"</div>",
		'<div class="seidr-act-editor" id="seidr-cmd-action-editor"></div>',
		"</details>",
		'<p class="seidr-cmd-msg" id="seidr-cmd-msg"></p>',
		'<p class="seidr-settings-hint">Tab in chat on /a … for autocomplete (W/S or arrows, E/Enter, Esc).</p>',
	].join("");
	container.querySelector("#seidr-cmd-add-person")?.addEventListener("click", function () {
		const created = seidrAddCmdPerson();
		if (!created) {
			setMsg(container, "People limit reached (" + SEIDR_CMD_PEOPLE_MAX + ")");
			return;
		}
		editPersonId = created.id;
		draftPerson = Object.assign({}, created);
		setMsg(container, "Person added — set alias and Member ID, then Save");
		refreshPeopleSection(container);
	});
	container.querySelector("#seidr-cmd-add-action")?.addEventListener("click", function () {
		const created = seidrAddCmdAction();
		if (!created) {
			setMsg(container, "Action limit reached (" + SEIDR_CMD_ACTIONS_MAX + ")");
			return;
		}
		editActionId = created.id;
		draftAction = Object.assign({}, seidrDefaultCmdAction(created.id), created);
		setMsg(container, "Action added — set call name, slot, and activity, then Save");
		refreshActionsSection(container);
	});
	refreshPeopleSection(container);
	refreshActionsSection(container);
}

export function seidrRefreshCommandsTab() {
	const pane = document.getElementById("seidr-settings-pane-commands");
	if (!pane) return;
	seidrBuildCommandsTab(pane);
}
