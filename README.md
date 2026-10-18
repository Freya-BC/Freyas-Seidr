# Seidr

![Seidr](assets/freyas-seidr-logo.png)

Bondage Club **hold and undress** activities: Pull Left, Pull Right, Cuddle, Leave / Remove slots, and clothing undress (including Echo layers when present). Shared poses for Seidr peers; activity chat lines stay readable for clients without the mod.

## Install

| Shape | Artifact |
|---|---|
| Tampermonkey | [`seidr.user.js`](seidr.user.js) (fat, inlined) |
| Bookmark | [`bookmark.js`](bookmark.js) → Freya-BC gist → eval IIFE (reload picks newest build) |
| FUSAM | [`loader.js`](loader.js) after login → sibling `seidr.js` — see [`fusam-entry.json`](fusam-entry.json) |

Bookmark gist: https://gist.github.com/Freya-BC/9bbf11dc304132b1dc2d8e8ff4eea168

FUSAM / Pages entry: `https://freya-bc.github.io/Freyas-Seidr/loader.js`

1. **Tampermonkey** — install the userscript, reload Club, log in.
2. **Bookmark** — paste `bookmark.js` as a bookmark URL. Click in Club after login. Click again after a build to load the newest gist script without logging out.
3. **FUSAM** — use the hosted `loader.js` (loads sibling `seidr.js` after login).

## In a room

- **Holds** (Item Torso → Activities): Pull Left / Right, Cuddle; Remove Left / Right / Cuddle / Leave. L/R/C badge when a slot is filled. Both people need Seidr for the shared pose.
- **Undress**: clothing-zone activities; label shows the worn item; chat visible without Seidr. Echo extra layers and **Undress all {family}** when those AssetGroups exist.
- **Echo**: cuddle / pull tokens hide holds; Seidr yields if Echo takes you or someone you hold.

## Build

```bash
npm install
npm run build          # typecheck + esbuild + artifacts (skips gist)
npm run build:gist     # same, then PATCH bookmark gist
```

Requires Node 18+. Source is TypeScript (`src/`) with `bc-stubs`. Build bumps `Seidr.VERSION` (or `SEIDR_RELEASE=1` for `1.0.0`), emits userscript + IIFE + loader + bookmark.
