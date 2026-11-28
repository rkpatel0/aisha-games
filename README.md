# Aisha's Games 🎈

A little collection of web games, built to be played on a laptop.
Runs as a real Mac app, or straight from the browser. No internet needed.

## Games

| Game | Players | Idea |
| --- | --- | --- |
| 🌸 [Petal Pairs](games/petal-pairs/) | 2 | Memory match with 8 bright flowers. Designed by Aisha (age 5). |
| 🌟 [Amaze!](games/amaze/) | 1 | Escape a randomly generated maze, collecting stars. 10 levels, 5×5 up to 21×21. |
| 🤖 [Robot Steps](games/robot-steps/) | 1 | Program a robot with picture blocks. 15 levels, from straight lines to loops. |
| 🐛 [ABC Caterpillar](games/abc-caterpillar/index.html) | 1 | Crawl through the letters in ABC order and fill every square. 25 levels — ABC order, then spelling words from level 15. Bouncy music. Grown-ups tab: 30 one-solution puzzles with hedges, mystery words, a timer and a daily puzzle. |
| 🫘 [Bean Chain](games/bean-chain/index.html) | 1 | A running sum (3 + 2 = _ − 1 = _ …) where each answer starts the next. Little stories to read, beans flying in and out of a ten-frame jar in a dark 3Blue1Brown style. 12 levels up to 20, with doubles, make-10 and missing-number twists. |
| 🔤 [Maze Speller](games/maze-speller/index.html) | 1 | Walk a little girl through a maze and pick up the letters, in order, to spell the word in the picture. Wrong letters show a big X (no limit); after two, the right one glows. 12 levels, from CAT in a 5×4 maze to 6-letter words in 12×8. Designed by Aisha. |
| 🌷 [Flower Fence](games/flower-fence/index.html) | 1 | A first look at multiplication: a fence around rows of flowers, in the dark 3Blue1Brown style. A spoken 6-step lesson (2 rows of 2 is 2 × 2 = 4; turn the garden and 2 × 3 is still 3 × 2; snail counts by ones, bunny by rows), then 12 levels up to 5 × 5 — count a garden, build “3 rows of 4”, turn it, fit seeds into a fence, find the missing number. |
| 🍪 [Bundle Bakery](games/bundle-bakery/index.html) | 1 | Place value from the “why”: loose cookies are slow to count, so pack them in boxes of ten. A spoken 6-step lesson (snail counts 13 one by one; one box and 3 loose is 13), then 10 levels from 11 up to 99 — pack the tray, read the number, fill an animal’s order with boxes and cookies, and watch one more cookie make a new box. |
| 🧺 [Fair Share Picnic](games/fair-share-picnic/index.html) | 1 | Division as sharing fairly: deal snacks to animal friends one at a time until everyone has the same. A spoken 6-step lesson (6 ÷ 2 = 3, the ÷ sign means “shared between”), then 12 levels — share by hand, “one each” rounds, leftovers for the dog, how many friends can eat, and back to times. |
| 🦋 [Mirror Painter](games/mirror-painter/index.html) | 1 | Symmetry, creativity first: paint one side and a magic mirror paints the other. Free paint with 8 colours and side-to-side, up-down or four-way mirrors, plus a spoken lesson and 12 “finish the picture” puzzles from a 4×4 butterfly to an 8×8 snowflake. |

## Playing

**As a Mac app** — double-click `dist/Aisha's Games.app`. Drag it to
`/Applications` or the Dock to keep it handy. Rebuild it after changing a game:

```sh
./build-app.sh
```

**On the web** — https://rkpatel0.github.io/aisha-games/ (updates when `main` is pushed).

**In a browser** — double-click `index.html`, or run `./serve.sh` for
`http://localhost:8777`.


Each game has:

- **←** back to the game list
- **?** how to play
- **↻** start a fresh game
- **🔊** sound on / off (remembered next time)

## Project layout

```
index.html          the game picker
core/               shared framework — styles, sound, effects, page chrome
games/<game>/       one folder per game (its own HTML, CSS, JS and spec)
app/                the Mac app shell (Swift + icon art)
.claude/skills/     the new-game skill: scaffold script + templates
build-app.sh        builds dist/Aisha's Games.app
serve.sh            serves the games on localhost
```

Adding a game is described in `CLAUDE.md`.
