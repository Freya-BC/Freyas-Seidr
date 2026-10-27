/** Named map series — Default syncs remotely; other versions are always local */
import { Seidr } from "../seidr";
import { rmGetStore, rmSaveStore, rmCanSaveMaps, rmFormatBytes, rmSliceBytes } from "./storage";
import {
	RM_MAP_DEFAULT_NAME,
	rmCanonicalVersionName,
	rmIsDefaultVersionName,
	rmNewId,
	rmNormalizeMapSeries,
	rmNormalizeMapVersion,
	rmSerializeRemoteMaps,
	type RmMapLocation,
	type RmMapSeries,
	type RmMapVersion,
} from "./model";
import { rmIsAdmin, rmMapModeActive } from "./roomApply";

const NAME_MAX = 48;

function remoteMax(): number {
	return typeof Seidr.RM_MAP_MAX === "number" ? Seidr.RM_MAP_MAX : 10;
}

function localMax(): number {
	return typeof Seidr.RM_MAP_LOCAL_MAX === "number" ? Seidr.RM_MAP_LOCAL_MAX : 50;
}

function localVerMax(): number {
	return typeof Seidr.RM_MAP_VERSIONS_LOCAL_MAX === "number" ? Seidr.RM_MAP_VERSIONS_LOCAL_MAX : 30;
}

function clampName(raw: unknown, fallback: string): string {
	const s = String(raw == null ? "" : raw).trim().slice(0, NAME_MAX);
	return s || fallback;
}

function lz() {
	try {
		if (typeof LZString !== "undefined" && LZString) return LZString;
	} catch (e) { /* ignore */ }
	return null;
}

function localKey(): string | null {
	try {
		const mn = Player && Player.MemberNumber;
		if (mn == null) return null;
		const prefix = Seidr.RM_MAPS_LOCAL_KEY_PREFIX || "SeidrMapsLocal_";
		return prefix + String(mn);
	} catch (e) {
		return null;
	}
}

let _localCache: RmMapSeries[] | null = null;
let _peeledRemote = false;

function packLocal(maps: RmMapSeries[]): string {
	const payload = {
		v: 1,
		maps: maps.map(function (m) {
			return {
				id: m.id,
				name: m.name,
				versions: m.versions.map(function (v) {
					return { id: v.id, name: v.name, data: v.data, savedAt: v.savedAt };
				}),
			};
		}),
	};
	const json = JSON.stringify(payload);
	const L = lz();
	const prefix = Seidr.RM_MAPS_LOCAL_LZ_PREFIX || "SeidrMapsLocal1:";
	if (L && typeof L.compressToUTF16 === "function") {
		return prefix + L.compressToUTF16(json);
	}
	return json;
}

function unpackLocal(raw: string): RmMapSeries[] {
	const prefix = Seidr.RM_MAPS_LOCAL_LZ_PREFIX || "SeidrMapsLocal1:";
	let data: unknown = null;
	try {
		if (raw.startsWith(prefix)) {
			const L = lz();
			if (!L || typeof L.decompressFromUTF16 !== "function") return [];
			const plain = L.decompressFromUTF16(raw.slice(prefix.length));
			data = plain ? JSON.parse(plain) : null;
		} else {
			data = JSON.parse(raw);
		}
	} catch (e) {
		console.warn("[Seidr RM] local maps unpack", e);
		return [];
	}
	if (!data || typeof data !== "object") return [];
	const d = data as { maps?: unknown };
	if (!Array.isArray(d.maps)) return [];
	const out: RmMapSeries[] = [];
	for (let i = 0; i < d.maps.length; i++) {
		const s = rmNormalizeMapSeries(d.maps[i], "local");
		if (s) {
			s.location = "local";
			out.push(s);
		}
	}
	return out;
}

export function rmLoadLocalMaps(): RmMapSeries[] {
	if (_localCache) return _localCache;
	const key = localKey();
	if (!key) {
		_localCache = [];
		return _localCache;
	}
	try {
		const raw = localStorage.getItem(key);
		_localCache = raw ? unpackLocal(raw) : [];
	} catch (e) {
		console.warn("[Seidr RM] local maps read", e);
		_localCache = [];
	}
	return _localCache;
}

export function rmInvalidateLocalMaps() {
	_localCache = null;
	_peeledRemote = false;
}

