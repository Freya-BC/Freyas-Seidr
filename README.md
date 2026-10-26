# Seidr

![Seidr](assets/freyas-seidr-logo.png)

**Seidr** is a Bondage Club plugin for holds, undress, custom Activity Menu actions, room admin tools, and related quality-of-life settings. Hold poses sync between Seidr peers; activity chat lines stay readable for everyone in the room, including clients without the mod.

| | |
|---|---|
| **Version** | 1.0.44 |
| **Author** | Freya |
| **Pages** | https://freya-bc.github.io/Freyas-Seidr/ |
| **FUSAM loader** | https://freya-bc.github.io/Freyas-Seidr/loader.js |

---

## Table of contents

1. [Install](#install)
2. [Feature overview](#feature-overview)
3. [Holds](#holds)
4. [Undress](#undress)
5. [Custom Actions](#custom-actions)
6. [Fast Open](#fast-open)
7. [Room Manager](#room-manager)
8. [Settings](#settings)
9. [Echo coexistence](#echo-coexistence)
10. [Storage](#storage)
11. [Build (maintainers)](#build-maintainers)
12. [Detailed docs](#detailed-docs)

---

## Install

Use **one** of these after you are logged into Bondage Club:

| Method | How |
|--------|-----|
| **Bookmark (recommended)** | Copy the one-line `javascript:` URL from [`bookmark.js`](bookmark.js) into a browser bookmark. Click it in Club after login. Loads Pages: `seidr.js`. Click again after an update to reload. |
| **Tampermonkey** | Install [`seidr.user.js`](seidr.user.js), reload Club, log in. |
| **FUSAM** | Add [`loader.js`](loader.js) / see [`fusam-entry.json`](fusam-entry.json). Loads sibling `seidr.js` after login. |

Requires a ModSDK host such as **BCX** (hooks go through ModSDK; do not rely on raw Club wraps).

Open **Preference → Extensions → Seidr** (Seidr logo) for the settings panel.

---

## Feature overview

| Area | What it does |
|------|----------------|
| **Holds** | Pull Left / Right, Cuddle, Remove, Leave on Item Torso — shared poses for Seidr peers |
| **Undress** | Clothing-zone activities; Echo layers / “undress all” when those groups exist |
| **Custom Actions** | Up to 50 user activities in the Club Activity Menu (chat, conditions, icons, export/import) |
| **Fast Open** | Modifier-click a character to open Activity View on a chosen Item\* slot |
| **Room Manager** | Admin panel: room defs, access lists, backgrounds, maps |
| **Drawing** | Pull / cuddle visual spacing (models only; hitboxes stay put) |
| **Arousal bars** | Hide / relocate Club (and BCTweaks) arousal meters |
| **Storage** | Compressed ExtensionSettings bag with usage breakdown |

---

## Holds

Open another character → **Item Torso** → **Activities**:

| Activity | Effect |
|----------|--------|
| **Pull Left** / **Pull Right** | Place them on that side. One person per slot; a new pull into a filled slot releases the previous person. |
| **Cuddle** | Close hold. Does not clear left/right. |
| **Remove Left / Right / Cuddle** | Clear that person from your slot. |
| **Leave** | Step out of someone else’s hold. |

- Gold **L / R / C** marks show who fills a slot; the shared button is outlined.
- Hands are **not** required for holds / remove / leave.
- **Both people need Seidr** for the shared pose. Without Seidr you still see chat lines and the normal lineup.
- Hitboxes and status stay on natural seats; only the drawn models use pull/cuddle offsets.

More detail: [`docs/HOLDS.md`](docs/HOLDS.md).

---

## Undress

Open the clothing zone for that slot (e.g. Item Torso for upper clothes, Item Boots for shoes). When the target wears that layer and you can change their clothes:

- An **Undress …** activity appears (label uses the worn item name).
- Hands are required.
- The target does **not** need Seidr. Chat is visible to the whole room.
- Echo extra layers (`_笨笨蛋Luzi`, `_笨笨笨蛋Luzi2`) appear only when those AssetGroups exist.
- When Echo adds a second layer for a family, **Undress all {family}** removes every layer in that family at once.

More detail: [`docs/UNDRESS.md`](docs/UNDRESS.md).

---

## Custom Actions

Author under **Settings → Actions**. Actions appear in the **Club Activity Menu** (not a separate floating palette).

- Up to **50** actions (`n/50` in the UI).
- **Other** / **Self** chat lines (max 500 characters) with Club token chips (`SourceCharacter`, `TargetCharacter`, `ActivityAsset`, …).
- Optional **items allowlist** (restraint catalog, max 12) — action only shows if the acted character wears a listed item.
- Optional **arousal** via a Club activity template (off by default).
- **Conditions** (OR of AND groups): wearing, gagged, blind, hands, pose access, anatomy, audience, …
- **Effects**: sound (Seidr peers + vanilla spank cue), pose.
- **Icons**: Seidr builtins, Club Activity icons, or up to 10 custom HTTPS URLs.
- **Export / Import** clipboard envelopes (`SeidrAct1:` + LZ).

More detail: [`docs/ACTIONS.md`](docs/ACTIONS.md).

---

## Fast Open

**Settings → General → Fast Open Actions** (on by default):

- Hold a modifier (**Shift** / Ctrl / Alt / Cmd) and click a character in the room.
- Opens Club Activity View on a preferred Item\* slot (default **ItemTorso**), then Activities mode.
- If Freyas Action Manager also uses Shift-click, FAM wins when both are loaded.

---

## Room Manager

For **room admins** (and on ChatAdmin create/edit):

| Entry | |
|-------|--|
| Chat room | Floating **⌂** (position from Settings; drag for this session) |
| ChatAdmin | Icon button near Club Save / BCX “More” |
| Settings | **Open Room Manager** |

**Areas:**

1. **Room Definition** — name, description, size, language, block categories, game, visibility, access mode, map mode.
2. **Room Access** — named Admin / Whitelist / Ban lists.
3. **Backgrounds** — named URL library with preview thumbs (thumbs stay in browser localStorage only).
4. **Maps** — when MapMode ≠ Never; up to 10 slots; export/import style strings.

**Load** applies live updates when you are admin in a room, or fills ChatAdmin fields while creating. Save / Overwrite / Delete work from the panel anytime the bag can be written.

More detail: [`docs/ROOM_MANAGER.md`](docs/ROOM_MANAGER.md).

---

## Settings

**Preference → Extensions → Seidr**

### General

| Section | Options |
|---------|---------|
| **Fast Open Actions** | Enable, modifier, default Item\* slot |
| **Room Manager** | Activate master switch, show quickmenu ⌂, open panel |
| **Launcher position** | Top/Bottom/Middle × Left/Right, Chat Left / Top / Bottom |
| **Drawing** | Pull X/Y and Cuddle X/Y offsets (−400…400). Models only — Save Drawing to keep |
| **Arousal bars** | Mode: Club default / Always hide / Show on change (1s) / Bottom bar. Scope: Self / Seidr holds / Everyone |
| **Storage** | Live KB usage vs ~180 KB cap; per-slice breakdown |

### Actions

Full editor for custom Activity Menu entries (see [Custom Actions](#custom-actions)).

More detail: [`docs/SETTINGS.md`](docs/SETTINGS.md).

---

## Echo coexistence

- Echo cuddle / pull tokens hide Seidr hold activities while those tokens are present.
- If Echo takes you (or someone you hold), Seidr **yields**: that hold clears and peers snap back.
- Bed and other Echo poses are left alone. Drawing offsets are Echo-style pair spacing only.

---

## Storage

Almost all Seidr data lives in one synced bag:

`Player.ExtensionSettings.SeidrRoomManager` (LZ-compressed)

| Soft limits | |
|-------------|--|
| Total bag | ~180 KB compressed |
| Maps share | at most **75%** of that budget |
| Named maps | ≤ 10 |
| Custom actions | ≤ 50 |
| Custom action icon URLs | ≤ 10 |

Background **preview thumbnails** use browser localStorage only (not the synced bag).

Room Manager footer and **Settings → Storage** show usage. Saving when full is refused with an error; delete or shrink data, then try again.

---

## Build (maintainers)

```bash
npm install
npm run build    # typecheck + esbuild + install artifacts
```

Requires Node 18+. Source is TypeScript under `src/` with `bc-stubs`. Public Releases are published to this repo’s GitHub Pages (`seidr.js` / `loader.js`).

---

## Detailed docs

| Doc | Topic |
|-----|--------|
| [`docs/HOLDS.md`](docs/HOLDS.md) | Pull / cuddle / remove / leave, badges, peers |
| [`docs/UNDRESS.md`](docs/UNDRESS.md) | Clothing undress + Echo layers |
| [`docs/ACTIONS.md`](docs/ACTIONS.md) | Custom Activity Menu actions |
| [`docs/ROOM_MANAGER.md`](docs/ROOM_MANAGER.md) | Admin room / access / backgrounds / maps |
| [`docs/SETTINGS.md`](docs/SETTINGS.md) | Preference panel reference |

---

Not Freyas Seidr (the older Preference hub) and not Freyas Action Manager — Seidr is its own plugin. Load alongside BCX; manage overlapping Shift-click / map tools yourself if you also run FAM or Freyas Better Maps.
