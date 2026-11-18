/**
 * Test / BC-Testbench surface (window.Seidr._test). Thin re-exports only — no behaviour.
 * Lets Testbench `eval` steps drive real code paths (settings save, animation play).
 */
import { Seidr } from "./seidr";
import { seidrGetSettings, seidrSaveSettings } from "./settings/storage";
import {
	seidrDeleteAnimation,
	seidrFindAnimationByName,
	seidrPlayAnimation,
	seidrUpsertAnimation,
} from "./animations/index";
import { SEIDR_ACTION_POSES } from "./actions/model";
import {
	rmGetStore,
	rmSaveStore,
	rmInvalidateStore,
	rmFlushStore,
	rmResetStorageCaches,
} from "./roomManager/storage";

Seidr._test = Object.assign(Seidr._test || {}, {
	getSettings: seidrGetSettings,
	saveSettings: seidrSaveSettings,
	upsertAnimation: seidrUpsertAnimation,
	playAnimation: seidrPlayAnimation,
	deleteAnimation: seidrDeleteAnimation,
	findAnimationByName: seidrFindAnimationByName,
	poseIds: function () {
		return SEIDR_ACTION_POSES.map(function (p) { return p.id; });
	},
	rmGetStore: rmGetStore,
	rmSaveStore: rmSaveStore,
	rmInvalidateStore: rmInvalidateStore,
	rmFlushStore: rmFlushStore,
	rmResetStorageCaches: rmResetStorageCaches,
});
