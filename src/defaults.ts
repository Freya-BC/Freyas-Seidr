/** Seidr — defaults */
import { Seidr } from "./seidr";

Seidr.VERSION = "1.0.53";
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
/** Dev bookmark gist (feature channel). Empty → next push-gist creates a new public gist. */
Seidr.BOOKMARK_GIST_ID = "aaf3ff1d74aec0d971e2739b27a08b96";
Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";
Seidr.LOGO_URL = "https://freya-bc.github.io/Freyas-Seidr/assets/freyas-seidr-logo.png";
/** Room Manager UI — Dev-only until Release is approved. */
Seidr.SHOW_ROOM_MANAGER = true;
/** User Actions (Activity Menu) — Dev channel. */
Seidr.SHOW_ACTIONS = true;
/** Chat /a commands + Commands settings tab. */
Seidr.SHOW_COMMANDS = true;
Seidr.RM_STORAGE_KEY = "SeidrRoomManager";
Seidr.RM_DATA_VERSION = 1;
Seidr.RM_MAX_COMPRESSED = 180000;
Seidr.RM_MAP_BUDGET_RATIO = 0.75;
Seidr.RM_MAP_MAX = 10;
Seidr.RM_LZ_PREFIX = "SeidrRm1:";
/** Clipboard export/import for Actions (LZ Base64). */
Seidr.ACT_LZ_PREFIX = "SeidrAct1:";