function saveLocalMaps(maps: RmMapSeries[]): { ok: boolean; error?: string } {
	const key = localKey();
	if (!key) return { ok: false, error: "Not logged in" };
	try {
		localStorage.setItem(key, packLocal(maps));
		_localCache = maps.map(function (m) {
			return {
				id: m.id,
				name: m.name,
				location: "local" as const,
				versions: m.versions.slice(),
			};
		});
		return { ok: true };
	} catch (e) {
		console.warn("[Seidr RM] local maps write", e);
		return { ok: false, error: "localStorage save failed" };
	}
}

function rawRemoteMaps(): RmMapSeries[] {
	return (rmGetStore().maps || []).map(function (m) {
		return {
			id: m.id,
			name: m.name,
			location: "remote" as const,
			versions: (m.versions || []).slice(),
		};
	});
}

function pickDefault(versions: RmMapVersion[]): RmMapVersion | null {
	const found = versions.find(function (v) { return rmIsDefaultVersionName(v.name); });
	if (found) return found;
	if (!versions.length) return null;
	return {
		id: versions[0].id,
		name: RM_MAP_DEFAULT_NAME,
		data: versions[0].data,
		savedAt: versions[0].savedAt,
	};
}

function extrasOnly(versions: RmMapVersion[]): RmMapVersion[] {
	return versions.filter(function (v) { return !rmIsDefaultVersionName(v.name); });
}

/**
 * One-time: if ExtensionSettings still holds non-Default versions, peel them into
 * localStorage and re-save remote with Default only.
 */
function peelRemoteExtrasToLocal() {
	if (_peeledRemote) return;
	_peeledRemote = true;
	const remote = rawRemoteMaps();
	let dirtyRemote = false;
	let local = rmLoadLocalMaps().slice();
	let dirtyLocal = false;

	const nextRemote: RmMapSeries[] = [];
	for (let i = 0; i < remote.length; i++) {
		const m = remote[i];
		const def = pickDefault(m.versions);
		const extras = extrasOnly(m.versions);
		if (!def) continue;
		if (extras.length || !rmIsDefaultVersionName(m.versions[0] && m.versions[0].name) || m.versions.length !== 1) {
			if (extras.length || m.versions.length > 1 || !rmIsDefaultVersionName((m.versions[0] || def).name)) {
				dirtyRemote = true;
			}
		}
		if (extras.length) {
			const li = local.findIndex(function (x) { return x.id === m.id; });
			if (li >= 0) {
				const merged = extrasOnly(local[li].versions).concat(extras);
				local[li] = {
					id: m.id,
					name: m.name,
					location: "local",
					versions: merged,
				};
			} else {
				local.push({
					id: m.id,
					name: m.name,
					location: "local",
					versions: extras,
				});
			}
			dirtyLocal = true;
		}
		nextRemote.push({
			id: m.id,
			name: m.name,
			location: "remote",
			versions: [{
				id: def.id,
				name: RM_MAP_DEFAULT_NAME,
				data: def.data,
				savedAt: def.savedAt,
			}],
		});
		if (m.versions.length !== 1 || !rmIsDefaultVersionName(m.versions[0].name)) {
			dirtyRemote = true;
		}
	}

	if (dirtyLocal) saveLocalMaps(local);
	if (dirtyRemote) {
		const store = rmGetStore();
		store.maps = nextRemote;
		rmSaveStore();
	}
}

function persistRemoteDefaults(maps: RmMapSeries[]): { ok: boolean; error?: string } {
	const cleaned = maps.map(function (m) {
		const def = pickDefault(m.versions);
		return {
			id: m.id,
			name: m.name,
			location: "remote" as const,
			versions: def
				? [{ id: def.id, name: RM_MAP_DEFAULT_NAME, data: def.data, savedAt: def.savedAt }]
				: [],
		};
	}).filter(function (m) { return m.versions.length > 0; });
	const can = rmCanSaveMaps(rmSerializeRemoteMaps(cleaned));
	if (!can.ok) return { ok: false, error: can.error };
	const store = rmGetStore();
	store.maps = cleaned;
	return rmSaveStore();
}

function preferRemote(location?: RmMapLocation): RmMapLocation {
	if (location === "local" || location === "remote") return location;
	const remote = rawRemoteMaps();
	if (remote.length >= remoteMax()) return "local";
	const can = rmCanSaveMaps(rmSerializeRemoteMaps(remote));
	return can.ok ? "remote" : "local";
}

