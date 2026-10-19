/** Read/write Seidr settings from RmStore */
import { rmGetStore, rmSaveStore } from "../roomManager/storage";
import { seidrDefaultSettings, seidrNormalizeSettings, type SeidrSettings } from "./model";

export function seidrGetSettings(): SeidrSettings {
	const store = rmGetStore();
	store.settings = seidrNormalizeSettings(store.settings);
	return store.settings;
}

export function seidrSaveSettings(patch: Partial<SeidrSettings>): { ok: boolean; error?: string } {
	const store = rmGetStore();
	store.settings = seidrNormalizeSettings(Object.assign({}, seidrDefaultSettings(), store.settings, patch));
	return rmSaveStore();
}
