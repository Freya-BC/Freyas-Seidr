/** Echo-style pose offsets and drawlist reorder. */
import { Seidr } from "./seidr";
import { seidrGetSettings } from "./settings/storage";
import type { SeidrClusterNameMode } from "./settings/model";
import { SeidrState } from "./state";
import { seidrFindChar, seidrInEcho, seidrReconcileEcho } from "./room";

declare const CharacterNickname: ((C: any) => string) | undefined;
declare var ChatRoomCharacter: any;
declare var ChatRoomCharacterDrawlist: any;
declare var ChatRoomCharacterViewCharacterCount: number;
declare var ChatRoomCharacterViewCharacterCountTotal: number;
declare var ChatRoomCharacterViewOffset: number;
declare const CommonPhotoMode: any;
declare const CurrentCharacter: any;
declare const MouseIn: ((x: number, y: number, w: number, h: number) => boolean) | undefined;

/** Club character-view page size (Echo page-split boundary at index 10). */
var SEIDR_PAGE_SIZE = 10;

export const seidrNatural: Record<number, { X: number; Y: number; Zoom?: number; Space?: number }> = {};

/** Seats are per-frame: off-page members must not keep pulling the pose. */
function seidrClearNatural() {
	Object.keys(seidrNatural).forEach(function (key) { delete seidrNatural[key as any]; });
}

/** Character-local Y for cluster names (above arousal bar at 992). */
const SEIDR_CLUSTER_NAME_Y = 968;

type SeidrNatSeat = { X: number; Y: number; Zoom: number; Space: number };

/** Active only while DrawCharacter runs for a clustered body (names only). */
var seidrNameDrawCtx: {
	character: any;
	mode: SeidrClusterNameMode;
	nat: SeidrNatSeat;
} | null = null;

function seidrClusterNameMode(): SeidrClusterNameMode {
	try {
		const m = seidrGetSettings().clusterNameMode;
		if (m === "default" || m === "hitbox" || m === "hide" || m === "hover") return m;
	} catch (e) { /* ignore */ }
	return "hitbox";
}

function seidrNameOffset(): number {
	try {
		const n = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)
			? ChatRoomCharacter.length
			: 0;
		const photo = typeof CommonPhotoMode !== "undefined" && CommonPhotoMode;
		const focused = typeof CurrentCharacter !== "undefined" && CurrentCharacter != null;
		if ((n > 5 || (n === 5 && photo)) && !focused) return -4;
	} catch (e) { /* ignore */ }
	return 0;
}

/** Raised + centered over arousal/hitbox bar (same box math as arousalBars). */
function seidrClusterNamePos(nat: SeidrNatSeat): { X: number; Y: number } {
	const z = nat.Zoom > 0 ? nat.Zoom : 1;
	const charW = 500 * z;
	const spaceW = nat.Space > 0 ? nat.Space : charW;
	const boxW = Math.min(spaceW, charW);
	const boxX = nat.X + (spaceW > charW ? (spaceW - charW) / 2 : 0);
	return {
		X: boxX + boxW / 2,
		Y: nat.Y + SEIDR_CLUSTER_NAME_Y * z + seidrNameOffset(),
	};
}

function seidrNatFromStored(
	stored: { X: number; Y: number; Zoom?: number; Space?: number },
	fallbackZoom: number
): SeidrNatSeat {
	return {
		X: stored.X,
		Y: stored.Y,
		Zoom: typeof stored.Zoom === "number" && stored.Zoom > 0 ? stored.Zoom : fallbackZoom,
		Space: typeof stored.Space === "number" && stored.Space > 0 ? stored.Space : 0,
	};
}

/** True when cursor is over this character’s natural seat (Club click hitbox). */
function seidrClusterHitboxHovered(nat: SeidrNatSeat): boolean {
	if (typeof MouseIn !== "function") return false;
	const z = nat.Zoom > 0 ? nat.Zoom : 1;
	const spaceW = nat.Space > 0 ? nat.Space : 500 * z;
	try {
		return !!MouseIn(nat.X, nat.Y, spaceW, 1000 * z);
	} catch (e) {
		return false;
	}
}

function seidrViewActive() {
	if (typeof ChatRoomCharacterViewIsActive !== "function") return true;
	try { return !!ChatRoomCharacterViewIsActive(); } catch (e) { return false; }
}

