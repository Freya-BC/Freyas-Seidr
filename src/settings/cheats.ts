/** Player-only inventory cheats (General Settings → Cheats). */

declare const Player: any;
declare const Asset: any;
declare const InventoryItemCreate: ((C: any, Group: string, Name: string) => any) | undefined;
declare const ServerPlayerInventorySync: (() => void) | undefined;

export type SeidrCheatResult = {
	ok: boolean;
	/** Newly pushed into Player.Inventory this run. */
	added?: number;
	/** Catalog InventoryIDs still missing after verify. */
	missing?: number;
	/** Unique catalog InventoryIDs considered. */
	total?: number;
	/** Chunks synced to the server. */
	chunks?: number;
	error?: string;
};

export type SeidrCheatProgress = {
	phase: "scan" | "add" | "sync" | "verify" | "done";
	added: number;
	pending: number;
	total: number;
	chunk: number;
	chunks: number;
	message: string;
};

const SEIDR_CHEAT_CHUNK = 75;
const SEIDR_CHEAT_DELAY_MS = 900;
const SEIDR_CHEAT_VERIFY_PASSES = 2;

function seidrCheatSleep(ms: number): Promise<void> {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms);
	});
}

function seidrCheatOwnedIdSet(C: any): Set<number> {
	const owned = new Set<number>();
	const inv = C && Array.isArray(C.Inventory) ? C.Inventory : [];
	for (let i = 0; i < inv.length; i++) {
		const item = inv[i];
		const id = item && item.Asset && item.Asset.InventoryID;
		if (typeof id === "number" && id > 0) owned.add(id);
	}
	return owned;
}

function seidrCheatOwnedKeySet(C: any): Set<string> {
	const owned = new Set<string>();
	const inv = C && Array.isArray(C.Inventory) ? C.Inventory : [];
	for (let i = 0; i < inv.length; i++) {
		const item = inv[i];
		if (!item || !item.Name || !item.Group) continue;
		owned.add(String(item.Group) + "\0" + String(item.Name));
	}
	return owned;
}

/**
 * One representative asset per InventoryID (Club persists by ID, not Name).
 * Skips Value === -1 and assets without InventoryID (cannot survive InventoryData).
 */
function seidrCheatCatalogById(family: string): Map<number, { Name: string; Group: string }> {
	const map = new Map<number, { Name: string; Group: string }>();
	const assets: any[] = typeof Asset !== "undefined" && Array.isArray(Asset) ? Asset : [];
	for (let i = 0; i < assets.length; i++) {
		const A: any = assets[i];
		if (!A || !A.Name || !A.Group || !A.Group.Name) continue;
		if (A.Value === -1) continue;
		const id = A.InventoryID;
		if (typeof id !== "number" || id <= 0) continue;
		if (family && A.Group.Family && A.Group.Family !== family) continue;
		if (map.has(id)) continue;
		map.set(id, { Name: String(A.Name), Group: String(A.Group.Name) });
	}
	return map;
}

function seidrCheatMissingRows(
	catalog: Map<number, { Name: string; Group: string }>,
	ownedIds: Set<number>,
): { Name: string; Group: string }[] {
	const out: { Name: string; Group: string }[] = [];
	catalog.forEach(function (row, id) {
		if (!ownedIds.has(id)) out.push(row);
	});
	return out;
}

function seidrCheatPushRow(C: any, row: { Name: string; Group: string }, keys: Set<string>): boolean {
	const key = row.Group + "\0" + row.Name;
	if (keys.has(key)) return false;
	if (typeof InventoryItemCreate !== "function") return false;
	const NewItem = InventoryItemCreate(C, row.Group, row.Name);
	if (!NewItem) return false;
	C.Inventory.push(NewItem);
	keys.add(key);
	const id = NewItem.Asset && NewItem.Asset.InventoryID;
	return typeof id === "number" && id > 0;
}

function seidrCheatSync(): void {
	if (typeof ServerPlayerInventorySync === "function") {
		try {
			ServerPlayerInventorySync();
		} catch (_e) {
			/* ignore */
		}
	}
}

