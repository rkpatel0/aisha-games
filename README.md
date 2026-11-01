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

## Playing

**As a Mac app** — double-click `dist/Aisha's Games.app`. Drag it to
`/Applications` or the Dock to keep it handy. Rebuild it after changing a game:

```sh
./build-app.sh
```

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
