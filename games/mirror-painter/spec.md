# Mirror Painter 🦋

Symmetry from first principles, for Aisha (5, almost 6). Creativity first:
paint one butterfly wing and the mirror paints the other.

## The big idea

A picture is **symmetric** when both sides match, like a butterfly, a face or a
heart. She meets the idea three ways: watching a wing fold over onto the other
side, painting with a live mirror that copies her, and then *being* the mirror.

## The board

A grid of big squares with a purple dashed **mirror line**. Pick a colour, then
tap or drag to paint. Tapping a square that already has the brush colour rubs it
out; there is also a 🧽. Everything said on screen is also read aloud (🔊 reads
it again; the header mute button silences it).

## Free paint 🎨

- 12 × 10 grid, eight colours, a faint butterfly behind it.
- The mirror is on: every dab appears on the other side too.
- ↔️ side-to-side mirror, ↕️ up-and-down mirror, ➕ both (four-way). 🧹 clears.
- **Ta-da! ✨** celebrates the picture (confetti and a spoken compliment). No
  right answer. The picture is saved and comes back next time.

## Puzzles 🧩

Half the picture is painted and the mirror is asleep (grey line). She paints the
empty side so both sides match.

- A square that matches sparkles ✨ and then stays put.
- A square that does not match just wobbles, and its twin across the mirror
  lights up. Nothing is ever lost or failed.
- **Check 👀** rubs out squares that do not belong and makes the missing ones
  glow in their colour for a moment.
- The palette only holds the colours that picture needs.
- Finishing unlocks the next puzzle; then Next puzzle or Free paint.

| # | Picture | Grid | Mirror |
| --- | --- | --- | --- |
| 1 | butterfly (one colour, dotted outlines) | 4 × 4 | side to side |
| 2 | heart (one colour, dotted outlines) | 6 × 5 | side to side |
| 3 | tree | 6 × 6 | side to side |
| 4 | butterfly, 4 colours | 6 × 6 | side to side |
| 5 | rocket (paint the left side) | 6 × 7 | side to side |
| 6 | cat | 8 × 7 | side to side |
| 7 | tree in the lake | 6 × 6 | up and down |
| 8 | boat in the lake | 8 × 6 | up and down |
| 9 | flower | 6 × 6 | both |
| 10 | snowflake | 8 × 8 | both |
| 11 | gem | 6 × 6 | both |
| 12 | big butterfly | 8 × 8 | side to side |

## The lesson 🎓 (spoken, 5 steps, shown the first time)

1. A butterfly with one wing painted.
2. The wing folds over the line and lands on the other side: the wings match.
3. A magic mirror: tap three squares and watch it copy.
4. Her turn with the mirror asleep: finish a little heart.
5. The word: *symmetric* — butterflies, faces and hearts.

## Saved

`AG.store` key `mirror-painter` (`aisha-games:mirror-painter` in localStorage):
lesson seen, puzzles unlocked and done, last mode, the free-paint picture.

## For tests

`window.__mpProbe` (with `AISHA_DEV=1` or `#dev`): `state()`, `progress()`,
`startPuzzle(n)`, `startFree()`, `startLesson()`, `paint(r, c, colour)`,
`erase(r, c)`, `solve()`, `next()`, `check()`, `tada()`, `clear()`,
`setAxis('v'|'h'|'both')`, `pickColour(key)`, `target()`, `solved()`, `puzzles`.
Colour keys: p r o y g b v k.