function seidrInCluster(character) {
	if (!character || typeof character.MemberNumber !== "number") return false;
	if (seidrInEcho(character)) return false;
	return !!SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
}

/** Left → hub → cuddle → right, matching Echo seat order for hitboxes. */
function seidrClusterOrder(cluster) {
	var out = [];
	if (!cluster) return out;
	[cluster.left, cluster.hub, cluster.cuddle, cluster.right].forEach(function (id) {
		if (id != null) out.push(id);
	});
	return out;
}

/**
 * Pack Seidr clusters adjacent (left → hub → cuddle → right). Pure: no expand.
 * Echo ChatRoomOrder style — page cohesion runs on the full room list before Club slices.
 */
function seidrPackList(list: any[], hubs: any): any[] {
	if (!Array.isArray(list) || !list.length || !hubs) return Array.isArray(list) ? list.slice() : [];
	var byId: Record<number, any> = {};
	var i;
	for (i = 0; i < list.length; i++) {
		var c: any = list[i];
		if (c && typeof c.MemberNumber === "number") byId[c.MemberNumber] = c;
	}

	var used: Record<number, boolean> = {};
	var nextList: any[] = [];

	function emitCluster(cluster: any) {
		var block: any[] = [];
		seidrClusterOrder(cluster).forEach(function (id: number) {
			var ch = byId[id];
			if (!ch || used[id] || seidrInEcho(ch)) return;
			used[id] = true;
			block.push(ch);
		});
		return block;
	}

	for (i = 0; i < list.length; i++) {
		var character: any = list[i];
		if (!character || typeof character.MemberNumber !== "number") continue;
		if (used[character.MemberNumber]) continue;
		if (seidrInEcho(character)) {
			used[character.MemberNumber] = true;
			nextList.push(character);
			continue;
		}
		var cluster = SeidrState.clusterOf(hubs, character.MemberNumber);
		if (!cluster) {
			used[character.MemberNumber] = true;
			nextList.push(character);
			continue;
		}
		if (used[cluster.hub]) continue;
		var members = emitCluster(cluster);
		if (members.length) nextList.push.apply(nextList, members);
	}

	Object.keys(byId).forEach(function (key) {
		var id = Number(key);
		if (used[id]) return;
		nextList.push(byId[id]);
		used[id] = true;
	});

	return nextList;
}

/** Split a packed list into units: one per Seidr cluster, one per everyone else. */
function seidrPageUnits(packed: any[], hubs: any): { hub: number | null; members: any[] }[] {
	var units: { hub: number | null; members: any[] }[] = [];
	for (var i = 0; i < packed.length; i++) {
		var ch: any = packed[i];
		var cluster = ch && typeof ch.MemberNumber === "number" && !seidrInEcho(ch)
			? SeidrState.clusterOf(hubs, ch.MemberNumber)
			: null;
		var last = units.length ? units[units.length - 1] : null;
		if (cluster && last && last.hub === cluster.hub) {
			last.members.push(ch);
			continue;
		}
		units.push({ hub: cluster ? cluster.hub : null, members: [ch] });
	}
	return units;
}

/**
 * Seidr-owned pages: clusters stay whole, page 1 filled first (clusters, then singles).
 * Page 1 may be short. If page 2 would exceed a page, the last page-2 cluster is
 * split to top page 1 up to exactly SEIDR_PAGE_SIZE.
 */
function seidrPaginate(list: any[], hubs: any): { page1: any[]; page2: any[] } {
	var packed = hubs ? seidrPackList(list, hubs) : (Array.isArray(list) ? list.slice() : []);
	if (packed.length <= SEIDR_PAGE_SIZE) return { page1: packed, page2: [] };

	var units = seidrPageUnits(packed, hubs || {});
	// Clusters claim page 1 first; singles fill the remaining seats. Order kept per page.
	var onPage1: boolean[] = [];
	var count1 = 0;
	units.forEach(function (u, idx) {
		if (u.hub == null) return;
		if (count1 + u.members.length > SEIDR_PAGE_SIZE) return;
		onPage1[idx] = true;
		count1 += u.members.length;
	});
	units.forEach(function (u, idx) {
		if (u.hub != null || count1 >= SEIDR_PAGE_SIZE) return;
		onPage1[idx] = true;
		count1 += 1;
	});
	var page1Units: { hub: number | null; members: any[] }[] = [];
	var page2Units: { hub: number | null; members: any[] }[] = [];
	units.forEach(function (u, idx) {
		(onPage1[idx] ? page1Units : page2Units).push(u);
	});

	var count2 = packed.length - count1;
	if (count2 > SEIDR_PAGE_SIZE && count1 < SEIDR_PAGE_SIZE) {
		var need = SEIDR_PAGE_SIZE - count1;
		for (var k = page2Units.length - 1; k >= 0; k--) {
			var u = page2Units[k];
			if (u.hub == null || u.members.length <= need) continue;
			page1Units.push({ hub: u.hub, members: u.members.slice(0, need) });
			page2Units[k] = { hub: u.hub, members: u.members.slice(need) };
			break;
		}
	}

	function flat(arr: { members: any[] }[]) {
		var out: any[] = [];
		arr.forEach(function (u) { out.push.apply(out, u.members); });
		return out;
	}
	return { page1: flat(page1Units), page2: flat(page2Units) };
}

