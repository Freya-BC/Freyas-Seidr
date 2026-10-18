/* Seidr v1.0.5 — page-context IIFE. Bookmark gist / FUSAM sibling. */
(function () {
	"use strict";
	if (window.__SeidrPageLoaded) return;
	window.__SeidrPageLoaded = true;
(() => {
  // src/seidr.ts
  var Seidr = {};
  window.Seidr = Seidr;

  // src/defaults.ts
  Seidr.VERSION = "1.0.5";
  Seidr.FULL_NAME = "Seidr";
  Seidr.PREFIX = "Seidr_";
  Seidr.HIDDEN = "Seidr";
  Seidr.GROUPS = ["ItemTorso"];
  Seidr.OFFSET_X = 100;
  Seidr.OFFSET_SIDE_Y = -50;
  Seidr.OFFSET_HUB_Y = -50;
  Seidr.BOOKMARK_GIST_ID = "9bbf11dc304132b1dc2d8e8ff4eea168";
  Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
  Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
  Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";

  // src/state.ts
  var SLOTS = ["left", "right", "cuddle"];
  function num(value) {
    if (typeof value === "number" && isFinite(value)) return value;
    if (typeof value === "string" && value !== "" && isFinite(Number(value))) return Number(value);
    return null;
  }
  function emptyHub() {
    return { left: null, right: null, cuddle: null };
  }
  function isEmpty(hub) {
    return !hub || hub.left == null && hub.right == null && hub.cuddle == null;
  }
  function cloneHubs(hubs) {
    const out = {};
    if (!hubs) return out;
    Object.keys(hubs).forEach(function(key) {
      const hubN = num(key);
      const hub = hubs[key];
      if (hubN == null || !hub) return;
      out[hubN] = {
        left: num(hub.left),
        right: num(hub.right),
        cuddle: num(hub.cuddle)
      };
    });
    return out;
  }
  function stripMember(hubs, member) {
    Object.keys(hubs).forEach(function(key) {
      const hub = hubs[key];
      for (let i = 0; i < SLOTS.length; i++) {
        if (hub[SLOTS[i]] === member) hub[SLOTS[i]] = null;
      }
    });
  }
  function prune(hubs) {
    Object.keys(hubs).forEach(function(key) {
      if (isEmpty(hubs[key])) delete hubs[key];
    });
    return hubs;
  }
  function applySlot(hubs, hubMember, slot, member) {
    const hubN = num(hubMember);
    const mem = num(member);
    const next = cloneHubs(hubs);
    if (hubN == null || mem == null || hubN === mem || SLOTS.indexOf(slot) < 0) {
      return next;
    }
    stripMember(next, mem);
    delete next[mem];
    stripMember(next, hubN);
    if (!next[hubN]) next[hubN] = emptyHub();
    next[hubN][slot] = mem;
    return prune(next);
  }
  function removeRelation(hubs, actor, target) {
    const a = num(actor);
    const t = num(target);
    const next = cloneHubs(hubs);
    if (a == null || t == null || a === t) return next;
    if (next[a]) {
      for (let i = 0; i < SLOTS.length; i++) {
        if (next[a][SLOTS[i]] === t) next[a][SLOTS[i]] = null;
      }
    }
    if (next[t]) {
      for (let j = 0; j < SLOTS.length; j++) {
        if (next[t][SLOTS[j]] === a) next[t][SLOTS[j]] = null;
      }
    }
    return prune(next);
  }
  function relation(hubs, actor, target) {
    const a = num(actor);
    const t = num(target);
    if (a == null || t == null || !hubs) return null;
    const mine = hubs[a];
    if (mine) {
      for (let i = 0; i < SLOTS.length; i++) {
        if (mine[SLOTS[i]] === t) return { slot: SLOTS[i], role: "hub" };
      }
    }
    const theirs = hubs[t];
    if (theirs) {
      for (let j = 0; j < SLOTS.length; j++) {
        if (theirs[SLOTS[j]] === a) return { slot: SLOTS[j], role: "satellite" };
      }
    }
    return null;
  }
  function occupant(hubs, hubMember, slot) {
    const hubN = num(hubMember);
    if (hubN == null || !hubs || SLOTS.indexOf(slot) < 0) return null;
    const hub = hubs[hubN];
    if (!hub) return null;
    return num(hub[slot]);
  }
  function clusterOf(hubs, member) {
    const m = num(member);
    if (m == null || !hubs) return null;
    if (hubs[m] && !isEmpty(hubs[m])) {
      return {
        hub: m,
        left: num(hubs[m].left),
        right: num(hubs[m].right),
        cuddle: num(hubs[m].cuddle)
      };
    }
    const keys = Object.keys(hubs);
    for (let i = 0; i < keys.length; i++) {
      const hub = hubs[keys[i]];
      for (let s = 0; s < SLOTS.length; s++) {
        if (hub[SLOTS[s]] === m) {
          return {
            hub: num(keys[i]),
            left: num(hub.left),
            right: num(hub.right),
            cuddle: num(hub.cuddle)
          };
        }
      }
    }
    return null;
  }
  function replaceHub(hubs, hubMember, raw) {
    const hubN = num(hubMember);
    const next = cloneHubs(hubs);
    if (hubN == null) return next;
    const hub = emptyHub();
    if (raw && typeof raw === "object") {
      hub.left = num(raw.left);
      hub.right = num(raw.right);
      hub.cuddle = num(raw.cuddle);
    }
    if (hub.left === hubN) hub.left = null;
    if (hub.right === hubN) hub.right = null;
    if (hub.cuddle === hubN) hub.cuddle = null;
    if (isEmpty(hub)) {
      delete next[hubN];
      return prune(next);
    }
    for (let i = 0; i < SLOTS.length; i++) {
      const held = hub[SLOTS[i]];
      if (held == null) continue;
      stripMember(next, held);
      delete next[held];
    }
    stripMember(next, hubN);
    if (isEmpty(hub)) delete next[hubN];
    else next[hubN] = hub;
    return prune(next);
  }
  function pruneMissing(hubs, present) {
    const next = cloneHubs(hubs);
    Object.keys(next).forEach(function(key) {
      const hubN = num(key);
      if (hubN == null || !present || !present[hubN]) {
        delete next[key];
        return;
      }
      const hub = next[key];
      for (let i = 0; i < SLOTS.length; i++) {
        const held = hub[SLOTS[i]];
        if (held != null && !present[held]) hub[SLOTS[i]] = null;
      }
    });
    return prune(next);
  }
  function canPlace(hubs, actor, target, slot) {
    const a = num(actor);
    const t = num(target);
    if (a == null || t == null || a === t || SLOTS.indexOf(slot) < 0) return false;
    if (relation(hubs, a, t)) return false;
    if (clusterOf(hubs, t)) return false;
    const mine = clusterOf(hubs, a);
    if (mine && mine.hub !== a) return false;
    if (mine && mine.hub === a && mine[slot] != null) return false;
    return true;
  }
  function canRemove(hubs, actor, target) {
    const a = num(actor);
    const t = num(target);
    if (a == null || t == null) return false;
    if (a === t) {
      const self = clusterOf(hubs, a);
      return !!(self && self.hub !== a);
    }
    const rel = relation(hubs, a, t);
    return !!(rel && rel.role === "satellite");
  }
  function canRemoveSlot(hubs, actor, target, slot) {
    const a = num(actor);
    const t = num(target);
    if (a == null || t == null || SLOTS.indexOf(slot) < 0) return false;
    const held = occupant(hubs, a, slot);
    if (held == null) return false;
    return t === a || t === held;
  }
  function clearSlot(hubs, hubMember, slot) {
    const hubN = num(hubMember);
    const next = cloneHubs(hubs);
    if (hubN == null || SLOTS.indexOf(slot) < 0 || !next[hubN]) return next;
    next[hubN][slot] = null;
    return prune(next);
  }
  function leaveSelf(hubs, member) {
    const m = num(member);
    const next = cloneHubs(hubs);
    if (m == null) return next;
    const cluster = clusterOf(next, m);
    if (!cluster || cluster.hub === m) return next;
    return removeRelation(next, m, cluster.hub);
  }
  function releaseMember(hubs, member) {
    const m = num(member);
    const next = cloneHubs(hubs);
    if (m == null) return next;
    const cluster = clusterOf(next, m);
    if (!cluster) return next;
    if (cluster.hub === m) {
      delete next[m];
      return prune(next);
    }
    return removeRelation(next, m, cluster.hub);
  }
  function affectedHub(hubs, actor, target, activityName) {
    const a = num(actor);
    const t = num(target);
    if (activityName === "Seidr_Remove" || activityName && activityName.indexOf("Seidr_Remove") === 0) {
      if (a != null && a === t) {
        const selfCluster = clusterOf(hubs, a);
        return selfCluster ? selfCluster.hub : a;
      }
      const rel = relation(hubs, a, t);
      if (rel && rel.role === "satellite") return t;
    }
    return a;
  }
  var SeidrState = {
    SLOTS,
    emptyHub,
    cloneHubs,
    applySlot,
    removeRelation,
    relation,
    occupant,
    clusterOf,
    replaceHub,
    pruneMissing,
    canPlace,
    canRemove,
    canRemoveSlot,
    clearSlot,
    leaveSelf,
    releaseMember,
    affectedHub
  };
  window.SeidrState = SeidrState;

  // src/room.ts
  var ECHO_PAIR_NAMES = {
    "\u8D34\u8D34": true,
    "\u62C9\u7D27\u7684\u7275\u7EF3": true,
    "\u62C9\u7D27\u7684\u94FE\u5B50": true
  };
  var ECHO_SYNC = "Luzi_XCharacterDrawState";
  function seidrFindChar(member) {
    if (typeof member !== "number") return null;
    if (typeof Player !== "undefined" && Player && Player.MemberNumber === member) return Player;
    if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) return null;
    for (let i = 0; i < ChatRoomCharacter.length; i++) {
      const c = ChatRoomCharacter[i];
      if (c && c.MemberNumber === member) return c;
    }
    return null;
  }
  function seidrCharName(member) {
    const c = seidrFindChar(member);
    if (!c) return String(member);
    return c.Nickname || c.Name || String(member);
  }
  function seidrEchoAssetName(name) {
    return !!(name && ECHO_PAIR_NAMES[name]);
  }
  function seidrInEcho(character) {
    if (!character) return false;
    if (Array.isArray(character.Appearance)) {
      for (let i = 0; i < character.Appearance.length; i++) {
        const item = character.Appearance[i];
        if (!item || !item.Asset || !seidrEchoAssetName(item.Asset.Name)) continue;
        const group = item.Asset.Group && item.Asset.Group.Name;
        if (group === "ItemMisc" || group === "ItemHandheld") return true;
      }
    }
    const order = character.XCharacterDrawOrder;
    const asset = order && order.associatedAsset && order.associatedAsset.asset;
    return seidrEchoAssetName(asset);
  }
  function seidrApplyEchoYield(next, me, before) {
    if (JSON.stringify(next) === JSON.stringify(before)) return false;
    Seidr.setHubs(next);
    if (Seidr.publishChanged) Seidr.publishChanged(before, next, me, me);
    if (Seidr.badgeActivityButtons) {
      try {
        Seidr.badgeActivityButtons();
      } catch (e) {
      }
    }
    return true;
  }
  function seidrReconcileEcho() {
    if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
    if (typeof Seidr.getHubs !== "function") return;
    const me = Player.MemberNumber;
    const before = Seidr.getHubs();
    const cluster = SeidrState.clusterOf(before, me);
    if (!cluster) return;
    let next = before;
    if (seidrInEcho(Player)) {
      next = SeidrState.releaseMember(before, me);
      seidrApplyEchoYield(next, me, before);
      return;
    }
    if (cluster.hub === me) {
      next = before;
      ["left", "right", "cuddle"].forEach(function(slot) {
        const held = SeidrState.occupant(next, me, slot);
        if (held == null) return;
        const ch = seidrFindChar(held);
        if (ch && seidrInEcho(ch)) next = SeidrState.clearSlot(next, me, slot);
      });
      seidrApplyEchoYield(next, me, before);
      return;
    }
    const hub = seidrFindChar(cluster.hub);
    if (hub && seidrInEcho(hub)) {
      next = SeidrState.leaveSelf(before, me);
      seidrApplyEchoYield(next, me, before);
    }
  }
  function seidrYieldOnEchoSync(data) {
    if (!data || data.Type !== "Hidden" || data.Content !== ECHO_SYNC) return;
    if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
    if (typeof Seidr.getHubs !== "function") return;
    const sender = data.Sender;
    if (typeof sender !== "number") return;
    const payload = Array.isArray(data.Dictionary) ? data.Dictionary[0] : null;
    const asset = payload && payload.associatedAsset && payload.associatedAsset.asset;
    if (!seidrEchoAssetName(asset)) return;
    const me = Player.MemberNumber;
    const before = Seidr.getHubs();
    const cluster = SeidrState.clusterOf(before, me);
    if (!cluster) return;
    let next = before;
    if (sender === me) {
      next = SeidrState.releaseMember(before, me);
    } else if (cluster.hub === me) {
      const slot = sender === cluster.left ? "left" : sender === cluster.right ? "right" : sender === cluster.cuddle ? "cuddle" : null;
      if (!slot) return;
      next = SeidrState.clearSlot(before, me, slot);
    } else if (sender === cluster.hub || sender === me) {
      next = SeidrState.leaveSelf(before, me);
    } else {
      return;
    }
    seidrApplyEchoYield(next, me, before);
  }
  function seidrAllowAct(actor, target) {
    if (typeof ServerChatRoomGetAllowItem !== "function") return true;
    try {
      return ServerChatRoomGetAllowItem(actor, target) !== false;
    } catch (e) {
      return false;
    }
  }
  function seidrPresentMap() {
    const map = {};
    if (typeof Player !== "undefined" && Player && typeof Player.MemberNumber === "number") {
      map[Player.MemberNumber] = true;
    }
    if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
      for (let i = 0; i < ChatRoomCharacter.length; i++) {
        const c = ChatRoomCharacter[i];
        if (c && typeof c.MemberNumber === "number") map[c.MemberNumber] = true;
      }
    }
    return map;
  }

  // src/undress.ts
  var SEIDR_ECHO_SUFFIXES = ["_\u7B28\u7B28\u86CBLuzi", "_\u7B28\u7B28\u7B28\u86CBLuzi2"];
  var SEIDR_UNDRESS_TEXT_GENERIC_SELF = [
    "{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}"
  ];
  var SEIDR_UNDRESS_TEXT_GENERIC_OTHER = [
    "{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} pulls off {TargetName}'s {ClothingItem(Slot1)}",
    "{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off"
  ];
  var SEIDR_UNDRESS_TEXT_SHOES_SELF = [
    "{SourceName} kicks off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} unlaces {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} slips out of {SourcePronounPossessive} {ClothingItem(Slot1)}"
  ];
  var SEIDR_UNDRESS_TEXT_SHOES_OTHER = [
    "{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} free",
    "{SourceName} works {TargetName}'s {ClothingItem(Slot1)} off"
  ];
  var SEIDR_UNDRESS_TEXT_SOCKS_SELF = [
    "{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} rolls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}"
  ];
  var SEIDR_UNDRESS_TEXT_SOCKS_OTHER = [
    "{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} rolls {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off"
  ];
  var SEIDR_UNDRESS_TEXT_HAT_SELF = [
    "{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} lifts off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} sets aside {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}"
  ];
  var SEIDR_UNDRESS_TEXT_HAT_OTHER = [
    "{SourceName} lifts {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off"
  ];
  var SEIDR_UNDRESS_TEXT_GLOVES_SELF = [
    "{SourceName} tugs off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} peels off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} pulls off {SourcePronounPossessive} {ClothingItem(Slot1)}",
    "{SourceName} slips off {SourcePronounPossessive} {ClothingItem(Slot1)}"
  ];
  var SEIDR_UNDRESS_TEXT_GLOVES_OTHER = [
    "{SourceName} tugs {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} peels {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} pulls {TargetName}'s {ClothingItem(Slot1)} off",
    "{SourceName} slips {TargetName}'s {ClothingItem(Slot1)} off"
  ];
  var SEIDR_UNDRESS_TEXTS = {
    generic: { self: SEIDR_UNDRESS_TEXT_GENERIC_SELF, other: SEIDR_UNDRESS_TEXT_GENERIC_OTHER },
    shoes: { self: SEIDR_UNDRESS_TEXT_SHOES_SELF, other: SEIDR_UNDRESS_TEXT_SHOES_OTHER },
    socks: { self: SEIDR_UNDRESS_TEXT_SOCKS_SELF, other: SEIDR_UNDRESS_TEXT_SOCKS_OTHER },
    hat: { self: SEIDR_UNDRESS_TEXT_HAT_SELF, other: SEIDR_UNDRESS_TEXT_HAT_OTHER },
    gloves: { self: SEIDR_UNDRESS_TEXT_GLOVES_SELF, other: SEIDR_UNDRESS_TEXT_GLOVES_OTHER }
  };
  var SEIDR_UNDRESS_SLOTS = [
    { group: "Cloth", zone: "ItemTorso", family: "Upper Clothes", noun: "upper clothes", layers: "upper layers", texts: "generic", bundle: true },
    { group: "ClothOuter", zone: "ItemTorso", family: "Outer Clothes", noun: "outer clothes", layers: "outer layers", texts: "generic", bundle: true },
    { group: "Suit", zone: "ItemTorso", family: "Suit", noun: "suit", layers: "suit layers", texts: "generic", bundle: true },
    { group: "ClothLower", zone: "ItemLegs", family: "Lower Clothes", noun: "lower clothes", layers: "lower layers", texts: "generic", bundle: true },
    { group: "SuitLower", zone: "ItemLegs", family: "Lower Suit", noun: "lower suit", layers: "lower suit layers", texts: "generic", bundle: true },
    { group: "Bra", zone: "ItemBreast", family: "Bra", noun: "bra", layers: "bra layers", texts: "generic", bundle: true },
    { group: "ClothAccessory", zone: "ItemBreast", family: "Chest Accessory", noun: "chest accessory", layers: "chest accessory layers", texts: "generic", bundle: true },
    { group: "Corset", zone: "ItemBreast", family: "Corset", noun: "corset", layers: "corset layers", texts: "generic", bundle: true },
    { group: "Panties", zone: "ItemVulvaPiercings", family: "Panties", noun: "panties", layers: "panty layers", texts: "generic", bundle: true },
    { group: "Socks", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: true },
    { group: "SocksLeft", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: false },
    { group: "SocksRight", zone: "ItemFeet", family: "Socks", noun: "socks", layers: "sock layers", texts: "socks", bundle: false },
    { group: "Shoes", zone: "ItemBoots", family: "Shoes", noun: "shoes", layers: "shoe layers", texts: "shoes", bundle: true },
    { group: "Hat", zone: "ItemHead", family: "Hat", noun: "hat", layers: "hat layers", texts: "hat", bundle: true },
    { group: "Glasses", zone: "ItemHead", family: "Glasses", noun: "glasses", layers: "glasses layers", texts: "hat", bundle: true },
    { group: "Mask", zone: "ItemMouth", family: "Mask", noun: "mask", layers: "mask layers", texts: "generic", bundle: true },
    { group: "Gloves", zone: "ItemArms", family: "Gloves", noun: "gloves", layers: "glove layers", texts: "gloves", bundle: true },
    { group: "Necklace", zone: "ItemNeck", family: "Necklace", noun: "necklace", layers: "necklace layers", texts: "generic", bundle: true },
    { group: "Bracelet", zone: "ItemArms", family: "Bracelet", noun: "bracelet", layers: "bracelet layers", texts: "generic", bundle: true },
    { group: "Garters", zone: "ItemLegs", family: "Garters", noun: "garters", layers: "garter layers", texts: "generic", bundle: true },
    { group: "AnkletLeft", zone: "ItemFeet", family: "Anklets", noun: "anklets", layers: "anklet layers", texts: "generic", bundle: false },
    { group: "AnkletRight", zone: "ItemFeet", family: "Anklets", noun: "anklets", layers: "anklet layers", texts: "generic", bundle: false },
    { group: "Decals", zone: "ItemTorso", family: "Decals", noun: "decals", layers: "decal layers", texts: "generic", bundle: true },
    { group: "HairAccessory1", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
    { group: "HairAccessory2", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
    { group: "HairAccessory3", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: true },
    { group: "Luzi_HairAccessory3_1", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: false },
    { group: "Luzi_HairAccessory3_2", zone: "ItemHead", family: "Hair Accessory", noun: "hair accessory", layers: "hair accessory layers", texts: "hat", bundle: false },
    { group: "Jewelry", zone: "ItemHead", family: "Jewelry", noun: "jewelry", layers: "jewelry layers", texts: "generic", bundle: true },
    { group: "Luzi_Jewelry_0", zone: "ItemHead", family: "Jewelry", noun: "jewelry", layers: "jewelry layers", texts: "generic", bundle: false },
    { group: "\u957F\u8896\u5B50_Luzi", zone: "ItemArms", family: "Long Sleeves", noun: "long sleeves", layers: "sleeve layers", texts: "gloves", bundle: false }
  ];
  var seidrPendingUndressChat = null;
  var seidrUndressCached = null;
  function seidrHasCjk(s) {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(String(s || ""));
  }
  function seidrPickLatin(candidates) {
    var fallback = "";
    for (var i = 0; i < (candidates || []).length; i++) {
      var s = String(candidates[i] || "").trim();
      if (!s) continue;
      if (!fallback) fallback = s;
      if (!seidrHasCjk(s)) return s;
    }
    return fallback;
  }
  function seidrUndressSafeId(group) {
    return String(group || "").replace(/[^A-Za-z0-9_]/g, function(ch) {
      return "_" + ch.charCodeAt(0).toString(16) + "_";
    });
  }
  function seidrClothingGroupExists(name) {
    if (!name) return false;
    try {
      if (typeof AssetGroupGet === "function") {
        return !!AssetGroupGet("Female3DCG", name);
      }
    } catch (e) {
    }
    if (typeof AssetGroup !== "undefined" && Array.isArray(AssetGroup)) {
      for (var i = 0; i < AssetGroup.length; i++) {
        if (AssetGroup[i] && AssetGroup[i].Name === name) return true;
      }
    }
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && name.indexOf("Luzi") < 0) return true;
    return false;
  }
  function seidrEchoGroup(base, suffixIndex) {
    return base + SEIDR_ECHO_SUFFIXES[suffixIndex];
  }
  function seidrWornClothName(character, group) {
    if (!character || !group || typeof InventoryGet !== "function") return "";
    try {
      var item = InventoryGet(character, group);
      if (!item || !item.Asset) return "";
      var craftName = item.Craft && item.Craft.Name ? String(item.Craft.Name) : "";
      var desc = item.Asset.Description ? String(item.Asset.Description) : "";
      var assetName = item.Asset.Name ? String(item.Asset.Name) : "";
      return seidrPickLatin([desc, craftName, assetName]) || "clothing";
    } catch (e) {
      return "";
    }
  }
  function seidrIsWearing(character, group) {
    if (!character || !group || typeof InventoryGet !== "function") return false;
    try {
      return !!InventoryGet(character, group);
    } catch (e) {
      return false;
    }
  }
  function seidrCanChangeClothes(acting, acted) {
    if (!acting || !acted) return false;
    try {
      if (typeof acting.CanChangeClothesOn === "function") {
        return !!acting.CanChangeClothesOn(acted);
      }
    } catch (e) {
    }
    if (acting === acted || acting.MemberNumber != null && acting.MemberNumber === acted.MemberNumber) {
      try {
        if (typeof acted.CanChangeOwnClothes === "function") return !!acted.CanChangeOwnClothes();
      } catch (e2) {
      }
      return true;
    }
    return false;
  }
  function seidrPronounPossessiveFromKey(key) {
    const raw = String(key || "").replace(/[\/_\-\s]/g, "");
    if (!raw) return null;
    if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "her";
    if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "his";
    if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "their";
    return null;
  }
  function seidrPronounPossessive(character) {
    if (!character) return "their";
    try {
      if (typeof character.GetPronouns === "function") {
        const mapped = seidrPronounPossessiveFromKey(character.GetPronouns());
        if (mapped) return mapped;
      }
    } catch (e) {
    }
    try {
      if (typeof InventoryGet === "function") {
        const item = InventoryGet(character, "Pronouns");
        const name = item && item.Asset && item.Asset.Name;
        const mapped = seidrPronounPossessiveFromKey(name);
        if (mapped) return mapped;
      }
    } catch (e2) {
    }
    try {
      if (typeof CharacterPronoun === "function") {
        const p = String(CharacterPronoun(character, "Possessive", false) || "").trim().toLowerCase();
        if (p === "her" || p === "his" || p === "their") return p;
      }
    } catch (e3) {
    }
    return "their";
  }
  function seidrPickRandom(lines) {
    if (!lines || !lines.length) return "";
    var i = Math.floor(Math.random() * lines.length);
    return lines[i] || lines[0] || "";
  }
  function seidrUndressFillTemplate(template, clothingName, possessive) {
    var out = String(template || "");
    out = out.split("{SourceName}").join("SourceCharacter");
    out = out.split("{TargetName}").join("TargetCharacter");
    out = out.split("{SourcePronounPossessive}").join(possessive || "their");
    out = out.split("{ClothingItem(Slot1)}").join(clothingName || "clothing");
    return out;
  }
  function seidrUndressFallbackLabel(slot) {
    return "Undress " + (slot && slot.noun ? slot.noun : "clothes");
  }
  function seidrUndressMakeAct(slot, clothGroup) {
    var id = seidrUndressSafeId(clothGroup);
    var pack = SEIDR_UNDRESS_TEXTS[slot.texts] || SEIDR_UNDRESS_TEXTS.generic;
    return {
      name: "Seidr_Undress_" + id,
      undress: true,
      bundle: false,
      clothGroup,
      clothGroups: [clothGroup],
      zone: slot.zone,
      noun: slot.noun,
      family: slot.family,
      texts: slot.texts,
      prereq: "Seidr_CanUndress_" + id,
      needsHands: true,
      self: true,
      label: seidrUndressFallbackLabel(slot),
      chat: seidrUndressFillTemplate(pack.other[0], slot.noun, "their"),
      chatSelf: seidrUndressFillTemplate(pack.self[0], slot.noun, "their"),
      selfTexts: pack.self.slice(),
      otherTexts: pack.other.slice()
    };
  }
  function seidrUndressMakeBundleAct(slot, layers) {
    var id = seidrUndressSafeId(slot.group);
    var selfTexts = [
      "{SourceName} strips off {SourcePronounPossessive} " + slot.noun,
      "{SourceName} peels away {SourcePronounPossessive} " + slot.layers,
      "{SourceName} pulls off {SourcePronounPossessive} " + slot.noun + " at once"
    ];
    var otherTexts = [
      "{SourceName} strips off {TargetName}'s " + slot.noun,
      "{SourceName} peels away {TargetName}'s " + slot.layers,
      "{SourceName} pulls {TargetName}'s " + slot.noun + " off at once"
    ];
    return {
      name: "Seidr_UndressAll_" + id,
      undress: true,
      bundle: true,
      clothGroup: layers[0],
      clothGroups: layers.slice(),
      zone: slot.zone,
      noun: slot.noun,
      layers: slot.layers,
      family: slot.family,
      texts: slot.texts,
      prereq: "Seidr_CanUndressAll_" + id,
      needsHands: true,
      self: true,
      label: "Undress all " + slot.family,
      chat: seidrUndressFillTemplate(otherTexts[0], slot.noun, "their"),
      chatSelf: seidrUndressFillTemplate(selfTexts[0], slot.noun, "their"),
      selfTexts,
      otherTexts
    };
  }
  function seidrUndressShouldRegisterGroup(group, isEchoOrExtra) {
    if (!group) return false;
    if (!isEchoOrExtra) {
      if (group.indexOf("Luzi") >= 0 || seidrHasCjk(group)) {
        return seidrClothingGroupExists(group);
      }
      return true;
    }
    return seidrClothingGroupExists(group);
  }
  function seidrBuildUndressActivities() {
    if (seidrUndressCached) return seidrUndressCached;
    var out = [];
    SEIDR_UNDRESS_SLOTS.forEach(function(slot) {
      if (seidrUndressShouldRegisterGroup(slot.group, false)) {
        out.push(seidrUndressMakeAct(slot, slot.group));
      }
      var echo1 = seidrEchoGroup(slot.group, 0);
      var echo2 = seidrEchoGroup(slot.group, 1);
      var layers = [];
      if (seidrUndressShouldRegisterGroup(slot.group, false)) layers.push(slot.group);
      if (seidrUndressShouldRegisterGroup(echo1, true)) {
        out.push(seidrUndressMakeAct(slot, echo1));
        layers.push(echo1);
      }
      if (seidrUndressShouldRegisterGroup(echo2, true)) {
        out.push(seidrUndressMakeAct(slot, echo2));
        layers.push(echo2);
      }
      if (slot.bundle && layers.length >= 2) {
        out.push(seidrUndressMakeBundleAct(slot, layers));
      }
    });
    seidrUndressCached = out;
    return out;
  }
  function seidrUndressGroupsOf(actOrGroups) {
    if (!actOrGroups) return [];
    if (Array.isArray(actOrGroups)) return actOrGroups.slice();
    if (actOrGroups.clothGroups && actOrGroups.clothGroups.length) {
      return actOrGroups.clothGroups.slice();
    }
    if (typeof actOrGroups === "string") return [actOrGroups];
    if (actOrGroups.clothGroup) return [actOrGroups.clothGroup];
    return [];
  }
  function seidrUndressCan(acting, acted, clothGroupOrGroups) {
    if (!acting || !acted) return false;
    if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
    var groups = seidrUndressGroupsOf(clothGroupOrGroups);
    if (!groups.length) return false;
    if (!seidrCanChangeClothes(acting, acted)) return false;
    for (var i = 0; i < groups.length; i++) {
      if (seidrIsWearing(acted, groups[i])) return true;
    }
    return false;
  }
  function seidrUndressDynamicLabel(act, character) {
    if (!act || !act.undress) return act && act.label ? act.label : "Undress";
    if (act.bundle) return act.label || "Undress all " + (act.family || "clothes");
    var worn = seidrWornClothName(character, act.clothGroup);
    if (worn) return "Undress " + worn;
    return seidrUndressFallbackLabel(act);
  }
  function seidrUndressBuildChat(act, actor, acted, selfRun) {
    if (!act || !act.undress) return "";
    var wearer = selfRun ? actor : acted;
    var clothing = act.bundle ? act.noun || "clothing" : seidrWornClothName(wearer, act.clothGroup) || act.noun || "clothing";
    var possessive = seidrPronounPossessive(actor);
    var lines = selfRun ? act.selfTexts : act.otherTexts;
    var template = seidrPickRandom(lines);
    if (!template) {
      template = selfRun ? "{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}" : "{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off";
    }
    return seidrUndressFillTemplate(template, clothing, possessive);
  }
  function seidrUndressWriteDialogCache(act, selfRun, text) {
    if (!act || !text || typeof ActivityDictionaryLoad !== "function") return;
    try {
      const cache = ActivityDictionaryLoad();
      if (!cache || !cache.cache) return;
      const zone = act.zone || "ItemTorso";
      const key = (selfRun ? "ChatSelf-" : "ChatOther-") + zone + "-" + act.name;
      cache.cache[key] = text;
    } catch (e) {
    }
  }
  function seidrUndressPrepareChat(actor, acted, act) {
    if (!act || !act.undress) return;
    var selfRun = !!(actor && acted && actor.MemberNumber === acted.MemberNumber);
    var text = seidrUndressBuildChat(act, actor, acted, selfRun);
    seidrPendingUndressChat = {
      name: act.name,
      text
    };
    seidrUndressWriteDialogCache(act, selfRun, text);
  }
  function seidrUndressConsumePending(activityName) {
    if (!seidrPendingUndressChat || seidrPendingUndressChat.name !== activityName) return "";
    var text = seidrPendingUndressChat.text || "";
    seidrPendingUndressChat = null;
    return text;
  }
  function seidrUndressStrip(acted, clothGroupOrGroups) {
    if (!acted) return false;
    var groups = seidrUndressGroupsOf(clothGroupOrGroups);
    if (!groups.length) return false;
    try {
      var removed = [];
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        if (!seidrIsWearing(acted, group)) continue;
        if (typeof InventoryRemove === "function") {
          InventoryRemove(acted, group, true);
        }
        removed.push(group);
      }
      if (!removed.length) return false;
      if (typeof CharacterLoadCanvas === "function") {
        try {
          CharacterLoadCanvas(acted);
        } catch (eCanvas) {
        }
      }
      if (typeof ChatRoomCharacterItemUpdate === "function") {
        for (var r = 0; r < removed.length; r++) {
          ChatRoomCharacterItemUpdate(acted, removed[r]);
        }
      } else if (typeof ChatRoomCharacterUpdate === "function") {
        ChatRoomCharacterUpdate(acted);
      }
      return true;
    } catch (e) {
      console.warn("[Seidr] undress strip", e);
      return false;
    }
  }
  function seidrUndressStripDeferred(acted, clothGroupOrGroups) {
    var target = acted;
    var groups = seidrUndressGroupsOf(clothGroupOrGroups);
    setTimeout(function() {
      try {
        seidrUndressStrip(target, groups);
        if (typeof Seidr.undressRefreshLabels === "function") {
          Seidr.undressRefreshLabels();
        }
      } catch (e) {
        console.warn("[Seidr] undress deferred", e);
      }
    }, 0);
  }
  function seidrUndressWriteLabels(cache, character) {
    if (!cache || !cache.cache) return;
    seidrBuildUndressActivities().forEach(function(act) {
      var label = seidrUndressDynamicLabel(act, character);
      cache.cache["Activity" + act.name] = label;
      var zone = act.zone;
      cache.cache["Label-ChatOther-" + zone + "-" + act.name] = label;
      cache.cache["Label-ChatSelf-" + zone + "-" + act.name] = label;
      delete cache.cache["ChatOther-" + zone + "-" + act.name];
      delete cache.cache["ChatSelf-" + zone + "-" + act.name];
    });
  }
  function seidrUndressRefreshLabels() {
    if (typeof ActivityDictionaryLoad !== "function") return;
    var focused = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : null;
    var character = focused || (typeof Player !== "undefined" ? Player : null);
    seidrUndressWriteLabels(ActivityDictionaryLoad(), character);
  }
  Seidr.undressSlotTable = function() {
    return SEIDR_UNDRESS_SLOTS.slice();
  };
  Seidr.undressEchoSuffixes = function() {
    return SEIDR_ECHO_SUFFIXES.slice();
  };
  Seidr.undressResetCache = function() {
    seidrUndressCached = null;
  };
  Seidr.undressSafeId = seidrUndressSafeId;
  Seidr.undressActivities = seidrBuildUndressActivities;
  Seidr.undressCan = seidrUndressCan;
  Seidr.undressPrepareChat = seidrUndressPrepareChat;
  Seidr.undressConsumePending = seidrUndressConsumePending;
  Seidr.undressBuildChat = seidrUndressBuildChat;
  Seidr.undressFillTemplate = seidrUndressFillTemplate;
  Seidr.undressPronounPossessive = seidrPronounPossessive;
  Seidr.undressStrip = seidrUndressStrip;
  Seidr.undressStripDeferred = seidrUndressStripDeferred;
  Seidr.undressWriteLabels = seidrUndressWriteLabels;
  Seidr.undressRefreshLabels = seidrUndressRefreshLabels;
  Seidr.undressDynamicLabel = seidrUndressDynamicLabel;
  Seidr.undressWornName = seidrWornClothName;
  Seidr.clothingGroupExists = seidrClothingGroupExists;

  // src/core/sdk.ts
  Seidr.resolveGlobalPath = function(name) {
    if (!name || typeof name !== "string") return void 0;
    const parts = name.split(".");
    let cur = globalThis;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object" && typeof cur !== "function") return void 0;
      cur = cur[parts[i]];
    }
    return cur;
  };
  Seidr.registerBcModSdk = function() {
    if (Seidr.bcMod) return Seidr.bcMod;
    const sdk = globalThis.bcModSdk;
    if (sdk && typeof sdk.registerMod === "function") {
      const info = {
        name: "Seidr",
        fullName: Seidr.FULL_NAME || "Seidr",
        version: Seidr.VERSION
      };
      if (Seidr.REPO_URL) info.repository = Seidr.REPO_URL;
      Seidr.bcMod = sdk.registerMod(info);
    }
    return Seidr.bcMod || null;
  };
  function trackFallback(parent, key, original) {
    Seidr._fallbackHooks = Seidr._fallbackHooks || [];
    const list = Seidr._fallbackHooks;
    list.push({ parent, key, original });
  }
  Seidr.restoreFallbackHooks = function() {
    const list = Seidr._fallbackHooks || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      try {
        entry.parent[entry.key] = entry.original;
      } catch (e) {
      }
    }
    Seidr._fallbackHooks = [];
  };
  Seidr.hookFunction = function(name, priority, hook) {
    const sdk = Seidr.registerBcModSdk();
    if (sdk && typeof sdk.hookFunction === "function") {
      sdk.hookFunction(name, priority, hook);
      return true;
    }
    const parts = String(name || "").split(".");
    if (parts.length === 1) {
      const win = window;
      const original2 = win[name];
      if (typeof original2 !== "function") {
        console.warn("[Seidr] Cannot hook missing function " + name);
        return false;
      }
      trackFallback(win, name, original2);
      win[name] = function(...args) {
        return hook(args, function(nextArgs) {
          return original2.apply(window, nextArgs || args);
        });
      };
      return true;
    }
    let parent = globalThis;
    for (let i = 0; i < parts.length - 1; i++) {
      if (parent == null || typeof parent !== "object" && typeof parent !== "function") {
        console.warn("[Seidr] Cannot hook missing path " + name);
        return false;
      }
      parent = parent[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (parent == null || typeof parent !== "object" && typeof parent !== "function") {
      console.warn("[Seidr] Cannot hook missing path " + name);
      return false;
    }
    const obj = parent;
    const original = obj[key];
    if (typeof original !== "function") {
      console.warn("[Seidr] Cannot hook missing function " + name);
      return false;
    }
    console.warn("[Seidr] ModSDK missing \u2014 raw wrap of " + name + " (may trip BCX if ModSDK loads later)");
    trackFallback(obj, key, original);
    obj[key] = function(...args) {
      const self = this;
      return hook(args, function(nextArgs) {
        return original.apply(self, nextArgs || args);
      });
    };
    return true;
  };
  Seidr.tryHook = function(stateKey, name, priority, hook) {
    Seidr._hookState = Seidr._hookState || {};
    if (Seidr._hookState[stateKey || name]) return true;
    const target = Seidr.resolveGlobalPath(name);
    if (typeof target !== "function") return false;
    const ok = Seidr.hookFunction(name, priority, hook);
    if (ok) Seidr._hookState[stateKey || name] = true;
    return ok;
  };

  // src/activities.ts
  var SEIDR_HOLD_ACTIVITIES = [
    {
      name: "Seidr_PullLeft",
      slot: "left",
      prereq: "Seidr_CanPullLeft",
      needsHands: true,
      label: "Pull Left",
      chat: "SourceCharacter pulls TargetCharacter to the left."
    },
    {
      name: "Seidr_PullRight",
      slot: "right",
      prereq: "Seidr_CanPullRight",
      needsHands: true,
      label: "Pull Right",
      chat: "SourceCharacter pulls TargetCharacter to the right."
    },
    {
      name: "Seidr_Cuddle",
      slot: "cuddle",
      prereq: "Seidr_CanCuddle",
      needsHands: true,
      label: "Cuddle",
      chat: "SourceCharacter cuddles TargetCharacter."
    },
    {
      name: "Seidr_RemoveLeft",
      removeSlot: "left",
      prereq: "Seidr_CanRemoveLeft",
      needsHands: false,
      label: "Remove Left",
      chat: "SourceCharacter releases TargetCharacter from the left.",
      chatSelf: "SourceCharacter clears the left hold.",
      self: true
    },
    {
      name: "Seidr_RemoveRight",
      removeSlot: "right",
      prereq: "Seidr_CanRemoveRight",
      needsHands: false,
      label: "Remove Right",
      chat: "SourceCharacter releases TargetCharacter from the right.",
      chatSelf: "SourceCharacter clears the right hold.",
      self: true
    },
    {
      name: "Seidr_RemoveCuddle",
      removeSlot: "cuddle",
      prereq: "Seidr_CanRemoveCuddle",
      needsHands: false,
      label: "Remove Cuddle",
      chat: "SourceCharacter ends the cuddle with TargetCharacter.",
      chatSelf: "SourceCharacter ends the cuddle.",
      self: true
    },
    {
      name: "Seidr_Remove",
      slot: null,
      prereq: "Seidr_CanRemove",
      needsHands: false,
      label: "Leave",
      chat: "SourceCharacter ends the hold with TargetCharacter.",
      chatSelf: "SourceCharacter leaves the hold.",
      self: true
    }
  ];
  var SEIDR_ACTIVITIES = SEIDR_HOLD_ACTIVITIES.slice();
  var seidrLabelsHooked = false;
  var seidrActivitiesRegistered = false;
  function seidrMergeUndressActivities() {
    if (typeof Seidr.undressActivities !== "function") return;
    var seen = {};
    SEIDR_ACTIVITIES.forEach(function(act) {
      if (act && act.name) seen[act.name] = true;
    });
    Seidr.undressActivities().forEach(function(act) {
      if (!act || !act.name || seen[act.name]) return;
      seen[act.name] = true;
      SEIDR_ACTIVITIES.push(act);
    });
  }
  function seidrSvg(body) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  function seidrButtonImage(name) {
    var bg = '<rect width="64" height="64" rx="10" fill="#241c30"/>';
    if (name === "Seidr_PullLeft") {
      return seidrSvg(bg + '<path d="M42 16 L20 32 L42 48" fill="none" stroke="#f0e6d4" stroke-width="5" stroke-linejoin="round"/>');
    }
    if (name === "Seidr_PullRight") {
      return seidrSvg(bg + '<path d="M22 16 L44 32 L22 48" fill="none" stroke="#f0e6d4" stroke-width="5" stroke-linejoin="round"/>');
    }
    if (name === "Seidr_Cuddle") {
      return seidrSvg(bg + '<circle cx="24" cy="28" r="8" fill="#f0e6d4"/><circle cx="40" cy="28" r="8" fill="#f0e6d4"/><path d="M16 46 Q32 34 48 46" fill="none" stroke="#e0b15a" stroke-width="4"/>');
    }
    if (name === "Seidr_RemoveLeft") {
      return seidrSvg(bg + '<path d="M42 16 L20 32 L42 48" fill="none" stroke="#e07a7a" stroke-width="5"/><path d="M18 18 L46 46" stroke="#e07a7a" stroke-width="4"/>');
    }
    if (name === "Seidr_RemoveRight") {
      return seidrSvg(bg + '<path d="M22 16 L44 32 L22 48" fill="none" stroke="#e07a7a" stroke-width="5"/><path d="M18 18 L46 46" stroke="#e07a7a" stroke-width="4"/>');
    }
    if (name === "Seidr_RemoveCuddle") {
      return seidrSvg(bg + '<circle cx="24" cy="28" r="8" fill="#e07a7a"/><circle cx="40" cy="28" r="8" fill="#e07a7a"/><path d="M18 18 L46 46" stroke="#f0e6d4" stroke-width="4"/>');
    }
    if (typeof name === "string" && name.indexOf("Seidr_Undress_") === 0) {
      return seidrSvg(
        bg + '<path d="M18 22 h28 v6 H18 z" fill="#f0e6d4"/><path d="M22 28 h20 v20 H22 z" fill="none" stroke="#e0b15a" stroke-width="3"/><path d="M14 14 L50 50" stroke="#e07a7a" stroke-width="4" stroke-linecap="round"/>'
      );
    }
    return seidrSvg(bg + '<path d="M20 20 L44 44 M44 20 L20 44" fill="none" stroke="#e07a7a" stroke-width="5" stroke-linecap="round"/>');
  }
  function seidrBadgeImage(letter) {
    return seidrSvg(
      '<circle cx="32" cy="32" r="28" fill="#e0b15a"/><text x="32" y="42" text-anchor="middle" font-size="32" font-family="sans-serif" font-weight="700" fill="#241c30">' + letter + "</text>"
    );
  }
  function seidrActivityByName(name) {
    for (var i = 0; i < SEIDR_ACTIVITIES.length; i++) {
      if (SEIDR_ACTIVITIES[i].name === name) return SEIDR_ACTIVITIES[i];
    }
    return null;
  }
  function seidrNextActivityId() {
    var max = 9e3;
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return max + 1;
    for (var i = 0; i < ActivityFemale3DCG.length; i++) {
      var id = ActivityFemale3DCG[i] && ActivityFemale3DCG[i].ActivityID;
      if (typeof id === "number" && id > max) max = id;
    }
    return max + 1;
  }
  function seidrActZones(act) {
    if (act && act.zone) return [act.zone];
    return Seidr.GROUPS.slice();
  }
  function seidrWriteLabels(cache) {
    if (!cache || !cache.cache) return;
    SEIDR_ACTIVITIES.forEach(function(act) {
      if (act.undress) return;
      cache.cache["Activity" + act.name] = act.label;
      seidrActZones(act).forEach(function(group) {
        cache.cache["Label-ChatOther-" + group + "-" + act.name] = act.label;
        cache.cache["Label-ChatSelf-" + group + "-" + act.name] = act.label;
        cache.cache["ChatOther-" + group + "-" + act.name] = act.chat;
        cache.cache["ChatSelf-" + group + "-" + act.name] = act.chatSelf || act.chat;
      });
    });
    if (typeof Seidr.undressWriteLabels === "function") {
      var focused = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : null;
      Seidr.undressWriteLabels(cache, focused || (typeof Player !== "undefined" ? Player : null));
    }
  }
  function seidrBindActivity(act) {
    var prereq = act.needsHands ? ["UseHands", act.prereq] : [act.prereq];
    var zones = seidrActZones(act);
    return {
      Name: act.name,
      MaxProgress: 0,
      MaxProgressSelf: 0,
      Prerequisite: prereq,
      Target: zones.slice(),
      TargetSelf: act.self ? zones.slice() : void 0
    };
  }
  function seidrEnsureLabels() {
    if (typeof ActivityDictionaryLoad !== "function") return;
    var cache = ActivityDictionaryLoad();
    seidrWriteLabels(cache);
    if (!seidrLabelsHooked && cache && typeof cache.onRebuild === "function") {
      seidrLabelsHooked = true;
      cache.onRebuild(function() {
        seidrWriteLabels(typeof ActivityDictionaryLoad === "function" ? ActivityDictionaryLoad() : null);
      }, false);
    }
  }
  function seidrRegisterActivities() {
    if (seidrActivitiesRegistered) return;
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
    seidrMergeUndressActivities();
    SEIDR_ACTIVITIES.forEach(function(act) {
      var existing = null;
      for (var i = 0; i < ActivityFemale3DCG.length; i++) {
        if (ActivityFemale3DCG[i] && ActivityFemale3DCG[i].Name === act.name) {
          existing = ActivityFemale3DCG[i];
          break;
        }
      }
      var bound = seidrBindActivity(act);
      if (existing) {
        if (typeof existing.ActivityID !== "number") existing.ActivityID = seidrNextActivityId();
        existing.MaxProgress = bound.MaxProgress;
        existing.MaxProgressSelf = bound.MaxProgressSelf;
        existing.Prerequisite = bound.Prerequisite;
        existing.Target = bound.Target;
        if (bound.TargetSelf) existing.TargetSelf = bound.TargetSelf;
        else delete existing.TargetSelf;
        return;
      }
      bound.ActivityID = seidrNextActivityId();
      ActivityFemale3DCG.push(bound);
      if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
        ActivityFemale3DCGOrdering.push(act.name);
      }
    });
    seidrActivitiesRegistered = true;
    seidrEnsureLabels();
  }
  function seidrPeerOk(member) {
    return Seidr.peerHas && Seidr.peerHas(member);
  }
  function seidrCanPlace(acting, acted, slot) {
    if (!acting || !acted) return false;
    if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
    if (acting.MemberNumber === acted.MemberNumber) return false;
    if (!seidrPeerOk(acted.MemberNumber)) return false;
    if (!seidrAllowAct(acting, acted)) return false;
    if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
    return SeidrState.canPlace(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber, slot);
  }
  function seidrCanRemove(acting, acted) {
    if (!acting || !acted) return false;
    if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
    if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
    if (acting.MemberNumber === acted.MemberNumber) {
      return SeidrState.canRemove(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber);
    }
    if (!seidrPeerOk(acted.MemberNumber)) return false;
    return SeidrState.canRemove(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber);
  }
  function seidrCanRemoveSlot(acting, acted, slot) {
    if (!acting || !acted) return false;
    if (typeof acting.MemberNumber !== "number" || typeof acted.MemberNumber !== "number") return false;
    if (seidrInEcho(acting) || seidrInEcho(acted)) return false;
    if (acting.MemberNumber !== acted.MemberNumber && !seidrPeerOk(acted.MemberNumber)) return false;
    return SeidrState.canRemoveSlot(Seidr.getHubs(), acting.MemberNumber, acted.MemberNumber, slot);
  }
  function seidrApplyNamed(hubs, source, target, name) {
    var act = seidrActivityByName(name);
    if (!act || typeof source !== "number" || typeof target !== "number") return hubs;
    if (act.undress) return hubs;
    if (act.slot) return SeidrState.applySlot(hubs, source, act.slot, target);
    if (act.removeSlot) return SeidrState.clearSlot(hubs, source, act.removeSlot);
    if (source === target) return SeidrState.leaveSelf(hubs, source);
    return SeidrState.removeRelation(hubs, source, target);
  }
  function seidrDictValue(dict, key) {
    if (!Array.isArray(dict)) return null;
    for (var i = 0; i < dict.length; i++) {
      var entry = dict[i];
      if (entry && Object.prototype.hasOwnProperty.call(entry, key)) return entry[key];
    }
    return null;
  }
  function seidrActivityNameFromMessage(data) {
    var named = seidrDictValue(data && data.Dictionary, "ActivityName");
    if (typeof named === "string") return named;
    var match = /Chat(?:Other|Self)-[^-]+-(.+)$/.exec(data && data.Content || "");
    return match ? match[1] : "";
  }
  var SEIDR_MISSING_TAG_PREFIX = 'MISSING TEXT IN "ActivityDictionary.csv": ';
  function seidrDialogForContent(content) {
    var match = /^(Chat(?:Other|Self))-[^-]+-(.+)$/.exec(content || "");
    if (!match) return "";
    var act = seidrActivityByName(match[2]);
    if (!act) return "";
    if (act.undress && typeof Seidr.undressConsumePending === "function") {
      var pending = Seidr.undressConsumePending(act.name);
      if (pending) return pending;
    }
    if (match[1] === "ChatSelf") return act.chatSelf || act.chat;
    return act.chat;
  }
  function seidrInjectActivityDictionaryText(data) {
    if (!data || data.Type !== "Activity" || typeof data.Content !== "string") return;
    if (data.Content.indexOf(Seidr.PREFIX) < 0) return;
    var text = seidrDialogForContent(data.Content);
    if (!text) return;
    var tag = SEIDR_MISSING_TAG_PREFIX + data.Content;
    if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
    for (var i = 0; i < data.Dictionary.length; i++) {
      var entry = data.Dictionary[i];
      if (entry && entry.Tag === tag) {
        entry.Text = text;
        return;
      }
    }
    data.Dictionary.push({ Tag: tag, Text: text });
  }
  function seidrClearBadge(button) {
    var icons = button.querySelectorAll(".button-icon");
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var name = icon.getAttribute("data-name") || "";
      if (name.indexOf("seidr-") !== 0) continue;
      var owns = (icon.getAttribute("aria-owns") || "").split(/\s+/);
      for (var o = 0; o < owns.length; o++) {
        if (!owns[o]) continue;
        var node = document.getElementById(owns[o]);
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }
      if (icon.parentNode) icon.parentNode.removeChild(icon);
    }
  }
  function seidrFocusedCharacter() {
    if (typeof CharacterGetCurrent === "function") return CharacterGetCurrent();
    return null;
  }
  function seidrBadgeActivityButtons() {
    var grid = document.getElementById("dialog-activity-grid");
    if (!grid || typeof Player === "undefined" || !Player) return;
    var focused = seidrFocusedCharacter();
    var focusedN = focused && typeof focused.MemberNumber === "number" ? focused.MemberNumber : null;
    var hubs = Seidr.getHubs();
    var buttons = grid.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      var name = button.getAttribute("name") || "";
      if (name.indexOf(Seidr.PREFIX) !== 0) continue;
      seidrClearBadge(button);
      button.classList.remove("seidr-slot-active");
      button.removeAttribute("data-seidr-state");
      var act = seidrActivityByName(name);
      if (!act || act.undress) continue;
      var letter = "";
      var tip = "";
      var active = false;
      if (act.slot) {
        var held = SeidrState.occupant(hubs, Player.MemberNumber, act.slot);
        if (held != null) {
          letter = act.slot === "cuddle" ? "C" : act.slot === "left" ? "L" : "R";
          tip = act.label + ": " + seidrCharName(held);
          active = focusedN === held;
        }
      } else if (act.removeSlot) {
        var removeHeld = SeidrState.occupant(hubs, Player.MemberNumber, act.removeSlot);
        if (removeHeld != null) {
          letter = act.removeSlot === "cuddle" ? "C" : act.removeSlot === "left" ? "L" : "R";
          tip = act.label + ": " + seidrCharName(removeHeld);
          active = focusedN === removeHeld || focusedN === Player.MemberNumber;
        }
      } else if (focusedN != null) {
        if (focusedN === Player.MemberNumber) {
          var selfCluster = SeidrState.clusterOf(hubs, Player.MemberNumber);
          if (selfCluster && selfCluster.hub !== Player.MemberNumber) {
            var selfSlot = selfCluster.left === Player.MemberNumber ? "left" : selfCluster.right === Player.MemberNumber ? "right" : "cuddle";
            letter = selfSlot === "cuddle" ? "C" : selfSlot === "left" ? "L" : "R";
            tip = "Leave " + selfSlot;
            active = true;
          }
        } else {
          var rel = SeidrState.relation(hubs, Player.MemberNumber, focusedN);
          if (rel && rel.role === "satellite") {
            letter = rel.slot === "cuddle" ? "C" : rel.slot === "left" ? "L" : "R";
            tip = "Leave " + rel.slot + ": " + seidrCharName(focusedN);
            active = true;
          }
        }
      }
      if (!letter || typeof ElementButton === "undefined" || !ElementButton._ParseIcons) continue;
      var parsed = ElementButton._ParseIcons(button.id, [{
        name: "seidr-" + letter.toLowerCase(),
        iconSrc: seidrBadgeImage(letter),
        tooltipText: tip
      }]);
      if (!parsed) continue;
      if (parsed.iconGrid && !button.contains(parsed.iconGrid)) button.appendChild(parsed.iconGrid);
      var tooltip = button.querySelector(".button-tooltip");
      if (tooltip && parsed.tooltip && parsed.tooltip[1] && !button.contains(parsed.tooltip[1])) {
        tooltip.appendChild(parsed.tooltip[0]);
        tooltip.appendChild(parsed.tooltip[1]);
      }
      if (active) {
        button.classList.add("seidr-slot-active");
        button.setAttribute("data-seidr-state", letter);
      }
    }
  }
  function seidrInstallLateActivityUiHooks() {
    Seidr.tryHook("ElementButton.CreateForActivity", "ElementButton.CreateForActivity", 5, function(args, next) {
      var activity = args[1];
      var actName = activity && activity.Activity && activity.Activity.Name;
      if (typeof actName === "string" && actName.indexOf(Seidr.PREFIX) === 0) {
        args[4] = Object.assign({}, args[4] || {}, { image: seidrButtonImage(actName) });
      }
      return next(args);
    });
    Seidr.tryHook("DialogMenuMapping.activities._ReloadButtonGrid", "DialogMenuMapping.activities._ReloadButtonGrid", 5, function(args, next) {
      var result = next(args);
      try {
        if (typeof Seidr.undressRefreshLabels === "function") Seidr.undressRefreshLabels();
      } catch (e) {
      }
      try {
        seidrBadgeActivityButtons();
      } catch (e2) {
      }
      return result;
    });
  }
  function seidrInstallActivityHooks() {
    seidrInstallLateActivityUiHooks();
    Seidr.hookFunction("PreferenceGetActivityFactor", 0, function(args, next) {
      var type = args[1];
      if (typeof type === "string" && type.indexOf(Seidr.PREFIX) === 0) return 2;
      return next(args);
    });
    Seidr.hookFunction("ActivityCheckPrerequisite", 100, function(args, next) {
      var name = args[0];
      try {
        if (name === "Seidr_CanPullLeft") return seidrCanPlace(args[1], args[2], "left");
        if (name === "Seidr_CanPullRight") return seidrCanPlace(args[1], args[2], "right");
        if (name === "Seidr_CanCuddle") return seidrCanPlace(args[1], args[2], "cuddle");
        if (name === "Seidr_CanRemoveLeft") return seidrCanRemoveSlot(args[1], args[2], "left");
        if (name === "Seidr_CanRemoveRight") return seidrCanRemoveSlot(args[1], args[2], "right");
        if (name === "Seidr_CanRemoveCuddle") return seidrCanRemoveSlot(args[1], args[2], "cuddle");
        if (name === "Seidr_CanRemove") return seidrCanRemove(args[1], args[2]);
        if (typeof name === "string" && (name.indexOf("Seidr_CanUndress_") === 0 || name.indexOf("Seidr_CanUndressAll_") === 0)) {
          var undressAct = null;
          for (var i = 0; i < SEIDR_ACTIVITIES.length; i++) {
            if (SEIDR_ACTIVITIES[i].prereq === name) {
              undressAct = SEIDR_ACTIVITIES[i];
              break;
            }
          }
          if (!undressAct || !undressAct.undress) return false;
          return typeof Seidr.undressCan === "function" ? Seidr.undressCan(args[1], args[2], undressAct.clothGroups || undressAct.clothGroup) : false;
        }
      } catch (e) {
        return false;
      }
      return next(args);
    });
    Seidr.hookFunction("ServerSend", 5, function(args, next) {
      try {
        if (args && args[0] === "ChatRoomChat") seidrInjectActivityDictionaryText(args[1]);
      } catch (e) {
      }
      return next(args);
    });
    Seidr.hookFunction("ActivityRun", 5, function(args, next) {
      var actor = args[0];
      var acted = args[1];
      var itemActivity = args[3];
      var actName = itemActivity && itemActivity.Activity && itemActivity.Activity.Name;
      var act = seidrActivityByName(actName);
      if (act && act.undress && actor && typeof actor.IsPlayer === "function" && actor.IsPlayer()) {
        try {
          if (typeof Seidr.undressPrepareChat === "function") {
            Seidr.undressPrepareChat(actor, acted, act);
          }
        } catch (ePrep) {
          console.warn("[Seidr] undress prep", ePrep);
        }
        var stripTarget = acted;
        var stripGroups = act.clothGroups && act.clothGroups.length ? act.clothGroups.slice() : act.clothGroup;
        var undressResult = next(args);
        try {
          if (typeof Seidr.undressStripDeferred === "function") {
            Seidr.undressStripDeferred(stripTarget, stripGroups);
          } else if (typeof Seidr.undressStrip === "function") {
            Seidr.undressStrip(stripTarget, stripGroups);
          }
        } catch (eStrip) {
          console.warn("[Seidr] undress", eStrip);
        }
        return undressResult;
      }
      var result = next(args);
      try {
        if (!actor || !acted || !act) return result;
        if (typeof actor.IsPlayer !== "function" || !actor.IsPlayer()) return result;
        var before = Seidr.getHubs();
        var nextHubs = seidrApplyNamed(before, actor.MemberNumber, acted.MemberNumber, actName);
        Seidr.setHubs(nextHubs);
        if (Seidr.publishChanged) Seidr.publishChanged(before, nextHubs, actor.MemberNumber, acted.MemberNumber);
        seidrBadgeActivityButtons();
      } catch (e) {
        console.warn("[Seidr] activity", e);
      }
      return result;
    });
    Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 0, function(args, next) {
      var ret = next(args);
      try {
        seidrInstallLateActivityUiHooks();
      } catch (e) {
      }
      return ret;
    });
  }
  Seidr.installActivities = function() {
    seidrMergeUndressActivities();
    seidrRegisterActivities();
    seidrEnsureLabels();
    seidrInstallActivityHooks();
    Seidr.applyNamed = seidrApplyNamed;
    Seidr.activityNameFromMessage = seidrActivityNameFromMessage;
    Seidr.dictValue = seidrDictValue;
    Seidr.badgeActivityButtons = seidrBadgeActivityButtons;
    Seidr.dialogForContent = seidrDialogForContent;
    Seidr.injectActivityDictionaryText = seidrInjectActivityDictionaryText;
    Seidr.installLateActivityUiHooks = seidrInstallLateActivityUiHooks;
  };

  // src/draw.ts
  var seidrNatural = {};
  function seidrViewActive() {
    if (typeof ChatRoomCharacterViewIsActive !== "function") return true;
    try {
      return !!ChatRoomCharacterViewIsActive();
    } catch (e) {
      return false;
    }
  }
  function seidrInCluster(character) {
    if (!character || typeof character.MemberNumber !== "number") return false;
    if (seidrInEcho(character)) return false;
    return !!SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
  }
  function seidrClusterOrder(cluster) {
    var out = [];
    if (!cluster) return out;
    [cluster.left, cluster.hub, cluster.cuddle, cluster.right].forEach(function(id) {
      if (id != null) out.push(id);
    });
    return out;
  }
  function seidrReorderDrawlist() {
    if (typeof ChatRoomCharacterDrawlist === "undefined" || !Array.isArray(ChatRoomCharacterDrawlist)) return;
    var old = ChatRoomCharacterDrawlist;
    if (!old.length) return;
    var hubs = Seidr.getHubs ? Seidr.getHubs() : null;
    if (!hubs) return;
    var byId = {};
    var i;
    for (i = 0; i < old.length; i++) {
      var c = old[i];
      if (c && typeof c.MemberNumber === "number") byId[c.MemberNumber] = c;
    }
    Object.keys(hubs).forEach(function(key) {
      var cluster2 = SeidrState.clusterOf(hubs, key);
      if (!cluster2) return;
      var present = seidrClusterOrder(cluster2).some(function(id) {
        return !!byId[id];
      });
      if (!present) return;
      seidrClusterOrder(cluster2).forEach(function(id) {
        if (byId[id]) return;
        var found = seidrFindChar(id);
        if (found && !seidrInEcho(found)) byId[id] = found;
      });
    });
    var used = {};
    var nextList = [];
    function emitCluster(cluster2) {
      var block = [];
      seidrClusterOrder(cluster2).forEach(function(id) {
        var ch = byId[id];
        if (!ch || used[id] || seidrInEcho(ch)) return;
        used[id] = true;
        block.push(ch);
      });
      return block;
    }
    for (i = 0; i < old.length; i++) {
      var character = old[i];
      if (!character || typeof character.MemberNumber !== "number") continue;
      if (used[character.MemberNumber]) continue;
      if (seidrInEcho(character)) {
        used[character.MemberNumber] = true;
        nextList.push(character);
        continue;
      }
      var cluster = SeidrState.clusterOf(hubs, character.MemberNumber);
      if (!cluster) {
        used[character.MemberNumber] = true;
        nextList.push(character);
        continue;
      }
      if (used[cluster.hub]) continue;
      var members = emitCluster(cluster);
      if (members.length) nextList.push.apply(nextList, members);
    }
    Object.keys(byId).forEach(function(key) {
      var id = Number(key);
      if (used[id]) return;
      nextList.push(byId[id]);
      used[id] = true;
    });
    ChatRoomCharacterDrawlist = nextList;
    if (typeof ChatRoomCharacterViewCharacterCount === "number") {
      ChatRoomCharacterViewCharacterCount = nextList.length;
    }
  }
  function seidrSharedCenter(cluster, zoom) {
    var z = typeof zoom === "number" ? zoom : 1;
    if (!cluster) return null;
    var sumX = 0;
    var sumY = 0;
    var count = 0;
    seidrClusterOrder(cluster).forEach(function(id) {
      var pos = seidrNatural[id];
      if (!pos || typeof pos.X !== "number") return;
      sumX += pos.X;
      sumY += pos.Y;
      count += 1;
    });
    if (!count) return null;
    return { X: sumX / count, Y: sumY / count, Zoom: z };
  }
  function seidrDrawPose(character, x, y, zoom) {
    var z = typeof zoom === "number" ? zoom : 1;
    if (!character || typeof character.MemberNumber !== "number") return null;
    if (seidrInEcho(character)) return null;
    var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
    if (!cluster) return null;
    var center = seidrSharedCenter(cluster, z);
    if (!center) return null;
    var ox = (Seidr.OFFSET_X || 100) * z;
    var bothSides = cluster.left != null && cluster.right != null;
    var sideOx = bothSides ? ox * 2 : ox;
    var sideY = center.Y + (Seidr.OFFSET_SIDE_Y || -50) * z;
    var hubY = (Seidr.OFFSET_HUB_Y || -50) * z;
    var n = character.MemberNumber;
    if (n === cluster.left) return { X: center.X - sideOx, Y: sideY, Zoom: z };
    if (n === cluster.right) return { X: center.X + sideOx, Y: sideY, Zoom: z };
    if (n === cluster.cuddle) return { X: center.X, Y: center.Y, Zoom: z };
    if (n === cluster.hub) {
      if (cluster.cuddle != null) return { X: center.X, Y: center.Y + hubY, Zoom: z };
      if (cluster.left != null && cluster.right == null) return { X: center.X + ox, Y: center.Y, Zoom: z };
      if (cluster.right != null && cluster.left == null) return { X: center.X - ox, Y: center.Y, Zoom: z };
      return { X: center.X, Y: center.Y, Zoom: z };
    }
    return null;
  }
  var seidrInRoomLoop = false;
  var seidrFrontCapture = null;
  function seidrFrontRank(character) {
    if (!character || typeof character.MemberNumber !== "number") return 0;
    if (seidrInEcho(character)) return 0;
    var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
    if (!cluster) return 0;
    if (cluster.cuddle === character.MemberNumber) return 2;
    if (cluster.hub === character.MemberNumber) return 1;
    return 0;
  }
  function seidrHoldFrontCharacter(args) {
    if (!seidrInRoomLoop || !seidrFrontCapture) return false;
    var rank = seidrFrontRank(args[0]);
    if (!rank) return false;
    seidrFrontCapture.characters.push({ rank, args: Array.prototype.slice.call(args) });
    return true;
  }
  function seidrReplayFront(captured) {
    if (!captured || !captured.characters || !captured.characters.length) return;
    var fn = typeof DrawCharacter === "function" ? DrawCharacter : null;
    if (!fn) return;
    var list = captured.characters.slice().sort(function(a, b) {
      return a.rank - b.rank;
    });
    for (var i = 0; i < list.length; i++) {
      try {
        fn.apply(null, list[i].args);
      } catch (e) {
        console.warn("[Seidr] front draw", e);
      }
    }
  }
  function seidrStatusCoords(character, x, y, zoom) {
    if (!character || typeof character.MemberNumber !== "number") return null;
    if (!seidrInCluster(character)) return null;
    var nat = seidrNatural[character.MemberNumber];
    if (!nat || typeof nat.X !== "number" || typeof nat.Y !== "number") return null;
    return {
      X: nat.X,
      Y: nat.Y,
      Zoom: typeof nat.Zoom === "number" ? nat.Zoom : zoom
    };
  }
  function seidrApplyStatusNatural(args) {
    var coords = seidrStatusCoords(args[0], args[1], args[2], args[3]);
    if (!coords) return args;
    args[1] = coords.X;
    args[2] = coords.Y;
    args[3] = coords.Zoom;
    return args;
  }
  var seidrSuppressArousalMember = null;
  Seidr.installDraw = function() {
    Seidr.tryHook("ChatRoomUpdateDisplay", "ChatRoomUpdateDisplay", 10, function(args, next) {
      try {
        seidrReconcileEcho();
      } catch (e) {
      }
      var result = next(args);
      try {
        seidrReorderDrawlist();
      } catch (e) {
        console.warn("[Seidr] reorder", e);
      }
      return result;
    });
    Seidr.hookFunction("DrawCharacter", 1, function(args, next) {
      if (!seidrInRoomLoop) return next(args);
      if (seidrHoldFrontCharacter(args)) return;
      return next(args);
    });
    Seidr.hookFunction("DrawStatus", 1, function(args, next) {
      if (!seidrInRoomLoop) return next(args);
      return next(seidrApplyStatusNatural(args));
    });
    Seidr.hookFunction("ChatRoomCharacterViewDrawOverlay", 1, function(args, next) {
      if (!seidrInRoomLoop) return next(args);
      return next(seidrApplyStatusNatural(args));
    });
    Seidr.hookFunction("ChatRoomCharacterViewLoopCharacters", 5, function(args, next) {
      if (!seidrViewActive()) return next(args);
      try {
        seidrReorderDrawlist();
      } catch (e) {
      }
      var original = args[0];
      args[0] = function(charIdx, charX, charY, space, zoom) {
        var drawX = charX;
        var drawY = charY;
        var drawZoom = zoom;
        try {
          var list = ChatRoomCharacterDrawlist;
          var character = list && list[charIdx];
          if (character && typeof character.MemberNumber === "number") {
            seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom };
            var pose = seidrDrawPose(character, charX, charY, zoom);
            if (pose) {
              drawX = pose.X;
              drawY = pose.Y;
              drawZoom = pose.Zoom;
            }
          }
        } catch (e) {
        }
        return original(charIdx, drawX, drawY, space, drawZoom);
      };
      var previous = seidrFrontCapture;
      var previousLoop = seidrInRoomLoop;
      seidrFrontCapture = { characters: [] };
      seidrInRoomLoop = true;
      var result;
      try {
        result = next(args);
      } finally {
        var captured = seidrFrontCapture;
        seidrFrontCapture = previous;
        seidrInRoomLoop = previousLoop;
        try {
          seidrReplayFront(captured);
        } catch (eReplay) {
          console.warn("[Seidr] replay front", eReplay);
        }
      }
      return result;
    });
    Seidr.hookFunction("PreferenceArousalAtLeast", 5, function(args, next) {
      var who = args[0];
      if (seidrSuppressArousalMember != null && who && who.MemberNumber === seidrSuppressArousalMember) {
        return false;
      }
      return next(args);
    });
    Seidr.hookFunction("ChatRoomCharacterViewClickCharacter", 5, function(args, next) {
      var character = args[0];
      if (!seidrInCluster(character)) return next(args);
      seidrSuppressArousalMember = character.MemberNumber;
      try {
        return next(args);
      } finally {
        seidrSuppressArousalMember = null;
      }
    });
  };
  Seidr._draw = {
    natural: seidrNatural,
    sharedCenter: seidrSharedCenter,
    drawPose: seidrDrawPose,
    statusCoords: seidrStatusCoords,
    clusterOrder: seidrClusterOrder,
    reorder: seidrReorderDrawlist
  };

  // src/net.ts
  var seidrPeers = {};
  function seidrSend(payload, target) {
    if (typeof ServerSend !== "function") return;
    var msg = {
      Content: Seidr.HIDDEN,
      Type: "Hidden",
      Dictionary: [{ Seidr: payload }]
    };
    if (typeof target === "number") msg.Target = target;
    try {
      ServerSend("ChatRoomChat", msg);
    } catch (e) {
    }
  }
  function seidrPublishChanged(before, after, actor, target) {
    var seen = {};
    function consider(member) {
      if (typeof member !== "number" || seen[member]) return;
      seen[member] = true;
      var prev = before && before[member];
      var nextHub = after && after[member];
      if (JSON.stringify(prev || null) === JSON.stringify(nextHub || null)) return;
      seidrPublishHub(member);
    }
    [actor, target].forEach(consider);
    [actor, target].forEach(function(member) {
      if (typeof member !== "number") return;
      var beforeCl = SeidrState.clusterOf(before, member);
      var afterCl = SeidrState.clusterOf(after, member);
      if (beforeCl) consider(beforeCl.hub);
      if (afterCl) consider(afterCl.hub);
    });
  }
  function seidrPublishHub(hubMember, target) {
    if (typeof hubMember !== "number") return;
    var hubs = Seidr.getHubs();
    var hub = hubs[hubMember];
    seidrSend({
      t: "state",
      v: 1,
      hub: hubMember,
      left: hub ? hub.left : null,
      right: hub ? hub.right : null,
      cuddle: hub ? hub.cuddle : null
    }, target);
  }
  function seidrPublishOurs(target) {
    if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
    var cluster = SeidrState.clusterOf(Seidr.getHubs(), Player.MemberNumber);
    if (!cluster) return;
    seidrPublishHub(cluster.hub, target);
  }
  function seidrHello(reply, target) {
    seidrSend({ t: "hello", v: 1, ver: Seidr.VERSION, reply: !!reply }, target);
  }
  Seidr.peerHas = function(member) {
    return !!(seidrPeers && seidrPeers[member]);
  };
  function seidrOnHello(from, payload) {
    if (typeof from !== "number") return;
    seidrPeers[from] = { at: Date.now(), ver: payload && (payload.ver || payload.v) };
    if (payload && payload.reply) {
      seidrHello(false, from);
      seidrPublishOurs(from);
    }
    if (Seidr.badgeActivityButtons) {
      try {
        Seidr.badgeActivityButtons();
      } catch (e) {
      }
    }
  }
  function seidrOnState(payload) {
    if (!payload || typeof payload.hub !== "number") return;
    Seidr.setHubs(SeidrState.replaceHub(Seidr.getHubs(), payload.hub, payload));
  }
  function seidrOnActivityMessage(data) {
    var name = Seidr.activityNameFromMessage(data);
    if (!name || name.indexOf(Seidr.PREFIX) !== 0) return;
    var source = Seidr.dictValue(data.Dictionary, "SourceCharacter");
    var target = Seidr.dictValue(data.Dictionary, "TargetCharacter");
    if (typeof source !== "number") source = typeof data.Sender === "number" ? data.Sender : null;
    if (typeof source !== "number" || typeof target !== "number") return;
    Seidr.setHubs(Seidr.applyNamed(Seidr.getHubs(), source, target, name));
  }
  function seidrPayload(data) {
    return Seidr.dictValue(data && data.Dictionary, "Seidr");
  }
  function seidrPruneRoom() {
    var before = JSON.stringify(Seidr.getHubs());
    var next = SeidrState.pruneMissing(Seidr.getHubs(), seidrPresentMap());
    Seidr.setHubs(next);
    if (JSON.stringify(next) === before) return;
    if (typeof Player === "undefined" || !Player) return;
    var cluster = SeidrState.clusterOf(next, Player.MemberNumber);
    if (cluster && cluster.hub === Player.MemberNumber) seidrPublishHub(cluster.hub);
    if (Seidr.badgeActivityButtons) {
      try {
        Seidr.badgeActivityButtons();
      } catch (e) {
      }
    }
  }
  function seidrPublishLeaveClear() {
    if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
    var me = Player.MemberNumber;
    var hubs = Seidr.getHubs();
    var cluster = SeidrState.clusterOf(hubs, me);
    if (!cluster) return;
    if (cluster.hub === me) {
      Seidr.setHubs(SeidrState.replaceHub(hubs, me, { left: null, right: null, cuddle: null }));
      seidrPublishHub(me);
      return;
    }
    var next = SeidrState.removeRelation(hubs, me, cluster.hub);
    Seidr.setHubs(next);
    seidrPublishHub(cluster.hub);
  }
  Seidr.installNet = function() {
    Seidr.publishHub = function(hubMember) {
      seidrPublishHub(hubMember);
    };
    Seidr.publishChanged = seidrPublishChanged;
    Seidr.hello = function(reply, target) {
      seidrHello(reply, target);
    };
    Seidr.hookFunction("ChatRoomMessage", 5, function(args, next) {
      var data = args && args[0];
      try {
        if (data && data.Type === "Hidden" && data.Content === Seidr.HIDDEN) {
          var payload = seidrPayload(data);
          var from = typeof data.Sender === "number" ? data.Sender : null;
          if (payload && payload.t === "hello") seidrOnHello(from, payload);
          else if (payload && payload.t === "state") seidrOnState(payload);
        } else if (data && data.Type === "Hidden") {
          seidrYieldOnEchoSync(data);
        } else if (data && data.Type === "Activity") {
          seidrOnActivityMessage(data);
        }
      } catch (e) {
        console.warn("[Seidr] message", e);
      }
      return next(args);
    });
    Seidr.hookFunction("ChatRoomSync", 10, function(args, next) {
      var result = next(args);
      try {
        var present = seidrPresentMap();
        Object.keys(seidrPeers).forEach(function(key) {
          if (!present[key]) delete seidrPeers[key];
        });
        seidrPruneRoom();
        seidrHello(true);
        seidrPublishOurs();
      } catch (e) {
      }
      return result;
    });
    Seidr.hookFunction("ChatRoomSyncMemberJoin", 10, function(args, next) {
      var result = next(args);
      try {
        var data = args && args[0];
        var joiner = data && typeof data.SourceMemberNumber === "number" ? data.SourceMemberNumber : null;
        if (joiner != null) {
          seidrHello(true, joiner);
          seidrPublishOurs(joiner);
        }
      } catch (e) {
      }
      return result;
    });
    Seidr.tryHook("ChatRoomSyncMemberLeave", "ChatRoomSyncMemberLeave", 10, function(args, next) {
      var result = next(args);
      try {
        var data = args && args[0];
        var left = data && typeof data.SourceMemberNumber === "number" ? data.SourceMemberNumber : null;
        if (left != null) delete seidrPeers[left];
        if (left != null && seidrNatural) delete seidrNatural[left];
        seidrPruneRoom();
      } catch (e) {
      }
      return result;
    });
    Seidr.tryHook("ChatRoomLeave", "ChatRoomLeave", 5, function(args, next) {
      try {
        seidrPublishLeaveClear();
      } catch (e) {
      }
      seidrPeers = {};
      Seidr.setHubs({});
      Object.keys(seidrNatural).forEach(function(key) {
        delete seidrNatural[Number(key)];
      });
      return next(args);
    });
  };

  // src/main.ts
  var session = window.__SeidrSession = window.__SeidrSession || { hubs: {} };
  Seidr.getHubs = function() {
    return session.hubs || {};
  };
  Seidr.setHubs = function(hubs) {
    session.hubs = hubs || {};
  };
  Seidr.prepareReload = function() {
    if (typeof Seidr.restoreFallbackHooks === "function") {
      try {
        Seidr.restoreFallbackHooks();
      } catch (e) {
      }
    }
    Seidr._booted = false;
    Seidr._hookState = {};
    ["seidr-styles", "seidr-loaded"].forEach(function(id) {
      const node = document.getElementById(id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    window.__SeidrPageLoaded = false;
  };
  function injectStyle() {
    if (document.getElementById("seidr-styles")) return;
    const style = document.createElement("style");
    style.id = "seidr-styles";
    style.textContent = [
      "#dialog-activity-grid button.seidr-slot-active {",
      "  box-shadow: inset 0 0 0 3px #e0b15a;",
      "}",
      ".seidr-loaded {",
      "  position: fixed;",
      "  z-index: 120;",
      "  right: 16px;",
      "  bottom: 18px;",
      "  max-width: min(90vw, 320px);",
      "  padding: 10px 14px;",
      "  border-radius: 8px;",
      "  border: 1px solid rgba(255, 255, 255, 0.1);",
      "  background: rgba(36, 28, 48, 0.92);",
      "  backdrop-filter: blur(12px);",
      "  -webkit-backdrop-filter: blur(12px);",
      "  color: #f0e6d4;",
      "  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);",
      "  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
      "  pointer-events: none;",
      "  opacity: 1;",
      "  transition: opacity 0.4s ease;",
      "}",
      ".seidr-loaded-hide { opacity: 0; }"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }
  function showLoadedToast() {
    if (typeof document === "undefined" || !document.body) return;
    const prev = document.getElementById("seidr-loaded");
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    const el = document.createElement("div");
    el.id = "seidr-loaded";
    el.className = "seidr-loaded";
    el.setAttribute("role", "status");
    el.textContent = (Seidr.FULL_NAME || "Seidr") + " Loaded: Version " + Seidr.VERSION;
    document.body.appendChild(el);
    setTimeout(function() {
      el.classList.add("seidr-loaded-hide");
      setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 500);
    }, 4e3);
  }
  function installHooks() {
    Seidr.registerBcModSdk();
    Seidr.installActivities();
    Seidr.installDraw();
    Seidr.installNet();
  }
  function boot() {
    if (Seidr._booted) return;
    if (typeof Player === "undefined" || !Player || Player.MemberNumber == null) return;
    if (typeof ActivityFemale3DCG === "undefined") return;
    Seidr._booted = true;
    injectStyle();
    installHooks();
    if (typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom() && typeof Seidr.hello === "function") {
      try {
        Seidr.hello(true);
      } catch (e) {
      }
    }
    try {
      showLoadedToast();
    } catch (eToast) {
    }
    console.log("[Seidr] " + Seidr.VERSION + " ready");
  }
  function wait() {
    if (typeof Player !== "undefined" && Player && Player.MemberNumber != null && typeof ActivityFemale3DCG !== "undefined") {
      boot();
      return;
    }
    setTimeout(wait, 250);
  }
  wait();
})();
})();
