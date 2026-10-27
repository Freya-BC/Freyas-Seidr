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
		blurb: "Pull Left / Right, Cuddle, Remove, and Leave on Item Torso — shared poses for Seidr peers.",
		docPath: "/docs/HOLDS.md",
	},
	{
		title: "Undress",
		blurb: "Clothing-zone undress activities, including Echo layers and Undress all when available.",
		docPath: "/docs/UNDRESS.md",
	},
	{
		title: "Custom Actions",
		blurb: "Up to 50 Activity Menu entries with chat lines, conditions, icons, sound, pose, and export/import.",
		docPath: "/docs/ACTIONS.md",
	},
	{
		title: "Animations",
		blurb: "Pose and face clips for you. Author under Animations; play with /animation or /ani.",
		docPath: "/docs/ANIMATIONS.md",
	},
	{
		title: "Chat Commands",
		blurb: "/a bindings, /strip /stripe, /poses /p, /animation /ani, /seidr, and /roommanager — with Tab autocomplete.",
		docPath: "/docs/COMMANDS.md",
	},
	{
		title: "Fast Open",
		blurb: "Modifier-click a room character to open Club Activity View on a preferred Item* slot.",
		docPath: "/docs/SETTINGS.md",
	},
	{
		title: "Room Manager",
		blurb: "Admin panel for room definitions, access lists, backgrounds, and map series.",
		docPath: "/docs/ROOM_MANAGER.md",
	},
	{
		title: "Maps",
		blurb: "Map versions: Default can sync remotely; other versions stay local. Manage under Settings → Maps.",
		docPath: "/docs/ROOM_MANAGER.md",
	},
	{
		title: "Drawing, Arousal & Storage",
		blurb: "Hold drawing offsets, arousal bar modes, and ExtensionSettings usage vs the soft cap.",
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
		'<a class="seidr-act-btn" href="' + escapeHtml(home) + '" target="_blank" rel="noopener noreferrer">Documentation</a>',
		'<a class="seidr-act-btn" href="' + escapeHtml(repo) + '" target="_blank" rel="noopener noreferrer">GitHub</a>',
		"</div>",
		"</div>",
		"</div>",
		'<details class="seidr-settings-sec" open>',
		"<summary>Documentation</summary>",
		'<p class="seidr-settings-hint">Short summaries below. More opens the full player guide on GitHub Pages.</p>',
		ABOUT_FEATURES.map(featureCard).join(""),
		"</details>",
	].join("");
}
