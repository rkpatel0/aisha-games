# Fair Share Picnic 🧺

A first look at division for Aisha (age 5, almost 6): sharing snacks so every
friend gets the same. It is the reverse of Flower Fence — "3 friends with 4
each is 12" becomes "12 shared between 3 is 4 each".

## The big idea

Division is not a table to memorise, it is **dealing out fairly**: one for you,
one for you, until the basket is empty. Whatever cannot go round goes to the
dog — that is a remainder. It is written `12 ÷ 3 = 4`, and the ÷ sign is read
as "shared between".

## Colour code (the same in the words, the picnic and the sum)

| What | Colour |
| --- | --- |
| all the snacks (total) | orange |
| the friends | blue |
| how many each | green |
| left over for the dog | purple |

## Guidance

Every prompt is two short lines, shown **and spoken** (speechSynthesis; the 🔊
button reads it again; the header mute button silences it). One instruction at
a time. Nothing is timed and nothing fails:

- Giving a friend a second snack while another is still waiting is gently
  refused — the waiting friend looks sad 🥺, their plate glows, and the game
  says "Frog has fewer! Give one to Frog."
- A wrong number wiggles. After two wrong tries the game says "Let's count
  together!" and counts the plate / the dog's bowl / the friends / the plates
  by running total, then asks again.

## The lesson (6 spoken steps, shown on first run and from the 🎓 button)

1. Bunny and Bear have six cookies to share.
2. Bear takes five, Bunny gets one. Is that fair? No!
3. Share again: one for you, one for you… How many each? (3)
4. Written down: 6 ÷ 2 = 3. The ÷ sign means "shared between".
5. Her turn: six strawberries for three friends, tapping a friend to give one.
6. Five apples for two friends: two rounds of "One each", one left — tap the
   dog, the dog gets the rest. `5 ÷ 2 = 2 🐶 1`.

## Kinds of picnic

| Kind | Icon | What she does |
| --- | --- | --- |
| share | | Tap a friend (or the basket) to give one snack at a time. Then: how many each? Totals up to 12. |
| quick | ⚡ | The **One each** button deals a whole round. Then: how many each? |
| leftover | 🐶 | One each until there is not enough to go round, tap the dog, then: how many each? how many left over? |
| friends | ➕ | "12 cookies, every friend gets 3": **Add a friend** until the basket is empty. How many friends? |
| mult | ✖️ | Plates are already full: "4 friends, 3 each — how many were in the basket?" Then the matching ÷ sum is shown. |

Each picnic ends with a **Next ▶** tap so the last sentence can finish.

## Levels (12, unlocked in order, saved)

| # | Friends | Each | Picnics |
| --- | --- | --- | --- |
| 1 | 2 | 2–4 | share ×3 |
| 2 | 2–3 | 2–4 | share ×3 |
| 3 | 2–3 | 3–5 | share, quick, quick |
| 4 | 2 | 2–4 | quick, leftover, leftover |
| 5 | 2–3 | 2–5 | share, quick, leftover, quick |
| 6 | 2–3 | 2–4 | quick, friends, friends |
| 7 | 2–4 | 2–4 | friends, leftover, quick, friends |
| 8 | 2–4 | 2–4 | quick, mult, quick, mult |
| 9 | 3–4 | 2–4 | leftover, friends, mult, leftover |
| 10 | 3–5 | 2–4 | quick, leftover, friends, mult |
| 11 | 3–5 | 2–4 | leftover, mult, friends, leftover |
| 12 | 2–5 | 2–4 | share, leftover, friends, mult, quick |

Totals stay at 20 or under (24 with leftovers).

## Controls

Mouse/trackpad for everything. Keyboard: digits + Enter + Backspace on the
number pad; while sharing, 1–5 gives to that friend and Space gives to whoever
has fewest; Enter/Space presses the big button.

## Saved state

`AG.store` key `fair-share-picnic` (localStorage `aisha-games:fair-share-picnic`):
`{ lesson, unlocked, done }`.

## Testing

`window.__fspProbe` (with `AISHA_DEV=1` or `#dev`): `state()`, `progress()`,
`levels`, `makeRounds(n)`, `startLevel(n)`, `startLesson()`, `give(i)`,
`pile()`, `go()`, `dog()`, `answer(n)`, `next()`, `fast(speed)`, and `step()`,
which does the right thing for whatever the game is waiting on.
