/**
 * Map-room holds: seat tiles, walk grace, and zoom-stable DrawCharacter offsets.
 * Independent from lineup normal/advanced/drawSync pose.
 */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";
import { seidrFindChar } from "./room";

declare const Player: any;
declare var ChatRoomData: any;
declare var ChatRoomMapViewPerceptionRange: number;
declare const ChatRoomMapViewIsActive: (() => boolean) | undefined;
declare const CharacterAppearsInverted: ((character: any) => boolean) | undefined;
declare const DrawCharacter: ((...args: any[]) => any) | undefined;

/** Walk-away grace before a satellite seat is cleared (ms). */
export const SEIDR_MAP_WALK_GRACE_MS = 60000;

type Slot = "left" | "right" | "cuddle";
type TilePos = { X: number; Y: number };
type DrawPos = { x: number; y: number; zoom: number };
/** Club ChatRoomMapViewTypeList. */
export type SeidrMapType = "Never" | "Hybrid" | "Always";

var seidrMapAnchors: Record<number, TilePos> = {};
/** Satellite off-seat by 1 tile: keep slot, suppress pose until return or timer. */
var seidrMapWalkGrace: Record<number, { hub: number; slot: Slot; until: number; timer: ReturnType<typeof setTimeout> }> = {};
/** Hub off-anchor by 1 tile: keep cluster, suppress all pose until return or timer. */
var seidrMapHubGrace: Record<number, { until: number; timer: ReturnType<typeof setTimeout> }> = {};
var seidrMapViewRect: { Left: number; Top: number; Width: number; Height: number } | null = null;
/** True only while Club is inside ChatRoomMapViewDrawGrid (blocks dialog portraits). */
var seidrMapInGridDraw = false;
/** Deferred clustered DrawCharacter args for map z-order (left/right behind hub). */
var seidrMapFrontCapture: { characters: { rank: number; args: any[] }[] } | null = null;
var seidrMapFrontReplay = false;
/** Last observed MapData.Type — used to revalidate holds on Never ↔ Hybrid ↔ Always. */
var seidrLastMapType: SeidrMapType | null = null;

function seidrMapNum(value: unknown): number | null {
	if (typeof value === "number" && isFinite(value)) return value;
	return null;
}

/** Club room map mode (Never when missing / unknown). */
export function seidrMapType(): SeidrMapType {
	if (typeof ChatRoomData === "undefined" || !ChatRoomData) return "Never";
	const md = ChatRoomData.MapData;
	const t = md && md.Type;
	if (t === "Hybrid" || t === "Always") return t;
	return "Never";
}

/** True when the current room has a map (Hybrid or Always). */
export function seidrMapIsMapRoom(): boolean {
	const t = seidrMapType();
	return t === "Hybrid" || t === "Always";
}

/**
 * Always rooms hide form/join activities when tiles are wrong.
 * Hybrid keeps buttons visible and enforces tiles on click instead.
 */
export function seidrMapFormHidesActivity(): boolean {
	return seidrMapType() === "Always";
}

export function seidrMapViewActive(): boolean {
	if (typeof ChatRoomMapViewIsActive === "function") {
		try {
			return !!ChatRoomMapViewIsActive();
		} catch (e) {
			return false;
		}
	}
	return false;
}

export function seidrMapPos(character: any): TilePos | null {
	if (!character || !character.MapData || !character.MapData.Pos) return null;
	const x = seidrMapNum(character.MapData.Pos.X);
	const y = seidrMapNum(character.MapData.Pos.Y);
	if (x == null || y == null) return null;
	return { X: x, Y: y };
}

export function seidrMapPosOf(member: number): TilePos | null {
	return seidrMapPos(seidrFindChar(member));
}

/** Ideal seat tile for a slot relative to hub tile. Cuddle = one tile below (+Y). */
export function seidrSeatTile(hub: TilePos, slot: string): TilePos | null {
	if (!hub || typeof hub.X !== "number" || typeof hub.Y !== "number") return null;
	if (slot === "left") return { X: hub.X - 1, Y: hub.Y };
	if (slot === "right") return { X: hub.X + 1, Y: hub.Y };
	if (slot === "cuddle") return { X: hub.X, Y: hub.Y + 1 };
	return null;
}

