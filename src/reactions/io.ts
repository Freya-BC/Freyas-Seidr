/** Seidr Reactions — LZ clipboard export / parse */
import { Seidr } from "../seidr";
import { seidrFindAnimationById, seidrFindAnimationByName } from "../animations/store";
import { seidrLzPack, seidrLzUnpack } from "../io/lz";
import { seidrNormalizeReaction, type SeidrReaction, type SeidrReactionStep } from "./model";
import { seidrListReactions } from "./store";

export type SeidrReactionsExportPayload = {
	v: 1;
	kind: "SeidrReactions";
	reactions: SeidrReaction[];
};

export type SeidrParseReactionsResult =
	| { ok: true; reactions: SeidrReaction[]; notes: string[] }
	| { ok: false; error: string };

function rxnPrefix(): string {
	return Seidr.RXN_LZ_PREFIX || "SeidrRxn1:";
}

type AnimStepExport = {
	kind: "animation";
	animationId: number;
	animationName?: string;
};

function enrichReactionForExport(reaction: SeidrReaction): SeidrReaction {
	const copy = JSON.parse(JSON.stringify(reaction)) as SeidrReaction;
	const steps = Array.isArray(copy.steps) ? copy.steps : [];
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i] as AnimStepExport;
		if (step && step.kind === "animation" && step.animationId > 0) {
			const found = seidrFindAnimationById(step.animationId);
			if (found) step.animationName = found.name;
		}
	}
	return copy;
}

/** Remap animation steps by exported animationName; clear unresolved refs. */
export function seidrRemapReactionAnimationRefs(
	reaction: SeidrReaction,
): { reaction: SeidrReaction; notes: string[] } {
	const copy = JSON.parse(JSON.stringify(reaction)) as SeidrReaction;
	const notes: string[] = [];
	const steps: SeidrReactionStep[] = Array.isArray(copy.steps) ? copy.steps : [];
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i] as AnimStepExport & SeidrReactionStep;
		if (!step || step.kind !== "animation") continue;
		const name = typeof (step as AnimStepExport).animationName === "string"
			? String((step as AnimStepExport).animationName).trim()
			: "";
		delete (step as AnimStepExport).animationName;
		if (name) {
			const local = seidrFindAnimationByName(name);
			if (local) {
				(step as { animationId: number }).animationId = local.id;
			} else {
				(step as { animationId: number }).animationId = 0;
				notes.push("Reaction \"" + reaction.name + "\": animation \"" + name + "\" not found locally");
			}
			continue;
		}
		const id = (step as { animationId: number }).animationId;
		if (id > 0 && !seidrFindAnimationById(id)) {
			(step as { animationId: number }).animationId = 0;
			notes.push("Reaction \"" + reaction.name + "\": animation id unresolved");
		}
	}
	copy.steps = steps;
	return { reaction: copy, notes: notes };
}

/** Pack all current reactions into `SeidrRxn1:` + LZ Base64. */
export function seidrExportReactionsString(): string {
	const list = seidrListReactions().map(enrichReactionForExport);
	const payload: SeidrReactionsExportPayload = {
		v: 1,
		kind: "SeidrReactions",
		reactions: list,
	};
	return seidrLzPack(rxnPrefix(), payload);
}

/** Parse a pasted Reactions export. Remaps animation refs by name. */
export function seidrParseReactionsImport(raw: string): SeidrParseReactionsResult {
	const unpacked = seidrLzUnpack(raw, rxnPrefix());
	if (unpacked.ok === false) {
		if (unpacked.error.indexOf("missing") >= 0) {
			return { ok: false, error: "Not a Seidr Reactions export (missing " + rxnPrefix() + ")" };
		}
		return { ok: false, error: unpacked.error };
	}
	const d = unpacked.data as Partial<SeidrReactionsExportPayload>;
	if (d.kind !== "SeidrReactions" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format" };
	}
	if (!Array.isArray(d.reactions)) {
		return { ok: false, error: "Export has no reactions list" };
	}
	const out: SeidrReaction[] = [];
	const notes: string[] = [];
	for (let i = 0; i < d.reactions.length; i++) {
		const remapped = seidrRemapReactionAnimationRefs(d.reactions[i] as SeidrReaction);
		for (let n = 0; n < remapped.notes.length; n++) notes.push(remapped.notes[n]);
		const rxn = seidrNormalizeReaction(Object.assign({}, remapped.reaction, { id: i + 1 }));
		if (rxn) out.push(rxn);
	}
	if (!out.length) return { ok: false, error: "No valid reactions in export" };
	return { ok: true, reactions: out, notes: notes };
}
