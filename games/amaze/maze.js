/* ------------------------------------------------------------------
   Maze generation for Amaze!

   Recursive backtracking (iterative, so big mazes can't blow the stack).
   It produces a "perfect" maze: every cell reachable, exactly one route
   between any two cells, and plenty of dead ends to hide stars down.
------------------------------------------------------------------ */

const AmazeMaze = (() => {
  const N = 1, E = 2, S = 4, W = 8;
  const DX = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
  const DY = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };
  const OPPOSITE = { [N]: S, [E]: W, [S]: N, [W]: E };

  const randomInt = (n) => Math.floor(Math.random() * n);

  /** Bitmask per cell of which sides are OPEN. */
  function carve(size) {
    const open = Array.from({ length: size }, () => new Array(size).fill(0));
    const seen = Array.from({ length: size }, () => new Array(size).fill(false));

    const start = [randomInt(size), randomInt(size)];
    const stack = [start];
    seen[start[1]][start[0]] = true;

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];

      const options = AG.util.shuffle([N, E, S, W]).filter((dir) => {
        const nx = x + DX[dir], ny = y + DY[dir];
        return nx >= 0 && ny >= 0 && nx < size && ny < size && !seen[ny][nx];
      });

      if (!options.length) { stack.pop(); continue; }

      const dir = options[0];
      const nx = x + DX[dir], ny = y + DY[dir];
      open[y][x] |= dir;
      open[ny][nx] |= OPPOSITE[dir];
      seen[ny][nx] = true;
      stack.push([nx, ny]);
    }

    return open;
  }

  const sideCount = (mask) => [N, E, S, W].filter((d) => mask & d).length;

  /** Cells with a single exit — the ends of the maze's blind alleys. */
  function deadEnds(open, size, exclude) {
    const out = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (sideCount(open[y][x]) !== 1) continue;
        if (exclude.some((c) => c.x === x && c.y === y)) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  /** Dead ends first, so exploring a blind alley is usually rewarded. */
  function scatterStars(open, size, count, exclude) {
    const ends = AG.util.shuffle(deadEnds(open, size, exclude));
    const taken = ends.slice(0, count);

    if (taken.length < count) {
      const rest = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (exclude.some((c) => c.x === x && c.y === y)) continue;
          if (taken.some((c) => c.x === x && c.y === y)) continue;
          rest.push({ x, y });
        }
      }
      taken.push(...AG.util.shuffle(rest).slice(0, count - taken.length));
    }

    return taken;
  }

  return {
    N, E, S, W, DX, DY,

    /**
     * Build a level: a maze of `size` cells square, entered on the left edge
     * and left through the right edge, with `starCount` stars inside.
     */
    create(size, starCount) {
      const open = carve(size);

      const entry = { x: 0, y: randomInt(size) };
      const exit = { x: size - 1, y: randomInt(size) };
      open[entry.y][entry.x] |= W;   // doorway in
      open[exit.y][exit.x] |= E;     // doorway out

      return {
        size,
        open,
        entry,
        exit,
        stars: scatterStars(open, size, starCount, [entry, exit]),
      };
    },

    /** Can the player step from (x, y) in this direction? */
    canGo(maze, x, y, dir) {
      return (maze.open[y][x] & dir) !== 0;
    },
  };
})();
