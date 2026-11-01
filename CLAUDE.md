# Aisha's Games — working notes

A collection of small web games for a 5-year-old. Shared framework in `core/`,
one self-contained folder per game in `games/`.

## Hard constraints

- **Must run from `file://`** — the games are opened by double-clicking, with no
  server. So: **classic `<script>` tags only, no ES modules, no `fetch`, no
  build step.** Shared code hangs off a single `window.AG` namespace.
- Anything that can throw without a server (e.g. `localStorage`) is wrapped in
  `try/catch` so the game still plays.
- **Always link to a file, never a directory.** `games/foo/` only works because
  an HTTP server rewrites it to `index.html`; from `file://` (and inside the Mac
  app) it dead-ends. Write `games/foo/index.html`. This bit us once already —
  the picker's links did nothing in the app.
- Kid-friendly: big targets, big cheerful type, no fail states, no scary sounds.

## Layout

```
index.html        game picker; renders from core/games.js
core/
  shell.css       design tokens + shared components (buttons, overlays, confetti)
  home.css        styles for the picker only
  util.js         AG.util  — el(), shuffle(), delay(), pick(), randomBetween()
  store.js        AG.store — get()/set(), namespaced localStorage
  audio.js        AG.audio — play('flip'|'match'|'miss'|'win'), mute state
  fx.js           AG.fx    — confetti(), animate(node, class)
  shell.js        AG.shell — header(), overlay(), muteButton(), icons
  games.js        AG.games — the registry the picker reads
games/<game>/
  index.html      loads core scripts in order, then the game's own
  game.css        game-only styles, prefixed with the game's initials (e.g. .pp-)
  game.js         game logic, wrapped in an IIFE
  spec.md         the original brief, kept for reference
```

## Adding a new game

Use the **`new-game` skill** (`.claude/skills/new-game/`) — it carries the recipe
and a scaffold script:

```sh
.claude/skills/new-game/scaffold.sh <id> "<Title>" "<emoji>" "<blurb>" "<players>" "<accent>"
```

It writes a working game folder from `templates/` and registers it on the
picker. What it sets up, for reference:

1. `games/<new-game>/` — same shape as `games/petal-pairs/`.
2. In `index.html`, load the core scripts **in this order**, then the game's:
   `util → store → audio → fx → shell → <game files>`
3. Build the header with `AG.shell.header({ mount, title, emoji, home:'../../index.html', buttons })`
   then `page.prepend(headerNode)` so it sits above the game's own markup.
4. Prefix every game-specific CSS class (`.pp-` for Petal Pairs) so games never
   collide. Use the `--ag-*` tokens from `shell.css` for colour and spacing.
5. Register it in `core/games.js` so it shows up on the picker.

Reading `core/shell.js` + one existing game is enough context to build another —
no need to read the whole project.

## The Mac app

`./build-app.sh` produces `dist/Aisha's Games.app`: a ~200-line Swift shell
(`app/main.swift`) hosting a WKWebView, with a **copy** of `index.html`, `core/`
and `games/` inside `Contents/Resources/web`. So **web changes need a rebuild**
before they show up in the app.

- Needs `swiftc` from the Xcode Command Line Tools; ad-hoc codesigned.
- The icon comes from `app/icon.png` (rendered from `app/icon.html` by headless
  Chrome) and is cached as `app/icon.icns` — delete that to regenerate.
- `AISHA_DEV=1` enables the Web Inspector and prints a JSON diagnostic
  (framework loaded, tiles rendered, localStorage working) after every load.
  `AISHA_DEV_PAGE=games/<game>/index.html` boots straight into a game, and
  `AISHA_DEV_EVAL='<js>'` runs JS after each load and prints the result.
  Together these are the way to verify a build without a GUI screenshot:

  ```sh
  AISHA_DEV=1 AISHA_DEV_PAGE=games/petal-pairs/index.html \
    "dist/Aisha's Games.app/Contents/MacOS/AishaGames"
  ```

- `localStorage` **does** work in the app (verified), so mute and game progress stick.
- `AISHA_DEV=1` also sets `window.__AISHA_DEV` before page scripts run; games
  expose a probe behind it (`window.__amazeProbe`) so tests can drive them.
- Hard-reload the browser (cmd+shift+R) after editing `core/*` — plain reloads
  serve the cached copy and you will debug a stale file.

## On the web

Public at **https://rkpatel0.github.io/aisha-games/** — GitHub Pages serves
`main` of `rkpatel0/aisha-games` as-is (`.nojekyll`, no build). Pushing to
`main` updates the site within a minute or two. The repo is public.

Real players have saved progress (Aisha in the Mac app, others in their
browsers). Tests that win levels must save and restore the
`aisha-games:abc-caterpillar*` localStorage keys.

## Testing

The app itself needs no server, but browser automation can't drive `file://`.
For that: `python3 -m http.server 8777` from the project root, then visit
`http://localhost:8777/`. Remember the browser caches `core/*.css` hard — bust it
with a query string when checking style changes.