/**
 * After Club's UpdateDisplay: replace its 10-slice with Seidr pages.
 * Only when unfiltered (no focus / VR / blind-adjacent / single render),
 * i.e. Club's total equals the full room.
 */
function seidrApplyPages() {
	if (!seidrViewActive()) return;
	if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) return;
	if (typeof ChatRoomCharacterViewCharacterCountTotal !== "number") return;
	var total = ChatRoomCharacterViewCharacterCountTotal;
	if (total <= SEIDR_PAGE_SIZE || total !== ChatRoomCharacter.length) return;
	var hubs = Seidr.getHubs ? Seidr.getHubs() : null;
	if (!hubs) return;
	var pages = seidrPaginate(ChatRoomCharacter, hubs);
	var offset = typeof ChatRoomCharacterViewOffset === "number" ? ChatRoomCharacterViewOffset : 0;
	var page = offset !== 0 ? pages.page2 : pages.page1;
	if (!page.length) return;
	ChatRoomCharacterDrawlist = page;
	ChatRoomCharacterViewCharacterCount = page.length;
}

/**
 * Put each hold in adjacent drawlist seats (Echo ChatRoomOrder).
 * No off-page expand — Seidr pages keep partners on the shown page.
 */
function seidrReorderDrawlist() {
	if (typeof ChatRoomCharacterDrawlist === "undefined" || !Array.isArray(ChatRoomCharacterDrawlist)) return;
	var old = ChatRoomCharacterDrawlist;
	if (!old.length) return;
	var hubs = Seidr.getHubs ? Seidr.getHubs() : null;
	if (!hubs) return;

	var nextList = seidrPackList(old, hubs);
	ChatRoomCharacterDrawlist = nextList;
	if (typeof ChatRoomCharacterViewCharacterCount === "number") {
		ChatRoomCharacterViewCharacterCount = nextList.length;
	}
}

/**
 * Echo same-line threshold (|ΔY|). Seidr does not use Echo's always-next row:
 * multi-row clusters pick majority of seats, hub's row on a tie.
 */
var SEIDR_ROW_Y_GAP = 300;

function seidrAverageSeats(seats, zoom) {
	var z = typeof zoom === "number" ? zoom : 1;
	if (!seats || !seats.length) return null;
	var sumX = 0;
	var sumY = 0;
	for (var i = 0; i < seats.length; i++) {
		sumX += seats[i].X;
		sumY += seats[i].Y;
	}
	return { X: sumX / seats.length, Y: sumY / seats.length, Zoom: z };
}

