/** Settings → Maps tab */
import {
	rmCanApplyToRoom,
	rmIsAdmin,
	rmMapModeActive,
} from "./roomApply";
import {
	rmDefaultVersionId,
	rmDeleteMap,
	rmDeleteVersion,
	rmExportMapsJson,
	rmImportSelectedMaps,
	rmListAllMaps,
	rmListVersions,
	rmLoadMapVersion,
	rmLocalMapsStats,
	rmOverwriteDefault,
	rmParseMapsImport,
	rmRenameMap,
	rmRenameVersion,
	rmSaveNewMap,
	rmSaveNewVersion,
	rmSetMapLocation,
	type RmMapsImportCandidate,
} from "./maps";
import { rmFormatBytes, rmMapBudgetBytes, rmMapsBytesEstimate } from "./storage";
import {
	RM_MAP_DEFAULT_NAME,
	rmIsDefaultVersionName,
	type RmMapLocation,
	type RmMapSeries,
} from "./model";

let editMapId: string | null = null;
let editVersionId: string | null = null;
let importCandidates: RmMapsImportCandidate[] | null = null;
let importFileName = "";

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function setMsg(root: HTMLElement, text: string) {
	const el = root.querySelector("#seidr-maps-msg");
	if (el) el.textContent = text || "";
}

function inMapRoom(): boolean {
	return rmMapModeActive();
}

function canLoad(): boolean {
	return rmCanApplyToRoom() && rmIsAdmin() && inMapRoom();
}

function updateStorageHint(root: HTMLElement) {
	const el = root.querySelector("#seidr-maps-storage");
	if (!el) return;
	const remoteBytes = rmMapsBytesEstimate();
	const budget = rmMapBudgetBytes();
	const local = rmLocalMapsStats();
	el.textContent =
		"Remote Default " + rmFormatBytes(remoteBytes) + " / " + rmFormatBytes(budget) +
		" (75% budget) · " + local.label;
}

function selectedMap(): RmMapSeries | null {
	if (!editMapId) return null;
	return rmListAllMaps().find(function (m) { return m.id === editMapId; }) || null;
}

