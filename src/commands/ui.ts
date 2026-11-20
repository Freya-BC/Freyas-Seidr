/** Settings → Commands tab: People + Actions (Actions-tab style: dropdown + editor) */
import {
	SEIDR_CMD_ACTIONS_MAX,
	SEIDR_CMD_PEOPLE_MAX,
	seidrDefaultCmdAction,
	type SeidrCmdAction,
	type SeidrCmdPerson,
} from "./model";
import { seidrCmdListActivitiesForSlot, seidrCmdListSlots } from "./catalog";
import { seidrExportCommandsString, seidrParseCommandsImport } from "./io";
import {
	seidrAddCmdAction,
	seidrAddCmdPerson,
	seidrDeleteCmdAction,
	seidrDeleteCmdPerson,
	seidrImportSelectedCmdActions,
	seidrImportSelectedCmdPeople,
	seidrListCmdActions,
	seidrListCmdPeople,
	seidrUpsertCmdAction,
	seidrUpsertCmdPerson,
	type SeidrCmdActionImportRow,
	type SeidrCmdPersonImportRow,
} from "./store";
import { seidrCmdCss } from "./styles";
import {
	seidrBindImportPickerToolbar,
	seidrClassifyImportRows,
	seidrCollectImportSelection,
	seidrCopyExportText,
	seidrImportPickerHtml,
	type SeidrImportClassified,
} from "../io/importCompare";

let editPersonId: number | null = null;
let editActionId: number | null = null;
let draftPerson: SeidrCmdPerson | null = null;
let draftAction: SeidrCmdAction | null = null;
let importPeople: SeidrImportClassified<SeidrCmdPerson>[] | null = null;
let importActions: SeidrImportClassified<SeidrCmdAction>[] | null = null;

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
	// Always prefer the saved row for the selected id (avoids stale draft after swapping).
	let a: SeidrCmdAction | null = null;
	if (editActionId != null) {
		for (let i = 0; i < list.length; i++) {
			if (list[i].id === editActionId) {
				a = Object.assign({}, list[i]);
				break;
			}
		}
	}
	if (draftAction && a && draftAction.id === a.id) {
		// Keep in-progress edits for the same action only.
		a = Object.assign({}, a, {
			name: draftAction.name,
			slot: draftAction.slot,
			activity: draftAction.activity,
		});
	} else if (draftAction && !a && draftAction.id === editActionId) {
		a = Object.assign({}, draftAction);
	}
	draftAction = a;
	if (!a) {
		host.innerHTML = '<p class="seidr-settings-hint">Add an action or pick one from the list.</p>';
		return;
	}
	const slots = seidrCmdListSlots();
	const slot = a.slot || (slots[0] ? slots[0].id : "ItemTorso");
	const slotKnown = slots.some(function (s) { return s.id === slot; });
	const slotExtra = !slotKnown && slot
		? '<option value="' + escapeHtml(slot) + '">' + escapeHtml(slot) + " (saved)</option>"
		: "";
	const acts = seidrCmdListActivitiesForSlot(slot);
	const hasAct = !!(a.activity && acts.some(function (x) { return x.id === a!.activity; }));
	const actExtra = a.activity && !hasAct
		? '<option value="' + escapeHtml(a.activity) + '">' + escapeHtml(a.activity) + " (saved)</option>"
		: "";
	host.innerHTML = [
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Call name</span>',
		'<input type="text" id="seidr-cmd-action-name" maxlength="48" placeholder="Used in /a … name" value="' +
			escapeHtml(a.name) + '" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Slot</span>',
		'<select id="seidr-cmd-action-slot">' + slotExtra + opts(slots, "") + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Activity</span>',
		'<select id="seidr-cmd-action-activity">' +
		'<option value="">— pick activity —</option>' + actExtra + opts(acts, "") + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Slot first, then activities for that zone (Club / Seidr / mods). Item-tool activities are marked (item).</p>',
		'<div class="seidr-settings-row seidr-cmd-editor-actions">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-action-save">Save action</button>',
		'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-cmd-action-del">Delete</button>',
		"</div>",
	].join("");
	// Force values after build — HTML "selected" alone is flaky when swapping actions.
	const slotEl = host.querySelector("#seidr-cmd-action-slot") as HTMLSelectElement | null;
	const actEl = host.querySelector("#seidr-cmd-action-activity") as HTMLSelectElement | null;
	if (slotEl) slotEl.value = slot;
	if (actEl) actEl.value = a.activity || "";
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
		// Drop unsaved edits from the previous action; load the saved row.
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

function setIoMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-cmd-io-msg");
	if (el) el.textContent = text || "";
}

function renderCmdImportPicker(root: HTMLElement) {
	const host = root.querySelector("#seidr-cmd-import-pick") as HTMLElement | null;
	if (!host) return;
	const people = importPeople || [];
	const actions = importActions || [];
	if (!people.length && !actions.length) {
		host.innerHTML = "";
		host.hidden = true;
		return;
	}
	host.hidden = false;
	const sections = [];
	if (people.length) {
		sections.push({
			title: "People",
			sectionKey: "people",
			indexOffset: 0,
			rows: people as SeidrImportClassified<unknown>[],
		});
	}
	if (actions.length) {
		sections.push({
			title: "Actions",
			sectionKey: "actions",
			indexOffset: people.length,
			rows: actions as SeidrImportClassified<unknown>[],
		});
	}
	host.innerHTML = seidrImportPickerHtml({
		idPrefix: "seidr-cmd",
		hint: "People and Actions are selected separately. New/Different checked; Same unticked. Different rows can Overwrite or Add as new.",
		sections: sections,
	});
	seidrBindImportPickerToolbar(host);

	host.querySelector("#seidr-cmd-import-cancel")?.addEventListener("click", function () {
		importPeople = null;
		importActions = null;
		const paste = root.querySelector("#seidr-cmd-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		renderCmdImportPicker(root);
		setIoMsg(root, "");
	});

	host.querySelector("#seidr-cmd-import-do")?.addEventListener("click", function () {
		const picks = seidrCollectImportSelection(host);
		if (!picks.length) {
			setIoMsg(root, "Select at least one item");
			return;
		}
		const peopleRows: SeidrCmdPersonImportRow[] = [];
		const actionRows: SeidrCmdActionImportRow[] = [];
		const peopleLen = people.length;
		for (let i = 0; i < picks.length; i++) {
			const idx = picks[i].index;
			if (idx < peopleLen) {
				const row = people[idx];
				if (!row || row.status === "same") continue;
				const mode = row.status === "different" ? picks[i].mode : "add";
				peopleRows.push({
					person: row.item,
					mode: mode,
					localId: mode === "overwrite" ? row.localId : null,
				});
			} else {
				const row = actions[idx - peopleLen];
				if (!row || row.status === "same") continue;
				const mode = row.status === "different" ? picks[i].mode : "add";
				actionRows.push({
					action: row.item,
					mode: mode,
					localId: mode === "overwrite" ? row.localId : null,
				});
			}
		}
		if (!peopleRows.length && !actionRows.length) {
			setIoMsg(root, "Nothing to import (Same items are skipped)");
			return;
		}
		let imported = 0;
		let overwritten = 0;
		let skipped = 0;
		if (peopleRows.length) {
			const r = seidrImportSelectedCmdPeople(peopleRows);
			if (!r.ok) {
				setIoMsg(root, r.error || "People import failed");
				return;
			}
			imported += r.imported;
			overwritten += r.overwritten;
			skipped += r.skipped;
		}
		if (actionRows.length) {
			const r2 = seidrImportSelectedCmdActions(actionRows);
			if (!r2.ok) {
				setIoMsg(root, r2.error || "Actions import failed");
				return;
			}
			imported += r2.imported;
			overwritten += r2.overwritten;
			skipped += r2.skipped;
		}
		importPeople = null;
		importActions = null;
		const paste = root.querySelector("#seidr-cmd-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		const panel = root.querySelector("#seidr-cmd-import-panel") as HTMLElement | null;
		if (panel) panel.hidden = true;
		renderCmdImportPicker(root);
		editPersonId = null;
		editActionId = null;
		draftPerson = null;
		draftAction = null;
		refreshPeopleSection(root);
		refreshActionsSection(root);
		const bits: string[] = [];
		if (imported) bits.push("added " + imported);
		if (overwritten) bits.push("overwrote " + overwritten);
		if (skipped) bits.push("skipped " + skipped);
		setIoMsg(root, bits.length ? "Import: " + bits.join(", ") : "Import done");
	});
}

function bindCmdIoPanel(root: HTMLElement) {
	const exportOut = root.querySelector("#seidr-cmd-export-out") as HTMLTextAreaElement | null;
	const importPanel = root.querySelector("#seidr-cmd-import-panel") as HTMLElement | null;
	const importPaste = root.querySelector("#seidr-cmd-import-paste") as HTMLTextAreaElement | null;

	root.querySelector("#seidr-cmd-export")?.addEventListener("click", function () {
		try {
			const packed = seidrExportCommandsString();
			const exportPanel = root.querySelector("#seidr-cmd-export-panel") as HTMLElement | null;
			if (exportPanel) exportPanel.hidden = false;
			if (exportOut) {
				exportOut.value = packed;
				exportOut.focus();
				exportOut.select();
			}
			setIoMsg(root, "Export ready — copy the string below");
		} catch (e) {
			setIoMsg(root, e instanceof Error ? e.message : "Export failed");
		}
	});

	root.querySelector("#seidr-cmd-export-copy")?.addEventListener("click", function () {
		if (!exportOut || !exportOut.value) {
			setIoMsg(root, "Export first");
			return;
		}
		seidrCopyExportText(
			exportOut,
			function () { setIoMsg(root, "Copied to clipboard"); },
			function () {
				if (exportOut) {
					exportOut.focus();
					exportOut.select();
				}
				setIoMsg(root, "Select and copy manually (Ctrl/Cmd+C)");
			},
		);
	});

	root.querySelector("#seidr-cmd-import")?.addEventListener("click", function () {
		if (!importPanel) return;
		importPanel.hidden = !importPanel.hidden;
		if (!importPanel.hidden && importPaste) importPaste.focus();
		if (importPanel.hidden) {
			importPeople = null;
			importActions = null;
			renderCmdImportPicker(root);
		}
		setIoMsg(root, "");
	});

	root.querySelector("#seidr-cmd-import-parse")?.addEventListener("click", function () {
		const raw = importPaste ? importPaste.value : "";
		const parsed = seidrParseCommandsImport(raw);
		if (parsed.ok === false) {
			importPeople = null;
			importActions = null;
			renderCmdImportPicker(root);
			setIoMsg(root, parsed.error);
			return;
		}
		importPeople = seidrClassifyImportRows(
			parsed.people,
			seidrListCmdPeople(),
			function (p) { return p.alias; },
			function (p) { return p.id; },
			function (p) { return p.alias + " (" + p.memberNumber + ")"; },
		);
		importActions = seidrClassifyImportRows(
			parsed.actions,
			seidrListCmdActions(),
			function (a) { return a.name; },
			function (a) { return a.id; },
		);
		renderCmdImportPicker(root);
		setIoMsg(
			root,
			"Parsed " + parsed.people.length + " people, " + parsed.actions.length +
				" action(s) — select which to import",
		);
	});
}

export function seidrBuildCommandsTab(container: HTMLElement) {
	ensureCmdSettingsStyles();
	editPersonId = null;
	editActionId = null;
	draftPerson = null;
	draftAction = null;
	importPeople = null;
	importActions = null;
	container.innerHTML = [
		'<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-export">Export</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-import">Import</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-cmd-io-msg"></p>',
		'<div id="seidr-cmd-export-panel" hidden>',
		'<textarea id="seidr-cmd-export-out" class="seidr-act-io-text" rows="3" readonly></textarea>',
		'<div class="seidr-settings-row" style="gap:6px; margin-top:4px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-export-copy" title="Copy export string">Copy</button>',
		"</div>",
		"</div>",
		'<div id="seidr-cmd-import-panel" class="seidr-act-import-panel" hidden>',
		'<p class="seidr-settings-hint">Paste a SeidrCmd1: export string, then Parse.</p>',
		'<textarea id="seidr-cmd-import-paste" class="seidr-act-io-text" rows="3" placeholder="SeidrCmd1:…"></textarea>',
		'<div class="seidr-settings-row" style="gap:6px; margin-top:6px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-cmd-import-parse">Parse</button>',
		"</div>",
		'<div id="seidr-cmd-import-pick" hidden></div>',
		"</div>",
		'<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-section="cmd-people">',
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
		'<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-section="cmd-actions">',
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
	bindCmdIoPanel(container);
	refreshPeopleSection(container);
	refreshActionsSection(container);
}

export function seidrRefreshCommandsTab() {
	const pane = document.getElementById("seidr-settings-pane-commands");
	if (!pane) return;
	seidrBuildCommandsTab(pane);
}
