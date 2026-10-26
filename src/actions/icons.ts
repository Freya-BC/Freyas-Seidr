/** Seidr Action icons — Seidr SVGs, Club Activity PNGs, custom URL resolve. */
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

/** Built-in Seidr drawn icons (inline SVG). */
export const SEIDR_BUILTIN_ICONS: SeidrBuiltinIcon[] = [
	{
		id: "mark",
		label: "Mark",
		url: svgDataUri(
			'<text x="32" y="42" text-anchor="middle" font-size="28" font-family="sans-serif" font-weight="700" fill="#e0b15a">A</text>',
		),
	},
	{
		id: "hand",
		label: "Hand",
		url: svgDataUri(
			'<path d="M22 36 V18 a4 4 0 0 1 8 0 v10 M30 28 V14 a4 4 0 0 1 8 0 v16 M38 30 V16 a4 4 0 0 1 8 0 v20 M46 34 V24 a4 4 0 0 1 6 3 v15 a12 12 0 0 1-12 12 H28 a10 10 0 0 1-10-10 V36 a4 4 0 0 1 4-4z" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linejoin="round"/>',
		),
	},
	{
		id: "kiss",
		label: "Kiss",
		url: svgDataUri(
			'<path d="M20 28 Q26 18 32 28 Q38 18 44 28 Q38 42 32 48 Q26 42 20 28z" fill="#c06080" stroke="#e0b15a" stroke-width="2"/>',
		),
	},
	{
		id: "heart",
		label: "Heart",
		url: svgDataUri(
			'<path d="M32 50 L14 32 a12 12 0 0 1 18-16 a12 12 0 0 1 18 16z" fill="#c06080"/>',
		),
	},
	{
		id: "pull",
		label: "Pull",
		url: svgDataUri(
			'<path d="M12 32 H44 M36 22 L48 32 L36 42" fill="none" stroke="#e0b15a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
		),
	},
	{
		id: "spark",
		label: "Spark",
		url: svgDataUri(
			'<path d="M32 10 L36 26 L52 28 L38 38 L42 54 L32 44 L22 54 L26 38 L12 28 L28 26z" fill="#e0b15a"/>',
		),
	},
	{
		id: "cuddle",
		label: "Cuddle",
		url: svgDataUri(
			'<circle cx="24" cy="28" r="10" fill="none" stroke="#e0b15a" stroke-width="3"/>' +
			'<circle cx="40" cy="28" r="10" fill="none" stroke="#c09050" stroke-width="3"/>',
		),
	},
	{
		id: "star",
		label: "Star",
		url: svgDataUri(
			'<text x="32" y="44" text-anchor="middle" font-size="32" fill="#e0b15a">★</text>',
		),
	},
];

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
	for (let i = 0; i < SEIDR_BUILTIN_ICONS.length; i++) {
		if (SEIDR_BUILTIN_ICONS[i].id === id) return SEIDR_BUILTIN_ICONS[i];
	}
	return null;
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
		return b ? b.url : SEIDR_BUILTIN_ICONS[0].url;
	}
	if (ref.source === "activity") {
		if (SEIDR_ACTIVITY_ICON_IDS.indexOf(ref.id) >= 0) return seidrActivityIconUrl(ref.id);
		return SEIDR_BUILTIN_ICONS[0].url;
	}
	if (ref.source === "custom") {
		const customs = customList || seidrCustomIconsFromSettings();
		for (let i = 0; i < customs.length; i++) {
			if (customs[i].id === ref.id) return customs[i].url;
		}
		return SEIDR_BUILTIN_ICONS[0].url;
	}
	return SEIDR_BUILTIN_ICONS[0].url;
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
