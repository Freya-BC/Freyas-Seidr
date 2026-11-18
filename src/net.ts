/** Hidden Seidr sync. */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrPresentMap, seidrYieldOnEchoSync } from "./room";
import { seidrNatural } from "./draw";

/** Void-disconnect seat hold before automatic prune (ms). */
var SEIDR_GRACE_MS = 45000;

var seidrPeers: Record<number, { at: number; ver: any; proto: number }> = {};

/** Soft-gone members: hold hub seats until rejoin or timer. */
var seidrPendingGone: Record<number, { hub: number; until: number; timer: ReturnType<typeof setTimeout> }> = {};

/** Wire protocol: 1 = verbose objects under Dictionary key "Seidr"; 2 = positional arrays under "S". */
var SEIDR_PROTO = 2;
/** Test hook: pretend to be an older client (announce this proto, ignore v2 input). */
var seidrForceProto: number | null = null;

function seidrMyProto(): number {
	return seidrForceProto != null ? seidrForceProto : SEIDR_PROTO;
}

function seidrEnvelope(entry: any, target?: number) {
	var msg: any = {
		Content: Seidr.HIDDEN,
		Type: "Hidden",
		Dictionary: [entry],
	};
	if (typeof target === "number") msg.Target = target;
	return msg;
}

function seidrRawSend(msg: any) {
	if (typeof ServerSend !== "function") return;
	try {
		ServerSend("ChatRoomChat", msg);
	} catch (e) { /* ignore */ }
}

/** v1 message (always readable by every Seidr build). */
function seidrSend(payload: any, target?: number) {
	seidrRawSend(seidrEnvelope({ Seidr: payload }, target));
}

/** v2 message: one positional array under key S. */
function seidrSendV2(arr: any[], target?: number) {
	seidrRawSend(seidrEnvelope({ S: arr }, target));
}

/**
 * Wire format for a recipient: 0 = nobody to send to (broadcast with no known peers),
 * 2 = every recipient announced proto >= 2, else 1.
 */
function seidrFormatFor(target?: number): number {
	if (seidrMyProto() < 2) return 1;
	if (typeof target === "number") {
		var peer = seidrPeers[target];
		return peer && peer.proto >= 2 ? 2 : 1;
	}
	var keys = Object.keys(seidrPeers);
	if (!keys.length) return 0;
	for (var i = 0; i < keys.length; i++) {
		if (!(seidrPeers[Number(keys[i])].proto >= 2)) return 1;
	}
	return 2;
}

function seidrCancelGrace(member: number) {
	var entry = seidrPendingGone[member];
	if (!entry) return;
	if (entry.timer) clearTimeout(entry.timer);
	delete seidrPendingGone[member];
}

function seidrClearAllGrace() {
	Object.keys(seidrPendingGone).forEach(function (key) {
		seidrCancelGrace(Number(key));
	});
}

/** Drop seat after grace; intentional clears cancel grace earlier via reconcile. */
function seidrExpireGrace(member: number) {
	var entry = seidrPendingGone[member];
	if (entry && entry.timer) clearTimeout(entry.timer);
	delete seidrPendingGone[member];
	var hubs = Seidr.getHubs();
	var cluster = SeidrState.clusterOf(hubs, member);
	if (!cluster) return;
	var hubId = cluster.hub;
	Seidr.setHubs(SeidrState.releaseMember(hubs, member));
	seidrPublishHub(hubId);
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
}

function seidrStartGrace(left: number) {
	var hubs = Seidr.getHubs();
	var cluster = SeidrState.clusterOf(hubs, left);
	if (!cluster) return;
	seidrCancelGrace(left);
	var until = Date.now() + SEIDR_GRACE_MS;
	var timer = setTimeout(function () {
		seidrExpireGrace(left);
	}, SEIDR_GRACE_MS);
	seidrPendingGone[left] = { hub: cluster.hub, until: until, timer: timer };
}

/** Cancel grace when hubs no longer list that member (hub Leave / inbound state). */
function seidrReconcileGrace() {
	var hubs = Seidr.getHubs();
	Object.keys(seidrPendingGone).forEach(function (key) {
		var m = Number(key);
		if (!SeidrState.clusterOf(hubs, m)) seidrCancelGrace(m);
	});
}