/** Average of the cluster's natural standing seats (Echo SharedCenter + majority row). */
function seidrSharedCenter(cluster, zoom) {
	var z = typeof zoom === "number" ? zoom : 1;
	if (!cluster) return null;
	var seats = [];
	seidrClusterOrder(cluster).forEach(function (id) {
		var pos = seidrNatural[id];
		if (!pos || typeof pos.X !== "number" || typeof pos.Y !== "number") return;
		seats.push({ id: id, X: pos.X, Y: pos.Y });
	});
	if (!seats.length) return null;

	var minY = seats[0].Y;
	var maxY = seats[0].Y;
	for (var i = 1; i < seats.length; i++) {
		if (seats[i].Y < minY) minY = seats[i].Y;
		if (seats[i].Y > maxY) maxY = seats[i].Y;
	}
	if (maxY - minY <= SEIDR_ROW_Y_GAP) {
		return seidrAverageSeats(seats, z);
	}

	// Bucket by row (Y within SEIDR_ROW_Y_GAP). Majority wins; tie → hub's row.
	var rows = [];
	seats.forEach(function (seat) {
		var row = null;
		for (var r = 0; r < rows.length; r++) {
			if (Math.abs(rows[r].y - seat.Y) <= SEIDR_ROW_Y_GAP) {
				row = rows[r];
				break;
			}
		}
		if (!row) {
			row = { y: seat.Y, seats: [] };
			rows.push(row);
		}
		row.seats.push(seat);
	});

	var chosen = rows[0];
	for (var r = 1; r < rows.length; r++) {
		var cand = rows[r];
		if (cand.seats.length > chosen.seats.length) {
			chosen = cand;
			continue;
		}
		if (cand.seats.length < chosen.seats.length) continue;
		var candHasHub = cand.seats.some(function (s) { return s.id === cluster.hub; });
		var chosenHasHub = chosen.seats.some(function (s) { return s.id === cluster.hub; });
		if (candHasHub && !chosenHasHub) chosen = cand;
	}
	return seidrAverageSeats(chosen.seats, z);
}

/**
 * Option A / Echo pair gap from Settings Drawing (Seidr.drawOffsets).
 * pull.x = half-gap from shared center; pull.y = side height.
 * One-side pull: hub shifts opposite on X (Y stays at center).
 * Hub on center X (both sides or cuddle): sides use 2×ox so gap stays 2× Pull X.
 * Cuddle X/Y moves the holder only. Hitboxes stay natural.
 */
function seidrLiveOffsets() {
	var o = Seidr.drawOffsets;
	var pull = { x: 75, y: 0 };
	var cuddle = { x: 0, y: -50 };
	if (o && typeof o === "object") {
		if (o.pull && typeof o.pull === "object") {
			if (typeof o.pull.x === "number" && isFinite(o.pull.x)) pull.x = Math.abs(o.pull.x);
			if (typeof o.pull.y === "number" && isFinite(o.pull.y)) pull.y = o.pull.y;
		}
		if (o.cuddle && typeof o.cuddle === "object") {
			if (typeof o.cuddle.x === "number" && isFinite(o.cuddle.x)) cuddle.x = o.cuddle.x;
			if (typeof o.cuddle.y === "number" && isFinite(o.cuddle.y)) cuddle.y = o.cuddle.y;
		}
	}
	return { pull: pull, cuddle: cuddle };
}

function seidrDrawPose(character, x, y, zoom) {
	var z = typeof zoom === "number" ? zoom : 1;
	if (!character || typeof character.MemberNumber !== "number") return null;
	if (seidrInEcho(character)) return null;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return null;
	var center = seidrSharedCenter(cluster, z);
	if (!center) return null;
	var o = seidrLiveOffsets();
	var ox = o.pull.x * z;
	var oy = o.pull.y * z;
	// When hub sits on center X (both sides, or cuddle), double side X so
	// hub-to-side gap stays 2× Pull X — same as one-side pull with hub opposite.
	var hubOnCenterX = cluster.cuddle != null
		|| (cluster.left != null && cluster.right != null);
	var sideOx = hubOnCenterX ? ox * 2 : ox;
	var n = character.MemberNumber;
	if (n === cluster.left) {
		return { X: center.X - sideOx, Y: center.Y + oy, Zoom: z };
	}
	if (n === cluster.right) {
		return { X: center.X + sideOx, Y: center.Y + oy, Zoom: z };
	}
	if (n === cluster.cuddle) return { X: center.X, Y: center.Y, Zoom: z };
	if (n === cluster.hub) {
		if (cluster.cuddle != null) {
			return { X: center.X + o.cuddle.x * z, Y: center.Y + o.cuddle.y * z, Zoom: z };
		}
		if (cluster.left != null && cluster.right == null) {
			return { X: center.X + ox, Y: center.Y, Zoom: z };
		}
		if (cluster.right != null && cluster.left == null) {
			return { X: center.X - ox, Y: center.Y, Zoom: z };
		}
		return { X: center.X, Y: center.Y, Zoom: z };
	}
	return null;
}

/**
 * Echo drawOffset: LoopCharacters keeps natural seats (hitboxes + status/overlay).
 * Pull/cuddle pose is applied only in DrawCharacter. Hub/cuddle art is deferred
 * for z-order after the loop. Outside the room loop, args stay as-is.
 */
