/** Repeatable spotlight tour through Settings + chat autocomplete. */
import { Seidr } from "../seidr";
import { rmIsShown } from "../roomManager/model";
import { seidrCloseSettings, seidrOpenSettings } from "./shell";
import { seidrSelectSettingsTab } from "./ui";

type TourStep = {
	title: string;
	/** One or more paragraphs shown in the tour card. */
	blocks: string[];
	/** Skip step when false. */
	when?: () => boolean;
	prepare?: () => void;
	target?: () => HTMLElement | null;
	cleanup?: () => void;
};

var tourRoot: HTMLElement | null = null;
var tourHole: HTMLElement | null = null;
var tourCard: HTMLElement | null = null;
var tourIndex = 0;
var tourSteps: TourStep[] = [];
var tourActive = false;
var tourPrefill: { el: HTMLTextAreaElement | HTMLInputElement; prev: string } | null = null;
var tourOnKey: ((ev: KeyboardEvent) => void) | null = null;
var tourOnResize: (() => void) | null = null;
var tourLayoutTimer: ReturnType<typeof setTimeout> | null = null;
/** When true, seidrCloseSettings must not end the tour (autocomplete step). */
var tourQuietClose = false;

function $(sel: string): HTMLElement | null {
	return document.querySelector(sel);
}

function openDetails(tourId: string) {
	const el = $('[data-seidr-tour="' + tourId + '"]') as HTMLDetailsElement | null;
	if (el && el.tagName === "DETAILS") el.open = true;
}

function closeOtherGeneralDetails(keepTourId: string) {
	const pane = document.getElementById("seidr-settings-pane-general");
	if (!pane) return;
	pane.querySelectorAll("details.seidr-settings-sec").forEach(function (d) {
		const det = d as HTMLDetailsElement;
		const id = det.getAttribute("data-seidr-tour");
		det.open = id === keepTourId;
	});
}

function scrollTarget(el: HTMLElement | null) {
	if (!el) return;
	const body = document.getElementById("seidr-settings-body");
	if (body && body.contains(el)) {
		const br = body.getBoundingClientRect();
		const er = el.getBoundingClientRect();
		body.scrollTop += er.top - br.top - 16;
		return;
	}
	try {
		el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
	} catch (e) {
		try { el.scrollIntoView(true); } catch (e2) { /* ignore */ }
	}
}

function chatInput(): HTMLTextAreaElement | HTMLInputElement | null {
	const el = document.getElementById("InputChat");
	if (!el) return null;
	if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
	return null;
}

