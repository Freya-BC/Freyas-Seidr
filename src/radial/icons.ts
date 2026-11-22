import { Seidr } from "../seidr";

/** Monochrome wheel icons use currentColor so the theme controls their color. */
export const RADIAL_ICONS: Record<string,string> = {
 heart:'<path d="M12 21S3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z"/>',
 cuddle:'<circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-5 2-8 6-8 2 0 3 1 4 3 1-2 2-3 4-3 4 0 6 3 6 8M7 16l5 3 5-3"/>',
 hand:'<path d="M7 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v8-5a1.5 1.5 0 0 1 3 0v8c0 4-3 7-7 7H9c-2 0-4-1-5-3l-2-4c-1-2 1-4 3-2l2 2Z"/>',
 kiss:'<path d="M2 12c4-1 5-5 8-4l2 1 2-1c3-1 4 3 8 4-3 4-6 6-10 6S5 16 2 12Zm1 0c4 1 6 1 9 1s5 0 9-1"/>',
 brush:'<path d="M5 3c4-2 8 1 8 5 0 3-2 5-4 6l-4 7c-1 2-4 0-3-2l4-7C3 9 2 5 5 3Zm1 3h1m3 0h1M5 9h1m3 0h1"/>',
 spark:'<path d="m12 2 2 7 7 3-7 3-2 7-2-7-7-3 7-3 2-7Z"/>',
 arrow:'<path d="M3 12h17m-6-6 6 6-6 6"/>',
 star:'<path d="m12 2 3 7 7 .5-5.5 5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9Z"/>',
 cheek: '<path d="M14 21v-3h-3a3 3 0 0 1-3-3v-2H5l3-5c0-3 3-5 7-5 4 0 7 3 7 7"/><path d="m15 12 1-2m2 4 2-1m-3 5 3 1"/>',
 pet: '<path d="M3 21v-2a6 6 0 0 1 12 0v2M7 12 4 8m6 4 2-3"/><path d="m8 5 3-2 3 1 2 3 5 1v3h-4l-3-2"/>',
 arm: '<path d="M3 17 9 7l5-2 3 3-2 2-3-1-1 5 4-2c3-1 6 1 6 4 0 4-5 5-10 5H5Z"/>',
 wave: '<path d="m7 12 2-7a1.5 1.5 0 0 1 3 1l-1 5 3-7a1.5 1.5 0 0 1 3 1l-2 7 2-3a1.5 1.5 0 0 1 3 1l-2 7a6 6 0 0 1-6 5h-1a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2-2l2 2Z"/><path d="M3 8a6 6 0 0 1 2-5m15 1 2 2"/>',
 feather: '<path d="M3 21 18 6m-12 12c-1-6 3-13 14-15 1 9-4 14-11 15H6Zm7-7 5 1"/>',
 eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
 chat: '<path d="M21 11a8 8 0 0 1-8 8H6l-4 3 1-5a8 8 0 0 1-1-4 8 8 0 0 1 8-8h3a8 8 0 0 1 8 6Z"/><path d="M7 12h10"/>',
 music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
 gift: '<path d="M4 11h16v10H4zm-1-4h18v4H3zm9 0v14M12 7H8a2 2 0 1 1 2-3l2 3Zm0 0h4a2 2 0 1 0-2-3l-2 3Z"/>',
 cup: '<path d="M4 7h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a2 2 0 0 1 0 4h-2M3 21h16M9 4l1-2m3 2 1-2"/>',
 flower: '<path d="M12 10c-6-6 3-9 3-3 6-2 8 6 2 6 4 5-3 9-5 4-3 5-9 0-5-4-6-2-2-9 2-6Z"/><circle cx="12" cy="12" r="2"/>',
 key: '<circle cx="8" cy="8" r="4.5"/><path d="m11 11 10 10m-4-4 2-2m-5 0 2-2"/>',
 exit: '<path d="M10 4H4v16h6m-1-8h12m-4-4 4 4-4 4"/>',
};
// Image width, height, left and top as percentages of the square icon frame.
const PNG_FRAMES: Record<string, readonly [number, number, number, number]> = {
 "blow-kiss": [174.9, 116.6, -33.0, -11.1],
 "brush": [160.9, 107.3, -32.6, -4.5],
 "bust": [89.7, 89.7, 6.3, 4.7],
 "butt": [216.3, 144.2, -57.7, -24.8],
 "caress-arm": [160.9, 107.3, -30.4, -5.8],
 "caress-cheek": [152.6, 101.7, -26.1, -1.3],
 "caress-chest": [138.8, 92.5, -17.8, 2.7],
 "cuddle": [154.5, 103.0, -25.3, -2.2],
 "edit": [425.1, 283.4, -162.3, -92.8],
 "flower-caress": [96.8, 64.6, 3.5, 17.8],
 "flower-motion": [131.9, 87.9, -14.7, 5.6],
 "flower-touch": [102.6, 68.4, -4.3, 15.4],
 "foot": [202.7, 135.1, -49.1, -16.8],
 "hand": [169.2, 112.8, -31.1, -7.4],
 "heart": [164.4, 109.6, -31.0, -6.0],
 "heart-touch": [128.7, 85.8, -13.3, 4.4],
 "high-heel": [189.3, 126.2, -43.7, -13.9],
 "hug": [151.2, 100.8, -25.6, -1.9],
 "kiss": [175.5, 117.0, -38.2, -9.5],
 "kiss-cheek-alternative": [160.0, 106.6, -26.2, -4.9],
 "kiss-cheek-simple": [152.0, 101.4, -22.2, -1.9],
 "kiss-hand": [97.9, 65.3, 0.5, 17.1],
 "kiss-lips-simple": [130.2, 86.8, -15.0, 4.6],
 "kiss-two-women": [93.9, 62.6, 3.1, 18.4],
 "kiss-two-women-alternative": [92.6, 92.6, 3.5, -2.0],
 "kneel": [169.2, 112.8, -26.2, -6.2],
 "massage-back": [88.6, 88.6, 5.6, 5.6],
 "nose": [209.2, 139.5, -58.1, -20.2],
 "pet-head": [156.1, 104.1, -26.6, -3.7],
 "poke": [138.2, 92.1, -15.9, 2.0],
 "rub-bodies": [88.1, 88.1, 5.3, 5.9],
 "spank": [115.0, 115.0, -4.4, -11.9],
 "wiggle": [190.3, 190.3, -42.6, -47.9],
 "wiggling-body": [86.6, 94.7, 7.8, 1.5],
};
const RADIAL_PNG_ICONS = Object.keys(PNG_FRAMES).filter(name => name !== "edit");
export const RADIAL_ICON_IDS = [...Object.keys(RADIAL_ICONS), ...RADIAL_PNG_ICONS.map(name => "png-" + name)];
export function radialIconId(entry:{name:string;icon?:string;group?:string}):string {if(entry.icon && RADIAL_ICON_IDS.includes(entry.icon))return entry.icon;const name = entry.name.toLowerCase();
 const group = "group" in entry ? entry.group : "";
 if (name.includes("cuddle")) return "cuddle";
 if (name.includes("politekiss")) return "cheek";
 if (name.includes("kiss")) return "kiss";
 if (name.includes("brush") || name === "takecare") return "brush";
 if (name.includes("pet")) return "pet";
 if (name.includes("caress")) return group === "ItemArms" ? "arm" : group === "ItemMouth" ? "cheek" : "hand";
 if (name.includes("remove")) return "exit";
 if (name.includes("pull") || name.includes("join")) return "arrow";
 if (name.includes("tickle")) return "feather";
 if (name.includes("whisper")) return "chat";
 return "spark";
}
export function radialPngIcon(name: string, fallback: () => Node): HTMLElement {
 const isLogo = name === "seidr-logo";
 // Frame the crest above the wordmark so it stays legible at wheel size.
 const [width, height, left, top] = isLogo ? [139, 139, -19.5, 0] : PNG_FRAMES[name];
 const frame = document.createElement("span");
 frame.className = "sr-png-icon";
 frame.setAttribute("aria-hidden", "true");
 const img = document.createElement("img");
 img.alt = "";
 img.draggable = false;
 Object.assign(img.style, { width: width + "%", height: height + "%", left: left + "%", top: top + "%" });
 img.onerror = () => frame.replaceWith(fallback());
 frame.append(img);
 if (isLogo) img.classList.add("sr-cuddle-crest");
 img.src = isLogo ? Seidr.LOGO_URL : "https://freya-bc.github.io/Freyas-Seidr/assets/wheel-icon-concepts/" + name + ".png";
 return frame;
}

export function radialIcon(entry: {name: string; icon?: string; group?: string}): HTMLElement | SVGSVGElement {
 if (entry.name === "__cuddle") return radialPngIcon("seidr-logo", () => radialIcon({name: "Cuddle", icon: "cuddle"}));
 const id = radialIconId(entry);
 if (id.startsWith("png-")) return radialPngIcon(id.slice(4), () => radialIcon({...entry, icon: "spark"}));
 const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
 svg.setAttribute("viewBox", "0 0 24 24");
 svg.setAttribute("fill", "none");
 svg.setAttribute("stroke", "currentColor");
 svg.setAttribute("stroke-width", "1.8");
 svg.setAttribute("stroke-linecap", "round");
 svg.setAttribute("stroke-linejoin", "round");
 svg.setAttribute("aria-hidden", "true");
 svg.innerHTML = RADIAL_ICONS[id];
 return svg;
}
