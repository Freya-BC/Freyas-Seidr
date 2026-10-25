/** Seidr settings — RM launcher prefs + Drawing offsets (Option A) */

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

/** Echo pair gap: pull.x = half-gap from center; cuddle moves holder only. */
export type SeidrDrawOffsets = {
	pull: SeidrDrawOffsetPair;
	cuddle: SeidrDrawOffsetPair;
};

export type SeidrArousalBarMode = "off" | "alwaysHide" | "untilChange" | "bottomBar";
export type SeidrArousalBarScope = "self" | "seidrCluster" | "all";

export type SeidrSettings = {
	roomManagerEnabled: boolean;
	/** Floating ⌂ in ChatRoom; off hides it completely (ChatAdmin BC button unaffected). */
	showQuickmenuButton: boolean;
	launcherPosition: RmLauncherPosition;
	/** DrawCharacter pose offsets only (not hitboxes). */
	drawOffsets: SeidrDrawOffsets;
	/** On-character / bottom HUD arousal meter chrome. */
	arousalBarMode: SeidrArousalBarMode;
	arousalBarScope: SeidrArousalBarScope;
};

export const AROUSAL_BAR_MODES: { id: SeidrArousalBarMode; label: string }[] = [
	{ id: "off", label: "Club default" },
	{ id: "alwaysHide", label: "Always hide" },
	{ id: "untilChange", label: "Show on change" },
	{ id: "bottomBar", label: "Bottom bar" },
];

export const AROUSAL_BAR_SCOPES: { id: SeidrArousalBarScope; label: string }[] = [
	{ id: "self", label: "Self only" },
	{ id: "seidrCluster", label: "Seidr holds" },
	{ id: "all", label: "Everyone" },
];

const AROUSAL_MODE_IDS: SeidrArousalBarMode[] = AROUSAL_BAR_MODES.map(function (m) { return m.id; });
const AROUSAL_SCOPE_IDS: SeidrArousalBarScope[] = AROUSAL_BAR_SCOPES.map(function (s) { return s.id; });

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

/** Echo pull half-gap 75 Y0; cuddle holder Y -50. */
export const SEIDR_DRAW_OFFSET_MIN = -400;
export const SEIDR_DRAW_OFFSET_MAX = 400;

export function seidrDefaultDrawOffsets(): SeidrDrawOffsets {
	return {
		pull: { x: 75, y: 0 },
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

/** Pull X is spacing from center — store as non-negative magnitude. */
export function seidrClampPullX(raw: unknown, fallback: number): number {
	const n = seidrClampDrawCoord(raw, fallback);
	return Math.abs(n);
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

function migrateLegacyPull(raw: Record<string, unknown>): SeidrDrawOffsetPair | null {
	const left = raw.pullLeft && typeof raw.pullLeft === "object"
		? raw.pullLeft as Partial<SeidrDrawOffsetPair>
		: null;
	const right = raw.pullRight && typeof raw.pullRight === "object"
		? raw.pullRight as Partial<SeidrDrawOffsetPair>
		: null;
	if (!left && !right) return null;
	const lx = left && typeof left.x === "number" && Number.isFinite(left.x) ? Math.abs(left.x) : 0;
	const rx = right && typeof right.x === "number" && Number.isFinite(right.x) ? Math.abs(right.x) : 0;
	const x = lx || rx || 75;
	let y = 0;
	if (left && typeof left.y === "number" && Number.isFinite(left.y)) y = left.y;
	else if (right && typeof right.y === "number" && Number.isFinite(right.y)) y = right.y;
	return { x: seidrClampPullX(x, 75), y: seidrClampDrawCoord(y, 0) };
}

export function seidrNormalizeDrawOffsets(raw: unknown, fallback?: SeidrDrawOffsets): SeidrDrawOffsets {
	const base = fallback ? seidrCloneDrawOffsets(fallback) : seidrDefaultDrawOffsets();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Record<string, unknown> & Partial<SeidrDrawOffsets>;
	let pull = base.pull;
	if (d.pull && typeof d.pull === "object") {
		const p = d.pull as Partial<SeidrDrawOffsetPair>;
		pull = {
			x: seidrClampPullX(p.x, base.pull.x),
			y: seidrClampDrawCoord(p.y, base.pull.y),
		};
	} else {
		const migrated = migrateLegacyPull(d);
		if (migrated) pull = migrated;
	}
	const cuddle = seidrNormalizeDrawOffsetPair(d.cuddle, base.cuddle);
	return { pull: pull, cuddle: cuddle };
}

export function seidrCloneDrawOffsets(o: SeidrDrawOffsets): SeidrDrawOffsets {
	return {
		pull: { x: o.pull.x, y: o.pull.y },
		cuddle: { x: o.cuddle.x, y: o.cuddle.y },
	};
}

export function seidrDefaultSettings(): SeidrSettings {
	return {
		roomManagerEnabled: true,
		showQuickmenuButton: true,
		launcherPosition: "chatTop",
		drawOffsets: seidrDefaultDrawOffsets(),
		arousalBarMode: "off",
		arousalBarScope: "seidrCluster",
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
	if (typeof d.arousalBarMode === "string" && AROUSAL_MODE_IDS.indexOf(d.arousalBarMode as SeidrArousalBarMode) >= 0) {
		base.arousalBarMode = d.arousalBarMode as SeidrArousalBarMode;
	}
	if (typeof d.arousalBarScope === "string" && AROUSAL_SCOPE_IDS.indexOf(d.arousalBarScope as SeidrArousalBarScope) >= 0) {
		base.arousalBarScope = d.arousalBarScope as SeidrArousalBarScope;
	}
	return base;
}
