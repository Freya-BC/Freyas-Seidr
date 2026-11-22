/** Set a new unique ID and update the content only for meaningful news.
 * Keep the ID unchanged for minor patches. An empty ID disables the notice.
 * The ID is independent of Seidr.VERSION. */
import { Seidr } from "../seidr";

const NOTICE = {
	id: "seidr-action-wheel-map-cuddle-reactions",
	title: "A big Seidr update!",
	items: [
		{ title: "Action Wheel", body: "Right-click a character in a room or on a map for quick access to activities. Arrange your favorite actions and icons in the Wheel Designer, and switch between wheels using the arrows. You can also change the opening gesture under General → Action Wheel." },
		{ title: "Map Cuddle", body: "Pull and cuddle together in map rooms when the room and seating allow it. Your cuddle positions follow the map zoom, and you can adjust Pull and Cuddle offsets independently under General → Map Cuddle." },
		{ title: "Wiggles and wing flaps", body: "Bring your ears, tail, and wings to life! Configure wiggle sets under Animations → Wiggle, including their frames, amount, and delay. Play them together in animation clips or reactions, or use the optional Fast Wiggle button for quick access." },
		{ title: "Reaction Engine", body: "Create your own reactions under the Reaction tab. Trigger them when you perform or receive an activity, say a specific phrase, or climax, then run a sequence of chat messages, animations, wiggles, or actions. For example, make your ears and tail wiggle when someone caresses your ears." },
		{ title: "Advanced Cuddle", body: "Arrange the hub and each cuddle or pull position independently for screenshots and posed scenes. Enable Advanced Mode under General → Drawing, and optionally sync your layout with others in the cuddle who allow sync. This is intended for private rooms; synced layouts last only for the current cuddle." },
		{ title: "Chat Font and Seidr Appearance", body: "Give Club chat your own look with a preferred font and size under General → Chat Font. You can also choose between Seidr Classic and Plum & Gold under General → Appearance; the color scheme applies immediately." },
	],
};
let cleanup: (() => void) | null = null;
function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function seidrInstallChangelog(): void {
	if (!NOTICE.id || !NOTICE.items.length || cleanup) return;
	const key = "Seidr_changelog_" + String(Player.MemberNumber);
	const sessionKey = key + "_closed_" + NOTICE.id;
	try { if (localStorage.getItem(key) === NOTICE.id || sessionStorage.getItem(sessionKey) === "1") return; } catch (e) { /* Show if storage is unavailable. */ }
	const docsUrl = String(Seidr.DOCS_BASE_URL || "https://freya-bc.github.io/Freyas-Seidr").replace(/\/$/, "") + "/";
	const root = document.createElement("div");
	root.id = "seidr-changelog";
	root.innerHTML = '<style>#seidr-changelog{font:14px/1.5 system-ui,sans-serif;color:#f0e6d4}#seidr-changelog button{cursor:pointer;font:inherit;color:inherit;background:#463350;border:1px solid #b3905c;border-radius:6px;padding:9px 14px}#seidr-changelog-banner{position:fixed;right:16px;bottom:110px;z-index:9000;box-shadow:0 6px 24px #0008}#seidr-changelog-modal{position:fixed;inset:0;z-index:9001;display:flex;align-items:center;justify-content:center;background:#0009}#seidr-changelog-modal[hidden]{display:none}#seidr-changelog-card{background:#241c30;border:1px solid #b3905c;border-radius:10px;padding:22px;max-width:560px;max-height:80vh;overflow:auto;box-shadow:0 8px 30px #0009}#seidr-changelog-card h2{margin-top:0}#seidr-changelog-card a{color:#e7c583}#seidr-changelog-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}</style>' +
		'<button id="seidr-changelog-banner" type="button">Update · ' + escapeHtml(NOTICE.title) + '</button>' +
		'<div id="seidr-changelog-modal" hidden role="dialog" aria-modal="true" aria-labelledby="seidr-changelog-title"><div id="seidr-changelog-card"><h2 id="seidr-changelog-title">' + escapeHtml(NOTICE.title) + '</h2><p>Thank you for using Seidr! Here are some of the new things you can explore:</p><ul>' +
		NOTICE.items.map(function (item) { return '<li><strong>' + escapeHtml(item.title) + '</strong> — ' + escapeHtml(item.body) + '</li>'; }).join("") +
		'</ul><p>Want to learn more? Visit the <a href="' + escapeHtml(docsUrl) + '" target="_blank" rel="noopener noreferrer">Seidr documentation</a> for guides and settings.</p><div id="seidr-changelog-actions"><button id="seidr-changelog-close" type="button">Close</button><button id="seidr-changelog-dismiss" type="button">Close and Don’t show again</button></div></div></div>';
	document.body.appendChild(root);
	const banner = root.querySelector<HTMLButtonElement>("#seidr-changelog-banner")!;
	const modal = root.querySelector<HTMLElement>("#seidr-changelog-modal")!;
	function close(): void {
		try { sessionStorage.setItem(sessionKey, "1"); } catch (e) { /* ignore */ }
		root.remove(); document.removeEventListener("keydown", onKey, true); cleanup = null;
	}
	function onKey(event: KeyboardEvent): void { if (!modal.hidden && event.key === "Escape") { event.preventDefault(); close(); } }
	banner.addEventListener("click", function () { banner.hidden = true; modal.hidden = false; root.querySelector<HTMLButtonElement>("#seidr-changelog-close")?.focus(); });
	root.querySelector("#seidr-changelog-close")!.addEventListener("click", close);
	root.querySelector("#seidr-changelog-dismiss")!.addEventListener("click", function () { try { localStorage.setItem(key, NOTICE.id); } catch (e) { /* session dismissal still works */ } close(); });
	modal.addEventListener("click", function (event) { if (event.target === modal) close(); });
	document.addEventListener("keydown", onKey, true);
	cleanup = function () { document.removeEventListener("keydown", onKey, true); root.remove(); cleanup = null; };
}
Seidr.uninstallChangelog = function () { if (cleanup) cleanup(); };
