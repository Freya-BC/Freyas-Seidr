/** Background library + apply Custom.ImageURL / SizeMode */
import { rmGetStore, rmSaveStore } from "./storage";
import {
	rmNewId,
	rmNormalizeBgFillMode,
	rmNormalizeBackgroundEntry,
	rmResolveSizeMode,
	type RmBackgroundEntry,
	type RmBgFillMode,
} from "./model";
import {
	rmApplyCustomPatch,
	rmGetLastRoomPreset,
	rmInLiveRoom,
	rmOnChatAdmin,
} from "./roomApply";

export function rmListBackgrounds(): RmBackgroundEntry[] {
	return rmGetStore().backgrounds.slice();
}

/** Persist card order by id list; unknown ids kept at end. */
export function rmReorderBackgrounds(orderedIds: string[]): boolean {
	const store = rmGetStore();
	const byId: Record<string, RmBackgroundEntry> = {};
	store.backgrounds.forEach(function (b) { byId[b.id] = b; });
	const next: RmBackgroundEntry[] = [];
	const seen: Record<string, boolean> = {};
	orderedIds.forEach(function (id) {
		if (!id || seen[id] || !byId[id]) return;
		next.push(byId[id]);
		seen[id] = true;
	});
	store.backgrounds.forEach(function (b) {
		if (!seen[b.id]) next.push(b);
	});
	store.backgrounds = next;
	return rmSaveStore().ok;
}

export function rmValidateBackgroundUrl(url: string): Promise<{ ok: boolean; error?: string; url?: string }> {
	const trimmed = (url || "").trim();
	if (!trimmed) return Promise.resolve({ ok: false, error: "URL required" });
	let safe = trimmed;
	try {
		if (typeof ServerChatRoomDataValidate !== "undefined"
			&& ServerChatRoomDataValidate.Custom
			&& typeof ServerChatRoomDataValidate.Custom.ImageURL === "function") {
			safe = ServerChatRoomDataValidate.Custom.ImageURL(trimmed);
		}
	} catch (e) {
		return Promise.resolve({ ok: false, error: "URL rejected by Club validator" });
	}
	if (!safe || typeof safe !== "string") {
		return Promise.resolve({ ok: false, error: "Invalid background URL" });
	}
	return new Promise(function (resolve) {
		const img = new Image();
		img.onload = function () { resolve({ ok: true, url: safe }); };
		img.onerror = function () { resolve({ ok: false, error: "Image failed to load" }); };
		img.referrerPolicy = "no-referrer";
		img.src = safe;
	});
}

export function rmSaveBackground(
	name: string,
	url: string,
	existingId?: string,
	fillMode?: RmBgFillMode,
): Promise<{ ok: boolean; error?: string; entry?: RmBackgroundEntry }> {
	return rmValidateBackgroundUrl(url).then(function (v) {
		if (!v.ok || !v.url) return { ok: false, error: v.error || "Invalid URL" };
		const n = (name || "").trim().slice(0, 64);
		if (!n) return { ok: false, error: "Name required" };
		const mode = rmNormalizeBgFillMode(fillMode);
		const store = rmGetStore();
		let entry: RmBackgroundEntry;
		if (existingId) {
			const idx = store.backgrounds.findIndex(function (b) { return b.id === existingId; });
			if (idx < 0) return { ok: false, error: "Background not found" };
			entry = { id: existingId, name: n, url: v.url, fillMode: mode };
			store.backgrounds[idx] = entry;
		} else {
			entry = { id: rmNewId("bg"), name: n, url: v.url, fillMode: mode };
			store.backgrounds.push(entry);
		}
		const saved = rmSaveStore();
		if (!saved.ok) return { ok: false, error: saved.error };
		return { ok: true, entry: entry };
	});
}

export function rmDeleteBackground(id: string): boolean {
	const store = rmGetStore();
	const next = store.backgrounds.filter(function (b) { return b.id !== id; });
	if (next.length === store.backgrounds.length) return false;
	store.backgrounds = next;
	return rmSaveStore().ok;
}

function resolveRoomDefaultSizeMode(explicit?: number): number {
	if (typeof explicit === "number" && Number.isFinite(explicit)) {
		return explicit;
	}
	const last = rmGetLastRoomPreset();
	if (last && typeof last.customSizeMode === "number") return last.customSizeMode;
	try {
		if (rmOnChatAdmin() && ChatAdminData && ChatAdminData.Custom
			&& typeof ChatAdminData.Custom.SizeMode === "number") {
			return ChatAdminData.Custom.SizeMode;
		}
	} catch (e) { /* ignore */ }
	try {
		if (rmInLiveRoom() && ChatRoomData && ChatRoomData.Custom
			&& typeof (ChatRoomData.Custom as { SizeMode?: number }).SizeMode === "number") {
			return (ChatRoomData.Custom as { SizeMode: number }).SizeMode;
		}
	} catch (e) { /* ignore */ }
	return rmResolveSizeMode("fill");
}

/** Apply a library entry (URL + fillMode resolution). */
export function rmApplyBackgroundEntry(
	entry: RmBackgroundEntry,
	roomDefault?: number,
): { ok: boolean; error?: string } {
	const normalized = rmNormalizeBackgroundEntry(entry);
	if (!normalized) return { ok: false, error: "Invalid background" };
	const sizeMode = rmResolveSizeMode(normalized.fillMode, resolveRoomDefaultSizeMode(roomDefault));
	return rmApplyBackgroundUrl(normalized.url, { sizeMode: sizeMode });
}

export function rmApplyBackgroundUrl(
	url: string,
	opts?: { sizeMode?: number },
): { ok: boolean; error?: string } {
	const trimmed = (url || "").trim();
	if (!trimmed) return { ok: false, error: "No URL" };
	const sizeMode = typeof opts?.sizeMode === "number" && Number.isFinite(opts.sizeMode)
		? opts.sizeMode
		: resolveRoomDefaultSizeMode();
	return rmApplyCustomPatch({ ImageURL: trimmed, SizeMode: sizeMode });
}
