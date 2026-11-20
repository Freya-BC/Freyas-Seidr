/** Seidr Animations module */
import { Seidr } from "../seidr";
import { seidrInstallFastWiggle } from "./fastWiggle";

export {
	SEIDR_ANIMATIONS_MAX,
	SEIDR_ANIM_STEPS_MAX,
	SEIDR_ANIM_WAIT_TOTAL_MAX,
	SEIDR_WIGGLES_MAX,
	SEIDR_WIGGLE_COUNT_MAX,
	SEIDR_WIGGLE_DELAY_MIN_MS,
	SEIDR_WIGGLE_DEFAULTS,
	SEIDR_WIGGLE_SLOTS,
	seidrAnimIsWiggle,
	seidrAnimWaitTotal,
	seidrCountClipAnimations,
	seidrCountWiggleAnimations,
	seidrDefaultAnimation,
	seidrDefaultAnimFaceStep,
	seidrDefaultAnimPoseStep,
	seidrDefaultWiggleAnimation,
	seidrNormalizeAnimationsBag,
	type SeidrAnimation,
	type SeidrAnimStep,
	type SeidrAnimationsBag,
	type SeidrWiggleSlot,
} from "./model";

import {
	seidrGetAnimationsBag,
} from "./store";

export {
	seidrAddAnimation,
	seidrDeleteAnimation,
	seidrFilterAnimationsByPrefix,
	seidrFindAnimationById,
	seidrFindAnimationByName,
	seidrGetAnimationsBag,
	seidrListAnimations,
	seidrListClipAnimations,
	seidrListWiggleAnimations,
	seidrUpsertAnimation,
} from "./store";

export { seidrAnimIsPlaying, seidrPlayAnimation } from "./play";
export {
	seidrCancelWiggle,
	seidrCancelWiggleFramePreview,
	seidrEquipWiggleFrame,
	seidrPlayWiggle,
	seidrPlayWiggleSlots,
	seidrPlayWiggleTest,
	seidrToggleWiggleFramePreview,
	seidrWiggleIsPlaying,
} from "./wigglePlay";
export {
	seidrFindAutomatchSecondary,
	seidrFindAutomatchSecondaryFrame,
	seidrReadyWiggleBySlot,
	seidrScanWornWiggleItems,
	SEIDR_WIGGLE_COUNTERPART_MISSING,
	seidrWiggleAssetLabel,
	seidrWiggleCanonicalName,
	seidrWiggleCounterpartReady,
	seidrWigglePrimaryIsWorn,
	seidrWiggleRealAssetName,
} from "./wiggleSlots";
export { seidrMergeStockWiggles } from "./wigglePresets";

Seidr.installAnimations = function () {
	// Touch bag so stock wiggles merge once settings are available
	try {
		seidrGetAnimationsBag();
	} catch (e) { /* ignore */ }
	seidrInstallFastWiggle();
};
