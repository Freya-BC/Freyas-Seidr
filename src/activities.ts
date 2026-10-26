/** Club activities on the R133 HTML activity grid. */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrAllowAct, seidrCharName, seidrInEcho } from "./room";

var SEIDR_HOLD_ACTIVITIES: any[] = [
	{
		name: "Seidr_PullLeft",
		slot: "left",
		prereq: "Seidr_CanPullLeft",
		needsHands: true,
		label: "Pull Left",
		chat: "SourceCharacter pulls TargetCharacter to the left.",
	},
	{
		name: "Seidr_PullRight",
		slot: "right",
		prereq: "Seidr_CanPullRight",
		needsHands: true,
		label: "Pull Right",
		chat: "SourceCharacter pulls TargetCharacter to the right.",
	},
	{
		name: "Seidr_Cuddle",
		slot: "cuddle",
		prereq: "Seidr_CanCuddle",
		needsHands: true,
		label: "Cuddle",
		chat: "SourceCharacter cuddles TargetCharacter.",
	},
	{
		name: "Seidr_RemoveLeft",
		removeSlot: "left",
		prereq: "Seidr_CanRemoveLeft",
		needsHands: false,
		label: "Remove Left",
		chat: "SourceCharacter releases TargetCharacter from the left.",
		chatSelf: "SourceCharacter clears the left hold.",
		self: true,
	},
	{
		name: "Seidr_RemoveRight",
		removeSlot: "right",
		prereq: "Seidr_CanRemoveRight",
		needsHands: false,
		label: "Remove Right",
		chat: "SourceCharacter releases TargetCharacter from the right.",
		chatSelf: "SourceCharacter clears the right hold.",
		self: true,
	},
	{
		name: "Seidr_RemoveCuddle",
		removeSlot: "cuddle",
		prereq: "Seidr_CanRemoveCuddle",
		needsHands: false,
		label: "Remove Cuddle",
		chat: "SourceCharacter ends the cuddle with TargetCharacter.",
		chatSelf: "SourceCharacter ends the cuddle.",
		self: true,
	},
	{
		name: "Seidr_Remove",
		slot: null,
		prereq: "Seidr_CanRemove",
		needsHands: false,
		label: "Leave",
		chat: "SourceCharacter ends the hold with TargetCharacter.",
		chatSelf: "SourceCharacter leaves the hold.",
		self: true,
	},
];

var SEIDR_ACTIVITIES: any[] = SEIDR_HOLD_ACTIVITIES.slice();
var seidrLabelsHooked = false;
var seidrActivitiesRegistered = false;

function seidrMergeUndressActivities() {
	if (typeof Seidr.undressActivities !== "function") return;
	var seen = {};
	SEIDR_ACTIVITIES.forEach(function (act) {
		if (act && act.name) seen[act.name] = true;
	});
	Seidr.undressActivities().forEach(function (act) {
		if (!act || !act.name || seen[act.name]) return;
		seen[act.name] = true;
		SEIDR_ACTIVITIES.push(act);
	});
}

function seidrSvg(body) {
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + "</svg>";
	return "data:image/svg+xml," + encodeURIComponent(svg);
}

