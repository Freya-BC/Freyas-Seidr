/** Seidr settings — RM launcher prefs + Drawing offsets (Option A) + Actions bag */
import {
	seidrNormalizeActionsBag,
	seidrNormalizeCustomActionIcons,
	seidrRestraintSlots,
	type SeidrCustomActionIcon,
} from "../actions/model";
import { seidrNormalizeAnimationsBag } from "../animations/model";
import { seidrNormalizeCommandsBag } from "../commands/model";
import { seidrNormalizeReactionsBag } from "../reactions/model";

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

/** Free-draw role offsets from shared center (Advanced Mode / Sync). */
export type SeidrDrawAdvancedOffsets = {
	left: SeidrDrawOffsetPair;
	right: SeidrDrawOffsetPair;
	cuddle: SeidrDrawOffsetPair;
	hub: SeidrDrawOffsetPair;
};

export type SeidrDrawAdvancedRole = keyof SeidrDrawAdvancedOffsets;

export type SeidrArousalBarMode = "off" | "alwaysHide" | "untilChange" | "bottomBar";
export type SeidrArousalBarScope = "self" | "seidrCluster" | "all";

/** Cuddle/pull cluster nickname placement (names only — not status/overlays). */
export type SeidrClusterNameMode = "default" | "hitbox" | "hide" | "hover";
/** Who Names mode applies to: Seidr holds only, or everyone in character view (incl. Echo). */
export type SeidrClusterNameScope = "seidrCluster" | "all";

/** Modifier held while clicking a room character for Fast Open Actions. */
export type SeidrFastOpenModifier = "Shift" | "Ctrl" | "Alt" | "Meta";

export type SeidrSettings = {
	/**
	 * One-time local chat welcome already shown in a live ChatRoom.
	 * (Replaces unused `welcomeSeen` from 1.0.79 so missed boots get another chance.)
	 */
	welcomeLocalSeen: boolean;
	roomManagerEnabled: boolean;
	/** Floating ⌂ in ChatRoom; off hides it completely (ChatAdmin BC button unaffected). */
	showQuickmenuButton: boolean;
	launcherPosition: RmLauncherPosition;
	/** Floating Fast Wiggle button in ChatRoom (off by default). */
	showFastWiggleButton: boolean;
	/** Default placement for Fast Wiggle (same enum as Room Manager). */
	fastWigglePosition: RmLauncherPosition;
	/** DrawCharacter pose offsets only (not hitboxes). */
	drawOffsets: SeidrDrawOffsets;
	/** When true, free-draw Left/Right/Cuddle/Hub offsets replace normal Pull/Cuddle. */
	drawAdvancedMode: boolean;
	/** Per-role free-draw offsets (Advanced Mode). */
	drawAdvancedOffsets: SeidrDrawAdvancedOffsets;
	/** Listen for hub drawSync overlays; hubs also auto-broadcast when on. */
	drawAllowSync: boolean;
	/** Map-room pose offsets (same shape as Drawing; zoom-scaled at runtime). */
	mapDrawOffsets: SeidrDrawOffsets;
	/** When true, free-draw Left/Right/Cuddle/Hub on map (hub offsets ignored — hub stays fixed). */
	mapDrawAdvancedMode: boolean;
	/** Per-role free-draw offsets for map (Advanced Mode). */
	mapDrawAdvancedOffsets: SeidrDrawAdvancedOffsets;
	/** Cluster nickname draw: follow art / natural seat / hide. Default hitbox. */
	clusterNameMode: SeidrClusterNameMode;
	/** Who clusterNameMode applies to. Default Seidr holds; Everyone covers Echo pairs. */
	clusterNameScope: SeidrClusterNameScope;
	/** On-character / bottom HUD arousal meter chrome. */
	arousalBarMode: SeidrArousalBarMode;
	arousalBarScope: SeidrArousalBarScope;
	/** Modifier-click a room character → Club Activity View. */
	fastOpenActionsEnabled: boolean;
	fastOpenActionsModifier: SeidrFastOpenModifier;
	/** Preferred Item* zone when Fast Open opens Activity View. */
	fastOpenActionsSlot: string;
	/**
	 * Optional typeface for Club chat DOM (`#TextAreaChatLog` / `#InputChat`).
	 * Empty = Club Graphics font. Unavailable names fall back to that same stack.
	 */
	chatFont: string;
	/**
	 * Optional Club chat font size in Club base units (Small 28 / Medium 36 / Large 44).
	 * `0` = Preference → Chat → Font Size. Scaled like Club via canvas min-dimension / 1000.
	 */
	chatFontSize: number;
	/**
	 * When true, clear Club ChatMessage notification badge on window focus or compose focus
	 * (bypasses vanilla “scrolled to end of chat log” requirement).
	 */
	clearUnreadOnFocus: boolean;
	/** Up to 10 remote custom icons for Actions (URLs). */
	customActionIcons: SeidrCustomActionIcon[];
	/** User Actions bag (Activity Menu entries). Normalized in actions/model. */
	actions?: unknown;
	/** Chat /a people + action bindings. Normalized in commands/model. */
	commands?: unknown;
	/** Pose/face animation clips. Normalized in animations/model. */
	animations?: unknown;
	/** Autoreaction scripts. Normalized in reactions/model. */
	reactions?: unknown;
};

