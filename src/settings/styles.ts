/** Seidr settings panel CSS */
export function seidrSettingsCss(): string {
	return [
		"#seidr-settings-root { position: fixed; inset: 0; z-index: 119; pointer-events: none; }",
		"#seidr-settings-root * { box-sizing: border-box; }",
		"#seidr-settings-panel {",
		"  pointer-events: auto; position: fixed; z-index: 120;",
		"  display: none; flex-direction: column;",
		"  width: min(92vw, 420px); min-width: 300px;",
		"  max-height: min(80vh, 520px);",
		"  background: rgba(28, 22, 38, 0.96); color: #f0e6d4;",
		"  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
		"  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
		"  overflow: hidden;",
		"  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
		"  left: 50%; top: 18%; transform: translateX(-50%);",
		"}",
		"#seidr-settings-panel.seidr-settings-open { display: flex; }",
		"#seidr-settings-panel[hidden] { display: none !important; }",
		".seidr-settings-header {",
		"  flex-shrink: 0; display: flex; align-items: center; gap: 8px;",
		"  padding: 8px 10px; background: rgba(42, 34, 56, 0.95);",
		"  border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move; user-select: none;",
		"}",
		".seidr-settings-header-title { flex: 1; font-weight: 600; }",
		".seidr-settings-header-title span {",
		"  margin-left: 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;",
		"  text-transform: uppercase; color: #d4a017;",
		"  border: 1px solid rgba(212,160,23,0.35); border-radius: 999px; padding: 2px 7px;",
		"}",
		".seidr-settings-icon-btn {",
		"  width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);",
		"  background: transparent; color: inherit; cursor: pointer;",
		"}",
		".seidr-settings-icon-btn:hover { border-color: #d4a017; color: #d4a017; }",
		".seidr-settings-body {",
		"  flex: 1; min-height: 0; overflow: auto; padding: 12px 14px;",
		"  display: flex; flex-direction: column; gap: 14px;",
		"}",
		".seidr-settings-sec {",
		"  background: rgba(42, 34, 56, 0.85); border: 1px solid rgba(255,255,255,0.1);",
		"  border-radius: 6px; padding: 10px;",
		"}",
		".seidr-settings-sec h3 {",
		"  margin: 0 0 8px; font-size: 11px; letter-spacing: 0.05em;",
		"  text-transform: uppercase; color: #d4a017;",
		"}",
		".seidr-settings-row {",
		"  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;",
		"}",
		".seidr-settings-row label {",
		"  display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; min-width: 0;",
		"}",
		".seidr-settings-row select {",
		"  flex: 1; min-width: 160px;",
		"  background: rgba(20,16,28,0.9); color: #f0e6d4; border: 1px solid rgba(255,255,255,0.14);",
		"  border-radius: 4px; padding: 6px 8px;",
		"}",
		".seidr-settings-row button {",
		"  background: rgba(60,48,80,0.9); color: #f0e6d4;",
		"  border: 1px solid rgba(255,255,255,0.14);",
		"  border-radius: 4px; padding: 4px 10px; cursor: pointer;",
		"}",
		".seidr-settings-row button:hover { border-color: #d4a017; }",
		".seidr-settings-hint {",
		"  margin: 6px 0 0; font-size: 11px; color: #a898b0;",
		"}",
	].join("\n");
}

export function seidrInjectSettingsStyles() {
	let el = document.getElementById("seidr-settings-styles");
	if (!el) {
		el = document.createElement("style");
		el.id = "seidr-settings-styles";
		(document.head || document.documentElement).appendChild(el);
	}
	el.textContent = seidrSettingsCss();
}
