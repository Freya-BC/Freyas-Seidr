/** Seidr undress options for /strip and /stripe */
import { Seidr } from "../seidr";

export type SeidrStripOption = {
	/** Chat insert token: cloth group id, or `all:BaseGroup` for bundles. */
	insert: string;
	label: string;
	hint: string;
	activityName: string;
	zone: string;
	bundle: boolean;
	/** Primary cloth group (base for bundles). */
	clothGroup: string;
};

function undressActs(): any[] {
	try {
		if (typeof Seidr.undressActivities === "function") {
			const list = Seidr.undressActivities();
			return Array.isArray(list) ? list : [];
		}
	} catch (e) { /* ignore */ }
	return [];
}

function canUndress(acting: any, acted: any, cloth: string | string[]): boolean {
	try {
		if (typeof Seidr.undressCan === "function") {
			return !!Seidr.undressCan(acting, acted, cloth);
		}
	} catch (e) { /* ignore */ }
	return false;
}

function wornHint(target: any, clothGroup: string): string {
	try {
		if (typeof Seidr.undressWornName === "function") {
			const n = Seidr.undressWornName(target, clothGroup);
			if (n) return String(n);
		}
	} catch (e) { /* ignore */ }
	return clothGroup;
}

function baseGroupFromBundle(act: any): string {
	if (act && Array.isArray(act.clothGroups) && act.clothGroups[0]) {
		// Bundle id is safeId(slot.group); clothGroups[0] is usually base group
		return String(act.clothGroups[0]);
	}
	return String((act && act.clothGroup) || "");
}

/** Parse `all:Cloth` → base group; else null. */
export function seidrCmdParseBundleToken(token: string): string | null {
	const t = String(token || "").trim();
	const m = t.match(/^all:(.+)$/i);
	if (!m) return null;
	return m[1].trim();
}

/**
 * List strippable Seidr undress options on target.
 * @param includeBundles — true for /strip, false for /stripe
 */
export function seidrCmdListStripOptions(
	acting: any,
	target: any,
	includeBundles: boolean
): SeidrStripOption[] {
	if (!target) return [];
	const out: SeidrStripOption[] = [];
	const acts = undressActs();
	for (let i = 0; i < acts.length; i++) {
		const act = acts[i];
		if (!act || !act.name || !act.undress) continue;
		const isBundle = !!act.bundle;
		if (isBundle && !includeBundles) continue;
		if (!isBundle && act.name.indexOf("Seidr_UndressAll_") === 0) continue;

		const cloth = isBundle
			? (act.clothGroups || [act.clothGroup])
			: (act.clothGroup || (act.clothGroups && act.clothGroups[0]));
		if (!cloth) continue;
		if (!canUndress(acting, target, cloth)) continue;

		if (isBundle) {
			const base = baseGroupFromBundle(act);
			if (!base) continue;
			out.push({
				insert: "all:" + base,
				label: String(act.label || ("Undress all " + (act.family || base))),
				hint: "bundle · " + String(act.zone || ""),
				activityName: String(act.name),
				zone: String(act.zone || ""),
				bundle: true,
				clothGroup: base,
			});
		} else {
			const g = String(act.clothGroup || cloth);
			const worn = wornHint(target, g);
			out.push({
				insert: g,
				label: worn !== g ? worn + " · " + g : (String(act.noun || g)),
				hint: g + (act.zone ? " · " + act.zone : ""),
				activityName: String(act.name),
				zone: String(act.zone || ""),
				bundle: false,
				clothGroup: g,
			});
		}
	}
	out.sort(function (a, b) {
		if (a.bundle !== b.bundle) return a.bundle ? 1 : -1;
		return a.label.localeCompare(b.label);
	});
	return out;
}

export function seidrCmdFilterStripOptions(
	options: SeidrStripOption[],
	prefix: string
): SeidrStripOption[] {
	const pfx = String(prefix || "").trim().toLowerCase();
	if (!pfx) return options;
	return options.filter(function (o) {
		return (
			o.insert.toLowerCase().indexOf(pfx) >= 0 ||
			o.label.toLowerCase().indexOf(pfx) >= 0 ||
			o.clothGroup.toLowerCase().indexOf(pfx) >= 0 ||
			o.activityName.toLowerCase().indexOf(pfx) >= 0 ||
			(o.hint && o.hint.toLowerCase().indexOf(pfx) >= 0)
		);
	});
}

export type SeidrStripResolve =
	| { ok: true; option: SeidrStripOption }
	| { ok: false; error: string };

/** Resolve typed slot token against available options. */
export function seidrCmdResolveStripSlot(
	token: string,
	acting: any,
	target: any,
	includeBundles: boolean
): SeidrStripResolve {
	const raw = String(token || "").trim();
	if (!raw) return { ok: false, error: "Missing slot" };
	const options = seidrCmdListStripOptions(acting, target, includeBundles);
	if (!options.length) {
		return { ok: false, error: "Nothing strippable on that person right now" };
	}

	const key = raw.toLowerCase();
	const bundleBase = seidrCmdParseBundleToken(raw);

	for (let i = 0; i < options.length; i++) {
		const o = options[i];
		if (bundleBase) {
			if (o.bundle && o.clothGroup.toLowerCase() === bundleBase.toLowerCase()) {
				return { ok: true, option: o };
			}
			continue;
		}
		if (o.insert.toLowerCase() === key) return { ok: true, option: o };
		if (o.clothGroup.toLowerCase() === key && !o.bundle) return { ok: true, option: o };
	}

	// Soft match on noun/label (unique)
	const soft: SeidrStripOption[] = [];
	for (let j = 0; j < options.length; j++) {
		const o = options[j];
		if (o.bundle && !includeBundles) continue;
		if (o.label.toLowerCase() === key) soft.push(o);
		else if (o.label.toLowerCase().indexOf(key) >= 0) soft.push(o);
	}
	if (soft.length === 1) return { ok: true, option: soft[0] };
	if (soft.length > 1) {
		return {
			ok: false,
			error: "Ambiguous slot \"" + raw + "\" — use Tab or the exact group id",
		};
	}

	return {
		ok: false,
		error: "Unknown or unavailable slot \"" + raw + "\". Tab for strippable layers.",
	};
}
