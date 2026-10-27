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
	{
		id: "rope",
		label: "Rope",
		url: svgDataUri(
			'<path d="M20 40c0-12 8-18 16-18s12 6 12 12-4 8-8 8-6-2-6-6 2-5 5-5" fill="none" stroke="#e0b15a" stroke-width="3.5" stroke-linecap="round"/>' +
			'<circle cx="39" cy="31" r="3" fill="#e0b15a"/>',
		),
	},
	{
		id: "cuff",
		label: "Cuff",
		url: svgDataUri(
			'<path d="M44 22 a16 16 0 1 0 0 20" fill="none" stroke="#e0b15a" stroke-width="5" stroke-linecap="round"/>' +
			'<rect x="40" y="18" width="8" height="8" rx="1.5" fill="#e0b15a"/>' +
			'<rect x="40" y="38" width="8" height="8" rx="1.5" fill="#e0b15a"/>',
		),
	},
	{
		id: "collar",
		label: "Collar",
		url: svgDataUri(
			'<circle cx="32" cy="30" r="14" fill="none" stroke="#e0b15a" stroke-width="4"/>' +
			'<path d="M32 44 v6 M28 50 h8" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linecap="round"/>' +
			'<path d="M26 50 a6 6 0 0 0 12 0" fill="none" stroke="#c09050" stroke-width="2.5"/>',
		),
	},
	{
		id: "leash",
		label: "Leash",
		url: svgDataUri(
			'<path d="M14 40 Q28 18 50 22" fill="none" stroke="#e0b15a" stroke-width="3.5" stroke-linecap="round"/>' +
			'<path d="M46 18 l8 8 M54 18 l-8 8" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linecap="round"/>' +
			'<circle cx="14" cy="40" r="4" fill="#c09050"/>',
		),
	},
	{
		id: "chain",
		label: "Chain",
		url: svgDataUri(
			'<ellipse cx="24" cy="32" rx="10" ry="14" fill="none" stroke="#e0b15a" stroke-width="3.5" transform="rotate(-35 24 32)"/>' +
			'<ellipse cx="40" cy="32" rx="10" ry="14" fill="none" stroke="#c09050" stroke-width="3.5" transform="rotate(35 40 32)"/>',
		),
	},
	{
		id: "blindfold",
		label: "Blindfold",
		url: svgDataUri(
			'<path d="M10 32 H54" fill="none" stroke="#e0b15a" stroke-width="10" stroke-linecap="round"/>' +
			'<path d="M18 28 Q32 36 46 28" fill="none" stroke="#241c30" stroke-width="3"/>',
		),
	},
	{
		id: "flogger",
		label: "Flogger",
		url: svgDataUri(
			'<path d="M28 12 H36 V28 H28z" fill="#e0b15a"/>' +
			'<path d="M22 28 Q18 48 20 54 M28 28 Q26 50 28 56 M36 28 Q38 50 36 56 M42 28 Q46 48 44 54" fill="none" stroke="#c09050" stroke-width="2.5" stroke-linecap="round"/>',
		),
	},
	{
		id: "paddle",
		label: "Paddle",
		url: svgDataUri(
			'<rect x="26" y="8" width="12" height="22" rx="2" fill="#e0b15a"/>' +
			'<path d="M32 30 V52" fill="none" stroke="#c09050" stroke-width="4" stroke-linecap="round"/>',
		),
	},
	{
		id: "candle",
		label: "Candle",
		url: svgDataUri(
			'<rect x="26" y="26" width="12" height="26" rx="2" fill="#e0b15a"/>' +
			'<path d="M32 26 Q28 16 32 10 Q36 16 32 26z" fill="#c06080"/>' +
			'<path d="M38 34 q6 2 4 8" fill="none" stroke="#c09050" stroke-width="2" stroke-linecap="round"/>',
		),
	},
	{
		id: "vulva",
		label: "Vulva",
		url: svgDataUri(
			'<path d="M32 14 C20 24 18 40 32 52 C46 40 44 24 32 14z" fill="#c06080" stroke="#e0b15a" stroke-width="2"/>' +
			'<path d="M32 22 V44" fill="none" stroke="#241c30" stroke-width="2.5" stroke-linecap="round"/>',
		),
	},
	{
		id: "ping",
		label: "Ping",
		url: svgDataUri(
			'<path d="M28 48 V22 a4 4 0 0 1 8 0 V48" fill="#e0b15a"/>' +
			'<ellipse cx="32" cy="18" rx="6" ry="8" fill="#e0b15a"/>' +
			'<ellipse cx="24" cy="50" rx="7" ry="5" fill="#c09050"/>' +
			'<ellipse cx="40" cy="50" rx="7" ry="5" fill="#c09050"/>',
		),
	},
	{
		id: "chess",
		label: "Chess",
		url: svgDataUri(
			'<path d="M32 12 C40 22 42 34 32 44 C22 34 24 22 32 12z" fill="#e0b15a"/>' +
			'<ellipse cx="32" cy="48" rx="14" ry="5" fill="#c09050"/>',
		),
	},
	{
		id: "spank",
		label: "Spank",
		url: svgDataUri(
			'<path d="M20 30 V18 a3 3 0 0 1 6 0 v10 M26 26 V14 a3 3 0 0 1 6 0 v14 M32 28 V16 a3 3 0 0 1 6 0 v14 M38 30 V20 a3 3 0 0 1 5 2 v16 a10 10 0 0 1-10 10 H24 a8 8 0 0 1-8-8 V34 a4 4 0 0 1 4-4z" fill="none" stroke="#e0b15a" stroke-width="2.5" stroke-linejoin="round"/>',
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

function seidrResolveBuiltinId(id: string): string {
	if (id === "phallus") return "ping";
	if (id === "plug") return "chess";
	if (id === "gag" || id === "breast") return "mark";
	return id;
}

export function seidrBuiltinIconById(id: string): SeidrBuiltinIcon | null {
	const resolved = seidrResolveBuiltinId(id);
	for (let i = 0; i < SEIDR_BUILTIN_ICONS.length; i++) {
		if (SEIDR_BUILTIN_ICONS[i].id === resolved) return SEIDR_BUILTIN_ICONS[i];
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
	// Custom URL icons are hidden in UI (Club mask-image rejects remote HTTPS).
	if (ref.source === "custom") return SEIDR_BUILTIN_ICONS[0].url;
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
