# Chat Commands

Run Seidr helpers from the Club chat box with short slash commands. Each command can be turned on or off under **Settings → General → Commands**. Open Settings with **`/seidr`**.

![Commands flow](../assets/docs/commands-flow.png)

![Commands tab](../assets/docs/settings-commands.png)

| Command | Purpose |
|---------|---------|
| **`/a`** / **`/action`** | Your custom bindings from **Settings → Commands → Actions** |
| **`/stripe`** | Undress **one** clothing layer (Seidr undress list, individuals only) |
| **`/strip`** | Same individuals **plus** **Undress all {family}** when available |
| **`/poses`** / **`/p`** | Set a Club pose on a room member (or yourself) |
| **`/animation`** / **`/ani`** | Play one of **your** Animations (local Player only) |
| **`/seidr`** | Open Seidr Settings |
| **`/roommanager`** | Open Room Manager (when activated) |

**Important:** **Commands → Actions** (this page) are chat shortcuts for `/a`. **Settings → Actions** is a different feature — custom entries in the Club Activity Menu. See [ACTIONS.md](ACTIONS.md).

---

## Setup checklist — People

![People](../assets/docs/settings-commands-people.png)

People store a short **alias** for a Member Number so you do not have to type IDs, and so duplicate nicknames resolve correctly.

1. Open **`/seidr`** → **Commands** tab.
2. Under **People**, click **Add person**.
3. Set **Alias** (what you will type, e.g. `Alice`) and **Member ID**.
4. Click **Save person**.
5. Later: pick someone from the Person dropdown to edit or **Delete**.

Max **50** people. You can still target anyone in the room by Name/Nickname or raw Member ID without saving them here.

---

## Setup checklist — Commands → Actions

![Commands → Actions](../assets/docs/settings-commands-actions.png)

These bindings power `/a <person> <action-name>`.

1. Still on the **Commands** tab, open **Actions**.
2. Click **Add action**.
3. Set a **call name** (what you type after the person, e.g. `kiss`).
4. Pick **Slot** first (body/clothing zone), then **Activity** for that slot (list refreshes after Slot).
5. Click **Save action**.

You can bind a call name to a stock Club activity, a Seidr hold/undress, a custom Activity Menu action, or another mod’s activity — as long as it appears for that slot. Max **50**.

`/strip`, `/poses`, `/animation`, and `/seidr` do **not** need rows here.

---

## Quick start — custom `/a`

After People (optional) and Actions are saved:

```
/a 12345 kiss
/a Alice kiss
/a "Long Nick" kiss
/action Alice kiss
```

`/a` and `/action` are the same command family (separate enable toggles).

Press **Tab** after `/a ` to pick a member, then Tab again for your action names.

---

## Quick start — undress `/strip` / `/stripe`

No Settings binding needed — Seidr uses its built-in undress activities.

```
/stripe Alice Shoes
/strip Alice Cloth
/strip Alice all:Cloth
/stripe 12345 Bra
```

| Command | Tab autocomplete shows |
|---------|-------------------------|
| **`/stripe`** | Individual worn layers you can undress right now |
| **`/strip`** | Those layers **and** **Undress all …** bundles (insert as `all:Cloth`, etc.) |

Hands and Club clothing permission still apply. See [UNDRESS.md](UNDRESS.md).

---

## Quick start — poses `/poses` / `/p`

```
/poses Alice Kneel
/p me Hands up
/p 12345 Standing (legs)
```

- Member rules match `/a` (ID, People alias, room Name/Nickname, quotes for multi-word).
- Pose names use the shared Seidr pose catalog (friendly labels in autocomplete).
- Struggle/aided lower poses still appear (e.g. **Kneel** while wearing a leg binder), matching Club’s pose menu.
- You need Club permission to change someone else’s pose.
- After a successful pose change, Seidr posts a **public Action** line (unique Self/Other text per pose, with Club-style names/pronouns).

---

## Quick start — animations `/animation` / `/ani`

```
/animation wave
/ani wave
```

Plays a clip from **Settings → Animations** on **you** only. See [ANIMATIONS.md](ANIMATIONS.md).

---

## Meta

```
/seidr
/roommanager
```