function clearPrefill() {
	if (!tourPrefill) return;
	try {
		tourPrefill.el.value = tourPrefill.prev;
	} catch (e) { /* ignore */ }
	tourPrefill = null;
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function ensureTourDom() {
	if (tourRoot && document.body.contains(tourRoot)) return;
	tourRoot = document.createElement("div");
	tourRoot.id = "seidr-tour";
	tourRoot.setAttribute("hidden", "true");
	tourRoot.innerHTML = [
		'<div class="seidr-tour-hole" aria-hidden="true"></div>',
		'<div class="seidr-tour-card" role="dialog" aria-modal="true">',
		'  <div class="seidr-tour-card-head">',
		'    <span class="seidr-tour-card-title"></span>',
		'    <span class="seidr-tour-card-step"></span>',
		"  </div>",
		'  <div class="seidr-tour-card-body"></div>',
		'  <div class="seidr-tour-card-actions">',
		'    <button type="button" class="seidr-act-btn" data-seidr-tour="skip">Skip</button>',
		'    <span class="seidr-tour-card-spacer"></span>',
		'    <button type="button" class="seidr-act-btn" data-seidr-tour="back">Back</button>',
		'    <button type="button" class="seidr-act-btn seidr-tour-primary" data-seidr-tour="next">Next</button>',
		"  </div>",
		"</div>",
	].join("");
	document.body.appendChild(tourRoot);
	tourHole = tourRoot.querySelector(".seidr-tour-hole") as HTMLElement;
	tourCard = tourRoot.querySelector(".seidr-tour-card") as HTMLElement;
	tourRoot.querySelector('[data-seidr-tour="skip"]')!.addEventListener("click", function () {
		seidrStopTutorial();
	});
	tourRoot.querySelector('[data-seidr-tour="back"]')!.addEventListener("click", function () {
		seidrTourGo(-1);
	});
	tourRoot.querySelector('[data-seidr-tour="next"]')!.addEventListener("click", function () {
		seidrTourGo(1);
	});
}

function buildSteps(): TourStep[] {
	const showActions = Seidr.SHOW_ACTIONS !== false;
	const showCommands = Seidr.SHOW_COMMANDS !== false;
	const showAnimations = Seidr.SHOW_COMMANDS !== false;
	const showMaps = rmIsShown();

	const steps: TourStep[] = [
		{
			title: "Welcome",
			blocks: [
				"Seidr adds shared holds, undress, custom Activity Menu actions, animations, and chat commands on top of Bondage Club.",
				"Open this panel anytime with /seidr, or Preference → Extensions → Seidr.",
				"This short tour walks through the main settings and how chat autocomplete works. Skip anytime with Skip or Esc.",
			],
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("general");
			},
			target: function () {
				return document.getElementById("seidr-settings-panel");
			},
		},
		{
			title: "Holds & Undress",
			blocks: [
				"Holds live on Item Torso in the Club Activity menu: Pull Left, Pull Right, Cuddle, Remove Left/Right/Cuddle, and Leave.",
				"Pull slides someone beside you; Cuddle stacks them in front. Both of you need Seidr for the shared pose to sync.",
				"Undress activities appear on clothing zones (and Undress all when available). Echo cuddle/pull tokens make Seidr yield that hold so Echo can take over.",
			],
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("general");
			},
			target: function () {
				return document.getElementById("seidr-settings-tabs")
					|| document.getElementById("seidr-settings-panel");
			},
		},
		{
			title: "Fast Open",
			blocks: [
				"Fast Open jumps straight into Club Activity View without hunting the character menu.",
				"Enable it, pick a keyboard modifier (Shift/Ctrl/Alt/Cmd) and a default Item* slot (e.g. Item Torso).",
				"Hold that modifier and click someone in the room. If FAM also uses Shift-click, pick a different modifier here.",
			],
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("general");
				closeOtherGeneralDetails("fast-open");
				openDetails("fast-open");
			},
			target: function () {
				const d = $('[data-seidr-tour="fast-open"]');
				return (d && d.querySelector("summary")) as HTMLElement || d;
			},
		},
		{
			title: "Command toggles",
			blocks: [
				"This General → Commands section turns each slash command on or off. Off means it is not registered and chat ignores it.",
				"Keep /seidr on so you can always reopen settings. /a, /strip, /poses, /animation, and /roommanager can be toggled to taste.",
				"Fast Select (when shown): type a letter then Tab to jump into a command. Empty Tab picks what bare Tab does. Last successful /a /strip /poses target is preferred in member autocomplete.",
			],
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("general");
				closeOtherGeneralDetails("commands-enable");
				openDetails("commands-enable");
			},
			target: function () {
				const d = $('[data-seidr-tour="commands-enable"]');
				return (d && d.querySelector("summary")) as HTMLElement || d;
			},
		},
		{
			title: "Commands — People",
			blocks: [
				"People are short aliases for Member Numbers. Add someone once, then type their alias in /a instead of the full number.",
				"Click Add person, set Alias (the name you type) and Member number, then Save person. Pick existing entries from the Person dropdown to edit or delete.",
				"Aliases also help when several people share a display name — Seidr resolves the Member ID you saved.",
			],
			when: function () { return showCommands; },
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("commands");
				const people = $('[data-seidr-tour="cmd-people"]') as HTMLDetailsElement | null;
				const actions = $('[data-seidr-tour="cmd-actions"]') as HTMLDetailsElement | null;
				if (people) people.open = true;
				if (actions) actions.open = false;
			},
			target: function () {
				const d = $('[data-seidr-tour="cmd-people"]');
				return (d && d.querySelector("summary")) as HTMLElement || d
					|| document.getElementById("seidr-settings-pane-commands");
			},
		},
		{
			title: "Commands — Actions",
			blocks: [
				"Actions are named shortcuts to a Club / Seidr / mod activity on a body slot. You call them with /a <person> <action-name>.",
				"Click Add action, then set: Name (what you type after the person), Slot (e.g. ItemTorso), and Activity (the menu entry on that slot). Save action when done.",
				"Pick Slot first — the Activity list only shows what that zone can run. Edit or delete via the Action dropdown. /strip and /poses do not need these bindings.",
			],
			when: function () { return showCommands; },
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("commands");
				const people = $('[data-seidr-tour="cmd-people"]') as HTMLDetailsElement | null;
				const actions = $('[data-seidr-tour="cmd-actions"]') as HTMLDetailsElement | null;
				if (people) people.open = false;
				if (actions) actions.open = true;
			},
			target: function () {
				const d = $('[data-seidr-tour="cmd-actions"]');
				return (d && d.querySelector("summary")) as HTMLElement || d
					|| document.getElementById("seidr-settings-pane-commands");
			},
		},
		{
			title: "Autocomplete",
			blocks: [
				"In chat, type /a then space and press Tab. A list of people (aliases + room) appears; arrows or W/S move, Enter or E accepts, Esc closes.",
				"After a person, Tab again for your saved Actions. The same Tab flow works for /strip, /poses (/p), and /animation (/ani).",
				"Fast Select: with a letter then Tab (when enabled) you jump into that command. A sample /a  is prefilled — do not send; Next clears it.",
			],
			prepare: function () {
				clearPrefill();
				tourQuietClose = true;
				try { seidrCloseSettings(); } finally { tourQuietClose = false; }
				const input = chatInput();
				if (input) {
					tourPrefill = { el: input, prev: input.value || "" };
					input.value = "/a ";
					try { input.focus(); } catch (e) { /* ignore */ }
				}
			},
			target: function () {
				return chatInput() || document.getElementById("InputChat");
			},
			cleanup: function () {
				clearPrefill();
			},
		},
		{
			title: "Actions tab",
			blocks: [
				"Custom Actions appear in the Club Activity Menu (up to 50). They are separate from Commands → Actions (those are /a shortcuts).",
				"Each entry can have chat lines, audience conditions, icons, sound, pose, and arousal effects. Use the dropdown to pick an entry; Save when you edit.",
				"Export / import shares your bag with another character or friend. See About → Custom Actions docs for the full condition list.",
			],
			when: function () { return showActions; },
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("actions");
			},
			target: function () {
				return document.querySelector('[data-seidr-tab="actions"]') as HTMLElement
					|| document.getElementById("seidr-settings-pane-actions");
			},
		},
		{
			title: "Animations",
			blocks: [
				"Animations are pose and expression clips that play on you (not room-synced poses for others).",
				"Author clips under this tab — frames, timing, face expressions. Give each a clear name.",
				"Play with /animation <name> or /ani <name>. Tab autocomplete lists names you defined.",
			],
			when: function () { return showAnimations; },
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("animations");
			},
			target: function () {
				return document.querySelector('[data-seidr-tab="animations"]') as HTMLElement
					|| document.getElementById("seidr-settings-pane-animations");
			},
		},
		{
			title: "Maps",
			blocks: [
				"When Room Manager is active, Maps holds map versions and related presets for building or restoring rooms.",
				"Default may sync through ExtensionSettings; other named versions stay in localStorage on this browser.",
				"Use Room Manager (⌂ or ChatAdmin) to apply backgrounds, access lists, and map series — this tab is storage and version control.",
			],
			when: function () { return showMaps; },
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("maps");
			},
			target: function () {
				return document.querySelector('[data-seidr-tab="maps"]') as HTMLElement
					|| document.getElementById("seidr-settings-pane-maps");
			},
		},
		{
			title: "Done",
			blocks: [
				"About has docs links and feature summaries. Run Tutorial again anytime from About → Tutorial.",
				"Quick reminders: /seidr opens settings; holds need Seidr on both sides; /a uses People + Actions you set up.",
				"Enjoy Seidr.",
			],
			prepare: function () {
				seidrOpenSettings();
				seidrSelectSettingsTab("about");
			},
			target: function () {
				return document.querySelector('[data-seidr-tab="about"]') as HTMLElement
					|| document.getElementById("seidr-settings-pane-about");
			},
		},
	];
	return steps.filter(function (s) {
		return !s.when || s.when();
	});
}

