# Reaction (Autoreaction)

Autoreaction runs a short **local** script when something happens to you in the room — or when **you** say a phrase. Other players do not need Seidr for your reaction to play on your client; nothing about the script is synced as a Seidr Hidden message.

Author under **`/seidr` → Reaction**.

## When to use this

- Reply with a chat line, an Animation, a **Wiggle**, or a Commands Action when someone kisses or pets you.  
- Fire ear + tail wiggles together when someone caresses **Ears** (use the Slot filter).  
- Trigger a small script when **you** type an exact chat Phrase or climax.

## Limits

| Limit | Value |
|-------|-------|
| Reactions | 50 |
| Activity triggers per reaction | 12 |
| Steps per reaction | 5 |

## Triggers

Each reaction can combine:

1. **Activities** — **Filter by Slot** narrows the Activity list (same Club zones as Commands; All = every Club/Seidr/mod activity) and is **saved** with the reaction so it restores when you switch back. Then pick **Activity**, and optionally **On slot** so only that zone counts when it fires (e.g. Caress on Ears vs Arms). Enable **I perform** and/or **On me**.  
2. **Phrase** — exact line **you** say in room chat (case-insensitive). Other people’s chat, whispers, and emotes do not count.  
3. **On climax** — when **you** orgasm, ruin, or successfully resist in the room. Other people’s climaxes do not count.

Leave Phrase empty / climax unchecked if you only want activity triggers. Add at least one usable trigger before Save.

## Response steps

Up to five steps, run **in order** on your client:

| Kind | What it does |
|------|----------------|
| **Say** | Normal chat message |
| **Animation** | Plays a **clip** or a **single named Wiggle set** from Settings → Animations |
| **Wiggle** | Check **Ear** / **Tail** / **Wing** — plays those configured sets **together** (skips missing / not worn) |
| **Perform action** | Runs a binding from Settings → **Commands → Actions**, on **Self** or **Issuer** |

Example: On me → Caress → Slot Ears → step **Wiggle** with Ear (+ Tail if you want). Define the Wiggle sets under Animations → Wiggle first.

Custom **Actions** (Activity Menu) can also **Play animation** as an effect (pose/face or Wiggle) when you use that action on yourself.

**Issuer** is the other person in the triggering activity (who acted on you, or who you acted on). For Phrase-only or climax triggers, Issuer is you.

Define Commands Actions first if you want Perform-action steps.

## Safety checks

Before a reaction runs, Seidr checks that animations exist and Commands Actions are available in the current room. Wiggle steps only need at least one slot checked (missing sets are skipped at play time). If something is broken, a local chat toast appears:

`Reaction "…" not functional: …`

While a reaction is running (and briefly after), further triggers are ignored so a Say step cannot loop forever on the same Phrase.

## Common mistakes

- Expecting other clients to play your reaction — it is local only.  
- Using a User Action name from the Actions tab without a matching **Commands** binding.  
- Forgetting **Save** after editing.  
- Relying on Whisper or a partial phrase match — only exact room Chat from you.  
- Omitting **Slot** when you only want ear/tail pets — body caresses will fire the same reaction.  
- Choosing **Animation** → a pose clip when you meant **Wiggle** slot checkboxes (or the reverse).

## Export / Import

On the Reaction tab:

1. **Export** — `SeidrRxn1:` clipboard string of all reactions.
2. **Import** — paste → **Parse** → pick reactions (New/Different checked, Same unticked). Different rows can **Overwrite** or **Add as new**. Animation steps remap by name to your local Animations; missing clips are cleared with a note.

## Storage

Reactions use their own synced key `ExtensionSettings.SeidrReactions`. See [SETTINGS.md](SETTINGS.md).

## Related

- [SETTINGS.md](SETTINGS.md) — Reaction tab overview  
- [ANIMATIONS.md](ANIMATIONS.md) — clips and Wiggle sets  
- [COMMANDS.md](COMMANDS.md) — Action bindings used by Perform action  
- [README.md](../README.md) — feature overview  
