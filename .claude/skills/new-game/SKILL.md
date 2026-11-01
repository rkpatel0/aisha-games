---
name: new-game
description: Add a new game to the Aisha Games project. Scaffolds games/<id>/ from the shared framework, registers it on the picker, and folds it into the Mac app. Use whenever a new game is requested or a game spec/brief is handed over for this project.
---

# Adding a game

Games for a 5-year-old. Shared framework in `core/`, one self-contained folder
per game in `games/`. Read `CLAUDE.md` for the project's constraints; this skill
is the recipe.

## 1. Scaffold

Save the brief first, then scaffold:

```sh
mkdir -p games/<id> && mv <the-brief>.md games/<id>/spec.md   # if there is a brief
.claude/skills/new-game/scaffold.sh <id> "<Title>" "<emoji>" "<blurb>" "<players>" "<accent>"
```

That writes `index.html`, `game.css`, `game.js` with the header, banner, stage,
how-to-play, win overlay and confetti already wired up, and registers the game on
the picker. It refuses to overwrite an existing folder.

Then replace the placeholder round in `game.js` with the real gameplay.

## 2. Hard rules

- **No ES modules, no `fetch`, no build step.** Classic `<script>` tags only, in
  this order: `util → store → audio → fx → shell → <game files>`. The games run
  from `file://` inside the Mac app, where modules and fetch are blocked.
- **Link to files, never directories.** `games/foo/` dead-ends without a server;
  write `games/foo/index.html`. (This has already caused one bug.)
- **Prefix every game CSS class** with the game's initials (`.pp-`, `.cc-`) and
  build colour/spacing from the `--ag-*` tokens in `core/shell.css`.
- **Guard anything that can throw without a server** — `localStorage` goes
  through `AG.store`, which already handles it.
- Game-specific art lives in the game folder (see `games/petal-pairs/flowers.js`).
  Promote something into `core/` only once a second game needs it.

## 3. Designing for a 5-year-old

Big targets and big cheerful type. No fail states, no timers unless the brief
asks. Every action gets immediate feedback — sound, animation, or both. Sounds
stay gentle; the mute button is in the header for free. Prefer showing a word
next to a picture over relying on reading.

## 4. The framework

```js
AG.util   el(tag, props, children) · shuffle(a) · delay(ms) · pick(a) · randomBetween(lo, hi)
AG.store  get(key, fallback) · set(key, value)          // namespaced localStorage
AG.audio  play('flip' | 'match' | 'miss' | 'win') · muted · toggleMuted()
AG.fx     confetti({pieces, duration}) → stop() · animate(node, className) → Promise
AG.shell  header({mount, title, emoji, home, buttons}) → {node} · overlay({title, message, body, actions, dismissable})
          icons.{back, help, restart, sound, mute}      // SVG strings
AG.games  the picker registry
```

`el()` handles `class`, `text`, `html`, `style` (including `--custom-props`) and
`onClick`-style listeners.

`header()` appends to its mount, so call `page.prepend(headerNode)` to put it
above the game's own markup.

## 5. Verify — in the app, not just the browser

The browser over `http://localhost` is the *easy* path and it hides bugs (a
server rewrites directory URLs; `file://` does not). Check both.

```sh
./serve.sh          # http://localhost:8777/games/<id>/index.html
./build-app.sh      # then test the real thing
```

The app shell has debug hooks — use them instead of guessing, since screenshots
of the native window need Screen Recording permission:

```sh
AISHA_DEV=1 AISHA_DEV_PAGE=games/<id>/index.html \
  AISHA_DEV_EVAL='document.querySelectorAll(".xx-card").length' \
  "dist/Aisha's Games.app/Contents/MacOS/AishaGames"
```

`AISHA_DEV=1` prints a JSON probe after every load (page, framework loaded,
tiles rendered, localStorage working), enables the Web Inspector, and sets
`window.__AISHA_DEV` before the page's own scripts run. `AISHA_DEV_EVAL` runs JS
after each load and prints the result; it is an **async function body**, so it
may `await` and must `return`. Failures report the real JS message and line.

**Give each game a debug seam** so a test can drive it, the way Amaze does:

```js
if (window.__AISHA_DEV || location.hash === '#dev') {
  window.__myGameProbe = { state: () => state, pos: () => ({ ...state.pos }) };
}
```

The `#dev` half means the same tests work in a browser at
`http://localhost:8777/games/<id>/index.html#dev`.

With a probe in place you can solve the game programmatically — Amaze's tests
BFS the maze and dispatch real `keydown` events — and assert on the result.
`document.elementFromPoint(x, y)` proves clicks land on the right element.

Keep each scripted run under ~40s of waits; the browser tool's evaluate call
times out at 45s (the game keeps running, you just lose the return value).

Walk the whole loop before calling it done: start, a wrong move, a right move,
the win screen, play again, how-to-play, mute, and back to the picker.

## 6. Finish

- `./build-app.sh` so the Mac app carries the new game.
- Add a row to the README's games table.
