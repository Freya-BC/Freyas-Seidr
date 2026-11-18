/** Read/apply room definition + live Update (R134 ChatAdmin via ChatEditorAdminSettingsImport) */
import { Seidr } from "../seidr";
import type { RmAccessPreset, RmRoomPreset } from "./model";
import { rmDefaultDrawingResizeMode, rmNormalizeRoomPreset } from "./model";

declare function ChatEditorGetAdminSettings(): Record<string, unknown> | undefined;
declare function ChatEditorAdminSettingsImport(settings: Record<string, unknown>): void;
declare function ElementValue(id: string, value?: string): string;
declare function CommonConvertArrayToString(arr: number[]): string;
declare const ChatAdminID: {
	nameInput: string;
	descriptionInput: string;
	sizeInput: string;
	adminListInput: string;
	whitelistInput: string;
	banListInput: string;
	language: string;
	game: string;
	map: string;
	visibility: string;
	access: string;
	customization: string;
} | undefined;

/** Last room preset applied or selected — used for background Default fillMode. */
let _lastRoomPreset: RmRoomPreset | null = null;

export function rmSetLastRoomPreset(preset: RmRoomPreset | null) {
	_lastRoomPreset = preset ? rmNormalizeRoomPreset(preset) : null;
}

export function rmGetLastRoomPreset(): RmRoomPreset | null {
	return _lastRoomPreset;
}

export function rmInLiveRoom(): boolean {
	try {
		return typeof ServerPlayerIsInChatRoom === "function" && !!ServerPlayerIsInChatRoom();
	} catch (e) {
		return false;
	}
}

export function rmIsAdmin(): boolean {
	try {
		if (typeof ChatRoomPlayerIsAdmin === "function" && ChatRoomPlayerIsAdmin()) return true;
	} catch (e) { /* ignore */ }
	try {
		if (ChatRoomData && Array.isArray(ChatRoomData.Admin) && Player && ChatRoomData.Admin.includes(Player.MemberNumber)) {
			return true;
		}
	} catch (e) { /* ignore */ }
	return false;
}

export function rmOnChatAdmin(): boolean {
	try {
		return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatAdmin";
	} catch (e) {
		return false;
	}
}

/** ChatRoom (incl. map) or ChatAdmin — where Load/apply is valid. */
export function rmCanApplyToRoom(): boolean {
	try {
		if (typeof CurrentScreen === "undefined") return false;
		return CurrentScreen === "ChatRoom" || CurrentScreen === "ChatAdmin";
	} catch (e) {
		return false;
	}
}

function snapshotFromRoom(data: any): Record<string, unknown> {
	return {
		Name: data.Name || "",
		Language: data.Language,
		Description: data.Description || "",
		Background: data.Background,
		Limit: data.Limit,
		Admin: Array.isArray(data.Admin) ? data.Admin.slice() : [],
		Whitelist: Array.isArray(data.Whitelist) ? data.Whitelist.slice() : [],
		Ban: Array.isArray(data.Ban) ? data.Ban.slice() : [],
		BlockCategory: data.BlockCategory || [],
		Game: data.Game,
		Visibility: data.Visibility,
		Access: data.Access,
		MapData: data.MapData,
		Custom: data.Custom,
	};
}

/** Snapshot from ChatAdmin editor (only when on that screen) or live ChatRoomData. */
export function rmReadSettings(): Record<string, unknown> | null {
	// Off ChatAdmin: never trust ChatEditorGetAdminSettings / stale ChatAdminData
	// (missing DOM inputs yield empty Description / Admin lists).
	if (!rmOnChatAdmin()) {
		if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
			return snapshotFromRoom(ChatRoomData);
		}
		return null;
	}
	if (typeof ChatEditorGetAdminSettings === "function") {
		try {
			const full = ChatEditorGetAdminSettings();
			if (full) return full as Record<string, unknown>;
		} catch (e) { /* ignore */ }
	}
	if (typeof ChatAdminData !== "undefined" && ChatAdminData) {
		return snapshotFromRoom(ChatAdminData);
	}
	return null;
}

