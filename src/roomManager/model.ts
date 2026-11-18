/** Seidr Room Manager — store shape */
import { Seidr } from "../seidr";
import { seidrDefaultSettings, seidrNormalizeSettings, type SeidrSettings } from "../settings/model";

declare const DrawingResizeMode: {
	Fill: number;
	FillOriginalRatio: number;
	ShowFullOriginalRatio: number;
} | undefined;

/** Per-background fill vs room default (maps to DrawingResizeMode when not default). */
export type RmBgFillMode = "default" | "fill" | "fillOriginalRatio" | "showFullOriginalRatio";

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
	/** Club builtin background name. */
	Background?: string;
	/** Room default Custom.SizeMode (DrawingResizeMode). */
	customSizeMode?: number;
	/** Room default Custom.ImageFilter (Club Background Filter). */
	customImageFilter?: string;
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
	/** When default, Load uses Room Definition customSizeMode. */
	fillMode?: RmBgFillMode;
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

/** Club DrawingResizeMode.Fill, or 1. */
export function rmDefaultDrawingResizeMode(): number {
	try {
		if (typeof DrawingResizeMode !== "undefined" && DrawingResizeMode
			&& typeof DrawingResizeMode.Fill === "number") {
			return DrawingResizeMode.Fill;
		}
	} catch (e) { /* ignore */ }
	return 1;
}

export function rmNormalizeBgFillMode(raw: unknown): RmBgFillMode {
	const s = String(raw == null ? "" : raw);
	if (s === "fill" || s === "fillOriginalRatio" || s === "showFullOriginalRatio" || s === "default") {
		return s;
	}
	return "default";
}

export function rmNormalizeBackgroundEntry(raw: unknown): RmBackgroundEntry | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<RmBackgroundEntry>;
	if (typeof d.url !== "string" || !d.url.trim()) return null;
	return {
		id: typeof d.id === "string" && d.id ? d.id : rmNewId("bg"),
		name: clampName(d.name, "Background", 64),
		url: d.url.trim(),
		fillMode: rmNormalizeBgFillMode(d.fillMode),
	};
}

export function rmNormalizeRoomPreset(raw: unknown): RmRoomPreset {
	if (!raw || typeof raw !== "object") return {};
	const d = raw as Partial<RmRoomPreset> & { Custom?: { SizeMode?: number; ImageFilter?: string } };
	const out: RmRoomPreset = {};
	if (typeof d.Name === "string") out.Name = d.Name;
	if (typeof d.Language === "string") out.Language = d.Language;
	if (typeof d.Description === "string") out.Description = d.Description;
	if (typeof d.Limit === "number" && Number.isFinite(d.Limit)) out.Limit = d.Limit;
	if (Array.isArray(d.BlockCategory)) out.BlockCategory = d.BlockCategory.slice() as string[];
	if (typeof d.Game === "string") out.Game = d.Game;
	if (Array.isArray(d.Visibility)) out.Visibility = d.Visibility.slice() as string[];
	if (Array.isArray(d.Access)) out.Access = d.Access.slice() as string[];
	if (d.MapData && typeof d.MapData === "object") out.MapData = d.MapData as RmRoomPreset["MapData"];
	if (typeof d.Background === "string") out.Background = d.Background;
	if (typeof d.customSizeMode === "number" && Number.isFinite(d.customSizeMode)) {
		out.customSizeMode = d.customSizeMode;
	} else if (d.Custom && typeof d.Custom.SizeMode === "number") {
		out.customSizeMode = d.Custom.SizeMode;
	}
	if (typeof d.customImageFilter === "string") {
		out.customImageFilter = d.customImageFilter;
	} else if (d.Custom && typeof d.Custom.ImageFilter === "string") {
		out.customImageFilter = d.Custom.ImageFilter;
	}
	if (out.customSizeMode == null) out.customSizeMode = rmDefaultDrawingResizeMode();
	if (out.customImageFilter == null) out.customImageFilter = "";
	return out;
}

/** Map library fillMode → DrawingResizeMode number (default uses roomDefault). */
export function rmResolveSizeMode(fillMode: RmBgFillMode | undefined, roomDefault?: number): number {
	const mode = rmNormalizeBgFillMode(fillMode);
	if (mode === "default") {
		return typeof roomDefault === "number" && Number.isFinite(roomDefault)
			? roomDefault
			: rmDefaultDrawingResizeMode();
	}
	try {
		if (typeof DrawingResizeMode !== "undefined" && DrawingResizeMode) {
			if (mode === "fill") return DrawingResizeMode.Fill;
			if (mode === "fillOriginalRatio") return DrawingResizeMode.FillOriginalRatio;
			if (mode === "showFullOriginalRatio") return DrawingResizeMode.ShowFullOriginalRatio;
		}
	} catch (e) { /* ignore */ }
	if (mode === "fill") return 1;
	if (mode === "fillOriginalRatio") return 2;
	if (mode === "showFullOriginalRatio") return 3;
	return rmDefaultDrawingResizeMode();
}

export function rmFillModeLabel(mode: RmBgFillMode): string {
	switch (mode) {
		case "fill": return "Fill the Room";
		case "fillOriginalRatio": return "Fill Original Aspect";
		case "showFullOriginalRatio": return "Full Image Original Aspect";
		default: return "Default";
	}
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

	const room: Record<string, RmRoomPreset> = {};
	if (d.room && typeof d.room === "object") {
		Object.keys(d.room).forEach(function (key) {
			room[key] = rmNormalizeRoomPreset((d.room as Record<string, unknown>)[key]);
		});
	}
	base.room = room;

	base.access = d.access && typeof d.access === "object" ? d.access : {};

	const backgrounds: RmBackgroundEntry[] = [];
	if (Array.isArray(d.backgrounds)) {
		for (let i = 0; i < d.backgrounds.length; i++) {
			const entry = rmNormalizeBackgroundEntry(d.backgrounds[i]);
			if (entry) backgrounds.push(entry);
		}
	}
	base.backgrounds = backgrounds;

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
