/** CRUD for Seidr Actions bag inside settings / RmStore LZ. */
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
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

/**
 * Append selected actions with fresh ids. Stops at SEIDR_ACTIONS_MAX.
 * Skipped = not imported (cap full or invalid normalize).
 */
export function seidrImportSelectedActions(
	actions: SeidrAction[],
): { ok: boolean; imported: number; skipped: number; error?: string } {
	const bag = seidrGetActionsBag();
	let imported = 0;
	let skipped = 0;
	const list = Array.isArray(actions) ? actions : [];
	for (let i = 0; i < list.length; i++) {
		if (bag.list.length >= SEIDR_ACTIONS_MAX) {
			skipped += list.length - i;
			break;
		}
		const id = bag.nextId;
		const norm = seidrNormalizeAction(Object.assign({}, list[i], { id: id }), id);
		if (!norm) {
			skipped += 1;
			continue;
		}
		bag.list.push(norm);
		bag.nextId = id + 1;
		imported += 1;
	}
	const saved = seidrSaveActionsBag(bag);
	if (!saved.ok) {
		return { ok: false, imported: 0, skipped: list.length, error: saved.error || "Save failed" };
	}
	return { ok: true, imported: imported, skipped: skipped };
}