function seidrButtonImage(name) {
	var bg = '<rect width="64" height="64" rx="10" fill="#241c30"/>';
	if (name === "Seidr_PullLeft") {
		return seidrSvg(bg + '<path d="M42 16 L20 32 L42 48" fill="none" stroke="#f0e6d4" stroke-width="5" stroke-linejoin="round"/>');
	}
	if (name === "Seidr_PullRight") {
		return seidrSvg(bg + '<path d="M22 16 L44 32 L22 48" fill="none" stroke="#f0e6d4" stroke-width="5" stroke-linejoin="round"/>');
	}
	if (name === "Seidr_Cuddle") {
		return seidrSvg(bg + '<circle cx="24" cy="28" r="8" fill="#f0e6d4"/><circle cx="40" cy="28" r="8" fill="#f0e6d4"/><path d="M16 46 Q32 34 48 46" fill="none" stroke="#e0b15a" stroke-width="4"/>');
	}
	if (name === "Seidr_RemoveLeft") {
		return seidrSvg(bg + '<path d="M42 16 L20 32 L42 48" fill="none" stroke="#e07a7a" stroke-width="5"/><path d="M18 18 L46 46" stroke="#e07a7a" stroke-width="4"/>');
	}
	if (name === "Seidr_RemoveRight") {
		return seidrSvg(bg + '<path d="M22 16 L44 32 L22 48" fill="none" stroke="#e07a7a" stroke-width="5"/><path d="M18 18 L46 46" stroke="#e07a7a" stroke-width="4"/>');
	}
	if (name === "Seidr_RemoveCuddle") {
		return seidrSvg(bg + '<circle cx="24" cy="28" r="8" fill="#e07a7a"/><circle cx="40" cy="28" r="8" fill="#e07a7a"/><path d="M18 18 L46 46" stroke="#f0e6d4" stroke-width="4"/>');
	}
	if (typeof name === "string" && name.indexOf("Seidr_Undress_") === 0) {
		return seidrSvg(
			bg +
			'<path d="M18 22 h28 v6 H18 z" fill="#f0e6d4"/>' +
			'<path d="M22 28 h20 v20 H22 z" fill="none" stroke="#e0b15a" stroke-width="3"/>' +
			'<path d="M14 14 L50 50" stroke="#e07a7a" stroke-width="4" stroke-linecap="round"/>'
		);
	}
	return seidrSvg(bg + '<path d="M20 20 L44 44 M44 20 L20 44" fill="none" stroke="#e07a7a" stroke-width="5" stroke-linecap="round"/>');
}

function seidrBadgeImage(letter) {
	return seidrSvg(
		'<circle cx="32" cy="32" r="28" fill="#e0b15a"/>' +
		'<text x="32" y="42" text-anchor="middle" font-size="32" font-family="sans-serif" font-weight="700" fill="#241c30">' +
		letter + "</text>"
	);
}

function seidrActivityByName(name) {
	for (var i = 0; i < SEIDR_ACTIVITIES.length; i++) {
		if (SEIDR_ACTIVITIES[i].name === name) return SEIDR_ACTIVITIES[i];
	}
	return null;
}

function seidrNextActivityId() {
	var max = 9000;
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return max + 1;
	for (var i = 0; i < ActivityFemale3DCG.length; i++) {
		var id = ActivityFemale3DCG[i] && ActivityFemale3DCG[i].ActivityID;
		if (typeof id === "number" && id > max) max = id;
	}
	return max + 1;
}

function seidrActZones(act) {
	if (act && act.zone) return [act.zone];
	return Seidr.GROUPS.slice();
}

function seidrWriteLabels(cache) {
	if (!cache || !cache.cache) return;
	SEIDR_ACTIVITIES.forEach(function (act) {
		if (act.undress) return;
		cache.cache["Activity" + act.name] = act.label;
		seidrActZones(act).forEach(function (group) {
			cache.cache["Label-ChatOther-" + group + "-" + act.name] = act.label;
			cache.cache["Label-ChatSelf-" + group + "-" + act.name] = act.label;
			cache.cache["ChatOther-" + group + "-" + act.name] = act.chat;
			cache.cache["ChatSelf-" + group + "-" + act.name] = act.chatSelf || act.chat;
		});
	});
	if (typeof Seidr.undressWriteLabels === "function") {
		var focused = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : null;
		Seidr.undressWriteLabels(cache, focused || (typeof Player !== "undefined" ? Player : null));
	}
}

function seidrBindActivity(act: any): any {
	var prereq = act.needsHands ? ["UseHands", act.prereq] : [act.prereq];
	var zones = seidrActZones(act);
	return {
		Name: act.name,
		MaxProgress: 0,
		MaxProgressSelf: 0,
		Prerequisite: prereq,
		Target: zones.slice(),
		TargetSelf: act.self ? zones.slice() : undefined,
	};
}

