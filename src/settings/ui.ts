/** Seidr settings panel body */
import { Seidr } from "../seidr";

declare const Player: any;
import {
	AROUSAL_BAR_MODES,
	AROUSAL_BAR_SCOPES,
	CLUSTER_NAME_MODES,
	CLUSTER_NAME_SCOPES,
	FAST_OPEN_MODIFIERS,
	RM_LAUNCHER_POSITIONS,
	seidrCloneDrawAdvancedOffsets,
	seidrCloneDrawOffsets,
	seidrDefaultDrawAdvancedOffsets,
	seidrDefaultDrawOffsets,
	seidrDefaultMapDrawOffsets,
	seidrNormalizeDrawAdvancedOffsets,
	seidrNormalizeDrawOffsets,
	SEIDR_CHAT_FONT_SIZE_MAX,
	SEIDR_CHAT_FONT_SIZE_MIN,
	SEIDR_DRAW_OFFSET_MAX,
	SEIDR_DRAW_OFFSET_MIN,
	seidrNormalizeChatFontSize,
	type RmLauncherPosition,
	type SeidrArousalBarMode,
	type SeidrArousalBarScope,
	type SeidrClusterNameMode,
	type SeidrClusterNameScope,
	type SeidrDrawAdvancedOffsets,
	type SeidrDrawAdvancedRole,
	type SeidrDrawOffsets,
	type SeidrFastOpenModifier,
} from "./model";
import { seidrRestraintSlots } from "../actions/model";
import {
	seidrApplyDrawAdvancedMode,
	seidrApplyDrawAdvancedOffsets,
	seidrApplyDrawAllowSync,
	seidrApplyDrawOffsets,
	seidrApplyMapDrawOffsets,
} from "./drawOffsets";
import { seidrGetSettings, seidrSaveSettings } from "./storage";
import { seidrRunGiveAllItems } from "./cheats";
import { SeidrState } from "../state";
import { seidrApplyChatFont } from "./chatFont";
import { seidrBuildActionsTab, seidrRefreshActionsTab } from "../actions/ui";
import { seidrBuildAnimationsTab, seidrRefreshAnimationsTab } from "../animations/ui";
import {
	SEIDR_CMD_ENABLE_LABELS,
	SEIDR_FAST_SELECT_EMPTY_OPTS,
	SEIDR_FAST_SELECT_KEY_LABELS,
	seidrNormalizeCmdEnabled,
	seidrNormalizeFastSelectEmpty,
	seidrNormalizeFastSelectKeys,
	type SeidrCmdEnableKey,
	type SeidrFastSelectEmpty,
	type SeidrFastSelectKey,
} from "../commands/model";
import { seidrBeepReplyRescan, seidrBeepReplyStrip } from "../commands/beepReply";
import { seidrBuildCommandsTab, seidrRefreshCommandsTab } from "../commands/ui";
import { seidrGetCommandsBag, seidrSaveCommandsBag } from "../commands/store";
import { rmFormatBytes, rmUsageBreakdown } from "../roomManager/storage";
import { rmIsShown } from "../roomManager/model";
import { seidrBuildMapsTab, seidrRefreshMapsTab } from "../roomManager/mapsUi";
import { rmLocalMapsStats } from "../roomManager/maps";
import { seidrBuildAboutTab } from "./about";

function $(id: string): HTMLElement | null {
	return document.getElementById(id);
}

/** Draft Drawing offsets while Settings is open (Save persists). */
let drawDraft: SeidrDrawOffsets | null = null;
let drawAdvDraft: SeidrDrawAdvancedOffsets | null = null;
let drawAdvancedModeDraft = false;
let drawAllowSyncDraft = false;
let drawDirty = false;

/** Draft Map Cuddle offsets (Pull/Cuddle only — no Advanced / Sync). */
let mapDrawDraft: SeidrDrawOffsets | null = null;
let mapDrawDirty = false;

const ADV_ROLES: SeidrDrawAdvancedRole[] = ["left", "right", "cuddle", "hub"];
const ADV_ROLE_LABELS: Record<SeidrDrawAdvancedRole, string> = {
	left: "Left",
	right: "Right",
	cuddle: "Cuddle",
	hub: "Hub",
};

function drawNumInput(id: string, min: string, max: string): string {
	return [
		'<span class="seidr-num-wrap">',
		'<input type="number" class="seidr-settings-num" id="' + id + '" min="' + min +
		'" max="' + max + '" step="1" />',
		'<span class="seidr-num-spin" aria-hidden="true">',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="1" tabindex="-1" title="Increase">▲</button>',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="-1" tabindex="-1" title="Decrease">▼</button>',
		"</span>",
		"</span>",
	].join("");
}

function poseRow(id: string, label: string): string {
	const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
	const max = String(SEIDR_DRAW_OFFSET_MAX);
	return [
		'<div class="seidr-settings-draw-row" data-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		drawNumInput("seidr-set-draw-" + id + "-x", xMin, max),
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		drawNumInput("seidr-set-draw-" + id + "-y", String(SEIDR_DRAW_OFFSET_MIN), max),
		"</label>",
		'<button type="button" data-draw-reset="' + id + '">Reset</button>',
		"</div>",
	].join("");
}

function advPoseRow(id: SeidrDrawAdvancedRole, label: string): string {
	const min = String(SEIDR_DRAW_OFFSET_MIN);
	const max = String(SEIDR_DRAW_OFFSET_MAX);
	return [
		'<div class="seidr-settings-draw-row" data-adv-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		drawNumInput("seidr-set-draw-adv-" + id + "-x", min, max),
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		drawNumInput("seidr-set-draw-adv-" + id + "-y", min, max),
		"</label>",
		'<button type="button" data-draw-adv-reset="' + id + '">Reset</button>',
		"</div>",
	].join("");
}

function mapPoseRow(id: string, label: string): string {
	const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
	const max = String(SEIDR_DRAW_OFFSET_MAX);
	return [
		'<div class="seidr-settings-draw-row" data-map-pose="' + id + '">',
		'<span class="seidr-settings-draw-label">' + label + "</span>",
		'<label class="seidr-settings-draw-field">X',
		drawNumInput("seidr-set-map-draw-" + id + "-x", xMin, max),
		"</label>",
		'<label class="seidr-settings-draw-field">Y',
		drawNumInput("seidr-set-map-draw-" + id + "-y", String(SEIDR_DRAW_OFFSET_MIN), max),
		"</label>",
		'<button type="button" data-map-draw-reset="' + id + '">Reset</button>',
		"</div>",
	].join("");
}