/** Chebyshev distance on the map grid. */
export function seidrChebyshev(a: TilePos | null, b: TilePos | null): number {
	if (!a || !b) return Infinity;
	return Math.max(Math.abs(a.X - b.X), Math.abs(a.Y - b.Y));
}

/** Distance from satellite tile to the slot seat under hub. */
export function seidrSeatDist(hub: TilePos | null, satellite: TilePos | null, slot: string): number {
	const seat = hub ? seidrSeatTile(hub, slot) : null;
	return seidrChebyshev(satellite, seat);
}

/**
 * Form / join tile gate on map rooms: exact seat tile only (no diagonal / adjacent).
 * Non-map (Never) rooms always pass. Hybrid and Always both require the seat.
 */
export function seidrMapSeatFormOk(hubPos: TilePos | null, satPos: TilePos | null, slot: string): boolean {
	if (!seidrMapIsMapRoom()) return true;
	if (!hubPos || !satPos) return false;
	return seidrSeatDist(hubPos, satPos, slot) === 0;
}

/**
 * When entering Hybrid/Always with existing holds (e.g. formed in Never),
 * lock anchors to live hub tiles so watch can grace/clear off-seat sats.
 */
function seidrMapSeedAnchorsFromLive(): void {
	if (!seidrMapIsMapRoom() || typeof Seidr.getHubs !== "function") return;
	const hubs = Seidr.getHubs();
	if (!hubs) return;
	const hubIds = Object.keys(hubs).map(Number).filter(function (n) { return isFinite(n); });
	for (let i = 0; i < hubIds.length; i++) {
		const hubId = hubIds[i];
		if (seidrMapAnchors[hubId]) continue;
		const hubPos = seidrMapPosOf(hubId);
		if (!hubPos) continue;
		seidrMapAnchors[hubId] = { X: hubPos.X, Y: hubPos.Y };
	}
}

/**
 * React to MapData.Type flips (admin / Room Manager / sync).
 * → Never: drop map anchors + walk grace (hubs kept for lineup).
 * → Hybrid / Always: seed anchors + watch tick so off-seat holds grace/clear.
 */
export function seidrCheckMapTypeChange(): void {
	const next = seidrMapType();
	if (seidrLastMapType === next) return;
	const prev = seidrLastMapType;
	seidrLastMapType = next;
	if (prev == null) return;
	if (next === "Never") {
		seidrClearAllMapWalkGrace();
		seidrClearMapAnchors();
		return;
	}
	seidrMapSeedAnchorsFromLive();
	seidrMapWatchTick();
}

function seidrMapPerceptionRange(): number {
	if (typeof ChatRoomMapViewPerceptionRange === "number" && ChatRoomMapViewPerceptionRange > 0) {
		return ChatRoomMapViewPerceptionRange;
	}
	return 4;
}

/** FBM/Club-parity tile layout (player-centered camera). */
export function seidrMapTileLayout(Left: number, Top: number, Width: number, Height: number) {
	Left = Number(Left);
	Top = Number(Top);
	Width = Number(Width);
	Height = Number(Height);
	if (!isFinite(Left)) Left = 0;
	if (!isFinite(Top)) Top = 0;
	if (!isFinite(Width) || Width <= 0) Width = 1000;
	if (!isFinite(Height) || Height <= 0) Height = 1000;
	const range = seidrMapPerceptionRange();
	const span = Math.max(range * 2 + 1, 1);
	const TileSize = Height / span;
	const OffsetX = (Width - TileSize) / 2;
	const OffsetY = (Height - TileSize) / 2;
	return {
		Left: Left,
		Top: Top,
		Width: Width,
		Height: Height,
		range: range,
		TileSize: TileSize,
		TileWidth: TileSize,
		TileHeight: TileSize,
		OffsetX: OffsetX,
		OffsetY: OffsetY,
	};
}