function seidrEnsureLabels() {
	if (typeof ActivityDictionaryLoad !== "function") return;
	var cache = ActivityDictionaryLoad();
	seidrWriteLabels(cache);
	if (!seidrLabelsHooked && cache && typeof cache.onRebuild === "function") {
		seidrLabelsHooked = true;
		cache.onRebuild(function () {
			seidrWriteLabels(typeof ActivityDictionaryLoad === "function" ? ActivityDictionaryLoad() : null);
		}, false);
	}
}

function seidrRegisterActivities() {
	if (seidrActivitiesRegistered) return;
	if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
	seidrMergeUndressActivities();
	SEIDR_ACTIVITIES.forEach(function (act) {
		var existing = null;
		for (var i = 0; i < ActivityFemale3DCG.length; i++) {
			if (ActivityFemale3DCG[i] && ActivityFemale3DCG[i].Name === act.name) {
				existing = ActivityFemale3DCG[i];
				break;
			}
		}
		var bound = seidrBindActivity(act);
		if (existing) {
			if (typeof existing.ActivityID !== "number") existing.ActivityID = seidrNextActivityId();
			existing.MaxProgress = bound.MaxProgress;
			existing.MaxProgressSelf = bound.MaxProgressSelf;
			existing.Prerequisite = bound.Prerequisite;
			existing.Target = bound.Target;
			if (bound.TargetSelf) existing.TargetSelf = bound.TargetSelf;
			else delete existing.TargetSelf;
			return;
		}
		bound.ActivityID = seidrNextActivityId();
		(ActivityFemale3DCG as any[]).push(bound);
		if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
			(ActivityFemale3DCGOrdering as any[]).push(act.name);
		}
	});
	seidrActivitiesRegistered = true;
	seidrEnsureLabels();
}

function seidrPeerOk(member) {
	return Seidr.peerHas && Seidr.peerHas(member);
}

function seidrCanPlace(acting, acted, slot) {
	if (!acting || !acted) return false;
	if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
	if (acting.MemberNumber === acted.MemberNumber) return false;
	if (!seidrPeerOk(acted.MemberNumber)) return false;
	if (!seidrAllowAct(acting, acted)) return false;
	if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
	return SeidrState.canPlace(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber, slot);
}

function seidrCanRemove(acting, acted) {
	if (!acting || !acted) return false;
	if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
	if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
	if (acting.MemberNumber === acted.MemberNumber) {
		return SeidrState.canRemove(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber);
	}
	if (!seidrPeerOk(acted.MemberNumber)) return false;
	return SeidrState.canRemove(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber);
}

function seidrCanRemoveSlot(acting, acted, slot) {
	if (!acting || !acted) return false;
	if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
	if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
	if (acting.MemberNumber !== acted.MemberNumber && !seidrPeerOk(acted.MemberNumber)) return false;
	return SeidrState.canRemoveSlot(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber, slot);
}

function seidrApplyNamed(hubs, source, target, name) {
	var act = seidrActivityByName(name);
	if (!act || typeof source !== "number" || typeof target !== "number") return hubs;
	if (act.undress) return hubs;
	if (act.slot) return SeidrState.applySlot(hubs, source, act.slot, target);
	if (act.removeSlot) return SeidrState.clearSlot(hubs, source, act.removeSlot);
	if (source === target) return SeidrState.leaveSelf(hubs, source);
	return SeidrState.removeRelation(hubs, source, target);
}

function seidrDictValue(dict, key) {
	if (!Array.isArray(dict)) return null;
	for (var i = 0; i < dict.length; i++) {
		var entry = dict[i];
		if (entry && Object.prototype.hasOwnProperty.call(entry, key)) return entry[key];
	}
	return null;
}

function seidrActivityNameFromMessage(data) {
	var named = seidrDictValue(data && data.Dictionary, "ActivityName");
	if (typeof named === "string") return named;
	var match = /Chat(?:Other|Self)-[^-]+-(.+)$/.exec((data && data.Content) || "");
	return match ? match[1] : "";
}

/** Club shows this string when ActivityDictionary.csv has no key (clients without Seidr). */
var SEIDR_MISSING_TAG_PREFIX = 'MISSING TEXT IN "ActivityDictionary.csv": ';

