# Petal Pairs 🌸

A memory matching card game designed by Aisha (age 5, almost 6!) to be built as a local web app.

## Overview

Petal Pairs is a classic memory match game. Cards are laid face-down on the board. Players take turns flipping two cards at a time — if the pictures match, the player keeps the pair; if not, the cards flip back over. The player with the most pairs at the end wins.

## Game Setup

- **16 cards total** — 8 matching pairs
- Cards are laid out in a **4×4 grid**
- All cards start **face-down**
- Card positions are **shuffled randomly** at the start of every game

## The Pictures (Card Faces)

Each pair shows one of these 8 flowers. The flowers should be **bright and colourful**, like they were coloured in with markers:

1. Rose
2. Sunflower
3. Daisy
4. Tulip
5. Lily
6. Orchid
7. Lavender
8. Cherry Blossom

Use fun, kid-friendly illustrations (SVG or emoji-style art is fine). Each flower should be clearly different from the others so a 5-year-old can easily tell them apart.

## The Card Backs

- **Every card back is identical** so you can't tell which card is which
- The pattern is **polka dots AND stars** together
- Make it pretty and colourful

## Players & Turns

- **2 players**, taking turns
- Show whose turn it is clearly on screen (e.g. "Player 1's turn!")
- Keep score: show how many pairs each player has found
- On a turn, a player flips **two cards**:
  - **Match** → the player keeps the pair, their score goes up, and they get **another turn**
  - **No match** → both cards flip back face-down after a short pause (long enough for a young child to see both pictures, ~1.5–2 seconds), and it becomes the other player's turn

## Fun Effects

- **When two cards match: the cards WIGGLE!** A fun wiggle/shake animation before they're collected. This is the most important effect — Aisha specifically requested it.
- **When all 8 pairs are found: CONFETTI** rains down and a big **"You win!"** message appears showing which player won (or "It's a tie!" if 4–4)
- A "Play Again" button to restart with a fresh shuffle

## Design Notes

- Built as a **single local web app** (HTML/CSS/JS is fine — no server needed, just open in a browser)
- **Kid-friendly UI**: big cards, big buttons, large cheerful text
- Cards should have a satisfying **flip animation**
- Should work well on a laptop screen with mouse/trackpad clicks
- Optional nice-to-have: gentle happy sound on a match (with a mute button)

## Rules Summary (for the win screen or a "How to Play" button)

1. Take turns flipping two cards
2. If they match, keep them and go again!
3. If they don't match, they flip back — remember where they were!
4. Whoever finds the most pairs wins 🌷
