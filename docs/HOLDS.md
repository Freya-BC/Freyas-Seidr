# Holds

Holds let you **Pull** someone to your left or right, **Cuddle** them close, or **Go** / **Cuddle Into** their slots yourself, with a shared pose that syncs between Seidr players. Everything lives in the normal Club **Activity** menu on **Item Torso** — no extra floating panel.

![Hold slots](../assets/docs/holds-slots.png)

## When to use this

Use holds when you want a visible paired pose with another Seidr player in the same chat room. Chat lines still appear for everyone; the **drawn pose** only lines up for people running Seidr.

## Requirements

| | |
|---|---|
| Zone | **Item Torso** → Activities |
| Hands | Not required for holds / remove / leave |
| Peer Seidr | **Required** for the shared pose. Without it, chat still works and the lineup looks normal. |

## Activities

| Button | What happens |
|--------|----------------|
| **Pull Left** | Target moves to **your** left slot (you become the hub). |
| **Pull Right** | Target moves to **your** right slot. |
| **Cuddle** | Target moves into a close cuddle in front of **you**. Does **not** clear left/right. |
| **Go Left** | **You** move to the target’s left slot (they become the hub). |
| **Go Right** | **You** move to the target’s right slot. |
| **Cuddle Into** | **You** cuddle into the target (they become the hub). Does **not** clear their left/right. |
| **Remove Left / Right / Cuddle** | Clears that person from **your** corresponding slot (hub only). |
| **Leave** | You step out of **someone else’s** hold on you. |

### Slot rules

- **Pull / Cuddle** make **you** the hub. **Go Left / Go Right / Cuddle Into** make the **clicked person** the hub.
- Each of left, right, and cuddle can hold **one** person on a hub.
- Pulling or joining into an already filled side **releases** the previous person on that side.
- Cuddle / Cuddle Into do not kick people off left/right.
- A held person is not also a hub for someone else at the same time (Seidr keeps one cluster role per member). Joining while you already hub others abandons your pile.
- You must be free (not already held or hubbing) to use Go / Cuddle Into.

### Badges

- A gold **L**, **R**, or **C** mark on the activity button shows that slot is filled.
- On Pull / Remove, badges reflect **your** hub slots; on Go / Cuddle Into, they mark when **you** occupy that slot on the focused character.
- The button you share with that person is outlined so you can see the active hold at a glance.

## Pose vs hitbox

- **Drawn models** use Settings → Drawing offsets (pull spacing, cuddle lift) in the character lineup. Optional **Advanced Mode** and hub **Allow Sync** are for private rooms only — see [SETTINGS.md](SETTINGS.md).
- **Map rooms** use Settings → **Map Cuddle** (Pull/Cuddle only, zoom-scaled; hub stays on its tile). No Advanced / Sync on the map.
- **Click hitboxes**, status icons, and arousal meters stay on **natural seats** so targeting stays reliable.
- Arousal meter clicks on clustered bodies are suppressed so you do not mis-click through a posed body.
- **Names** (Settings → Drawing): Default / Hitbox / Hide / Hover control only Club nicknames. **Who** defaults to Seidr holds; **Everyone** also covers Echo pairs and solos — not status icons or art.

## Map rooms

![Map cuddle / pull cluster](../assets/docs/holds-map.png)

Club rooms use `MapData.Type`: **Never**, **Hybrid**, or **Always**. In Hybrid and Always, holds use **tiles** relative to the hub instead of lineup slots:

| Slot | Seat tile |
|------|-----------|
| Left | Hub X − 1 (same Y) |
| Right | Hub X + 1 (same Y) |
| Cuddle | Hub X, hub Y + 1 (one tile “below”) |

| Room type | Activity menu | Form / join |
|-----------|---------------|-------------|
| **Never** | Show (room rules only) | No tile check; lineup Drawing |
| **Hybrid** | Always show Pull / Go / Cuddle | Exact seat tile on click; fail → local “not possible — Map conditions not met” (no hold) |
| **Always** | Hide when off the seat tile | Form only when tiles match |

- **Exact seat tile** (no diagonal or adjacent shortcut) is required to form or join in Hybrid/Always. **Never** rooms are unchanged.
- When the room type flips (admin / Room Manager), Seidr rechecks: leaving the map clears map anchors and walk grace (holds stay for the lineup); entering Hybrid or Always runs map seat watch immediately.
- **Walk-back grace (~60 s):** if the hub or a satellite steps **one** tile away, the hold stays. The walker draws Club-natural until they return to the seat (or the timer ends). Hub walk-away still keeps satellites posed toward the saved hub anchor.
- **Instant clear:** Chebyshev distance **≥ 2** from the seat / hub anchor, or intentional Remove / Leave.
- Only the **hub owner** publishes map seat clears; peers cannot overwrite your hub with a stale break-on-move after MapData sync.
- Tune the drawn cuddle/pull with **Settings → Map Cuddle** (defaults Pull **100**, Cuddle Y **−250**). Map pose applies on the map view when conditions are met; character view still uses Drawing.

Void-disconnect grace (**45 s**) is separate from map walk-back (**60 s**).

## Sync

Hold state syncs with Hidden `Seidr` messages between Seidr clients (`hello`, `state`, and related). They are kept very small, and a newly joined player gets the current state from the hold owner in one reply. Rooms with older Seidr versions still work. Activity chat uses Club’s dictionary path so roommates **without** Seidr still see the dialog line.

### Reconnect grace (void disconnect)

If someone **drops from the room without a clean leave** (refresh, kick, network void):

- Seidr keeps their left / right / cuddle seat for about **45 seconds**.
- If they **rejoin in time**, the pile restores (hub republishes; the returning client also asks peers for state).
- If the timer expires, the seat is cleared and everyone updates.

**Immediate clear** (no grace):

- They leave the room normally (`ChatRoomLeave` → Seidr leave-clear).
- You (or anyone) intentionally **Remove** / **Leave** / clear that seat while they are gone.

Grace only delays the *automatic* prune. A deliberate clear always wins.

## Tips

- Both of you need a current Seidr load for the cuddle/pull art to match.
- Echo cuddle/pull tokens make Seidr **yield** that hold — see the README Echo section.
- Open Settings with `/seidr` anytime; About → Tutorial walks holds and the rest of the UI.

## Related

- [SETTINGS.md](SETTINGS.md) — Drawing / Advanced / Sync, Map Cuddle, Names, arousal bars, chat font  
- [README.md](../README.md) — Echo yield, getting started 