/**
 * Resolve the dialog line for a Club Activity Content key.
 * Echo/FAM ship the same line under Tag = MISSING TEXT… so non-plugin clients
 * substitute it after ActivityDictionaryText fails.
 */
function seidrStripClubSoundSuffix(name) {
	if (typeof name !== "string" || !name) return name;
	if (name.length >= 6 && name.slice(-6) === "-Spank") return name.slice(0, -6);
	if (name.length >= 5 && name.slice(-5) === "-Slap") return name.slice(0, -5);
	return name;
}

function seidrDialogForContent(content) {
	var match = /^(Chat(?:Other|Self))-[^-]+-(.+)$/.exec(content || "");
	if (!match) return "";
	if (typeof Seidr.actionDialogForContent === "function") {
		var custom = Seidr.actionDialogForContent(content);
		if (custom) return custom;
	}
	var act = seidrActivityByName(seidrStripClubSoundSuffix(match[2]));
	if (!act) return "";
	if (act.undress && typeof Seidr.undressConsumePending === "function") {
		var pending = Seidr.undressConsumePending(act.name);
		if (pending) return pending;
	}
	if (match[1] === "ChatSelf") return act.chatSelf || act.chat;
	return act.chat;
}

function seidrInjectActivityDictionaryText(data) {
	if (!data || data.Type !== "Activity" || typeof data.Content !== "string") return;
	if (data.Content.indexOf(Seidr.PREFIX) < 0) return;
	var text = seidrDialogForContent(data.Content);
	if (!text) return;
	var tag = SEIDR_MISSING_TAG_PREFIX + data.Content;
	if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
	for (var i = 0; i < data.Dictionary.length; i++) {
		var entry = data.Dictionary[i];
		if (entry && entry.Tag === tag) {
			entry.Text = text;
			return;
		}
	}
	data.Dictionary.push({ Tag: tag, Text: text });
}

function seidrClearBadge(button) {
	var icons = button.querySelectorAll(".button-icon");
	for (var i = 0; i < icons.length; i++) {
		var icon = icons[i];
		var name = icon.getAttribute("data-name") || "";
		if (name.indexOf("seidr-") !== 0) continue;
		var owns = (icon.getAttribute("aria-owns") || "").split(/\s+/);
		for (var o = 0; o < owns.length; o++) {
			if (!owns[o]) continue;
			var node = document.getElementById(owns[o]);
			if (node && node.parentNode) node.parentNode.removeChild(node);
		}
		if (icon.parentNode) icon.parentNode.removeChild(icon);
	}
}

function seidrFocusedCharacter() {
	if (typeof CharacterGetCurrent === "function") return CharacterGetCurrent();
	return null;
}

