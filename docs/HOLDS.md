# Holds

Seidr adds Club **Activities** on **Item Torso** for pulling and cuddling people into shared poses.

## Requirements

| | |
|---|---|
| Zone | Item Torso → Activities |
| Hands | Not required |
| Peer Seidr | Required for the **shared pose**. Without it, chat still works and the lineup looks normal. |

## Activities

| Button | What happens |
|--------|----------------|
| **Pull Left** | Target moves to your left slot. |
| **Pull Right** | Target moves to your right slot. |
| **Cuddle** | Target moves into a close cuddle. Does **not** clear left/right. |
| **Remove Left / Right / Cuddle** | Clears that person from **your** corresponding slot. |
| **Leave** | You step out of **someone else’s** hold on you. |

### Slot rules

- One person per left / right / cuddle slot on you.
- Pulling into an already filled side **releases** the previous person.
- Cuddle does not kick people off your left/right.

### Badges

- A gold **L**, **R**, or **C** mark on the activity button shows that slot is filled (and who).
- The button you share with that person is outlined.

## Pose vs hitbox

- **Draw** poses use Settings → Drawing offsets (pull spacing, cuddle lift).
- **Click hitboxes**, status icons, and arousal meters stay on natural seats so targeting stays reliable.
- Arousal meter clicks on clustered bodies are suppressed so you do not mis-click through a pose.

## Sync

Hold state syncs with Hidden `Seidr` messages between Seidr clients. Activity chat uses Club’s dictionary path so roommates without Seidr still see the dialog line.

## Related

- [SETTINGS.md](SETTINGS.md) — Drawing offsets, arousal bar modes around holds  
- [README.md](../README.md) — Echo yield when Echo takes a hold  