function seidrPresentWithGrace() {
	var present = seidrPresentMap();
	Object.keys(seidrPendingGone).forEach(function (key) {
		present[Number(key)] = true;
	});
	return present;
}

function seidrPublishChanged(before, after, actor, target) {
	var seen = {};
	function consider(member) {
		if (typeof member !== "number" || seen[member]) return;
		seen[member] = true;
		var prev = before && before[member];
		var nextHub = after && after[member];
		if (JSON.stringify(prev || null) === JSON.stringify(nextHub || null)) return;
		seidrPublishHub(member);
	}
	[actor, target].forEach(consider);
	// Self-leave and satellite leave change the hub record, not the actor's key.
	[actor, target].forEach(function (member) {
		if (typeof member !== "number") return;
		var beforeCl = SeidrState.clusterOf(before, member);
		var afterCl = SeidrState.clusterOf(after, member);
		if (beforeCl) consider(beforeCl.hub);
		if (afterCl) consider(afterCl.hub);
	});
}

function seidrPairPayload(pair: any, fallback: { x: number; y: number }) {
	var x = pair && typeof pair.x === "number" && isFinite(pair.x) ? Math.round(pair.x) : fallback.x;
	var y = pair && typeof pair.y === "number" && isFinite(pair.y) ? Math.round(pair.y) : fallback.y;
	return { x: x, y: y };
}

/** Hub-owner free-draw offsets to share, or null (Allow Sync off / not the hub / nothing to share). */
function seidrFreeForSync(hubMember: number): any {
	if (typeof hubMember !== "number") return null;
	if (!Seidr.drawAllowSync) return null;
	if (typeof Player === "undefined" || !Player || Player.MemberNumber !== hubMember) return null;
	var hubs = Seidr.getHubs();
	var hub = hubs[hubMember];
	if (!hub || (hub.left == null && hub.right == null && hub.cuddle == null)) return null;
	var cluster = SeidrState.clusterOf(hubs, hubMember);
	if (!cluster) return null;
	var free = typeof Seidr.effectiveFreeDrawForSync === "function"
		? Seidr.effectiveFreeDrawForSync(cluster)
		: null;
	if (!free) return null;
	var z = { x: 0, y: 0 };
	return {
		left: seidrPairPayload(free.left, z),
		right: seidrPairPayload(free.right, z),
		cuddle: seidrPairPayload(free.cuddle, z),
		hubPose: seidrPairPayload(free.hub, z),
	};
}

function seidrDrawArray(d: any): number[] {
	return [d.left.x, d.left.y, d.right.x, d.right.y, d.cuddle.x, d.cuddle.y, d.hubPose.x, d.hubPose.y];
}

/** v1 drawSync message (peers without v2 support). */
function seidrSendDrawSyncV1(hubMember: number, d: any, target?: number) {
	seidrSend({
		t: "drawSync",
		v: 1,
		hub: hubMember,
		left: d.left,
		right: d.right,
		cuddle: d.cuddle,
		hubPose: d.hubPose,
	}, target);
}

function seidrOnDrawSync(from: number | null, payload: any) {
	if (!Seidr.drawAllowSync) return;
	if (!payload || typeof payload.hub !== "number") return;
	// Only the real hub may author draw overlays — ignore spoofed senders.
	if (typeof from !== "number" || from !== payload.hub) return;
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), Player.MemberNumber);
	if (!cluster || cluster.hub !== payload.hub) return;
	if (typeof Seidr.setDrawSyncOverlay !== "function") return;
	Seidr.setDrawSyncOverlay(payload.hub, {
		left: payload.left,
		right: payload.right,
		cuddle: payload.cuddle,
		hub: payload.hubPose,
	});
}

/** Last broadcast per hub (triple + draw) so unchanged draw offsets are not repeated. */
var seidrLastBroadcast: Record<number, string> = {};

