/** Player-only inventory cheats (General Settings → Cheats). */

declare const Player: any;
declare const Asset: any;
declare const InventoryAdd: ((C: any, Name: string, Group: string, Push?: boolean) => void) | undefined;
declare const InventoryAddMany: ((C: any, NewItems: { Name: string; Group: string }[], Push?: boolean) => void) | undefined;
declare const ServerPlayerInventorySync: (() => void) | undefined;
declare const BCC: { AddAllItems?: () => void } | undefined;

export type SeidrCheatResult = {
	ok: boolean;
	count?: number;
	via?: string;
	error?: string;
};

/** Grant every buyable Club asset to Player.Inventory, then sync once. */
export function seidrCheatAddAllItems(): SeidrCheatResult {
	if (typeof Player === "undefined" || !Player) return { ok: false, error: "No player." };
	if (typeof InventoryAdd !== "function" && typeof InventoryAddMany !== "function") {
		return { ok: false, error: "Inventory add is not available." };
	}
	const bundle: { Name: string; Group: string }[] = [];
	const assets: any[] = typeof Asset !== "undefined" && Array.isArray(Asset) ? Asset : [];
	for (let i = 0; i < assets.length; i++) {
		const A: any = assets[i];
		if (!A || !A.Name || !A.Group || !A.Group.Name) continue;
		if (A.Value === -1) continue;
		bundle.push({ Name: String(A.Name), Group: String(A.Group.Name) });
	}
	let n = 0;
	if (typeof InventoryAddMany === "function") {
		InventoryAddMany(Player, bundle, false);
		n = bundle.length;
	} else if (typeof InventoryAdd === "function") {
		for (let j = 0; j < bundle.length; j++) {
			InventoryAdd(Player, bundle[j].Name, bundle[j].Group, false);
			n += 1;
		}
	}
	if (typeof ServerPlayerInventorySync === "function") {
		try {
			ServerPlayerInventorySync();
		} catch (_e) {
			/* ignore */
		}
	}
	return { ok: true, count: n };
}

/** Prefer BCC / Club AddAllItems when present; else Seidr grant. */
export function seidrRunGiveAllItems(): SeidrCheatResult {
	try {
		if (typeof BCC !== "undefined" && BCC && typeof BCC.AddAllItems === "function") {
			BCC.AddAllItems();
			return { ok: true, via: "BCC" };
		}
		const w = typeof window !== "undefined" ? (window as any) : null;
		if (w && typeof w.AddAllItems === "function") {
			w.AddAllItems();
			return { ok: true, via: "AddAllItems" };
		}
		return seidrCheatAddAllItems();
	} catch (e: any) {
		return { ok: false, error: String(e && e.message ? e.message : e) };
	}
}
