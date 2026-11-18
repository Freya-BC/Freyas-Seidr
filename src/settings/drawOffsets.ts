/** Live DrawCharacter offsets (draft or committed). */
import { Seidr } from "../seidr";
import {
	seidrCloneDrawAdvancedOffsets,
	seidrCloneDrawOffsets,
	seidrDefaultDrawAdvancedOffsets,
	seidrDefaultDrawOffsets,
	seidrDefaultMapDrawOffsets,
	seidrNormalizeDrawAdvancedOffsets,
	seidrNormalizeDrawOffsets,
	type SeidrDrawAdvancedOffsets,
	type SeidrDrawOffsets,
} from "./model";
import { seidrGetSettings } from "./storage";

export function seidrApplyDrawOffsets(raw: unknown): SeidrDrawOffsets {
	const next = seidrNormalizeDrawOffsets(raw);
	Seidr.drawOffsets = seidrCloneDrawOffsets(next);
	return Seidr.drawOffsets as SeidrDrawOffsets;
}

export function seidrApplyDrawAdvancedOffsets(raw: unknown): SeidrDrawAdvancedOffsets {
	const next = seidrNormalizeDrawAdvancedOffsets(raw);
	Seidr.drawAdvancedOffsets = seidrCloneDrawAdvancedOffsets(next);
	return Seidr.drawAdvancedOffsets as SeidrDrawAdvancedOffsets;
}

export function seidrApplyDrawAdvancedMode(on: boolean): boolean {
	Seidr.drawAdvancedMode = !!on;
	return Seidr.drawAdvancedMode;
}

export function seidrApplyDrawAllowSync(on: boolean): boolean {
	const next = !!on;
	Seidr.drawAllowSync = next;
	if (!next && Seidr.clearDrawSyncOverlays) {
		try { Seidr.clearDrawSyncOverlays(); } catch (e) { /* ignore */ }
	}
	return Seidr.drawAllowSync;
}

/** Load all committed Drawing fields into runtime mirrors. */
export function seidrLoadCommittedDrawOffsets(): SeidrDrawOffsets {
	const s = seidrGetSettings();
	seidrApplyDrawAdvancedMode(s.drawAdvancedMode);
	seidrApplyDrawAllowSync(s.drawAllowSync);
	seidrApplyDrawAdvancedOffsets(s.drawAdvancedOffsets);
	return seidrApplyDrawOffsets(s.drawOffsets);
}

export function seidrApplyMapDrawOffsets(raw: unknown): SeidrDrawOffsets {
	const next = seidrNormalizeDrawOffsets(raw);
	Seidr.mapDrawOffsets = seidrCloneDrawOffsets(next);
	return Seidr.mapDrawOffsets as SeidrDrawOffsets;
}

export function seidrApplyMapDrawAdvancedOffsets(raw: unknown): SeidrDrawAdvancedOffsets {
	const next = seidrNormalizeDrawAdvancedOffsets(raw);
	Seidr.mapDrawAdvancedOffsets = seidrCloneDrawAdvancedOffsets(next);
	return Seidr.mapDrawAdvancedOffsets as SeidrDrawAdvancedOffsets;
}

export function seidrApplyMapDrawAdvancedMode(on: boolean): boolean {
	Seidr.mapDrawAdvancedMode = !!on;
	return Seidr.mapDrawAdvancedMode;
}

/** Load committed Map Cuddle fields into runtime mirrors (Advanced always off). */
export function seidrLoadCommittedMapDrawOffsets(): SeidrDrawOffsets {
	const s = seidrGetSettings();
	seidrApplyMapDrawAdvancedMode(false);
	seidrApplyMapDrawAdvancedOffsets(seidrDefaultDrawAdvancedOffsets());
	return seidrApplyMapDrawOffsets(s.mapDrawOffsets);
}

Seidr.seidrDefaultDrawOffsets = seidrDefaultDrawOffsets;
Seidr.seidrDefaultMapDrawOffsets = seidrDefaultMapDrawOffsets;
Seidr.seidrDefaultDrawAdvancedOffsets = seidrDefaultDrawAdvancedOffsets;
Seidr.seidrApplyDrawOffsets = seidrApplyDrawOffsets;
Seidr.seidrApplyDrawAdvancedOffsets = seidrApplyDrawAdvancedOffsets;
Seidr.seidrApplyDrawAdvancedMode = seidrApplyDrawAdvancedMode;
Seidr.seidrApplyDrawAllowSync = seidrApplyDrawAllowSync;
Seidr.seidrLoadCommittedDrawOffsets = seidrLoadCommittedDrawOffsets;
Seidr.seidrApplyMapDrawOffsets = seidrApplyMapDrawOffsets;
Seidr.seidrApplyMapDrawAdvancedOffsets = seidrApplyMapDrawAdvancedOffsets;
Seidr.seidrApplyMapDrawAdvancedMode = seidrApplyMapDrawAdvancedMode;
Seidr.seidrLoadCommittedMapDrawOffsets = seidrLoadCommittedMapDrawOffsets;
