/**
 * Seidr persistence — ExtensionSettings, split per domain, debounced + deduped.
 *
 * Keys (see defaults.ts):
 *   SeidrRoomManager  room presets, access, backgrounds, remote maps   (marker migrated:2)
 *   SeidrSettings     settings without the three bags below
 *   SeidrActions      settings.actions
 *   SeidrCommands     settings.commands
 *   SeidrAnimations   settings.animations
 *
 * rmGetStore() still returns ONE in-memory RmStore (callers unchanged). rmSaveStore():
 *   - packs only domains whose JSON changed (Base64 LZ, "SeidrRm2:"),
 *   - writes Player.ExtensionSettings locally right away (UI sees the new value),
 *   - sends AccountUpdate per changed key, debounced (SAVE_DEBOUNCE_MS) and deduped against
 *     what was last sent, so a burst of edits costs one small upload per touched key.
 * Legacy single-blob data (SeidrRm1: UTF16 or plain LZ/JSON in SeidrRoomManager) is split
 * once on first load. Panel geometry is not stored here (localStorage, see shell.ts).
 */
import { Seidr } from "../seidr";
import { seidrDefaultSettings } from "../settings/model";
import { rmEmptyStore, rmNormalizeStore, type RmStore } from "./model";

const SAVE_DEBOUNCE_MS = 1500;

type DomainId = "rm" | "settings" | "actions" | "commands" | "animations";
const DOMAINS: DomainId[] = ["rm", "settings", "actions", "commands", "animations"];

let _store: RmStore | null = null;
/** Sum of packed sizes (bytes of the stored strings) as of the last load/save. */
let _lastBytes = 0;
/** Last packed string known to be on the server (or already sent) per ES key. */
const _sent: Record<string, string> = {};
/** json -> packed memo per ES key, so unchanged domains are never recompressed. */
const _memo: Record<string, { json: string; packed: string }> = {};
const _pending: Record<string, boolean> = {};
let _timer: ReturnType<typeof setTimeout> | null = null;
let _flushInstalled = false;

function lz() {
	try {
		if (typeof LZString !== "undefined" && LZString) return LZString;
	} catch (e) { /* ignore */ }
	return null;
}

function keyOf(id: DomainId): string {
	switch (id) {
		case "rm": return Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
		case "settings": return Seidr.RM_KEY_SETTINGS || "SeidrSettings";
		case "actions": return Seidr.RM_KEY_ACTIONS || "SeidrActions";
		case "commands": return Seidr.RM_KEY_COMMANDS || "SeidrCommands";
		default: return Seidr.RM_KEY_ANIMATIONS || "SeidrAnimations";
	}
}

function maxBytes(): number {
	return Seidr.RM_MAX_BYTES || 180000;
}

/** Plain JSON for tiny payloads, "SeidrRm2:" + LZ Base64 when that is actually shorter. */
function packJson(json: string): string {
	const L = lz();
	if (!L || typeof L.compressToBase64 !== "function" || json.length < 120) return json;
	const packed = (Seidr.RM_B64_PREFIX || "SeidrRm2:") + L.compressToBase64(json);
	return packed.length < json.length ? packed : json;
}

function pack(obj: unknown): string {
	return packJson(JSON.stringify(obj));
}

function packMemo(key: string, obj: unknown): string {
	const json = JSON.stringify(obj);
	const hit = _memo[key];
	if (hit && hit.json === json) return hit.packed;
	const packed = packJson(json);
	_memo[key] = { json: json, packed: packed };
	return packed;
}