function makeDefaultVersion(data: string): RmMapVersion {
	return {
		id: rmNewId("mv"),
		name: RM_MAP_DEFAULT_NAME,
		data: data,
		savedAt: Date.now(),
	};
}

function makeLocalVersion(name: string, data: string): RmMapVersion {
	const n = clampName(rmCanonicalVersionName(name, "Version"), "Version");
	return {
		id: rmNewId("mv"),
		name: n,
		data: data,
		savedAt: Date.now(),
	};
}

function pushMapRoomSync(backup: unknown) {
	try {
		if (backup && typeof ChatRoomMapViewEditBackup !== "undefined" && ChatRoomMapViewEditBackup) {
			if (JSON.stringify(backup) !== JSON.stringify(ChatRoomData && ChatRoomData.MapData)) {
				if (ChatRoomMapViewEditBackup.length > 100) {
					ChatRoomMapViewEditBackup = ChatRoomMapViewEditBackup.slice(-100);
				}
				ChatRoomMapViewEditBackup.push(backup as any);
			}
		}
		if (typeof ChatRoomMapViewUpdateFlag === "function") ChatRoomMapViewUpdateFlag();
		if (typeof ChatRoomMapViewUpdateRoomNext !== "undefined") {
			ChatRoomMapViewUpdateRoomNext = typeof CommonTime === "function" ? CommonTime() : 0;
		}
		if (typeof ChatRoomMapViewCalculatePerceptionMasks === "function") {
			ChatRoomMapViewCalculatePerceptionMasks();
		}
		if (typeof ChatRoomMapViewUpdateRoomSync === "function") {
			ChatRoomMapViewUpdateRoomSync();
		}
	} catch (e) {
		console.warn("[Seidr RM] map sync", e);
	}
}

export function rmExportCurrentMap(): string | null {
	if (!rmMapModeActive()) return null;
	try {
		if (typeof ChatRoomMapManager !== "undefined"
			&& ChatRoomMapManager
			&& ChatRoomMapManager.Map
			&& typeof ChatRoomMapManager.Map.exportString === "function") {
			return ChatRoomMapManager.Map.exportString();
		}
	} catch (e) {
		console.warn("[Seidr RM] exportString", e);
	}
	return null;
}

export function rmImportMapString(mapString: string): { ok: boolean; error?: string } {
	if (typeof mapString !== "string" || !mapString.length) {
		return { ok: false, error: "Nothing to paste" };
	}
	if (!rmIsAdmin()) return { ok: false, error: "Admin required" };
	if (!ChatRoomMapManager || !ChatRoomMapManager.Map || typeof ChatRoomMapManager.Map.importString !== "function") {
		return { ok: false, error: "Map import unavailable" };
	}
	let backup: unknown = null;
	try {
		if (ChatRoomData && ChatRoomData.MapData) {
			backup = typeof CommonCloneDeep === "function"
				? CommonCloneDeep(ChatRoomData.MapData)
				: JSON.parse(JSON.stringify(ChatRoomData.MapData));
		}
	} catch (e) {
		backup = null;
	}
	if (!ChatRoomMapManager.Map.importString(mapString)) {
		return { ok: false, error: "Map paste failed" };
	}
	pushMapRoomSync(backup);
	return { ok: true };
}

