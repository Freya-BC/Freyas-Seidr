/** Named maps — FBM-style exportString / importString */
import { Seidr } from "../seidr";
import { rmGetStore, rmSaveStore, rmCanSaveMaps } from "./storage";
import { rmNewId, type RmMapEntry } from "./model";
import { rmIsAdmin, rmMapModeActive } from "./roomApply";

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

export function rmListMaps(): RmMapEntry[] {
	return (rmGetStore().maps || []).slice();
}

export function rmSaveNamedMap(name: string, overwriteId?: string): { ok: boolean; error?: string; entry?: RmMapEntry } {
	const data = rmExportCurrentMap();
	if (!data) return { ok: false, error: "No map to save (map room required)" };
	const store = rmGetStore();
	const entry: RmMapEntry = {
		id: overwriteId || rmNewId("m"),
		name: String(name || "Untitled").trim().slice(0, 48) || "Untitled",
		data: data,
		savedAt: Date.now(),
	};
	let maps = store.maps.slice();
	if (overwriteId) {
		const idx = maps.findIndex(function (m) { return m.id === overwriteId; });
		if (idx < 0) return { ok: false, error: "Map not found" };
		maps[idx] = entry;
	} else {
		maps.unshift(entry);
		const max = Seidr.RM_MAP_MAX || 10;
		while (maps.length > max) maps.pop();
	}
	const can = rmCanSaveMaps(maps);
	if (!can.ok) return { ok: false, error: can.error };
	store.maps = maps;
	const saved = rmSaveStore();
	if (!saved.ok) return { ok: false, error: saved.error };
	return { ok: true, entry: entry };
}

export function rmLoadNamedMap(id: string): { ok: boolean; error?: string } {
	const entry = rmGetStore().maps.find(function (m) { return m.id === id; });
	if (!entry) return { ok: false, error: "Map not found" };
	return rmImportMapString(entry.data);
}
