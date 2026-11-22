import { Seidr } from "../seidr";
import { radialIcon, radialPngIcon } from "./icons";
import { seidrGetSettings } from "../settings/storage";
import { type RadialEntry } from "./model";
import { seidrAllowAct } from "../room";
import { buildRadialTab } from "./editor";

declare const Player: any;
declare const ActivityFemale3DCG: any[];
declare const AssetGroup: any[];
declare const ChatRoomOwnerPresenceRule: (rule: any, c: any) => boolean;
declare const ActivityAllowedForGroup: (c: any, group: any) => any[];
declare const ActivityAllowed: () => boolean;
declare const ActivityRun: (actor: any, target: any, group: any, item: any) => void;
declare const AssetGroupGet: (family: any, group: any) => any;
declare const ActivityDictionaryText: (key: string) => string;
declare const ChatRoomCharacterViewLoopCharacters: (cb: (...args: any[]) => any) => void;
declare const ChatRoomCharacterDrawlist: any[];
declare const ChatRoomIsViewActive: (name: any) => boolean;
declare const ChatRoomMapViewFocusedCharacter: any;
declare const ChatRoomMapViewEditMode: string;
declare const ChatRoomMapViewEditStarted: boolean;
declare const ChatRoomMapViewKeysPressed: Record<string, boolean>;
declare const ChatRoomMapViewSplitPosition: number;
declare const ChatRoomMapViewNameTags: { C: any; rect: [number, number, number, number] }[];
declare const CurrentScreen: string;
declare const ChatRoomCharacter: any[];