var seidrInRoomLoop = false;
/** True while replaying deferred hub/cuddle DrawCharacter (pose already baked). */
var seidrFrontReplay = false;
var seidrFrontCapture = null;

/** Rewrite DrawCharacter X/Y/Zoom to the cluster pose (Echo SharedCenter offset). */
function seidrApplyDrawPose(args) {
	var pose = seidrDrawPose(args[0], args[1], args[2], args[3]);
	if (!pose) return args;
	args[1] = pose.X;
	args[2] = pose.Y;
	args[3] = pose.Zoom;
	return args;
}

/**
 * Defer all clustered DrawCharacter to post-loop replay so Club's per-row
 * background redraw cannot wipe sides whose pose sits on a later row.
 * Order: left → right → hub → cuddle.
 */
function seidrFrontRank(character) {
	if (!character || typeof character.MemberNumber !== "number") return 0;
	if (seidrInEcho(character)) return 0;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return 0;
	if (cluster.left === character.MemberNumber) return 1;
	if (cluster.right === character.MemberNumber) return 2;
	if (cluster.hub === character.MemberNumber) return 3;
	if (cluster.cuddle === character.MemberNumber) return 4;
	return 0;
}

/** Capture already-posed DrawCharacter args for cluster z-order replay. */
function seidrHoldFrontCharacter(args) {
	if (!seidrInRoomLoop || !seidrFrontCapture) return false;
	var rank = seidrFrontRank(args[0]);
	if (!rank) return false;
	seidrFrontCapture.characters.push({ rank: rank, args: Array.prototype.slice.call(args) });
	return true;
}

function seidrReplayFront(captured) {
	if (!captured || !captured.characters || !captured.characters.length) return;
	var fn = typeof DrawCharacter === "function" ? DrawCharacter : null;
	if (!fn) return;
	var list = captured.characters.slice().sort(function (a, b) { return a.rank - b.rank; });
	for (var i = 0; i < list.length; i++) {
		try {
			// Pose after the loop: every on-page seat for this frame is recorded.
			fn.apply(null, seidrApplyDrawPose(list[i].args));
		} catch (e) {
			console.warn("[Seidr] front draw", e);
		}
	}
}

/**
 * Echo parity: status / mod overlay coords use the natural seat, not the pull pose.
 * Returns null when the character is not clustered or natural seat is unknown.
 */
function seidrStatusCoords(character, x, y, zoom) {
	if (!character || typeof character.MemberNumber !== "number") return null;
	if (!seidrInCluster(character)) return null;
	var nat = seidrNatural[character.MemberNumber];
	if (!nat || typeof nat.X !== "number" || typeof nat.Y !== "number") return null;
	return {
		X: nat.X,
		Y: nat.Y,
		Zoom: typeof nat.Zoom === "number" ? nat.Zoom : zoom,
	};
}

function seidrApplyStatusNatural(args) {
	var coords = seidrStatusCoords(args[0], args[1], args[2], args[3]);
	if (!coords) return args;
	args[1] = coords.X;
	args[2] = coords.Y;
	args[3] = coords.Zoom;
	return args;
}

/** MemberNumber whose arousal meter click should be suppressed (clustered holds). */
var seidrSuppressArousalMember: number | null = null;

