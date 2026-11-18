/**
 * Theme-aware HTML for Seidr local chat lines ([Seidr] + body).
 * Cream body text is unreadable on Club Light / Light2 chat themes.
 */
declare const Player: any;

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** True when chat log uses a light ColorTheme (Light / Light2). */
export function seidrChatThemeIsLight(): boolean {
	try {
		const theme = String(Player?.ChatSettings?.ColorTheme || "");
		return /^light/i.test(theme);
	} catch (e) {
		return false;
	}
}

/** Gold tag + body colors that contrast with the active chat theme. */
export function seidrLocalChatHtml(text: string): string {
	const light = seidrChatThemeIsLight();
	const tag = light ? "#8a6a00" : "#d4a017";
	const body = light ? "#3a3428" : "#f0e6d4";
	return (
		`<span style="color:${tag};">[Seidr]</span> ` +
		`<span style="color:${body};">${escapeHtml(text)}</span>`
	);
}
