/** Hidden Seidr sync. */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrPresentMap, seidrYieldOnEchoSync } from "./room";
import { seidrNatural } from "./draw";

/** Void-disconnect seat hold before automatic prune (ms). */
var SEIDR_GRACE_MS = 45000;

var seidrPeers = {};

/** Soft-gone members: hold hub seats until rejoin or timer. */
var seidrPendingGone: Record<number, { hub: number; until: number; timer: ReturnType<typeof setTimeout> }> = {};

function seidrSend(payload: any, target?: number) {
	if (typeof ServerSend !== "function") return;
	var msg: any = {
		Content: Seidr.HIDDEN,
		Type: "Hidden",
		Dictionary: [{ Seidr: payload }],
	};
	if (typeof target === "number") msg.Target = target;
	try {
		ServerSend("ChatRoomChat", msg);
	} catch (e) { /* ignore */ }
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

function seidrPublishHub(hubMember: number, target?: number) {
	if (typeof hubMember !== "number") return;
	var hubs = Seidr.getHubs();
	var hub = hubs[hubMember];
	seidrSend({
		t: "state",
		v: 1,
		hub: hubMember,
		left: hub ? hub.left : null,
		right: hub ? hub.right : null,
		cuddle: hub ? hub.cuddle : null,
	}, target);
}

function seidrPublishOurs(target?: number) {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var cluster = SeidrState.clusterOf(Seidr.getHubs(), Player.MemberNumber);
	if (!cluster) return;
	seidrPublishHub(cluster.hub, target);
}

/** Publish hubs that involve joiner (grace restore / targeted sync). */
function seidrPublishRelevant(joiner: number, target?: number) {
	if (typeof joiner !== "number") return;
	var dest = typeof target === "number" ? target : joiner;
	var hubs = Seidr.getHubs();
	Object.keys(hubs).forEach(function (key) {
		var hubN = Number(key);
		var h = hubs[hubN];
		if (!h) return;
		if (hubN === joiner || h.left === joiner || h.right === joiner || h.cuddle === joiner) {
			seidrPublishHub(hubN, dest);
		}
	});
	seidrPublishOurs(dest);
}

function seidrHello(reply?: boolean, target?: number) {
	seidrSend({ t: "hello", v: 1, ver: Seidr.VERSION, reply: !!reply }, target);
}

function seidrSyncRequest(target?: number) {
	seidrSend({ t: "syncRequest", v: 1 }, target);
}

/** Reply with hubs we own or that list the requester. */
function seidrOnSyncRequest(from: number | null) {
	if (typeof from !== "number") return;
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var me = Player.MemberNumber;
	var hubs = Seidr.getHubs();
	var published: Record<number, boolean> = {};
	function pub(hubN: number) {
		if (published[hubN]) return;
		published[hubN] = true;
		seidrPublishHub(hubN, from);
	}
	if (hubs[me]) pub(me);
	var cluster = SeidrState.clusterOf(hubs, me);
	if (cluster) pub(cluster.hub);
	Object.keys(hubs).forEach(function (key) {
		var hubN = Number(key);
		var h = hubs[hubN];
		if (!h) return;
		if (hubN === from || h.left === from || h.right === from || h.cuddle === from) pub(hubN);
	});
}

Seidr.peerHas = function (member) {
	return !!(seidrPeers && seidrPeers[member]);
};

function seidrOnHello(from, payload) {
	if (typeof from !== "number") return;
	seidrPeers[from] = { at: Date.now(), ver: payload && (payload.ver || payload.v) };
	if (payload && payload.reply) {
		seidrHello(false, from);
		seidrPublishOurs(from);
		seidrPublishRelevant(from, from);
	}
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
}

function seidrOnState(payload) {
	if (!payload || typeof payload.hub !== "number") return;
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

/** Tell the room our hold is gone before we leave, so both parties snap back. */
function seidrPublishLeaveClear() {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	var me = Player.MemberNumber;
	var hubs = Seidr.getHubs();
	var cluster = SeidrState.clusterOf(hubs, me);
	if (!cluster) {
		seidrSend({ t: "leaveClear", v: 1, member: me });
		return;
	}
	seidrSend({ t: "leaveClear", v: 1, member: me });
	if (cluster.hub === me) {
		Seidr.setHubs(SeidrState.replaceHub(hubs, me, { left: null, right: null, cuddle: null }));
		seidrPublishHub(me);
		return;
	}
	var next = SeidrState.removeRelation(hubs, me, cluster.hub);
	Seidr.setHubs(next);
	seidrPublishHub(cluster.hub);
}

Seidr.installNet = function () {
	Seidr.publishHub = function (hubMember) { seidrPublishHub(hubMember); };
	Seidr.publishChanged = seidrPublishChanged;
	Seidr.hello = function (reply, target) { seidrHello(reply, target); };
	Seidr.syncRequest = function (target) { seidrSyncRequest(target); };

	var prevSetHubs = Seidr.setHubs;
	Seidr.setHubs = function (hubs) {
		prevSetHubs(hubs);
		seidrReconcileGrace();
	};

	Seidr.hookFunction("ChatRoomMessage", 5, function (args, next) {
		var data = args && args[0];
		try {
			if (data && data.Type === "Hidden" && data.Content === Seidr.HIDDEN) {
				var payload = seidrPayload(data);
				var from = typeof data.Sender === "number" ? data.Sender : null;
				if (payload && payload.t === "hello") seidrOnHello(from, payload);
				else if (payload && payload.t === "state") seidrOnState(payload);
				else if (payload && payload.t === "leaveClear") seidrOnLeaveClear(payload, from);
				else if (payload && payload.t === "syncRequest") seidrOnSyncRequest(from);
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
				if (!present[key]) delete seidrPeers[key];
			});
			seidrPruneRoom();
			seidrHello(true);
			seidrSyncRequest();
			seidrPublishOurs();
		} catch (e) { /* ignore */ }
		return result;
	});

	Seidr.hookFunction("ChatRoomSyncMemberJoin", 10, function (args, next) {
		var result = next(args);
		try {
			var data = args && args[0];
			var joiner = data && typeof data.SourceMemberNumber === "number" ? data.SourceMemberNumber : null;
			if (joiner != null) {
				seidrCancelGrace(joiner);
				seidrHello(true, joiner);
				seidrPublishRelevant(joiner, joiner);
			}
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
		seidrClearAllGrace();
		seidrPeers = {};
		Seidr.setHubs({});
		Object.keys(seidrNatural).forEach(function (key) {
			delete seidrNatural[Number(key)];
		});
		return next(args);
	});
};
