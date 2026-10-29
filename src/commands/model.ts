/** Seidr chat Commands — people aliases + slash action bindings + enable flags */

export const SEIDR_CMD_PEOPLE_MAX = 50;
export const SEIDR_CMD_ACTIONS_MAX = 50;
export const SEIDR_CMD_ALIAS_MAX = 48;
export const SEIDR_CMD_NAME_MAX = 48;
export const SEIDR_CMD_WARN_MS = 8000;
export const SEIDR_CMD_ERROR_MS = 30000;

/** Toggle keys in General → Commands (each slash tag has its own switch). */
export type SeidrCmdEnableKey =
	| "a"
	| "action"
	| "strip"
	| "stripe"
	| "poses"
	| "p"
	| "animation"
	| "ani"
	| "seidr"
	| "roommanager";

export const SEIDR_CMD_ENABLE_KEYS: SeidrCmdEnableKey[] = [
	"a", "action", "strip", "stripe", "poses", "p", "animation", "ani", "seidr", "roommanager",
];

export const SEIDR_CMD_ENABLE_LABELS: { key: SeidrCmdEnableKey; label: string }[] = [
	{ key: "a", label: "/a" },
	{ key: "action", label: "/action" },
	{ key: "strip", label: "/strip" },
	{ key: "stripe", label: "/stripe" },
	{ key: "poses", label: "/poses" },
	{ key: "p", label: "/p" },
	{ key: "animation", label: "/animation" },
	{ key: "ani", label: "/ani" },
	{ key: "seidr", label: "/seidr" },
	{ key: "roommanager", label: "/roommanager" },
];

export type SeidrCmdEnabledMap = Record<SeidrCmdEnableKey, boolean>;

/** Empty InputChat + Tab Fast Select target. */
export type SeidrFastSelectEmpty =
	| "disabled"
	| "action"
	| "poses"
	| "animation"
	| "strip";

export const SEIDR_FAST_SELECT_EMPTY_OPTS: { id: SeidrFastSelectEmpty; label: string }[] = [
	{ id: "disabled", label: "Disabled (normal Tab)" },
	{ id: "action", label: "Action (/action)" },
	{ id: "poses", label: "Poses (/poses)" },
	{ id: "animation", label: "Animation (/animation)" },
	{ id: "strip", label: "Strip (/strip)" },
];

/** Letter keys for Fast Select (a/s/d/p + Tab). */
export type SeidrFastSelectKey = "a" | "s" | "d" | "p";

export type SeidrFastSelectKeys = Record<SeidrFastSelectKey, boolean>;

export const SEIDR_FAST_SELECT_KEYS: SeidrFastSelectKey[] = ["a", "s", "d", "p"];

export const SEIDR_FAST_SELECT_KEY_LABELS: { key: SeidrFastSelectKey; label: string }[] = [
	{ key: "a", label: "a + Tab → /action" },
	{ key: "s", label: "s + Tab → /strip" },
	{ key: "d", label: "d + Tab → /animation" },
	{ key: "p", label: "p + Tab → /poses" },
];

export function seidrDefaultFastSelectKeys(): SeidrFastSelectKeys {
	return { a: true, s: true, d: true, p: true };
}

export function seidrNormalizeFastSelectKeys(raw: unknown): SeidrFastSelectKeys {
	const base = seidrDefaultFastSelectKeys();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<Record<string, unknown>>;
	for (let i = 0; i < SEIDR_FAST_SELECT_KEYS.length; i++) {
		const k = SEIDR_FAST_SELECT_KEYS[i];
		if (typeof d[k] === "boolean") base[k] = d[k] as boolean;
	}
	return base;
}

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
	/** Per-command registration / execute gates (default all true). */
	enabled: SeidrCmdEnabledMap;
	/** Dev Fast Select letter+Tab (default true). */
	fastSelectEnabled: boolean;
	/** Per-letter a/s/d/p Fast Select (default all true). */
	fastSelectKeys: SeidrFastSelectKeys;
	/** Empty InputChat + Tab target (default disabled = Club Tab). */
	fastSelectEmpty: SeidrFastSelectEmpty;
};