/** Clamp spotlight to the visible part of the target (avoids huge misaligned holes). */
function positionHole(el: HTMLElement | null) {
	if (!tourHole) return;
	if (!el) {
		tourHole.style.display = "none";
		return;
	}
	const pad = 6;
	const r = el.getBoundingClientRect();
	const maxH = Math.min(window.innerHeight * 0.42, 280);
	const top = Math.max(4, r.top - pad);
	const left = Math.max(4, r.left - pad);
	const width = Math.min(window.innerWidth - left - 4, Math.max(40, r.width + pad * 2));
	let height = Math.max(28, r.height + pad * 2);
	if (height > maxH) height = maxH;
	if (top + height > window.innerHeight - 4) {
		height = Math.max(28, window.innerHeight - 4 - top);
	}
	tourHole.style.display = "block";
	tourHole.style.left = left + "px";
	tourHole.style.top = top + "px";
	tourHole.style.width = width + "px";
	tourHole.style.height = height + "px";
}

function positionCard(el: HTMLElement | null) {
	if (!tourCard) return;
	const margin = 14;
	const cw = tourCard.offsetWidth || 380;
	const ch = tourCard.offsetHeight || 200;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	let left = (vw - cw) / 2;
	let top = Math.max(8, vh - ch - 20);

	if (el) {
		const r = el.getBoundingClientRect();
		const holeBottom = Math.min(r.bottom, (parseFloat(tourHole?.style.top || "0") || r.top) + (parseFloat(tourHole?.style.height || "0") || r.height));
		const holeTop = Math.max(r.top, parseFloat(tourHole?.style.top || String(r.top)) || r.top);
		const below = holeBottom + margin;
		const above = holeTop - ch - margin;
		if (below + ch <= vh - 8) top = below;
		else if (above >= 8) top = above;
		else top = Math.min(vh - ch - 8, Math.max(8, (vh - ch) / 2));

		// Prefer aligning under the hole; if that clips, center horizontally.
		left = Math.min(vw - cw - 8, Math.max(8, r.left));
		if (left + cw > vw - 8) left = Math.max(8, vw - cw - 8);
	}

	tourCard.style.left = left + "px";
	tourCard.style.top = top + "px";
}

