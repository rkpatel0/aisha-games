# Flower Fence 🌷 — brief

Aisha (5) is interested in multiplication and has never done it before.

Start with a basic tutorial so she understands the idea — "a 2 × 2 fence has an
area of 4" — then, as she grasps it, move into a game that helps her *see* how
multiplication works and why it matters. The key is a 3Blue1Brown-like visual
learning experience. We will iterate.

Decisions (from the parents):
- Numbers go up to 5 × 5 = 25 in this first version.
- Answer with a number pad (digits, then ✓). Keyboard works too.
- The lesson reads every step aloud by itself (silent when muted); the words
  are on screen as well.

Design:
- A garden. A fence around rows of flowers: rows are blue, how many in each row
  is green, the total is yellow — in the words, on the fence and in the sum.
- Lesson (6 steps): one row of two → a second row, count them → fence + 2 × 2 = 4
  → she stretches the fence to 2 rows of 3 → the garden turns (3 × 2 is the same)
  → snail counts one by one, bunny counts by rows (why times matters).
- Game rounds: count a garden · build "3 rows of 4" · turn it around ·
  seeds (12 seeds: build any fence that fits them exactly) · missing number.
- No fail states: wrong answers wiggle; after two tries the rows get counted
  together, or the right fence is outlined.
