/* Seidr v1.0.21 — page-context IIFE. Dev gist / Pages / FUSAM sibling. */
(function () {
	"use strict";
	if (window.__SeidrPageLoaded) return;
	window.__SeidrPageLoaded = true;
(() => {
  // src/seidr.ts
  var Seidr = {};
  window.Seidr = Seidr;

  // src/defaults.ts
  Seidr.VERSION = "1.0.21";
  Seidr.FULL_NAME = "Seidr";
  Seidr.PREFIX = "Seidr_";
  Seidr.HIDDEN = "Seidr";
  Seidr.GROUPS = ["ItemTorso"];
  Seidr.drawOffsets = {
    pullLeft: { x: -75, y: 0 },
    pullRight: { x: 75, y: 0 },
    cuddle: { x: 0, y: -50 }
  };
  Seidr.BOOKMARK_GIST_ID = "9bbf11dc304132b1dc2d8e8ff4eea168";
  Seidr.REPO_URL = "https://github.com/Freya-BC/Freyas-Seidr";
  Seidr.RAW_SCRIPT_URL = "https://freya-bc.github.io/Freyas-Seidr/seidr.js";
  Seidr.RAW_LOADER_URL = "https://freya-bc.github.io/Freyas-Seidr/loader.js";
  Seidr.LOGO_URL = "https://freya-bc.github.io/Freyas-Seidr/assets/freyas-seidr-logo.png";
  Seidr.SHOW_ROOM_MANAGER = true;
  Seidr.RM_STORAGE_KEY = "SeidrRoomManager";
  Seidr.RM_DATA_VERSION = 1;
  Seidr.RM_MAX_COMPRESSED = 18e4;
  Seidr.RM_MAP_BUDGET_RATIO = 0.75;
  Seidr.RM_MAP_MAX = 10;
  Seidr.RM_LZ_PREFIX = "SeidrRm1:";

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
  function seidrLiveOffsets() {
    var o = Seidr.drawOffsets;
    if (!o || typeof o !== "object") {
      return {
        pullLeft: { x: -75, y: 0 },
        pullRight: { x: 75, y: 0 },
        cuddle: { x: 0, y: -50 }
      };
    }
    function pair(p, fx, fy) {
      if (!p || typeof p !== "object") return { x: fx, y: fy };
      return {
        x: typeof p.x === "number" && isFinite(p.x) ? p.x : fx,
        y: typeof p.y === "number" && isFinite(p.y) ? p.y : fy
      };
    }
    return {
      pullLeft: pair(o.pullLeft, -75, 0),
      pullRight: pair(o.pullRight, 75, 0),
      cuddle: pair(o.cuddle, 0, -50)
    };
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
    var n = character.MemberNumber;
    if (n === cluster.left) {
      return { X: center.X + o.pullLeft.x * z, Y: center.Y + o.pullLeft.y * z, Zoom: z };
    }
    if (n === cluster.right) {
      return { X: center.X + o.pullRight.x * z, Y: center.Y + o.pullRight.y * z, Zoom: z };
    }
    if (n === cluster.cuddle) return { X: center.X, Y: center.Y, Zoom: z };
    if (n === cluster.hub) {
      if (cluster.cuddle != null) {
        return { X: center.X + o.cuddle.x * z, Y: center.Y + o.cuddle.y * z, Zoom: z };
      }
      if (cluster.left != null && cluster.right == null) {
        return { X: center.X - o.pullLeft.x * z, Y: center.Y - o.pullLeft.y * z, Zoom: z };
      }
      if (cluster.right != null && cluster.left == null) {
        return { X: center.X - o.pullRight.x * z, Y: center.Y - o.pullRight.y * z, Zoom: z };
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
            seidrNatural[character.MemberNumber] = { X: charX, Y: charY, Zoom: zoom };
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

  // src/settings/model.ts
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
      pullLeft: { x: -75, y: 0 },
      pullRight: { x: 75, y: 0 },
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
  function seidrNormalizeDrawOffsetPair(raw, fallback) {
    const src = raw && typeof raw === "object" ? raw : null;
    return {
      x: seidrClampDrawCoord(src && src.x, fallback.x),
      y: seidrClampDrawCoord(src && src.y, fallback.y)
    };
  }
  function seidrNormalizeDrawOffsets(raw, fallback) {
    const base = fallback ? seidrCloneDrawOffsets(fallback) : seidrDefaultDrawOffsets();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    return {
      pullLeft: seidrNormalizeDrawOffsetPair(d.pullLeft, base.pullLeft),
      pullRight: seidrNormalizeDrawOffsetPair(d.pullRight, base.pullRight),
      cuddle: seidrNormalizeDrawOffsetPair(d.cuddle, base.cuddle)
    };
  }
  function seidrCloneDrawOffsets(o) {
    return {
      pullLeft: { x: o.pullLeft.x, y: o.pullLeft.y },
      pullRight: { x: o.pullRight.x, y: o.pullRight.y },
      cuddle: { x: o.cuddle.x, y: o.cuddle.y }
    };
  }
  function seidrDefaultSettings() {
    return {
      roomManagerEnabled: true,
      showQuickmenuButton: true,
      launcherPosition: "chatTop",
      drawOffsets: seidrDefaultDrawOffsets()
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
  function rmUsageLabel() {
    const used = rmCompressedBytes();
    const max = Seidr.RM_MAX_COMPRESSED || 18e4;
    const maps = rmMapsBytesEstimate();
    const mapCap = rmMapBudgetBytes();
    return "Storage: " + rmFormatBytes(used) + " / " + rmFormatBytes(max) + "  (maps " + rmFormatBytes(maps) + " \xB7 75% cap " + rmFormatBytes(mapCap) + ")";
  }

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
      const act = t.getAttribute("data-rm");
      const store = rmGetStore();
      if (act === "room-save") {
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
      } else if (act === "room-overwrite") {
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
      } else if (act === "room-load") {
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
      } else if (act === "room-delete") {
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
      } else if (act === "access-save") {
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
      } else if (act === "access-overwrite") {
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
      } else if (act === "access-load") {
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
      } else if (act === "access-delete") {
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
      } else if (act === "bg-add") {
        openBgDialog();
      } else if (act === "map-save-as") {
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
      } else if (act === "map-overwrite") {
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
      } else if (act === "map-load") {
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
      } else if (act === "map-delete") {
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
  var installed = false;
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
    if (installed) {
      rmUpdateLauncherVisibility();
      return;
    }
    installed = true;
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
    installed = false;
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
      "  width: min(92vw, 460px); min-width: 300px;",
      "  max-height: min(85vh, 640px);",
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
      "}"
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

  // src/settings/ui.ts
  function $2(id) {
    return document.getElementById(id);
  }
  var drawDraft = null;
  var drawDirty = false;
  function poseRow(id, label) {
    return [
      '<div class="seidr-settings-draw-row" data-pose="' + id + '">',
      '<span class="seidr-settings-draw-label">' + label + "</span>",
      '<label class="seidr-settings-draw-field">X',
      '<input type="number" id="seidr-set-draw-' + id + '-x" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
      "</label>",
      '<label class="seidr-settings-draw-field">Y',
      '<input type="number" id="seidr-set-draw-' + id + '-y" min="' + SEIDR_DRAW_OFFSET_MIN + '" max="' + SEIDR_DRAW_OFFSET_MAX + '" step="1" />',
      "</label>",
      '<button type="button" data-draw-reset="' + id + '">Reset</button>',
      "</div>"
    ].join("");
  }
  function seidrBuildSettingsBody() {
    const body = $2("seidr-settings-body");
    if (!body) return;
    const opts = RM_LAUNCHER_POSITIONS.map(function(p) {
      return '<option value="' + p.id + '">' + p.label + "</option>";
    }).join("");
    body.innerHTML = [
      '<section class="seidr-settings-sec">',
      "<h3>Room Manager</h3>",
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
      "</section>",
      '<section class="seidr-settings-sec">',
      "<h3>Launcher position</h3>",
      '<div class="seidr-settings-row">',
      '<select id="seidr-set-rm-pos">' + opts + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
      "</section>",
      '<section class="seidr-settings-sec">',
      "<h3>Drawing</h3>",
      '<p class="seidr-settings-hint">Live preview on character models only. Click hitboxes stay put. Save Drawing to keep.</p>',
      poseRow("pullLeft", "Pull Left"),
      poseRow("pullRight", "Pull Right"),
      poseRow("cuddle", "Cuddle"),
      '<div class="seidr-settings-row seidr-settings-draw-actions">',
      '<button type="button" id="seidr-set-draw-save">Save Drawing</button>',
      "</div>",
      '<p class="seidr-settings-hint" id="seidr-set-draw-msg"></p>',
      "</section>"
    ].join("");
  }
  function setDrawMsg(text) {
    const el = $2("seidr-set-draw-msg");
    if (el) el.textContent = text || "";
  }
  function fillDrawInputs(o) {
    ["pullLeft", "pullRight", "cuddle"].forEach(function(pose) {
      const x = $2("seidr-set-draw-" + pose + "-x");
      const y = $2("seidr-set-draw-" + pose + "-y");
      if (x) x.value = String(o[pose].x);
      if (y) y.value = String(o[pose].y);
    });
  }
  function readDrawDraftFromInputs() {
    const fallback = drawDraft ? drawDraft : seidrDefaultDrawOffsets();
    return seidrNormalizeDrawOffsets({
      pullLeft: {
        x: $2("seidr-set-draw-pullLeft-x")?.value,
        y: $2("seidr-set-draw-pullLeft-y")?.value
      },
      pullRight: {
        x: $2("seidr-set-draw-pullRight-x")?.value,
        y: $2("seidr-set-draw-pullRight-y")?.value
      },
      cuddle: {
        x: $2("seidr-set-draw-cuddle-x")?.value,
        y: $2("seidr-set-draw-cuddle-y")?.value
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
    const en = $2("seidr-set-rm-enabled");
    const qm = $2("seidr-set-quickmenu");
    const pos = $2("seidr-set-rm-pos");
    if (en) en.checked = !!s.roomManagerEnabled;
    if (qm) qm.checked = s.showQuickmenuButton !== false;
    if (pos) pos.value = s.launcherPosition;
    seidrBeginDrawDraft();
  }
  function seidrBindSettingsUi(onChange) {
    const en = $2("seidr-set-rm-enabled");
    const qm = $2("seidr-set-quickmenu");
    const pos = $2("seidr-set-rm-pos");
    const openRm = $2("seidr-set-open-rm");
    const openMsg = $2("seidr-set-open-rm-msg");
    function persist() {
      const patch = {
        roomManagerEnabled: !!(en && en.checked),
        showQuickmenuButton: !!(qm && qm.checked),
        launcherPosition: pos && pos.value ? pos.value : "chatTop"
      };
      seidrSaveSettings(patch);
      if (onChange) onChange();
    }
    if (en) en.addEventListener("change", persist);
    if (qm) qm.addEventListener("change", persist);
    if (pos) pos.addEventListener("change", persist);
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
    ["pullLeft", "pullRight", "cuddle"].forEach(function(pose) {
      const x = $2("seidr-set-draw-" + pose + "-x");
      const y = $2("seidr-set-draw-" + pose + "-y");
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
    const saveBtn = $2("seidr-set-draw-save");
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
