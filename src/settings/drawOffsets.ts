/** Live DrawCharacter offsets (draft or committed). */
import { Seidr } from "../seidr";
import {
	seidrCloneDrawOffsets,
	seidrDefaultDrawOffsets,
	seidrNormalizeDrawOffsets,
	type SeidrDrawOffsets,
} from "./model";
import { seidrGetSettings } from "./storage";

export function seidrApplyDrawOffsets(raw: unknown): SeidrDrawOffsets {
	const next = seidrNormalizeDrawOffsets(raw);
	Seidr.drawOffsets = seidrCloneDrawOffsets(next);
	return Seidr.drawOffsets as SeidrDrawOffsets;
}

export function seidrLoadCommittedDrawOffsets(): SeidrDrawOffsets {
	return seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
}

Seidr.seidrDefaultDrawOffsets = seidrDefaultDrawOffsets;
Seidr.seidrApplyDrawOffsets = seidrApplyDrawOffsets;
Seidr.seidrLoadCommittedDrawOffsets = seidrLoadCommittedDrawOffsets;