export function rmSliceRoom(settings: Record<string, unknown>): RmRoomPreset {
	const custom = settings.Custom && typeof settings.Custom === "object"
		? settings.Custom as { SizeMode?: number; ImageFilter?: string }
		: null;
	return rmNormalizeRoomPreset({
		Name: settings.Name,
		Language: settings.Language,
		Description: settings.Description,
		Limit: settings.Limit,
		BlockCategory: settings.BlockCategory,
		Game: settings.Game,
		Visibility: settings.Visibility,
		Access: settings.Access,
		MapData: settings.MapData,
		Background: settings.Background,
		customSizeMode: custom && typeof custom.SizeMode === "number"
			? custom.SizeMode
			: rmDefaultDrawingResizeMode(),
		customImageFilter: custom && typeof custom.ImageFilter === "string"
			? custom.ImageFilter
			: "",
	});
}

export function rmSliceAccess(settings: Record<string, unknown>): RmAccessPreset {
	return {
		Admin: Array.isArray(settings.Admin) ? (settings.Admin as number[]).slice() : [],
		Whitelist: Array.isArray(settings.Whitelist) ? (settings.Whitelist as number[]).slice() : [],
		Ban: Array.isArray(settings.Ban) ? (settings.Ban as number[]).slice() : [],
	};
}

function currentAdminBase(): Record<string, unknown> {
	let base: Record<string, unknown> = {};
	if (typeof ChatAdminData !== "undefined" && ChatAdminData) {
		base = snapshotFromRoom(ChatAdminData);
	}
	if (typeof ChatEditorGetAdminSettings === "function") {
		try {
			const full = ChatEditorGetAdminSettings();
			if (full) base = Object.assign({}, base, full);
		} catch (e) { /* ignore */ }
	}
	return base;
}

/** Merge partial onto current ChatAdmin settings for a safe ChatEditorAdminSettingsImport payload. */
export function rmToAdminSettings(partial: Record<string, unknown>): Record<string, unknown> {
	const base = currentAdminBase();
	const out: Record<string, unknown> = Object.assign({}, base, partial);

	if (!Array.isArray(out.Admin)) out.Admin = [];
	if (!Array.isArray(out.Whitelist)) out.Whitelist = [];
	if (!Array.isArray(out.Ban)) out.Ban = [];
	if (!Array.isArray(out.BlockCategory)) out.BlockCategory = [];

	if (typeof out.Name !== "string") out.Name = String(base.Name || "");
	if (typeof out.Description !== "string") out.Description = String(base.Description || "");
	if (typeof out.Limit !== "number" || !Number.isFinite(out.Limit as number)) {
		out.Limit = typeof base.Limit === "number" ? base.Limit : 10;
	}

	const md = out.MapData && typeof out.MapData === "object"
		? Object.assign({}, out.MapData as object) as { Type?: string }
		: { Type: "Never" };
	if (!md.Type) md.Type = "Never";
	out.MapData = md;

	if (!out.Background) out.Background = base.Background;

	if (partial.Custom !== undefined) {
		const baseCustom = base.Custom && typeof base.Custom === "object"
			? Object.assign({}, base.Custom as object)
			: {};
		out.Custom = Object.assign(baseCustom, partial.Custom as object);
	}

	return out;
}

function importAdminSettings(partial: Record<string, unknown>): boolean {
	if (typeof ChatEditorAdminSettingsImport !== "function") return false;
	if (typeof ChatAdminData === "undefined" || !ChatAdminData) return false;
	try {
		ChatEditorAdminSettingsImport(rmToAdminSettings(partial));
		return true;
	} catch (e) {
		console.warn("[Seidr RM] ChatEditorAdminSettingsImport failed", e);
		return false;
	}
}