function layoutSpotlight(step: TourStep) {
	const target = step.target ? step.target() : null;
	scrollTarget(target);
	positionHole(target);
	positionCard(target);
	// Second pass after scroll/details expand settles (fixes step 4 misalignment).
	if (tourLayoutTimer) clearTimeout(tourLayoutTimer);
	tourLayoutTimer = setTimeout(function () {
		tourLayoutTimer = null;
		if (!tourActive) return;
		const t2 = step.target ? step.target() : null;
		scrollTarget(t2);
		positionHole(t2);
		positionCard(t2);
	}, 80);
}

function renderStep() {
	if (!tourActive || !tourRoot || !tourCard) return;
	const step = tourSteps[tourIndex];
	if (!step) {
		seidrStopTutorial();
		return;
	}
	if (step.prepare) {
		try { step.prepare(); } catch (e) { console.warn("[Seidr] tour step", e); }
	}
	const title = tourCard.querySelector(".seidr-tour-card-title") as HTMLElement | null;
	const body = tourCard.querySelector(".seidr-tour-card-body") as HTMLElement | null;
	const stepEl = tourCard.querySelector(".seidr-tour-card-step") as HTMLElement | null;
	const nextBtn = tourCard.querySelector('[data-seidr-tour="next"]') as HTMLButtonElement | null;
	const backBtn = tourCard.querySelector('[data-seidr-tour="back"]') as HTMLButtonElement | null;
	if (title) title.textContent = step.title;
	if (body) {
		body.innerHTML = (step.blocks || []).map(function (b) {
			return '<p class="seidr-tour-card-block">' + escapeHtml(b) + "</p>";
		}).join("");
	}
	if (stepEl) stepEl.textContent = (tourIndex + 1) + " / " + tourSteps.length;
	if (backBtn) backBtn.disabled = tourIndex <= 0;
	if (nextBtn) nextBtn.textContent = tourIndex >= tourSteps.length - 1 ? "Finish" : "Next";

	requestAnimationFrame(function () {
		requestAnimationFrame(function () {
			layoutSpotlight(step);
		});
	});
}

