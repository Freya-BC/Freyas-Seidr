/** Seidr settings — RM launcher prefs + Drawing offsets */

export type RmLauncherPosition =
	| "topLeft"
	| "topRight"
	| "bottomLeft"
	| "bottomRight"
	| "middleLeft"
	| "middleRight"
	| "chatLeft"
	| "chatTop"
	| "chatBottom";

export type SeidrDrawOffsetPair = { x: number; y: number };

export type SeidrDrawOffsets = {
	pullLeft: SeidrDrawOffsetPair;
	pullRight: SeidrDrawOffsetPair;
	cuddle: SeidrDrawOffsetPair;
};

export type SeidrSettings = {
	roomManagerEnabled: boolean;
	/** Floating ⌂ in ChatRoom; off hides it completely (ChatAdmin BC button unaffected). */
	showQuickmenuButton: boolean;
	launcherPosition: RmLauncherPosition;
	/** DrawCharacter pose offsets only (not hitboxes). */
	drawOffsets: SeidrDrawOffsets;
};

export const RM_LAUNCHER_POSITIONS: { id: RmLauncherPosition; label: string }[] = [
	{ id: "topLeft", label: "Top Left" },
	{ id: "topRight", label: "Top Right" },
	{ id: "bottomLeft", label: "Bottom Left" },
	{ id: "bottomRight", label: "Bottom Right" },
	{ id: "middleLeft", label: "Middle Left" },
	{ id: "middleRight", label: "Middle Right" },
	{ id: "chatLeft", label: "Chat Left" },
	{ id: "chatTop", label: "Chat Top" },
	{ id: "chatBottom", label: "Chat Bottom" },
];

const POSITION_IDS: RmLauncherPosition[] = RM_LAUNCHER_POSITIONS.map(function (p) { return p.id; });

/** Echo pull ±75 Y0; cuddle holder Y -50. */
export const SEIDR_DRAW_OFFSET_MIN = -400;
export const SEIDR_DRAW_OFFSET_MAX = 400;

export function seidrDefaultDrawOffsets(): SeidrDrawOffsets {
	return {
		pullLeft: { x: -75, y: 0 },
		pullRight: { x: 75, y: 0 },
		cuddle: { x: 0, y: -50 },
	};
}

export function seidrClampDrawCoord(raw: unknown, fallback: number): number {
	const n = typeof raw === "number" ? raw : (typeof raw === "string" ? parseFloat(raw) : NaN);
	if (!Number.isFinite(n)) return fallback;
	const rounded = Math.round(n);
	if (rounded < SEIDR_DRAW_OFFSET_MIN) return SEIDR_DRAW_OFFSET_MIN;
	if (rounded > SEIDR_DRAW_OFFSET_MAX) return SEIDR_DRAW_OFFSET_MAX;
	return rounded;
}

export function seidrNormalizeDrawOffsetPair(
	raw: unknown,
	fallback: SeidrDrawOffsetPair,
): SeidrDrawOffsetPair {
	const src = raw && typeof raw === "object" ? raw as Partial<SeidrDrawOffsetPair> : null;
	return {
		x: seidrClampDrawCoord(src && src.x, fallback.x),
		y: seidrClampDrawCoord(src && src.y, fallback.y),
	};
}

export function seidrNormalizeDrawOffsets(raw: unknown, fallback?: SeidrDrawOffsets): SeidrDrawOffsets {
	const base = fallback ? seidrCloneDrawOffsets(fallback) : seidrDefaultDrawOffsets();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrDrawOffsets>;
	return {
		pullLeft: seidrNormalizeDrawOffsetPair(d.pullLeft, base.pullLeft),
		pullRight: seidrNormalizeDrawOffsetPair(d.pullRight, base.pullRight),
		cuddle: seidrNormalizeDrawOffsetPair(d.cuddle, base.cuddle),
	};
}

export function seidrCloneDrawOffsets(o: SeidrDrawOffsets): SeidrDrawOffsets {
	return {
		pullLeft: { x: o.pullLeft.x, y: o.pullLeft.y },
		pullRight: { x: o.pullRight.x, y: o.pullRight.y },
		cuddle: { x: o.cuddle.x, y: o.cuddle.y },
	};
}

export function seidrDefaultSettings(): SeidrSettings {
	return {
		roomManagerEnabled: true,
		showQuickmenuButton: true,
		launcherPosition: "chatTop",
		drawOffsets: seidrDefaultDrawOffsets(),
	};
}

export function seidrNormalizeSettings(raw: unknown): SeidrSettings {
	const base = seidrDefaultSettings();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrSettings>;
	if (typeof d.roomManagerEnabled === "boolean") base.roomManagerEnabled = d.roomManagerEnabled;
	if (typeof d.showQuickmenuButton === "boolean") base.showQuickmenuButton = d.showQuickmenuButton;
	if (typeof d.launcherPosition === "string" && POSITION_IDS.indexOf(d.launcherPosition as RmLauncherPosition) >= 0) {
		base.launcherPosition = d.launcherPosition as RmLauncherPosition;
	}
	base.drawOffsets = seidrNormalizeDrawOffsets(d.drawOffsets);
	return base;
}
