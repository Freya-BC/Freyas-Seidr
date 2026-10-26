# Room Manager

FAM-style HTML panel for **room admins**: save and load room definitions, access lists, custom backgrounds, and map payloads.

## How to open

| Context | Launcher |
|---------|----------|
| Chat room as admin | Floating **⌂** (Settings position; drag moves it for this session only) |
| ChatAdmin create / edit | Club-sized icon next to BCX “More” (`Icons/Preference.png`) |
| Anywhere | **Preference → Extensions → Seidr → Room Manager → Open Room Manager** |

The floating ⌂ is hidden on non-room screens, while a character dialog is open (`CurrentCharacter` set), or when **Show Quickmenu Button** / **Activate Room Manager** is off in Settings.

**Load** buttons work only on `ChatRoom` or `ChatAdmin`. Outside those screens you can still Save / Overwrite / Delete / Edit stored presets.

## Apply modes

| Mode | What Load does |
|------|----------------|
| **Creating** (ChatAdmin, not in a room) | Fills Club editor fields / `ChatAdminData` only — you still Save in Club |
| **Live room** (you are admin) | Applies values and sends Club `ChatRoomAdmin` **Update** |

## Areas

### 1. Room Definition

Named presets for room metadata, including:

- Name, Description, Size, Language  
- Block categories, Game, Visibility, Access mode  
- Map mode  

**Save as…** / **Overwrite** / **Load** / **Delete** with overwrite confirms where needed.

### 2. Room Access

Named **Admin**, **Whitelist**, and **Ban** member lists. Load applies lists and updates the live room when you are admin.

### 3. Backgrounds

Library of **name + URL** entries:

- Multi-row wrapping grid  
- Filter by name  
- Hover **Load** / **Edit**  
- Preview thumbnails cached in **browser localStorage only** (not synced)  

URLs must pass Club’s background validator and load as images.

### 4. Maps

Visible when the room’s MapMode is not Never:

- Up to **10** named maps  
- Save current map / overwrite / load / delete with confirms  
- Uses FBM-style export / import strings under the hood  
- Maps may use at most **75%** of the shared storage budget (~180 KB total bag)

## Settings that affect Room Manager

| Setting | Default | Role |
|---------|---------|------|
| Activate Room Manager | On | Master switch for ⌂ and ChatAdmin button |
| Show Quickmenu Button | On | Floating ⌂ in the chat room |
| Launcher position | Chat Top | Default placement (left of chat edge for Chat positions) |

See [SETTINGS.md](SETTINGS.md).

## Storage

Presets and maps are stored in `Player.ExtensionSettings.SeidrRoomManager` (LZ) and synced with your account. Soft cap ~180 KB compressed. The panel footer shows usage; Settings → **Storage** breaks it down by slice.

If a save would exceed the maps budget or the total cap, Seidr refuses the write and shows an error — nothing is synced until you free space.

## Related

- [SETTINGS.md](SETTINGS.md) — Storage breakdown  
- [README.md](../README.md) — Feature overview  
