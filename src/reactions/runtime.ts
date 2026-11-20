/** Install Autoreaction ChatRoomMessage listener */
import { Seidr } from "../seidr";
import { seidrCmdWarn } from "../commands/warn";
import {
	seidrMatchActivityReaction,
	seidrMatchClimaxReaction,
	seidrMatchPhraseReaction,
} from "./match";
import { seidrPlayReaction } from "./run";

const COOLDOWN_MS = 1500;

let installed = false;
let running = false;
let cooldownUntil = 0;

function busy(): boolean {
	return running || Date.now() < cooldownUntil;
}

function finishRun() {
	running = false;
	cooldownUntil = Date.now() + COOLDOWN_MS;
}

function fire(match: NonNullable<ReturnType<typeof seidrMatchActivityReaction>>) {
	if (busy()) return;
	running = true;
	const label = match.reaction.name || ("#" + match.reaction.id);
	seidrPlayReaction(match.reaction, match.issuerMemberNumber)
		.then(function (result) {
			if (!result.ok) {
				seidrCmdWarn("Reaction \"" + label + "\" not functional: " + (result.error || "unknown"));
			}
		})
		.catch(function (e) {
			console.warn("[Seidr Reaction] run failed", e);
			seidrCmdWarn("Reaction \"" + label + "\" not functional: run failed");
		})
		.then(finishRun, finishRun);
}

Seidr.installReactions = function () {
	if (Seidr.SHOW_REACTIONS === false) return;
	if (installed) return;
	if (typeof Seidr.hookFunction !== "function") return;
	installed = true;
	Seidr.hookFunction("ChatRoomMessage", 10, function (args: any[], next: (a: any[]) => any) {
		const data = args && args[0];
		try {
			if (!busy() && data) {
				const climax = seidrMatchClimaxReaction(data);
				if (climax) fire(climax);
				else {
					const act = seidrMatchActivityReaction(data);
					if (act) fire(act);
					else {
						const phrase = seidrMatchPhraseReaction(data);
						if (phrase) fire(phrase);
					}
				}
			}
		} catch (e) {
			console.warn("[Seidr Reaction] match failed", e);
		}
		return next(args);
	});
};
