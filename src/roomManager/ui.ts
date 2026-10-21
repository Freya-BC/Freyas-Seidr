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
} from "./roomApply";
import {
	rmListBackgrounds,
	rmSaveBackground,
	rmApplyBackgroundUrl,
	rmDeleteBackground,
	rmReorderBackgrounds,
} from "./backgrounds";
import { rmListMaps, rmSaveNamedMap, rmLoadNamedMap, rmDeleteNamedMap } from "./maps";
import { rmEnsurePreview } from "./preview";

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

function promptName(title: string, initial?: string): string | null {
	const v = window.prompt(title, initial || "");
	if (v == null) return null;
	const t = v.trim();
	return t || null;
}

function confirmAct(msg: string): boolean {
	return window.confirm(msg);
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

function openBgDialog(existing?: { id: string; name: string; url: string }) {
	const overlay = document.createElement("div");
	overlay.className = "seidr-rm-overlay";
	overlay.innerHTML = [
		'<div class="seidr-rm-dialog">',
		"<h4>" + (existing ? "Edit background" : "Add background") + "</h4>",
		'<label>Name<input type="text" id="seidr-rm-bg-name" maxlength="64" /></label>',
		'<label>URL<input type="url" id="seidr-rm-bg-url" /></label>',
		'<div class="seidr-rm-msg" id="seidr-rm-bg-err"></div>',
		'<div class="seidr-rm-dialog-actions">',
		'<button type="button" data-act="cancel">Cancel</button>',
		'<button type="button" data-act="save">Save</button>',
		"</div></div>",
	].join("");
	document.body.appendChild(overlay);
	const nameIn = overlay.querySelector("#seidr-rm-bg-name") as HTMLInputElement;
	const urlIn = overlay.querySelector("#seidr-rm-bg-url") as HTMLInputElement;
	const err = overlay.querySelector("#seidr-rm-bg-err") as HTMLElement;
	if (existing) {
		nameIn.value = existing.name;
		urlIn.value = existing.url;
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
		rmSaveBackground(nameIn.value, urlIn.value, existing && existing.id).then(function (res) {
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
		card.innerHTML = [
			'<img class="seidr-rm-card-thumb" alt="" draggable="false" />',
			'<div class="seidr-rm-card-name"></div>',
			'<div class="seidr-rm-card-actions">',
			'<button type="button" data-act="load" title="Load">⬇</button>',
			'<button type="button" data-act="edit" title="Edit">✎</button>',
			'<button type="button" data-act="del" title="Delete">×</button>',
			"</div>",
		].join("");
		(card.querySelector(".seidr-rm-card-name") as HTMLElement).textContent = b.name;
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
			const r = rmApplyBackgroundUrl(b.url);
			setMsg(r.ok ? "Background applied" : (r.error || "Failed"));
		});
		card.querySelector('[data-act="edit"]')!.addEventListener("click", function () {
			openBgDialog(b);
		});
		card.querySelector('[data-act="del"]')!.addEventListener("click", function () {
			if (!confirmAct("Delete background “" + b.name + "”?")) return;
			const ok = rmDeleteBackground(b.id);
			setMsg(ok ? "Background deleted" : "Delete failed");
			rmRefreshUi();
		});
		grid.appendChild(card);
	});
}

