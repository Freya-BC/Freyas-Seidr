/**
 * Pure hub slots for Seidr. One person can hold a left, a right, and a cuddle.
 * A member is only ever in one slot, and a held person is not also a hub.
 */

const SLOTS = ["left", "right", "cuddle"] as const;

type Slot = (typeof SLOTS)[number];

function num(value: unknown): number | null {
	if (typeof value === "number" && isFinite(value)) return value;
	if (typeof value === "string" && value !== "" && isFinite(Number(value))) return Number(value);
	return null;
}

function emptyHub() {
	return { left: null as number | null, right: null as number | null, cuddle: null as number | null };
}

function isEmpty(hub: { left?: number | null; right?: number | null; cuddle?: number | null } | null) {
	return !hub || (hub.left == null && hub.right == null && hub.cuddle == null);
}

function cloneHubs(hubs: Record<string, any> | null) {
	const out: Record<number, ReturnType<typeof emptyHub>> = {};
	if (!hubs) return out;
	Object.keys(hubs).forEach(function (key) {
		const hubN = num(key);
		const hub = hubs[key];
		if (hubN == null || !hub) return;
		out[hubN] = {
			left: num(hub.left),
			right: num(hub.right),
			cuddle: num(hub.cuddle),
		};
	});
	return out;
}

function stripMember(hubs: Record<number, any>, member: number) {
	Object.keys(hubs).forEach(function (key) {
		const hub = hubs[key as any];
		for (let i = 0; i < SLOTS.length; i++) {
			if (hub[SLOTS[i]] === member) hub[SLOTS[i]] = null;
		}
	});
}

function prune(hubs: Record<number, any>) {
	Object.keys(hubs).forEach(function (key) {
		if (isEmpty(hubs[key as any])) delete hubs[key as any];
	});
	return hubs;
}

function applySlot(hubs: any, hubMember: unknown, slot: string, member: unknown) {
	const hubN = num(hubMember);
	const mem = num(member);
	const next = cloneHubs(hubs);
	if (hubN == null || mem == null || hubN === mem || (SLOTS as readonly string[]).indexOf(slot) < 0) {
		return next;
	}
	stripMember(next, mem);
	delete next[mem];
	stripMember(next, hubN);
	if (!next[hubN]) next[hubN] = emptyHub();
	next[hubN][slot as Slot] = mem;
	return prune(next);
}

function removeRelation(hubs: any, actor: unknown, target: unknown) {
	const a = num(actor);
	const t = num(target);
	const next = cloneHubs(hubs);
	if (a == null || t == null || a === t) return next;
	if (next[a]) {
		for (let i = 0; i < SLOTS.length; i++) {
			if (next[a][SLOTS[i]] === t) next[a][SLOTS[i]] = null;
		}
	}
	if (next[t]) {
		for (let j = 0; j < SLOTS.length; j++) {
			if (next[t][SLOTS[j]] === a) next[t][SLOTS[j]] = null;
		}
	}
	return prune(next);
}

function relation(hubs: any, actor: unknown, target: unknown) {
	const a = num(actor);
	const t = num(target);
	if (a == null || t == null || !hubs) return null;
	const mine = hubs[a];
	if (mine) {
		for (let i = 0; i < SLOTS.length; i++) {
			if (mine[SLOTS[i]] === t) return { slot: SLOTS[i], role: "hub" as const };
		}
	}
	const theirs = hubs[t];
	if (theirs) {
		for (let j = 0; j < SLOTS.length; j++) {
			if (theirs[SLOTS[j]] === a) return { slot: SLOTS[j], role: "satellite" as const };
		}
	}
	return null;
}

function occupant(hubs: any, hubMember: unknown, slot: string) {
	const hubN = num(hubMember);
	if (hubN == null || !hubs || (SLOTS as readonly string[]).indexOf(slot) < 0) return null;
	const hub = hubs[hubN];
	if (!hub) return null;
	return num(hub[slot]);
}

function clusterOf(hubs: any, member: unknown) {
	const m = num(member);
	if (m == null || !hubs) return null;
	if (hubs[m] && !isEmpty(hubs[m])) {
		return {
			hub: m,
			left: num(hubs[m].left),
			right: num(hubs[m].right),
			cuddle: num(hubs[m].cuddle),
		};
	}
	const keys = Object.keys(hubs);
	for (let i = 0; i < keys.length; i++) {
		const hub = hubs[keys[i]];
		for (let s = 0; s < SLOTS.length; s++) {
			if (hub[SLOTS[s]] === m) {
				return {
					hub: num(keys[i]),
					left: num(hub.left),
					right: num(hub.right),
					cuddle: num(hub.cuddle),
				};
			}
		}
	}
	return null;
}