/** Pending outgoing hub states, coalesced per target|hub until the next tick. */
var seidrQueue: Record<string, { hub: number; target?: number; forceDraw: boolean }> = {};
var seidrFlushTimer: any = null;

function seidrQueueHub(hubMember: number, target?: number, forceDraw?: boolean) {
	if (typeof hubMember !== "number") return;
	var key = (typeof target === "number" ? target : "*") + "|" + hubMember;
	var entry = seidrQueue[key];
	if (entry) {
		if (forceDraw) entry.forceDraw = true;
	} else {
		seidrQueue[key] = { hub: hubMember, target: target, forceDraw: !!forceDraw };
	}
	if (seidrFlushTimer == null) {
		seidrFlushTimer = setTimeout(seidrFlushQueue, 0);
	}
}

function seidrFlushQueue() {
	if (seidrFlushTimer != null) {
		clearTimeout(seidrFlushTimer);
		seidrFlushTimer = null;
	}
	var pending = seidrQueue;
	seidrQueue = {};
	Object.keys(pending).forEach(function (key) {
		var e = pending[key];
		try { seidrEmitHub(e.hub, e.target, e.forceDraw); } catch (err) { /* ignore */ }
	});
}

function seidrEmitHub(hubMember: number, target: number | undefined, forceDraw: boolean) {
	var fmt = seidrFormatFor(target);
	if (!fmt) return;
	var hub = Seidr.getHubs()[hubMember];
	var l = hub ? hub.left : null;
	var r = hub ? hub.right : null;
	var c = hub ? hub.cuddle : null;
	var d = seidrFreeForSync(hubMember);
	var targeted = typeof target === "number";
	if (fmt === 2) {
		var arr: any[] = [1, hubMember, l || 0, r || 0, c || 0];
		if (d) {
			var triple = l + "," + r + "," + c;
			var sig = triple + "|" + seidrDrawArray(d).join(",");
			if (targeted || forceDraw || seidrLastBroadcast[hubMember] !== sig) {
				arr.push.apply(arr, seidrDrawArray(d));
			}
			if (!targeted) seidrLastBroadcast[hubMember] = sig;
		} else if (!targeted) {
			delete seidrLastBroadcast[hubMember];
		}
		seidrSendV2(arr, target);
		return;
	}
	seidrSend({ t: "state", v: 1, hub: hubMember, left: l, right: r, cuddle: c }, target);
	if (d) seidrSendDrawSyncV1(hubMember, d, target);
}

function seidrPublishHub(hubMember: number, target?: number) {
	seidrQueueHub(hubMember, target, false);
}

/** Hub-only free-draw broadcast. Session overlays only — gated by drawAllowSync. */
function seidrPublishDrawSync(hubMember: number, target?: number) {
	if (!seidrFreeForSync(hubMember)) return;
	if (seidrFormatFor(target) === 2) {
		seidrQueueHub(hubMember, target, true);
		return;
	}
	var d = seidrFreeForSync(hubMember);
	if (d) seidrSendDrawSyncV1(hubMember, d, target);
}

function seidrOwnsHub(me: number): boolean {
	var h = Seidr.getHubs()[me];
	return !!(h && (h.left != null || h.right != null || h.cuddle != null));
}

/** Publish our hub when we own a non-empty one (e.g. room re-sync with state kept). */
function seidrPublishOurs(target?: number) {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	if (seidrOwnsHub(Player.MemberNumber)) seidrPublishHub(Player.MemberNumber, target);
}

function seidrHello(want?: boolean, target?: number) {
	var mine = seidrMyProto();
	// The initial broadcast must stay v1 so builds without v2 can still discover us.
	var fmt = typeof target === "number" ? seidrFormatFor(target) : 1;
	if (fmt === 2) {
		seidrSendV2([0, mine, Seidr.VERSION, want ? 1 : 0], target);
		return;
	}
	var payload: any = { t: "hello", v: 1, ver: Seidr.VERSION, reply: !!want };
	if (mine >= 2) payload.proto = mine;
	seidrSend(payload, target);
}

function seidrSyncRequest(target?: number) {
	seidrSend({ t: "syncRequest", v: 1 }, target);
}

