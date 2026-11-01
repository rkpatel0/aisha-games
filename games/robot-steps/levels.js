/* ------------------------------------------------------------------
   The 15 levels of Robot Steps.

   Grid coordinates: x runs left→right, y runs top→bottom, both 0-5.
   Facing: 0 = north (up), 1 = east, 2 = south, 3 = west.

   `hint` is the block count of the intended solution — an optional
   challenge shown on screen, never enforced.
   `allow` introduces the palette blocks a few at a time.
------------------------------------------------------------------ */

const RobotLevels = (() => {
  const MOVES = ['forward', 'left', 'right'];
  const WITH_JUMP = [...MOVES, 'jump'];
  const EVERYTHING = [...WITH_JUMP, 'repeat'];

  return [
    // 1-3 — straight lines. Just forward, to teach the strip and Play.
    // The robot faces UP here on purpose: the only block available shows an up
    // arrow, so what the button pictures and what the robot does are identical
    // while she is still working out what a block means. Facing only starts
    // varying at level 4, where turning is the actual lesson.
    { robot: { x: 3, y: 5, dir: 0 }, goal: { x: 3, y: 2 }, allow: ['forward'], hint: 3 },
    { robot: { x: 2, y: 5, dir: 0 }, goal: { x: 2, y: 0 }, allow: ['forward'], hint: 5 },
    { robot: { x: 5, y: 4, dir: 0 }, goal: { x: 5, y: 0 }, allow: ['forward'], hint: 4 },

    // 4-6 — one turn. Left vs right.
    { robot: { x: 0, y: 4, dir: 1 }, goal: { x: 3, y: 1 }, allow: MOVES, hint: 7 },
    { robot: { x: 5, y: 5, dir: 0 }, goal: { x: 2, y: 2 }, allow: MOVES, hint: 7 },
    { robot: { x: 0, y: 0, dir: 2 }, goal: { x: 4, y: 3 }, allow: MOVES, hint: 8 },

    // 7-9 — walls to route around.
    { robot: { x: 0, y: 2, dir: 1 }, goal: { x: 3, y: 1 }, walls: [[2, 2]], allow: MOVES, hint: 6 },
    { robot: { x: 0, y: 0, dir: 2 }, goal: { x: 2, y: 3 }, walls: [[0, 2]], allow: MOVES, hint: 8 },
    { robot: { x: 5, y: 5, dir: 0 }, goal: { x: 3, y: 1 }, walls: [[5, 3]], allow: MOVES, hint: 9 },

    // 10-12 — gems to collect, then the jump block.
    { robot: { x: 0, y: 0, dir: 1 }, goal: { x: 5, y: 0 }, gems: [[2, 0], [4, 0]], allow: MOVES, hint: 5 },
    { robot: { x: 0, y: 3, dir: 1 }, goal: { x: 4, y: 1 }, gems: [[2, 3], [2, 1]], allow: MOVES, hint: 8 },
    {
      robot: { x: 0, y: 2, dir: 1 }, goal: { x: 5, y: 2 },
      walls: [[2, 2]], gems: [[4, 2]], allow: WITH_JUMP, hint: 4,
    },

    // 13-15 — long runs where Repeat turns tedium into one block.
    { robot: { x: 0, y: 0, dir: 1 }, goal: { x: 5, y: 0 }, allow: EVERYTHING, hint: 2 },
    { robot: { x: 2, y: 5, dir: 0 }, goal: { x: 2, y: 0 }, gems: [[2, 3], [2, 1]], allow: EVERYTHING, hint: 2 },
    {
      robot: { x: 0, y: 0, dir: 1 }, goal: { x: 5, y: 5 },
      gems: [[2, 0], [5, 3]], allow: EVERYTHING, hint: 5,
    },
  ].map((level, index) => ({
    number: index + 1,
    size: 6,
    walls: [],
    gems: [],
    ...level,
  }));
})();