function seidrBadgeActivityButtons() {
	var grid = document.getElementById("dialog-activity-grid");
	if (!grid || typeof Player === "undefined" || !Player) return;
	var focused = seidrFocusedCharacter();
	var focusedN = focused && typeof focused.MemberNumber === "number" ? focused.MemberNumber : null;
	var hubs = Seidr.getHubs();
	var buttons = grid.querySelectorAll("button");
	for (var i = 0; i < buttons.length; i++) {
		var button = buttons[i];
		var name = button.getAttribute("name") || "";
		if (name.indexOf(Seidr.PREFIX) !== 0) continue;
		seidrClearBadge(button);
		button.classList.remove("seidr-slot-active");
		button.removeAttribute("data-seidr-state");
		var act = seidrActivityByName(name);
		if (!act || act.undress) continue;
		var letter = "";
		var tip = "";
		var active = false;
		if (act.slot) {
			var held = SeidrState.occupant(hubs, Player.MemberNumber, act.slot);
			if (held != null) {
				letter = act.slot === "cuddle" ? "C" : act.slot === "left" ? "L" : "R";
				tip = act.label + ": " + seidrCharName(held);
				active = focusedN === held;
			}
		} else if (act.removeSlot) {
			var removeHeld = SeidrState.occupant(hubs, Player.MemberNumber, act.removeSlot);
			if (removeHeld != null) {
				letter = act.removeSlot === "cuddle" ? "C" : act.removeSlot === "left" ? "L" : "R";
				tip = act.label + ": " + seidrCharName(removeHeld);
				active = focusedN === removeHeld || focusedN === Player.MemberNumber;
			}
		} else if (focusedN != null) {
			if (focusedN === Player.MemberNumber) {
				var selfCluster = SeidrState.clusterOf(hubs, Player.MemberNumber);
				if (selfCluster && selfCluster.hub !== Player.MemberNumber) {
					var selfSlot = selfCluster.left === Player.MemberNumber ? "left"
						: selfCluster.right === Player.MemberNumber ? "right" : "cuddle";
					letter = selfSlot === "cuddle" ? "C" : selfSlot === "left" ? "L" : "R";
					tip = "Leave " + selfSlot;
					active = true;
				}
			} else {
				var rel = SeidrState.relation(hubs, Player.MemberNumber, focusedN);
				if (rel && rel.role === "satellite") {
					letter = rel.slot === "cuddle" ? "C" : rel.slot === "left" ? "L" : "R";
					tip = "Leave " + rel.slot + ": " + seidrCharName(focusedN);
					active = true;
				}
			}
		}
		if (!letter || typeof ElementButton === "undefined" || !ElementButton._ParseIcons) continue;
		var parsed = ElementButton._ParseIcons(button.id, [{
			name: "seidr-" + letter.toLowerCase(),
			iconSrc: seidrBadgeImage(letter),
			tooltipText: tip,
		}]);
		if (!parsed) continue;
		if (parsed.iconGrid && !button.contains(parsed.iconGrid)) button.appendChild(parsed.iconGrid);
		var tooltip = button.querySelector(".button-tooltip");
		if (tooltip && parsed.tooltip && parsed.tooltip[1] && !button.contains(parsed.tooltip[1])) {
			tooltip.appendChild(parsed.tooltip[0]);
			tooltip.appendChild(parsed.tooltip[1]);
		}
		if (active) {
			button.classList.add("seidr-slot-active");
			button.setAttribute("data-seidr-state", letter);
		}
	}
}

function seidrInstallLateActivityUiHooks() {
	Seidr.tryHook("ElementButton.CreateForActivity", "ElementButton.CreateForActivity", 5, function (args, next) {
		var activity = args[1];
		var actName = activity && activity.Activity && activity.Activity.Name;
		if (typeof actName === "string" && actName.indexOf(Seidr.PREFIX) === 0) {
			args[4] = Object.assign({}, args[4] || {}, { image: seidrButtonImage(actName) });
		}
		return next(args);
	});
	Seidr.tryHook("DialogMenuMapping.activities._ReloadButtonGrid", "DialogMenuMapping.activities._ReloadButtonGrid", 5, function (args, next) {
		var result = next(args);
		try {
			if (typeof Seidr.undressRefreshLabels === "function") Seidr.undressRefreshLabels();
		} catch (e) { /* ignore */ }
		try { seidrBadgeActivityButtons(); } catch (e2) { /* ignore */ }
		return result;
	});
}