function seidrBuildGeneralHtml(): string {
	const opts = RM_LAUNCHER_POSITIONS.map(function (p) {
		return '<option value="' + p.id + '">' + p.label + "</option>";
	}).join("");
	const modeOpts = AROUSAL_BAR_MODES.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const scopeOpts = AROUSAL_BAR_SCOPES.map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	const nameOpts = CLUSTER_NAME_MODES.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const nameScopeOpts = CLUSTER_NAME_SCOPES.map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	const modOpts = FAST_OPEN_MODIFIERS.map(function (m) {
		return '<option value="' + m.id + '">' + m.label + "</option>";
	}).join("");
	const slotOpts = seidrRestraintSlots().map(function (s) {
		return '<option value="' + s.id + '">' + s.label + "</option>";
	}).join("");
	return [
		'<details class="seidr-settings-sec" data-seidr-tour="fast-open">',
		"<summary>Fast Open Actions</summary>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-fast-open" /> Enable Fast Open Actions</label>',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Modifier</span>',
		'<select id="seidr-set-fast-open-mod">' + modOpts + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Default slot</span>',
		'<select id="seidr-set-fast-open-slot">' + slotOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Hold the modifier and click a room or map character to open Club Activity View on the default slot (falls back if that zone has no activities). If FAM Shift-click is installed, pick another modifier or disable this.</p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Room Manager</summary>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-rm-enabled" /> Activate Room Manager</label>',
		"</div>",
		'<p class="seidr-settings-hint">Master switch for Room Manager (ChatAdmin button and floating quickmenu).</p>',
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-quickmenu" /> Show Quickmenu Button</label>',
		"</div>",
		'<p class="seidr-settings-hint">Floating ⌂ in the chat room. Off hides it completely. ChatAdmin Room Manager button is unaffected.</p>',
		'<div class="seidr-settings-row">',
		'<button type="button" id="seidr-set-open-rm">Open Room Manager</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-open-rm-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Launcher position</summary>",
		'<div class="seidr-settings-row">',
		'<select id="seidr-set-rm-pos">' + opts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Drawing</summary>",
		'<p class="seidr-settings-hint">Echo pair spacing: Pull X is half-gap from center (hub shifts on one-side pull). Pull Y raises both sides. Cuddle moves the holder. Models only — hitboxes stay put. Save Drawing to keep.</p>',
		'<div id="seidr-set-draw-normal" class="seidr-settings-draw-block">',
		poseRow("pull", "Pull"),
		poseRow("cuddle", "Cuddle"),
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:12px;">',
		'<label class="seidr-settings-check"><input type="checkbox" id="seidr-set-draw-advanced" /> Advanced Mode</label>',
		"</div>",
		'<p class="seidr-settings-hint seidr-settings-draw-warn">Advanced Mode and Sync are expert tools for private rooms, screenshots, and posed scenes. Do not use them in public rooms — they will look wrong or confusing to others.</p>',
		'<div id="seidr-set-draw-advanced-block" class="seidr-settings-draw-block seidr-settings-draw-disabled">',
		'<p class="seidr-settings-hint">Free-draw each role from the shared center (X/Y). When Advanced is on, normal Pull/Cuddle above is ignored.</p>',
		advPoseRow("left", ADV_ROLE_LABELS.left),
		advPoseRow("right", ADV_ROLE_LABELS.right),
		advPoseRow("cuddle", ADV_ROLE_LABELS.cuddle),
		advPoseRow("hub", ADV_ROLE_LABELS.hub),
		"</div>",
		'<div class="seidr-settings-row" style="margin-top:12px;">',
		'<label class="seidr-settings-check"><input type="checkbox" id="seidr-set-draw-allow-sync" /> Allow Sync</label>',
		'<button type="button" id="seidr-set-draw-sync" disabled>Sync</button>',
		"</div>",
		'<p class="seidr-settings-hint">Allow Sync: apply hub draw overlays while you are in that cuddle (session only — does not change your saved Drawing). As hub, Sync (and auto-send on hold changes) broadcasts your current layout. Spoofed non-hub messages are ignored.</p>',
		'<p class="seidr-settings-hint" id="seidr-set-draw-sync-hint"></p>',
		'<div class="seidr-settings-field-row" style="margin-top:10px;">',
		'<span class="seidr-settings-field-label">Names</span>',
		'<select id="seidr-set-cluster-names">' + nameOpts + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Who</span>',
		'<select id="seidr-set-cluster-name-scope">' + nameScopeOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Nickname DrawText only (raised and centered over the arousal bar). Seidr holds = hub / pull / cuddle. Everyone = all seats including Echo pairs. Hitbox always shows; Hover only while the cursor is on that natural seat; Hide never. Does not change status icons or art.</p>',
		'<div class="seidr-settings-row seidr-settings-draw-actions">',
		'<button type="button" id="seidr-set-draw-save">Save Drawing</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-draw-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Map Cuddle</summary>",
		'<p class="seidr-settings-hint">Map-room only. Pull / Cuddle offsets (−400…400), scaled by map zoom. Hub stays on its tile. No Advanced Mode or Sync. Activity / restraint menus are unchanged. Save Map Cuddle to keep.</p>',
		'<div id="seidr-set-map-draw-normal" class="seidr-settings-draw-block">',
		mapPoseRow("pull", "Pull"),
		mapPoseRow("cuddle", "Cuddle"),
		"</div>",
		'<div class="seidr-settings-row seidr-settings-draw-actions">',
		'<button type="button" id="seidr-set-map-draw-save">Save Map Cuddle</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-map-draw-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Arousal bars</summary>",
		'<p class="seidr-settings-hint">Hide or relocate Club / BCTweaks arousal meters (on-character thermometer and split orgasm track).</p>',
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Mode</span>',
		'<select id="seidr-set-arousal-mode">' + modeOpts + "</select>",
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Who</span>',
		'<select id="seidr-set-arousal-scope">' + scopeOpts + "</select>",
		"</div>",
		'<p class="seidr-settings-hint">Seidr holds = hub, pull left/right, or cuddle. Show on change: bar appears when arousal moves, hides 1s after. Bottom bar: under each name inside the character hitbox (two slots; BCTweaks fills both).</p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Chat font</summary>",
		'<div class="seidr-settings-field-row">',
		'<span class="seidr-settings-field-label">Font</span>',
		'<input type="text" id="seidr-set-chat-font" maxlength="64" autocomplete="off" spellcheck="false" placeholder="e.g. Georgia (empty = Club default)" />',
		"</div>",
		'<div class="seidr-settings-field-row" style="margin-top:8px;">',
		'<span class="seidr-settings-field-label">Size</span>',
		'<span class="seidr-num-wrap">',
		'<input type="number" class="seidr-settings-num" id="seidr-set-chat-font-size" min="0" max="' +
		SEIDR_CHAT_FONT_SIZE_MAX + '" step="1" placeholder="0 = Club" />',
		'<span class="seidr-num-spin" aria-hidden="true">',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="1" data-seidr-chat-font-size tabindex="-1" title="Increase">▲</button>',
		'<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="-1" data-seidr-chat-font-size tabindex="-1" title="Decrease">▼</button>',
		"</span>",
		"</span>",
		"</div>",
		'<p class="seidr-settings-hint">Typeface and size for Club chat log and compose box. Empty font uses Preference → Graphics → Font (unavailable names fall back to that). Size uses Club base units — Small 28 / Medium 36 / Large 44; <code>0</code> or empty uses Preference → Chat → Font Size. Does not change canvas nicknames or menus.</p>',
		"</details>",
		'<details class="seidr-settings-sec" data-seidr-tour="commands-enable">',
		"<summary>Commands</summary>",
		'<p class="seidr-settings-hint">Enable or disable Seidr chat commands. Off = not registered / ignored.</p>',
		'<div id="seidr-set-cmd-enable">' +
		SEIDR_CMD_ENABLE_LABELS.map(function (row) {
			return (
				'<div class="seidr-settings-row">' +
				'<label><input type="checkbox" data-seidr-cmd-en="' + row.key + '" /> ' +
				row.label + "</label></div>"
			);
		}).join("") +
		"</div>",
		'<p class="seidr-settings-hint" style="margin-top:12px;">Club chat assist — Tab autocomplete for vanilla commands, and hover Reply on beep rows in Club chat (not the FBM float panel).</p>',
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-ac-whisper" /> Autocompletion /whisper</label>',
		"</div>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-ac-beep" /> Autocompletion /beep</label>',
		"</div>",
		'<div class="seidr-settings-row">',
		'<label><input type="checkbox" id="seidr-set-beep-reply" /> Activate Reply to Beep</label>',
		"</div>",
		Seidr.SHOW_CMD_FAST_SELECT !== false
			? [
				'<p class="seidr-settings-hint" style="margin-top:12px;">Fast Select (Dev) — letter + Tab in chat. Last successful /a /strip /poses target is preselected in member autocomplete.</p>',
				'<div class="seidr-settings-row">',
				'<label><input type="checkbox" id="seidr-set-fast-select" /> Enable Fast Select</label>',
				"</div>",
				'<div id="seidr-set-fast-select-keys" style="margin-top:8px;">' +
				SEIDR_FAST_SELECT_KEY_LABELS.map(function (row) {
					return (
						'<div class="seidr-settings-row">' +
						'<label><input type="checkbox" data-seidr-fs-key="' + row.key + '" /> ' +
						row.label + "</label></div>"
					);
				}).join("") +
				"</div>",
				'<div class="seidr-settings-field-row" style="margin-top:8px;">',
				'<span class="seidr-settings-field-label">Empty Tab</span>',
				'<select id="seidr-set-fast-select-empty">' +
				SEIDR_FAST_SELECT_EMPTY_OPTS.map(function (o) {
					return '<option value="' + o.id + '">' + o.label + "</option>";
				}).join("") +
				"</select>",
				"</div>",
				'<p class="seidr-settings-hint">Letter checkboxes gate a/s/d/p + Tab. Empty Tab uses the dropdown (Disabled = Club Tab).</p>',
			].join("")
			: "",
		'<p class="seidr-settings-hint" id="seidr-set-cmd-en-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec">',
		"<summary>Cheats</summary>",
		'<p class="seidr-settings-hint">Self only. Same approach as BCC Get All Items (AssetFemale3DCG + InventoryAdd, then one sync).</p>',
		'<div class="seidr-settings-row">',
		'<button type="button" id="seidr-set-cheat-all-items">Give all Items</button>',
		"</div>",
		'<p class="seidr-settings-hint" id="seidr-set-cheat-all-items-msg"></p>',
		"</details>",
		'<details class="seidr-settings-sec" open>',
		"<summary>Storage</summary>",
		'<p class="seidr-settings-hint" id="seidr-set-storage-total">—</p>',
		'<div class="seidr-set-storage-bar" aria-hidden="true"><div class="seidr-set-storage-bar-fill" id="seidr-set-storage-bar"></div></div>',
		'<div class="seidr-set-storage-rows" id="seidr-set-storage-rows"></div>',
		'<p class="seidr-settings-hint" id="seidr-set-storage-maps-hint"></p>',
		"</details>",
	].join("");
}

