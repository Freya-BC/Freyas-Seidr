/** Ephemeral local chat warnings (ChatRoomSendLocal). */
import { SEIDR_CMD_ERROR_MS, SEIDR_CMD_WARN_MS } from "./model";

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function seidrCmdLocal(
	text: string,
	timeoutMs?: number
): void {
	if (typeof ChatRoomSendLocal !== "function") return;
	const ms = typeof timeoutMs === "number" ? timeoutMs : SEIDR_CMD_WARN_MS;
	const html =
		'<span style="color:#d4a017;">[Seidr]</span> ' +
		'<span style="color:#f0e6d4;">' + escapeHtml(text) + "</span>";
	try {
		ChatRoomSendLocal(html, ms);
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
