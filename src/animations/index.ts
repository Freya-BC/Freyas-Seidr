/** Seidr Animations module */
import { Seidr } from "../seidr";

export {
	SEIDR_ANIMATIONS_MAX,
	SEIDR_ANIM_STEPS_MAX,
	SEIDR_ANIM_WAIT_TOTAL_MAX,
	seidrAnimWaitTotal,
	seidrDefaultAnimation,
	seidrDefaultAnimFaceStep,
	seidrDefaultAnimPoseStep,
	seidrNormalizeAnimationsBag,
	type SeidrAnimation,
	type SeidrAnimStep,
	type SeidrAnimationsBag,
} from "./model";

export {
	seidrAddAnimation,
	seidrDeleteAnimation,
	seidrFilterAnimationsByPrefix,
	seidrFindAnimationById,
	seidrFindAnimationByName,
	seidrGetAnimationsBag,
	seidrListAnimations,
	seidrUpsertAnimation,
} from "./store";

export { seidrAnimIsPlaying, seidrPlayAnimation } from "./play";

Seidr.installAnimations = function () {
	/* persistence is via settings; no Club hooks required */
};