function sortByName(a: RmMapSeries, b: RmMapSeries): number {
	return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function sortVersions(versions: RmMapVersion[]): RmMapVersion[] {
	return versions.slice().sort(function (a, b) {
		if (rmIsDefaultVersionName(a.name) && !rmIsDefaultVersionName(b.name)) return -1;
		if (!rmIsDefaultVersionName(a.name) && rmIsDefaultVersionName(b.name)) return 1;
		return (b.savedAt || 0) - (a.savedAt || 0);
	});
}

/** Unified remote Defaults + local extras / fully-local maps. */
export function rmListAllMaps(): RmMapSeries[] {
	peelRemoteExtrasToLocal();
	const remote = rawRemoteMaps();
	const local = rmLoadLocalMaps();
	const byId: Record<string, RmMapSeries> = {};

	remote.forEach(function (m) {
		const def = pickDefault(m.versions);
		if (!def) return;
		byId[m.id] = {
			id: m.id,
			name: m.name,
			location: "remote",
			versions: [{
				id: def.id,
				name: RM_MAP_DEFAULT_NAME,
				data: def.data,
				savedAt: def.savedAt,
			}],
		};
	});

	local.forEach(function (m) {
		const existing = byId[m.id];
		if (existing && existing.location === "remote") {
			// Hybrid: keep remote Default, attach local extras only
			const extras = extrasOnly(m.versions);
			existing.versions = sortVersions(existing.versions.concat(extras));
			return;
		}
		// Fully local map (includes Default)
		let vers = m.versions.slice();
		if (!pickDefault(vers) && vers.length) {
			vers[0] = {
				id: vers[0].id,
				name: RM_MAP_DEFAULT_NAME,
				data: vers[0].data,
				savedAt: vers[0].savedAt,
			};
		}
		byId[m.id] = {
			id: m.id,
			name: m.name,
			location: "local",
			versions: sortVersions(vers),
		};
	});

	return Object.keys(byId).map(function (k) { return byId[k]; }).sort(sortByName);
}

export function rmListMaps(): RmMapSeries[] {
	return rmListAllMaps();
}

export function rmGetMap(id: string): RmMapSeries | null {
	return rmListAllMaps().find(function (m) { return m.id === id; }) || null;
}

export function rmListVersions(mapId: string): RmMapVersion[] {
	const m = rmGetMap(mapId);
	return m ? sortVersions(m.versions) : [];
}

export function rmDefaultVersionId(mapId: string): string | null {
	const m = rmGetMap(mapId);
	if (!m) return null;
	const def = pickDefault(m.versions);
	return def ? def.id : null;
}

export function rmLatestVersionId(mapId: string): string | null {
	return rmDefaultVersionId(mapId) || (rmListVersions(mapId)[0] && rmListVersions(mapId)[0].id) || null;
}

function upsertLocalEntry(mapId: string, name: string, versions: RmMapVersion[]): { ok: boolean; error?: string } {
	const local = rmLoadLocalMaps().slice();
	const idx = local.findIndex(function (m) { return m.id === mapId; });
	const entry: RmMapSeries = {
		id: mapId,
		name: name,
		location: "local",
		versions: versions,
	};
	if (idx >= 0) local[idx] = entry;
	else local.unshift(entry);
	return saveLocalMaps(local);
}

function removeLocalEntry(mapId: string): { ok: boolean; error?: string } {
	const local = rmLoadLocalMaps().filter(function (m) { return m.id !== mapId; });
	return saveLocalMaps(local);
}

function countLocalMapSlots(): number {
	// Fully local maps count toward localMax; hybrid extras-only share remote id and don't add a slot
	const remoteIds: Record<string, boolean> = {};
	rawRemoteMaps().forEach(function (m) { remoteIds[m.id] = true; });
	let n = 0;
	rmLoadLocalMaps().forEach(function (m) {
		if (!remoteIds[m.id]) n++;
	});
	return n;
}

export function rmSaveNewMap(
	name: string,
	_versionName?: string,
	location?: RmMapLocation,
): { ok: boolean; error?: string; map?: RmMapSeries; fellBackLocal?: boolean } {
	const data = rmExportCurrentMap();
	if (!data) return { ok: false, error: "No map to save (map room required)" };
	const loc = preferRemote(location);
	const fellBackLocal = !location && loc === "local";
	const def = makeDefaultVersion(data);
	const series: RmMapSeries = {
		id: rmNewId("m"),
		name: clampName(name, "Untitled"),
		location: loc,
		versions: [def],
	};

	if (loc === "remote") {
		const remote = rawRemoteMaps().map(function (m) {
			const d = pickDefault(m.versions);
			return {
				id: m.id,
				name: m.name,
				location: "remote" as const,
				versions: d ? [d] : [],
			};
		}).filter(function (m) { return m.versions.length > 0; });
		if (remote.length >= remoteMax()) {
			return { ok: false, error: "Remote map limit (" + remoteMax() + ")" };
		}
		remote.unshift({
			id: series.id,
			name: series.name,
			location: "remote",
			versions: [def],
		});
		const saved = persistRemoteDefaults(remote);
		if (!saved.ok) {
			series.location = "local";
			if (countLocalMapSlots() >= localMax()) {
				return { ok: false, error: saved.error || "Remote save failed; local full" };
			}
			const local = rmLoadLocalMaps().slice();
			local.unshift(series);
			const ls = saveLocalMaps(local);
			if (!ls.ok) return { ok: false, error: ls.error || saved.error };
			return { ok: true, map: series, fellBackLocal: true };
		}
		return { ok: true, map: series, fellBackLocal: fellBackLocal };
	}

	if (countLocalMapSlots() >= localMax()) {
		return { ok: false, error: "Local map limit (" + localMax() + ")" };
	}
	const local = rmLoadLocalMaps().slice();
	local.unshift(series);
	const ls = saveLocalMaps(local);
	if (!ls.ok) return { ok: false, error: ls.error };
	return { ok: true, map: series, fellBackLocal: fellBackLocal };
}

/** Append a non-Default version — always localStorage. */
export function rmSaveNewVersion(
	mapId: string,
	versionName: string,
): { ok: boolean; error?: string; version?: RmMapVersion } {
	const data = rmExportCurrentMap();
	if (!data) return { ok: false, error: "No map to save (map room required)" };
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const canon = rmCanonicalVersionName(versionName, "Version");
	if (rmIsDefaultVersionName(canon)) {
		return { ok: false, error: "Use Overwrite Default to update Default" };
	}
	const extras = extrasOnly(map.versions);
	if (extras.length >= localVerMax()) {
		return { ok: false, error: "Local version limit (" + localVerMax() + ")" };
	}
	const version = makeLocalVersion(canon, data);
	const nextExtras = [version].concat(extras);
	if (map.location === "remote") {
		const ls = upsertLocalEntry(mapId, map.name, nextExtras);
		if (!ls.ok) return { ok: false, error: ls.error };
		return { ok: true, version: version };
	}
	const def = pickDefault(map.versions);
	const all = (def ? [def] : []).concat(nextExtras);
	const ls = upsertLocalEntry(mapId, map.name, all);
	if (!ls.ok) return { ok: false, error: ls.error };
	return { ok: true, version: version };
}

/** Overwrite the Default version with the current room map. */
export function rmOverwriteDefault(
	mapId: string,
): { ok: boolean; error?: string; version?: RmMapVersion } {
	const data = rmExportCurrentMap();
	if (!data) return { ok: false, error: "No map to save (map room required)" };
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const prev = pickDefault(map.versions);
	const nextDef: RmMapVersion = {
		id: prev ? prev.id : rmNewId("mv"),
		name: RM_MAP_DEFAULT_NAME,
		data: data,
		savedAt: Date.now(),
	};

	if (map.location === "remote") {
		const remote = rawRemoteMaps().map(function (m) {
			if (m.id !== mapId) {
				const d = pickDefault(m.versions);
				return {
					id: m.id,
					name: m.name,
					location: "remote" as const,
					versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : [],
				};
			}
			return {
				id: mapId,
				name: map.name,
				location: "remote" as const,
				versions: [nextDef],
			};
		}).filter(function (m) { return m.versions.length > 0; });
		const saved = persistRemoteDefaults(remote);
		if (!saved.ok) return { ok: false, error: saved.error };
		return { ok: true, version: nextDef };
	}

	const extras = extrasOnly(map.versions);
	const ls = upsertLocalEntry(mapId, map.name, [nextDef].concat(extras));
	if (!ls.ok) return { ok: false, error: ls.error };
	return { ok: true, version: nextDef };
}

/** @deprecated prefer rmOverwriteDefault — overwrites Default when versionId is Default */
export function rmOverwriteVersion(
	mapId: string,
	versionId: string,
): { ok: boolean; error?: string; version?: RmMapVersion } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const ver = map.versions.find(function (v) { return v.id === versionId; });
	if (ver && rmIsDefaultVersionName(ver.name)) {
		return rmOverwriteDefault(mapId);
	}
	// Overwrite a local development version in place
	const data = rmExportCurrentMap();
	if (!data) return { ok: false, error: "No map to save (map room required)" };
	if (!ver) return { ok: false, error: "Version not found" };
	const next: RmMapVersion = {
		id: ver.id,
		name: ver.name,
		data: data,
		savedAt: Date.now(),
	};
	if (map.location === "remote") {
		const extras = extrasOnly(map.versions).map(function (v) {
			return v.id === versionId ? next : v;
		});
		const ls = upsertLocalEntry(mapId, map.name, extras);
		if (!ls.ok) return { ok: false, error: ls.error };
		return { ok: true, version: next };
	}
	const all = map.versions.map(function (v) {
		return v.id === versionId ? next : v;
	});
	const ls = upsertLocalEntry(mapId, map.name, all);
	if (!ls.ok) return { ok: false, error: ls.error };
	return { ok: true, version: next };
}

