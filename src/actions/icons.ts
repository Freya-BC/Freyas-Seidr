/** Seidr Action icons — Pages-hosted concept PNGs, Club Activity PNGs, custom URLs. */
import { Seidr } from "../seidr";
import {
	seidrDefaultActionIcon,
	seidrNormalizeActionIcon,
	type SeidrAction,
	type SeidrActionIcon,
	type SeidrCustomActionIcon,
} from "./model";
import { seidrGetSettings } from "../settings/storage";

function svgDataUri(inner: string): string {
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
		'<rect width="64" height="64" rx="10" fill="#241c30"/>' +
		inner +
		"</svg>";
	return "data:image/svg+xml," + encodeURIComponent(svg);
}

export type SeidrBuiltinIcon = { id: string; label: string; url: string };

function assetsBase(): string {
	const base = typeof Seidr.ASSETS_BASE_URL === "string" && Seidr.ASSETS_BASE_URL
		? Seidr.ASSETS_BASE_URL
		: "https://freya-bc.github.io/Freyas-Seidr/assets";
	return base.replace(/\/$/, "");
}

/** Concept-art tiles hosted on Pages (`assets/action-icons/{id}.png`). */
export function seidrConceptIconUrl(id: string): string {
	return assetsBase() + "/action-icons/" + encodeURIComponent(id) + ".png";
}

const CONCEPT_ICON_META: { id: string; label: string }[] = [
	{ id: "rope", label: "Rope" },
	{ id: "cuff", label: "Cuff" },
	{ id: "collar", label: "Collar" },
	{ id: "leash", label: "Leash" },
	{ id: "chain", label: "Chain" },
	{ id: "blindfold", label: "Blindfold" },
	{ id: "gag", label: "Gag" },
	{ id: "flogger", label: "Flogger" },
	{ id: "paddle", label: "Paddle" },
	{ id: "candle", label: "Candle" },
	{ id: "breast", label: "Breast" },
	{ id: "vulva", label: "Vulva" },
	{ id: "phallus", label: "Phallus" },
	{ id: "plug", label: "Plug" },
	{ id: "spank", label: "Spank" },
];

function conceptIcons(): SeidrBuiltinIcon[] {
	return CONCEPT_ICON_META.map(function (m) {
		return { id: m.id, label: m.label, url: seidrConceptIconUrl(m.id) };
	});
}

/** Private fallback for default / legacy `mark` and unknown seidr ids (not shown in picker). */
const MARK_FALLBACK: SeidrBuiltinIcon = {
	id: "mark",
	label: "Mark",
	url: svgDataUri(
		'<text x="32" y="42" text-anchor="middle" font-size="28" font-family="sans-serif" font-weight="700" fill="#e0b15a">A</text>',
	),
};

/** Built-in Seidr icons shown in the Action Tab picker (Pages concept tiles). */
export const SEIDR_BUILTIN_ICONS: SeidrBuiltinIcon[] = conceptIcons();

/** Club Icons/Activity/*.png basenames (R133). */
export const SEIDR_ACTIVITY_ICON_IDS: string[] = [
	"Bite", "BrothersHandshake", "Caress", "Choke", "Clean", "CollarGrab", "Cuddle",
	"FrenchKiss", "GagKiss", "GaggedKiss", "Grope", "HandGag", "Inject", "Kick", "Kiss",
	"Lick", "MassageFeet", "MassageHands", "MasturbateFist", "MasturbateFoot",
	"MasturbateHand", "MasturbateTongue", "MoanGag", "MoanGagAngry", "MoanGagGiggle",
	"MoanGagGroan", "MoanGagTalk", "MoanGagWhimper", "Nibble", "Nod", "PenetrateFast",
	"PenetrateSlow", "Pet", "Pinch", "PoliteKiss", "Pull", "RestHead", "Rub",
	"SiblingsCheekKiss", "SiblingsHug", "SistersHug", "Sit", "Slap", "Spank", "Step",
	"StruggleArms", "StruggleLegs", "Suck", "TakeCare", "Tickle", "Whisper", "Wiggle",
];

export function seidrActivityIconUrl(id: string): string {
	return "./Icons/Activity/" + id + ".png";
}

export function seidrBuiltinIconById(id: string): SeidrBuiltinIcon | null {
	if (id === "mark") return MARK_FALLBACK;
	for (let i = 0; i < SEIDR_BUILTIN_ICONS.length; i++) {
		if (SEIDR_BUILTIN_ICONS[i].id === id) return SEIDR_BUILTIN_ICONS[i];
	}
	return null;
}

function seidrFallbackIconUrl(): string {
	return MARK_FALLBACK.url;
}

export function seidrCustomIconsFromSettings(): SeidrCustomActionIcon[] {
	try {
		const s = seidrGetSettings() as { customActionIcons?: unknown };
		const list = s && Array.isArray(s.customActionIcons) ? s.customActionIcons : [];
		return list as SeidrCustomActionIcon[];
	} catch (e) {
		return [];
	}
}

/** Resolve action icon to an image URL for ElementButton / preview. */
export function seidrResolveActionIconUrl(
	action: SeidrAction | null | undefined,
	customList?: SeidrCustomActionIcon[],
): string {
	const icon = seidrNormalizeActionIcon(action && action.icon);
	return seidrResolveIconRef(icon, customList);
}

export function seidrResolveIconRef(
	icon: SeidrActionIcon,
	customList?: SeidrCustomActionIcon[],
): string {
	const ref = seidrNormalizeActionIcon(icon);
	if (ref.source === "seidr") {
		const b = seidrBuiltinIconById(ref.id);
		return b ? b.url : seidrFallbackIconUrl();
	}
	if (ref.source === "activity") {
		if (SEIDR_ACTIVITY_ICON_IDS.indexOf(ref.id) >= 0) return seidrActivityIconUrl(ref.id);
		return seidrFallbackIconUrl();
	}
	if (ref.source === "custom") {
		const customs = customList || seidrCustomIconsFromSettings();
		for (let i = 0; i < customs.length; i++) {
			if (customs[i].id === ref.id) return customs[i].url;
		}
		return seidrFallbackIconUrl();
	}
	return seidrFallbackIconUrl();
}

export function seidrIconLabel(icon: SeidrActionIcon, customList?: SeidrCustomActionIcon[]): string {
	const ref = seidrNormalizeActionIcon(icon) || seidrDefaultActionIcon();
	if (ref.source === "seidr") {
		const b = seidrBuiltinIconById(ref.id);
		return b ? b.label : ref.id;
	}
	if (ref.source === "activity") return ref.id;
	const customs = customList || seidrCustomIconsFromSettings();
	for (let i = 0; i < customs.length; i++) {
		if (customs[i].id === ref.id) return customs[i].label || customs[i].id;
	}
	return ref.id;
}

/** Validate remote image URL (loads successfully). */
export function seidrValidateImageUrl(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
	const trimmed = String(url || "").trim();
	if (!/^https?:\/\//i.test(trimmed)) {
		return Promise.resolve({ ok: false, error: "URL must start with http:// or https://" });
	}
	return new Promise(function (resolve) {
		const img = new Image();
		let settled = false;
		const done = function (result: { ok: true } | { ok: false; error: string }) {
			if (settled) return;
			settled = true;
			resolve(result);
		};
		const timer = setTimeout(function () {
			done({ ok: false, error: "Image load timed out" });
		}, 8000);
		img.onload = function () {
			clearTimeout(timer);
			done({ ok: true });
		};
		img.onerror = function () {
			clearTimeout(timer);
			done({ ok: false, error: "Not a valid image URL" });
		};
		img.src = trimmed;
	});
}
