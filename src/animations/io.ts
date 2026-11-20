/** Seidr Animations (clips + wiggles) — LZ clipboard export / parse */
import { Seidr } from "../seidr";
import {
	seidrImportFingerprint,
	type SeidrImportClassified,
} from "../io/importCompare";
import { seidrLzPack, seidrLzUnpack } from "../io/lz";
import {
	seidrAnimIsWiggle,
	seidrNormalizeAnimation,
	type SeidrAnimation,
} from "./model";
import { seidrListAnimations } from "./store";

export type SeidrAnimationsExportPayload = {
	v: 1;
	kind: "SeidrAnimations";
	animations: SeidrAnimation[];
};

export type SeidrParseAnimationsResult =
	| { ok: true; animations: SeidrAnimation[] }
	| { ok: false; error: string };

function aniPrefix(): string {
	return Seidr.ANI_LZ_PREFIX || "SeidrAni1:";
}

/** Pack all current clips + wiggles into `SeidrAni1:` + LZ Base64. */
export function seidrExportAnimationsString(): string {
	const payload: SeidrAnimationsExportPayload = {
		v: 1,
		kind: "SeidrAnimations",
		animations: seidrListAnimations(),
	};
	return seidrLzPack(aniPrefix(), payload);
}

/** Parse a pasted Animations export. Ids are temporary; import remints / overwrites. */
export function seidrParseAnimationsImport(raw: string): SeidrParseAnimationsResult {
	const unpacked = seidrLzUnpack(raw, aniPrefix());
	if (unpacked.ok === false) {
		if (unpacked.error.indexOf("missing") >= 0) {
			return { ok: false, error: "Not a Seidr Animations export (missing " + aniPrefix() + ")" };
		}
		return { ok: false, error: unpacked.error };
	}
	const d = unpacked.data as Partial<SeidrAnimationsExportPayload>;
	if (d.kind !== "SeidrAnimations" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format" };
	}
	if (!Array.isArray(d.animations)) {
		return { ok: false, error: "Export has no animations list" };
	}
	const out: SeidrAnimation[] = [];
	for (let i = 0; i < d.animations.length; i++) {
		const anim = seidrNormalizeAnimation(Object.assign({}, d.animations[i], { id: i + 1 }));
		if (anim) out.push(anim);
	}
	if (!out.length) return { ok: false, error: "No valid animations in export" };
	return { ok: true, animations: out };
}

function wigglePrimaryKey(anim: SeidrAnimation): string | null {
	if (!seidrAnimIsWiggle(anim) || !anim.slot || !anim.primary || !anim.primary.assetName) return null;
	return anim.slot + "::" + String(anim.primary.assetName).toLowerCase();
}

/**
 * Classify import rows: match by name first, then (for wiggles) by slot+primary.
 * Stock presets often share a primary under a different display name — those must
 * show as Same/Different (Overwrite), not New that silently fails on add.
 */
export function seidrClassifyAnimationsImport(
	candidates: SeidrAnimation[],
	locals?: SeidrAnimation[],
): SeidrImportClassified<SeidrAnimation>[] {
	const localList = locals || seidrListAnimations();
	const byName = new Map<string, SeidrAnimation>();
	const byPrimary = new Map<string, SeidrAnimation>();
	for (let i = 0; i < localList.length; i++) {
		const loc = localList[i];
		const nk = String(loc.name || "").trim().toLowerCase();
		if (nk && !byName.has(nk)) byName.set(nk, loc);
		const pk = wigglePrimaryKey(loc);
		if (pk && !byPrimary.has(pk)) byPrimary.set(pk, loc);
	}

	const out: SeidrImportClassified<SeidrAnimation>[] = [];
	for (let i = 0; i < candidates.length; i++) {
		const item = candidates[i];
		const nameKey = String(item.name || "").trim().toLowerCase();
		let local = nameKey ? byName.get(nameKey) : undefined;
		let matchHint: string | undefined;
		if (!local) {
			const pk = wigglePrimaryKey(item);
			if (pk) {
				local = byPrimary.get(pk);
				if (local && local.name.toLowerCase() !== nameKey) {
					matchHint = "replaces " + local.name;
				}
			}
		}
		const kindHint = seidrAnimIsWiggle(item) ? "Wiggle" : "Clip";
		const hint = matchHint ? kindHint + " · " + matchHint : kindHint;
		if (!local) {
			out.push({
				item: item,
				status: "new",
				localId: null,
				defaultChecked: true,
				label: item.name,
				hint: hint,
			});
			continue;
		}
		const same = seidrImportFingerprint(item) === seidrImportFingerprint(local);
		out.push({
			item: item,
			status: same ? "same" : "different",
			localId: local.id,
			defaultChecked: !same,
			label: item.name,
			hint: hint,
		});
	}
	return out;
}
