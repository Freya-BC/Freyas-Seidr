/** Persist Commands bag inside Seidr settings */
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import type { SeidrImportMode } from "../io/importCompare";
import { seidrUniqueImportName } from "../io/importCompare";
import {
	SEIDR_CMD_ACTIONS_MAX,
	SEIDR_CMD_ALIAS_MAX,
	SEIDR_CMD_NAME_MAX,
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

/** Club /whisper Tab AC (default on). */
export function seidrCmdAcWhisperEnabled(): boolean {
	return seidrGetCommandsBag().acWhisper !== false;
}

/** Club /beep Tab AC (default on). */
export function seidrCmdAcBeepEnabled(): boolean {
	return seidrGetCommandsBag().acBeep !== false;
}

/** Club chat hover Reply on beeps (default on). Does not gate FBM float ↩. */
export function seidrCmdBeepReplyEnabled(): boolean {
	return seidrGetCommandsBag().beepReply !== false;
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

export type SeidrCmdPersonImportRow = {
	person: SeidrCmdPerson;
	mode: SeidrImportMode;
	localId?: number | null;
};

export type SeidrCmdActionImportRow = {
	action: SeidrCmdAction;
	mode: SeidrImportMode;
	localId?: number | null;
};

/** Import command people with per-row add / overwrite. Member collisions on add → skip. */
export function seidrImportSelectedCmdPeople(
	rows: SeidrCmdPersonImportRow[],
): { ok: boolean; imported: number; skipped: number; overwritten: number; error?: string } {
	const bag = seidrGetCommandsBag();
	let imported = 0;
	let skipped = 0;
	let overwritten = 0;
	const list = Array.isArray(rows) ? rows : [];

	const takenAlias = new Set<string>();
	const takenMember = new Set<number>();
	for (let i = 0; i < bag.people.length; i++) {
		takenAlias.add(bag.people[i].alias.toLowerCase());
		takenMember.add(bag.people[i].memberNumber);
	}

	for (let i = 0; i < list.length; i++) {
		const row = list[i];
		const mode = row.mode === "overwrite" ? "overwrite" : "add";
		const localId = row.localId != null && row.localId > 0 ? row.localId : null;

		if (mode === "overwrite" && localId != null) {
			const existing = bag.people.find(function (p) { return p.id === localId; });
			if (!existing) {
				skipped += 1;
				continue;
			}
			const norm = seidrNormalizeCmdPerson(Object.assign({}, row.person, { id: localId }));
			if (!norm || !norm.alias || norm.memberNumber <= 0) {
				skipped += 1;
				continue;
			}
			takenAlias.delete(existing.alias.toLowerCase());
			takenMember.delete(existing.memberNumber);
			const aliasClash = bag.people.some(function (p) {
				return p.id !== localId && p.alias.toLowerCase() === norm.alias.toLowerCase();
			});
			if (aliasClash) {
				norm.alias = seidrUniqueImportName(norm.alias, takenAlias, SEIDR_CMD_ALIAS_MAX);
			}
			const memberClash = bag.people.some(function (p) {
				return p.id !== localId && p.memberNumber === norm.memberNumber;
			});
			if (memberClash) {
				takenAlias.add(existing.alias.toLowerCase());
				takenMember.add(existing.memberNumber);
				skipped += 1;
				continue;
			}
			takenAlias.add(norm.alias.toLowerCase());
			takenMember.add(norm.memberNumber);
			for (let j = 0; j < bag.people.length; j++) {
				if (bag.people[j].id === localId) {
					bag.people[j] = norm;
					break;
				}
			}
			overwritten += 1;
			continue;
		}

		if (bag.people.length >= SEIDR_CMD_PEOPLE_MAX) {
			skipped += list.length - i;
			break;
		}
		const incoming = row.person || ({} as SeidrCmdPerson);
		const rawAlias = String(incoming.alias || "").trim();
		const mn = typeof incoming.memberNumber === "number" ? Math.floor(incoming.memberNumber) : 0;
		if (!rawAlias || mn <= 0) {
			skipped += 1;
			continue;
		}
		if (takenMember.has(mn)) {
			skipped += 1;
			continue;
		}
		const alias = seidrUniqueImportName(rawAlias, takenAlias, SEIDR_CMD_ALIAS_MAX);
		const id = bag.nextPersonId;
		const norm = seidrNormalizeCmdPerson({ id: id, alias: alias, memberNumber: mn });
		if (!norm) {
			skipped += 1;
			continue;
		}
		bag.people.push(norm);
		bag.nextPersonId = id + 1;
		takenAlias.add(norm.alias.toLowerCase());
		takenMember.add(norm.memberNumber);
		imported += 1;
	}

	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) {
		return {
			ok: false,
			imported: 0,
			skipped: list.length,
			overwritten: 0,
			error: saved.error || "Save failed",
		};
	}
	return { ok: true, imported: imported, skipped: skipped, overwritten: overwritten };
}

/** Import command slash actions with per-row add / overwrite. */
export function seidrImportSelectedCmdActions(
	rows: SeidrCmdActionImportRow[],
): { ok: boolean; imported: number; skipped: number; overwritten: number; error?: string } {
	const bag = seidrGetCommandsBag();
	let imported = 0;
	let skipped = 0;
	let overwritten = 0;
	const list = Array.isArray(rows) ? rows : [];

	const taken = new Set<string>();
	for (let i = 0; i < bag.actions.length; i++) {
		taken.add(bag.actions[i].name.toLowerCase());
	}

	for (let i = 0; i < list.length; i++) {
		const row = list[i];
		const mode = row.mode === "overwrite" ? "overwrite" : "add";
		const localId = row.localId != null && row.localId > 0 ? row.localId : null;

		if (mode === "overwrite" && localId != null) {
			const existing = bag.actions.find(function (a) { return a.id === localId; });
			if (!existing) {
				skipped += 1;
				continue;
			}
			const norm = seidrNormalizeCmdAction(Object.assign({}, row.action, { id: localId }));
			if (!norm || !norm.name || !norm.slot || !norm.activity) {
				skipped += 1;
				continue;
			}
			taken.delete(existing.name.toLowerCase());
			const nameKey = norm.name.toLowerCase();
			const clash = bag.actions.some(function (a) {
				return a.id !== localId && a.name.toLowerCase() === nameKey;
			});
			if (clash) {
				norm.name = seidrUniqueImportName(norm.name, taken, SEIDR_CMD_NAME_MAX);
			}
			taken.add(norm.name.toLowerCase());
			for (let j = 0; j < bag.actions.length; j++) {
				if (bag.actions[j].id === localId) {
					bag.actions[j] = norm;
					break;
				}
			}
			overwritten += 1;
			continue;
		}

		if (bag.actions.length >= SEIDR_CMD_ACTIONS_MAX) {
			skipped += list.length - i;
			break;
		}
		let name = String(row.action.name || "").trim() || "action";
		name = seidrUniqueImportName(name, taken, SEIDR_CMD_NAME_MAX);
		const id = bag.nextActionId;
		const norm = seidrNormalizeCmdAction(Object.assign({}, row.action, { id: id, name: name }));
		if (!norm || !norm.name || !norm.slot || !norm.activity) {
			skipped += 1;
			continue;
		}
		bag.actions.push(norm);
		bag.nextActionId = id + 1;
		taken.add(norm.name.toLowerCase());
		imported += 1;
	}

	const saved = seidrSaveCommandsBag(bag);
	if (!saved.ok) {
		return {
			ok: false,
			imported: 0,
			skipped: list.length,
			overwritten: 0,
			error: saved.error || "Save failed",
		};
	}
	return { ok: true, imported: imported, skipped: skipped, overwritten: overwritten };
}
