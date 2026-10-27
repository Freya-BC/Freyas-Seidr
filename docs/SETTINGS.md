# Settings

Open **Preference → Extensions → Seidr** (Seidr logo). The panel returns you to the game after opening (same pattern as Freyas Better Maps).

Tabs: **General** | **Actions** | **Commands** | **Animations** | **Maps** | **About**.

---

## General

### Fast Open Actions

| Option | Default | Meaning |
|--------|---------|---------|
| Enable | On | Modifier-click a room character opens Club Activity View |
| Modifier | Shift | Shift / Ctrl / Alt / Cmd (Meta) |
| Slot | ItemTorso | Preferred Item\* zone before switching to Activities mode |

If Freyas Action Manager is also loaded and uses Shift-click, FAM’s handler wins when both bind Shift.

### Room Manager

| Option | Default | Meaning |
|--------|---------|---------|
| Activate Room Manager | On | Master switch (floating ⌂ + ChatAdmin button) |
| Show Quickmenu Button | On | Floating ⌂ in ChatRoom; off hides it completely |
| Open Room Manager | — | Opens the admin panel from Settings |

Details: [ROOM_MANAGER.md](ROOM_MANAGER.md).

### Launcher position

Default placement of the floating ⌂:

- Top / Bottom / Middle × Left / Right  
- **Chat Left**, **Chat Top**, **Chat Bottom** — sit left of the chat window edge  

Drag still overrides for the current session.

### Drawing

Echo-style **model** spacing for holds (hitboxes do not move):

| Control | Role |
|---------|------|
| Pull X | Half-gap from center (hub shifts on one-side pull) |
| Pull Y | Raises both sides |
| Cuddle X / Y | Moves the holder |

Range −400…400 (Pull X stored as non-negative magnitude). Use the up/down steppers or type values to preview; click **Save Drawing** to persist.

### Commands (enable toggles)

Collapsible **Commands** block on General: enable or disable each Seidr slash tag (`/a`, `/action`, `/strip`, `/stripe`, `/poses`, `/p`, `/animation`, `/ani`, `/seidr`, `/roommanager`). Off = not registered / ignored. Details: [COMMANDS.md](COMMANDS.md).

### Arousal bars

Controls Club / BCTweaks on-character thermometers and orgasm tracks.

| Mode | Behaviour |
|------|-----------|
| **Club default** | No Seidr override |
| **Always hide** | Hide meters for the chosen scope |
| **Show on change** | Show when arousal moves; hide ~1s after |
| **Bottom bar** | Draw under each name inside the character hitbox (two slots; BCTweaks can fill both) |

| Scope | Who is affected |
|-------|-----------------|
| **Self only** | You |
| **Seidr holds** | You and people in your Seidr hold cluster |
| **Everyone** | All characters drawn in the room |

“Seidr holds” means hub, pull left/right, or cuddle involvement.

### Storage

Read-only usage for the synced ExtensionSettings bag:

- Total compressed size vs ~180 KB soft cap (+ thin progress bar)  
- Rows: **Maps** (remote only), **Rooms**, **Access**, **Backgrounds**, **Actions**, **Commands**, **Animations**, **Settings**, **UI**  
- Maps **75%** budget line (+ local maps note when present)  

Refreshes when you open / refresh Settings. See README **Storage**.

---

## Maps tab

Manage Room Manager map **series** and **versions** (collapsible **Map** and **Export / Import**):

- Save the current map room as a new map — version is always **Default** (disabled outside a map room)  
- Only **Default** can sync to the server; other versions (e.g. Development) are local-only  
- Toggle **Remote** vs **Local only** for Default; **Overwrite Default**; Save new version; Load / Delete  
- Export JSON (copy / download); **Choose file…** or paste — imports are **always Local only**  

Details: [ROOM_MANAGER.md](ROOM_MANAGER.md).

---

## Actions tab

Full editor for custom Activity Menu entries: list, chat, items, conditions, arousal template, sound, pose, icons, export/import.

See [ACTIONS.md](ACTIONS.md).

---

## Commands tab

Chat slash-command setup (`/a` / `/action` bindings + People aliases). Pose / animation / undress / meta commands do not need rows here — they use built-in lists or the Animations tab.

### People

- **Add person** → dropdown of saved people → editor underneath  
- **Alias** + **Member ID** (text) → **Save person** / **Delete**  
- Used for `/a` (and other member) targets and to disambiguate duplicate room names  

### Actions

- **Add action** → dropdown of saved bindings → editor underneath (same pattern as the Actions tab)  
- **Call name** (what you type in chat)  
- **Slot** dropdown, then **Activity** dropdown for that slot (Club / Seidr / mods)  
- **Save action** / **Delete**  

In the chat box, **Tab** opens autocomplete for Seidr commands. Details: [COMMANDS.md](COMMANDS.md).

These `/a` bindings are separate from the **Actions** tab (Activity Menu).

---

## Animations tab

Author pose/face clips for the local Player (up to 50). Play with `/animation` / `/ani`. See [ANIMATIONS.md](ANIMATIONS.md).

---

## About tab

Plugin identity and documentation links:

- **Version** (matches the loaded Seidr build) and **Developer** (Freya)  
- Buttons to the Pages documentation home and the GitHub repo  
- Short feature blurbs (Holds, Undress, Actions, Animations, Commands, Fast Open, Room Manager, Maps, Drawing/Arousal/Storage) each with **More** → opens the matching Pages markdown guide in a new tab  

---

## Where settings are stored

All of the above (except background preview thumbs and **local-only** map versions) persist in:

`Player.ExtensionSettings.SeidrRoomManager`

Synced with your BC account via Club ExtensionSettings. Preview thumbnails for Room Manager backgrounds and local-only map versions use **localStorage**.
