/* ------------------------------------------------------------------
   ABC Caterpillar 🐛
   Crawl through the letters in ABC order and eat every leaf on the way.
   From level 15 the letters spell a word instead. Rules live in spec.md.

   The Grown-ups tab plays hand-made-by-computer puzzles from puzzles.js
   (one solution each, hedges, mystery words, a timer and a daily puzzle);
   the 30 levels come pre-made in levels-data.js.

   A puzzle is a random path that visits every square once (the solution);
   letters are dropped along it in order. Any path that fills the grid and
   meets the letters in order wins — it doesn't have to match ours. In word
   levels a repeated letter (the Os in BOOK) can be met in either order,
   since the word comes out the same.
------------------------------------------------------------------ */

(() => {
  const { el, delay } = AG.util;

  // Levels 1–14 are ABC order, 3×3 with A–C up to 6×6 with A–J. From 15 on
  // each puzzle spells a word (`word` = its length), on smaller grids at
  // first since spelling is the new idea.
  const LEVELS = [
    { cols: 3, rows: 3, letters: 3 },
    { cols: 3, rows: 3, letters: 4 },
    { cols: 4, rows: 3, letters: 4 },
    { cols: 4, rows: 4, letters: 4 },
    { cols: 4, rows: 4, letters: 5 },
    { cols: 5, rows: 4, letters: 5 },
    { cols: 5, rows: 5, letters: 5 },
    { cols: 5, rows: 5, letters: 6 },
    { cols: 5, rows: 5, letters: 7 },
    { cols: 6, rows: 5, letters: 7 },
    { cols: 6, rows: 5, letters: 8 },
    { cols: 6, rows: 6, letters: 7 },
    { cols: 6, rows: 6, letters: 8 },
    { cols: 6, rows: 6, letters: 9 },
    { cols: 4, rows: 4, word: 3 },
    { cols: 4, rows: 4, word: 3 },
    { cols: 5, rows: 4, word: 3 },
    { cols: 5, rows: 4, word: 4 },
    { cols: 5, rows: 5, word: 4 },
    { cols: 5, rows: 5, word: 4 },
    { cols: 6, rows: 5, word: 4 },
    { cols: 6, rows: 5, word: 5 },
    { cols: 6, rows: 6, word: 5 },
    { cols: 6, rows: 6, word: 5 },
    { cols: 7, rows: 6, word: 5 },
  ];

  // Words she can picture, by length. The emoji is the reward and the clue.
  const WORDS = {
    3: [['CAT', '🐱'], ['DOG', '🐶'], ['SUN', '☀️'], ['BUS', '🚌'], ['PIG', '🐷'], ['HAT', '🎩'],
        ['BEE', '🐝'], ['COW', '🐮'], ['FOX', '🦊'], ['EGG', '🥚'], ['CAR', '🚗'], ['OWL', '🦉'],
        ['ANT', '🐜'], ['BAT', '🦇'], ['HEN', '🐔'], ['BED', '🛏️']],
    4: [['FROG', '🐸'], ['FISH', '🐟'], ['STAR', '⭐'], ['CAKE', '🎂'], ['MOON', '🌙'], ['BEAR', '🐻'],
        ['DUCK', '🦆'], ['LION', '🦁'], ['BOOK', '📖'], ['TREE', '🌳'], ['BALL', '⚽'], ['BOAT', '⛵'],
        ['KITE', '🪁'], ['SNOW', '❄️'], ['CRAB', '🦀'], ['BIRD', '🐦']],
    5: [['APPLE', '🍎'], ['HORSE', '🐴'], ['TIGER', '🐯'], ['ROBOT', '🤖'], ['HOUSE', '🏠'], ['PIZZA', '🍕'],
        ['TRAIN', '🚆'], ['CLOUD', '☁️'], ['ZEBRA', '🦓'], ['SHEEP', '🐑'], ['SNAKE', '🐍'], ['HEART', '❤️'],
        ['PANDA', '🐼'], ['WHALE', '🐳'], ['CANDY', '🍬'], ['MOUSE', '🐭']],
  };

  const firstWordLevel = LEVELS.findIndex((level) => level.word) + 1;

  const DIRECTIONS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  };

  const page = document.querySelector('.ac-page');
  const banner = document.querySelector('.ac-banner');
  const levelsView = document.querySelector('.ac-view--levels');
  const levelsGrid = document.querySelector('.ac-levels');
  const playView = document.querySelector('.ac-view--play');
  const board = document.querySelector('.ac-board');
  const hudLevel = document.querySelector('.ac-hud-level');
  const hudLeaves = document.querySelector('.ac-hud-leaves');
  const hudTime = document.querySelector('.ac-hud-time');
  const dailyButton = document.querySelector('.ac-daily');
  const hudPrev = document.querySelector('.ac-hud-prev');
  const hudNext = document.querySelector('.ac-hud-next');

  const progress = AG.store.get('abc-caterpillar', { unlocked: 1, done: {} });
  // Finishing what used to be the last level should open any added after it.
  while (progress.done[progress.unlocked] && progress.unlocked < LEVELS.length) progress.unlocked++;

  // Grown-ups keep their own progress, best times (ms) and daily results.
  const grown = AG.store.get('abc-caterpillar-grown', { unlocked: 1, done: {}, best: {}, daily: {} });
  const GROWN_LEVELS = CaterpillarPuzzles.LEVELS;

  const state = {
    mode: 'kids',     // 'kids' | 'grown' — always opens on Kids, for Aisha
    daily: false,     // grown-ups playing today's puzzle
    level: 1,
    puzzle: null,     // { cols, rows, solution: [cell], letters: Map(cell -> 0,1,2…), chars, count, word, emoji }
    path: [],         // cells visited, path[0] is always the A square
    playing: false,
    hintCell: null,
    facing: [1, 0],   // which way the caterpillar looks
  };

  /* ---------------- helpers ---------------- */

  const letterName = (i) => String.fromCharCode(65 + i);
  const char = (i) => state.puzzle.chars[i];
  const badge = (i, cls = '') => `<span class="ac-letter ${cls}">${char(i)}</span>`;
  const head = () => state.path[state.path.length - 1];
  const xy = (cell) => [cell % state.puzzle.cols, Math.floor(cell / state.puzzle.cols)];

  function say(html, { bump = false } = {}) {
    banner.innerHTML = html;
    if (bump) AG.fx.animate(banner, 'is-bumped', 500);
  }

  function adjacent(a, b) {
    const [ax, ay] = xy(a), [bx, by] = xy(b);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  // How many letters the path has reached = the index of the next one to find.
  function nextLetter() {
    return state.path.filter((cell) => state.puzzle.letters.has(cell)).length;
  }

  function saveProgress() {
    AG.store.set('abc-caterpillar', progress);
    AG.store.set('abc-caterpillar-grown', grown);
  }

  const isGrown = () => state.mode === 'grown';
  const currentProgress = () => (isGrown() ? grown : progress);
  const levelCount = () => (isGrown() ? GROWN_LEVELS.length : LEVELS.length);

  // The letters as a row of badges: green once reached, pink for the next,
  // and in mystery puzzles a ? until the caterpillar gets there.
  function spelledBadges(next) {
    const { word, chars, hidden } = state.puzzle;
    let i = 0;
    return [...word].map((ch) => {
      if (ch === ' ') return '<span class="ac-gap"></span>';
      const index = i++;
      const cls = index < next ? 'is-done' : (index === next ? 'is-next' : '');
      return `<span class="ac-letter ${cls}">${hidden && index >= next ? '?' : chars[index]}</span>`;
    }).join('');
  }

  /* ---------------- grown-up timer ---------------- */

  const clock = { start: 0, penalty: 0 };
  const elapsed = () => (clock.start ? performance.now() - clock.start : 0) + clock.penalty;
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  function resetClock() {
    clock.start = 0;
    clock.penalty = 0;
    paintClock();
  }
  function paintClock() {
    hudTime.textContent = '⏱ ' + fmt(elapsed());
  }
  setInterval(() => { if (isGrown() && state.playing && clock.start) paintClock(); }, 250);

  /* ---------------- grown-up puzzles ---------------- */

  function fromData(data) {
    return {
      ...data,
      letters: new Map(data.spots.map((spot, i) => [data.solution[spot], i])),
      count: data.chars.length,
      word: data.text,
      wallList: data.walls,
      walls: new Set(data.walls.map(([a, b]) => CaterpillarPuzzles.edgeKey(a, b))),
    };
  }

  // Today's puzzle is made on the spot (under half a second) and kept for the day.
  function todaysPuzzle() {
    const today = CaterpillarPuzzles.dateKey(new Date());
    const cached = AG.store.get('abc-caterpillar-daily', null);
    if (cached && cached.date === today && cached.puzzle?.v === CaterpillarPuzzles.VERSION) return cached.puzzle;
    const puzzle = CaterpillarPuzzles.daily(new Date());
    AG.store.set('abc-caterpillar-daily', { date: today, puzzle });
    return puzzle;
  }

  /* ---------------- puzzle generation ---------------- */

  // A random path through every square (a Hamiltonian path). Depth-first,
  // always trying the neighbour with the fewest ways on first (Warnsdorff),
  // with a step budget so an unlucky start just retries.
  function randomFullPath(cols, rows) {
    const total = cols * rows;
    const neighbours = (cell) => {
      const x = cell % cols, y = Math.floor(cell / cols);
      const out = [];
      if (x > 0) out.push(cell - 1);
      if (x < cols - 1) out.push(cell + 1);
      if (y > 0) out.push(cell - cols);
      if (y < rows - 1) out.push(cell + cols);
      return out;
    };

    for (;;) {
      const path = [Math.floor(Math.random() * total)];
      const seen = new Set(path);
      let budget = 4000;

      const extend = () => {
        if (path.length === total) return true;
        if (--budget < 0) return false;
        const options = AG.util.shuffle(neighbours(path[path.length - 1]).filter((n) => !seen.has(n)))
          .map((n) => ({ n, ways: neighbours(n).filter((m) => !seen.has(m)).length }))
          .sort((a, b) => a.ways - b.ways);
        for (const { n } of options) {
          path.push(n); seen.add(n);
          if (extend()) return true;
          path.pop(); seen.delete(n);
        }
        return false;
      };

      if (extend()) return path;
    }
  }

  function pickWord(length) {
    const choices = WORDS[length].filter(([word]) => word !== state.puzzle?.word);
    return AG.util.pick(choices);
  }

  function makePuzzle({ cols, rows, letters: abcCount, word: wordLength }) {
    const [word, emoji] = wordLength ? pickWord(wordLength) : [null, null];
    const chars = word
      ? word.split('')
      : Array.from({ length: abcCount }, (_, i) => letterName(i));
    const count = chars.length;
    const solution = randomFullPath(cols, rows);
    const last = solution.length - 1;

    // A first, the last letter on the final square, the rest spread out
    // between with a little wobble so they don't land on a regular beat.
    const spots = [0];
    for (let i = 1; i < count - 1; i++) {
      const even = Math.round((i * last) / (count - 1));
      const wobble = Math.floor(Math.random() * 3) - 1;
      const lo = spots[i - 1] + 1;
      const hi = last - (count - 1 - i);
      spots.push(Math.min(hi, Math.max(lo, even + wobble)));
    }
    spots.push(last);

    const letters = new Map(spots.map((spot, i) => [solution[spot], i]));
    return { cols, rows, solution, letters, chars, count, word, emoji };
  }

  /* ---------------- level select ---------------- */

  function setMode(mode) {
    state.mode = mode;
    showLevels();
  }

  function showLevels() {
    state.playing = false;
    playView.hidden = true;
    levelsView.hidden = false;
    document.querySelectorAll('.ac-tab').forEach((tab) => {
      const on = tab.dataset.mode === state.mode;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-selected', String(on));
    });
    levelsGrid.classList.toggle('is-grown', isGrown());
    dailyButton.hidden = !isGrown();
    levelsGrid.replaceChildren();
    if (isGrown()) { showGrownLevels(); return; }

    say('Pick a level! <span class="ac-hl">' + progress.unlocked + '</span> unlocked');
    LEVELS.forEach((level, index) => {
      const number = index + 1;
      const locked = number > progress.unlocked;
      const done = progress.done[number];

      levelsGrid.append(el('button', {
        class: 'ac-level' + (done ? ' is-done' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        'aria-label': locked ? `Level ${number}, locked` : `Level ${number}`,
        onClick: () => startLevel(number),
      }, [
        el('span', { class: 'ac-level-num', text: String(number) }),
        locked
          ? el('span', { class: 'ac-level-lock', text: '🔒' })
          : el('span', {
            class: 'ac-level-info',
            text: (done ? '✅ ' : '') + (level.word ? `🔤 ${level.word} letters` : 'A–' + letterName(level.letters - 1)),
          }),
      ]));
    });
  }

  function showGrownLevels() {
    say('One path. One answer. <span class="ac-hl">' + grown.unlocked + '</span> / ' + GROWN_LEVELS.length + ' unlocked');

    const today = CaterpillarPuzzles.dateKey(new Date());
    const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const best = grown.daily[today];
    dailyButton.textContent = `☀️ ${weekday}'s puzzle` + (best ? ` — solved in ${fmt(best)} ✅` : ' — new every day');

    let chapter = null;
    GROWN_LEVELS.forEach((level, index) => {
      if (level.chapter !== chapter) {
        chapter = level.chapter;
        levelsGrid.append(el('div', { class: 'ac-chapter', text: `${chapter.icon} ${chapter.name}` }));
      }
      const number = index + 1;
      const locked = number > grown.unlocked;
      const time = grown.best[number];
      levelsGrid.append(el('button', {
        class: 'ac-level' + (grown.done[number] ? ' is-done' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        'aria-label': locked ? `Level ${number}, locked` : `Level ${number}`,
        onClick: () => startLevel(number),
      }, [
        el('span', { class: 'ac-level-num', text: String(number) }),
        locked
          ? el('span', { class: 'ac-level-lock', text: '🔒' })
          : el('span', { class: 'ac-level-info', text: time ? `⏱ ${fmt(time)}` : `${level.cols}×${level.rows}` }),
      ]));
    });
  }

  /* ---------------- playing a level ---------------- */

  function startLevel(level) {
    state.level = level;
    state.daily = false;
    newPuzzle();
  }

  async function startDaily() {
    state.daily = true;
    say('🌱 Growing today’s puzzle…');
    await delay(30);   // let the banner paint before the work
    newPuzzle();
  }

  function newPuzzle() {
    if (isGrown()) {
      state.puzzle = fromData(state.daily ? todaysPuzzle() : CaterpillarLevels[state.level - 1]);
      const chapter = GROWN_LEVELS[state.level - 1].chapter;
      hudLevel.textContent = state.daily ? '☀️ Daily' : `${chapter.icon} Level ${state.level}`;
    } else {
      state.puzzle = makePuzzle(LEVELS[state.level - 1]);
      hudLevel.textContent = `Level ${state.level}`;
    }
    levelsView.hidden = true;
    playView.hidden = false;
    hudTime.hidden = !isGrown();
    hudPrev.hidden = hudNext.hidden = state.daily;
    hudPrev.disabled = state.level <= 1;
    hudNext.disabled = state.level >= currentProgress().unlocked;
    resetClock();
    resize();
    startOver();
  }

  function startOver() {
    state.path = [state.puzzle.solution[0]];
    state.facing = [1, 0];
    state.hintCell = null;
    state.playing = true;
    update();
  }

  function update() {
    const { count, cols, rows } = state.puzzle;
    const next = nextLetter();
    const left = cols * rows - state.path.length;

    hudLeaves.textContent = `🍃 ${left} left`;
    if (state.puzzle.word) {
      const lead = state.puzzle.hidden ? 'Mystery:' : 'Spell';
      say(`<span class="ac-emoji">${state.puzzle.emoji}</span> ${lead} ${spelledBadges(next)}`);
    } else if (next === count - 1) say('Eat every leaf, then finish on ' + badge(next) + '!');
    else if (state.path.length === 1) say('Start on ' + badge(0) + ' — crawl to ' + badge(1) + '!');
    else say('Crawl to ' + badge(next) + '!');
    render();
  }

  function blocked(message) {
    AG.fx.animate(board, 'is-blocked', 300);
    AG.audio.play('miss');
    if (message) say(message, { bump: true });
  }

  // One step onto `cell`. Stepping back onto the previous square undoes.
  // Returns true if the caterpillar moved.
  function moveTo(cell) {
    if (!state.playing) return false;
    const path = state.path;
    const { letters, chars, count, cols, rows } = state.puzzle;

    if (path.length > 1 && cell === path[path.length - 2]) {
      undo();
      return true;
    }
    if (state.puzzle.walls?.has(CaterpillarPuzzles.edgeKey(head(), cell))) {
      blocked('A hedge is in the way! 🌿');
      return false;
    }
    if (path.includes(cell)) {
      blocked("Oops! The caterpillar can't crawl over itself.");
      return false;
    }

    const letter = letters.get(cell);
    const want = nextLetter();
    if (letter !== undefined && chars[letter] !== chars[want]) {
      blocked(state.puzzle.hidden
        ? "Hmm — that letter doesn't come next. 🤔"
        : "That's " + badge(letter) + ' — find ' + badge(want) + ' first!');
      return false;
    }
    if (letter !== undefined && want === count - 1 && path.length + 1 < cols * rows) {
      blocked(state.puzzle.hidden ? 'Fill every square before the last letter! 🍃' : 'Eat all the leaves 🍃 before ' + badge(letter) + '!');
      return false;
    }
    if (isGrown() && !clock.start) clock.start = performance.now();

    const [hx, hy] = xy(head()), [cx, cy] = xy(cell);
    state.facing = [cx - hx, cy - hy];
    path.push(cell);
    state.hintCell = null;

    if (path.length === cols * rows) {
      render();
      win();
      return true;
    }

    AG.audio.play(letter !== undefined ? 'match' : 'flip');
    update();
    if (letter !== undefined) AG.fx.animate(banner, 'is-bumped', 500);
    return true;
  }

  function step([dx, dy]) {
    const [x, y] = xy(head());
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= state.puzzle.cols || ny >= state.puzzle.rows) {
      blocked();
      return false;
    }
    return moveTo(ny * state.puzzle.cols + nx);
  }

  function undo() {
    if (!state.playing || state.path.length < 2) return;
    state.path.pop();
    const len = state.path.length;
    if (len > 1) {
      const [ax, ay] = xy(state.path[len - 2]), [bx, by] = xy(state.path[len - 1]);
      state.facing = [bx - ax, by - ay];
    }
    state.hintCell = null;
    AG.audio.play('flip');
    update();
  }

  function rewindTo(index) {
    if (index >= state.path.length - 1) return;
    state.path.length = index + 1;
    state.hintCell = null;
    AG.audio.play('flip');
    update();
  }

  // Back up to the last square that matches our solution, then flash the next.
  async function hint() {
    if (!state.playing) return;
    const { solution } = state.puzzle;
    let same = 0;
    while (same < state.path.length && state.path[same] === solution[same]) same++;

    // Grown-ups pay 15 seconds for a hint.
    const cost = isGrown() ? ' (+15s)' : '';
    if (isGrown()) {
      if (!clock.start) clock.start = performance.now();
      clock.penalty += 15000;
      paintClock();
    }
    if (same < state.path.length) {
      state.path.length = same;
      update();
      say("Let's back up a little… try the yellow square! 💡" + cost, { bump: true });
    } else {
      say('Try the yellow square! 💡' + cost, { bump: true });
    }
    const cell = solution[same];
    state.hintCell = cell;
    AG.audio.play('flip');
    render();
    await delay(2200);
    if (state.hintCell === cell) { state.hintCell = null; render(); }
  }

  /* ---------------- drawing ---------------- */

  const S = 100; // SVG units per square

  function resize() {
    if (!state.puzzle) return;
    const { cols, rows } = state.puzzle;
    const availW = Math.min(window.innerWidth - 32, 780);
    const availH = window.innerHeight - 300;
    const cell = Math.max(48, Math.min(availW / cols, availH / rows, 140));
    board.setAttribute('viewBox', `0 0 ${cols * S} ${rows * S}`);
    board.style.width = cols * cell + 'px';
    board.style.height = rows * cell + 'px';
  }

  function render() {
    const { cols, rows, letters } = state.puzzle;
    const path = state.path;
    const visited = new Set(path);
    const centre = (cell) => { const [x, y] = xy(cell); return [x * S + S / 2, y * S + S / 2]; };
    const next = nextLetter();
    const parts = [];

    for (let cell = 0; cell < cols * rows; cell++) {
      const [x, y] = xy(cell);
      parts.push(`<rect class="ac-cell${(x + y) % 2 ? ' is-alt' : ''}" x="${x * S + 4}" y="${y * S + 4}" width="${S - 8}" height="${S - 8}" rx="18"/>`);
      if (!visited.has(cell) && !letters.has(cell)) {
        const [cx, cy] = centre(cell);
        parts.push(`<g transform="translate(${cx} ${cy}) rotate(-35)"><ellipse class="ac-leaf" rx="17" ry="10"/><line class="ac-leaf-vein" x1="-13" y1="0" x2="13" y2="0"/></g>`);
      }
    }

    for (const [a, b] of state.puzzle.wallList || []) {
      const [ax, ay] = xy(a);
      const line = b === a + 1
        ? `x1="${(ax + 1) * S}" y1="${ay * S + 10}" x2="${(ax + 1) * S}" y2="${(ay + 1) * S - 10}"`
        : `x1="${ax * S + 10}" y1="${(ay + 1) * S}" x2="${(ax + 1) * S - 10}" y2="${(ay + 1) * S}"`;
      parts.push(`<line class="ac-wall" ${line}/><line class="ac-wall-leaves" ${line}/>`);
    }

    if (path.length > 1) {
      parts.push(`<polyline class="ac-body" points="${path.map((c) => centre(c).join(',')).join(' ')}"/>`);
    }
    path.slice(0, -1).forEach((cell) => {
      const [cx, cy] = centre(cell);
      parts.push(`<circle class="ac-seg" cx="${cx}" cy="${cy}" r="25"/>`);
    });

    letters.forEach((i, cell) => {
      if (cell === head()) return;
      const [cx, cy] = centre(cell);
      // Mystery puzzles never point at the next letter — working it out is the game.
      const wanted = !state.puzzle.hidden && !visited.has(cell) && next < state.puzzle.count && char(i) === char(next);
      const cls = visited.has(cell) ? ' is-done' : (wanted ? ' is-next' : '');
      if (wanted) parts.push(`<circle class="ac-pulse" cx="${cx}" cy="${cy}" r="34"/>`);
      parts.push(`<circle class="ac-dot${cls}" cx="${cx}" cy="${cy}" r="34"/>`);
      parts.push(`<text class="ac-dot-text" x="${cx}" y="${cy}">${char(i)}</text>`);
    });

    if (state.hintCell !== null) {
      const [x, y] = xy(state.hintCell);
      parts.push(`<rect class="ac-hint-ring" x="${x * S + 8}" y="${y * S + 8}" width="${S - 16}" height="${S - 16}" rx="16"/>`);
    }

    parts.push(drawHead(centre(head()), letters.get(head())));
    board.innerHTML = parts.join('');
  }

  function drawHead([cx, cy], letter) {
    const [fx, fy] = state.facing;
    const px = fx * 3, py = fy * 3;     // pupils look the way we're going
    const eyeY = letter === undefined ? cy - 6 : cy - 14;
    return `
      <path class="ac-antenna" d="M ${cx - 12} ${cy - 34} Q ${cx - 18} ${cy - 50} ${cx - 24} ${cy - 52}"/>
      <path class="ac-antenna" d="M ${cx + 12} ${cy - 34} Q ${cx + 18} ${cy - 50} ${cx + 24} ${cy - 52}"/>
      <circle class="ac-antenna-tip" cx="${cx - 24}" cy="${cy - 52}" r="6"/>
      <circle class="ac-antenna-tip" cx="${cx + 24}" cy="${cy - 52}" r="6"/>
      <circle class="ac-head" cx="${cx}" cy="${cy}" r="38"/>
      <circle class="ac-eye" cx="${cx - 13}" cy="${eyeY}" r="10"/>
      <circle class="ac-eye" cx="${cx + 13}" cy="${eyeY}" r="10"/>
      <circle class="ac-pupil" cx="${cx - 13 + px}" cy="${eyeY + py}" r="5"/>
      <circle class="ac-pupil" cx="${cx + 13 + px}" cy="${eyeY + py}" r="5"/>
      ${letter === undefined
        ? `<circle class="ac-cheek" cx="${cx - 24}" cy="${cy + 12}" r="6"/>
           <circle class="ac-cheek" cx="${cx + 24}" cy="${cy + 12}" r="6"/>
           <path class="ac-antenna" style="stroke:#3b2c4a;stroke-width:4" d="M ${cx - 9} ${cy + 12} Q ${cx} ${cy + 20} ${cx + 9} ${cy + 12}"/>`
        : `<text class="ac-dot-text" style="font-size:30px" x="${cx}" y="${cy + 16}">${char(letter)}</text>`}
    `;
  }

  /* ---------------- input ---------------- */

  function onKeyDown(event) {
    if (document.querySelector('.ag-overlay')) return;
    if (event.key === 'Backspace') { event.preventDefault(); undo(); return; }
    const dir = DIRECTIONS[event.key];
    if (!dir) return;
    event.preventDefault();
    if (state.playing) step(dir);
  }

  function cellAt(event) {
    const rect = board.getBoundingClientRect();
    const { cols, rows } = state.puzzle;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return y * cols + x;
  }

  // Dragging: follow the pointer one square at a time. A fast drag along a
  // row or column can skip squares, so walk the straight line towards it.
  let dragging = false;
  let lastBlocked = null;

  function dragTo(cell) {
    if (cell === null || cell === head()) return;
    const back = state.path.indexOf(cell);
    if (back >= 0 && back >= state.path.length - 3) { rewindTo(back); return; }
    if (cell === lastBlocked) return;   // don't buzz over and over

    const [hx, hy] = xy(head()), [cx, cy] = xy(cell);
    if (hx !== cx && hy !== cy) return;
    const dir = [Math.sign(cx - hx), Math.sign(cy - hy)];
    while (head() !== cell) {
      if (!step(dir)) { lastBlocked = cell; return; }
      if (!state.playing) return;
    }
  }

  board.addEventListener('pointerdown', (event) => {
    if (!state.playing) return;
    const cell = cellAt(event);
    if (cell === null) return;
    dragging = true;
    lastBlocked = null;
    board.setPointerCapture(event.pointerId);
    const index = state.path.indexOf(cell);
    if (index >= 0) rewindTo(index);   // tap the body to back up to there
    else dragTo(cell);
  });
  board.addEventListener('pointermove', (event) => {
    if (dragging && state.playing) dragTo(cellAt(event));
  });
  const stopDrag = () => { dragging = false; };
  board.addEventListener('pointerup', stopDrag);
  board.addEventListener('pointercancel', stopDrag);

  // Hop between any levels already reached without going back to the grid.
  hudPrev.addEventListener('click', () => { if (state.level > 1) startLevel(state.level - 1); });
  hudNext.addEventListener('click', () => { if (state.level < currentProgress().unlocked) startLevel(state.level + 1); });
  document.querySelectorAll('.ac-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  dailyButton.addEventListener('click', startDaily);

  document.querySelector('.ac-undo').addEventListener('click', undo);
  document.querySelector('.ac-hint').addEventListener('click', hint);

  /* ---------------- finishing ---------------- */

  async function win() {
    if (isGrown()) { winGrown(); return; }
    state.playing = false;
    progress.done[state.level] = true;
    const nextLevel = state.level + 1;
    const unlockedSomething = nextLevel <= LEVELS.length && progress.unlocked < nextLevel;
    if (unlockedSomething) progress.unlocked = nextLevel;
    saveProgress();

    hudLeaves.textContent = '🍃 0 left';
    const { word, emoji } = state.puzzle;
    say(word ? `${emoji} You spelled ${word}! 🦋` : 'Yum! Every leaf eaten! 🦋', { bump: true });
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    await delay(450);

    const actions = [];
    if (nextLevel <= LEVELS.length) {
      actions.push({
        label: `Level ${nextLevel} →`,
        variant: 'green',
        onClick: () => { stopConfetti(); startLevel(nextLevel); },
      });
    }
    actions.push({ label: 'Play again 🐛', variant: 'pink', onClick: () => { stopConfetti(); newPuzzle(); } });
    actions.push({ label: 'All levels', variant: 'quiet', onClick: () => { stopConfetti(); showLevels(); } });

    AG.shell.overlay({
      title: word ? `${word}! ${emoji}` : 'You did it! 🦋',
      message: nextLevel > LEVELS.length
        ? 'That was the last level — what a hungry caterpillar!'
        : (unlockedSomething
          ? `Level ${nextLevel} is unlocked!` + (nextLevel === firstWordLevel ? ' Now the letters spell words! 🔤' : '')
          : (word ? `You spelled ${word}!` : 'A to ' + char(state.puzzle.count - 1) + ', all done!')),
      actions,
    });
  }

  async function winGrown() {
    state.playing = false;
    const ms = elapsed();
    const { word, emoji } = state.puzzle;
    let previous, nextLevel = null, unlockedSomething = false;

    if (state.daily) {
      const today = CaterpillarPuzzles.dateKey(new Date());
      previous = grown.daily[today];
      if (!previous || ms < previous) grown.daily[today] = Math.round(ms);
    } else {
      previous = grown.best[state.level];
      if (!previous || ms < previous) grown.best[state.level] = Math.round(ms);
      grown.done[state.level] = true;
      nextLevel = state.level + 1;
      unlockedSomething = nextLevel <= GROWN_LEVELS.length && grown.unlocked < nextLevel;
      if (unlockedSomething) grown.unlocked = nextLevel;
    }
    saveProgress();
    paintClock();

    say(word ? `${emoji} ${word}!` : 'Solved! 🦋', { bump: true });
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    await delay(450);

    const newBest = previous && ms < previous;
    const timeLine = `⏱ ${fmt(ms)}` + (newBest ? ' — 🏆 new best!' : (previous ? ` (best ${fmt(previous)})` : ''));
    const actions = [];
    if (nextLevel && nextLevel <= GROWN_LEVELS.length) {
      actions.push({ label: `Level ${nextLevel} →`, variant: 'green', onClick: () => { stopConfetti(); startLevel(nextLevel); } });
    }
    actions.push({ label: 'Play again', variant: 'pink', onClick: () => { stopConfetti(); newPuzzle(); } });
    actions.push({ label: 'All levels', variant: 'quiet', onClick: () => { stopConfetti(); showLevels(); } });

    AG.shell.overlay({
      title: word ? `${word}! ${emoji}` : 'Solved! 🦋',
      message: timeLine + (state.daily
        ? ' — come back tomorrow for a new one!'
        : (nextLevel > GROWN_LEVELS.length ? ' — that was the last level. 👑' : (unlockedSomething ? ` — level ${nextLevel} unlocked.` : ''))),
      actions,
    });
  }

  /* ---------------- how to play ---------------- */

  function showRules() {
    if (isGrown()) { showGrownRules(); return; }
    AG.shell.overlay({
      title: 'How to play 🐛',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'The caterpillar starts on A.' }),
        el('li', { text: 'Use the arrow keys (or drag) to crawl to B, then C, then D…' }),
        el('li', { text: 'Eat every leaf 🍃 — fill every square!' }),
        el('li', { text: 'Finish on the last letter.' }),
        el('li', { text: 'From level 15 the letters spell a word — follow the picture! 🐸' }),
        el('li', { text: 'Go backwards to undo. Stuck? Press 💡 Hint.' }),
        el('li', { text: 'Use ◀ ▶ to jump to any level you have reached.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  function showGrownRules() {
    AG.shell.overlay({
      title: 'Grown-ups 🦋',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'Draw one path that fills every square, meeting the letters in order.' }),
        el('li', { text: 'Every puzzle has exactly one solution — use logic, not luck.' }),
        el('li', { text: '🌿 Hedges block the way between squares.' }),
        el('li', { text: '📖 Word levels spell a word. 🔍 Mystery levels only show a picture — work out the word to know the order.' }),
        el('li', { text: 'The clock starts on your first move. A 💡 hint costs 15 seconds.' }),
        el('li', { text: '☀️ A new daily puzzle every day, harder as the week goes on.' }),
      ]),
      actions: [{ label: "Let's go", variant: 'green' }],
    });
  }

  /* ---------------- music ---------------- */

  const note = '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/>';
  const musicIcon = (on) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${note}${on ? '' : '<path d="M3.5 3.5l17 17"/>'}</svg>`;

  function paintMusic(button) {
    button.innerHTML = musicIcon(CaterpillarMusic.on);
    button.style.color = CaterpillarMusic.on ? 'var(--ag-pink)' : 'var(--ag-ink-soft)';
    button.setAttribute('aria-label', CaterpillarMusic.on ? 'Turn music off' : 'Turn music on');
    button.setAttribute('aria-pressed', String(CaterpillarMusic.on));
  }

  // Browsers only allow sound after a tap or key press, so the music
  // starts on the first one.
  const startMusic = () => CaterpillarMusic.start();
  window.addEventListener('pointerdown', startMusic, { once: true });
  window.addEventListener('keydown', startMusic, { once: true });

  const clearOverlays = () => {
    document.querySelector('.ag-overlay')?.remove();
    document.querySelector('.ag-confetti')?.remove();
  };

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'ABC Caterpillar',
    emoji: '🐛',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      {
        icon: musicIcon(CaterpillarMusic.on),
        label: 'Music on / off',
        onClick: (event) => {
          CaterpillarMusic.toggle();
          paintMusic(event.currentTarget);
        },
      },
      {
        icon: AG.shell.icons.grid,
        label: 'All levels',
        color: 'var(--ag-blue)',
        onClick: () => { clearOverlays(); showLevels(); },
      },
      {
        icon: AG.shell.icons.restart,
        label: 'Start over',
        color: 'var(--ag-green)',
        onClick: () => {
          clearOverlays();
          if (playView.hidden) showLevels(); else startOver();
        },
      },
    ],
  });

  page.prepend(headerNode);
  paintMusic(headerNode.querySelector('[title="Music on / off"]'));
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  showLevels();

  // Debug seam — the Mac app sets __AISHA_DEV with AISHA_DEV=1; in a browser
  // add #dev to the URL.
  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__acProbe = {
      state: () => state,
      solution: () => [...state.puzzle.solution],
      path: () => [...state.path],
      start: (level) => startLevel(level),
      playing: () => state.playing,
      music: () => CaterpillarMusic,
      grown: () => grown,
      setMode,
      startDaily,
    };
  }
})();