function renderMapSection(root: HTMLElement) {
	const host = root.querySelector("#seidr-maps-map-body") as HTMLElement | null;
	if (!host) return;
	updateStorageHint(root);
	const maps = rmListAllMaps();
	const mapActive = inMapRoom();
	const saveDisabled = mapActive ? "" : " disabled";

	if (editMapId && !maps.some(function (m) { return m.id === editMapId; })) {
		editMapId = null;
		editVersionId = null;
	}
	if (!editMapId && maps.length) {
		editMapId = maps[0].id;
		editVersionId = rmDefaultVersionId(editMapId);
	}

	const map = selectedMap();
	const loadOk = canLoad();
	const versionSaveDisabled = mapActive && map ? "" : " disabled";
	const loadDisabled = loadOk && map ? "" : " disabled";

	const pickOpts = maps.length
		? maps.map(function (m) {
			const loc = m.location === "local" ? "Local" : "Remote";
			const n = m.versions.length;
			return (
				'<option value="' + escapeHtml(m.id) + '"' +
				(m.id === editMapId ? " selected" : "") + ">" +
				escapeHtml(m.name) + " (" + loc + ", " + n + "v)</option>"
			);
		}).join("")
		: '<option value="">No maps yet</option>';

	let editorHtml = "";
	if (!map) {
		editorHtml = [
			'<p class="seidr-settings-hint">Save the current map room to create a map (version is always Default).</p>',
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">New name</span>',
			'<input type="text" id="seidr-maps-new-name" maxlength="48" placeholder="Map name" />',
			"</div>",
			'<div class="seidr-settings-row" style="margin-top:10px; gap:6px; display:flex; flex-wrap:wrap;">',
			'<button type="button" class="seidr-act-btn" id="seidr-maps-save-new"' + saveDisabled + ">Save as new map</button>",
			"</div>",
		].join("");
	} else {
		const vers = rmListVersions(map.id);
		if (!editVersionId || !vers.some(function (v) { return v.id === editVersionId; })) {
			editVersionId = rmDefaultVersionId(map.id);
		}
		const verOpts = vers.map(function (v) {
			const when = v.savedAt ? new Date(v.savedAt).toLocaleString() : "";
			const tag = rmIsDefaultVersionName(v.name) ? " · remote-capable" : " · local only";
			return (
				'<option value="' + escapeHtml(v.id) + '"' +
				(v.id === editVersionId ? " selected" : "") + ">" +
				escapeHtml(v.name) + tag + (when ? " · " + escapeHtml(when) : "") + "</option>"
			);
		}).join("");
		const curVer = vers.find(function (v) { return v.id === editVersionId; });
		const locLocal = map.location === "local";
		const curIsDefault = curVer ? rmIsDefaultVersionName(curVer.name) : false;

		editorHtml = [
			'<div class="seidr-settings-field-row">',
			'<span class="seidr-settings-field-label">Map</span>',
			'<select id="seidr-maps-pick">' + pickOpts + "</select>",
			"</div>",
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Name</span>',
			'<input type="text" id="seidr-maps-name" maxlength="48" value="' + escapeHtml(map.name) + '" />',
			"</div>",
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Location</span>',
			'<div class="seidr-map-loc-btns">',
			'<button type="button" class="seidr-act-btn seidr-map-loc-btn' + (locLocal ? "" : " seidr-map-loc-on") +
			'" data-seidr-map-loc="remote">Remote</button>',
			'<button type="button" class="seidr-act-btn seidr-map-loc-btn' + (locLocal ? " seidr-map-loc-on" : "") +
			'" data-seidr-map-loc="local">Local only</button>',
			"</div>",
			"</div>",
			'<p class="seidr-settings-hint">' +
			(locLocal
				? "Default stays in this browser. Extra versions are always local."
				: "Only Default syncs to the server. Other versions stay local.") +
			"</p>",
			'<div class="seidr-settings-field-row" style="margin-top:10px;">',
			'<span class="seidr-settings-field-label">Version</span>',
			'<select id="seidr-maps-ver-pick">' + verOpts + "</select>",
			"</div>",
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">Ver. name</span>',
			'<input type="text" id="seidr-maps-ver-name" maxlength="48" value="' +
			escapeHtml(curVer ? curVer.name : "") + '"' +
			(curIsDefault ? " disabled title=\"Default cannot be renamed\"" : "") + " />",
			"</div>",
			'<div class="seidr-settings-row" style="margin-top:10px; gap:6px; display:flex; flex-wrap:wrap;">',
			'<button type="button" class="seidr-act-btn" id="seidr-maps-save-meta">Save names</button>',
			'<button type="button" class="seidr-act-btn" id="seidr-maps-load"' + loadDisabled + ">Load version</button>",
			'<button type="button" class="seidr-act-btn" id="seidr-maps-overwrite"' + versionSaveDisabled +
			">Overwrite Default</button>",
			'<button type="button" class="seidr-act-btn" id="seidr-maps-add-ver"' + versionSaveDisabled +
			">Save new version</button>",
			'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-maps-del-ver">Delete version</button>',
			'<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-maps-del-map">Delete map</button>',
			"</div>",
			'<hr class="seidr-maps-hr" />',
			'<p class="seidr-settings-hint">Create another map from the current room (always starts as Default):</p>',
			'<div class="seidr-settings-field-row" style="margin-top:8px;">',
			'<span class="seidr-settings-field-label">New name</span>',
			'<input type="text" id="seidr-maps-new-name" maxlength="48" placeholder="Map name" />',
			"</div>",
			'<div class="seidr-settings-row" style="margin-top:8px; gap:6px; display:flex; flex-wrap:wrap;">',
			'<button type="button" class="seidr-act-btn" id="seidr-maps-save-new"' + saveDisabled + ">Save as new map</button>",
			"</div>",
		].join("");

		if (!maps.length) {
			/* unreachable when map exists */
		}
	}

	if (maps.length && map) {
		host.innerHTML = editorHtml;
	} else if (maps.length && !map) {
		host.innerHTML = [
			'<div class="seidr-settings-field-row">',
			'<span class="seidr-settings-field-label">Map</span>',
			'<select id="seidr-maps-pick">' + pickOpts + "</select>",
			"</div>",
			editorHtml,
		].join("");
	} else {
		host.innerHTML = editorHtml;
	}

	wireMapSection(root);
}

function refreshExport(root: HTMLElement) {
	const ta = root.querySelector("#seidr-maps-export") as HTMLTextAreaElement | null;
	if (ta) ta.value = rmExportMapsJson();
}

function updateFileLabel(root: HTMLElement) {
	const el = root.querySelector("#seidr-maps-import-file-label");
	if (el) el.textContent = importFileName || "No file chosen";
}

