/**
 * Session-only last /a|/strip|/poses target for member autocomplete.
 * ESC / cancel never clears; only successful executes update it.
 */

declare const Player: any;

let lastMemberNumber: number | null = null;

export function seidrCmdGetLastActor(): number | null {
	return lastMemberNumber;
}

export function seidrCmdSetLastActor(memberNumber: number): void {
	const n = Number(memberNumber);
	if (!Number.isFinite(n) || n <= 0) return;
	lastMemberNumber = Math.floor(n);
}

/** Preferred AC index: last actor in list, else Self, else 0. */
export function seidrCmdPreferMemberIndex(
	items: { insert: string }[],
): number {
	if (!items.length) return 0;
	const last = lastMemberNumber;
	if (last != null) {
		const lastKey = String(last);
		for (let i = 0; i < items.length; i++) {
			if (items[i].insert === lastKey) return i;
		}
	}
	let selfMn = 0;
	try {
		if (typeof Player !== "undefined" && Player && Player.MemberNumber != null) {
			selfMn = Number(Player.MemberNumber) || 0;
		}
	} catch (e) { /* ignore */ }
	if (selfMn > 0) {
		const selfKey = String(selfMn);
		for (let j = 0; j < items.length; j++) {
			if (items[j].insert === selfKey) return j;
		}
	}
	return 0;
}