function replaceHub(hubs: any, hubMember: unknown, raw: any) {
	const hubN = num(hubMember);
	const next = cloneHubs(hubs);
	if (hubN == null) return next;
	const hub = emptyHub();
	if (raw && typeof raw === "object") {
		hub.left = num(raw.left);
		hub.right = num(raw.right);
		hub.cuddle = num(raw.cuddle);
	}
	if (hub.left === hubN) hub.left = null;
	if (hub.right === hubN) hub.right = null;
	if (hub.cuddle === hubN) hub.cuddle = null;
	if (isEmpty(hub)) {
		delete next[hubN];
		return prune(next);
	}
	for (let i = 0; i < SLOTS.length; i++) {
		const held = hub[SLOTS[i]];
		if (held == null) continue;
		stripMember(next, held);
		delete next[held];
	}
	stripMember(next, hubN);
	if (isEmpty(hub)) delete next[hubN];
	else next[hubN] = hub;
	return prune(next);
}

function pruneMissing(hubs: any, present: Record<number, boolean>) {
	const next = cloneHubs(hubs);
	Object.keys(next).forEach(function (key) {
		const hubN = num(key);
		if (hubN == null || !present || !present[hubN]) {
			delete next[key as any];
			return;
		}
		const hub = next[key as any];
		for (let i = 0; i < SLOTS.length; i++) {
			const held = hub[SLOTS[i]];
			if (held != null && !present[held]) hub[SLOTS[i]] = null;
		}
	});
	return prune(next);
}

function canPlace(hubs: any, actor: unknown, target: unknown, slot: string) {
	const a = num(actor);
	const t = num(target);
	if (a == null || t == null || a === t || (SLOTS as readonly string[]).indexOf(slot) < 0) return false;
	if (relation(hubs, a, t)) return false;
	if (clusterOf(hubs, t)) return false;
	const mine = clusterOf(hubs, a);
	if (mine && mine.hub !== a) return false;
	if (mine && mine.hub === a && mine[slot as Slot] != null) return false;
	return true;
}

function canRemove(hubs: any, actor: unknown, target: unknown) {
	const a = num(actor);
	const t = num(target);
	if (a == null || t == null) return false;
	if (a === t) {
		const self = clusterOf(hubs, a);
		return !!(self && self.hub !== a);
	}
	const rel = relation(hubs, a, t);
	return !!(rel && rel.role === "satellite");
}

function canRemoveSlot(hubs: any, actor: unknown, target: unknown, slot: string) {
	const a = num(actor);
	const t = num(target);
	if (a == null || t == null || (SLOTS as readonly string[]).indexOf(slot) < 0) return false;
	const held = occupant(hubs, a, slot);
	if (held == null) return false;
	return t === a || t === held;
}

function clearSlot(hubs: any, hubMember: unknown, slot: string) {
	const hubN = num(hubMember);
	const next = cloneHubs(hubs);
	if (hubN == null || (SLOTS as readonly string[]).indexOf(slot) < 0 || !next[hubN]) return next;
	next[hubN][slot as Slot] = null;
	return prune(next);
}

function leaveSelf(hubs: any, member: unknown) {
	const m = num(member);
	const next = cloneHubs(hubs);
	if (m == null) return next;
	const cluster = clusterOf(next, m);
	if (!cluster || cluster.hub === m) return next;
	return removeRelation(next, m, cluster.hub);
}

function releaseMember(hubs: any, member: unknown) {
	const m = num(member);
	const next = cloneHubs(hubs);
	if (m == null) return next;
	const cluster = clusterOf(next, m);
	if (!cluster) return next;
	if (cluster.hub === m) {
		delete next[m];
		return prune(next);
	}
	return removeRelation(next, m, cluster.hub);
}

function affectedHub(hubs: any, actor: unknown, target: unknown, activityName: string) {
	const a = num(actor);
	const t = num(target);
	if (activityName === "Seidr_Remove" || (activityName && activityName.indexOf("Seidr_Remove") === 0)) {
		if (a != null && a === t) {
			const selfCluster = clusterOf(hubs, a);
			return selfCluster ? selfCluster.hub : a;
		}
		const rel = relation(hubs, a, t);
		if (rel && rel.role === "satellite") return t;
	}
	return a;
}

export const SeidrState = {
	SLOTS: SLOTS as unknown as string[],
	emptyHub,
	cloneHubs,
	applySlot,
	removeRelation,
	relation,
	occupant,
	clusterOf,
	replaceHub,
	pruneMissing,
	canPlace,
	canRemove,
	canRemoveSlot,
	clearSlot,
	leaveSelf,
	releaseMember,
	affectedHub,
};

(window as any).SeidrState = SeidrState;
