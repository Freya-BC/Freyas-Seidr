/** Dialog pose picker CSS — Seidr panel chrome (launcher is Club canvas DrawButton). */

export function seidrPoseCss(): string {
	return [
		"#seidr-pose-panel {",
		"  position: fixed; z-index: 130; display: none; flex-direction: column;",
		"  width: min(92vw, 420px); max-height: min(80vh, 520px);",
		"  background: rgb(var(--seidr-rgb-1c1626, 28 22 38) / 0.96); color: var(--seidr-color-f0e6d4, #f0e6d4);",
		"  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
		"  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
		"  overflow: hidden;",
		"  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
		"}",
		"#seidr-pose-panel.seidr-pose-open { display: flex; }",
		"#seidr-pose-panel[hidden] { display: none !important; }",
		".seidr-pose-header {",
		"  flex-shrink: 0; display: flex; align-items: center; gap: 8px;",
		"  padding: 8px 10px; background: rgb(var(--seidr-rgb-2a2238, 42 34 56) / 0.95);",
		"  border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none;",
		"}",
		".seidr-pose-header-title {",
		"  flex: 1; font-weight: 600; font-size: 12px; letter-spacing: 0.06em;",
		"  text-transform: uppercase; color: var(--seidr-color-d4a017, #d4a017);",
		"}",
		".seidr-pose-icon-btn {",
		"  width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);",
		"  background: transparent; color: inherit; cursor: pointer; font: inherit;",
		"  display: inline-grid; place-items: center; padding: 0; line-height: 1;",
		"}",
		".seidr-pose-icon-btn:hover { border-color: var(--seidr-color-d4a017, #d4a017); color: var(--seidr-color-d4a017, #d4a017); }",
		".seidr-pose-icon-btn svg { display: block; pointer-events: none; }",
		".seidr-pose-body {",
		"  flex: 1; min-height: 0; overflow: auto; padding: 10px;",
		"}",
		".seidr-pose-grid {",
		"  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;",
		"}",
		".seidr-pose-tile {",
		"  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;",
		"  gap: 6px; min-height: 88px; padding: 8px 4px 6px;",
		"  border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);",
		"  background: rgb(var(--seidr-rgb-14101c, 20 16 28) / 0.9); color: var(--seidr-color-f0e6d4, #f0e6d4);",
		"  cursor: pointer; font: inherit;",
		"}",
		".seidr-pose-tile:hover:not(:disabled) { border-color: var(--seidr-color-d4a017, #d4a017); }",
		".seidr-pose-tile:disabled {",
		"  opacity: 0.35; cursor: not-allowed;",
		"}",
		".seidr-pose-tile img, .seidr-pose-tile svg {",
		"  width: 44px; height: 44px; object-fit: contain; pointer-events: none;",
		"  filter: invert(1) brightness(1.05);",
		"}",
		".seidr-pose-tile svg { filter: none; fill: var(--seidr-color-f0e6d4, #f0e6d4); }",
		".seidr-pose-tile-label {",
		"  font-size: 10px; line-height: 1.2; text-align: center;",
		"  color: var(--seidr-color-a898b0, #a898b0); max-width: 100%;",
		"  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
		"}",
		".seidr-pose-empty {",
		"  padding: 16px 8px; text-align: center; color: var(--seidr-color-a898b0, #a898b0); font-size: 12px;",
		"}",
	].join("\n");
}

export function seidrInjectPoseStyles(): void {
	if (document.getElementById("seidr-pose-styles")) return;
	const style = document.createElement("style");
	style.id = "seidr-pose-styles";
	style.textContent = seidrPoseCss();
	(document.head || document.documentElement).appendChild(style);
}