const FAST_SELECT_EMPTY_IDS: SeidrFastSelectEmpty[] = [
	"disabled", "action", "poses", "animation", "strip",
];

export function seidrNormalizeFastSelectEmpty(raw: unknown): SeidrFastSelectEmpty {
	const s = String(raw || "").trim().toLowerCase() as SeidrFastSelectEmpty;
	if (FAST_SELECT_EMPTY_IDS.indexOf(s) >= 0) return s;
	return "disabled";
}

export function seidrDefaultCmdEnabled(): SeidrCmdEnabledMap {
	const out = {} as SeidrCmdEnabledMap;
	for (let i = 0; i < SEIDR_CMD_ENABLE_KEYS.length; i++) {
		out[SEIDR_CMD_ENABLE_KEYS[i]] = true;
	}
	return out;
}

export function seidrNormalizeCmdEnabled(raw: unknown): SeidrCmdEnabledMap {
	const base = seidrDefaultCmdEnabled();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<Record<string, unknown>>;
	for (let i = 0; i < SEIDR_CMD_ENABLE_KEYS.length; i++) {
		const k = SEIDR_CMD_ENABLE_KEYS[i];
		if (typeof d[k] === "boolean") base[k] = d[k] as boolean;
	}
	return base;
}

/** Map a chat tag (incl. aliases) to its enable key. */
export function seidrCmdEnableKeyForTag(tag: string): SeidrCmdEnableKey | null {
	const t = String(tag || "").toLowerCase();
	if (t === "a") return "a";
	if (t === "action") return "action";
	if (t === "strip") return "strip";
	if (t === "stripe") return "stripe";
	if (t === "poses") return "poses";
	if (t === "p") return "p";
	if (t === "animation") return "animation";
	if (t === "ani") return "ani";
	if (t === "seidr") return "seidr";
	if (t === "roommanager") return "roommanager";
	return null;
}

export function seidrDefaultCommandsBag(): SeidrCommandsBag {
	return {
		nextPersonId: 1,
		nextActionId: 1,
		people: [],
		actions: [],
		enabled: seidrDefaultCmdEnabled(),
		fastSelectEnabled: true,
		fastSelectKeys: seidrDefaultFastSelectKeys(),
		fastSelectEmpty: "disabled",
	};
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
	if (!id || !name || !slot) return null;
	return { id: id, name: name, slot: slot, activity: activity };
}

export function seidrNormalizeCommandsBag(raw: unknown): SeidrCommandsBag {
	const base = seidrDefaultCommandsBag();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrCommandsBag> & { enabled?: unknown };
	const people: SeidrCmdPerson[] = [];
	const seenAlias: Record<string, boolean> = {};
	const seenMn: Record<number, boolean> = {};
	if (Array.isArray(d.people)) {
		for (let i = 0; i < d.people.length && people.length < SEIDR_CMD_PEOPLE_MAX; i++) {
			const p = seidrNormalizeCmdPerson(d.people[i]);
			if (!p) continue;
			const key = p.alias.toLowerCase();
			if (seenAlias[key]) continue;
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
	base.enabled = seidrNormalizeCmdEnabled(d.enabled);
	if (typeof d.fastSelectEnabled === "boolean") {
		base.fastSelectEnabled = d.fastSelectEnabled;
	}
	base.fastSelectKeys = seidrNormalizeFastSelectKeys(
		(d as { fastSelectKeys?: unknown }).fastSelectKeys
	);
	base.fastSelectEmpty = seidrNormalizeFastSelectEmpty(
		(d as { fastSelectEmpty?: unknown }).fastSelectEmpty
	);
	return base;
}

export function seidrDefaultCmdPerson(id: number): SeidrCmdPerson {
	return { id: id, alias: "", memberNumber: 0 };
}

export function seidrDefaultCmdAction(id: number): SeidrCmdAction {
	return { id: id, name: "", slot: "ItemTorso", activity: "" };
}