function seidrInstallActivityHooks() {
	seidrInstallLateActivityUiHooks();

	Seidr.hookFunction("PreferenceGetActivityFactor", 0, function (args, next) {
		var type = args[1];
		if (typeof type === "string" && type.indexOf(Seidr.PREFIX) === 0) return 2;
		return next(args);
	});

	Seidr.hookFunction("ActivityCheckPrerequisite", 100, function (args, next) {
		var name = args[0];
		try {
			if (name === "Seidr_CanPullLeft") return seidrCanPlace(args[1], args[2], "left");
			if (name === "Seidr_CanPullRight") return seidrCanPlace(args[1], args[2], "right");
			if (name === "Seidr_CanCuddle") return seidrCanPlace(args[1], args[2], "cuddle");
			if (name === "Seidr_CanRemoveLeft") return seidrCanRemoveSlot(args[1], args[2], "left");
			if (name === "Seidr_CanRemoveRight") return seidrCanRemoveSlot(args[1], args[2], "right");
			if (name === "Seidr_CanRemoveCuddle") return seidrCanRemoveSlot(args[1], args[2], "cuddle");
			if (name === "Seidr_CanRemove") return seidrCanRemove(args[1], args[2]);
			if (typeof name === "string" && (name.indexOf("Seidr_CanUndress_") === 0 || name.indexOf("Seidr_CanUndressAll_") === 0)) {
				var undressAct = null;
				for (var i = 0; i < SEIDR_ACTIVITIES.length; i++) {
					if (SEIDR_ACTIVITIES[i].prereq === name) {
						undressAct = SEIDR_ACTIVITIES[i];
						break;
					}
				}
				if (!undressAct || !undressAct.undress) return false;
				return typeof Seidr.undressCan === "function"
					? Seidr.undressCan(args[1], args[2], undressAct.clothGroups || undressAct.clothGroup)
					: false;
			}
		} catch (e) {
			return false;
		}
		return next(args);
	});

	// Embed dialog under the Club MISSING TEXT tag so roommates without Seidr
	// still see "Alice pulls Bob to the left." instead of ActivityDictionary.csv noise.
	Seidr.hookFunction("ServerSend", 5, function (args, next) {
		try {
			if (args && args[0] === "ChatRoomChat") seidrInjectActivityDictionaryText(args[1]);
		} catch (e) { /* ignore */ }
		return next(args);
	});

	Seidr.hookFunction("ActivityRun", 5, function (args, next) {
		var actor = args[0];
		var acted = args[1];
		var itemActivity = args[3];
		var actName = itemActivity && itemActivity.Activity && itemActivity.Activity.Name;
		var act = seidrActivityByName(actName);
		if (act && act.undress && actor && typeof actor.IsPlayer === "function" && actor.IsPlayer()) {
			try {
				if (typeof Seidr.undressPrepareChat === "function") {
					Seidr.undressPrepareChat(actor, acted, act);
				}
			} catch (ePrep) {
				console.warn("[Seidr] undress prep", ePrep);
			}
			var stripTarget = acted;
			var stripGroups = act.clothGroups && act.clothGroups.length
				? act.clothGroups.slice()
				: act.clothGroup;
			var undressResult = next(args);
			try {
				if (typeof Seidr.undressStripDeferred === "function") {
					Seidr.undressStripDeferred(stripTarget, stripGroups);
				} else if (typeof Seidr.undressStrip === "function") {
					Seidr.undressStrip(stripTarget, stripGroups);
				}
			} catch (eStrip) {
				console.warn("[Seidr] undress", eStrip);
			}
			return undressResult;
		}
		var result = next(args);
		try {
			if (!actor || !acted || !act) return result;
			if (typeof actor.IsPlayer !== "function" || !actor.IsPlayer()) return result;
			var before = Seidr.getHubs();
			var nextHubs = seidrApplyNamed(before, actor.MemberNumber, acted.MemberNumber, actName);
			Seidr.setHubs(nextHubs);
			if (Seidr.publishChanged) Seidr.publishChanged(before, nextHubs, actor.MemberNumber, acted.MemberNumber);
			seidrBadgeActivityButtons();
		} catch (e) {
			console.warn("[Seidr] activity", e);
		}
		return result;
	});

	Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 0, function (args, next) {
		var ret = next(args);
		try { seidrInstallLateActivityUiHooks(); } catch (e) { /* ignore */ }
		return ret;
	});
}

Seidr.installActivities = function () {
	seidrMergeUndressActivities();
	seidrRegisterActivities();
	seidrEnsureLabels();
	seidrInstallActivityHooks();
	Seidr.applyNamed = seidrApplyNamed;
	Seidr.activityNameFromMessage = seidrActivityNameFromMessage;
	Seidr.dictValue = seidrDictValue;
	Seidr.badgeActivityButtons = seidrBadgeActivityButtons;
	Seidr.dialogForContent = seidrDialogForContent;
	Seidr.injectActivityDictionaryText = seidrInjectActivityDictionaryText;
	Seidr.installLateActivityUiHooks = seidrInstallLateActivityUiHooks;
};
