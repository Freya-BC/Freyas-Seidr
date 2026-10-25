/** Arousal meter chrome — hide / show-on-change / bottom HUD (vanilla + BCT split). */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrNatural } from "./draw";
import { seidrGetSettings } from "./settings/storage";
import type { SeidrArousalBarMode, SeidrArousalBarScope } from "./settings/model";

const SHOW_MS = 1000;
/** Bar sits below Club name (Y+980×Zoom), still inside the 1000-tall hitbox. */
const BAR_Y = 992;
const BAR_H = 8;
/** Inset from hitbox left/right edges (character coords, × Zoom). */
const EDGE = 12;
/** Gap between the two bar slots (character coords, × Zoom). */
const GAP = 10;

type ProgressPair = { arousal: number; orgasm: number | null; split: boolean };
type BottomRow = { C: any; prog: ProgressPair };

/** Per-member: last seen progress + untilChange hide timer. */
const lastProg: Record<number, { a: number; o: number; showUntil: number }> = {};
/** Characters queued for Mode C this frame (from DrawArousalMeter skips). */
let bottomQueue: BottomRow[] = [];

function settingsMode(): SeidrArousalBarMode {
	try {
		return seidrGetSettings().arousalBarMode || "off";
	} catch (e) {
		return "off";
	}
}

function settingsScope(): SeidrArousalBarScope {
	try {
		return seidrGetSettings().arousalBarScope || "seidrCluster";
	} catch (e) {
		return "seidrCluster";
	}
}

function bctSplitEnabled(C: any): boolean {
	try {
		const bct = C && C.BCT;
		if (!bct) return false;
		const s = bct.bctSettings && bct.bctSettings.splitOrgasmArousal;
		if (s === true || s === "true") return true;
		if (bct.splitOrgasmArousal && typeof bct.splitOrgasmArousal.arousalProgress === "number") return true;
	} catch (e) { /* ignore */ }
	return false;
}

function clamp01_100(n: number): number {
	if (!Number.isFinite(n)) return 0;
	if (n < 0) return 0;
	if (n > 100) return 100;
	return n;
}

function readProgress(C: any): ProgressPair {
	const club = C && C.ArousalSettings && typeof C.ArousalSettings.Progress === "number"
		? C.ArousalSettings.Progress
		: 0;
	if (bctSplitEnabled(C)) {
		let a = club;
		try {
			const sp = C.BCT && C.BCT.splitOrgasmArousal;
			if (sp && typeof sp.arousalProgress === "number") a = sp.arousalProgress;
		} catch (e) { /* ignore */ }
		return { arousal: clamp01_100(a), orgasm: clamp01_100(club), split: true };
	}
	return { arousal: clamp01_100(club), orgasm: null, split: false };
}

function inSeidrCluster(C: any): boolean {
	if (!C || typeof C.MemberNumber !== "number") return false;
	try {
		const hubs = typeof Seidr.getHubs === "function" ? Seidr.getHubs() : null;
		return !!SeidrState.clusterOf(hubs, C.MemberNumber);
	} catch (e) {
		return false;
	}
}

function seidrMeterApplies(C: any): boolean {
	const mode = settingsMode();
	if (mode === "off") return false;
	if (!C) return false;
	const scope = settingsScope();
	if (scope === "self") {
		try {
			return typeof C.IsPlayer === "function" ? !!C.IsPlayer() : false;
		} catch (e) {
			return false;
		}
	}
	if (scope === "seidrCluster") return inSeidrCluster(C);
	return true;
}

function untilChangeVisible(C: any, prog: ProgressPair): boolean {
	const id = C.MemberNumber;
	const now = typeof CommonTime === "function" ? CommonTime() : Date.now();
	const oVal = prog.orgasm != null ? prog.orgasm : -1;
	let st = lastProg[id];
	if (!st) {
		lastProg[id] = { a: prog.arousal, o: oVal, showUntil: 0 };
		return false;
	}
	if (st.a !== prog.arousal || st.o !== oVal) {
		st.a = prog.arousal;
		st.o = oVal;
		st.showUntil = now + SHOW_MS;
	}
	return now < st.showUntil;
}

function shouldSkipOnCharacter(C: any): boolean {
	if (!seidrMeterApplies(C)) return false;
	const mode = settingsMode();
	if (mode === "alwaysHide" || mode === "bottomBar") return true;
	if (mode === "untilChange") {
		return !untilChangeVisible(C, readProgress(C));
	}
	return false;
}

function queueBottom(C: any) {
	if (!seidrMeterApplies(C)) return;
	if (settingsMode() !== "bottomBar") return;
	const id = C.MemberNumber;
	for (let i = 0; i < bottomQueue.length; i++) {
		if (bottomQueue[i].C && bottomQueue[i].C.MemberNumber === id) return;
	}
	bottomQueue.push({ C: C, prog: readProgress(C) });
}