/** Legacy canvas ChatAdmin fallback (pre-R134). */
function legacyApplyRoom(preset: RmRoomPreset) {
	const cad: any = ChatAdminData;
	if (typeof preset.Name === "string") {
		cad.Name = preset.Name;
		if (document.getElementById("InputName")) ElementValue("InputName", preset.Name);
	}
	if (typeof preset.Description === "string") {
		cad.Description = preset.Description;
		if (document.getElementById("InputDescription")) ElementValue("InputDescription", preset.Description);
	}
	if (typeof preset.Limit === "number") {
		cad.Limit = preset.Limit;
		if (document.getElementById("InputSize")) ElementValue("InputSize", String(preset.Limit));
	}
	if (typeof preset.Language === "string") cad.Language = preset.Language;
	if (Array.isArray(preset.BlockCategory)) cad.BlockCategory = preset.BlockCategory;
	if (typeof preset.Game === "string") cad.Game = preset.Game;
	if (preset.MapData && typeof preset.MapData === "object") cad.MapData = preset.MapData;
	if (typeof preset.Background === "string") cad.Background = preset.Background;
	if (Array.isArray(preset.Visibility)) cad.Visibility = preset.Visibility;
	if (Array.isArray(preset.Access)) cad.Access = preset.Access;
	const custom = cad.Custom && typeof cad.Custom === "object" ? cad.Custom : {};
	if (typeof preset.customSizeMode === "number") custom.SizeMode = preset.customSizeMode;
	if (typeof preset.customImageFilter === "string") custom.ImageFilter = preset.customImageFilter;
	cad.Custom = custom;
}

function legacyApplyAccess(admin: number[], wl: number[], ban: number[]) {
	if (document.getElementById("InputAdminList")) {
		ElementValue("InputAdminList", CommonConvertArrayToString(admin));
	}
	if (document.getElementById("InputWhitelist")) {
		ElementValue("InputWhitelist", CommonConvertArrayToString(wl));
	}
	if (document.getElementById("InputBanList")) {
		ElementValue("InputBanList", CommonConvertArrayToString(ban));
	}
	if (typeof ChatAdminData !== "undefined" && ChatAdminData) {
		ChatAdminData.Admin = admin;
		ChatAdminData.Whitelist = wl;
		ChatAdminData.Ban = ban;
	}
}

function roomPresetToPartial(preset: RmRoomPreset): Record<string, unknown> {
	const partial: Record<string, unknown> = {};
	if (typeof preset.Name === "string") partial.Name = preset.Name;
	if (typeof preset.Description === "string") partial.Description = preset.Description;
	if (typeof preset.Limit === "number") partial.Limit = preset.Limit;
	if (typeof preset.Language === "string") partial.Language = preset.Language;
	if (Array.isArray(preset.BlockCategory)) partial.BlockCategory = preset.BlockCategory.slice();
	if (typeof preset.Game === "string") partial.Game = preset.Game;
	if (Array.isArray(preset.Visibility)) partial.Visibility = preset.Visibility.slice();
	if (Array.isArray(preset.Access)) partial.Access = preset.Access.slice();
	if (preset.MapData && typeof preset.MapData === "object") partial.MapData = preset.MapData;
	if (typeof preset.Background === "string") partial.Background = preset.Background;

	const customPatch: Record<string, unknown> = {};
	if (typeof preset.customSizeMode === "number") customPatch.SizeMode = preset.customSizeMode;
	if (typeof preset.customImageFilter === "string") customPatch.ImageFilter = preset.customImageFilter;
	if (Object.keys(customPatch).length) partial.Custom = customPatch;
	return partial;
}

function mergeRoomOnto(target: any, preset: RmRoomPreset) {
	if (typeof preset.Name === "string") target.Name = preset.Name;
	if (typeof preset.Description === "string") target.Description = preset.Description;
	if (typeof preset.Limit === "number") target.Limit = preset.Limit;
	if (typeof preset.Language === "string") target.Language = preset.Language;
	if (Array.isArray(preset.BlockCategory)) target.BlockCategory = preset.BlockCategory;
	if (typeof preset.Game === "string") target.Game = preset.Game;
	if (Array.isArray(preset.Visibility)) target.Visibility = preset.Visibility;
	if (Array.isArray(preset.Access)) target.Access = preset.Access;
	if (preset.MapData && typeof preset.MapData === "object") target.MapData = preset.MapData;
	if (typeof preset.Background === "string") target.Background = preset.Background;
	if (typeof preset.customSizeMode === "number" || typeof preset.customImageFilter === "string") {
		if (!target.Custom || typeof target.Custom !== "object") target.Custom = {};
		if (typeof preset.customSizeMode === "number") target.Custom.SizeMode = preset.customSizeMode;
		if (typeof preset.customImageFilter === "string") target.Custom.ImageFilter = preset.customImageFilter;
	}
}

