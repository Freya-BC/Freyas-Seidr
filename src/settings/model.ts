/** Seidr settings — RM launcher prefs */

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

export type SeidrSettings = {
	roomManagerEnabled: boolean;
	launcherPosition: RmLauncherPosition;
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

export function seidrDefaultSettings(): SeidrSettings {
	return {
		roomManagerEnabled: true,
		launcherPosition: "chatTop",
	};
}

export function seidrNormalizeSettings(raw: unknown): SeidrSettings {
	const base = seidrDefaultSettings();
	if (!raw || typeof raw !== "object") return base;
	const d = raw as Partial<SeidrSettings>;
	if (typeof d.roomManagerEnabled === "boolean") base.roomManagerEnabled = d.roomManagerEnabled;
	if (typeof d.launcherPosition === "string" && POSITION_IDS.indexOf(d.launcherPosition as RmLauncherPosition) >= 0) {
		base.launcherPosition = d.launcherPosition as RmLauncherPosition;
	}
	return base;
}