function storageRow(label: string, bytes: number): string {
	return (
		'<div class="seidr-settings-field-row seidr-set-storage-row">' +
		'<span class="seidr-settings-field-label">' + label + "</span>" +
		'<span class="seidr-set-storage-val">' + rmFormatBytes(bytes) + "</span>" +
		"</div>"
	);
}

export function seidrRefreshStorageUi() {
	const totalEl = $("seidr-set-storage-total");
	const bar = $("seidr-set-storage-bar");
	const rows = $("seidr-set-storage-rows");
	const mapsHint = $("seidr-set-storage-maps-hint");
	if (!totalEl && !rows) return;
	let b;
	try {
		b = rmUsageBreakdown();
	} catch (e) {
		if (totalEl) totalEl.textContent = "Storage unavailable";
		return;
	}
	const pct = b.max > 0 ? Math.min(100, Math.round((b.total / b.max) * 100)) : 0;
	if (totalEl) {
		totalEl.textContent = "Total " + rmFormatBytes(b.total) + " / " + rmFormatBytes(b.max) +
			" (" + pct + "%)";
	}
	if (bar) bar.style.width = pct + "%";
	if (rows) {
		rows.innerHTML = [
			storageRow("Maps", b.maps),
			storageRow("Rooms", b.room),
			storageRow("Access", b.access),
			storageRow("Backgrounds", b.backgrounds),
			storageRow("Actions", b.actions),
			storageRow("Commands", b.commands),
			storageRow("Animations", b.animations),
			storageRow("Settings", b.settings),
			storageRow("UI", b.ui),
		].join("");
	}
	if (mapsHint) {
		let localBit = "";
		try {
			const loc = rmLocalMapsStats();
			localBit = " · Local " + loc.label;
		} catch (e) { /* ignore */ }
		mapsHint.textContent = "Maps budget (75%): " + rmFormatBytes(b.maps) +
			" / " + rmFormatBytes(b.mapBudget) + localBit;
	}
}

