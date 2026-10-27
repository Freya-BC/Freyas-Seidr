# Chat Commands

Run Seidr helpers from the Club chat box with short slash commands. Each command can be turned on or off under **Settings → General → Commands**.

| Command | Purpose |
|---------|---------|
| **`/a`** / **`/action`** | Your custom bindings from **Settings → Commands → Actions** |
| **`/stripe`** | Undress **one** clothing layer (Seidr undress list, individuals only) |
| **`/strip`** | Same individuals **plus** **Undress all {family}** when available |
| **`/poses`** / **`/p`** | Set a Club pose on a room member (or yourself) |
| **`/animation`** / **`/ani`** | Play one of **your** Animations (local Player only) |
| **`/seidr`** | Open Seidr Settings |
| **`/roommanager`** | Open Room Manager (when activated) |

## Quick start — custom `/a`

1. Open **Preference → Extensions → Seidr → Commands**.
2. Under **Actions**, **Add action** → set a **call name** (e.g. `kiss`), pick a **slot**, pick an **activity**, **Save action**.
3. Optionally under **People**, register **alias → Member ID** for friends with common nicknames.
4. In a chat room, type:

```
/a 12345 kiss
/a Alice kiss
/a "Long Nick" kiss her
/action Alice kiss
```

`/a` and `/action` are the same command family (separate enable toggles).

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

## Quick start — poses `/poses` / `/p`

```
/poses Alice Kneel
/p me Hands up
/p 12345 Standing (legs)
```

- Member rules match `/a` (ID, People alias, room Name/Nickname, quotes for multi-word).
- Pose names use the shared Seidr pose catalog (friendly labels in autocomplete).
- You need Club permission to change someone else’s pose.
- After a successful pose change, Seidr posts a **public Action** line (unique Self/Other text per pose, with Club-style names/pronouns).

## Quick start — animations `/animation` / `/ani`

```
/animation wave
/ani wave
```

Plays a clip from **Settings → Animations** on **you**. See [ANIMATIONS.md](ANIMATIONS.md).

## Meta

```
/seidr
/roommanager
```

`/roommanager` requires **Activate Room Manager** in Settings → General.

## Syntax — `/a`

```
/a <member> <action>
```

| Part | What you can type |
|------|-------------------|
| **member** | Member ID (number), a **People** alias, or someone in the room’s **Name** / **Nickname**. Multi-word names: wrap in quotes — `/a "Long Nick" kiss`. |
| **action** | Everything after the member (spaces allowed). Must match a **Commands → Actions** call name (case-insensitive). |

## Syntax — `/strip` / `/stripe`

```
/strip <member> <slot>
/stripe <member> <slot>
```

| Part | What you can type |
|------|-------------------|
| **member** | Same rules as `/a` |
| **slot** | Clothing group id (`Shoes`, `Cloth`, Echo layer names, …), a friendly label from Tab, or `all:Cloth` for a family bundle (**`/strip` only**) |

## Syntax — `/poses` / `/p`

```
/poses <member> <pose>
/p <member> <pose>
```

## Syntax — `/animation` / `/ani`

```
/animation <name>
/ani <name>
```

## What happens when it runs

- **`/a`**: looks up your Commands binding and runs Club **ActivityRun** (same idea as the Activity Menu).
- **`/strip` / `/stripe`**: runs the matching Seidr **Undress** / **Undress all** activity on that person.
- **`/poses` / `/p`**: applies a Club pose when allowed, then posts a public Action line describing the pose.
- **`/animation` / `/ani`**: plays your saved animation on the local Player.

You still need Club permission to act on others. If the activity / pose is not available right now, the command is refused.

## Errors and warnings

Messages appear **only for you** in the chat log (local), then disappear:

| Situation | Behaviour |
|-----------|-----------|
| Member not in the room | Warning / error, command stops |
| Name/nick matches **more than one** person and none is disambiguated via **People** | Short warning; refuses |
| Unknown call name / animation | Warning; define it under Commands / Animations |
| Activity or pose not available | Error / warn; autocomplete would have hidden it when possible |

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
- **`/stripe` slot** suggestions = individual strippable layers only.
- **`/strip` slot** suggestions = individuals + Undress-all bundles (`all:Group`).
- **`/poses`** pose suggestions use friendly labels.
- **`/animation`** suggestions list your saved animation names.

While the list is open, W / S / E are used for navigation (they do not type into chat).

## Settings → Commands

### People

| Field | Purpose |
|-------|---------|
| **Alias** | Short name you type in `/a` |
| **Member ID** | Their Bondage Club member number |

Use this when several people share a name/nick, or when you want a stable short alias. Dropdown picks who you edit; **Add person** / **Save** / **Delete**. Max **50**.

### Actions

| Field | Purpose |
|-------|---------|
| **Call name** | What you type after the member in `/a` |
| **Slot** | Item\* (or clothing) zone for the activity |
| **Activity** | Club / Seidr / mod activity that targets that slot |

Pick **slot first**, then **activity** (list refreshes for that slot). Dropdown of saved actions above the editor — same pattern as the **Actions** tab. Max **50**.

These chat bindings are **separate** from **Settings → Actions** (custom Activity Menu entries). You can bind a chat call name to a stock Club kiss, a Seidr hold, a custom `Seidr_Act_*`, or another mod’s activity, as long as it appears for that slot.

### Enable toggles

**Settings → General → Commands** — one checkbox per slash tag (`/a`, `/action`, `/strip`, `/stripe`, `/poses`, `/p`, `/animation`, `/ani`, `/seidr`, `/roommanager`). Off = not registered / ignored.

## Storage

Saved in the shared Seidr bag: `ExtensionSettings.SeidrRoomManager` → `settings.commands` (same ~180 KB soft cap as Room Manager / Actions).

## Related

- [SETTINGS.md](SETTINGS.md) — Commands tab overview  
- [ACTIONS.md](ACTIONS.md) — custom Activity Menu actions (different feature)  
- [ANIMATIONS.md](ANIMATIONS.md) — pose/face clips  
- [README.md](../README.md) — feature overview  
