/** Letter / empty + Tab Fast Select (Dev). */
import { Seidr } from "../seidr";
import type { SeidrFastSelectEmpty, SeidrFastSelectKey } from "./model";
import { seidrGetCommandsBag } from "./store";

export type { SeidrFastSelectEmpty };
export { SEIDR_FAST_SELECT_EMPTY_OPTS } from "./model";

const LETTER_MAP: Record<SeidrFastSelectKey, string> = {
	a: "/action ",
	s: "/strip ",
	d: "/animation ",
	p: "/poses ",
};

const EMPTY_MAP: Record<Exclude<SeidrFastSelectEmpty, "disabled">, string> = {
	action: "/action ",
	poses: "/poses ",
	animation: "/animation ",
	strip: "/strip ",
};

export function seidrFastSelectActive(): boolean {
	if (Seidr.SHOW_CMD_FAST_SELECT === false) return false;
	try {
		return seidrGetCommandsBag().fastSelectEnabled !== false;
	} catch (e) {
		return true;
	}
}

/**
 * If chat value is a Fast Select trigger, return the replacement line; else null.
 * Does not mutate the input.
 */
export function seidrFastSelectReplacement(value: string): string | null {
	if (!seidrFastSelectActive()) return null;
	const bag = seidrGetCommandsBag();
	const trim = String(value || "").trim();
	if (/^[asdp]$/i.test(trim)) {
		const key = trim.toLowerCase() as SeidrFastSelectKey;
		if (bag.fastSelectKeys && bag.fastSelectKeys[key] === false) return null;
		return LETTER_MAP[key] || null;
	}
	if (trim === "") {
		const empty = bag.fastSelectEmpty || "disabled";
		if (empty === "disabled") return null;
		return EMPTY_MAP[empty] || null;
	}
	return null;
}

/** Apply Fast Select into InputChat. Returns true if handled. */
export function seidrFastSelectApply(input: HTMLTextAreaElement | HTMLInputElement): boolean {
	const next = seidrFastSelectReplacement(input.value || "");
	if (!next) return false;
	input.value = next;
	input.focus();
	if (typeof input.setSelectionRange === "function") {
		input.setSelectionRange(next.length, next.length);
	}
	try {
		input.dispatchEvent(new Event("input", { bubbles: true }));
	} catch (e) { /* ignore */ }
	return true;
}
