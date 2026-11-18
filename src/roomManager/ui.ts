/** Room Manager panel body — four areas + dialogs */
import { Seidr } from "../seidr";
import { rmGetStore, rmSaveStore, rmUsageLabel } from "./storage";
import {
	rmReadSettings,
	rmSliceRoom,
	rmSliceAccess,
	rmApplyRoomToEditor,
	rmApplyAccessToEditor,
	rmUpdateLiveRoom,
	rmInLiveRoom,
	rmMapModeActive,
	rmCanApplyToRoom,
	rmSetLastRoomPreset,
} from "./roomApply";
import {
	rmListBackgrounds,
	rmSaveBackground,
	rmApplyBackgroundEntry,
	rmDeleteBackground,
	rmReorderBackgrounds,
} from "./backgrounds";
import {
	rmDefaultVersionId,
	rmDeleteMap,
	rmDeleteVersion,
	rmLatestVersionId,
	rmListAllMaps,
	rmListVersions,
	rmLoadMapVersion,
	rmOverwriteDefault,
	rmSaveNewMap,
	rmSaveNewVersion,
} from "./maps";
import {
	RM_MAP_DEFAULT_NAME,
	rmFillModeLabel,
	rmIsDefaultVersionName,
	rmNormalizeBgFillMode,
	rmNormalizeRoomPreset,
	type RmBgFillMode,
	type RmBackgroundEntry,
	type RmRoomPreset,
} from "./model";
import { rmEnsurePreview } from "./preview";
import { rmConfirm, rmPrompt } from "./dialogs";

let msgTimer: ReturnType<typeof setTimeout> | null = null;

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

function setMsg(text: string) {
	const el = $("seidr-rm-msg");
	if (el) el.textContent = text || "";
	if (msgTimer) clearTimeout(msgTimer);
	if (text) {
		msgTimer = setTimeout(function () {
			if (el) el.textContent = "";
		}, 4000);
	}
}

function refreshFooter() {
	const foot = $("seidr-rm-footer-usage");
	if (foot) foot.textContent = rmUsageLabel();
}

function fillSelect(sel: HTMLSelectElement | null, names: string[], selected?: string) {
	if (!sel) return;
	const cur = selected != null ? selected : sel.value;
	sel.innerHTML = "";
	const blank = document.createElement("option");
	blank.value = "";
	blank.textContent = "— select —";
	sel.appendChild(blank);
	names.forEach(function (n) {
		const o = document.createElement("option");
		o.value = n;
		o.textContent = n;
		sel.appendChild(o);
	});
	if (cur && names.indexOf(cur) >= 0) sel.value = cur;
}

/** Disable Load controls when not in ChatRoom / ChatAdmin; keep panel open. */
export function rmUpdateApplyUi() {
	const can = rmCanApplyToRoom();
	["seidr-rm-room-load", "seidr-rm-access-load", "seidr-rm-map-load"].forEach(function (id) {
		const el = $(id) as HTMLButtonElement | null;
		if (el) {
			el.disabled = !can;
			el.title = can ? "" : "Join a chat room or open room settings to Load";
		}
	});
	document.querySelectorAll("#seidr-rm-grid [data-act='load']").forEach(function (node) {
		const b = node as HTMLButtonElement;
		b.disabled = !can;
		b.title = can ? "Load" : "Join a chat room or open room settings to Load";
	});
}

function fillModeOptionsHtml(selected?: RmBgFillMode): string {
	const modes: RmBgFillMode[] = ["default", "fill", "fillOriginalRatio", "showFullOriginalRatio"];
	const cur = rmNormalizeBgFillMode(selected);
	return modes.map(function (m) {
		return '<option value="' + m + '"' + (m === cur ? " selected" : "") + ">"
			+ rmFillModeLabel(m) + "</option>";
	}).join("");
}

function selectedRoomPreset(): RmRoomPreset | null {
	const sel = $("seidr-rm-room-sel") as HTMLSelectElement | null;
	if (!sel || !sel.value) return null;
	const store = rmGetStore();
	return store.room[sel.value] ? rmNormalizeRoomPreset(store.room[sel.value]) : null;
}