function renderImportPicker(root: HTMLElement) {
	const host = root.querySelector("#seidr-maps-import-pick") as HTMLElement | null;
	if (!host) return;
	if (!importCandidates || !importCandidates.length) {
		host.innerHTML = "";
		host.hidden = true;
		return;
	}
	host.hidden = false;
	const rows = importCandidates.map(function (m, idx) {
		const n = m.versions.length;
		return (
			'<label class="seidr-act-import-row">' +
			'<input type="checkbox" data-import-idx="' + idx + '" checked /> ' +
			escapeHtml(m.name) + " (" + n + " version" + (n === 1 ? "" : "s") + ")" +
			"</label>"
		);
	}).join("");
	host.innerHTML = [
		'<p class="seidr-settings-hint">Select maps to import (always Local only).</p>',
		'<div class="seidr-act-import-list">' + rows + "</div>",
		'<div class="seidr-settings-row" style="margin-top:8px; gap:6px; display:flex; flex-wrap:wrap;">',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-import-do">Import selected</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-import-cancel">Cancel</button>',
		"</div>",
	].join("");

	host.querySelector("#seidr-maps-import-cancel")?.addEventListener("click", function () {
		importCandidates = null;
		const paste = root.querySelector("#seidr-maps-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		renderImportPicker(root);
		setMsg(root, "");
	});

	host.querySelector("#seidr-maps-import-do")?.addEventListener("click", function () {
		if (!importCandidates) return;
		const selected: RmMapsImportCandidate[] = [];
		host.querySelectorAll("[data-import-idx]").forEach(function (el) {
			const cb = el as HTMLInputElement;
			if (!cb.checked) return;
			const idx = parseInt(cb.getAttribute("data-import-idx") || "", 10);
			if (Number.isFinite(idx) && importCandidates![idx]) selected.push(importCandidates![idx]);
		});
		if (!selected.length) {
			setMsg(root, "Select at least one map");
			return;
		}
		const result = rmImportSelectedMaps(selected);
		if (!result.ok && !result.imported) {
			setMsg(root, result.error || "Import failed");
			return;
		}
		importCandidates = null;
		const paste = root.querySelector("#seidr-maps-import-paste") as HTMLTextAreaElement | null;
		if (paste) paste.value = "";
		renderImportPicker(root);
		refreshAll(root);
		setMsg(root, result.error || ("Imported " + result.imported + " map(s) as Local only"));
	});
}

function wireMapSection(root: HTMLElement) {
	root.querySelector("#seidr-maps-pick")?.addEventListener("change", function () {
		const pick = root.querySelector("#seidr-maps-pick") as HTMLSelectElement | null;
		editMapId = pick && pick.value ? pick.value : null;
		editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
		renderMapSection(root);
	});

	root.querySelector("#seidr-maps-save-new")?.addEventListener("click", function () {
		const nameEl = root.querySelector("#seidr-maps-new-name") as HTMLInputElement | null;
		const name = (nameEl && nameEl.value) || "";
		if (!String(name).trim()) {
			setMsg(root, "Enter a map name");
			return;
		}
		const r = rmSaveNewMap(name);
		if (!r.ok) {
			setMsg(root, r.error || "Save failed");
			return;
		}
		editMapId = r.map ? r.map.id : null;
		editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
		refreshAll(root);
		setMsg(root, r.fellBackLocal
			? "Saved as Local only (remote full or over budget). Default version created."
			: "Map saved with Default (" + (r.map && r.map.location === "local" ? "Local" : "Remote") + ")");
	});

	root.querySelector("#seidr-maps-ver-pick")?.addEventListener("change", function () {
		const sel = root.querySelector("#seidr-maps-ver-pick") as HTMLSelectElement | null;
		editVersionId = sel && sel.value ? sel.value : null;
		renderMapSection(root);
	});

	root.querySelector("#seidr-maps-save-meta")?.addEventListener("click", function () {
		if (!editMapId) return;
		const nameEl = root.querySelector("#seidr-maps-name") as HTMLInputElement | null;
		const verNameEl = root.querySelector("#seidr-maps-ver-name") as HTMLInputElement | null;
		const r1 = rmRenameMap(editMapId, (nameEl && nameEl.value) || "");
		if (!r1.ok) {
			setMsg(root, r1.error || "Rename failed");
			return;
		}
		const map = selectedMap();
		const ver = map && editVersionId
			? map.versions.find(function (v) { return v.id === editVersionId; })
			: null;
		if (editVersionId && verNameEl && ver && !rmIsDefaultVersionName(ver.name)) {
			const r2 = rmRenameVersion(editMapId, editVersionId, verNameEl.value);
			if (!r2.ok) {
				setMsg(root, r2.error || "Version rename failed");
				return;
			}
		}
		refreshAll(root);
		setMsg(root, "Saved names");
	});

	root.querySelectorAll("[data-seidr-map-loc]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			if (!editMapId) return;
			const loc = (btn as HTMLElement).getAttribute("data-seidr-map-loc") as RmMapLocation | null;
			if (loc !== "local" && loc !== "remote") return;
			const r = rmSetMapLocation(editMapId, loc);
			if (!r.ok) {
				setMsg(root, r.error || "Move failed");
				return;
			}
			refreshAll(root);
			setMsg(root, loc === "local"
				? "Default moved to Local only"
				: "Default moved to Remote (extra versions stay local)");
		});
	});

	root.querySelector("#seidr-maps-load")?.addEventListener("click", function () {
		if (!editMapId || !editVersionId) return;
		const map = selectedMap();
		const ver = map && map.versions.find(function (v) { return v.id === editVersionId; });
		if (!confirm("Load version “" + (ver ? ver.name : "") + "” into this room?")) return;
		const r = rmLoadMapVersion(editMapId, editVersionId);
		setMsg(root, r.ok ? "Map version loaded" : (r.error || "Load failed"));
	});

	root.querySelector("#seidr-maps-overwrite")?.addEventListener("click", function () {
		if (!editMapId) return;
		if (!confirm("Overwrite Default with the current room map?")) return;
		const r = rmOverwriteDefault(editMapId);
		if (!r.ok) {
			setMsg(root, r.error || "Overwrite failed");
			return;
		}
		editVersionId = r.version ? r.version.id : rmDefaultVersionId(editMapId);
		refreshAll(root);
		setMsg(root, "Default overwritten");
	});

	root.querySelector("#seidr-maps-add-ver")?.addEventListener("click", function () {
		if (!editMapId) return;
		const verNameEl = root.querySelector("#seidr-maps-ver-name") as HTMLInputElement | null;
		let verName = (verNameEl && verNameEl.value.trim()) || "";
		if (!verName || verName === RM_MAP_DEFAULT_NAME) {
			verName = window.prompt("Local version name (not Default):", "Development") || "";
		}
		if (!verName.trim()) {
			setMsg(root, "Enter a version name");
			return;
		}
		if (verName.trim() === RM_MAP_DEFAULT_NAME) {
			setMsg(root, "Use Overwrite Default to update Default");
			return;
		}
		const r = rmSaveNewVersion(editMapId, verName);
		if (!r.ok) {
			setMsg(root, r.error || "Save version failed");
			return;
		}
		editVersionId = r.version ? r.version.id : null;
		refreshAll(root);
		setMsg(root, "Local version saved");
	});

	root.querySelector("#seidr-maps-del-ver")?.addEventListener("click", function () {
		if (!editMapId || !editVersionId) return;
		const map = selectedMap();
		const ver = map && map.versions.find(function (v) { return v.id === editVersionId; });
		const isDef = ver && rmIsDefaultVersionName(ver.name);
		const only = map && map.versions.length <= 1;
		const msg = isDef && only
			? "Delete the entire map?"
			: isDef
				? "Cannot delete Default while other versions exist. Delete the map instead?"
				: "Delete this local version?";
		if (isDef && !only) {
			setMsg(root, "Cannot delete Default while other versions exist — use Delete map");
			return;
		}
		if (!confirm(msg)) return;
		const r = rmDeleteVersion(editMapId, editVersionId);
		if (!r.ok) {
			setMsg(root, r.error || "Delete failed");
			return;
		}
		if (only || isDef) {
			editMapId = null;
			editVersionId = null;
		} else {
			editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
		}
		refreshAll(root);
		setMsg(root, only || isDef ? "Map deleted" : "Version deleted");
	});

	root.querySelector("#seidr-maps-del-map")?.addEventListener("click", function () {
		if (!editMapId) return;
		const map = selectedMap();
		if (!confirm("Delete map “" + (map ? map.name : "") + "” and all versions?")) return;
		const r = rmDeleteMap(editMapId);
		if (!r.ok) {
			setMsg(root, r.error || "Delete failed");
			return;
		}
		editMapId = null;
		editVersionId = null;
		refreshAll(root);
		setMsg(root, "Map deleted");
	});
}