`/roommanager` requires **Activate Room Manager** in Settings → General.

---

## Syntax reference

### `/a` / `/action`

```
/a <member> <action>
```

| Part | What you can type |
|------|-------------------|
| **member** | Member ID, a **People** alias, or room **Name** / **Nickname**. Multi-word: `/a "Long Nick" kiss`. |
| **action** | Everything after the member (spaces allowed). Must match a **Commands → Actions** call name (case-insensitive). |

### `/strip` / `/stripe`

```
/strip <member> <slot>
/stripe <member> <slot>
```

| Part | What you can type |
|------|-------------------|
| **member** | Same rules as `/a` |
| **slot** | Clothing group id, a friendly label from Tab, or `all:Cloth` for a family bundle (**`/strip` only**) |

### `/poses` / `/p`

```
/poses <member> <pose>
/p <member> <pose>
```

### `/animation` / `/ani`

```
/animation <name>
/ani <name>
```

---

## What happens when it runs

- **`/a`**: looks up your Commands binding and runs Club **ActivityRun** (same idea as the Activity Menu).
- **`/strip` / `/stripe`**: runs the matching Seidr **Undress** / **Undress all** activity on that person.
- **`/poses` / `/p`**: applies a Club pose when allowed, then posts a public Action line describing the pose.
- **`/animation` / `/ani`**: plays your saved animation on the local Player.

You still need Club permission to act on others. If the activity / pose is not available right now, the command is refused.

---

## Errors and warnings

Messages appear **only for you** in the chat log (local), then disappear:

| Situation | Behaviour |
|-----------|-----------|
| Member not in the room | Warning / error, command stops |
| Name/nick matches **more than one** person and none is disambiguated via **People** | Short warning; refuses |
| Unknown call name / animation | Warning; define it under Commands / Animations |
| Activity or pose not available | Error / warn; autocomplete would have hidden it when possible |

---

## Tab autocomplete

While the chat input is focused and the line starts with a Seidr command:

| Key | Effect |
|-----|--------|
| **Tab** | Open the Seidr autocomplete list (filtered by what you already typed for that token) |
| **W** / **↑** | Move selection up |
| **S** / **↓** | Move selection down |
| **E** / **Enter** | Accept |
| **Esc** | Close |

- Placed over the chat input (Seidr styling).
- **Member** suggestions show name/nick and ID; accepting inserts the **Member ID** (unambiguous).
- **`/a` action** suggestions only list bindings available on the resolved member.
- **`/stripe` / `/strip`**, **`/poses`**, **`/animation`** follow the tables above.

While the list is open, W / S / E are used for navigation (they do not type into chat).

---

## Enable toggles

**Settings → General → Commands** — one checkbox per slash tag. Off = not registered / ignored. Keep **`/seidr`** enabled so you can always reopen Settings.

---

## Last target + Fast Select

**Last target:** After a successful `/a` / `/action` / `/strip` / `/stripe` / `/poses` / `/p`, member autocomplete remembers that person for the session. Next `/a` + Tab highlights them if they still match the filter and are in the room; otherwise Self. Esc does not clear the memory.

**Fast Select** (Settings → General → Commands, when enabled):

| Type in chat | Then Tab |
|--------------|----------|
| `a` | `/action ` (checkbox) |
| `s` | `/strip ` (checkbox) |
| `d` | `/animation ` (checkbox) |
| `p` | `/poses ` (checkbox) |
| (empty) | Configurable: Disabled / Action / Poses / Animation / Strip |

Per-letter checkboxes can turn individual shortcuts off. Any other chat text keeps normal Tab behavior. Next Tab after Fast Select opens member or animation autocomplete as usual.

---

## Storage

Saved in the shared Seidr bag: `ExtensionSettings.SeidrRoomManager` → `settings.commands` (same ~180 KB soft cap as Room Manager / Actions).

## Related

- [SETTINGS.md](SETTINGS.md) — Commands tab overview, Tutorial  
- [ACTIONS.md](ACTIONS.md) — custom Activity Menu actions (different feature)  
- [ANIMATIONS.md](ANIMATIONS.md) — pose/face clips  
- [README.md](../README.md) — feature overview  
