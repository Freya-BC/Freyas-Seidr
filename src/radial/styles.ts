export function installRadialStyles(){if(document.getElementById("seidr-radial-styles"))return;const style=document.createElement("style");style.id="seidr-radial-styles";style.textContent=`
.sr-root{position:fixed;z-index:10050;background:transparent;color:var(--seidr-color-f0e6d4, #f0e6d4);border:0;padding:0;box-sizing:border-box;font:16px system-ui,sans-serif}.sr-heading{background:var(--seidr-color-3c3050, #3c3050);border-radius:8px;padding:9px;text-align:center;font-size:19px;font-weight:bold}.sr-disk{position:relative;width:100%;aspect-ratio:1}.sr-disk > svg{position:absolute;inset:0;width:100%;height:100%}.sr-slice{fill:var(--seidr-color-30283e, #30283e);stroke:var(--seidr-color-d4a017, #d4a017);stroke-width:2}.sr-slice.disabled{fill:var(--seidr-color-494350, #494350)}.sr-slice.active{fill:var(--seidr-color-504064, #504064)}.sr-slice.disabled.active{fill:var(--seidr-color-60566a, #60566a)}.sr-tooltip{display:none;position:absolute;z-index:4;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:var(--seidr-color-1c1626, #1c1626);color:var(--seidr-color-f0e6d4, #f0e6d4);border:1px solid var(--seidr-color-d4a017, #d4a017);border-radius:7px;padding:8px 12px;text-align:center;font:14px system-ui;min-width:180px;pointer-events:none}.sr-tooltip.visible{display:block}.sr-action{display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;position:absolute;transform:translate(-50%,-50%);width:24%;max-height:23%;overflow:visible;background:transparent;border:0;color:var(--seidr-color-f0e6d4, #f0e6d4);font:bold clamp(10px,2.6vw,16px)/1.1 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 2px #000}.sr-icon svg,.sr-tile-icon svg{position:static;width:1.4em;height:1.4em;width:1.4em;height:1.4em;display:block;margin:auto}.sr-icon{display:block;font-size:23px;line-height:1.1;margin-bottom:3px}.sr-action:hover,.sr-action:focus-visible{color:var(--seidr-color-d4a017, #d4a017);text-decoration:underline}.sr-action[aria-disabled=true]{color:var(--seidr-color-a898b0, #a898b0);cursor:help}.sr-hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30%;height:30%;border:2px solid var(--seidr-color-d4a017, #d4a017);border-radius:50%;background:var(--seidr-color-1c1626, #1c1626);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px} .sr-controls{position:absolute;inset:0;border-radius:50%;overflow:hidden}.sr-controls button{position:absolute;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--seidr-color-f0e6d4, #f0e6d4);padding:0;box-sizing:border-box;line-height:1}.sr-controls .sr-arrow{top:0;bottom:0;width:50%;border:0;background:var(--seidr-color-30283e, #30283e);font:normal 32px/1 system-ui,sans-serif}.sr-controls .sr-arrow:first-child{left:0;border-right:1px solid var(--seidr-color-d4a017, #d4a017);padding-right:18%}.sr-controls .sr-arrow:last-child:not(:first-child){right:0;padding-left:18%}.sr-controls .sr-close{z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:44%;height:44%;border:2px solid var(--seidr-color-d4a017, #d4a017);border-radius:50%;background:var(--seidr-color-1c1626, #1c1626);font:normal 30px/1 system-ui,sans-serif}.sr-controls button:hover,.sr-controls button:focus-visible{color:var(--seidr-color-d4a017, #d4a017);background:var(--seidr-color-504064, #504064)}.sr-hub small{position:absolute;bottom:9%;left:0;width:100%;text-align:center;pointer-events:none;color:var(--seidr-color-c8b8a0, #c8b8a0);font-size:11px;z-index:3}
/* Scale the action contents with the wheel. Draw the close mark geometrically. */
.sr-disk{container-type:inline-size}
.sr-action{gap:3px;padding:0;font-size:clamp(9px,3.45cqw,16px);line-height:1.15;max-height:none}
.sr-action .sr-icon{font-size:clamp(14px,5.4cqw,25px);margin:0}
.sr-action .sr-segment-label{text-wrap:balance}
.sr-controls .sr-close{font-size:0}
.sr-close::before,.sr-close::after{content:"";position:absolute;left:50%;top:50%;width:49%;height:2px;background:currentColor;border-radius:2px;transform:translate(-50%,-50%) rotate(45deg)}
.sr-close::after{transform:translate(-50%,-50%) rotate(-45deg)}
/* Both editors use the Seidr settings palette. */
.sr-root .sr-slice{fill-opacity:var(--sr-opacity,1)}
.sr-root .sr-hub,.sr-root .sr-controls .sr-close{background:rgb(var(--seidr-rgb-1c1626, 28 22 38) / var(--sr-opacity,1))}
.sr-root .sr-controls .sr-arrow{background:rgb(var(--seidr-rgb-30283e, 48 40 62) / var(--sr-opacity,1))}
.sr-root .sr-controls button:hover,.sr-root .sr-controls button:focus-visible{background:rgb(var(--seidr-rgb-504064, 80 64 100) / var(--sr-opacity,1))}
.sr-info-row{position:absolute;z-index:5;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);max-width:calc(100vw - 100px)}
.sr-info-row .sr-tooltip{position:static;transform:none;min-width:180px;max-width:min(300px,calc(100vw - 80px));overflow-wrap:anywhere}
.sr-wheel-edit{position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);width:36px;height:36px;display:grid;place-items:center;padding:3px;border:1px solid var(--seidr-color-d4a017, #d4a017);border-radius:7px;background:var(--seidr-color-1c1626, #1c1626);color:var(--seidr-color-f0e6d4, #f0e6d4);font-size:22px;cursor:pointer}
.sr-wheel-edit:hover,.sr-wheel-edit:focus-visible{background:var(--seidr-color-504064, #504064);color:var(--seidr-color-d4a017, #d4a017)}
.sr-editor-overlay{position:fixed;inset:0;z-index:11000;background:transparent}
.sr-editor-overlay.sr-with-settings{background:transparent;pointer-events:none}
.sr-editor-overlay.sr-with-settings .sr-editor-window{pointer-events:auto}
#seidr-settings-root.sr-settings-above{z-index:11001}
.sr-editor-window{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
 width:min(1000px,95vw);height:min(690px,90vh);min-width:min(355px,95vw);min-height:min(290px,90vh);
 max-width:95vw;max-height:95vh;resize:both;container-type:inline-size;
 overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;
 background:var(--seidr-color-1c1626, #1c1626);color:var(--seidr-color-f0e6d4, #f0e6d4);border:1px solid var(--seidr-color-695b78, #695b78);border-radius:12px;
 box-shadow:0 16px 60px #0009;font:13px/1.4 system-ui,sans-serif}
.sr-editor-window *{box-sizing:border-box}
.sr-window-header{display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
 padding:10px 16px;background:var(--seidr-color-2a2238, #2a2238);border-bottom:1px solid var(--seidr-color-51445e, #51445e);
 cursor:move;touch-action:none;user-select:none;font-size:16px}
.sr-header-actions{display:flex;align-items:center;gap:8px}
.sr-window-body{padding:0 18px;overflow:auto;flex:1;min-height:0;min-width:0}
.sr-window-body,.sr-picker-results,.sr-icon-grid{scrollbar-width:thin;scrollbar-color:rgb(var(--seidr-rgb-d4a017, 212 160 23) / .55) rgb(var(--seidr-rgb-14101c, 20 16 28) / .9)}
.sr-editor-nav,.sr-editor-footer,.sr-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
.sr-editor-nav strong{min-width:90px;text-align:center;color:var(--seidr-color-f0e6d4, #f0e6d4)}
.sr-visual-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.sr-visual-layout .sr-visual-left{display:grid;justify-items:center;min-width:0;padding:28px 0 0}
.sr-visual-preview{position:relative;container-type:inline-size;width:min(calc(100% - 58px),400px,max(180px,calc(90vh - 265px)));aspect-ratio:1}
.sr-preview-disc{display:block;width:100%;height:100%;position:absolute;inset:0}
.sr-slot-empty{fill:var(--seidr-color-21192d, #21192d);stroke-dasharray:5 4}
.sr-slot-empty.active{fill:var(--seidr-color-504064, #504064)}
.sr-preview-hub{position:absolute;inset:34%;border-radius:50%;display:grid;place-items:center;
 background:var(--seidr-color-1c1626, #1c1626);color:var(--seidr-color-d4a017, #d4a017);border:1px solid var(--seidr-color-d4a017, #d4a017);font-weight:600;pointer-events:none}
.sr-segment-content{position:absolute;transform:translate(-50%,-50%);width:23%;
 display:grid;justify-items:center;gap:2px;text-align:center;font-size:clamp(8px,3.3cqw,13px);line-height:1.12}
.sr-segment-content[draggable=true]{cursor:grab}
.sr-segment-label{overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sr-editor-icon{display:grid;place-items:center;width:clamp(19px,9cqw,36px);aspect-ratio:1;
 padding:3px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit}
button.sr-editor-icon{cursor:pointer}
button.sr-editor-icon:hover,button.sr-editor-icon:focus-visible{border-color:var(--seidr-color-d4a017, #d4a017);color:var(--seidr-color-d4a017, #d4a017);background:var(--seidr-color-1c1626, #1c1626)}
.sr-editor-icon svg,.sr-icon-option svg{width:100%;height:100%;display:block}
.sr-png-icon{display:block;position:relative;overflow:hidden;width:100%;aspect-ratio:1}
.sr-png-icon img{position:absolute;display:block;max-width:none;max-height:none;pointer-events:none}
/* Match the var(--seidr-color-d4a017, #d4a017) accent at the brightest points while preserving shading. */
.sr-cuddle-crest{filter:grayscale(1) brightness(.521) sepia(1) saturate(3.6) hue-rotate(6deg)}
.sr-icon .sr-png-icon{width:2.2em;margin:auto}
.sr-tile-icon .sr-png-icon{width:1.8em;margin:auto}
.sr-empty-plus{font-size:1.7em;color:var(--seidr-color-d4a017, #d4a017)}
.sr-remove-item{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;
 width:23px;height:23px;padding:0;border:1px solid var(--seidr-color-695b78, #695b78);border-radius:50%;background:var(--seidr-color-1c1626, #1c1626);
 color:var(--seidr-color-f0e6d4, #f0e6d4);font:16px/1 system-ui;cursor:pointer;z-index:2}
.sr-remove-item:hover{border-color:var(--seidr-color-d4a017, #d4a017);color:var(--seidr-color-d4a017, #d4a017)}
.sr-icon-popup{position:absolute;z-index:10;left:50%;top:50%;transform:translate(-50%,-50%);
 width:min(340px,calc(100% + 40px));display:grid;gap:8px;padding:10px;
 background:var(--seidr-color-1c1626, #1c1626);border:1px solid var(--seidr-color-695b78, #695b78);border-radius:9px;box-shadow:0 8px 28px #000b}
.sr-icon-popup-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
.sr-icon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(56px,1fr));gap:6px;max-height:min(40vh,260px);overflow:auto}
.sr-icon-option{aspect-ratio:1;padding:4px;background:var(--seidr-color-3c3050, #3c3050);color:var(--seidr-color-f0e6d4, #f0e6d4);border:1px solid var(--seidr-color-695b78, #695b78);border-radius:5px;cursor:pointer}
.sr-icon-option:hover,.sr-icon-option[aria-pressed=true]{border-color:var(--seidr-color-d4a017, #d4a017);color:var(--seidr-color-d4a017, #d4a017)}
.sr-editor-list,.sr-picker{min-width:0;background:var(--seidr-color-241c30, #241c30);border:1px solid var(--seidr-color-51445e, #51445e);border-radius:9px;padding:10px}
.sr-picker h3{margin:0;color:var(--seidr-color-f0e6d4, #f0e6d4);font-size:14px}
.sr-picker-results{max-height:250px;overflow:auto}
.sr-visual-layout .sr-picker-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));
 gap:6px;max-height:max(100px,min(360px,calc(90vh - 300px)));padding-right:4px}
.sr-picker-tile{min-width:0;background:var(--seidr-color-30283e, #30283e);border:1px solid var(--seidr-color-51445e, #51445e);border-radius:7px;
 padding:6px;display:flex;flex-direction:column;text-align:center;align-items:center;gap:2px;cursor:grab;font-size:11px;overflow-wrap:anywhere}
.sr-picker-tile:hover{border-color:var(--seidr-color-d4a017, #d4a017)}
.sr-tile-icon{font-size:15px;color:var(--seidr-color-d4a017, #d4a017)}
.sr-picker-tile .sr-edit-button{padding:0 8px;margin-top:auto}
.sr-tile-label{font-weight:600}
.sr-item-info{font-size:10px;color:var(--seidr-color-c8b8a0, #c8b8a0)}
.sr-editor-row,.sr-picker-row{display:flex;align-items:center;gap:7px;padding:7px;border-bottom:1px solid var(--seidr-color-51445e, #51445e)}
.sr-entry-label,.sr-picker-row .sr-tile-label{flex:1;min-width:0}
.sr-entry-label small{display:block;opacity:.7}
.sr-edit-button{background:var(--seidr-color-3c3050, #3c3050);color:var(--seidr-color-f0e6d4, #f0e6d4);border:1px solid var(--seidr-color-695b78, #695b78);border-radius:6px;padding:5px 9px;cursor:pointer;font:inherit}
.sr-edit-button:disabled{opacity:.4;cursor:default}
.sr-edit-button:not(:disabled):hover{border-color:var(--seidr-color-d4a017, #d4a017)}
.sr-editor-window select,.sr-editor-row select,.sr-filters select,.sr-filters input{
 min-width:0;max-width:100%;background:var(--seidr-color-14101c, #14101c);color:var(--seidr-color-f0e6d4, #f0e6d4);border:1px solid var(--seidr-color-695b78, #695b78);border-radius:5px;padding:6px;font:inherit}
.sr-filters input{flex:1 1 135px}
.sr-help{color:var(--seidr-color-c8b8a0, #c8b8a0);font-size:12px;text-align:center;margin:12px 0 8px}
.sr-editor-enable{display:block;margin:10px 0}
.sr-editor-footer{justify-content:flex-end}
.sr-window-body .sr-editor-footer{position:sticky;bottom:0;margin-bottom:0;padding:10px 6px;background:var(--seidr-color-1c1626, #1c1626);border-top:1px solid var(--seidr-color-51445e, #51445e);z-index:12}
.sr-save-status{margin-right:auto;color:var(--seidr-color-c8b8a0, #c8b8a0)}
.sr-save{border-color:var(--seidr-color-d4a017, #d4a017);color:var(--seidr-color-ffdf91, #ffdf91)}
@container (max-width:600px){.sr-visual-layout{grid-template-columns:minmax(0,1fr)}.sr-visual-preview{max-width:310px}}
`;document.head.appendChild(style);}
