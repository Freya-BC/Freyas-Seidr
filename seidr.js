/* Seidr v1.0.82 — page-context IIFE. Dev gist / Pages / FUSAM sibling. */
(function () {
	"use strict";
	if (window.__SeidrPageLoaded) return;
	window.__SeidrPageLoaded = true;
(() => {
  // src/seidr.ts
  var Seidr = {};
  window.Seidr = Seidr;

  // src/defaults.ts
  Seidr.VERSION = "1.0.82";
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
  Seidr.ASSETS_BASE_URL = "https://freya-bc.github.io/Freyas-Seidr/assets";
  Seidr.DOCS_BASE_URL = "https://freya-bc.github.io/Freyas-Seidr";
  Seidr.SHOW_ROOM_MANAGER = true;
  Seidr.SHOW_ACTIONS = true;
  Seidr.SHOW_COMMANDS = true;
  Seidr.SHOW_CMD_FAST_SELECT = true;
  Seidr.RM_STORAGE_KEY = "SeidrRoomManager";
  Seidr.RM_DATA_VERSION = 1;
  Seidr.RM_MAX_COMPRESSED = 18e4;
  Seidr.RM_MAP_BUDGET_RATIO = 0.75;
  Seidr.RM_MAP_MAX = 10;
  Seidr.RM_MAP_VERSIONS_REMOTE_MAX = 10;
  Seidr.RM_MAP_LOCAL_MAX = 50;
  Seidr.RM_MAP_VERSIONS_LOCAL_MAX = 30;
  Seidr.RM_MAPS_LOCAL_KEY_PREFIX = "SeidrMapsLocal_";
  Seidr.RM_MAPS_LOCAL_LZ_PREFIX = "SeidrMapsLocal1:";
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
      if (typeof actName === "string" && actName.indexOf(Seidr.PREFIX) === 0 && actName.indexOf("Seidr_Act_") !== 0) {
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
      try {
        if (typeof Seidr.refreshOpenActivityMenuIcons === "function") Seidr.refreshOpenActivityMenuIcons();
      } catch (e3) {
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
    { id: "LegsClosed", label: "Legs closed" },
    { id: "Kneel", label: "Kneel" },
    { id: "KneelingSpread", label: "Kneeling spread" },
    { id: "BaseUpper", label: "Hands relaxed" },
    { id: "Yoked", label: "Yoked" },
    { id: "OverTheHead", label: "Hands up" },
    { id: "BackBoxTie", label: "Back box tie" },
    { id: "BackElbowTouch", label: "Hands armbinder" },
    { id: "AllFours", label: "On all fours" }
  ];
  function seidrPoseAvailable(C, poseId, opts4) {
    if (!poseId) return false;
    if (!C) return true;
    const aided = !!(opts4 && opts4.aided);
    try {
      if (typeof PoseCanChangeUnaidedStatus === "function" && PoseChangeStatus) {
        const status = PoseCanChangeUnaidedStatus(C, poseId);
        const min = aided ? PoseChangeStatus.NEVER_WITHOUT_AID : PoseChangeStatus.ALWAYS_WITH_STRUGGLE;
        return status >= min;
      }
      if (typeof PoseCanChangeUnaided === "function") {
        return !!PoseCanChangeUnaided(C, poseId);
      }
    } catch (e) {
    }
    return true;
  }
  function seidrPosesForCharacter(C, opts4) {
    return SEIDR_ACTION_POSES.filter(function(p) {
      return seidrPoseAvailable(C, p.id, opts4);
    });
  }
  function seidrPoseLabel(poseId) {
    for (let i = 0; i < SEIDR_ACTION_POSES.length; i++) {
      if (SEIDR_ACTION_POSES[i].id === poseId) return SEIDR_ACTION_POSES[i].label;
    }
    return poseId;
  }
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

  // src/animations/model.ts
  var SEIDR_ANIMATIONS_MAX = 50;
  var SEIDR_ANIM_STEPS_MAX = 20;
  var SEIDR_ANIM_WAIT_TOTAL_MAX = 60;
  var SEIDR_ANIM_NAME_MAX = 40;
  var SEIDR_ANIM_FACE_MAP = {
    Eyebrows: ["Raised", "Lowered", "OneRaised", "Harsh", "Angry", "Soft"],
    Eyes: [
      "Closed",
      "Dazed",
      "Shy",
      "Sad",
      "Horny",
      "Lewd",
      "VeryLewd",
      "Heart",
      "HeartPink",
      "LewdHeart",
      "LewdHeartPink",
      "Dizzy",
      "Daydream",
      "ShylyHappy",
      "Angry",
      "Surprised",
      "Scared"
    ],
    Mouth: [
      "Frown",
      "Sad",
      "Pained",
      "Angry",
      "HalfOpen",
      "Open",
      "Ahegao",
      "Moan",
      "TonguePinch",
      "LipBite",
      "Happy",
      "Devious",
      "Laughing",
      "Grin",
      "Smirk",
      "Pout"
    ],
    Blush: ["Low", "Medium", "High", "VeryHigh", "Extreme", "ShortBreath"],
    Fluids: [
      "DroolLow",
      "DroolMedium",
      "DroolHigh",
      "DroolSides",
      "DroolMessy",
      "TearsHigh",
      "TearsMedium",
      "TearsLow",
      "DroolTearsLow",
      "DroolTearsMedium",
      "DroolTearsHigh"
    ]
  };
  var SEIDR_ANIM_FACE_DURATIONS = ["keep", "5", "15", "30"];
  var POSE_IDS = SEIDR_ACTION_POSES.map(function(p) {
    return p.id;
  });
  var FACE_FEATURES = ["Eyebrows", "Eyes", "Mouth", "Blush", "Fluids"];
  function clampWait(raw) {
    let n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!Number.isFinite(n) || n < 0) n = 0.5;
    if (n > SEIDR_ANIM_WAIT_TOTAL_MAX) n = SEIDR_ANIM_WAIT_TOTAL_MAX;
    return Math.round(n * 100) / 100;
  }
  function seidrAnimWaitTotal(steps) {
    let sum = 0;
    for (let i = 0; i < steps.length; i++) sum += Number(steps[i].wait) || 0;
    return Math.round(sum * 100) / 100;
  }
  function seidrDefaultAnimPoseStep() {
    return { kind: "pose", pose: "Kneel", wait: 0.5 };
  }
  function seidrDefaultAnimFaceStep() {
    return { kind: "face", feature: "Eyes", expression: "Closed", duration: "keep", wait: 0.5 };
  }
  function seidrDefaultAnimation(id) {
    return { id, name: "Animation " + id, steps: [seidrDefaultAnimPoseStep()], chatText: "" };
  }
  function seidrDefaultAnimationsBag() {
    return { nextId: 1, list: [] };
  }
  function sanitizePoseStep(raw) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    if (d.kind !== "pose") return null;
    const pose = POSE_IDS.indexOf(String(d.pose || "")) >= 0 ? String(d.pose) : "Kneel";
    return { kind: "pose", pose, wait: clampWait(d.wait) };
  }
  function sanitizeFaceStep(raw) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    if (d.kind !== "face") return null;
    let feature = String(d.feature || "Eyes");
    if (FACE_FEATURES.indexOf(feature) < 0) feature = "Eyes";
    const allowed = SEIDR_ANIM_FACE_MAP[feature] || [];
    let expression = String(d.expression == null ? "" : d.expression);
    if (expression && allowed.indexOf(expression) < 0) expression = allowed[0] || "";
    let duration = String(d.duration || "keep");
    if (SEIDR_ANIM_FACE_DURATIONS.indexOf(duration) < 0) duration = "keep";
    return {
      kind: "face",
      feature,
      expression,
      duration,
      wait: clampWait(d.wait)
    };
  }
  function seidrNormalizeAnimStep(raw) {
    if (!raw || typeof raw !== "object") return null;
    const kind = raw.kind;
    if (kind === "pose") return sanitizePoseStep(raw);
    if (kind === "face") return sanitizeFaceStep(raw);
    return null;
  }
  function seidrNormalizeAnimation(raw, fallbackId) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : fallbackId && fallbackId > 0 ? fallbackId : 0;
    if (!id) return null;
    let name = String(d.name || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_ANIM_NAME_MAX);
    if (!name) name = "Animation " + id;
    const steps = [];
    if (Array.isArray(d.steps)) {
      for (let i = 0; i < d.steps.length && steps.length < SEIDR_ANIM_STEPS_MAX; i++) {
        const st = seidrNormalizeAnimStep(d.steps[i]);
        if (st) steps.push(st);
      }
    }
    let total = seidrAnimWaitTotal(steps);
    if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
      let over = total - SEIDR_ANIM_WAIT_TOTAL_MAX;
      for (let j = steps.length - 1; j >= 0 && over > 0; j--) {
        const w = steps[j].wait;
        const cut = Math.min(w, over);
        steps[j].wait = Math.round((w - cut) * 100) / 100;
        over -= cut;
      }
    }
    const chatText = typeof d.chatText === "string" && d.chatText.trim() ? d.chatText.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : "";
    return { id, name, steps, chatText };
  }
  function seidrNormalizeAnimationsBag(raw) {
    const base = seidrDefaultAnimationsBag();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    const list = [];
    const seen = {};
    if (Array.isArray(d.list)) {
      for (let i = 0; i < d.list.length && list.length < SEIDR_ANIMATIONS_MAX; i++) {
        const a = seidrNormalizeAnimation(d.list[i]);
        if (!a || seen[a.id]) continue;
        seen[a.id] = true;
        list.push(a);
        if (a.id >= base.nextId) base.nextId = a.id + 1;
      }
    }
    if (typeof d.nextId === "number" && d.nextId > base.nextId) {
      base.nextId = Math.floor(d.nextId);
    }
    base.list = list;
    return base;
  }

  // src/commands/model.ts
  var SEIDR_CMD_PEOPLE_MAX = 50;
  var SEIDR_CMD_ACTIONS_MAX = 50;
  var SEIDR_CMD_ALIAS_MAX = 48;
  var SEIDR_CMD_NAME_MAX = 48;
  var SEIDR_CMD_WARN_MS = 8e3;
  var SEIDR_CMD_ERROR_MS = 3e4;
  var SEIDR_CMD_ENABLE_KEYS = [
    "a",
    "action",
    "strip",
    "stripe",
    "poses",
    "p",
    "animation",
    "ani",
    "seidr",
    "roommanager"
  ];
  var SEIDR_CMD_ENABLE_LABELS = [
    { key: "a", label: "/a" },
    { key: "action", label: "/action" },
    { key: "strip", label: "/strip" },
    { key: "stripe", label: "/stripe" },
    { key: "poses", label: "/poses" },
    { key: "p", label: "/p" },
    { key: "animation", label: "/animation" },
    { key: "ani", label: "/ani" },
    { key: "seidr", label: "/seidr" },
    { key: "roommanager", label: "/roommanager" }
  ];
  var SEIDR_FAST_SELECT_EMPTY_OPTS = [
    { id: "disabled", label: "Disabled (normal Tab)" },
    { id: "action", label: "Action (/action)" },
    { id: "poses", label: "Poses (/poses)" },
    { id: "animation", label: "Animation (/animation)" },
    { id: "strip", label: "Strip (/strip)" }
  ];
  var SEIDR_FAST_SELECT_KEYS = ["a", "s", "d", "p"];
  var SEIDR_FAST_SELECT_KEY_LABELS = [
    { key: "a", label: "a + Tab \u2192 /action" },
    { key: "s", label: "s + Tab \u2192 /strip" },
    { key: "d", label: "d + Tab \u2192 /animation" },
    { key: "p", label: "p + Tab \u2192 /poses" }
  ];
  function seidrDefaultFastSelectKeys() {
    return { a: true, s: true, d: true, p: true };
  }
  function seidrNormalizeFastSelectKeys(raw) {
    const base = seidrDefaultFastSelectKeys();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    for (let i = 0; i < SEIDR_FAST_SELECT_KEYS.length; i++) {
      const k = SEIDR_FAST_SELECT_KEYS[i];
      if (typeof d[k] === "boolean") base[k] = d[k];
    }
    return base;
  }
  var FAST_SELECT_EMPTY_IDS = [
    "disabled",
    "action",
    "poses",
    "animation",
    "strip"
  ];
  function seidrNormalizeFastSelectEmpty(raw) {
    const s = String(raw || "").trim().toLowerCase();
    if (FAST_SELECT_EMPTY_IDS.indexOf(s) >= 0) return s;
    return "disabled";
  }
  function seidrDefaultCmdEnabled() {
    const out = {};
    for (let i = 0; i < SEIDR_CMD_ENABLE_KEYS.length; i++) {
      out[SEIDR_CMD_ENABLE_KEYS[i]] = true;
    }
    return out;
  }
  function seidrNormalizeCmdEnabled(raw) {
    const base = seidrDefaultCmdEnabled();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    for (let i = 0; i < SEIDR_CMD_ENABLE_KEYS.length; i++) {
      const k = SEIDR_CMD_ENABLE_KEYS[i];
      if (typeof d[k] === "boolean") base[k] = d[k];
    }
    return base;
  }
  function seidrCmdEnableKeyForTag(tag) {
    const t = String(tag || "").toLowerCase();
    if (t === "a") return "a";
    if (t === "action") return "action";
    if (t === "strip") return "strip";
    if (t === "stripe") return "stripe";
    if (t === "poses") return "poses";
    if (t === "p") return "p";
    if (t === "animation") return "animation";
    if (t === "ani") return "ani";
    if (t === "seidr") return "seidr";
    if (t === "roommanager") return "roommanager";
    return null;
  }
  function seidrDefaultCommandsBag() {
    return {
      nextPersonId: 1,
      nextActionId: 1,
      people: [],
      actions: [],
      enabled: seidrDefaultCmdEnabled(),
      fastSelectEnabled: true,
      fastSelectKeys: seidrDefaultFastSelectKeys(),
      fastSelectEmpty: "disabled"
    };
  }
  function cleanAlias(raw) {
    return String(raw || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_CMD_ALIAS_MAX);
  }
  function cleanName(raw) {
    return String(raw || "").trim().replace(/\s+/g, " ").slice(0, SEIDR_CMD_NAME_MAX);
  }
  function seidrNormalizeCmdPerson(raw) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : 0;
    const alias = cleanAlias(d.alias);
    const mn = typeof d.memberNumber === "number" ? Math.floor(d.memberNumber) : typeof d.memberNumber === "string" ? parseInt(d.memberNumber, 10) : NaN;
    if (!id || !alias || !Number.isFinite(mn) || mn < 0) return null;
    return { id, alias, memberNumber: mn };
  }
  function seidrNormalizeCmdAction(raw) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    const id = typeof d.id === "number" && d.id > 0 ? Math.floor(d.id) : 0;
    const name = cleanName(d.name);
    const slot = String(d.slot || "").trim();
    const activity = String(d.activity || "").trim();
    if (!id || !name || !slot) return null;
    return { id, name, slot, activity };
  }
  function seidrNormalizeCommandsBag(raw) {
    const base = seidrDefaultCommandsBag();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    const people = [];
    const seenAlias = {};
    const seenMn = {};
    if (Array.isArray(d.people)) {
      for (let i = 0; i < d.people.length && people.length < SEIDR_CMD_PEOPLE_MAX; i++) {
        const p = seidrNormalizeCmdPerson(d.people[i]);
        if (!p) continue;
        const key = p.alias.toLowerCase();
        if (seenAlias[key]) continue;
        if (p.memberNumber > 0 && seenMn[p.memberNumber]) continue;
        seenAlias[key] = true;
        if (p.memberNumber > 0) seenMn[p.memberNumber] = true;
        people.push(p);
        if (p.id >= base.nextPersonId) base.nextPersonId = p.id + 1;
      }
    }
    const actions = [];
    const seenAct = {};
    if (Array.isArray(d.actions)) {
      for (let i = 0; i < d.actions.length && actions.length < SEIDR_CMD_ACTIONS_MAX; i++) {
        const a = seidrNormalizeCmdAction(d.actions[i]);
        if (!a) continue;
        const key = a.name.toLowerCase();
        if (seenAct[key]) continue;
        seenAct[key] = true;
        actions.push(a);
        if (a.id >= base.nextActionId) base.nextActionId = a.id + 1;
      }
    }
    if (typeof d.nextPersonId === "number" && d.nextPersonId > base.nextPersonId) {
      base.nextPersonId = Math.floor(d.nextPersonId);
    }
    if (typeof d.nextActionId === "number" && d.nextActionId > base.nextActionId) {
      base.nextActionId = Math.floor(d.nextActionId);
    }
    base.people = people;
    base.actions = actions;
    base.enabled = seidrNormalizeCmdEnabled(d.enabled);
    if (typeof d.fastSelectEnabled === "boolean") {
      base.fastSelectEnabled = d.fastSelectEnabled;
    }
    base.fastSelectKeys = seidrNormalizeFastSelectKeys(
      d.fastSelectKeys
    );
    base.fastSelectEmpty = seidrNormalizeFastSelectEmpty(
      d.fastSelectEmpty
    );
    return base;
  }
  function seidrDefaultCmdPerson(id) {
    return { id, alias: "", memberNumber: 0 };
  }
  function seidrDefaultCmdAction(id) {
    return { id, name: "", slot: "ItemTorso", activity: "" };
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
  var CLUSTER_NAME_MODES = [
    { id: "default", label: "Default (follow art)" },
    { id: "hitbox", label: "Hitbox (natural seats)" },
    { id: "hide", label: "Hide" },
    { id: "hover", label: "Hover (on hitbox)" }
  ];
  var AROUSAL_MODE_IDS = AROUSAL_BAR_MODES.map(function(m) {
    return m.id;
  });
  var AROUSAL_SCOPE_IDS = AROUSAL_BAR_SCOPES.map(function(s) {
    return s.id;
  });
  var CLUSTER_NAME_MODE_IDS = CLUSTER_NAME_MODES.map(function(m) {
    return m.id;
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
      welcomeLocalSeen: false,
      roomManagerEnabled: true,
      showQuickmenuButton: true,
      launcherPosition: "chatTop",
      drawOffsets: seidrDefaultDrawOffsets(),
      clusterNameMode: "hitbox",
      arousalBarMode: "off",
      arousalBarScope: "seidrCluster",
      fastOpenActionsEnabled: true,
      fastOpenActionsModifier: "Shift",
      fastOpenActionsSlot: "ItemTorso",
      customActionIcons: [],
      actions: { nextId: 1, list: [] },
      commands: seidrNormalizeCommandsBag(null),
      animations: seidrNormalizeAnimationsBag(null)
    };
  }
  function seidrNormalizeSettings(raw) {
    const base = seidrDefaultSettings();
    if (!raw || typeof raw !== "object") return base;
    const d = raw;
    if (typeof d.welcomeLocalSeen === "boolean") base.welcomeLocalSeen = d.welcomeLocalSeen;
    if (typeof d.roomManagerEnabled === "boolean") base.roomManagerEnabled = d.roomManagerEnabled;
    if (typeof d.showQuickmenuButton === "boolean") base.showQuickmenuButton = d.showQuickmenuButton;
    if (typeof d.launcherPosition === "string" && POSITION_IDS.indexOf(d.launcherPosition) >= 0) {
      base.launcherPosition = d.launcherPosition;
    }
    base.drawOffsets = seidrNormalizeDrawOffsets(d.drawOffsets);
    if (typeof d.clusterNameMode === "string" && CLUSTER_NAME_MODE_IDS.indexOf(d.clusterNameMode) >= 0) {
      base.clusterNameMode = d.clusterNameMode;
    }
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
    base.commands = seidrNormalizeCommandsBag(d.commands);
    base.animations = seidrNormalizeAnimationsBag(d.animations);
    return base;
  }

  // src/roomManager/model.ts
  var RM_MAP_DEFAULT_NAME = "Default";
  function rmIsDefaultVersionName(name) {
    return String(name || "") === RM_MAP_DEFAULT_NAME;
  }
  function rmCanonicalVersionName(raw, fallback) {
    const s = String(raw == null ? "" : raw).trim().slice(0, 48);
    if (!s) return fallback || RM_MAP_DEFAULT_NAME;
    if (s === "Original" || s === "Initial") return RM_MAP_DEFAULT_NAME;
    return s;
  }
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
  function rmNewId(prefix) {
    return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  function clampName(raw, fallback, max) {
    const s = String(raw == null ? "" : raw).trim().slice(0, max);
    return s || fallback;
  }
  function rmNormalizeMapVersion(raw, fallbackName) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    if (typeof d.data !== "string" || !d.data.length) return null;
    return {
      id: typeof d.id === "string" && d.id ? d.id : rmNewId("mv"),
      name: rmCanonicalVersionName(d.name, fallbackName || "Version"),
      data: d.data,
      savedAt: typeof d.savedAt === "number" && Number.isFinite(d.savedAt) ? d.savedAt : Date.now()
    };
  }
  function rmNormalizeMapSeries(raw, forceLocation) {
    if (!raw || typeof raw !== "object") return null;
    const d = raw;
    const id = typeof d.id === "string" && d.id ? d.id : rmNewId("m");
    const name = clampName(d.name, "Untitled", 48);
    let location = forceLocation || (d.location === "local" ? "local" : "remote");
    let versions = [];
    if (Array.isArray(d.versions) && d.versions.length) {
      for (let i = 0; i < d.versions.length; i++) {
        const v = rmNormalizeMapVersion(d.versions[i], "v" + (i + 1));
        if (v) versions.push(v);
      }
    } else if (typeof d.data === "string" && d.data.length) {
      versions.push({
        id: rmNewId("mv"),
        name: RM_MAP_DEFAULT_NAME,
        data: d.data,
        savedAt: typeof d.savedAt === "number" && Number.isFinite(d.savedAt) ? d.savedAt : Date.now()
      });
    }
    if (!versions.length) return null;
    return { id, name, location, versions };
  }
  function rmSerializeRemoteMaps(maps) {
    return maps.map(function(m) {
      const def = m.versions.find(function(v) {
        return rmIsDefaultVersionName(v.name);
      }) || m.versions[0];
      const versions = def ? [{
        id: def.id,
        name: RM_MAP_DEFAULT_NAME,
        data: def.data,
        savedAt: def.savedAt
      }] : [];
      return { id: m.id, name: m.name, versions };
    });
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
    const maps = [];
    if (Array.isArray(d.maps)) {
      for (let i = 0; i < d.maps.length; i++) {
        const series = rmNormalizeMapSeries(d.maps[i], "remote");
        if (series) {
          series.location = "remote";
          maps.push(series);
        }
      }
    }
    base.maps = maps;
    base.ui = d.ui && typeof d.ui === "object" ? d.ui : {};
    base.settings = seidrNormalizeSettings(d.settings);
    return base;
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
    const commands = settings.commands;
    const animations = settings.animations;
    const settingsRest = {};
    try {
      Object.keys(settings).forEach(function(k) {
        if (k === "actions" || k === "commands" || k === "animations") return;
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
      commands: rmSliceBytes({
        commands: commands != null ? commands : { nextPersonId: 1, nextActionId: 1, people: [], actions: [] }
      }),
      animations: rmSliceBytes({
        animations: animations != null ? animations : { nextId: 1, list: [] }
      }),
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

  // src/draw.ts
  var seidrNatural = {};
  var SEIDR_CLUSTER_NAME_Y = 968;
  var seidrNameDrawCtx = null;
  function seidrClusterNameMode() {
    try {
      const m = seidrGetSettings().clusterNameMode;
      if (m === "default" || m === "hitbox" || m === "hide" || m === "hover") return m;
    } catch (e) {
    }
    return "hitbox";
  }
  function seidrNameOffset() {
    try {
      const n = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter.length : 0;
      const photo = typeof CommonPhotoMode !== "undefined" && CommonPhotoMode;
      const focused = typeof CurrentCharacter !== "undefined" && CurrentCharacter != null;
      if ((n > 5 || n === 5 && photo) && !focused) return -4;
    } catch (e) {
    }
    return 0;
  }
  function seidrClusterNamePos(nat) {
    const z = nat.Zoom > 0 ? nat.Zoom : 1;
    const charW = 500 * z;
    const spaceW = nat.Space > 0 ? nat.Space : charW;
    const boxW = Math.min(spaceW, charW);
    const boxX = nat.X + (spaceW > charW ? (spaceW - charW) / 2 : 0);
    return {
      X: boxX + boxW / 2,
      Y: nat.Y + SEIDR_CLUSTER_NAME_Y * z + seidrNameOffset()
    };
  }
  function seidrNatFromStored(stored, fallbackZoom) {
    return {
      X: stored.X,
      Y: stored.Y,
      Zoom: typeof stored.Zoom === "number" && stored.Zoom > 0 ? stored.Zoom : fallbackZoom,
      Space: typeof stored.Space === "number" && stored.Space > 0 ? stored.Space : 0
    };
  }
  function seidrClusterHitboxHovered(nat) {
    if (typeof MouseIn !== "function") return false;
    const z = nat.Zoom > 0 ? nat.Zoom : 1;
    const spaceW = nat.Space > 0 ? nat.Space : 500 * z;
    try {
      return !!MouseIn(nat.X, nat.Y, spaceW, 1e3 * z);
    } catch (e) {
      return false;
    }
  }
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
  var seidrFrontReplay = false;
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
      if (seidrInRoomLoop) {
        seidrApplyDrawPose(args);
        if (seidrHoldFrontCharacter(args)) return;
      } else if (!seidrFrontReplay) {
        return next(args);
      }
      const C = args[0];
      const mode = seidrClusterNameMode();
      const prevCtx = seidrNameDrawCtx;
      if (mode !== "default" && seidrInCluster(C) && typeof C.MemberNumber === "number") {
        const stored = seidrNatural[C.MemberNumber];
        if (stored && typeof stored.X === "number" && typeof stored.Y === "number") {
          const fallbackZ = typeof args[3] === "number" && args[3] > 0 ? args[3] : 1;
          seidrNameDrawCtx = {
            character: C,
            mode,
            nat: seidrNatFromStored(stored, fallbackZ)
          };
        }
      }
      try {
        return next(args);
      } finally {
        seidrNameDrawCtx = prevCtx;
      }
    });
    Seidr.hookFunction("DrawText", 2, function(args, next) {
      const ctx = seidrNameDrawCtx;
      if (!ctx) return next(args);
      let nick = "";
      try {
        nick = typeof CharacterNickname === "function" ? String(CharacterNickname(ctx.character) || "") : String(ctx.character && (ctx.character.Nickname || ctx.character.Name) || "");
      } catch (e) {
      }
      if (!nick || String(args[0]) !== nick) return next(args);
      if (ctx.mode === "hide") return;
      if (ctx.mode === "hover" && !seidrClusterHitboxHovered(ctx.nat)) return;
      if (ctx.mode === "hitbox" || ctx.mode === "hover") {
        const pos = seidrClusterNamePos(ctx.nat);
        args[1] = pos.X;
        args[2] = pos.Y;
      }
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
        seidrFrontReplay = true;
        try {
          seidrReplayFront(captured);
        } catch (eReplay) {
          console.warn("[Seidr] replay front", eReplay);
        } finally {
          seidrFrontReplay = false;
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
        '<path d="M20 30 V18 a3 3 0 0 1 6 0 v10 M26 26 V14 a3 3 0 0 1 6 0 v14 M32 28 V16 a3 3 0 0 1 6 0 v14 M38 30 V20 a3 3 0 0 1 5 2 v16 a10 10 0 0 1-10 10 H24 a8 8 0 0 1-8-8 V34 a4 4 0 0 1 4-4z" fill="none" stroke="#e0b15a" stroke-width="2.5" stroke-linejoin="round"/>'
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
    },
    {
      id: "rope",
      label: "Rope",
      url: svgDataUri(
        '<path d="M20 40c0-12 8-18 16-18s12 6 12 12-4 8-8 8-6-2-6-6 2-5 5-5" fill="none" stroke="#e0b15a" stroke-width="3.5" stroke-linecap="round"/><circle cx="39" cy="31" r="3" fill="#e0b15a"/>'
      )
    },
    {
      id: "collar",
      label: "Collar",
      url: svgDataUri(
        '<circle cx="32" cy="30" r="14" fill="none" stroke="#e0b15a" stroke-width="4"/><path d="M32 44 v6 M28 50 h8" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linecap="round"/><path d="M26 50 a6 6 0 0 0 12 0" fill="none" stroke="#c09050" stroke-width="2.5"/>'
      )
    },
    {
      id: "leash",
      label: "Leash",
      url: svgDataUri(
        '<path d="M14 40 Q28 18 50 22" fill="none" stroke="#e0b15a" stroke-width="3.5" stroke-linecap="round"/><path d="M46 18 l8 8 M54 18 l-8 8" fill="none" stroke="#e0b15a" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="40" r="4" fill="#c09050"/>'
      )
    },
    {
      id: "chain",
      label: "Chain",
      url: svgDataUri(
        '<ellipse cx="24" cy="32" rx="10" ry="14" fill="none" stroke="#e0b15a" stroke-width="3.5" transform="rotate(-35 24 32)"/><ellipse cx="40" cy="32" rx="10" ry="14" fill="none" stroke="#c09050" stroke-width="3.5" transform="rotate(35 40 32)"/>'
      )
    },
    {
      id: "blindfold",
      label: "Blindfold",
      url: svgDataUri(
        '<path d="M10 32 H54" fill="none" stroke="#e0b15a" stroke-width="10" stroke-linecap="round"/><path d="M18 28 Q32 36 46 28" fill="none" stroke="#241c30" stroke-width="3"/>'
      )
    },
    {
      id: "paddle",
      label: "Paddle",
      url: svgDataUri(
        '<rect x="26" y="8" width="12" height="22" rx="2" fill="#e0b15a"/><path d="M32 30 V52" fill="none" stroke="#c09050" stroke-width="4" stroke-linecap="round"/>'
      )
    },
    {
      id: "candle",
      label: "Candle",
      url: svgDataUri(
        '<rect x="26" y="26" width="12" height="26" rx="2" fill="#e0b15a"/><path d="M32 26 Q28 16 32 10 Q36 16 32 26z" fill="#c06080"/><path d="M38 34 q6 2 4 8" fill="none" stroke="#c09050" stroke-width="2" stroke-linecap="round"/>'
      )
    },
    {
      id: "vulva",
      label: "Vulva",
      url: svgDataUri(
        '<path d="M32 14 C20 24 18 40 32 52 C46 40 44 24 32 14z" fill="#c06080" stroke="#e0b15a" stroke-width="2"/><path d="M32 22 V44" fill="none" stroke="#241c30" stroke-width="2.5" stroke-linecap="round"/>'
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
  function seidrResolveBuiltinId(id) {
    if (id === "spank") return "hand";
    if (id === "ping" || id === "chess" || id === "flogger" || id === "cuff" || id === "phallus" || id === "plug" || id === "gag" || id === "breast") {
      return "mark";
    }
    return id;
  }
  function seidrBuiltinIconById(id) {
    const resolved = seidrResolveBuiltinId(id);
    for (let i = 0; i < SEIDR_BUILTIN_ICONS.length; i++) {
      if (SEIDR_BUILTIN_ICONS[i].id === resolved) return SEIDR_BUILTIN_ICONS[i];
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
    if (ref.source === "custom") return SEIDR_BUILTIN_ICONS[0].url;
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
    const norm2 = seidrNormalizeAction(action);
    if (!norm2) return { ok: false, error: "Invalid action" };
    const bag = seidrGetActionsBag();
    let found = false;
    for (let i = 0; i < bag.list.length; i++) {
      if (bag.list[i].id === norm2.id) {
        bag.list[i] = norm2;
        found = true;
        break;
      }
    }
    if (!found) {
      if (bag.list.length >= SEIDR_ACTIONS_MAX) return { ok: false, error: "Action limit reached" };
      bag.list.push(norm2);
      if (norm2.id >= bag.nextId) bag.nextId = norm2.id + 1;
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
      const norm2 = seidrNormalizeAction(Object.assign({}, list[i], { id }), id);
      if (!norm2) {
        skipped += 1;
        continue;
      }
      bag.list.push(norm2);
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

  // src/animations/store.ts
  function seidrGetAnimationsBag() {
    const s = seidrGetSettings();
    return seidrNormalizeAnimationsBag(s.animations);
  }
  function seidrSaveAnimationsBag(bag) {
    const normalized = seidrNormalizeAnimationsBag(bag);
    return seidrSaveSettings({ animations: normalized });
  }
  function seidrListAnimations() {
    return seidrGetAnimationsBag().list.slice();
  }
  function seidrFindAnimationById(id) {
    const list = seidrListAnimations();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
  function seidrFindAnimationByName(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    const list = seidrListAnimations();
    for (let i = 0; i < list.length; i++) {
      if (list[i].name.toLowerCase() === key) return list[i];
    }
    return null;
  }
  function seidrFilterAnimationsByPrefix(prefix) {
    const pfx = String(prefix || "").trim().toLowerCase();
    const list = seidrListAnimations();
    if (!pfx) return list;
    return list.filter(function(a) {
      return a.name.toLowerCase().indexOf(pfx) >= 0;
    });
  }
  function seidrUpsertAnimation(anim) {
    const norm2 = seidrNormalizeAnimation(anim);
    if (!norm2) return { ok: false, error: "Invalid animation" };
    if (!norm2.name.trim()) return { ok: false, error: "Name required" };
    if (norm2.steps.length > SEIDR_ANIM_STEPS_MAX) {
      return { ok: false, error: "Max " + SEIDR_ANIM_STEPS_MAX + " steps" };
    }
    const total = seidrAnimWaitTotal(norm2.steps);
    if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
      return { ok: false, error: "Total wait exceeds " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s" };
    }
    const bag = seidrGetAnimationsBag();
    const nameKey = norm2.name.toLowerCase();
    for (let i = 0; i < bag.list.length; i++) {
      if (bag.list[i].id !== norm2.id && bag.list[i].name.toLowerCase() === nameKey) {
        return { ok: false, error: "Name already used" };
      }
    }
    let found = false;
    for (let j = 0; j < bag.list.length; j++) {
      if (bag.list[j].id === norm2.id) {
        bag.list[j] = norm2;
        found = true;
        break;
      }
    }
    if (!found) {
      if (bag.list.length >= SEIDR_ANIMATIONS_MAX) {
        return { ok: false, error: "Animation limit reached (" + SEIDR_ANIMATIONS_MAX + ")" };
      }
      if (norm2.id < 1) {
        norm2.id = bag.nextId;
        bag.nextId = norm2.id + 1;
      } else if (norm2.id >= bag.nextId) {
        bag.nextId = norm2.id + 1;
      }
      bag.list.push(norm2);
    }
    const saved = seidrSaveAnimationsBag(bag);
    if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
    return { ok: true, animation: norm2 };
  }
  function seidrDeleteAnimation(id) {
    const bag = seidrGetAnimationsBag();
    bag.list = bag.list.filter(function(a) {
      return a.id !== id;
    });
    return seidrSaveAnimationsBag(bag);
  }
  function seidrAddAnimation() {
    const bag = seidrGetAnimationsBag();
    if (bag.list.length >= SEIDR_ANIMATIONS_MAX) return null;
    const a = seidrDefaultAnimation(bag.nextId);
    bag.nextId = a.id + 1;
    bag.list.push(a);
    const saved = seidrSaveAnimationsBag(bag);
    if (!saved.ok) return null;
    return a;
  }

  // src/commands/catalog.ts
  function activityLabel(name, group) {
    try {
      if (typeof ActivityBuildChatTag === "function" && typeof ActivityDictionaryText === "function" && group) {
        const key = ActivityBuildChatTag(Player, { Name: group }, { Name: name }, true);
        const t = ActivityDictionaryText(key);
        if (t && String(t).indexOf("MISSING") < 0) return String(t);
      }
    } catch (e) {
    }
    try {
      const cache = typeof ActivityDictionaryLoad === "function" && ActivityDictionaryLoad().cache;
      if (cache && cache["Activity" + name]) return String(cache["Activity" + name]);
    } catch (e2) {
    }
    return name;
  }
  function seidrCmdListSlots() {
    const out = [];
    const seen = {};
    try {
      if (typeof AssetGroup !== "undefined" && Array.isArray(AssetGroup)) {
        for (let i = 0; i < AssetGroup.length; i++) {
          const g = AssetGroup[i];
          if (!g || !g.Name) continue;
          if (typeof g.IsItem === "function" ? !g.IsItem() : g.Category !== "Item" && String(g.Name).indexOf("Item") !== 0) {
            continue;
          }
          if (g.MirrorActivitiesFrom) continue;
          if (seen[g.Name]) continue;
          seen[g.Name] = true;
          const label = g.Description || g.Name;
          out.push({ id: g.Name, label: String(label) });
        }
      }
    } catch (e) {
    }
    if (!out.length) {
      return [
        { id: "ItemTorso", label: "Torso" },
        { id: "ItemArms", label: "Arms" },
        { id: "ItemHands", label: "Hands" },
        { id: "ItemMouth", label: "Mouth" },
        { id: "ItemLegs", label: "Legs" },
        { id: "ItemFeet", label: "Feet" },
        { id: "ItemBoots", label: "Boots" }
      ];
    }
    out.sort(function(a, b) {
      return a.label.localeCompare(b.label);
    });
    return out;
  }
  function seidrCmdListActivitiesForSlot(slot) {
    const s = String(slot || "");
    const out = [];
    const seen = {};
    try {
      if (typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) return out;
      for (let i = 0; i < ActivityFemale3DCG.length; i++) {
        const a = ActivityFemale3DCG[i];
        if (!a || !a.Name) continue;
        const t = Array.isArray(a.Target) && a.Target.indexOf(s) >= 0;
        const ts = Array.isArray(a.TargetSelf) && a.TargetSelf.indexOf(s) >= 0;
        if (!t && !ts) continue;
        if (seen[a.Name]) continue;
        seen[a.Name] = true;
        out.push({ id: a.Name, label: activityLabel(a.Name, s) });
      }
    } catch (e) {
    }
    out.sort(function(a, b) {
      return a.label.localeCompare(b.label);
    });
    return out;
  }
  function seidrCmdRoomPeople() {
    const out = [];
    try {
      const list = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
      for (let i = 0; i < list.length; i++) {
        const C = list[i];
        if (!C || C.MemberNumber == null) continue;
        const mn = Number(C.MemberNumber);
        const name = String(C.Name || "");
        const nickname = String(C.Nickname || C.NickName || "");
        const label = (nickname ? nickname + " \xB7 " : "") + name + " #" + mn;
        const search = (nickname + " " + name + " " + mn).toLowerCase();
        out.push({
          memberNumber: mn,
          name,
          nickname,
          label,
          search
        });
      }
    } catch (e) {
    }
    return out;
  }
  function seidrCmdFindCharacter(memberNumber) {
    try {
      const list = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
      for (let i = 0; i < list.length; i++) {
        const C = list[i];
        if (C && Number(C.MemberNumber) === memberNumber) return C;
      }
    } catch (e) {
    }
    return null;
  }
  function seidrCmdActivityAvailable(target, slot, activityName) {
    if (!target || !slot || !activityName) return false;
    try {
      if (typeof ActivityAllowedForGroup !== "function") return false;
      const list = ActivityAllowedForGroup(target, slot) || [];
      for (let i = 0; i < list.length; i++) {
        const ia = list[i];
        if (!ia || !ia.Activity || ia.Blocked === "blocked") continue;
        if (ia.Activity.Name === activityName) return true;
      }
    } catch (e) {
    }
    return false;
  }
  function seidrCmdFindItemActivity(target, slot, activityName) {
    if (!target || !slot || !activityName) return null;
    try {
      if (typeof ActivityAllowedForGroup !== "function") return null;
      const list = ActivityAllowedForGroup(target, slot) || [];
      for (let i = 0; i < list.length; i++) {
        const ia = list[i];
        if (!ia || !ia.Activity || ia.Blocked === "blocked") continue;
        if (ia.Activity.Name === activityName) return ia;
      }
    } catch (e) {
    }
    return null;
  }

  // src/commands/parse.ts
  var TAG_ALT = "roommanager|animation|action|stripe|strip|poses|seidr|ani|a|p";
  var TAG_RE = new RegExp("^/(" + TAG_ALT + ")(?:\\s|$)", "i");
  var TAG_LINE_RE = new RegExp("^/(" + TAG_ALT + ")(?:\\s+(.*))?$", "i");
  var TAG_TOKEN_RE = new RegExp("^/(" + TAG_ALT + ")(\\s+)?", "i");
  function tagFamily(tag) {
    if (tag === "strip" || tag === "stripe") return "strip";
    if (tag === "poses" || tag === "p") return "poses";
    if (tag === "animation" || tag === "ani") return "animation";
    if (tag === "seidr" || tag === "roommanager") return "meta";
    return "action";
  }
  function normalizeTag(raw) {
    const t = String(raw || "").toLowerCase();
    if (t === "action") return "action";
    if (t === "strip") return "strip";
    if (t === "stripe") return "stripe";
    if (t === "poses") return "poses";
    if (t === "p") return "p";
    if (t === "animation") return "animation";
    if (t === "ani") return "ani";
    if (t === "seidr") return "seidr";
    if (t === "roommanager") return "roommanager";
    return "a";
  }
  function secondKindForFamily(family) {
    if (family === "action") return "action";
    if (family === "strip") return "slot";
    if (family === "poses") return "pose";
    if (family === "animation") return "animation";
    return null;
  }
  function seidrCmdIsCommandLine(msg) {
    return TAG_RE.test(String(msg || "").trim());
  }
  function seidrCmdTagFromLine(msg) {
    const m = String(msg || "").trim().match(TAG_RE);
    if (!m) return null;
    return normalizeTag(m[1]);
  }
  function seidrCmdStartsWithTag(msg) {
    return new RegExp("^\\s*/(" + TAG_ALT + ")", "i").test(String(msg || ""));
  }
  function parseMemberAndRest(rest) {
    if (!rest) {
      return { memberRaw: "", memberQuoted: false, secondRaw: "", ok: true };
    }
    let memberRaw = "";
    let memberQuoted = false;
    let secondRaw = "";
    const q = rest.charAt(0);
    if (q === '"' || q === "'") {
      let i = 1;
      let closed = false;
      while (i < rest.length) {
        if (rest.charAt(i) === "\\" && i + 1 < rest.length) {
          memberRaw += rest.charAt(i + 1);
          i += 2;
          continue;
        }
        if (rest.charAt(i) === q) {
          closed = true;
          i += 1;
          break;
        }
        memberRaw += rest.charAt(i);
        i += 1;
      }
      if (!closed) {
        return { memberRaw, memberQuoted: true, secondRaw: "", ok: false, error: "Unclosed quote in member name" };
      }
      memberQuoted = true;
      secondRaw = rest.slice(i).trim();
    } else {
      const sp = rest.search(/\s/);
      if (sp < 0) {
        memberRaw = rest;
        secondRaw = "";
      } else {
        memberRaw = rest.slice(0, sp);
        secondRaw = rest.slice(sp).trim();
      }
    }
    return { memberRaw, memberQuoted, secondRaw, ok: true };
  }
  function seidrCmdPeekLine(msg) {
    const raw = String(msg || "").trim();
    const m = raw.match(TAG_LINE_RE);
    if (!m) return null;
    const tag = normalizeTag(m[1]);
    const family = tagFamily(tag);
    const rest = (m[2] || "").trim();
    if (family === "meta") {
      return { tag, family, memberRaw: "", memberQuoted: false, secondRaw: "" };
    }
    if (family === "animation") {
      return { tag, family, memberRaw: "", memberQuoted: false, secondRaw: rest };
    }
    if (!rest) {
      return { tag, family, memberRaw: "", memberQuoted: false, secondRaw: "" };
    }
    const q = rest.charAt(0);
    if (q === '"' || q === "'") {
      let memberRaw = "";
      let i = 1;
      let closed = false;
      while (i < rest.length) {
        if (rest.charAt(i) === "\\" && i + 1 < rest.length) {
          memberRaw += rest.charAt(i + 1);
          i += 2;
          continue;
        }
        if (rest.charAt(i) === q) {
          closed = true;
          i += 1;
          break;
        }
        memberRaw += rest.charAt(i);
        i += 1;
      }
      if (!closed) {
        return { tag, family, memberRaw, memberQuoted: true, secondRaw: "" };
      }
      return {
        tag,
        family,
        memberRaw,
        memberQuoted: true,
        secondRaw: rest.slice(i).trim()
      };
    }
    const sp = rest.search(/\s/);
    if (sp < 0) {
      return { tag, family, memberRaw: rest, memberQuoted: false, secondRaw: "" };
    }
    return {
      tag,
      family,
      memberRaw: rest.slice(0, sp),
      memberQuoted: false,
      secondRaw: rest.slice(sp).trim()
    };
  }
  function seidrParseCmdLine(msg) {
    const raw = String(msg || "").trim();
    const m = raw.match(TAG_LINE_RE);
    if (!m) return { ok: false, error: "Not a Seidr command", raw };
    const tag = normalizeTag(m[1]);
    const family = tagFamily(tag);
    const rest = (m[2] || "").trim();
    if (family === "meta") {
      return {
        ok: true,
        tag,
        family,
        memberRaw: "",
        memberQuoted: false,
        secondRaw: "",
        actionRaw: "",
        raw
      };
    }
    if (family === "animation") {
      if (!rest) {
        return { ok: false, error: "Usage: /" + tag + " <animation name>", raw };
      }
      return {
        ok: true,
        tag,
        family,
        memberRaw: "",
        memberQuoted: false,
        secondRaw: rest,
        actionRaw: rest,
        raw
      };
    }
    const usage = family === "strip" ? "Usage: /" + tag + " <member> <slot>" : family === "poses" ? "Usage: /" + tag + " <member> <pose>" : "Usage: /a <member> <action>";
    if (!rest) return { ok: false, error: usage, raw };
    const parts = parseMemberAndRest(rest);
    if (!parts.ok) return { ok: false, error: parts.error || "Parse error", raw };
    if (!parts.memberRaw) return { ok: false, error: "Missing member", raw };
    if (!parts.secondRaw) {
      return {
        ok: false,
        error: family === "strip" ? "Missing slot \u2014 " + usage : family === "poses" ? "Missing pose \u2014 " + usage : "Missing action \u2014 " + usage,
        raw
      };
    }
    return {
      ok: true,
      tag,
      family,
      memberRaw: parts.memberRaw,
      memberQuoted: parts.memberQuoted,
      secondRaw: parts.secondRaw,
      actionRaw: parts.secondRaw,
      raw
    };
  }
  function seidrCmdTokenAtCaret(value, caret) {
    const text = String(value || "");
    const pos = Math.max(0, Math.min(caret || 0, text.length));
    const trimmedStart = text.match(/^\s*/);
    const startOffset = trimmedStart ? trimmedStart[0].length : 0;
    const body = text.slice(startOffset);
    const bodyCaret = pos - startOffset;
    if (bodyCaret < 0) return { kind: "none" };
    const tagMatch = body.match(TAG_TOKEN_RE);
    if (!tagMatch) return { kind: "none" };
    const tag = normalizeTag(tagMatch[1]);
    const family = tagFamily(tag);
    const secondKind = secondKindForFamily(family);
    const tagEnd = tagMatch[0].length;
    if (family === "meta") return { kind: "tag" };
    if (family === "animation") {
      if (bodyCaret <= tagEnd && !tagMatch[2]) return { kind: "tag" };
      const actionStart2 = tagEnd;
      const ws2 = body.slice(actionStart2).match(/^\s*/);
      const wsLen2 = ws2 ? ws2[0].length : 0;
      return {
        kind: "animation",
        prefix: body.slice(actionStart2 + wsLen2, bodyCaret),
        start: startOffset + actionStart2 + wsLen2,
        end: pos
      };
    }
    if (bodyCaret <= tagEnd && !tagMatch[2]) return { kind: "tag" };
    if (bodyCaret <= tagEnd) {
      return {
        kind: "member",
        prefix: "",
        quoted: false,
        start: startOffset + tagEnd,
        end: startOffset + tagEnd
      };
    }
    const rest = body.slice(tagEnd);
    const restCaret = bodyCaret - tagEnd;
    const q = rest.charAt(0);
    if (q === '"' || q === "'") {
      let i = 1;
      let closed = false;
      while (i < rest.length) {
        if (rest.charAt(i) === "\\" && i + 1 < rest.length) {
          i += 2;
          continue;
        }
        if (rest.charAt(i) === q) {
          closed = true;
          i += 1;
          break;
        }
        i += 1;
      }
      const memberEnd = closed ? i : rest.length;
      if (restCaret <= memberEnd) {
        const inner = rest.slice(1, Math.min(restCaret, closed ? i - 1 : rest.length));
        return {
          kind: "member",
          prefix: inner.replace(/\\(.)/g, "$1"),
          quoted: true,
          start: startOffset + tagEnd,
          end: startOffset + tagEnd + memberEnd
        };
      }
      if (!secondKind) return { kind: "none" };
      const actionStart2 = tagEnd + memberEnd;
      const actionPrefix = body.slice(actionStart2, bodyCaret).replace(/^\s+/, "");
      const ws2 = body.slice(actionStart2).match(/^\s*/);
      const wsLen2 = ws2 ? ws2[0].length : 0;
      return {
        kind: secondKind,
        prefix: actionPrefix,
        start: startOffset + actionStart2 + wsLen2,
        end: pos
      };
    }
    const sp = rest.search(/\s/);
    if (sp < 0 || restCaret <= sp) {
      return {
        kind: "member",
        prefix: rest.slice(0, restCaret),
        quoted: false,
        start: startOffset + tagEnd,
        end: startOffset + tagEnd + (sp < 0 ? rest.length : sp)
      };
    }
    if (!secondKind) return { kind: "none" };
    const actionStart = tagEnd + sp;
    const ws = body.slice(actionStart).match(/^\s*/);
    const wsLen = ws ? ws[0].length : 0;
    return {
      kind: secondKind,
      prefix: body.slice(actionStart + wsLen, bodyCaret),
      start: startOffset + actionStart + wsLen,
      end: pos
    };
  }
  function seidrCmdReplaceSpan(value, start, end, insert, trailingSpace) {
    let mid = String(insert || "");
    if (start > 0 && !/\s/.test(value.charAt(start - 1))) {
      mid = " " + mid;
    }
    if (trailingSpace) {
      const after = end < value.length ? value.charAt(end) : "";
      if (!after || !/\s/.test(after)) mid = mid + " ";
    }
    const next = value.slice(0, start) + mid + value.slice(end);
    return { value: next, caret: start + mid.length };
  }

  // src/commands/store.ts
  function seidrGetCommandsBag() {
    const s = seidrGetSettings();
    return seidrNormalizeCommandsBag(s.commands);
  }
  function seidrSaveCommandsBag(bag) {
    const normalized = seidrNormalizeCommandsBag(bag);
    return seidrSaveSettings({ commands: normalized });
  }
  function seidrListCmdPeople() {
    return seidrGetCommandsBag().people.slice();
  }
  function seidrListCmdActions() {
    return seidrGetCommandsBag().actions.slice();
  }
  function seidrUpsertCmdPerson(person) {
    const norm2 = seidrNormalizeCmdPerson(person);
    if (!norm2 || !norm2.alias || norm2.memberNumber <= 0) {
      return { ok: false, error: "Need alias and MemberNumber" };
    }
    const bag = seidrGetCommandsBag();
    const aliasKey = norm2.alias.toLowerCase();
    for (let i = 0; i < bag.people.length; i++) {
      const p = bag.people[i];
      if (p.id === norm2.id) continue;
      if (p.alias.toLowerCase() === aliasKey) return { ok: false, error: "Alias already used" };
      if (p.memberNumber === norm2.memberNumber) return { ok: false, error: "Member already registered" };
    }
    let found = false;
    for (let i = 0; i < bag.people.length; i++) {
      if (bag.people[i].id === norm2.id) {
        bag.people[i] = norm2;
        found = true;
        break;
      }
    }
    if (!found) {
      if (bag.people.length >= SEIDR_CMD_PEOPLE_MAX) return { ok: false, error: "People limit reached" };
      if (norm2.id < 1) {
        norm2.id = bag.nextPersonId;
        bag.nextPersonId = norm2.id + 1;
      } else if (norm2.id >= bag.nextPersonId) {
        bag.nextPersonId = norm2.id + 1;
      }
      bag.people.push(norm2);
    }
    const saved = seidrSaveCommandsBag(bag);
    if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
    return { ok: true, person: norm2 };
  }
  function seidrDeleteCmdPerson(id) {
    const bag = seidrGetCommandsBag();
    bag.people = bag.people.filter(function(p) {
      return p.id !== id;
    });
    return seidrSaveCommandsBag(bag);
  }
  function seidrAddCmdPerson() {
    const bag = seidrGetCommandsBag();
    if (bag.people.length >= SEIDR_CMD_PEOPLE_MAX) return null;
    const p = seidrDefaultCmdPerson(bag.nextPersonId);
    bag.nextPersonId = p.id + 1;
    p.alias = "person" + p.id;
    p.memberNumber = 0;
    bag.people.push(p);
    const saved = seidrSaveCommandsBag(bag);
    if (!saved.ok) {
      seidrDeleteCmdPerson(p.id);
      return null;
    }
    return p;
  }
  function seidrUpsertCmdAction(action) {
    const norm2 = seidrNormalizeCmdAction(action);
    if (!norm2 || !norm2.name || !norm2.slot || !norm2.activity) {
      return { ok: false, error: "Need name, slot, and activity" };
    }
    const bag = seidrGetCommandsBag();
    const nameKey = norm2.name.toLowerCase();
    for (let i = 0; i < bag.actions.length; i++) {
      const a = bag.actions[i];
      if (a.id === norm2.id) continue;
      if (a.name.toLowerCase() === nameKey) return { ok: false, error: "Action name already used" };
    }
    let found = false;
    for (let i = 0; i < bag.actions.length; i++) {
      if (bag.actions[i].id === norm2.id) {
        bag.actions[i] = norm2;
        found = true;
        break;
      }
    }
    if (!found) {
      if (bag.actions.length >= SEIDR_CMD_ACTIONS_MAX) return { ok: false, error: "Action limit reached" };
      if (norm2.id < 1) {
        norm2.id = bag.nextActionId;
        bag.nextActionId = norm2.id + 1;
      } else if (norm2.id >= bag.nextActionId) {
        bag.nextActionId = norm2.id + 1;
      }
      bag.actions.push(norm2);
    }
    const saved = seidrSaveCommandsBag(bag);
    if (!saved.ok) return { ok: false, error: saved.error || "Save failed" };
    return { ok: true, action: norm2 };
  }
  function seidrDeleteCmdAction(id) {
    const bag = seidrGetCommandsBag();
    bag.actions = bag.actions.filter(function(a) {
      return a.id !== id;
    });
    return seidrSaveCommandsBag(bag);
  }
  function seidrAddCmdAction() {
    const bag = seidrGetCommandsBag();
    if (bag.actions.length >= SEIDR_CMD_ACTIONS_MAX) return null;
    const a = seidrDefaultCmdAction(bag.nextActionId);
    bag.nextActionId = a.id + 1;
    a.name = "action" + a.id;
    bag.actions.push(a);
    const saved = seidrSaveCommandsBag(bag);
    if (!saved.ok) {
      seidrDeleteCmdAction(a.id);
      return null;
    }
    return a;
  }
  function seidrFindCmdActionByName(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    const list = seidrListCmdActions();
    for (let i = 0; i < list.length; i++) {
      if (list[i].name.toLowerCase() === key) return list[i];
    }
    return null;
  }
  function seidrFindCmdPersonByAlias(alias) {
    const key = String(alias || "").trim().toLowerCase();
    if (!key) return null;
    const list = seidrListCmdPeople();
    for (let i = 0; i < list.length; i++) {
      if (list[i].alias.toLowerCase() === key) return list[i];
    }
    return null;
  }
  function seidrFindCmdPersonByMember(mn) {
    const list = seidrListCmdPeople();
    for (let i = 0; i < list.length; i++) {
      if (list[i].memberNumber === mn) return list[i];
    }
    return null;
  }

  // src/commands/fastSelect.ts
  var LETTER_MAP = {
    a: "/action ",
    s: "/strip ",
    d: "/animation ",
    p: "/poses "
  };
  var EMPTY_MAP = {
    action: "/action ",
    poses: "/poses ",
    animation: "/animation ",
    strip: "/strip "
  };
  function seidrFastSelectActive() {
    if (Seidr.SHOW_CMD_FAST_SELECT === false) return false;
    try {
      return seidrGetCommandsBag().fastSelectEnabled !== false;
    } catch (e) {
      return true;
    }
  }
  function seidrFastSelectReplacement(value) {
    if (!seidrFastSelectActive()) return null;
    const bag = seidrGetCommandsBag();
    const trim = String(value || "").trim();
    if (/^[asdp]$/i.test(trim)) {
      const key = trim.toLowerCase();
      if (bag.fastSelectKeys && bag.fastSelectKeys[key] === false) return null;
      return LETTER_MAP[key] || null;
    }
    if (trim === "") {
      const empty = bag.fastSelectEmpty || "disabled";
      if (empty === "disabled") return null;
      return EMPTY_MAP[empty] || null;
    }
    return null;
  }
  function seidrFastSelectApply(input) {
    const next = seidrFastSelectReplacement(input.value || "");
    if (!next) return false;
    input.value = next;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(next.length, next.length);
    }
    try {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
    }
    return true;
  }

  // src/commands/lastActor.ts
  var lastMemberNumber = null;
  function seidrCmdSetLastActor(memberNumber) {
    const n = Number(memberNumber);
    if (!Number.isFinite(n) || n <= 0) return;
    lastMemberNumber = Math.floor(n);
  }
  function seidrCmdPreferMemberIndex(items) {
    if (!items.length) return 0;
    const last = lastMemberNumber;
    if (last != null) {
      const lastKey = String(last);
      for (let i = 0; i < items.length; i++) {
        if (items[i].insert === lastKey) return i;
      }
    }
    let selfMn = 0;
    try {
      if (typeof Player !== "undefined" && Player && Player.MemberNumber != null) {
        selfMn = Number(Player.MemberNumber) || 0;
      }
    } catch (e) {
    }
    if (selfMn > 0) {
      const selfKey = String(selfMn);
      for (let j = 0; j < items.length; j++) {
        if (items[j].insert === selfKey) return j;
      }
    }
    return 0;
  }

  // src/commands/resolve.ts
  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }
  function seidrCmdResolveMember(token) {
    const raw = String(token || "").trim();
    if (!raw) return { ok: false, error: "Missing member" };
    const asNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(asNum) && asNum > 0) {
      const C = seidrCmdFindCharacter(asNum);
      if (!C) return { ok: false, error: "Member #" + asNum + " is not in this room" };
      return { ok: true, character: C, memberNumber: asNum, via: "id" };
    }
    const registered = seidrFindCmdPersonByAlias(raw);
    if (registered) {
      const C = seidrCmdFindCharacter(registered.memberNumber);
      if (!C) {
        return {
          ok: false,
          error: 'Registered "' + registered.alias + '" (#' + registered.memberNumber + ") is not in this room"
        };
      }
      return { ok: true, character: C, memberNumber: registered.memberNumber, via: "registry" };
    }
    const people = seidrCmdRoomPeople();
    const key = norm(raw);
    const hits = [];
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      if (norm(p.nickname) === key || norm(p.name) === key) hits.push(p);
    }
    if (hits.length === 0) {
      return { ok: false, error: 'No one matching "' + raw + '" in this room' };
    }
    if (hits.length === 1) {
      const C = seidrCmdFindCharacter(hits[0].memberNumber);
      if (!C) return { ok: false, error: "Member not in room" };
      return { ok: true, character: C, memberNumber: hits[0].memberNumber, via: "room" };
    }
    const registeredHits = hits.filter(function(h) {
      return !!seidrFindCmdPersonByMember(h.memberNumber);
    });
    if (registeredHits.length === 1) {
      const C = seidrCmdFindCharacter(registeredHits[0].memberNumber);
      if (!C) return { ok: false, error: "Member not in room" };
      return {
        ok: true,
        character: C,
        memberNumber: registeredHits[0].memberNumber,
        via: "registry-disambiguate"
      };
    }
    return {
      ok: false,
      error: 'Ambiguous name "' + raw + '" (' + hits.length + " people). Register an alias under Settings \u2192 Commands \u2192 People, or use MemberNumber / quotes."
    };
  }
  function seidrCmdResolveAction(token) {
    const a = seidrFindCmdActionByName(token);
    if (!a) {
      return { ok: false, error: 'Unknown action "' + String(token || "").trim() + '". Define it under Settings \u2192 Commands \u2192 Actions.' };
    }
    return { ok: true, action: a };
  }
  function seidrCmdFilterPeople(prefix) {
    const pfx = norm(prefix);
    const room = seidrCmdRoomPeople();
    const enriched = room.map(function(r) {
      const reg = seidrFindCmdPersonByMember(r.memberNumber);
      if (!reg) return r;
      return {
        memberNumber: r.memberNumber,
        name: r.name,
        nickname: r.nickname,
        label: reg.alias + " \u2192 " + r.label,
        search: (reg.alias + " " + r.search).toLowerCase()
      };
    });
    if (!pfx) return enriched;
    return enriched.filter(function(r) {
      return r.search.indexOf(pfx) >= 0 || String(r.memberNumber).indexOf(pfx) === 0;
    });
  }

  // src/chat/actionText.ts
  var SEIDR_ACTION_CONTENT_KEY = "SEIDR_PLAYER_CUSTOM_DIALOG";
  var SEIDR_ACTION_MISSING_TAG = 'MISSING TEXT IN "Interface.csv": SEIDR_PLAYER_CUSTOM_DIALOG';
  function displayName(C) {
    if (!C) return "?";
    try {
      if (typeof CharacterNickname === "function") return CharacterNickname(C);
    } catch (e) {
    }
    return C.Name || String(C.MemberNumber || "?");
  }
  function pronounKey(C) {
    if (!C) return null;
    try {
      if (typeof C.GetPronouns === "function") {
        const k = C.GetPronouns();
        if (k) return String(k);
      }
    } catch (e) {
    }
    try {
      if (typeof InventoryGet === "function") {
        const item = InventoryGet(C, "Pronouns");
        const name = item && item.Asset && item.Asset.Name;
        if (name) return String(name);
      }
    } catch (e2) {
    }
    return null;
  }
  function mapPossessive(key) {
    if (!key) return null;
    const raw = String(key).replace(/[\/_\-\s]/g, "");
    if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "her";
    if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "his";
    if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "their";
    return null;
  }
  function mapPronounSelf(key) {
    if (!key) return null;
    const raw = String(key).replace(/[\/_\-\s]/g, "");
    if (/^sheher$/i.test(raw) || /^she$/i.test(raw)) return "herself";
    if (/^hehim$/i.test(raw) || /^he$/i.test(raw)) return "himself";
    if (/^theythem$/i.test(raw) || /^they$/i.test(raw)) return "themself";
    return null;
  }
  function possessiveFor(C) {
    const mapped = mapPossessive(pronounKey(C));
    if (mapped) return mapped;
    try {
      if (typeof CharacterPronoun === "function") {
        const p = String(CharacterPronoun(C, "Possessive", false) || "").trim().toLowerCase();
        if (p === "her" || p === "his" || p === "their") return p;
      }
    } catch (e) {
    }
    return "their";
  }
  function pronounSelfFor(C) {
    const mapped = mapPronounSelf(pronounKey(C));
    if (mapped) return mapped;
    const poss = possessiveFor(C);
    if (poss === "her") return "herself";
    if (poss === "his") return "himself";
    return "themself";
  }
  function seidrResolveActionText(template, source, target) {
    const src = source || null;
    const tgt = target || source || null;
    let out = String(template || "");
    if (!out.trim()) return "";
    const srcName = displayName(src);
    const tgtName = displayName(tgt);
    const srcPoss = possessiveFor(src);
    const tgtPoss = possessiveFor(tgt);
    const srcSelf = pronounSelfFor(src);
    out = out.split("TargetPronounPossessive").join(tgtPoss);
    out = out.split("PronounPossessive").join(srcPoss);
    out = out.split("PronounSelf").join(srcSelf);
    out = out.split("TargetCharacter").join(tgtName);
    out = out.split("SourceCharacter").join(srcName);
    out = out.split("ActivityAsset").join("");
    out = out.replace(/\s{2,}/g, " ").trim();
    if (out.length > SEIDR_ACTION_CHAT_MAX) out = out.slice(0, SEIDR_ACTION_CHAT_MAX);
    return out;
  }
  function seidrPublishActionText(template, source, target) {
    const text = seidrResolveActionText(template, source, target);
    if (!text) return false;
    if (typeof ServerSend !== "function") return false;
    try {
      ServerSend("ChatRoomChat", {
        Content: SEIDR_ACTION_CONTENT_KEY,
        Type: "Action",
        Dictionary: [{ Tag: SEIDR_ACTION_MISSING_TAG, Text: text }]
      });
      return true;
    } catch (e) {
      console.warn("[Seidr] publishActionText", e);
      return false;
    }
  }

  // src/animations/play.ts
  var playing = false;
  function applyPose2(C, pose) {
    if (!C || !pose) return;
    try {
      if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
      else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
    } catch (e) {
    }
    try {
      if (typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(C);
      else if (typeof ServerSend === "function" && C.IsPlayer && C.IsPlayer()) {
        ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
      }
    } catch (e2) {
    }
  }
  function applyFace(C, step) {
    if (!C || typeof CharacterSetFacialExpression !== "function") return;
    const group = String(step.feature || "Eyes");
    const expr = step.expression ? String(step.expression) : null;
    let timer = null;
    if (step.duration && step.duration !== "keep") timer = Number(step.duration) || null;
    try {
      CharacterSetFacialExpression(C, group, expr, timer);
    } catch (e) {
    }
  }
  function applyStep(step, C) {
    if (!step || !C) return;
    if (step.kind === "pose") applyPose2(C, step.pose);
    else if (step.kind === "face") applyFace(C, step);
  }
  function waitMs(sec) {
    const n = Number(sec) || 0;
    if (n <= 0) return null;
    return new Promise(function(resolve) {
      setTimeout(resolve, Math.round(n * 1e3));
    });
  }
  function seidrPlayAnimation(ref) {
    let anim = null;
    if (typeof ref === "number") anim = seidrFindAnimationById(ref);
    else anim = seidrFindAnimationByName(String(ref));
    if (!anim || !anim.steps.length) {
      return Promise.resolve({ ok: false, error: "Unknown or empty animation" });
    }
    if (typeof Player === "undefined" || !Player) {
      return Promise.resolve({ ok: false, error: "Not logged in" });
    }
    if (playing) {
      return Promise.resolve({ ok: false, error: "An animation is already playing" });
    }
    playing = true;
    if (anim.chatText && String(anim.chatText).trim()) {
      seidrPublishActionText(String(anim.chatText).trim(), Player, Player);
    }
    const steps = anim.steps.slice();
    let i = 0;
    function next() {
      while (i < steps.length) {
        const st = steps[i++];
        if (!st) continue;
        applyStep(st, Player);
        const delay = waitMs(st.wait);
        if (delay) {
          return delay.then(next).catch(function() {
            playing = false;
            return { ok: false, error: "Animation interrupted" };
          });
        }
      }
      playing = false;
      return Promise.resolve({ ok: true });
    }
    return next();
  }

  // src/commands/poseChat.ts
  var FALLBACK = {
    self: "SourceCharacter changes PronounPossessive pose.",
    other: "SourceCharacter changes TargetCharacter's pose."
  };
  var SEIDR_POSE_CHAT = {
    BaseLower: {
      self: "SourceCharacter straightens PronounPossessive legs to stand.",
      other: "SourceCharacter helps TargetCharacter straighten TargetPronounPossessive legs to stand."
    },
    LegsClosed: {
      self: "SourceCharacter presses PronounPossessive thighs together.",
      other: "SourceCharacter guides TargetCharacter to press TargetPronounPossessive thighs together."
    },
    Kneel: {
      self: "SourceCharacter sinks down onto PronounPossessive knees.",
      other: "SourceCharacter guides TargetCharacter down onto TargetPronounPossessive knees."
    },
    KneelingSpread: {
      self: "SourceCharacter kneels and spreads PronounPossessive knees apart.",
      other: "SourceCharacter spreads TargetCharacter's knees while TargetCharacter kneels."
    },
    BaseUpper: {
      self: "SourceCharacter lets PronounPossessive arms hang relaxed at PronounPossessive sides.",
      other: "SourceCharacter eases TargetCharacter's arms down to hang relaxed."
    },
    Yoked: {
      self: "SourceCharacter folds PronounPossessive arms behind PronounPossessive head.",
      other: "SourceCharacter folds TargetCharacter's arms behind TargetCharacter's head."
    },
    OverTheHead: {
      self: "SourceCharacter raises PronounPossessive hands high above PronounPossessive head.",
      other: "SourceCharacter lifts TargetCharacter's hands high above TargetCharacter's head."
    },
    BackBoxTie: {
      self: "SourceCharacter draws PronounPossessive arms back into a box-tie behind PronounSelf.",
      other: "SourceCharacter draws TargetCharacter's arms back into a box-tie behind TargetCharacter."
    },
    BackElbowTouch: {
      self: "SourceCharacter pulls PronounPossessive elbows together behind PronounPossessive back.",
      other: "SourceCharacter pulls TargetCharacter's elbows together behind TargetCharacter's back."
    },
    AllFours: {
      self: "SourceCharacter drops onto all fours.",
      other: "SourceCharacter puts TargetCharacter down onto all fours."
    }
  };
  function seidrPoseChatTemplate(poseId, side) {
    const entry = SEIDR_POSE_CHAT[String(poseId || "")];
    if (entry && entry[side]) return entry[side];
    return FALLBACK[side];
  }

  // src/commands/stripCatalog.ts
  function undressActs() {
    try {
      if (typeof Seidr.undressActivities === "function") {
        const list = Seidr.undressActivities();
        return Array.isArray(list) ? list : [];
      }
    } catch (e) {
    }
    return [];
  }
  function canUndress(acting, acted, cloth) {
    try {
      if (typeof Seidr.undressCan === "function") {
        return !!Seidr.undressCan(acting, acted, cloth);
      }
    } catch (e) {
    }
    return false;
  }
  function wornHint(target, clothGroup) {
    try {
      if (typeof Seidr.undressWornName === "function") {
        const n = Seidr.undressWornName(target, clothGroup);
        if (n) return String(n);
      }
    } catch (e) {
    }
    return clothGroup;
  }
  function baseGroupFromBundle(act2) {
    if (act2 && Array.isArray(act2.clothGroups) && act2.clothGroups[0]) {
      return String(act2.clothGroups[0]);
    }
    return String(act2 && act2.clothGroup || "");
  }
  function seidrCmdParseBundleToken(token) {
    const t = String(token || "").trim();
    const m = t.match(/^all:(.+)$/i);
    if (!m) return null;
    return m[1].trim();
  }
  function seidrCmdListStripOptions(acting, target, includeBundles) {
    if (!target) return [];
    const out = [];
    const acts = undressActs();
    for (let i = 0; i < acts.length; i++) {
      const act2 = acts[i];
      if (!act2 || !act2.name || !act2.undress) continue;
      const isBundle = !!act2.bundle;
      if (isBundle && !includeBundles) continue;
      if (!isBundle && act2.name.indexOf("Seidr_UndressAll_") === 0) continue;
      const cloth = isBundle ? act2.clothGroups || [act2.clothGroup] : act2.clothGroup || act2.clothGroups && act2.clothGroups[0];
      if (!cloth) continue;
      if (!canUndress(acting, target, cloth)) continue;
      if (isBundle) {
        const base = baseGroupFromBundle(act2);
        if (!base) continue;
        out.push({
          insert: "all:" + base,
          label: String(act2.label || "Undress all " + (act2.family || base)),
          hint: "bundle \xB7 " + String(act2.zone || ""),
          activityName: String(act2.name),
          zone: String(act2.zone || ""),
          bundle: true,
          clothGroup: base
        });
      } else {
        const g = String(act2.clothGroup || cloth);
        const worn = wornHint(target, g);
        out.push({
          insert: g,
          label: worn !== g ? worn + " \xB7 " + g : String(act2.noun || g),
          hint: g + (act2.zone ? " \xB7 " + act2.zone : ""),
          activityName: String(act2.name),
          zone: String(act2.zone || ""),
          bundle: false,
          clothGroup: g
        });
      }
    }
    out.sort(function(a, b) {
      if (a.bundle !== b.bundle) return a.bundle ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
    return out;
  }
  function seidrCmdFilterStripOptions(options, prefix) {
    const pfx = String(prefix || "").trim().toLowerCase();
    if (!pfx) return options;
    return options.filter(function(o) {
      return o.insert.toLowerCase().indexOf(pfx) >= 0 || o.label.toLowerCase().indexOf(pfx) >= 0 || o.clothGroup.toLowerCase().indexOf(pfx) >= 0 || o.activityName.toLowerCase().indexOf(pfx) >= 0 || o.hint && o.hint.toLowerCase().indexOf(pfx) >= 0;
    });
  }
  function seidrCmdResolveStripSlot(token, acting, target, includeBundles) {
    const raw = String(token || "").trim();
    if (!raw) return { ok: false, error: "Missing slot" };
    const options = seidrCmdListStripOptions(acting, target, includeBundles);
    if (!options.length) {
      return { ok: false, error: "Nothing strippable on that person right now" };
    }
    const key = raw.toLowerCase();
    const bundleBase = seidrCmdParseBundleToken(raw);
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (bundleBase) {
        if (o.bundle && o.clothGroup.toLowerCase() === bundleBase.toLowerCase()) {
          return { ok: true, option: o };
        }
        continue;
      }
      if (o.insert.toLowerCase() === key) return { ok: true, option: o };
      if (o.clothGroup.toLowerCase() === key && !o.bundle) return { ok: true, option: o };
    }
    const soft = [];
    for (let j = 0; j < options.length; j++) {
      const o = options[j];
      if (o.bundle && !includeBundles) continue;
      if (o.label.toLowerCase() === key) soft.push(o);
      else if (o.label.toLowerCase().indexOf(key) >= 0) soft.push(o);
    }
    if (soft.length === 1) return { ok: true, option: soft[0] };
    if (soft.length > 1) {
      return {
        ok: false,
        error: 'Ambiguous slot "' + raw + '" \u2014 use Tab or the exact group id'
      };
    }
    return {
      ok: false,
      error: 'Unknown or unavailable slot "' + raw + '". Tab for strippable layers.'
    };
  }

  // src/commands/warn.ts
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function seidrCmdLocal(text, timeoutMs) {
    if (typeof ChatRoomSendLocal !== "function") return;
    const ms = typeof timeoutMs === "number" ? timeoutMs : SEIDR_CMD_WARN_MS;
    const html = '<span style="color:#d4a017;">[Seidr]</span> <span style="color:#f0e6d4;">' + escapeHtml(text) + "</span>";
    try {
      ChatRoomSendLocal(html, ms);
    } catch (e) {
      console.warn("[Seidr Cmd]", text);
    }
  }
  function seidrCmdWarn(text) {
    seidrCmdLocal(text, SEIDR_CMD_WARN_MS);
  }
  function seidrCmdError(text) {
    seidrCmdLocal(text, SEIDR_CMD_ERROR_MS);
  }

  // src/commands/run.ts
  function seidrCmdIsEnabled(tag) {
    const key = seidrCmdEnableKeyForTag(tag);
    if (!key) return false;
    const bag = seidrGetCommandsBag();
    return bag.enabled[key] !== false;
  }
  function runItemActivity(target, zone, activityName) {
    if (!seidrCmdActivityAvailable(target, zone, activityName)) {
      seidrCmdError(
        'Activity "' + activityName + '" on ' + zone + " is not available on that person right now."
      );
      return false;
    }
    const ia = seidrCmdFindItemActivity(target, zone, activityName);
    if (!ia) {
      seidrCmdError('Could not resolve activity "' + activityName + '".');
      return false;
    }
    try {
      const family = target && target.AssetFamily || Player && Player.AssetFamily || "Female3DCG";
      const groupName = ia.Group && (ia.Group.Name || ia.Group) || zone;
      const group = typeof AssetGroupGet === "function" ? AssetGroupGet(family, typeof groupName === "string" ? groupName : zone) : { Name: zone };
      if (typeof ActivityRun !== "function") {
        seidrCmdError("ActivityRun unavailable");
        return false;
      }
      ActivityRun(Player, target, group, ia, true);
      return true;
    } catch (e) {
      console.warn("[Seidr Cmd] ActivityRun failed", e);
      seidrCmdError("Failed to run activity.");
      return false;
    }
  }
  function canPoseTarget2(actor, acted) {
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
  function applyPose3(C, pose) {
    if (!C || !pose) return;
    try {
      if (typeof PoseSetActive === "function") PoseSetActive(C, pose, false);
      else if (typeof CharacterSetActivePose === "function") CharacterSetActivePose(C, pose);
    } catch (e) {
    }
    try {
      if (typeof ChatRoomCharacterUpdate === "function") ChatRoomCharacterUpdate(C);
      else if (typeof ServerSend === "function" && C.IsPlayer && C.IsPlayer()) {
        ServerSend("ChatRoomCharacterPoseUpdate", { Pose: C.ActivePose });
      }
    } catch (e2) {
    }
  }
  function executeActionCommand(memberRaw, actionRaw) {
    const mem = seidrCmdResolveMember(memberRaw);
    if (mem.ok === false) {
      seidrCmdWarn(mem.error);
      return true;
    }
    const act2 = seidrCmdResolveAction(actionRaw);
    if (act2.ok === false) {
      seidrCmdWarn(act2.error);
      return true;
    }
    const target = mem.character;
    const binding = act2.action;
    try {
      if (typeof ServerChatRoomGetAllowItem === "function" && !ServerChatRoomGetAllowItem(Player, target)) {
        seidrCmdError("You cannot act on that person right now.");
        return true;
      }
    } catch (e) {
    }
    if (runItemActivity(target, binding.slot, binding.activity)) {
      seidrCmdSetLastActor(mem.memberNumber);
    }
    return true;
  }
  function executeStripCommand(tag, memberRaw, slotRaw) {
    const includeBundles = tag === "strip";
    const mem = seidrCmdResolveMember(memberRaw);
    if (mem.ok === false) {
      seidrCmdWarn(mem.error);
      return true;
    }
    const target = mem.character;
    try {
      if (typeof ServerChatRoomGetAllowItem === "function" && !ServerChatRoomGetAllowItem(Player, target)) {
        seidrCmdError("You cannot act on that person right now.");
        return true;
      }
    } catch (e) {
    }
    const slot = seidrCmdResolveStripSlot(slotRaw, Player, target, includeBundles);
    if (slot.ok === false) {
      seidrCmdWarn(slot.error);
      return true;
    }
    if (runItemActivity(target, slot.option.zone, slot.option.activityName)) {
      seidrCmdSetLastActor(mem.memberNumber);
    }
    return true;
  }
  function executePosesCommand(memberRaw, poseRaw) {
    const mem = seidrCmdResolveMember(memberRaw);
    if (mem.ok === false) {
      seidrCmdWarn(mem.error);
      return true;
    }
    const target = mem.character;
    const pose = String(poseRaw || "").trim();
    if (!pose) {
      seidrCmdWarn("Missing pose");
      return true;
    }
    const self = target === Player || typeof target.MemberNumber === "number" && target.MemberNumber === Player.MemberNumber;
    if (!self && !canPoseTarget2(Player, target)) {
      seidrCmdError("You cannot change that person's pose right now.");
      return true;
    }
    if (!seidrPoseAvailable(target, pose, { aided: !self })) {
      seidrCmdWarn('Pose "' + (seidrPoseLabel(pose) || pose) + '" is not available on that person.');
      return true;
    }
    applyPose3(target, pose);
    seidrCmdSetLastActor(mem.memberNumber);
    const side = self ? "self" : "other";
    seidrPublishActionText(seidrPoseChatTemplate(pose, side), Player, target);
    return true;
  }
  function executeAnimationCommand(nameRaw) {
    const name = String(nameRaw || "").trim();
    if (!name) {
      seidrCmdWarn("Usage: /animation <name>");
      return true;
    }
    if (!seidrFindAnimationByName(name)) {
      seidrCmdWarn('Unknown animation "' + name + '". Define it under Settings \u2192 Animations.');
      return true;
    }
    seidrPlayAnimation(name).then(function(r) {
      if (!r.ok && r.error) seidrCmdWarn(r.error);
    });
    return true;
  }
  function executeMetaCommand(tag) {
    if (tag === "seidr") {
      if (typeof Seidr.openSettings === "function") Seidr.openSettings();
      else seidrCmdWarn("Settings unavailable");
      return true;
    }
    try {
      const s = seidrGetSettings();
      if (Seidr.SHOW_ROOM_MANAGER === false || s.roomManagerEnabled === false) {
        seidrCmdWarn("Activate Room Manager in Settings \u2192 General first.");
        return true;
      }
      if (typeof Seidr.rmOpenPanel === "function") Seidr.rmOpenPanel();
      else seidrCmdWarn("Room Manager unavailable");
    } catch (e) {
      seidrCmdWarn("Room Manager unavailable");
    }
    return true;
  }
  function seidrCmdExecuteLine(msg) {
    const parsed = seidrParseCmdLine(msg);
    if (parsed.ok === false) {
      if (parsed.error !== "Not a Seidr command") seidrCmdWarn(parsed.error);
      return false;
    }
    if (!seidrCmdIsEnabled(parsed.tag)) {
      const key = seidrCmdEnableKeyForTag(parsed.tag);
      seidrCmdWarn("/" + parsed.tag + " is disabled in Settings \u2192 General \u2192 Commands" + (key ? " (" + key + ")" : ""));
      return true;
    }
    if (parsed.family === "meta") {
      return executeMetaCommand(parsed.tag === "roommanager" ? "roommanager" : "seidr");
    }
    if (parsed.family === "animation") {
      return executeAnimationCommand(parsed.secondRaw);
    }
    if (parsed.family === "poses") {
      return executePosesCommand(parsed.memberRaw, parsed.secondRaw);
    }
    if (parsed.family === "strip") {
      return executeStripCommand(
        parsed.tag === "stripe" ? "stripe" : "strip",
        parsed.memberRaw,
        parsed.secondRaw
      );
    }
    return executeActionCommand(parsed.memberRaw, parsed.secondRaw || parsed.actionRaw);
  }

  // src/commands/styles.ts
  function seidrCmdCss() {
    return [
      "#seidr-cmd-ac {",
      "  position: fixed; z-index: 130;",
      "  display: flex; flex-direction: column; gap: 2px;",
      "  padding: 6px;",
      "  background: rgba(28, 22, 38, 0.96); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;",
      "  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
      "  overflow-y: auto; overflow-x: hidden;",
      "  font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;",
      "  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);",
      "  scrollbar-width: thin;",
      "  scrollbar-color: rgba(212,160,23,0.55) rgba(20,16,28,0.9);",
      "}",
      "#seidr-cmd-ac[hidden] { display: none !important; }",
      "#seidr-cmd-ac::-webkit-scrollbar { width: 8px; }",
      "#seidr-cmd-ac::-webkit-scrollbar-track {",
      "  background: rgba(20,16,28,0.9); border-radius: 4px;",
      "}",
      "#seidr-cmd-ac::-webkit-scrollbar-thumb {",
      "  background: rgba(212,160,23,0.55); border-radius: 4px;",
      "}",
      "#seidr-cmd-ac::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(212,160,23,0.8);",
      "}",
      ".seidr-cmd-ac-item {",
      "  display: flex; align-items: baseline; gap: 8px; width: 100%;",
      "  text-align: left; cursor: pointer;",
      "  background: rgba(42, 34, 56, 0.85); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;",
      "  padding: 6px 10px; font: inherit;",
      "}",
      ".seidr-cmd-ac-item:hover, .seidr-cmd-ac-on {",
      "  border-color: #d4a017; color: #f0e6d4;",
      "  background: rgba(60, 48, 80, 0.95);",
      "}",
      ".seidr-cmd-ac-label { flex: 1; min-width: 0; }",
      ".seidr-cmd-ac-hint {",
      "  flex: 0 0 auto; font-size: 11px; color: #a898b0;",
      "  font-variant-numeric: tabular-nums;",
      "}",
      ".seidr-cmd-sec { margin-top: 4px; }",
      ".seidr-cmd-editor-actions { margin-top: 10px; gap: 8px; }",
      "#seidr-cmd-person-editor, #seidr-cmd-action-editor { margin-top: 10px; }",
      ".seidr-cmd-msg { margin: 6px 0 0; font-size: 11px; color: #d4a017; min-height: 1em; }"
    ].join("\n");
  }

  // src/commands/autocomplete.ts
  var state = {
    open: false,
    kind: null,
    items: [],
    index: 0,
    spanStart: 0,
    spanEnd: 0,
    quoted: false
  };
  function ensureStyles() {
    let style = document.getElementById("seidr-cmd-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "seidr-cmd-styles";
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = seidrCmdCss();
  }
  function getInput() {
    const el = document.getElementById("InputChat");
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
    return null;
  }
  function ensureRoot() {
    ensureStyles();
    let root3 = document.getElementById("seidr-cmd-ac");
    if (root3) return root3;
    root3 = document.createElement("div");
    root3.id = "seidr-cmd-ac";
    root3.className = "seidr-cmd-ac";
    root3.setAttribute("role", "listbox");
    root3.hidden = true;
    document.body.appendChild(root3);
    return root3;
  }
  function seidrCmdAcIsOpen() {
    return state.open;
  }
  function seidrCmdAcClose() {
    state.open = false;
    state.kind = null;
    state.items = [];
    state.index = 0;
    const root3 = document.getElementById("seidr-cmd-ac");
    if (root3) {
      root3.hidden = true;
      root3.innerHTML = "";
    }
  }
  function positionOverInput(root3, input) {
    const rect = input.getBoundingClientRect();
    const maxH = Math.min(240, Math.max(120, window.innerHeight - 24));
    root3.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 280)) + "px";
    root3.style.width = Math.max(220, Math.min(rect.width, 420)) + "px";
    root3.style.maxHeight = maxH + "px";
    const above = rect.top - 8;
    if (above > maxH + 8) {
      root3.style.top = "auto";
      root3.style.bottom = window.innerHeight - rect.top + 6 + "px";
    } else {
      root3.style.bottom = "auto";
      root3.style.top = rect.bottom + 6 + "px";
    }
  }
  function render() {
    const root3 = ensureRoot();
    const input = getInput();
    if (!state.open || !state.items.length || !input) {
      seidrCmdAcClose();
      return;
    }
    root3.hidden = false;
    positionOverInput(root3, input);
    root3.innerHTML = state.items.map(function(it, i) {
      const on2 = i === state.index ? " seidr-cmd-ac-on" : "";
      const hint = it.hint ? '<span class="seidr-cmd-ac-hint">' + escapeHtml2(it.hint) + "</span>" : "";
      return '<button type="button" class="seidr-cmd-ac-item' + on2 + '" data-i="' + i + '" role="option"><span class="seidr-cmd-ac-label">' + escapeHtml2(it.label) + "</span>" + hint + "</button>";
    }).join("");
    root3.querySelectorAll("[data-i]").forEach(function(btn2) {
      btn2.addEventListener("mousedown", function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const i = parseInt(btn2.getAttribute("data-i") || "0", 10);
        state.index = i;
        seidrCmdAcAccept();
      });
    });
    const on = root3.querySelector(".seidr-cmd-ac-on");
    if (on && typeof on.scrollIntoView === "function") {
      on.scrollIntoView({ block: "nearest" });
    }
  }
  function escapeHtml2(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function buildMemberItems(prefix) {
    return seidrCmdFilterPeople(prefix).map(function(p) {
      return {
        insert: String(p.memberNumber),
        label: p.label,
        hint: "#" + p.memberNumber
      };
    });
  }
  function buildActionItems(prefix, memberRaw) {
    const pfx = String(prefix || "").trim().toLowerCase();
    let target = null;
    if (memberRaw) {
      const mem = seidrCmdResolveMember(memberRaw);
      if (mem.ok) target = mem.character;
    }
    const list = seidrListCmdActions();
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (pfx && a.name.toLowerCase().indexOf(pfx) < 0) continue;
      if (target && !seidrCmdActivityAvailable(target, a.slot, a.activity)) continue;
      out.push({
        insert: a.name,
        label: a.name,
        hint: a.slot + " \xB7 " + a.activity
      });
    }
    return out;
  }
  function buildStripSlotItems(prefix, memberRaw, includeBundles) {
    if (!memberRaw) return [];
    const mem = seidrCmdResolveMember(memberRaw);
    if (mem.ok === false) return [];
    const options = seidrCmdFilterStripOptions(
      seidrCmdListStripOptions(Player, mem.character, includeBundles),
      prefix
    );
    return options.map(function(o) {
      return { insert: o.insert, label: o.label, hint: o.hint };
    });
  }
  function buildPoseItems(prefix, memberRaw) {
    if (!memberRaw) return [];
    const mem = seidrCmdResolveMember(memberRaw);
    if (mem.ok === false) return [];
    const target = mem.character;
    const self = typeof Player !== "undefined" && Player && (target === Player || typeof target.MemberNumber === "number" && target.MemberNumber === Player.MemberNumber);
    const pfx = String(prefix || "").trim().toLowerCase();
    const list = seidrPosesForCharacter(target, { aided: !self });
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (pfx && p.id.toLowerCase().indexOf(pfx) < 0 && p.label.toLowerCase().indexOf(pfx) < 0) {
        continue;
      }
      out.push({ insert: p.id, label: p.label, hint: p.id });
    }
    return out;
  }
  function buildAnimationItems(prefix) {
    return seidrFilterAnimationsByPrefix(prefix).map(function(a) {
      return {
        insert: a.name,
        label: a.name,
        hint: a.steps.length + " step" + (a.steps.length === 1 ? "" : "s")
      };
    });
  }
  function openForFocus(focus, value) {
    const kind = focus.kind;
    if (kind !== "member" && kind !== "action" && kind !== "slot" && kind !== "pose" && kind !== "animation") {
      seidrCmdAcClose();
      return false;
    }
    const peek = seidrCmdPeekLine(value);
    if (peek && !seidrCmdIsEnabled(peek.tag)) {
      seidrCmdAcClose();
      return false;
    }
    let items = [];
    if (kind === "member") {
      items = buildMemberItems(focus.prefix);
    } else if (kind === "action") {
      if (!peek || peek.family !== "action") {
        seidrCmdAcClose();
        return false;
      }
      items = buildActionItems(focus.prefix, peek.memberRaw);
    } else if (kind === "slot") {
      if (!peek || peek.family !== "strip" || !peek.memberRaw) {
        seidrCmdAcClose();
        return false;
      }
      items = buildStripSlotItems(focus.prefix, peek.memberRaw, peek.tag === "strip");
    } else if (kind === "pose") {
      if (!peek || peek.family !== "poses" || !peek.memberRaw) {
        seidrCmdAcClose();
        return false;
      }
      items = buildPoseItems(focus.prefix, peek.memberRaw);
    } else {
      if (!peek || peek.family !== "animation") {
        seidrCmdAcClose();
        return false;
      }
      items = buildAnimationItems(focus.prefix);
    }
    if (!items.length) {
      seidrCmdAcClose();
      return false;
    }
    state.open = true;
    state.kind = kind;
    state.items = items;
    state.index = kind === "member" ? seidrCmdPreferMemberIndex(items) : 0;
    state.spanStart = focus.start;
    state.spanEnd = focus.end;
    state.quoted = kind === "member" ? focus.quoted : false;
    render();
    return true;
  }
  function seidrCmdAcOnTab() {
    const input = getInput();
    if (!input) return false;
    let value = input.value || "";
    if (!seidrCmdIsCommandLine(value) && !seidrCmdStartsWithTag(value)) {
      return false;
    }
    const caret = input.selectionStart != null ? input.selectionStart : value.length;
    let focus = seidrCmdTokenAtCaret(value, caret);
    if (focus.kind === "tag") {
      const bare = value.match(
        /^\s*\/(roommanager|animation|action|stripe|strip|poses|seidr|ani|a|p)\s*$/i
      );
      if (!bare) return false;
      const tag = bare[1].toLowerCase();
      if (!seidrCmdIsEnabled(tag)) return false;
      if (tag === "seidr" || tag === "roommanager") return false;
      const spaced = "/" + tag + " ";
      input.value = spaced;
      try {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {
      }
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(spaced.length, spaced.length);
      }
      value = spaced;
      if (tag === "animation" || tag === "ani") {
        focus = {
          kind: "animation",
          prefix: "",
          start: spaced.length,
          end: spaced.length
        };
      } else {
        focus = {
          kind: "member",
          prefix: "",
          quoted: false,
          start: spaced.length,
          end: spaced.length
        };
      }
    }
    if (focus.kind === "none") return false;
    try {
      return openForFocus(focus, value);
    } catch (e) {
      console.warn("[Seidr Cmd] autocomplete failed", e);
      seidrCmdAcClose();
      return false;
    }
  }
  function seidrCmdAcMove(delta) {
    if (!state.open || !state.items.length) return false;
    const n = state.items.length;
    state.index = (state.index + delta + n * 10) % n;
    render();
    return true;
  }
  function seidrCmdAcAccept() {
    if (!state.open || !state.items.length) return false;
    const input = getInput();
    if (!input) return false;
    const item = state.items[state.index];
    if (!item) return false;
    const insert = item.insert;
    const value = input.value || "";
    let nextValue;
    let nextCaret;
    if (state.kind === "member") {
      const peek = seidrCmdPeekLine(value);
      const tag = peek && peek.tag || seidrCmdTagFromLine(value) || "a";
      const second = peek && peek.secondRaw ? peek.secondRaw : "";
      const head = "/" + tag + " " + insert + " ";
      nextValue = head + second;
      nextCaret = head.length;
    } else if (state.kind === "animation") {
      const peek = seidrCmdPeekLine(value);
      const tag = peek && peek.tag || seidrCmdTagFromLine(value) || "animation";
      nextValue = "/" + tag + " " + insert;
      nextCaret = nextValue.length;
    } else {
      const next = seidrCmdReplaceSpan(value, state.spanStart, state.spanEnd, insert, false);
      nextValue = next.value;
      nextCaret = next.caret;
    }
    input.value = nextValue;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(nextCaret, nextCaret);
    }
    try {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
    }
    seidrCmdAcClose();
    return true;
  }
  function seidrCmdAcHandleKeyDown(ev) {
    const input = getInput();
    if (!input || document.activeElement !== input) {
      if (state.open) seidrCmdAcClose();
      return false;
    }
    const key = ev.key;
    if (key === "Tab") {
      const value = input.value || "";
      if (!state.open && seidrFastSelectApply(input)) {
        ev.preventDefault();
        ev.stopPropagation();
        return true;
      }
      const onSeidrCmd = state.open || seidrCmdIsCommandLine(value) || seidrCmdStartsWithTag(value);
      if (!onSeidrCmd) return false;
      if (state.open) {
        ev.preventDefault();
        ev.stopPropagation();
        seidrCmdAcAccept();
        return true;
      }
      const opened = seidrCmdAcOnTab();
      if (!opened) return false;
      ev.preventDefault();
      ev.stopPropagation();
      return true;
    }
    if (!state.open) return false;
    if (key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      seidrCmdAcClose();
      return true;
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      if (key === "s" || key === "S") {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      }
      ev.preventDefault();
      ev.stopPropagation();
      seidrCmdAcMove(1);
      return true;
    }
    if (key === "ArrowUp" || key === "w" || key === "W") {
      if (key === "w" || key === "W") {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      }
      ev.preventDefault();
      ev.stopPropagation();
      seidrCmdAcMove(-1);
      return true;
    }
    if (key === "Enter" || key === "e" || key === "E") {
      if (key === "e" || key === "E") {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      }
      ev.preventDefault();
      ev.stopPropagation();
      seidrCmdAcAccept();
      return true;
    }
    if (key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      seidrCmdAcClose();
      return false;
    }
    return false;
  }

  // src/commands/runtime.ts
  function clearInput() {
    try {
      if (typeof ElementValue === "function") ElementValue("InputChat", "");
      else {
        const el = document.getElementById("InputChat");
        if (el) el.value = "";
      }
    } catch (e) {
    }
  }
  function onCommand(fallbackTag, _args) {
    if (!seidrCmdIsEnabled(fallbackTag)) {
      seidrCmdExecuteLine("/" + fallbackTag);
      clearInput();
      return;
    }
    const el = document.getElementById("InputChat");
    const msg = el ? String(el.value || "").trim() : "";
    const line = msg || "";
    const full = seidrCmdIsCommandLine(line) ? line : "/" + fallbackTag + " " + String(_args || "").trim();
    seidrCmdAcClose();
    const handled = seidrCmdExecuteLine(full.startsWith("/") ? full : "/" + fallbackTag + " " + full);
    if (handled) clearInput();
  }
  function onMetaCommand(tag) {
    seidrCmdAcClose();
    seidrCmdExecuteLine("/" + tag);
    clearInput();
  }
  function seidrRegisterCommands() {
    if (typeof CommandCombine !== "function") return;
    const en = seidrGetCommandsBag().enabled;
    const defs = [];
    if (en.a !== false) {
      defs.push({
        Tag: "a",
        Description: "Seidr: /a <member> <action> \u2014 run a bound activity",
        Clear: false,
        Action: function(args) {
          onCommand("a", args);
        }
      });
    }
    if (en.action !== false) {
      defs.push({
        Tag: "action",
        Description: "Seidr: /action <member> <action> (Fast Select: a+Tab)",
        Clear: false,
        Action: function(args) {
          onCommand("action", args);
        }
      });
    }
    if (en.strip !== false) {
      defs.push({
        Tag: "strip",
        Description: "Seidr: /strip <member> <slot> \u2014 undress all layers (Fast Select: s+Tab)",
        Clear: false,
        Action: function(args) {
          onCommand("strip", args);
        }
      });
    }
    if (en.stripe !== false) {
      defs.push({
        Tag: "stripe",
        Description: "Seidr: /stripe <member> <slot> \u2014 undress one layer",
        Clear: false,
        Action: function(args) {
          onCommand("stripe", args);
        }
      });
    }
    if (en.poses !== false) {
      defs.push({
        Tag: "poses",
        Description: "Seidr: /poses <member> <pose> \u2014 set Club pose (Fast Select: p+Tab)",
        Clear: false,
        Action: function(args) {
          onCommand("poses", args);
        }
      });
    }
    if (en.p !== false) {
      defs.push({
        Tag: "p",
        Description: "Seidr: /p <member> <pose> \u2014 short for /poses",
        Clear: false,
        Action: function(args) {
          onCommand("p", args);
        }
      });
    }
    if (en.animation !== false) {
      defs.push({
        Tag: "animation",
        Description: "Seidr: /animation <name> \u2014 play your animation (Fast Select: d+Tab)",
        Clear: false,
        Action: function(args) {
          onCommand("animation", args);
        }
      });
    }
    if (en.ani !== false) {
      defs.push({
        Tag: "ani",
        Description: "Seidr: /ani <name> \u2014 short for /animation",
        Clear: false,
        Action: function(args) {
          onCommand("ani", args);
        }
      });
    }
    if (en.seidr !== false) {
      defs.push({
        Tag: "seidr",
        Description: "Seidr: open Settings",
        Clear: false,
        Action: function() {
          onMetaCommand("seidr");
        }
      });
    }
    if (en.roommanager !== false) {
      defs.push({
        Tag: "roommanager",
        Description: "Seidr: open Room Manager",
        Clear: false,
        Action: function() {
          onMetaCommand("roommanager");
        }
      });
    }
    if (!defs.length) return;
    try {
      CommandCombine(defs);
    } catch (e) {
      console.warn("[Seidr Cmd] CommandCombine failed", e);
    }
  }
  function onKeyDownCapture(ev) {
    if (seidrCmdAcHandleKeyDown(ev)) return;
  }
  function onBlurClose() {
    setTimeout(function() {
      if (!seidrCmdAcIsOpen()) return;
      const ae = document.activeElement;
      const root3 = document.getElementById("seidr-cmd-ac");
      if (root3 && ae && root3.contains(ae)) return;
      seidrCmdAcClose();
    }, 50);
  }
  function hookInput() {
    const el = document.getElementById("InputChat");
    if (!el || el.__seidrCmdHooked) return;
    el.__seidrCmdHooked = true;
    el.addEventListener("keydown", onKeyDownCapture, true);
    el.addEventListener("blur", onBlurClose);
  }
  function installInputWatch() {
    hookInput();
    document.addEventListener(
      "focusin",
      function(ev) {
        const t = ev.target;
        if (t && t.id === "InputChat") hookInput();
      },
      true
    );
  }
  function hookSendChat() {
    if (!Seidr.hookFunction) return;
    Seidr.hookFunction("ChatRoomSendChat", 8, function(args, next) {
      try {
        const el = document.getElementById("InputChat");
        const msg = el ? String(el.value || "").trim() : "";
        if (seidrCmdIsCommandLine(msg)) {
          seidrCmdAcClose();
          seidrCmdExecuteLine(msg);
          clearInput();
          return;
        }
      } catch (e) {
        console.warn("[Seidr Cmd] send hook", e);
      }
      return next(args);
    });
  }
  function seidrInstallCommands() {
    if (Seidr.SHOW_COMMANDS === false) return;
    if (Seidr._hookState && Seidr._hookState.commands) {
      seidrRegisterCommands();
      return;
    }
    if (!Seidr._hookState) Seidr._hookState = {};
    Seidr._hookState.commands = true;
    seidrRegisterCommands();
    installInputWatch();
    hookSendChat();
  }
  Seidr.installCommands = seidrInstallCommands;
  Seidr.registerCommands = seidrRegisterCommands;

  // src/commands/ui.ts
  var editPersonId = null;
  var editActionId = null;
  var draftPerson = null;
  var draftAction = null;
  function escapeHtml3(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ensureCmdSettingsStyles() {
    if (document.getElementById("seidr-cmd-styles")) return;
    const style = document.createElement("style");
    style.id = "seidr-cmd-styles";
    style.textContent = seidrCmdCss();
    (document.head || document.documentElement).appendChild(style);
  }
  function opts(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml3(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" + escapeHtml3(o.label) + "</option>";
    }).join("");
  }
  function setMsg(root3, text) {
    const el = root3.querySelector("#seidr-cmd-msg");
    if (el) el.textContent = text || "";
  }
  function personLabel(p) {
    const mn = p.memberNumber > 0 ? String(p.memberNumber) : "?";
    return (p.alias || "person" + p.id) + " \xB7 #" + mn;
  }
  function actionLabel(a) {
    const act2 = a.activity || "(no activity)";
    return (a.name || "action" + a.id) + " \xB7 " + (a.slot || "?") + " \xB7 " + act2;
  }
  function renderPeoplePicker(root3) {
    const pick = root3.querySelector("#seidr-cmd-person-pick");
    const cap = root3.querySelector("#seidr-cmd-people-cap");
    const list = seidrListCmdPeople();
    if (cap) cap.textContent = list.length + "/" + SEIDR_CMD_PEOPLE_MAX + " People";
    if (!pick) return;
    if (!list.length) {
      pick.innerHTML = '<option value="">No people yet</option>';
      pick.disabled = true;
      return;
    }
    pick.disabled = false;
    const sel = editPersonId != null ? String(editPersonId) : "";
    pick.innerHTML = list.map(function(p) {
      return '<option value="' + p.id + '"' + (String(p.id) === sel ? " selected" : "") + ">" + escapeHtml3(personLabel(p)) + "</option>";
    }).join("");
    if (editPersonId == null && list[0]) {
      editPersonId = list[0].id;
      pick.value = String(list[0].id);
    } else if (editPersonId != null) {
      pick.value = String(editPersonId);
    }
  }
  function renderPersonEditor(root3) {
    const host = root3.querySelector("#seidr-cmd-person-editor");
    if (!host) return;
    const list = seidrListCmdPeople();
    let p = draftPerson;
    if (!p && editPersonId != null) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === editPersonId) {
          p = Object.assign({}, list[i]);
          draftPerson = p;
          break;
        }
      }
    }
    if (!p) {
      host.innerHTML = '<p class="seidr-settings-hint">Add a person or pick one from the list.</p>';
      return;
    }
    host.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Alias</span>',
      '<input type="text" id="seidr-cmd-person-alias" maxlength="48" placeholder="Short name for /a" value="' + escapeHtml3(p.alias) + '" />',
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Member ID</span>',
      '<input type="text" id="seidr-cmd-person-mn" inputmode="numeric" autocomplete="off" placeholder="e.g. 12345" value="' + (p.memberNumber > 0 ? String(p.memberNumber) : "") + '" />',
      "</div>",
      '<div class="seidr-settings-row seidr-cmd-editor-actions">',
      '<button type="button" class="seidr-act-btn" id="seidr-cmd-person-save">Save person</button>',
      '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-cmd-person-del">Delete</button>',
      "</div>"
    ].join("");
  }
  function renderActionsPicker(root3) {
    const pick = root3.querySelector("#seidr-cmd-action-pick");
    const cap = root3.querySelector("#seidr-cmd-actions-cap");
    const list = seidrListCmdActions();
    if (cap) cap.textContent = list.length + "/" + SEIDR_CMD_ACTIONS_MAX + " Actions";
    if (!pick) return;
    if (!list.length) {
      pick.innerHTML = '<option value="">No actions yet</option>';
      pick.disabled = true;
      return;
    }
    pick.disabled = false;
    const sel = editActionId != null ? String(editActionId) : "";
    pick.innerHTML = list.map(function(a) {
      return '<option value="' + a.id + '"' + (String(a.id) === sel ? " selected" : "") + ">" + escapeHtml3(actionLabel(a)) + "</option>";
    }).join("");
    if (editActionId == null && list[0]) {
      editActionId = list[0].id;
      pick.value = String(list[0].id);
    } else if (editActionId != null) {
      pick.value = String(editActionId);
    }
  }
  function renderActionEditor(root3) {
    const host = root3.querySelector("#seidr-cmd-action-editor");
    if (!host) return;
    const list = seidrListCmdActions();
    let a = draftAction;
    if (!a && editActionId != null) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === editActionId) {
          a = Object.assign({}, list[i]);
          draftAction = a;
          break;
        }
      }
    }
    if (!a) {
      host.innerHTML = '<p class="seidr-settings-hint">Add an action or pick one from the list.</p>';
      return;
    }
    const slots = seidrCmdListSlots();
    const slot = a.slot || (slots[0] ? slots[0].id : "ItemTorso");
    const acts = seidrCmdListActivitiesForSlot(slot);
    const hasAct = acts.some(function(x) {
      return x.id === a.activity;
    });
    const extra = !hasAct && a.activity ? '<option value="' + escapeHtml3(a.activity) + '" selected>' + escapeHtml3(a.activity) + " (saved)</option>" : "";
    const emptyOpt = !a.activity ? '<option value="" selected>\u2014 pick activity \u2014</option>' : '<option value="">\u2014 pick activity \u2014</option>';
    host.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Call name</span>',
      '<input type="text" id="seidr-cmd-action-name" maxlength="48" placeholder="Used in /a \u2026 name" value="' + escapeHtml3(a.name) + '" />',
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Slot</span>',
      '<select id="seidr-cmd-action-slot">' + opts(slots, slot) + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Activity</span>',
      '<select id="seidr-cmd-action-activity">' + emptyOpt + extra + opts(acts, a.activity || "") + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Slot first, then activities available for that zone (Club / Seidr / mods).</p>',
      '<div class="seidr-settings-row seidr-cmd-editor-actions">',
      '<button type="button" class="seidr-act-btn" id="seidr-cmd-action-save">Save action</button>',
      '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-cmd-action-del">Delete</button>',
      "</div>"
    ].join("");
  }
  function readPersonDraft(root3) {
    if (editPersonId == null) return null;
    const alias = root3.querySelector("#seidr-cmd-person-alias")?.value || "";
    const mnRaw = root3.querySelector("#seidr-cmd-person-mn")?.value || "";
    const digits = String(mnRaw).replace(/[^\d]/g, "");
    return {
      id: editPersonId,
      alias: alias.trim(),
      memberNumber: digits ? parseInt(digits, 10) : 0
    };
  }
  function readActionDraft(root3) {
    if (editActionId == null) return null;
    return {
      id: editActionId,
      name: (root3.querySelector("#seidr-cmd-action-name")?.value || "").trim(),
      slot: (root3.querySelector("#seidr-cmd-action-slot")?.value || "ItemTorso").trim(),
      activity: (root3.querySelector("#seidr-cmd-action-activity")?.value || "").trim()
    };
  }
  function syncPersonDraftFromDom(root3) {
    const d = readPersonDraft(root3);
    if (d) draftPerson = d;
  }
  function syncActionDraftFromDom(root3) {
    const d = readActionDraft(root3);
    if (d) draftAction = d;
  }
  function refreshPeopleSection(root3) {
    renderPeoplePicker(root3);
    const pick = root3.querySelector("#seidr-cmd-person-pick");
    if (pick) delete pick.__seidrBound;
    renderPersonEditor(root3);
    bindPeople(root3);
  }
  function refreshActionsSection(root3) {
    renderActionsPicker(root3);
    const pick = root3.querySelector("#seidr-cmd-action-pick");
    if (pick) delete pick.__seidrBound;
    renderActionEditor(root3);
    bindActions(root3);
  }
  function bindPeoplePicker(root3) {
    const pick = root3.querySelector("#seidr-cmd-person-pick");
    if (!pick || pick.__seidrBound) return;
    pick.__seidrBound = true;
    pick.addEventListener("change", function() {
      const id = parseInt(pick.value || "0", 10);
      if (!id) return;
      editPersonId = id;
      draftPerson = null;
      const list = seidrListCmdPeople();
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          draftPerson = Object.assign({}, list[i]);
          break;
        }
      }
      renderPersonEditor(root3);
      bindPeopleEditorOnly(root3);
    });
  }
  function bindPeople(root3) {
    bindPeoplePicker(root3);
    bindPeopleEditorOnly(root3);
  }
  function bindPeopleEditorOnly(root3) {
    root3.querySelector("#seidr-cmd-person-save")?.addEventListener("click", function() {
      syncPersonDraftFromDom(root3);
      if (!draftPerson) return;
      const r = seidrUpsertCmdPerson(draftPerson);
      setMsg(root3, r.ok ? "Person saved" : r.error || "Save failed");
      if (r.ok && r.person) {
        editPersonId = r.person.id;
        draftPerson = Object.assign({}, r.person);
        refreshPeopleSection(root3);
      }
    });
    root3.querySelector("#seidr-cmd-person-del")?.addEventListener("click", function() {
      if (editPersonId == null) return;
      const id = editPersonId;
      const r = seidrDeleteCmdPerson(id);
      setMsg(root3, r.ok ? "Person deleted" : r.error || "Delete failed");
      if (r.ok) {
        editPersonId = null;
        draftPerson = null;
        refreshPeopleSection(root3);
      }
    });
  }
  function bindActionsPicker(root3) {
    const pick = root3.querySelector("#seidr-cmd-action-pick");
    if (!pick || pick.__seidrBound) return;
    pick.__seidrBound = true;
    pick.addEventListener("change", function() {
      const id = parseInt(pick.value || "0", 10);
      if (!id) return;
      editActionId = id;
      draftAction = null;
      const list = seidrListCmdActions();
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          draftAction = Object.assign({}, list[i]);
          break;
        }
      }
      renderActionEditor(root3);
      bindActionsEditorOnly(root3);
    });
  }
  function bindActions(root3) {
    bindActionsPicker(root3);
    bindActionsEditorOnly(root3);
  }
  function bindActionsEditorOnly(root3) {
    root3.querySelector("#seidr-cmd-action-slot")?.addEventListener("change", function() {
      syncActionDraftFromDom(root3);
      if (!draftAction) return;
      const slot = root3.querySelector("#seidr-cmd-action-slot")?.value || "ItemTorso";
      draftAction.slot = slot;
      const acts = seidrCmdListActivitiesForSlot(slot);
      if (!acts.some(function(x) {
        return x.id === draftAction.activity;
      })) {
        draftAction.activity = "";
      }
      renderActionEditor(root3);
      bindActionsEditorOnly(root3);
    });
    root3.querySelector("#seidr-cmd-action-save")?.addEventListener("click", function() {
      syncActionDraftFromDom(root3);
      if (!draftAction) return;
      const r = seidrUpsertCmdAction(draftAction);
      setMsg(root3, r.ok ? "Action saved" : r.error || "Save failed");
      if (r.ok && r.action) {
        editActionId = r.action.id;
        draftAction = Object.assign({}, r.action);
        refreshActionsSection(root3);
      }
    });
    root3.querySelector("#seidr-cmd-action-del")?.addEventListener("click", function() {
      if (editActionId == null) return;
      const id = editActionId;
      const r = seidrDeleteCmdAction(id);
      setMsg(root3, r.ok ? "Action deleted" : r.error || "Delete failed");
      if (r.ok) {
        editActionId = null;
        draftAction = null;
        refreshActionsSection(root3);
      }
    });
  }
  function seidrBuildCommandsTab(container) {
    ensureCmdSettingsStyles();
    editPersonId = null;
    editActionId = null;
    draftPerson = null;
    draftAction = null;
    container.innerHTML = [
      '<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-tour="cmd-people">',
      "<summary>People</summary>",
      '<p class="seidr-settings-hint">Alias \u2192 Member ID for /a targets and name collisions. Max ' + SEIDR_CMD_PEOPLE_MAX + ".</p>",
      '<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
      '<button type="button" class="seidr-act-btn" id="seidr-cmd-add-person">Add person</button>',
      '<span class="seidr-settings-hint" id="seidr-cmd-people-cap">0/' + SEIDR_CMD_PEOPLE_MAX + " People</span>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Person</span>',
      '<select id="seidr-cmd-person-pick"></select>',
      "</div>",
      '<div class="seidr-act-editor" id="seidr-cmd-person-editor"></div>',
      "</details>",
      '<details class="seidr-settings-sec seidr-cmd-sec" open data-seidr-tour="cmd-actions">',
      "<summary>Actions</summary>",
      '<p class="seidr-settings-hint">Call name \u2192 slot + Club/Seidr/mod activity. Usage: /a &lt;member&gt; &lt;name&gt;. Max ' + SEIDR_CMD_ACTIONS_MAX + ".</p>",
      '<div class="seidr-settings-row" style="gap:6px; flex-wrap:wrap; align-items:center;">',
      '<button type="button" class="seidr-act-btn" id="seidr-cmd-add-action">Add action</button>',
      '<span class="seidr-settings-hint" id="seidr-cmd-actions-cap">0/' + SEIDR_CMD_ACTIONS_MAX + " Actions</span>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Action</span>',
      '<select id="seidr-cmd-action-pick"></select>',
      "</div>",
      '<div class="seidr-act-editor" id="seidr-cmd-action-editor"></div>',
      "</details>",
      '<p class="seidr-cmd-msg" id="seidr-cmd-msg"></p>',
      '<p class="seidr-settings-hint">Tab in chat on /a \u2026 for autocomplete (W/S or arrows, E/Enter, Esc).</p>'
    ].join("");
    container.querySelector("#seidr-cmd-add-person")?.addEventListener("click", function() {
      const created = seidrAddCmdPerson();
      if (!created) {
        setMsg(container, "People limit reached (" + SEIDR_CMD_PEOPLE_MAX + ")");
        return;
      }
      editPersonId = created.id;
      draftPerson = Object.assign({}, created);
      setMsg(container, "Person added \u2014 set alias and Member ID, then Save");
      refreshPeopleSection(container);
    });
    container.querySelector("#seidr-cmd-add-action")?.addEventListener("click", function() {
      const created = seidrAddCmdAction();
      if (!created) {
        setMsg(container, "Action limit reached (" + SEIDR_CMD_ACTIONS_MAX + ")");
        return;
      }
      editActionId = created.id;
      draftAction = Object.assign({}, seidrDefaultCmdAction(created.id), created);
      setMsg(container, "Action added \u2014 set call name, slot, and activity, then Save");
      refreshActionsSection(container);
    });
    refreshPeopleSection(container);
    refreshActionsSection(container);
  }
  function seidrRefreshCommandsTab() {
    const pane = document.getElementById("seidr-settings-pane-commands");
    if (!pane) return;
    seidrBuildCommandsTab(pane);
  }

  // src/animations/index.ts
  Seidr.installAnimations = function() {
  };

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
  var SEIDR_GRACE_MS = 45e3;
  var seidrPeers = {};
  var seidrPendingGone = {};
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
  function seidrCancelGrace(member) {
    var entry = seidrPendingGone[member];
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    delete seidrPendingGone[member];
  }
  function seidrClearAllGrace() {
    Object.keys(seidrPendingGone).forEach(function(key) {
      seidrCancelGrace(Number(key));
    });
  }
  function seidrExpireGrace(member) {
    var entry = seidrPendingGone[member];
    if (entry && entry.timer) clearTimeout(entry.timer);
    delete seidrPendingGone[member];
    var hubs = Seidr.getHubs();
    var cluster = SeidrState.clusterOf(hubs, member);
    if (!cluster) return;
    var hubId = cluster.hub;
    Seidr.setHubs(SeidrState.releaseMember(hubs, member));
    seidrPublishHub(hubId);
    if (Seidr.badgeActivityButtons) {
      try {
        Seidr.badgeActivityButtons();
      } catch (e) {
      }
    }
  }
  function seidrStartGrace(left) {
    var hubs = Seidr.getHubs();
    var cluster = SeidrState.clusterOf(hubs, left);
    if (!cluster) return;
    seidrCancelGrace(left);
    var until = Date.now() + SEIDR_GRACE_MS;
    var timer = setTimeout(function() {
      seidrExpireGrace(left);
    }, SEIDR_GRACE_MS);
    seidrPendingGone[left] = { hub: cluster.hub, until, timer };
  }
  function seidrReconcileGrace() {
    var hubs = Seidr.getHubs();
    Object.keys(seidrPendingGone).forEach(function(key) {
      var m = Number(key);
      if (!SeidrState.clusterOf(hubs, m)) seidrCancelGrace(m);
    });
  }
  function seidrPresentWithGrace() {
    var present = seidrPresentMap();
    Object.keys(seidrPendingGone).forEach(function(key) {
      present[Number(key)] = true;
    });
    return present;
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
  function seidrPublishRelevant(joiner, target) {
    if (typeof joiner !== "number") return;
    var dest = typeof target === "number" ? target : joiner;
    var hubs = Seidr.getHubs();
    Object.keys(hubs).forEach(function(key) {
      var hubN = Number(key);
      var h = hubs[hubN];
      if (!h) return;
      if (hubN === joiner || h.left === joiner || h.right === joiner || h.cuddle === joiner) {
        seidrPublishHub(hubN, dest);
      }
    });
    seidrPublishOurs(dest);
  }
  function seidrHello(reply, target) {
    seidrSend({ t: "hello", v: 1, ver: Seidr.VERSION, reply: !!reply }, target);
  }
  function seidrSyncRequest(target) {
    seidrSend({ t: "syncRequest", v: 1 }, target);
  }
  function seidrOnSyncRequest(from) {
    if (typeof from !== "number") return;
    if (typeof Player === "undefined" || !Player || typeof Player.MemberNumber !== "number") return;
    var me = Player.MemberNumber;
    var hubs = Seidr.getHubs();
    var published = {};
    function pub(hubN) {
      if (published[hubN]) return;
      published[hubN] = true;
      seidrPublishHub(hubN, from);
    }
    if (hubs[me]) pub(me);
    var cluster = SeidrState.clusterOf(hubs, me);
    if (cluster) pub(cluster.hub);
    Object.keys(hubs).forEach(function(key) {
      var hubN = Number(key);
      var h = hubs[hubN];
      if (!h) return;
      if (hubN === from || h.left === from || h.right === from || h.cuddle === from) pub(hubN);
    });
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
      seidrPublishRelevant(from, from);
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
    seidrReconcileGrace();
  }
  function seidrOnLeaveClear(payload, from) {
    var member = payload && typeof payload.member === "number" ? payload.member : from;
    if (typeof member !== "number") return;
    seidrCancelGrace(member);
    var hubs = Seidr.getHubs();
    if (!SeidrState.clusterOf(hubs, member)) return;
    Seidr.setHubs(SeidrState.releaseMember(hubs, member));
    seidrReconcileGrace();
    if (Seidr.badgeActivityButtons) {
      try {
        Seidr.badgeActivityButtons();
      } catch (e) {
      }
    }
  }
  function seidrOnActivityMessage(data) {
    var name = Seidr.activityNameFromMessage(data);
    if (!name || name.indexOf(Seidr.PREFIX) !== 0) return;
    var source = Seidr.dictValue(data.Dictionary, "SourceCharacter");
    var target = Seidr.dictValue(data.Dictionary, "TargetCharacter");
    if (typeof source !== "number") source = typeof data.Sender === "number" ? data.Sender : null;
    if (typeof source !== "number" || typeof target !== "number") return;
    Seidr.setHubs(Seidr.applyNamed(Seidr.getHubs(), source, target, name));
    seidrReconcileGrace();
  }
  function seidrPayload(data) {
    return Seidr.dictValue(data && data.Dictionary, "Seidr");
  }
  function seidrPruneRoom() {
    var before = JSON.stringify(Seidr.getHubs());
    var next = SeidrState.pruneMissing(Seidr.getHubs(), seidrPresentWithGrace());
    Seidr.setHubs(next);
    seidrReconcileGrace();
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
    if (!cluster) {
      seidrSend({ t: "leaveClear", v: 1, member: me });
      return;
    }
    seidrSend({ t: "leaveClear", v: 1, member: me });
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
    Seidr.syncRequest = function(target) {
      seidrSyncRequest(target);
    };
    var prevSetHubs = Seidr.setHubs;
    Seidr.setHubs = function(hubs) {
      prevSetHubs(hubs);
      seidrReconcileGrace();
    };
    Seidr.hookFunction("ChatRoomMessage", 5, function(args, next) {
      var data = args && args[0];
      try {
        if (data && data.Type === "Hidden" && data.Content === Seidr.HIDDEN) {
          var payload = seidrPayload(data);
          var from = typeof data.Sender === "number" ? data.Sender : null;
          if (payload && payload.t === "hello") seidrOnHello(from, payload);
          else if (payload && payload.t === "state") seidrOnState(payload);
          else if (payload && payload.t === "leaveClear") seidrOnLeaveClear(payload, from);
          else if (payload && payload.t === "syncRequest") seidrOnSyncRequest(from);
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
        seidrSyncRequest();
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
          seidrCancelGrace(joiner);
          seidrHello(true, joiner);
          seidrPublishRelevant(joiner, joiner);
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
        if (left != null) seidrStartGrace(left);
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
      seidrClearAllGrace();
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
  var NAME_MAX = 48;
  function remoteMax() {
    return typeof Seidr.RM_MAP_MAX === "number" ? Seidr.RM_MAP_MAX : 10;
  }
  function localMax() {
    return typeof Seidr.RM_MAP_LOCAL_MAX === "number" ? Seidr.RM_MAP_LOCAL_MAX : 50;
  }
  function localVerMax() {
    return typeof Seidr.RM_MAP_VERSIONS_LOCAL_MAX === "number" ? Seidr.RM_MAP_VERSIONS_LOCAL_MAX : 30;
  }
  function clampName2(raw, fallback) {
    const s = String(raw == null ? "" : raw).trim().slice(0, NAME_MAX);
    return s || fallback;
  }
  function lz2() {
    try {
      if (typeof LZString !== "undefined" && LZString) return LZString;
    } catch (e) {
    }
    return null;
  }
  function localKey() {
    try {
      const mn = Player && Player.MemberNumber;
      if (mn == null) return null;
      const prefix = Seidr.RM_MAPS_LOCAL_KEY_PREFIX || "SeidrMapsLocal_";
      return prefix + String(mn);
    } catch (e) {
      return null;
    }
  }
  var _localCache = null;
  var _peeledRemote = false;
  function packLocal(maps) {
    const payload = {
      v: 1,
      maps: maps.map(function(m) {
        return {
          id: m.id,
          name: m.name,
          versions: m.versions.map(function(v) {
            return { id: v.id, name: v.name, data: v.data, savedAt: v.savedAt };
          })
        };
      })
    };
    const json = JSON.stringify(payload);
    const L = lz2();
    const prefix = Seidr.RM_MAPS_LOCAL_LZ_PREFIX || "SeidrMapsLocal1:";
    if (L && typeof L.compressToUTF16 === "function") {
      return prefix + L.compressToUTF16(json);
    }
    return json;
  }
  function unpackLocal(raw) {
    const prefix = Seidr.RM_MAPS_LOCAL_LZ_PREFIX || "SeidrMapsLocal1:";
    let data = null;
    try {
      if (raw.startsWith(prefix)) {
        const L = lz2();
        if (!L || typeof L.decompressFromUTF16 !== "function") return [];
        const plain = L.decompressFromUTF16(raw.slice(prefix.length));
        data = plain ? JSON.parse(plain) : null;
      } else {
        data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("[Seidr RM] local maps unpack", e);
      return [];
    }
    if (!data || typeof data !== "object") return [];
    const d = data;
    if (!Array.isArray(d.maps)) return [];
    const out = [];
    for (let i = 0; i < d.maps.length; i++) {
      const s = rmNormalizeMapSeries(d.maps[i], "local");
      if (s) {
        s.location = "local";
        out.push(s);
      }
    }
    return out;
  }
  function rmLoadLocalMaps() {
    if (_localCache) return _localCache;
    const key = localKey();
    if (!key) {
      _localCache = [];
      return _localCache;
    }
    try {
      const raw = localStorage.getItem(key);
      _localCache = raw ? unpackLocal(raw) : [];
    } catch (e) {
      console.warn("[Seidr RM] local maps read", e);
      _localCache = [];
    }
    return _localCache;
  }
  function saveLocalMaps(maps) {
    const key = localKey();
    if (!key) return { ok: false, error: "Not logged in" };
    try {
      localStorage.setItem(key, packLocal(maps));
      _localCache = maps.map(function(m) {
        return {
          id: m.id,
          name: m.name,
          location: "local",
          versions: m.versions.slice()
        };
      });
      return { ok: true };
    } catch (e) {
      console.warn("[Seidr RM] local maps write", e);
      return { ok: false, error: "localStorage save failed" };
    }
  }
  function rawRemoteMaps() {
    return (rmGetStore().maps || []).map(function(m) {
      return {
        id: m.id,
        name: m.name,
        location: "remote",
        versions: (m.versions || []).slice()
      };
    });
  }
  function pickDefault(versions) {
    const found = versions.find(function(v) {
      return rmIsDefaultVersionName(v.name);
    });
    if (found) return found;
    if (!versions.length) return null;
    return {
      id: versions[0].id,
      name: RM_MAP_DEFAULT_NAME,
      data: versions[0].data,
      savedAt: versions[0].savedAt
    };
  }
  function extrasOnly(versions) {
    return versions.filter(function(v) {
      return !rmIsDefaultVersionName(v.name);
    });
  }
  function peelRemoteExtrasToLocal() {
    if (_peeledRemote) return;
    _peeledRemote = true;
    const remote = rawRemoteMaps();
    let dirtyRemote = false;
    let local = rmLoadLocalMaps().slice();
    let dirtyLocal = false;
    const nextRemote = [];
    for (let i = 0; i < remote.length; i++) {
      const m = remote[i];
      const def = pickDefault(m.versions);
      const extras = extrasOnly(m.versions);
      if (!def) continue;
      if (extras.length || !rmIsDefaultVersionName(m.versions[0] && m.versions[0].name) || m.versions.length !== 1) {
        if (extras.length || m.versions.length > 1 || !rmIsDefaultVersionName((m.versions[0] || def).name)) {
          dirtyRemote = true;
        }
      }
      if (extras.length) {
        const li = local.findIndex(function(x) {
          return x.id === m.id;
        });
        if (li >= 0) {
          const merged = extrasOnly(local[li].versions).concat(extras);
          local[li] = {
            id: m.id,
            name: m.name,
            location: "local",
            versions: merged
          };
        } else {
          local.push({
            id: m.id,
            name: m.name,
            location: "local",
            versions: extras
          });
        }
        dirtyLocal = true;
      }
      nextRemote.push({
        id: m.id,
        name: m.name,
        location: "remote",
        versions: [{
          id: def.id,
          name: RM_MAP_DEFAULT_NAME,
          data: def.data,
          savedAt: def.savedAt
        }]
      });
      if (m.versions.length !== 1 || !rmIsDefaultVersionName(m.versions[0].name)) {
        dirtyRemote = true;
      }
    }
    if (dirtyLocal) saveLocalMaps(local);
    if (dirtyRemote) {
      const store = rmGetStore();
      store.maps = nextRemote;
      rmSaveStore();
    }
  }
  function persistRemoteDefaults(maps) {
    const cleaned = maps.map(function(m) {
      const def = pickDefault(m.versions);
      return {
        id: m.id,
        name: m.name,
        location: "remote",
        versions: def ? [{ id: def.id, name: RM_MAP_DEFAULT_NAME, data: def.data, savedAt: def.savedAt }] : []
      };
    }).filter(function(m) {
      return m.versions.length > 0;
    });
    const can = rmCanSaveMaps(rmSerializeRemoteMaps(cleaned));
    if (!can.ok) return { ok: false, error: can.error };
    const store = rmGetStore();
    store.maps = cleaned;
    return rmSaveStore();
  }
  function preferRemote(location) {
    if (location === "local" || location === "remote") return location;
    const remote = rawRemoteMaps();
    if (remote.length >= remoteMax()) return "local";
    const can = rmCanSaveMaps(rmSerializeRemoteMaps(remote));
    return can.ok ? "remote" : "local";
  }
  function makeDefaultVersion(data) {
    return {
      id: rmNewId("mv"),
      name: RM_MAP_DEFAULT_NAME,
      data,
      savedAt: Date.now()
    };
  }
  function makeLocalVersion(name, data) {
    const n = clampName2(rmCanonicalVersionName(name, "Version"), "Version");
    return {
      id: rmNewId("mv"),
      name: n,
      data,
      savedAt: Date.now()
    };
  }
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
  function sortByName(a, b) {
    return a.name.localeCompare(b.name, void 0, { sensitivity: "base" });
  }
  function sortVersions(versions) {
    return versions.slice().sort(function(a, b) {
      if (rmIsDefaultVersionName(a.name) && !rmIsDefaultVersionName(b.name)) return -1;
      if (!rmIsDefaultVersionName(a.name) && rmIsDefaultVersionName(b.name)) return 1;
      return (b.savedAt || 0) - (a.savedAt || 0);
    });
  }
  function rmListAllMaps() {
    peelRemoteExtrasToLocal();
    const remote = rawRemoteMaps();
    const local = rmLoadLocalMaps();
    const byId = {};
    remote.forEach(function(m) {
      const def = pickDefault(m.versions);
      if (!def) return;
      byId[m.id] = {
        id: m.id,
        name: m.name,
        location: "remote",
        versions: [{
          id: def.id,
          name: RM_MAP_DEFAULT_NAME,
          data: def.data,
          savedAt: def.savedAt
        }]
      };
    });
    local.forEach(function(m) {
      const existing = byId[m.id];
      if (existing && existing.location === "remote") {
        const extras = extrasOnly(m.versions);
        existing.versions = sortVersions(existing.versions.concat(extras));
        return;
      }
      let vers = m.versions.slice();
      if (!pickDefault(vers) && vers.length) {
        vers[0] = {
          id: vers[0].id,
          name: RM_MAP_DEFAULT_NAME,
          data: vers[0].data,
          savedAt: vers[0].savedAt
        };
      }
      byId[m.id] = {
        id: m.id,
        name: m.name,
        location: "local",
        versions: sortVersions(vers)
      };
    });
    return Object.keys(byId).map(function(k) {
      return byId[k];
    }).sort(sortByName);
  }
  function rmGetMap(id) {
    return rmListAllMaps().find(function(m) {
      return m.id === id;
    }) || null;
  }
  function rmListVersions(mapId) {
    const m = rmGetMap(mapId);
    return m ? sortVersions(m.versions) : [];
  }
  function rmDefaultVersionId(mapId) {
    const m = rmGetMap(mapId);
    if (!m) return null;
    const def = pickDefault(m.versions);
    return def ? def.id : null;
  }
  function rmLatestVersionId(mapId) {
    return rmDefaultVersionId(mapId) || rmListVersions(mapId)[0] && rmListVersions(mapId)[0].id || null;
  }
  function upsertLocalEntry(mapId, name, versions) {
    const local = rmLoadLocalMaps().slice();
    const idx = local.findIndex(function(m) {
      return m.id === mapId;
    });
    const entry = {
      id: mapId,
      name,
      location: "local",
      versions
    };
    if (idx >= 0) local[idx] = entry;
    else local.unshift(entry);
    return saveLocalMaps(local);
  }
  function removeLocalEntry(mapId) {
    const local = rmLoadLocalMaps().filter(function(m) {
      return m.id !== mapId;
    });
    return saveLocalMaps(local);
  }
  function countLocalMapSlots() {
    const remoteIds = {};
    rawRemoteMaps().forEach(function(m) {
      remoteIds[m.id] = true;
    });
    let n = 0;
    rmLoadLocalMaps().forEach(function(m) {
      if (!remoteIds[m.id]) n++;
    });
    return n;
  }
  function rmSaveNewMap(name, _versionName, location) {
    const data = rmExportCurrentMap();
    if (!data) return { ok: false, error: "No map to save (map room required)" };
    const loc = preferRemote(location);
    const fellBackLocal = !location && loc === "local";
    const def = makeDefaultVersion(data);
    const series = {
      id: rmNewId("m"),
      name: clampName2(name, "Untitled"),
      location: loc,
      versions: [def]
    };
    if (loc === "remote") {
      const remote = rawRemoteMaps().map(function(m) {
        const d = pickDefault(m.versions);
        return {
          id: m.id,
          name: m.name,
          location: "remote",
          versions: d ? [d] : []
        };
      }).filter(function(m) {
        return m.versions.length > 0;
      });
      if (remote.length >= remoteMax()) {
        return { ok: false, error: "Remote map limit (" + remoteMax() + ")" };
      }
      remote.unshift({
        id: series.id,
        name: series.name,
        location: "remote",
        versions: [def]
      });
      const saved = persistRemoteDefaults(remote);
      if (!saved.ok) {
        series.location = "local";
        if (countLocalMapSlots() >= localMax()) {
          return { ok: false, error: saved.error || "Remote save failed; local full" };
        }
        const local2 = rmLoadLocalMaps().slice();
        local2.unshift(series);
        const ls2 = saveLocalMaps(local2);
        if (!ls2.ok) return { ok: false, error: ls2.error || saved.error };
        return { ok: true, map: series, fellBackLocal: true };
      }
      return { ok: true, map: series, fellBackLocal };
    }
    if (countLocalMapSlots() >= localMax()) {
      return { ok: false, error: "Local map limit (" + localMax() + ")" };
    }
    const local = rmLoadLocalMaps().slice();
    local.unshift(series);
    const ls = saveLocalMaps(local);
    if (!ls.ok) return { ok: false, error: ls.error };
    return { ok: true, map: series, fellBackLocal };
  }
  function rmSaveNewVersion(mapId, versionName) {
    const data = rmExportCurrentMap();
    if (!data) return { ok: false, error: "No map to save (map room required)" };
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const canon = rmCanonicalVersionName(versionName, "Version");
    if (rmIsDefaultVersionName(canon)) {
      return { ok: false, error: "Use Overwrite Default to update Default" };
    }
    const extras = extrasOnly(map.versions);
    if (extras.length >= localVerMax()) {
      return { ok: false, error: "Local version limit (" + localVerMax() + ")" };
    }
    const version = makeLocalVersion(canon, data);
    const nextExtras = [version].concat(extras);
    if (map.location === "remote") {
      const ls2 = upsertLocalEntry(mapId, map.name, nextExtras);
      if (!ls2.ok) return { ok: false, error: ls2.error };
      return { ok: true, version };
    }
    const def = pickDefault(map.versions);
    const all = (def ? [def] : []).concat(nextExtras);
    const ls = upsertLocalEntry(mapId, map.name, all);
    if (!ls.ok) return { ok: false, error: ls.error };
    return { ok: true, version };
  }
  function rmOverwriteDefault(mapId) {
    const data = rmExportCurrentMap();
    if (!data) return { ok: false, error: "No map to save (map room required)" };
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const prev = pickDefault(map.versions);
    const nextDef = {
      id: prev ? prev.id : rmNewId("mv"),
      name: RM_MAP_DEFAULT_NAME,
      data,
      savedAt: Date.now()
    };
    if (map.location === "remote") {
      const remote = rawRemoteMaps().map(function(m) {
        if (m.id !== mapId) {
          const d = pickDefault(m.versions);
          return {
            id: m.id,
            name: m.name,
            location: "remote",
            versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : []
          };
        }
        return {
          id: mapId,
          name: map.name,
          location: "remote",
          versions: [nextDef]
        };
      }).filter(function(m) {
        return m.versions.length > 0;
      });
      const saved = persistRemoteDefaults(remote);
      if (!saved.ok) return { ok: false, error: saved.error };
      return { ok: true, version: nextDef };
    }
    const extras = extrasOnly(map.versions);
    const ls = upsertLocalEntry(mapId, map.name, [nextDef].concat(extras));
    if (!ls.ok) return { ok: false, error: ls.error };
    return { ok: true, version: nextDef };
  }
  function rmLoadMapVersion(mapId, versionId) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const ver = map.versions.find(function(v) {
      return v.id === versionId;
    });
    if (!ver) return { ok: false, error: "Version not found" };
    return rmImportMapString(ver.data);
  }
  function rmRenameMap(mapId, name) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const nextName = clampName2(name, map.name);
    if (map.location === "remote") {
      const remote = rawRemoteMaps().map(function(m) {
        const d = pickDefault(m.versions);
        return {
          id: m.id,
          name: m.id === mapId ? nextName : m.name,
          location: "remote",
          versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : []
        };
      }).filter(function(m) {
        return m.versions.length > 0;
      });
      const saved = persistRemoteDefaults(remote);
      if (!saved.ok) return { ok: false, error: saved.error };
      const local = rmLoadLocalMaps();
      const li = local.findIndex(function(m) {
        return m.id === mapId;
      });
      if (li >= 0) {
        local[li] = { id: mapId, name: nextName, location: "local", versions: local[li].versions };
        saveLocalMaps(local);
      }
      return { ok: true };
    }
    const ls = upsertLocalEntry(mapId, nextName, map.versions);
    return ls;
  }
  function rmRenameVersion(mapId, versionId, name) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const ver = map.versions.find(function(v) {
      return v.id === versionId;
    });
    if (!ver) return { ok: false, error: "Version not found" };
    if (rmIsDefaultVersionName(ver.name)) {
      return { ok: false, error: "Default cannot be renamed" };
    }
    const canon = rmCanonicalVersionName(name, ver.name);
    if (rmIsDefaultVersionName(canon)) {
      return { ok: false, error: "Cannot rename to Default" };
    }
    const next = {
      id: ver.id,
      name: clampName2(canon, ver.name),
      data: ver.data,
      savedAt: ver.savedAt
    };
    if (map.location === "remote") {
      const extras = extrasOnly(map.versions).map(function(v) {
        return v.id === versionId ? next : v;
      });
      return upsertLocalEntry(mapId, map.name, extras);
    }
    const all = map.versions.map(function(v) {
      return v.id === versionId ? next : v;
    });
    return upsertLocalEntry(mapId, map.name, all);
  }
  function rmDeleteMap(mapId) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    removeLocalEntry(mapId);
    if (map.location === "remote") {
      const remote = rawRemoteMaps().filter(function(m) {
        return m.id !== mapId;
      }).map(function(m) {
        const d = pickDefault(m.versions);
        return {
          id: m.id,
          name: m.name,
          location: "remote",
          versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : []
        };
      }).filter(function(m) {
        return m.versions.length > 0;
      });
      return persistRemoteDefaults(remote);
    }
    return { ok: true };
  }
  function rmDeleteVersion(mapId, versionId) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    const ver = map.versions.find(function(v) {
      return v.id === versionId;
    });
    if (!ver) return { ok: false, error: "Version not found" };
    if (rmIsDefaultVersionName(ver.name)) {
      if (map.versions.length <= 1) return rmDeleteMap(mapId);
      return { ok: false, error: "Cannot delete Default while other versions exist \u2014 delete the map instead" };
    }
    if (map.location === "remote") {
      const extras = extrasOnly(map.versions).filter(function(v) {
        return v.id !== versionId;
      });
      if (!extras.length) return removeLocalEntry(mapId);
      return upsertLocalEntry(mapId, map.name, extras);
    }
    const all = map.versions.filter(function(v) {
      return v.id !== versionId;
    });
    if (!all.length) return rmDeleteMap(mapId);
    return upsertLocalEntry(mapId, map.name, all);
  }
  function rmSetMapLocation(mapId, location) {
    const map = rmGetMap(mapId);
    if (!map) return { ok: false, error: "Map not found" };
    if (map.location === location) return { ok: true };
    const def = pickDefault(map.versions);
    if (!def) return { ok: false, error: "Map has no Default version" };
    const extras = extrasOnly(map.versions);
    if (location === "remote") {
      const remote2 = rawRemoteMaps().map(function(m) {
        const d = pickDefault(m.versions);
        return {
          id: m.id,
          name: m.name,
          location: "remote",
          versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : []
        };
      }).filter(function(m) {
        return m.versions.length > 0;
      });
      if (remote2.length >= remoteMax()) {
        return { ok: false, error: "Remote map limit (" + remoteMax() + ")" };
      }
      remote2.push({
        id: map.id,
        name: map.name,
        location: "remote",
        versions: [{ id: def.id, name: RM_MAP_DEFAULT_NAME, data: def.data, savedAt: def.savedAt }]
      });
      const can = rmCanSaveMaps(rmSerializeRemoteMaps(remote2));
      if (!can.ok) return { ok: false, error: can.error };
      const saved = persistRemoteDefaults(remote2);
      if (!saved.ok) return { ok: false, error: saved.error };
      if (extras.length) {
        return upsertLocalEntry(mapId, map.name, extras);
      }
      return removeLocalEntry(mapId);
    }
    if (countLocalMapSlots() >= localMax() && !rmLoadLocalMaps().some(function(m) {
      return m.id === mapId;
    })) {
    }
    const fullyLocal = !rawRemoteMaps().some(function(m) {
      return m.id === mapId;
    });
    if (fullyLocal === false) {
      if (countLocalMapSlots() >= localMax()) {
        return { ok: false, error: "Local map limit (" + localMax() + ")" };
      }
    }
    const all = [def].concat(extras);
    const ls = upsertLocalEntry(mapId, map.name, all);
    if (!ls.ok) return { ok: false, error: ls.error };
    const remote = rawRemoteMaps().filter(function(m) {
      return m.id !== mapId;
    }).map(function(m) {
      const d = pickDefault(m.versions);
      return {
        id: m.id,
        name: m.name,
        location: "remote",
        versions: d ? [{ id: d.id, name: RM_MAP_DEFAULT_NAME, data: d.data, savedAt: d.savedAt }] : []
      };
    }).filter(function(m) {
      return m.versions.length > 0;
    });
    return persistRemoteDefaults(remote);
  }
  function rmExportMapsJson() {
    const maps = rmListAllMaps();
    const payload = {
      v: 1,
      kind: "SeidrMaps",
      maps: maps.map(function(m) {
        return {
          name: m.name,
          versions: m.versions.map(function(v) {
            return { name: v.name, data: v.data, savedAt: v.savedAt };
          })
        };
      })
    };
    return JSON.stringify(payload, null, 2);
  }
  function rmParseMapsImport(raw) {
    const text = String(raw || "").trim();
    if (!text) return { ok: false, error: "Paste or choose a maps export first" };
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "Invalid JSON" };
    }
    if (!data || typeof data !== "object") return { ok: false, error: "Invalid export data" };
    const d = data;
    if (d.kind !== "SeidrMaps" || d.v !== 1) {
      return { ok: false, error: "Unsupported export format (need SeidrMaps v1)" };
    }
    if (!Array.isArray(d.maps)) return { ok: false, error: "Export has no maps list" };
    const out = [];
    for (let i = 0; i < d.maps.length; i++) {
      const row = d.maps[i];
      const name = clampName2(row.name, "Imported " + (i + 1));
      const versions = [];
      if (Array.isArray(row.versions)) {
        for (let j = 0; j < row.versions.length; j++) {
          const v = rmNormalizeMapVersion(row.versions[j], j === 0 ? RM_MAP_DEFAULT_NAME : "v" + (j + 1));
          if (v) versions.push({ name: v.name, data: v.data, savedAt: v.savedAt });
        }
      } else if (typeof row.data === "string" && row.data.length) {
        versions.push({
          name: RM_MAP_DEFAULT_NAME,
          data: row.data,
          savedAt: typeof row.savedAt === "number" ? row.savedAt : Date.now()
        });
      }
      if (versions.length && !versions.some(function(v) {
        return rmIsDefaultVersionName(v.name);
      })) {
        versions[0] = {
          name: RM_MAP_DEFAULT_NAME,
          data: versions[0].data,
          savedAt: versions[0].savedAt
        };
      }
      if (versions.length) out.push({ name, versions });
    }
    if (!out.length) return { ok: false, error: "No valid maps in export" };
    return { ok: true, maps: out };
  }
  function rmImportSelectedMaps(candidates) {
    if (!candidates || !candidates.length) {
      return { ok: false, error: "Select at least one map", imported: 0 };
    }
    let local = rmLoadLocalMaps().slice();
    let imported = 0;
    for (let i = 0; i < candidates.length; i++) {
      if (countLocalMapSlots() + imported >= localMax()) {
        return {
          ok: imported > 0,
          error: imported > 0 ? "Imported " + imported + "; local limit reached" : "Local map limit (" + localMax() + ")",
          imported
        };
      }
      const c = candidates[i];
      const vers = [];
      let hasDefault = false;
      const verCap = localVerMax() + 1;
      for (let j = 0; j < c.versions.length && vers.length < verCap; j++) {
        const v = c.versions[j];
        let vname = rmCanonicalVersionName(v.name, j === 0 ? RM_MAP_DEFAULT_NAME : "v" + (j + 1));
        if (rmIsDefaultVersionName(vname)) {
          if (hasDefault) vname = "Import " + (j + 1);
          else hasDefault = true;
        }
        vers.push({
          id: rmNewId("mv"),
          name: clampName2(vname, "v" + (j + 1)),
          data: v.data,
          savedAt: typeof v.savedAt === "number" ? v.savedAt : Date.now()
        });
      }
      if (!vers.length) continue;
      if (!hasDefault) {
        vers[0] = {
          id: vers[0].id,
          name: RM_MAP_DEFAULT_NAME,
          data: vers[0].data,
          savedAt: vers[0].savedAt
        };
      }
      local.unshift({
        id: rmNewId("m"),
        name: clampName2(c.name, "Imported"),
        location: "local",
        versions: vers
      });
      imported++;
    }
    const ls = saveLocalMaps(local);
    if (!ls.ok) return { ok: false, error: ls.error, imported: 0 };
    return { ok: true, imported };
  }
  function rmLocalMapsBytesEstimate() {
    try {
      return rmSliceBytes({ maps: rmLoadLocalMaps() });
    } catch (e) {
      return 0;
    }
  }
  function rmLocalMapsStats() {
    peelRemoteExtrasToLocal();
    const maps = rmLoadLocalMaps();
    let versions = 0;
    for (let i = 0; i < maps.length; i++) versions += maps[i].versions.length;
    const bytes = rmLocalMapsBytesEstimate();
    return {
      maps: maps.length,
      versions,
      bytes,
      label: maps.length + " local entries \xB7 " + versions + " versions \xB7 " + rmFormatBytes(bytes)
    };
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
  function setMsg2(text) {
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
        setMsg2("Background saved");
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
      setMsg2(ok ? "Backgrounds reordered" : "Reorder failed");
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
    const canLoad2 = rmCanApplyToRoom();
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
      loadBtn.disabled = !canLoad2;
      if (!canLoad2) loadBtn.title = "Join a chat room or open room settings to Load";
      loadBtn.addEventListener("click", function() {
        if (!rmCanApplyToRoom()) {
          setMsg2("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const r = rmApplyBackgroundUrl(b.url);
        setMsg2(r.ok ? "Background applied" : r.error || "Failed");
      });
      card.querySelector('[data-act="edit"]').addEventListener("click", function() {
        openBgDialog(b);
      });
      card.querySelector('[data-act="del"]').addEventListener("click", function() {
        if (!confirmAct("Delete background \u201C" + b.name + "\u201D?")) return;
        const ok = rmDeleteBackground(b.id);
        setMsg2(ok ? "Background deleted" : "Delete failed");
        rmRefreshUi();
      });
      grid.appendChild(card);
    });
  }
  function selectedRmMapId() {
    const sel = $("seidr-rm-map-sel");
    return sel && sel.value ? sel.value : null;
  }
  function selectedRmVersionId() {
    const sel = $("seidr-rm-ver-sel");
    return sel && sel.value ? sel.value : null;
  }
  function fillVersionSelect(mapId, preferId) {
    const verSel = $("seidr-rm-ver-sel");
    if (!verSel) return;
    if (!mapId) {
      fillSelect(verSel, []);
      return;
    }
    const vers = rmListVersions(mapId);
    const prev = preferId || verSel.value || rmLatestVersionId(mapId);
    verSel.innerHTML = "";
    vers.forEach(function(v) {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name;
      verSel.appendChild(opt);
    });
    if (prev && vers.some(function(v) {
      return v.id === prev;
    })) {
      verSel.value = prev;
    } else if (vers.length) {
      verSel.value = vers[0].id;
    }
  }
  function renderMaps() {
    const wrap = $("seidr-rm-maps-wrap");
    const sel = $("seidr-rm-map-sel");
    if (!wrap) return;
    const show = rmMapModeActive();
    wrap.classList.toggle("seidr-rm-hidden", !show);
    if (!show || !sel) return;
    const maps = rmListAllMaps();
    const prevId = sel.value;
    sel.innerHTML = "";
    maps.forEach(function(m) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name + (m.location === "local" ? " (Local)" : "");
      sel.appendChild(opt);
    });
    if (prevId && maps.some(function(m) {
      return m.id === prevId;
    })) {
      sel.value = prevId;
    } else if (maps.length) {
      sel.value = maps[0].id;
    }
    fillVersionSelect(sel.value || null);
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
      '<select id="seidr-rm-map-sel" title="Map"></select>',
      '<select id="seidr-rm-ver-sel" title="Version"></select>',
      "</div>",
      '<div class="seidr-rm-row" style="margin-top:6px;">',
      '<button type="button" data-rm="map-save-as">Save as\u2026</button>',
      '<button type="button" data-rm="map-save-ver">Save new Version</button>',
      '<button type="button" data-rm="map-overwrite">Overwrite Default</button>',
      '<button type="button" data-rm="map-load" id="seidr-rm-map-load">Load</button>',
      '<button type="button" data-rm="map-delete-ver">Delete version</button>',
      '<button type="button" data-rm="map-delete">Delete map</button>',
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
          setMsg2("No room data");
          return;
        }
        store.room[name] = rmSliceRoom(settings);
        const s = rmSaveStore();
        setMsg2(s.ok ? "Room config saved" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "room-overwrite") {
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg2("Select a config");
          return;
        }
        if (!confirmAct("Overwrite \u201C" + sel.value + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg2("No room data");
          return;
        }
        store.room[sel.value] = rmSliceRoom(settings);
        const s = rmSaveStore();
        setMsg2(s.ok ? "Overwritten" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "room-load") {
        if (!rmCanApplyToRoom()) {
          setMsg2("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg2("Select a config");
          return;
        }
        const preset = store.room[sel.value];
        if (!preset) {
          setMsg2("Not found");
          return;
        }
        rmApplyRoomToEditor(preset);
        if (rmInLiveRoom()) {
          const u = rmUpdateLiveRoom();
          setMsg2(u.ok ? "Room config loaded + updated" : u.error || "Applied to editor");
        } else {
          setMsg2("Filled ChatAdmin fields");
        }
      } else if (act2 === "room-delete") {
        const sel = $("seidr-rm-room-sel");
        if (!sel || !sel.value) {
          setMsg2("Select a config");
          return;
        }
        if (!confirmAct("Delete room config \u201C" + sel.value + "\u201D?")) return;
        delete store.room[sel.value];
        const s = rmSaveStore();
        setMsg2(s.ok ? "Deleted" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-save") {
        const name = promptName("Save access list as:");
        if (!name) return;
        if (store.access[name] && !confirmAct("Overwrite \u201C" + name + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg2("No room data");
          return;
        }
        store.access[name] = rmSliceAccess(settings);
        const s = rmSaveStore();
        setMsg2(s.ok ? "Access saved" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-overwrite") {
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg2("Select access");
          return;
        }
        if (!confirmAct("Overwrite \u201C" + sel.value + "\u201D?")) return;
        const settings = rmReadSettings();
        if (!settings) {
          setMsg2("No room data");
          return;
        }
        store.access[sel.value] = rmSliceAccess(settings);
        const s = rmSaveStore();
        setMsg2(s.ok ? "Overwritten" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "access-load") {
        if (!rmCanApplyToRoom()) {
          setMsg2("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg2("Select access");
          return;
        }
        const preset = store.access[sel.value];
        if (!preset) {
          setMsg2("Not found");
          return;
        }
        rmApplyAccessToEditor(preset);
        if (rmInLiveRoom()) {
          const u = rmUpdateLiveRoom();
          setMsg2(u.ok ? "Access loaded + room updated" : u.error || "Applied");
        } else {
          setMsg2("Filled access lists in ChatAdmin");
        }
      } else if (act2 === "access-delete") {
        const sel = $("seidr-rm-access-sel");
        if (!sel || !sel.value) {
          setMsg2("Select access");
          return;
        }
        if (!confirmAct("Delete access list \u201C" + sel.value + "\u201D?")) return;
        delete store.access[sel.value];
        const s = rmSaveStore();
        setMsg2(s.ok ? "Deleted" : s.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "bg-add") {
        openBgDialog();
      } else if (act2 === "map-save-as") {
        const name = promptName("Save map as:");
        if (!name) return;
        const maps = rmListAllMaps();
        const existing = maps.find(function(m) {
          return m.name === name;
        });
        if (existing) {
          if (!confirmAct("Map \u201C" + name + "\u201D exists \u2014 overwrite Default?")) return;
          const r2 = rmOverwriteDefault(existing.id);
          setMsg2(r2.ok ? "Default overwritten" : r2.error || "Failed");
          rmRefreshUi();
          const mapSel2 = $("seidr-rm-map-sel");
          if (mapSel2) mapSel2.value = existing.id;
          fillVersionSelect(existing.id, r2.version && r2.version.id);
          return;
        }
        const r = rmSaveNewMap(name);
        setMsg2(r.ok ? r.fellBackLocal ? "Map saved (Local \u2014 remote full). Default created." : "Map saved (Default)" : r.error || "Failed");
        rmRefreshUi();
        if (r.map) {
          const mapSel2 = $("seidr-rm-map-sel");
          if (mapSel2) mapSel2.value = r.map.id;
          fillVersionSelect(r.map.id, rmDefaultVersionId(r.map.id));
        }
      } else if (act2 === "map-save-ver") {
        const mapId = selectedRmMapId();
        if (!mapId) {
          setMsg2("Select a map");
          return;
        }
        const verName = promptName("Local version name (not Default):");
        if (!verName) return;
        if (verName === RM_MAP_DEFAULT_NAME) {
          setMsg2("Use Overwrite Default to update Default");
          return;
        }
        const r = rmSaveNewVersion(mapId, verName);
        setMsg2(r.ok ? "Local version saved" : r.error || "Failed");
        rmRefreshUi();
        fillVersionSelect(mapId, r.version && r.version.id);
      } else if (act2 === "map-overwrite") {
        const mapId = selectedRmMapId();
        if (!mapId) {
          setMsg2("Select a map");
          return;
        }
        if (!confirmAct("Overwrite Default with the current room map?")) return;
        const r = rmOverwriteDefault(mapId);
        setMsg2(r.ok ? "Default overwritten" : r.error || "Failed");
        rmRefreshUi();
        fillVersionSelect(mapId, r.version && r.version.id);
      } else if (act2 === "map-load") {
        if (!rmCanApplyToRoom()) {
          setMsg2("Open ChatRoom or ChatAdmin to Load");
          return;
        }
        const mapId = selectedRmMapId();
        const verId = selectedRmVersionId();
        if (!mapId || !verId) {
          setMsg2("Select a map and version");
          return;
        }
        const maps = rmListAllMaps();
        const map = maps.find(function(m) {
          return m.id === mapId;
        });
        const ver = map && map.versions.find(function(v) {
          return v.id === verId;
        });
        if (!confirmAct(
          "Load \u201C" + (map ? map.name : "") + "\u201D / \u201C" + (ver ? ver.name : "") + "\u201D into this room?"
        )) return;
        const r = rmLoadMapVersion(mapId, verId);
        setMsg2(r.ok ? "Map version loaded" : r.error || "Failed");
      } else if (act2 === "map-delete-ver") {
        const mapId = selectedRmMapId();
        const verId = selectedRmVersionId();
        if (!mapId || !verId) {
          setMsg2("Select a map and version");
          return;
        }
        const map = rmListAllMaps().find(function(m) {
          return m.id === mapId;
        });
        const ver = map && map.versions.find(function(v) {
          return v.id === verId;
        });
        const isDef = ver && rmIsDefaultVersionName(ver.name);
        const only = map && map.versions.length <= 1;
        if (isDef && !only) {
          setMsg2("Cannot delete Default while other versions exist \u2014 use Delete map");
          return;
        }
        if (!confirmAct(only || isDef ? "Delete entire map \u201C" + (map ? map.name : "") + "\u201D?" : "Delete this local version?")) return;
        const r = rmDeleteVersion(mapId, verId);
        setMsg2(r.ok ? only || isDef ? "Map deleted" : "Version deleted" : r.error || "Failed");
        rmRefreshUi();
      } else if (act2 === "map-delete") {
        const mapId = selectedRmMapId();
        if (!mapId) {
          setMsg2("Select a map");
          return;
        }
        const map = rmListAllMaps().find(function(m) {
          return m.id === mapId;
        });
        if (!confirmAct("Delete map \u201C" + (map ? map.name : "") + "\u201D and all versions?")) return;
        const r = rmDeleteMap(mapId);
        setMsg2(r.ok ? "Map deleted" : r.error || "Failed");
        rmRefreshUi();
      }
    });
    const mapSel = $("seidr-rm-map-sel");
    if (mapSel) {
      mapSel.addEventListener("change", function() {
        fillVersionSelect(mapSel.value || null);
      });
    }
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
      "  width: min(92vw, 560px); height: min(88vh, 700px);",
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
      "  flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 10px 0;",
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
      '.seidr-settings-draw-field input[type="number"],',
      ".seidr-settings-draw-field input.seidr-settings-num {",
      "  width: 56px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 6px;",
      "  font: inherit; box-sizing: border-box;",
      "}",
      ".seidr-settings-draw-field .seidr-num-wrap {",
      "  display: inline-flex; align-items: stretch; vertical-align: middle;",
      "}",
      '.seidr-settings-draw-field .seidr-num-wrap input[type="number"],',
      ".seidr-settings-draw-field .seidr-num-wrap input.seidr-settings-num {",
      "  border-top-right-radius: 0; border-bottom-right-radius: 0;",
      "  -moz-appearance: textfield;",
      "}",
      ".seidr-settings-draw-field .seidr-num-wrap input::-webkit-outer-spin-button,",
      ".seidr-settings-draw-field .seidr-num-wrap input::-webkit-inner-spin-button {",
      "  -webkit-appearance: none; margin: 0;",
      "}",
      ".seidr-settings-draw-field .seidr-num-wrap:focus-within input {",
      "  border-color: #d4a017;",
      "}",
      ".seidr-settings-draw-row > button[data-draw-reset] {",
      "  background: rgba(60,48,80,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  border-radius: 4px; padding: 4px 10px; cursor: pointer;",
      "}",
      ".seidr-settings-draw-row > button[data-draw-reset]:hover { border-color: #d4a017; }",
      ".seidr-settings-draw-actions { margin-top: 10px; }",
      ".seidr-settings-hint {",
      "  margin: 6px 0 0; font-size: 11px; color: #a898b0;",
      "}",
      ".seidr-about-header {",
      "  display: flex; gap: 12px; align-items: flex-start;",
      "}",
      ".seidr-about-logo {",
      "  flex-shrink: 0; width: 56px; height: 56px; border-radius: 8px;",
      "  object-fit: contain; background: rgba(20,16,28,0.9);",
      "  border: 1px solid rgba(255,255,255,0.1);",
      "}",
      ".seidr-about-header-text { flex: 1; min-width: 0; }",
      ".seidr-about-name {",
      "  margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #f0e6d4;",
      "}",
      ".seidr-about-links {",
      "  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;",
      "}",
      ".seidr-about-feature { margin-top: 8px; }",
      ".seidr-about-feature-head {",
      "  display: flex; align-items: center; justify-content: space-between; gap: 8px;",
      "}",
      ".seidr-about-feature-title {",
      "  font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: #d4a017;",
      "}",
      "a.seidr-act-btn {",
      "  display: inline-flex; align-items: center; text-decoration: none;",
      "}",
      '.seidr-settings-field-row input[type="text"],',
      '.seidr-settings-field-row input[type="number"],',
      ".seidr-settings-field-row input.seidr-settings-num {",
      "  flex: 1; min-width: 0;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "  font: inherit; box-sizing: border-box;",
      "}",
      '.seidr-settings-field-row input[type="number"]:focus,',
      ".seidr-settings-field-row input.seidr-settings-num:focus,",
      '.seidr-settings-field-row input[type="text"]:focus {',
      "  outline: none; border-color: #d4a017;",
      "}",
      ".seidr-settings-field-row .seidr-num-wrap {",
      "  flex: 1; min-width: 0; display: flex; align-items: stretch;",
      "}",
      ".seidr-settings-field-row .seidr-num-wrap input.seidr-settings-num {",
      "  flex: 1; min-width: 0; width: auto;",
      "  border-top-right-radius: 0; border-bottom-right-radius: 0;",
      "  -moz-appearance: textfield;",
      "}",
      ".seidr-settings-field-row .seidr-num-wrap input.seidr-settings-num::-webkit-outer-spin-button,",
      ".seidr-settings-field-row .seidr-num-wrap input.seidr-settings-num::-webkit-inner-spin-button {",
      "  -webkit-appearance: none; margin: 0;",
      "}",
      ".seidr-num-spin {",
      "  display: flex; flex-direction: column; flex: 0 0 22px; width: 22px;",
      "}",
      ".seidr-num-spin-btn {",
      "  flex: 1; min-height: 0; padding: 0; margin: 0; cursor: pointer;",
      "  background: rgba(60,48,80,0.9); color: #c8b8a0;",
      "  border: 1px solid rgba(255,255,255,0.14);",
      "  font: inherit; font-size: 8px; line-height: 1;",
      "  box-sizing: border-box;",
      "}",
      ".seidr-num-spin-btn:first-child {",
      "  border-radius: 0 4px 0 0; border-left: none; border-bottom: none;",
      "}",
      ".seidr-num-spin-btn:last-child {",
      "  border-radius: 0 0 4px 0; border-left: none;",
      "}",
      ".seidr-num-spin-btn:hover {",
      "  color: #d4a017; border-color: #d4a017; background: rgba(80,64,100,0.95);",
      "}",
      ".seidr-num-wrap:focus-within .seidr-num-spin-btn {",
      "  border-color: #d4a017;",
      "}",
      ".seidr-num-wrap:focus-within input.seidr-settings-num {",
      "  border-color: #d4a017;",
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
      "#seidr-act-chat-other, #seidr-act-chat-self, #seidr-anim-chat {",
      "  width: 100%; box-sizing: border-box; margin-top: 4px;",
      "  background: rgba(20,16,28,0.9); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 4px; padding: 6px 8px;",
      "  font: inherit; resize: vertical;",
      "}",
      "#seidr-act-chat-other:focus, #seidr-act-chat-self:focus, #seidr-anim-chat:focus {",
      "  outline: none; border-color: #d4a017;",
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
      ".seidr-act-icon-custom-row span { flex: 1; }",
      ".seidr-map-loc-btns { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }",
      ".seidr-map-loc-btn.seidr-map-loc-on {",
      "  border-color: #d4a017; color: #d4a017; background: rgba(60,48,80,0.9);",
      "}",
      ".seidr-maps-hr {",
      "  border: none; border-top: 1px solid rgba(255,255,255,0.1);",
      "  margin: 14px 0 10px;",
      "}",
      ".seidr-maps-file-row {",
      "  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;",
      "  margin-top: 8px;",
      "}",
      ".seidr-maps-file-name {",
      "  font-size: 12px; color: #a898b0; min-width: 0;",
      "  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
      "}",
      ".seidr-act-btn:disabled {",
      "  opacity: 0.45; cursor: not-allowed;",
      "}",
      ".seidr-act-btn:disabled:hover { border-color: rgba(255,255,255,0.14); color: #f0e6d4; }",
      "#seidr-tour {",
      "  position: fixed; inset: 0; z-index: 140; pointer-events: none;",
      "}",
      "#seidr-tour[hidden] { display: none !important; }",
      "#seidr-tour * { box-sizing: border-box; }",
      ".seidr-tour-hole {",
      "  position: fixed; pointer-events: none;",
      "  border: 2px solid #d4a017; border-radius: 8px;",
      "  box-shadow: 0 0 0 9999px rgba(8, 6, 12, 0.72);",
      "  transition: left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease;",
      "}",
      ".seidr-tour-card {",
      "  pointer-events: auto; position: fixed; z-index: 141;",
      "  width: min(92vw, 400px);",
      "  max-height: min(70vh, 480px);",
      "  display: flex; flex-direction: column;",
      "  padding: 12px 14px;",
      "  background: rgba(36, 28, 48, 0.98); color: #f0e6d4;",
      "  border: 1px solid rgba(255,255,255,0.14); border-radius: 8px;",
      "  box-shadow: 0 12px 40px rgba(0,0,0,0.55);",
      "  font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;",
      "}",
      ".seidr-tour-card-head {",
      "  flex-shrink: 0; display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px;",
      "}",
      ".seidr-tour-card-title { flex: 1; font-weight: 600; color: #d4a017; }",
      ".seidr-tour-card-step { font-size: 11px; color: #a898b0; }",
      ".seidr-tour-card-body {",
      "  flex: 1; min-height: 0; overflow-y: auto; margin: 0 0 12px; color: #f0e6d4;",
      "}",
      ".seidr-tour-card-block { margin: 0 0 0.65em; }",
      ".seidr-tour-card-block:last-child { margin-bottom: 0; }",
      ".seidr-tour-card-actions { flex-shrink: 0; display: flex; align-items: center; gap: 8px; }",
      ".seidr-tour-card-spacer { flex: 1; }",
      ".seidr-tour-primary {",
      "  border-color: rgba(212,160,23,0.55) !important; color: #d4a017 !important;",
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

  // src/actions/io.ts
  function lz3() {
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
    const L = lz3();
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
    const L = lz3();
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
  function escapeHtml4(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function opts2(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml4(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" + escapeHtml4(o.label) + "</option>";
    }).join("");
  }
  function stringOpts(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml4(o) + '"' + (o === selected ? " selected" : "") + ">" + escapeHtml4(o) + "</option>";
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
      parts.push('<div class="seidr-act-arousal-group">' + escapeHtml4(g.label) + "</div>");
      rows.forEach(function(a) {
        parts.push(
          '<button type="button" class="seidr-act-arousal-opt' + (a.id === selected ? " seidr-act-arousal-opt-on" : "") + '" data-arousal-id="' + escapeHtml4(a.id) + '">' + escapeHtml4(a.label) + ' <span class="seidr-settings-hint">' + escapeHtml4(a.id) + "</span></button>"
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
      '<input type="hidden" id="seidr-act-arousal-act" value="' + escapeHtml4(id) + '" />',
      '<button type="button" class="seidr-act-arousal-toggle" id="seidr-act-arousal-toggle" title="Choose Club arousal template">',
      '<span class="seidr-act-arousal-toggle-lab">Template</span>',
      '<strong id="seidr-act-arousal-label">' + escapeHtml4(seidrArousalActivityLabel(id)) + "</strong>",
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
      return '<button type="button" class="seidr-act-item-opt' + (on ? " seidr-act-item-opt-on" : "") + '" data-item-add-slot="' + escapeHtml4(slot) + '" data-item-add-name="' + escapeHtml4(r.name) + '">' + escapeHtml4(r.label) + ' <span class="seidr-settings-hint">' + escapeHtml4(r.name) + "</span></button>";
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
      return '<button type="button" class="seidr-act-item-chip" data-item-del="' + idx + '" title="Remove">' + escapeHtml4(itemRefLabel(it)) + " \xD7</button>";
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
      '<select id="seidr-act-items-slot">' + opts2(slots, itemsPickerSlot) + "</select>",
      '<input type="search" id="seidr-act-items-filter" placeholder="Search gags, armbinders\u2026" autocomplete="off" value="' + escapeHtml4(itemsPickerFilter) + '" />',
      "</div>",
      '<div class="seidr-act-items-results" id="seidr-act-items-results">' + itemsResultsHtml(itemsPickerSlot, itemsPickerFilter, list) + "</div>",
      "</div>",
      "</div>"
    ].join("");
  }
  function slotChips(selected) {
    return SEIDR_ACTION_SLOTS.map(function(s) {
      const on = selected.indexOf(s.id) >= 0;
      return '<button type="button" class="seidr-act-slot' + (on ? " seidr-act-slot-on" : "") + '" data-slot="' + escapeHtml4(s.id) + '">' + escapeHtml4(s.label) + "</button>";
    }).join("");
  }
  function ruleRowHtml(rule, index) {
    const typeMeta = SEIDR_COND_TYPES.filter(function(t) {
      return t.id === rule.type;
    })[0];
    const extra = typeMeta ? typeMeta.extra : null;
    let extraHtml = "";
    if (extra === "slot") {
      extraHtml = '<select data-rule-extra="slot">' + opts2(SEIDR_ACTION_SLOTS, rule.slot || "ItemArms") + "</select>";
    } else if (extra === "pose") {
      extraHtml = '<select data-rule-extra="pose">' + opts2(SEIDR_ACTION_POSES, rule.pose || "Kneel") + "</select>";
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
        return '<option value="' + t.id + '"' + (t.id === rule.type ? " selected" : "") + ">" + escapeHtml4(t.label) + "</option>";
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
      return '<button type="button" class="seidr-act-ph" data-chat-token="' + escapeHtml4(t.token) + '" title="' + escapeHtml4(t.hint) + '">' + escapeHtml4(t.token) + "</button>";
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
      return '<option value="' + a.id + '"' + (editId === a.id ? " selected" : "") + ">" + escapeHtml4(a.name) + " (" + escapeHtml4(a.slots.join(", ")) + ")</option>";
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
      '<input type="text" id="seidr-act-name" maxlength="48" value="' + escapeHtml4(a.name) + '" />',
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Who</span>',
      '<select id="seidr-act-audience">' + opts2(SEIDR_ACTION_AUDIENCES, a.audience) + "</select>",
      "</div>",
      '<div class="seidr-act-icon-row" style="margin-top:10px;">',
      '<img class="seidr-act-icon-preview" id="seidr-act-icon-preview" src="' + escapeHtml4(iconUrl) + '" alt="" width="40" height="40" />',
      "<div>",
      '<p class="seidr-settings-hint" id="seidr-act-icon-label">' + escapeHtml4(iconLab) + "</p>",
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
      '<textarea id="seidr-act-chat-other" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' + escapeHtml4(chatOther2) + "</textarea>",
      '<p class="seidr-settings-hint" id="seidr-act-chat-other-count">' + chatOther2.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
      '<label class="seidr-settings-field-label" style="display:block;margin-top:8px;">Self</label>',
      '<textarea id="seidr-act-chat-self" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' + escapeHtml4(chatSelf2) + "</textarea>",
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
      '<select id="seidr-act-pose">' + opts2(SEIDR_ACTION_POSES, pose.pose) + "</select>",
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
  function setMsg3(root3, text) {
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
      setMsg3(root3, "Already added");
      return;
    }
    if (draft.items.length >= SEIDR_ACTION_ITEMS_MAX) {
      setMsg3(root3, "Item limit (" + SEIDR_ACTION_ITEMS_MAX + ")");
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
      "</div>",
      "</div>"
    ].join("");
    panel3.appendChild(modal);
    modal.addEventListener("wheel", function(ev) {
      ev.stopPropagation();
    }, { passive: true });
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
        setMsg3(root3, "Icon saved");
      } else {
        setMsg3(root3, saved.error || "Icon save failed \u2014 click Save action");
      }
    }
    function paintGrid(filter) {
      const grid = modal.querySelector("#seidr-act-icon-grid");
      if (!grid) return;
      const q = (filter || "").trim().toLowerCase();
      const parts = [];
      function pushSection(title, cells) {
        if (!cells) return;
        parts.push('<div class="seidr-act-icon-sec">' + escapeHtml4(title) + "</div>");
        parts.push('<div class="seidr-act-icon-sec-grid">' + cells + "</div>");
      }
      const seidrCells = SEIDR_BUILTIN_ICONS.filter(function(b) {
        if (!q) return true;
        return b.label.toLowerCase().indexOf(q) >= 0 || b.id.toLowerCase().indexOf(q) >= 0;
      }).map(function(b) {
        return '<button type="button" class="seidr-act-icon-cell" data-icon-source="seidr" data-icon-id="' + escapeHtml4(b.id) + '" title="' + escapeHtml4(b.label) + '"><img src="' + escapeHtml4(b.url) + '" alt="" /><span>' + escapeHtml4(b.label) + "</span></button>";
      }).join("");
      pushSection("Seidr", seidrCells);
      const actCells = SEIDR_ACTIVITY_ICON_IDS.filter(function(id) {
        if (!q) return true;
        return id.toLowerCase().indexOf(q) >= 0;
      }).map(function(id) {
        return '<button type="button" class="seidr-act-icon-cell" data-icon-source="activity" data-icon-id="' + escapeHtml4(id) + '" title="' + escapeHtml4(id) + '"><img src="' + escapeHtml4(seidrActivityIconUrl(id)) + '" alt="" /><span>' + escapeHtml4(id) + "</span></button>";
      }).join("");
      pushSection("Club Activity", actCells);
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
        setMsg3(root3, "Text max " + SEIDR_ACTION_CHAT_MAX + " characters");
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
        setMsg3(root3, saved.error || "Save failed");
        return;
      }
      draft = next;
      editId = next.id;
      setMsg3(root3, "Saved");
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
      return '<label class="seidr-act-import-row"><input type="checkbox" data-import-idx="' + idx + '" checked /> ' + escapeHtml4(a.name) + "</label>";
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
    if (editId == null) {
      const list = seidrListActions();
      if (list.length) {
        editId = list[0].id;
        draft = seidrDefaultAction(list[0].id);
        Object.assign(draft, JSON.parse(JSON.stringify(list[0])));
        if (!draft.items) draft.items = [];
        if (!draft.icon) draft.icon = seidrDefaultActionIcon();
        arousalPickerOpen = false;
        renderList(container);
        renderEditor(container);
        bindList(container);
        bindEditor(container);
      }
    }
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
  Seidr.refreshOpenActivityMenuIcons = refreshOpenActivityMenuIcons;

  // src/animations/ui.ts
  var editId2 = null;
  var draft2 = null;
  function escapeHtml5(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function opts3(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml5(o.id) + '"' + (o.id === selected ? " selected" : "") + ">" + escapeHtml5(o.label) + "</option>";
    }).join("");
  }
  function stringOpts2(list, selected) {
    return list.map(function(o) {
      return '<option value="' + escapeHtml5(o) + '"' + (o === selected ? " selected" : "") + ">" + escapeHtml5(o || "(clear)") + "</option>";
    }).join("");
  }
  function setMsg4(root3, text) {
    const el = root3.querySelector("#seidr-anim-msg");
    if (el) el.textContent = text || "";
  }
  function chatTokenChips2() {
    return SEIDR_ACTION_CHAT_TOKENS.map(function(t) {
      return '<button type="button" class="seidr-act-ph" data-anim-chat-token="' + escapeHtml5(t.token) + '" title="' + escapeHtml5(t.hint) + '">' + escapeHtml5(t.token) + "</button>";
    }).join("");
  }
  function insertChatToken2(ta, token) {
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
  function syncAnimChatCount(root3) {
    const ta = root3.querySelector("#seidr-anim-chat");
    const count = root3.querySelector("#seidr-anim-chat-count");
    if (ta && count) count.textContent = ta.value.length + "/" + SEIDR_ACTION_CHAT_MAX;
  }
  function updateCap(root3) {
    const el = root3.querySelector("#seidr-anim-cap");
    if (!el) return;
    el.textContent = seidrListAnimations().length + "/" + SEIDR_ANIMATIONS_MAX + " Animations";
  }
  function renderList2(root3) {
    const list = seidrListAnimations();
    const box = root3.querySelector("#seidr-anim-list");
    if (!box) return;
    updateCap(root3);
    if (!list.length) {
      box.innerHTML = '<p class="seidr-settings-hint">No animations yet. Add one, then play with /animation name.</p>';
      return;
    }
    const optsHtml = list.map(function(a) {
      return '<option value="' + a.id + '"' + (editId2 === a.id ? " selected" : "") + ">" + escapeHtml5(a.name) + " (" + a.steps.length + ")</option>";
    }).join("");
    box.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Animation</span>',
      '<select id="seidr-anim-pick">' + optsHtml + "</select>",
      "</div>"
    ].join("");
  }
  function faceSummaryLabel(step) {
    const expr = step.expression ? step.expression : "Clear";
    return step.feature + " \xB7 " + expr;
  }
  function waitStepperHtml(wait2) {
    return [
      '<div class="seidr-num-wrap">',
      '<input type="number" class="seidr-settings-num" min="0" max="' + SEIDR_ANIM_WAIT_TOTAL_MAX + '" step="0.1" data-anim-wait value="' + escapeHtml5(String(wait2)) + '" />',
      '<div class="seidr-num-spin" aria-hidden="true">',
      '<button type="button" class="seidr-num-spin-btn" data-anim-wait-dir="1" tabindex="-1" title="Increase">\u25B2</button>',
      '<button type="button" class="seidr-num-spin-btn" data-anim-wait-dir="-1" tabindex="-1" title="Decrease">\u25BC</button>',
      "</div>",
      "</div>"
    ].join("");
  }
  function stepCardHtml(step, index) {
    const waitInput = waitStepperHtml(step.wait);
    if (step.kind === "pose") {
      const poseName = seidrPoseLabel(step.pose);
      return [
        '<details class="seidr-settings-sec" data-anim-step="' + index + '" open>',
        "<summary>Pose \xB7 " + escapeHtml5(poseName) + "</summary>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Pose</span>',
        "<select data-anim-pose>" + opts3(SEIDR_ACTION_POSES, step.pose) + "</select>",
        "</div>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Wait (s)</span>',
        waitInput,
        "</div>",
        '<div class="seidr-settings-row" style="margin-top:8px;">',
        '<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-anim-del-step="' + index + '">Remove</button>',
        "</div>",
        "</details>"
      ].join("");
    }
    const feature = step.feature;
    const exprs = [""].concat(SEIDR_ANIM_FACE_MAP[feature] || []);
    return [
      '<details class="seidr-settings-sec" data-anim-step="' + index + '" open>',
      "<summary>Face \xB7 " + escapeHtml5(faceSummaryLabel(step)) + "</summary>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Feature</span>',
      "<select data-anim-feature>" + stringOpts2(Object.keys(SEIDR_ANIM_FACE_MAP), feature) + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Expression</span>',
      "<select data-anim-expr>" + stringOpts2(exprs, step.expression) + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Duration</span>',
      "<select data-anim-dur>" + stringOpts2(SEIDR_ANIM_FACE_DURATIONS, step.duration) + "</select>",
      "</div>",
      '<div class="seidr-settings-field-row" style="margin-top:8px;">',
      '<span class="seidr-settings-field-label">Wait (s)</span>',
      waitInput,
      "</div>",
      '<div class="seidr-settings-row" style="margin-top:8px;">',
      '<button type="button" class="seidr-act-btn seidr-act-btn-danger" data-anim-del-step="' + index + '">Remove</button>',
      "</div>",
      "</details>"
    ].join("");
  }
  function readDraftFromDom2(root3) {
    if (!draft2) return null;
    const nameEl = root3.querySelector("#seidr-anim-name");
    const name = (nameEl && nameEl.value || "").trim() || draft2.name;
    const chatEl = root3.querySelector("#seidr-anim-chat");
    const chatText = chatEl && chatEl.value.trim() ? chatEl.value.trim().slice(0, SEIDR_ACTION_CHAT_MAX) : "";
    const cards = root3.querySelectorAll("[data-anim-step]");
    const steps = [];
    cards.forEach(function(card) {
      const waitEl = card.querySelector("[data-anim-wait]");
      const wait2 = waitEl ? parseFloat(waitEl.value) : 0.5;
      const poseEl = card.querySelector("[data-anim-pose]");
      if (poseEl) {
        steps.push({ kind: "pose", pose: poseEl.value || "Kneel", wait: wait2 });
        return;
      }
      const featEl = card.querySelector("[data-anim-feature]");
      const exprEl = card.querySelector("[data-anim-expr]");
      const durEl = card.querySelector("[data-anim-dur]");
      if (featEl) {
        steps.push({
          kind: "face",
          feature: featEl.value || "Eyes",
          expression: exprEl ? exprEl.value : "",
          duration: durEl && durEl.value ? durEl.value : "keep",
          wait: wait2
        });
      }
    });
    return { id: draft2.id, name, steps, chatText };
  }
  function renderEditor2(root3) {
    const wrap = root3.querySelector("#seidr-anim-editor");
    if (!wrap) return;
    if (!draft2) {
      wrap.innerHTML = '<p class="seidr-settings-hint">Select an animation or add a new one.</p>';
      return;
    }
    const total = seidrAnimWaitTotal(draft2.steps);
    const chatText = draft2.chatText || "";
    wrap.innerHTML = [
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Name</span>',
      '<input type="text" id="seidr-anim-name" maxlength="40" value="' + escapeHtml5(draft2.name) + '" />',
      "</div>",
      '<p class="seidr-settings-hint" style="margin-top:8px;">Steps ' + draft2.steps.length + "/" + SEIDR_ANIM_STEPS_MAX + " \xB7 Wait total " + total.toFixed(2) + "s / " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s</p>",
      '<div id="seidr-anim-steps">' + draft2.steps.map(stepCardHtml).join("") + "</div>",
      '<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
      '<button type="button" class="seidr-act-btn" id="seidr-anim-add-pose">+ Pose</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-anim-add-face">+ Face</button>',
      "</div>",
      '<p class="seidr-settings-hint" style="margin-top:10px;">Action text (optional, posted when play starts; Club tags, max ' + SEIDR_ACTION_CHAT_MAX + ")</p>",
      '<div class="seidr-act-ph-row" id="seidr-anim-ph">' + chatTokenChips2() + "</div>",
      '<p class="seidr-settings-hint">Club style: SourceCharacter raises PronounPossessive hands.</p>',
      '<textarea id="seidr-anim-chat" rows="2" maxlength="' + SEIDR_ACTION_CHAT_MAX + '">' + escapeHtml5(chatText) + "</textarea>",
      '<p class="seidr-settings-hint" id="seidr-anim-chat-count">' + chatText.length + "/" + SEIDR_ACTION_CHAT_MAX + "</p>",
      '<div class="seidr-settings-row" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap;">',
      '<button type="button" class="seidr-act-btn" id="seidr-anim-save">Save</button>',
      '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-anim-del">Delete</button>',
      "</div>",
      '<p class="seidr-cmd-msg" id="seidr-anim-msg"></p>'
    ].join("");
    wireEditor(root3);
  }
  function openAnimation(root3, id) {
    const list = seidrListAnimations();
    let found = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        found = JSON.parse(JSON.stringify(list[i]));
        break;
      }
    }
    editId2 = found ? found.id : null;
    draft2 = found;
    renderList2(root3);
    renderEditor2(root3);
    wireList(root3);
  }
  function ensureFirstOpen(root3) {
    if (editId2 != null && draft2) return;
    const list = seidrListAnimations();
    if (!list.length) {
      editId2 = null;
      draft2 = null;
      renderList2(root3);
      renderEditor2(root3);
      wireList(root3);
      return;
    }
    openAnimation(root3, list[0].id);
  }
  function wireEditor(root3) {
    root3.querySelector("#seidr-anim-add-pose")?.addEventListener("click", function() {
      const cur = readDraftFromDom2(root3) || draft2;
      if (!cur) return;
      if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
        setMsg4(root3, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
        return;
      }
      cur.steps.push(seidrDefaultAnimPoseStep());
      draft2 = cur;
      renderEditor2(root3);
    });
    root3.querySelector("#seidr-anim-add-face")?.addEventListener("click", function() {
      const cur = readDraftFromDom2(root3) || draft2;
      if (!cur) return;
      if (cur.steps.length >= SEIDR_ANIM_STEPS_MAX) {
        setMsg4(root3, "Max " + SEIDR_ANIM_STEPS_MAX + " steps");
        return;
      }
      cur.steps.push(seidrDefaultAnimFaceStep());
      draft2 = cur;
      renderEditor2(root3);
    });
    root3.querySelectorAll("[data-anim-del-step]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        const cur = readDraftFromDom2(root3) || draft2;
        if (!cur) return;
        const idx = parseInt(btn2.getAttribute("data-anim-del-step") || "-1", 10);
        if (idx < 0) return;
        cur.steps.splice(idx, 1);
        draft2 = cur;
        renderEditor2(root3);
      });
    });
    function refreshFromDom() {
      const cur = readDraftFromDom2(root3);
      if (cur) {
        draft2 = cur;
        renderEditor2(root3);
      }
    }
    root3.querySelectorAll("[data-anim-feature], [data-anim-pose], [data-anim-expr]").forEach(function(sel) {
      sel.addEventListener("change", refreshFromDom);
    });
    root3.querySelectorAll("[data-anim-wait-dir]").forEach(function(btn2) {
      btn2.addEventListener("click", function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const wrap = btn2.closest(".seidr-num-wrap");
        const input = wrap ? wrap.querySelector("[data-anim-wait]") : null;
        if (!input) return;
        const dir = parseInt(btn2.getAttribute("data-anim-wait-dir") || "0", 10);
        if (!dir) return;
        let n = parseFloat(input.value);
        if (!Number.isFinite(n)) n = 0.5;
        n = Math.round((n + dir * 0.1) * 10) / 10;
        if (n < 0) n = 0;
        if (n > SEIDR_ANIM_WAIT_TOTAL_MAX) n = SEIDR_ANIM_WAIT_TOTAL_MAX;
        input.value = String(n);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    root3.querySelector("#seidr-anim-chat")?.addEventListener("input", function() {
      syncAnimChatCount(root3);
    });
    root3.querySelector("#seidr-anim-ph")?.addEventListener("click", function(ev) {
      const btn2 = ev.target.closest("[data-anim-chat-token]");
      if (!btn2) return;
      const token = btn2.getAttribute("data-anim-chat-token");
      if (!token) return;
      const ta = root3.querySelector("#seidr-anim-chat");
      if (!ta) return;
      if (!insertChatToken2(ta, token)) {
        setMsg4(root3, "Text max " + SEIDR_ACTION_CHAT_MAX + " characters");
      } else {
        syncAnimChatCount(root3);
      }
    });
    root3.querySelector("#seidr-anim-save")?.addEventListener("click", function() {
      const cur = readDraftFromDom2(root3);
      if (!cur) return;
      const total = seidrAnimWaitTotal(cur.steps);
      if (total > SEIDR_ANIM_WAIT_TOTAL_MAX) {
        setMsg4(root3, "Total wait " + total.toFixed(2) + "s exceeds " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s");
        return;
      }
      const r = seidrUpsertAnimation(cur);
      if (!r.ok) {
        setMsg4(root3, r.error || "Save failed");
        return;
      }
      editId2 = r.animation.id;
      draft2 = JSON.parse(JSON.stringify(r.animation));
      setMsg4(root3, "Saved");
      renderList2(root3);
      renderEditor2(root3);
      wireList(root3);
    });
    root3.querySelector("#seidr-anim-del")?.addEventListener("click", function() {
      if (!draft2) return;
      const id = draft2.id;
      seidrDeleteAnimation(id);
      editId2 = null;
      draft2 = null;
      ensureFirstOpen(root3);
      setMsg4(root3, "Deleted");
    });
  }
  function wireList(root3) {
    const pick = root3.querySelector("#seidr-anim-pick");
    if (pick) {
      pick.addEventListener("change", function() {
        const id = parseInt(pick.value, 10);
        if (Number.isFinite(id)) openAnimation(root3, id);
      });
    }
  }
  function seidrBuildAnimationsTab(container) {
    editId2 = null;
    draft2 = null;
    container.innerHTML = [
      '<p class="seidr-settings-hint">Pose and face clips for yourself. Cap ' + SEIDR_ANIMATIONS_MAX + " animations, " + SEIDR_ANIM_STEPS_MAX + " steps, " + SEIDR_ANIM_WAIT_TOTAL_MAX + "s total wait. Play with /animation or /ani.</p>",
      '<div class="seidr-settings-row" style="gap:8px;display:flex;align-items:center;flex-wrap:wrap;">',
      '<button type="button" class="seidr-act-btn" id="seidr-anim-add">Add animation</button>',
      '<span class="seidr-settings-hint" id="seidr-anim-cap">0/' + SEIDR_ANIMATIONS_MAX + " Animations</span>",
      "</div>",
      '<div id="seidr-anim-list" style="margin-top:10px;"></div>',
      '<div class="seidr-act-editor" id="seidr-anim-editor" style="margin-top:10px;"></div>'
    ].join("");
    const add = container.querySelector("#seidr-anim-add");
    add?.addEventListener("click", function() {
      const a = seidrAddAnimation();
      if (!a) {
        setMsg4(container, "Animation limit reached");
        return;
      }
      openAnimation(container, a.id);
    });
    ensureFirstOpen(container);
  }
  function seidrRefreshAnimationsTab() {
    const root3 = document.getElementById("seidr-settings-pane-animations");
    if (!root3) return;
    seidrBuildAnimationsTab(root3);
  }

  // src/roomManager/mapsUi.ts
  var editMapId = null;
  var editVersionId = null;
  var importCandidates2 = null;
  var importFileName = "";
  function escapeHtml6(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function setMsg5(root3, text) {
    const el = root3.querySelector("#seidr-maps-msg");
    if (el) el.textContent = text || "";
  }
  function inMapRoom() {
    return rmMapModeActive();
  }
  function canLoad() {
    return rmCanApplyToRoom() && rmIsAdmin() && inMapRoom();
  }
  function updateStorageHint(root3) {
    const el = root3.querySelector("#seidr-maps-storage");
    if (!el) return;
    const remoteBytes = rmMapsBytesEstimate();
    const budget = rmMapBudgetBytes();
    const local = rmLocalMapsStats();
    el.textContent = "Remote Default " + rmFormatBytes(remoteBytes) + " / " + rmFormatBytes(budget) + " (75% budget) \xB7 " + local.label;
  }
  function selectedMap() {
    if (!editMapId) return null;
    return rmListAllMaps().find(function(m) {
      return m.id === editMapId;
    }) || null;
  }
  function renderMapSection(root3) {
    const host = root3.querySelector("#seidr-maps-map-body");
    if (!host) return;
    updateStorageHint(root3);
    const maps = rmListAllMaps();
    const mapActive = inMapRoom();
    const saveDisabled = mapActive ? "" : " disabled";
    if (editMapId && !maps.some(function(m) {
      return m.id === editMapId;
    })) {
      editMapId = null;
      editVersionId = null;
    }
    if (!editMapId && maps.length) {
      editMapId = maps[0].id;
      editVersionId = rmDefaultVersionId(editMapId);
    }
    const map = selectedMap();
    const loadOk = canLoad();
    const versionSaveDisabled = mapActive && map ? "" : " disabled";
    const loadDisabled = loadOk && map ? "" : " disabled";
    const pickOpts = maps.length ? maps.map(function(m) {
      const loc = m.location === "local" ? "Local" : "Remote";
      const n = m.versions.length;
      return '<option value="' + escapeHtml6(m.id) + '"' + (m.id === editMapId ? " selected" : "") + ">" + escapeHtml6(m.name) + " (" + loc + ", " + n + "v)</option>";
    }).join("") : '<option value="">No maps yet</option>';
    let editorHtml = "";
    if (!map) {
      editorHtml = [
        '<p class="seidr-settings-hint">Save the current map room to create a map (version is always Default).</p>',
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">New name</span>',
        '<input type="text" id="seidr-maps-new-name" maxlength="48" placeholder="Map name" />',
        "</div>",
        '<div class="seidr-settings-row" style="margin-top:10px; gap:6px; display:flex; flex-wrap:wrap;">',
        '<button type="button" class="seidr-act-btn" id="seidr-maps-save-new"' + saveDisabled + ">Save as new map</button>",
        "</div>"
      ].join("");
    } else {
      const vers = rmListVersions(map.id);
      if (!editVersionId || !vers.some(function(v) {
        return v.id === editVersionId;
      })) {
        editVersionId = rmDefaultVersionId(map.id);
      }
      const verOpts = vers.map(function(v) {
        const when = v.savedAt ? new Date(v.savedAt).toLocaleString() : "";
        const tag = rmIsDefaultVersionName(v.name) ? " \xB7 remote-capable" : " \xB7 local only";
        return '<option value="' + escapeHtml6(v.id) + '"' + (v.id === editVersionId ? " selected" : "") + ">" + escapeHtml6(v.name) + tag + (when ? " \xB7 " + escapeHtml6(when) : "") + "</option>";
      }).join("");
      const curVer = vers.find(function(v) {
        return v.id === editVersionId;
      });
      const locLocal = map.location === "local";
      const curIsDefault = curVer ? rmIsDefaultVersionName(curVer.name) : false;
      editorHtml = [
        '<div class="seidr-settings-field-row">',
        '<span class="seidr-settings-field-label">Map</span>',
        '<select id="seidr-maps-pick">' + pickOpts + "</select>",
        "</div>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Name</span>',
        '<input type="text" id="seidr-maps-name" maxlength="48" value="' + escapeHtml6(map.name) + '" />',
        "</div>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Location</span>',
        '<div class="seidr-map-loc-btns">',
        '<button type="button" class="seidr-act-btn seidr-map-loc-btn' + (locLocal ? "" : " seidr-map-loc-on") + '" data-seidr-map-loc="remote">Remote</button>',
        '<button type="button" class="seidr-act-btn seidr-map-loc-btn' + (locLocal ? " seidr-map-loc-on" : "") + '" data-seidr-map-loc="local">Local only</button>',
        "</div>",
        "</div>",
        '<p class="seidr-settings-hint">' + (locLocal ? "Default stays in this browser. Extra versions are always local." : "Only Default syncs to the server. Other versions stay local.") + "</p>",
        '<div class="seidr-settings-field-row" style="margin-top:10px;">',
        '<span class="seidr-settings-field-label">Version</span>',
        '<select id="seidr-maps-ver-pick">' + verOpts + "</select>",
        "</div>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Ver. name</span>',
        '<input type="text" id="seidr-maps-ver-name" maxlength="48" value="' + escapeHtml6(curVer ? curVer.name : "") + '"' + (curIsDefault ? ' disabled title="Default cannot be renamed"' : "") + " />",
        "</div>",
        '<div class="seidr-settings-row" style="margin-top:10px; gap:6px; display:flex; flex-wrap:wrap;">',
        '<button type="button" class="seidr-act-btn" id="seidr-maps-save-meta">Save names</button>',
        '<button type="button" class="seidr-act-btn" id="seidr-maps-load"' + loadDisabled + ">Load version</button>",
        '<button type="button" class="seidr-act-btn" id="seidr-maps-overwrite"' + versionSaveDisabled + ">Overwrite Default</button>",
        '<button type="button" class="seidr-act-btn" id="seidr-maps-add-ver"' + versionSaveDisabled + ">Save new version</button>",
        '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-maps-del-ver">Delete version</button>',
        '<button type="button" class="seidr-act-btn seidr-act-btn-danger" id="seidr-maps-del-map">Delete map</button>',
        "</div>",
        '<hr class="seidr-maps-hr" />',
        '<p class="seidr-settings-hint">Create another map from the current room (always starts as Default):</p>',
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">New name</span>',
        '<input type="text" id="seidr-maps-new-name" maxlength="48" placeholder="Map name" />',
        "</div>",
        '<div class="seidr-settings-row" style="margin-top:8px; gap:6px; display:flex; flex-wrap:wrap;">',
        '<button type="button" class="seidr-act-btn" id="seidr-maps-save-new"' + saveDisabled + ">Save as new map</button>",
        "</div>"
      ].join("");
      if (!maps.length) {
      }
    }
    if (maps.length && map) {
      host.innerHTML = editorHtml;
    } else if (maps.length && !map) {
      host.innerHTML = [
        '<div class="seidr-settings-field-row">',
        '<span class="seidr-settings-field-label">Map</span>',
        '<select id="seidr-maps-pick">' + pickOpts + "</select>",
        "</div>",
        editorHtml
      ].join("");
    } else {
      host.innerHTML = editorHtml;
    }
    wireMapSection(root3);
  }
  function refreshExport(root3) {
    const ta = root3.querySelector("#seidr-maps-export");
    if (ta) ta.value = rmExportMapsJson();
  }
  function updateFileLabel(root3) {
    const el = root3.querySelector("#seidr-maps-import-file-label");
    if (el) el.textContent = importFileName || "No file chosen";
  }
  function renderImportPicker2(root3) {
    const host = root3.querySelector("#seidr-maps-import-pick");
    if (!host) return;
    if (!importCandidates2 || !importCandidates2.length) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const rows = importCandidates2.map(function(m, idx) {
      const n = m.versions.length;
      return '<label class="seidr-act-import-row"><input type="checkbox" data-import-idx="' + idx + '" checked /> ' + escapeHtml6(m.name) + " (" + n + " version" + (n === 1 ? "" : "s") + ")</label>";
    }).join("");
    host.innerHTML = [
      '<p class="seidr-settings-hint">Select maps to import (always Local only).</p>',
      '<div class="seidr-act-import-list">' + rows + "</div>",
      '<div class="seidr-settings-row" style="margin-top:8px; gap:6px; display:flex; flex-wrap:wrap;">',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-import-do">Import selected</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-import-cancel">Cancel</button>',
      "</div>"
    ].join("");
    host.querySelector("#seidr-maps-import-cancel")?.addEventListener("click", function() {
      importCandidates2 = null;
      const paste = root3.querySelector("#seidr-maps-import-paste");
      if (paste) paste.value = "";
      renderImportPicker2(root3);
      setMsg5(root3, "");
    });
    host.querySelector("#seidr-maps-import-do")?.addEventListener("click", function() {
      if (!importCandidates2) return;
      const selected = [];
      host.querySelectorAll("[data-import-idx]").forEach(function(el) {
        const cb = el;
        if (!cb.checked) return;
        const idx = parseInt(cb.getAttribute("data-import-idx") || "", 10);
        if (Number.isFinite(idx) && importCandidates2[idx]) selected.push(importCandidates2[idx]);
      });
      if (!selected.length) {
        setMsg5(root3, "Select at least one map");
        return;
      }
      const result = rmImportSelectedMaps(selected);
      if (!result.ok && !result.imported) {
        setMsg5(root3, result.error || "Import failed");
        return;
      }
      importCandidates2 = null;
      const paste = root3.querySelector("#seidr-maps-import-paste");
      if (paste) paste.value = "";
      renderImportPicker2(root3);
      refreshAll(root3);
      setMsg5(root3, result.error || "Imported " + result.imported + " map(s) as Local only");
    });
  }
  function wireMapSection(root3) {
    root3.querySelector("#seidr-maps-pick")?.addEventListener("change", function() {
      const pick = root3.querySelector("#seidr-maps-pick");
      editMapId = pick && pick.value ? pick.value : null;
      editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
      renderMapSection(root3);
    });
    root3.querySelector("#seidr-maps-save-new")?.addEventListener("click", function() {
      const nameEl = root3.querySelector("#seidr-maps-new-name");
      const name = nameEl && nameEl.value || "";
      if (!String(name).trim()) {
        setMsg5(root3, "Enter a map name");
        return;
      }
      const r = rmSaveNewMap(name);
      if (!r.ok) {
        setMsg5(root3, r.error || "Save failed");
        return;
      }
      editMapId = r.map ? r.map.id : null;
      editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
      refreshAll(root3);
      setMsg5(root3, r.fellBackLocal ? "Saved as Local only (remote full or over budget). Default version created." : "Map saved with Default (" + (r.map && r.map.location === "local" ? "Local" : "Remote") + ")");
    });
    root3.querySelector("#seidr-maps-ver-pick")?.addEventListener("change", function() {
      const sel = root3.querySelector("#seidr-maps-ver-pick");
      editVersionId = sel && sel.value ? sel.value : null;
      renderMapSection(root3);
    });
    root3.querySelector("#seidr-maps-save-meta")?.addEventListener("click", function() {
      if (!editMapId) return;
      const nameEl = root3.querySelector("#seidr-maps-name");
      const verNameEl = root3.querySelector("#seidr-maps-ver-name");
      const r1 = rmRenameMap(editMapId, nameEl && nameEl.value || "");
      if (!r1.ok) {
        setMsg5(root3, r1.error || "Rename failed");
        return;
      }
      const map = selectedMap();
      const ver = map && editVersionId ? map.versions.find(function(v) {
        return v.id === editVersionId;
      }) : null;
      if (editVersionId && verNameEl && ver && !rmIsDefaultVersionName(ver.name)) {
        const r2 = rmRenameVersion(editMapId, editVersionId, verNameEl.value);
        if (!r2.ok) {
          setMsg5(root3, r2.error || "Version rename failed");
          return;
        }
      }
      refreshAll(root3);
      setMsg5(root3, "Saved names");
    });
    root3.querySelectorAll("[data-seidr-map-loc]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        if (!editMapId) return;
        const loc = btn2.getAttribute("data-seidr-map-loc");
        if (loc !== "local" && loc !== "remote") return;
        const r = rmSetMapLocation(editMapId, loc);
        if (!r.ok) {
          setMsg5(root3, r.error || "Move failed");
          return;
        }
        refreshAll(root3);
        setMsg5(root3, loc === "local" ? "Default moved to Local only" : "Default moved to Remote (extra versions stay local)");
      });
    });
    root3.querySelector("#seidr-maps-load")?.addEventListener("click", function() {
      if (!editMapId || !editVersionId) return;
      const map = selectedMap();
      const ver = map && map.versions.find(function(v) {
        return v.id === editVersionId;
      });
      if (!confirm("Load version \u201C" + (ver ? ver.name : "") + "\u201D into this room?")) return;
      const r = rmLoadMapVersion(editMapId, editVersionId);
      setMsg5(root3, r.ok ? "Map version loaded" : r.error || "Load failed");
    });
    root3.querySelector("#seidr-maps-overwrite")?.addEventListener("click", function() {
      if (!editMapId) return;
      if (!confirm("Overwrite Default with the current room map?")) return;
      const r = rmOverwriteDefault(editMapId);
      if (!r.ok) {
        setMsg5(root3, r.error || "Overwrite failed");
        return;
      }
      editVersionId = r.version ? r.version.id : rmDefaultVersionId(editMapId);
      refreshAll(root3);
      setMsg5(root3, "Default overwritten");
    });
    root3.querySelector("#seidr-maps-add-ver")?.addEventListener("click", function() {
      if (!editMapId) return;
      const verNameEl = root3.querySelector("#seidr-maps-ver-name");
      let verName = verNameEl && verNameEl.value.trim() || "";
      if (!verName || verName === RM_MAP_DEFAULT_NAME) {
        verName = window.prompt("Local version name (not Default):", "Development") || "";
      }
      if (!verName.trim()) {
        setMsg5(root3, "Enter a version name");
        return;
      }
      if (verName.trim() === RM_MAP_DEFAULT_NAME) {
        setMsg5(root3, "Use Overwrite Default to update Default");
        return;
      }
      const r = rmSaveNewVersion(editMapId, verName);
      if (!r.ok) {
        setMsg5(root3, r.error || "Save version failed");
        return;
      }
      editVersionId = r.version ? r.version.id : null;
      refreshAll(root3);
      setMsg5(root3, "Local version saved");
    });
    root3.querySelector("#seidr-maps-del-ver")?.addEventListener("click", function() {
      if (!editMapId || !editVersionId) return;
      const map = selectedMap();
      const ver = map && map.versions.find(function(v) {
        return v.id === editVersionId;
      });
      const isDef = ver && rmIsDefaultVersionName(ver.name);
      const only = map && map.versions.length <= 1;
      const msg = isDef && only ? "Delete the entire map?" : isDef ? "Cannot delete Default while other versions exist. Delete the map instead?" : "Delete this local version?";
      if (isDef && !only) {
        setMsg5(root3, "Cannot delete Default while other versions exist \u2014 use Delete map");
        return;
      }
      if (!confirm(msg)) return;
      const r = rmDeleteVersion(editMapId, editVersionId);
      if (!r.ok) {
        setMsg5(root3, r.error || "Delete failed");
        return;
      }
      if (only || isDef) {
        editMapId = null;
        editVersionId = null;
      } else {
        editVersionId = editMapId ? rmDefaultVersionId(editMapId) : null;
      }
      refreshAll(root3);
      setMsg5(root3, only || isDef ? "Map deleted" : "Version deleted");
    });
    root3.querySelector("#seidr-maps-del-map")?.addEventListener("click", function() {
      if (!editMapId) return;
      const map = selectedMap();
      if (!confirm("Delete map \u201C" + (map ? map.name : "") + "\u201D and all versions?")) return;
      const r = rmDeleteMap(editMapId);
      if (!r.ok) {
        setMsg5(root3, r.error || "Delete failed");
        return;
      }
      editMapId = null;
      editVersionId = null;
      refreshAll(root3);
      setMsg5(root3, "Map deleted");
    });
  }
  function wireIo(root3) {
    root3.querySelector("#seidr-maps-export-refresh")?.addEventListener("click", function() {
      refreshExport(root3);
      setMsg5(root3, "Export refreshed");
    });
    root3.querySelector("#seidr-maps-export-copy")?.addEventListener("click", function() {
      refreshExport(root3);
      const ta = root3.querySelector("#seidr-maps-export");
      if (!ta) return;
      try {
        ta.select();
        document.execCommand("copy");
        setMsg5(root3, "Copied JSON");
      } catch (e) {
        setMsg5(root3, "Copy failed \u2014 select and copy manually");
      }
    });
    root3.querySelector("#seidr-maps-export-dl")?.addEventListener("click", function() {
      refreshExport(root3);
      const json = rmExportMapsJson();
      try {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "seidr-maps-export.json";
        a.click();
        URL.revokeObjectURL(url);
        setMsg5(root3, "Download started");
      } catch (e) {
        setMsg5(root3, "Download failed");
      }
    });
    root3.querySelector("#seidr-maps-import-parse")?.addEventListener("click", function() {
      const paste = root3.querySelector("#seidr-maps-import-paste");
      const parsed = rmParseMapsImport(paste ? paste.value : "");
      if (parsed.ok === false) {
        importCandidates2 = null;
        renderImportPicker2(root3);
        setMsg5(root3, parsed.error);
        return;
      }
      importCandidates2 = parsed.maps;
      renderImportPicker2(root3);
      setMsg5(root3, "Select maps to import");
    });
    const file = root3.querySelector("#seidr-maps-import-file");
    root3.querySelector("#seidr-maps-import-choose")?.addEventListener("click", function() {
      file?.click();
    });
    if (file) {
      file.addEventListener("change", function() {
        const f = file.files && file.files[0];
        if (!f) {
          importFileName = "";
          updateFileLabel(root3);
          return;
        }
        importFileName = f.name;
        updateFileLabel(root3);
        const reader = new FileReader();
        reader.onload = function() {
          const text = typeof reader.result === "string" ? reader.result : "";
          const paste = root3.querySelector("#seidr-maps-import-paste");
          if (paste) paste.value = text;
          const parsed = rmParseMapsImport(text);
          if (parsed.ok === false) {
            importCandidates2 = null;
            renderImportPicker2(root3);
            setMsg5(root3, parsed.error);
            return;
          }
          importCandidates2 = parsed.maps;
          renderImportPicker2(root3);
          setMsg5(root3, "Select maps to import");
        };
        reader.onerror = function() {
          setMsg5(root3, "Could not read file");
        };
        reader.readAsText(f);
        file.value = "";
      });
    }
  }
  function refreshAll(root3) {
    renderMapSection(root3);
    refreshExport(root3);
    updateStorageHint(root3);
    updateFileLabel(root3);
  }
  function seidrRefreshMapsTab(container) {
    const root3 = container || document.getElementById("seidr-settings-pane-maps");
    if (!root3) return;
    refreshAll(root3);
  }
  function seidrBuildMapsTab(container) {
    editMapId = null;
    editVersionId = null;
    importCandidates2 = null;
    importFileName = "";
    const mapActive = inMapRoom();
    container.innerHTML = [
      '<p class="seidr-settings-hint">Map library with versions. Only <strong>Default</strong> can sync remotely; other versions stay in this browser. Imports are always Local only.</p>',
      '<p class="seidr-settings-hint" id="seidr-maps-storage"></p>',
      '<p class="seidr-settings-hint" id="seidr-maps-msg"></p>',
      mapActive ? "" : '<p class="seidr-settings-hint">Save / new version needs an active map room.</p>',
      '<details class="seidr-settings-sec" open>',
      "<summary>Map</summary>",
      '<div id="seidr-maps-map-body" style="margin-top:8px;"></div>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Export / Import</summary>",
      '<div class="seidr-settings-row" style="gap:6px;display:flex;flex-wrap:wrap;margin-top:8px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-export-refresh">Refresh export</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-export-copy">Copy JSON</button>',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-export-dl">Download JSON</button>',
      "</div>",
      '<textarea class="seidr-act-io-text" id="seidr-maps-export" rows="6" readonly></textarea>',
      '<p class="seidr-settings-hint" style="margin-top:10px;">Import JSON (file or paste). Imported maps are Local only.</p>',
      '<div class="seidr-maps-file-row">',
      '<input type="file" id="seidr-maps-import-file" accept="application/json,.json,text/plain" hidden />',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-import-choose">Choose file\u2026</button>',
      '<span class="seidr-maps-file-name" id="seidr-maps-import-file-label">No file chosen</span>',
      "</div>",
      '<textarea class="seidr-act-io-text" id="seidr-maps-import-paste" rows="4" placeholder="Paste SeidrMaps JSON\u2026"></textarea>',
      '<div class="seidr-settings-row" style="margin-top:8px;">',
      '<button type="button" class="seidr-act-btn" id="seidr-maps-import-parse">Parse import</button>',
      "</div>",
      '<div class="seidr-act-import-panel" id="seidr-maps-import-pick" hidden></div>',
      "</details>"
    ].join("");
    wireIo(container);
    refreshAll(container);
  }

  // src/settings/about.ts
  var ABOUT_FEATURES = [
    {
      title: "Holds",
      blurb: "Pull Left / Right, Cuddle, Remove, and Leave on Item Torso \u2014 shared poses when both of you run Seidr. Void disconnect keeps seats about 45s so a quick rejoin can restore the pile.",
      docPath: "/docs/view.html#HOLDS"
    },
    {
      title: "Undress",
      blurb: "Strip clothing from the Activity Menu on the matching zone (hands required). Echo layers and Undress all appear when those groups exist; the target does not need Seidr.",
      docPath: "/docs/view.html#UNDRESS"
    },
    {
      title: "Custom Actions",
      blurb: "Up to 50 Club Activity Menu entries with your own chat lines, conditions, icons, sound, and pose. Separate from Commands \u2192 Actions (those are /a chat shortcuts).",
      docPath: "/docs/view.html#ACTIONS"
    },
    {
      title: "Animations",
      blurb: "Pose and face clips that play on you only. Author them under Animations, then run /animation or /ani (Tab lists your names).",
      docPath: "/docs/view.html#ANIMATIONS"
    },
    {
      title: "Chat Commands",
      blurb: "People aliases and /a action bindings, plus /strip, /poses, /animation, /seidr, and /roommanager. Tab autocomplete and optional Fast Select (letter + Tab) speed things up.",
      docPath: "/docs/view.html#COMMANDS"
    },
    {
      title: "Fast Open",
      blurb: "Hold a modifier and click a room character to open Club Activity View on your preferred Item* slot. Change the modifier if FAM also uses Shift-click.",
      docPath: "/docs/view.html#SETTINGS"
    },
    {
      title: "Room Manager",
      blurb: "Admin panel for room definitions, access lists, backgrounds, and map series. Open with /roommanager or the floating \u2302 when you are room admin.",
      docPath: "/docs/view.html#ROOM_MANAGER"
    },
    {
      title: "Maps",
      blurb: "Map versions under Settings \u2192 Maps / Room Manager. Only Default can sync with your account; other versions stay local to this browser.",
      docPath: "/docs/view.html#ROOM_MANAGER"
    },
    {
      title: "Drawing, Arousal & Storage",
      blurb: "Pull/cuddle drawing offsets, cluster Names modes (Hitbox/Hover/Hide), arousal bar modes, and ExtensionSettings usage vs the soft cap.",
      docPath: "/docs/view.html#SETTINGS"
    }
  ];
  function escapeHtml7(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function docsBase() {
    const base = typeof Seidr.DOCS_BASE_URL === "string" && Seidr.DOCS_BASE_URL ? Seidr.DOCS_BASE_URL : "https://freya-bc.github.io/Freyas-Seidr";
    return base.replace(/\/$/, "");
  }
  function docsUrl(path) {
    const p = path.charAt(0) === "/" ? path : "/" + path;
    return docsBase() + p;
  }
  function featureCard(f) {
    const href = docsUrl(f.docPath);
    return [
      '<div class="seidr-settings-sec seidr-about-feature">',
      '<div class="seidr-about-feature-head">',
      '<span class="seidr-about-feature-title">' + escapeHtml7(f.title) + "</span>",
      '<a class="seidr-act-btn" href="' + escapeHtml7(href) + '" target="_blank" rel="noopener noreferrer">More</a>',
      "</div>",
      '<p class="seidr-settings-hint">' + escapeHtml7(f.blurb) + "</p>",
      "</div>"
    ].join("");
  }
  function seidrBuildAboutTab(container) {
    const version = String(Seidr.VERSION || "\u2014");
    const name = String(Seidr.FULL_NAME || "Seidr");
    const logo = typeof Seidr.LOGO_URL === "string" && Seidr.LOGO_URL ? Seidr.LOGO_URL : "";
    const home = docsBase() + "/";
    const repo = typeof Seidr.REPO_URL === "string" && Seidr.REPO_URL ? Seidr.REPO_URL : "https://github.com/Freya-BC/Freyas-Seidr";
    container.innerHTML = [
      '<div class="seidr-settings-sec seidr-about-header">',
      logo ? '<img class="seidr-about-logo" src="' + escapeHtml7(logo) + '" alt="" width="56" height="56" />' : "",
      '<div class="seidr-about-header-text">',
      '<p class="seidr-about-name">' + escapeHtml7(name) + "</p>",
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Version</span>',
      "<span>" + escapeHtml7(version) + "</span>",
      "</div>",
      '<div class="seidr-settings-field-row">',
      '<span class="seidr-settings-field-label">Developer</span>',
      "<span>Freya</span>",
      "</div>",
      '<div class="seidr-about-links">',
      '<button type="button" class="seidr-act-btn" id="seidr-about-tutorial">Tutorial</button>',
      '<a class="seidr-act-btn" href="' + escapeHtml7(home) + '" target="_blank" rel="noopener noreferrer">Documentation</a>',
      '<a class="seidr-act-btn" href="' + escapeHtml7(repo) + '" target="_blank" rel="noopener noreferrer">GitHub</a>',
      "</div>",
      "</div>",
      "</div>",
      '<details class="seidr-settings-sec" open>',
      "<summary>Documentation</summary>",
      '<p class="seidr-settings-hint">Short summaries below. More opens the full player guide on GitHub Pages. Use Tutorial (above) anytime for a guided walkthrough of Settings and chat autocomplete.</p>',
      ABOUT_FEATURES.map(featureCard).join(""),
      "</details>"
    ].join("");
    const tutBtn = container.querySelector("#seidr-about-tutorial");
    if (tutBtn) {
      tutBtn.addEventListener("click", function() {
        if (typeof Seidr.startTutorial === "function") Seidr.startTutorial();
      });
    }
  }

  // src/settings/ui.ts
  function $3(id) {
    return document.getElementById(id);
  }
  var drawDraft = null;
  var drawDirty = false;
  function drawNumInput(id, min, max) {
    return [
      '<span class="seidr-num-wrap">',
      '<input type="number" class="seidr-settings-num" id="' + id + '" min="' + min + '" max="' + max + '" step="1" />',
      '<span class="seidr-num-spin" aria-hidden="true">',
      '<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="1" tabindex="-1" title="Increase">\u25B2</button>',
      '<button type="button" class="seidr-num-spin-btn" data-seidr-num-dir="-1" tabindex="-1" title="Decrease">\u25BC</button>',
      "</span>",
      "</span>"
    ].join("");
  }
  function poseRow(id, label) {
    const xMin = id === "pull" ? "0" : String(SEIDR_DRAW_OFFSET_MIN);
    const max = String(SEIDR_DRAW_OFFSET_MAX);
    return [
      '<div class="seidr-settings-draw-row" data-pose="' + id + '">',
      '<span class="seidr-settings-draw-label">' + label + "</span>",
      '<label class="seidr-settings-draw-field">X',
      drawNumInput("seidr-set-draw-" + id + "-x", xMin, max),
      "</label>",
      '<label class="seidr-settings-draw-field">Y',
      drawNumInput("seidr-set-draw-" + id + "-y", String(SEIDR_DRAW_OFFSET_MIN), max),
      "</label>",
      '<button type="button" data-draw-reset="' + id + '">Reset</button>',
      "</div>"
    ].join("");
  }
  function seidrBuildGeneralHtml() {
    const opts4 = RM_LAUNCHER_POSITIONS.map(function(p) {
      return '<option value="' + p.id + '">' + p.label + "</option>";
    }).join("");
    const modeOpts = AROUSAL_BAR_MODES.map(function(m) {
      return '<option value="' + m.id + '">' + m.label + "</option>";
    }).join("");
    const scopeOpts = AROUSAL_BAR_SCOPES.map(function(s) {
      return '<option value="' + s.id + '">' + s.label + "</option>";
    }).join("");
    const nameOpts = CLUSTER_NAME_MODES.map(function(m) {
      return '<option value="' + m.id + '">' + m.label + "</option>";
    }).join("");
    const modOpts = FAST_OPEN_MODIFIERS.map(function(m) {
      return '<option value="' + m.id + '">' + m.label + "</option>";
    }).join("");
    const slotOpts = seidrRestraintSlots().map(function(s) {
      return '<option value="' + s.id + '">' + s.label + "</option>";
    }).join("");
    return [
      '<details class="seidr-settings-sec" data-seidr-tour="fast-open">',
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
      '<select id="seidr-set-rm-pos">' + opts4 + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Default placement in a room. Chat positions sit left of the chat window. Drag still overrides for this session.</p>',
      "</details>",
      '<details class="seidr-settings-sec">',
      "<summary>Drawing</summary>",
      '<p class="seidr-settings-hint">Echo pair spacing: Pull X is half-gap from center (hub shifts on one-side pull). Pull Y raises both sides. Cuddle moves the holder. Models only \u2014 hitboxes stay put. Save Drawing to keep.</p>',
      poseRow("pull", "Pull"),
      poseRow("cuddle", "Cuddle"),
      '<div class="seidr-settings-field-row" style="margin-top:10px;">',
      '<span class="seidr-settings-field-label">Names</span>',
      '<select id="seidr-set-cluster-names">' + nameOpts + "</select>",
      "</div>",
      '<p class="seidr-settings-hint">Cuddle / pull nicknames only (raised and centered over the arousal bar). Hitbox always shows; Hover shows only while the cursor is on that seat; Hide never. Does not change status icons or art.</p>',
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
      '<details class="seidr-settings-sec" data-seidr-tour="commands-enable">',
      "<summary>Commands</summary>",
      '<p class="seidr-settings-hint">Enable or disable Seidr chat commands. Off = not registered / ignored.</p>',
      '<div id="seidr-set-cmd-enable">' + SEIDR_CMD_ENABLE_LABELS.map(function(row) {
        return '<div class="seidr-settings-row"><label><input type="checkbox" data-seidr-cmd-en="' + row.key + '" /> ' + row.label + "</label></div>";
      }).join("") + "</div>",
      Seidr.SHOW_CMD_FAST_SELECT !== false ? [
        '<p class="seidr-settings-hint" style="margin-top:12px;">Fast Select (Dev) \u2014 letter + Tab in chat. Last successful /a /strip /poses target is preselected in member autocomplete.</p>',
        '<div class="seidr-settings-row">',
        '<label><input type="checkbox" id="seidr-set-fast-select" /> Enable Fast Select</label>',
        "</div>",
        '<div id="seidr-set-fast-select-keys" style="margin-top:8px;">' + SEIDR_FAST_SELECT_KEY_LABELS.map(function(row) {
          return '<div class="seidr-settings-row"><label><input type="checkbox" data-seidr-fs-key="' + row.key + '" /> ' + row.label + "</label></div>";
        }).join("") + "</div>",
        '<div class="seidr-settings-field-row" style="margin-top:8px;">',
        '<span class="seidr-settings-field-label">Empty Tab</span>',
        '<select id="seidr-set-fast-select-empty">' + SEIDR_FAST_SELECT_EMPTY_OPTS.map(function(o) {
          return '<option value="' + o.id + '">' + o.label + "</option>";
        }).join("") + "</select>",
        "</div>",
        '<p class="seidr-settings-hint">Letter checkboxes gate a/s/d/p + Tab. Empty Tab uses the dropdown (Disabled = Club Tab).</p>'
      ].join("") : "",
      '<p class="seidr-settings-hint" id="seidr-set-cmd-en-msg"></p>',
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
        storageRow("Commands", b.commands),
        storageRow("Animations", b.animations),
        storageRow("Settings", b.settings),
        storageRow("UI", b.ui)
      ].join("");
    }
    if (mapsHint) {
      let localBit = "";
      try {
        const loc = rmLocalMapsStats();
        localBit = " \xB7 Local " + loc.label;
      } catch (e) {
      }
      mapsHint.textContent = "Maps budget (75%): " + rmFormatBytes(b.maps) + " / " + rmFormatBytes(b.mapBudget) + localBit;
    }
  }
  function seidrBuildSettingsBody() {
    const body = $3("seidr-settings-body");
    const tabs = $3("seidr-settings-tabs");
    if (!body) return;
    const showActions = Seidr.SHOW_ACTIONS !== false;
    const showCommands = Seidr.SHOW_COMMANDS !== false;
    const showAnimations = Seidr.SHOW_COMMANDS !== false;
    const showMaps = rmIsShown();
    if (tabs) {
      tabs.innerHTML = [
        '<button type="button" class="seidr-settings-tab seidr-settings-tab-on" data-seidr-tab="general">General</button>',
        showActions ? '<button type="button" class="seidr-settings-tab" data-seidr-tab="actions">Actions</button>' : "",
        showCommands ? '<button type="button" class="seidr-settings-tab" data-seidr-tab="commands">Commands</button>' : "",
        showAnimations ? '<button type="button" class="seidr-settings-tab" data-seidr-tab="animations">Animations</button>' : "",
        showMaps ? '<button type="button" class="seidr-settings-tab" data-seidr-tab="maps">Maps</button>' : "",
        '<button type="button" class="seidr-settings-tab" data-seidr-tab="about">About</button>'
      ].join("");
    }
    body.innerHTML = [
      '<div class="seidr-settings-pane seidr-settings-pane-on" id="seidr-settings-pane-general" data-seidr-pane="general">',
      seidrBuildGeneralHtml(),
      "</div>",
      showActions ? '<div class="seidr-settings-pane" id="seidr-settings-pane-actions" data-seidr-pane="actions"></div>' : "",
      showCommands ? '<div class="seidr-settings-pane" id="seidr-settings-pane-commands" data-seidr-pane="commands"></div>' : "",
      showAnimations ? '<div class="seidr-settings-pane" id="seidr-settings-pane-animations" data-seidr-pane="animations"></div>' : "",
      showMaps ? '<div class="seidr-settings-pane" id="seidr-settings-pane-maps" data-seidr-pane="maps"></div>' : "",
      '<div class="seidr-settings-pane" id="seidr-settings-pane-about" data-seidr-pane="about"></div>'
    ].join("");
    if (showActions) {
      const actPane = $3("seidr-settings-pane-actions");
      if (actPane) seidrBuildActionsTab(actPane);
    }
    if (showCommands) {
      const cmdPane = $3("seidr-settings-pane-commands");
      if (cmdPane) seidrBuildCommandsTab(cmdPane);
    }
    if (showAnimations) {
      const animPane = $3("seidr-settings-pane-animations");
      if (animPane) seidrBuildAnimationsTab(animPane);
    }
    if (showMaps) {
      const mapsPane = $3("seidr-settings-pane-maps");
      if (mapsPane) seidrBuildMapsTab(mapsPane);
    }
    const aboutPane = $3("seidr-settings-pane-about");
    if (aboutPane) seidrBuildAboutTab(aboutPane);
    const tabRoot = tabs || body;
    tabRoot.querySelectorAll("[data-seidr-tab]").forEach(function(btn2) {
      btn2.addEventListener("click", function() {
        const tab = btn2.getAttribute("data-seidr-tab");
        if (tab) seidrSelectSettingsTab(tab);
      });
    });
  }
  function seidrSelectSettingsTab(tab) {
    const body = $3("seidr-settings-body");
    const tabs = $3("seidr-settings-tabs");
    if (!body || !tab) return;
    const tabRoot = tabs || body;
    tabRoot.querySelectorAll(".seidr-settings-tab").forEach(function(t) {
      t.classList.toggle("seidr-settings-tab-on", t.getAttribute("data-seidr-tab") === tab);
    });
    body.querySelectorAll(".seidr-settings-pane").forEach(function(p) {
      p.classList.toggle("seidr-settings-pane-on", p.getAttribute("data-seidr-pane") === tab);
    });
    if (tab === "maps") {
      try {
        seidrRefreshMapsTab();
      } catch (e) {
      }
    }
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
    const cn = $3("seidr-set-cluster-names");
    const fo = $3("seidr-set-fast-open");
    const fom = $3("seidr-set-fast-open-mod");
    const fos = $3("seidr-set-fast-open-slot");
    if (en) en.checked = !!s.roomManagerEnabled;
    if (qm) qm.checked = s.showQuickmenuButton !== false;
    if (pos) pos.value = s.launcherPosition;
    if (am) am.value = s.arousalBarMode;
    if (as) as.value = s.arousalBarScope;
    if (cn) cn.value = s.clusterNameMode || "hitbox";
    if (fo) fo.checked = s.fastOpenActionsEnabled !== false;
    if (fom) fom.value = s.fastOpenActionsModifier || "Shift";
    if (fos) fos.value = s.fastOpenActionsSlot || "ItemTorso";
    seidrBeginDrawDraft();
    seidrRefreshStorageUi();
    try {
      const bag = seidrGetCommandsBag();
      document.querySelectorAll("[data-seidr-cmd-en]").forEach(function(el) {
        const key = el.getAttribute("data-seidr-cmd-en");
        if (!key) return;
        el.checked = bag.enabled[key] !== false;
      });
      const fs = $3("seidr-set-fast-select");
      const fse = $3("seidr-set-fast-select-empty");
      if (fs) fs.checked = bag.fastSelectEnabled !== false;
      if (fse) fse.value = bag.fastSelectEmpty || "disabled";
      const keys = bag.fastSelectKeys || seidrNormalizeFastSelectKeys(null);
      document.querySelectorAll("[data-seidr-fs-key]").forEach(function(el) {
        const key = el.getAttribute("data-seidr-fs-key");
        if (!key) return;
        el.checked = keys[key] !== false;
      });
    } catch (e) {
    }
    if (Seidr.SHOW_ACTIONS !== false) seidrRefreshActionsTab();
    if (Seidr.SHOW_COMMANDS !== false) {
      seidrRefreshCommandsTab();
      seidrRefreshAnimationsTab();
    }
  }
  function seidrBindSettingsUi(onChange) {
    const en = $3("seidr-set-rm-enabled");
    const qm = $3("seidr-set-quickmenu");
    const pos = $3("seidr-set-rm-pos");
    const am = $3("seidr-set-arousal-mode");
    const ascope = $3("seidr-set-arousal-scope");
    const cn = $3("seidr-set-cluster-names");
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
        clusterNameMode: cn && cn.value ? cn.value : "hitbox",
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
    if (cn) cn.addEventListener("change", persist);
    if (fo) fo.addEventListener("change", persist);
    if (fos) fos.addEventListener("change", persist);
    if (fom) fom.addEventListener("change", persist);
    function persistCmdEnable() {
      const bag = seidrGetCommandsBag();
      const raw = {};
      document.querySelectorAll("[data-seidr-cmd-en]").forEach(function(el) {
        const key = el.getAttribute("data-seidr-cmd-en");
        if (!key) return;
        raw[key] = !!el.checked;
      });
      bag.enabled = seidrNormalizeCmdEnabled(raw);
      const fs = $3("seidr-set-fast-select");
      const fse = $3("seidr-set-fast-select-empty");
      if (fs) bag.fastSelectEnabled = !!fs.checked;
      if (fse) {
        bag.fastSelectEmpty = seidrNormalizeFastSelectEmpty(fse.value);
      }
      const keyRaw = {};
      document.querySelectorAll("[data-seidr-fs-key]").forEach(function(el) {
        const key = el.getAttribute("data-seidr-fs-key");
        if (!key) return;
        keyRaw[key] = !!el.checked;
      });
      bag.fastSelectKeys = seidrNormalizeFastSelectKeys(keyRaw);
      const saved = seidrSaveCommandsBag(bag);
      const msg = $3("seidr-set-cmd-en-msg");
      if (msg) msg.textContent = saved.ok ? "Saved \u2014 reload chat commands applied" : saved.error || "Save failed";
      try {
        if (typeof Seidr.registerCommands === "function") Seidr.registerCommands();
      } catch (e) {
      }
      if (onChange) onChange();
    }
    document.querySelectorAll("[data-seidr-cmd-en]").forEach(function(el) {
      el.addEventListener("change", persistCmdEnable);
    });
    document.querySelectorAll("[data-seidr-fs-key]").forEach(function(el) {
      el.addEventListener("change", persistCmdEnable);
    });
    const fsEl = $3("seidr-set-fast-select");
    const fseEl = $3("seidr-set-fast-select-empty");
    if (fsEl) fsEl.addEventListener("change", persistCmdEnable);
    if (fseEl) fseEl.addEventListener("change", persistCmdEnable);
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
    document.querySelectorAll(".seidr-settings-draw-row [data-seidr-num-dir]").forEach(function(btn2) {
      btn2.addEventListener("click", function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const wrap = btn2.closest(".seidr-num-wrap");
        const input = wrap ? wrap.querySelector('input[type="number"]') : null;
        if (!input) return;
        const dir = parseInt(btn2.getAttribute("data-seidr-num-dir") || "0", 10);
        if (!dir) return;
        const step = parseFloat(input.step) || 1;
        const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
        const max = input.max !== "" ? parseFloat(input.max) : Infinity;
        let n = parseFloat(input.value);
        if (!Number.isFinite(n)) n = 0;
        n = Math.round(n + dir * step);
        if (n < min) n = min;
        if (n > max) n = max;
        input.value = String(n);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
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
    if (typeof Seidr.stopTutorial === "function" && !(typeof Seidr.tourIsQuietClose === "function" && Seidr.tourIsQuietClose())) {
      try {
        Seidr.stopTutorial();
      } catch (e) {
      }
    }
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

  // src/settings/tutorial.ts
  var tourRoot = null;
  var tourHole = null;
  var tourCard = null;
  var tourIndex = 0;
  var tourSteps = [];
  var tourActive = false;
  var tourPrefill = null;
  var tourOnKey = null;
  var tourOnResize = null;
  var tourLayoutTimer = null;
  var tourQuietClose = false;
  function $4(sel) {
    return document.querySelector(sel);
  }
  function openDetails(tourId) {
    const el = $4('[data-seidr-tour="' + tourId + '"]');
    if (el && el.tagName === "DETAILS") el.open = true;
  }
  function closeOtherGeneralDetails(keepTourId) {
    const pane = document.getElementById("seidr-settings-pane-general");
    if (!pane) return;
    pane.querySelectorAll("details.seidr-settings-sec").forEach(function(d) {
      const det = d;
      const id = det.getAttribute("data-seidr-tour");
      det.open = id === keepTourId;
    });
  }
  function scrollTarget(el) {
    if (!el) return;
    const body = document.getElementById("seidr-settings-body");
    if (body && body.contains(el)) {
      const br = body.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      body.scrollTop += er.top - br.top - 16;
      return;
    }
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    } catch (e) {
      try {
        el.scrollIntoView(true);
      } catch (e2) {
      }
    }
  }
  function chatInput() {
    const el = document.getElementById("InputChat");
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
    return null;
  }
  function clearPrefill() {
    if (!tourPrefill) return;
    try {
      tourPrefill.el.value = tourPrefill.prev;
    } catch (e) {
    }
    tourPrefill = null;
  }
  function escapeHtml8(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ensureTourDom() {
    if (tourRoot && document.body.contains(tourRoot)) return;
    tourRoot = document.createElement("div");
    tourRoot.id = "seidr-tour";
    tourRoot.setAttribute("hidden", "true");
    tourRoot.innerHTML = [
      '<div class="seidr-tour-hole" aria-hidden="true"></div>',
      '<div class="seidr-tour-card" role="dialog" aria-modal="true">',
      '  <div class="seidr-tour-card-head">',
      '    <span class="seidr-tour-card-title"></span>',
      '    <span class="seidr-tour-card-step"></span>',
      "  </div>",
      '  <div class="seidr-tour-card-body"></div>',
      '  <div class="seidr-tour-card-actions">',
      '    <button type="button" class="seidr-act-btn" data-seidr-tour="skip">Skip</button>',
      '    <span class="seidr-tour-card-spacer"></span>',
      '    <button type="button" class="seidr-act-btn" data-seidr-tour="back">Back</button>',
      '    <button type="button" class="seidr-act-btn seidr-tour-primary" data-seidr-tour="next">Next</button>',
      "  </div>",
      "</div>"
    ].join("");
    document.body.appendChild(tourRoot);
    tourHole = tourRoot.querySelector(".seidr-tour-hole");
    tourCard = tourRoot.querySelector(".seidr-tour-card");
    tourRoot.querySelector('[data-seidr-tour="skip"]').addEventListener("click", function() {
      seidrStopTutorial();
    });
    tourRoot.querySelector('[data-seidr-tour="back"]').addEventListener("click", function() {
      seidrTourGo(-1);
    });
    tourRoot.querySelector('[data-seidr-tour="next"]').addEventListener("click", function() {
      seidrTourGo(1);
    });
  }
  function buildSteps() {
    const showActions = Seidr.SHOW_ACTIONS !== false;
    const showCommands = Seidr.SHOW_COMMANDS !== false;
    const showAnimations = Seidr.SHOW_COMMANDS !== false;
    const showMaps = rmIsShown();
    const steps = [
      {
        title: "Welcome",
        blocks: [
          "Seidr adds shared holds, undress, custom Activity Menu actions, animations, and chat commands on top of Bondage Club.",
          "Open this panel anytime with /seidr, or Preference \u2192 Extensions \u2192 Seidr.",
          "This short tour walks through the main settings and how chat autocomplete works. Skip anytime with Skip or Esc."
        ],
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("general");
        },
        target: function() {
          return document.getElementById("seidr-settings-panel");
        }
      },
      {
        title: "Holds & Undress",
        blocks: [
          "Holds live on Item Torso in the Club Activity menu: Pull Left, Pull Right, Cuddle, Remove Left/Right/Cuddle, and Leave.",
          "Pull slides someone beside you; Cuddle stacks them in front. Both of you need Seidr for the shared pose to sync.",
          "Undress activities appear on clothing zones (and Undress all when available). Echo cuddle/pull tokens make Seidr yield that hold so Echo can take over."
        ],
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("general");
        },
        target: function() {
          return document.getElementById("seidr-settings-tabs") || document.getElementById("seidr-settings-panel");
        }
      },
      {
        title: "Fast Open",
        blocks: [
          "Fast Open jumps straight into Club Activity View without hunting the character menu.",
          "Enable it, pick a keyboard modifier (Shift/Ctrl/Alt/Cmd) and a default Item* slot (e.g. Item Torso).",
          "Hold that modifier and click someone in the room. If FAM also uses Shift-click, pick a different modifier here."
        ],
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("general");
          closeOtherGeneralDetails("fast-open");
          openDetails("fast-open");
        },
        target: function() {
          const d = $4('[data-seidr-tour="fast-open"]');
          return d && d.querySelector("summary") || d;
        }
      },
      {
        title: "Command toggles",
        blocks: [
          "This General \u2192 Commands section turns each slash command on or off. Off means it is not registered and chat ignores it.",
          "Keep /seidr on so you can always reopen settings. /a, /strip, /poses, /animation, and /roommanager can be toggled to taste.",
          "Fast Select (when shown): type a letter then Tab to jump into a command. Empty Tab picks what bare Tab does. Last successful /a /strip /poses target is preferred in member autocomplete."
        ],
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("general");
          closeOtherGeneralDetails("commands-enable");
          openDetails("commands-enable");
        },
        target: function() {
          const d = $4('[data-seidr-tour="commands-enable"]');
          return d && d.querySelector("summary") || d;
        }
      },
      {
        title: "Commands \u2014 People",
        blocks: [
          "People are short aliases for Member Numbers. Add someone once, then type their alias in /a instead of the full number.",
          "Click Add person, set Alias (the name you type) and Member number, then Save person. Pick existing entries from the Person dropdown to edit or delete.",
          "Aliases also help when several people share a display name \u2014 Seidr resolves the Member ID you saved."
        ],
        when: function() {
          return showCommands;
        },
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("commands");
          const people = $4('[data-seidr-tour="cmd-people"]');
          const actions = $4('[data-seidr-tour="cmd-actions"]');
          if (people) people.open = true;
          if (actions) actions.open = false;
        },
        target: function() {
          const d = $4('[data-seidr-tour="cmd-people"]');
          return d && d.querySelector("summary") || d || document.getElementById("seidr-settings-pane-commands");
        }
      },
      {
        title: "Commands \u2014 Actions",
        blocks: [
          "Actions are named shortcuts to a Club / Seidr / mod activity on a body slot. You call them with /a <person> <action-name>.",
          "Click Add action, then set: Name (what you type after the person), Slot (e.g. ItemTorso), and Activity (the menu entry on that slot). Save action when done.",
          "Pick Slot first \u2014 the Activity list only shows what that zone can run. Edit or delete via the Action dropdown. /strip and /poses do not need these bindings."
        ],
        when: function() {
          return showCommands;
        },
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("commands");
          const people = $4('[data-seidr-tour="cmd-people"]');
          const actions = $4('[data-seidr-tour="cmd-actions"]');
          if (people) people.open = false;
          if (actions) actions.open = true;
        },
        target: function() {
          const d = $4('[data-seidr-tour="cmd-actions"]');
          return d && d.querySelector("summary") || d || document.getElementById("seidr-settings-pane-commands");
        }
      },
      {
        title: "Autocomplete",
        blocks: [
          "In chat, type /a then space and press Tab. A list of people (aliases + room) appears; arrows or W/S move, Enter or E accepts, Esc closes.",
          "After a person, Tab again for your saved Actions. The same Tab flow works for /strip, /poses (/p), and /animation (/ani).",
          "Fast Select: with a letter then Tab (when enabled) you jump into that command. A sample /a  is prefilled \u2014 do not send; Next clears it."
        ],
        prepare: function() {
          clearPrefill();
          tourQuietClose = true;
          try {
            seidrCloseSettings();
          } finally {
            tourQuietClose = false;
          }
          const input = chatInput();
          if (input) {
            tourPrefill = { el: input, prev: input.value || "" };
            input.value = "/a ";
            try {
              input.focus();
            } catch (e) {
            }
          }
        },
        target: function() {
          return chatInput() || document.getElementById("InputChat");
        },
        cleanup: function() {
          clearPrefill();
        }
      },
      {
        title: "Actions tab",
        blocks: [
          "Custom Actions appear in the Club Activity Menu (up to 50). They are separate from Commands \u2192 Actions (those are /a shortcuts).",
          "Each entry can have chat lines, audience conditions, icons, sound, pose, and arousal effects. Use the dropdown to pick an entry; Save when you edit.",
          "Export / import shares your bag with another character or friend. See About \u2192 Custom Actions docs for the full condition list."
        ],
        when: function() {
          return showActions;
        },
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("actions");
        },
        target: function() {
          return document.querySelector('[data-seidr-tab="actions"]') || document.getElementById("seidr-settings-pane-actions");
        }
      },
      {
        title: "Animations",
        blocks: [
          "Animations are pose and expression clips that play on you (not room-synced poses for others).",
          "Author clips under this tab \u2014 frames, timing, face expressions. Give each a clear name.",
          "Play with /animation <name> or /ani <name>. Tab autocomplete lists names you defined."
        ],
        when: function() {
          return showAnimations;
        },
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("animations");
        },
        target: function() {
          return document.querySelector('[data-seidr-tab="animations"]') || document.getElementById("seidr-settings-pane-animations");
        }
      },
      {
        title: "Maps",
        blocks: [
          "When Room Manager is active, Maps holds map versions and related presets for building or restoring rooms.",
          "Default may sync through ExtensionSettings; other named versions stay in localStorage on this browser.",
          "Use Room Manager (\u2302 or ChatAdmin) to apply backgrounds, access lists, and map series \u2014 this tab is storage and version control."
        ],
        when: function() {
          return showMaps;
        },
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("maps");
        },
        target: function() {
          return document.querySelector('[data-seidr-tab="maps"]') || document.getElementById("seidr-settings-pane-maps");
        }
      },
      {
        title: "Done",
        blocks: [
          "About has docs links and feature summaries. Run Tutorial again anytime from About \u2192 Tutorial.",
          "Quick reminders: /seidr opens settings; holds need Seidr on both sides; /a uses People + Actions you set up.",
          "Enjoy Seidr."
        ],
        prepare: function() {
          seidrOpenSettings();
          seidrSelectSettingsTab("about");
        },
        target: function() {
          return document.querySelector('[data-seidr-tab="about"]') || document.getElementById("seidr-settings-pane-about");
        }
      }
    ];
    return steps.filter(function(s) {
      return !s.when || s.when();
    });
  }
  function positionHole(el) {
    if (!tourHole) return;
    if (!el) {
      tourHole.style.display = "none";
      return;
    }
    const pad = 6;
    const r = el.getBoundingClientRect();
    const maxH = Math.min(window.innerHeight * 0.42, 280);
    const top = Math.max(4, r.top - pad);
    const left = Math.max(4, r.left - pad);
    const width = Math.min(window.innerWidth - left - 4, Math.max(40, r.width + pad * 2));
    let height = Math.max(28, r.height + pad * 2);
    if (height > maxH) height = maxH;
    if (top + height > window.innerHeight - 4) {
      height = Math.max(28, window.innerHeight - 4 - top);
    }
    tourHole.style.display = "block";
    tourHole.style.left = left + "px";
    tourHole.style.top = top + "px";
    tourHole.style.width = width + "px";
    tourHole.style.height = height + "px";
  }
  function positionCard(el) {
    if (!tourCard) return;
    const margin = 14;
    const cw = tourCard.offsetWidth || 380;
    const ch = tourCard.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = (vw - cw) / 2;
    let top = Math.max(8, vh - ch - 20);
    if (el) {
      const r = el.getBoundingClientRect();
      const holeBottom = Math.min(r.bottom, (parseFloat(tourHole?.style.top || "0") || r.top) + (parseFloat(tourHole?.style.height || "0") || r.height));
      const holeTop = Math.max(r.top, parseFloat(tourHole?.style.top || String(r.top)) || r.top);
      const below = holeBottom + margin;
      const above = holeTop - ch - margin;
      if (below + ch <= vh - 8) top = below;
      else if (above >= 8) top = above;
      else top = Math.min(vh - ch - 8, Math.max(8, (vh - ch) / 2));
      left = Math.min(vw - cw - 8, Math.max(8, r.left));
      if (left + cw > vw - 8) left = Math.max(8, vw - cw - 8);
    }
    tourCard.style.left = left + "px";
    tourCard.style.top = top + "px";
  }
  function layoutSpotlight(step) {
    const target = step.target ? step.target() : null;
    scrollTarget(target);
    positionHole(target);
    positionCard(target);
    if (tourLayoutTimer) clearTimeout(tourLayoutTimer);
    tourLayoutTimer = setTimeout(function() {
      tourLayoutTimer = null;
      if (!tourActive) return;
      const t2 = step.target ? step.target() : null;
      scrollTarget(t2);
      positionHole(t2);
      positionCard(t2);
    }, 80);
  }
  function renderStep() {
    if (!tourActive || !tourRoot || !tourCard) return;
    const step = tourSteps[tourIndex];
    if (!step) {
      seidrStopTutorial();
      return;
    }
    if (step.prepare) {
      try {
        step.prepare();
      } catch (e) {
        console.warn("[Seidr] tour step", e);
      }
    }
    const title = tourCard.querySelector(".seidr-tour-card-title");
    const body = tourCard.querySelector(".seidr-tour-card-body");
    const stepEl = tourCard.querySelector(".seidr-tour-card-step");
    const nextBtn = tourCard.querySelector('[data-seidr-tour="next"]');
    const backBtn = tourCard.querySelector('[data-seidr-tour="back"]');
    if (title) title.textContent = step.title;
    if (body) {
      body.innerHTML = (step.blocks || []).map(function(b) {
        return '<p class="seidr-tour-card-block">' + escapeHtml8(b) + "</p>";
      }).join("");
    }
    if (stepEl) stepEl.textContent = tourIndex + 1 + " / " + tourSteps.length;
    if (backBtn) backBtn.disabled = tourIndex <= 0;
    if (nextBtn) nextBtn.textContent = tourIndex >= tourSteps.length - 1 ? "Finish" : "Next";
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        layoutSpotlight(step);
      });
    });
  }
  function seidrTourGo(delta) {
    if (!tourActive) return;
    const next = tourIndex + delta;
    if (next < 0) return;
    if (next >= tourSteps.length) {
      seidrStopTutorial();
      return;
    }
    const leaving = tourSteps[tourIndex];
    if (leaving && leaving.cleanup) {
      try {
        leaving.cleanup();
      } catch (e) {
      }
    }
    tourIndex = next;
    renderStep();
  }
  function seidrTourIsQuietClose() {
    return tourQuietClose;
  }
  function seidrStopTutorial() {
    if (!tourActive && !tourRoot) return;
    tourActive = false;
    const step = tourSteps[tourIndex];
    if (step && step.cleanup) {
      try {
        step.cleanup();
      } catch (e) {
      }
    }
    clearPrefill();
    tourQuietClose = false;
    tourSteps = [];
    tourIndex = 0;
    if (tourLayoutTimer) {
      clearTimeout(tourLayoutTimer);
      tourLayoutTimer = null;
    }
    if (tourOnKey) {
      document.removeEventListener("keydown", tourOnKey, true);
      tourOnKey = null;
    }
    if (tourOnResize) {
      window.removeEventListener("resize", tourOnResize);
      tourOnResize = null;
    }
    if (tourRoot) {
      tourRoot.setAttribute("hidden", "true");
    }
  }
  function seidrStartTutorial() {
    seidrStopTutorial();
    ensureTourDom();
    if (!tourRoot) return;
    tourSteps = buildSteps();
    if (!tourSteps.length) return;
    tourActive = true;
    tourIndex = 0;
    tourRoot.removeAttribute("hidden");
    tourOnKey = function(ev) {
      if (!tourActive) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        seidrStopTutorial();
        return;
      }
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        seidrTourGo(1);
      }
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        seidrTourGo(-1);
      }
    };
    document.addEventListener("keydown", tourOnKey, true);
    tourOnResize = function() {
      if (!tourActive) return;
      const step = tourSteps[tourIndex];
      if (step) layoutSpotlight(step);
    };
    window.addEventListener("resize", tourOnResize);
    renderStep();
  }
  Seidr.startTutorial = seidrStartTutorial;
  Seidr.stopTutorial = seidrStopTutorial;
  Seidr.tourIsQuietClose = seidrTourIsQuietClose;

  // src/settings/welcome.ts
  var WELCOME_MS = 0;
  var WELCOME_DEFER_MS = 400;
  var seidrWelcomeHooked = false;
  var seidrWelcomeTimer = null;
  function escapeHtml9(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function seidrInLiveChatRoom() {
    try {
      if (typeof ServerPlayerIsInChatRoom === "function" && !ServerPlayerIsInChatRoom()) return false;
    } catch (e) {
      return false;
    }
    try {
      if (typeof CurrentScreen === "string" && CurrentScreen !== "ChatRoom") return false;
    } catch (e) {
    }
    if (typeof ChatRoomSendLocal !== "function") return false;
    if (!document.getElementById("TextChat") && !document.getElementById("TextAreaChatLog") && !document.getElementById("ChatRoomChatLog")) {
      return false;
    }
    return true;
  }
  function seidrWelcomeHtml() {
    const text = "Welcome to Seidr. Holds (pull/cuddle), undress, custom actions, animations, and chat commands live here. Open settings with /seidr. For a guided walkthrough, open About \u2192 Tutorial.";
    return '<span style="color:#d4a017;">[Seidr]</span> <span style="color:#f0e6d4;">' + escapeHtml9(text) + "</span>";
  }
  function seidrMaybeSendWelcome() {
    try {
      if (seidrGetSettings().welcomeLocalSeen) return;
      if (!seidrInLiveChatRoom()) return;
      ChatRoomSendLocal(seidrWelcomeHtml(), WELCOME_MS);
      seidrSaveSettings({ welcomeLocalSeen: true });
    } catch (e) {
      console.warn("[Seidr] welcome", e);
    }
  }
  function seidrScheduleWelcome() {
    try {
      if (seidrGetSettings().welcomeLocalSeen) return;
    } catch (e) {
      return;
    }
    if (seidrWelcomeTimer) clearTimeout(seidrWelcomeTimer);
    seidrWelcomeTimer = setTimeout(function() {
      seidrWelcomeTimer = null;
      seidrMaybeSendWelcome();
    }, WELCOME_DEFER_MS);
  }
  function seidrInstallWelcome() {
    if (seidrWelcomeHooked) return;
    seidrWelcomeHooked = true;
    if (typeof Seidr.hookFunction === "function") {
      Seidr.hookFunction("ChatRoomSync", 8, function(args, next) {
        const result = next(args);
        try {
          seidrScheduleWelcome();
        } catch (e) {
        }
        return result;
      });
    }
    if (typeof Seidr.tryHook === "function") {
      Seidr.tryHook("ChatRoomLoad", "ChatRoomLoad", 8, function(args, next) {
        const result = next(args);
        try {
          seidrScheduleWelcome();
        } catch (e) {
        }
        return result;
      });
    }
    try {
      seidrScheduleWelcome();
    } catch (e) {
    }
  }
  Seidr.maybeSendWelcome = seidrMaybeSendWelcome;
  Seidr.installWelcome = seidrInstallWelcome;

  // src/settings/index.ts
  function installSeidrSettings() {
    try {
      seidrLoadCommittedDrawOffsets();
    } catch (e) {
    }
    seidrRegisterPreference();
    try {
      seidrInstallWelcome();
    } catch (e) {
    }
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
    ["seidr-styles", "seidr-loaded", "seidr-rm-styles", "seidr-settings-styles", "seidr-cmd-styles"].forEach(function(id) {
      const node = document.getElementById(id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    ["seidr-rm-root", "seidr-settings-root", "seidr-cmd-ac", "seidr-tour"].forEach(function(id) {
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
    if (typeof Seidr.installCommands === "function") {
      try {
        Seidr.installCommands();
      } catch (e) {
        console.warn("[Seidr] Commands", e);
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
      if (typeof Seidr.syncRequest === "function") {
        try {
          Seidr.syncRequest();
        } catch (eSync) {
        }
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
