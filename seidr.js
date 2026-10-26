/* Seidr v1.0.44 — page-context IIFE. Dev gist / Pages / FUSAM sibling. */
(function () {
	"use strict";
	if (window.__SeidrPageLoaded) return;
	window.__SeidrPageLoaded = true;
(() => {
  // src/seidr.ts
  var Seidr = {};
  window.Seidr = Seidr;

  // src/defaults.ts
  Seidr.VERSION = "1.0.44";
  Seidr.FULL_NAME = "Seidr";
  Seidr.PREFIX = "Seidr_";
  Seidr.HIDDEN = "Seidr";
  Seidr.GROUPS = ["ItemTorso"];
  Seidr.drawOffsets = {
    pull: { x: 75, y: 0 },
    cuddle: { x: 0, y: -50 }
  };
  Seidr.BOOKMARK_GIST_ID = "aaf3ff1d74aec0d971e2739b27a08b96";
  Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
  Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
  Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";
  Seidr.LOGO_URL = "https://freya-bc.github.io/Freyas-Seidr/assets/freyas-seidr-logo.png";
  Seidr.SHOW_ROOM_MANAGER = true;
  Seidr.SHOW_ACTIONS = true;
  Seidr.RM_STORAGE_KEY = "SeidrRoomManager";
  Seidr.RM_DATA_VERSION = 1;
  Seidr.RM_MAX_COMPRESSED = 18e4;
  Seidr.RM_MAP_BUDGET_RATIO = 0.75;
  Seidr.RM_MAP_MAX = 10;
  Seidr.RM_LZ_PREFIX = "SeidrRm1:";
  Seidr.ACT_LZ_PREFIX = "SeidrAct1:";

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
    var pack2 = SEIDR_UNDRESS_TEXTS[slot.texts] || SEIDR_UNDRESS_TEXTS.generic;
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
      chat: seidrUndressFillTemplate(pack2.other[0], slot.noun, "their"),
      chatSelf: seidrUndressFillTemplate(pack2.self[0], slot.noun, "their"),
      selfTexts: pack2.self.slice(),
      otherTexts: pack2.other.slice()
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
  function seidrUndressDynamicLabel(act2, character) {
    if (!act2 || !act2.undress) return act2 && act2.label ? act2.label : "Undress";
    if (act2.bundle) return act2.label || "Undress all " + (act2.family || "clothes");
    var worn = seidrWornClothName(character, act2.clothGroup);
    if (worn) return "Undress " + worn;
    return seidrUndressFallbackLabel(act2);
  }
  function seidrUndressBuildChat(act2, actor, acted, selfRun) {
    if (!act2 || !act2.undress) return "";
    var wearer = selfRun ? actor : acted;
    var clothing = act2.bundle ? act2.noun || "clothing" : seidrWornClothName(wearer, act2.clothGroup) || act2.noun || "clothing";
    var possessive = seidrPronounPossessive(actor);
    var lines = selfRun ? act2.selfTexts : act2.otherTexts;
    var template = seidrPickRandom(lines);
    if (!template) {
      template = selfRun ? "{SourceName} takes off {SourcePronounPossessive} {ClothingItem(Slot1)}" : "{SourceName} takes {TargetName}'s {ClothingItem(Slot1)} off";
    }
    return seidrUndressFillTemplate(template, clothing, possessive);
  }
  function seidrUndressWriteDialogCache(act2, selfRun, text) {
    if (!act2 || !text || typeof ActivityDictionaryLoad !== "function") return;
    try {
      const cache = ActivityDictionaryLoad();
      if (!cache || !cache.cache) return;
      const zone = act2.zone || "ItemTorso";
      const key = (selfRun ? "ChatSelf-" : "ChatOther-") + zone + "-" + act2.name;
      cache.cache[key] = text;
    } catch (e) {
    }
  }
  function seidrUndressPrepareChat(actor, acted, act2) {
    if (!act2 || !act2.undress) return;
    var selfRun = !!(actor && acted && actor.MemberNumber === acted.MemberNumber);
    var text = seidrUndressBuildChat(act2, actor, acted, selfRun);
    seidrPendingUndressChat = {
      name: act2.name,
      text
    };
    seidrUndressWriteDialogCache(act2, selfRun, text);
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
    seidrBuildUndressActivities().forEach(function(act2) {
      var label = seidrUndressDynamicLabel(act2, character);
      cache.cache["Activity" + act2.name] = label;
      var zone = act2.zone;
      cache.cache["Label-ChatOther-" + zone + "-" + act2.name] = label;
      cache.cache["Label-ChatSelf-" + zone + "-" + act2.name] = label;
      delete cache.cache["ChatOther-" + zone + "-" + act2.name];
      delete cache.cache["ChatSelf-" + zone + "-" + act2.name];
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
    SEIDR_ACTIVITIES.forEach(function(act2) {
      if (act2 && act2.name) seen[act2.name] = true;
    });
    Seidr.undressActivities().forEach(function(act2) {
      if (!act2 || !act2.name || seen[act2.name]) return;
      seen[act2.name] = true;
      SEIDR_ACTIVITIES.push(act2);
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
  function seidrActZones(act2) {
    if (act2 && act2.zone) return [act2.zone];
    return Seidr.GROUPS.slice();
  }
  function seidrWriteLabels(cache) {
    if (!cache || !cache.cache) return;
    SEIDR_ACTIVITIES.forEach(function(act2) {
      if (act2.undress) return;
      cache.cache["Activity" + act2.name] = act2.label;
      seidrActZones(act2).forEach(function(group) {
        cache.cache["Label-ChatOther-" + group + "-" + act2.name] = act2.label;
        cache.cache["Label-ChatSelf-" + group + "-" + act2.name] = act2.label;
        cache.cache["ChatOther-" + group + "-" + act2.name] = act2.chat;
        cache.cache["ChatSelf-" + group + "-" + act2.name] = act2.chatSelf || act2.chat;
      });
    });
    if (typeof Seidr.undressWriteLabels === "function") {
      var focused = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : null;
      Seidr.undressWriteLabels(cache, focused || (typeof Player !== "undefined" ? Player : null));
    }
  }
  function seidrBindActivity(act2) {
    var prereq = act2.needsHands ? ["UseHands", act2.prereq] : [act2.prereq];
    var zones = seidrActZones(act2);
    return {
      Name: act2.name,
      MaxProgress: 0,
      MaxProgressSelf: 0,
      Prerequisite: prereq,
      Target: zones.slice(),
      TargetSelf: act2.self ? zones.slice() : void 0
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
    SEIDR_ACTIVITIES.forEach(function(act2) {
      var existing = null;
      for (var i = 0; i < ActivityFemale3DCG.length; i++) {
        if (ActivityFemale3DCG[i] && ActivityFemale3DCG[i].Name === act2.name) {
          existing = ActivityFemale3DCG[i];
          break;
        }
      }
      var bound = seidrBindActivity(act2);
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
        ActivityFemale3DCGOrdering.push(act2.name);
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
    var act2 = seidrActivityByName(name);
    if (!act2 || typeof source !== "number" || typeof target !== "number") return hubs;
    if (act2.undress) return hubs;
    if (act2.slot) return SeidrState.applySlot(hubs, source, act2.slot, target);
    if (act2.removeSlot) return SeidrState.clearSlot(hubs, source, act2.removeSlot);
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
  function seidrStripClubSoundSuffix(name) {
    if (typeof name !== "string" || !name) return name;
    if (name.length >= 6 && name.slice(-6) === "-Spank") return name.slice(0, -6);
    if (name.length >= 5 && name.slice(-5) === "-Slap") return name.slice(0, -5);
    return name;
  }
  function seidrDialogForContent(content) {
    var match = /^(Chat(?:Other|Self))-[^-]+-(.+)$/.exec(content || "");
    if (!match) return "";
    if (typeof Seidr.actionDialogForContent === "function") {
      var custom = Seidr.actionDialogForContent(content);
      if (custom) return custom;
    }
    var act2 = seidrActivityByName(seidrStripClubSoundSuffix(match[2]));
    if (!act2) return "";
    if (act2.undress && typeof Seidr.undressConsumePending === "function") {
      var pending = Seidr.undressConsumePending(act2.name);
      if (pending) return pending;
    }
    if (match[1] === "ChatSelf") return act2.chatSelf || act2.chat;
    return act2.chat;
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
      var act2 = seidrActivityByName(name);
      if (!act2 || act2.undress) continue;
      var letter = "";
      var tip = "";
      var active = false;
      if (act2.slot) {
        var held = SeidrState.occupant(hubs, Player.MemberNumber, act2.slot);
        if (held != null) {
          letter = act2.slot === "cuddle" ? "C" : act2.slot === "left" ? "L" : "R";
          tip = act2.label + ": " + seidrCharName(held);
          active = focusedN === held;
        }
      } else if (act2.removeSlot) {
        var removeHeld = SeidrState.occupant(hubs, Player.MemberNumber, act2.removeSlot);
        if (removeHeld != null) {
          letter = act2.removeSlot === "cuddle" ? "C" : act2.removeSlot === "left" ? "L" : "R";
          tip = act2.label + ": " + seidrCharName(removeHeld);
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
      var act2 = seidrActivityByName(actName);
      if (act2 && act2.undress && actor && typeof actor.IsPlayer === "function" && actor.IsPlayer()) {
        try {
          if (typeof Seidr.undressPrepareChat === "function") {
            Seidr.undressPrepareChat(actor, acted, act2);
          }
        } catch (ePrep) {
          console.warn("[Seidr] undress prep", ePrep);
        }
        var stripTarget = acted;
        var stripGroups = act2.clothGroups && act2.clothGroups.length ? act2.clothGroups.slice() : act2.clothGroup;
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
        if (!actor || !acted || !act2) return result;
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
  function seidrLiveOffsets() {
    var o = Seidr.drawOffsets;
    var pull = { x: 75, y: 0 };
    var cuddle = { x: 0, y: -50 };
    if (o && typeof o === "object") {
      if (o.pull && typeof o.pull === "object") {
        if (typeof o.pull.x === "number" && isFinite(o.pull.x)) pull.x = Math.abs(o.pull.x);
        if (typeof o.pull.y === "number" && isFinite(o.pull.y)) pull.y = o.pull.y;
      }
      if (o.cuddle && typeof o.cuddle === "object") {
        if (typeof o.cuddle.x === "number" && isFinite(o.cuddle.x)) cuddle.x = o.cuddle.x;
        if (typeof o.cuddle.y === "number" && isFinite(o.cuddle.y)) cuddle.y = o.cuddle.y;
      }
    }
    return { pull, cuddle };
  }
  function seidrDrawPose(character, x, y, zoom) {
    var z = typeof zoom === "number" ? zoom : 1;
    if (!character || typeof character.MemberNumber !== "number") return null;
    if (seidrInEcho(character)) return null;
    var cluster = SeidrState.clusterOf(Seidr.getHubs(), character.MemberNumber);
    if (!cluster) return null;
    var center = seidrSharedCenter(cluster, z);
    if (!center) return null;
    var o = seidrLiveOffsets();
    var ox = o.pull.x * z;
    var oy = o.pull.y * z;
    var hubOnCenterX = cluster.cuddle != null || cluster.left != null && cluster.right != null;
    var sideOx = hubOnCenterX ? ox * 2 : ox;
    var n = character.MemberNumber;
    if (n === cluster.left) {
      return { X: center.X - sideOx, Y: center.Y + oy, Zoom: z };
    }
    if (n === cluster.right) {
      return { X: center.X + sideOx, Y: center.Y + oy, Zoom: z };
    }
    if (n === cluster.cuddle) return { X: center.X, Y: center.Y, Zoom: z };
    if (n === cluster.hub) {
      if (cluster.cuddle != null) {
        return { X: center.X + o.cuddle.x * z, Y: center.Y + o.cuddle.y * z, Zoom: z };
      }
      if (cluster.left != null && cluster.right == null) {
        return { X: center.X + ox, Y: center.Y, Zoom: z };
      }
      if (cluster.right != null && cluster.left == null) {
        return { X: center.X - ox, Y: center.Y, Zoom: z };
      }
      return { X: center.X, Y: center.Y, Zoom: z };
    }
    return null;
  }
  var seidrInRoomLoop = false;
  var seidrFrontCapture = null;
  function seidrApplyDrawPose(args) {
    var pose = seidrDrawPose(args[0], args[1], args[2], args[3]);
    if (!pose) return args;
    args[1] = pose.X;
    args[2] = pose.Y;
    args[3] = pose.Zoom;
    return args;
  }
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
      seidrApplyDrawPose(args);
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
        try {
          var list = ChatRoomCharacterDrawlist;
          var character = list && list[charIdx];
          if (character && typeof character.MemberNumber === "number") {
            seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom, Space: space };
          }
        } catch (e) {
        }
        return original(charIdx, charX, charY, space, zoom);
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

  // src/actions/model.ts
  var SEIDR_ACTION_ITEMS_MAX = 12;
  var SEIDR_CUSTOM_ICONS_MAX = 10;
  var SEIDR_ACTION_PREFIX = "Seidr_Act_";
  var SEIDR_ACTIONS_MAX = 50;
  var SEIDR_COND_MAX_GROUPS = 4;
  var SEIDR_COND_MAX_RULES = 8;
  var SEIDR_ACTION_CHAT_MAX = 500;
  function seidrDefaultActionIcon() {
    return { source: "seidr", id: "mark" };
  }
  function seidrNormalizeActionIcon(raw) {
    const def = seidrDefaultActionIcon();
    if (!raw || typeof raw !== "object") return def;
    const d = raw;
    const source = d.source;
    const id = typeof d.id === "string" ? d.id.trim() : "";
    if (!id) return def;
    if (source === "seidr" || source === "activity" || source === "custom") {
      return { source, id: id.slice(0, 128) };
    }
    return def;
  }
  function seidrNormalizeCustomActionIcons(raw) {
    const out = [];
    if (!Array.isArray(raw)) return out;
    const seen = {};
    for (let i = 0; i < raw.length && out.length < SEIDR_CUSTOM_ICONS_MAX; i++) {
      const row = raw[i];
      if (!row || typeof row !== "object") continue;
      const r = row;
      const id = typeof r.id === "string" ? r.id.trim().slice(0, 64) : "";
      const url = typeof r.url === "string" ? r.url.trim().slice(0, 2048) : "";
      if (!id || !url || seen[id]) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      seen[id] = true;
      const label = typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 48) : id;
      out.push({ id, url, label });
    }
    return out;
  }
  var SEIDR_ACTION_CHAT_TOKENS = [
    { token: "SourceCharacter", hint: "Actor name" },
    { token: "TargetCharacter", hint: "Target name (Other); often TargetCharacter's \u2026" },
    { token: "PronounPossessive", hint: "Actor her/his/their (Self lines)" },
    { token: "PronounSelf", hint: "Actor herself/himself/themself" },
    { token: "TargetPronounPossessive", hint: "Target her/his/their (rare)" },
    { token: "ActivityAsset", hint: "Used item name (item activities)" }
  ];
  function seidrDefaultChatOther(name) {
    return 'SourceCharacter performs "' + name + '" on TargetCharacter.';
  }
  function seidrDefaultChatSelf(name) {
    return 'SourceCharacter performs "' + name + '" on PronounSelf.';
  }
  var SEIDR_ACTION_AUDIENCES = [
    { id: "both", label: "Self and others" },
    { id: "selfOnly", label: "Self only" },
    { id: "othersOnly", label: "Others only" }
  ];
  var SEIDR_COND_TYPES = [
    { id: "wearing", label: "wearing", extra: "slot" },
    { id: "isGagged", label: "is gagged", extra: null },
    { id: "isBlind", label: "is blindfolded", extra: null },
    { id: "isDeaf", label: "is deaf", extra: null },
    { id: "canUseHands", label: "can use hands", extra: null },
    { id: "canMoveLegs", label: "can move legs", extra: null },
    { id: "canChangePose", label: "can change pose to", extra: "pose" },
    { id: "accessible", label: "is accessible", extra: "zone" },
    { id: "hasPenis", label: "has a penis", extra: null },
    { id: "hasVagina", label: "has a vagina", extra: null },
    { id: "hasBreasts", label: "has breasts", extra: null }
  ];
  var SEIDR_ACTION_SLOTS = [
    { id: "ItemArms", label: "Arms" },
    { id: "ItemHands", label: "Hands" },
    { id: "ItemMouth", label: "Mouth" },
    { id: "ItemMouth2", label: "Mouth 2" },
    { id: "ItemMouth3", label: "Mouth 3" },
    { id: "ItemHead", label: "Head" },
    { id: "ItemHood", label: "Hood" },
    { id: "ItemEars", label: "Ears" },
    { id: "ItemNeck", label: "Neck" },
    { id: "ItemNeckAccessories", label: "Neck Acc." },
    { id: "ItemTorso", label: "Torso" },
    { id: "ItemPelvis", label: "Pelvis" },
    { id: "ItemBreast", label: "Breast" },
    { id: "ItemNipples", label: "Nipples" },
    { id: "ItemVulva", label: "Vulva" },
    { id: "ItemVulvaPiercings", label: "Vulva Pierc." },
    { id: "ItemButt", label: "Butt" },
    { id: "ItemLegs", label: "Legs" },
    { id: "ItemFeet", label: "Feet" },
    { id: "ItemBoots", label: "Boots" },
    { id: "ItemDevices", label: "Devices" },
    { id: "Cloth", label: "Cloth" },
    { id: "ClothLower", label: "Cloth Lower" },
    { id: "ClothAccessory", label: "Cloth Acc." },
    { id: "Bra", label: "Bra" },
    { id: "Panties", label: "Panties" },
    { id: "Socks", label: "Socks" },
    { id: "Shoes", label: "Shoes" },
    { id: "Gloves", label: "Gloves" },
    { id: "Hat", label: "Hat" }
  ];
  function seidrRestraintSlots() {
    return SEIDR_ACTION_SLOTS.filter(function(s) {
      return s.id.indexOf("Item") === 0;
    });
  }
  var SEIDR_ACTION_POSES = [
    { id: "BaseLower", label: "Standing (legs)" },
    { id: "BaseUpper", label: "Hands relaxed" },
    { id: "LegsClosed", label: "Legs closed" },
    { id: "Kneel", label: "Kneel" },
    { id: "KneelingSpread", label: "Kneeling spread" },
    { id: "Yoked", label: "Yoked" },
    { id: "OverTheHead", label: "Over the head" },
    { id: "BackBoxTie", label: "Back box tie" },
    { id: "BackElbowTouch", label: "Back elbow touch" },
    { id: "AllFours", label: "All fours" }
  ];
  var SEIDR_ACTION_SOUNDS = [
    "SpankSkin",
    "SmackCrop",
    "Whip1",
    "Whip2",
    "ClothSlip",
    "Zipper1",
    "LockSmall",
    "Unlock",
    "ChainShort",
    "CuffsMetal",
    "BellSmall",
    "Squeak",
    "Inflation",
    "Deflation",
    "VibrationTeaseLow",
    "VibrationTeaseMedium",
    "VibrationEdgeLow",
    "VibrationEdgeMedium",
    "VibrationEdgeHigh",
    "VibrationMaximum"
  ];
  function act(id, label) {
    return { id, label };
  }
  var SEIDR_AROUSAL_COMMON = [
    act("Caress", "Caress"),
    act("Kiss", "Kiss"),
    act("FrenchKiss", "French kiss"),
    act("Lick", "Lick"),
    act("Suck", "Suck"),
    act("DeepThroat", "Deep throat"),
    act("Nibble", "Nibble"),
    act("Bite", "Bite"),
    act("Grope", "Grope"),
    act("Pinch", "Pinch"),
    act("Spank", "Spank"),
    act("Slap", "Slap"),
    act("Tickle", "Tickle"),
    act("Rub", "Rub"),
    act("Cuddle", "Cuddle"),
    act("MassageHands", "Massage (hands)"),
    act("MassageFeet", "Massage (feet)"),
    act("MasturbateHand", "Masturbate (hand)"),
    act("MasturbateFist", "Masturbate (fist)"),
    act("MasturbateTongue", "Masturbate (tongue)"),
    act("MasturbateFoot", "Masturbate (foot)"),
    act("MasturbateItem", "Masturbate (item)"),
    act("PenetrateSlow", "Penetrate (slow)"),
    act("PenetrateFast", "Penetrate (fast)"),
    act("Choke", "Choke"),
    act("Pet", "Pet")
  ];
  var SEIDR_AROUSAL_ACTIVITY_GROUPS = [
    {
      label: "Mouth",
      activities: [
        act("Whisper", "Whisper"),
        act("MoanGag", "Moan (gag)"),
        act("MoanGagTalk", "Moan talk (gag)"),
        act("MoanGagWhimper", "Whimper (gag)"),
        act("MoanGagGroan", "Groan (gag)"),
        act("MoanGagAngry", "Angry moan (gag)"),
        act("MoanGagGiggle", "Giggle (gag)"),
        act("GagKiss", "Gag kiss"),
        act("ChewItem", "Chew item"),
        act("SpitOutGag", "Spit out gag"),
        act("Nibble", "Nibble"),
        act("Lick", "Lick"),
        act("PoliteKiss", "Polite kiss"),
        act("Kiss", "Kiss"),
        act("GaggedKiss", "Gagged kiss"),
        act("FrenchKiss", "French kiss"),
        act("Suck", "Suck"),
        act("MasturbateTongue", "Masturbate (tongue)"),
        act("Bite", "Bite")
      ]
    },
    {
      label: "Hand",
      activities: [
        act("Caress", "Caress"),
        act("Clean", "Clean"),
        act("MassageHands", "Massage (hands)"),
        act("TakeCare", "Take care"),
        act("Tickle", "Tickle"),
        act("Pet", "Pet"),
        act("Grope", "Grope"),
        act("Pinch", "Pinch"),
        act("HandGag", "Hand gag"),
        act("Slap", "Slap"),
        act("Spank", "Spank"),
        act("Pull", "Pull"),
        act("Choke", "Choke"),
        act("MasturbateHand", "Masturbate (hand)"),
        act("MasturbateFist", "Masturbate (fist)")
      ]
    },
    {
      label: "Feet",
      activities: [
        act("MassageFeet", "Massage (feet)"),
        act("MasturbateFoot", "Masturbate (foot)"),
        act("Step", "Step"),
        act("Kick", "Kick")
      ]
    },
    {
      label: "Body",
      activities: [
        act("Cuddle", "Cuddle"),
        act("Rub", "Rub"),
        act("StruggleArms", "Struggle (arms)"),
        act("StruggleLegs", "Struggle (legs)"),
        act("Sit", "Sit"),
        act("RestHead", "Rest head")
      ]
    },
    {
      label: "Head",
      activities: [
        act("Nod", "Nod"),
        act("Wiggle", "Wiggle")
      ]
    },
    {
      label: "Item",
      activities: [
        act("ShakeItem", "Shake item"),
        act("PowderItem", "Powder item"),
        act("SpankItem", "Spank item"),
        act("TickleItem", "Tickle item"),
        act("RubItem", "Rub item"),
        act("SqueezeItem", "Squeeze item"),
        act("RollItem", "Roll item"),
        act("MasturbateItem", "Masturbate (item)"),
        act("PourItem", "Pour item"),
        act("ShockItem", "Shock item"),
        act("Inject", "Inject"),
        act("PenetrateSlow", "Penetrate (slow)"),
        act("PenetrateFast", "Penetrate (fast)"),
        act("SipItem", "Sip item"),
        act("EatItem", "Eat item"),
        act("Scratch", "Scratch"),
        act("ThrowItem", "Throw item"),
        act("CollarGrab", "Collar grab")
      ]
    },
    {
      label: "Family",
      activities: [
        act("SistersHug", "Sisters hug"),
        act("BrothersHandshake", "Brothers handshake"),
        act("SiblingsCheekKiss", "Siblings cheek kiss"),
        act("SiblingsHug", "Siblings hug"),
        act("BrushItem", "Brush item"),
        act("DeepThroat", "Deep throat"),
        act("SuckPenetrateItem", "Suck penetrate item")
      ]
    }
  ];
  var SEIDR_AROUSAL_ACTIVITY_IDS = (function() {
    const ids = [];
    const seen = {};
    function add(list) {
      list.forEach(function(a) {
        if (seen[a.id]) return;
        seen[a.id] = true;
        ids.push(a.id);
      });
    }
    add(SEIDR_AROUSAL_COMMON);
    SEIDR_AROUSAL_ACTIVITY_GROUPS.forEach(function(g) {
      add(g.activities);
    });
    return ids;
  })();
  function seidrArousalActivityLabel(id) {
    for (let i = 0; i < SEIDR_AROUSAL_COMMON.length; i++) {
      if (SEIDR_AROUSAL_COMMON[i].id === id) return SEIDR_AROUSAL_COMMON[i].label;
    }
    for (let g = 0; g < SEIDR_AROUSAL_ACTIVITY_GROUPS.length; g++) {
      const list = SEIDR_AROUSAL_ACTIVITY_GROUPS[g].activities;
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].label;
      }
    }
    return id || "Caress";
  }
  function seidrArousalPickerGroups() {
    const commonIds = {};
    SEIDR_AROUSAL_COMMON.forEach(function(a) {
      commonIds[a.id] = true;
    });
    const out = [
      { label: "Common", activities: SEIDR_AROUSAL_COMMON.slice() }
    ];
    SEIDR_AROUSAL_ACTIVITY_GROUPS.forEach(function(g) {
      const rest = g.activities.filter(function(a) {
        return !commonIds[a.id];
      });
      if (rest.length) out.push({ label: g.label, activities: rest });
    });
    return out;
  }
  var AUDIENCE_IDS = SEIDR_ACTION_AUDIENCES.map(function(a) {
    return a.id;
  });
  var COND_TYPE_IDS = SEIDR_COND_TYPES.map(function(t) {
    return t.id;
  });
  function seidrActionActivityName(id) {
    return SEIDR_ACTION_PREFIX + String(id);
  }
  function seidrStripClubSoundSuffix2(name) {
    if (typeof name !== "string" || !name) return name;
    if (name.length >= 6 && name.slice(-6) === "-Spank") return name.slice(0, -6);
    if (name.length >= 5 && name.slice(-5) === "-Slap") return name.slice(0, -5);
    return name;
  }
  function seidrParseActionActivityName(name) {
    const bare = seidrStripClubSoundSuffix2(typeof name === "string" ? name : "");
    if (!bare || bare.indexOf(SEIDR_ACTION_PREFIX) !== 0) return null;
    const n = parseInt(bare.slice(SEIDR_ACTION_PREFIX.length), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function seidrDefaultActionsBag() {
    return { nextId: 1, list: [] };
  }
  function normalizeRule(raw) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw;
    const type = typeof r.type === "string" && COND_TYPE_IDS.indexOf(r.type) >= 0 ? r.type : null;
    if (!type) return null;
    const who = r.who === "source" ? "source" : "target";
    const out = { who, type, not: !!r.not };
    if (type === "wearing" && typeof r.slot === "string" && r.slot) out.slot = r.slot;
    if (type === "canChangePose" && typeof r.pose === "string" && r.pose) out.pose = r.pose;
    if (type === "accessible" && (r.zone === "penis" || r.zone === "vagina" || r.zone === "nipples")) {
      out.zone = r.zone;
    }
    return out;
  }
  function normalizeGroups(raw) {
    if (!raw || typeof raw !== "object") return [];
    const g = raw.groups;
    if (!Array.isArray(g)) return [];
    const groups = [];
    let ruleCount = 0;
    for (let i = 0; i < g.length && groups.length < SEIDR_COND_MAX_GROUPS; i++) {
      const entry = g[i];
      const rulesRaw = entry && typeof entry === "object" ? entry.rules : null;
      if (!Array.isArray(rulesRaw)) continue;
      const rules = [];
      for (let j = 0; j < rulesRaw.length && ruleCount < SEIDR_COND_MAX_RULES; j++) {
        const rule = normalizeRule(rulesRaw[j]);
        if (!rule) continue;
        rules.push(rule);
        ruleCount++;
      }
      if (rules.length) groups.push({ rules });
    }
    return groups;
  }
  function normalizeItems(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = {};
    for (let i = 0; i < raw.length && out.length < SEIDR_ACTION_ITEMS_MAX; i++) {
      const entry = raw[i];
      if (!entry || typeof entry !== "object") continue;
      const slot = typeof entry.slot === "string" ? entry.slot.trim() : "";
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      if (!slot || !name) continue;
      const key = slot + "\0" + name;
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ slot, name });
    }
    return out;
  }
  function normalizeEffects(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    const e = raw;
    if (e.arousal && typeof e.arousal === "object") {
      const rawAct = typeof e.arousal.activity === "string" ? e.arousal.activity : "";
      out.arousal = {
        enabled: !!e.arousal.enabled,
        activity: rawAct && SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(rawAct) >= 0 ? rawAct : "Caress"
      };
    }
    if (e.sound && typeof e.sound === "object") {
      out.sound = {
        enabled: !!e.sound.enabled,
        sound: typeof e.sound.sound === "string" && e.sound.sound ? e.sound.sound : SEIDR_ACTION_SOUNDS[0]
      };
    }
    if (e.pose && typeof e.pose === "object") {
      out.pose = {
        enabled: !!e.pose.enabled,
        pose: typeof e.pose.pose === "string" && e.pose.pose ? e.pose.pose : "Kneel"
      };
    }
    return out;
  }
  function seidrNormalizeAction(raw, fallbackId) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : fallbackId || 0;
    if (!id) return null;
    const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 48) : "Action " + id;
    const slots = [];
    if (Array.isArray(d.slots)) {
      d.slots.forEach(function(s) {
        if (typeof s === "string" && s && slots.indexOf(s) < 0) slots.push(s);
      });
    }
    if (!slots.length) slots.push("ItemTorso");
    const audience = typeof d.audience === "string" && AUDIENCE_IDS.indexOf(d.audience) >= 0 ? d.audience : "both";
    const chatOther2 = typeof d.chatOther === "string" && d.chatOther.trim() ? d.chatOther.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : seidrDefaultChatOther(name);
    const chatSelf2 = typeof d.chatSelf === "string" && d.chatSelf.trim() ? d.chatSelf.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : seidrDefaultChatSelf(name);
    return {
      id,
      name,
      slots: slots.slice(0, 8),
      audience,
      chatOther: chatOther2,
      chatSelf: chatSelf2,
      icon: seidrNormalizeActionIcon(d.icon),
      items: normalizeItems(d.items),
      conditions: { groups: normalizeGroups(d.conditions) },
      effects: normalizeEffects(d.effects)
    };
  }
  function seidrNormalizeActionsBag(raw) {
    const base = seidrDefaultActionsBag();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    const list = [];
    const seen = {};
    if (Array.isArray(d.list)) {
      for (let i = 0; i < d.list.length && list.length < SEIDR_ACTIONS_MAX; i++) {
        const act2 = seidrNormalizeAction(d.list[i]);
        if (!act2 || seen[act2.id]) continue;
        seen[act2.id] = true;
        list.push(act2);
      }
    }
    let nextId = typeof d.nextId === "number" && d.nextId > 0 ? Math.floor(d.nextId) : 1;
    list.forEach(function(a) {
      if (a.id >= nextId) nextId = a.id + 1;
    });
    base.nextId = nextId;
    base.list = list;
    return base;
  }
  function seidrDefaultAction(id) {
    const name = "Action " + id;
    return {
      id,
      name,
      slots: ["ItemTorso"],
      audience: "both",
      chatOther: seidrDefaultChatOther(name),
      chatSelf: seidrDefaultChatSelf(name),
      icon: seidrDefaultActionIcon(),
      items: [],
      conditions: { groups: [] },
      effects: {
        arousal: { enabled: false, activity: "Caress" },
        sound: { enabled: false, sound: "SpankSkin" },
        pose: { enabled: false, pose: "Kneel" }
      }
    };
  }

  // src/settings/model.ts
  var FAST_OPEN_MODIFIERS = [
    { id: "Shift", label: "Shift" },
    { id: "Ctrl", label: "Ctrl" },
    { id: "Alt", label: "Alt" },
    { id: "Meta", label: "Cmd (Meta)" }
  ];
  var FAST_OPEN_MOD_IDS = FAST_OPEN_MODIFIERS.map(function(m) {
    return m.id;
  });
  var AROUSAL_BAR_MODES = [
    { id: "off", label: "Club default" },
    { id: "alwaysHide", label: "Always hide" },
    { id: "untilChange", label: "Show on change" },
    { id: "bottomBar", label: "Bottom bar" }
  ];
  var AROUSAL_BAR_SCOPES = [
    { id: "self", label: "Self only" },
    { id: "seidrCluster", label: "Seidr holds" },
    { id: "all", label: "Everyone" }
  ];
  var AROUSAL_MODE_IDS = AROUSAL_BAR_MODES.map(function(m) {
    return m.id;
  });
  var AROUSAL_SCOPE_IDS = AROUSAL_BAR_SCOPES.map(function(s) {
    return s.id;
  });
  var RM_LAUNCHER_POSITIONS = [
    { id: "topLeft", label: "Top Left" },
    { id: "topRight", label: "Top Right" },
    { id: "bottomLeft", label: "Bottom Left" },
    { id: "bottomRight", label: "Bottom Right" },
    { id: "middleLeft", label: "Middle Left" },
    { id: "middleRight", label: "Middle Right" },
    { id: "chatLeft", label: "Chat Left" },
    { id: "chatTop", label: "Chat Top" },
    { id: "chatBottom", label: "Chat Bottom" }
  ];
  var POSITION_IDS = RM_LAUNCHER_POSITIONS.map(function(p) {
    return p.id;
  });
  var SEIDR_DRAW_OFFSET_MIN = -400;
  var SEIDR_DRAW_OFFSET_MAX = 400;
  function seidrDefaultDrawOffsets() {
    return {
      pull: { x: 75, y: 0 },
      cuddle: { x: 0, y: -50 }
    };
  }
  function seidrClampDrawCoord(raw, fallback) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;
    if (!Number.isFinite(n)) return fallback;
    const rounded = Math.round(n);
    if (rounded < SEIDR_DRAW_OFFSET_MIN) return SEIDR_DRAW_OFFSET_MIN;
    if (rounded > SEIDR_DRAW_OFFSET_MAX) return SEIDR_DRAW_OFFSET_MAX;
    return rounded;
  }
  function seidrClampPullX(raw, fallback) {
    const n = seidrClampDrawCoord(raw, fallback);
    return Math.abs(n);
  }
  function seidrNormalizeDrawOffsetPair(raw, fallback) {
    const src = raw && typeof raw === "object" ? raw : null;
    return {
      x: seidrClampDrawCoord(src && src.x, fallback.x),
      y: seidrClampDrawCoord(src && src.y, fallback.y)
    };
  }
  function migrateLegacyPull(raw) {
    const left = raw.pullLeft && typeof raw.pullLeft === "object" ? raw.pullLeft : null;
    const right = raw.pullRight && typeof raw.pullRight === "object" ? raw.pullRight : null;
    if (!left && !right) return null;
    const lx = left && typeof left.x === "number" && Number.isFinite(left.x) ? Math.abs(left.x) : 0;
    const rx = right && typeof right.x === "number" && Number.isFinite(right.x) ? Math.abs(right.x) : 0;
    const x = lx || rx || 75;
    let y = 0;
    if (left && typeof left.y === "number" && Number.isFinite(left.y)) y = left.y;
    else if (right && typeof right.y === "number" && Number.isFinite(right.y)) y = right.y;
    return { x: seidrClampPullX(x, 75), y: seidrClampDrawCoord(y, 0) };
  }
  function seidrNormalizeDrawOffsets(raw, fallback) {
    const base = fallback ? seidrCloneDrawOffsets(fallback) : seidrDefaultDrawOffsets();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    let pull = base.pull;
    if (d.pull && typeof d.pull === "object") {
      const p = d.pull;
      pull = {
        x: seidrClampPullX(p.x, base.pull.x),
        y: seidrClampDrawCoord(p.y, base.pull.y)
      };
    } else {
      const migrated = migrateLegacyPull(d);
      if (migrated) pull = migrated;
    }
    const cuddle = seidrNormalizeDrawOffsetPair(d.cuddle, base.cuddle);
    return { pull, cuddle };
  }
  function seidrCloneDrawOffsets(o) {
    return {
      pull: { x: o.pull.x, y: o.pull.y },
      cuddle: { x: o.cuddle.x, y: o.cuddle.y }
    };
  }
  function normalizeFastOpenSlot(raw) {
    const slots = seidrRestraintSlots();
    const ids = slots.map(function(s) {
      return s.id;
    });
    if (typeof raw === "string" && ids.indexOf(raw) >= 0) return raw;
    return "ItemTorso";
  }
  function seidrDefaultSettings() {
    return {
      roomManagerEnabled: true,
      showQuickmenuButton: true,
      launcherPosition: "chatTop",
      drawOffsets: seidrDefaultDrawOffsets(),
      arousalBarMode: "off",
      arousalBarScope: "seidrCluster",
      fastOpenActionsEnabled: true,
      fastOpenActionsModifier: "Shift",
      fastOpenActionsSlot: "ItemTorso",
      customActionIcons: [],
      actions: { nextId: 1, list: [] }
    };
  }
  function seidrNormalizeSettings(raw) {
    const base = seidrDefaultSettings();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    if (typeof d.roomManagerEnabled === "boolean") base.roomManagerEnabled = d.roomManagerEnabled;
    if (typeof d.showQuickmenuButton === "boolean") base.showQuickmenuButton = d.showQuickmenuButton;
    if (typeof d.launcherPosition === "string" && POSITION_IDS.indexOf(d.launcherPosition) >= 0) {
      base.launcherPosition = d.launcherPosition;
    }
    base.drawOffsets = seidrNormalizeDrawOffsets(d.drawOffsets);
    if (typeof d.arousalBarMode === "string" && AROUSAL_MODE_IDS.indexOf(d.arousalBarMode) >= 0) {
      base.arousalBarMode = d.arousalBarMode;
    }
    if (typeof d.arousalBarScope === "string" && AROUSAL_SCOPE_IDS.indexOf(d.arousalBarScope) >= 0) {
      base.arousalBarScope = d.arousalBarScope;
    }
    if (typeof d.fastOpenActionsEnabled === "boolean") {
      base.fastOpenActionsEnabled = d.fastOpenActionsEnabled;
    }
    if (typeof d.fastOpenActionsModifier === "string" && FAST_OPEN_MOD_IDS.indexOf(d.fastOpenActionsModifier) >= 0) {
      base.fastOpenActionsModifier = d.fastOpenActionsModifier;
    }
    base.fastOpenActionsSlot = normalizeFastOpenSlot(d.fastOpenActionsSlot);
    base.customActionIcons = seidrNormalizeCustomActionIcons(d.customActionIcons);
    base.actions = seidrNormalizeActionsBag(d.actions);
    return base;
  }

  // src/roomManager/model.ts
  function rmEmptyStore() {
    return {
      version: Seidr.RM_DATA_VERSION || 1,
      room: {},
      access: {},
      backgrounds: [],
      maps: [],
      ui: {},
      settings: seidrDefaultSettings()
    };
  }
  function rmNormalizeStore(data) {
    const base = rmEmptyStore();
    if (!data || typeof data !== "object") return base;
    const d = data;
    base.version = typeof d.version === "number" ? d.version : base.version;
    base.room = d.room && typeof d.room === "object" ? d.room : {};
    base.access = d.access && typeof d.access === "object" ? d.access : {};
    if (Array.isArray(d.backgrounds)) base.backgrounds = d.backgrounds;
    else if (d.background && typeof d.background === "object") {
      base.backgrounds = [];
    }
    base.maps = Array.isArray(d.maps) ? d.maps : [];
    base.ui = d.ui && typeof d.ui === "object" ? d.ui : {};
    base.settings = seidrNormalizeSettings(d.settings);
    return base;
  }
  function rmNewId(prefix) {
    return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  function rmIsShown() {
    return !!Seidr.SHOW_ROOM_MANAGER;
  }

  // src/roomManager/storage.ts
  var _store = null;
  var _lastBytes = 0;
  function lz() {
    try {
      if (typeof LZString !== "undefined" && LZString) return LZString;
    } catch (e) {
    }
    return null;
  }
  function pack(obj) {
    const json = JSON.stringify(obj);
    const L = lz();
    const prefix = Seidr.RM_LZ_PREFIX || "SeidrRm1:";
    if (L && typeof L.compressToUTF16 === "function" && json.length > 400) {
      return prefix + L.compressToUTF16(json);
    }
    return json;
  }
  function unpack(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;
    const prefix = Seidr.RM_LZ_PREFIX || "SeidrRm1:";
    try {
      if (raw.startsWith(prefix)) {
        const L = lz();
        if (!L || typeof L.decompressFromUTF16 !== "function") return null;
        const plain = L.decompressFromUTF16(raw.slice(prefix.length));
        return plain ? JSON.parse(plain) : null;
      }
      if (typeof LZString !== "undefined" && LZString.decompressFromBase64) {
        const plain = LZString.decompressFromBase64(raw);
        if (plain) return JSON.parse(plain);
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[Seidr RM] unpack failed", e);
      return null;
    }
  }
  function rmGetStore() {
    if (_store) return _store;
    let data = null;
    const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
    try {
      if (Player && Player.ExtensionSettings && Player.ExtensionSettings[key] != null) {
        const raw = Player.ExtensionSettings[key];
        if (typeof raw === "string") _lastBytes = raw.length;
        data = unpack(raw);
      }
    } catch (e) {
      console.warn("[Seidr RM] ES read failed", e);
    }
    _store = rmNormalizeStore(data);
    return _store;
  }
  function rmSaveStore() {
    const store = rmGetStore();
    const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
    const packed = pack(store);
    const max = Seidr.RM_MAX_COMPRESSED || 18e4;
    _lastBytes = packed.length;
    if (packed.length > max) {
      return { ok: false, error: "Storage full (" + rmFormatBytes(packed.length) + " / " + rmFormatBytes(max) + ")", bytes: packed.length };
    }
    try {
      if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
      Player.ExtensionSettings[key] = packed;
      if (typeof ServerPlayerExtensionSettingsSync === "function") {
        ServerPlayerExtensionSettingsSync(key);
      }
    } catch (e) {
      console.warn("[Seidr RM] ES write failed", e);
      return { ok: false, error: "Save failed", bytes: packed.length };
    }
    return { ok: true, bytes: packed.length };
  }
  function rmInvalidateStore() {
    _store = null;
  }
  function rmCompressedBytes() {
    if (_lastBytes) return _lastBytes;
    try {
      const key = Seidr.RM_STORAGE_KEY || "SeidrRoomManager";
      const raw = Player && Player.ExtensionSettings && Player.ExtensionSettings[key];
      if (typeof raw === "string") {
        _lastBytes = raw.length;
        return _lastBytes;
      }
    } catch (e) {
    }
    return 0;
  }
  function rmMapsBytesEstimate(store) {
    const s = store || rmGetStore();
    try {
      return pack({ maps: s.maps || [] }).length;
    } catch (e) {
      return 0;
    }
  }
  function rmMapBudgetBytes() {
    const max = Seidr.RM_MAX_COMPRESSED || 18e4;
    const ratio = typeof Seidr.RM_MAP_BUDGET_RATIO === "number" ? Seidr.RM_MAP_BUDGET_RATIO : 0.75;
    return Math.floor(max * ratio);
  }
  function rmCanSaveMaps(nextMaps) {
    const probe = pack({ maps: nextMaps });
    const budget = rmMapBudgetBytes();
    if (probe.length > budget) {
      return { ok: false, error: "Maps would exceed 75% storage budget (" + rmFormatBytes(probe.length) + " / " + rmFormatBytes(budget) + ")" };
    }
    const store = rmGetStore();
    const full = pack(Object.assign({}, store, { maps: nextMaps }));
    const max = Seidr.RM_MAX_COMPRESSED || 18e4;
    if (full.length > max) {
      return { ok: false, error: "Total storage full" };
    }
    return { ok: true };
  }
  function rmFormatBytes(bytes) {
    const n = Math.max(0, Number(bytes) || 0);
    if (n < 1024) return n.toFixed(0) + " B";
    return (n / 1024).toFixed(2) + " KB";
  }
  function rmSliceBytes(slice) {
    try {
      return pack(slice).length;
    } catch (e) {
      return 0;
    }
  }
  function rmUsageBreakdown(store) {
    const s = store || rmGetStore();
    const settings = s.settings || {};
    const actions = settings.actions;
    const settingsRest = {};
    try {
      Object.keys(settings).forEach(function(k) {
        if (k === "actions") return;
        settingsRest[k] = settings[k];
      });
    } catch (e) {
    }
    return {
      total: rmCompressedBytes() || rmSliceBytes(s),
      max: Seidr.RM_MAX_COMPRESSED || 18e4,
      maps: rmSliceBytes({ maps: s.maps || [] }),
      room: rmSliceBytes({ room: s.room || {} }),
      access: rmSliceBytes({ access: s.access || {} }),
      backgrounds: rmSliceBytes({ backgrounds: s.backgrounds || [] }),
      actions: rmSliceBytes({ actions: actions != null ? actions : { nextId: 1, list: [] } }),
      settings: rmSliceBytes({ settings: settingsRest }),
      ui: rmSliceBytes({ ui: s.ui || {} }),
      mapBudget: rmMapBudgetBytes()
    };
  }
  function rmUsageLabel() {
    const used = rmCompressedBytes();
    const max = Seidr.RM_MAX_COMPRESSED || 18e4;
    const maps = rmMapsBytesEstimate();
    const mapCap = rmMapBudgetBytes();
    return "Storage: " + rmFormatBytes(used) + " / " + rmFormatBytes(max) + "  (maps " + rmFormatBytes(maps) + " \xB7 75% cap " + rmFormatBytes(mapCap) + ")";
  }

  // src/settings/storage.ts
  function seidrGetSettings() {
    const store = rmGetStore();
    store.settings = seidrNormalizeSettings(store.settings);
    return store.settings;
  }
  function seidrSaveSettings(patch) {
    const store = rmGetStore();
    store.settings = seidrNormalizeSettings(Object.assign({}, seidrDefaultSettings(), store.settings, patch));
    return rmSaveStore();
  }

  // src/arousalBars.ts
  var SHOW_MS = 1e3;
  var BAR_Y = 992;
  var BAR_H = 8;
  var EDGE = 12;
  var GAP = 10;
  var lastProg = {};
  var bottomQueue = [];
  function settingsMode() {
    try {
      return seidrGetSettings().arousalBarMode || "off";
    } catch (e) {
      return "off";
    }
  }
  function settingsScope() {
    try {
      return seidrGetSettings().arousalBarScope || "seidrCluster";
    } catch (e) {
      return "seidrCluster";
    }
  }
  function bctSplitEnabled(C) {
    try {
      const bct = C && C.BCT;
      if (!bct) return false;
      const s = bct.bctSettings && bct.bctSettings.splitOrgasmArousal;
      if (s === true || s === "true") return true;
      if (bct.splitOrgasmArousal && typeof bct.splitOrgasmArousal.arousalProgress === "number") return true;
    } catch (e) {
    }
    return false;
  }
  function clamp01_100(n) {
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }
  function readProgress(C) {
    const club = C && C.ArousalSettings && typeof C.ArousalSettings.Progress === "number" ? C.ArousalSettings.Progress : 0;
    if (bctSplitEnabled(C)) {
      let a = club;
      try {
        const sp = C.BCT && C.BCT.splitOrgasmArousal;
        if (sp && typeof sp.arousalProgress === "number") a = sp.arousalProgress;
      } catch (e) {
      }
      return { arousal: clamp01_100(a), orgasm: clamp01_100(club), split: true };
    }
    return { arousal: clamp01_100(club), orgasm: null, split: false };
  }
  function inSeidrCluster(C) {
    if (!C || typeof C.MemberNumber !== "number") return false;
    try {
      const hubs = typeof Seidr.getHubs === "function" ? Seidr.getHubs() : null;
      return !!SeidrState.clusterOf(hubs, C.MemberNumber);
    } catch (e) {
      return false;
    }
  }
  function seidrMeterApplies(C) {
    const mode = settingsMode();
    if (mode === "off") return false;
    if (!C) return false;
    const scope = settingsScope();
    if (scope === "self") {
      try {
        return typeof C.IsPlayer === "function" ? !!C.IsPlayer() : false;
      } catch (e) {
        return false;
      }
    }
    if (scope === "seidrCluster") return inSeidrCluster(C);
    return true;
  }
  function untilChangeVisible(C, prog) {
    const id = C.MemberNumber;
    const now = typeof CommonTime === "function" ? CommonTime() : Date.now();
    const oVal = prog.orgasm != null ? prog.orgasm : -1;
    let st = lastProg[id];
    if (!st) {
      lastProg[id] = { a: prog.arousal, o: oVal, showUntil: 0 };
      return false;
    }
    if (st.a !== prog.arousal || st.o !== oVal) {
      st.a = prog.arousal;
      st.o = oVal;
      st.showUntil = now + SHOW_MS;
    }
    return now < st.showUntil;
  }
  function shouldSkipOnCharacter(C) {
    if (!seidrMeterApplies(C)) return false;
    const mode = settingsMode();
    if (mode === "alwaysHide" || mode === "bottomBar") return true;
    if (mode === "untilChange") {
      return !untilChangeVisible(C, readProgress(C));
    }
    return false;
  }
  function queueBottom(C) {
    if (!seidrMeterApplies(C)) return;
    if (settingsMode() !== "bottomBar") return;
    const id = C.MemberNumber;
    for (let i = 0; i < bottomQueue.length; i++) {
      if (bottomQueue[i].C && bottomQueue[i].C.MemberNumber === id) return;
    }
    bottomQueue.push({ C, prog: readProgress(C) });
  }
  function collectBottomFromDrawlist() {
    const list = [];
    const seen = {};
    for (let i = 0; i < bottomQueue.length; i++) {
      const row = bottomQueue[i];
      const id = row.C && row.C.MemberNumber;
      if (typeof id === "number") seen[id] = true;
      list.push(row);
    }
    try {
      const chars = typeof ChatRoomCharacterDrawlist !== "undefined" && ChatRoomCharacterDrawlist ? ChatRoomCharacterDrawlist : typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : null;
      if (!chars || !chars.length) return list;
      for (let i = 0; i < chars.length; i++) {
        const C = chars[i];
        if (!C || typeof C.MemberNumber !== "number") continue;
        if (seen[C.MemberNumber]) continue;
        if (!seidrMeterApplies(C)) continue;
        seen[C.MemberNumber] = true;
        list.push({ C, prog: readProgress(C) });
      }
    } catch (e) {
    }
    return list;
  }
  function flushBottomBars() {
    if (settingsMode() !== "bottomBar") {
      bottomQueue = [];
      return;
    }
    const list = collectBottomFromDrawlist();
    bottomQueue = [];
    drawBottomBars(list);
  }
  function drawBottomBars(list) {
    if (!list.length) return;
    if (typeof MainCanvas === "undefined" || !MainCanvas) return;
    const ctx = MainCanvas;
    for (let i = 0; i < list.length; i++) {
      let paintSlot2 = function(x, fillRatio, fillColor) {
        ctx.fillStyle = "rgba(20,16,28,0.85)";
        ctx.fillRect(x, trackY, slotW, h);
        ctx.strokeStyle = "rgba(212,160,23,0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, trackY + 0.5, slotW - 1, h - 1);
        const fill = slotW * Math.max(0, Math.min(1, fillRatio));
        if (fill > 0) {
          ctx.fillStyle = fillColor;
          ctx.fillRect(x, trackY, fill, h);
        }
      };
      var paintSlot = paintSlot2;
      const row = list[i];
      const C = row.C;
      if (!C || typeof C.MemberNumber !== "number") continue;
      const nat = seidrNatural[C.MemberNumber];
      if (!nat) continue;
      const zoom = typeof nat.Zoom === "number" && nat.Zoom > 0 ? nat.Zoom : 1;
      const charW = 500 * zoom;
      const spaceW = typeof nat.Space === "number" && nat.Space > 0 ? nat.Space : charW;
      const boxW = Math.min(spaceW, charW);
      const boxX = nat.X + (spaceW > charW ? (spaceW - charW) / 2 : 0);
      const boxY = nat.Y;
      const edge = EDGE * zoom;
      const gap = GAP * zoom;
      const inner = Math.max(4, boxW - edge * 2);
      const slotW = Math.max(2, (inner - gap) / 2);
      const leftX = boxX + edge;
      const rightX = leftX + slotW + gap;
      const trackY = boxY + BAR_Y * zoom;
      const h = Math.max(2, BAR_H * zoom);
      const showRight = !!(row.prog.split && row.prog.orgasm != null);
      ctx.save();
      paintSlot2(leftX, row.prog.arousal / 100, showRight ? "#e891b8" : "#c44");
      if (showRight) paintSlot2(rightX, (row.prog.orgasm || 0) / 100, "#c44");
      ctx.restore();
    }
  }
  var suppressMember = null;
  function seidrInstallArousalBars() {
    Seidr.hookFunction("DrawArousalMeter", 10, function(args, next) {
      const C = args[0];
      if (shouldSkipOnCharacter(C)) {
        if (C && typeof C.MemberNumber === "number") suppressMember = C.MemberNumber;
        if (settingsMode() === "bottomBar") queueBottom(C);
        return;
      }
      if (seidrMeterApplies(C) && settingsMode() === "untilChange") {
        untilChangeVisible(C, readProgress(C));
      }
      suppressMember = null;
      return next(args);
    });
    Seidr.tryHook("DrawArousalThermometer", "DrawArousalThermometer", 10, function(args, next) {
      if (suppressMember != null) return;
      return next(args);
    });
    Seidr.tryHook("DrawArousalGlow", "DrawArousalGlow", 10, function(args, next) {
      if (suppressMember != null) return;
      return next(args);
    });
    Seidr.hookFunction("ChatRoomRun", 0, function(args, next) {
      const result = next(args);
      try {
        if (settingsMode() !== "bottomBar") {
          bottomQueue = [];
        } else {
          const inRoom = typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom";
          const charView = typeof ChatRoomCharacterViewIsActive !== "function" || ChatRoomCharacterViewIsActive();
          if (inRoom && charView) flushBottomBars();
          else bottomQueue = [];
        }
      } catch (e) {
      }
      return result;
    });
  }
  Seidr.installArousalBars = seidrInstallArousalBars;

  // src/actions/conditions.ts
  function seidrActionItemsOk(action, acted) {
    const items = action && action.items;
    if (!items || !items.length) return true;
    if (!acted || typeof InventoryGet !== "function") return false;
    for (let i = 0; i < items.length; i++) {
      const ref = items[i];
      if (!ref || !ref.slot || !ref.name) continue;
      try {
        const worn = InventoryGet(acted, ref.slot);
        if (worn && worn.Asset && worn.Asset.Name === ref.name) return true;
      } catch (e) {
      }
    }
    return false;
  }
  function charOf(who, source, target) {
    return who === "source" ? source : target;
  }
  function evalRule(rule, source, target) {
    const C = charOf(rule.who, source, target);
    if (!C) return false;
    let ok = false;
    try {
      switch (rule.type) {
        case "wearing":
          ok = !!(rule.slot && typeof InventoryGet === "function" && InventoryGet(C, rule.slot));
          break;
        case "isGagged":
          ok = typeof C.CanTalk === "function" ? !C.CanTalk() : false;
          break;
        case "isBlind":
          ok = typeof C.IsBlind === "function" ? !!C.IsBlind() : false;
          break;
        case "isDeaf":
          ok = typeof C.IsDeaf === "function" ? !!C.IsDeaf() : false;
          break;
        case "canUseHands":
          ok = typeof C.CanInteract === "function" ? !!C.CanInteract() : true;
          break;
        case "canMoveLegs":
          ok = typeof C.CanWalk === "function" ? !!C.CanWalk() : true;
          break;
        case "canChangePose": {
          const pose = rule.pose || "Kneel";
          if (typeof PoseCanChangeUnaided === "function") ok = !!PoseCanChangeUnaided(C, pose);
          else if (typeof C.CanChangeToPose === "function") ok = !!C.CanChangeToPose(pose);
          else ok = true;
          break;
        }
        case "accessible": {
          const zone = rule.zone || "vagina";
          if (zone === "penis" && typeof C.AccessPenis === "function") ok = !!C.AccessPenis();
          else if (zone === "vagina" && typeof C.AccessVulva === "function") ok = !!C.AccessVulva();
          else if (zone === "nipples" && typeof C.AccessBreastFull === "function") ok = !!C.AccessBreastFull();
          else ok = true;
          break;
        }
        case "hasPenis":
          ok = typeof C.HasPenis === "function" ? !!C.HasPenis() : false;
          break;
        case "hasVagina":
          ok = typeof C.HasVagina === "function" ? !!C.HasVagina() : false;
          break;
        case "hasBreasts":
          ok = typeof C.HasBreasts === "function" ? !!C.HasBreasts() : false;
          break;
        default:
          ok = false;
      }
    } catch (e) {
      ok = false;
    }
    return rule.not ? !ok : ok;
  }
  function seidrActionConditionsOk(action, source, target) {
    const groups = action && action.conditions && action.conditions.groups;
    if (!groups || !groups.length) return true;
    for (let i = 0; i < groups.length; i++) {
      const rules = groups[i] && groups[i].rules;
      if (!rules || !rules.length) continue;
      let all = true;
      for (let j = 0; j < rules.length; j++) {
        if (!evalRule(rules[j], source, target)) {
          all = false;
          break;
        }
      }
      if (all) return true;
    }
    return false;
  }
  function seidrActionAudienceOk(action, source, target) {
    if (!source || !target) return false;
    const self = source === target || typeof source.MemberNumber === "number" && typeof target.MemberNumber === "number" && source.MemberNumber === target.MemberNumber;
    if (action.audience === "selfOnly") return self;
    if (action.audience === "othersOnly") return !self;
    return true;
  }
  function seidrActionAvailable(action, source, target) {
    if (!seidrActionAudienceOk(action, source, target)) return false;
    if (!seidrActionItemsOk(action, target)) return false;
    return seidrActionConditionsOk(action, source, target);
  }

  // src/actions/icons.ts
  function svgDataUri(inner) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#241c30"/>' + inner + "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  var SEIDR_BUILTIN_ICONS = [
    {
      id: "mark",
      label: "Mark",
      url: svgDataUri(
        '<text x="32" y="42" text-anchor="middle" font-size="28" font-family="sans-serif" font-weight="700" fill="#e0b15a">A</text>'
      )
    },
    {
      id: "hand",
      label: "Hand",
      url: svgDataUri(
        '<path d="M22 36 V18 a4 4 0 0 1 8 0 v10 M30 28 V14 a4 4 0 0 1 8 0 v16 M38 30 V16 a4 4 0 0 1 8 0 v20 M46 34 V24 a4 4 0 0 1 6 3 v15 a12 12 0 0 1-12 12 H28 a10 10 0 0 1-10-10 V36 a4 4 0 0 1 4-4z" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linejoin="round"/>'
      )
    },
    {
      id: "kiss",
      label: "Kiss",
      url: svgDataUri(
        '<path d="M20 28 Q26 18 32 28 Q38 18 44 28 Q38 42 32 48 Q26 42 20 28z" fill="#c06080" stroke="#e0b15a" stroke-width="2"/>'
      )
    },
    {
      id: "heart",
      label: "Heart",
      url: svgDataUri(
        '<path d="M32 50 L14 32 a12 12 0 0 1 18-16 a12 12 0 0 1 18 16z" fill="#c06080"/>'
      )
    },
    {
      id: "pull",
      label: "Pull",
      url: svgDataUri(
        '<path d="M12 32 H44 M36 22 L48 32 L36 42" fill="none" stroke="#e0b15a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
      )
    },
    {
      id: "spark",
      label: "Spark",
      url: svgDataUri(
        '<path d="M32 10 L36 26 L52 28 L38 38 L42 54 L32 44 L22 54 L26 38 L12 28 L28 26z" fill="#e0b15a"/>'
      )
    },
    {
      id: "cuddle",
      label: "Cuddle",
      url: svgDataUri(
        '<circle cx="24" cy="28" r="10" fill="none" stroke="#e0b15a" stroke-width="3"/><circle cx="40" cy="28" r="10" fill="none" stroke="#c09050" stroke-width="3"/>'
      )
    },
    {
      id: "star",
      label: "Star",
      url: svgDataUri(
        '<text x="32" y="44" text-anchor="middle" font-size="32" fill="#e0b15a">\u2605</text>'
      )
    }
  ];
  var SEIDR_ACTIVITY_ICON_IDS = [
    "Bite",
    "BrothersHandshake",
    "Caress",
    "Choke",
    "Clean",
    "CollarGrab",
    "Cuddle",
    "FrenchKiss",
    "GagKiss",
    "GaggedKiss",
    "Grope",
    "HandGag",
    "Inject",
    "Kick",
    "Kiss",
    "Lick",
    "MassageFeet",
    "MassageHands",
    "MasturbateFist",
    "MasturbateFoot",
    "MasturbateHand",
    "MasturbateTongue",
    "MoanGag",
    "MoanGagAngry",
    "MoanGagGiggle",
    "MoanGagGroan",
    "MoanGagTalk",
    "MoanGagWhimper",
    "Nibble",
    "Nod",
    "PenetrateFast",
    "PenetrateSlow",
    "Pet",
    "Pinch",
    "PoliteKiss",
    "Pull",
    "RestHead",
    "Rub",
    "SiblingsCheekKiss",
    "SiblingsHug",
    "SistersHug",
    "Sit",
    "Slap",
    "Spank",
    "Step",
    "StruggleArms",
    "StruggleLegs",
    "Suck",
    "TakeCare",
    "Tickle",
    "Whisper",
    "Wiggle"
  ];
  function seidrActivityIconUrl(id) {
    return "./Icons/Activity/" + id + ".png";
  }
  function seidrBuiltinIconById(id) {
    for (let i = 0; i < SEIDR_BUILTIN_ICONS.length; i++) {
      if (SEIDR_BUILTIN_ICONS[i].id === id) return SEIDR_BUILTIN_ICONS[i];
    }
    return null;
  }
  function seidrCustomIconsFromSettings() {
    try {
      const s = seidrGetSettings();
      const list = s && Array.isArray(s.customActionIcons) ? s.customActionIcons : [];
      return list;
    } catch (e) {
      return [];
    }
  }
  function seidrResolveActionIconUrl(action, customList) {
    const icon = seidrNormalizeActionIcon(action && action.icon);
    return seidrResolveIconRef(icon, customList);
  }
  function seidrResolveIconRef(icon, customList) {
    const ref = seidrNormalizeActionIcon(icon);
    if (ref.source === "seidr") {
      const b = seidrBuiltinIconById(ref.id);
      return b ? b.url : SEIDR_BUILTIN_ICONS[0].url;
    }
    if (ref.source === "activity") {
      if (SEIDR_ACTIVITY_ICON_IDS.indexOf(ref.id) >= 0) return seidrActivityIconUrl(ref.id);
      return SEIDR_BUILTIN_ICONS[0].url;
    }
    if (ref.source === "custom") {
      const customs = customList || seidrCustomIconsFromSettings();
      for (let i = 0; i < customs.length; i++) {
        if (customs[i].id === ref.id) return customs[i].url;
      }
      return SEIDR_BUILTIN_ICONS[0].url;
    }
    return SEIDR_BUILTIN_ICONS[0].url;
  }
  function seidrIconLabel(icon, customList) {
    const ref = seidrNormalizeActionIcon(icon) || seidrDefaultActionIcon();
    if (ref.source === "seidr") {
      const b = seidrBuiltinIconById(ref.id);
      return b ? b.label : ref.id;
    }
    if (ref.source === "activity") return ref.id;
    const customs = customList || seidrCustomIconsFromSettings();
    for (let i = 0; i < customs.length; i++) {
      if (customs[i].id === ref.id) return customs[i].label || customs[i].id;
    }
    return ref.id;
  }
  function seidrValidateImageUrl(url) {
    const trimmed = String(url || "").trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return Promise.resolve({ ok: false, error: "URL must start with http:// or https://" });
    }
    return new Promise(function(resolve) {
      const img = new Image();
      let settled = false;
      const done = function(result) {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const timer = setTimeout(function() {
        done({ ok: false, error: "Image load timed out" });
      }, 8e3);
      img.onload = function() {
        clearTimeout(timer);
        done({ ok: true });
      };
      img.onerror = function() {
        clearTimeout(timer);
        done({ ok: false, error: "Not a valid image URL" });
      };
      img.src = trimmed;
    });
  }

  // src/actions/store.ts
  function seidrGetActionsBag() {
    try {
      const s = seidrGetSettings();
      return seidrNormalizeActionsBag(s.actions);
    } catch (e) {
      return seidrDefaultActionsBag();
    }
  }
  function seidrSaveActionsBag(bag) {
    const normalized = seidrNormalizeActionsBag(bag);
    return seidrSaveSettings({ actions: normalized });
  }
  function seidrListActions() {
    return seidrGetActionsBag().list.slice();
  }
  function seidrGetActionById(id) {
    const list = seidrGetActionsBag().list;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
  function seidrAddAction() {
    const bag = seidrGetActionsBag();
    if (bag.list.length >= SEIDR_ACTIONS_MAX) return null;
    const act2 = seidrDefaultAction(bag.nextId);
    bag.nextId = act2.id + 1;
    bag.list.push(act2);
    const saved = seidrSaveActionsBag(bag);
    if (!saved.ok) return null;
    return act2;
  }
  function seidrUpdateAction(action) {
    const norm = seidrNormalizeAction(action);
    if (!norm) return { ok: false, error: "Invalid action" };
    const bag = seidrGetActionsBag();
    let found = false;
    for (let i = 0; i < bag.list.length; i++) {
      if (bag.list[i].id === norm.id) {
        bag.list[i] = norm;
        found = true;
        break;
      }
    }
    if (!found) {
      if (bag.list.length >= SEIDR_ACTIONS_MAX) return { ok: false, error: "Action limit reached" };
      bag.list.push(norm);
      if (norm.id >= bag.nextId) bag.nextId = norm.id + 1;
    }
    return seidrSaveActionsBag(bag);
  }
  function seidrDeleteAction(id) {
    const bag = seidrGetActionsBag();
    bag.list = bag.list.filter(function(a) {
      return a.id !== id;
    });
    return seidrSaveActionsBag(bag);
  }
  function seidrImportSelectedActions(actions) {
    const bag = seidrGetActionsBag();
    let imported = 0;
    let skipped = 0;
    const list = Array.isArray(actions) ? actions : [];
    for (let i = 0; i < list.length; i++) {
      if (bag.list.length >= SEIDR_ACTIONS_MAX) {
        skipped += list.length - i;
        break;
      }
      const id = bag.nextId;
      const norm = seidrNormalizeAction(Object.assign({}, list[i], { id }), id);
      if (!norm) {
        skipped += 1;
        continue;
      }
      bag.list.push(norm);
      bag.nextId = id + 1;
      imported += 1;
    }
    const saved = seidrSaveActionsBag(bag);
    if (!saved.ok) {
      return { ok: false, imported: 0, skipped: list.length, error: saved.error || "Save failed" };
    }
    return { ok: true, imported, skipped };
  }

  // src/actions/runtime.ts
  var PREREQ_PREFIX = "Seidr_CanAct_";
  var SEIDR_SOUND_TAG = "SeidrSound";
  var CLUB_SPANK_SUFFIX = "-Spank";
  function nextActivityId() {
    let max = 9500;
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return max + 1;
    for (let i = 0; i < ActivityFemale3DCG.length; i++) {
      const id = ActivityFemale3DCG[i] && ActivityFemale3DCG[i].ActivityID;
      if (typeof id === "number" && id > max) max = id;
    }
    return max + 1;
  }
  function findFemale3(name) {
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return null;
    for (let i = 0; i < ActivityFemale3DCG.length; i++) {
      if (ActivityFemale3DCG[i] && ActivityFemale3DCG[i].Name === name) return ActivityFemale3DCG[i];
    }
    return null;
  }
  function arousalMax(action) {
    if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return 0;
    const baseName = action.effects.arousal.activity;
    const base = findFemale3(baseName);
    if (base && typeof base.MaxProgress === "number" && base.MaxProgress > 0) return base.MaxProgress;
    return 80;
  }
  function arousalMaxSelf(action) {
    if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return 0;
    const baseName = action.effects.arousal.activity;
    const base = findFemale3(baseName);
    if (base && typeof base.MaxProgressSelf === "number") return base.MaxProgressSelf;
    if (base && typeof base.MaxProgress === "number") return base.MaxProgress;
    return 100;
  }
  function chatOther(action) {
    return action.chatOther && action.chatOther.trim() ? action.chatOther.trim() : seidrDefaultChatOther(action.name);
  }
  function chatSelf(action) {
    return action.chatSelf && action.chatSelf.trim() ? action.chatSelf.trim() : seidrDefaultChatSelf(action.name);
  }
  function arousalTemplate(action) {
    if (!action.effects || !action.effects.arousal || !action.effects.arousal.enabled) return null;
    const name = action.effects.arousal.activity;
    return typeof name === "string" && name ? name : "Caress";
  }
  function activityNameFromArgs(A) {
    if (typeof A === "string") return A;
    if (A && typeof A === "object" && typeof A.Name === "string") {
      return A.Name;
    }
    return "";
  }
  function seidrActNameFromChatData(data) {
    if (!data) return "";
    if (typeof data.Content === "string") {
      const m = /Chat(?:Other|Self)-[^-]+-(.+)$/.exec(data.Content);
      if (m) return seidrStripClubSoundSuffix2(m[1]);
    }
    if (Array.isArray(data.Dictionary)) {
      for (let i = 0; i < data.Dictionary.length; i++) {
        const entry = data.Dictionary[i];
        if (entry && typeof entry.ActivityName === "string" && seidrParseActionActivityName(entry.ActivityName) != null) {
          return seidrStripClubSoundSuffix2(entry.ActivityName);
        }
      }
    }
    return "";
  }
  function contentTriggersClubSpank(content) {
    return typeof content === "string" && (content.slice(-6) === "-Spank" || content.slice(-5) === "-Slap");
  }
  function soundOk(name) {
    return typeof name === "string" && SEIDR_ACTION_SOUNDS.indexOf(name) >= 0;
  }
  function soundFromDictionary(data) {
    if (!data || !Array.isArray(data.Dictionary)) return null;
    for (let i = 0; i < data.Dictionary.length; i++) {
      const entry = data.Dictionary[i];
      if (entry && entry.Tag === SEIDR_SOUND_TAG && soundOk(entry.Text)) return entry.Text;
    }
    return null;
  }
  function upsertDictTag(data, tag, text) {
    if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
    for (let i = 0; i < data.Dictionary.length; i++) {
      const entry = data.Dictionary[i];
      if (entry && entry.Tag === tag) {
        entry.Text = text;
        return;
      }
    }
    data.Dictionary.push({ Tag: tag, Text: text });
  }
  function focusGroupFromContent(content) {
    const m = /^Chat(?:Other|Self)-([^-]+)-/.exec(content || "");
    return m ? m[1] : "";
  }
  function targetMemberFromDictionary(data) {
    if (!data || !Array.isArray(data.Dictionary)) return null;
    for (let i = 0; i < data.Dictionary.length; i++) {
      const entry = data.Dictionary[i];
      if (!entry) continue;
      if (typeof entry.TargetCharacter === "number") return entry.TargetCharacter;
      if (typeof entry.MemberNumber === "number" && entry.Tag === "TargetCharacter") {
        return entry.MemberNumber;
      }
    }
    return null;
  }
  function findCharacterByMember(member) {
    if (member == null) return null;
    try {
      if (typeof Player !== "undefined" && Player && Player.MemberNumber === member) return Player;
    } catch (e) {
    }
    try {
      if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
        for (let i = 0; i < ChatRoomCharacter.length; i++) {
          const C = ChatRoomCharacter[i];
          if (C && C.MemberNumber === member) return C;
        }
      }
    } catch (e2) {
    }
    return null;
  }
  function wornItemOn(C, group) {
    if (!C || !group || typeof InventoryGet !== "function") return null;
    try {
      return InventoryGet(C, group) || null;
    } catch (e) {
      return null;
    }
  }
  function injectActivityAsset(data, action) {
    if (!data || typeof data.Content !== "string") return;
    if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
    for (let i = 0; i < data.Dictionary.length; i++) {
      const e = data.Dictionary[i];
      if (e && e.Tag === "ActivityAsset") return;
    }
    const group = focusGroupFromContent(data.Content);
    const targetN = targetMemberFromDictionary(data);
    let acted = findCharacterByMember(targetN);
    if (!acted && typeof Player !== "undefined") acted = Player;
    let item = group ? wornItemOn(acted, group) : null;
    if (!item && action.slots) {
      for (let s = 0; s < action.slots.length; s++) {
        item = wornItemOn(acted, action.slots[s]);
        if (item) break;
      }
    }
    if (!item || !item.Asset || !item.Asset.Name || !item.Asset.Group) return;
    const entry = {
      Tag: "ActivityAsset",
      AssetName: item.Asset.Name,
      GroupName: item.Asset.Group.Name
    };
    if (item.Craft && item.Craft.Name) entry.CraftName = item.Craft.Name;
    data.Dictionary.push(entry);
  }
  function enrichOutboundSeidrActivity(data) {
    if (!data || data.Type !== "Activity") return;
    const actName = seidrActNameFromChatData(data);
    const id = seidrParseActionActivityName(actName);
    if (id == null) return;
    const action = seidrGetActionById(id);
    if (!action) return;
    if (!Array.isArray(data.Dictionary)) data.Dictionary = [];
    try {
      injectActivityAsset(data, action);
    } catch (eAsset) {
    }
    const fx = action.effects || {};
    if (fx.sound && fx.sound.enabled && soundOk(fx.sound.sound)) {
      upsertDictTag(data, SEIDR_SOUND_TAG, fx.sound.sound);
      if (fx.sound.sound === "SpankSkin" && typeof data.Content === "string" && !contentTriggersClubSpank(data.Content)) {
        data.Content = data.Content + CLUB_SPANK_SUFFIX;
      }
    }
    const template = arousalTemplate(action);
    if (!template) return;
    for (let j = 0; j < data.Dictionary.length; j++) {
      const entry = data.Dictionary[j];
      if (entry && typeof entry.ActivityName === "string") {
        entry.ActivityName = template;
        return;
      }
    }
    data.Dictionary.push({ ActivityName: template });
  }
  function writeLabels(cache, actions) {
    if (!cache || !cache.cache) return;
    actions.forEach(function(action) {
      const actName = seidrActionActivityName(action.id);
      const other = chatOther(action);
      const self = chatSelf(action);
      cache.cache["Activity" + actName] = action.name;
      action.slots.forEach(function(group) {
        cache.cache["Label-ChatOther-" + group + "-" + actName] = action.name;
        cache.cache["Label-ChatSelf-" + group + "-" + actName] = action.name;
        cache.cache["ChatOther-" + group + "-" + actName] = other;
        cache.cache["ChatSelf-" + group + "-" + actName] = self;
        cache.cache["ChatOther-" + group + "-" + actName + CLUB_SPANK_SUFFIX] = other;
        cache.cache["ChatSelf-" + group + "-" + actName + CLUB_SPANK_SUFFIX] = self;
      });
    });
  }
  function ensureLabels(actions) {
    if (typeof ActivityDictionaryLoad !== "function") return;
    const cache = ActivityDictionaryLoad();
    writeLabels(cache, actions);
  }
  function removeStaleActivities(keep) {
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
    for (let i = ActivityFemale3DCG.length - 1; i >= 0; i--) {
      const row = ActivityFemale3DCG[i];
      if (!row || typeof row.Name !== "string") continue;
      if (row.Name.indexOf("Seidr_Act_") !== 0) continue;
      if (keep[row.Name]) continue;
      ActivityFemale3DCG.splice(i, 1);
    }
    if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
      for (let j = ActivityFemale3DCGOrdering.length - 1; j >= 0; j--) {
        const n = ActivityFemale3DCGOrdering[j];
        if (typeof n === "string" && n.indexOf("Seidr_Act_") === 0 && !keep[n]) {
          ActivityFemale3DCGOrdering.splice(j, 1);
        }
      }
    }
  }
  function bindAction(action) {
    const zones = action.slots.slice();
    const max = arousalMax(action);
    const maxSelf = arousalMaxSelf(action);
    const selfOk = action.audience === "selfOnly" || action.audience === "both";
    const otherOk = action.audience === "othersOnly" || action.audience === "both";
    const bound = {
      Name: seidrActionActivityName(action.id),
      ActivityID: 0,
      MaxProgress: max,
      MaxProgressSelf: maxSelf,
      Prerequisite: [PREREQ_PREFIX + action.id],
      Target: otherOk ? zones.slice() : selfOk ? zones.slice() : zones.slice()
    };
    if (selfOk) bound.TargetSelf = zones.slice();
    return bound;
  }
  function seidrSyncUserActions() {
    if (Seidr.SHOW_ACTIONS === false) return;
    if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return;
    const actions = seidrListActions();
    const keep = {};
    actions.forEach(function(action) {
      const name = seidrActionActivityName(action.id);
      keep[name] = true;
      const bound = bindAction(action);
      let existing = findFemale3(name);
      if (existing) {
        if (typeof existing.ActivityID !== "number") existing.ActivityID = nextActivityId();
        existing.MaxProgress = bound.MaxProgress;
        existing.MaxProgressSelf = bound.MaxProgressSelf;
        existing.Prerequisite = bound.Prerequisite;
        existing.Target = bound.Target;
        if (bound.TargetSelf) existing.TargetSelf = bound.TargetSelf;
        else delete existing.TargetSelf;
      } else {
        bound.ActivityID = nextActivityId();
        ActivityFemale3DCG.push(bound);
        if (typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
          ActivityFemale3DCGOrdering.push(name);
        }
      }
    });
    removeStaleActivities(keep);
    ensureLabels(actions);
  }
  function applyPose(C, pose) {
    if (!C || !pose) return;
    try {
      if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
      else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
    } catch (e) {
    }
    try {
      if (typeof ChatRoomCharacterUpdate === "function") {
        ChatRoomCharacterUpdate(C);
      } else if (typeof ServerSend === "function" && C.IsPlayer && C.IsPlayer()) {
        ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
      }
    } catch (e2) {
    }
  }
  function canPoseTarget(actor, acted) {
    if (!actor || !acted) return false;
    if (actor === acted || actor.IsPlayer && actor.IsPlayer() && acted.IsPlayer && acted.IsPlayer()) return true;
    try {
      if (typeof ServerChatRoomGetAllowItem === "function") {
        return !!ServerChatRoomGetAllowItem(actor, acted);
      }
    } catch (e) {
    }
    return !!acted.AllowItem;
  }
  function runSideEffects(action, actor, acted) {
    const fx = action.effects || {};
    if (fx.pose && fx.pose.enabled && fx.pose.pose) {
      const self = actor === acted || typeof actor.MemberNumber === "number" && actor.MemberNumber === acted.MemberNumber;
      if (self || canPoseTarget(actor, acted)) {
        applyPose(self ? actor : acted, fx.pose.pose);
      }
    }
  }
  function prereqOk(actionId, acting, acted) {
    const action = seidrGetActionById(actionId);
    if (!action) return false;
    return seidrActionAvailable(action, acting, acted);
  }
  function seidrActionDialogForContent(content) {
    const match = /^(Chat(?:Other|Self))-[^-]+-(.+)$/.exec(content || "");
    if (!match) return "";
    const id = seidrParseActionActivityName(seidrStripClubSoundSuffix2(match[2]));
    if (id == null) return "";
    const action = seidrGetActionById(id);
    if (!action) return "";
    return match[1] === "ChatSelf" ? chatSelf(action) : chatOther(action);
  }
  function seidrInstallUserActions() {
    if (Seidr.SHOW_ACTIONS === false) return;
    seidrSyncUserActions();
    Seidr.hookFunction("PreferenceGetActivityFactor", 1, function(args, next) {
      const type = args[1];
      const id = typeof type === "string" ? seidrParseActionActivityName(type) : null;
      if (id == null) return next(args);
      const action = seidrGetActionById(id);
      if (!action) return 0;
      const template = arousalTemplate(action);
      if (template) {
        const nextArgs = args.slice();
        nextArgs[1] = template;
        return next(nextArgs);
      }
      return 2;
    });
    Seidr.hookFunction("ActivityEffect", 5, function(args, next) {
      const name = activityNameFromArgs(args[2]);
      const id = seidrParseActionActivityName(name);
      if (id == null) return next(args);
      const action = seidrGetActionById(id);
      if (!action) return;
      const template = arousalTemplate(action);
      if (!template) return;
      const nextArgs = args.slice();
      nextArgs[2] = template;
      return next(nextArgs);
    });
    Seidr.hookFunction("ServerSend", 6, function(args, next) {
      try {
        if (args && args[0] === "ChatRoomChat") enrichOutboundSeidrActivity(args[1]);
      } catch (e) {
      }
      return next(args);
    });
    Seidr.hookFunction("AudioPlaySoundForChatMessage", 5, function(args, next) {
      try {
        const data = args[0];
        const metadata = args[3];
        if (data && data.Type === "Activity" && contentTriggersClubSpank(data.Content)) {
          return next(args);
        }
        const seidrSnd = soundFromDictionary(data);
        if (seidrSnd && data && data.Type === "Activity" && metadata) {
          const involved = typeof ChatRoomMessageInvolvesPlayer === "function" ? ChatRoomMessageInvolvesPlayer(data) : true;
          if (typeof AudioShouldSilenceSound === "function" && AudioShouldSilenceSound(involved)) {
            return false;
          }
          const soundEffect = [seidrSnd, 0];
          const Target = metadata.TargetCharacter;
          if (Target) {
            try {
              if (Target.MemberNumber === Player.MemberNumber) soundEffect[1] += 3;
              else if (data.Sender !== Player.MemberNumber) soundEffect[1] -= 3;
            } catch (eVol) {
            }
            if (typeof AudioPlaySoundEffect === "function") AudioPlaySoundEffect(soundEffect);
            return false;
          }
        }
      } catch (e) {
      }
      return next(args);
    });
    Seidr.hookFunction("ActivityCheckPrerequisite", 110, function(args, next) {
      const name = args[0];
      if (typeof name === "string" && name.indexOf(PREREQ_PREFIX) === 0) {
        const id = parseInt(name.slice(PREREQ_PREFIX.length), 10);
        if (!Number.isFinite(id)) return false;
        try {
          return prereqOk(id, args[1], args[2]);
        } catch (e) {
          return false;
        }
      }
      return next(args);
    });
    Seidr.hookFunction("ActivityRun", 6, function(args, next) {
      const actor = args[0];
      const acted = args[1];
      const itemActivity = args[3];
      const actName = itemActivity && itemActivity.Activity && itemActivity.Activity.Name;
      const id = typeof actName === "string" ? seidrParseActionActivityName(actName) : null;
      const action = id != null ? seidrGetActionById(id) : null;
      const result = next(args);
      if (action && actor && typeof actor.IsPlayer === "function" && actor.IsPlayer()) {
        try {
          runSideEffects(action, actor, acted);
        } catch (e) {
          console.warn("[Seidr] action fx", e);
        }
      }
      return result;
    });
    Seidr.tryHook("ElementButton.CreateForActivity", "ElementButton.CreateForActivity", 6, function(args, next) {
      const activity = args[1];
      const actName = activity && activity.Activity && activity.Activity.Name;
      const id = typeof actName === "string" ? seidrParseActionActivityName(actName) : null;
      if (id != null) {
        const action = seidrGetActionById(id);
        const label = action && action.name || "Action";
        args[4] = Object.assign({}, args[4] || {}, {
          image: seidrResolveActionIconUrl(action),
          tooltip: label
        });
      }
      return next(args);
    });
    Seidr.syncUserActions = seidrSyncUserActions;
    Seidr.actionDialogForContent = seidrActionDialogForContent;
  }

  // src/actions/index.ts
  function seidrInstallActions() {
    if (Seidr.SHOW_ACTIONS === false) return;
    seidrInstallUserActions();
  }
  Seidr.installActions = seidrInstallActions;
  Seidr.syncUserActions = seidrSyncUserActions;

  // src/fastOpen.ts
  var clickShift = false;
  var clickCtrl = false;
  var clickAlt = false;
  var clickMeta = false;
  var installed = false;
  var PREFERRED_ACTIVITY_GROUPS = [
    "ItemTorso",
    "ItemArms",
    "ItemMouth",
    "ItemBreast",
    "ItemPelvis",
    "ItemLegs",
    "ItemHead"
  ];
  function rememberClickMods(e) {
    if (!e) return;
    clickShift = !!e.shiftKey;
    clickCtrl = !!e.ctrlKey;
    clickAlt = !!e.altKey;
    clickMeta = !!e.metaKey;
  }
  function clearClickMods() {
    clickShift = false;
    clickCtrl = false;
    clickAlt = false;
    clickMeta = false;
  }
  function modifierHeld(mod) {
    switch (mod) {
      case "Ctrl":
        return clickCtrl;
      case "Alt":
        return clickAlt;
      case "Meta":
        return clickMeta;
      case "Shift":
      default:
        return clickShift;
    }
  }
  function tryGroup(C, family, name) {
    if (!name) return null;
    let g = null;
    if (typeof AssetGroupGet === "function") {
      try {
        g = AssetGroupGet(family, name) || null;
      } catch (e) {
        g = null;
      }
    }
    if (!g) return null;
    if (typeof ActivityAllowedForGroup === "function") {
      try {
        const list = ActivityAllowedForGroup(C, name);
        if (list && list.length) return g;
        return null;
      } catch (e) {
        return null;
      }
    }
    return g;
  }
  function pickActivityGroup(C) {
    if (!C) return null;
    const family = C.AssetFamily || "Female3DCG";
    let preferred = "ItemTorso";
    try {
      preferred = seidrGetSettings().fastOpenActionsSlot || "ItemTorso";
    } catch (e) {
    }
    const hit = tryGroup(C, family, preferred);
    if (hit) return hit;
    for (let i = 0; i < PREFERRED_ACTIVITY_GROUPS.length; i++) {
      const name = PREFERRED_ACTIVITY_GROUPS[i];
      if (name === preferred) continue;
      const g = tryGroup(C, family, name);
      if (g) return g;
    }
    if (typeof AssetGroupGet === "function") {
      try {
        return AssetGroupGet(family, preferred) || AssetGroupGet(family, "ItemTorso") || null;
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
  function openActivitiesOn(C) {
    if (!C) return false;
    if (typeof ChatRoomFocusCharacter !== "function") return false;
    try {
      ChatRoomFocusCharacter(C);
      const group = pickActivityGroup(C);
      if (group && typeof DialogChangeFocusToGroup === "function") {
        DialogChangeFocusToGroup(C, group);
      }
      if (typeof DialogChangeMode === "function") {
        DialogChangeMode("activities");
      }
      return true;
    } catch (e) {
      console.warn("[Seidr] Fast Open Actions", e);
      return false;
    }
  }
  function seidrInstallFastOpen() {
    if (installed) return;
    installed = true;
    if (typeof document !== "undefined") {
      document.addEventListener("mousedown", rememberClickMods, true);
      document.addEventListener("pointerdown", rememberClickMods, true);
    }
    Seidr.hookFunction("ChatRoomCharacterViewClickCharacter", 12, function(args, next) {
      const s = seidrGetSettings();
      const enabled = s.fastOpenActionsEnabled !== false;
      const mod = s.fastOpenActionsModifier || "Shift";
      if (enabled && modifierHeld(mod)) {
        clearClickMods();
        if (openActivitiesOn(args[0])) return;
      }
      clearClickMods();
      return next(args);
    });
  }
  Seidr.installFastOpen = seidrInstallFastOpen;

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

  // src/roomManager/styles.ts
  function rmStylesCss() {
    return [
      "#seidr-rm-root { position: fixed; inset: 0; z-index: 115; pointer-events: none; }",
      "#seidr-rm-root * { box-sizing: border-box; }",
      "#seidr-rm-btn {",
      "  pointer-events: auto; position: fixed; z-index: 116;",
      "  width: 44px; height: 44px; border-radius: 10px;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  background: rgba(36, 28, 48, 0.92); color: #f0e6d4;",
      "  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);",
      "  box-shadow: 0 4px 18px rgba(0,0,0,0.4); cursor: grab;",
      "  display: none; place-items: center; font-size: 18px; padding: 0;",
      "  right: 16px; top: 42%;",
      "}",
      "#seidr-rm-btn.seidr-rm-visible { display: grid; }",
      "#seidr-rm-btn:hover { border-color: #d4a017; color: #d4a017; }",
      "#seidr-rm-panel {",
      "  pointer-events: auto; position: fixed; z-index: 117;",
      "  display: none; flex-direction: column;",
      "  width: min(90vw, 720px); height: min(80vh, 560px);",
      "  min-width: 480px; min-height: 360px;",
      "  max-width: calc(100vw - 16px); max-height: calc(100vh - 16px);",
      "  background: rgba(28, 22, 38, 0.96); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
      "  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
      "  overflow: hidden; resize: both;",
      "  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
      "}",
      "#seidr-rm-panel.seidr-rm-open { display: flex; }",
      "#seidr-rm-panel[hidden] { display: none !important; }",
      ".seidr-rm-header {",
      "  flex-shrink: 0; display: flex; align-items: center; gap: 8px;",
      "  padding: 8px 10px; background: rgba(42, 34, 56, 0.95);",
      "  border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move; user-select: none;",
      "}",
      ".seidr-rm-header-title { flex: 1; font-weight: 600; }",
      ".seidr-rm-header-title span {",
      "  margin-left: 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;",
      "  text-transform: uppercase; color: #d4a017;",
      "  border: 1px solid rgba(212,160,23,0.35); border-radius: 999px; padding: 2px 7px;",
      "}",
      ".seidr-rm-icon-btn {",
      "  width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);",
      "  background: transparent; color: inherit; cursor: pointer;",
      "}",
      ".seidr-rm-icon-btn:hover { border-color: #d4a017; color: #d4a017; }",
      ".seidr-rm-body {",
      "  flex: 1; min-height: 0; overflow: hidden; padding: 10px;",
      "  display: flex; flex-direction: column; gap: 10px;",
      "}",
      ".seidr-rm-footer {",
      "  flex-shrink: 0; display: flex; align-items: center; gap: 10px;",
      "  padding: 6px 12px; font-size: 12px; color: #a898b0;",
      "  border-top: 1px solid rgba(255,255,255,0.1); background: rgba(42, 34, 56, 0.95);",
      "  min-height: calc(1.35em + 12px);",
      "}",
      ".seidr-rm-footer-usage { flex-shrink: 0; margin-left: auto; }",
      ".seidr-rm-footer .seidr-rm-msg {",
      "  flex: 1; min-width: 0; height: 1.35em; line-height: 1.35em;",
      "  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;",
      "}",
      ".seidr-rm-sec {",
      "  background: rgba(42, 34, 56, 0.85); border: 1px solid rgba(255,255,255,0.1);",
      "  border-radius: 6px; padding: 8px; flex-shrink: 0;",
      "}",
      ".seidr-rm-sec-grow {",
      "  flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;",
      "}",
      ".seidr-rm-sec h3 {",
      "  margin: 0 0 6px; font-size: 11px; letter-spacing: 0.05em;",
      "  text-transform: uppercase; color: #d4a017;",
      "}",
      ".seidr-rm-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }",
      ".seidr-rm-row select, .seidr-rm-row input, .seidr-rm-dialog input {",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4; border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 8px; min-width: 0;",
      "}",
      ".seidr-rm-row select { min-width: 140px; flex: 1; }",
      ".seidr-rm-row button, .seidr-rm-dialog button {",
      "  background: rgba(60,48,80,0.9); color: #f0e6d4; border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 10px; cursor: pointer;",
      "}",
      ".seidr-rm-row button:hover, .seidr-rm-dialog button:hover { border-color: #d4a017; }",
      ".seidr-rm-row button:disabled, .seidr-rm-card-actions button:disabled {",
      "  opacity: 0.45; cursor: not-allowed;",
      "}",
      ".seidr-rm-grid {",
      "  display: grid; grid-template-columns: repeat(auto-fill, minmax(188px, 1fr));",
      "  grid-auto-flow: row; grid-auto-rows: max-content;",
      "  gap: 10px; margin-top: 8px; flex: 1 1 auto; min-height: 0; overflow-y: auto;",
      "  align-content: start; align-items: start;",
      "  scrollbar-width: thin;",
      "  scrollbar-color: rgba(212,160,23,0.55) rgba(20,16,28,0.9);",
      "}",
      ".seidr-rm-grid::-webkit-scrollbar { width: 8px; }",
      ".seidr-rm-grid::-webkit-scrollbar-track {",
      "  background: rgba(20,16,28,0.9); border-radius: 4px;",
      "}",
      ".seidr-rm-grid::-webkit-scrollbar-thumb {",
      "  background: rgba(212,160,23,0.55); border-radius: 4px;",
      "}",
      ".seidr-rm-grid::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(212,160,23,0.8);",
      "}",
      ".seidr-rm-card {",
      "  position: relative; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px;",
      "  overflow: hidden; background: #2a2038; display: flex; flex-direction: column;",
      "  height: auto; min-width: 0; align-self: start; isolation: isolate;",
      "}",
      '.seidr-rm-card[draggable="true"] { cursor: grab; }',
      ".seidr-rm-card.seidr-rm-dragging { opacity: 0.45; }",
      ".seidr-rm-card.seidr-rm-drop-before { box-shadow: inset 3px 0 0 #d4a017; }",
      ".seidr-rm-card.seidr-rm-drop-after { box-shadow: inset -3px 0 0 #d4a017; }",
      ".seidr-rm-card-thumb {",
      "  aspect-ratio: 4 / 3; width: 100%; height: auto; flex-shrink: 0;",
      "  object-fit: cover; background: #1e1830; display: block;",
      "}",
      ".seidr-rm-card-name {",
      "  flex-shrink: 0; min-height: 1.4em; font-size: 11px; padding: 4px 6px; color: #a898b0;",
      "  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
      "}",
      ".seidr-rm-card-actions {",
      "  position: absolute; top: 6px; right: 6px; display: none; gap: 6px; z-index: 2;",
      "}",
      ".seidr-rm-card:hover .seidr-rm-card-actions { display: flex; }",
      ".seidr-rm-card-actions button, .seidr-rm-icon-act {",
      "  width: 40px; height: 40px; border-radius: 6px; border: none;",
      "  background: rgba(0,0,0,0.72); color: #f0e6d4; cursor: pointer;",
      "  font-size: 18px; line-height: 1; flex-shrink: 0;",
      "}",
      ".seidr-rm-card-actions button:hover, .seidr-rm-icon-act:hover {",
      "  background: rgba(0,0,0,0.88); color: #d4a017;",
      "}",
      ".seidr-rm-msg { color: #e0b15a; font-size: 12px; }",
      ".seidr-rm-overlay {",
      "  pointer-events: auto; position: fixed; inset: 0; z-index: 118;",
      "  background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;",
      "}",
      ".seidr-rm-dialog {",
      "  width: min(92vw, 400px); background: rgba(36,28,48,0.98); border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px;",
      "  color: #f0e6d4;",
      "}",
      ".seidr-rm-dialog h4 { margin: 0; color: #d4a017; }",
      ".seidr-rm-dialog label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #a898b0; }",
      ".seidr-rm-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }",
      ".seidr-rm-hidden { display: none !important; }"
    ].join("\n");
  }
  function rmInjectStyles() {
    let el = document.getElementById("seidr-rm-styles");
    if (!el) {
      el = document.createElement("style");
      el.id = "seidr-rm-styles";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = rmStylesCss();
  }

  // src/roomManager/roomApply.ts
  function rmInLiveRoom() {
    try {
      return typeof ServerPlayerIsInChatRoom === "function" && !!ServerPlayerIsInChatRoom();
    } catch (e) {
      return false;
    }
  }
  function rmIsAdmin() {
    try {
      if (typeof ChatRoomPlayerIsAdmin === "function" && ChatRoomPlayerIsAdmin()) return true;
    } catch (e) {
    }
    try {
      if (ChatRoomData && Array.isArray(ChatRoomData.Admin) && Player && ChatRoomData.Admin.includes(Player.MemberNumber)) {
        return true;
      }
    } catch (e) {
    }
    return false;
  }
  function rmOnChatAdmin() {
    try {
      return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatAdmin";
    } catch (e) {
      return false;
    }
  }
  function rmCanApplyToRoom() {
    try {
      if (typeof CurrentScreen === "undefined") return false;
      return CurrentScreen === "ChatRoom" || CurrentScreen === "ChatAdmin";
    } catch (e) {
      return false;
    }
  }
  function snapshotFromRoom(data) {
    return {
      Name: data.Name || "",
      Language: data.Language,
      Description: data.Description || "",
      Background: data.Background,
      Limit: data.Limit,
      Admin: Array.isArray(data.Admin) ? data.Admin.slice() : [],
      Whitelist: Array.isArray(data.Whitelist) ? data.Whitelist.slice() : [],
      Ban: Array.isArray(data.Ban) ? data.Ban.slice() : [],
      BlockCategory: data.BlockCategory || [],
      Game: data.Game,
      Visibility: data.Visibility,
      Access: data.Access,
      MapData: data.MapData,
      Custom: data.Custom
    };
  }
  function rmReadSettings() {
    if (!rmOnChatAdmin()) {
      if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
        return snapshotFromRoom(ChatRoomData);
      }
      return null;
    }
    if (typeof ChatEditorGetAdminSettings === "function") {
      try {
        const full = ChatEditorGetAdminSettings();
        if (full) return full;
      } catch (e) {
      }
    }
    if (typeof ChatAdminData !== "undefined" && ChatAdminData) {
      return snapshotFromRoom(ChatAdminData);
    }
    return null;
  }
  function rmSliceRoom(settings) {
    return {
      Name: settings.Name,
      Language: settings.Language,
      Description: settings.Description,
      Limit: settings.Limit,
      BlockCategory: settings.BlockCategory,
      Game: settings.Game,
      Visibility: settings.Visibility,
      Access: settings.Access,
      MapData: settings.MapData
    };
  }
  function rmSliceAccess(settings) {
    return {
      Admin: Array.isArray(settings.Admin) ? settings.Admin.slice() : [],
      Whitelist: Array.isArray(settings.Whitelist) ? settings.Whitelist.slice() : [],
      Ban: Array.isArray(settings.Ban) ? settings.Ban.slice() : []
    };
  }
  function setVisibilityAccess(preset) {
    if (typeof ChatAdminData === "undefined" || !ChatAdminData) return;
    if (Array.isArray(preset.Visibility) && typeof ChatAdminVisibilityModeValues !== "undefined") {
      let vi = ChatAdminVisibilityModeValues.findIndex(function(elem) {
        return elem.length === preset.Visibility.length && elem.every(function(role) {
          return preset.Visibility.includes(role);
        });
      });
      if (vi < 0) vi = 0;
      window.ChatAdminVisibilityModeIndex = vi;
      ChatAdminData.Visibility = ChatAdminVisibilityModeValues[vi];
    }
    if (Array.isArray(preset.Access) && typeof ChatAdminAccessModeValues !== "undefined") {
      let ai = ChatAdminAccessModeValues.findIndex(function(elem) {
        return elem.length === preset.Access.length && elem.every(function(role) {
          return preset.Access.includes(role);
        });
      });
      if (ai < 0) ai = 0;
      window.ChatAdminAccessModeIndex = ai;
      ChatAdminData.Access = ChatAdminAccessModeValues[ai];
    }
  }
  function mergeRoomOnto(target, preset) {
    if (typeof preset.Name === "string") target.Name = preset.Name;
    if (typeof preset.Description === "string") target.Description = preset.Description;
    if (typeof preset.Limit === "number") target.Limit = preset.Limit;
    if (typeof preset.Language === "string") target.Language = preset.Language;
    if (Array.isArray(preset.BlockCategory)) target.BlockCategory = preset.BlockCategory;
    if (typeof preset.Game === "string") target.Game = preset.Game;
    if (Array.isArray(preset.Visibility)) target.Visibility = preset.Visibility;
    if (Array.isArray(preset.Access)) target.Access = preset.Access;
    if (preset.MapData && typeof preset.MapData === "object") target.MapData = preset.MapData;
  }
  function rmApplyRoomToEditor(preset) {
    if (!preset) return;
    if (rmOnChatAdmin() && typeof ChatAdminData !== "undefined" && ChatAdminData) {
      const cad = ChatAdminData;
      if (typeof preset.Name === "string") {
        cad.Name = preset.Name;
        if (document.getElementById("InputName")) ElementValue("InputName", preset.Name);
      }
      if (typeof preset.Description === "string") {
        cad.Description = preset.Description;
        if (document.getElementById("InputDescription")) ElementValue("InputDescription", preset.Description);
      }
      if (typeof preset.Limit === "number") {
        cad.Limit = preset.Limit;
        if (document.getElementById("InputSize")) ElementValue("InputSize", String(preset.Limit));
      }
      if (typeof preset.Language === "string") cad.Language = preset.Language;
      if (Array.isArray(preset.BlockCategory)) cad.BlockCategory = preset.BlockCategory;
      if (typeof preset.Game === "string") cad.Game = preset.Game;
      if (preset.MapData && typeof preset.MapData === "object") cad.MapData = preset.MapData;
      setVisibilityAccess(preset);
      return;
    }
    if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
      mergeRoomOnto(ChatRoomData, preset);
    }
  }
  function rmApplyAccessToEditor(preset) {
    if (!preset) return;
    const admin = Array.isArray(preset.Admin) ? preset.Admin.slice() : [];
    const wl = Array.isArray(preset.Whitelist) ? preset.Whitelist.slice() : [];
    const ban = Array.isArray(preset.Ban) ? preset.Ban.slice() : [];
    if (rmOnChatAdmin()) {
      if (document.getElementById("InputAdminList")) {
        ElementValue("InputAdminList", CommonConvertArrayToString(admin));
      }
      if (document.getElementById("InputWhitelist")) {
        ElementValue("InputWhitelist", CommonConvertArrayToString(wl));
      }
      if (document.getElementById("InputBanList")) {
        ElementValue("InputBanList", CommonConvertArrayToString(ban));
      }
      if (typeof ChatAdminData !== "undefined" && ChatAdminData) {
        ChatAdminData.Admin = admin;
        ChatAdminData.Whitelist = wl;
        ChatAdminData.Ban = ban;
      }
      return;
    }
    if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
      ChatRoomData.Admin = admin;
      ChatRoomData.Whitelist = wl;
      ChatRoomData.Ban = ban;
    }
  }
  function buildLiveUpdateRoom() {
    if (!rmInLiveRoom() || typeof ChatRoomData === "undefined" || !ChatRoomData) return null;
    return snapshotFromRoom(ChatRoomData);
  }
  function rmUpdateLiveRoom() {
    if (!rmInLiveRoom()) return { ok: true };
    if (!rmIsAdmin()) return { ok: false, error: "Admin required" };
    try {
      if (rmOnChatAdmin() && typeof ChatEditorUpdateRoom === "function" && typeof ChatAdminData !== "undefined" && ChatAdminData) {
        ChatEditorUpdateRoom();
        return { ok: true };
      }
      const room = buildLiveUpdateRoom();
      if (!room) return { ok: false, error: "No room data" };
      ServerSend("ChatRoomAdmin", { MemberNumber: Player.ID, Room: room, Action: "Update" });
      return { ok: true };
    } catch (e) {
      console.warn("[Seidr RM] Update failed", e);
      return { ok: false, error: "Update failed" };
    }
  }
  function rmMapModeActive(settings) {
    const s = settings || rmReadSettings();
    const md = s && s.MapData;
    if (!md || md.Type == null) return false;
    return md.Type !== "Never";
  }

  // src/roomManager/backgrounds.ts
  function rmListBackgrounds() {
    return rmGetStore().backgrounds.slice();
  }
  function rmReorderBackgrounds(orderedIds) {
    const store = rmGetStore();
    const byId = {};
    store.backgrounds.forEach(function(b) {
      byId[b.id] = b;
    });
    const next = [];
    const seen = {};
    orderedIds.forEach(function(id) {
      if (!id || seen[id] || !byId[id]) return;
      next.push(byId[id]);
      seen[id] = true;
    });
    store.backgrounds.forEach(function(b) {
      if (!seen[b.id]) next.push(b);
    });
    store.backgrounds = next;
    return rmSaveStore().ok;
  }
  function rmValidateBackgroundUrl(url) {
    const trimmed = (url || "").trim();
    if (!trimmed) return Promise.resolve({ ok: false, error: "URL required" });
    let safe = trimmed;
    try {
      if (typeof ServerChatRoomDataValidate !== "undefined" && ServerChatRoomDataValidate.Custom && typeof ServerChatRoomDataValidate.Custom.ImageURL === "function") {
        safe = ServerChatRoomDataValidate.Custom.ImageURL(trimmed);
      }
    } catch (e) {
      return Promise.resolve({ ok: false, error: "URL rejected by Club validator" });
    }
    if (!safe || typeof safe !== "string") {
      return Promise.resolve({ ok: false, error: "Invalid background URL" });
    }
    return new Promise(function(resolve) {
      const img = new Image();
      img.onload = function() {
        resolve({ ok: true, url: safe });
      };
      img.onerror = function() {
        resolve({ ok: false, error: "Image failed to load" });
      };
      img.referrerPolicy = "no-referrer";
      img.src = safe;
    });
  }
  function rmSaveBackground(name, url, existingId) {
    return rmValidateBackgroundUrl(url).then(function(v) {
      if (!v.ok || !v.url) return { ok: false, error: v.error || "Invalid URL" };
      const n = (name || "").trim().slice(0, 64);
      if (!n) return { ok: false, error: "Name required" };
      const store = rmGetStore();
      let entry;
      if (existingId) {
        const idx = store.backgrounds.findIndex(function(b) {
          return b.id === existingId;
        });
        if (idx < 0) return { ok: false, error: "Background not found" };
        entry = { id: existingId, name: n, url: v.url };
        store.backgrounds[idx] = entry;
      } else {
        entry = { id: rmNewId("bg"), name: n, url: v.url };
        store.backgrounds.push(entry);
      }
      const saved = rmSaveStore();
      if (!saved.ok) return { ok: false, error: saved.error };
      return { ok: true, entry };
    });
  }
  function rmDeleteBackground(id) {
    const store = rmGetStore();
    const next = store.backgrounds.filter(function(b) {
      return b.id !== id;
    });
    if (next.length === store.backgrounds.length) return false;
    store.backgrounds = next;
    return rmSaveStore().ok;
  }
  function rmApplyBackgroundUrl(url) {
    const trimmed = (url || "").trim();
    if (!trimmed) return { ok: false, error: "No URL" };
    if (rmOnChatAdmin() && typeof ChatAdminData !== "undefined" && ChatAdminData) {
      if (!ChatAdminData.Custom || typeof ChatAdminData.Custom !== "object") ChatAdminData.Custom = {};
      ChatAdminData.Custom.ImageURL = trimmed;
      return { ok: true };
    }
    if (rmInLiveRoom() && typeof ChatRoomData !== "undefined" && ChatRoomData) {
      if (!ChatRoomData.Custom || typeof ChatRoomData.Custom !== "object") ChatRoomData.Custom = {};
      ChatRoomData.Custom.ImageURL = trimmed;
      return rmUpdateLiveRoom();
    }
    return { ok: false, error: "Open ChatAdmin or join a room as admin" };
  }

  // src/roomManager/maps.ts
  function pushMapRoomSync(backup) {
    try {
      if (backup && typeof ChatRoomMapViewEditBackup !== "undefined" && ChatRoomMapViewEditBackup) {
        if (JSON.stringify(backup) !== JSON.stringify(ChatRoomData && ChatRoomData.MapData)) {
          if (ChatRoomMapViewEditBackup.length > 100) {
            ChatRoomMapViewEditBackup = ChatRoomMapViewEditBackup.slice(-100);
          }
          ChatRoomMapViewEditBackup.push(backup);
        }
      }
      if (typeof ChatRoomMapViewUpdateFlag === "function") ChatRoomMapViewUpdateFlag();
      if (typeof ChatRoomMapViewUpdateRoomNext !== "undefined") {
        ChatRoomMapViewUpdateRoomNext = typeof CommonTime === "function" ? CommonTime() : 0;
      }
      if (typeof ChatRoomMapViewCalculatePerceptionMasks === "function") {
        ChatRoomMapViewCalculatePerceptionMasks();
      }
      if (typeof ChatRoomMapViewUpdateRoomSync === "function") {
        ChatRoomMapViewUpdateRoomSync();
      }
    } catch (e) {
      console.warn("[Seidr RM] map sync", e);
    }
  }
  function rmExportCurrentMap() {
    if (!rmMapModeActive()) return null;
    try {
      if (typeof ChatRoomMapManager !== "undefined" && ChatRoomMapManager && ChatRoomMapManager.Map && typeof ChatRoomMapManager.Map.exportString === "function") {
        return ChatRoomMapManager.Map.exportString();
      }
    } catch (e) {
      console.warn("[Seidr RM] exportString", e);
    }
    return null;
  }
  function rmImportMapString(mapString) {
    if (typeof mapString !== "string" || !mapString.length) {
      return { ok: false, error: "Nothing to paste" };
    }
    if (!rmIsAdmin()) return { ok: false, error: "Admin required" };
    if (!ChatRoomMapManager || !ChatRoomMapManager.Map || typeof ChatRoomMapManager.Map.importString !== "function") {
      return { ok: false, error: "Map import unavailable" };
    }
    let backup = null;
    try {
      if (ChatRoomData && ChatRoomData.MapData) {
        backup = typeof CommonCloneDeep === "function" ? CommonCloneDeep(ChatRoomData.MapData) : JSON.parse(JSON.stringify(ChatRoomData.MapData));
      }
    } catch (e) {
      backup = null;
    }
    if (!ChatRoomMapManager.Map.importString(mapString)) {
      return { ok: false, error: "Map paste failed" };
    }
    pushMapRoomSync(backup);
    return { ok: true };
  }
  function rmListMaps() {
    return (rmGetStore().maps || []).slice();
  }
  function rmSaveNamedMap(name, overwriteId) {
    const data = rmExportCurrentMap();
    if (!data) return { ok: false, error: "No map to save (map room required)" };
    const store = rmGetStore();
    const entry = {
      id: overwriteId || rmNewId("m"),
      name: String(name || "Untitled").trim().slice(0, 48) || "Untitled",
      data,
      savedAt: Date.now()
    };
    let maps = store.maps.slice();
    if (overwriteId) {
      const idx = maps.findIndex(function(m) {
        return m.id === overwriteId;
      });
      if (idx < 0) return { ok: false, error: "Map not found" };
      maps[idx] = entry;
    } else {
      maps.unshift(entry);
      const max = Seidr.RM_MAP_MAX || 10;
      while (maps.length > max) maps.pop();
    }
    const can = rmCanSaveMaps(maps);
    if (!can.ok) return { ok: false, error: can.error };
    store.maps = maps;
    const saved = rmSaveStore();
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true, entry };
  }
  function rmLoadNamedMap(id) {
    const entry = rmGetStore().maps.find(function(m) {
      return m.id === id;
    });
    if (!entry) return { ok: false, error: "Map not found" };
    return rmImportMapString(entry.data);
  }
  function rmDeleteNamedMap(id) {
    const store = rmGetStore();
    const next = (store.maps || []).filter(function(m) {
      return m.id !== id;
    });
    if (next.length === (store.maps || []).length) return { ok: false, error: "Map not found" };
    store.maps = next;
    const saved = rmSaveStore();
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true };
  }

  // src/roomManager/preview.ts
  var PREFIX = "SeidrRmPreview_";
  var MAX_EDGE = 280;
  function hashUrl(url) {
    let h = 0;
    for (let i = 0; i < url.length; i++) h = (h << 5) - h + url.charCodeAt(i) | 0;
    return String(h >>> 0);
  }
  function rmPreviewKey(url) {
    return PREFIX + hashUrl(url);
  }
  function rmGetCachedPreview(url) {
    try {
      return localStorage.getItem(rmPreviewKey(url));
    } catch (e) {
      return null;
    }
  }
  function rmCachePreview(url, dataUrl) {
    try {
      localStorage.setItem(rmPreviewKey(url), dataUrl);
    } catch (e) {
    }
  }
  function rmEnsurePreview(url) {
    const cached = rmGetCachedPreview(url);
    if (cached) return Promise.resolve(cached);
    return new Promise(function(resolve) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = function() {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            resolve(null);
            return;
          }
          const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          rmCachePreview(url, dataUrl);
          resolve(dataUrl);
        } catch (e) {
          resolve(url);
        }
      };
      img.onerror = function() {
        resolve(null);
      };
      img.src = url;
    });
  }

  // src/roomManager/ui.ts
  var msgTimer = null;
  function $(id) {
    return document.getElementById(id);
  }
  function setMsg(text) {
    const el = $("seidr-rm-msg");
    if (el) el.textContent = text || "";
    if (msgTimer) clearTimeout(msgTimer);
    if (text) {
      msgTimer = setTimeout(function() {
        if (el) el.textContent = "";
      }, 4e3);
    }
  }
  function refreshFooter() {
    const foot = $("seidr-rm-footer-usage");
    if (foot) foot.textContent = rmUsageLabel();
  }
  function fillSelect(sel, names, selected) {
    if (!sel) return;
    const cur = selected != null ? selected : sel.value;
    sel.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "\u2014 select \u2014";
    sel.appendChild(blank);
    names.forEach(function(n) {
      const o = document.createElement("option");
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    });
    if (cur && names.indexOf(cur) >= 0) sel.value = cur;
  }
  function promptName(title, initial) {
    const v = window.prompt(title, initial || "");
    if (v == null) return null;
    const t = v.trim();
    return t || null;
  }
  function confirmAct(msg) {
    return window.confirm(msg);
  }
  function rmUpdateApplyUi() {
    const can = rmCanApplyToRoom();
    ["seidr-rm-room-load", "seidr-rm-access-load", "seidr-rm-map-load"].forEach(function(id) {
      const el = $(id);
      if (el) {
        el.disabled = !can;
        el.title = can ? "" : "Join a chat room or open room settings to Load";
      }
    });
    document.querySelectorAll("#seidr-rm-grid [data-act='load']").forEach(function(node) {
      const b = node;
      b.disabled = !can;
      b.title = can ? "Load" : "Join a chat room or open room settings to Load";
    });
  }
  function openBgDialog(existing) {
    const overlay = document.createElement("div");
    overlay.className = "seidr-rm-overlay";
    overlay.innerHTML = [
      '<div class="seidr-rm-dialog">',
      "<h4>" + (existing ? "Edit background" : "Add background") + "</h4>",
      '<label>Name<input type="text" id="seidr-rm-bg-name" maxlength="64" /></label>',
      '<label>URL<input type="url" id="seidr-rm-bg-url" /></label>',
      '<div class="seidr-rm-msg" id="seidr-rm-bg-err"></div>',
      '<div class="seidr-rm-dialog-actions">',
      '<button type="button" data-act="cancel">Cancel</button>',
      '<button type="button" data-act="save">Save</button>',
      "</div></div>"
    ].join("");
    document.body.appendChild(overlay);
    const nameIn = overlay.querySelector("#seidr-rm-bg-name");
    const urlIn = overlay.querySelector("#seidr-rm-bg-url");
    const err = overlay.querySelector("#seidr-rm-bg-err");
    if (existing) {
      nameIn.value = existing.name;
      urlIn.value = existing.url;
    }
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    overlay.addEventListener("click", function(ev) {
      if (ev.target === overlay) close();
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener("click", close);
    overlay.querySelector('[data-act="save"]').addEventListener("click", function() {
      err.textContent = "Checking\u2026";
      rmSaveBackground(nameIn.value, urlIn.value, existing && existing.id).then(function(res) {
        if (!res.ok) {
          err.textContent = res.error || "Save failed";
          return;
        }
        close();
        setMsg("Background saved");
        rmRefreshUi();
      });
    });
  }
  var bgDragId = null;
  function clearBgDropMarkers(grid) {
    grid.querySelectorAll(".seidr-rm-drop-before, .seidr-rm-drop-after").forEach(function(el) {
      el.classList.remove("seidr-rm-drop-before", "seidr-rm-drop-after");
    });
  }
  function bindBgGridDnD(grid) {
    if (grid._seidrBgDnD) return;
    grid._seidrBgDnD = true;
    grid.addEventListener("dragstart", function(ev) {
      const t = ev.target;
      if (t.closest(".seidr-rm-card-actions")) {
        ev.preventDefault();
        return;
      }
      const card = t.closest(".seidr-rm-card");
      if (!card || !card.draggable || !card.dataset.id) {
        ev.preventDefault();
        return;
      }
      bgDragId = card.dataset.id;
      card.classList.add("seidr-rm-dragging");
      try {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", bgDragId);
      } catch (e) {
      }
    });
    grid.addEventListener("dragover", function(ev) {
      if (!bgDragId) return;
      ev.preventDefault();
      try {
        ev.dataTransfer.dropEffect = "move";
      } catch (e) {
      }
      const card = ev.target.closest(".seidr-rm-card");
      clearBgDropMarkers(grid);
      if (!card || card.dataset.id === bgDragId) return;
      const rect = card.getBoundingClientRect();
      const before = ev.clientX < rect.left + rect.width / 2;
      card.classList.add(before ? "seidr-rm-drop-before" : "seidr-rm-drop-after");
    });
    grid.addEventListener("dragleave", function(ev) {
      const rel = ev.relatedTarget;
      if (rel && grid.contains(rel)) return;
      clearBgDropMarkers(grid);
    });
    grid.addEventListener("drop", function(ev) {
      ev.preventDefault();
      const dragId = bgDragId;
      clearBgDropMarkers(grid);
      const target = ev.target.closest(".seidr-rm-card");
      if (!dragId || !target || !target.dataset.id || target.dataset.id === dragId) {
        bgDragId = null;
        return;
      }
      const cards = Array.prototype.slice.call(grid.querySelectorAll(".seidr-rm-card"));
      const ids = cards.map(function(c) {
        return c.dataset.id || "";
      }).filter(Boolean);
      const from = ids.indexOf(dragId);
      let to = ids.indexOf(target.dataset.id);
      if (from < 0 || to < 0) {
        bgDragId = null;
        return;
      }
      const rect = target.getBoundingClientRect();
      const after = ev.clientX >= rect.left + rect.width / 2;
      ids.splice(from, 1);
      to = ids.indexOf(target.dataset.id);
      if (after) to += 1;
      ids.splice(to, 0, dragId);
      bgDragId = null;
      const ok = rmReorderBackgrounds(ids);
      setMsg(ok ? "Backgrounds reordered" : "Reorder failed");
      if (ok) rmRefreshUi();
    });
    grid.addEventListener("dragend", function() {
      bgDragId = null;
      clearBgDropMarkers(grid);
      grid.querySelectorAll(".seidr-rm-dragging").forEach(function(el) {
        el.classList.remove("seidr-rm-dragging");
      });
    });
  }
  function renderBgGrid() {
    const grid = $("seidr-rm-grid");
    const filter = $("seidr-rm-bg-filter");
    if (!grid) return;
    bindBgGridDnD(grid);
    const q = (filter && filter.value || "").trim().toLowerCase();
    const canDrag = !q;
    const list = rmListBackgrounds().filter(function(b) {
      return !q || (b.name || "").toLowerCase().indexOf(q) >= 0;
    });
    grid.innerHTML = "";
    const canLoad = rmCanApplyToRoom();
    list.forEach(function(b) {
      const card = document.createElement("div");
      card.className = "seidr-rm-card";
      card.dataset.id = b.id;
      if (canDrag) card.draggable = true;
      card.innerHTML = [
        '<img class="seidr-rm-card-thumb" alt="" draggable="false" />',
        '<div class="seidr-rm-card-name"></div>',
        '<div class="seidr-rm-card-actions">',
        '<button type="button" data-act="load" title="Load">\u2B07</button>',
        '<button type="button" data-act="edit" title="Edit">\u270E</button>',
        '<button type="button" data-act="del" title="Delete">\xD7</button>',
        "</div>"
      ].join("");
      card.querySelector(".seidr-rm-card-name").textContent = b.name;
      const img = card.querySelector("img");
      img.alt = b.name;
      rmEnsurePreview(b.url).then(function(src) {
        if (src) img.src = src;
      });
      const loadBtn = card.querySelector('[data-act="load"]');
      loadBtn.disabled = !canLoad;
      if (!canLoad) loadBtn.title = "Join a chat room or open room settings to Load";
      loadBtn.addEventListener("click", function() {
        if (!rmCanApplyToRoom()) {
          setMsg("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const r = rmApplyBackgroundUrl(b.url);
        setMsg(r.ok ? "Background applied" : r.error || "Failed");
      });
      card.querySelector('[data-act="edit"]').addEventListener("click", function() {
        openBgDialog(b);
      });
      card.querySelector('[data-act="del"]').addEventListener("click", function() {
        if (!confirmAct("Delete background \u201C" + b.name + "\u201D?")) return;
        const ok = rmDeleteBackground(b.id);
        setMsg(ok ? "Background deleted" : "Delete failed");
        rmRefreshUi();
      });
      grid.appendChild(card);
    });
  }
  function renderMaps() {
    const wrap = $("seidr-rm-maps-wrap");
    const sel = $("seidr-rm-map-sel");
    if (!wrap) return;
    const show = rmMapModeActive();
    wrap.classList.toggle("seidr-rm-hidden", !show);
    if (!show || !sel) return;
    const maps = rmListMaps();
    const names = maps.map(function(m) {
      return m.name;
    }).sort();
    const byName = {};
    maps.forEach(function(m) {
      byName[m.name] = m.id;
    });
    sel._rmMapIds = byName;
    fillSelect(sel, names);
  }
  function rmBuildPanelBody() {
    const body = $("seidr-rm-body");
    if (!body) return;
    body.innerHTML = [
      '<section class="seidr-rm-sec">',
      "<h3>1. Room Definition</h3>",
      '<div class="seidr-rm-row">',
      '<select id="seidr-rm-room-sel"></select>',
      '<button type="button" data-rm="room-save">Save as\u2026</button>',
      '<button type="button" data-rm="room-overwrite">Overwrite</button>',
      '<button type="button" data-rm="room-load" id="seidr-rm-room-load">Load</button>',
      '<button type="button" data-rm="room-delete">Delete</button>',
      "</div></section>",
      '<section class="seidr-rm-sec">',
      "<h3>2. Room Access</h3>",
      '<div class="seidr-rm-row">',
      '<select id="seidr-rm-access-sel"></select>',
      '<button type="button" data-rm="access-save">Save as\u2026</button>',
      '<button type="button" data-rm="access-overwrite">Overwrite</button>',
      '<button type="button" data-rm="access-load" id="seidr-rm-access-load">Load \u2192 room</button>',
      '<button type="button" data-rm="access-delete">Delete</button>',
      "</div></section>",
      '<section class="seidr-rm-sec seidr-rm-sec-grow">',
      "<h3>3. Backgrounds</h3>",
      '<div class="seidr-rm-row">',
      '<button type="button" data-rm="bg-add">+ Save / Add</button>',
      '<input type="search" id="seidr-rm-bg-filter" placeholder="Filter\u2026" style="flex:1;min-width:120px;" />',
      "</div>",
      '<div class="seidr-rm-grid" id="seidr-rm-grid"></div>',
      "</section>",
      '<section class="seidr-rm-sec" id="seidr-rm-maps-wrap">',
      "<h3>4. Maps</h3>",
      '<div class="seidr-rm-row">',
      '<select id="seidr-rm-map-sel"></select>',
      '<button type="button" data-rm="map-save-as">Save as\u2026</button>',
      '<button type="button" data-rm="map-overwrite">Overwrite</button>',
      '<button type="button" data-rm="map-load" id="seidr-rm-map-load">Load</button>',
      '<button type="button" class="seidr-rm-icon-act" data-rm="map-delete" title="Delete">\xD7</button>',
      "</div></section>"
    ].join("");
    body.addEventListener("click", function(ev) {
      const t = ev.target.closest("[data-rm]");
      if (!t) return;
      const act2 = t.getAttribute("data-rm");
      const store = rmGetStore();
      if (act2 === "room-save") {
        const name = promptName("Save room config as:");
        if (!name) return;
        if (store.room[name] && !confirmAct("Overwrite \u201C" + name + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg("No room data");
          return;
        }
        store.room[name] = rmSliceRoom(settings);
        const s = rmSaveStore();
        setMsg(s.ok ? "Room config saved" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "room-overwrite") {
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg("Select a config");
          return;
        }
        if (!confirmAct("Overwrite \u201C" + sel.value + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg("No room data");
          return;
        }
        store.room[sel.value] = rmSliceRoom(settings);
        const s = rmSaveStore();
        setMsg(s.ok ? "Overwritten" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "room-load") {
        if (!rmCanApplyToRoom()) {
          setMsg("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg("Select a config");
          return;
        }
        const preset = store.room[sel.value];
        if (!preset) {
          setMsg("Not found");
          return;
        }
        rmApplyRoomToEditor(preset);
        if (rmInLiveRoom()) {
          const u = rmUpdateLiveRoom();
          setMsg(u.ok ? "Room config loaded + updated" : u.error || "Applied to editor");
        } else {
          setMsg("Filled ChatAdmin fields");
        }
      } else if (act2 === "room-delete") {
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg("Select a config");
          return;
        }
        if (!confirmAct("Delete room config \u201C" + sel.value + "\u201D?")) return;
        delete store.room[sel.value];
        const s = rmSaveStore();
        setMsg(s.ok ? "Deleted" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-save") {
        const name = promptName("Save access list as:");
        if (!name) return;
        if (store.access[name] && !confirmAct("Overwrite \u201C" + name + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg("No room data");
          return;
        }
        store.access[name] = rmSliceAccess(settings);
        const s = rmSaveStore();
        setMsg(s.ok ? "Access saved" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-overwrite") {
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg("Select access");
          return;
        }
        if (!confirmAct("Overwrite \u201C" + sel.value + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg("No room data");
          return;
        }
        store.access[sel.value] = rmSliceAccess(settings);
        const s = rmSaveStore();
        setMsg(s.ok ? "Overwritten" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-load") {
        if (!rmCanApplyToRoom()) {
          setMsg("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg("Select access");
          return;
        }
        const preset = store.access[sel.value];
        if (!preset) {
          setMsg("Not found");
          return;
        }
        rmApplyAccessToEditor(preset);
        if (rmInLiveRoom()) {
          const u = rmUpdateLiveRoom();
          setMsg(u.ok ? "Access loaded + room updated" : u.error || "Applied");
        } else {
          setMsg("Filled access lists in ChatAdmin");
        }
      } else if (act2 === "access-delete") {
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg("Select access");
          return;
        }
        if (!confirmAct("Delete access list \u201C" + sel.value + "\u201D?")) return;
        delete store.access[sel.value];
        const s = rmSaveStore();
        setMsg(s.ok ? "Deleted" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "bg-add") {
        openBgDialog();
      } else if (act2 === "map-save-as") {
        const name = promptName("Save map as:");
        if (!name) return;
        const maps = rmListMaps();
        const existing = maps.find(function(m) {
          return m.name === name;
        });
        if (existing && !confirmAct("Overwrite \u201C" + name + "\u201D?")) return;
        const r = rmSaveNamedMap(name, existing && existing.id);
        setMsg(r.ok ? "Map saved" : r.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "map-overwrite") {
        const sel = $("seidr-rm-map-sel");
        if (!sel || !sel.value) {
          setMsg("Select a map");
          return;
        }
        if (!confirmAct("Overwrite map \u201C" + sel.value + "\u201D with the current room map?")) return;
        const ids = sel._rmMapIds;
        const id = ids && ids[sel.value];
        const r = rmSaveNamedMap(sel.value, id);
        setMsg(r.ok ? "Overwritten" : r.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "map-load") {
        if (!rmCanApplyToRoom()) {
          setMsg("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const sel = $("seidr-rm-map-sel");
        if (!sel || !sel.value) {
          setMsg("Select a map");
          return;
        }
        if (!confirmAct("Load map \u201C" + sel.value + "\u201D into this room?")) return;
        const ids = sel._rmMapIds;
        const id = ids && ids[sel.value];
        if (!id) {
          setMsg("Not found");
          return;
        }
        const r = rmLoadNamedMap(id);
        setMsg(r.ok ? "Map loaded" : r.error || "Failed");
      } else if (act2 === "map-delete") {
        const sel = $("seidr-rm-map-sel");
        if (!sel || !sel.value) {
          setMsg("Select a map");
          return;
        }
        if (!confirmAct("Delete map \u201C" + sel.value + "\u201D?")) return;
        const ids = sel._rmMapIds;
        const id = ids && ids[sel.value];
        if (!id) {
          setMsg("Not found");
          return;
        }
        const r = rmDeleteNamedMap(id);
        setMsg(r.ok ? "Map deleted" : r.error || "Failed");
        rmRefreshUi();
      }
    });
    const filter = $("seidr-rm-bg-filter");
    if (filter) {
      filter.addEventListener("input", function() {
        renderBgGrid();
      });
    }
  }
  function rmRefreshUi() {
    const store = rmGetStore();
    fillSelect($("seidr-rm-room-sel"), Object.keys(store.room).sort());
    fillSelect($("seidr-rm-access-sel"), Object.keys(store.access).sort());
    renderBgGrid();
    renderMaps();
    refreshFooter();
    rmUpdateApplyUi();
  }
  Seidr.rmRefreshUi = rmRefreshUi;
  Seidr.rmUpdateApplyUi = rmUpdateApplyUi;

  // src/roomManager/shell.ts
  var root = null;
  var btn = null;
  var panel = null;
  var sessionBtnPos = null;
  var dragMoved = false;
  var BTN = 44;
  var PAD = 16;
  function chatLogRect() {
    const el = document.getElementById("TextAreaChatLog");
    if (!el) return null;
    return el.getBoundingClientRect();
  }
  function clampPanel() {
    if (!panel) return;
    const pad = 8;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    let left = panel.offsetLeft;
    let top = panel.offsetTop;
    if (panel.style.left) left = parseFloat(panel.style.left) || left;
    if (panel.style.top) top = parseFloat(panel.style.top) || top;
    const maxL = Math.max(pad, window.innerWidth - w - pad);
    const maxT = Math.max(pad, window.innerHeight - h - pad);
    left = Math.min(Math.max(pad, left), maxL);
    top = Math.min(Math.max(pad, top), maxT);
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
  }
  function applyDefaultPanelGeometry() {
    if (!panel) return;
    const store = rmGetStore();
    const ui = store.ui || {};
    if (ui.w && ui.h && ui.x != null && ui.y != null) {
      panel.style.width = ui.w + "px";
      panel.style.height = ui.h + "px";
      panel.style.left = ui.x + "px";
      panel.style.top = ui.y + "px";
      panel.style.right = "auto";
      clampPanel();
      return;
    }
    const rect = chatLogRect();
    if (rect && rect.width > 80 && rect.height > 80) {
      panel.style.width = Math.max(480, Math.min(rect.width, window.innerWidth - 16)) + "px";
      panel.style.height = Math.max(360, Math.min(rect.height, window.innerHeight - 16)) + "px";
      panel.style.left = Math.max(8, rect.left) + "px";
      panel.style.top = Math.max(8, rect.top) + "px";
      panel.style.right = "auto";
    }
    clampPanel();
  }
  function persistPanelGeometry() {
    if (!panel || !panel.classList.contains("seidr-rm-open")) return;
    const store = rmGetStore();
    store.ui = {
      x: parseFloat(panel.style.left) || panel.offsetLeft,
      y: parseFloat(panel.style.top) || panel.offsetTop,
      w: panel.offsetWidth,
      h: panel.offsetHeight
    };
    rmSaveStore();
  }
  function makeDraggable(el, onEnd) {
    let ox = 0;
    let oy = 0;
    let startX = 0;
    let startY = 0;
    function down(ev) {
      const t = ev.target;
      if (t !== el && t.closest && t.closest("button, select, input, a")) return;
      dragMoved = false;
      startX = ev.clientX;
      startY = ev.clientY;
      const r = el.getBoundingClientRect();
      ox = ev.clientX - r.left;
      oy = ev.clientY - r.top;
      el.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
    function move(ev) {
      if (!el.hasPointerCapture(ev.pointerId)) return;
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) dragMoved = true;
      el.style.left = ev.clientX - ox + "px";
      el.style.top = ev.clientY - oy + "px";
      el.style.right = "auto";
    }
    function up(ev) {
      if (!el.hasPointerCapture(ev.pointerId)) return;
      el.releasePointerCapture(ev.pointerId);
      if (onEnd) onEnd();
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }
  function setBtnXY(x, y) {
    if (!btn) return;
    const maxX = Math.max(8, window.innerWidth - BTN - 8);
    const maxY = Math.max(8, window.innerHeight - BTN - 8);
    btn.style.left = Math.min(Math.max(8, x), maxX) + "px";
    btn.style.top = Math.min(Math.max(8, y), maxY) + "px";
    btn.style.right = "auto";
  }
  function applyLauncherPosition(pos) {
    if (!btn) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const chat = chatLogRect();
    if (pos === "chatLeft" || pos === "chatTop" || pos === "chatBottom") {
      if (chat && chat.width > 40) {
        const x = chat.left - BTN - 8;
        let y;
        if (pos === "chatTop") y = chat.top + 8;
        else if (pos === "chatBottom") y = chat.bottom - BTN - 8;
        else y = chat.top + chat.height / 2 - BTN / 2;
        setBtnXY(x, y);
        return;
      }
      setBtnXY(vw - BTN - PAD, vh * 0.42);
      return;
    }
    const leftX = PAD;
    const rightX = vw - BTN - PAD;
    const topY = PAD;
    const bottomY = vh - BTN - PAD;
    const midY = vh / 2 - BTN / 2;
    switch (pos) {
      case "topLeft":
        setBtnXY(leftX, topY);
        break;
      case "topRight":
        setBtnXY(rightX, topY);
        break;
      case "bottomLeft":
        setBtnXY(leftX, bottomY);
        break;
      case "bottomRight":
        setBtnXY(rightX, bottomY);
        break;
      case "middleLeft":
        setBtnXY(leftX, midY);
        break;
      case "middleRight":
        setBtnXY(rightX, midY);
        break;
      default:
        setBtnXY(rightX, midY);
        break;
    }
  }
  function placeBtnDefault() {
    if (!btn) return;
    if (sessionBtnPos) {
      setBtnXY(sessionBtnPos.x, sessionBtnPos.y);
      return;
    }
    const settings = seidrGetSettings();
    applyLauncherPosition(settings.launcherPosition || "chatTop");
  }
  function rmOnChatRoomScreen() {
    try {
      return typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
    } catch (e) {
      return false;
    }
  }
  function rmNoCharacterDialog() {
    try {
      return typeof CurrentCharacter === "undefined" || CurrentCharacter == null;
    } catch (e) {
      return true;
    }
  }
  function rmClearSessionBtnPos() {
    sessionBtnPos = null;
  }
  var enterPlaceTimers = [];
  function clearEnterPlaceTimers() {
    enterPlaceTimers.forEach(function(t) {
      clearTimeout(t);
    });
    enterPlaceTimers = [];
  }
  function isChatAnchorPos(pos) {
    return pos === "chatLeft" || pos === "chatTop" || pos === "chatBottom";
  }
  function chatLogReady() {
    const r = chatLogRect();
    return !!(r && r.width > 40);
  }
  function rmEnterLiveRoomPlacement() {
    clearEnterPlaceTimers();
    rmClearSessionBtnPos();
    rmEnsureShell();
    rmUpdateLauncherVisibility();
    placeBtnDefault();
    const pos = seidrGetSettings().launcherPosition || "chatTop";
    if (!isChatAnchorPos(pos) || chatLogReady()) return;
    const delays = [100, 300, 800];
    delays.forEach(function(ms, i) {
      enterPlaceTimers.push(setTimeout(function() {
        if (sessionBtnPos) {
          clearEnterPlaceTimers();
          return;
        }
        const last = i === delays.length - 1;
        if (!chatLogReady() && !last) return;
        placeBtnDefault();
        if (chatLogReady() || last) clearEnterPlaceTimers();
      }, ms));
    });
  }
  function rmOnSettingsChanged() {
    clearEnterPlaceTimers();
    rmClearSessionBtnPos();
    rmUpdateLauncherVisibility();
  }
  function rmEnsureShell() {
    rmInjectStyles();
    if (root && document.body.contains(root)) return;
    root = document.createElement("div");
    root.id = "seidr-rm-root";
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "seidr-rm-btn";
    btn.title = "Room Manager";
    btn.setAttribute("aria-label", "Room Manager");
    btn.textContent = "\u2302";
    panel = document.createElement("div");
    panel.id = "seidr-rm-panel";
    panel.innerHTML = [
      '<div class="seidr-rm-header">',
      '  <div class="seidr-rm-header-title">Room Manager<span>Dev</span></div>',
      '  <button type="button" class="seidr-rm-icon-btn" data-rm="close" title="Close">\xD7</button>',
      "</div>",
      '<div class="seidr-rm-body" id="seidr-rm-body"></div>',
      '<div class="seidr-rm-footer" id="seidr-rm-footer">',
      '  <span class="seidr-rm-msg" id="seidr-rm-msg"></span>',
      '  <span class="seidr-rm-footer-usage" id="seidr-rm-footer-usage">Storage: \u2014</span>',
      "</div>"
    ].join("");
    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);
    ["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"].forEach(function(type) {
      root.addEventListener(type, function(ev) {
        ev.stopPropagation();
      });
    });
    makeDraggable(btn, function() {
      if (!btn) return;
      sessionBtnPos = {
        x: parseFloat(btn.style.left) || btn.offsetLeft,
        y: parseFloat(btn.style.top) || btn.offsetTop
      };
    });
    const header = panel.querySelector(".seidr-rm-header");
    (function() {
      let ox = 0;
      let oy = 0;
      header.addEventListener("pointerdown", function(ev) {
        if (ev.target.closest("button")) return;
        const r = panel.getBoundingClientRect();
        ox = ev.clientX - r.left;
        oy = ev.clientY - r.top;
        header.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
      header.addEventListener("pointermove", function(ev) {
        if (!header.hasPointerCapture(ev.pointerId)) return;
        panel.style.left = ev.clientX - ox + "px";
        panel.style.top = ev.clientY - oy + "px";
        panel.style.right = "auto";
      });
      header.addEventListener("pointerup", function(ev) {
        if (!header.hasPointerCapture(ev.pointerId)) return;
        header.releasePointerCapture(ev.pointerId);
        clampPanel();
        persistPanelGeometry();
      });
    })();
    btn.addEventListener("pointerup", function() {
      if (dragMoved) return;
      rmTogglePanel();
    });
    panel.querySelector('[data-rm="close"]').addEventListener("click", function() {
      rmClosePanel();
    });
    const ro = new ResizeObserver(function() {
      clampPanel();
      persistPanelGeometry();
    });
    ro.observe(panel);
    rmBuildPanelBody();
  }
  function rmUpdateLauncherVisibility() {
    const s = seidrGetSettings();
    const enabled = s.roomManagerEnabled !== false;
    const quickmenu = s.showQuickmenuButton !== false;
    if (!Seidr.SHOW_ROOM_MANAGER || !enabled || !quickmenu) {
      if (btn) btn.classList.remove("seidr-rm-visible");
      return;
    }
    rmEnsureShell();
    const show = rmOnChatRoomScreen() && rmIsAdmin() && rmNoCharacterDialog();
    if (btn) {
      btn.classList.toggle("seidr-rm-visible", show);
      if (show) placeBtnDefault();
    }
  }
  function rmOpenPanel() {
    rmEnsureShell();
    if (!panel) return;
    try {
      applyDefaultPanelGeometry();
    } catch (e) {
    }
    panel.classList.add("seidr-rm-open");
    panel.removeAttribute("hidden");
    try {
      rmRefreshUi();
    } catch (e) {
      console.warn("[Seidr RM] refresh", e);
    }
    try {
      if (typeof Seidr.rmUpdateApplyUi === "function") Seidr.rmUpdateApplyUi();
    } catch (e) {
    }
  }
  function rmClosePanel() {
    if (!panel) return;
    persistPanelGeometry();
    panel.classList.remove("seidr-rm-open");
    panel.setAttribute("hidden", "true");
  }
  function rmTogglePanel() {
    if (panel && panel.classList.contains("seidr-rm-open")) rmClosePanel();
    else rmOpenPanel();
  }
  function rmDestroyShell() {
    rmClosePanel();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = btn = panel = null;
    const st = document.getElementById("seidr-rm-styles");
    if (st && st.parentNode) st.parentNode.removeChild(st);
  }
  Seidr.rmOpenPanel = rmOpenPanel;
  Seidr.rmClosePanel = rmClosePanel;
  Seidr.rmOnSettingsChanged = rmOnSettingsChanged;
  Seidr.rmClearSessionBtnPos = rmClearSessionBtnPos;
  Seidr.rmEnterLiveRoomPlacement = rmEnterLiveRoomPlacement;

  // src/roomManager/chatAdminBtn.ts
  function hasBcx() {
    try {
      return typeof window.bcx !== "undefined" && window.bcx != null;
    } catch (e) {
      return false;
    }
  }
  function getEntryButtonRect() {
    const size = 64;
    const y = 132 + Math.floor((90 - size) / 2);
    if (hasBcx()) return { x: 222, y, w: size, h: size };
    return { x: 124, y, w: size, h: size };
  }
  function nativeChatAdminVisible() {
    try {
      if (typeof CurrentScreen !== "undefined" && CurrentScreen !== "ChatAdmin") return false;
      if (typeof ChatAdminPreviewBackgroundMode !== "undefined" && ChatAdminPreviewBackgroundMode) {
        return false;
      }
    } catch (e) {
      return false;
    }
    const el = document.getElementById("InputName");
    if (!el) return false;
    if (el.hasAttribute("hidden")) return false;
    if (el.style && el.style.display === "none") return false;
    return true;
  }
  function rmChatAdminBtnAllowed() {
    if (!rmIsShown()) return false;
    if (seidrGetSettings().roomManagerEnabled === false) return false;
    return nativeChatAdminVisible();
  }
  function rmChatAdminDrawButton() {
    if (!rmChatAdminBtnAllowed()) return;
    if (typeof DrawButton !== "function") return;
    const r = getEntryButtonRect();
    DrawButton(r.x, r.y, r.w, r.h, "", "White", "Icons/Preference.png");
    try {
      if (typeof MouseIn === "function" && MouseIn(r.x, r.y, r.w, r.h) && typeof DrawButtonHover === "function") {
        DrawButtonHover(r.x, r.y, r.w, r.h, "Room Manager");
      }
    } catch (e) {
    }
  }
  function rmChatAdminClickButton() {
    if (!rmChatAdminBtnAllowed()) return false;
    try {
      const r = getEntryButtonRect();
      if (typeof MouseIn === "function" && MouseIn(r.x, r.y, r.w, r.h)) {
        rmOpenPanel();
        return true;
      }
    } catch (e) {
    }
    return false;
  }
  Seidr.rmChatAdminDrawButton = rmChatAdminDrawButton;
  Seidr.rmChatAdminClickButton = rmChatAdminClickButton;

  // src/roomManager/index.ts
  var installed2 = false;
  var tick = null;
  function onScreenTick() {
    rmUpdateLauncherVisibility();
    try {
      rmUpdateApplyUi();
    } catch (e) {
    }
  }
  function rmInstall() {
    if (!rmIsShown()) return;
    if (installed2) {
      rmUpdateLauncherVisibility();
      return;
    }
    installed2 = true;
    rmInvalidateStore();
    rmEnsureShell();
    rmUpdateLauncherVisibility();
    Seidr.tryHook("ChatAdminRun", "ChatAdminRun", 12, function(args, next) {
      const ret = next(args);
      try {
        rmChatAdminDrawButton();
      } catch (e) {
      }
      try {
        rmUpdateLauncherVisibility();
      } catch (e) {
      }
      return ret;
    });
    Seidr.tryHook("ChatAdminClick", "ChatAdminClick", 20, function(args, next) {
      try {
        if (rmChatAdminClickButton()) return;
      } catch (e) {
      }
      return next(args);
    });
    Seidr.tryHook("ChatAdminExit", "ChatAdminExit", 0, function(args, next) {
      const ret = next(args);
      try {
        rmEnterLiveRoomPlacement();
      } catch (e) {
      }
      try {
        rmUpdateApplyUi();
      } catch (e) {
      }
      return ret;
    });
    Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 5, function(args, next) {
      const ret = next(args);
      try {
        rmEnterLiveRoomPlacement();
      } catch (e) {
      }
      return ret;
    });
    Seidr.tryHook("ChatRoomSync", "ChatRoomSync", 0, function(args, next) {
      const ret = next(args);
      try {
        rmUpdateLauncherVisibility();
      } catch (e) {
      }
      return ret;
    });
    Seidr.tryHook("CharacterSetCurrent", "CharacterSetCurrent", 0, function(args, next) {
      const ret = next(args);
      try {
        rmUpdateLauncherVisibility();
      } catch (e) {
      }
      return ret;
    });
    Seidr.tryHook("DialogLeave", "DialogLeave", 0, function(args, next) {
      const ret = next(args);
      try {
        rmUpdateLauncherVisibility();
      } catch (e) {
      }
      return ret;
    });
    if (tick) clearInterval(tick);
    tick = setInterval(onScreenTick, 1e3);
    window.addEventListener("resize", function() {
      try {
        rmUpdateLauncherVisibility();
      } catch (e) {
      }
    });
  }
  function rmUninstall() {
    if (tick) {
      clearInterval(tick);
      tick = null;
    }
    rmDestroyShell();
    installed2 = false;
  }
  Seidr.installRoomManager = rmInstall;
  Seidr.uninstallRoomManager = rmUninstall;

  // src/settings/drawOffsets.ts
  function seidrApplyDrawOffsets(raw) {
    const next = seidrNormalizeDrawOffsets(raw);
    Seidr.drawOffsets = seidrCloneDrawOffsets(next);
    return Seidr.drawOffsets;
  }
  function seidrLoadCommittedDrawOffsets() {
    return seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
  }
  Seidr.seidrDefaultDrawOffsets = seidrDefaultDrawOffsets;
  Seidr.seidrApplyDrawOffsets = seidrApplyDrawOffsets;
  Seidr.seidrLoadCommittedDrawOffsets = seidrLoadCommittedDrawOffsets;

  // src/settings/styles.ts
  function seidrSettingsCss() {
    return [
      "#seidr-settings-root { position: fixed; inset: 0; z-index: 119; pointer-events: none; }",
      "#seidr-settings-root * { box-sizing: border-box; }",
      "#seidr-settings-panel {",
      "  pointer-events: auto; position: fixed; z-index: 120;",
      "  display: none; flex-direction: column;",
      "  width: min(92vw, 460px); height: min(85vh, 640px);",
      "  min-width: 300px; min-height: 240px;",
      "  max-width: calc(100vw - 16px); max-height: calc(100vh - 16px);",
      "  background: rgba(28, 22, 38, 0.96); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
      "  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
      "  overflow: hidden; resize: both;",
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
      ".seidr-settings-tabs {",
      "  flex-shrink: 0; display: flex; gap: 4px; padding: 8px 10px 0;",
      "  background: rgba(42, 34, 56, 0.95); border-bottom: 1px solid rgba(255,255,255,0.1);",
      "}",
      ".seidr-settings-tab {",
      "  background: transparent; color: #a898b0; border: 1px solid transparent;",
      "  border-radius: 6px 6px 0 0; padding: 6px 12px; cursor: pointer;",
      "  font: inherit; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;",
      "}",
      ".seidr-settings-tab:hover { color: #d4a017; }",
      ".seidr-settings-tab-on {",
      "  color: #d4a017; border-color: rgba(255,255,255,0.12); border-bottom-color: transparent;",
      "  background: rgba(28, 22, 38, 0.96);",
      "}",
      ".seidr-settings-body {",
      "  flex: 1; min-height: 0; overflow: auto; padding: 12px 14px;",
      "  display: flex; flex-direction: column; gap: 14px;",
      "  scrollbar-width: thin;",
      "  scrollbar-color: rgba(212,160,23,0.55) rgba(20,16,28,0.9);",
      "}",
      ".seidr-settings-pane { display: none; flex-direction: column; gap: 14px; }",
      ".seidr-settings-pane-on { display: flex; }",
      ".seidr-settings-body::-webkit-scrollbar { width: 8px; }",
      ".seidr-settings-body::-webkit-scrollbar-track {",
      "  background: rgba(20,16,28,0.9); border-radius: 4px;",
      "}",
      ".seidr-settings-body::-webkit-scrollbar-thumb {",
      "  background: rgba(212,160,23,0.55); border-radius: 4px;",
      "}",
      ".seidr-settings-body::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(212,160,23,0.8);",
      "}",
      ".seidr-settings-sec {",
      "  background: rgba(42, 34, 56, 0.85); border: 1px solid rgba(255,255,255,0.1);",
      "  border-radius: 6px; padding: 10px;",
      "}",
      ".seidr-settings-sec > summary {",
      "  margin: 0; font-size: 11px; letter-spacing: 0.05em;",
      "  text-transform: uppercase; color: #d4a017;",
      "  cursor: pointer; list-style: none; user-select: none;",
      "  display: flex; align-items: center; gap: 6px;",
      "}",
      ".seidr-settings-sec > summary::-webkit-details-marker { display: none; }",
      ".seidr-settings-sec > summary::before {",
      '  content: "\u25B8"; display: inline-block; width: 0.9em; color: #d4a017;',
      "  transition: transform 0.12s ease;",
      "}",
      ".seidr-settings-sec[open] > summary::before { transform: rotate(90deg); }",
      ".seidr-settings-sec[open] > summary { margin-bottom: 8px; }",
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
      ".seidr-settings-field-row {",
      "  display: flex; flex-wrap: nowrap; gap: 8px; align-items: center;",
      "}",
      ".seidr-settings-field-label {",
      "  flex: 0 0 72px; font-size: 12px; color: #f0e6d4; line-height: 1.35;",
      "}",
      ".seidr-set-storage-bar {",
      "  height: 6px; margin: 6px 0 10px; border-radius: 3px;",
      "  background: rgba(20,16,28,0.9); border: 1px solid rgba(255,255,255,0.1);",
      "  overflow: hidden;",
      "}",
      ".seidr-set-storage-bar-fill {",
      "  height: 100%; width: 0%; background: #d4a017;",
      "  transition: width 0.15s ease;",
      "}",
      ".seidr-set-storage-rows { display: flex; flex-direction: column; gap: 4px; }",
      ".seidr-set-storage-row .seidr-settings-field-label { flex: 1; }",
      ".seidr-set-storage-val {",
      "  flex: 0 0 auto; font-size: 12px; color: #c8b8a0; font-variant-numeric: tabular-nums;",
      "}",
      ".seidr-settings-field-row select {",
      "  flex: 1; min-width: 0;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4; border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 6px 8px;",
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
      ".seidr-settings-draw-row {",
      "  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;",
      "  margin-top: 8px;",
      "}",
      ".seidr-settings-draw-label {",
      "  flex: 0 0 88px; font-size: 12px; color: #f0e6d4;",
      "}",
      ".seidr-settings-draw-field {",
      "  display: flex; align-items: center; gap: 4px; font-size: 11px; color: #a898b0;",
      "  flex: 0 0 auto; cursor: default;",
      "}",
      '.seidr-settings-draw-field input[type="number"] {',
      "  width: 72px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 6px;",
      "}",
      ".seidr-settings-draw-row button {",
      "  background: rgba(60,48,80,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 10px; cursor: pointer;",
      "}",
      ".seidr-settings-draw-row button:hover { border-color: #d4a017; }",
      ".seidr-settings-draw-actions { margin-top: 10px; }",
      ".seidr-settings-hint {",
      "  margin: 6px 0 0; font-size: 11px; color: #a898b0;",
      "}",
      '.seidr-settings-field-row input[type="text"] {',
      "  flex: 1; min-width: 0;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "}",
      ".seidr-act-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }",
      ".seidr-act-list-item {",
      "  text-align: left; background: rgba(42,34,56,0.85); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px 10px; cursor: pointer;",
      "}",
      ".seidr-act-list-item:hover, .seidr-act-list-on { border-color: #d4a017; }",
      ".seidr-act-editor { margin-top: 12px; }",
      ".seidr-act-slots { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }",
      ".seidr-act-slot {",
      "  background: rgba(20,16,28,0.9); color: #a898b0;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 4px 8px; cursor: pointer;",
      "  font: inherit; font-size: 11px;",
      "}",
      ".seidr-act-slot-on { color: #f0e6d4; border-color: #d4a017; background: rgba(60,48,80,0.9); }",
      ".seidr-act-group {",
      "  margin-top: 8px; padding: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;",
      "  background: rgba(20,16,28,0.45);",
      "}",
      ".seidr-act-group-head { font-size: 11px; color: #d4a017; margin-bottom: 6px; }",
      ".seidr-act-rule {",
      "  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 6px;",
      "}",
      ".seidr-act-rule select {",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4; border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 6px; max-width: 140px;",
      "}",
      ".seidr-act-ph-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }",
      ".seidr-act-ph {",
      "  background: rgba(20,16,28,0.9); color: #c8b8a0;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 3px 6px;",
      "  cursor: pointer; font: inherit; font-size: 10px;",
      "}",
      ".seidr-act-ph:hover { border-color: #d4a017; color: #f0e6d4; }",
      "#seidr-act-chat-other, #seidr-act-chat-self {",
      "  width: 100%; box-sizing: border-box; margin-top: 4px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "  font: inherit; resize: vertical;",
      "}",
      ".seidr-act-btn {",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px;",
      "  padding: 5px 10px; cursor: pointer; font: inherit; font-size: 12px;",
      "}",
      ".seidr-act-btn:hover { border-color: #d4a017; color: #d4a017; }",
      ".seidr-act-btn-danger:hover { border-color: #c06060; color: #e09090; }",
      ".seidr-act-btn-icon { padding: 2px 8px; min-width: 28px; }",
      ".seidr-act-arousal-picker { margin-top: 8px; position: relative; }",
      ".seidr-act-arousal-toggle {",
      "  display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;",
      "  text-align: left; cursor: pointer; font: inherit;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 8px 10px;",
      "}",
      ".seidr-act-arousal-toggle:hover, .seidr-act-arousal-open .seidr-act-arousal-toggle {",
      "  border-color: #d4a017;",
      "}",
      ".seidr-act-arousal-toggle-lab {",
      "  font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: #d4a017;",
      "}",
      ".seidr-act-arousal-toggle strong { flex: 1; color: #f0e6d4; font-weight: 600; }",
      ".seidr-act-arousal-caret { color: #a898b0; font-size: 11px; }",
      ".seidr-act-arousal-dropdown {",
      "  margin-top: 6px; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;",
      "  background: rgba(20,16,28,0.96); padding: 8px;",
      "}",
      "#seidr-act-arousal-filter {",
      "  width: 100%; box-sizing: border-box;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "  font: inherit;",
      "}",
      ".seidr-act-arousal-results {",
      "  margin-top: 6px; max-height: 200px; overflow-y: auto;",
      "}",
      ".seidr-act-arousal-group {",
      "  font-size: 11px; color: #d4a017; padding: 6px 8px 2px; margin-top: 2px;",
      "}",
      ".seidr-act-arousal-opt {",
      "  display: block; width: 100%; text-align: left; box-sizing: border-box;",
      "  background: transparent; color: #f0e6d4;",
      "  border: 1px solid transparent; border-radius: 4px; padding: 5px 8px;",
      "  cursor: pointer; font: inherit; font-size: 12px;",
      "}",
      ".seidr-act-arousal-opt:hover { background: rgba(60,48,80,0.7); }",
      ".seidr-act-arousal-opt-on { border-color: #d4a017; background: rgba(60,48,80,0.9); }",
      ".seidr-act-items { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }",
      ".seidr-act-item-chip {",
      "  background: rgba(60,48,80,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(212,160,23,0.45); border-radius: 4px;",
      "  padding: 4px 8px; cursor: pointer; font: inherit; font-size: 11px;",
      "}",
      ".seidr-act-item-chip:hover { border-color: #c06060; color: #e09090; }",
      ".seidr-act-items-picker { margin-top: 6px; }",
      ".seidr-act-items-dropdown {",
      "  margin-top: 6px; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;",
      "  background: rgba(20,16,28,0.96); padding: 8px;",
      "}",
      "#seidr-act-items-slot, #seidr-act-items-filter {",
      "  flex: 1; min-width: 120px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 5px 8px;",
      "}",
      ".seidr-act-items-results { margin-top: 4px; max-height: 200px; overflow-y: auto; }",
      ".seidr-act-item-opt {",
      "  display: block; width: 100%; text-align: left; box-sizing: border-box;",
      "  background: transparent; color: #f0e6d4;",
      "  border: 1px solid transparent; border-radius: 4px; padding: 5px 8px;",
      "  cursor: pointer; font: inherit; font-size: 12px;",
      "}",
      ".seidr-act-item-opt:hover { background: rgba(60,48,80,0.7); }",
      ".seidr-act-item-opt-on { border-color: #d4a017; background: rgba(60,48,80,0.9); }",
      ".seidr-act-io-text {",
      "  display: block; width: 100%; box-sizing: border-box; margin-top: 6px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "  font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;",
      "  resize: vertical;",
      "}",
      ".seidr-act-import-panel {",
      "  margin-top: 8px; padding: 8px;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;",
      "  background: rgba(20,16,28,0.6);",
      "}",
      ".seidr-act-import-list {",
      "  max-height: 180px; overflow-y: auto; margin-top: 6px;",
      "  display: flex; flex-direction: column; gap: 4px;",
      "}",
      ".seidr-act-import-row {",
      "  display: flex; align-items: center; gap: 8px;",
      "  color: #f0e6d4; font-size: 13px; cursor: pointer;",
      "}",
      ".seidr-act-icon-row { display: flex; align-items: center; gap: 12px; }",
      ".seidr-act-icon-preview {",
      "  width: 40px; height: 40px; object-fit: contain;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 6px;",
      "  background: rgba(20,16,28,0.9);",
      "}",
      ".seidr-act-icon-modal {",
      "  position: absolute; inset: 0; z-index: 30;",
      "  background: rgba(8,6,12,0.72);",
      "  display: flex; align-items: center; justify-content: center;",
      "  padding: 12px;",
      "}",
      ".seidr-act-icon-modal-card {",
      "  width: min(100%, 420px); max-height: calc(100% - 8px);",
      "  display: flex; flex-direction: column; box-sizing: border-box;",
      "  background: rgba(28,22,38,0.98); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
      "  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
      "  overflow: hidden;",
      "  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
      "}",
      ".seidr-act-icon-modal-head {",
      "  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;",
      "  padding: 8px 10px; background: rgba(42,34,56,0.95);",
      "  border-bottom: 1px solid rgba(255,255,255,0.1);",
      "}",
      "#seidr-act-icon-search {",
      "  flex-shrink: 0; width: auto; box-sizing: border-box; margin: 8px 10px 0;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "}",
      "#seidr-act-icon-url, #seidr-act-icon-url-label {",
      "  flex: 1; min-width: 100px; box-sizing: border-box;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "}",
      ".seidr-act-icon-scroll {",
      "  flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px 12px;",
      "  scrollbar-width: thin;",
      "  scrollbar-color: rgba(212,160,23,0.55) rgba(20,16,28,0.9);",
      "}",
      ".seidr-act-icon-scroll::-webkit-scrollbar { width: 8px; }",
      ".seidr-act-icon-scroll::-webkit-scrollbar-track {",
      "  background: rgba(20,16,28,0.9); border-radius: 4px;",
      "}",
      ".seidr-act-icon-scroll::-webkit-scrollbar-thumb {",
      "  background: rgba(212,160,23,0.55); border-radius: 4px;",
      "}",
      ".seidr-act-icon-scroll::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(212,160,23,0.75);",
      "}",
      ".seidr-act-icon-grid { margin-top: 4px; }",
      ".seidr-act-icon-sec {",
      "  font-size: 11px; color: #d4a017; margin: 10px 0 4px; letter-spacing: 0.04em;",
      "  text-transform: uppercase;",
      "}",
      ".seidr-act-icon-sec-grid {",
      "  display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px;",
      "}",
      ".seidr-act-icon-cell {",
      "  display: flex; flex-direction: column; align-items: center; gap: 4px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;",
      "  padding: 6px 4px; cursor: pointer; font: inherit; font-size: 10px;",
      "}",
      ".seidr-act-icon-cell:hover { border-color: #d4a017; }",
      ".seidr-act-icon-cell img { width: 36px; height: 36px; object-fit: contain; }",
      ".seidr-act-icon-custom { margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; }",
      ".seidr-act-icon-custom-row {",
      "  display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px;",
      "}",
      ".seidr-act-icon-custom-row img { width: 28px; height: 28px; object-fit: contain; }",
      ".seidr-act-icon-custom-row span { flex: 1; }"
    ].join("\n");
  }
  function seidrInjectSettingsStyles() {
    let el = document.getElementById("seidr-settings-styles");
    if (!el) {
      el = document.createElement("style");
      el.id = "seidr-settings-styles";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = seidrSettingsCss();
  }

  // src/actions/io.ts
  function lz2() {
    try {
      if (typeof LZString !== "undefined" && LZString) return LZString;
    } catch (e) {
    }
    return null;
  }
  function actPrefix() {
    return Seidr.ACT_LZ_PREFIX || "SeidrAct1:";
  }
  function seidrExportActionsString() {
    const payload = {
      v: 1,
      kind: "SeidrActions",
      actions: seidrListActions()
    };
    const json = JSON.stringify(payload);
    const L = lz2();
    const prefix = actPrefix();
    if (!L || typeof L.compressToBase64 !== "function") {
      throw new Error("LZString unavailable");
    }
    return prefix + L.compressToBase64(json);
  }
  function seidrParseActionsImport(raw) {
    const text = String(raw || "").trim();
    if (!text) return { ok: false, error: "Paste an export string first" };
    const prefix = actPrefix();
    if (text.indexOf(prefix) !== 0) {
      return { ok: false, error: "Not a Seidr Actions export (missing " + prefix + ")" };
    }
    const L = lz2();
    if (!L || typeof L.decompressFromBase64 !== "function") {
      return { ok: false, error: "LZString unavailable" };
    }
    let data = null;
    try {
      const plain = L.decompressFromBase64(text.slice(prefix.length));
      if (!plain) return { ok: false, error: "Could not decompress export" };
      data = JSON.parse(plain);
    } catch (e) {
      return { ok: false, error: "Invalid export data" };
    }
    if (!data || typeof data !== "object") return { ok: false, error: "Invalid export data" };
    const d = data;
    if (d.kind !== "SeidrActions" || d.v !== 1) {
      return { ok: false, error: "Unsupported export format" };
    }
    if (!Array.isArray(d.actions)) {
      return { ok: false, error: "Export has no actions list" };
    }
    const out = [];
    for (let i = 0; i < d.actions.length; i++) {
      const tmpId = i + 1;
      const act2 = seidrNormalizeAction(d.actions[i], tmpId);
      if (act2) out.push(act2);
    }
    if (!out.length) return { ok: false, error: "No valid actions in export" };
    return { ok: true, actions: out };
  }

  // src/actions/ui.ts
  var editId = null;
  var draft = null;
  var lastChatArea = null;
  var arousalPickerOpen = false;
  var itemsPickerOpen = false;
  var itemsPickerSlot = "ItemMouth";
  var itemsPickerFilter = "";
  var importCandidates = null;
  var SEIDR_ITEMS_RESULT_CAP = 80;
  function $2(id) {
    return document.getElementById(id);
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function opts(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>";
    }).join("");
  }
  function stringOpts(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml(o) + '"' + (o === selected ? " selected" : "") + ">" + escapeHtml(o) + "</option>";
    }).join("");
  }
  function arousalResultsHtml(selected, filter) {
    const q = (filter || "").trim().toLowerCase();
    const groups = seidrArousalPickerGroups();
    const parts = [];
    groups.forEach(function(g) {
      const rows = g.activities.filter(function(a) {
        if (!q) return true;
        return a.label.toLowerCase().indexOf(q) >= 0 || a.id.toLowerCase().indexOf(q) >= 0;
      });
      if (!rows.length) return;
      parts.push('<div class="seidr-act-arousal-group">' + escapeHtml(g.label) + "</div>");
      rows.forEach(function(a) {
        parts.push(
          '<button type="button" class="seidr-act-arousal-opt' + (a.id === selected ? " seidr-act-arousal-opt-on" : "") + '" data-arousal-id="' + escapeHtml(a.id) + '">' + escapeHtml(a.label) + ' <span class="seidr-settings-hint">' + escapeHtml(a.id) + "</span></button>"
        );
      });
    });
    if (!parts.length) {
      return '<p class="seidr-settings-hint">No activities match.</p>';
    }
    return parts.join("");
  }
  function arousalPickerHtml(selected) {
    const id = selected && SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(selected) >= 0 ? selected : "Caress";
    const open = arousalPickerOpen;
    return [
      '<div class="seidr-act-arousal-picker' + (open ? " seidr-act-arousal-open" : "") + '">',
      '<input type="hidden" id="seidr-act-arousal-act" value="' + escapeHtml(id) + '" />',
      '<button type="button" class="seidr-act-arousal-toggle" id="seidr-act-arousal-toggle" title="Choose Club arousal template">',
      '<span class="seidr-act-arousal-toggle-lab">Template</span>',
      '<strong id="seidr-act-arousal-label">' + escapeHtml(seidrArousalActivityLabel(id)) + "</strong>",
      '<span class="seidr-act-arousal-caret" aria-hidden="true">' + (open ? "\u25B4" : "\u25BE") + "</span>",
      "</button>",
      '<div class="seidr-act-arousal-dropdown" id="seidr-act-arousal-dropdown"' + (open ? "" : " hidden") + ">",
      '<input type="search" id="seidr-act-arousal-filter" placeholder="Search activities\u2026" autocomplete="off" />',
      '<div class="seidr-act-arousal-results" id="seidr-act-arousal-results">' + arousalResultsHtml(id, "") + "</div>",
      "</div>",
      "</div>"
    ].join("");
  }
  function restraintAssetLabel(a) {
    if (!a) return "";
    try {
      if (typeof a.Description === "string" && a.Description) return a.Description;
      if (typeof a.DynamicDescription === "function" && typeof Player !== "undefined" && Player) {
        return String(a.DynamicDescription(Player) || a.Name || "");
      }
    } catch (e) {
    }
    return a.Name ? String(a.Name) : "";
  }
  function itemRefLabel(ref) {
    const slotMeta = seidrRestraintSlots().filter(function(s) {
      return s.id === ref.slot;
    })[0];
    const slotLab = slotMeta ? slotMeta.label : ref.slot;
    let nameLab = ref.name;
    try {
      if (typeof AssetGet === "function") {
        const a = AssetGet("Female3DCG", ref.slot, ref.name);
        if (a) nameLab = restraintAssetLabel(a) || ref.name;
      }
    } catch (e) {
    }
    return slotLab + ": " + nameLab;
  }
  function listRestraintAssets(slot, filter) {
    const out = [];
    if (!slot || typeof Asset === "undefined" || !Array.isArray(Asset)) return out;
    const q = (filter || "").trim().toLowerCase();
    let family = "Female3DCG";
    try {
      if (typeof Player !== "undefined" && Player && Player.AssetFamily) {
        family = String(Player.AssetFamily);
      }
    } catch (e0) {
    }
    try {
      for (let i = 0; i < Asset.length; i++) {
        const a = Asset[i];
        if (!a || !a.Name || !a.Group || a.Group.Name !== slot) continue;
        if (a.Group.Family && a.Group.Family !== family) continue;
        if (a.IsLock) continue;
        if (a.Wear === false) continue;
        if (a.Enable === false) continue;
        const label = restraintAssetLabel(a) || a.Name;
        if (q) {
          const hay = (label + " " + a.Name).toLowerCase();
          if (hay.indexOf(q) < 0) continue;
        }
        out.push({ name: String(a.Name), label: String(label) });
      }
    } catch (e) {
    }
    out.sort(function(x, y) {
      return x.label.localeCompare(y.label);
    });
    return out.slice(0, SEIDR_ITEMS_RESULT_CAP);
  }
  function itemsResultsHtml(slot, filter, selected) {
    const rows = listRestraintAssets(slot, filter);
    if (!rows.length) {
      return '<p class="seidr-settings-hint">No restraints match' + (typeof Asset === "undefined" ? " (Asset catalog not loaded)." : ".") + "</p>";
    }
    return rows.map(function(r) {
      const on = selected.some(function(it) {
        return it.slot === slot && it.name === r.name;
      });
      return '<button type="button" class="seidr-act-item-opt' + (on ? " seidr-act-item-opt-on" : "") + '" data-item-add-slot="' + escapeHtml(slot) + '" data-item-add-name="' + escapeHtml(r.name) + '">' + escapeHtml(r.label) + ' <span class="seidr-settings-hint">' + escapeHtml(r.name) + "</span></button>";
    }).join("");
  }
  function itemsBlockHtml(items) {
    const list = items || [];
    const slots = seidrRestraintSlots();
    if (!slots.some(function(s) {
      return s.id === itemsPickerSlot;
    })) {
      itemsPickerSlot = slots[0] ? slots[0].id : "ItemMouth";
    }
    const chips = list.length ? list.map(function(it, idx) {
      return '<button type="button" class="seidr-act-item-chip" data-item-del="' + idx + '" title="Remove">' + escapeHtml(itemRefLabel(it)) + " \xD7</button>";
    }).join("") : '<span class="seidr-settings-hint">None \u2014 action shows without a specific restraint.</span>';
    const open = itemsPickerOpen;
    return [
      '<p class="seidr-settings-hint" style="margin-top:10px;">Items (optional \u2014 acted must wear one listed restraint)</p>',
      '<div class="seidr-act-items" id="seidr-act-items">' + chips + "</div>",
      '<div class="seidr-act-items-picker' + (open ? " seidr-act-items-open" : "") + '">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-items-toggle" title="Browse Club restraints">',
      (open ? "Hide restraint catalog \u25B4" : "Add restraint \u25BE") + "</button>",
      '<div class="seidr-act-items-dropdown" id="seidr-act-items-dropdown"' + (open ? "" : " hidden") + ">",
      '<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; margin-bottom:6px;">',
      '<select id="seidr-act-items-slot">' + opts(slots, itemsPickerSlot) + "</select>",
      '<input type="search" id="seidr-act-items-filter" placeholder="Search gags, armbinders\u2026" autocomplete="off" value="' + escapeHtml(itemsPickerFilter) + '" />',
      "</div>",
      '<div class="seidr-act-items-results" id="seidr-act-items-results">' + itemsResultsHtml(itemsPickerSlot, itemsPickerFilter, list) + "</div>",
      "</div>",
      "</div>"
    ].join("");
  }
  function slotChips(selected) {
    return SEIDR_ACTION_SLOTS.map(function(s) {
      const on = selected.indexOf(s.id) >= 0;
      return '<button type="button" class="seidr-act-slot' + (on ? " seidr-act-slot-on" : "") + '" data-slot="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + "</button>";
    }).join("");
  }
  function ruleRowHtml(rule, index) {
    const typeMeta = SEIDR_COND_TYPES.filter(function(t) {
      return t.id === rule.type;
    })[0];
    const extra = typeMeta ? typeMeta.extra : null;
    let extraHtml = "";
    if (extra === "slot") {
      extraHtml = '<select data-rule-extra="slot">' + opts(SEIDR_ACTION_SLOTS, rule.slot || "ItemArms") + "</select>";
    } else if (extra === "pose") {
      extraHtml = '<select data-rule-extra="pose">' + opts(SEIDR_ACTION_POSES, rule.pose || "Kneel") + "</select>";
    } else if (extra === "zone") {
      extraHtml = '<select data-rule-extra="zone"><option value="penis"' + (rule.zone === "penis" ? " selected" : "") + '>penis</option><option value="vagina"' + (rule.zone === "vagina" || !rule.zone ? " selected" : "") + '>vagina</option><option value="nipples"' + (rule.zone === "nipples" ? " selected" : "") + ">nipples</option></select>";
    }
    return [
      '<div class="seidr-act-rule" data-rule-index="' + index + '">',
      "<select data-rule-who>",
      '<option value="target"' + (rule.who !== "source" ? " selected" : "") + ">They</option>",
      '<option value="source"' + (rule.who === "source" ? " selected" : "") + ">I</option>",
      "</select>",
      "<select data-rule-not>",
      '<option value="0"' + (!rule.not ? " selected" : "") + ">is</option>",
      '<option value="1"' + (rule.not ? " selected" : "") + ">is not</option>",
      "</select>",
      "<select data-rule-type>" + SEIDR_COND_TYPES.map(function(t) {
        return '<option value="' + t.id + '"' + (t.id === rule.type ? " selected" : "") + ">" + escapeHtml(t.label) + "</option>";
      }).join("") + "</select>",
      extraHtml,
      '<button type="button" class="seidr-act-btn seidr-act-btn-icon" data-rule-del="' + index + '" title="Remove rule">\xD7</button>',
      "</div>"
    ].join("");
  }
  function groupsHtml(groups) {
    if (!groups.length) {
      return '<p class="seidr-settings-hint">No conditions \u2014 always available when audience matches.</p>';
    }
    return groups.map(function(g, gi) {
      const rules = (g.rules || []).map(function(r, ri) {
        return ruleRowHtml(r, gi * 100 + ri);
      }).join("");
      return [
        '<div class="seidr-act-group" data-group="' + gi + '">',
        '<div class="seidr-act-group-head">Group ' + (gi + 1) + " (AND)" + (gi > 0 ? ' <span class="seidr-settings-hint">OR previous</span>' : "") + ' <button type="button" class="seidr-act-btn seidr-act-btn-danger" data-group-del="' + gi + '">Remove group</button></div>',
        rules,
        '<button type="button" class="seidr-act-btn" data-rule-add="' + gi + '">+ Rule</button>',
        "</div>"
      ].join("");
    }).join("");
  }
  function chatTokenChips() {
    return SEIDR_ACTION_CHAT_TOKENS.map(function(t) {
      return '<button type="button" class="seidr-act-ph" data-chat-token="' + escapeHtml(t.token) + '" title="' + escapeHtml(t.hint) + '">' + escapeHtml(t.token) + "</button>";
    }).join("");
  }
  function insertChatToken(ta, token) {
    const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
    const end = ta.selectionEnd != null ? ta.selectionEnd : start;
    const next = ta.value.slice(0, start) + token + ta.value.slice(end);
    if (next.length > SEIDR_ACTION_CHAT_MAX) return false;
    ta.value = next;
    ta.focus();
    const pos = start + token.length;
    ta.setSelectionRange(pos, pos);
    return true;
  }
  function updateCapHint(root3) {
    const el = root3.querySelector("#seidr-act-cap");
    if (!el) return;
    const n = seidrListActions().length;
    el.textContent = n + "/" + SEIDR_ACTIONS_MAX + " Actions";
  }
  function renderList(root3) {
    const list = seidrListActions();
    const box = root3.querySelector("#seidr-act-list");
    if (!box) return;
    updateCapHint(root3);
    if (!list.length) {
      box.innerHTML = '<p class="seidr-settings-hint">No actions yet. Add one to appear in the Club Activity Menu.</p>';
      return;
    }
    const optsHtml = list.map(function(a) {
      return '<option value="' + a.id + '"' + (editId === a.id ? " selected" : "") + ">" + escapeHtml(a.name) + " (" + escapeHtml(a.slots.join(", ")) + ")</option>";
    }).join("");
    box.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Action</span>',
      '<select id="seidr-act-pick">' + optsHtml + "</select>",
      "</div>"
    ].join("");
  }
  function renderEditor(root3) {
    const wrap = root3.querySelector("#seidr-act-editor");
    if (!wrap) return;
    if (!draft) {
      wrap.innerHTML = '<p class="seidr-settings-hint">Select an action or add a new one.</p>';
      return;
    }
    const a = draft;
    const arousal = a.effects.arousal || { enabled: false, activity: "Caress" };
    const sound = a.effects.sound || { enabled: false, sound: SEIDR_ACTION_SOUNDS[0] };
    const pose = a.effects.pose || { enabled: false, pose: "Kneel" };
    const chatOther2 = a.chatOther || seidrDefaultChatOther(a.name);
    const chatSelf2 = a.chatSelf || seidrDefaultChatSelf(a.name);
    if (!a.icon) a.icon = seidrDefaultActionIcon();
    const icon = seidrNormalizeActionIcon(a.icon);
    const iconUrl = seidrResolveIconRef(icon);
    const iconLab = seidrIconLabel(icon);
    wrap.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Name</span>',
      '<input type="text" id="seidr-act-name" maxlength="48" value="' + escapeHtml(a.name) + '" />',
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Who</span>',
      '<select id="seidr-act-audience">' + opts(SEIDR_ACTION_AUDIENCES, a.audience) + "</select>",
      "</div>",
      '<div class="seidr-act-icon-row" style="margin-top:10px;">',
      '<img class="seidr-act-icon-preview" id="seidr-act-icon-preview" src="' + escapeHtml(iconUrl) + '" alt="" width="40" height="40" />',
      "<div>",
      '<p class="seidr-settings-hint" id="seidr-act-icon-label">' + escapeHtml(iconLab) + "</p>",
      '<button type="button" class="seidr-act-btn" id="seidr-act-icon-pick">Select icon</button>',
      "</div>",
      "</div>",
      '<p class="seidr-settings-hint" style="margin-top:10px;">Slots (Activity Menu zones)</p>',
      '<div class="seidr-act-slots" id="seidr-act-slots">' + slotChips(a.slots) + "</div>",
      itemsBlockHtml(a.items || []),
      '<p class="seidr-settings-hint" style="margin-top:10px;">When visible</p>',
      '<div id="seidr-act-conds">' + groupsHtml(a.conditions.groups) + "</div>",
      '<div class="seidr-settings-row" style="margin-top:8px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-add-group">+ Or this instead</button>',
      "</div>",
      '<p class="seidr-settings-hint" style="margin-top:10px;">Action text (Club tags, max ' + SEIDR_ACTION_CHAT_MAX + ")</p>",
      '<div class="seidr-act-ph-row" id="seidr-act-ph">' + chatTokenChips() + "</div>",
      `<p class="seidr-settings-hint">Club style: SourceCharacter kisses TargetCharacter's lips. / SourceCharacter touches PronounPossessive arms.</p>`,
      '<label class="seidr-settings-field-label" style="display:block;margin-top:8px;">Other</label>',
      '<textarea id="seidr-act-chat-other" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' + escapeHtml(chatOther2) + "</textarea>",
      '<p class="seidr-settings-hint" id="seidr-act-chat-other-count">' + chatOther2.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
      '<label class="seidr-settings-field-label" style="display:block;margin-top:8px;">Self</label>',
      '<textarea id="seidr-act-chat-self" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' + escapeHtml(chatSelf2) + "</textarea>",
      '<p class="seidr-settings-hint" id="seidr-act-chat-self-count">' + chatSelf2.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
      '<p class="seidr-settings-hint" style="margin-top:10px;">Effects</p>',
      '<div class="seidr-settings-row">',
      '<label><input type="checkbox" id="seidr-act-arousal-on"' + (arousal.enabled ? " checked" : "") + " /> Add arousal</label>",
      "</div>",
      arousalPickerHtml(arousal.activity || "Caress"),
      '<p class="seidr-settings-hint">Click Template to search Club activities. Chat text stays your action name.</p>',
      '<div class="seidr-settings-row" style="margin-top:8px;">',
      '<label><input type="checkbox" id="seidr-act-sound-on"' + (sound.enabled ? " checked" : "") + " /> Play sound</label>",
      '<select id="seidr-act-sound">' + stringOpts(SEIDR_ACTION_SOUNDS, sound.sound) + "</select>",
      "</div>",
      '<div class="seidr-settings-row" style="margin-top:8px;">',
      '<label><input type="checkbox" id="seidr-act-pose-on"' + (pose.enabled ? " checked" : "") + " /> Set pose</label>",
      '<select id="seidr-act-pose">' + opts(SEIDR_ACTION_POSES, pose.pose) + "</select>",
      "</div>",
      '<div class="seidr-settings-row seidr-settings-draw-actions" style="margin-top:12px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-save">Save action</button>',
      '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-act-delete">Delete</button>',
      "</div>",
      '<p class="seidr-settings-hint" id="seidr-act-msg"></p>'
    ].join("");
  }
  function readDraftFromDom(root3) {
    if (!draft) return null;
    const nameEl = root3.querySelector("#seidr-act-name");
    const audEl = root3.querySelector("#seidr-act-audience");
    const chatOtherEl = root3.querySelector("#seidr-act-chat-other");
    const chatSelfEl = root3.querySelector("#seidr-act-chat-self");
    const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : draft.name;
    const next = {
      id: draft.id,
      name,
      slots: draft.slots.slice(),
      audience: audEl && audEl.value ? audEl.value : draft.audience,
      chatOther: chatOtherEl && chatOtherEl.value.trim() ? chatOtherEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : seidrDefaultChatOther(name),
      chatSelf: chatSelfEl && chatSelfEl.value.trim() ? chatSelfEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : seidrDefaultChatSelf(name),
      icon: seidrNormalizeActionIcon(draft.icon || seidrDefaultActionIcon()),
      items: (draft.items || []).slice(),
      conditions: { groups: [] },
      effects: {}
    };
    const slotBtns = root3.querySelectorAll(".seidr-act-slot-on");
    const slots = [];
    slotBtns.forEach(function(btn2) {
      const s = btn2.getAttribute("data-slot");
      if (s && slots.indexOf(s) < 0) slots.push(s);
    });
    if (slots.length) next.slots = slots;
    const groups = [];
    root3.querySelectorAll(".seidr-act-group").forEach(function(gEl) {
      const rules = [];
      gEl.querySelectorAll(".seidr-act-rule").forEach(function(rEl) {
        const who = (rEl.querySelector("[data-rule-who]") || { value: "target" }).value;
        const not = (rEl.querySelector("[data-rule-not]") || { value: "0" }).value === "1";
        const type = (rEl.querySelector("[data-rule-type]") || { value: "wearing" }).value;
        const rule = {
          who: who === "source" ? "source" : "target",
          type,
          not
        };
        const slotEl = rEl.querySelector('[data-rule-extra="slot"]');
        const poseEl = rEl.querySelector('[data-rule-extra="pose"]');
        const zoneEl = rEl.querySelector('[data-rule-extra="zone"]');
        if (slotEl) rule.slot = slotEl.value;
        if (poseEl) rule.pose = poseEl.value;
        if (zoneEl) rule.zone = zoneEl.value;
        rules.push(rule);
      });
      if (rules.length) groups.push({ rules });
    });
    next.conditions = { groups };
    const aOn = root3.querySelector("#seidr-act-arousal-on");
    const aAct = root3.querySelector("#seidr-act-arousal-act");
    const actVal = aAct && aAct.value || "Caress";
    next.effects.arousal = {
      enabled: !!(aOn && aOn.checked),
      activity: SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(actVal) >= 0 ? actVal : "Caress"
    };
    const sOn = root3.querySelector("#seidr-act-sound-on");
    const sSel = root3.querySelector("#seidr-act-sound");
    next.effects.sound = {
      enabled: !!(sOn && sOn.checked),
      sound: sSel && sSel.value || SEIDR_ACTION_SOUNDS[0]
    };
    const pOn = root3.querySelector("#seidr-act-pose-on");
    const pSel = root3.querySelector("#seidr-act-pose");
    next.effects.pose = {
      enabled: !!(pOn && pOn.checked),
      pose: pSel && pSel.value || "Kneel"
    };
    draft = next;
    return next;
  }
  function setMsg2(root3, text) {
    const el = root3.querySelector("#seidr-act-msg");
    if (el) el.textContent = text || "";
  }
  function afterSave() {
    if (typeof Seidr.syncUserActions === "function") {
      try {
        Seidr.syncUserActions();
      } catch (e) {
      }
    }
  }
  function bindArousalPicker(root3) {
    const picker = root3.querySelector(".seidr-act-arousal-picker");
    const toggle = root3.querySelector("#seidr-act-arousal-toggle");
    const dropdown = root3.querySelector("#seidr-act-arousal-dropdown");
    const filter = root3.querySelector("#seidr-act-arousal-filter");
    const hidden = root3.querySelector("#seidr-act-arousal-act");
    const results = root3.querySelector("#seidr-act-arousal-results");
    const labelEl = root3.querySelector("#seidr-act-arousal-label");
    const caret = root3.querySelector(".seidr-act-arousal-caret");
    if (!toggle || !dropdown || !hidden) return;
    function setOpen(open) {
      arousalPickerOpen = open;
      if (picker) picker.classList.toggle("seidr-act-arousal-open", open);
      if (dropdown) {
        if (open) dropdown.removeAttribute("hidden");
        else dropdown.setAttribute("hidden", "");
      }
      if (caret) caret.textContent = open ? "\u25B4" : "\u25BE";
      if (open && filter) {
        try {
          filter.focus();
        } catch (e) {
        }
      }
    }
    function refreshResults() {
      if (!results || !hidden) return;
      const q = filter ? filter.value || "" : "";
      results.innerHTML = arousalResultsHtml(hidden.value || "Caress", q);
    }
    toggle.addEventListener("click", function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      setOpen(!arousalPickerOpen);
      if (arousalPickerOpen) refreshResults();
    });
    if (filter) {
      filter.addEventListener("input", function() {
        refreshResults();
      });
      filter.addEventListener("keydown", function(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          setOpen(false);
        }
      });
    }
    if (results) {
      results.addEventListener("click", function(ev) {
        const btn2 = ev.target.closest("[data-arousal-id]");
        if (!btn2 || !hidden) return;
        const id = btn2.getAttribute("data-arousal-id");
        if (!id || SEIDR_AROUSAL_ACTIVITY_IDS.indexOf(id) < 0) return;
        hidden.value = id;
        if (labelEl) labelEl.textContent = seidrArousalActivityLabel(id);
        if (draft) {
          if (!draft.effects) draft.effects = {};
          if (!draft.effects.arousal) draft.effects.arousal = { enabled: false, activity: id };
          else draft.effects.arousal.activity = id;
        }
        setOpen(false);
      });
    }
    const onDoc = function(ev) {
      if (!arousalPickerOpen || !picker) return;
      if (picker.contains(ev.target)) return;
      setOpen(false);
      document.removeEventListener("mousedown", onDoc, true);
    };
    toggle.addEventListener("click", function() {
      if (arousalPickerOpen) {
        setTimeout(function() {
          document.addEventListener("mousedown", onDoc, true);
        }, 0);
      }
    });
  }
  function addItemRef(root3, slot, name) {
    if (!draft || !slot || !name) return;
    readDraftFromDom(root3);
    if (!draft.items) draft.items = [];
    const dup = draft.items.some(function(it) {
      return it.slot === slot && it.name === name;
    });
    if (dup) {
      setMsg2(root3, "Already added");
      return;
    }
    if (draft.items.length >= SEIDR_ACTION_ITEMS_MAX) {
      setMsg2(root3, "Item limit (" + SEIDR_ACTION_ITEMS_MAX + ")");
      return;
    }
    draft.items.push({ slot, name });
    itemsPickerOpen = false;
    renderEditor(root3);
    bindEditor(root3);
  }
  function bindItemsPicker(root3) {
    const picker = root3.querySelector(".seidr-act-items-picker");
    const toggle = root3.querySelector("#seidr-act-items-toggle");
    const dropdown = root3.querySelector("#seidr-act-items-dropdown");
    const slotSel = root3.querySelector("#seidr-act-items-slot");
    const filterEl = root3.querySelector("#seidr-act-items-filter");
    const results = root3.querySelector("#seidr-act-items-results");
    function refreshResults() {
      if (!results || !draft) return;
      results.innerHTML = itemsResultsHtml(itemsPickerSlot, itemsPickerFilter, draft.items || []);
      results.querySelectorAll("[data-item-add-name]").forEach(function(btn2) {
        btn2.addEventListener("click", function() {
          const el = btn2;
          addItemRef(
            root3,
            el.getAttribute("data-item-add-slot") || "",
            el.getAttribute("data-item-add-name") || ""
          );
        });
      });
    }
    function setOpen(open) {
      itemsPickerOpen = open;
      if (picker) picker.classList.toggle("seidr-act-items-open", open);
      if (dropdown) dropdown.hidden = !open;
      if (toggle) toggle.textContent = open ? "Hide restraint catalog \u25B4" : "Add restraint \u25BE";
      if (open) {
        refreshResults();
        if (filterEl) filterEl.focus();
      }
    }
    toggle?.addEventListener("click", function() {
      setOpen(!itemsPickerOpen);
    });
    slotSel?.addEventListener("change", function() {
      itemsPickerSlot = slotSel.value || "ItemMouth";
      refreshResults();
    });
    filterEl?.addEventListener("input", function() {
      itemsPickerFilter = filterEl.value || "";
      refreshResults();
    });
    if (itemsPickerOpen) refreshResults();
    root3.querySelectorAll("[data-item-del]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        if (!draft) return;
        readDraftFromDom(root3);
        const idx = parseInt(btn2.getAttribute("data-item-del") || "", 10);
        if (!Number.isFinite(idx) || !draft.items) return;
        draft.items.splice(idx, 1);
        renderEditor(root3);
        bindEditor(root3);
      });
    });
  }
  function syncChatCount(root3, which) {
    const ta = root3.querySelector(
      which === "other" ? "#seidr-act-chat-other" : "#seidr-act-chat-self"
    );
    const count = root3.querySelector(
      which === "other" ? "#seidr-act-chat-other-count" : "#seidr-act-chat-self-count"
    );
    if (ta && count) count.textContent = ta.value.length + "/" + SEIDR_ACTION_CHAT_MAX;
  }
  function closeIconModal() {
    const modal = document.getElementById("seidr-act-icon-modal");
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }
  function refreshOpenActivityMenuIcons() {
    const grid = document.getElementById("dialog-activity-grid");
    if (!grid) return;
    seidrListActions().forEach(function(action) {
      const name = seidrActionActivityName(action.id);
      const btn2 = grid.querySelector('button[name="' + name + '"]');
      if (!btn2) return;
      const url = seidrResolveActionIconUrl(action);
      try {
        if (typeof ElementButton !== "undefined" && ElementButton && typeof ElementButton.SetImage === "function") {
          ElementButton.SetImage(btn2, url);
          return;
        }
      } catch (e) {
      }
      const img = btn2.querySelector(".button-image");
      if (img && img instanceof HTMLImageElement) img.src = url;
      else if (img) {
        const css = url.indexOf("data:image") === 0 || url.indexOf("http") === 0 ? 'url("' + url + '")' : 'url("./' + url + '")';
        img.style.setProperty("background-image", css);
        img.style.setProperty("mask-image", css);
      }
    });
  }
  function openIconModal(root3) {
    if (!draft) return;
    closeIconModal();
    readDraftFromDom(root3);
    const customs = (seidrGetSettings().customActionIcons || []).slice();
    const panel3 = document.getElementById("seidr-settings-panel") || document.body;
    const modal = document.createElement("div");
    modal.id = "seidr-act-icon-modal";
    modal.className = "seidr-act-icon-modal";
    modal.innerHTML = [
      '<div class="seidr-act-icon-modal-card">',
      '<div class="seidr-act-icon-modal-head">',
      "<strong>Select icon</strong>",
      '<button type="button" class="seidr-act-btn" id="seidr-act-icon-close">Close</button>',
      "</div>",
      '<input type="search" id="seidr-act-icon-search" placeholder="Search icons\u2026" autocomplete="off" />',
      '<div class="seidr-act-icon-scroll" id="seidr-act-icon-scroll">',
      '<div class="seidr-act-icon-grid" id="seidr-act-icon-grid"></div>',
      '<div class="seidr-act-icon-custom">',
      '<p class="seidr-settings-hint">Custom URL icons (max ' + SEIDR_CUSTOM_ICONS_MAX + ")</p>",
      '<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap;">',
      '<input type="url" id="seidr-act-icon-url" placeholder="https://\u2026/icon.png" />',
      '<input type="text" id="seidr-act-icon-url-label" placeholder="Label" maxlength="48" />',
      '<button type="button" class="seidr-act-btn" id="seidr-act-icon-add-url">Add URL</button>',
      "</div>",
      '<p class="seidr-settings-hint" id="seidr-act-icon-custom-msg"></p>',
      '<div id="seidr-act-icon-custom-list"></div>',
      "</div>",
      "</div>",
      "</div>"
    ].join("");
    panel3.appendChild(modal);
    modal.addEventListener("wheel", function(ev) {
      ev.stopPropagation();
    }, { passive: true });
    function setCustomMsg(text) {
      const el = modal.querySelector("#seidr-act-icon-custom-msg");
      if (el) el.textContent = text || "";
    }
    function renderCustomList() {
      const host = modal.querySelector("#seidr-act-icon-custom-list");
      if (!host) return;
      if (!customs.length) {
        host.innerHTML = '<p class="seidr-settings-hint">No custom icons yet.</p>';
        return;
      }
      host.innerHTML = customs.map(function(c) {
        return '<div class="seidr-act-icon-custom-row"><img src="' + escapeHtml(c.url) + '" alt="" width="28" height="28" /><span>' + escapeHtml(c.label) + '</span><button type="button" class="seidr-act-btn seidr-act-btn-danger" data-custom-del="' + escapeHtml(c.id) + '">Delete</button></div>';
      }).join("");
      host.querySelectorAll("[data-custom-del]").forEach(function(btn2) {
        btn2.addEventListener("click", function() {
          const id = btn2.getAttribute("data-custom-del") || "";
          const next = customs.filter(function(c) {
            return c.id !== id;
          });
          customs.length = 0;
          next.forEach(function(c) {
            customs.push(c);
          });
          seidrSaveSettings({ customActionIcons: customs.slice() });
          if (draft && draft.icon && draft.icon.source === "custom" && draft.icon.id === id) {
            draft.icon = seidrDefaultActionIcon();
          }
          renderCustomList();
          paintGrid(modal.querySelector("#seidr-act-icon-search")?.value || "");
          setCustomMsg("Removed custom icon");
        });
      });
    }
    function pickIcon(icon) {
      if (!draft) return;
      readDraftFromDom(root3);
      draft.icon = seidrNormalizeActionIcon(icon);
      const saved = seidrUpdateAction(draft);
      closeIconModal();
      renderEditor(root3);
      bindEditor(root3);
      if (saved.ok) {
        afterSave();
        refreshOpenActivityMenuIcons();
        setMsg2(root3, "Icon saved");
      } else {
        setMsg2(root3, saved.error || "Icon save failed \u2014 click Save action");
      }
    }
    function paintGrid(filter) {
      const grid = modal.querySelector("#seidr-act-icon-grid");
      if (!grid) return;
      const q = (filter || "").trim().toLowerCase();
      const parts = [];
      function pushSection(title, cells) {
        if (!cells) return;
        parts.push('<div class="seidr-act-icon-sec">' + escapeHtml(title) + "</div>");
        parts.push('<div class="seidr-act-icon-sec-grid">' + cells + "</div>");
      }
      const seidrCells = SEIDR_BUILTIN_ICONS.filter(function(b) {
        if (!q) return true;
        return b.label.toLowerCase().indexOf(q) >= 0 || b.id.toLowerCase().indexOf(q) >= 0;
      }).map(function(b) {
        return '<button type="button" class="seidr-act-icon-cell" data-icon-source="seidr" data-icon-id="' + escapeHtml(b.id) + '" title="' + escapeHtml(b.label) + '"><img src="' + escapeHtml(b.url) + '" alt="" /><span>' + escapeHtml(b.label) + "</span></button>";
      }).join("");
      pushSection("Seidr", seidrCells);
      const actCells = SEIDR_ACTIVITY_ICON_IDS.filter(function(id) {
        if (!q) return true;
        return id.toLowerCase().indexOf(q) >= 0;
      }).map(function(id) {
        return '<button type="button" class="seidr-act-icon-cell" data-icon-source="activity" data-icon-id="' + escapeHtml(id) + '" title="' + escapeHtml(id) + '"><img src="' + escapeHtml(seidrActivityIconUrl(id)) + '" alt="" /><span>' + escapeHtml(id) + "</span></button>";
      }).join("");
      pushSection("Club Activity", actCells);
      const customCells = customs.filter(function(c) {
        if (!q) return true;
        return (c.label + " " + c.id).toLowerCase().indexOf(q) >= 0;
      }).map(function(c) {
        return '<button type="button" class="seidr-act-icon-cell" data-icon-source="custom" data-icon-id="' + escapeHtml(c.id) + '" title="' + escapeHtml(c.label) + '"><img src="' + escapeHtml(c.url) + '" alt="" /><span>' + escapeHtml(c.label) + "</span></button>";
      }).join("");
      pushSection("Custom", customCells);
      grid.innerHTML = parts.length ? parts.join("") : '<p class="seidr-settings-hint">No icons match.</p>';
      grid.querySelectorAll("[data-icon-id]").forEach(function(btn2) {
        btn2.addEventListener("click", function() {
          const el = btn2;
          const source = el.getAttribute("data-icon-source");
          const id = el.getAttribute("data-icon-id") || "";
          if (!source || !id) return;
          pickIcon({ source, id });
        });
      });
    }
    modal.querySelector("#seidr-act-icon-close")?.addEventListener("click", closeIconModal);
    modal.addEventListener("click", function(ev) {
      if (ev.target === modal) closeIconModal();
    });
    modal.querySelector("#seidr-act-icon-search")?.addEventListener("input", function(ev) {
      paintGrid(ev.target.value || "");
    });
    modal.querySelector("#seidr-act-icon-add-url")?.addEventListener("click", function() {
      const urlEl = modal.querySelector("#seidr-act-icon-url");
      const labEl = modal.querySelector("#seidr-act-icon-url-label");
      const url = urlEl ? urlEl.value.trim() : "";
      const label = labEl && labEl.value.trim() ? labEl.value.trim() : "Custom";
      if (customs.length >= SEIDR_CUSTOM_ICONS_MAX) {
        setCustomMsg("Custom icon limit (" + SEIDR_CUSTOM_ICONS_MAX + ")");
        return;
      }
      setCustomMsg("Checking image\u2026");
      seidrValidateImageUrl(url).then(function(res) {
        if (res.ok === false) {
          setCustomMsg(res.error);
          return;
        }
        const id = "c" + Date.now().toString(36);
        customs.push({ id, url, label: label.slice(0, 48) });
        seidrSaveSettings({ customActionIcons: customs.slice() });
        if (urlEl) urlEl.value = "";
        if (labEl) labEl.value = "";
        renderCustomList();
        paintGrid(modal.querySelector("#seidr-act-icon-search")?.value || "");
        setCustomMsg("Added \u2014 click it in the grid to use");
      });
    });
    renderCustomList();
    paintGrid("");
  }
  function bindEditor(root3) {
    bindArousalPicker(root3);
    bindItemsPicker(root3);
    root3.querySelector("#seidr-act-icon-pick")?.addEventListener("click", function() {
      openIconModal(root3);
    });
    root3.querySelectorAll("#seidr-act-chat-other, #seidr-act-chat-self").forEach(function(el) {
      el.addEventListener("focus", function() {
        lastChatArea = el;
      });
      el.addEventListener("input", function() {
        const id = el.id;
        syncChatCount(root3, id === "seidr-act-chat-self" ? "self" : "other");
      });
    });
    root3.querySelector("#seidr-act-ph")?.addEventListener("click", function(ev) {
      const btn2 = ev.target.closest("[data-chat-token]");
      if (!btn2) return;
      const token = btn2.getAttribute("data-chat-token");
      if (!token) return;
      const other = root3.querySelector("#seidr-act-chat-other");
      const self = root3.querySelector("#seidr-act-chat-self");
      const ta = lastChatArea && (lastChatArea === other || lastChatArea === self) ? lastChatArea : other;
      if (!ta) return;
      if (!insertChatToken(ta, token)) {
        setMsg2(root3, "Text max " + SEIDR_ACTION_CHAT_MAX + " characters");
      } else {
        syncChatCount(root3, ta.id === "seidr-act-chat-self" ? "self" : "other");
      }
    });
    root3.querySelector("#seidr-act-slots")?.addEventListener("click", function(ev) {
      const btn2 = ev.target.closest("[data-slot]");
      if (!btn2 || !draft) return;
      const slot = btn2.getAttribute("data-slot");
      if (!slot) return;
      const i = draft.slots.indexOf(slot);
      if (i >= 0) {
        if (draft.slots.length > 1) draft.slots.splice(i, 1);
      } else {
        draft.slots.push(slot);
      }
      renderEditor(root3);
      bindEditor(root3);
    });
    root3.querySelector("#seidr-act-add-group")?.addEventListener("click", function() {
      if (!draft) return;
      readDraftFromDom(root3);
      draft.conditions.groups.push({
        rules: [{ who: "target", type: "wearing", slot: "ItemArms", not: false }]
      });
      renderEditor(root3);
      bindEditor(root3);
    });
    root3.querySelectorAll("[data-group-del]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        if (!draft) return;
        readDraftFromDom(root3);
        const gi = parseInt(btn2.getAttribute("data-group-del") || "", 10);
        if (!Number.isFinite(gi)) return;
        draft.conditions.groups.splice(gi, 1);
        renderEditor(root3);
        bindEditor(root3);
      });
    });
    root3.querySelectorAll("[data-rule-add]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        if (!draft) return;
        readDraftFromDom(root3);
        const gi = parseInt(btn2.getAttribute("data-rule-add") || "", 10);
        const g = draft.conditions.groups[gi];
        if (!g) return;
        g.rules.push({ who: "target", type: "isGagged", not: false });
        renderEditor(root3);
        bindEditor(root3);
      });
    });
    root3.querySelectorAll("[data-rule-del]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        if (!draft) return;
        readDraftFromDom(root3);
        const key = parseInt(btn2.getAttribute("data-rule-del") || "", 10);
        const gi = Math.floor(key / 100);
        const ri = key % 100;
        const g = draft.conditions.groups[gi];
        if (!g) return;
        g.rules.splice(ri, 1);
        if (!g.rules.length) draft.conditions.groups.splice(gi, 1);
        renderEditor(root3);
        bindEditor(root3);
      });
    });
    root3.querySelectorAll("[data-rule-type]").forEach(function(sel) {
      sel.addEventListener("change", function() {
        if (!draft) return;
        readDraftFromDom(root3);
        renderEditor(root3);
        bindEditor(root3);
      });
    });
    root3.querySelector("#seidr-act-save")?.addEventListener("click", function() {
      const next = readDraftFromDom(root3);
      if (!next) return;
      const saved = seidrUpdateAction(next);
      if (!saved.ok) {
        setMsg2(root3, saved.error || "Save failed");
        return;
      }
      draft = next;
      editId = next.id;
      setMsg2(root3, "Saved");
      renderList(root3);
      afterSave();
      refreshOpenActivityMenuIcons();
      bindList(root3);
    });
    root3.querySelector("#seidr-act-delete")?.addEventListener("click", function() {
      if (!draft) return;
      const id = draft.id;
      seidrDeleteAction(id);
      editId = null;
      draft = null;
      renderList(root3);
      renderEditor(root3);
      afterSave();
      bindList(root3);
    });
  }
  function selectActionById(root3, id) {
    const list = seidrListActions();
    const found = list.filter(function(a) {
      return a.id === id;
    })[0];
    if (!found) return;
    editId = id;
    draft = JSON.parse(JSON.stringify(found));
    if (!draft.items) draft.items = [];
    if (!draft.icon) draft.icon = seidrDefaultActionIcon();
    arousalPickerOpen = false;
    renderList(root3);
    renderEditor(root3);
    bindList(root3);
    bindEditor(root3);
  }
  function bindList(root3) {
    const pick = root3.querySelector("#seidr-act-pick");
    if (!pick) return;
    pick.addEventListener("change", function() {
      const id = parseInt(pick.value || "", 10);
      if (!Number.isFinite(id)) return;
      selectActionById(root3, id);
    });
  }
  function setIoMsg(container, text) {
    const el = container.querySelector("#seidr-act-io-msg");
    if (el) el.textContent = text || "";
  }
  function renderImportPicker(container) {
    const host = container.querySelector("#seidr-act-import-pick");
    if (!host) return;
    if (!importCandidates || !importCandidates.length) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const rows = importCandidates.map(function(a, idx) {
      return '<label class="seidr-act-import-row"><input type="checkbox" data-import-idx="' + idx + '" checked /> ' + escapeHtml(a.name) + "</label>";
    }).join("");
    host.innerHTML = [
      '<p class="seidr-settings-hint">Select actions to import (new ids; skips when at the ' + SEIDR_ACTIONS_MAX + " limit).</p>",
      '<div class="seidr-act-import-list">' + rows + "</div>",
      '<div class="seidr-settings-row" style="margin-top:8px; gap:6px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-import-do">Import selected</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-act-import-cancel">Cancel</button>',
      "</div>"
    ].join("");
    host.querySelector("#seidr-act-import-cancel")?.addEventListener("click", function() {
      importCandidates = null;
      const paste = container.querySelector("#seidr-act-import-paste");
      if (paste) paste.value = "";
      renderImportPicker(container);
      setIoMsg(container, "");
    });
    host.querySelector("#seidr-act-import-do")?.addEventListener("click", function() {
      if (!importCandidates) return;
      const selected = [];
      host.querySelectorAll("[data-import-idx]").forEach(function(el) {
        const cb = el;
        if (!cb.checked) return;
        const idx = parseInt(cb.getAttribute("data-import-idx") || "", 10);
        if (Number.isFinite(idx) && importCandidates[idx]) selected.push(importCandidates[idx]);
      });
      if (!selected.length) {
        setIoMsg(container, "Select at least one action");
        return;
      }
      const result = seidrImportSelectedActions(selected);
      if (!result.ok) {
        setIoMsg(container, result.error || "Import failed");
        return;
      }
      importCandidates = null;
      const paste = container.querySelector("#seidr-act-import-paste");
      if (paste) paste.value = "";
      const panel3 = container.querySelector("#seidr-act-import-panel");
      if (panel3) panel3.hidden = true;
      renderImportPicker(container);
      editId = null;
      draft = null;
      renderList(container);
      renderEditor(container);
      bindList(container);
      afterSave();
      let msg = "Imported " + result.imported;
      if (result.skipped) msg += " (skipped " + result.skipped + ")";
      setIoMsg(container, msg);
    });
  }
  function bindIoPanel(container) {
    const exportOut = container.querySelector("#seidr-act-export-out");
    const importPanel = container.querySelector("#seidr-act-import-panel");
    const importPaste = container.querySelector("#seidr-act-import-paste");
    container.querySelector("#seidr-act-export")?.addEventListener("click", function() {
      try {
        const packed = seidrExportActionsString();
        const exportPanel = container.querySelector("#seidr-act-export-panel");
        if (exportPanel) exportPanel.hidden = false;
        if (exportOut) {
          exportOut.value = packed;
          exportOut.focus();
          exportOut.select();
        }
        setIoMsg(container, "Export ready \u2014 copy the string below");
      } catch (e) {
        setIoMsg(container, e instanceof Error ? e.message : "Export failed");
      }
    });
    container.querySelector("#seidr-act-export-copy")?.addEventListener("click", function() {
      if (!exportOut || !exportOut.value) {
        setIoMsg(container, "Export first");
        return;
      }
      const text = exportOut.value;
      function ok() {
        setIoMsg(container, "Copied to clipboard");
      }
      function fail() {
        exportOut.focus();
        exportOut.select();
        setIoMsg(container, "Select and copy manually (Ctrl/Cmd+C)");
      }
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(text).then(ok, fail);
          return;
        }
      } catch (e) {
      }
      try {
        exportOut.focus();
        exportOut.select();
        if (typeof document.execCommand === "function" && document.execCommand("copy")) ok();
        else fail();
      } catch (e2) {
        fail();
      }
    });
    container.querySelector("#seidr-act-import")?.addEventListener("click", function() {
      if (!importPanel) return;
      importPanel.hidden = !importPanel.hidden;
      if (!importPanel.hidden && importPaste) importPaste.focus();
      if (importPanel.hidden) {
        importCandidates = null;
        renderImportPicker(container);
      }
      setIoMsg(container, "");
    });
    container.querySelector("#seidr-act-import-parse")?.addEventListener("click", function() {
      const raw = importPaste ? importPaste.value : "";
      const parsed = seidrParseActionsImport(raw);
      if (parsed.ok === false) {
        importCandidates = null;
        renderImportPicker(container);
        setIoMsg(container, parsed.error);
        return;
      }
      importCandidates = parsed.actions;
      renderImportPicker(container);
      setIoMsg(container, "Parsed " + parsed.actions.length + " action(s) \u2014 select which to import");
    });
  }
  function seidrBuildActionsTab(container) {
    importCandidates = null;
    closeIconModal();
    container.innerHTML = [
      '<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-add">Add action</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-act-export">Export</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-act-import">Import</button>',
      '<span class="seidr-settings-hint" id="seidr-act-cap">0/' + SEIDR_ACTIONS_MAX + " Actions</span>",
      "</div>",
      '<p class="seidr-settings-hint">Actions appear in the Club Activity Menu on the slots you pick. Arousal uses the selected BC activity for preferences only.</p>',
      '<p class="seidr-settings-hint" id="seidr-act-io-msg"></p>',
      '<div id="seidr-act-export-panel" hidden>',
      '<textarea id="seidr-act-export-out" class="seidr-act-io-text" rows="3" readonly></textarea>',
      '<div class="seidr-settings-row" style="gap:6px; margin-top:4px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-export-copy" title="Copy export string">Copy</button>',
      "</div>",
      "</div>",
      '<div id="seidr-act-import-panel" class="seidr-act-import-panel" hidden>',
      '<p class="seidr-settings-hint">Paste a SeidrAct1: export string, then Parse.</p>',
      '<textarea id="seidr-act-import-paste" class="seidr-act-io-text" rows="3" placeholder="SeidrAct1:\u2026"></textarea>',
      '<div class="seidr-settings-row" style="gap:6px; margin-top:6px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-act-import-parse">Parse</button>',
      "</div>",
      '<div id="seidr-act-import-pick" hidden></div>',
      "</div>",
      '<div id="seidr-act-list" class="seidr-act-list"></div>',
      '<div id="seidr-act-editor" class="seidr-act-editor"></div>'
    ].join("");
    renderList(container);
    renderEditor(container);
    bindList(container);
    bindEditor(container);
    bindIoPanel(container);
    container.querySelector("#seidr-act-add")?.addEventListener("click", function() {
      const created = seidrAddAction();
      if (!created) {
        setIoMsg(container, "Action limit reached (" + SEIDR_ACTIONS_MAX + ")");
        return;
      }
      editId = created.id;
      draft = seidrDefaultAction(created.id);
      Object.assign(draft, created);
      if (!draft.items) draft.items = [];
      if (!draft.icon) draft.icon = seidrDefaultActionIcon();
      arousalPickerOpen = false;
      renderList(container);
      renderEditor(container);
      bindList(container);
      bindEditor(container);
      afterSave();
    });
  }
  function seidrRefreshActionsTab() {
    const pane = $2("seidr-settings-pane-actions");
    if (!pane) return;
    editId = null;
    draft = null;
    importCandidates = null;
    seidrBuildActionsTab(pane);
  }

  // src/settings/ui.ts
  function $3(id) {
    return document.getElementById(id);
  }
  var drawDraft = null;
  var drawDirty = false;
  function poseRow(id, label) {
    const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
    return [
      '<div class="seidr-settings-draw-row" data-pose="' + id + '">',
      '<span class="seidr-settings-draw-label">' + label + "</span>",
      '<label class="seidr-settings-draw-field">X',
      '<input type="number" id="seidr-set-draw-' + id + '-x" min="' + xMin + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
      "</label>",
      '<label class="seidr-settings-draw-field">Y',
      '<input type="number" id="seidr-set-draw-' + id + '-y" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
      "</label>",
      '<button type="button" data-draw-reset="' + id + '">Reset</button>',
      "</div>"
    ].join("");
  }
  function seidrBuildGeneralHtml() {
    const opts2 = RM_LAUNCHER_POSITIONS.map(function(p) {
      return '<option value="' + p.id + '">' + p.label + "</option>";
    }).join("");
    const modeOpts = AROUSAL_BAR_MODES.map(function(m) {
      return '<option value="' + m.id + '">' + m.label + "</option>";
    }).join("");
    const scopeOpts = AROUSAL_BAR_SCOPES.map(function(s) {
      return '<option value="' + s.id + '">' + s.label + "</option>";
    }).join("");
    const modOpts = FAST_OPEN_MODIFIERS.map(function(m) {
      return '<option value="' + m.id + '">' + m.label + "</option>";
    }).join("");
    const slotOpts = seidrRestraintSlots().map(function(s) {
      return '<option value="' + s.id + '">' + s.label + "</option>";
    }).join("");
    return [
      '<details class="seidr-settings-sec">',
      "<summary>Fast Open Actions</summary>",
      '<div class="seidr-settings-row">',
      '<label><input type="checkbox" id="seidr-set-fast-open" /> Enable Fast Open Actions</label>',
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Modifier</span>',
      '<select id="seidr-set-fast-open-mod">' + modOpts + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Default slot</span>',
      '<select id="seidr-set-fast-open-slot">' + slotOpts + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Hold the modifier and click a room character to open Club Activity View on the default slot (falls back if that zone has no activities). If FAM Shift-click is installed, pick another modifier or disable this.</p>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Room Manager</summary>",
      '<div class="seidr-settings-row">',
      '<label><input type="checkbox" id="seidr-set-rm-enabled" /> Activate Room Manager</label>',
      "</div>",
      '<p class="seidr-settings-hint">Master switch for Room Manager (ChatAdmin button and floating quickmenu).</p>',
      '<div class="seidr-settings-row">',
      '<label><input type="checkbox" id="seidr-set-quickmenu" /> Show Quickmenu Button</label>',
      "</div>",
      '<p class="seidr-settings-hint">Floating \u2302 in the chat room. Off hides it completely. ChatAdmin Room Manager button is unaffected.</p>',
      '<div class="seidr-settings-row">',
      '<button type="button" id="seidr-set-open-rm">Open Room Manager</button>',
      "</div>",
      '<p class="seidr-settings-hint" id="seidr-set-open-rm-msg"></p>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Launcher position</summary>",
      '<div class="seidr-settings-row">',
      '<select id="seidr-set-rm-pos">' + opts2 + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Drawing</summary>",
      '<p class="seidr-settings-hint">Echo pair spacing: Pull X is half-gap from center (hub shifts on one-side pull). Pull Y raises both sides. Cuddle moves the holder. Models only \u2014 hitboxes stay put. Save Drawing to keep.</p>',
      poseRow("pull", "Pull"),
      poseRow("cuddle", "Cuddle"),
      '<div class="seidr-settings-row seidr-settings-draw-actions">',
      '<button type="button" id="seidr-set-draw-save">Save Drawing</button>',
      "</div>",
      '<p class="seidr-settings-hint" id="seidr-set-draw-msg"></p>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Arousal bars</summary>",
      '<p class="seidr-settings-hint">Hide or relocate Club / BCTweaks arousal meters (on-character thermometer and split orgasm track).</p>',
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Mode</span>',
      '<select id="seidr-set-arousal-mode">' + modeOpts + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Who</span>',
      '<select id="seidr-set-arousal-scope">' + scopeOpts + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Seidr holds = hub, pull left/right, or cuddle. Show on change: bar appears when arousal moves, hides 1s after. Bottom bar: under each name inside the character hitbox (two slots; BCTweaks fills both).</p>',
      "</details>",
      '<details class="seidr-settings-sec" open>',
      "<summary>Storage</summary>",
      '<p class="seidr-settings-hint" id="seidr-set-storage-total">\u2014</p>',
      '<div class="seidr-set-storage-bar" aria-hidden="true"><div class="seidr-set-storage-bar-fill" id="seidr-set-storage-bar"></div></div>',
      '<div class="seidr-set-storage-rows" id="seidr-set-storage-rows"></div>',
      '<p class="seidr-settings-hint" id="seidr-set-storage-maps-hint"></p>',
      "</details>"
    ].join("");
  }
  function storageRow(label, bytes) {
    return '<div class="seidr-settings-field-row seidr-set-storage-row"><span class="seidr-settings-field-label">' + label + '</span><span class="seidr-set-storage-val">' + rmFormatBytes(bytes) + "</span></div>";
  }
  function seidrRefreshStorageUi() {
    const totalEl = $3("seidr-set-storage-total");
    const bar = $3("seidr-set-storage-bar");
    const rows = $3("seidr-set-storage-rows");
    const mapsHint = $3("seidr-set-storage-maps-hint");
    if (!totalEl && !rows) return;
    let b;
    try {
      b = rmUsageBreakdown();
    } catch (e) {
      if (totalEl) totalEl.textContent = "Storage unavailable";
      return;
    }
    const pct = b.max > 0 ? Math.min(100, Math.round(b.total / b.max * 100)) : 0;
    if (totalEl) {
      totalEl.textContent = "Total " + rmFormatBytes(b.total) + " / " + rmFormatBytes(b.max) + " (" + pct + "%)";
    }
    if (bar) bar.style.width = pct + "%";
    if (rows) {
      rows.innerHTML = [
        storageRow("Maps", b.maps),
        storageRow("Rooms", b.room),
        storageRow("Access", b.access),
        storageRow("Backgrounds", b.backgrounds),
        storageRow("Actions", b.actions),
        storageRow("Settings", b.settings),
        storageRow("UI", b.ui)
      ].join("");
    }
    if (mapsHint) {
      mapsHint.textContent = "Maps budget (75%): " + rmFormatBytes(b.maps) + " / " + rmFormatBytes(b.mapBudget);
    }
  }
  function seidrBuildSettingsBody() {
    const body = $3("seidr-settings-body");
    const tabs = $3("seidr-settings-tabs");
    if (!body) return;
    const showActions = Seidr.SHOW_ACTIONS !== false;
    if (tabs) {
      tabs.innerHTML = [
        '<button type="button" class="seidr-settings-tab seidr-settings-tab-on" data-seidr-tab="general">General</button>',
        showActions ? '<button type="button" class="seidr-settings-tab" data-seidr-tab="actions">Actions</button>' : ""
      ].join("");
    }
    body.innerHTML = [
      '<div class="seidr-settings-pane seidr-settings-pane-on" id="seidr-settings-pane-general" data-seidr-pane="general">',
      seidrBuildGeneralHtml(),
      "</div>",
      showActions ? '<div class="seidr-settings-pane" id="seidr-settings-pane-actions" data-seidr-pane="actions"></div>' : ""
    ].join("");
    if (showActions) {
      const actPane = $3("seidr-settings-pane-actions");
      if (actPane) seidrBuildActionsTab(actPane);
    }
    const tabRoot = tabs || body;
    tabRoot.querySelectorAll("[data-seidr-tab]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        const tab = btn2.getAttribute("data-seidr-tab");
        tabRoot.querySelectorAll(".seidr-settings-tab").forEach(function(t) {
          t.classList.toggle("seidr-settings-tab-on", t.getAttribute("data-seidr-tab") === tab);
        });
        body.querySelectorAll(".seidr-settings-pane").forEach(function(p) {
          p.classList.toggle("seidr-settings-pane-on", p.getAttribute("data-seidr-pane") === tab);
        });
      });
    });
  }
  function setDrawMsg(text) {
    const el = $3("seidr-set-draw-msg");
    if (el) el.textContent = text || "";
  }
  function fillDrawInputs(o) {
    ["pull", "cuddle"].forEach(function(pose) {
      const x = $3("seidr-set-draw-" + pose + "-x");
      const y = $3("seidr-set-draw-" + pose + "-y");
      if (x) x.value = String(o[pose].x);
      if (y) y.value = String(o[pose].y);
    });
  }
  function readDrawDraftFromInputs() {
    const fallback = drawDraft ? drawDraft : seidrDefaultDrawOffsets();
    return seidrNormalizeDrawOffsets({
      pull: {
        x: $3("seidr-set-draw-pull-x")?.value,
        y: $3("seidr-set-draw-pull-y")?.value
      },
      cuddle: {
        x: $3("seidr-set-draw-cuddle-x")?.value,
        y: $3("seidr-set-draw-cuddle-y")?.value
      }
    }, fallback);
  }
  function liveApplyDraft() {
    if (!drawDraft) return;
    seidrApplyDrawOffsets(drawDraft);
  }
  function seidrBeginDrawDraft() {
    drawDraft = seidrCloneDrawOffsets(seidrGetSettings().drawOffsets);
    drawDirty = false;
    fillDrawInputs(drawDraft);
    seidrApplyDrawOffsets(drawDraft);
    setDrawMsg("");
  }
  function seidrDiscardDrawDraft() {
    if (!drawDirty && !drawDraft) {
      seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
      drawDraft = null;
      return;
    }
    drawDraft = null;
    drawDirty = false;
    seidrApplyDrawOffsets(seidrGetSettings().drawOffsets);
    setDrawMsg("");
  }
  function seidrRefreshSettingsUi() {
    const s = seidrGetSettings();
    const en = $3("seidr-set-rm-enabled");
    const qm = $3("seidr-set-quickmenu");
    const pos = $3("seidr-set-rm-pos");
    const am = $3("seidr-set-arousal-mode");
    const as = $3("seidr-set-arousal-scope");
    const fo = $3("seidr-set-fast-open");
    const fom = $3("seidr-set-fast-open-mod");
    const fos = $3("seidr-set-fast-open-slot");
    if (en) en.checked = !!s.roomManagerEnabled;
    if (qm) qm.checked = s.showQuickmenuButton !== false;
    if (pos) pos.value = s.launcherPosition;
    if (am) am.value = s.arousalBarMode;
    if (as) as.value = s.arousalBarScope;
    if (fo) fo.checked = s.fastOpenActionsEnabled !== false;
    if (fom) fom.value = s.fastOpenActionsModifier || "Shift";
    if (fos) fos.value = s.fastOpenActionsSlot || "ItemTorso";
    seidrBeginDrawDraft();
    seidrRefreshStorageUi();
    if (Seidr.SHOW_ACTIONS !== false) seidrRefreshActionsTab();
  }
  function seidrBindSettingsUi(onChange) {
    const en = $3("seidr-set-rm-enabled");
    const qm = $3("seidr-set-quickmenu");
    const pos = $3("seidr-set-rm-pos");
    const am = $3("seidr-set-arousal-mode");
    const ascope = $3("seidr-set-arousal-scope");
    const fo = $3("seidr-set-fast-open");
    const fom = $3("seidr-set-fast-open-mod");
    const fos = $3("seidr-set-fast-open-slot");
    const openRm = $3("seidr-set-open-rm");
    const openMsg = $3("seidr-set-open-rm-msg");
    function persist() {
      const patch = {
        roomManagerEnabled: !!(en && en.checked),
        showQuickmenuButton: !!(qm && qm.checked),
        launcherPosition: pos && pos.value ? pos.value : "chatTop",
        arousalBarMode: am && am.value ? am.value : "off",
        arousalBarScope: ascope && ascope.value ? ascope.value : "seidrCluster",
        fastOpenActionsEnabled: !!(fo && fo.checked),
        fastOpenActionsModifier: fom && fom.value ? fom.value : "Shift",
        fastOpenActionsSlot: fos && fos.value ? fos.value : "ItemTorso"
      };
      seidrSaveSettings(patch);
      if (onChange) onChange();
    }
    if (en) en.addEventListener("change", persist);
    if (qm) qm.addEventListener("change", persist);
    if (pos) pos.addEventListener("change", persist);
    if (am) am.addEventListener("change", persist);
    if (ascope) ascope.addEventListener("change", persist);
    if (fo) fo.addEventListener("change", persist);
    if (fos) fos.addEventListener("change", persist);
    if (fom) fom.addEventListener("change", persist);
    if (openRm) {
      openRm.addEventListener("click", function() {
        const s = seidrGetSettings();
        if (!Seidr.SHOW_ROOM_MANAGER || s.roomManagerEnabled === false) {
          if (openMsg) openMsg.textContent = "Activate Room Manager first.";
          return;
        }
        if (openMsg) openMsg.textContent = "";
        if (typeof Seidr.rmOpenPanel === "function") Seidr.rmOpenPanel();
        else if (openMsg) openMsg.textContent = "Room Manager unavailable.";
      });
    }
    function onDrawLive() {
      const next = readDrawDraftFromInputs();
      drawDraft = next;
      drawDirty = true;
      liveApplyDraft();
      setDrawMsg("Preview \u2014 Save Drawing to keep");
    }
    function onDrawCommit() {
      const next = readDrawDraftFromInputs();
      drawDraft = next;
      drawDirty = true;
      fillDrawInputs(next);
      liveApplyDraft();
      setDrawMsg("Preview \u2014 Save Drawing to keep");
    }
    ["pull", "cuddle"].forEach(function(pose) {
      const x = $3("seidr-set-draw-" + pose + "-x");
      const y = $3("seidr-set-draw-" + pose + "-y");
      if (x) {
        x.addEventListener("input", onDrawLive);
        x.addEventListener("change", onDrawCommit);
      }
      if (y) {
        y.addEventListener("input", onDrawLive);
        y.addEventListener("change", onDrawCommit);
      }
    });
    document.querySelectorAll("[data-draw-reset]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        const pose = btn2.getAttribute("data-draw-reset");
        if (!pose || !drawDraft) return;
        const def = seidrDefaultDrawOffsets();
        drawDraft[pose] = { x: def[pose].x, y: def[pose].y };
        drawDirty = true;
        fillDrawInputs(drawDraft);
        liveApplyDraft();
        setDrawMsg("Reset to default \u2014 Save Drawing to keep");
      });
    });
    const saveBtn = $3("seidr-set-draw-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", function() {
        const next = readDrawDraftFromInputs();
        drawDraft = next;
        const saved = seidrSaveSettings({ drawOffsets: next });
        if (!saved.ok) {
          setDrawMsg(saved.error || "Save failed");
          return;
        }
        drawDirty = false;
        seidrApplyDrawOffsets(next);
        fillDrawInputs(next);
        setDrawMsg("Drawing saved");
      });
    }
  }

  // src/settings/shell.ts
  var root2 = null;
  var panel2 = null;
  function clampPanel2() {
    if (!panel2) return;
    const pad = 8;
    const w = panel2.offsetWidth;
    const h = panel2.offsetHeight;
    let left = panel2.offsetLeft;
    let top = panel2.offsetTop;
    if (panel2.style.left) left = parseFloat(panel2.style.left) || left;
    if (panel2.style.top) top = parseFloat(panel2.style.top) || top;
    const maxL = Math.max(pad, window.innerWidth - w - pad);
    const maxT = Math.max(pad, window.innerHeight - h - pad);
    left = Math.min(Math.max(pad, left), maxL);
    top = Math.min(Math.max(pad, top), maxT);
    panel2.style.left = left + "px";
    panel2.style.top = top + "px";
    panel2.style.right = "auto";
    panel2.style.transform = "none";
  }
  function seidrEnsureSettingsShell() {
    seidrInjectSettingsStyles();
    if (root2 && document.body.contains(root2)) return;
    root2 = document.createElement("div");
    root2.id = "seidr-settings-root";
    panel2 = document.createElement("div");
    panel2.id = "seidr-settings-panel";
    panel2.innerHTML = [
      '<div class="seidr-settings-header">',
      '  <div class="seidr-settings-header-title">Seidr<span>Settings</span></div>',
      '  <button type="button" class="seidr-settings-icon-btn" data-seidr="close" title="Close">\xD7</button>',
      "</div>",
      '<div class="seidr-settings-tabs" id="seidr-settings-tabs" role="tablist"></div>',
      '<div class="seidr-settings-body" id="seidr-settings-body"></div>'
    ].join("");
    root2.appendChild(panel2);
    document.body.appendChild(root2);
    ["pointerdown", "mousedown", "mouseup", "click", "wheel", "touchstart"].forEach(function(type) {
      root2.addEventListener(type, function(ev) {
        ev.stopPropagation();
      });
    });
    const header = panel2.querySelector(".seidr-settings-header");
    (function() {
      let ox = 0;
      let oy = 0;
      header.addEventListener("pointerdown", function(ev) {
        if (ev.target.closest("button")) return;
        const r = panel2.getBoundingClientRect();
        ox = ev.clientX - r.left;
        oy = ev.clientY - r.top;
        panel2.style.transform = "none";
        header.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
      header.addEventListener("pointermove", function(ev) {
        if (!header.hasPointerCapture(ev.pointerId)) return;
        panel2.style.left = ev.clientX - ox + "px";
        panel2.style.top = ev.clientY - oy + "px";
        panel2.style.right = "auto";
      });
      header.addEventListener("pointerup", function(ev) {
        if (!header.hasPointerCapture(ev.pointerId)) return;
        header.releasePointerCapture(ev.pointerId);
        clampPanel2();
      });
    })();
    panel2.querySelector('[data-seidr="close"]').addEventListener("click", function() {
      seidrCloseSettings();
    });
    seidrBuildSettingsBody();
    seidrBindSettingsUi(function() {
      if (typeof Seidr.rmOnSettingsChanged === "function") {
        try {
          Seidr.rmOnSettingsChanged();
        } catch (e) {
        }
      }
    });
  }
  function seidrOpenSettings() {
    seidrEnsureSettingsShell();
    if (!panel2) return;
    seidrRefreshSettingsUi();
    panel2.querySelectorAll("details").forEach(function(d) {
      d.removeAttribute("open");
    });
    panel2.classList.add("seidr-settings-open");
    panel2.removeAttribute("hidden");
  }
  function seidrCloseSettings() {
    if (!panel2) return;
    try {
      seidrDiscardDrawDraft();
    } catch (e) {
    }
    panel2.classList.remove("seidr-settings-open");
    panel2.setAttribute("hidden", "true");
  }
  function seidrLeavePreferenceToGame() {
    try {
      if (typeof PreferenceExtensionsCurrent !== "undefined" && PreferenceExtensionsCurrent) {
        if (typeof PreferenceExtensionsCurrent.unload === "function") {
          PreferenceExtensionsCurrent.unload();
        }
        window.PreferenceExtensionsCurrent = null;
      }
    } catch (e) {
    }
    if (typeof ChatRoomData !== "undefined" && ChatRoomData && typeof CommonSetScreen === "function") {
      CommonSetScreen("Online", "ChatRoom");
      return;
    }
    if (typeof InformationSheetReturnScreen !== "undefined" && InformationSheetReturnScreen && typeof CommonSetScreen === "function") {
      CommonSetScreen.apply(null, InformationSheetReturnScreen);
      return;
    }
    if (typeof CommonSetScreen === "function") CommonSetScreen("Room", "MainHall");
  }
  function seidrRegisterPreference() {
    if (typeof PreferenceRegisterExtensionSetting !== "function") return;
    try {
      if (typeof PreferenceExtensionsSettings !== "undefined" && PreferenceExtensionsSettings.Seidr) return;
    } catch (e) {
    }
    PreferenceRegisterExtensionSetting({
      Identifier: "Seidr",
      ButtonText: "Seidr",
      Image: Seidr.LOGO_URL || "https://freya-bc.github.io/Freyas-Seidr/assets/freyas-seidr-logo.png",
      load: function() {
        seidrOpenSettings();
        seidrLeavePreferenceToGame();
      },
      run: function() {
      },
      click: function() {
      },
      exit: function() {
        return true;
      },
      unload: function() {
      }
    });
  }
  Seidr.openSettings = seidrOpenSettings;
  Seidr.closeSettings = seidrCloseSettings;
  Seidr.registerPreference = seidrRegisterPreference;

  // src/settings/index.ts
  function installSeidrSettings() {
    try {
      seidrLoadCommittedDrawOffsets();
    } catch (e) {
    }
    seidrRegisterPreference();
  }
  Seidr.installSeidrSettings = installSeidrSettings;

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
    ["seidr-styles", "seidr-loaded", "seidr-rm-styles", "seidr-settings-styles"].forEach(function(id) {
      const node = document.getElementById(id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    ["seidr-rm-root", "seidr-settings-root"].forEach(function(id) {
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
    if (typeof Seidr.installArousalBars === "function") {
      try {
        Seidr.installArousalBars();
      } catch (e) {
        console.warn("[Seidr] Arousal bars", e);
      }
    }
    if (typeof Seidr.installFastOpen === "function") {
      try {
        Seidr.installFastOpen();
      } catch (e) {
        console.warn("[Seidr] Fast Open", e);
      }
    }
    if (typeof Seidr.installActions === "function") {
      try {
        Seidr.installActions();
      } catch (e) {
        console.warn("[Seidr] Actions", e);
      }
    }
    Seidr.installNet();
    if (typeof Seidr.installRoomManager === "function") {
      try {
        Seidr.installRoomManager();
      } catch (e) {
        console.warn("[Seidr] Room Manager", e);
      }
    }
    if (typeof Seidr.installSeidrSettings === "function") {
      try {
        Seidr.installSeidrSettings();
      } catch (e) {
        console.warn("[Seidr] Settings", e);
      }
    }
  }
  function ready() {
    return typeof Player !== "undefined" && !!Player && Player.MemberNumber != null && typeof ActivityFemale3DCG !== "undefined" && typeof PreferenceRegisterExtensionSetting === "function";
  }
  function boot() {
    if (Seidr._booted) return;
    if (!ready()) return;
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
    if (ready()) {
      boot();
      return;
    }
    setTimeout(wait, 250);
  }
  wait();
})();
})();
