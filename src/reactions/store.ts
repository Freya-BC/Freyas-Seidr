/** Persist Reactions bag inside Seidr settings */
import {
	SEIDR_REACTIONS_MAX,
	SEIDR_REACTION_STEPS_MAX,
	seidrDefaultReaction,
	seidrNormalizeReaction,
	seidrNormalizeReactionsBag,
	seidrReactionHasTrigger,
	type SeidrReaction,
	type SeidrReactionsBag,
} from "./model";
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";

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
