/** Ephemeral local chat warnings (ChatRoomSendLocal). */
import { seidrLocalChatHtml } from "../chat/localHtml";
import { SEIDR_CMD_ERROR_MS, SEIDR_CMD_WARN_MS } from "./model";

export function seidrCmdLocal(
	text: string,
	timeoutMs?: number
): void {
	if (typeof ChatRoomSendLocal !== "function") return;
	const ms = typeof timeoutMs === "number" ? timeoutMs : SEIDR_CMD_WARN_MS;
	try {
		ChatRoomSendLocal(seidrLocalChatHtml(text), ms);
	} catch (e) {
		console.warn("[Seidr Cmd]", text);
	}
}

export function seidrCmdWarn(text: string): void {
	seidrCmdLocal(text, SEIDR_CMD_WARN_MS);
}

export function seidrCmdError(text: string): void {
	seidrCmdLocal(text, SEIDR_CMD_ERROR_MS);
}
