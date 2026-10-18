/** Echo-style pose offsets and drawlist reorder. */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrFindChar, seidrInEcho, seidrReconcileEcho } from "./room";

export const seidrNatural: Record<number, { X: number; Y: number; Zoom?: number }> = {};

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
 * Sides (behind): center ± OFFSET_X and OFFSET_SIDE_Y up — Echo cuddle uses Y -50
 * for the person in back; X is a step past Echo pull's ±75.
 * Cuddle: holder at OFFSET_HUB_Y, held on the center (Echo 贴贴).
 */
function seidrDrawPose(character, x, y, zoom) {
	var z = typeof zoom === "number" ? zoom : 1;
	if (!character || typeof character.MemberNumber !== "number") return null;
	if (seidrInEcho(character)) return null;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return null;
	var center = seidrSharedCenter(cluster, z);
	if (!center) return null;
	var ox = (Seidr.OFFSET_X || 100) * z;
	// One pull: hub and side sit ±ox from center (gap 2*ox). Two pulls used to put the
	// hub on center and sides at ±ox, which halved that gap — keep the same spacing.
	var bothSides = cluster.left != null && cluster.right != null;
	var sideOx = bothSides ? ox * 2 : ox;
	var sideY = center.Y + (Seidr.OFFSET_SIDE_Y || -50) * z;
	var hubY = (Seidr.OFFSET_HUB_Y || -50) * z;
	var n = character.MemberNumber;
	if (n === cluster.left) return { X: center.X - sideOx, Y: sideY, Zoom: z };
	if (n === cluster.right) return { X: center.X + sideOx, Y: sideY, Zoom: z };
	if (n === cluster.cuddle) return { X: center.X, Y: center.Y, Zoom: z };
	if (n === cluster.hub) {
		if (cluster.cuddle != null) return { X: center.X, Y: center.Y + hubY, Zoom: z };
		if (cluster.left != null && cluster.right == null) return { X: center.X + ox, Y: center.Y, Zoom: z };
		if (cluster.right != null && cluster.left == null) return { X: center.X - ox, Y: center.Y, Zoom: z };
		return { X: center.X, Y: center.Y, Zoom: z };
	}
	return null;
}

/**
 * Pose is applied once in ChatRoomCharacterViewLoopCharacters (FAM-style) so
 * DrawCharacter (name/arousal), DrawStatus, and DrawOverlay (BCX/WCE) share CharX/Y.
 * Outside that loop (action dialog portrait, etc.) seats stay natural.
 */
var seidrInRoomLoop = false;
var seidrFrontCapture = null;

function seidrFrontRank(character) {
	if (!character || typeof character.MemberNumber !== "number") return 0;
	if (seidrInEcho(character)) return 0;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return 0;
	if (cluster.cuddle === character.MemberNumber) return 2;
	if (cluster.hub === character.MemberNumber) return 1;
	return 0;
}

/** Capture already-posed args for hub/cuddle z-order; do not re-offset. */
function seidrHoldFrontDraw(bucket, args) {
	if (!seidrInRoomLoop || !seidrFrontCapture) return false;
	var rank = seidrFrontRank(args[0]);
	if (!rank) return false;
	seidrFrontCapture[bucket].push({ rank: rank, args: Array.prototype.slice.call(args) });
	return true;
}

function seidrReplayFront(captured) {
	if (!captured) return;
	function replay(list, fn) {
		if (!fn || !list || !list.length) return;
		list.sort(function (a, b) { return a.rank - b.rank; });
		for (var i = 0; i < list.length; i++) {
			try {
				fn.apply(null, list[i].args);
			} catch (e) {
				console.warn("[Seidr] front draw", e);
			}
		}
	}
	replay(captured.characters, typeof DrawCharacter === "function" ? DrawCharacter : null);
	replay(captured.status, typeof DrawStatus === "function" ? DrawStatus : null);
	replay(captured.overlays, typeof ChatRoomCharacterViewDrawOverlay === "function" ? ChatRoomCharacterViewDrawOverlay : null);
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
		if (!seidrInRoomLoop) return next(args);
		if (seidrHoldFrontDraw("characters", args)) return;
		return next(args);
	});
	Seidr.hookFunction("DrawStatus", 1, function (args, next) {
		if (!seidrInRoomLoop) return next(args);
		if (seidrHoldFrontDraw("status", args)) return;
		return next(args);
	});
	Seidr.hookFunction("ChatRoomCharacterViewDrawOverlay", 1, function (args, next) {
		if (!seidrInRoomLoop) return next(args);
		if (seidrHoldFrontDraw("overlays", args)) return;
		return next(args);
	});

	Seidr.hookFunction("ChatRoomCharacterViewLoopCharacters", 5, function (args, next) {
		if (!seidrViewActive()) return next(args);
		try { seidrReorderDrawlist(); } catch (e) { /* ignore */ }
		var original = args[0];
		args[0] = function (charIdx, charX, charY, space, zoom) {
			var drawX = charX;
			var drawY = charY;
			var drawZoom = zoom;
			try {
				var list = ChatRoomCharacterDrawlist;
				var character = list && list[charIdx];
				if (character && typeof character.MemberNumber === "number") {
					// Natural seats for hitboxes / shared center; pose for every UI draw.
					seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom };
					var pose = seidrDrawPose(character, charX, charY, zoom);
					if (pose) {
						drawX = pose.X;
						drawY = pose.Y;
						drawZoom = pose.Zoom;
					}
				}
			} catch (e) { /* ignore */ }
			return original(charIdx, drawX, drawY, space, drawZoom);
		};
		var previous = seidrFrontCapture;
		var previousLoop = seidrInRoomLoop;
		seidrFrontCapture = { characters: [], status: [], overlays: [] };
		seidrInRoomLoop = true;
		var result;
		try {
			result = next(args);
		} finally {
			var captured = seidrFrontCapture;
			seidrFrontCapture = previous;
			seidrInRoomLoop = previousLoop;
			try {
				seidrReplayFront(captured);
			} catch (eReplay) {
				console.warn("[Seidr] replay front", eReplay);
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
	clusterOrder: seidrClusterOrder,
	reorder: seidrReorderDrawlist,
};
