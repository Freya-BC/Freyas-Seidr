/**
 * Test / BC-Testbench surface (window.Seidr._test). Thin re-exports only — no behaviour.
 * Lets Testbench `eval` steps drive real code paths (settings save, animation play).
 */
import { Seidr } from "./seidr";
import { radialAllowed, radialCatalog } from "./radial/runtime";
import { seidrGetSettings, seidrSaveSettings } from "./settings/storage";
import {
	seidrDeleteAnimation,
	seidrFindAnimationByName,
	seidrPlayAnimation,
	seidrUpsertAnimation,
} from "./animations/index";
import { seidrDeleteReaction, seidrUpsertReaction } from "./reactions/index";
import { SEIDR_ACTION_POSES } from "./actions/model";
import {
	rmGetStore,
	rmSaveStore,
	rmInvalidateStore,
	rmFlushStore,
	rmResetStorageCaches,
} from "./roomManager/storage";
import {
	seidrClassifyImportRows,
	seidrImportFingerprint,
	seidrUniqueImportName,
} from "./io/importCompare";
import { seidrExportActionsString, seidrParseActionsImport } from "./actions/io";
import { seidrImportSelectedActions, seidrListActions } from "./actions/store";
import {
	seidrClassifyAnimationsImport,
	seidrExportAnimationsString,
	seidrParseAnimationsImport,
} from "./animations/io";
import { seidrImportSelectedAnimations, seidrListAnimations } from "./animations/store";
import { seidrExportReactionsString, seidrParseReactionsImport } from "./reactions/io";
import { seidrImportSelectedReactions, seidrListReactions } from "./reactions/store";
import { seidrExportCommandsString, seidrParseCommandsImport } from "./commands/io";
import {
	seidrImportSelectedCmdActions,
	seidrImportSelectedCmdPeople,
	seidrListCmdActions,
	seidrListCmdPeople,
} from "./commands/store";

Seidr._test = Object.assign(Seidr._test || {}, {
	radialAllowed,
	radialCatalog,
	getSettings: seidrGetSettings,
	saveSettings: seidrSaveSettings,
	upsertAnimation: seidrUpsertAnimation,
	playAnimation: seidrPlayAnimation,
	deleteAnimation: seidrDeleteAnimation,
	findAnimationByName: seidrFindAnimationByName,
	upsertReaction: seidrUpsertReaction,
	deleteReaction: seidrDeleteReaction,
	poseIds: function () {
		return SEIDR_ACTION_POSES.map(function (p) { return p.id; });
	},
	rmGetStore: rmGetStore,
	rmSaveStore: rmSaveStore,
	rmInvalidateStore: rmInvalidateStore,
	rmFlushStore: rmFlushStore,
	rmResetStorageCaches: rmResetStorageCaches,
	importFingerprint: seidrImportFingerprint,
	classifyImportRows: seidrClassifyImportRows,
	uniqueImportName: seidrUniqueImportName,
	exportActions: seidrExportActionsString,
	parseActionsImport: seidrParseActionsImport,
	importSelectedActions: seidrImportSelectedActions,
	listActions: seidrListActions,
	exportAnimations: seidrExportAnimationsString,
	parseAnimationsImport: seidrParseAnimationsImport,
	classifyAnimationsImport: seidrClassifyAnimationsImport,
	importSelectedAnimations: seidrImportSelectedAnimations,
	listAnimations: seidrListAnimations,
	exportReactions: seidrExportReactionsString,
	parseReactionsImport: seidrParseReactionsImport,
	importSelectedReactions: seidrImportSelectedReactions,
	listReactions: seidrListReactions,
	exportCommands: seidrExportCommandsString,
	parseCommandsImport: seidrParseCommandsImport,
	importSelectedCmdPeople: seidrImportSelectedCmdPeople,
	importSelectedCmdActions: seidrImportSelectedCmdActions,
	listCmdPeople: seidrListCmdPeople,
	listCmdActions: seidrListCmdActions,
});
