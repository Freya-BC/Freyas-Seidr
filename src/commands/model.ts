/** Seidr chat Commands — people aliases + slash action bindings */

export const SEIDR_CMD_PEOPLE_MAX = 50;
export const SEIDR_CMD_ACTIONS_MAX = 50;
export const SEIDR_CMD_ALIAS_MAX = 48;
export const SEIDR_CMD_NAME_MAX = 48;
export const SEIDR_CMD_WARN_MS = 8000;
export const SEIDR_CMD_ERROR_MS = 30000;

export type SeidrCmdPerson = {
	id: number;
	/** Short alias used in /a <alias> … (and preferred when room names collide). */
	alias: string;
	memberNumber: number;
};

export type SeidrCmdAction = {
	id: number;
	/** Slash token / autocomplete name (case-insensitive match). */
	name: string;
	/** Club AssetGroup.Name (Item*). */
	slot: string;
	/** ActivityFemale3DCG.Name (Seidr / Club / mod). */
	activity: string;
};

export type SeidrCommandsBag = {
	nextPersonId: number;
	nextActionId: number;
	people: SeidrCmdPerson[];
	actions: SeidrCmdAction[];
};

export function seidrDefaultCommandsBag(): SeidrCommandsBag {
	return { nextPersonId: 1, nextActionId: 1, people: [], actions: [] };
}

function cleanAlias(raw: unknown): string {
	return String(raw || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_CMD_ALIAS_MAX);
}

function cleanName(raw: unknown): string {
	return String(raw || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_CMD_NAME_MAX);
}

export function seidrNormalizeCmdPerson(raw: unknown): SeidrCmdPerson | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrCmdPerson>;
	const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : 0;
	const alias = cleanAlias(d.alias);
	const mn = typeof d.memberNumber === "number" ? Math.floor(d.memberNumber)
		: (typeof d.memberNumber === "string" ? parseInt(d.memberNumber, 10) : NaN);
	if (!id || !alias || !Number.isFinite(mn) || mn < 0) return null;
	return { id: id, alias: alias, memberNumber: mn };
}

export function seidrNormalizeCmdAction(raw: unknown): SeidrCmdAction | null {
	if (!raw || typeof raw !== "object") return null;
	const d = raw as Partial<SeidrCmdAction>;
	const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : 0;
	const name = cleanName(d.name);
	const slot = String(d.slot || "").trim();
	const activity = String(d.activity || "").trim();
	// activity may be "" while drafting in Settings (Save still requires it).
	if (!id || !name || !slot) return null;
	return { id: id, name: name, slot: slot, activity: activity };
}

export function seidrNormalizeCommandsBag(raw: unknown): SeidrCommandsBag {
	const base = seidrDefaultCommandsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrCommandsBag>;
	const people: SeidrCmdPerson[] = [];
	const seenAlias: Record<string, boolean> = {};
	const seenMn: Record<number, boolean> = {};
	if (Array.isArray(d.people)) {
		for (let i = 0; i < d.people.length && people.length < SEIDR_CMD_PEOPLE_MAX; i++) {
			const p = seidrNormalizeCmdPerson(d.people[i]);
			if (!p) continue;
			const key = p.alias.toLowerCase();
			if (seenAlias[key]) continue;
			// Drafts may share memberNumber 0 — only dedupe real IDs.
			if (p.memberNumber > 0 && seenMn[p.memberNumber]) continue;
			seenAlias[key] = true;
			if (p.memberNumber > 0) seenMn[p.memberNumber] = true;
			people.push(p);
			if (p.id >= base.nextPersonId) base.nextPersonId = p.id + 1;
		}
	}
	const actions: SeidrCmdAction[] = [];
	const seenAct: Record<string, boolean> = {};
	if (Array.isArray(d.actions)) {
		for (let i = 0; i < d.actions.length && actions.length < SEIDR_CMD_ACTIONS_MAX; i++) {
			const a = seidrNormalizeCmdAction(d.actions[i]);
			if (!a) continue;
			const key = a.name.toLowerCase();
			if (seenAct[key]) continue;
			seenAct[key] = true;
			actions.push(a);
			if (a.id >= base.nextActionId) base.nextActionId = a.id + 1;
		}
	}
	if (typeof d.nextPersonId === "number" && d.nextPersonId > base.nextPersonId) {
		base.nextPersonId = Math.floor(d.nextPersonId);
	}
	if (typeof d.nextActionId === "number" && d.nextActionId > base.nextActionId) {
		base.nextActionId = Math.floor(d.nextActionId);
	}
	base.people = people;
	base.actions = actions;
	return base;
}

export function seidrDefaultCmdPerson(id: number): SeidrCmdPerson {
	return { id: id, alias: "", memberNumber: 0 };
}

export function seidrDefaultCmdAction(id: number): SeidrCmdAction {
	return { id: id, name: "", slot: "ItemTorso", activity: "" };
}