export function seidrBuildSettingsBody() {
	const body = $("seidr-settings-body");
	const tabs = $("seidr-settings-tabs");
	if (!body) return;
	const showActions = Seidr.SHOW_ACTIONS !== false;
	const showCommands = Seidr.SHOW_COMMANDS !== false;
	const showAnimations = Seidr.SHOW_COMMANDS !== false;
	const showMaps = rmIsShown();
	if (tabs) {
		tabs.innerHTML = [
			'<button type="button" class="seidr-settings-tab seidr-settings-tab-on" data-seidr-tab="general">General</button>',
			showActions
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="actions">Actions</button>'
				: "",
			showCommands
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="commands">Commands</button>'
				: "",
			showAnimations
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="animations">Animations</button>'
				: "",
			showMaps
				? '<button type="button" class="seidr-settings-tab" data-seidr-tab="maps">Maps</button>'
				: "",
			'<button type="button" class="seidr-settings-tab" data-seidr-tab="about">About</button>',
		].join("");
	}
	body.innerHTML = [
		'<div class="seidr-settings-pane seidr-settings-pane-on" id="seidr-settings-pane-general" data-seidr-pane="general">',
		seidrBuildGeneralHtml(),
		"</div>",
		showActions
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-actions" data-seidr-pane="actions"></div>'
			: "",
		showCommands
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-commands" data-seidr-pane="commands"></div>'
			: "",
		showAnimations
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-animations" data-seidr-pane="animations"></div>'
			: "",
		showMaps
			? '<div class="seidr-settings-pane" id="seidr-settings-pane-maps" data-seidr-pane="maps"></div>'
			: "",
		'<div class="seidr-settings-pane" id="seidr-settings-pane-about" data-seidr-pane="about"></div>',
	].join("");
	if (showActions) {
		const actPane = $("seidr-settings-pane-actions");
		if (actPane) seidrBuildActionsTab(actPane);
	}
	if (showCommands) {
		const cmdPane = $("seidr-settings-pane-commands");
		if (cmdPane) seidrBuildCommandsTab(cmdPane);
	}
	if (showAnimations) {
		const animPane = $("seidr-settings-pane-animations");
		if (animPane) seidrBuildAnimationsTab(animPane);
	}
	if (showMaps) {
		const mapsPane = $("seidr-settings-pane-maps");
		if (mapsPane) seidrBuildMapsTab(mapsPane);
	}
	const aboutPane = $("seidr-settings-pane-about");
	if (aboutPane) seidrBuildAboutTab(aboutPane);
	const tabRoot = tabs || body;
	tabRoot.querySelectorAll("[data-seidr-tab]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const tab = (btn as HTMLElement).getAttribute("data-seidr-tab");
			if (tab) seidrSelectSettingsTab(tab);
		});
	});
}

/** Switch settings pane by tab id (general / actions / commands / …). */
export function seidrSelectSettingsTab(tab: string) {
	const body = $("seidr-settings-body");
	const tabs = $("seidr-settings-tabs");
	if (!body || !tab) return;
	const tabRoot = tabs || body;
	tabRoot.querySelectorAll(".seidr-settings-tab").forEach(function (t) {
		t.classList.toggle("seidr-settings-tab-on", t.getAttribute("data-seidr-tab") === tab);
	});
	body.querySelectorAll(".seidr-settings-pane").forEach(function (p) {
		p.classList.toggle("seidr-settings-pane-on", p.getAttribute("data-seidr-pane") === tab);
	});
	if (tab === "maps") {
		try { seidrRefreshMapsTab(); } catch (e) { /* ignore */ }
	}
}

function setDrawMsg(text: string) {
	const el = $("seidr-set-draw-msg");
	if (el) el.textContent = text || "";
}

function setMapDrawMsg(text: string) {
	const el = $("seidr-set-map-draw-msg");
	if (el) el.textContent = text || "";
}

function setDrawSyncHint(text: string) {
	const el = $("seidr-set-draw-sync-hint");
	if (el) el.textContent = text || "";
}

function setBlockDisabled(blockId: string, disabled: boolean) {
	const block = $(blockId);
	if (!block) return;
	if (disabled) block.classList.add("seidr-settings-draw-disabled");
	else block.classList.remove("seidr-settings-draw-disabled");
	block.querySelectorAll("input, button").forEach(function (el) {
		(el as HTMLInputElement | HTMLButtonElement).disabled = disabled;
	});
}

function updateDrawModeUi() {
	const adv = !!drawAdvancedModeDraft;
	setBlockDisabled("seidr-set-draw-normal", adv);
	setBlockDisabled("seidr-set-draw-advanced-block", !adv);
	const advCheck = $("seidr-set-draw-advanced") as HTMLInputElement | null;
	if (advCheck) advCheck.disabled = false;
	updateDrawSyncButton();
}

function localPlayerIsHub(): boolean {
	try {
		if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") {
			return false;
		}
		const hubs = Seidr.getHubs ? Seidr.getHubs() : {};
		const cluster = SeidrState.clusterOf(hubs, Player.MemberNumber);
		if (!cluster || cluster.hub !== Player.MemberNumber) return false;
		return cluster.left != null || cluster.right != null || cluster.cuddle != null;
	} catch (e) {
		return false;
	}
}

function updateDrawSyncButton() {
	const btn = $("seidr-set-draw-sync") as HTMLButtonElement | null;
	if (!btn) return;
	const allow = !!drawAllowSyncDraft;
	const isHub = localPlayerIsHub();
	btn.disabled = !allow || !isHub;
	if (!allow) setDrawSyncHint("Turn on Allow Sync to receive hub layouts or broadcast as hub.");
	else if (!isHub) setDrawSyncHint("Sync is available when you are the hub of an active cuddle/pull.");
	else setDrawSyncHint("Press Sync to send your current Drawing layout to this cuddle.");
}

function fillDrawInputs(o: SeidrDrawOffsets) {
	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) x.value = String(o[pose].x);
		if (y) y.value = String(o[pose].y);
	});
}

function fillAdvDrawInputs(o: SeidrDrawAdvancedOffsets) {
	ADV_ROLES.forEach(function (pose) {
		const x = $("seidr-set-draw-adv-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-adv-" + pose + "-y") as HTMLInputElement | null;
		if (x) x.value = String(o[pose].x);
		if (y) y.value = String(o[pose].y);
	});
}