function openBgDialog(existing?: RmBackgroundEntry) {
	const overlay = document.createElement("div");
	overlay.className = "seidr-rm-overlay";
	overlay.innerHTML = [
		'<div class="seidr-rm-dialog">',
		"<h4>" + (existing ? "Edit background" : "Add background") + "</h4>",
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Name</span>',
		'<input type="text" id="seidr-rm-bg-name" maxlength="64" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">URL</span>',
		'<input type="url" id="seidr-rm-bg-url" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Fill Mode</span>',
		'<select id="seidr-rm-bg-fillmode">'
		+ fillModeOptionsHtml(existing ? existing.fillMode : "default") + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Default uses the room’s Custom SizeMode from Club (saved with Room Definition). Other modes override for this image.</p>',
		'<div class="seidr-rm-msg" id="seidr-rm-bg-err"></div>',
		'<div class="seidr-rm-dialog-actions">',
		'<button type="button" data-act="cancel">Cancel</button>',
		'<button type="button" data-act="save">Save</button>',
		"</div></div>",
	].join("");
	document.body.appendChild(overlay);
	const nameIn = overlay.querySelector("#seidr-rm-bg-name") as HTMLInputElement;
	const urlIn = overlay.querySelector("#seidr-rm-bg-url") as HTMLInputElement;
	const fillSel = overlay.querySelector("#seidr-rm-bg-fillmode") as HTMLSelectElement;
	const err = overlay.querySelector("#seidr-rm-bg-err") as HTMLElement;
	if (existing) {
		nameIn.value = existing.name;
		urlIn.value = existing.url;
		fillSel.value = rmNormalizeBgFillMode(existing.fillMode);
	}
	function close() {
		if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
	}
	overlay.addEventListener("click", function (ev) {
		if (ev.target === overlay) close();
	});
	overlay.querySelector('[data-act="cancel"]')!.addEventListener("click", close);
	overlay.querySelector('[data-act="save"]')!.addEventListener("click", function () {
		err.textContent = "Checking…";
		const mode = rmNormalizeBgFillMode(fillSel.value);
		rmSaveBackground(nameIn.value, urlIn.value, existing && existing.id, mode).then(function (res) {
			if (!res.ok) {
				err.textContent = res.error || "Save failed";
				return;
			}
			close();
			setMsg("Background saved");
			rmRefreshUi();
		});
	});
}

let bgDragId: string | null = null;

function clearBgDropMarkers(grid: HTMLElement) {
	grid.querySelectorAll(".seidr-rm-drop-before, .seidr-rm-drop-after").forEach(function (el) {
		el.classList.remove("seidr-rm-drop-before", "seidr-rm-drop-after");
	});
}

