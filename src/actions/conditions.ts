/** Evaluate Seidr Action availability conditions (OR of AND groups). */
import type { SeidrAction, SeidrActionItemRef, SeidrCondRule } from "./model";

/** True if acted wears at least one allowlisted restraint (empty list = pass). */
export function seidrActionItemsOk(action: SeidrAction, acted: any): boolean {
	const items = action && action.items;
	if (!items || !items.length) return true;
	if (!acted || typeof InventoryGet !== "function") return false;
	for (let i = 0; i < items.length; i++) {
		const ref = items[i] as SeidrActionItemRef;
		if (!ref || !ref.slot || !ref.name) continue;
		try {
			const worn = InventoryGet(acted, ref.slot as any);
			if (worn && worn.Asset && worn.Asset.Name === ref.name) return true;
		} catch (e) { /* ignore */ }
	}
	return false;
}

function charOf(who: "source" | "target", source: any, target: any): any {
	return who === "source" ? source : target;
}

function evalRule(rule: SeidrCondRule, source: any, target: any): boolean {
	const C = charOf(rule.who, source, target);
	if (!C) return false;
	let ok = false;
	try {
		switch (rule.type) {
			case "wearing":
				ok = !!(rule.slot && typeof InventoryGet === "function" && InventoryGet(C, rule.slot as any));
				break;
			case "isGagged":
				ok = typeof C.CanTalk === "function" ? !C.CanTalk() : false;
				break;
			case "isBlind":
				ok = typeof C.IsBlind === "function" ? !!C.IsBlind() : false;
				break;
			case "isDeaf":
				ok = typeof C.IsDeaf === "function" ? !!C.IsDeaf() : false;
				break;
			case "canUseHands":
				ok = typeof C.CanInteract === "function" ? !!C.CanInteract() : true;
				break;
			case "canMoveLegs":
				ok = typeof C.CanWalk === "function" ? !!C.CanWalk() : true;
				break;
			case "canChangePose": {
				const pose = rule.pose || "Kneel";
				if (typeof PoseCanChangeUnaided === "function") ok = !!PoseCanChangeUnaided(C, pose as any);
				else if (typeof C.CanChangeToPose === "function") ok = !!C.CanChangeToPose(pose);
				else ok = true;
				break;
			}
			case "accessible": {
				const zone = rule.zone || "vagina";
				if (zone === "penis" && typeof C.AccessPenis === "function") ok = !!C.AccessPenis();
				else if (zone === "vagina" && typeof C.AccessVulva === "function") ok = !!C.AccessVulva();
				else if (zone === "nipples" && typeof C.AccessBreastFull === "function") ok = !!C.AccessBreastFull();
				else ok = true;
				break;
			}
			case "hasPenis":
				ok = typeof C.HasPenis === "function" ? !!C.HasPenis() : false;
				break;
			case "hasVagina":
				ok = typeof C.HasVagina === "function" ? !!C.HasVagina() : false;
				break;
			case "hasBreasts":
				ok = typeof C.HasBreasts === "function" ? !!C.HasBreasts() : false;
				break;
			default:
				ok = false;
		}
	} catch (e) {
		ok = false;
	}
	return rule.not ? !ok : ok;
}

/** Empty groups = always. Groups OR; rules AND. */
export function seidrActionConditionsOk(action: SeidrAction, source: any, target: any): boolean {
	const groups = action && action.conditions && action.conditions.groups;
	if (!groups || !groups.length) return true;
	for (let i = 0; i < groups.length; i++) {
		const rules = groups[i] && groups[i].rules;
		if (!rules || !rules.length) continue;
		let all = true;
		for (let j = 0; j < rules.length; j++) {
			if (!evalRule(rules[j], source, target)) {
				all = false;
				break;
			}
		}
		if (all) return true;
	}
	return false;
}

export function seidrActionAudienceOk(action: SeidrAction, source: any, target: any): boolean {
	if (!source || !target) return false;
	const self = source === target
		|| (typeof source.MemberNumber === "number"
			&& typeof target.MemberNumber === "number"
			&& source.MemberNumber === target.MemberNumber);
	if (action.audience === "selfOnly") return self;
	if (action.audience === "othersOnly") return !self;
	return true;
}

/** Audience + items allowlist + condition groups. */
export function seidrActionAvailable(action: SeidrAction, source: any, target: any): boolean {
	if (!seidrActionAudienceOk(action, source, target)) return false;
	if (!seidrActionItemsOk(action, target)) return false;
	return seidrActionConditionsOk(action, source, target);
}
