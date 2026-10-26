/** Persist Commands bag inside Seidr settings */
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import {
	SEIDR_CMD_ACTIONS_MAX,
	SEIDR_CMD_PEOPLE_MAX,
	seidrDefaultCmdAction,
	seidrDefaultCmdPerson,
	seidrNormalizeCmdAction,
	seidrNormalizeCmdPerson,
	seidrNormalizeCommandsBag,
	type SeidrCmdAction,
	type SeidrCmdPerson,
	type SeidrCommandsBag,
} from "./model";

export function seidrGetCommandsBag(): SeidrCommandsBag {
	const s = seidrGetSettings() as { commands?: unknown };
	return seidrNormalizeCommandsBag(s.commands);
}

export function seidrSaveCommandsBag(bag: SeidrCommandsBag): { ok: boolean; error?: string } {
	const normalized = seidrNormalizeCommandsBag(bag);
	return seidrSaveSettings({ commands: normalized } as any);
}

export function seidrListCmdPeople(): SeidrCmdPerson[] {
	return seidrGetCommandsBag().people.slice();
}

export function seidrListCmdActions(): SeidrCmdAction[] {
	return seidrGetCommandsBag().actions.slice();
}

export function seidrUpsertCmdPerson(person: SeidrCmdPerson): { ok: boolean; error?: string; person?: SeidrCmdPerson } {
	const norm = seidrNormalizeCmdPerson(person);
	if (!norm || !norm.alias || norm.memberNumber <= 0) {
		return { ok: false, error: "Need alias and MemberNumber" };
	}
	const bag = seidrGetCommandsBag();
	const aliasKey = norm.alias.toLowerCase();
	for (let i = 0; i < bag.people.length; i++) {
		const p = bag.people[i];
		if (p.id === norm.id) continue;
		if (p.alias.toLowerCase() === aliasKey) return { ok: false, error: "Alias already used" };
		if (p.memberNumber === norm.memberNumber) return { ok: false, error: "Member already registered" };
	}
	let found = false;
	for (let i = 0; i < bag.people.length; i++) {
		if (bag.people[i].id === norm.id) {
			bag.people[i] = norm;
			found = true;
			break;
		}
	}
	if (!found) {
		if (bag.people.length >= SEIDR_CMD_PEOPLE_MAX) return { ok: false, error: "People limit reached" };
		if (norm.id < 1) {
			norm.id = bag.nextPersonId;
			bag.nextPersonId = norm.id + 1;
		} else if (norm.id >= bag.nextPersonId) {
			bag.nextPersonId = norm.id + 1;
		}
		bag.people.push(norm);
	}
	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
	return { ok: true, person: norm };
}

export function seidrDeleteCmdPerson(id: number): { ok: boolean; error?: string } {
	const bag = seidrGetCommandsBag();
	bag.people = bag.people.filter(function (p) { return p.id !== id; });
	return seidrSaveCommandsBag(bag);
}

export function seidrAddCmdPerson(): SeidrCmdPerson | null {
	const bag = seidrGetCommandsBag();
	if (bag.people.length >= SEIDR_CMD_PEOPLE_MAX) return null;
	const p = seidrDefaultCmdPerson(bag.nextPersonId);
	bag.nextPersonId = p.id + 1;
	p.alias = "person" + p.id;
	p.memberNumber = 0;
	bag.people.push(p);
	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) {
		seidrDeleteCmdPerson(p.id);
		return null;
	}
	return p;
}

export function seidrUpsertCmdAction(action: SeidrCmdAction): { ok: boolean; error?: string; action?: SeidrCmdAction } {
	const norm = seidrNormalizeCmdAction(action);
	if (!norm || !norm.name || !norm.slot || !norm.activity) {
		return { ok: false, error: "Need name, slot, and activity" };
	}
	const bag = seidrGetCommandsBag();
	const nameKey = norm.name.toLowerCase();
	for (let i = 0; i < bag.actions.length; i++) {
		const a = bag.actions[i];
		if (a.id === norm.id) continue;
		if (a.name.toLowerCase() === nameKey) return { ok: false, error: "Action name already used" };
	}
	let found = false;
	for (let i = 0; i < bag.actions.length; i++) {
		if (bag.actions[i].id === norm.id) {
			bag.actions[i] = norm;
			found = true;
			break;
		}
	}
	if (!found) {
		if (bag.actions.length >= SEIDR_CMD_ACTIONS_MAX) return { ok: false, error: "Action limit reached" };
		if (norm.id < 1) {
			norm.id = bag.nextActionId;
			bag.nextActionId = norm.id + 1;
		} else if (norm.id >= bag.nextActionId) {
			bag.nextActionId = norm.id + 1;
		}
		bag.actions.push(norm);
	}
	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
	return { ok: true, action: norm };
}

export function seidrDeleteCmdAction(id: number): { ok: boolean; error?: string } {
	const bag = seidrGetCommandsBag();
	bag.actions = bag.actions.filter(function (a) { return a.id !== id; });
	return seidrSaveCommandsBag(bag);
}

export function seidrAddCmdAction(): SeidrCmdAction | null {
	const bag = seidrGetCommandsBag();
	if (bag.actions.length >= SEIDR_CMD_ACTIONS_MAX) return null;
	const a = seidrDefaultCmdAction(bag.nextActionId);
	bag.nextActionId = a.id + 1;
	a.name = "action" + a.id;
	bag.actions.push(a);
	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) {
		seidrDeleteCmdAction(a.id);
		return null;
	}
	return a;
}

export function seidrFindCmdActionByName(name: string): SeidrCmdAction | null {
	const key = String(name || "").trim().toLowerCase();
	if (!key) return null;
	const list = seidrListCmdActions();
	for (let i = 0; i < list.length; i++) {
		if (list[i].name.toLowerCase() === key) return list[i];
	}
	return null;
}

export function seidrFindCmdPersonByAlias(alias: string): SeidrCmdPerson | null {
	const key = String(alias || "").trim().toLowerCase();
	if (!key) return null;
	const list = seidrListCmdPeople();
	for (let i = 0; i < list.length; i++) {
		if (list[i].alias.toLowerCase() === key) return list[i];
	}
	return null;
}

export function seidrFindCmdPersonByMember(mn: number): SeidrCmdPerson | null {
	const list = seidrListCmdPeople();
	for (let i = 0; i < list.length; i++) {
		if (list[i].memberNumber === mn) return list[i];
	}
	return null;
}
