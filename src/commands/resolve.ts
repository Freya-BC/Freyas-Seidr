/** Resolve member token → Character; action name → binding */
import {
	seidrCmdFindCharacter,
	seidrCmdRoomPeople,
	type SeidrCmdRoomPerson,
} from "./catalog";
import { seidrFindCmdActionByName, seidrFindCmdPersonByAlias, seidrFindCmdPersonByMember } from "./store";
import type { SeidrCmdAction } from "./model";

export type SeidrCmdResolveMember =
	| { ok: true; character: any; memberNumber: number; via: string }
	| { ok: false; error: string };

export type SeidrCmdResolveAction =
	| { ok: true; action: SeidrCmdAction }
	| { ok: false; error: string };

function norm(s: string): string {
	return String(s || "").trim().toLowerCase();
}

/**
 * Resolve member: MemberNumber, registry alias, then room Name/Nickname.
 * Duplicate Name/Nickname without a registry entry → refuse.
 */
export function seidrCmdResolveMember(token: string): SeidrCmdResolveMember {
	const raw = String(token || "").trim();
	if (!raw) return { ok: false, error: "Missing member" };

	const asNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
	if (Number.isFinite(asNum) && asNum > 0) {
		const C = seidrCmdFindCharacter(asNum);
		if (!C) return { ok: false, error: "Member #" + asNum + " is not in this room" };
		return { ok: true, character: C, memberNumber: asNum, via: "id" };
	}

	const registered = seidrFindCmdPersonByAlias(raw);
	if (registered) {
		const C = seidrCmdFindCharacter(registered.memberNumber);
		if (!C) {
			return {
				ok: false,
				error: "Registered \"" + registered.alias + "\" (#" + registered.memberNumber + ") is not in this room",
			};
		}
		return { ok: true, character: C, memberNumber: registered.memberNumber, via: "registry" };
	}

	const people = seidrCmdRoomPeople();
	const key = norm(raw);
	const hits: SeidrCmdRoomPerson[] = [];
	for (let i = 0; i < people.length; i++) {
		const p = people[i];
		if (norm(p.nickname) === key || norm(p.name) === key) hits.push(p);
	}

	if (hits.length === 0) {
		return { ok: false, error: "No one matching \"" + raw + "\" in this room" };
	}

	if (hits.length === 1) {
		const C = seidrCmdFindCharacter(hits[0].memberNumber);
		if (!C) return { ok: false, error: "Member not in room" };
		return { ok: true, character: C, memberNumber: hits[0].memberNumber, via: "room" };
	}

	// Ambiguous — only OK if every hit maps to the same registered person (impossible) or
	// each distinct MN is registered under this exact alias (already handled). Refuse.
	const registeredHits = hits.filter(function (h) {
		return !!seidrFindCmdPersonByMember(h.memberNumber);
	});
	if (registeredHits.length === 1) {
		const C = seidrCmdFindCharacter(registeredHits[0].memberNumber);
		if (!C) return { ok: false, error: "Member not in room" };
		return {
			ok: true,
			character: C,
			memberNumber: registeredHits[0].memberNumber,
			via: "registry-disambiguate",
		};
	}

	return {
		ok: false,
		error: "Ambiguous name \"" + raw + "\" (" + hits.length +
			" people). Register an alias under Settings → Commands → People, or use MemberNumber / quotes.",
	};
}

export function seidrCmdResolveAction(token: string): SeidrCmdResolveAction {
	const a = seidrFindCmdActionByName(token);
	if (!a) {
		return { ok: false, error: "Unknown action \"" + String(token || "").trim() + "\". Define it under Settings → Commands → Actions." };
	}
	return { ok: true, action: a };
}

/** Filter room people for autocomplete prefix (alias + name + nick + id). */
export function seidrCmdFilterPeople(prefix: string): SeidrCmdRoomPerson[] {
	const pfx = norm(prefix);
	const room = seidrCmdRoomPeople();
	// Prefer registered alias label when present
	const enriched = room.map(function (r) {
		const reg = seidrFindCmdPersonByMember(r.memberNumber);
		if (!reg) return r;
		return {
			memberNumber: r.memberNumber,
			name: r.name,
			nickname: r.nickname,
			label: reg.alias + " → " + r.label,
			search: (reg.alias + " " + r.search).toLowerCase(),
		};
	});
	if (!pfx) return enriched;
	return enriched.filter(function (r) {
		return r.search.indexOf(pfx) >= 0 || String(r.memberNumber).indexOf(pfx) === 0;
	});
}