/** Legacy peers still send syncRequest: reply with hubs we own or that list the requester. */
function seidrOnSyncRequest(from: number | null) {
	if (typeof from !== "number") return;
	seidrAnswerJoin(from);
}

/**
 * Answer a joiner: each hub owner replies for its own hub; when the joiner owns a hub
 * (rejoin after a void disconnect) the lowest present member of that hub restores it.
 */
function seidrAnswerJoin(joiner: number) {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var me = Player.MemberNumber;
	if (seidrOwnsHub(me)) seidrPublishHub(me, joiner);
	var hubs = Seidr.getHubs();
	var h = hubs[joiner];
	if (!h || (h.left == null && h.right == null && h.cuddle == null)) return;
	var present = seidrPresentMap();
	var best: number | null = null;
	[h.left, h.right, h.cuddle].forEach(function (m) {
		if (typeof m !== "number" || m === joiner || !present[m]) return;
		if (best == null || m < best) best = m;
	});
	if (best === me) seidrPublishHub(joiner, joiner);
}

Seidr.peerHas = function (member) {
	return !!(seidrPeers && seidrPeers[member]);
};

function seidrOnHello(from, payload) {
	if (typeof from !== "number") return;
	var proto = payload && typeof payload.proto === "number" ? payload.proto : 1;
	seidrPeers[from] = { at: Date.now(), ver: payload && (payload.ver || payload.v), proto: proto };
	var want = payload && (payload.want != null ? payload.want : payload.reply);
	if (want) {
		seidrHello(false, from);
		seidrAnswerJoin(from);
	}
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
}

/** Throttle corrective re-publish when peers try to overwrite our hub (map-watch races). */
var seidrOwnHubDefendAt = 0;

function seidrOnState(payload, from?: number | null) {
	if (!payload || typeof payload.hub !== "number") return;
	// Hub owner is sole authority for that hub record. Peers (esp. older Seidr that
	// still break-on-any-hub-move) must not clear our holds after MapData sync (~0.5–2s).
	if (
		typeof Player !== "undefined" &&
		Player &&
		typeof Player.MemberNumber === "number" &&
		Player.MemberNumber === payload.hub
	) {
		if (typeof from === "number" && from !== payload.hub) {
			var now = Date.now();
			if (now - seidrOwnHubDefendAt > 500) {
				seidrOwnHubDefendAt = now;
				seidrPublishHub(payload.hub);
			}
		}
		return;
	}
	Seidr.setHubs(SeidrState.replaceHub(Seidr.getHubs(), payload.hub, payload));
	seidrReconcileGrace();
}

function seidrOnLeaveClear(payload, from: number | null) {
	var member = payload && typeof payload.member === "number" ? payload.member : from;
	if (typeof member !== "number") return;
	seidrCancelGrace(member);
	var hubs = Seidr.getHubs();
	if (!SeidrState.clusterOf(hubs, member)) return;
	Seidr.setHubs(SeidrState.releaseMember(hubs, member));
	seidrReconcileGrace();
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
}

function seidrOnActivityMessage(data) {
	var name = Seidr.activityNameFromMessage(data);
	if (!name || name.indexOf(Seidr.PREFIX) !== 0) return;
	var source = Seidr.dictValue(data.Dictionary, "SourceCharacter");
	var target = Seidr.dictValue(data.Dictionary, "TargetCharacter");
	if (typeof source !== "number") source = typeof data.Sender === "number" ? data.Sender : null;
	if (typeof source !== "number" || typeof target !== "number") return;
	Seidr.setHubs(Seidr.applyNamed(Seidr.getHubs(), source, target, name));
	seidrReconcileGrace();
}

function seidrPayload(data) {
	return Seidr.dictValue(data && data.Dictionary, "Seidr");
}

function seidrPruneRoom() {
	var before = JSON.stringify(Seidr.getHubs());
	var next = SeidrState.pruneMissing(Seidr.getHubs(), seidrPresentWithGrace());
	Seidr.setHubs(next);
	seidrReconcileGrace();
	if (JSON.stringify(next) === before) return;
	if (typeof Player === "undefined" || !Player) return;
	var cluster = SeidrState.clusterOf(next, Player.MemberNumber);
	if (cluster && cluster.hub === Player.MemberNumber) seidrPublishHub(cluster.hub);
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
}

