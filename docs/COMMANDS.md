# Chat Commands

Run activities from the Club chat box with a short slash command. Bindings are yours alone — you define call names under **Settings → Commands**.

## Quick start

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

`/a` and `/action` are the same command.

## Syntax

```
/a <member> <action>
```

| Part | What you can type |
|------|-------------------|
| **member** | Member ID (number), a **People** alias, or someone in the room’s **Name** / **Nickname**. Multi-word names: wrap in quotes — `/a "Long Nick" kiss`. |
| **action** | Everything after the member (spaces allowed). Must match a **Commands → Actions** call name (case-insensitive). |

Examples:

| Line | Meaning |
|------|---------|
| `/a 4829101 kiss` | Member ID + call name `kiss` |
| `/a Alice kiss` | Room name/nick `Alice` |
| `/a bunny kiss` | People alias `bunny` (if registered) |
| `/a "Red Fox" soft spank` | Quoted nick; action call name `soft spank` |

## What happens when it runs

Seidr looks up your binding (slot + Club/Seidr/mod activity) and runs it with Club’s normal **ActivityRun** path — same idea as clicking that activity in the Activity Menu on that person.

You still need Club permission to act on them. If the activity is not available on them right now (blocked, wrong items, prefs, etc.), the command is refused.

## Errors and warnings

Messages appear **only for you** in the chat log (local), then disappear:

| Situation | Behaviour |
|-----------|-----------|
| Member not in the room | Warning / error, command stops |
| Name/nick matches **more than one** person and none is disambiguated via **People** | Short warning; refuses |
| Unknown call name | Warning; define it under Commands → Actions |
| Activity not available on that person | Error (~30s); autocomplete would have hidden it |

## Tab autocomplete

While the chat input is focused and the line starts with `/a` or `/action`:

| Key | Effect |
|-----|--------|
| **Tab** | Open the Seidr autocomplete list (filtered by what you already typed for that token) |
| **W** / **↑** | Move selection up |
| **S** / **↓** | Move selection down |
| **E** / **Enter** | Accept |
| **Esc** | Close |

- Placed over the chat input (Seidr styling).
- **Member** suggestions show name/nick and ID; accepting inserts the **Member ID** (unambiguous).
- **Action** suggestions only list bindings that are **currently available** on the resolved member. If the member is not resolved yet, unavailable ones may still appear until you finish the member token.

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

## Storage

Saved in the shared Seidr bag: `ExtensionSettings.SeidrRoomManager` → `settings.commands` (same ~180 KB soft cap as Room Manager / Actions).

## Related

- [SETTINGS.md](SETTINGS.md) — Commands tab overview  
- [ACTIONS.md](ACTIONS.md) — custom Activity Menu actions (different feature)  
- [README.md](../README.md) — feature overview  
