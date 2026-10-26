# Undress

Seidr adds **Undress** activities on clothing zones, matching Freyas Action Manager–style clothing slots, plus Echo layers when those AssetGroups exist.

## Requirements

| | |
|---|---|
| Zone | Matching clothing Item\* / cloth group for the worn layer |
| Hands | Required |
| Peer Seidr | **Not** required — target and roommates without Seidr still see chat |

You must be allowed to change the target’s clothes (Club permission rules).

## Behaviour

1. Open the character on the clothing zone that matches what they are wearing (for example Item Torso for upper clothes, Item Boots for shoes).
2. If a stripable layer is present, an **Undress …** activity appears.
3. The button **label** uses the worn item’s name.
4. After the activity runs, Seidr strips the layer (deferred after Club `ActivityRun`).
5. Chat text is visible to the whole room, including clients without Seidr.

## Echo layers

When Echo (or compatible) AssetGroups exist:

- Extra layers such as `_笨笨蛋Luzi` / `_笨笨笨蛋Luzi2` get their own undress activities when worn.
- If a clothing **family** has multiple Echo layers, **Undress all {family}** removes every layer in that family in one action.

If those groups are not present in the client, the extra buttons simply do not appear.

## Related

- [HOLDS.md](HOLDS.md) — torso holds (separate from undress)  
- [README.md](../README.md) — Echo coexistence for holds  
