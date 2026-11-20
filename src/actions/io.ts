/** Seidr Actions — LZ clipboard export / parse */
import { Seidr } from "../seidr";
import { seidrFindAnimationById, seidrFindAnimationByName } from "../animations/store";
import { seidrLzPack, seidrLzUnpack } from "../io/lz";
import { seidrNormalizeAction, type SeidrAction } from "./model";
import { seidrListActions } from "./store";

export type SeidrActionsExportPayload = {
	v: 1;
	kind: "SeidrActions";
	actions: SeidrAction[];
};

export type SeidrParseActionsResult =
	| { ok: true; actions: SeidrAction[]; notes: string[] }
	| { ok: false; error: string };

function actPrefix(): string {
	return Seidr.ACT_LZ_PREFIX || "SeidrAct1:";
}

/** Enrich animation effect with name for cross-bag remapping on import. */
function enrichActionForExport(action: SeidrAction): SeidrAction {
	const copy = JSON.parse(JSON.stringify(action)) as SeidrAction & {
		effects?: {
			animation?: { enabled: boolean; animationId: number; animationName?: string };
		};
	};
	const anim = copy.effects && copy.effects.animation;
	if (anim && anim.animationId > 0) {
		const found = seidrFindAnimationById(anim.animationId);
		if (found) (anim as { animationName?: string }).animationName = found.name;
	}
	return copy;
}

/** Remap animationId by exported animationName; clear if unresolved. */
export function seidrRemapActionAnimationRefs(
	action: SeidrAction,
): { action: SeidrAction; note?: string } {
	const copy = JSON.parse(JSON.stringify(action)) as SeidrAction & {
		effects?: {
			animation?: { enabled: boolean; animationId: number; animationName?: string };
		};
	};
	const anim = copy.effects && copy.effects.animation;
	if (!anim) return { action: copy };
	const name = typeof (anim as { animationName?: string }).animationName === "string"
		? String((anim as { animationName?: string }).animationName).trim()
		: "";
	delete (anim as { animationName?: string }).animationName;
	if (!anim.enabled && !(anim.animationId > 0) && !name) return { action: copy };
	if (name) {
		const local = seidrFindAnimationByName(name);
		if (local) {
			anim.animationId = local.id;
			return { action: copy };
		}
		anim.animationId = 0;
		anim.enabled = false;
		return { action: copy, note: "Action \"" + action.name + "\": animation \"" + name + "\" not found locally" };
	}
	if (anim.animationId > 0 && !seidrFindAnimationById(anim.animationId)) {
		anim.animationId = 0;
		anim.enabled = false;
		return { action: copy, note: "Action \"" + action.name + "\": animation id unresolved" };
	}
	return { action: copy };
}

/** Pack all current actions into `SeidrAct1:` + LZ Base64. */
export function seidrExportActionsString(): string {
	const list = seidrListActions().map(enrichActionForExport);
	const payload: SeidrActionsExportPayload = {
		v: 1,
		kind: "SeidrActions",
		actions: list,
	};
	return seidrLzPack(actPrefix(), payload);
}

/**
 * Parse a pasted export string. Invalid prefix / decompress / shape → error (no picker).
 * Rows are normalized; ids from the file are kept only as temporary markers (import reassigns).
 * Animation refs remapped by name when present.
 */
export function seidrParseActionsImport(raw: string): SeidrParseActionsResult {
	const unpacked = seidrLzUnpack(raw, actPrefix());
	if (unpacked.ok === false) {
		if (unpacked.error.indexOf("missing") >= 0) {
			return { ok: false, error: "Not a Seidr Actions export (missing " + actPrefix() + ")" };
		}
		return { ok: false, error: unpacked.error };
	}
	const d = unpacked.data as Partial<SeidrActionsExportPayload>;
	if (d.kind !== "SeidrActions" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format" };
	}
	if (!Array.isArray(d.actions)) {
		return { ok: false, error: "Export has no actions list" };
	}
	const out: SeidrAction[] = [];
	const notes: string[] = [];
	for (let i = 0; i < d.actions.length; i++) {
		const tmpId = i + 1;
		const remapped = seidrRemapActionAnimationRefs(d.actions[i] as SeidrAction);
		if (remapped.note) notes.push(remapped.note);
		const act = seidrNormalizeAction(remapped.action, tmpId);
		if (act) out.push(act);
	}
	if (!out.length) return { ok: false, error: "No valid actions in export" };
	return { ok: true, actions: out, notes: notes };
}
