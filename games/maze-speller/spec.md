# Maze Speller

A new game mode for the kids' gaming project, designed by Aisha. Players move
through a maze and collect letters to spell a hidden word.

Source: the "Maze Speller README" doc, https://claude.ai/artifact/ESL7to5rhCRp9nFSLXJiXq

## How it works

1. The game picks a secret word and shows a **picture clue** (for example, a
   picture of a cat for CAT).
2. The player moves through a **maze**.
3. Each **dead end** holds a letter.
4. The player has to collect the letters **in the right order** to spell the
   word (C, then A, then T).
5. If the player picks up a **wrong letter**, a big **X** appears.
6. When the whole word is spelled correctly, the player **moves on to a new maze**.

## Progression

- Each level gets harder: **bigger mazes and longer words**.
- Start with short, easy-to-picture words (CAT, DOG, SUN) and move on to longer ones.

## Player, mistakes and time

- The player is a **little girl** character who walks through the maze.
- **No mistake limit:** wrong letters show an X, but the player can keep trying
  as long as they like. Nobody has to restart.
- **No time limit:** a clock on screen shows how much time has passed since the
  maze started.
- **Glow hint:** after a couple of wrong letters, the next correct letter in the
  maze starts to glow, so the player isn't stuck.

## Requirements

- Generate a maze for each level, with enough dead ends to hold every letter of
  the word plus some decoy letters.
- Put the word's letters, plus some wrong letters, at the dead ends.
- Show the picture clue on screen the whole time.
- Show which letters have been spelled so far, with blank slots for the rest.
- Show the X feedback when a wrong letter or an out-of-order letter is picked up.
- Fit this in as a new game type alongside the existing games in the project.

## Open questions (not decided in the brief) — what the build does

- **Out-of-order correct letter:** shows the X, same as a wrong letter (the
  Requirements list says so). The letter stays put for later.
- **Controls:** both. Arrow keys / WASD step one square; tapping or clicking a
  square walks the girl there.
- **Pictures:** emoji.
- **Read aloud:** tapping the picture says the word, and it is said again when
  the word is finished (browser speech, silent when muted or unavailable).