Seidr.installDraw = function () {
	Seidr.tryHook("ChatRoomUpdateDisplay", "ChatRoomUpdateDisplay", 10, function (args, next) {
		try { seidrReconcileEcho(); } catch (e) { /* ignore */ }
		var result = next(args);
		try { seidrApplyPages(); } catch (ePage) { console.warn("[Seidr] pages", ePage); }
		try { seidrReorderDrawlist(); } catch (e) { console.warn("[Seidr] reorder", e); }
		return result;
	});

	Seidr.hookFunction("DrawCharacter", 1, function (args, next) {
		if (seidrInRoomLoop) {
			if (seidrHoldFrontCharacter(args)) return;
		} else if (!seidrFrontReplay) {
			return next(args);
		}
		const C = args[0];
		const mode = seidrClusterNameMode();
		const prevCtx = seidrNameDrawCtx;
		if (mode !== "default" && seidrInCluster(C) && typeof C.MemberNumber === "number") {
			const stored = seidrNatural[C.MemberNumber];
			if (stored && typeof stored.X === "number" && typeof stored.Y === "number") {
				const fallbackZ = typeof args[3] === "number" && args[3] > 0 ? args[3] : 1;
				seidrNameDrawCtx = {
					character: C,
					mode: mode,
					nat: seidrNatFromStored(stored, fallbackZ),
				};
			}
		}
		try {
			return next(args);
		} finally {
			seidrNameDrawCtx = prevCtx;
		}
	});
	/** Names only — rewrite/skip Club nickname DrawText; never touch status/overlays. */
	Seidr.hookFunction("DrawText", 2, function (args, next) {
		const ctx = seidrNameDrawCtx;
		if (!ctx) return next(args);
		let nick = "";
		try {
			nick = typeof CharacterNickname === "function"
				? String(CharacterNickname(ctx.character) || "")
				: String(ctx.character && (ctx.character.Nickname || ctx.character.Name) || "");
		} catch (e) { /* ignore */ }
		if (!nick || String(args[0]) !== nick) return next(args);
		if (ctx.mode === "hide") return;
		if (ctx.mode === "hover" && !seidrClusterHitboxHovered(ctx.nat)) return;
		if (ctx.mode === "hitbox" || ctx.mode === "hover") {
			const pos = seidrClusterNamePos(ctx.nat);
			args[1] = pos.X;
			args[2] = pos.Y;
		}
		return next(args);
	});
	Seidr.hookFunction("DrawStatus", 1, function (args, next) {
		if (!seidrInRoomLoop) return next(args);
		return next(seidrApplyStatusNatural(args));
	});
	Seidr.hookFunction("ChatRoomCharacterViewDrawOverlay", 1, function (args, next) {
		if (!seidrInRoomLoop) return next(args);
		return next(seidrApplyStatusNatural(args));
	});

	Seidr.hookFunction("ChatRoomCharacterViewLoopCharacters", 5, function (args, next) {
		if (!seidrViewActive()) return next(args);
		try { seidrReorderDrawlist(); } catch (e) { /* ignore */ }
		seidrClearNatural();
		var original = args[0];
		args[0] = function (charIdx, charX, charY, space, zoom) {
			try {
				var list = ChatRoomCharacterDrawlist;
				var character = list && list[charIdx];
				if (character && typeof character.MemberNumber === "number") {
					// Natural seats for hitboxes, status/mod icons, and shared-center math.
					seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom, Space: space };
				}
			} catch (e) { /* ignore */ }
			return original(charIdx, charX, charY, space, zoom);
		};
		var previous = seidrFrontCapture;
		var previousLoop = seidrInRoomLoop;
		seidrFrontCapture = { characters: [] };
		seidrInRoomLoop = true;
		var result;
		try {
			result = next(args);
		} finally {
			var captured = seidrFrontCapture;
			seidrFrontCapture = previous;
			seidrInRoomLoop = previousLoop;
			seidrFrontReplay = true;
			try {
				seidrReplayFront(captured);
			} catch (eReplay) {
				console.warn("[Seidr] replay front", eReplay);
			} finally {
				seidrFrontReplay = false;
			}
		}
		return result;
	});

	// BCX-safe: never overwrite PreferenceArousalAtLeast; flag + ModSDK hook.
	Seidr.hookFunction("PreferenceArousalAtLeast", 5, function (args, next) {
		var who = args[0];
		if (seidrSuppressArousalMember != null && who && who.MemberNumber === seidrSuppressArousalMember) {
			return false;
		}
		return next(args);
	});

	Seidr.hookFunction("ChatRoomCharacterViewClickCharacter", 5, function (args, next) {
		var character = args[0];
		if (!seidrInCluster(character)) return next(args);
		seidrSuppressArousalMember = character.MemberNumber;
		try {
			return next(args);
		} finally {
			seidrSuppressArousalMember = null;
		}
	});
};

// Test hooks
Seidr._draw = {
	natural: seidrNatural,
	sharedCenter: seidrSharedCenter,
	drawPose: seidrDrawPose,
	statusCoords: seidrStatusCoords,
	clusterOrder: seidrClusterOrder,
	reorder: seidrReorderDrawlist,
	frontRank: seidrFrontRank,
	packList: seidrPackList,
	paginate: seidrPaginate,
	clearNatural: seidrClearNatural,
	pageSize: SEIDR_PAGE_SIZE,
};