function bindBgGridDnD(grid: HTMLElement) {
	if ((grid as any)._seidrBgDnD) return;
	(grid as any)._seidrBgDnD = true;
	grid.addEventListener("dragstart", function (ev) {
		const t = ev.target as HTMLElement;
		if (t.closest(".seidr-rm-card-actions")) {
			ev.preventDefault();
			return;
		}
		const card = t.closest(".seidr-rm-card") as HTMLElement | null;
		if (!card || !card.draggable || !card.dataset.id) {
			ev.preventDefault();
			return;
		}
		bgDragId = card.dataset.id;
		card.classList.add("seidr-rm-dragging");
		try {
			ev.dataTransfer!.effectAllowed = "move";
			ev.dataTransfer!.setData("text/plain", bgDragId);
		} catch (e) { /* ignore */ }
	});
	grid.addEventListener("dragover", function (ev) {
		if (!bgDragId) return;
		ev.preventDefault();
		try { ev.dataTransfer!.dropEffect = "move"; } catch (e) { /* ignore */ }
		const card = (ev.target as HTMLElement).closest(".seidr-rm-card") as HTMLElement | null;
		clearBgDropMarkers(grid);
		if (!card || card.dataset.id === bgDragId) return;
		const rect = card.getBoundingClientRect();
		const before = ev.clientX < rect.left + rect.width / 2;
		card.classList.add(before ? "seidr-rm-drop-before" : "seidr-rm-drop-after");
	});
	grid.addEventListener("dragleave", function (ev) {
		const rel = ev.relatedTarget as Node | null;
		if (rel && grid.contains(rel)) return;
		clearBgDropMarkers(grid);
	});
	grid.addEventListener("drop", function (ev) {
		ev.preventDefault();
		const dragId = bgDragId;
		clearBgDropMarkers(grid);
		const target = (ev.target as HTMLElement).closest(".seidr-rm-card") as HTMLElement | null;
		if (!dragId || !target || !target.dataset.id || target.dataset.id === dragId) {
			bgDragId = null;
			return;
		}
		const cards = Array.prototype.slice.call(grid.querySelectorAll(".seidr-rm-card")) as HTMLElement[];
		const ids = cards.map(function (c) { return c.dataset.id || ""; }).filter(Boolean);
		const from = ids.indexOf(dragId);
		let to = ids.indexOf(target.dataset.id!);
		if (from < 0 || to < 0) {
			bgDragId = null;
			return;
		}
		const rect = target.getBoundingClientRect();
		const after = ev.clientX >= rect.left + rect.width / 2;
		ids.splice(from, 1);
		to = ids.indexOf(target.dataset.id!);
		if (after) to += 1;
		ids.splice(to, 0, dragId);
		bgDragId = null;
		const ok = rmReorderBackgrounds(ids);
		setMsg(ok ? "Backgrounds reordered" : "Reorder failed");
		if (ok) rmRefreshUi();
	});
	grid.addEventListener("dragend", function () {
		bgDragId = null;
		clearBgDropMarkers(grid);
		grid.querySelectorAll(".seidr-rm-dragging").forEach(function (el) {
			el.classList.remove("seidr-rm-dragging");
		});
	});
}

function renderBgGrid() {
	const grid = $("seidr-rm-grid");
	const filter = ($("seidr-rm-bg-filter") as HTMLInputElement | null);
	if (!grid) return;
	bindBgGridDnD(grid);
	const q = (filter && filter.value || "").trim().toLowerCase();
	const canDrag = !q;
	const list = rmListBackgrounds().filter(function (b) {
		return !q || (b.name || "").toLowerCase().indexOf(q) >= 0;
	});
	grid.innerHTML = "";
	const canLoad = rmCanApplyToRoom();
	list.forEach(function (b) {
		const card = document.createElement("div");
		card.className = "seidr-rm-card";
		card.dataset.id = b.id;
		if (canDrag) card.draggable = true;
		const mode = rmNormalizeBgFillMode(b.fillMode);
		card.innerHTML = [
			'<img class="seidr-rm-card-thumb" alt="" draggable="false" />',
			'<div class="seidr-rm-card-name"></div>',
			mode !== "default" ? '<div class="seidr-rm-card-badge"></div>' : "",
			'<div class="seidr-rm-card-actions">',
			'<button type="button" data-act="load" title="Load">⬇</button>',
			'<button type="button" data-act="edit" title="Edit">✎</button>',
			'<button type="button" data-act="del" title="Delete">×</button>',
			"</div>",
		].join("");
		(card.querySelector(".seidr-rm-card-name") as HTMLElement).textContent = b.name;
		const badge = card.querySelector(".seidr-rm-card-badge") as HTMLElement | null;
		if (badge) badge.textContent = rmFillModeLabel(mode);
		const img = card.querySelector("img") as HTMLImageElement;
		img.alt = b.name;
		rmEnsurePreview(b.url).then(function (src) {
			if (src) img.src = src;
		});
		const loadBtn = card.querySelector('[data-act="load"]') as HTMLButtonElement;
		loadBtn.disabled = !canLoad;
		if (!canLoad) loadBtn.title = "Join a chat room or open room settings to Load";
		loadBtn.addEventListener("click", function () {
			if (!rmCanApplyToRoom()) {
				setMsg("Open ChatRoom or ChatAdmin to Load");
				return;
			}
			const room = selectedRoomPreset();
			if (room) rmSetLastRoomPreset(room);
			const r = rmApplyBackgroundEntry(b, room && room.customSizeMode);
			setMsg(r.ok ? "Background applied" : (r.error || "Failed"));
		});
		card.querySelector('[data-act="edit"]')!.addEventListener("click", function () {
			openBgDialog(b);
		});
		card.querySelector('[data-act="del"]')!.addEventListener("click", function () {
			void rmConfirm("Delete background “" + b.name + "”?", {
				title: "Delete background",
				confirmLabel: "Delete",
				danger: true,
			}).then(function (ok) {
				if (!ok) return;
				const deleted = rmDeleteBackground(b.id);
				setMsg(deleted ? "Background deleted" : "Delete failed");
				rmRefreshUi();
			});
		});
		grid.appendChild(card);
	});
}