export function rmLoadMapVersion(mapId: string, versionId: string): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const ver = map.versions.find(function (v) { return v.id === versionId; });
	if (!ver) return { ok: false, error: "Version not found" };
	return rmImportMapString(ver.data);
}

export function rmLoadNamedMap(id: string): { ok: boolean; error?: string } {
	const defId = rmDefaultVersionId(id);
	if (!defId) return { ok: false, error: "Map not found" };
	return rmLoadMapVersion(id, defId);
}

export function rmRenameMap(mapId: string, name: string): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const nextName = clampName(name, map.name);
	if (map.location === "remote") {
		const remote = rawRemoteMaps().map(function (m) {
			const d = pickDefault(m.versions);
			return {
				id: m.id,
				name: m.id === mapId ? nextName : m.name,
				location: "remote" as const,
				versions: d
					? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }]
					: [],
			};
		}).filter(function (m) { return m.versions.length > 0; });
		const saved = persistRemoteDefaults(remote);
		if (!saved.ok) return { ok: false, error: saved.error };
		const local = rmLoadLocalMaps();
		const li = local.findIndex(function (m) { return m.id === mapId; });
		if (li >= 0) {
			local[li] = { id: mapId, name: nextName, location: "local", versions: local[li].versions };
			saveLocalMaps(local);
		}
		return { ok: true };
	}
	const ls = upsertLocalEntry(mapId, nextName, map.versions);
	return ls;
}