function unpack(raw: unknown): unknown {
	if (raw == null || raw === "") return null;
	if (typeof raw === "object") return raw;
	if (typeof raw !== "string") return null;
	const p2 = Seidr.RM_B64_PREFIX || "SeidrRm2:";
	const p1 = Seidr.RM_LZ_PREFIX || "SeidrRm1:";
	try {
		if (raw.startsWith(p2)) {
			const L = lz();
			if (!L || typeof L.decompressFromBase64 !== "function") return null;
			const plain = L.decompressFromBase64(raw.slice(p2.length));
			return plain ? JSON.parse(plain) : null;
		}
		if (raw.startsWith(p1)) {
			const L = lz();
			if (!L || typeof L.decompressFromUTF16 !== "function") return null;
			const plain = L.decompressFromUTF16(raw.slice(p1.length));
			return plain ? JSON.parse(plain) : null;
		}
		const c = raw.charAt(0);
		if (c === "{" || c === "[") return JSON.parse(raw);
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

function esBag(): Record<string, unknown> | null {
	try {
		if (typeof Player !== "undefined" && Player) {
			if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
			return Player.ExtensionSettings as Record<string, unknown>;
		}
	} catch (e) { /* ignore */ }
	return null;
}

/** Split the in-memory store into the five stored domains. */
function splitStore(store: RmStore): Record<DomainId, unknown> {
	const settings = (store.settings || {}) as Record<string, unknown>;
	const rest: Record<string, unknown> = {};
	Object.keys(settings).forEach(function (k) {
		if (k === "actions" || k === "commands" || k === "animations") return;
		rest[k] = settings[k];
	});
	return {
		rm: {
			migrated: 2,
			version: store.version,
			room: store.room,
			access: store.access,
			backgrounds: store.backgrounds,
			maps: store.maps,
		},
		settings: rest,
		actions: settings.actions,
		commands: settings.commands,
		animations: settings.animations,
	};
}

function isDefaultBag(id: DomainId, value: unknown): boolean {
	if (id !== "actions" && id !== "commands" && id !== "animations") return false;
	try {
		const def = seidrDefaultSettings() as unknown as Record<string, unknown>;
		return JSON.stringify(value) === JSON.stringify(def[id]);
	} catch (e) {
		return false;
	}
}

function packedTotal(parts: Record<DomainId, unknown>, memo: boolean): number {
	let total = 0;
	const es = esBag();
	DOMAINS.forEach(function (id) {
		const value = parts[id];
		if (value === undefined) return;
		const key = keyOf(id);
		if (isDefaultBag(id, value) && (!es || es[key] === undefined)) return;
		total += (memo ? packMemo(key, value) : pack(value)).length;
	});
	return total;
}

function composeFromEs(rmObj: Record<string, unknown>, es: Record<string, unknown>): unknown {
	const settings: Record<string, unknown> = {};
	const rest = unpack(es[keyOf("settings")]);
	if (rest && typeof rest === "object") Object.assign(settings, rest as Record<string, unknown>);
	(["actions", "commands", "animations"] as DomainId[]).forEach(function (id) {
		const bag = unpack(es[keyOf(id)]);
		if (bag != null) settings[id] = bag;
	});
	return Object.assign({}, rmObj, { settings: settings });
}

function legacyUiToLocal(ui: unknown) {
	try {
		const u = ui as { x?: number; y?: number; w?: number; h?: number } | undefined;
		if (!u || !u.w || !u.h) return;
		const id = typeof Player !== "undefined" && Player && Player.MemberNumber != null ? Player.MemberNumber : "0";
		const k = "SeidrRmUi_" + id;
		if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(u));
	} catch (e) { /* ignore */ }
}

export function rmGetStore(): RmStore {
	if (_store) return _store;
	let data: unknown = null;
	let legacy = false;
	const es = esBag();
	try {
		if (es) {
			const rmKey = keyOf("rm");
			const raw = es[rmKey];
			DOMAINS.forEach(function (id) {
				const k = keyOf(id);
				if (typeof es[k] === "string") _sent[k] = es[k] as string;
			});
			const obj = unpack(raw);
			if (obj && typeof obj === "object" && (obj as { migrated?: number }).migrated === 2) {
				data = composeFromEs(obj as Record<string, unknown>, es);
			} else if (obj && typeof obj === "object") {
				data = obj;
				legacy = true;
			}
		}
	} catch (e) {
		console.warn("[Seidr RM] ES read failed", e);
	}
	_store = rmNormalizeStore(data);
	if (legacy) {
		// One-time split of the old single blob; write immediately so a reload keeps the result.
		legacyUiToLocal((data as { ui?: unknown }).ui);
		_store.ui = {};
		DOMAINS.forEach(function (id) { delete _sent[keyOf(id)]; });
		saveInternal(true);
		rmFlushStore();
	} else if (es) {
		_lastBytes = packedTotal(splitStore(_store), true);
	}
	return _store;
}

/** Send every pending key now (deduped against what the server already has). */
export function rmFlushStore() {
	if (_timer) {
		clearTimeout(_timer);
		_timer = null;
	}
	const es = esBag();
	if (!es) return;
	Object.keys(_pending).forEach(function (key) {
		delete _pending[key];
		const value = es[key];
		if (typeof value !== "string" || value === _sent[key]) return;
		try {
			if (typeof ServerPlayerExtensionSettingsSync === "function") {
				ServerPlayerExtensionSettingsSync(key);
				_sent[key] = value;
			}
		} catch (e) {
			console.warn("[Seidr RM] ES sync failed", key, e);
		}
	});
}

function scheduleFlush() {
	if (_timer) clearTimeout(_timer);
	_timer = setTimeout(rmFlushStore, SAVE_DEBOUNCE_MS);
	if (!_flushInstalled) {
		_flushInstalled = true;
		try {
			window.addEventListener("beforeunload", rmFlushStore);
			window.addEventListener("pagehide", rmFlushStore);
		} catch (e) { /* ignore */ }
	}
}

export function rmSaveStore(): { ok: boolean; error?: string; bytes: number } {
	return saveInternal(false);
}

function saveInternal(force: boolean): { ok: boolean; error?: string; bytes: number } {
	const store = rmGetStore();
	const es = esBag();
	if (!es) return { ok: false, error: "Save failed", bytes: 0 };
	const parts = splitStore(store);
	const total = packedTotal(parts, true);
	// Over the cap: only allow saves that do not grow what is already stored (heavy users
	// migrated from the old UTF16 format must still be able to edit and delete).
	if (!force && total > maxBytes() && total > _lastBytes) {
		return {
			ok: false,
			error: "Storage full (" + rmFormatBytes(total) + " / " + rmFormatBytes(maxBytes()) + ")",
			bytes: total,
		};
	}
	try {
		DOMAINS.forEach(function (id) {
			const value = parts[id];
			if (value === undefined) return;
			const key = keyOf(id);
			if (isDefaultBag(id, value) && es[key] === undefined) return;
			const packed = packMemo(key, value);
			if (es[key] === packed) return;
			es[key] = packed;
			_pending[key] = true;
		});
	} catch (e) {
		console.warn("[Seidr RM] ES write failed", e);
		return { ok: false, error: "Save failed", bytes: total };
	}
	_lastBytes = total;
	if (Object.keys(_pending).length) scheduleFlush();
	return { ok: true, bytes: total };
}

export function rmInvalidateStore() {
	_store = null;
}

export function rmCompressedBytes(): number {
	if (_lastBytes) return _lastBytes;
	try {
		rmGetStore();
	} catch (e) { /* ignore */ }
	return _lastBytes;
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
	const ratio = typeof Seidr.RM_MAP_BUDGET_RATIO === "number" ? Seidr.RM_MAP_BUDGET_RATIO : 0.75;
	return Math.floor(maxBytes() * ratio);
}

export function rmCanSaveMaps(nextMaps: unknown[]): { ok: boolean; error?: string } {
	const probe = pack({ maps: nextMaps });
	const budget = rmMapBudgetBytes();
	if (probe.length > budget) {
		return { ok: false, error: "Maps would exceed 75% storage budget (" + rmFormatBytes(probe.length) + " / " + rmFormatBytes(budget) + ")" };
	}
	const store = rmGetStore();
	const full = packedTotal(splitStore(Object.assign({}, store, { maps: nextMaps }) as RmStore), false);
	if (full > maxBytes() && full > _lastBytes) {
		return { ok: false, error: "Total storage full" };
	}
	return { ok: true };
}

export function rmFormatBytes(bytes: number): string {
	const n = Math.max(0, Number(bytes) || 0);
	if (n < 1024) return n.toFixed(0) + " B";
	return (n / 1024).toFixed(2) + " KB";
}

/** Packed size of an arbitrary slice (same packing rules as the stored keys). */
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
	commands: number;
	animations: number;
	settings: number;
	ui: number;
	mapBudget: number;
};