function wireIo(root: HTMLElement) {
	root.querySelector("#seidr-maps-export-refresh")?.addEventListener("click", function () {
		refreshExport(root);
		setMsg(root, "Export refreshed");
	});
	root.querySelector("#seidr-maps-export-copy")?.addEventListener("click", function () {
		refreshExport(root);
		const ta = root.querySelector("#seidr-maps-export") as HTMLTextAreaElement | null;
		if (!ta) return;
		try {
			ta.select();
			document.execCommand("copy");
			setMsg(root, "Copied JSON");
		} catch (e) {
			setMsg(root, "Copy failed — select and copy manually");
		}
	});
	root.querySelector("#seidr-maps-export-dl")?.addEventListener("click", function () {
		refreshExport(root);
		const json = rmExportMapsJson();
		try {
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "seidr-maps-export.json";
			a.click();
			URL.revokeObjectURL(url);
			setMsg(root, "Download started");
		} catch (e) {
			setMsg(root, "Download failed");
		}
	});

	root.querySelector("#seidr-maps-import-parse")?.addEventListener("click", function () {
		const paste = root.querySelector("#seidr-maps-import-paste") as HTMLTextAreaElement | null;
		const parsed = rmParseMapsImport(paste ? paste.value : "");
		if (parsed.ok === false) {
			importCandidates = null;
			renderImportPicker(root);
			setMsg(root, parsed.error);
			return;
		}
		importCandidates = parsed.maps;
		renderImportPicker(root);
		setMsg(root, "Select maps to import");
	});

	const file = root.querySelector("#seidr-maps-import-file") as HTMLInputElement | null;
	root.querySelector("#seidr-maps-import-choose")?.addEventListener("click", function () {
		file?.click();
	});
	if (file) {
		file.addEventListener("change", function () {
			const f = file.files && file.files[0];
			if (!f) {
				importFileName = "";
				updateFileLabel(root);
				return;
			}
			importFileName = f.name;
			updateFileLabel(root);
			const reader = new FileReader();
			reader.onload = function () {
				const text = typeof reader.result === "string" ? reader.result : "";
				const paste = root.querySelector("#seidr-maps-import-paste") as HTMLTextAreaElement | null;
				if (paste) paste.value = text;
				const parsed = rmParseMapsImport(text);
				if (parsed.ok === false) {
					importCandidates = null;
					renderImportPicker(root);
					setMsg(root, parsed.error);
					return;
				}
				importCandidates = parsed.maps;
				renderImportPicker(root);
				setMsg(root, "Select maps to import");
			};
			reader.onerror = function () {
				setMsg(root, "Could not read file");
			};
			reader.readAsText(f);
			file.value = "";
		});
	}
}