function selectedRmMapId(): string | null {
	const sel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
	return sel && sel.value ? sel.value : null;
}

function selectedRmVersionId(): string | null {
	const sel = $("seidr-rm-ver-sel") as HTMLSelectElement | null;
	return sel && sel.value ? sel.value : null;
}

function fillVersionSelect(mapId: string | null, preferId?: string | null) {
	const verSel = $("seidr-rm-ver-sel") as HTMLSelectElement | null;
	if (!verSel) return;
	if (!mapId) {
		fillSelect(verSel, []);
		return;
	}
	const vers = rmListVersions(mapId);
	const prev = preferId || verSel.value || rmLatestVersionId(mapId);
	verSel.innerHTML = "";
	vers.forEach(function (v) {
		const opt = document.createElement("option");
		opt.value = v.id;
		opt.textContent = v.name;
		verSel.appendChild(opt);
	});
	if (prev && vers.some(function (v) { return v.id === prev; })) {
		verSel.value = prev;
	} else if (vers.length) {
		verSel.value = vers[0].id;
	}
}

function renderMaps() {
	const wrap = $("seidr-rm-maps-wrap");
	const sel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
	if (!wrap) return;
	const show = rmMapModeActive();
	wrap.classList.toggle("seidr-rm-hidden", !show);
	if (!show || !sel) return;
	const maps = rmListAllMaps();
	const prevId = sel.value;
	sel.innerHTML = "";
	maps.forEach(function (m) {
		const opt = document.createElement("option");
		opt.value = m.id;
		opt.textContent = m.name + (m.location === "local" ? " (Local)" : "");
		sel.appendChild(opt);
	});
	if (prevId && maps.some(function (m) { return m.id === prevId; })) {
		sel.value = prevId;
	} else if (maps.length) {
		sel.value = maps[0].id;
	}
	fillVersionSelect(sel.value || null);
}