function seidrTourGo(delta: number) {
	if (!tourActive) return;
	const next = tourIndex + delta;
	if (next < 0) return;
	if (next >= tourSteps.length) {
		seidrStopTutorial();
		return;
	}
	const leaving = tourSteps[tourIndex];
	if (leaving && leaving.cleanup) {
		try { leaving.cleanup(); } catch (e) { /* ignore */ }
	}
	tourIndex = next;
	renderStep();
}

export function seidrTourIsQuietClose(): boolean {
	return tourQuietClose;
}

export function seidrStopTutorial(): void {
	if (!tourActive && !tourRoot) return;
	tourActive = false;
	const step = tourSteps[tourIndex];
	if (step && step.cleanup) {
		try { step.cleanup(); } catch (e) { /* ignore */ }
	}
	clearPrefill();
	tourQuietClose = false;
	tourSteps = [];
	tourIndex = 0;
	if (tourLayoutTimer) {
		clearTimeout(tourLayoutTimer);
		tourLayoutTimer = null;
	}
	if (tourOnKey) {
		document.removeEventListener("keydown", tourOnKey, true);
		tourOnKey = null;
	}
	if (tourOnResize) {
		window.removeEventListener("resize", tourOnResize);
		tourOnResize = null;
	}
	if (tourRoot) {
		tourRoot.setAttribute("hidden", "true");
	}
}

export function seidrStartTutorial(): void {
	seidrStopTutorial();
	ensureTourDom();
	if (!tourRoot) return;
	tourSteps = buildSteps();
	if (!tourSteps.length) return;
	tourActive = true;
	tourIndex = 0;
	tourRoot.removeAttribute("hidden");
	tourOnKey = function (ev: KeyboardEvent) {
		if (!tourActive) return;
		if (ev.key === "Escape") {
			ev.preventDefault();
			ev.stopPropagation();
			seidrStopTutorial();
			return;
		}
		if (ev.key === "ArrowRight") {
			ev.preventDefault();
			seidrTourGo(1);
		}
		if (ev.key === "ArrowLeft") {
			ev.preventDefault();
			seidrTourGo(-1);
		}
	};
	document.addEventListener("keydown", tourOnKey, true);
	tourOnResize = function () {
		if (!tourActive) return;
		const step = tourSteps[tourIndex];
		if (step) layoutSpotlight(step);
	};
	window.addEventListener("resize", tourOnResize);
	renderStep();
}

Seidr.startTutorial = seidrStartTutorial;
Seidr.stopTutorial = seidrStopTutorial;
Seidr.tourIsQuietClose = seidrTourIsQuietClose;
