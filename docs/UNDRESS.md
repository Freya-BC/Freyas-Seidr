# Undress

Seidr adds **Undress** activities on clothing zones so you can strip a worn layer from the Activity Menu (or from chat with `/strip` / `/stripe`). The flow matches Freyas Action Manager–style clothing slots, plus Echo layers when those AssetGroups exist.

## When to use this

Use Undress when you want a clear Activity button (or slash command) to remove clothes/shoes/etc. The target does **not** need Seidr — the whole room still sees the chat line.

## Requirements

| | |
|---|---|
| Zone | Matching clothing Item\* / cloth group for the worn layer |
| Hands | Required |
| Peer Seidr | **Not** required — target and roommates without Seidr still see chat |

You must be allowed to change the target’s clothes (Club permission rules).

## Behaviour (Activity Menu)

1. Open the character on the clothing zone that matches what they are wearing (for example Item Torso for upper clothes, Item Boots for shoes).
2. If a stripable layer is present, an **Undress …** activity appears.
3. The button **label** uses the worn item’s name so you know what will come off.
4. After the activity runs, Seidr strips the layer (deferred after Club `ActivityRun`).
5. Chat text is visible to the whole room, including clients without Seidr.

## From chat

```
/stripe Alice Shoes          # one layer
/strip Alice Cloth           # one layer
/strip Alice all:Cloth       # whole family when available
```

Tab autocomplete lists what you can strip **right now**. `/stripe` lists individuals only; `/strip` also offers Undress-all bundles. See [COMMANDS.md](COMMANDS.md).

## Echo layers

When Echo (or compatible) AssetGroups exist:

- Extra layers such as `_笨笨蛋Luzi` / `_笨笨笨蛋Luzi2` get their own undress activities when worn.
- If a clothing **family** has multiple Echo layers, **Undress all {family}** removes every layer in that family in one action.

If those groups are not present in the client, the extra buttons simply do not appear.

## Holds vs undress

**Holds** (Pull / Cuddle) live on Item Torso and need Seidr on both sides for the pose. Undress is separate and does not require peer Seidr. See [HOLDS.md](HOLDS.md).

## Related

- [HOLDS.md](HOLDS.md) — torso holds (separate from undress)  
- [COMMANDS.md](COMMANDS.md) — `/strip` / `/stripe`  
- [README.md](../README.md) — Echo coexistence for holds  