export function seidrMapScreenFromTile(X: number, Y: number, Left: number, Top: number, Width: number, Height: number) {
	const layout = seidrMapTileLayout(Left, Top, Width, Height);
	const px = Player && Player.MapData && Player.MapData.Pos ? Player.MapData.Pos.X : 0;
	const py = Player && Player.MapData && Player.MapData.Pos ? Player.MapData.Pos.Y : 0;
	const tw = layout.TileWidth;
	const th = layout.TileHeight;
	const ScreenX = (X - px) * tw + layout.OffsetX;
	const ScreenY = (Y - py) * th + layout.OffsetY;
	return {
		Left: layout.Left + ScreenX,
		Top: layout.Top + ScreenY,
		TileWidth: tw,
		TileHeight: th,
		TileSize: layout.TileSize,
	};
}

export function seidrMapCharDrawPos(Left: number, Top: number, Width: number, Height: number, worldX: number, worldY: number): DrawPos {
	const s = seidrMapScreenFromTile(worldX, worldY, Left, Top, Width, Height);
	const TileSize = s.TileSize || s.TileWidth;
	return {
		x: s.Left + TileSize * 0.05,
		y: s.Top - TileSize * 0.85,
		zoom: (TileSize * 1.8) / 1000,
	};
}

/** Move `natural` toward `hub` by blend, never past either end. */
export function seidrMapClampToward(natural: number, hub: number, blend: number): number {
	const t = typeof blend === "number" && isFinite(blend) ? Math.max(0, Math.min(1, blend)) : 0;
	const moved = natural + (hub - natural) * t;
	const lo = Math.min(natural, hub);
	const hi = Math.max(natural, hub);
	return Math.max(lo, Math.min(hi, moved));
}

/** Move toward hub by up to `amount` pixels; never past hub or natural. */
export function seidrMapMoveToward(natural: number, hub: number, amount: number): number {
	const gap = hub - natural;
	const absGap = Math.abs(gap);
	if (absGap < 1e-6) return natural;
	const move = Math.min(Math.max(0, amount), absGap);
	return natural + (gap > 0 ? 1 : -1) * move;
}

/** Keep value on the closed segment between a and b. */
export function seidrMapClampSegment(value: number, a: number, b: number): number {
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);
	return Math.max(lo, Math.min(hi, value));
}

function seidrMapLiveOffsets() {
	const fallback = { pull: { x: 100, y: 0 }, cuddle: { x: 0, y: -250 } };
	const o = Seidr.mapDrawOffsets;
	if (!o || typeof o !== "object") return fallback;
	const pull = o.pull && typeof o.pull === "object" ? o.pull : fallback.pull;
	const cuddle = o.cuddle && typeof o.cuddle === "object" ? o.cuddle : fallback.cuddle;
	return {
		pull: {
			x: typeof pull.x === "number" && isFinite(pull.x) ? Math.abs(pull.x) : fallback.pull.x,
			y: typeof pull.y === "number" && isFinite(pull.y) ? pull.y : fallback.pull.y,
		},
		cuddle: {
			x: typeof cuddle.x === "number" && isFinite(cuddle.x) ? cuddle.x : fallback.cuddle.x,
			y: typeof cuddle.y === "number" && isFinite(cuddle.y) ? cuddle.y : fallback.cuddle.y,
		},
	};
}

function seidrCancelMapWalkGrace(member: number) {
	const entry = seidrMapWalkGrace[member];
	if (!entry) return;
	if (entry.timer) clearTimeout(entry.timer);
	delete seidrMapWalkGrace[member];
}

function seidrCancelMapHubGrace(hubId: number) {
	const entry = seidrMapHubGrace[hubId];
	if (!entry) return;
	if (entry.timer) clearTimeout(entry.timer);
	delete seidrMapHubGrace[hubId];
}

function seidrClearAllMapWalkGrace() {
	Object.keys(seidrMapWalkGrace).forEach(function (key) {
		seidrCancelMapWalkGrace(Number(key));
	});
	Object.keys(seidrMapHubGrace).forEach(function (key) {
		seidrCancelMapHubGrace(Number(key));
	});
}

function seidrClearMapAnchors() {
	seidrMapAnchors = {};
}

