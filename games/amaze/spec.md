# Amaze! 🌟

A random maze escape game designed by Aisha (age 5, almost 6) — the follow-up to Petal Pairs. To be built as a local web app.

## Overview

Every game is a brand-new maze, generated randomly. The player starts at an entrance on one side and has to find their way **out the other side**, collecting stars along the way. There are 10 levels that unlock in order, getting bigger and harder as you go.

## Core Features

### Random Maze Generation
- Every maze is **randomly generated** — no two games are the same
- A **"New Maze" button** regenerates the current level with a fresh random maze at any time
- Mazes must be **proper mazes with dead ends** and winding paths (use a real maze-generation algorithm like recursive backtracking, which guarantees exactly one solution path plus plenty of dead ends)
- Every maze must always be **solvable**

### Start and Finish
- Entrance on one edge of the maze, exit on the **opposite side**
- Mark the entrance and exit clearly (e.g. a door or arrow at each)
- Reaching the exit completes the level

### Movement
- Move with the **arrow keys** (up/down/left/right)
- The player moves one cell at a time and **cannot pass through walls**
- Movement should feel responsive and smooth — a young child will be playing

### Breadcrumb Trail
- The game **keeps a trace of the path** the player has travelled
- Draw the trail in **blue and purple** (e.g. a gradient, or alternating blue/purple dots)
- The trail shows everywhere the player has been, so dead ends they've already explored stay visibly marked
- This is an important feature — Aisha specifically requested it

### Stars to Collect
- **Stars** are scattered through the maze (place some down dead-end paths so exploring is rewarded)
- Walking over a star collects it, with a little sparkle/pop effect
- Show a star counter (e.g. "⭐ 3 / 5")
- Collecting all stars is encouraged but **not required** to finish the level

## Levels 1–10

- **Levels unlock in order** — you must finish a level to unlock the next
- Difficulty increases mainly through **maze size**, roughly:
  - Level 1: ~5×5 (small and easy)
  - Level 5: ~11×11
  - Level 10: ~21×21 (big and tricky)
- More stars in bigger mazes (e.g. 3 stars at level 1, up to 8–10 at level 10)
- A level-select screen shows all 10 levels, with locked ones greyed out (a padlock icon) and completed ones marked (e.g. with stars earned)
- Remember progress between sessions (localStorage is fine)

## Fun Effects

- Sparkle/pop when collecting a star
- A celebration when the player escapes the maze — confetti and a big **"You did it!"** message, showing stars collected
- Then a button to go to the **next level** (newly unlocked!) or replay
- Optional: gentle happy sound effects with a mute button

## Design Notes

- Built as a **single local web app** (HTML/CSS/JS, no server — just open in a browser)
- **Kid-friendly UI**: bright colours, chunky walls, a cute player character (Aisha's designer's choice — something friendly like a ladybird, bee, or little explorer)
- Big cheerful text and buttons
- Works on a laptop with a keyboard; no touch/swipe support needed
- Make the current position obvious and the walls high-contrast so the maze is easy to read

## Rules Summary (for a "How to Play" button)

1. Use the arrow keys to move through the maze
2. Collect the stars ⭐
3. Find your way out the other side!
4. Your blue-and-purple trail shows where you've been
5. Finish a level to unlock the next one