const holds = ["Seidr_PullLeft", "Seidr_PullRight", "Seidr_Cuddle", "Seidr_JoinLeft", "Seidr_JoinRight", "Seidr_JoinCuddle", "Seidr_RemoveLeft", "Seidr_RemoveRight", "Seidr_RemoveCuddle", "Seidr_Remove"];
let target: any = null, wheel = 0, submenu = false, map = false;
let lastWheel = 0;
function lastWheelKey() { return "SeidrRadialLastWheel:" + String(Player?.MemberNumber ?? "unknown"); }
function saveLastWheel(index: number) {
 lastWheel = index;
 try { sessionStorage.setItem(lastWheelKey(), String(index)); } catch (_) { /* Keep the in-memory value. */ }
}
function readLastWheel(): number {
 try {
  const value = sessionStorage.getItem(lastWheelKey());
  if (value !== null && /^\d+$/.test(value)) return Number(value);
 } catch (_) { /* Use the in-memory value. */ }
 return lastWheel;
}
let abort: AbortController | null = null;
let mapDrawing = false;
let mapHitboxes: { character: any; x: number; y: number; width: number; height: number }[] = [];
function title(name: string) { return name.replace(/^Seidr_/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "); }
export function radialLabel(name: string, group: string): string {
 try { for (const key of ["Label-ChatOther-"+group+"-"+name, "Label-ChatSelf-"+group+"-"+name, "Activity"+name]) { const value = ActivityDictionaryText(key); if (value && value !== key && !value.includes("MISSING TEXT")) return value; } } catch (_) { /* fallback */ }
 return title(name);
}
export function radialCatalog(): RadialEntry[] {
 const out: RadialEntry[] = [];
 for (const act of (typeof ActivityFemale3DCG !== "undefined" ? ActivityFemale3DCG : [])) {
  if (!act || !act.Name || holds.includes(act.Name)) continue;
  const groups = new Set<string>([...(Array.isArray(act.Target) ? act.Target : []), ...(Array.isArray(act.TargetSelf) ? act.TargetSelf : [])]);
  for (const g of (typeof AssetGroup !== "undefined" ? AssetGroup : [])) if (g && typeof g.Name === "string" && groups.has(g.MirrorActivitiesFrom)) groups.add(g.Name);
  for (const group of groups) if (typeof group === "string") out.push({name: act.Name, group, label: radialLabel(act.Name, group)});
 }
 return out.sort((a,b)=>a.label.localeCompare(b.label) || a.group.localeCompare(b.group));
}
export function radialAllowed(e: RadialEntry, target: any): { item?: any; reason?: string } {
 if (!target || !Array.isArray(ChatRoomCharacter) || !ChatRoomCharacter.some((c: any) => c.MemberNumber === target.MemberNumber)) return {reason:"Character is no longer in the room"};
 if (typeof ChatRoomOwnerPresenceRule === "function" && (ChatRoomOwnerPresenceRule("BlockAccessSelf", target) || ChatRoomOwnerPresenceRule("BlockAccessOther", target))) return {reason:"Access is restricted"};
 if ((typeof ActivityAllowed === "function" && !ActivityAllowed()) || (target !== Player && !seidrAllowAct(Player, target))) return {reason:"Activities are not permitted here or for this character"};
 const activity = ActivityFemale3DCG.find(a => a.Name === e.name);
 if (!activity) return {reason:"Activity is missing or its mod is inactive"};
 const group = AssetGroupGet(target.AssetFamily, e.group as any);
 if (!group) return {reason:"This body slot is unavailable"};
 try {
  const item = ActivityAllowedForGroup(target, e.group as any).find(a => a.Activity.Name === e.name && !a.Blocked);
  return item ? {item} : {reason:"Unavailable for this character or current conditions"};
 } catch (_) { return {reason:"Activity is currently unavailable"}; }
}
function close() { document.getElementById("seidr-radial-root")?.remove(); target = null; }
export function wedge(i: number, count: number): string {
 const angle = 2 * Math.PI / count, start = -Math.PI/2 - angle/2 + i*angle, end = start+angle;
 const p = (r:number,a:number) => `${200+r*Math.cos(a)},${200+r*Math.sin(a)}`;
 if (count === 1) return `M 200,5 A 195,195 0 1 1 200,395 A 195,195 0 1 1 200,5 Z M 200,135 A 65,65 0 1 0 200,265 A 65,65 0 1 0 200,135 Z`;
 return `M ${p(195,start)} A 195,195 0 ${angle>Math.PI?1:0} 1 ${p(195,end)} L ${p(65,end)} A 65,65 0 ${angle>Math.PI?1:0} 0 ${p(65,start)} Z`;
}
function el<K extends keyof HTMLElementTagNameMap>(name: K, cls: string, text?: string): HTMLElementTagNameMap[K] { const n=document.createElement(name); n.className=cls; if(text != null)n.textContent=text; return n; }
function render() {
 const root=document.getElementById("seidr-radial-root"); if (!root || !target) return;
 root.replaceChildren();
 const config=seidrGetSettings().radial; wheel=Math.max(0,Math.min(wheel,config.wheels.length-1));
 if (!submenu) saveLastWheel(wheel);
 root.style.setProperty("--sr-opacity", String(1-config.transparency/100));
 const entries: RadialEntry[] = submenu ? holds.map(name=>({name,group:"ItemTorso",label:radialLabel(name,"ItemTorso")})).filter(e=>!!radialAllowed(e,target).item) : config.wheels[wheel];
 const info=el("div","sr-tooltip visible"); info.setAttribute("role","status");
 const targetName = String(target.Nickname || target.Name || "Character");
 const showInfo = (message?: string) => { info.textContent = message ? `${targetName} · ${message}` : targetName; };
 const infoRow=el("div","sr-info-row"); showInfo(); infoRow.appendChild(info);
 const edit=el("button","sr-wheel-edit"); edit.type="button"; edit.title="Open wheel designer"; edit.setAttribute("aria-label","Open wheel designer");
 edit.append(radialPngIcon("edit", () => document.createTextNode("✎")));
 edit.onclick=()=>{close(); buildRadialTab(document.createElement("div"), true);}; infoRow.appendChild(edit); root.appendChild(infoRow);
 const disk=el("div","sr-disk"); root.appendChild(disk);
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 400 400"); svg.setAttribute("aria-hidden","true"); disk.appendChild(svg);
 entries.forEach((entry,i)=>{
  const result=entry.name === "__cuddle" ? {} : radialAllowed(entry,target);
  const path=document.createElementNS("http://www.w3.org/2000/svg","path"); path.setAttribute("d",wedge(i,entries.length)); path.setAttribute("class",result.reason?"sr-slice disabled":"sr-slice"); svg.appendChild(path);
  const angle=-Math.PI/2+i*2*Math.PI/entries.length, x=50+32*Math.cos(angle), y=50+32*Math.sin(angle);
  const button=el("button","sr-action"); const icon=el("span","sr-icon"); icon.appendChild(radialIcon(entry)); button.append(icon,el("span","sr-segment-label",entry.label)); button.type="button"; button.style.left=x+"%"; button.style.top=y+"%"; button.title=result.reason || entry.label; button.setAttribute("aria-label",entry.label+(result.reason?": "+result.reason:"")); if(result.reason) button.setAttribute("aria-disabled","true");
  const highlight=(on:boolean)=>{path.classList.toggle("active",on);};
  for (const node of [path,button]) { node.addEventListener("mouseenter",()=>highlight(true)); node.addEventListener("mouseleave",()=>highlight(false)); node.addEventListener("focus",()=>highlight(true)); node.addEventListener("blur",()=>highlight(false)); }
  button.onclick=()=>{ if(entry.name === "__cuddle") {submenu=true;render();return;} const current=radialAllowed(entry,target); if(!current.item){button.title=current.reason || "Unavailable"; button.setAttribute("aria-label",entry.label+": "+button.title); const tooltip=path.querySelector("title"); if(tooltip) tooltip.textContent=button.title; return;} const group=AssetGroupGet(target.AssetFamily,entry.group as any); try { ActivityRun(Player,target,group,current.item); close(); } catch(e) { console.warn("[Seidr] radial activity",e); button.title="Could not run activity"; } };
  path.addEventListener("click",()=>button.click()); path.style.cursor=result.reason?"help":"pointer";
  const tip=document.createElementNS("http://www.w3.org/2000/svg","title"); tip.textContent=result.reason || entry.label; path.appendChild(tip);
  disk.appendChild(button);
 });
 if(!entries.length) showInfo(submenu ? "No valid hold actions" : "No actions on this wheel");
 const hub=el("div","sr-hub"); const controls=el("div","sr-controls"); hub.appendChild(controls);
 const add=(label:string, description:string, fn:()=>void)=>{const b=el("button",description === "Close" ? "sr-close" : "sr-arrow",label);b.type="button";b.title=description;b.setAttribute("aria-label",description);b.onclick=fn;controls.appendChild(b);};
 if(submenu) add("←","Back",()=>{submenu=false;render();}); else add("←","Previous wheel",()=>{wheel=(wheel+config.wheels.length-1)%config.wheels.length;render();});
 add("×","Close",close);
 if(!submenu) add("→","Next wheel",()=>{wheel=(wheel+1)%config.wheels.length;render();});
 if(!submenu) hub.appendChild(el("small","",`${wheel+1} / ${config.wheels.length}`)); disk.appendChild(hub);
}
function openFromClick(e: MouseEvent): boolean {
 if (CurrentScreen !== "ChatRoom" || !seidrGetSettings().radial.enabled || !(e.target instanceof HTMLCanvasElement) || e.target.id !== "MainCanvas") return false;
 const canvas=e.target, rect=canvas.getBoundingClientRect(), x=(e.clientX-rect.left)*2000/rect.width, y=(e.clientY-rect.top)*1000/rect.height;
 let found:any=null; map=typeof ChatRoomIsViewActive === "function" && ChatRoomIsViewActive("Map" as any);
 if(map) {
  const chrome = (y>=860 && y<=920 && x>=790 && x<=990) || (y>=930 && y<=990 && x>=790 && x<=990);
  const split = typeof ChatRoomMapViewSplitPosition === "number" ? ChatRoomMapViewSplitPosition : 1000;
  if(x<=split && !chrome && !ChatRoomMapViewEditStarted && !["Tile","Object","ObjectSettings"].includes(ChatRoomMapViewEditMode)) {
   const tags = typeof ChatRoomMapViewNameTags !== "undefined" && Array.isArray(ChatRoomMapViewNameTags) ? ChatRoomMapViewNameTags : [];
   found = tags.find(tag => { const [left, top, width, height] = tag.rect; return x >= left && x < left + width && y >= top && y < top + height; })?.C;
   if (!found) for (let i = mapHitboxes.length - 1; i >= 0; i--) {
    const hit = mapHitboxes[i];
    if (x >= hit.x && x < hit.x + hit.width && y >= hit.y && y < hit.y + hit.height && ChatRoomCharacter.includes(hit.character)) { found = hit.character; break; }
   }
  }
 }
 else if (typeof ChatRoomIsViewActive === "function" && ChatRoomIsViewActive("Character" as any)) {
  ChatRoomCharacterViewLoopCharacters((idx:number,cx:number,cy:number,space:number,zoom:number)=>{if(x>=cx && x<cx+space && y>=cy && y<cy+1000*zoom) {found=ChatRoomCharacterDrawlist[idx];return true;} return false;});
 }
 if(!found) return false;
 e.preventDefault(); e.stopPropagation(); close(); target=found; wheel=seidrGetSettings().radial.reopenLastWheel ? readLastWheel() : 0; submenu=false;
 if (map && typeof ChatRoomMapViewKeysPressed === "object" && ChatRoomMapViewKeysPressed) {
  for (const direction of ["North", "South", "East", "West"]) ChatRoomMapViewKeysPressed[direction] = false;
 }
 const root=el("div","sr-root"); root.id="seidr-radial-root"; root.setAttribute("role","dialog"); root.setAttribute("aria-label","Quick actions"); document.body.appendChild(root);
 for (const type of ["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"]) root.addEventListener(type, event => event.stopPropagation());
 const size=Math.max(180,Math.min(470,window.innerWidth-16,window.innerHeight-60)); root.style.width=size+"px"; root.style.left=Math.max(8,Math.min(e.clientX-size/2,window.innerWidth-size-8))+"px"; root.style.top=Math.max(8,Math.min(e.clientY-size/2,window.innerHeight-size-8))+"px"; render();
 return true;
}
export function installRadial() {
 abort?.abort(); abort=new AbortController(); const signal=abort.signal;
 Seidr.tryHook("radialMapGrid", "ChatRoomMapViewDrawGrid", 0, (args, next) => {
  mapHitboxes = [];
  mapDrawing = true;
  try { return next(args); } finally { mapDrawing = false; }
 });
 Seidr.tryHook("radialMapCharacter", "DrawCharacter", 0, (args, next) => {
  if (mapDrawing && Array.isArray(ChatRoomCharacter) && ChatRoomCharacter.includes(args[0]) && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
   mapHitboxes.push({character: args[0], x: args[1], y: args[2], width: 500 * args[3], height: 1000 * args[3]});
  }
  return next(args);
 });
 let consumedPointer: number | null = null;
 document.addEventListener("contextmenu", e => { if (seidrGetSettings().radial.trigger === "right") openFromClick(e); }, {capture:true,signal});
 document.addEventListener("pointerdown", e => {
  const config = seidrGetSettings().radial;
  const modifier = {Shift:e.shiftKey, Ctrl:e.ctrlKey, Alt:e.altKey, Meta:e.metaKey}[config.modifier];
  if (e.pointerType !== "mouse" || !((config.trigger === "middle" && e.button === 1) || (config.trigger === "modified-left" && e.button === 0 && modifier))) return;
  if (openFromClick(e)) { consumedPointer = e.pointerId; e.stopImmediatePropagation(); }
 }, {capture:true,signal});
 document.addEventListener("pointerup", e => {
  if (e.pointerId !== consumedPointer) return;
  e.preventDefault(); e.stopImmediatePropagation();
  setTimeout(() => { consumedPointer = null; }, 0);
 }, {capture:true,signal});
 document.addEventListener("pointercancel", e => { if (e.pointerId === consumedPointer) consumedPointer = null; }, {capture:true,signal});
 for (const type of ["click", "auxclick"]) document.addEventListener(type, e => {
  if (consumedPointer === null) return;
  e.preventDefault(); e.stopImmediatePropagation(); consumedPointer = null;
 }, {capture:true,signal});
 document.addEventListener("pointerdown",e=>{const root=document.getElementById("seidr-radial-root"); if(root && e.target instanceof Node && !root.contains(e.target)) close();},{capture:true,signal});
 document.addEventListener("keydown", e => {
  if (!target) return;
  if (e.key === "Escape") { close(); e.preventDefault(); return; }
  const arrow = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key);
  if (map && arrow) { e.preventDefault(); e.stopImmediatePropagation(); }
  const active = document.activeElement;
  if (submenu || (!map && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable)))) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
   const cfg = seidrGetSettings().radial;
   wheel = (wheel + (e.key === "ArrowRight" ? 1 : -1) + cfg.wheels.length) % cfg.wheels.length;
   render(); e.preventDefault(); e.stopPropagation();
  }
 }, {capture:true,signal});
 Seidr.tryHook("radialLeave","ChatRoomLeave",0,(args,next)=>{close();mapHitboxes=[];return next(args);});
}
export function uninstallRadial(){abort?.abort();abort=null;close();}