function seidrPruneMapAnchors(hubs: any) {
	Object.keys(seidrMapAnchors).forEach(function (key) {
		const hubN = Number(key);
		if (!hubs || !hubs[hubN] || (hubs[hubN].left == null && hubs[hubN].right == null && hubs[hubN].cuddle == null)) {
			delete seidrMapAnchors[hubN];
			seidrCancelMapHubGrace(hubN);
		}
	});
	Object.keys(seidrMapWalkGrace).forEach(function (key) {
		const m = Number(key);
		if (!SeidrState.clusterOf(hubs, m)) seidrCancelMapWalkGrace(m);
	});
	Object.keys(seidrMapHubGrace).forEach(function (key) {
		const hubN = Number(key);
		if (!hubs || !hubs[hubN]) seidrCancelMapHubGrace(hubN);
	});
}

function seidrMapPublishHub(hubId: number) {
	if (typeof Seidr.publishHub === "function") {
		try {
			Seidr.publishHub(hubId);
		} catch (e) { /* ignore */ }
	}
	if (typeof Seidr.badgeActivityButtons === "function") {
		try {
			Seidr.badgeActivityButtons();
		} catch (e2) { /* ignore */ }
	}
}

function seidrMapIsHubAuthority(hubId: number): boolean {
	return typeof Player !== "undefined" && Player && Player.MemberNumber === hubId;
}

function seidrExpireMapWalkGrace(member: number) {
	const entry = seidrMapWalkGrace[member];
	if (!entry) return;
	const hubId = entry.hub;
	const slot = entry.slot;
	if (entry.timer) clearTimeout(entry.timer);
	delete seidrMapWalkGrace[member];
	// Only the hub owner may clear slots / publish — peers follow state sync.
	if (!seidrMapIsHubAuthority(hubId)) return;
	const hubs = Seidr.getHubs();
	const cluster = SeidrState.clusterOf(hubs, member);
	if (!cluster || cluster.hub !== hubId) return;
	if (cluster[slot] !== member) return;
	const next = SeidrState.clearSlot(hubs, hubId, slot);
	Seidr.setHubs(next);
	seidrMapPublishHub(hubId);
}

function seidrStartMapWalkGrace(member: number, hub: number, slot: Slot) {
	seidrCancelMapWalkGrace(member);
	const until = Date.now() + SEIDR_MAP_WALK_GRACE_MS;
	const timer = setTimeout(function () {
		seidrExpireMapWalkGrace(member);
	}, SEIDR_MAP_WALK_GRACE_MS);
	seidrMapWalkGrace[member] = { hub: hub, slot: slot, until: until, timer: timer };
}

function seidrExpireMapHubGrace(hubId: number) {
	const entry = seidrMapHubGrace[hubId];
	if (!entry) return;
	if (entry.timer) clearTimeout(entry.timer);
	delete seidrMapHubGrace[hubId];
	if (!seidrMapIsHubAuthority(hubId)) return;
	seidrMapBreakHub(hubId);
}

function seidrStartMapHubGrace(hubId: number) {
	seidrCancelMapHubGrace(hubId);
	const until = Date.now() + SEIDR_MAP_WALK_GRACE_MS;
	const timer = setTimeout(function () {
		seidrExpireMapHubGrace(hubId);
	}, SEIDR_MAP_WALK_GRACE_MS);
	seidrMapHubGrace[hubId] = { until: until, timer: timer };
}

function seidrMapSatsOnSeats(hubRec: any, anchor: TilePos): boolean {
	if (!hubRec || !anchor) return false;
	for (let i = 0; i < 3; i++) {
		const slot = (["left", "right", "cuddle"] as Slot[])[i];
		const held = hubRec[slot];
		if (typeof held !== "number") continue;
		const satPos = seidrMapPosOf(held);
		if (!satPos || seidrSeatDist(anchor, satPos, slot) !== 0) return false;
	}
	return true;
}

