/**
 * Public Club Action lines (FAM-style MISSING Interface.csv tag).
 * Templates use Actions token names; names/pronouns are baked before send
 * so clients without Seidr still see the line.
 */
import { SEIDR_ACTION_CHAT_MAX } from "../actions/model";

declare const CharacterNickname: ((C: any) => string) | undefined;
declare const CharacterPronoun: ((C: any, type: string, capitalize: boolean) => string) | undefined;
declare const InventoryGet: ((C: any, group: string) => any) | undefined;
declare const ServerSend: ((msg: string, data: unknown) => void) | undefined;

export const SEIDR_ACTION_CONTENT_KEY = "SEIDR_PLAYER_CUSTOM_DIALOG";
export const SEIDR_ACTION_MISSING_TAG =
	'MISSING TEXT IN "Interface.csv": SEIDR_PLAYER_CUSTOM_DIALOG';

function displayName(C: any): string {
	if (!C) return "?";
	try {
		if (typeof CharacterNickname === "function") return CharacterNickname(C);
	} catch (e) { /* ignore */ }
	return C.Name || String(C.MemberNumber || "?");
}

function pronounKey(C: any): string | null {
	if (!C) return null;
	try {
		if (typeof C.GetPronouns === "function") {
			const k = C.GetPronouns();
			if (k) return String(k);
		}
	} catch (e) { /* ignore */ }
	try {
		if (typeof InventoryGet === "function") {
			const item = InventoryGet(C, "Pronouns");
			const name = item && item.Asset && item.Asset.Name;
			if (name) return String(name);
		}
	} catch (e2) { /* ignore */ }
	return null;
}

function mapPossessive(key: string | null): string | null {
	if (!key) return null;
	const raw = String(key).replace(/[\/_\-\s]/g, "");
	if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "her";
	if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "his";
	if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "their";
	return null;
}

function mapPronounSelf(key: string | null): string | null {
	if (!key) return null;
	const raw = String(key).replace(/[\/_\-\s]/g, "");
	if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "herself";
	if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "himself";
	if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "themself";
	return null;
}

function possessiveFor(C: any): string {
	const mapped = mapPossessive(pronounKey(C));
	if (mapped) return mapped;
	try {
		if (typeof CharacterPronoun === "function") {
			const p = String(CharacterPronoun(C, "Possessive", false) || "").trim().toLowerCase();
			if (p === "her" || p === "his" || p === "their") return p;
		}
	} catch (e) { /* ignore */ }
	return "their";
}

function pronounSelfFor(C: any): string {
	const mapped = mapPronounSelf(pronounKey(C));
	if (mapped) return mapped;
	const poss = possessiveFor(C);
	if (poss === "her") return "herself";
	if (poss === "his") return "himself";
	return "themself";
}

/** Resolve Club-style Action tokens into a room-visible string. */
export function seidrResolveActionText(template: string, source: any, target?: any): string {
	const src = source || null;
	const tgt = target || source || null;
	let out = String(template || "");
	if (!out.trim()) return "";

	const srcName = displayName(src);
	const tgtName = displayName(tgt);
	const srcPoss = possessiveFor(src);
	const tgtPoss = possessiveFor(tgt);
	const srcSelf = pronounSelfFor(src);

	// Longer / possessive forms first so TargetCharacter's → Alice's
	out = out.split("TargetPronounPossessive").join(tgtPoss);
	out = out.split("PronounPossessive").join(srcPoss);
	out = out.split("PronounSelf").join(srcSelf);
	out = out.split("TargetCharacter").join(tgtName);
	out = out.split("SourceCharacter").join(srcName);
	out = out.split("ActivityAsset").join("");

	out = out.replace(/\s{2,}/g, " ").trim();
	if (out.length > SEIDR_ACTION_CHAT_MAX) out = out.slice(0, SEIDR_ACTION_CHAT_MAX);
	return out;
}

/** Post a public Type:"Action" line. Returns false if empty or ServerSend missing. */
export function seidrPublishActionText(template: string, source: any, target?: any): boolean {
	const text = seidrResolveActionText(template, source, target);
	if (!text) return false;
	if (typeof ServerSend !== "function") return false;
	try {
		ServerSend("ChatRoomChat", {
			Content: SEIDR_ACTION_CONTENT_KEY,
			Type: "Action",
			Dictionary: [{ Tag: SEIDR_ACTION_MISSING_TAG, Text: text }],
		});
		return true;
	} catch (e) {
		console.warn("[Seidr] publishActionText", e);
		return false;
	}
}
