/** Persist Animations bag inside Seidr settings */
import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import {
	SEIDR_ANIMATIONS_MAX,
	SEIDR_ANIM_STEPS_MAX,
	SEIDR_ANIM_WAIT_TOTAL_MAX,
	SEIDR_WIGGLES_MAX,
	seidrAnimIsWiggle,
	seidrAnimWaitTotal,
	seidrCountClipAnimations,
	seidrCountWiggleAnimations,
	seidrDefaultAnimation,
	seidrNormalizeAnimation,
	seidrNormalizeAnimationsBag,
	type SeidrAnimation,
	type SeidrAnimationsBag,
	type SeidrWiggleSlot,
} from "./model";
import { seidrMergeStockWiggles } from "./wigglePresets";

let stockMergeBusy = false;

export function seidrGetAnimationsBag(): SeidrAnimationsBag {
	const s = seidrGetSettings() as { animations?: unknown };
	let bag = seidrNormalizeAnimationsBag(s.animations);
	if (!stockMergeBusy) {
		stockMergeBusy = true;
		try {
			const merged = seidrMergeStockWiggles(bag);
			if (merged.added > 0) {
				seidrSaveAnimationsBag(merged.bag);
				bag = merged.bag;
			}
		} finally {
			stockMergeBusy = false;
		}
	}
	return bag;
}

export function seidrSaveAnimationsBag(bag: SeidrAnimationsBag): { ok: boolean; error?: string } {
	const normalized = seidrNormalizeAnimationsBag(bag);
	return seidrSaveSettings({ animations: normalized } as any);
}

export function seidrListAnimations(): SeidrAnimation[] {
	return seidrGetAnimationsBag().list.slice();
}

export function seidrListClipAnimations(): SeidrAnimation[] {
	return seidrListAnimations().filter(function (a) { return !seidrAnimIsWiggle(a); });
}

export function seidrListWiggleAnimations(): SeidrAnimation[] {
	return seidrListAnimations().filter(function (a) { return seidrAnimIsWiggle(a); });
}

export function seidrFindAnimationById(id: number): SeidrAnimation | null {
	const list = seidrListAnimations();
	for (let i = 0; i < list.length; i++) {
		if (list[i].id === id) return list[i];
	}
	return null;
}

export function seidrFindAnimationByName(name: string): SeidrAnimation | null {
	const key = String(name || "").trim().toLowerCase();
	if (!key) return null;
	const list = seidrListAnimations();
	for (let i = 0; i < list.length; i++) {
		if (list[i].name.toLowerCase() === key) return list[i];
	}
	return null;
}

export function seidrFilterAnimationsByPrefix(prefix: string): SeidrAnimation[] {
	const pfx = String(prefix || "").trim().toLowerCase();
	const list = seidrListAnimations();
	if (!pfx) return list;
	return list.filter(function (a) {
		return a.name.toLowerCase().indexOf(pfx) >= 0;
	});
}

function wigglePrimaryTaken(
	bag: SeidrAnimationsBag,
	slot: SeidrWiggleSlot,
	assetName: string,
	exceptId: number
): boolean {
	for (let i = 0; i < bag.list.length; i++) {
		const a = bag.list[i];
		if (a.id === exceptId) continue;
		if (a.kind === "wiggle" && a.slot === slot && a.primary && a.primary.assetName === assetName) {
			return true;
		}
	}
	return false;
}

export function seidrUpsertAnimation(anim: SeidrAnimation): { ok: boolean; error?: string; animation?: SeidrAnimation } {
	const norm = seidrNormalizeAnimation(anim);
	if (!norm) return { ok: false, error: "Invalid animation" };
	if (!norm.name.trim()) return { ok: false, error: "Name required" };

	if (seidrAnimIsWiggle(norm)) {
		if (!norm.primary || !norm.secondary || !norm.slot) {
			return { ok: false, error: "Wiggle needs primary and secondary" };
		}
	} else {
		if (norm.steps.length > SEIDR_ANIM_STEPS_MAX) {
			return { ok: false, error: "Max " + SEIDR_ANIM_STEPS_MAX + " steps" };
		}
		const total = seidrAnimWaitTotal(norm.steps);
		if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
			return { ok: false, error: "Total wait exceeds " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s" };
		}
	}

	const bag = seidrGetAnimationsBag();
	const nameKey = norm.name.toLowerCase();
	for (let i = 0; i < bag.list.length; i++) {
		if (bag.list[i].id !== norm.id && bag.list[i].name.toLowerCase() === nameKey) {
			return { ok: false, error: "Name already used" };
		}
	}
	if (seidrAnimIsWiggle(norm) && norm.slot && norm.primary) {
		if (wigglePrimaryTaken(bag, norm.slot, norm.primary.assetName, norm.id)) {
			return { ok: false, error: "A wiggle for that item already exists" };
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
		if (seidrAnimIsWiggle(norm)) {
			if (seidrCountWiggleAnimations(bag.list) >= SEIDR_WIGGLES_MAX) {
				return { ok: false, error: "Wiggle limit reached (" + SEIDR_WIGGLES_MAX + ")" };
			}
		} else if (seidrCountClipAnimations(bag.list) >= SEIDR_ANIMATIONS_MAX) {
			return { ok: false, error: "Animation limit reached (" + SEIDR_ANIMATIONS_MAX + ")" };
		}
		if (norm.id < 1) {
			norm.id = bag.nextId;
			bag.nextId = norm.id + 1;
		} else if (norm.id >= bag.nextId) {
			bag.nextId = norm.id + 1;
		}
		bag.list.push(norm);
	}
	const saved = seidrSaveAnimationsBag(bag);
	if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
	return { ok: true, animation: norm };
}

export function seidrDeleteAnimation(id: number): { ok: boolean; error?: string } {
	const bag = seidrGetAnimationsBag();
	bag.list = bag.list.filter(function (a) { return a.id !== id; });
	return seidrSaveAnimationsBag(bag);
}

export function seidrAddAnimation(): SeidrAnimation | null {
	const bag = seidrGetAnimationsBag();
	if (seidrCountClipAnimations(bag.list) >= SEIDR_ANIMATIONS_MAX) return null;
	const a = seidrDefaultAnimation(bag.nextId);
	bag.nextId = a.id + 1;
	bag.list.push(a);
	const saved = seidrSaveAnimationsBag(bag);
	if (!saved.ok) return null;
	return a;
}