function seidrMapBreakHub(hubId: number) {
	const before = Seidr.getHubs();
	if (!before[hubId]) return;
	["left", "right", "cuddle"].forEach(function (slot) {
		const held = before[hubId][slot];
		if (typeof held === "number") seidrCancelMapWalkGrace(held);
	});
	seidrCancelMapHubGrace(hubId);
	delete seidrMapAnchors[hubId];
	const next = SeidrState.releaseMember(before, hubId);
	Seidr.setHubs(next);
	seidrMapPublishHub(hubId);
}

function seidrMapBreakSlot(hubId: number, slot: Slot, member: number) {
	seidrCancelMapWalkGrace(member);
	const before = Seidr.getHubs();
	if (!before[hubId] || before[hubId][slot] !== member) return;
	const next = SeidrState.clearSlot(before, hubId, slot);
	Seidr.setHubs(next);
	seidrMapPublishHub(hubId);
}

/** True while hub is in walk grace (hold kept; sats still pose toward anchor). */
export function seidrMapHubInGrace(hubId: number): boolean {
	return !!(seidrMapHubGrace[hubId]);
}

/** True while this satellite is in walk grace (natural draw for that member). */
export function seidrMapSatInGrace(member: number): boolean {
	return !!(seidrMapWalkGrace[member]);
}

/** Formation hub tile for pose: saved anchor while clustered, else live pos. */
export function seidrMapPoseHubTile(hubId: number): TilePos | null {
	const anchor = seidrMapAnchors[hubId];
	if (anchor) return { X: anchor.X, Y: anchor.Y };
	return seidrMapPosOf(hubId);
}

/**
 * Enforce seat rules while in a map room.
 * Hub/sat Chebyshev from anchor/seat: 0 OK (restore), 1 → 60s grace (keep state, snap draw),
 * >=2 → instant clear. Seats always measured vs saved hub anchor.
 * Slot/hub clears + publish: hub owner only (peers' older map-watch must not wipe us after MapData sync).
 */
export function seidrMapWatchTick() {
	const liveType = seidrMapType();
	if (seidrLastMapType !== liveType) {
		const prev = seidrLastMapType;
		seidrLastMapType = liveType;
		if (prev != null && liveType === "Never") {
			seidrClearAllMapWalkGrace();
			seidrClearMapAnchors();
			return;
		}
		if (prev != null && (liveType === "Hybrid" || liveType === "Always")) {
			seidrMapSeedAnchorsFromLive();
		}
	}
	if (!seidrMapIsMapRoom()) {
		seidrClearAllMapWalkGrace();
		seidrClearMapAnchors();
		return;
	}
	if (typeof Seidr.getHubs !== "function") return;
	const hubs = Seidr.getHubs();
	seidrPruneMapAnchors(hubs);
	const hubIds = Object.keys(hubs).map(Number).filter(function (n) { return isFinite(n); });
	for (let i = 0; i < hubIds.length; i++) {
		const hubId = hubIds[i];
		const hubRec = hubs[hubId];
		if (!hubRec) continue;
		const hubPos = seidrMapPosOf(hubId);
		if (!hubPos) continue;
		const authority = seidrMapIsHubAuthority(hubId);
		let anchor = seidrMapAnchors[hubId];
		if (!anchor) {
			// Lock formation only when sats already sit on seats vs live hub (avoids
			// late observers anchoring on a walked-away tile).
			if (!seidrMapSatsOnSeats(hubRec, hubPos)) continue;
			seidrMapAnchors[hubId] = { X: hubPos.X, Y: hubPos.Y };
			anchor = seidrMapAnchors[hubId];
		}
		const hubDist = seidrChebyshev(hubPos, anchor);
		if (hubDist >= 2) {
			if (authority) seidrMapBreakHub(hubId);
			continue;
		}
		if (hubDist === 1) {
			if (!seidrMapHubGrace[hubId]) seidrStartMapHubGrace(hubId);
		} else if (hubDist === 0 && seidrMapHubGrace[hubId]) {
			// Hub back on anchor: restore only if every filled seat is still correct.
			if (seidrMapSatsOnSeats(hubRec, anchor)) {
				seidrCancelMapHubGrace(hubId);
			}
		}

		const seatHub = anchor;
		(["left", "right", "cuddle"] as Slot[]).forEach(function (slot) {
			const held = hubRec[slot];
			if (typeof held !== "number") return;
			const satPos = seidrMapPosOf(held);
			if (!satPos) return;
			const dist = seidrSeatDist(seatHub, satPos, slot);
			if (dist === 0) {
				seidrCancelMapWalkGrace(held);
				return;
			}
			if (dist >= 2) {
				if (authority) seidrMapBreakSlot(hubId, slot, held);
				else if (!seidrMapWalkGrace[held]) seidrStartMapWalkGrace(held, hubId, slot);
				return;
			}
			if (dist === 1 && !seidrMapWalkGrace[held]) {
				seidrStartMapWalkGrace(held, hubId, slot);
			}
		});
	}
}

