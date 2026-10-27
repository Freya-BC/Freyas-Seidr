# Animations

Pose and face expression clips that play on **you** (the local Player). Author under **Preference → Extensions → Seidr → Animations**, then play from chat.

## Limits

| Limit | Value |
|-------|-------|
| Animations | 50 (`n/50` in the UI) |
| Steps per animation | 20 |
| Total wait across steps | 60 seconds |

## Creating an animation

1. Open **Settings → Animations**.
2. **Add** an animation (or pick one from the dropdown).
3. Set a **name** (this is what you type after `/animation`).
4. Add steps:
   - **Pose** — Club pose (friendly labels such as Standing (legs), Hands up, Kneel, …) + wait seconds  
   - **Face** — feature (Eyebrows / Eyes / Mouth / Blush / Fluids), expression, duration (`keep` / 5 / 15 / 30), + wait seconds  
5. **Save animation**.

Wait steppers nudge by small increments; the UI shows the total wait for the clip.

## Playing

```
/animation wave
/ani wave
```

- Plays on **you only** (not on other room members).
- Name match is case-insensitive against your saved animation names.
- Tab autocomplete lists your animations while the command is enabled.

Unknown names warn locally in chat. Define them under Settings → Animations first.

## Enable / disable

**Settings → General → Commands** has separate toggles for `/animation` and `/ani`. Off = not registered / ignored.

## Storage

Animations live in `ExtensionSettings.SeidrRoomManager` → `settings.animations` (same synced LZ bag as Actions / Room Manager). See [SETTINGS.md](SETTINGS.md).

## Related

- [COMMANDS.md](COMMANDS.md) — `/animation` / `/ani`, `/poses` / `/p`  
- [ACTIONS.md](ACTIONS.md) — Action Menu pose effect (different feature)  
- [README.md](../README.md) — feature overview  