/** When Club never called DrawArousalMeter, still show Mode C for in-scope drawlist chars. */
function collectBottomFromDrawlist(): BottomRow[] {
	const list: BottomRow[] = [];
	const seen: Record<number, boolean> = {};
	for (let i = 0; i < bottomQueue.length; i++) {
		const row = bottomQueue[i];
		const id = row.C && row.C.MemberNumber;
		if (typeof id === "number") seen[id] = true;
		list.push(row);
	}
	try {
		const chars = typeof ChatRoomCharacterDrawlist !== "undefined" && ChatRoomCharacterDrawlist
			? ChatRoomCharacterDrawlist
			: (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : null);
		if (!chars || !chars.length) return list;
		for (let i = 0; i < chars.length; i++) {
			const C = chars[i];
			if (!C || typeof C.MemberNumber !== "number") continue;
			if (seen[C.MemberNumber]) continue;
			if (!seidrMeterApplies(C)) continue;
			seen[C.MemberNumber] = true;
			list.push({ C: C, prog: readProgress(C) });
		}
	} catch (e) { /* ignore */ }
	return list;
}

function flushBottomBars() {
	if (settingsMode() !== "bottomBar") {
		bottomQueue = [];
		return;
	}
	const list = collectBottomFromDrawlist();
	bottomQueue = [];
	drawBottomBars(list);
}

/**
 * Layout always reserves two slots (arousal | orgasm) inside the character hitbox:
 * edge inset L/R, gap between slots. Vanilla: only left bar is drawn; right slot empty.
 * BCT split: pink left + red right.
 */
function drawBottomBars(list: BottomRow[]) {
	if (!list.length) return;
	if (typeof MainCanvas === "undefined" || !MainCanvas) return;
	const ctx = MainCanvas;

	for (let i = 0; i < list.length; i++) {
		const row = list[i];
		const C = row.C;
		if (!C || typeof C.MemberNumber !== "number") continue;
		const nat = seidrNatural[C.MemberNumber];
		if (!nat) continue;

		const zoom = typeof nat.Zoom === "number" && nat.Zoom > 0 ? nat.Zoom : 1;
		// Click hitbox: MouseIn(CharX, CharY, Space, 1000*Zoom). Cap to character canvas 500*Zoom.
		const charW = 500 * zoom;
		const spaceW = typeof nat.Space === "number" && nat.Space > 0 ? nat.Space : charW;
		const boxW = Math.min(spaceW, charW);
		const boxX = nat.X + (spaceW > charW ? (spaceW - charW) / 2 : 0);
		const boxY = nat.Y;

		const edge = EDGE * zoom;
		const gap = GAP * zoom;
		const inner = Math.max(4, boxW - edge * 2);
		const slotW = Math.max(2, (inner - gap) / 2);
		const leftX = boxX + edge;
		const rightX = leftX + slotW + gap;
		const trackY = boxY + BAR_Y * zoom;
		const h = Math.max(2, BAR_H * zoom);
		const showRight = !!(row.prog.split && row.prog.orgasm != null);

		ctx.save();

		function paintSlot(x: number, fillRatio: number, fillColor: string) {
			ctx.fillStyle = "rgba(20,16,28,0.85)";
			ctx.fillRect(x, trackY, slotW, h);
			ctx.strokeStyle = "rgba(212,160,23,0.45)";
			ctx.lineWidth = 1;
			ctx.strokeRect(x + 0.5, trackY + 0.5, slotW - 1, h - 1);
			const fill = slotW * Math.max(0, Math.min(1, fillRatio));
			if (fill > 0) {
				ctx.fillStyle = fillColor;
				ctx.fillRect(x, trackY, fill, h);
			}
		}

		// Left slot always (arousal / single Club progress).
		paintSlot(leftX, row.prog.arousal / 100, showRight ? "#e891b8" : "#c44");
		// Right slot only when BCT split (orgasm track).
		if (showRight) paintSlot(rightX, (row.prog.orgasm || 0) / 100, "#c44");

		ctx.restore();
	}
}

/**
 * Suppress thermometer/glow when DrawArousalMeter was skipped (Club residual).
 * BCT pink is blocked by wrapping DrawArousalMeter at priority > BCT (2).
 */
let suppressMember: number | null = null;

export function seidrInstallArousalBars() {
	// Priority 10 > BCT's 2 so skip never reaches DrawBCTArousalMeter after next().
	Seidr.hookFunction("DrawArousalMeter", 10, function (args, next) {
		const C = args[0];
		if (shouldSkipOnCharacter(C)) {
			if (C && typeof C.MemberNumber === "number") suppressMember = C.MemberNumber;
			if (settingsMode() === "bottomBar") queueBottom(C);
			return;
		}
		if (seidrMeterApplies(C) && settingsMode() === "untilChange") {
			untilChangeVisible(C, readProgress(C));
		}
		suppressMember = null;
		return next(args);
	});

	Seidr.tryHook("DrawArousalThermometer", "DrawArousalThermometer", 10, function (args, next) {
		if (suppressMember != null) return;
		return next(args);
	});
	Seidr.tryHook("DrawArousalGlow", "DrawArousalGlow", 10, function (args, next) {
		if (suppressMember != null) return;
		return next(args);
	});

	// After ActiveView.Draw + arousal overlay / DrawUi so bars are not covered or cleared.
	Seidr.hookFunction("ChatRoomRun", 0, function (args, next) {
		const result = next(args);
		try {
			if (settingsMode() !== "bottomBar") {
				bottomQueue = [];
			} else {
				const inRoom = typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom";
				const charView = typeof ChatRoomCharacterViewIsActive !== "function"
					|| ChatRoomCharacterViewIsActive();
				if (inRoom && charView) flushBottomBars();
				else bottomQueue = [];
			}
		} catch (e) { /* ignore */ }
		return result;
	});
}

Seidr.installArousalBars = seidrInstallArousalBars;