function readDrawDraftFromInputs(): SeidrDrawOffsets {
	const fallback = drawDraft ? drawDraft : seidrDefaultDrawOffsets();
	return seidrNormalizeDrawOffsets({
		pull: {
			x: ($("seidr-set-draw-pull-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-pull-y") as HTMLInputElement | null)?.value,
		},
		cuddle: {
			x: ($("seidr-set-draw-cuddle-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-cuddle-y") as HTMLInputElement | null)?.value,
		},
	}, fallback);
}

function readAdvDrawDraftFromInputs(): SeidrDrawAdvancedOffsets {
	const fallback = drawAdvDraft ? drawAdvDraft : seidrDefaultDrawAdvancedOffsets();
	const raw: Record<string, { x?: string; y?: string }> = {};
	ADV_ROLES.forEach(function (pose) {
		raw[pose] = {
			x: ($("seidr-set-draw-adv-" + pose + "-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-draw-adv-" + pose + "-y") as HTMLInputElement | null)?.value,
		};
	});
	return seidrNormalizeDrawAdvancedOffsets(raw, fallback);
}

function liveApplyDraft() {
	if (drawDraft) seidrApplyDrawOffsets(drawDraft);
	if (drawAdvDraft) seidrApplyDrawAdvancedOffsets(drawAdvDraft);
	seidrApplyDrawAdvancedMode(drawAdvancedModeDraft);
	seidrApplyDrawAllowSync(drawAllowSyncDraft);
}

function restoreCommittedDrawRuntime() {
	const s = seidrGetSettings();
	seidrApplyDrawOffsets(s.drawOffsets);
	seidrApplyDrawAdvancedOffsets(s.drawAdvancedOffsets);
	seidrApplyDrawAdvancedMode(s.drawAdvancedMode);
	seidrApplyDrawAllowSync(s.drawAllowSync);
}

function fillMapDrawInputs(o: SeidrDrawOffsets) {
	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-map-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-map-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) x.value = String(o[pose].x);
		if (y) y.value = String(o[pose].y);
	});
}

function readMapDrawDraftFromInputs(): SeidrDrawOffsets {
	const fallback = mapDrawDraft ? mapDrawDraft : seidrDefaultMapDrawOffsets();
	return seidrNormalizeDrawOffsets({
		pull: {
			x: ($("seidr-set-map-draw-pull-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-map-draw-pull-y") as HTMLInputElement | null)?.value,
		},
		cuddle: {
			x: ($("seidr-set-map-draw-cuddle-x") as HTMLInputElement | null)?.value,
			y: ($("seidr-set-map-draw-cuddle-y") as HTMLInputElement | null)?.value,
		},
	}, fallback);
}

function liveApplyMapDraft() {
	if (mapDrawDraft) seidrApplyMapDrawOffsets(mapDrawDraft);
}

function restoreCommittedMapDrawRuntime() {
	const s = seidrGetSettings();
	seidrApplyMapDrawOffsets(s.mapDrawOffsets);
}

export function seidrBeginDrawDraft() {
	const s = seidrGetSettings();
	drawDraft = seidrCloneDrawOffsets(s.drawOffsets);
	drawAdvDraft = seidrCloneDrawAdvancedOffsets(s.drawAdvancedOffsets);
	drawAdvancedModeDraft = !!s.drawAdvancedMode;
	drawAllowSyncDraft = !!s.drawAllowSync;
	drawDirty = false;
	fillDrawInputs(drawDraft);
	fillAdvDrawInputs(drawAdvDraft);
	const adv = $("seidr-set-draw-advanced") as HTMLInputElement | null;
	const sync = $("seidr-set-draw-allow-sync") as HTMLInputElement | null;
	if (adv) adv.checked = drawAdvancedModeDraft;
	if (sync) sync.checked = drawAllowSyncDraft;
	updateDrawModeUi();
	liveApplyDraft();
	setDrawMsg("");
}

export function seidrBeginMapDrawDraft() {
	const s = seidrGetSettings();
	mapDrawDraft = seidrCloneDrawOffsets(s.mapDrawOffsets || seidrDefaultMapDrawOffsets());
	mapDrawDirty = false;
	fillMapDrawInputs(mapDrawDraft);
	liveApplyMapDraft();
	setMapDrawMsg("");
}

/** Discard unsaved Drawing draft and restore committed offsets. */
export function seidrDiscardDrawDraft() {
	if (!drawDirty && !drawDraft && !drawAdvDraft) {
		restoreCommittedDrawRuntime();
		drawDraft = null;
		drawAdvDraft = null;
		return;
	}
	drawDraft = null;
	drawAdvDraft = null;
	drawDirty = false;
	restoreCommittedDrawRuntime();
	setDrawMsg("");
}

/** Discard unsaved Map Cuddle draft and restore committed offsets. */
export function seidrDiscardMapDrawDraft() {
	if (!mapDrawDirty && !mapDrawDraft) {
		restoreCommittedMapDrawRuntime();
		mapDrawDraft = null;
		return;
	}
	mapDrawDraft = null;
	mapDrawDirty = false;
	restoreCommittedMapDrawRuntime();
	setMapDrawMsg("");
}