function seidrSendLeaveClear(me: number) {
	var fmt = seidrFormatFor();
	if (!fmt) return;
	if (fmt === 2) seidrSendV2([2, me]);
	else seidrSend({ t: "leaveClear", v: 1, member: me });
}

/** Tell the room our hold is gone before we leave, so both parties snap back. */
function seidrPublishLeaveClear() {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var me = Player.MemberNumber;
	var hubs = Seidr.getHubs();
	var cluster = SeidrState.clusterOf(hubs, me);
	if (!cluster) {
		seidrSendLeaveClear(me);
		return;
	}
	seidrSendLeaveClear(me);
	if (cluster.hub === me) {
		Seidr.setHubs(SeidrState.replaceHub(hubs, me, { left: null, right: null, cuddle: null }));
		seidrPublishHub(me);
		return;
	}
	var next = SeidrState.removeRelation(hubs, me, cluster.hub);
	Seidr.setHubs(next);
	seidrPublishHub(cluster.hub);
}

function seidrMember(v: any): number | null {
	return typeof v === "number" && isFinite(v) && v > 0 ? v : null;
}

/** Decode a v2 positional message into the normalized objects the handlers expect. */
function seidrDecodeV2(arr: any): { kind: string; payload: any; draw?: any } | null {
	if (!Array.isArray(arr) || typeof arr[0] !== "number") return null;
	if (arr[0] === 0) {
		return { kind: "hello", payload: { t: "hello", ver: arr[2], proto: typeof arr[1] === "number" ? arr[1] : 2, want: !!arr[3] } };
	}
	if (arr[0] === 1) {
		var hub = seidrMember(arr[1]);
		if (hub == null) return null;
		var out: any = {
			kind: "state",
			payload: { t: "state", hub: hub, left: seidrMember(arr[2]), right: seidrMember(arr[3]), cuddle: seidrMember(arr[4]) },
		};
		if (arr.length >= 13) {
			var n: number[] = [];
			for (var i = 5; i < 13; i++) {
				var num: any = arr[i];
				if (typeof num !== "number" || !isFinite(num)) return out;
				n.push(num);
			}
			out.draw = {
				t: "drawSync",
				hub: hub,
				left: { x: n[0], y: n[1] },
				right: { x: n[2], y: n[3] },
				cuddle: { x: n[4], y: n[5] },
				hubPose: { x: n[6], y: n[7] },
			};
		}
		return out;
	}
	if (arr[0] === 2) {
		var m = seidrMember(arr[1]);
		return m == null ? null : { kind: "leaveClear", payload: { t: "leaveClear", member: m } };
	}
	return null;
}

function seidrDispatch(from: number | null, kind: string, payload: any, draw?: any) {
	if (kind === "hello") seidrOnHello(from, payload);
	else if (kind === "state") {
		seidrOnState(payload, from);
		if (draw) seidrOnDrawSync(from, draw);
	} else if (kind === "drawSync") seidrOnDrawSync(from, payload);
	else if (kind === "leaveClear") seidrOnLeaveClear(payload, from);
	else if (kind === "syncRequest") seidrOnSyncRequest(from);
}

