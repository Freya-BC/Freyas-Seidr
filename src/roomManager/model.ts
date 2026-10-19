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
	maps: RmMapEntry[];
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

export function rmNormalizeStore(data: unknown): RmStore {
	const base = rmEmptyStore();
	if (!data || typeof data !== "object") return base;
	const d = data as Partial<RmStore> & { background?: Record<string, unknown> };
	base.version = typeof d.version === "number" ? d.version : base.version;
	base.room = d.room && typeof d.room === "object" ? d.room : {};
	base.access = d.access && typeof d.access === "object" ? d.access : {};
	if (Array.isArray(d.backgrounds)) base.backgrounds = d.backgrounds;
	else if (d.background && typeof d.background === "object") {
		// migrate old RM-style background map if ever present
		base.backgrounds = [];
	}
	base.maps = Array.isArray(d.maps) ? d.maps : [];
	base.ui = d.ui && typeof d.ui === "object" ? d.ui : {};
	base.settings = seidrNormalizeSettings(d.settings);
	return base;
}

export function rmNewId(prefix: string): string {
	return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

export function rmIsShown(): boolean {
	return !!Seidr.SHOW_ROOM_MANAGER;
}
