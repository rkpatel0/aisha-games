# ABC Caterpillar 🐛

A path puzzle in the "visit the waypoints in order" family, with letters in
place of numbers.

- A grid of squares, each holding a leaf. Some squares hold letters A, B, C…
- The caterpillar starts on **A**. Move it with the **arrow keys** (or drag /
  tap with the mouse) to crawl through the letters **in ABC order**.
- It must eat **every leaf** — the path fills every square — and finish on the
  last letter.
- Can't cross its own body. Stepping back onto the square it just came from
  undoes that step. Tapping any part of the body rewinds to there.
- No fail states: a wrong move just wiggles and explains gently.
- Levels grow: 3×3 with A–C up to 6×6 with A–J over levels 1–14.
  Finish a level to unlock the next; ◀ ▶ beside the level name jump between
  any levels already reached. Puzzles are generated fresh each time (random Hamiltonian path).
- **Word levels (15–25):** the letters spell a word (CAT 🐱, FROG 🐸,
  APPLE 🍎…) with its picture in the banner; the word fills in as she goes.
  Repeated letters can be met in either order. 3-letter words on 4×4 up to
  5-letter words on 7×6.
- **Music:** a bouncy WebAudio loop (`music.js`, no files) with its own 🎵
  toggle in the header, remembered. The mute button silences it too.
- **Undo** and **Hint** buttons. Hint rewinds to the last right step of the
  generated solution and flashes the next square.

Asked for: alphabet order, fill every square, grids that grow, arrows + drag.

## Grown-ups tab

A 🐛 Kids | 🦋 Grown-ups switch on the level screen (always opens on Kids).
Separate progress, best times and daily results.

- **Every puzzle has exactly one solution.** `puzzles.js` draws a random
  twisty path (backbite moves), drops letters on it, then asks its solver for
  a second solution; each rival is blocked with a hedge (or, in hedge-free
  levels, another letter) until only one is left. Then every hedge/letter
  that isn't needed is removed again, so each puzzle uses as few clues as
  possible.
- **30 levels in 6 chapters**, each adding one idea: 🌱 Warm-up (ABC,
  unique) · 🌿 Hedges (walls) · 📖 Long words (6–10 letters) · 🔍 Mystery
  words (only a picture and ? blanks; work out the word to know the order —
  the board never hints the next letter) · 💬 Phrases · 👑 Master (mystery
  phrases, 8×8).
- Levels are pre-made into `levels-data.js` by `tools/make-levels.sh`
  (macOS `osascript`, no Node) because the 8×8 ones take seconds to make.
  Seeded: the same code makes the same levels.
- **Timer** starts on the first move; a 💡 hint costs 15 s. Best time per level.
- **☀️ Daily puzzle**, made in the browser from the date (well under a
  second), gentlest on Monday and hardest on Sunday.