Seidr.installNet = function () {
	Seidr.publishHub = function (hubMember) { seidrPublishHub(hubMember); };
	Seidr.publishChanged = seidrPublishChanged;
	Seidr.publishDrawSync = function (hubMember, target) { seidrPublishDrawSync(hubMember, target); };
	Seidr.hello = function (reply, target) { seidrHello(reply, target); };
	Seidr.syncRequest = function (target) { seidrSyncRequest(target); };
	Seidr.flushNet = seidrFlushQueue;

	var prevSetHubs = Seidr.setHubs;
	Seidr.setHubs = function (hubs) {
		prevSetHubs(hubs);
		seidrReconcileGrace();
		if (typeof Seidr.pruneDrawSyncOverlays === "function") {
			try { Seidr.pruneDrawSyncOverlays(); } catch (e) { /* ignore */ }
		}
	};

	Seidr.hookFunction("ChatRoomMessage", 5, function (args, next) {
		var data = args && args[0];
		try {
			if (data && data.Type === "Hidden" && data.Content === Seidr.HIDDEN) {
				var from = typeof data.Sender === "number" ? data.Sender : null;
				var s2 = seidrMyProto() >= 2 ? Seidr.dictValue(data.Dictionary, "S") : null;
				if (s2) {
					var dec = seidrDecodeV2(s2);
					if (dec) seidrDispatch(from, dec.kind, dec.payload, dec.draw);
				} else {
					var payload = seidrPayload(data);
					if (payload && typeof payload.t === "string") seidrDispatch(from, payload.t, payload);
				}
			} else if (data && data.Type === "Hidden") {
				seidrYieldOnEchoSync(data);
			} else if (data && data.Type === "Activity") {
				seidrOnActivityMessage(data);
			}
		} catch (e) {
			console.warn("[Seidr] message", e);
		}
		return next(args);
	});

	Seidr.hookFunction("ChatRoomSync", 10, function (args, next) {
		var result = next(args);
		try {
			var present = seidrPresentMap();
			Object.keys(seidrPeers).forEach(function (key) {
				if (!present[key]) delete seidrPeers[key as any];
			});
			seidrPruneRoom();
			// One broadcast hello announces us and asks for state; hub owners answer us directly.
			seidrHello(true);
			seidrPublishOurs();
		} catch (e) { /* ignore */ }
		return result;
	});

	Seidr.hookFunction("ChatRoomSyncMemberJoin", 10, function (args, next) {
		var result = next(args);
		try {
			var data = args && args[0];
			var joiner = data && typeof data.SourceMemberNumber === "number" ? data.SourceMemberNumber : null;
			// The joiner's own hello(want) drives the handshake; only stop the seat-hold timer here.
			if (joiner != null) seidrCancelGrace(joiner);
		} catch (e) { /* ignore */ }
		return result;
	});

	Seidr.tryHook("ChatRoomSyncMemberLeave", "ChatRoomSyncMemberLeave", 10, function (args, next) {
		var result = next(args);
		try {
			var data = args && args[0];
			var left = data && typeof data.SourceMemberNumber === "number" ? data.SourceMemberNumber : null;
			if (left != null) delete seidrPeers[left];
			if (left != null && seidrNatural) delete seidrNatural[left];
			if (left != null) seidrStartGrace(left);
			seidrPruneRoom();
		} catch (e) { /* ignore */ }
		return result;
	});

	Seidr.tryHook("ChatRoomLeave", "ChatRoomLeave", 5, function (args, next) {
		try { seidrPublishLeaveClear(); } catch (e) { /* ignore */ }
		try { seidrFlushQueue(); } catch (e2) { /* ignore */ }
		seidrClearAllGrace();
		seidrPeers = {};
		seidrLastBroadcast = {};
		Seidr.setHubs({});
		if (typeof Seidr.clearDrawSyncOverlays === "function") {
			try { Seidr.clearDrawSyncOverlays(); } catch (e) { /* ignore */ }
		}
		Object.keys(seidrNatural).forEach(function (key) {
			delete seidrNatural[Number(key)];
		});
		return next(args);
	});
};

/** Test hooks: inbound validation without Club chat, protocol override, queue flush. */
Seidr._net = Seidr._net || {};
Seidr._net.onDrawSync = seidrOnDrawSync;
Seidr._net.publishDrawSync = seidrPublishDrawSync;
Seidr._net.onState = seidrOnState;
Seidr._net.decodeV2 = seidrDecodeV2;
Seidr._net.flush = seidrFlushQueue;
Seidr._net.peers = function () { return JSON.parse(JSON.stringify(seidrPeers)); };
/** Pretend to be an older client: announce proto n and ignore v2 input (Testbench mixed-proto case). */
Seidr._net.setProto = function (n: number | null) { seidrForceProto = typeof n === "number" ? n : null; };