export function seidrRefreshSettingsUi() {
	const s = seidrGetSettings();
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const am = $("seidr-set-arousal-mode") as HTMLSelectElement | null;
	const as = $("seidr-set-arousal-scope") as HTMLSelectElement | null;
	const cn = $("seidr-set-cluster-names") as HTMLSelectElement | null;
	const cns = $("seidr-set-cluster-name-scope") as HTMLSelectElement | null;
	const fo = $("seidr-set-fast-open") as HTMLInputElement | null;
	const fom = $("seidr-set-fast-open-mod") as HTMLSelectElement | null;
	const fos = $("seidr-set-fast-open-slot") as HTMLSelectElement | null;
	const cf = $("seidr-set-chat-font") as HTMLInputElement | null;
	const cfs = $("seidr-set-chat-font-size") as HTMLInputElement | null;
	if (en) en.checked = !!s.roomManagerEnabled;
	if (qm) qm.checked = s.showQuickmenuButton !== false;
	if (pos) pos.value = s.launcherPosition;
	if (am) am.value = s.arousalBarMode;
	if (as) as.value = s.arousalBarScope;
	if (cn) cn.value = s.clusterNameMode || "hitbox";
	if (cns) cns.value = s.clusterNameScope || "seidrCluster";
	if (fo) fo.checked = s.fastOpenActionsEnabled !== false;
	if (fom) fom.value = s.fastOpenActionsModifier || "Shift";
	if (fos) fos.value = s.fastOpenActionsSlot || "ItemTorso";
	if (cf) cf.value = s.chatFont || "";
	if (cfs) cfs.value = s.chatFontSize > 0 ? String(s.chatFontSize) : "";
	seidrBeginDrawDraft();
	seidrBeginMapDrawDraft();
	seidrRefreshStorageUi();
	try {
		const bag = seidrGetCommandsBag();
		document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-cmd-en") as SeidrCmdEnableKey | null;
			if (!key) return;
			(el as HTMLInputElement).checked = bag.enabled[key] !== false;
		});
		const fs = $("seidr-set-fast-select") as HTMLInputElement | null;
		const fse = $("seidr-set-fast-select-empty") as HTMLSelectElement | null;
		if (fs) fs.checked = bag.fastSelectEnabled !== false;
		if (fse) fse.value = bag.fastSelectEmpty || "disabled";
		const acW = $("seidr-set-ac-whisper") as HTMLInputElement | null;
		const acB = $("seidr-set-ac-beep") as HTMLInputElement | null;
		const br = $("seidr-set-beep-reply") as HTMLInputElement | null;
		if (acW) acW.checked = bag.acWhisper !== false;
		if (acB) acB.checked = bag.acBeep !== false;
		if (br) br.checked = bag.beepReply !== false;
		const keys = bag.fastSelectKeys || seidrNormalizeFastSelectKeys(null);
		document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-fs-key") as SeidrFastSelectKey | null;
			if (!key) return;
			(el as HTMLInputElement).checked = keys[key] !== false;
		});
	} catch (e) { /* ignore */ }
	if (Seidr.SHOW_ACTIONS !== false) seidrRefreshActionsTab();
	if (Seidr.SHOW_COMMANDS !== false) {
		seidrRefreshCommandsTab();
		seidrRefreshAnimationsTab();
	}
}

