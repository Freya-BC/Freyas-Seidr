/** R134+ ChatAdmin menubar — Seidr logo left of Export Room Code (RTL append) */
import { Seidr } from "../seidr";
import { seidrGetSettings } from "../settings/storage";
import { rmIsShown } from "./model";
import { rmOpenPanel } from "./shell";
import { rmInjectStyles } from "./styles";

declare function ElementWrap(elementOrId: string | HTMLElement | null | undefined): HTMLElement | null;
declare const ElementButton: {
	Create: (
		id: string | null,
		onClick: () => void,
		options?: Record<string, unknown>,
		htmlOptions?: Record<string, unknown>,
	) => HTMLButtonElement;
};

const BTN_ID = "seidr-chat-admin-rm";
const MENU_ID = "chat-admin-screen-menu";
const EXPORT_ID = "chat-admin-room-export";
const SCREEN_ID = "chat-admin-screen";

function wrap(id: string): HTMLElement | null {
	try {
		if (typeof ElementWrap === "function") return ElementWrap(id);
	} catch (e) { /* ignore */ }
	return document.getElementById(id);
}

function rmChatAdminBtnAllowed(): boolean {
	if (!rmIsShown()) return false;
	if (seidrGetSettings().roomManagerEnabled === false) return false;
	// Prefer DOM presence over CurrentScreen — Load/Run timing can disagree briefly.
	if (wrap(SCREEN_ID) || wrap(MENU_ID) || wrap(EXPORT_ID)) return true;
	try {
		return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatAdmin";
	} catch (e) {
		return false;
	}
}

function logoUrl(): string {
	return Seidr.LOGO_URL || "https://freya-bc.github.io/Freyas-Seidr/assets/SEIDR-Logo-Transparent.png";
}

function findMenubar(): HTMLElement | null {
	const menu = wrap(MENU_ID);
	if (menu) return menu;

	const exportBtn = wrap(EXPORT_ID);
	if (exportBtn && exportBtn.parentElement) return exportBtn.parentElement;

	const screen = wrap(SCREEN_ID);
	if (screen) {
		const bar = screen.querySelector('[role="menubar"]');
		if (bar instanceof HTMLElement) return bar;
		const header = screen.querySelector(".screen-header, header");
		const headerBar = header && header.querySelector('[role="menubar"], .menubar');
		if (headerBar instanceof HTMLElement) return headerBar;
	}

	const loose = document.querySelector(`#${EXPORT_ID}`);
	if (loose && loose.parentElement) return loose.parentElement;

	return null;
}

/** Mount Room Manager into the DOM ChatAdmin menubar (left of Export via RTL append). */
export function rmChatAdminMountButton() {
	if (!rmChatAdminBtnAllowed()) return;
	if (document.getElementById(BTN_ID)) return;

	const host = findMenubar();
	if (!host) return;
	try { rmInjectStyles(); } catch (e) { /* ignore */ }

	if (typeof ElementButton === "undefined" || !ElementButton || typeof ElementButton.Create !== "function") {
		return;
	}

	let button: HTMLButtonElement;
	try {
		button = ElementButton.Create(
			BTN_ID,
			function () {
				rmOpenPanel();
			},
			{
				image: logoUrl(),
				tooltip: "Room Manager",
			},
		);
	} catch (e) {
		console.warn("[Seidr] ChatAdmin RM button create failed", e);
		return;
	}

	// Dev-recommended pattern; RTL menubar → visually left of Export.
	const menu = wrap(MENU_ID);
	if (menu) {
		ElementWrap(MENU_ID)?.append(button);
	} else {
		host.append(button);
	}
}

/** After Load (and delayed retries) — menubar may appear a tick later. */
export function rmChatAdminMountButtonSoon() {
	rmChatAdminMountButton();
	queueMicrotask(function () {
		rmChatAdminMountButton();
	});
	setTimeout(function () {
		rmChatAdminMountButton();
	}, 0);
	setTimeout(function () {
		rmChatAdminMountButton();
	}, 50);
	setTimeout(function () {
		rmChatAdminMountButton();
	}, 200);
}

Seidr.rmChatAdminMountButton = rmChatAdminMountButton;
Seidr.rmChatAdminMountButtonSoon = rmChatAdminMountButtonSoon;