export function rmApplyRoomToEditor(preset: RmRoomPreset) {
	if (!preset) return;
	const normalized = rmNormalizeRoomPreset(preset);
	rmSetLastRoomPreset(normalized);

	if (rmOnChatAdmin() && typeof ChatAdminData !== "undefined" && ChatAdminData) {
		const partial = roomPresetToPartial(normalized);
		if (!importAdminSettings(partial)) {
			legacyApplyRoom(normalized);
		}
		return;
	}
	if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
		mergeRoomOnto(ChatRoomData as any, normalized);
		if (typeof Seidr.checkMapTypeChange === "function") {
			try { Seidr.checkMapTypeChange(); } catch (e) { /* ignore */ }
		}
	}
}

export function rmApplyAccessToEditor(preset: RmAccessPreset) {
	if (!preset) return;
	const admin = Array.isArray(preset.Admin) ? preset.Admin.slice() : [];
	const wl = Array.isArray(preset.Whitelist) ? preset.Whitelist.slice() : [];
	const ban = Array.isArray(preset.Ban) ? preset.Ban.slice() : [];

	if (rmOnChatAdmin()) {
		if (!importAdminSettings({ Admin: admin, Whitelist: wl, Ban: ban })) {
			legacyApplyAccess(admin, wl, ban);
		}
		return;
	}
	if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
		ChatRoomData.Admin = admin;
		ChatRoomData.Whitelist = wl;
		ChatRoomData.Ban = ban;
	}
}

/**
 * Apply Custom.ImageURL (+ SizeMode / ImageFilter) on ChatAdmin or live room.
 * On ChatAdmin uses ChatEditorAdminSettingsImport when available.
 */
export function rmApplyCustomPatch(patch: {
	ImageURL?: string;
	SizeMode?: number;
	ImageFilter?: string;
}): { ok: boolean; error?: string } {
	if (rmOnChatAdmin() && typeof ChatAdminData !== "undefined" && ChatAdminData) {
		const baseCustom = ChatAdminData.Custom && typeof ChatAdminData.Custom === "object"
			? Object.assign({}, ChatAdminData.Custom)
			: {};
		const custom = Object.assign(baseCustom, patch);
		if (!importAdminSettings({ Custom: custom })) {
			ChatAdminData.Custom = custom;
			try {
				const btn = typeof ChatAdminID !== "undefined" && ChatAdminID
					? document.getElementById(ChatAdminID.customization)
					: document.getElementById("chat-admin-customization");
				if (btn) btn.classList.toggle("chat-admin-has-custom", true);
			} catch (e) { /* ignore */ }
		}
		return { ok: true };
	}
	if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
		if (!ChatRoomData.Custom || typeof ChatRoomData.Custom !== "object") ChatRoomData.Custom = {};
		Object.assign(ChatRoomData.Custom, patch);
		return rmUpdateLiveRoom();
	}
	return { ok: false, error: "Open ChatAdmin or join a room as admin" };
}

function buildLiveUpdateRoom(): Record<string, unknown> | null {
	if (!rmInLiveRoom() || typeof ChatRoomData === "undefined" || !ChatRoomData) return null;
	return snapshotFromRoom(ChatRoomData);
}

/** Push current editor / ChatRoomData to server when live. */
export function rmUpdateLiveRoom(): { ok: boolean; error?: string } {
	if (!rmInLiveRoom()) return { ok: true };
	if (!rmIsAdmin()) return { ok: false, error: "Admin required" };
	try {
		// Only use Club editor Update while ChatAdmin is the active screen.
		if (rmOnChatAdmin() && typeof ChatEditorUpdateRoom === "function"
			&& typeof ChatAdminData !== "undefined" && ChatAdminData) {
			ChatEditorUpdateRoom();
			return { ok: true };
		}
		const room = buildLiveUpdateRoom();
		if (!room) return { ok: false, error: "No room data" };
		ServerSend("ChatRoomAdmin", { MemberNumber: Player.ID, Room: room, Action: "Update" });
		return { ok: true };
	} catch (e) {
		console.warn("[Seidr RM] Update failed", e);
		return { ok: false, error: "Update failed" };
	}
}

export function rmMapModeActive(settings?: Record<string, unknown> | null): boolean {
	const s = settings || rmReadSettings();
	const md = s && s.MapData as { Type?: string } | undefined;
	if (!md || md.Type == null) return false;
	return md.Type !== "Never";
}