/**
 * Diff missing InventoryIDs vs Player.Inventory, add in chunks, sync each chunk
 * with a delay so live AccountUpdate can land. Does not use InventoryAddMany
 * (that skips free/location-unlocked via InventoryAvailable).
 */
export async function seidrCheatAddAllItems(
	onProgress?: (p: SeidrCheatProgress) => void,
): Promise<SeidrCheatResult> {
	if (typeof Player === "undefined" || !Player) return { ok: false, error: "No player." };
	if (typeof InventoryItemCreate !== "function") {
		return { ok: false, error: "InventoryItemCreate is not available." };
	}

	const family = Player.AssetFamily ? String(Player.AssetFamily) : "Female3DCG";
	const catalog = seidrCheatCatalogById(family);
	const total = catalog.size;
	if (total === 0) return { ok: false, error: "Asset catalog empty or not loaded." };

	let added = 0;
	let chunks = 0;

	function report(
		phase: SeidrCheatProgress["phase"],
		pending: number,
		chunk: number,
		chunkTotal: number,
		message: string,
	) {
		if (!onProgress) return;
		onProgress({
			phase: phase,
			added: added,
			pending: pending,
			total: total,
			chunk: chunk,
			chunks: chunkTotal,
			message: message,
		});
	}

	report("scan", 0, 0, 0, "Scanning inventory…");

	for (let pass = 0; pass < SEIDR_CHEAT_VERIFY_PASSES; pass++) {
		const ownedIds = seidrCheatOwnedIdSet(Player);
		const keys = seidrCheatOwnedKeySet(Player);
		const missing = seidrCheatMissingRows(catalog, ownedIds);
		if (missing.length === 0) break;

		const chunkTotal = Math.ceil(missing.length / SEIDR_CHEAT_CHUNK) || 1;
		report(
			"add",
			missing.length,
			0,
			chunkTotal,
			"Missing " + missing.length + " / " + total + " — adding…",
		);

		for (let start = 0; start < missing.length; start += SEIDR_CHEAT_CHUNK) {
			const slice = missing.slice(start, start + SEIDR_CHEAT_CHUNK);
			const chunkIndex = Math.floor(start / SEIDR_CHEAT_CHUNK) + 1;
			let pushed = 0;
			for (let j = 0; j < slice.length; j++) {
				if (seidrCheatPushRow(Player, slice[j], keys)) {
					pushed += 1;
					added += 1;
				}
			}
			chunks += 1;
			report(
				"sync",
				Math.max(0, missing.length - start - slice.length),
				chunkIndex,
				chunkTotal,
				"Syncing chunk " + chunkIndex + "/" + chunkTotal +
					" (+" + pushed + ", total added " + added + ")…",
			);
			seidrCheatSync();
			if (start + SEIDR_CHEAT_CHUNK < missing.length || pass + 1 < SEIDR_CHEAT_VERIFY_PASSES) {
				await seidrCheatSleep(SEIDR_CHEAT_DELAY_MS);
			}
		}
	}

	const still = seidrCheatMissingRows(catalog, seidrCheatOwnedIdSet(Player)).length;
	report(
		"done",
		still,
		chunks,
		chunks,
		still === 0
			? "Done. Added " + added + " (catalog " + total + ")."
			: "Done. Added " + added + "; still missing " + still + " / " + total + ".",
	);

	return {
		ok: still === 0,
		added: added,
		missing: still,
		total: total,
		chunks: chunks,
		error: still === 0 ? undefined : "Still missing " + still + " inventory id(s).",
	};
}

/** Run Give all Items with optional progress (UI). Always uses Seidr path (no BCC short-circuit). */
export function seidrRunGiveAllItems(
	onProgress?: (p: SeidrCheatProgress) => void,
): Promise<SeidrCheatResult> {
	return seidrCheatAddAllItems(onProgress).catch(function (e: any) {
		return { ok: false, error: String(e && e.message ? e.message : e) };
	});
}
