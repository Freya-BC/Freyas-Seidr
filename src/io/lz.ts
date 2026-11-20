/** Shared LZ clipboard pack / unpack for Seidr domain exports */

function lz(): { compressToBase64: (s: string) => string; decompressFromBase64: (s: string) => string } | null {
	try {
		if (typeof LZString !== "undefined" && LZString) return LZString as any;
	} catch (e) { /* ignore */ }
	return null;
}

/** Pack JSON payload as `prefix` + LZ Base64. Throws if LZ unavailable. */
export function seidrLzPack(prefix: string, payload: unknown): string {
	const json = JSON.stringify(payload);
	const L = lz();
	if (!L || typeof L.compressToBase64 !== "function") {
		throw new Error("LZString unavailable");
	}
	return String(prefix || "") + L.compressToBase64(json);
}

/**
 * Unpack `prefix` + LZ Base64 into a parsed object.
 * Returns `{ ok:false, error }` on bad prefix / decompress / JSON.
 */
export function seidrLzUnpack(raw: string, prefix: string): { ok: true; data: unknown } | { ok: false; error: string } {
	const text = String(raw || "").trim();
	if (!text) return { ok: false, error: "Paste an export string first" };
	const pfx = String(prefix || "");
	if (!pfx || text.indexOf(pfx) !== 0) {
		return { ok: false, error: "Not a Seidr export (missing " + pfx + ")" };
	}
	const L = lz();
	if (!L || typeof L.decompressFromBase64 !== "function") {
		return { ok: false, error: "LZString unavailable" };
	}
	try {
		const plain = L.decompressFromBase64(text.slice(pfx.length));
		if (!plain) return { ok: false, error: "Could not decompress export" };
		const data = JSON.parse(plain);
		if (!data || typeof data !== "object") return { ok: false, error: "Invalid export data" };
		return { ok: true, data: data };
	} catch (e) {
		return { ok: false, error: "Invalid export data" };
	}
}
