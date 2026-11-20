/** Seidr Commands (people + slash actions) — LZ clipboard export / parse */
import { Seidr } from "../seidr";
import { seidrLzPack, seidrLzUnpack } from "../io/lz";
import {
	seidrNormalizeCmdAction,
	seidrNormalizeCmdPerson,
	type SeidrCmdAction,
	type SeidrCmdPerson,
} from "./model";
import { seidrListCmdActions, seidrListCmdPeople } from "./store";

export type SeidrCommandsExportPayload = {
	v: 1;
	kind: "SeidrCommands";
	people: SeidrCmdPerson[];
	actions: SeidrCmdAction[];
};

export type SeidrParseCommandsResult =
	| { ok: true; people: SeidrCmdPerson[]; actions: SeidrCmdAction[] }
	| { ok: false; error: string };

function cmdPrefix(): string {
	return Seidr.CMD_LZ_PREFIX || "SeidrCmd1:";
}

/** Pack people + slash actions (flags not included). */
export function seidrExportCommandsString(): string {
	const payload: SeidrCommandsExportPayload = {
		v: 1,
		kind: "SeidrCommands",
		people: seidrListCmdPeople(),
		actions: seidrListCmdActions(),
	};
	return seidrLzPack(cmdPrefix(), payload);
}

/** Parse a pasted Commands export. Ids are temporary. */
export function seidrParseCommandsImport(raw: string): SeidrParseCommandsResult {
	const unpacked = seidrLzUnpack(raw, cmdPrefix());
	if (unpacked.ok === false) {
		if (unpacked.error.indexOf("missing") >= 0) {
			return { ok: false, error: "Not a Seidr Commands export (missing " + cmdPrefix() + ")" };
		}
		return { ok: false, error: unpacked.error };
	}
	const d = unpacked.data as Partial<SeidrCommandsExportPayload>;
	if (d.kind !== "SeidrCommands" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format" };
	}
	const people: SeidrCmdPerson[] = [];
	const actions: SeidrCmdAction[] = [];
	if (Array.isArray(d.people)) {
		for (let i = 0; i < d.people.length; i++) {
			const p = seidrNormalizeCmdPerson(Object.assign({}, d.people[i], { id: i + 1 }));
			if (p && p.alias && p.memberNumber > 0) people.push(p);
		}
	}
	if (Array.isArray(d.actions)) {
		for (let j = 0; j < d.actions.length; j++) {
			const a = seidrNormalizeCmdAction(Object.assign({}, d.actions[j], { id: j + 1 }));
			if (a && a.name && a.slot && a.activity) actions.push(a);
		}
	}
	if (!people.length && !actions.length) {
		return { ok: false, error: "No valid people or actions in export" };
	}
	return { ok: true, people: people, actions: actions };
}