export function rmBuildPanelBody() {
	const body = $("seidr-rm-body");
	if (!body) return;
	body.innerHTML = [
		'<section class="seidr-rm-sec">',
		"<h3>1. Room Definition</h3>",
		'<div class="seidr-rm-row">',
		'<select id="seidr-rm-room-sel"></select>',
		'<button type="button" data-rm="room-save">Save as…</button>',
		'<button type="button" data-rm="room-overwrite">Overwrite</button>',
		'<button type="button" data-rm="room-load" id="seidr-rm-room-load">Load</button>',
		'<button type="button" data-rm="room-delete">Delete</button>',
		"</div></section>",
		'<section class="seidr-rm-sec">',
		"<h3>2. Room Access</h3>",
		'<div class="seidr-rm-row">',
		'<select id="seidr-rm-access-sel"></select>',
		'<button type="button" data-rm="access-save">Save as…</button>',
		'<button type="button" data-rm="access-overwrite">Overwrite</button>',
		'<button type="button" data-rm="access-load" id="seidr-rm-access-load">Load → room</button>',
		'<button type="button" data-rm="access-delete">Delete</button>',
		"</div></section>",
		'<section class="seidr-rm-sec seidr-rm-sec-grow">',
		"<h3>3. Backgrounds</h3>",
		'<div class="seidr-rm-row">',
		'<button type="button" data-rm="bg-add">+ Save / Add</button>',
		'<input type="search" id="seidr-rm-bg-filter" placeholder="Filter…" style="flex:1;min-width:120px;" />',
		"</div>",
		'<div class="seidr-rm-grid" id="seidr-rm-grid"></div>',
		"</section>",
		'<section class="seidr-rm-sec" id="seidr-rm-maps-wrap">',
		"<h3>4. Maps</h3>",
		'<div class="seidr-rm-row">',
		'<select id="seidr-rm-map-sel" title="Map"></select>',
		'<select id="seidr-rm-ver-sel" title="Version"></select>',
		"</div>",
		'<div class="seidr-rm-row" style="margin-top:6px;">',
		'<button type="button" data-rm="map-save-as">Save as…</button>',
		'<button type="button" data-rm="map-save-ver">Save new Version</button>',
		'<button type="button" data-rm="map-overwrite">Overwrite Default</button>',
		'<button type="button" data-rm="map-load" id="seidr-rm-map-load">Load</button>',
		'<button type="button" data-rm="map-delete-ver">Delete version</button>',
		'<button type="button" data-rm="map-delete">Delete map</button>',
		"</div></section>",
	].join("");

	body.addEventListener("click", function (ev) {
		const t = (ev.target as HTMLElement).closest("[data-rm]") as HTMLElement | null;
		if (!t) return;
		const act = t.getAttribute("data-rm");
		void (async function () {
			const store = rmGetStore();
			if (act === "room-save") {
				const name = await rmPrompt("Save room config as:", { confirmLabel: "Save" });
				if (!name) return;
				if (store.room[name]) {
					const ok = await rmConfirm("Overwrite “" + name + "”?", {
						title: "Overwrite",
						confirmLabel: "Overwrite",
					});
					if (!ok) return;
				}
				const settings = rmReadSettings();
				if (!settings) { setMsg("No room data"); return; }
				const preset = rmSliceRoom(settings);
				store.room[name] = preset;
				rmSetLastRoomPreset(preset);
				const s = rmSaveStore();
				setMsg(s.ok ? "Room config saved" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "room-overwrite") {
				const sel = $("seidr-rm-room-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select a config"); return; }
				if (!(await rmConfirm("Overwrite “" + sel.value + "”?", {
					title: "Overwrite",
					confirmLabel: "Overwrite",
				}))) return;
				const settings = rmReadSettings();
				if (!settings) { setMsg("No room data"); return; }
				const preset = rmSliceRoom(settings);
				store.room[sel.value] = preset;
				rmSetLastRoomPreset(preset);
				const s = rmSaveStore();
				setMsg(s.ok ? "Overwritten" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "room-load") {
				if (!rmCanApplyToRoom()) { setMsg("Open ChatRoom or ChatAdmin to Load"); return; }
				const sel = $("seidr-rm-room-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select a config"); return; }
				const preset = store.room[sel.value];
				if (!preset) { setMsg("Not found"); return; }
				rmApplyRoomToEditor(preset);
				if (rmInLiveRoom()) {
					const u = rmUpdateLiveRoom();
					setMsg(u.ok ? "Room config loaded + updated" : (u.error || "Applied to editor"));
				} else {
					setMsg("Filled ChatAdmin fields");
				}
			} else if (act === "room-delete") {
				const sel = $("seidr-rm-room-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select a config"); return; }
				if (!(await rmConfirm("Delete room config “" + sel.value + "”?", {
					title: "Delete",
					confirmLabel: "Delete",
					danger: true,
				}))) return;
				delete store.room[sel.value];
				const s = rmSaveStore();
				setMsg(s.ok ? "Deleted" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "access-save") {
				const name = await rmPrompt("Save access list as:", { confirmLabel: "Save" });
				if (!name) return;
				if (store.access[name]) {
					const ok = await rmConfirm("Overwrite “" + name + "”?", {
						title: "Overwrite",
						confirmLabel: "Overwrite",
					});
					if (!ok) return;
				}
				const settings = rmReadSettings();
				if (!settings) { setMsg("No room data"); return; }
				store.access[name] = rmSliceAccess(settings);
				const s = rmSaveStore();
				setMsg(s.ok ? "Access saved" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "access-overwrite") {
				const sel = $("seidr-rm-access-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select access"); return; }
				if (!(await rmConfirm("Overwrite “" + sel.value + "”?", {
					title: "Overwrite",
					confirmLabel: "Overwrite",
				}))) return;
				const settings = rmReadSettings();
				if (!settings) { setMsg("No room data"); return; }
				store.access[sel.value] = rmSliceAccess(settings);
				const s = rmSaveStore();
				setMsg(s.ok ? "Overwritten" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "access-load") {
				if (!rmCanApplyToRoom()) { setMsg("Open ChatRoom or ChatAdmin to Load"); return; }
				const sel = $("seidr-rm-access-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select access"); return; }
				const preset = store.access[sel.value];
				if (!preset) { setMsg("Not found"); return; }
				rmApplyAccessToEditor(preset);
				if (rmInLiveRoom()) {
					const u = rmUpdateLiveRoom();
					setMsg(u.ok ? "Access loaded + room updated" : (u.error || "Applied"));
				} else {
					setMsg("Filled access lists in ChatAdmin");
				}
			} else if (act === "access-delete") {
				const sel = $("seidr-rm-access-sel") as HTMLSelectElement;
				if (!sel || !sel.value) { setMsg("Select access"); return; }
				if (!(await rmConfirm("Delete access list “" + sel.value + "”?", {
					title: "Delete",
					confirmLabel: "Delete",
					danger: true,
				}))) return;
				delete store.access[sel.value];
				const s = rmSaveStore();
				setMsg(s.ok ? "Deleted" : (s.error || "Failed"));
				rmRefreshUi();
			} else if (act === "bg-add") {
				openBgDialog();
			} else if (act === "map-save-as") {
				const name = await rmPrompt("Save map as:", { confirmLabel: "Save" });
				if (!name) return;
				const maps = rmListAllMaps();
				const existing = maps.find(function (m) { return m.name === name; });
				if (existing) {
					if (!(await rmConfirm("Map “" + name + "” exists — overwrite Default?", {
						title: "Overwrite Default",
						confirmLabel: "Overwrite",
					}))) return;
					const r = rmOverwriteDefault(existing.id);
					setMsg(r.ok ? "Default overwritten" : (r.error || "Failed"));
					rmRefreshUi();
					const mapSel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
					if (mapSel) mapSel.value = existing.id;
					fillVersionSelect(existing.id, r.version && r.version.id);
					return;
				}
				const r = rmSaveNewMap(name);
				setMsg(r.ok
					? (r.fellBackLocal ? "Map saved (Local — remote full). Default created." : "Map saved (Default)")
					: (r.error || "Failed"));
				rmRefreshUi();
				if (r.map) {
					const mapSel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
					if (mapSel) mapSel.value = r.map.id;
					fillVersionSelect(r.map.id, rmDefaultVersionId(r.map.id));
				}
			} else if (act === "map-save-ver") {
				const mapId = selectedRmMapId();
				if (!mapId) { setMsg("Select a map"); return; }
				const verName = await rmPrompt("Save new version", {
					message: "Local version name (not Default):",
					initial: "Development",
					confirmLabel: "Save",
				});
				if (!verName) return;
				if (verName === RM_MAP_DEFAULT_NAME) {
					setMsg("Use Overwrite Default to update Default");
					return;
				}
				const r = rmSaveNewVersion(mapId, verName);
				setMsg(r.ok ? "Local version saved" : (r.error || "Failed"));
				rmRefreshUi();
				fillVersionSelect(mapId, r.version && r.version.id);
			} else if (act === "map-overwrite") {
				const mapId = selectedRmMapId();
				if (!mapId) { setMsg("Select a map"); return; }
				if (!(await rmConfirm("Overwrite Default with the current room map?", {
					title: "Overwrite Default",
					confirmLabel: "Overwrite",
				}))) return;
				const r = rmOverwriteDefault(mapId);
				setMsg(r.ok ? "Default overwritten" : (r.error || "Failed"));
				rmRefreshUi();
				fillVersionSelect(mapId, r.version && r.version.id);
			} else if (act === "map-load") {
				if (!rmCanApplyToRoom()) { setMsg("Open ChatRoom or ChatAdmin to Load"); return; }
				const mapId = selectedRmMapId();
				const verId = selectedRmVersionId();
				if (!mapId || !verId) { setMsg("Select a map and version"); return; }
				const maps = rmListAllMaps();
				const map = maps.find(function (m) { return m.id === mapId; });
				const ver = map && map.versions.find(function (v) { return v.id === verId; });
				if (!(await rmConfirm(
					"Load “" + (map ? map.name : "") + "” / “" + (ver ? ver.name : "") + "” into this room?",
					{ title: "Load map", confirmLabel: "Load" },
				))) return;
				const r = rmLoadMapVersion(mapId, verId);
				setMsg(r.ok ? "Map version loaded" : (r.error || "Failed"));
			} else if (act === "map-delete-ver") {
				const mapId = selectedRmMapId();
				const verId = selectedRmVersionId();
				if (!mapId || !verId) { setMsg("Select a map and version"); return; }
				const map = rmListAllMaps().find(function (m) { return m.id === mapId; });
				const ver = map && map.versions.find(function (v) { return v.id === verId; });
				const isDef = ver && rmIsDefaultVersionName(ver.name);
				const only = map && map.versions.length <= 1;
				if (isDef && !only) {
					setMsg("Cannot delete Default while other versions exist — use Delete map");
					return;
				}
				if (!(await rmConfirm(only || isDef
					? "Delete entire map “" + (map ? map.name : "") + "”?"
					: "Delete this local version?", {
					title: "Delete",
					confirmLabel: "Delete",
					danger: true,
				}))) return;
				const r = rmDeleteVersion(mapId, verId);
				setMsg(r.ok ? (only || isDef ? "Map deleted" : "Version deleted") : (r.error || "Failed"));
				rmRefreshUi();
			} else if (act === "map-delete") {
				const mapId = selectedRmMapId();
				if (!mapId) { setMsg("Select a map"); return; }
				const map = rmListAllMaps().find(function (m) { return m.id === mapId; });
				if (!(await rmConfirm("Delete map “" + (map ? map.name : "") + "” and all versions?", {
					title: "Delete map",
					confirmLabel: "Delete",
					danger: true,
				}))) return;
				const r = rmDeleteMap(mapId);
				setMsg(r.ok ? "Map deleted" : (r.error || "Failed"));
				rmRefreshUi();
			}
		})();
	});

	const mapSel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
	if (mapSel) {
		mapSel.addEventListener("change", function () {
			fillVersionSelect(mapSel.value || null);
		});
	}

	const filter = $("seidr-rm-bg-filter") as HTMLInputElement | null;
	if (filter) {
		filter.addEventListener("input", function () { renderBgGrid(); });
	}

	const roomSel = $("seidr-rm-room-sel") as HTMLSelectElement | null;
	if (roomSel) {
		roomSel.addEventListener("change", function () {
			const preset = selectedRoomPreset();
			if (preset) rmSetLastRoomPreset(preset);
		});
	}
}

export function rmRefreshUi() {
	const store = rmGetStore();
	const roomSel = $("seidr-rm-room-sel") as HTMLSelectElement | null;
	const prevRoom = roomSel ? roomSel.value : "";
	fillSelect(roomSel, Object.keys(store.room).sort(), prevRoom);
	fillSelect($("seidr-rm-access-sel") as HTMLSelectElement, Object.keys(store.access).sort());
	const preset = selectedRoomPreset();
	if (preset) rmSetLastRoomPreset(preset);
	renderBgGrid();
	renderMaps();
	refreshFooter();
	rmUpdateApplyUi();
}

Seidr.rmRefreshUi = rmRefreshUi;
Seidr.rmUpdateApplyUi = rmUpdateApplyUi;
