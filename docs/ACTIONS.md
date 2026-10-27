# Custom Actions

User-defined activities that appear in the **Club Activity Menu** (same menu as Club’s built-in activities — not a separate floating palette).

Open **Preference → Extensions → Seidr → Actions**.

## Limits

| Limit | Value |
|-------|-------|
| Actions | 50 (`n/50` shown in the UI) |
| Chat line length | 500 characters (Other + Self), with live counters |
| Restraint allowlist entries | 12 |

## Creating an action

1. **Add** an action (or pick one from the dropdown).
2. Set a name and optional description.
3. Write **Other** and **Self** chat lines. Use the token chips so Club substitutes names correctly.
4. Optionally add **items**, **conditions**, **arousal**, **sound**, **pose**, and an **icon**.
5. **Save action**.

### Chat tokens

Insert chips match stock Club ActivityDictionary tags, for example:

| Token | Typical use |
|-------|-------------|
| `SourceCharacter` | Who started the activity |
| `TargetCharacter` | Who was clicked (often `TargetCharacter's …`) |
| `PronounPossessive` / `PronounSelf` | Self line pronouns |
| `TargetPronounPossessive` | Target possessive |
| `ActivityAsset` | Name of the **worn item on the clicked zone** when the message is sent (blank if empty) |

Example: `SourceCharacter kisses TargetCharacter's lips.`

Dialog is embedded so roommates **without Seidr** still see the line in chat.

## Items allowlist

Optional list of restraints `{ slot, name }` on Item\* groups (gags, binders, etc. — not clothing/hair).

- **Empty** = no filter (action can appear whenever Club would show activities).
- **Non-empty** = the **acted** character must wear at least one listed restraint.

**Add restraint** opens a searchable Club catalog for Item\* slots.

## Arousal

Off by default. When enabled, pick a Club **template** activity (e.g. Caress) via the Template picker (Common-first list of Club activities).

Seidr remaps the custom action to that template for partners so vanilla arousal prefs still apply. The acted character needs Hybrid/Automatic as usual for Club arousal.

There is **no** separate Hidden peer arousal protocol — delivery uses Club Type Activity behaviour.

## Conditions

Conditions are an **OR of AND groups**. Each check has a `who` (source / target) and optional `not`.

Examples of checks: `wearing`, `isGagged`, `isBlind`, `isDeaf`, `canUseHands`, `canMoveLegs`, `canChangePose`, `accessible`, `hasPenis`, `hasVagina`, `hasBreasts`.

**Audience:** `selfOnly` | `othersOnly` | `both` — controls whether the action shows when targeting yourself vs others.

## Effects

| Effect | Behaviour |
|--------|-----------|
| **Sound** | Seidr peers play via a dictionary cue; SpankSkin also appends a `-Spank` style cue for vanilla |
| **Pose** | Applies a Club pose and updates the character |

## Icons

Each action shows an icon in the Activity Menu:

| Source | Examples |
|--------|----------|
| **Seidr** (inline SVG) | Mark, Hand, Kiss, Heart, Pull, Spark, Cuddle, Star, Rope, Collar, Leash, Chain, Blindfold, Paddle, Candle, Vulva |
| **Club Activity** | Stock `Icons/Activity/*.png` (Caress, Kiss, …) |

**Select icon** opens a searchable grid. Icons apply when the Activity Menu opens (no need to re-save just to refresh the tile). Custom HTTPS URL icons are **not** offered in the picker (Club Activity buttons do not load remote images reliably).

## Export / Import

On the Actions tab:

1. **Export** — copies all actions as `SeidrAct1:` + LZ Base64 JSON.  
2. **Import** — paste → **Parse** → tick names → **Import selected** (new ids; stops at the 50 cap).

## Storage

Actions live in `ExtensionSettings.SeidrRoomManager` → `settings.actions` (same LZ bag as Room Manager). See [SETTINGS.md](SETTINGS.md) / README Storage.

## Related

- [README.md](../README.md) — Fast Open into Activity View  
- [SETTINGS.md](SETTINGS.md) — General Fast Open slot / modifier  
- [ANIMATIONS.md](ANIMATIONS.md) — pose/face clips (different feature)  
