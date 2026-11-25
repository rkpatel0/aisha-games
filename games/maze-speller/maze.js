/* ------------------------------------------------------------------
   Maze generation for Maze Speller.

   A "growing tree" maze: half the time it digs on from the newest cell
   (long winding corridors), half the time from a random earlier one
   (lots of short side branches). The result is still a perfect maze —
   exactly one route between any two cells — but with far more dead
   ends than plain backtracking, and every dead end can hold a letter.
------------------------------------------------------------------ */

const MazeSpellerMaze = (() => {
  const N = 1, E = 2, S = 4, W = 8;
  const DIRS = [N, E, S, W];
  const DX = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
  const DY = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };
  const OPPOSITE = { [N]: S, [E]: W, [S]: N, [W]: E };

  const randomInt = (n) => Math.floor(Math.random() * n);

  /** Bitmask per cell of which sides are OPEN. */
  function carve(cols, rows) {
    const open = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));

    const first = [randomInt(cols), randomInt(rows)];
    const active = [first];
    seen[first[1]][first[0]] = true;

    while (active.length) {
      const index = Math.random() < 0.5 ? active.length - 1 : randomInt(active.length);
      const [x, y] = active[index];

      const options = DIRS.filter((dir) => {
        const nx = x + DX[dir], ny = y + DY[dir];
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx];
      });

      if (!options.length) { active.splice(index, 1); continue; }

      const dir = AG.util.pick(options);
      const nx = x + DX[dir], ny = y + DY[dir];
      open[y][x] |= dir;
      open[ny][nx] |= OPPOSITE[dir];
      seen[ny][nx] = true;
      active.push([nx, ny]);
    }

    return open;
  }

  const exits = (mask) => DIRS.filter((d) => mask & d).length;

  function deadEnds(open) {
    const out = [];
    open.forEach((row, y) => row.forEach((mask, x) => {
      if (exits(mask) === 1) out.push({ x, y });
    }));
    return out;
  }

  /** The junction or corridor cell nearest the middle — never a dead end. */
  function pickStart(open, cols, rows) {
    let best = null, bestDistance = Infinity;
    open.forEach((row, y) => row.forEach((mask, x) => {
      if (exits(mask) < 2) return;
      const distance = Math.abs(x - (cols - 1) / 2) + Math.abs(y - (rows - 1) / 2);
      if (distance < bestDistance) { best = { x, y }; bestDistance = distance; }
    }));
    return best || { x: 0, y: 0 };
  }

  return {
    N, E, S, W, DIRS, DX, DY,

    /**
     * Build a maze with at least `wantEnds` dead ends. Tries a few hundred
     * times and keeps the best, so it always returns something playable.
     */
    create(cols, rows, wantEnds) {
      let best = null;
      for (let attempt = 0; attempt < 300; attempt++) {
        const open = carve(cols, rows);
        const ends = deadEnds(open);
        if (!best || ends.length > best.ends.length) best = { open, ends };
        if (ends.length >= wantEnds) break;
      }
      return {
        cols,
        rows,
        open: best.open,
        ends: best.ends,
        start: pickStart(best.open, cols, rows),
      };
    },

    canGo(maze, x, y, dir) {
      return (maze.open[y][x] & dir) !== 0;
    },

    /** The one route from a to b, as a list of directions (breadth-first). */
    route(maze, from, to) {
      const id = (x, y) => y * maze.cols + x;
      const cameBy = new Map([[id(from.x, from.y), null]]);
      const queue = [from];

      while (queue.length) {
        const here = queue.shift();
        if (here.x === to.x && here.y === to.y) break;
        for (const dir of DIRS) {
          if (!(maze.open[here.y][here.x] & dir)) continue;
          const next = { x: here.x + DX[dir], y: here.y + DY[dir] };
          if (cameBy.has(id(next.x, next.y))) continue;
          cameBy.set(id(next.x, next.y), { dir, prev: here });
          queue.push(next);
        }
      }

      const steps = [];
      let step = cameBy.get(id(to.x, to.y));
      while (step) {
        steps.unshift(step.dir);
        step = cameBy.get(id(step.prev.x, step.prev.y));
      }
      return steps;
    },
  };
})();
