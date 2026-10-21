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
 * Option A / Echo pair gap from Settings Drawing (Seidr.drawOffsets).
 * pull.x = half-gap from shared center; pull.y = side height.
 * One-side pull: hub shifts opposite on X (Y stays at center).
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
	var n = character.MemberNumber;
	if (n === cluster.left) {
		return { X: center.X - ox, Y: center.Y + oy, Zoom: z };
	}
	if (n === cluster.right) {
		return { X: center.X + ox, Y: center.Y + oy, Zoom: z };
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
		if (!seidrInRoomLoop) return next(args);
		seidrApplyDrawPose(args);
		if (seidrHoldFrontCharacter(args)) return;
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
					seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom };
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
	statusCoords: seidrStatusCoords,
	clusterOrder: seidrClusterOrder,
	reorder: seidrReorderDrawlist,
};
