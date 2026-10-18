/** Seidr — defaults */
import { Seidr } from "./seidr";

Seidr.VERSION = "1.0.0";
Seidr.FULL_NAME = "Seidr";
Seidr.PREFIX = "Seidr_";
Seidr.HIDDEN = "Seidr";
// Club activities need an Item click zone with an arousal factor.
// Appearance "Body" / BodyUpper has neither, so it cannot host actions.
// ItemTorso is the left body item zone (closest working Body click target).
Seidr.GROUPS = ["ItemTorso"];
// Echo pull is center ±75 (Y 0). Sides stand a bit farther out and use Echo's
// behind height from cuddle (holder at Y -50).
Seidr.OFFSET_X = 100;
Seidr.OFFSET_SIDE_Y = -50;
Seidr.OFFSET_HUB_Y = -50;
Seidr.BOOKMARK_GIST_ID = "9bbf11dc304132b1dc2d8e8ff4eea168";
Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";
