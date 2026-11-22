/** Shared interface colors; the wheel palette is documented in RADIAL-PALETTE.md. */
import type { SeidrColorScheme } from "./model";

const wheelColors: Record<string, string> = {
	"1c1626": "211820",
	"2a2238": "472c3c",
	"241c30": "30222b",
	"30283e": "392331",
	"3c3050": "472c3c",
	"504064": "80506b",
	"494350": "4a4448",
	"60566a": "62535c",
	"21192d": "281c24",
	"14101c": "1b1419",
	"695b78": "bd9468",
	"51445e": "805b50",
	"d4a017": "dfb878",
	"f0e6d4": "f5e5d0",
	"c8b8a0": "d7bfa9",
	"a898b0": "bca5ae",
	"ffdf91": "ffd485"
};

export function seidrApplyColorScheme(scheme: SeidrColorScheme): void {
	const style = document.documentElement.style;
	Object.entries(wheelColors).forEach(([classic, wheel]) => {
		if (scheme === "wheel") {
			style.setProperty("--seidr-color-" + classic, "#" + wheel);
			style.setProperty("--seidr-rgb-" + classic, [0, 2, 4].map(i => parseInt(wheel.slice(i, i + 2), 16)).join(" "));
		} else {
			style.removeProperty("--seidr-color-" + classic);
			style.removeProperty("--seidr-rgb-" + classic);
		}
	});
}