/**
 * Only apply map pose during ChatRoomMapViewDrawGrid character draws —
 * never Activity / Appearance / restraint dialog portraits.
 */
export function seidrMapPoseContextOk(args: any[]): boolean {
	if (!seidrMapInGridDraw) return false;
	if (!seidrMapViewActive() || !seidrMapIsMapRoom()) return false;
	if (!seidrMapViewRect) return false;
	if (!args || !args[0]) return false;
	const rect = seidrMapViewRect;
	const layout = seidrMapTileLayout(rect.Left, rect.Top, rect.Width, rect.Height);
	const mapZoom = (layout.TileSize * 1.8) / 1000;
	const z = args[3];
	if (typeof z !== "number" || !isFinite(z) || z <= 0) return false;
	const tol = Math.max(0.02, mapZoom * 0.2);
	if (Math.abs(z - mapZoom) > tol) return false;
	const x = args[1];
	const y = args[2];
	if (typeof x !== "number" || typeof y !== "number") return false;
	const w = 500 * z;
	const h = 1000 * z;
	if (x + w < rect.Left || x > rect.Left + rect.Width) return false;
	if (y + h < rect.Top || y > rect.Top + rect.Height) return false;
	return true;
}

/**
 * Map pose from Settings → Map Cuddle. Hub fixed; satellites zoom-scaled.
 * Natural seat = Club's DrawCharacter args (never fight Club absolute placement).
 * Hub screen pos = Club sat + tile delta * TileSize (zoom/camera stable).
 */
export function seidrApplyMapSimplePose(args: any[]): any[] | null {
	if (!seidrMapPoseContextOk(args)) return null;
	if (!args || !args[0] || typeof args[0].MemberNumber !== "number") return null;
	const C = args[0];
	const hubs = Seidr.getHubs();
	const cluster = SeidrState.clusterOf(hubs, C.MemberNumber);
	if (!cluster || cluster.hub == null) return null;

	// Satellite walk grace: that person only draws Club-natural until back on seat.
	// Hub walk grace keeps hold state but does NOT dissolve pose — sats stay
	// pulled toward the saved anchor (hub-fixed) while the hub avatar walks.
	if (seidrMapSatInGrace(C.MemberNumber)) return null;

	const rect = seidrMapViewRect!;
	const hubTile = seidrMapPoseHubTile(cluster.hub);
	const satTile = seidrMapPos(C);
	if (!hubTile || !satTile) return null;

	const layout = seidrMapTileLayout(rect.Left, rect.Top, rect.Width, rect.Height);
	const tile = layout.TileSize;
	const mapZoom = typeof args[3] === "number" && args[3] > 0
		? args[3]
		: (tile * 1.8) / 1000;

	// Hub always draws at Club live tile (camera/follow); pose is sat-only.
	if (C.MemberNumber === cluster.hub) {
		return args;
	}

	const natX = typeof args[1] === "number" ? args[1] : 0;
	const natY = typeof args[2] === "number" ? args[2] : 0;
	// Same intra-tile anchor cancels: hub draw ≈ sat Club draw + tile delta.
	const hubX = natX + (hubTile.X - satTile.X) * tile;
	const hubY = natY + (hubTile.Y - satTile.Y) * tile;

	// Map Cuddle is normal Pull/Cuddle only (no Advanced Mode).
	const off = seidrMapLiveOffsets();
	// Preserve the spacing of saved settings from when the original draw and
	// replay each applied the offset. Compute it once from the natural seat.
	const poseScale = 2 * mapZoom;
	if (cluster.left === C.MemberNumber || cluster.right === C.MemberNumber) {
		const gapX = Math.abs(natX - hubX);
		const pullX = Math.min(off.pull.x * poseScale * 2, gapX);
		args[1] = seidrMapMoveToward(natX, hubX, pullX);
		args[2] = natY + off.pull.y * poseScale;
		return args;
	}
	if (cluster.cuddle === C.MemberNumber) {
		const nx = natX + off.cuddle.x * poseScale;
		const ny = natY + off.cuddle.y * poseScale;
		args[1] = seidrMapClampSegment(nx, natX, hubX);
		const uprightY = seidrMapClampSegment(ny, natY, hubY);
		// Club flips character art for inverted viewers, but map tiles remain
		// upright. Mirror the cuddle around the hub when both appear inverted.
		const hub = seidrFindChar(cluster.hub);
		let inverted = false;
		if (hub && typeof CharacterAppearsInverted === "function") {
			try { inverted = CharacterAppearsInverted(hub) && CharacterAppearsInverted(C); } catch (_) { /* use normal placement */ }
		}
		args[2] = inverted ? 2 * hubY - uprightY : uprightY;
		return args;
	}
	return null;
}

