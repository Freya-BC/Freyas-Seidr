/** Persist Reactions bag inside Seidr settings */
import {
	SEIDR_REACTIONS_MAX,
	SEIDR_REACTION_NAME_MAX,
	SEIDR_REACTION_STEPS_MAX,
	seidrDefaultReaction,
	seidrNormalizeReaction,
	seidrNormalizeReactionsBag,
	seidrReactionHasTrigger,
	type SeidrReaction,
	type SeidrReactionsBag,
} from "./model";
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import type { SeidrImportMode } from "../io/importCompare";
import { seidrUniqueImportName } from "../io/importCompare";

export function seidrGetReactionsBag(): SeidrReactionsBag {
	const s = seidrGetSettings() as { reactions?: unknown };
	return seidrNormalizeReactionsBag(s.reactions);
}

export function seidrSaveReactionsBag(bag: SeidrReactionsBag): { ok: boolean; error?: string } {
	const normalized = seidrNormalizeReactionsBag(bag);
	return seidrSaveSettings({ reactions: normalized } as any);
}

export function seidrListReactions(): SeidrReaction[] {
	return seidrGetReactionsBag().list.slice();
}

export function seidrFindReactionById(id: number): SeidrReaction | null {
	const list = seidrListReactions();
	for (let i = 0; i < list.length; i++) {
		if (list[i].id === id) return list[i];
	}
	return null;
}

export function seidrUpsertReaction(reaction: SeidrReaction): { ok: boolean; error?: string; reaction?: SeidrReaction } {
	const norm = seidrNormalizeReaction(reaction);
	if (!norm) return { ok: false, error: "Invalid reaction" };
	if (!norm.name.trim()) return { ok: false, error: "Name required" };
	if (!seidrReactionHasTrigger(norm)) {
		return { ok: false, error: "Add an activity, phrase, or climax trigger" };
	}
	if (norm.steps.length > SEIDR_REACTION_STEPS_MAX) {
		return { ok: false, error: "Max " + SEIDR_REACTION_STEPS_MAX + " steps" };
	}
	const bag = seidrGetReactionsBag();
	const nameKey = norm.name.toLowerCase();
	for (let i = 0; i < bag.list.length; i++) {
		if (bag.list[i].id !== norm.id && bag.list[i].name.toLowerCase() === nameKey) {
			return { ok: false, error: "Name already used" };
		}
	}
	let found = false;
	for (let j = 0; j < bag.list.length; j++) {
		if (bag.list[j].id === norm.id) {
			bag.list[j] = norm;
			found = true;
			break;
		}
	}
	if (!found) {
		if (bag.list.length >= SEIDR_REACTIONS_MAX) {
			return { ok: false, error: "Reaction limit reached (" + SEIDR_REACTIONS_MAX + ")" };
		}
		if (norm.id < 1) {
			norm.id = bag.nextId;
			bag.nextId = norm.id + 1;
		} else if (norm.id >= bag.nextId) {
			bag.nextId = norm.id + 1;
		}
		bag.list.push(norm);
	}
	const saved = seidrSaveReactionsBag(bag);
	if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
	return { ok: true, reaction: norm };
}

export function seidrDeleteReaction(id: number): { ok: boolean; error?: string } {
	const bag = seidrGetReactionsBag();
	bag.list = bag.list.filter(function (r) { return r.id !== id; });
	return seidrSaveReactionsBag(bag);
}

export function seidrAddReaction(): SeidrReaction | null {
	const bag = seidrGetReactionsBag();
	if (bag.list.length >= SEIDR_REACTIONS_MAX) return null;
	const r = seidrDefaultReaction(bag.nextId);
	bag.nextId = r.id + 1;
	bag.list.push(r);
	const saved = seidrSaveReactionsBag(bag);
	if (!saved.ok) return null;
	return r;
}

export type SeidrReactionImportRow = {
	reaction: SeidrReaction;
	mode: SeidrImportMode;
	localId?: number | null;
};

/** Import reactions with per-row add / overwrite. */
export function seidrImportSelectedReactions(
	rows: SeidrReactionImportRow[],
): { ok: boolean; imported: number; skipped: number; overwritten: number; error?: string } {
	const bag = seidrGetReactionsBag();
	let imported = 0;
	let skipped = 0;
	let overwritten = 0;
	const list = Array.isArray(rows) ? rows : [];

	const taken = new Set<string>();
	for (let i = 0; i < bag.list.length; i++) {
		taken.add(bag.list[i].name.toLowerCase());
	}

	for (let i = 0; i < list.length; i++) {
		const row = list[i];
		const mode = row.mode === "overwrite" ? "overwrite" : "add";
		const localId = row.localId != null && row.localId > 0 ? row.localId : null;

		if (mode === "overwrite" && localId != null) {
			const existing = bag.list.find(function (r) { return r.id === localId; });
			if (!existing) {
				skipped += 1;
				continue;
			}
			const norm = seidrNormalizeReaction(Object.assign({}, row.reaction, { id: localId }));
			if (!norm || !seidrReactionHasTrigger(norm)) {
				skipped += 1;
				continue;
			}
			taken.delete(existing.name.toLowerCase());
			const nameKey = norm.name.toLowerCase();
			const clash = bag.list.some(function (r) {
				return r.id !== localId && r.name.toLowerCase() === nameKey;
			});
			if (clash) {
				norm.name = seidrUniqueImportName(norm.name, taken, SEIDR_REACTION_NAME_MAX);
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

		if (bag.list.length >= SEIDR_REACTIONS_MAX) {
			skipped += list.length - i;
			break;
		}
		let name = String(row.reaction.name || "").trim() || "Reaction";
		name = seidrUniqueImportName(name, taken, SEIDR_REACTION_NAME_MAX);
		const id = bag.nextId;
		const norm = seidrNormalizeReaction(Object.assign({}, row.reaction, { id: id, name: name }));
		if (!norm || !seidrReactionHasTrigger(norm)) {
			skipped += 1;
			continue;
		}
		bag.list.push(norm);
		bag.nextId = id + 1;
		taken.add(norm.name.toLowerCase());
		imported += 1;
	}

	const saved = seidrSaveReactionsBag(bag);
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