export function rmRenameVersion(
	mapId: string,
	versionId: string,
	name: string,
): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const ver = map.versions.find(function (v) { return v.id === versionId; });
	if (!ver) return { ok: false, error: "Version not found" };
	if (rmIsDefaultVersionName(ver.name)) {
		return { ok: false, error: "Default cannot be renamed" };
	}
	const canon = rmCanonicalVersionName(name, ver.name);
	if (rmIsDefaultVersionName(canon)) {
		return { ok: false, error: "Cannot rename to Default" };
	}
	const next: RmMapVersion = {
		id: ver.id,
		name: clampName(canon, ver.name),
		data: ver.data,
		savedAt: ver.savedAt,
	};
	if (map.location === "remote") {
		const extras = extrasOnly(map.versions).map(function (v) {
			return v.id === versionId ? next : v;
		});
		return upsertLocalEntry(mapId, map.name, extras);
	}
	const all = map.versions.map(function (v) {
		return v.id === versionId ? next : v;
	});
	return upsertLocalEntry(mapId, map.name, all);
}

export function rmDeleteMap(mapId: string): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	removeLocalEntry(mapId);
	if (map.location === "remote") {
		const remote = rawRemoteMaps()
			.filter(function (m) { return m.id !== mapId; })
			.map(function (m) {
				const d = pickDefault(m.versions);
				return {
					id: m.id,
					name: m.name,
					location: "remote" as const,
					versions: d
						? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }]
						: [],
				};
			})
			.filter(function (m) { return m.versions.length > 0; });
		return persistRemoteDefaults(remote);
	}
	return { ok: true };
}

export function rmDeleteNamedMap(id: string): { ok: boolean; error?: string } {
	return rmDeleteMap(id);
}

export function rmDeleteVersion(mapId: string, versionId: string): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	const ver = map.versions.find(function (v) { return v.id === versionId; });
	if (!ver) return { ok: false, error: "Version not found" };
	if (rmIsDefaultVersionName(ver.name)) {
		if (map.versions.length <= 1) return rmDeleteMap(mapId);
		return { ok: false, error: "Cannot delete Default while other versions exist — delete the map instead" };
	}
	if (map.location === "remote") {
		const extras = extrasOnly(map.versions).filter(function (v) { return v.id !== versionId; });
		if (!extras.length) return removeLocalEntry(mapId);
		return upsertLocalEntry(mapId, map.name, extras);
	}
	const all = map.versions.filter(function (v) { return v.id !== versionId; });
	if (!all.length) return rmDeleteMap(mapId);
	return upsertLocalEntry(mapId, map.name, all);
}

