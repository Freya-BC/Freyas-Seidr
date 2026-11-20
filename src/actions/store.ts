/** CRUD for Seidr Actions bag inside settings / RmStore LZ. */
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import type { SeidrImportMode } from "../io/importCompare";
import { seidrUniqueImportName } from "../io/importCompare";
import {
	seidrDefaultAction,
	seidrDefaultActionsBag,
	seidrNormalizeAction,
	seidrNormalizeActionsBag,
	SEIDR_ACTIONS_MAX,
	type SeidrAction,
	type SeidrActionsBag,
} from "./model";

export function seidrGetActionsBag(): SeidrActionsBag {
	try {
		const s = seidrGetSettings() as { actions?: unknown };
		return seidrNormalizeActionsBag(s.actions);
	} catch (e) {
		return seidrDefaultActionsBag();
	}
}

export function seidrSaveActionsBag(bag: SeidrActionsBag): { ok: boolean; error?: string } {
	const normalized = seidrNormalizeActionsBag(bag);
	return seidrSaveSettings({ actions: normalized } as any);
}

export function seidrListActions(): SeidrAction[] {
	return seidrGetActionsBag().list.slice();
}

export function seidrGetActionById(id: number): SeidrAction | null {
	const list = seidrGetActionsBag().list;
	for (let i = 0; i < list.length; i++) {
		if (list[i].id === id) return list[i];
	}
	return null;
}

export function seidrAddAction(): SeidrAction | null {
	const bag = seidrGetActionsBag();
	if (bag.list.length >= SEIDR_ACTIONS_MAX) return null;
	const act = seidrDefaultAction(bag.nextId);
	bag.nextId = act.id + 1;
	bag.list.push(act);
	const saved = seidrSaveActionsBag(bag);
	if (!saved.ok) return null;
	return act;
}

export function seidrUpdateAction(action: SeidrAction): { ok: boolean; error?: string } {
	const norm = seidrNormalizeAction(action);
	if (!norm) return { ok: false, error: "Invalid action" };
	const bag = seidrGetActionsBag();
	let found = false;
	for (let i = 0; i < bag.list.length; i++) {
		if (bag.list[i].id === norm.id) {
			bag.list[i] = norm;
			found = true;
			break;
		}
	}
	if (!found) {
		if (bag.list.length >= SEIDR_ACTIONS_MAX) return { ok: false, error: "Action limit reached" };
		bag.list.push(norm);
		if (norm.id >= bag.nextId) bag.nextId = norm.id + 1;
	}
	return seidrSaveActionsBag(bag);
}

export function seidrDeleteAction(id: number): { ok: boolean; error?: string } {
	const bag = seidrGetActionsBag();
	bag.list = bag.list.filter(function (a) { return a.id !== id; });
	return seidrSaveActionsBag(bag);
}

export type SeidrActionImportRow = {
	action: SeidrAction;
	mode: SeidrImportMode;
	localId?: number | null;
};

/**
 * Import selected actions with per-row add / overwrite.
 * Same-content rows that were checked are no-ops.
 * Stops adding when at SEIDR_ACTIONS_MAX (overwrites still apply).
 */
export function seidrImportSelectedActions(
	rows: SeidrActionImportRow[] | SeidrAction[],
): { ok: boolean; imported: number; skipped: number; overwritten: number; error?: string } {
	const bag = seidrGetActionsBag();
	let imported = 0;
	let skipped = 0;
	let overwritten = 0;

	const normalizedRows: SeidrActionImportRow[] = [];
	const list = Array.isArray(rows) ? rows : [];
	for (let i = 0; i < list.length; i++) {
		const row = list[i] as SeidrActionImportRow | SeidrAction;
		if (row && typeof row === "object" && "action" in row && (row as SeidrActionImportRow).action) {
			normalizedRows.push(row as SeidrActionImportRow);
		} else {
			normalizedRows.push({ action: row as SeidrAction, mode: "add", localId: null });
		}
	}

	const taken = new Set<string>();
	for (let i = 0; i < bag.list.length; i++) {
		taken.add(bag.list[i].name.toLowerCase());
	}

	for (let i = 0; i < normalizedRows.length; i++) {
		const row = normalizedRows[i];
		const mode = row.mode === "overwrite" ? "overwrite" : "add";
		const localId = row.localId != null && row.localId > 0 ? row.localId : null;

		if (mode === "overwrite" && localId != null) {
			const existing = bag.list.find(function (a) { return a.id === localId; });
			if (!existing) {
				skipped += 1;
				continue;
			}
			const norm = seidrNormalizeAction(Object.assign({}, row.action, { id: localId }), localId);
			if (!norm) {
				skipped += 1;
				continue;
			}
			// Free old name from taken if renaming; claim new name
			taken.delete(existing.name.toLowerCase());
			const nameKey = norm.name.toLowerCase();
			const clash = bag.list.some(function (a) {
				return a.id !== localId && a.name.toLowerCase() === nameKey;
			});
			if (clash) {
				norm.name = seidrUniqueImportName(norm.name, taken);
			}
			taken.add(norm.name.toLowerCase());
			for (let j = 0; j < bag.list.length; j++) {
				if (bag.list[j].id === localId) {
					bag.list[j] = norm;
					break;
				}
			}
			overwritten += 1;
			continue;
		}

		// add (or overwrite without localId)
		if (bag.list.length >= SEIDR_ACTIONS_MAX) {
			skipped += normalizedRows.length - i;
			break;
		}
		let name = String(row.action.name || "").trim() || "Action";
		name = seidrUniqueImportName(name, taken);
		const id = bag.nextId;
		const norm = seidrNormalizeAction(Object.assign({}, row.action, { id: id, name: name }), id);
		if (!norm) {
			skipped += 1;
			continue;
		}
		bag.list.push(norm);
		bag.nextId = id + 1;
		taken.add(norm.name.toLowerCase());
		imported += 1;
	}

	const saved = seidrSaveActionsBag(bag);
	if (!saved.ok) {
		return {
			ok: false,
			imported: 0,
			skipped: normalizedRows.length,
			overwritten: 0,
			error: saved.error || "Save failed",
		};
	}
	return { ok: true, imported: imported, skipped: skipped, overwritten: overwritten };
}
