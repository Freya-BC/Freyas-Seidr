import { seidrGetSettings, seidrSaveSettings } from "../settings/storage";
import { normalizeRadial, type RadialEntry } from "./model";
import { radialCatalog, wedge } from "./runtime";
import { RADIAL_ICON_IDS, radialIcon, radialIconId } from "./icons";
import { seidrOpenSettings } from "../settings/shell";

declare const ActivityFemale3DCG: { Name: string; Prerequisite?: string[] }[];
const svgNamespace = "http://www.w3.org/2000/svg";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") {
	const node = document.createElement(tag);
	node.className = cls;
	node.textContent = text;
	return node;
}

function button(label: string, action: () => void, disabled = false) {
	const node = el("button", "sr-edit-button", label);
	node.type = "button";
	node.disabled = disabled;
	node.onclick = action;
	return node;
}

function option(label: string, value: string) {
	return new Option(label, value);
}

export function buildRadialTab(pane: HTMLElement, openDirectly = false) {
	let draft = normalizeRadial(seidrGetSettings().radial);
	let selected = 0;
	let overlay: HTMLElement | undefined;
	let settingsObserver: MutationObserver | undefined;
	let body: HTMLElement | undefined;
	let drag: { index: number } | { entry: RadialEntry } | undefined;
	let notice = "";
	const catalogue = radialCatalog();
	const requirements = new Map<string, string>();
	if (typeof ActivityFemale3DCG !== "undefined") {
		for (const activity of ActivityFemale3DCG) {
			const items = (Array.isArray(activity.Prerequisite) ? activity.Prerequisite : []).flatMap(rule => {
				const match = /^(TargetNeeds|Needs)-(.+)$/.exec(rule);
				return match ? [(match[1] === "TargetNeeds" ? "Target item: " : "Item: ") +
					match[2].replace(/([a-z])([A-Z])/g, "$1 $2")] : [];
			});
			if (items.length) requirements.set(activity.Name, items.join(", "));
		}
	}

	let search = "", slot = "";
	const actions = () => draft.wheels[selected];
	const fixed = (index: number) => selected === 0 && index === 0;
	const refresh = () => render(body ?? pane, !!body);
	function changeWheel(delta: number) {
		selected = (selected + delta + draft.wheels.length) % draft.wheels.length;
		refresh();
	}

	function closeVisual() {
		settingsObserver?.disconnect();
		settingsObserver = undefined;
		document.getElementById("seidr-settings-root")?.classList.remove("sr-settings-above");
		overlay?.remove();
		overlay = body = undefined;
		drag = undefined;
		refresh();
		pane.querySelector("button")?.focus();
	}

	function openVisual() {
		const existing = document.getElementById("seidr-radial-editor");
		if (existing) {
			existing.hidden = false;
			(existing.querySelector(".sr-window-header button") as HTMLButtonElement | null)?.focus();
			return;
		}
		overlay = el("div", "sr-editor-overlay");
		overlay.id = "seidr-radial-editor";
		const panel = el("section", "sr-editor-window");
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-modal", "true");
		panel.setAttribute("aria-label", "Wheel editor");
		const header = el("header", "sr-window-header");
		function syncSettingsVisibility() {
			const settingsPanel = document.getElementById("seidr-settings-panel");
			const isOpen = !!settingsPanel && !settingsPanel.hasAttribute("hidden") && settingsPanel.classList.contains("seidr-settings-open");
			overlay?.classList.toggle("sr-with-settings", isOpen);
			document.getElementById("seidr-settings-root")?.classList.toggle("sr-settings-above", isOpen);
		}
		const close = button("×", closeVisual);
		close.setAttribute("aria-label", "Close wheel editor");
		const settings = button("⚙", () => {
			seidrOpenSettings();
			const settingsPanel = document.getElementById("seidr-settings-panel");
			syncSettingsVisibility();
			settingsObserver?.disconnect();
			if (settingsPanel) {
				settingsObserver = new MutationObserver(syncSettingsVisibility);
				settingsObserver.observe(settingsPanel, {attributes: true, attributeFilter: ["hidden", "class"]});
			}
		});
		settings.title = "Open Seidr settings";
		settings.setAttribute("aria-label", "Open Seidr settings");
		const headerActions = el("div", "sr-header-actions");
		headerActions.append(settings, close);
		header.append(el("strong", "", "Wheel editor"), headerActions);
		body = el("div", "sr-window-body");
		panel.append(header, body);
		overlay.append(panel);
		document.body.append(overlay);
		const settingsPanel = document.getElementById("seidr-settings-panel");
		if (settingsPanel) {
			settingsObserver = new MutationObserver(syncSettingsVisibility);
			settingsObserver.observe(settingsPanel, {attributes: true, attributeFilter: ["hidden", "class"]});
		}
		syncSettingsVisibility();
		for (const event of ["pointerdown", "mousedown", "mouseup", "click", "wheel"]) {
			overlay.addEventListener(event, e => e.stopPropagation());
		}
		panel.onkeydown = e => {
			if (e.key === "Escape" && !e.defaultPrevented) {
				e.stopPropagation();
				closeVisual();
			}
		};
		header.onpointerdown = e => {
			if (e.button !== 0 || (e.target as Element).closest("button")) return;
			const rect = panel.getBoundingClientRect();
			const offsetX = e.clientX - rect.left, offsetY = e.clientY - rect.top;
			Object.assign(panel.style, {left: rect.left + "px", top: rect.top + "px", transform: "none"});
			header.setPointerCapture(e.pointerId);
			header.onpointermove = move => {
				panel.style.left = Math.max(0, Math.min(innerWidth - panel.offsetWidth, move.clientX - offsetX)) + "px";
				panel.style.top = Math.max(0, Math.min(innerHeight - panel.offsetHeight, move.clientY - offsetY)) + "px";
				panel.style.maxWidth = "calc(100vw - " + panel.style.left + ")";
				panel.style.maxHeight = "calc(100vh - " + panel.style.top + ")";
			};
			header.onlostpointercapture = () => { header.onpointermove = null; };
		};
		refresh();
		close.focus();
	}

	function move(from: number, to: number) {
		if (fixed(from) || fixed(to) || from === to) return;
		const [entry] = actions().splice(from, 1);
		actions().splice(to, 0, entry);
		refresh();
	}

	function wheelDestination(entry: RadialEntry, index: number) {
		const destination = el("select");
		destination.setAttribute("aria-label", "Move " + entry.label + " to another wheel");
		destination.append(option("Move to wheel…", ""));
		draft.wheels.forEach((wheel, i) => {
			if (i === selected) return;
			const choice = option("Wheel " + (i + 1) + (wheel.length >= 8 ? " (full)" : ""), String(i));
			choice.disabled = wheel.length >= 8;
			destination.append(choice);
		});
		destination.disabled = fixed(index) || draft.wheels.length < 2;
		destination.onchange = () => {
			if (destination.value === "" || fixed(index)) return;
			const next = draft.wheels[Number(destination.value)];
			if (next.length >= 8) return;
			next.push(...actions().splice(index, 1));
			refresh();
		};
		return destination;
	}

	function showIcons(anchor: HTMLElement, entry: RadialEntry, index: number, preview: HTMLElement) {
		preview.querySelector(".sr-icon-popup")?.remove();
		const popup = el("div", "sr-icon-popup");
		popup.setAttribute("role", "dialog");
		popup.setAttribute("aria-label", "Edit " + entry.label);
		const dismiss = () => { popup.remove(); anchor.focus(); };
		const close = button("×", dismiss);
		close.setAttribute("aria-label", "Close icon picker");
		const header = el("div", "sr-icon-popup-head");
		header.append(el("strong", "", entry.label), close);
		const grid = el("div", "sr-icon-grid");
		for (const id of RADIAL_ICON_IDS) {
			const choice = button("", () => {
				entry.icon = id;
				anchor.replaceChildren(radialIcon(entry));
				dismiss();
			});
			choice.className = "sr-icon-option";
			choice.title = id;
			choice.setAttribute("aria-label", id);
			choice.setAttribute("aria-pressed", String(id === radialIconId(entry)));
			choice.append(radialIcon({name: entry.name, icon: id}));
			grid.append(choice);
		}
		popup.append(header, grid, wheelDestination(entry, index));
		popup.onkeydown = e => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			e.stopPropagation();
			dismiss();
		};
		preview.append(popup);
		popup.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
	}

	function beginDrag(node: HTMLElement, source: NonNullable<typeof drag>) {
		node.draggable = true;
		node.ondragstart = event => {
			if (!event.dataTransfer) return;
			drag = source;
			event.dataTransfer.effectAllowed = "index" in source ? "move" : "copy";
			event.dataTransfer.setData("text/plain", node.textContent ?? "Wheel action");
		};
		node.ondragend = () => { drag = undefined; };
	}

	function wheelPreview() {
		const preview = el("div", "sr-visual-preview");
		const disc = document.createElementNS(svgNamespace, "svg");
		disc.classList.add("sr-preview-disc");
		disc.setAttribute("viewBox", "0 0 400 400");
		disc.setAttribute("aria-hidden", "true");
		preview.append(disc, el("div", "sr-preview-hub", (selected + 1) + " / " + draft.wheels.length));
		const entries = actions();
		const count = Math.min(8, entries.length + 1);
		for (let i = 0; i < count; i++) {
			const entry = entries[i];
			const path = document.createElementNS(svgNamespace, "path");
			path.setAttribute("d", wedge(i, count));
			path.setAttribute("class", entry ? "sr-slice" : "sr-slice sr-slot-empty");
			disc.append(path);
			const angle = -Math.PI / 2 + i * 2 * Math.PI / count;
			const x = Math.cos(angle), y = Math.sin(angle);
			const content = el("div", "sr-segment-content");
			content.style.left = (50 + 32.5 * x) + "%";
			content.style.top = (50 + 32.5 * y) + "%";
			if (entry) {
				const icon = fixed(i) ? el("span", "sr-editor-icon") : button("", () => showIcons(icon, entry, i, preview));
				icon.className = "sr-editor-icon";
				icon.title = fixed(i) ? "Fixed Cuddle action" : "Choose icon for " + entry.label;
				icon.setAttribute("aria-label", icon.title);
				icon.append(radialIcon(entry));
				content.append(icon, el("span", "sr-segment-label", entry.label));
				content.title = entry.label;
				if (!fixed(i)) beginDrag(content, {index: i});
			} else {
				content.append(el("span", "sr-empty-plus", "+"), el("span", "", "Drop action"));
			}
			preview.append(content);
			if (fixed(i)) continue;
			for (const target of [path, content]) {
				target.addEventListener("dragover", (event: Event) => {
					const e = event as DragEvent;
					if (!drag) return;
					e.preventDefault();
					if (e.dataTransfer) e.dataTransfer.dropEffect = "index" in drag ? "move" : "copy";
					path.classList.add("active");
				});
				target.addEventListener("dragleave", () => path.classList.remove("active"));
				target.addEventListener("drop", e => {
					e.preventDefault();
					path.classList.remove("active");
					const source = drag;
					drag = undefined;
					if (!source) return;
					if ("index" in source) move(source.index, Math.min(i, entries.length - 1));
					else {
						entries[i] = {...source.entry};
						refresh();
					}
				});
			}
			if (!entry) continue;
			const remove = button("×", () => { entries.splice(i, 1); refresh(); });
			remove.className = "sr-remove-item";
			remove.title = "Remove " + entry.label;
			remove.setAttribute("aria-label", remove.title);
			remove.style.left = `calc(${50 + 48.75 * x}% + ${16 * x}px)`;
			remove.style.top = `calc(${50 + 48.75 * y}% + ${16 * y}px)`;
			preview.append(remove);
		}
		return preview;
	}

	function listEditor() {
		const list = el("div", "sr-editor-list");
		actions().forEach((entry, i) => {
			const row = el("div", "sr-editor-row");
			const label = el("span", "sr-entry-label", entry.label);
			label.append(el("small", "", fixed(i) ? "Fixed · opens cuddle options" : entry.group));
			if (!fixed(i)) beginDrag(row, {index: i});
			row.ondragover = e => { if (!fixed(i) && drag && "index" in drag) e.preventDefault(); };
			row.ondrop = e => { if (drag && "index" in drag) { e.preventDefault(); move(drag.index, i); drag = undefined; } };
			row.append(label, button("↑", () => move(i, i - 1), fixed(i) || i === 0 || fixed(i - 1)),
				button("↓", () => move(i, i + 1), fixed(i) || i === actions().length - 1),
				wheelDestination(entry, i), button("Remove", () => { actions().splice(i, 1); refresh(); }, fixed(i)));
			list.append(row);
		});
		return list;
	}

	function activityPicker(visual: boolean) {
		const picker = el("section", "sr-picker");
		const filters = el("div", "sr-filters");
		const input = el("input");
		input.type = "search";
		input.placeholder = "Search activities";
		input.setAttribute("aria-label", "Search activities");
		input.value = search;
		const select = el("select");
		select.setAttribute("aria-label", "Filter activities by body slot");
		select.append(option("All body slots", ""));
		for (const group of [...new Set(catalogue.map(entry => entry.group))].sort()) {
			select.append(option(group.replace(/^Item/, ""), group));
		}
		select.value = slot;
		const results = el("div", "sr-picker-results");
		function populate() {
			results.replaceChildren();
			const query = search.trim().toLowerCase();
			for (const entry of catalogue) {
				const item = requirements.get(entry.name) ?? "";
				if ((slot && slot !== entry.group) || ![entry.label, entry.name, entry.group, item].join(" ").toLowerCase().includes(query)) continue;
				const tile = el("div", visual ? "sr-picker-tile" : "sr-picker-row");
				if (visual) {
					beginDrag(tile, {entry});
					const icon = el("span", "sr-tile-icon");
					icon.append(radialIcon(entry));
					tile.append(icon);
				}
				tile.append(el("span", "sr-tile-label", entry.label), el("small", "sr-item-info", entry.group.replace(/^Item/, "")));
				if (visual && item) tile.append(el("small", "sr-item-info", item));
				const add = button(visual ? "+" : "Add", () => { actions().push({...entry}); refresh(); }, actions().length >= 8);
				add.title = "Add " + entry.label;
				add.setAttribute("aria-label", add.title);
				tile.append(add);
				results.append(tile);
			}
			if (!results.childElementCount) results.append(el("p", "sr-help", "No matching activities."));
		}
		input.oninput = () => { search = input.value; populate(); };
		select.onchange = () => { slot = select.value; populate(); };
		filters.append(input, select);
		picker.append(el("h3", "", "Activities"), filters, results);
		populate();
		return picker;
	}

	function render(root: HTMLElement, visual: boolean) {
		root.replaceChildren();
		if (!visual) {
			const enabled = el("input");
			enabled.type = "checkbox";
			enabled.checked = draft.enabled;
			enabled.onchange = () => { draft.enabled = enabled.checked; };
			const label = el("label", "sr-editor-enable");
			label.append(enabled, " Enable action wheel");
			root.append(button("Open visual editor", openVisual), el("h2", "", "Fast Action Wheel"), label);
		}
		const nav = el("div", "sr-editor-nav");
		const previous = button("‹", () => changeWheel(-1), draft.wheels.length === 1);
		const next = button("›", () => changeWheel(1), draft.wheels.length === 1);
		previous.setAttribute("aria-label", "Previous wheel");
		next.setAttribute("aria-label", "Next wheel");
		nav.append(previous, el("strong", "", "Wheel " + (selected + 1) + " of " + draft.wheels.length), next,
			button("+ New wheel", () => { draft.wheels.push([]); selected = draft.wheels.length - 1; refresh(); }, draft.wheels.length >= 12),
			button("Delete wheel", () => { draft.wheels.splice(selected, 1); selected--; refresh(); }, selected === 0));
		const layout = el("div", visual ? "sr-visual-layout" : "");
		const left = el("div", "sr-visual-left");
		left.append(visual ? wheelPreview() : listEditor());
		if (visual) left.append(el("p", "sr-help", "Drag to rearrange or replace. Click an icon to change it."));
		layout.append(left, activityPicker(visual));
		const footer = el("div", "sr-editor-footer");
		function reset(defaults: boolean) {
			draft = normalizeRadial(defaults ? null : seidrGetSettings().radial);
			selected = 0;
			notice = defaults ? "Defaults restored in this draft." : "Changes discarded.";
			refresh();
		}
		const status = el("span", "sr-save-status", notice);
		status.setAttribute("role", "status");
		const save = button("Save changes", () => {
			const current = seidrGetSettings().radial;
			draft.transparency = current.transparency;
			draft.trigger = current.trigger;
			draft.modifier = current.modifier;
			draft.reopenLastWheel = current.reopenLastWheel;
			if (visual) draft.enabled = current.enabled;
			const result = seidrSaveSettings({radial: normalizeRadial(draft)});
			status.textContent = notice = result.ok ? "Wheel settings saved." : result.error ?? "Could not save wheel settings.";
		});
		save.classList.add("sr-save");
		footer.append(status, button("Reset defaults", () => reset(true)), button("Discard", () => reset(false)), save);
		root.append(nav, layout, footer);
	}

	render(pane, false);
	if (openDirectly) openVisual();
}