/** Per-category packed estimates + live total/max for Settings Storage UI. */
export function rmUsageBreakdown(store?: RmStore): RmUsageBreakdown {
	const s = store || rmGetStore();
	const settings = s.settings || {};
	const actions = (settings as { actions?: unknown }).actions;
	const commands = (settings as { commands?: unknown }).commands;
	const animations = (settings as { animations?: unknown }).animations;
	const settingsRest: Record<string, unknown> = {};
	try {
		Object.keys(settings as object).forEach(function (k) {
			if (k === "actions" || k === "commands" || k === "animations") return;
			settingsRest[k] = (settings as Record<string, unknown>)[k];
		});
	} catch (e) { /* ignore */ }
	return {
		total: rmCompressedBytes() || rmSliceBytes(s),
		max: maxBytes(),
		maps: rmSliceBytes({ maps: s.maps || [] }),
		room: rmSliceBytes({ room: s.room || {} }),
		access: rmSliceBytes({ access: s.access || {} }),
		backgrounds: rmSliceBytes({ backgrounds: s.backgrounds || [] }),
		actions: rmSliceBytes({ actions: actions != null ? actions : { nextId: 1, list: [] } }),
		commands: rmSliceBytes({
			commands: commands != null ? commands : { nextPersonId: 1, nextActionId: 1, people: [], actions: [] },
		}),
		animations: rmSliceBytes({
			animations: animations != null ? animations : { nextId: 1, list: [] },
		}),
		settings: rmSliceBytes({ settings: settingsRest }),
		ui: 0,
		mapBudget: rmMapBudgetBytes(),
	};
}

export function rmUsageLabel(): string {
	const used = rmCompressedBytes();
	const maps = rmMapsBytesEstimate();
	const mapCap = rmMapBudgetBytes();
	return "Storage: " + rmFormatBytes(used) + " / " + rmFormatBytes(maxBytes())
		+ "  (maps " + rmFormatBytes(maps) + " · 75% cap " + rmFormatBytes(mapCap) + ")";
}

/** Test hook: forget memoized/sent state (does not touch Player.ExtensionSettings). */
export function rmResetStorageCaches() {
	_store = null;
	_lastBytes = 0;
	DOMAINS.forEach(function (id) {
		const k = keyOf(id);
		delete _sent[k];
		delete _memo[k];
		delete _pending[k];
	});
	if (_timer) {
		clearTimeout(_timer);
		_timer = null;
	}
}

/** Flush pending uploads when leaving a room, and before a hot reload. */
export function rmInstallFlushHooks() {
	Seidr.tryHook("StorageFlush:ChatRoomLeave", "ChatRoomLeave", 8, function (args, next) {
		try { rmFlushStore(); } catch (e) { /* ignore */ }
		return next(args);
	});
}

Seidr.rmFlushStore = rmFlushStore;
Seidr.installStorageFlush = rmInstallFlushHooks;
