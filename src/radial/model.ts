export type RadialEntry = { name: string; group: string; label: string; icon?: string };
export type RadialTrigger = "right" | "middle" | "modified-left";
export type RadialModifier = "Shift" | "Ctrl" | "Alt" | "Meta";
export type RadialConfig = { enabled: boolean; transparency: number; trigger: RadialTrigger; modifier: RadialModifier; reopenLastWheel: boolean; wheels: RadialEntry[][] };
export const CUDDLE: RadialEntry = { name: "__cuddle", group: "ItemArms", label: "Cuddle" };
export function radialDefaults(): RadialConfig {
 return { enabled: true, transparency: 20, trigger: "right", modifier: "Shift", reopenLastWheel: false, wheels: [
  [CUDDLE,
   {name:"Pet",group:"ItemHead",label:"Pet Head",icon:"png-pet-head"},
   {name:"TakeCare",group:"ItemHead",label:"Brush Hair",icon:"png-brush"},
   {name:"PoliteKiss",group:"ItemMouth",label:"Kiss Cheek",icon:"png-kiss-cheek-simple"},
   {name:"Kiss",group:"ItemMouth",label:"Kiss Lips",icon:"png-kiss-lips-simple"},
   {name:"FrenchKiss",group:"ItemMouth",label:"French Kiss",icon:"png-kiss-two-women"},
   {name:"Caress",group:"ItemArms",label:"Caress Arm",icon:"png-caress-arm"}],
  [
   {name:"PoliteKiss",group:"ItemHands",label:"Polite Kiss on Hand",icon:"png-kiss-hand"},
   {name:"Wiggle",group:"ItemTorso",label:"Wiggle Body",icon:"png-wiggling-body"},
   {name:"MassageHands",group:"ItemTorso",label:"Massage Back",icon:"png-massage-back"},
   {name:"Rub",group:"ItemTorso",label:"Rub Bodies",icon:"png-rub-bodies"},
   {name:"Kiss",group:"ItemNeck",label:"Kiss Neck",icon:"png-kiss"},
   {name:"Caress",group:"ItemBreast",label:"Caress Breasts",icon:"png-caress-chest"},
   {name:"Grope",group:"ItemBreast",label:"Grope Breasts",icon:"png-bust"},
   {name:"Caress",group:"ItemNipples",label:"Caress Nipple",icon:"png-heart-touch"}],
  [
   {name:"Kiss",group:"ItemNipples",label:"Kiss Nipple",icon:"png-kiss"},
   {name:"Caress",group:"ItemButt",label:"Caress Butt",icon:"png-butt"},
   {name:"Spank",group:"ItemButt",label:"Spank Butt",icon:"png-spank"},
   {name:"Grope",group:"ItemButt",label:"Grope Butt",icon:"png-butt"},
   {name:"Caress",group:"ItemVulvaPiercings",label:"Caress Clitoris",icon:"png-flower-touch"},
   {name:"MasturbateHand",group:"ItemVulvaPiercings",label:"Masturbate Clitoris",icon:"png-flower-motion"},
   {name:"Caress",group:"ItemVulva",label:"Caress Pussy",icon:"png-flower-caress"},
   {name:"MasturbateHand",group:"ItemVulva",label:"Masturbate Pussy",icon:"png-flower-motion"}]
 ] };
}
export function normalizeRadial(raw: unknown): RadialConfig {
 if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).wheels)) return radialDefaults();
 const data = raw as any;
 const wheels: RadialEntry[][] = data.wheels.slice(0, 12).map((wheel: unknown) => Array.isArray(wheel) ? wheel.slice(0, 8).flatMap((entry: any) => {
  if (!entry || typeof entry.name !== "string" || typeof entry.group !== "string" || entry.name === "__cuddle") return [];
  return [{name: entry.name.slice(0,120), group: entry.group.slice(0,80), label: String(entry.label || entry.name).slice(0,100), ...(typeof entry.icon === "string" ? {icon: entry.icon.slice(0,40)} : {})}];
 }) : []);
 if (!wheels.length) wheels.push([]);
 wheels[0] = [CUDDLE, ...wheels[0].slice(0,7)];
 const trigger: RadialTrigger = data.trigger === "middle" || data.trigger === "modified-left" ? data.trigger : "right";
 const modifier: RadialModifier = ["Shift", "Ctrl", "Alt", "Meta"].includes(data.modifier) ? data.modifier : "Shift";
 return {enabled: data.enabled !== false, transparency: typeof data.transparency === "number" && Number.isFinite(data.transparency) ? Math.max(0, Math.min(100, data.transparency)) : 20, trigger, modifier, reopenLastWheel: data.reopenLastWheel === true, wheels};
}