function refreshAll(root: HTMLElement) {
	renderMapSection(root);
	refreshExport(root);
	updateStorageHint(root);
	updateFileLabel(root);
}

export function seidrRefreshMapsTab(container?: HTMLElement | null) {
	const root = container || document.getElementById("seidr-settings-pane-maps");
	if (!root) return;
	refreshAll(root as HTMLElement);
}

export function seidrBuildMapsTab(container: HTMLElement) {
	editMapId = null;
	editVersionId = null;
	importCandidates = null;
	importFileName = "";
	const mapActive = inMapRoom();
	container.innerHTML = [
		'<p class="seidr-settings-hint">Map library with versions. Only <strong>Default</strong> can sync remotely; other versions stay in this browser. Imports are always Local only.</p>',
		'<p class="seidr-settings-hint" id="seidr-maps-storage"></p>',
		'<p class="seidr-settings-hint" id="seidr-maps-msg"></p>',
		mapActive
			? ""
			: '<p class="seidr-settings-hint">Save / new version needs an active map room.</p>',
		'<details class="seidr-settings-sec" open>',
		"<summary>Map</summary>",
		'<div id="seidr-maps-map-body" style="margin-top:8px;"></div>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Export / Import</summary>",
		'<div class="seidr-settings-row" style="gap:6px;display:flex;flex-wrap:wrap;margin-top:8px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-export-refresh">Refresh export</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-export-copy">Copy JSON</button>',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-export-dl">Download JSON</button>',
		"</div>",
		'<textarea class="seidr-act-io-text" id="seidr-maps-export" rows="6" readonly></textarea>',
		'<p class="seidr-settings-hint" style="margin-top:10px;">Import JSON (file or paste). Imported maps are Local only.</p>',
		'<div class="seidr-maps-file-row">',
		'<input type="file" id="seidr-maps-import-file" accept="application/json,.json,text/plain" hidden />',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-import-choose">Choose file…</button>',
		'<span class="seidr-maps-file-name" id="seidr-maps-import-file-label">No file chosen</span>',
		"</div>",
		'<textarea class="seidr-act-io-text" id="seidr-maps-import-paste" rows="4" placeholder="Paste SeidrMaps JSON…"></textarea>',
		'<div class="seidr-settings-row" style="margin-top:8px;">',
		'<button type="button" class="seidr-act-btn" id="seidr-maps-import-parse">Parse import</button>',
		"</div>",
		'<div class="seidr-act-import-panel" id="seidr-maps-import-pick" hidden></div>',
		"</details>",
	].join("");
	wireIo(container);
	refreshAll(container);
}
