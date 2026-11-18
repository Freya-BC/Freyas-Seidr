/**
 * Player-only inventory cheats (General Settings → Cheats).
 * Algorithm matches Bondage Club Chaos "Get All Items"
 * (AssetFemale3DCG + InventoryAdd Push=false + one ServerPlayerInventorySync).
 */

declare const Player: any;
declare const AssetFemale3DCG: any;
declare const AssetMale3DCG: any;
declare const InventoryAdd: ((C: any, Name: string, Group: string, Push?: boolean) => void) | undefined;
declare const ServerPlayerInventorySync: (() => void) | undefined;

export type SeidrCheatResult = {
	ok: boolean;
	/** Unique InventoryIDs newly targeted this run (BCC-style count). */
	added?: number;
	/** Name/Group rows still missing after run. */
	missing?: number;
	/** Catalog rows with InventoryID considered. */
	total?: number;
	error?: string;
};

export type SeidrCheatProgress = {
	phase: "scan" | "add" | "sync" | "done";
	added: number;
	pending: number;
	total: number;
	message: string;
};

/** Yield so the Settings UI can paint (BCC does the loop sync; we keep the same adds). */
function seidrCheatYield(): Promise<void> {
	return new Promise(function (resolve) {
		setTimeout(resolve, 0);
	});
}

function seidrCheatAssetDefs(): any[] {
	const family = Player && Player.AssetFamily ? String(Player.AssetFamily) : "Female3DCG";
	if (family === "Male3DCG" && typeof AssetMale3DCG !== "undefined" && Array.isArray(AssetMale3DCG)) {
		return AssetMale3DCG;
	}
	if (typeof AssetFemale3DCG !== "undefined" && Array.isArray(AssetFemale3DCG)) {
		return AssetFemale3DCG;
	}
	return [];
}

function seidrCheatOwnsNameGroup(C: any, name: string, group: string): boolean {
	const inv = C && Array.isArray(C.Inventory) ? C.Inventory : [];
	for (let i = 0; i < inv.length; i++) {
		if (inv[i] && inv[i].Name === name && inv[i].Group === group) return true;
	}
	return false;
}

/** Collect every definition row that has InventoryID (BCC catalog). */
function seidrCheatCollectCatalog(defs: any[]): { Name: string; Group: string; InventoryID: number }[] {
	const out: { Name: string; Group: string; InventoryID: number }[] = [];
	for (let g = 0; g < defs.length; g++) {
		const group = defs[g];
		if (!group || !group.Group || !Array.isArray(group.Asset)) continue;
		const groupName = String(group.Group);
		for (let a = 0; a < group.Asset.length; a++) {
			const item = group.Asset[a];
			if (typeof item === "string" || !item || !item.Name) continue;
			const id = item.InventoryID;
			if (typeof id !== "number" || id <= 0) continue;
			out.push({ Name: String(item.Name), Group: groupName, InventoryID: id });
		}
	}
	return out;
}

/**
 * BCC Get All Items: walk AssetFemale3DCG, InventoryAdd each missing Name+Group
 * that has InventoryID (Push=false), then one ServerPlayerInventorySync.
 */
export async function seidrCheatAddAllItems(
	onProgress?: (p: SeidrCheatProgress) => void,
): Promise<SeidrCheatResult> {
	if (typeof Player === "undefined" || !Player) return { ok: false, error: "No player." };
	if (typeof InventoryAdd !== "function") {
		return { ok: false, error: "InventoryAdd is not available." };
	}

	const defs = seidrCheatAssetDefs();
	if (defs.length === 0) {
		return { ok: false, error: "AssetFemale3DCG catalog not loaded." };
	}

	const catalog = seidrCheatCollectCatalog(defs);
	const total = catalog.length;
	if (total === 0) return { ok: false, error: "No InventoryID assets in catalog." };

	function report(phase: SeidrCheatProgress["phase"], added: number, pending: number, message: string) {
		if (!onProgress) return;
		onProgress({ phase: phase, added: added, pending: pending, total: total, message: message });
	}

	report("scan", 0, total, "Scanning inventory…");
	await seidrCheatYield();

	const ids: number[] = [];
	const YIELD_EVERY = 200;
	let processed = 0;

	for (let i = 0; i < catalog.length; i++) {
		const row = catalog[i];
		if (!seidrCheatOwnsNameGroup(Player, row.Name, row.Group)) {
			InventoryAdd(Player, row.Name, row.Group, false);
			if (ids.indexOf(row.InventoryID) < 0) ids.push(row.InventoryID);
		}
		processed += 1;
		if (processed % YIELD_EVERY === 0) {
			report(
				"add",
				ids.length,
				Math.max(0, total - processed),
				"Adding… " + processed + "/" + total + " (" + ids.length + " new ids)",
			);
			await seidrCheatYield();
		}
	}

	if (ids.length === 0) {
		report("done", 0, 0, "You already have all items.");
		return { ok: true, added: 0, missing: 0, total: total };
	}

	report("sync", ids.length, 0, "Syncing inventory (" + ids.length + " new ids)…");
	await seidrCheatYield();
	if (typeof ServerPlayerInventorySync === "function") {
		try {
			ServerPlayerInventorySync();
		} catch (_e) {
			/* ignore */
		}
	}

	// Recount Name+Group still absent (InventoryAdd may no-op via InventoryAvailable).
	let still = 0;
	for (let j = 0; j < catalog.length; j++) {
		const row = catalog[j];
		if (!seidrCheatOwnsNameGroup(Player, row.Name, row.Group)) still += 1;
	}

	report(
		"done",
		ids.length,
		still,
		still === 0
			? "Done. Added " + ids.length + " inventory id(s)."
			: "Synced " + ids.length + " id(s); " + still + " name(s) still not in inventory.",
	);

	return {
		ok: still === 0,
		added: ids.length,
		missing: still,
		total: total,
		error: still === 0 ? undefined : still + " item name(s) still missing after sync.",
	};
}

export function seidrRunGiveAllItems(
	onProgress?: (p: SeidrCheatProgress) => void,
): Promise<SeidrCheatResult> {
	return seidrCheatAddAllItems(onProgress).catch(function (e: any) {
		return { ok: false, error: String(e && e.message ? e.message : e) };
	});
}
