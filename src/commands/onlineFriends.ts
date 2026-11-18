/** Cache Club OnlineFriends for /beep Tab autocomplete. */
import { Seidr } from "../seidr";

declare const ServerSend: any;
declare const Player: any;

export type SeidrOnlineFriend = {
	memberNumber: number;
	memberName: string;
	chatRoomName?: string;
};

const TTL_MS = 30_000;

let cache: SeidrOnlineFriend[] = [];
let cacheAt = 0;
let hooked = false;
let pendingRefresh = false;

function now(): number {
	return Date.now();
}

function ingestResult(result: unknown): void {
	if (!Array.isArray(result)) return;
	const next: SeidrOnlineFriend[] = [];
	for (let i = 0; i < result.length; i++) {
		const row = result[i] as any;
		if (!row || row.MemberNumber == null) continue;
		const mn = Number(row.MemberNumber);
		if (!Number.isFinite(mn) || mn <= 0) continue;
		const name = String(row.MemberName || "");
		next.push({
			memberNumber: mn,
			memberName: name,
			chatRoomName: row.ChatRoomName != null ? String(row.ChatRoomName) : undefined,
		});
		try {
			if (
				typeof Player !== "undefined" &&
				Player &&
				Player.FriendNames &&
				typeof Player.FriendNames.set === "function" &&
				name &&
				!Player.FriendNames.has(mn)
			) {
				Player.FriendNames.set(mn, name);
			}
		} catch (e) { /* ignore */ }
	}
	cache = next;
	cacheAt = now();
	pendingRefresh = false;
}

export function seidrGetOnlineFriends(): SeidrOnlineFriend[] {
	return cache.slice();
}

export function seidrOnlineFriendsCacheAgeMs(): number {
	if (!cacheAt) return Number.POSITIVE_INFINITY;
	return Math.max(0, now() - cacheAt);
}

export function seidrOnlineFriendsCacheStale(): boolean {
	return !cacheAt || seidrOnlineFriendsCacheAgeMs() >= TTL_MS;
}

/** Request a fresh OnlineFriends list (no-op if ServerSend missing). */
export function seidrRefreshOnlineFriends(force?: boolean): void {
	if (!force && pendingRefresh && !seidrOnlineFriendsCacheStale()) return;
	try {
		if (typeof ServerSend !== "function") return;
		pendingRefresh = true;
		ServerSend("AccountQuery", { Query: "OnlineFriends" });
	} catch (e) {
		pendingRefresh = false;
		console.warn("[Seidr Cmd] OnlineFriends refresh failed", e);
	}
}

export function seidrFilterOnlineFriends(prefix: string): SeidrOnlineFriend[] {
	if (seidrOnlineFriendsCacheStale()) seidrRefreshOnlineFriends();
	const pfx = String(prefix || "").trim().toLowerCase();
	if (!pfx) return seidrGetOnlineFriends();
	return cache.filter(function (f) {
		const name = String(f.memberName || "").toLowerCase();
		const id = String(f.memberNumber);
		return name.indexOf(pfx) >= 0 || id.indexOf(pfx) === 0;
	});
}

export function seidrInstallOnlineFriends(): void {
	if (hooked) return;
	hooked = true;
	if (!Seidr.hookFunction) return;
	Seidr.hookFunction(
		"ServerAccountQueryResult",
		5,
		function (args: unknown[], next: (a?: unknown[]) => unknown) {
			try {
				const data = args && args[0] as any;
				if (
					data &&
					typeof data === "object" &&
					!Array.isArray(data) &&
					data.Query === "OnlineFriends" &&
					data.Result != null
				) {
					ingestResult(data.Result);
				}
			} catch (e) {
				console.warn("[Seidr Cmd] OnlineFriends ingest", e);
			}
			return next(args);
		}
	);
	Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 4, function (args: unknown[], next: (a?: unknown[]) => unknown) {
		try {
			seidrRefreshOnlineFriends(true);
		} catch (e) { /* ignore */ }
		return next(args);
	});
	seidrRefreshOnlineFriends(true);
}
