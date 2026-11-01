/* ------------------------------------------------------------------
   ABC Caterpillar 🐛 — grown-up puzzle maker.

   Every grown-up puzzle has exactly ONE solution. To make one:
     1. draw a random path through every square (backbite moves, so the
        path twists instead of hugging the edges);
     2. drop letters along it;
     3. ask the solver for two solutions — while it finds a second, block
        that rival path with a hedge (or, with no hedges allowed, another
        letter) and ask again;
     4. take away every hedge and letter that isn't needed, so the puzzle
        has the fewest clues that still pin down one answer.

   Seeded, so level 7 is the same puzzle every time (best times stay
   fair) and the daily puzzle is the same all day. Pure functions, no DOM:
   this file also runs under `osascript -l JavaScript` for testing.
------------------------------------------------------------------ */

const CaterpillarPuzzles = (() => {
  const VERSION = 1;   // bump when generation changes, to drop cached puzzles

  /* ---------------- words ---------------- */

  // [word, picture]. The picture is the clue for mystery words.
  const WORDS = [
    ['CASTLE', '🏰'], ['ROCKET', '🚀'], ['GUITAR', '🎸'], ['BANANA', '🍌'], ['CARROT', '🥕'],
    ['FLOWER', '🌸'], ['DRAGON', '🐉'], ['TURTLE', '🐢'], ['ORANGE', '🍊'], ['TROPHY', '🏆'],
    ['CAMERA', '📷'], ['PLANET', '🪐'], ['PICNIC', '🧺'], ['RABBIT', '🐇'], ['SPIDER', '🕷️'],
    ['RAINBOW', '🌈'], ['DOLPHIN', '🐬'], ['PENGUIN', '🐧'], ['GIRAFFE', '🦒'], ['OCTOPUS', '🐙'],
    ['PUMPKIN', '🎃'], ['VOLCANO', '🌋'], ['TORNADO', '🌪️'], ['UNICORN', '🦄'], ['BICYCLE', '🚲'],
    ['AVOCADO', '🥑'], ['LOBSTER', '🦞'], ['PARROT', '🦜'], ['CACTUS', '🌵'],
    ['MUSHROOM', '🍄'], ['ELEPHANT', '🐘'], ['DINOSAUR', '🦕'], ['KANGAROO', '🦘'], ['SANDWICH', '🥪'],
    ['UMBRELLA', '☂️'], ['HEDGEHOG', '🦔'], ['FLAMINGO', '🦩'], ['BROCCOLI', '🥦'], ['SNOWMAN', '⛄'],
    ['BUTTERFLY', '🦋'], ['SNOWFLAKE', '❄️'], ['SUNFLOWER', '🌻'], ['CROCODILE', '🐊'], ['PINEAPPLE', '🍍'],
    ['TELESCOPE', '🔭'], ['LIGHTNING', '⚡'], ['CHAMELEON', '🦎'], ['CROISSANT', '🥐'], ['SCORPION', '🦂'],
    ['STRAWBERRY', '🍓'], ['WATERMELON', '🍉'], ['HELICOPTER', '🚁'], ['SKATEBOARD', '🛹'],
  ];

  const PHRASES = [
    ['HOT DOG', '🌭'], ['BIG HUG', '🤗'], ['BUSY BEE', '🐝'], ['LOVE YOU', '❤️'], ['ICE CREAM', '🍦'],
    ['FULL MOON', '🌕'], ['HIGH FIVE', '🙌'], ['EARLY BIRD', '🐦'], ['TEDDY BEAR', '🧸'], ['FIRE TRUCK', '🚒'],
    ['SEA TURTLE', '🐢'], ['RAIN CLOUD', '🌧️'], ['TREE HOUSE', '🌳'], ['PARTY HAT', '🥳'], ['MAGIC WAND', '🪄'],
    ['ROLLER SKATE', '🛼'], ['SWEET DREAMS', '😴'], ['GOOD MORNING', '☀️'], ['SHOOTING STAR', '🌠'],
    ['PEANUT BUTTER', '🥜'], ['POLAR BEAR', '🐻‍❄️'], ['HAPPY BIRTHDAY', '🎂'], ['SPACE ROCKET', '🚀'],
  ];

  /* ---------------- levels ---------------- */

  // kind: abc | word | mystery (word, order hidden) | phrase | mystery-phrase
  // letters: starting ABC count (the maker adds/removes to make it unique)
  // len: [min, max] letters in the word or phrase
  const CHAPTERS = [
    { name: 'Warm-up', icon: '🌱', levels: [
      { kind: 'abc', cols: 5, rows: 5, letters: 4 },
      { kind: 'abc', cols: 5, rows: 5, letters: 4 },
      { kind: 'abc', cols: 6, rows: 6, letters: 5 },
      { kind: 'abc', cols: 6, rows: 6, letters: 5 },
      { kind: 'abc', cols: 6, rows: 6, letters: 4 },
    ] },
    { name: 'Hedges', icon: '🌿', levels: [
      { kind: 'abc', cols: 6, rows: 6, letters: 4, walls: true },
      { kind: 'abc', cols: 6, rows: 6, letters: 4, walls: true },
      { kind: 'abc', cols: 6, rows: 6, letters: 3, walls: true },
      { kind: 'abc', cols: 7, rows: 7, letters: 4, walls: true },
      { kind: 'abc', cols: 7, rows: 7, letters: 3, walls: true },
    ] },
    { name: 'Long words', icon: '📖', levels: [
      { kind: 'word', cols: 6, rows: 6, len: [6, 6], walls: true },
      { kind: 'word', cols: 6, rows: 6, len: [6, 7], walls: true },
      { kind: 'word', cols: 6, rows: 6, len: [7, 7], walls: true },
      { kind: 'word', cols: 7, rows: 7, len: [7, 8], walls: true },
      { kind: 'word', cols: 7, rows: 7, len: [8, 10], walls: true },
    ] },
    { name: 'Mystery words', icon: '🔍', levels: [
      { kind: 'mystery', cols: 6, rows: 6, len: [6, 6], walls: true },
      { kind: 'mystery', cols: 6, rows: 6, len: [6, 7], walls: true },
      { kind: 'mystery', cols: 6, rows: 6, len: [7, 7], walls: true },
      { kind: 'mystery', cols: 7, rows: 7, len: [7, 8], walls: true },
      { kind: 'mystery', cols: 7, rows: 7, len: [8, 10], walls: true },
    ] },
    { name: 'Phrases', icon: '💬', levels: [
      { kind: 'phrase', cols: 7, rows: 7, len: [6, 8], walls: true },
      { kind: 'phrase', cols: 7, rows: 7, len: [7, 9], walls: true },
      { kind: 'phrase', cols: 7, rows: 7, len: [8, 10], walls: true },
      { kind: 'phrase', cols: 7, rows: 7, len: [9, 11], walls: true },
      { kind: 'phrase', cols: 7, rows: 7, len: [10, 13], walls: true },
    ] },
    { name: 'Master', icon: '👑', levels: [
      { kind: 'mystery-phrase', cols: 7, rows: 7, len: [7, 9], walls: true },
      { kind: 'mystery-phrase', cols: 7, rows: 7, len: [8, 10], walls: true },
      { kind: 'mystery-phrase', cols: 7, rows: 7, len: [9, 12], walls: true },
      { kind: 'mystery', cols: 8, rows: 8, len: [9, 10], walls: true },
      { kind: 'mystery-phrase', cols: 8, rows: 8, len: [10, 13], walls: true },
    ] },
  ];
  const LEVELS = CHAPTERS.flatMap((chapter) => chapter.levels.map((spec) => ({ ...spec, chapter })));

  // The daily puzzle ramps up through the week, Monday gentlest.
  const DAILY = [
    { kind: 'mystery', cols: 7, rows: 7, len: [8, 10], walls: true },   // Sunday
    { kind: 'abc', cols: 6, rows: 6, letters: 5 },                       // Monday
    { kind: 'abc', cols: 6, rows: 6, letters: 4, walls: true },
    { kind: 'word', cols: 6, rows: 6, len: [6, 7], walls: true },
    { kind: 'mystery', cols: 6, rows: 6, len: [6, 7], walls: true },
    { kind: 'abc', cols: 7, rows: 7, letters: 4, walls: true },
    { kind: 'phrase', cols: 7, rows: 7, len: [8, 11], walls: true },     // Saturday
  ];

  /* ---------------- randomness ---------------- */

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function seeded(seed) {   // mulberry32
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pickIndex = (rand, n) => Math.floor(rand() * n);
  function shuffled(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = pickIndex(rand, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- grid ---------------- */

  const edgeKey = (a, b) => (a < b ? a * 128 + b : b * 128 + a);

  function gridNeighbours(cols, rows) {
    const out = [];
    for (let cell = 0; cell < cols * rows; cell++) {
      const x = cell % cols, y = Math.floor(cell / cols);
      const list = [];
      if (x > 0) list.push(cell - 1);
      if (x < cols - 1) list.push(cell + 1);
      if (y > 0) list.push(cell - cols);
      if (y < rows - 1) list.push(cell + cols);
      out.push(list);
    }
    return out;
  }

  // A random path through every square. Start from a zigzag and apply
  // backbite moves: link an end to one of its grid neighbours on the path
  // and reverse the loose tail. Always valid, and well mixed after a few
  // thousand moves.
  function randomPath(cols, rows, rand) {
    const total = cols * rows;
    const nb = gridNeighbours(cols, rows);
    const path = [];
    for (let y = 0; y < rows; y++) {
      for (let i = 0; i < cols; i++) path.push(y * cols + (y % 2 ? cols - 1 - i : i));
    }
    const pos = new Int32Array(total);
    const moves = total * total * 3;
    for (let m = 0; m < moves; m++) {
      if (rand() < 0.5) path.reverse();
      const end = path[total - 1];
      const options = nb[end].filter((n) => n !== path[total - 2]);
      const n = options[pickIndex(rand, options.length)];
      for (let i = 0; i < total; i++) pos[path[i]] = i;
      let i = pos[n] + 1, j = total - 1;
      while (i < j) { [path[i], path[j]] = [path[j], path[i]]; i++; j--; }
    }
    if (rand() < 0.5) path.reverse();
    return path;
  }

  /* ---------------- solver ---------------- */

  // Count solutions (up to `limit`), keeping the paths it finds. Same rules
  // as the game: start on the first letter, never cross a hedge, meet the
  // letters so they spell `chars` (repeats interchangeable), finish on the
  // last letter with every square filled. `complete` is false if it ran out
  // of budget before it could be sure.
  function solve({ cols, rows, start, letterAt, chars, walls }, limit = 2, budget = 400000) {
    const total = cols * rows;
    const count = chars.length;
    const adj = gridNeighbours(cols, rows).map((list, a) => list.filter((b) => !walls.has(edgeKey(a, b))));
    const canEnd = new Uint8Array(total);
    for (let c = 0; c < total; c++) if (letterAt[c] >= 0 && chars[letterAt[c]] === chars[count - 1]) canEnd[c] = 1;

    const seen = new Uint8Array(total);
    const stamp = new Int32Array(total);
    const stack = new Int32Array(total);
    let stampId = 0, nodes = 0, found = 0, aborted = false;
    const path = [start];
    const paths = [];
    seen[start] = 1;

    // After stepping onto `cur` with `left` squares to go: the rest must be
    // one connected region, and at most one square may be a dead end (it
    // has to be the finish).
    function hopeful(cur, left) {
      if (left === 0) return true;
      stampId++;
      let sp = 0, reached = 0, deadEnds = 0;
      for (const n of adj[cur]) if (!seen[n]) { stamp[n] = stampId; stack[sp++] = n; }
      while (sp) {
        const u = stack[--sp];
        reached++;
        let free = 0, viaCur = false;
        for (const v of adj[u]) {
          if (v === cur) { free++; viaCur = true; } else if (!seen[v]) {
            free++;
            if (stamp[v] !== stampId) { stamp[v] = stampId; stack[sp++] = v; }
          }
        }
        if (free === 1 && left > 1) {
          if (viaCur || !canEnd[u] || ++deadEnds > 1) return false;
        }
      }
      return reached === left;
    }

    function dfs(cur, depth, k) {
      if (depth === total) {
        found++;
        if (paths.length < limit) paths.push(path.slice());
        return;
      }
      if (++nodes > budget) { aborted = true; return; }
      for (const n of adj[cur]) {
        if (seen[n]) continue;
        let nk = k;
        const li = letterAt[n];
        if (li >= 0) {
          if (k >= count || chars[li] !== chars[k]) continue;
          if (k === count - 1 && depth + 1 !== total) continue;
          nk = k + 1;
        }
        seen[n] = 1; path.push(n);
        if (hopeful(n, total - depth - 1)) dfs(n, depth + 1, nk);
        path.pop(); seen[n] = 0;
        if (found >= limit || aborted) return;
      }
    }

    dfs(start, 1, 1);
    return { count: found, paths, complete: !aborted, nodes };
  }

  /* ---------------- making a puzzle ---------------- */

  const letterName = (i) => String.fromCharCode(65 + i);

  // Spread `count` letters along a path of `total` squares: first and last
  // squares fixed, the rest roughly even with a good wobble.
  function spread(count, total, rand) {
    const spots = [0];
    const gap = (total - 1) / (count - 1);
    for (let i = 1; i < count - 1; i++) {
      const want = Math.round(i * gap + (rand() - 0.5) * gap * 0.7);
      spots.push(Math.min(total - 1 - (count - 1 - i), Math.max(spots[i - 1] + 1, want)));
    }
    spots.push(total - 1);
    return spots;
  }

  function pickText(spec, rand, avoid) {
    const phrase = spec.kind === 'phrase' || spec.kind === 'mystery-phrase';
    const pool = (phrase ? PHRASES : WORDS).filter(([text]) => {
      const n = text.replace(/ /g, '').length;
      return n >= spec.len[0] && n <= spec.len[1] && !avoid.has(text);
    });
    return pool[pickIndex(rand, pool.length)];
  }

  function attempt(spec, rand, avoid) {
    const { cols, rows } = spec;
    const total = cols * rows;
    const solution = randomPath(cols, rows, rand);
    const solutionEdges = new Set();
    for (let i = 1; i < total; i++) solutionEdges.add(edgeKey(solution[i - 1], solution[i]));

    const abc = spec.kind === 'abc';
    let text = null, emoji = null, fixedChars = null;
    if (!abc) {
      [text, emoji] = pickText(spec, rand, avoid);
      fixedChars = text.replace(/ /g, '').split('');
    }
    let spots = spread(abc ? spec.letters : fixedChars.length, total, rand);
    const walls = new Set();

    const charsFor = (s) => (abc ? s.map((_, i) => letterName(i)) : fixedChars);
    const check = () => {
      const letterAt = new Int16Array(total).fill(-1);
      spots.forEach((spot, i) => { letterAt[solution[spot]] = i; });
      return solve({ cols, rows, start: solution[0], letterAt, chars: charsFor(spots), walls });
    };
    const unique = (r) => r.complete && r.count === 1;

    // Block rival solutions until only ours is left.
    for (let fix = 0; ; fix++) {
      const r = check();
      if (!r.complete || fix > 60) return null;
      if (r.count === 1) break;
      const rival = r.paths.find((p) => p.some((c, i) => c !== solution[i]));
      let first = 1;
      while (rival[first] === solution[first]) first++;

      if (spec.walls) {
        // A hedge on the rival's first step off our path.
        for (let j = first; j < total; j++) {
          const key = edgeKey(rival[j - 1], rival[j]);
          if (!solutionEdges.has(key)) { walls.add(key); break; }
        }
      } else {
        // Another letter on one of our squares the rival reaches at a different time.
        const at = new Int32Array(total);
        rival.forEach((c, i) => { at[c] = i; });
        const options = [];
        for (let j = first; j < total - 1; j++) {
          if (!spots.includes(j) && at[solution[j]] !== j) options.push(j);
        }
        if (!options.length || spots.length >= 26) return null;
        spots = [...spots, options[pickIndex(rand, Math.min(options.length, 4))]].sort((a, b) => a - b);
      }
    }

    // Take away every clue that isn't needed.
    for (const key of shuffled([...walls], rand)) {
      walls.delete(key);
      if (!unique(check())) walls.add(key);
    }
    if (abc) {
      for (const spot of shuffled(spots.slice(1, -1), rand)) {
        if (spots.length <= 3) break;
        const before = spots;
        spots = spots.filter((s) => s !== spot);
        if (!unique(check())) spots = before;
      }
    }

    return {
      v: VERSION,
      kind: spec.kind,
      cols, rows, solution, spots,
      chars: charsFor(spots),
      text, emoji,
      hidden: spec.kind === 'mystery' || spec.kind === 'mystery-phrase',
      walls: [...walls].map((key) => [Math.floor(key / 128), key % 128]),
    };
  }

  function make(spec, seed, avoid = new Set()) {
    const rand = seeded(seed);
    for (let tries = 0; tries < 30; tries++) {
      const puzzle = attempt(spec, rand, avoid);
      if (puzzle) return puzzle;
    }
    return null;
  }

  /* ---------------- public ---------------- */

  const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    VERSION,
    CHAPTERS,
    LEVELS,
    edgeKey,
    solve,
    // The 30 levels are made ahead of time (tools/make-levels.sh writes
    // levels-data.js) so the big ones load instantly; this is what it runs.
    level: (n, avoid) => make(LEVELS[n - 1], hash(`grown-v${VERSION}-level-${n}`), avoid),
    daily: (date = new Date()) => make(DAILY[date.getDay()], hash(`grown-v${VERSION}-daily-${dateKey(date)}`)),
    dateKey,
  };
})();
