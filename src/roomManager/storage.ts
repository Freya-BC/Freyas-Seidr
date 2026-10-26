/** Seidr Room Manager — ExtensionSettings LZ + usage */
import { Seidr } from "../seidr";
import { rmEmptyStore, rmNormalizeStore, type RmStore } from "./model";

let _store: RmStore | null = null;
let _lastBytes = 0;

function lz() {
	try {
		if (typeof LZString !== "undefined" && LZString) return LZString;
	} catch (e) { /* ignore */ }
	return null;
}

function pack(obj: unknown): string {
	const json = JSON.stringify(obj);
	const L = lz();
	const prefix = Seidr.RM_LZ_PREFIX || "SeidrRm1:";
	if (L && typeof L.compressToUTF16 === "function" && json.length > 400) {
		return prefix + L.compressToUTF16(json);
	}
	return json;
}

function unpack(raw: unknown): unknown {
	if (raw == null || raw === "") return null;
	if (typeof raw === "object") return raw;
	if (typeof raw !== "string") return null;
	const prefix = Seidr.RM_LZ_PREFIX || "SeidrRm1:";
	try {
		if (raw.startsWith(prefix)) {
			const L = lz();
			if (!L || typeof L.decompressFromUTF16 !== "function") return null;
			const plain = L.decompressFromUTF16(raw.slice(prefix.length));
			return plain ? JSON.parse(plain) : null;
		}
		if (typeof LZString !== "undefined" && LZString.decompressFromBase64) {
			const plain = LZString.decompressFromBase64(raw);
			if (plain) return JSON.parse(plain);
		}
		return JSON.parse(raw);
	} catch (e) {
		console.warn("[Seidr RM] unpack failed", e);
		return null;
	}
}

export function rmGetStore(): RmStore {
	if (_store) return _store;
	let data: unknown = null;
	const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
	try {
		if (Player && Player.ExtensionSettings && Player.ExtensionSettings[key] != null) {
			const raw = Player.ExtensionSettings[key];
			if (typeof raw === "string") _lastBytes = raw.length;
			data = unpack(raw);
		}
	} catch (e) {
		console.warn("[Seidr RM] ES read failed", e);
	}
	_store = rmNormalizeStore(data);
	return _store;
}

export function rmSaveStore(): { ok: boolean; error?: string; bytes: number } {
	const store = rmGetStore();
	const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
	const packed = pack(store);
	const max = Seidr.RM_MAX_COMPRESSED || 180000;
	_lastBytes = packed.length;
	if (packed.length > max) {
		return { ok: false, error: "Storage full (" + rmFormatBytes(packed.length) + " / " + rmFormatBytes(max) + ")", bytes: packed.length };
	}
	try {
		if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
		Player.ExtensionSettings[key] = packed;
		if (typeof ServerPlayerExtensionSettingsSync === "function") {
			ServerPlayerExtensionSettingsSync(key);
		}
	} catch (e) {
		console.warn("[Seidr RM] ES write failed", e);
		return { ok: false, error: "Save failed", bytes: packed.length };
	}
	return { ok: true, bytes: packed.length };
}

export function rmInvalidateStore() {
	_store = null;
}

export function rmCompressedBytes(): number {
	if (_lastBytes) return _lastBytes;
	try {
		const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
		const raw = Player && Player.ExtensionSettings && Player.ExtensionSettings[key];
		if (typeof raw === "string") {
			_lastBytes = raw.length;
			return _lastBytes;
		}
	} catch (e) { /* ignore */ }
	return 0;
}

export function rmMapsBytesEstimate(store?: RmStore): number {
	const s = store || rmGetStore();
	try {
		return pack({ maps: s.maps || [] }).length;
	} catch (e) {
		return 0;
	}
}

export function rmMapBudgetBytes(): number {
	const max = Seidr.RM_MAX_COMPRESSED || 180000;
	const ratio = typeof Seidr.RM_MAP_BUDGET_RATIO === "number" ? Seidr.RM_MAP_BUDGET_RATIO : 0.75;
	return Math.floor(max * ratio);
}

export function rmCanSaveMaps(nextMaps: unknown[]): { ok: boolean; error?: string } {
	const probe = pack({ maps: nextMaps });
	const budget = rmMapBudgetBytes();
	if (probe.length > budget) {
		return { ok: false, error: "Maps would exceed 75% storage budget (" + rmFormatBytes(probe.length) + " / " + rmFormatBytes(budget) + ")" };
	}
	const store = rmGetStore();
	const full = pack(Object.assign({}, store, { maps: nextMaps }));
	const max = Seidr.RM_MAX_COMPRESSED || 180000;
	if (full.length > max) {
		return { ok: false, error: "Total storage full" };
	}
	return { ok: true };
}

export function rmFormatBytes(bytes: number): string {
	const n = Math.max(0, Number(bytes) || 0);
	if (n < 1024) return n.toFixed(0) + " B";
	return (n / 1024).toFixed(2) + " KB";
}

/** Packed size of an arbitrary slice (same LZ rules as the full bag). */
export function rmSliceBytes(slice: unknown): number {
	try {
		return pack(slice).length;
	} catch (e) {
		return 0;
	}
}

export type RmUsageBreakdown = {
	total: number;
	max: number;
	maps: number;
	room: number;
	access: number;
	backgrounds: number;
	actions: number;
	settings: number;
	ui: number;
	mapBudget: number;
};

/** Per-category compressed estimates + live total/max for Settings Storage UI. */
export function rmUsageBreakdown(store?: RmStore): RmUsageBreakdown {
	const s = store || rmGetStore();
	const settings = s.settings || {};
	const actions = (settings as { actions?: unknown }).actions;
	const settingsRest: Record<string, unknown> = {};
	try {
		Object.keys(settings as object).forEach(function (k) {
			if (k === "actions") return;
			settingsRest[k] = (settings as Record<string, unknown>)[k];
		});
	} catch (e) { /* ignore */ }
	return {
		total: rmCompressedBytes() || rmSliceBytes(s),
		max: Seidr.RM_MAX_COMPRESSED || 180000,
		maps: rmSliceBytes({ maps: s.maps || [] }),
		room: rmSliceBytes({ room: s.room || {} }),
		access: rmSliceBytes({ access: s.access || {} }),
		backgrounds: rmSliceBytes({ backgrounds: s.backgrounds || [] }),
		actions: rmSliceBytes({ actions: actions != null ? actions : { nextId: 1, list: [] } }),
		settings: rmSliceBytes({ settings: settingsRest }),
		ui: rmSliceBytes({ ui: s.ui || {} }),
		mapBudget: rmMapBudgetBytes(),
	};
}

export function rmUsageLabel(): string {
	const used = rmCompressedBytes();
	const max = Seidr.RM_MAX_COMPRESSED || 180000;
	const maps = rmMapsBytesEstimate();
	const mapCap = rmMapBudgetBytes();
	return "Storage: " + rmFormatBytes(used) + " / " + rmFormatBytes(max)
		+ "  (maps " + rmFormatBytes(maps) + " · 75% cap " + rmFormatBytes(mapCap) + ")";
}