function renderMaps() {
	const wrap = $("seidr-rm-maps-wrap");
	const sel = $("seidr-rm-map-sel") as HTMLSelectElement | null;
	if (!wrap) return;
	const show = rmMapModeActive();
	wrap.classList.toggle("seidr-rm-hidden", !show);
	if (!show || !sel) return;
	const maps = rmListMaps();
	const names = maps.map(function (m) { return m.name; }).sort();
	const byName: Record<string, string> = {};
	maps.forEach(function (m) { byName[m.name] = m.id; });
	(sel as any)._rmMapIds = byName;
	fillSelect(sel, names);
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
		'<select id="seidr-rm-map-sel"></select>',
		'<button type="button" data-rm="map-save-as">Save as…</button>',
		'<button type="button" data-rm="map-overwrite">Overwrite</button>',
		'<button type="button" data-rm="map-load" id="seidr-rm-map-load">Load</button>',
		'<button type="button" class="seidr-rm-icon-act" data-rm="map-delete" title="Delete">×</button>',
		"</div></section>",
	].join("");

	body.addEventListener("click", function (ev) {
		const t = (ev.target as HTMLElement).closest("[data-rm]") as HTMLElement | null;
		if (!t) return;
		const act = t.getAttribute("data-rm");
		const store = rmGetStore();
		if (act === "room-save") {
			const name = promptName("Save room config as:");
			if (!name) return;
			if (store.room[name] && !confirmAct("Overwrite “" + name + "”?")) return;
			const settings = rmReadSettings();
			if (!settings) { setMsg("No room data"); return; }
			store.room[name] = rmSliceRoom(settings);
			const s = rmSaveStore();
			setMsg(s.ok ? "Room config saved" : (s.error || "Failed"));
			rmRefreshUi();
		} else if (act === "room-overwrite") {
			const sel = $("seidr-rm-room-sel") as HTMLSelectElement;
			if (!sel || !sel.value) { setMsg("Select a config"); return; }
			if (!confirmAct("Overwrite “" + sel.value + "”?")) return;
			const settings = rmReadSettings();
			if (!settings) { setMsg("No room data"); return; }
			store.room[sel.value] = rmSliceRoom(settings);
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
			if (!confirmAct("Delete room config “" + sel.value + "”?")) return;
			delete store.room[sel.value];
			const s = rmSaveStore();
			setMsg(s.ok ? "Deleted" : (s.error || "Failed"));
			rmRefreshUi();
		} else if (act === "access-save") {
			const name = promptName("Save access list as:");
			if (!name) return;
			if (store.access[name] && !confirmAct("Overwrite “" + name + "”?")) return;
			const settings = rmReadSettings();
			if (!settings) { setMsg("No room data"); return; }
			store.access[name] = rmSliceAccess(settings);
			const s = rmSaveStore();
			setMsg(s.ok ? "Access saved" : (s.error || "Failed"));
			rmRefreshUi();
		} else if (act === "access-overwrite") {
			const sel = $("seidr-rm-access-sel") as HTMLSelectElement;
			if (!sel || !sel.value) { setMsg("Select access"); return; }
			if (!confirmAct("Overwrite “" + sel.value + "”?")) return;
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
			if (!confirmAct("Delete access list “" + sel.value + "”?")) return;
			delete store.access[sel.value];
			const s = rmSaveStore();
			setMsg(s.ok ? "Deleted" : (s.error || "Failed"));
			rmRefreshUi();
		} else if (act === "bg-add") {
			openBgDialog();
		} else if (act === "map-save-as") {
			const name = promptName("Save map as:");
			if (!name) return;
			const maps = rmListMaps();
			const existing = maps.find(function (m) { return m.name === name; });
			if (existing && !confirmAct("Overwrite “" + name + "”?")) return;
			const r = rmSaveNamedMap(name, existing && existing.id);
			setMsg(r.ok ? "Map saved" : (r.error || "Failed"));
			rmRefreshUi();
		} else if (act === "map-overwrite") {
			const sel = $("seidr-rm-map-sel") as HTMLSelectElement;
			if (!sel || !sel.value) { setMsg("Select a map"); return; }
			if (!confirmAct("Overwrite map “" + sel.value + "” with the current room map?")) return;
			const ids = (sel as any)._rmMapIds as Record<string, string> | undefined;
			const id = ids && ids[sel.value];
			const r = rmSaveNamedMap(sel.value, id);
			setMsg(r.ok ? "Overwritten" : (r.error || "Failed"));
			rmRefreshUi();
		} else if (act === "map-load") {
			if (!rmCanApplyToRoom()) { setMsg("Open ChatRoom or ChatAdmin to Load"); return; }
			const sel = $("seidr-rm-map-sel") as HTMLSelectElement;
			if (!sel || !sel.value) { setMsg("Select a map"); return; }
			if (!confirmAct("Load map “" + sel.value + "” into this room?")) return;
			const ids = (sel as any)._rmMapIds as Record<string, string> | undefined;
			const id = ids && ids[sel.value];
			if (!id) { setMsg("Not found"); return; }
			const r = rmLoadNamedMap(id);
			setMsg(r.ok ? "Map loaded" : (r.error || "Failed"));
		} else if (act === "map-delete") {
			const sel = $("seidr-rm-map-sel") as HTMLSelectElement;
			if (!sel || !sel.value) { setMsg("Select a map"); return; }
			if (!confirmAct("Delete map “" + sel.value + "”?")) return;
			const ids = (sel as any)._rmMapIds as Record<string, string> | undefined;
			const id = ids && ids[sel.value];
			if (!id) { setMsg("Not found"); return; }
			const r = rmDeleteNamedMap(id);
			setMsg(r.ok ? "Map deleted" : (r.error || "Failed"));
			rmRefreshUi();
		}
	});

	const filter = $("seidr-rm-bg-filter") as HTMLInputElement | null;
	if (filter) {
		filter.addEventListener("input", function () { renderBgGrid(); });
	}
}

export function rmRefreshUi() {
	const store = rmGetStore();
	fillSelect($("seidr-rm-room-sel") as HTMLSelectElement, Object.keys(store.room).sort());
	fillSelect($("seidr-rm-access-sel") as HTMLSelectElement, Object.keys(store.access).sort());
	renderBgGrid();
	renderMaps();
	refreshFooter();
	rmUpdateApplyUi();
}

Seidr.rmRefreshUi = rmRefreshUi;
Seidr.rmUpdateApplyUi = rmUpdateApplyUi;
