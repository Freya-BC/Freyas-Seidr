/** Room helpers: character lookup, Echo yield, present map. */
import { Seidr } from "./seidr";
import { SeidrState } from "./state";

const ECHO_PAIR_NAMES: Record<string, boolean> = {
	"贴贴": true,
	"拉紧的牵绳": true,
	"拉紧的链子": true,
};
const ECHO_SYNC = "Luzi_XCharacterDrawState";

export function seidrFindChar(member: number) {
	if (typeof member !== "number") return null;
	if (typeof Player !== "undefined" && Player && Player.MemberNumber === member) return Player;
	if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) return null;
	for (let i = 0; i < ChatRoomCharacter.length; i++) {
		const c = ChatRoomCharacter[i];
		if (c && c.MemberNumber === member) return c;
	}
	return null;
}

export function seidrCharName(member: number) {
	const c = seidrFindChar(member);
	if (!c) return String(member);
	return (c as any).Nickname || c.Name || String(member);
}

function seidrEchoAssetName(name: string) {
	return !!(name && ECHO_PAIR_NAMES[name]);
}

export function seidrInEcho(character: any) {
	if (!character) return false;
	if (Array.isArray(character.Appearance)) {
		for (let i = 0; i < character.Appearance.length; i++) {
			const item = character.Appearance[i];
			if (!item || !item.Asset || !seidrEchoAssetName(item.Asset.Name)) continue;
			const group = item.Asset.Group && item.Asset.Group.Name;
			if (group === "ItemMisc" || group === "ItemHandheld") return true;
		}
	}
	const order = character.XCharacterDrawOrder;
	const asset = order && order.associatedAsset && order.associatedAsset.asset;
	return seidrEchoAssetName(asset);
}

function seidrApplyEchoYield(next: any, me: number, before: any) {
	if (JSON.stringify(next) === JSON.stringify(before)) return false;
	Seidr.setHubs(next);
	if (Seidr.publishChanged) Seidr.publishChanged(before, next, me, me);
	if (Seidr.badgeActivityButtons) {
		try { Seidr.badgeActivityButtons(); } catch (e) { /* ignore */ }
	}
	return true;
}

/** Appearance / draw-order based: yield whenever Echo tokens touch our cluster. */
export function seidrReconcileEcho() {
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	if (typeof Seidr.getHubs !== "function") return;
	const me = Player.MemberNumber;
	const before = Seidr.getHubs();
	const cluster = SeidrState.clusterOf(before, me);
	if (!cluster) return;

	let next = before;
	if (seidrInEcho(Player)) {
		next = SeidrState.releaseMember(before, me);
		seidrApplyEchoYield(next, me, before);
		return;
	}
	if (cluster.hub === me) {
		next = before;
		["left", "right", "cuddle"].forEach(function (slot) {
			const held = SeidrState.occupant(next, me, slot);
			if (held == null) return;
			const ch = seidrFindChar(held);
			if (ch && seidrInEcho(ch)) next = SeidrState.clearSlot(next, me, slot);
		});
		seidrApplyEchoYield(next, me, before);
		return;
	}
	const hub = seidrFindChar(cluster.hub);
	if (hub && seidrInEcho(hub)) {
		next = SeidrState.leaveSelf(before, me);
		seidrApplyEchoYield(next, me, before);
	}
}

/** Fast path from Echo's Hidden sync — do not wait for Appearance to catch up. */
export function seidrYieldOnEchoSync(data: any) {
	if (!data || data.Type !== "Hidden" || data.Content !== ECHO_SYNC) return;
	if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
	if (typeof Seidr.getHubs !== "function") return;
	const sender = data.Sender;
	if (typeof sender !== "number") return;
	const payload = Array.isArray(data.Dictionary) ? data.Dictionary[0] : null;
	const asset = payload && payload.associatedAsset && payload.associatedAsset.asset;
	if (!seidrEchoAssetName(asset)) return;

	const me = Player.MemberNumber;
	const before = Seidr.getHubs();
	const cluster = SeidrState.clusterOf(before, me);
	if (!cluster) return;

	let next = before;
	if (sender === me) {
		next = SeidrState.releaseMember(before, me);
	} else if (cluster.hub === me) {
		const slot = sender === cluster.left ? "left"
			: sender === cluster.right ? "right"
			: sender === cluster.cuddle ? "cuddle" : null;
		if (!slot) return;
		next = SeidrState.clearSlot(before, me, slot);
	} else if (sender === cluster.hub || sender === me) {
		next = SeidrState.leaveSelf(before, me);
	} else {
		return;
	}
	seidrApplyEchoYield(next, me, before);
}

export function seidrAllowAct(actor: any, target: any) {
	if (typeof ServerChatRoomGetAllowItem !== "function") return true;
	try {
		return ServerChatRoomGetAllowItem(actor, target) !== false;
	} catch (e) {
		return false;
	}
}

export function seidrPresentMap() {
	const map: Record<number, boolean> = {};
	if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
		map[Player.MemberNumber] = true;
	}
	if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
		for (let i = 0; i < ChatRoomCharacter.length; i++) {
			const c = ChatRoomCharacter[i];
			if (c && typeof c.MemberNumber === "number") map[c.MemberNumber] = true;
		}
	}
	return map;
}