/**
 * Map z-order (painter's algorithm): left → right → hub → cuddle.
 * Pulled sides stay behind the hub; cuddle stays in front.
 */
export function seidrMapFrontRank(character: any): number {
	if (!character || typeof character.MemberNumber !== "number") return 0;
	const cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
	if (!cluster) return 0;
	if (cluster.left === character.MemberNumber) return 1;
	if (cluster.right === character.MemberNumber) return 2;
	if (cluster.hub === character.MemberNumber) return 3;
	if (cluster.cuddle === character.MemberNumber) return 4;
	return 0;
}

function seidrMapHoldFrontCharacter(args: any[]): boolean {
	if (!seidrMapInGridDraw || seidrMapFrontReplay || !seidrMapFrontCapture) return false;
	const rank = seidrMapFrontRank(args[0]);
	if (!rank) return false;
	seidrMapFrontCapture.characters.push({
		rank: rank,
		args: Array.prototype.slice.call(args),
	});
	return true;
}

function seidrMapReplayFront(captured: { characters: { rank: number; args: any[] }[] } | null) {
	if (!captured || !captured.characters || !captured.characters.length) return;
	const fn = typeof DrawCharacter === "function" ? DrawCharacter : null;
	if (!fn) return;
	const list = captured.characters.slice().sort(function (a, b) {
		return a.rank - b.rank;
	});
	seidrMapFrontReplay = true;
	try {
		for (let i = 0; i < list.length; i++) {
			try {
				fn.apply(null, list[i].args);
			} catch (e) {
				console.warn("[Seidr] map front draw", e);
			}
		}
	} finally {
		seidrMapFrontReplay = false;
	}
}

export function seidrResetMapHolds() {
	seidrClearAllMapWalkGrace();
	seidrClearMapAnchors();
	seidrMapViewRect = null;
	seidrMapInGridDraw = false;
	seidrMapFrontCapture = null;
	seidrMapFrontReplay = false;
	seidrLastMapType = null;
}

