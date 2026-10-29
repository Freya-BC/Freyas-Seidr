/** Settings → About tab: version, developer, feature docs links */
import { Seidr } from "../seidr";

type AboutFeature = {
	title: string;
	blurb: string;
	/** Path under DOCS_BASE_URL, e.g. /docs/HOLDS.md */
	docPath: string;
};

const ABOUT_FEATURES: AboutFeature[] = [
	{
		title: "Holds",
		blurb:
			"Pull Left / Right, Cuddle, Remove, and Leave on Item Torso — shared poses when both of you run Seidr. Void disconnect keeps seats about 45s so a quick rejoin can restore the pile.",
		docPath: "/docs/HOLDS.md",
	},
	{
		title: "Undress",
		blurb:
			"Strip clothing from the Activity Menu on the matching zone (hands required). Echo layers and Undress all appear when those groups exist; the target does not need Seidr.",
		docPath: "/docs/UNDRESS.md",
	},
	{
		title: "Custom Actions",
		blurb:
			"Up to 50 Club Activity Menu entries with your own chat lines, conditions, icons, sound, and pose. Separate from Commands → Actions (those are /a chat shortcuts).",
		docPath: "/docs/ACTIONS.md",
	},
	{
		title: "Animations",
		blurb:
			"Pose and face clips that play on you only. Author them under Animations, then run /animation or /ani (Tab lists your names).",
		docPath: "/docs/ANIMATIONS.md",
	},
	{
		title: "Chat Commands",
		blurb:
			"People aliases and /a action bindings, plus /strip, /poses, /animation, /seidr, and /roommanager. Tab autocomplete and optional Fast Select (letter + Tab) speed things up.",
		docPath: "/docs/COMMANDS.md",
	},
	{
		title: "Fast Open",
		blurb:
			"Hold a modifier and click a room character to open Club Activity View on your preferred Item* slot. Change the modifier if FAM also uses Shift-click.",
		docPath: "/docs/SETTINGS.md",
	},
	{
		title: "Room Manager",
		blurb:
			"Admin panel for room definitions, access lists, backgrounds, and map series. Open with /roommanager or the floating ⌂ when you are room admin.",
		docPath: "/docs/ROOM_MANAGER.md",
	},
	{
		title: "Maps",
		blurb:
			"Map versions under Settings → Maps / Room Manager. Only Default can sync with your account; other versions stay local to this browser.",
		docPath: "/docs/ROOM_MANAGER.md",
	},
	{
		title: "Drawing, Arousal & Storage",
		blurb:
			"Pull/cuddle drawing offsets, cluster Names modes (Hitbox/Hover/Hide), arousal bar modes, and ExtensionSettings usage vs the soft cap.",
		docPath: "/docs/SETTINGS.md",
	},
];

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function docsBase(): string {
	const base = typeof Seidr.DOCS_BASE_URL === "string" && Seidr.DOCS_BASE_URL
		? Seidr.DOCS_BASE_URL
		: "https://freya-bc.github.io/Freyas-Seidr";
	return base.replace(/\/$/, "");
}

function docsUrl(path: string): string {
	const p = path.charAt(0) === "/" ? path : "/" + path;
	return docsBase() + p;
}

function featureCard(f: AboutFeature): string {
	const href = docsUrl(f.docPath);
	return [
		'<div class="seidr-settings-sec seidr-about-feature">',
		'<div class="seidr-about-feature-head">',
		'<span class="seidr-about-feature-title">' + escapeHtml(f.title) + "</span>",
		'<a class="seidr-act-btn" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">More</a>',
		"</div>",
		'<p class="seidr-settings-hint">' + escapeHtml(f.blurb) + "</p>",
		"</div>",
	].join("");
}

export function seidrBuildAboutTab(container: HTMLElement) {
	const version = String(Seidr.VERSION || "—");
	const name = String(Seidr.FULL_NAME || "Seidr");
	const logo = typeof Seidr.LOGO_URL === "string" && Seidr.LOGO_URL ? Seidr.LOGO_URL : "";
	const home = docsBase() + "/";
	const repo = typeof Seidr.REPO_URL === "string" && Seidr.REPO_URL
		? Seidr.REPO_URL
		: "https://github.com/Freya-BC/Freyas-Seidr";

	container.innerHTML = [
		'<div class="seidr-settings-sec seidr-about-header">',
		logo
			? '<img class="seidr-about-logo" src="' + escapeHtml(logo) + '" alt="" width="56" height="56" />'
			: "",
		'<div class="seidr-about-header-text">',
		'<p class="seidr-about-name">' + escapeHtml(name) + "</p>",
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Version</span>',
		"<span>" + escapeHtml(version) + "</span>",
		"</div>",
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Developer</span>',
		"<span>Freya</span>",
		"</div>",
		'<div class="seidr-about-links">',
		'<button type="button" class="seidr-act-btn" id="seidr-about-tutorial">Tutorial</button>',
		'<a class="seidr-act-btn" href="' + escapeHtml(home) + '" target="_blank" rel="noopener noreferrer">Documentation</a>',
		'<a class="seidr-act-btn" href="' + escapeHtml(repo) + '" target="_blank" rel="noopener noreferrer">GitHub</a>',
		"</div>",
		"</div>",
		"</div>",
		'<details class="seidr-settings-sec" open>',
		"<summary>Documentation</summary>",
		'<p class="seidr-settings-hint">Short summaries below. More opens the full player guide on GitHub Pages. Use Tutorial (above) anytime for a guided walkthrough of Settings and chat autocomplete.</p>',
		ABOUT_FEATURES.map(featureCard).join(""),
		"</details>",
	].join("");

	const tutBtn = container.querySelector("#seidr-about-tutorial") as HTMLButtonElement | null;
	if (tutBtn) {
		tutBtn.addEventListener("click", function () {
			if (typeof Seidr.startTutorial === "function") Seidr.startTutorial();
		});
	}
}
