/** Seidr — defaults */
import { Seidr } from "./seidr";

Seidr.VERSION = "2.0.17";
Seidr.FULL_NAME = "Seidr";
Seidr.PREFIX = "Seidr_";
Seidr.HIDDEN = "Seidr";
// Club activities need an Item click zone with an arousal factor.
// Appearance "Body" / BodyUpper has neither, so it cannot host actions.
// ItemTorso is the left body item zone (closest working Body click target).
Seidr.GROUPS = ["ItemTorso"];
// Live DrawCharacter offsets (Settings Drawing). Echo pair gap: pull.x half-gap 75.
// Hitboxes stay on natural seats — only DrawCharacter reads these.
Seidr.drawOffsets = {
	pull: { x: 75, y: 0 },
	cuddle: { x: 0, y: -50 },
};
Seidr.drawAdvancedMode = false;
Seidr.drawAllowSync = false;
Seidr.drawAdvancedOffsets = {
	left: { x: -150, y: 0 },
	right: { x: 150, y: 0 },
	cuddle: { x: 0, y: 0 },
	hub: { x: 0, y: -50 },
};
/** Map-room pose (Settings → Map Cuddle). Same units as Drawing; scaled by map zoom. */
Seidr.mapDrawOffsets = {
	pull: { x: 100, y: 0 },
	cuddle: { x: 0, y: -250 },
};
Seidr.mapDrawAdvancedMode = false;
Seidr.mapDrawAdvancedOffsets = {
	left: { x: -150, y: 0 },
	right: { x: 150, y: 0 },
	cuddle: { x: 0, y: 0 },
	hub: { x: 0, y: -50 },
};
/** Session-only hub → free-draw overlays from drawSync (not persisted). */
Seidr._drawSyncByHub = {};
/** Dev bookmark gist (feature channel). Empty → next push-gist creates a new public gist. */
Seidr.BOOKMARK_GIST_ID = "aaf3ff1d74aec0d971e2739b27a08b96";
Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";
Seidr.LOGO_URL = "https://freya-bc.github.io/Freyas-Seidr/assets/SEIDR-Logo-Transparent.png";
/** Hosted static assets (action icons, logo). Sideloaded at runtime — not embedded in the script. */
Seidr.ASSETS_BASE_URL = "https://freya-bc.github.io/Freyas-Seidr/assets";
/** Player docs on GitHub Pages (About tab More links). */
Seidr.DOCS_BASE_URL = "https://freya-bc.github.io/Freyas-Seidr";
/** Room Manager UI — Dev-only until Release is approved. */
Seidr.SHOW_ROOM_MANAGER = true;
/** User Actions (Activity Menu) — Dev channel. */
Seidr.SHOW_ACTIONS = true;
/** Chat /a commands + Commands settings tab. */
Seidr.SHOW_COMMANDS = true;
/** Last-actor AC + letter/empty Tab Fast Select — Dev channel. */
Seidr.SHOW_CMD_FAST_SELECT = true;
Seidr.RM_STORAGE_KEY = "SeidrRoomManager";
Seidr.RM_DATA_VERSION = 1;
/** Cap on the sum of packed (Base64) ExtensionSettings strings, in bytes. */
Seidr.RM_MAX_BYTES = 180000;
Seidr.RM_KEY_SETTINGS = "SeidrSettings";
Seidr.RM_KEY_ACTIONS = "SeidrActions";
Seidr.RM_KEY_COMMANDS = "SeidrCommands";
Seidr.RM_KEY_ANIMATIONS = "SeidrAnimations";
Seidr.RM_MAP_BUDGET_RATIO = 0.75;
Seidr.RM_MAP_MAX = 10;
Seidr.RM_MAP_VERSIONS_REMOTE_MAX = 10;
Seidr.RM_MAP_LOCAL_MAX = 50;
Seidr.RM_MAP_VERSIONS_LOCAL_MAX = 30;
Seidr.RM_MAPS_LOCAL_KEY_PREFIX = "SeidrMapsLocal_";
Seidr.RM_MAPS_LOCAL_LZ_PREFIX = "SeidrMapsLocal1:";
/** Legacy UTF16 LZ prefix (read only). */
Seidr.RM_LZ_PREFIX = "SeidrRm1:";
/** Current Base64 LZ prefix. */
Seidr.RM_B64_PREFIX = "SeidrRm2:";
/** Clipboard export/import for Actions (LZ Base64). */
Seidr.ACT_LZ_PREFIX = "SeidrAct1:";