Seidr.installMapHolds = function () {
	Seidr.tryHook("ChatRoomMapViewDrawGrid", "ChatRoomMapViewDrawGrid", 5, function (args, next) {
		const prev = seidrMapInGridDraw;
		const prevCapture = seidrMapFrontCapture;
		seidrMapInGridDraw = true;
		seidrMapFrontCapture = { characters: [] };
		try {
			const Left = Number(args && args[0]);
			const Top = Number(args && args[1]);
			const Width = Number(args && args[2]);
			const Height = Number(args && args[3]);
			if (isFinite(Left) && isFinite(Top) && isFinite(Width) && isFinite(Height)) {
				seidrMapViewRect = { Left: Left, Top: Top, Width: Width, Height: Height };
			}
			seidrMapWatchTick();
			const result = next(args);
			try {
				seidrMapReplayFront(seidrMapFrontCapture);
			} catch (eReplay) {
				console.warn("[Seidr] map replay front", eReplay);
			}
			return result;
		} finally {
			seidrMapInGridDraw = prev;
			seidrMapFrontCapture = prevCapture;
		}
	});

	Seidr.tryHook("ChatRoomMapViewCalculatePerceptionMasks", "ChatRoomMapViewCalculatePerceptionMasks", 5, function (args, next) {
		const result = next(args);
		try {
			seidrMapWatchTick();
		} catch (e) { /* ignore */ }
		return result;
	});

	Seidr.hookFunction("DrawCharacter", 3, function (args, next) {
		try {
			if (seidrMapFrontReplay) {
				seidrApplyMapSimplePose(args);
				return next(args);
			}
			if (seidrMapInGridDraw) {
				// Capture Club's natural position; replay applies the pose once.
				if (seidrMapHoldFrontCharacter(args)) return;
				seidrApplyMapSimplePose(args);
			}
		} catch (e) { /* ignore */ }
		return next(args);
	});

	Seidr.tryHook("ChatRoomLeave", "ChatRoomLeave", 4, function (args, next) {
		try {
			seidrResetMapHolds();
		} catch (e) { /* ignore */ }
		return next(args);
	});

	Seidr.tryHook("ChatRoomSync", "ChatRoomSync", 11, function (args, next) {
		const result = next(args);
		try {
			seidrCheckMapTypeChange();
		} catch (e) { /* ignore */ }
		return result;
	});

	const prevSetHubs = Seidr.setHubs;
	Seidr.setHubs = function (hubs: any) {
		prevSetHubs(hubs);
		try {
			seidrPruneMapAnchors(hubs || {});
		} catch (e) { /* ignore */ }
	};

	try {
		seidrLastMapType = seidrMapType();
	} catch (e) { /* ignore */ }
};

Seidr.mapSeatFormOk = seidrMapSeatFormOk;
Seidr.mapIsMapRoom = seidrMapIsMapRoom;
Seidr.mapType = seidrMapType;
Seidr.mapFormHidesActivity = seidrMapFormHidesActivity;
Seidr.checkMapTypeChange = seidrCheckMapTypeChange;
Seidr.resetMapHolds = seidrResetMapHolds;

/** Test / debug surface. */
Seidr._mapHolds = {
	WALK_GRACE_MS: SEIDR_MAP_WALK_GRACE_MS,
	isMapRoom: seidrMapIsMapRoom,
	mapType: seidrMapType,
	formHidesActivity: seidrMapFormHidesActivity,
	checkMapTypeChange: seidrCheckMapTypeChange,
	viewActive: seidrMapViewActive,
	pos: seidrMapPos,
	seatTile: seidrSeatTile,
	chebyshev: seidrChebyshev,
	seatDist: seidrSeatDist,
	seatFormOk: seidrMapSeatFormOk,
	clampToward: seidrMapClampToward,
	moveToward: seidrMapMoveToward,
	clampSegment: seidrMapClampSegment,
	tileLayout: seidrMapTileLayout,
	charDrawPos: seidrMapCharDrawPos,
	watchTick: seidrMapWatchTick,
	applySimplePose: seidrApplyMapSimplePose,
	poseContextOk: seidrMapPoseContextOk,
	frontRank: seidrMapFrontRank,
	reset: seidrResetMapHolds,
	setInGridDraw: function (on: boolean) { seidrMapInGridDraw = !!on; },
	setViewRect: function (rect: { Left: number; Top: number; Width: number; Height: number } | null) {
		seidrMapViewRect = rect;
	},
	anchors: function () { return seidrMapAnchors; },
	grace: function () { return seidrMapWalkGrace; },
	hubGrace: function () { return seidrMapHubGrace; },
	hubInGrace: seidrMapHubInGrace,
	satInGrace: seidrMapSatInGrace,
	poseHubTile: seidrMapPoseHubTile,
	lastMapType: function () { return seidrLastMapType; },
	setLastMapType: function (t: SeidrMapType | null) { seidrLastMapType = t; },
};