export function rmSetMapLocation(
	mapId: string,
	location: RmMapLocation,
): { ok: boolean; error?: string } {
	const map = rmGetMap(mapId);
	if (!map) return { ok: false, error: "Map not found" };
	if (map.location === location) return { ok: true };
	const def = pickDefault(map.versions);
	if (!def) return { ok: false, error: "Map has no Default version" };
	const extras = extrasOnly(map.versions);

	if (location === "remote") {
		const remote = rawRemoteMaps().map(function (m) {
			const d = pickDefault(m.versions);
			return {
				id: m.id,
				name: m.name,
				location: "remote" as const,
				versions: d
					? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }]
					: [],
			};
		}).filter(function (m) { return m.versions.length > 0; });
		if (remote.length >= remoteMax()) {
			return { ok: false, error: "Remote map limit (" + remoteMax() + ")" };
		}
		remote.push({
			id: map.id,
			name: map.name,
			location: "remote",
			versions: [{ id: def.id, name: RM_MAP_DEFAULT_NAME, data: def.data, savedAt: def.savedAt }],
		});
		const can = rmCanSaveMaps(rmSerializeRemoteMaps(remote));
		if (!can.ok) return { ok: false, error: can.error };
		const saved = persistRemoteDefaults(remote);
		if (!saved.ok) return { ok: false, error: saved.error };
		// Keep extras locally; drop Default from local entry
		if (extras.length) {
			return upsertLocalEntry(mapId, map.name, extras);
		}
		return removeLocalEntry(mapId);
	}

	// → local: Default + extras in localStorage
	if (countLocalMapSlots() >= localMax() && !rmLoadLocalMaps().some(function (m) { return m.id === mapId; })) {
		// moving remote→local: this id isn't a local-only slot yet
		// if hybrid extras exist, slot already "used" via remote — allow
	}
	const fullyLocal = !rawRemoteMaps().some(function (m) { return m.id === mapId; });
	if (fullyLocal === false) {
		// currently remote; after move it becomes a local-only slot
		if (countLocalMapSlots() >= localMax()) {
			return { ok: false, error: "Local map limit (" + localMax() + ")" };
		}
	}
	const all = [def].concat(extras);
	const ls = upsertLocalEntry(mapId, map.name, all);
	if (!ls.ok) return { ok: false, error: ls.error };
	const remote = rawRemoteMaps()
		.filter(function (m) { return m.id !== mapId; })
		.map(function (m) {
			const d = pickDefault(m.versions);
			return {
				id: m.id,
				name: m.name,
				location: "remote" as const,
				versions: d
					? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }]
					: [],
			};
		})
		.filter(function (m) { return m.versions.length > 0; });
	return persistRemoteDefaults(remote);
}

export function rmSaveNamedMap(
	name: string,
	overwriteId?: string,
): { ok: boolean; error?: string; entry?: RmMapSeries; map?: RmMapSeries } {
	if (overwriteId) {
		const r = rmOverwriteDefault(overwriteId);
		if (!r.ok) return { ok: false, error: r.error };
		const map = rmGetMap(overwriteId);
		return { ok: true, entry: map || undefined, map: map || undefined };
	}
	const r = rmSaveNewMap(name);
	return { ok: r.ok, error: r.error, entry: r.map, map: r.map };
}

export type SeidrMapsExportPayload = {
	v: 1;
	kind: "SeidrMaps";
	maps: { name: string; versions: { name: string; data: string; savedAt: number }[] }[];
};

export function rmExportMapsJson(): string {
	const maps = rmListAllMaps();
	const payload: SeidrMapsExportPayload = {
		v: 1,
		kind: "SeidrMaps",
		maps: maps.map(function (m) {
			return {
				name: m.name,
				versions: m.versions.map(function (v) {
					return { name: v.name, data: v.data, savedAt: v.savedAt };
				}),
			};
		}),
	};
	return JSON.stringify(payload, null, 2);
}

export type RmMapsImportCandidate = {
	name: string;
	versions: { name: string; data: string; savedAt: number }[];
};

export type RmParseMapsResult =
	| { ok: true; maps: RmMapsImportCandidate[] }
	| { ok: false; error: string };

