/** Seidr Room Manager — store shape */
import { Seidr } from "../seidr";
import { seidrDefaultSettings, seidrNormalizeSettings, type SeidrSettings } from "../settings/model";

export type RmRoomPreset = {
	Name?: string;
	Language?: string;
	Description?: string;
	Limit?: number;
	BlockCategory?: string[];
	Game?: string;
	Visibility?: string[];
	Access?: string[];
	MapData?: { Type?: string; [k: string]: unknown };
};

export type RmAccessPreset = {
	Admin?: number[];
	Whitelist?: number[];
	Ban?: number[];
};

export type RmBackgroundEntry = {
	id: string;
	name: string;
	url: string;
};

export type RmMapLocation = "remote" | "local";

/** Only this version name may sync to ExtensionSettings. */
export const RM_MAP_DEFAULT_NAME = "Default";

export type RmMapVersion = {
	id: string;
	name: string;
	data: string;
	savedAt: number;
};

export function rmIsDefaultVersionName(name: string): boolean {
	return String(name || "") === RM_MAP_DEFAULT_NAME;
}

/** Original / Initial → Default; other names unchanged. */
export function rmCanonicalVersionName(raw: unknown, fallback?: string): string {
	const s = String(raw == null ? "" : raw).trim().slice(0, 48);
	if (!s) return fallback || RM_MAP_DEFAULT_NAME;
	if (s === "Original" || s === "Initial") return RM_MAP_DEFAULT_NAME;
	return s;
}

/** Named map series with version stack (remote ExtensionSettings or local browser). */
export type RmMapSeries = {
	id: string;
	name: string;
	location: RmMapLocation;
	versions: RmMapVersion[];
};

/** @deprecated flat shape — migrated in rmNormalizeMapSeries */
export type RmMapEntry = {
	id: string;
	name: string;
	data: string;
	savedAt: number;
};

export type RmStore = {
	version: number;
	room: Record<string, RmRoomPreset>;
	access: Record<string, RmAccessPreset>;
	backgrounds: RmBackgroundEntry[];
	/** Remote map series only (location forced to remote). */
	maps: RmMapSeries[];
	ui?: { x?: number; y?: number; w?: number; h?: number };
	settings?: SeidrSettings;
};

export function rmEmptyStore(): RmStore {
	return {
		version: Seidr.RM_DATA_VERSION || 1,
		room: {},
		access: {},
		backgrounds: [],
		maps: [],
		ui: {},
		settings: seidrDefaultSettings(),
	};
}

export function rmNewId(prefix: string): string {
	return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

function clampName(raw: unknown, fallback: string, max: number): string {
	const s = String(raw == null ? "" : raw).trim().slice(0, max);
	return s || fallback;
}

export function rmNormalizeMapVersion(raw: unknown, fallbackName?: string): RmMapVersion | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<RmMapVersion>;
	if (typeof d.data !== "string" || !d.data.length) return null;
	return {
		id: typeof d.id === "string" && d.id ? d.id : rmNewId("mv"),
		name: rmCanonicalVersionName(d.name, fallbackName || "Version"),
		data: d.data,
		savedAt: typeof d.savedAt === "number" && Number.isFinite(d.savedAt) ? d.savedAt : Date.now(),
	};
}

/**
 * Normalize a map series. Accepts series shape or legacy flat { id, name, data, savedAt }.
 * `forceLocation` overrides stored location (remote bag always remote).
 */
export function rmNormalizeMapSeries(
	raw: unknown,
	forceLocation?: RmMapLocation,
): RmMapSeries | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<RmMapSeries> & Partial<RmMapEntry> & { versions?: unknown };
	const id = typeof d.id === "string" && d.id ? d.id : rmNewId("m");
	const name = clampName(d.name, "Untitled", 48);
	let location: RmMapLocation =
		forceLocation || (d.location === "local" ? "local" : "remote");

	let versions: RmMapVersion[] = [];
	if (Array.isArray(d.versions) && d.versions.length) {
		for (let i = 0; i < d.versions.length; i++) {
			const v = rmNormalizeMapVersion(d.versions[i], "v" + (i + 1));
			if (v) versions.push(v);
		}
	} else if (typeof d.data === "string" && d.data.length) {
		// Legacy flat entry → single Default version
		versions.push({
			id: rmNewId("mv"),
			name: RM_MAP_DEFAULT_NAME,
			data: d.data,
			savedAt: typeof d.savedAt === "number" && Number.isFinite(d.savedAt) ? d.savedAt : Date.now(),
		});
	}
	if (!versions.length) return null;

	return { id: id, name: name, location: location, versions: versions };
}

/** Strip location; remote bag may only contain Default. */
export function rmSerializeRemoteMaps(maps: RmMapSeries[]): unknown[] {
	return maps.map(function (m) {
		const def = m.versions.find(function (v) { return rmIsDefaultVersionName(v.name); })
			|| m.versions[0];
		const versions = def
			? [{
				id: def.id,
				name: RM_MAP_DEFAULT_NAME,
				data: def.data,
				savedAt: def.savedAt,
			}]
			: [];
		return { id: m.id, name: m.name, versions: versions };
	});
}

export function rmNormalizeStore(data: unknown): RmStore {
	const base = rmEmptyStore();
	if (!data || typeof data !== "object") return base;
	const d = data as Partial<RmStore> & { background?: Record<string, unknown> };
	base.version = typeof d.version === "number" ? d.version : base.version;
	base.room = d.room && typeof d.room === "object" ? d.room : {};
	base.access = d.access && typeof d.access === "object" ? d.access : {};
	if (Array.isArray(d.backgrounds)) base.backgrounds = d.backgrounds;
	else if (d.background && typeof d.background === "object") {
		base.backgrounds = [];
	}
	const maps: RmMapSeries[] = [];
	if (Array.isArray(d.maps)) {
		for (let i = 0; i < d.maps.length; i++) {
			const series = rmNormalizeMapSeries(d.maps[i], "remote");
			if (series) {
				series.location = "remote";
				maps.push(series);
			}
		}
	}
	base.maps = maps;
	base.ui = d.ui && typeof d.ui === "object" ? d.ui : {};
	base.settings = seidrNormalizeSettings(d.settings);
	return base;
}

export function rmIsShown(): boolean {
	return !!Seidr.SHOW_ROOM_MANAGER;
}