/** Max stored length for a chat font family name. */
export const SEIDR_CHAT_FONT_MAX = 64;
/** Club-base chat size override range (`0` = use Club Chat Font Size). */
export const SEIDR_CHAT_FONT_SIZE_MIN = 16;
export const SEIDR_CHAT_FONT_SIZE_MAX = 72;

/** Sanitize a user-entered font name for CSS (empty = Club default). */
export function seidrNormalizeChatFont(raw: unknown): string {
	if (typeof raw !== "string") return "";
	let s = raw.trim().replace(/[\r\n\0]/g, "");
	s = s.replace(/["';{}\\]/g, "");
	if (s.length > SEIDR_CHAT_FONT_MAX) s = s.slice(0, SEIDR_CHAT_FONT_MAX);
	s = s.trim();
	// Keep letters, digits, spaces, hyphens, and common font-name punctuation.
	s = s.replace(/[^\w\s.\-+]/g, "");
	return s.trim();
}

/** Sanitize chat size: `0` = Club default; else clamp to SEIDR_CHAT_FONT_SIZE_*. */
export function seidrNormalizeChatFontSize(raw: unknown): number {
	if (raw === "" || raw === null || raw === undefined) return 0;
	const n = typeof raw === "number" ? raw : (typeof raw === "string" ? parseFloat(raw) : NaN);
	if (!Number.isFinite(n) || n <= 0) return 0;
	const rounded = Math.round(n);
	if (rounded < SEIDR_CHAT_FONT_SIZE_MIN) return SEIDR_CHAT_FONT_SIZE_MIN;
	if (rounded > SEIDR_CHAT_FONT_SIZE_MAX) return SEIDR_CHAT_FONT_SIZE_MAX;
	return rounded;
}

export const FAST_OPEN_MODIFIERS: { id: SeidrFastOpenModifier; label: string }[] = [
	{ id: "Shift", label: "Shift" },
	{ id: "Ctrl", label: "Ctrl" },
	{ id: "Alt", label: "Alt" },
	{ id: "Meta", label: "Cmd (Meta)" },
];

const FAST_OPEN_MOD_IDS: SeidrFastOpenModifier[] = FAST_OPEN_MODIFIERS.map(function (m) {
	return m.id;
});

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

export const CLUSTER_NAME_MODES: { id: SeidrClusterNameMode; label: string }[] = [
	{ id: "default", label: "Default (follow art)" },
	{ id: "hitbox", label: "Hitbox (natural seats)" },
	{ id: "hide", label: "Hide" },
	{ id: "hover", label: "Hover (on hitbox)" },
];

export const CLUSTER_NAME_SCOPES: { id: SeidrClusterNameScope; label: string }[] = [
	{ id: "seidrCluster", label: "Seidr holds" },
	{ id: "all", label: "Everyone" },
];

const AROUSAL_MODE_IDS: SeidrArousalBarMode[] = AROUSAL_BAR_MODES.map(function (m) { return m.id; });
const AROUSAL_SCOPE_IDS: SeidrArousalBarScope[] = AROUSAL_BAR_SCOPES.map(function (s) { return s.id; });
const CLUSTER_NAME_MODE_IDS: SeidrClusterNameMode[] = CLUSTER_NAME_MODES.map(function (m) {
	return m.id;
});
const CLUSTER_NAME_SCOPE_IDS: SeidrClusterNameScope[] = CLUSTER_NAME_SCOPES.map(function (s) {
	return s.id;
});

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

/** Map Cuddle defaults (Pull/Cuddle only — no Advanced Mode). */
export function seidrDefaultMapDrawOffsets(): SeidrDrawOffsets {
	return {
		pull: { x: 100, y: 0 },
		cuddle: { x: 0, y: -250 },
	};
}

/** Full-cluster look matching default pull.x=75 (2× sides) + cuddle holder Y. */
export function seidrDefaultDrawAdvancedOffsets(): SeidrDrawAdvancedOffsets {
	return {
		left: { x: -150, y: 0 },
		right: { x: 150, y: 0 },
		cuddle: { x: 0, y: 0 },
		hub: { x: 0, y: -50 },
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

export function seidrNormalizeDrawAdvancedOffsets(
	raw: unknown,
	fallback?: SeidrDrawAdvancedOffsets,
): SeidrDrawAdvancedOffsets {
	const base = fallback
		? seidrCloneDrawAdvancedOffsets(fallback)
		: seidrDefaultDrawAdvancedOffsets();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrDrawAdvancedOffsets>;
	return {
		left: seidrNormalizeDrawOffsetPair(d.left, base.left),
		right: seidrNormalizeDrawOffsetPair(d.right, base.right),
		cuddle: seidrNormalizeDrawOffsetPair(d.cuddle, base.cuddle),
		hub: seidrNormalizeDrawOffsetPair(d.hub, base.hub),
	};
}

export function seidrCloneDrawAdvancedOffsets(o: SeidrDrawAdvancedOffsets): SeidrDrawAdvancedOffsets {
	return {
		left: { x: o.left.x, y: o.left.y },
		right: { x: o.right.x, y: o.right.y },
		cuddle: { x: o.cuddle.x, y: o.cuddle.y },
		hub: { x: o.hub.x, y: o.hub.y },
	};
}

function normalizeFastOpenSlot(raw: unknown): string {
	const slots = seidrRestraintSlots();
	const ids = slots.map(function (s) { return s.id; });
	if (typeof raw === "string" && ids.indexOf(raw) >= 0) return raw;
	return "ItemTorso";
}

export function seidrDefaultSettings(): SeidrSettings {
	return {
		welcomeLocalSeen: false,
		roomManagerEnabled: true,
		showQuickmenuButton: true,
		launcherPosition: "chatTop",
		showFastWiggleButton: true,
		fastWigglePosition: "chatBottom",
		drawOffsets: seidrDefaultDrawOffsets(),
		drawAdvancedMode: false,
		drawAdvancedOffsets: seidrDefaultDrawAdvancedOffsets(),
		drawAllowSync: false,
		mapDrawOffsets: seidrDefaultMapDrawOffsets(),
		mapDrawAdvancedMode: false,
		mapDrawAdvancedOffsets: seidrDefaultDrawAdvancedOffsets(),
		clusterNameMode: "hitbox",
		clusterNameScope: "seidrCluster",
		arousalBarMode: "off",
		arousalBarScope: "seidrCluster",
		fastOpenActionsEnabled: true,
		fastOpenActionsModifier: "Shift",
		fastOpenActionsSlot: "ItemTorso",
		chatFont: "",
		chatFontSize: 0,
		clearUnreadOnFocus: true,
		customActionIcons: [],
		actions: { nextId: 1, list: [] },
		commands: seidrNormalizeCommandsBag(null),
		animations: seidrNormalizeAnimationsBag(null),
		reactions: seidrNormalizeReactionsBag(null),
	};
}

export function seidrNormalizeSettings(raw: unknown): SeidrSettings {
	const base = seidrDefaultSettings();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrSettings>;
	if (typeof d.welcomeLocalSeen === "boolean") base.welcomeLocalSeen = d.welcomeLocalSeen;
	if (typeof d.roomManagerEnabled === "boolean") base.roomManagerEnabled = d.roomManagerEnabled;
	if (typeof d.showQuickmenuButton === "boolean") base.showQuickmenuButton = d.showQuickmenuButton;
	if (typeof d.launcherPosition === "string" && POSITION_IDS.indexOf(d.launcherPosition as RmLauncherPosition) >= 0) {
		base.launcherPosition = d.launcherPosition as RmLauncherPosition;
	}
	if (typeof d.showFastWiggleButton === "boolean") base.showFastWiggleButton = d.showFastWiggleButton;
	if (typeof d.fastWigglePosition === "string" && POSITION_IDS.indexOf(d.fastWigglePosition as RmLauncherPosition) >= 0) {
		base.fastWigglePosition = d.fastWigglePosition as RmLauncherPosition;
	}
	base.drawOffsets = seidrNormalizeDrawOffsets(d.drawOffsets);
	if (typeof d.drawAdvancedMode === "boolean") base.drawAdvancedMode = d.drawAdvancedMode;
	base.drawAdvancedOffsets = seidrNormalizeDrawAdvancedOffsets(d.drawAdvancedOffsets);
	if (typeof d.drawAllowSync === "boolean") base.drawAllowSync = d.drawAllowSync;
	base.mapDrawOffsets = seidrNormalizeDrawOffsets(d.mapDrawOffsets, seidrDefaultMapDrawOffsets());
	// Map Cuddle has no Advanced Mode — always off (legacy keys ignored).
	base.mapDrawAdvancedMode = false;
	base.mapDrawAdvancedOffsets = seidrDefaultDrawAdvancedOffsets();
	if (
		typeof d.clusterNameMode === "string" &&
		CLUSTER_NAME_MODE_IDS.indexOf(d.clusterNameMode as SeidrClusterNameMode) >= 0
	) {
		base.clusterNameMode = d.clusterNameMode as SeidrClusterNameMode;
	}
	if (
		typeof d.clusterNameScope === "string" &&
		CLUSTER_NAME_SCOPE_IDS.indexOf(d.clusterNameScope as SeidrClusterNameScope) >= 0
	) {
		base.clusterNameScope = d.clusterNameScope as SeidrClusterNameScope;
	}
	if (typeof d.arousalBarMode === "string" && AROUSAL_MODE_IDS.indexOf(d.arousalBarMode as SeidrArousalBarMode) >= 0) {
		base.arousalBarMode = d.arousalBarMode as SeidrArousalBarMode;
	}
	if (typeof d.arousalBarScope === "string" && AROUSAL_SCOPE_IDS.indexOf(d.arousalBarScope as SeidrArousalBarScope) >= 0) {
		base.arousalBarScope = d.arousalBarScope as SeidrArousalBarScope;
	}
	if (typeof d.fastOpenActionsEnabled === "boolean") {
		base.fastOpenActionsEnabled = d.fastOpenActionsEnabled;
	}
	if (
		typeof d.fastOpenActionsModifier === "string" &&
		FAST_OPEN_MOD_IDS.indexOf(d.fastOpenActionsModifier as SeidrFastOpenModifier) >= 0
	) {
		base.fastOpenActionsModifier = d.fastOpenActionsModifier as SeidrFastOpenModifier;
	}
	base.fastOpenActionsSlot = normalizeFastOpenSlot(d.fastOpenActionsSlot);
	base.chatFont = seidrNormalizeChatFont(d.chatFont);
	base.chatFontSize = seidrNormalizeChatFontSize(d.chatFontSize);
	if (typeof d.clearUnreadOnFocus === "boolean") {
		base.clearUnreadOnFocus = d.clearUnreadOnFocus;
	}
	base.customActionIcons = seidrNormalizeCustomActionIcons(d.customActionIcons);
	base.actions = seidrNormalizeActionsBag(d.actions);
	base.commands = seidrNormalizeCommandsBag(d.commands);
	base.animations = seidrNormalizeAnimationsBag(d.animations);
	base.reactions = seidrNormalizeReactionsBag(d.reactions);
	return base;
}