export function rmParseMapsImport(raw: string): RmParseMapsResult {
	const text = String(raw || "").trim();
	if (!text) return { ok: false, error: "Paste or choose a maps export first" };
	let data: unknown = null;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return { ok: false, error: "Invalid JSON" };
	}
	if (!data || typeof data !== "object") return { ok: false, error: "Invalid export data" };
	const d = data as Partial<SeidrMapsExportPayload> & { maps?: unknown[] };
	if (d.kind !== "SeidrMaps" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format (need SeidrMaps v1)" };
	}
	if (!Array.isArray(d.maps)) return { ok: false, error: "Export has no maps list" };
	const out: RmMapsImportCandidate[] = [];
	for (let i = 0; i < d.maps.length; i++) {
		const row = d.maps[i] as Partial<RmMapsImportCandidate> & Partial<RmMapSeries> & { data?: string; savedAt?: number };
		const name = clampName(row.name, "Imported " + (i + 1));
		const versions: { name: string; data: string; savedAt: number }[] = [];
		if (Array.isArray(row.versions)) {
			for (let j = 0; j < row.versions.length; j++) {
				const v = rmNormalizeMapVersion(row.versions[j], j === 0 ? RM_MAP_DEFAULT_NAME : "v" + (j + 1));
				if (v) versions.push({ name: v.name, data: v.data, savedAt: v.savedAt });
			}
		} else if (typeof row.data === "string" && row.data.length) {
			versions.push({
				name: RM_MAP_DEFAULT_NAME,
				data: row.data,
				savedAt: typeof row.savedAt === "number" ? row.savedAt : Date.now(),
			});
		}
		if (versions.length && !versions.some(function (v) { return rmIsDefaultVersionName(v.name); })) {
			versions[0] = {
				name: RM_MAP_DEFAULT_NAME,
				data: versions[0].data,
				savedAt: versions[0].savedAt,
			};
		}
		if (versions.length) out.push({ name: name, versions: versions });
	}
	if (!out.length) return { ok: false, error: "No valid maps in export" };
	return { ok: true, maps: out };
}

export function rmImportSelectedMaps(
	candidates: RmMapsImportCandidate[],
): { ok: boolean; error?: string; imported: number } {
	if (!candidates || !candidates.length) {
		return { ok: false, error: "Select at least one map", imported: 0 };
	}
	let local = rmLoadLocalMaps().slice();
	let imported = 0;
	for (let i = 0; i < candidates.length; i++) {
		if (countLocalMapSlots() + imported >= localMax()) {
			return {
				ok: imported > 0,
				error: imported > 0
					? "Imported " + imported + "; local limit reached"
					: "Local map limit (" + localMax() + ")",
				imported: imported,
			};
		}
		const c = candidates[i];
		const vers: RmMapVersion[] = [];
		let hasDefault = false;
		const verCap = localVerMax() + 1;
		for (let j = 0; j < c.versions.length && vers.length < verCap; j++) {
			const v = c.versions[j];
			let vname = rmCanonicalVersionName(v.name, j === 0 ? RM_MAP_DEFAULT_NAME : "v" + (j + 1));
			if (rmIsDefaultVersionName(vname)) {
				if (hasDefault) vname = "Import " + (j + 1);
				else hasDefault = true;
			}
			vers.push({
				id: rmNewId("mv"),
				name: clampName(vname, "v" + (j + 1)),
				data: v.data,
				savedAt: typeof v.savedAt === "number" ? v.savedAt : Date.now(),
			});
		}
		if (!vers.length) continue;
		if (!hasDefault) {
			vers[0] = {
				id: vers[0].id,
				name: RM_MAP_DEFAULT_NAME,
				data: vers[0].data,
				savedAt: vers[0].savedAt,
			};
		}
		local.unshift({
			id: rmNewId("m"),
			name: clampName(c.name, "Imported"),
			location: "local",
			versions: vers,
		});
		imported++;
	}
	const ls = saveLocalMaps(local);
	if (!ls.ok) return { ok: false, error: ls.error, imported: 0 };
	return { ok: true, imported: imported };
}

export function rmLocalMapsBytesEstimate(): number {
	try {
		return rmSliceBytes({ maps: rmLoadLocalMaps() });
	} catch (e) {
		return 0;
	}
}

export function rmLocalMapsStats(): { maps: number; versions: number; bytes: number; label: string } {
	peelRemoteExtrasToLocal();
	const maps = rmLoadLocalMaps();
	let versions = 0;
	for (let i = 0; i < maps.length; i++) versions += maps[i].versions.length;
	const bytes = rmLocalMapsBytesEstimate();
	return {
		maps: maps.length,
		versions: versions,
		bytes: bytes,
		label: maps.length + " local entries · " + versions + " versions · " + rmFormatBytes(bytes),
	};
}