export function seidrBindSettingsUi(onChange?: () => void) {
	const en = $("seidr-set-rm-enabled") as HTMLInputElement | null;
	const qm = $("seidr-set-quickmenu") as HTMLInputElement | null;
	const pos = $("seidr-set-rm-pos") as HTMLSelectElement | null;
	const am = $("seidr-set-arousal-mode") as HTMLSelectElement | null;
	const ascope = $("seidr-set-arousal-scope") as HTMLSelectElement | null;
	const cn = $("seidr-set-cluster-names") as HTMLSelectElement | null;
	const cns = $("seidr-set-cluster-name-scope") as HTMLSelectElement | null;
	const fo = $("seidr-set-fast-open") as HTMLInputElement | null;
	const fom = $("seidr-set-fast-open-mod") as HTMLSelectElement | null;
	const fos = $("seidr-set-fast-open-slot") as HTMLSelectElement | null;
	const cf = $("seidr-set-chat-font") as HTMLInputElement | null;
	const cfs = $("seidr-set-chat-font-size") as HTMLInputElement | null;
	const openRm = $("seidr-set-open-rm") as HTMLButtonElement | null;
	const openMsg = $("seidr-set-open-rm-msg");
	function persist() {
		const patch = {
			roomManagerEnabled: !!(en && en.checked),
			showQuickmenuButton: !!(qm && qm.checked),
			launcherPosition: (pos && pos.value ? pos.value : "chatTop") as RmLauncherPosition,
			arousalBarMode: (am && am.value ? am.value : "off") as SeidrArousalBarMode,
			arousalBarScope: (ascope && ascope.value ? ascope.value : "seidrCluster") as SeidrArousalBarScope,
			clusterNameMode: (cn && cn.value ? cn.value : "hitbox") as SeidrClusterNameMode,
			clusterNameScope: (cns && cns.value ? cns.value : "seidrCluster") as SeidrClusterNameScope,
			fastOpenActionsEnabled: !!(fo && fo.checked),
			fastOpenActionsModifier: (fom && fom.value ? fom.value : "Shift") as SeidrFastOpenModifier,
			fastOpenActionsSlot: fos && fos.value ? fos.value : "ItemTorso",
			chatFont: cf ? cf.value : "",
			chatFontSize: seidrNormalizeChatFontSize(cfs ? cfs.value : 0),
		};
		const saved = seidrSaveSettings(patch);
		if (saved.ok) {
			const next = seidrGetSettings();
			if (cf && cf.value !== (next.chatFont || "")) cf.value = next.chatFont || "";
			if (cfs) cfs.value = next.chatFontSize > 0 ? String(next.chatFontSize) : "";
			seidrApplyChatFont();
		}
		if (onChange) onChange();
	}
	if (en) en.addEventListener("change", persist);
	if (qm) qm.addEventListener("change", persist);
	if (pos) pos.addEventListener("change", persist);
	if (am) am.addEventListener("change", persist);
	if (ascope) ascope.addEventListener("change", persist);
	if (cns) cns.addEventListener("change", persist);
	if (cn) cn.addEventListener("change", persist);
	if (fo) fo.addEventListener("change", persist);
	if (fos) fos.addEventListener("change", persist);
	if (fom) fom.addEventListener("change", persist);
	if (cf) {
		cf.addEventListener("change", persist);
		cf.addEventListener("blur", persist);
	}
	if (cfs) {
		cfs.addEventListener("change", persist);
		cfs.addEventListener("blur", persist);
	}
	document.querySelectorAll("[data-seidr-chat-font-size][data-seidr-num-dir]").forEach(function (btn) {
		btn.addEventListener("click", function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			if (!cfs) return;
			const dir = parseInt((btn as HTMLElement).getAttribute("data-seidr-num-dir") || "0", 10);
			if (!dir) return;
			let n = parseFloat(cfs.value);
			if (!Number.isFinite(n) || n <= 0) n = 36;
			n = Math.round(n + dir);
			if (n < 0) n = 0;
			if (n > 0 && n < SEIDR_CHAT_FONT_SIZE_MIN) n = dir > 0 ? SEIDR_CHAT_FONT_SIZE_MIN : 0;
			if (n > SEIDR_CHAT_FONT_SIZE_MAX) n = SEIDR_CHAT_FONT_SIZE_MAX;
			cfs.value = n > 0 ? String(n) : "";
			persist();
		});
	});

	function persistCmdEnable() {
		const bag = seidrGetCommandsBag();
		const raw: Record<string, boolean> = {};
		document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-cmd-en");
			if (!key) return;
			raw[key] = !!(el as HTMLInputElement).checked;
		});
		bag.enabled = seidrNormalizeCmdEnabled(raw);
		const fs = $("seidr-set-fast-select") as HTMLInputElement | null;
		const fse = $("seidr-set-fast-select-empty") as HTMLSelectElement | null;
		if (fs) bag.fastSelectEnabled = !!fs.checked;
		if (fse) {
			bag.fastSelectEmpty = seidrNormalizeFastSelectEmpty(fse.value) as SeidrFastSelectEmpty;
		}
		const keyRaw: Record<string, boolean> = {};
		document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
			const key = (el as HTMLElement).getAttribute("data-seidr-fs-key");
			if (!key) return;
			keyRaw[key] = !!(el as HTMLInputElement).checked;
		});
		bag.fastSelectKeys = seidrNormalizeFastSelectKeys(keyRaw);
		const acW = $("seidr-set-ac-whisper") as HTMLInputElement | null;
		const acB = $("seidr-set-ac-beep") as HTMLInputElement | null;
		const br = $("seidr-set-beep-reply") as HTMLInputElement | null;
		if (acW) bag.acWhisper = !!acW.checked;
		if (acB) bag.acBeep = !!acB.checked;
		if (br) bag.beepReply = !!br.checked;
		const saved = seidrSaveCommandsBag(bag);
		const msg = $("seidr-set-cmd-en-msg");
		if (msg) msg.textContent = saved.ok ? "Saved — reload chat commands applied" : (saved.error || "Save failed");
		try {
			if (typeof Seidr.registerCommands === "function") Seidr.registerCommands();
		} catch (e) { /* ignore */ }
		try {
			if (bag.beepReply !== false) seidrBeepReplyRescan();
			else seidrBeepReplyStrip();
		} catch (e) { /* ignore */ }
		if (onChange) onChange();
	}
	document.querySelectorAll("[data-seidr-cmd-en]").forEach(function (el) {
		el.addEventListener("change", persistCmdEnable);
	});
	document.querySelectorAll("[data-seidr-fs-key]").forEach(function (el) {
		el.addEventListener("change", persistCmdEnable);
	});
	const fsEl = $("seidr-set-fast-select");
	const fseEl = $("seidr-set-fast-select-empty");
	if (fsEl) fsEl.addEventListener("change", persistCmdEnable);
	if (fseEl) fseEl.addEventListener("change", persistCmdEnable);
	const acWEl = $("seidr-set-ac-whisper");
	const acBEl = $("seidr-set-ac-beep");
	const brEl = $("seidr-set-beep-reply");
	if (acWEl) acWEl.addEventListener("change", persistCmdEnable);
	if (acBEl) acBEl.addEventListener("change", persistCmdEnable);
	if (brEl) brEl.addEventListener("change", persistCmdEnable);

	if (openRm) {
		openRm.addEventListener("click", function () {
			const s = seidrGetSettings();
			if (!Seidr.SHOW_ROOM_MANAGER || s.roomManagerEnabled === false) {
				if (openMsg) openMsg.textContent = "Activate Room Manager first.";
				return;
			}
			if (openMsg) openMsg.textContent = "";
			if (typeof Seidr.rmOpenPanel === "function") Seidr.rmOpenPanel();
			else if (openMsg) openMsg.textContent = "Room Manager unavailable.";
		});
	}

	const cheatAll = $("seidr-set-cheat-all-items") as HTMLButtonElement | null;
	const cheatMsg = $("seidr-set-cheat-all-items-msg");
	if (cheatAll) {
		cheatAll.addEventListener("click", function () {
			if (cheatAll.disabled) return;
			if (!window.confirm("Add all Club items to your inventory? (Same method as BCC Get All Items.)")) return;
			cheatAll.disabled = true;
			if (cheatMsg) cheatMsg.textContent = "Scanning inventory…";
			seidrRunGiveAllItems(function (p) {
				if (cheatMsg) cheatMsg.textContent = p.message;
			}).then(function (r) {
				cheatAll.disabled = false;
				if (!cheatMsg) return;
				if (r && r.ok) {
					cheatMsg.textContent = r.added === 0
						? "You already have all items."
						: "Done. Added " + (r.added != null ? r.added : 0) +
							" inventory id(s) (catalog " + (r.total != null ? r.total : "?") + ").";
				} else {
					cheatMsg.textContent = ((r && r.error) || "Failed.") +
						(r && r.added != null ? " Targeted " + r.added + " id(s)." : "");
				}
			});
		});
	}

	function onDrawLive() {
		const next = readDrawDraftFromInputs();
		drawDraft = next;
		drawDirty = true;
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	function onDrawCommit() {
		const next = readDrawDraftFromInputs();
		drawDraft = next;
		drawDirty = true;
		fillDrawInputs(next);
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	function onAdvDrawLive() {
		const next = readAdvDrawDraftFromInputs();
		drawAdvDraft = next;
		drawDirty = true;
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	function onAdvDrawCommit() {
		const next = readAdvDrawDraftFromInputs();
		drawAdvDraft = next;
		drawDirty = true;
		fillAdvDrawInputs(next);
		liveApplyDraft();
		setDrawMsg("Preview — Save Drawing to keep");
	}

	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) {
			x.addEventListener("input", onDrawLive);
			x.addEventListener("change", onDrawCommit);
		}
		if (y) {
			y.addEventListener("input", onDrawLive);
			y.addEventListener("change", onDrawCommit);
		}
	});

	ADV_ROLES.forEach(function (pose) {
		const x = $("seidr-set-draw-adv-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-draw-adv-" + pose + "-y") as HTMLInputElement | null;
		if (x) {
			x.addEventListener("input", onAdvDrawLive);
			x.addEventListener("change", onAdvDrawCommit);
		}
		if (y) {
			y.addEventListener("input", onAdvDrawLive);
			y.addEventListener("change", onAdvDrawCommit);
		}
	});

	document.querySelectorAll(".seidr-settings-draw-row [data-seidr-num-dir]").forEach(function (btn) {
		btn.addEventListener("click", function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			const wrap = (btn as HTMLElement).closest(".seidr-num-wrap");
			const input = wrap ? wrap.querySelector("input[type=\"number\"]") as HTMLInputElement | null : null;
			if (!input || input.disabled) return;
			const dir = parseInt((btn as HTMLElement).getAttribute("data-seidr-num-dir") || "0", 10);
			if (!dir) return;
			const step = parseFloat(input.step) || 1;
			const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
			const max = input.max !== "" ? parseFloat(input.max) : Infinity;
			let n = parseFloat(input.value);
			if (!Number.isFinite(n)) n = 0;
			n = Math.round(n + dir * step);
			if (n < min) n = min;
			if (n > max) n = max;
			input.value = String(n);
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
	});

	document.querySelectorAll("[data-draw-reset]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const pose = (btn as HTMLElement).getAttribute("data-draw-reset") as keyof SeidrDrawOffsets | null;
			if (!pose || !drawDraft) return;
			const def = seidrDefaultDrawOffsets();
			drawDraft[pose] = { x: def[pose].x, y: def[pose].y };
			drawDirty = true;
			fillDrawInputs(drawDraft);
			liveApplyDraft();
			setDrawMsg("Reset to default — Save Drawing to keep");
		});
	});

	document.querySelectorAll("[data-draw-adv-reset]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const pose = (btn as HTMLElement).getAttribute("data-draw-adv-reset") as SeidrDrawAdvancedRole | null;
			if (!pose || !drawAdvDraft) return;
			const def = seidrDefaultDrawAdvancedOffsets();
			drawAdvDraft[pose] = { x: def[pose].x, y: def[pose].y };
			drawDirty = true;
			fillAdvDrawInputs(drawAdvDraft);
			liveApplyDraft();
			setDrawMsg("Reset to default — Save Drawing to keep");
		});
	});

	const advToggle = $("seidr-set-draw-advanced") as HTMLInputElement | null;
	if (advToggle) {
		advToggle.addEventListener("change", function () {
			drawAdvancedModeDraft = !!advToggle.checked;
			drawDirty = true;
			updateDrawModeUi();
			liveApplyDraft();
			setDrawMsg("Preview — Save Drawing to keep");
		});
	}

	const allowSyncToggle = $("seidr-set-draw-allow-sync") as HTMLInputElement | null;
	if (allowSyncToggle) {
		allowSyncToggle.addEventListener("change", function () {
			drawAllowSyncDraft = !!allowSyncToggle.checked;
			drawDirty = true;
			updateDrawSyncButton();
			liveApplyDraft();
			setDrawMsg("Preview — Save Drawing to keep");
		});
	}

	const syncBtn = $("seidr-set-draw-sync") as HTMLButtonElement | null;
	if (syncBtn) {
		syncBtn.addEventListener("click", function () {
			if (!drawAllowSyncDraft) {
				setDrawSyncHint("Turn on Allow Sync first.");
				return;
			}
			if (!localPlayerIsHub()) {
				setDrawSyncHint("You must be the hub of an active cuddle/pull to Sync.");
				updateDrawSyncButton();
				return;
			}
			if (typeof Seidr.publishDrawSync !== "function") {
				setDrawSyncHint("Sync unavailable.");
				return;
			}
			try {
				Seidr.publishDrawSync(Player.MemberNumber);
				setDrawSyncHint("Draw Sync sent to this cuddle.");
			} catch (e) {
				setDrawSyncHint("Sync failed.");
			}
		});
	}

	const saveBtn = $("seidr-set-draw-save") as HTMLButtonElement | null;
	if (saveBtn) {
		saveBtn.addEventListener("click", function () {
			const next = readDrawDraftFromInputs();
			const nextAdv = readAdvDrawDraftFromInputs();
			drawDraft = next;
			drawAdvDraft = nextAdv;
			drawAdvancedModeDraft = !!(advToggle && advToggle.checked);
			drawAllowSyncDraft = !!(allowSyncToggle && allowSyncToggle.checked);
			const saved = seidrSaveSettings({
				drawOffsets: next,
				drawAdvancedOffsets: nextAdv,
				drawAdvancedMode: drawAdvancedModeDraft,
				drawAllowSync: drawAllowSyncDraft,
			});
			if (!saved.ok) {
				setDrawMsg(saved.error || "Save failed");
				return;
			}
			drawDirty = false;
			liveApplyDraft();
			fillDrawInputs(next);
			fillAdvDrawInputs(nextAdv);
			updateDrawModeUi();
			setDrawMsg("Drawing saved");
		});
	}

	function onMapDrawLive() {
		const next = readMapDrawDraftFromInputs();
		mapDrawDraft = next;
		mapDrawDirty = true;
		liveApplyMapDraft();
		setMapDrawMsg("Preview — Save Map Cuddle to keep");
	}

	function onMapDrawCommit() {
		const next = readMapDrawDraftFromInputs();
		mapDrawDraft = next;
		mapDrawDirty = true;
		fillMapDrawInputs(next);
		liveApplyMapDraft();
		setMapDrawMsg("Preview — Save Map Cuddle to keep");
	}

	(["pull", "cuddle"] as const).forEach(function (pose) {
		const x = $("seidr-set-map-draw-" + pose + "-x") as HTMLInputElement | null;
		const y = $("seidr-set-map-draw-" + pose + "-y") as HTMLInputElement | null;
		if (x) {
			x.addEventListener("input", onMapDrawLive);
			x.addEventListener("change", onMapDrawCommit);
		}
		if (y) {
			y.addEventListener("input", onMapDrawLive);
			y.addEventListener("change", onMapDrawCommit);
		}
	});

	document.querySelectorAll("[data-map-draw-reset]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			const pose = (btn as HTMLElement).getAttribute("data-map-draw-reset") as keyof SeidrDrawOffsets | null;
			if (!pose || !mapDrawDraft) return;
			const def = seidrDefaultMapDrawOffsets();
			mapDrawDraft[pose] = { x: def[pose].x, y: def[pose].y };
			mapDrawDirty = true;
			fillMapDrawInputs(mapDrawDraft);
			liveApplyMapDraft();
			setMapDrawMsg("Reset to default — Save Map Cuddle to keep");
		});
	});

	const mapSaveBtn = $("seidr-set-map-draw-save") as HTMLButtonElement | null;
	if (mapSaveBtn) {
		mapSaveBtn.addEventListener("click", function () {
			const next = readMapDrawDraftFromInputs();
			mapDrawDraft = next;
			const saved = seidrSaveSettings({
				mapDrawOffsets: next,
				mapDrawAdvancedMode: false,
			});
			if (!saved.ok) {
				setMapDrawMsg(saved.error || "Save failed");
				return;
			}
			mapDrawDirty = false;
			liveApplyMapDraft();
			fillMapDrawInputs(next);
			setMapDrawMsg("Map Cuddle saved");
		});
	}
}
