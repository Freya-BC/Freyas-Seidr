/** Echo-style pose offsets and drawlist reorder. */
import { Seidr } from "./seidr";
import { seidrGetSettings } from "./settings/storage";
import type { SeidrClusterNameMode } from "./settings/model";
import { SeidrState } from "./state";
import { seidrFindChar, seidrInEcho, seidrReconcileEcho } from "./room";

declare const CharacterNickname: ((C: any) => string) | undefined;
declare const ChatRoomCharacter: any;
declare const CommonPhotoMode: any;
declare const CurrentCharacter: any;
declare const MouseIn: ((x: number, y: number, w: number, h: number) => boolean) | undefined;

export const seidrNatural: Record<number, { X: number; Y: number; Zoom?: number; Space?: number }> = {};

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
 * Put each hold in adjacent drawlist seats (Echo ChatRoomOrder).
 * Clicks then use those full normal hitboxes; art is pulled together separately.
 */
function seidrReorderDrawlist() {
	if (typeof ChatRoomCharacterDrawlist === "undefined" || !Array.isArray(ChatRoomCharacterDrawlist)) return;
	var old = ChatRoomCharacterDrawlist;
	if (!old.length) return;
	var hubs = Seidr.getHubs ? Seidr.getHubs() : null;
	if (!hubs) return;

	var byId = {};
	var i;
	for (i = 0; i < old.length; i++) {
		var c = old[i];
		if (c && typeof c.MemberNumber === "number") byId[c.MemberNumber] = c;
	}

	// Bring missing cluster partners into the draw list (Echo focus-mode expand).
	Object.keys(hubs).forEach(function (key) {
		var cluster = SeidrState.clusterOf(hubs, key);
		if (!cluster) return;
		var present = seidrClusterOrder(cluster).some(function (id) { return !!byId[id]; });
		if (!present) return;
		seidrClusterOrder(cluster).forEach(function (id) {
			if (byId[id]) return;
			var found = seidrFindChar(id);
			if (found && !seidrInEcho(found)) byId[id] = found;
		});
	});

	var used = {};
	var nextList = [];

	function emitCluster(cluster) {
		var block = [];
		seidrClusterOrder(cluster).forEach(function (id) {
			var ch = byId[id];
			if (!ch || used[id] || seidrInEcho(ch)) return;
			used[id] = true;
			block.push(ch);
		});
		return block;
	}

	for (i = 0; i < old.length; i++) {
		var character = old[i];
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

	ChatRoomCharacterDrawlist = nextList;
	if (typeof ChatRoomCharacterViewCharacterCount === "number") {
		ChatRoomCharacterViewCharacterCount = nextList.length;
	}
}

/** Average of the cluster's natural standing seats (Echo SharedCenter). */
function seidrSharedCenter(cluster, zoom) {
	var z = typeof zoom === "number" ? zoom : 1;
	if (!cluster) return null;
	var sumX = 0;
	var sumY = 0;
	var count = 0;
	seidrClusterOrder(cluster).forEach(function (id) {
		var pos = seidrNatural[id];
		if (!pos || typeof pos.X !== "number") return;
		sumX += pos.X;
		sumY += pos.Y;
		count += 1;
	});
	if (!count) return null;
	return { X: sumX / count, Y: sumY / count, Zoom: z };
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

function seidrFrontRank(character) {
	if (!character || typeof character.MemberNumber !== "number") return 0;
	if (seidrInEcho(character)) return 0;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return 0;
	if (cluster.cuddle === character.MemberNumber) return 2;
	if (cluster.hub === character.MemberNumber) return 1;
	return 0;
}

/** Capture already-posed DrawCharacter args for hub/cuddle z-order. */
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
			fn.apply(null, list[i].args);
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
		try { seidrReorderDrawlist(); } catch (e) { console.warn("[Seidr] reorder", e); }
		return result;
	});

	Seidr.hookFunction("DrawCharacter", 1, function (args, next) {
		if (seidrInRoomLoop) {
			seidrApplyDrawPose(args);
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
};
