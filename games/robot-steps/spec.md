# Robot Steps 🤖 (a.k.a. "Program the Robot")

A picture-block programming game for Aisha (age 5, almost 6) — game #3, following Petal Pairs and Amaze. To be built as a local web app.

## The Big Idea

Aisha builds a **plan** out of picture blocks (arrows and actions), presses **Play**, and watches a friendly robot follow her plan step by step across a grid to reach the goal. If the robot bumps a wall or misses the goal, nothing bad happens — she just fixes her plan and tries again.

The whole point of the game is the loop: **plan → run → watch → fix → run again.** Every design decision should support that loop and make "wrong" feel funny and fixable, never like failure.

## The World

- A grid board, roughly **6×6 cells**, viewed from above
- The **robot** starts on a marked cell, facing a clear direction (the robot sprite must obviously show which way it's facing)
- A **goal cell** (e.g. a glowing star pad or a little house)
- Some levels have **walls/obstacles** (rocks, bushes) and **collectibles** (gems or flowers)
- Bright, chunky, kid-friendly art. The robot should be cute and expressive — happy face, little antenna

## The Blocks

Big, colourful, drag-and-drop picture blocks. **No reading required** — icons only (a word label underneath is fine but the icon must carry the meaning):

| Block | Icon | What it does |
|---|---|---|
| Move forward | ⬆️ straight arrow | Robot moves 1 cell in the direction it's facing |
| Turn left | ↩️ curved arrow | Robot rotates 90° left (stays on its cell) |
| Turn right | ↪️ curved arrow | Robot rotates 90° right |
| Jump | 🦘 spring | Hops over 1 obstacle cell (introduced in later levels) |
| Repeat | 🔁 loop bubble | "Do the blocks inside this X times" (final levels only) |

## Building a Program

- A **program strip** along the bottom of the screen — an empty row of slots
- Aisha **drags blocks** from a palette into the slots (tap-to-add should also work as a fallback — fine motor skills at 5 vary day to day)
- Blocks can be **dragged out to remove**, or dragged to **reorder**
- A **Play ▶️ button**, big and green
- A **Clear/broom button** to empty the strip and start fresh

## Running the Program — the most important part

- When Play is pressed, the robot performs the blocks **one at a time, slowly** (~1 step per second)
- **The block currently being performed lights up** in the strip while the robot does it — this is the single most important feature in the game. It's what connects "my plan" to "what happened," which is the entire lesson
- If the robot **bumps a wall**: a gentle "bonk" — the robot wobbles, looks surprised (funny, not sad), the offending block flashes, and the run stops. The program strip **stays exactly as she built it** so she can find and fix the wrong step
- If the program ends and the robot isn't on the goal: robot shrugs cutely, strip stays put, try again
- If the robot **reaches the goal**: big celebration — confetti, robot dances, "You did it!"
- A **Reset button** puts the robot back at the start (keeping the program strip intact) for another run

## Levels

Around **15 short levels**, unlocking in order. Progression:

1. **Levels 1–3:** Straight lines. Goal is directly ahead — just "forward, forward, forward." Teaches the strip and Play button
2. **Levels 4–6:** One turn needed. Teaches left vs right
3. **Levels 7–9:** Walls appear — must route around them. First real dead ends in a plan
4. **Levels 10–12:** Collectibles — walk over all the gems on the way to the goal. Jump block introduced
5. **Levels 13–15:** The Repeat block — a long straight corridor that's tedious without it, so the loop feels like a superpower, not homework

- Level select screen with locked/completed markers, like Amaze
- Save progress between sessions (localStorage)
- Each level shows a hint of the max blocks needed (e.g. "Can you do it in 6 blocks?") as a gentle optional challenge — never a requirement

## Fun Effects

- Robot animates smoothly cell to cell, with little footstep/whir sounds
- Sparkle-pop on collecting gems
- Confetti + robot dance on success
- Funny bonk + wobble on hitting walls
- Mute button

## Design Notes

- **Single local web app** (HTML/CSS/JS, no server, open in browser)
- Laptop with mouse/trackpad + keyboard; touch support not required
- Everything icon-based; assume the player cannot read yet
- Blocks and buttons should be big — easy targets for small hands
- Nothing is timed. No lives, no game-overs, no penalties. Retry is instant and infinite

## Rules Summary (for a "How to Play" button — use pictures)

1. Drag arrow blocks into the strip to make a plan
2. Press ▶️ and watch your robot follow it
3. Bonk? No problem — fix your plan and play again!
4. Get your robot to the star ⭐
