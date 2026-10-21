/** Read/apply room definition + live Update */
import type { RmAccessPreset, RmRoomPreset } from "./model";

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
	return {
		Name: settings.Name as string,
		Language: settings.Language as string,
		Description: settings.Description as string,
		Limit: settings.Limit as number,
		BlockCategory: settings.BlockCategory as string[],
		Game: settings.Game as string,
		Visibility: settings.Visibility as string[],
		Access: settings.Access as string[],
		MapData: settings.MapData as RmRoomPreset["MapData"],
	};
}

export function rmSliceAccess(settings: Record<string, unknown>): RmAccessPreset {
	return {
		Admin: Array.isArray(settings.Admin) ? (settings.Admin as number[]).slice() : [],
		Whitelist: Array.isArray(settings.Whitelist) ? (settings.Whitelist as number[]).slice() : [],
		Ban: Array.isArray(settings.Ban) ? (settings.Ban as number[]).slice() : [],
	};
}

function setVisibilityAccess(preset: RmRoomPreset) {
	if (typeof ChatAdminData === "undefined" || !ChatAdminData) return;
	if (Array.isArray(preset.Visibility) && typeof ChatAdminVisibilityModeValues !== "undefined") {
		let vi = ChatAdminVisibilityModeValues.findIndex(function (elem: string[]) {
			return elem.length === preset.Visibility!.length
				&& elem.every(function (role) { return preset.Visibility!.includes(role); });
		});
		if (vi < 0) vi = 0;
		(window as any).ChatAdminVisibilityModeIndex = vi;
		ChatAdminData.Visibility = ChatAdminVisibilityModeValues[vi];
	}
	if (Array.isArray(preset.Access) && typeof ChatAdminAccessModeValues !== "undefined") {
		let ai = ChatAdminAccessModeValues.findIndex(function (elem: string[]) {
			return elem.length === preset.Access!.length
				&& elem.every(function (role) { return preset.Access!.includes(role); });
		});
		if (ai < 0) ai = 0;
		(window as any).ChatAdminAccessModeIndex = ai;
		ChatAdminData.Access = ChatAdminAccessModeValues[ai];
	}
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
}

export function rmApplyRoomToEditor(preset: RmRoomPreset) {
	if (!preset) return;
	if (rmOnChatAdmin() && typeof ChatAdminData !== "undefined" && ChatAdminData) {
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
		setVisibilityAccess(preset);
		return;
	}
	if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
		mergeRoomOnto(ChatRoomData as any, preset);
	}
}

export function rmApplyAccessToEditor(preset: RmAccessPreset) {
	if (!preset) return;
	const admin = Array.isArray(preset.Admin) ? preset.Admin.slice() : [];
	const wl = Array.isArray(preset.Whitelist) ? preset.Whitelist.slice() : [];
	const ban = Array.isArray(preset.Ban) ? preset.Ban.slice() : [];

	if (rmOnChatAdmin()) {
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
		return;
	}
	if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
		ChatRoomData.Admin = admin;
		ChatRoomData.Whitelist = wl;
		ChatRoomData.Ban = ban;
	}
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
