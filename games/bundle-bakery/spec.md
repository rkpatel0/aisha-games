# Bundle Bakery 🍪

Place value from first principles, for Aisha (5, almost 6). Loose cookies are
slow to count, so we pack them in **boxes of ten**. "23" means 2 boxes and
3 loose. Built in the same dark-board style and structure as Flower Fence.

## The colour code

Boxes of ten are **blue**, loose cookies are **orange**, the whole number is
**yellow** — in the words, on the shelf and tray, and in the two digits of the
written number (a blue "boxes" digit with 📦 under it, an orange "loose" digit
with 🍪 under it).

## Talking

Every prompt is put on screen and read aloud (`speechSynthesis`), one short
instruction at a time. 🔊 reads it again. Mute silences speech too.

## The lesson (6 steps, shown on first run; 🎓 replays it)

1. 13 loose cookies — snail counts one by one. Slow.
2. She taps the empty box: ten cookies go in, the box closes.
3. Bunny counts the box first — ten — then eleven, twelve, thirteen. Fast.
4. 1 box and 3 loose is written 13: blue digit = boxes, orange digit = loose.
5. Her turn with 15: pack, how many boxes, how many loose.
6. A bigger pile, 24: pack twice. "Boxes of ten make counting quick."

## Kinds of tray

| kind | what happens |
| --- | --- |
| `pack` 📦 | Cookies pour out loose. Tap the empty box (or the tray, or **Pack ten**) until fewer than ten are loose. Then: how many boxes? how many loose? The number appears. Above 39 some boxes start packed so the tray never overflows. |
| `read` 👀 | Boxes and loose cookies are shown. What number is it? (type both digits) |
| `read0` 0️⃣ | A read with no loose cookies: 20, 30, 40… |
| `make` 🦊 | An animal orders a number (shown with its coloured digits). Add/remove boxes and cookies with + and −, then **Done**. A tenth loose cookie packs itself into a box. |
| `more1` / `more` ➕ | A number ending in 9 (later 6–9) gets 1 (later up to 5) more cookies, spilling past ten. Pack the new box, then: what number now? |

No fail states. A wrong number wiggles and she tries again; after two wrong
tries the game counts with her (boxes by tens, then the loose ones). A wrong
order says what she made and what was wanted; the second time it says the
boxes and loose cookies needed and pulses the digits.

## Levels

| # | numbers | trays |
| --- | --- | --- |
| 1 | 11–19 | pack, pack, read |
| 2 | 11–19 | read, make, read, make |
| 3 | 21–29 | pack, read, make |
| 4 | 21–39 | pack, read, make, read |
| 5 | 10–59 | read0, more1, read0, more1 |
| 6 | 31–59 | read, make, pack, make |
| 7 | 41–69 | make, read, more, make |
| 8 | 51–79 | read, make, pack, more |
| 9 | 61–99 | make, read, more, make |
| 10 | 11–99 | read, make, pack, more, make |

Levels unlock in order; progress is saved under the `bundle-bakery` store key
(`{ lesson, unlocked, done }`).

## Keyboard

Digits, Backspace and Enter on the number pad; Enter/Space packs and goes
Next; in a make round ↑/↓ change boxes, →/← change cookies, Enter is Done.

## Testing

`window.__bbProbe` (with `AISHA_DEV=1` or `#dev`): `state()`, `progress()`,
`startLevel(n)`, `startLesson()`, `pack()`, `answer(n)`, `step(what, by)`,
`make(boxes, loose)`, `done()`, `next()`, `fast(factor)` to shrink every pause,
and `auto(untilMode)` which plays whatever is being waited on until a pop-up
shows.
