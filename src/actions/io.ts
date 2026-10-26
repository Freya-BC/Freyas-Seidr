/** Seidr Actions — LZ clipboard export / parse */
import { Seidr } from "../seidr";
import { seidrNormalizeAction, type SeidrAction } from "./model";
import { seidrListActions } from "./store";

export type SeidrActionsExportPayload = {
	v: 1;
	kind: "SeidrActions";
	actions: SeidrAction[];
};

export type SeidrParseActionsResult =
	| { ok: true; actions: SeidrAction[] }
	| { ok: false; error: string };

function lz() {
	try {
		if (typeof LZString !== "undefined" && LZString) return LZString;
	} catch (e) { /* ignore */ }
	return null;
}

function actPrefix(): string {
	return Seidr.ACT_LZ_PREFIX || "SeidrAct1:";
}

/** Pack all current actions into `SeidrAct1:` + LZ Base64. */
export function seidrExportActionsString(): string {
	const payload: SeidrActionsExportPayload = {
		v: 1,
		kind: "SeidrActions",
		actions: seidrListActions(),
	};
	const json = JSON.stringify(payload);
	const L = lz();
	const prefix = actPrefix();
	if (!L || typeof L.compressToBase64 !== "function") {
		throw new Error("LZString unavailable");
	}
	return prefix + L.compressToBase64(json);
}

/**
 * Parse a pasted export string. Invalid prefix / decompress / shape → error (no picker).
 * Rows are normalized; ids from the file are kept only as temporary markers (import reassigns).
 */
export function seidrParseActionsImport(raw: string): SeidrParseActionsResult {
	const text = String(raw || "").trim();
	if (!text) return { ok: false, error: "Paste an export string first" };
	const prefix = actPrefix();
	if (text.indexOf(prefix) !== 0) {
		return { ok: false, error: "Not a Seidr Actions export (missing " + prefix + ")" };
	}
	const L = lz();
	if (!L || typeof L.decompressFromBase64 !== "function") {
		return { ok: false, error: "LZString unavailable" };
	}
	let data: unknown = null;
	try {
		const plain = L.decompressFromBase64(text.slice(prefix.length));
		if (!plain) return { ok: false, error: "Could not decompress export" };
		data = JSON.parse(plain);
	} catch (e) {
		return { ok: false, error: "Invalid export data" };
	}
	if (!data || typeof data !== "object") return { ok: false, error: "Invalid export data" };
	const d = data as Partial<SeidrActionsExportPayload>;
	if (d.kind !== "SeidrActions" || d.v !== 1) {
		return { ok: false, error: "Unsupported export format" };
	}
	if (!Array.isArray(d.actions)) {
		return { ok: false, error: "Export has no actions list" };
	}
	const out: SeidrAction[] = [];
	for (let i = 0; i < d.actions.length; i++) {
		const tmpId = i + 1;
		const act = seidrNormalizeAction(d.actions[i], tmpId);
		if (act) out.push(act);
	}
	if (!out.length) return { ok: false, error: "No valid actions in export" };
	return { ok: true, actions: out };
}
