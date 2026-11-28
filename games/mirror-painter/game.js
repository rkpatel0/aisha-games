/* ------------------------------------------------------------------
   Mirror Painter 🦋
   Symmetry from first principles: paint one wing and the mirror paints
   the other. Free paint has a live mirror; in the puzzles the mirror is
   switched off and she paints the matching half herself.
   A spoken lesson comes first. Rules live in spec.md.
------------------------------------------------------------------ */

(() => {
  const { el, pick, delay } = AG.util;
  const $ = (sel) => document.querySelector(sel);

  const page = $('.mp-page');
  const storyNode = $('.mp-story');
  const questionNode = $('.mp-question');
  const speakButton = $('.mp-speak');
  const board = $('.mp-board');
  const hud = $('.mp-hud');
  const paletteNode = $('.mp-palette');
  const freeBar = $('.mp-freebar');
  const nextButton = $('.mp-next');
  const checkButton = $('.mp-check');
  const tadaButton = $('.mp-tada');
  const toFree = $('.mp-to-free');
  const toPuzzles = $('.mp-to-puzzles');

  /* ---------------- paints ---------------- */

  const COLOURS = {
    p: '#ff5c9e', r: '#f0453a', o: '#ff8a3d', y: '#ffc531',
    g: '#2fc98a', b: '#3aa8ff', v: '#8b5cf6', k: '#8a5a34',
  };
  const NAMES = {
    p: 'Pink', r: 'Red', o: 'Orange', y: 'Yellow',
    g: 'Green', b: 'Blue', v: 'Purple', k: 'Brown',
  };
  const ALL = Object.keys(COLOURS);

  /* ---------------- puzzles ---------------- */

  // `art` is only the part she is shown; the rest is made by mirroring it,
  // so every picture is symmetric by construction.
  //   axis 'v'    art is the LEFT half     (give: 'left' | 'right' — the side shown)
  //   axis 'h'    art is the TOP half      (the bottom is the lake)
  //   axis 'both' art is the TOP-LEFT corner
  //   hinted      dotted outlines show where the paint goes
  const PUZZLES = [
    { name: 'butterfly', emoji: '🦋', axis: 'v', give: 'left', hinted: true,
      art: ['p.', 'pp', 'pp', 'p.'] },
    { name: 'heart', emoji: '❤️', axis: 'v', give: 'left', hinted: true,
      art: ['.r.', 'rrr', 'rrr', '.rr', '..r'] },
    { name: 'tree', emoji: '🌳', axis: 'v', give: 'left',
      art: ['..g', '.gg', 'ggg', 'ggg', '..k', '..k'] },
    { name: 'butterfly', emoji: '🦋', axis: 'v', give: 'left',
      art: ['pp.', 'pyk', 'ppk', 'bbk', 'byk', 'bb.'] },
    { name: 'rocket', emoji: '🚀', axis: 'v', give: 'right',
      art: ['..r', '.rr', '.by', '.bb', '.bb', 'rbb', 'r.o'] },
    { name: 'cat', emoji: '🐱', axis: 'v', give: 'left',
      art: ['o...', 'oo..', 'oooo', 'okoo', 'oooo', 'ooop', '.ooo'] },
    { name: 'tree', emoji: '🌳', axis: 'h', lake: true,
      art: ['..gg..', '.gggg.', '..kk..'] },
    { name: 'boat', emoji: '⛵', axis: 'h', lake: true,
      art: ['...yr...', '..yyr...', '.kkkkkk.'] },
    { name: 'flower', emoji: '🌸', axis: 'both',
      art: ['.pp', 'pp.', 'p.y'] },
    { name: 'snowflake', emoji: '❄️', axis: 'both',
      art: ['b...', '.b.b', '..bb', '.bbb'] },
    { name: 'gem', emoji: '💎', axis: 'both',
      art: ['..y', '.yo', 'yor'] },
    { name: 'big butterfly', emoji: '🦋', axis: 'v', give: 'left',
      art: ['vv..', 'vyv.', 'vvvk', '.vvk', '.bbk', 'bbyk', 'bbb.', '.b..'] },
  ];

  // Lesson pictures, same format.
  const LESSON_WING = { axis: 'v', give: 'left', art: ['pp.', 'ppk', '.pk', 'ppk', 'pp.'] };
  const LESSON_HEART = { axis: 'v', give: 'left', hinted: true, art: ['r.', 'rr', 'rr', '.r'] };
  const LESSON_STEPS = 5;

  const flip = (s) => [...s].reverse().join('');
  const keyOf = (ch) => (COLOURS[ch] ? ch : null);

  /** The whole picture as a grid of colour keys (null = empty). */
  function fullArt(P) {
    let rows = P.art;
    if (P.axis !== 'h') rows = rows.map((row) => row + flip(row));
    if (P.axis !== 'v') rows = rows.concat(rows.slice().reverse());
    return rows.map((row) => [...row].map(keyOf));
  }

  /** Which squares are already painted for her. */
  function givenTest(P, rows, cols) {
    if (P.axis === 'h') return (r) => r < rows / 2;
    if (P.axis === 'both') return (r, c) => r < rows / 2 && c < cols / 2;
    return P.give === 'right' ? (r, c) => c >= cols / 2 : (r, c) => c < cols / 2;
  }

  const coloursIn = (grid) => ALL.filter((k) => grid.some((row) => row.includes(k)));

  /* ---------------- saved progress ---------------- */

  const progress = Object.assign(
    { lesson: false, unlocked: 1, done: {}, mode: 'puzzle', free: null },
    AG.store.get('mirror-painter', {}),
  );
  const saveProgress = () => AG.store.set('mirror-painter', progress);

  /* ---------------- state ---------------- */

  const FREE = { cols: 12, rows: 10 };

  const state = {
    mode: 'idle',       // 'lesson' | 'puzzle' | 'free'
    puzzle: Math.min(progress.unlocked, PUZZLES.length),
    phase: 'idle',      // 'paint' | 'next' | 'idle'
    cols: 4,
    rows: 4,
    axis: 'v',
    grid: [],           // grid[r][c] = colour key or null
    target: null,       // puzzles: what the finished picture looks like
    given: null,        // puzzles: (r, c) => true for squares she must not paint
    colour: 'p',        // the paint on her brush, or 'erase'
    misses: 0,
    isDone: null,       // () => true once the thing we are waiting for has happened
    onPaint: null,
    resolve: null,      // settles whatever the game is waiting on
    tools: {},          // which side buttons this mode shows
  };

  /* ---------------- one flow at a time ---------------- */

  // Lessons and puzzles are plain async functions. Starting a new one bumps
  // runId, and every await in the old one then throws CANCEL and unwinds.
  let runId = 0;
  const CANCEL = Symbol('cancel');

  function guard() {
    const mine = runId;
    return (promise) => Promise.resolve(promise).then((value) => {
      if (mine !== runId) throw CANCEL;
      return value;
    });
  }

  function run(flow) {
    runId++;
    state.resolve = null;
    state.isDone = null;
    state.onPaint = null;
    document.querySelector('.ag-overlay')?.remove();
    document.querySelector('.ag-confetti')?.remove();
    hush();
    flow(guard()).catch((err) => { if (err !== CANCEL) throw err; });
  }

  /* ---------------- reading aloud ---------------- */

  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  speakButton.hidden = !canSpeak;

  function hush() {
    try { speechSynthesis.cancel(); } catch { /* fine */ }
  }

  function speak(text) {
    if (!canSpeak || AG.audio.muted) return;
    const clean = text.replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, ' ');
    try {
      speechSynthesis.cancel();
      const say = new SpeechSynthesisUtterance(clean);
      say.rate = 0.85;
      say.pitch = 1.1;
      speechSynthesis.speak(say);
    } catch { /* no voice — the words are still on screen */ }
  }

  const readAll = () => speak(storyNode.textContent + ' ' + questionNode.textContent);

  /** Put up the story and the instruction, and read them out. */
  function tell(story, question = '') {
    storyNode.innerHTML = story;
    questionNode.innerHTML = question;
    AG.fx.animate(storyNode, 'is-bumped', 500);
    readAll();
  }

  /** Change only the second line (hints, nudges). */
  function hint(html) {
    questionNode.innerHTML = html;
    AG.fx.animate(questionNode, 'is-bumped', 500);
    speak(questionNode.textContent);
  }

  /* ---------------- the board ---------------- */

  let cells = [];   // cells[r][c] = the square's node

  /** Lay out an empty board. `asleep` draws the mirror line switched off. */
  function setBoard({ cols, rows, axis, free = false, asleep = false }) {
    Object.assign(state, { cols, rows, axis, target: null, given: null, misses: 0 });
    state.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    board.style.setProperty('--mp-cols', cols);
    board.style.setProperty('--mp-rows', rows);
    board.style.setProperty('--mp-ratio', cols / rows);
    board.classList.toggle('is-free', free);
    board.classList.remove('is-dancing');

    cells = [];
    const nodes = [];
    for (let r = 0; r < rows; r++) {
      cells.push([]);
      for (let c = 0; c < cols; c++) {
        const node = el('div', { class: 'mp-cell', 'data-r': r, 'data-c': c });
        cells[r].push(node);
        nodes.push(node);
      }
    }
    board.replaceChildren(...nodes);
    drawMirror(asleep);
  }

  function drawMirror(asleep = false) {
    board.querySelectorAll('.mp-mirror').forEach((node) => node.remove());
    const line = (dir) => board.append(el('div', { class: `mp-mirror is-${dir}` + (asleep ? ' is-asleep' : '') }));
    if (state.axis !== 'h') line('v');
    if (state.axis !== 'v') line('h');
  }

  function setCell(r, c, key) {
    state.grid[r][c] = key || null;
    const node = cells[r][c];
    node.style.background = key ? COLOURS[key] : '';
    node.classList.toggle('is-on', !!key);
  }

  /** Show a puzzle: its given part painted, the rest waiting for her. */
  function loadPicture(P) {
    const full = fullArt(P);
    const rows = full.length, cols = full[0].length;
    setBoard({ cols, rows, axis: P.axis, asleep: true });
    state.target = full;
    state.given = givenTest(P, rows, cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const node = cells[r][c];
        if (state.given(r, c)) {
          node.classList.add('is-given');
          setCell(r, c, full[r][c]);
        } else {
          node.classList.add('is-open');
          if (P.lake) node.classList.add('is-water');
          if (full[r][c]) node.style.setProperty('--mp-ghost', COLOURS[full[r][c]]);
          if (P.hinted && full[r][c]) node.classList.add('is-hinted');
        }
      }
    }
    return full;
  }

  /** Where a square lands in the mirror(s). */
  function partners(r, c) {
    const R = state.rows - 1 - r, C = state.cols - 1 - c;
    if (state.axis === 'v') return [[r, C]];
    if (state.axis === 'h') return [[R, c]];
    return [[r, C], [R, c], [R, C]];
  }

  const openCells = () => {
    const out = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) if (!state.given || !state.given(r, c)) out.push([r, c]);
    }
    return out;
  };

  const solved = () => !!state.target &&
    state.grid.every((row, r) => row.every((key, c) => key === state.target[r][c]));

  const painted = () => state.grid.flat().filter(Boolean).length;

  const sparkle = (r, c) => AG.fx.animate(cells[r][c], 'is-spark', 600).then(() => cells[r]?.[c]?.classList.remove('is-spark'));

  /** Wake up the side she paints on, so she sees where to go. */
  function callOpenSide() {
    for (const [r, c] of openCells()) AG.fx.animate(cells[r][c], 'is-calling', 2400);
  }

  /* ---------------- painting ---------------- */

  let lastNudge = 0;

  function nudge() {
    const now = Date.now();
    if (now - lastNudge < 2500) return;
    lastNudge = now;
    AG.audio.play('miss');
    callOpenSide();
    hint('Paint on the empty side.');
  }

  /** One dab of paint (key = null rubs out). Every tap, drag and test comes through here. */
  function stroke(r, c, key, quiet = false) {
    if (state.phase !== 'paint' || !cells[r] || !cells[r][c]) return;
    key = COLOURS[key] ? key : null;

    if (state.target) {
      if (state.given(r, c)) { if (!quiet) nudge(); return; }
      const want = state.target[r][c];
      const have = state.grid[r][c];
      if (have === key) return;
      if (want && have === want) return;          // a right square stays put
      setCell(r, c, key);
      if (key && key === want) {
        AG.audio.play('match');
        sparkle(r, c);
      } else if (key) {
        AG.audio.play('flip');
        miss(r, c);
      } else {
        AG.audio.play('flip');
      }
    } else {
      const spots = [[r, c], ...partners(r, c)];
      if (spots.every(([i, j]) => state.grid[i][j] === key)) return;
      for (const [i, j] of spots) setCell(i, j, key);
      AG.audio.play('flip');
    }

    state.onPaint?.();
    if (state.isDone?.()) settle();
  }

  /** A square that does not match: no telling off, just a look across the mirror. */
  function miss(r, c) {
    state.misses++;
    AG.fx.animate(cells[r][c], 'is-off', 450);
    const twin = partners(r, c).find(([i, j]) => state.given(i, j));
    if (twin) AG.fx.animate(cells[twin[0]][twin[1]], 'is-look', 950);
    if (state.misses === 2) hint('Look across the mirror. Copy that square.');
    else if (state.misses === 5) hint('Stuck? Tap Check. 👀');
  }

  /** Check: rub out what does not match, and glow where paint is still missing. */
  function check() {
    if (state.phase !== 'paint' || !state.target || !state.tools.check) return;
    let wrong = 0, missing = 0;
    for (const [r, c] of openCells()) {
      const want = state.target[r][c], have = state.grid[r][c];
      if (have === want) continue;
      const node = cells[r][c];
      if (have) {
        wrong++;
        AG.fx.animate(node, 'is-off', 450).then(() => {
          if (cells[r]?.[c] === node && state.grid[r][c] === have) setCell(r, c, null);
        });
      }
      if (want) {
        missing++;
        node.classList.add('is-peek');
        setTimeout(() => node.classList.remove('is-peek'), 2600);
      }
    }
    board.querySelectorAll('.mp-mirror').forEach((node) => AG.fx.animate(node, 'is-flash', 750));
    AG.audio.play(wrong ? 'miss' : 'flip');
    if (missing) hint('Nearly! Paint the glowing squares.');
    else if (wrong) hint('Too much paint! I rubbed some out.');
    // rubbing out the extras can be the last thing the picture needed
    setTimeout(() => { if (state.isDone?.()) settle(); }, 500);
  }

  // Drag to paint. The first square decides: the same colour again rubs out.
  let drag = null;

  const cellAt = (node) => {
    const cell = node && node.closest ? node.closest('.mp-cell') : null;
    return cell && board.contains(cell) ? { r: +cell.dataset.r, c: +cell.dataset.c } : null;
  };

  board.addEventListener('pointerdown', (event) => {
    if (state.phase !== 'paint') return;
    const at = cellAt(event.target);
    if (!at) return;
    let key = state.colour === 'erase' ? null : state.colour;
    if (key && state.grid[at.r][at.c] === key) key = null;
    drag = { key };
    stroke(at.r, at.c, key);
    event.preventDefault();
  });
  board.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const at = cellAt(document.elementFromPoint(event.clientX, event.clientY));
    if (at) stroke(at.r, at.c, drag.key, true);
  });
  const stopDrag = () => { drag = null; };
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);

  /* ---------------- palette & side buttons ---------------- */

  function pickColour(key) {
    state.colour = key;
    paletteNode.querySelectorAll('.mp-paint').forEach((node) =>
      node.classList.toggle('is-picked', node.dataset.key === key));
  }

  function buildPalette(keys, { eraser = true } = {}) {
    const buttons = keys.map((key) => el('button', {
      class: 'mp-paint',
      type: 'button',
      'data-key': key,
      'aria-label': NAMES[key],
      title: NAMES[key],
      style: { '--mp-colour': COLOURS[key] },
      onClick: () => { pickColour(key); AG.audio.play('flip'); speak(NAMES[key]); },
    }));
    if (eraser) {
      buttons.push(el('button', {
        class: 'mp-paint mp-eraser',
        type: 'button',
        'data-key': 'erase',
        'aria-label': 'Rub out',
        title: 'Rub out',
        text: '🧽',
        onClick: () => { pickColour('erase'); AG.audio.play('flip'); speak('Rub out'); },
      }));
    }
    paletteNode.replaceChildren(...buttons);
    pickColour(keys[0]);
  }

  /** Which side buttons this mode has; setPhase decides when they show. */
  function setTools(tools) {
    state.tools = tools;
    freeBar.hidden = !tools.free;
    toFree.classList.toggle('is-here', state.mode === 'free');
    toPuzzles.classList.toggle('is-here', state.mode === 'puzzle');
    setPhase(state.phase);
  }

  function setPhase(phase) {
    state.phase = phase;
    nextButton.hidden = phase !== 'next';
    checkButton.hidden = !(state.tools.check && phase === 'paint');
    tadaButton.hidden = !(state.tools.free && phase === 'paint');
    board.classList.toggle('is-painting', phase === 'paint');
  }

  /* ---------------- waiting on Aisha ---------------- */

  const waiting = () => new Promise((resolve) => { state.resolve = resolve; });

  function settle(value) {
    const resolve = state.resolve;
    if (!resolve) return;
    state.resolve = null;
    resolve(value);
  }

  /** Let her paint until isDone() says the job is finished. */
  async function waitPaint(isDone) {
    const ok = guard();
    state.isDone = isDone;
    setPhase('paint');
    if (!isDone()) await ok(waiting());
    state.isDone = null;
    setPhase('idle');
  }

  async function waitNext(label = 'Next ▶') {
    const ok = guard();
    nextButton.textContent = label;
    setPhase('next');
    await ok(waiting());
    AG.audio.play('flip');
    setPhase('idle');
  }

  const next = () => { if (state.phase === 'next') settle(); };

  nextButton.addEventListener('click', next);
  checkButton.addEventListener('click', check);
  speakButton.addEventListener('click', readAll);

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('.ag-overlay')) return;
    // a focused button already turns Enter into a click
    if (event.target.closest && event.target.closest('button, a')) return;
    if (state.phase === 'next' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      next();
    }
  });

  /* ---------------- puzzles ---------------- */

  function startPuzzle(n) {
    run(async (ok) => {
      state.mode = 'puzzle';
      state.puzzle = Math.max(1, Math.min(PUZZLES.length, n));
      progress.mode = 'puzzle';
      saveProgress();

      const P = PUZZLES[state.puzzle - 1];
      const full = loadPicture(P);
      hud.textContent = `Puzzle ${state.puzzle} of ${PUZZLES.length}`;
      buildPalette(coloursIn(full));
      setTools({ check: true });

      if (P.lake) tell('The lake is a mirror. 🌊', `Paint the ${P.name} in the water, upside down.`);
      else if (P.axis === 'both') tell(`Two mirrors! ${P.emoji}`, 'Copy the corner into every empty corner.');
      else tell(`Finish the ${P.name}! ${P.emoji}`, 'Paint the empty side to match.');
      callOpenSide();

      await ok(waitPaint(solved));

      // done!
      progress.done[state.puzzle] = true;
      progress.unlocked = Math.min(PUZZLES.length, Math.max(progress.unlocked, state.puzzle + 1));
      saveProgress();
      AG.audio.play('win');
      const stopConfetti = AG.fx.confetti();
      state.grid.forEach((row, r) => row.forEach((key, c) => { if (key) setTimeout(() => sparkle(r, c), (r + c) * 40); }));
      AG.fx.animate(board, 'is-dancing', 950);
      tell('You did it! ✨', 'Both sides match.');
      await ok(delay(1900));

      const last = state.puzzle === PUZZLES.length;
      const actions = [];
      if (!last) actions.push({ label: 'Next puzzle ▶', variant: 'green', onClick: () => { stopConfetti(); startPuzzle(state.puzzle + 1); } });
      actions.push({ label: 'Free paint 🎨', variant: last ? 'pink' : 'quiet', onClick: () => { stopConfetti(); startFree(); } });
      if (last) actions.push({ label: 'Puzzles 🧩', variant: 'quiet', onClick: () => { stopConfetti(); showPuzzles(); } });
      AG.shell.overlay({
        title: last ? 'Mirror master! 🏆' : `${P.emoji} Done! 🎉`,
        message: last ? 'You finished every puzzle.' : 'Both sides match, like a mirror.',
        actions,
      });
    });
  }

  /* ---------------- free paint ---------------- */

  const PRAISE = [
    'Wow! What a beautiful picture!',
    'I love it! Both sides match.',
    'So pretty! You are a real artist.',
    'Ta-da! What lovely colours!',
  ];

  function saveFree() {
    progress.free = {
      axis: state.axis,
      rows: state.grid.map((row) => row.map((key) => key || '.').join('')),
    };
    saveProgress();
  }

  function paintAxisButtons() {
    freeBar.querySelectorAll('.mp-axis').forEach((node) =>
      node.classList.toggle('is-picked', node.dataset.axis === state.axis));
  }

  function startFree() {
    run(async () => {
      state.mode = 'free';
      progress.mode = 'free';
      const saved = progress.free;
      const fits = saved && Array.isArray(saved.rows) && saved.rows.length === FREE.rows &&
        saved.rows.every((row) => typeof row === 'string' && row.length === FREE.cols);
      setBoard({ ...FREE, axis: fits && ['v', 'h', 'both'].includes(saved.axis) ? saved.axis : 'v', free: true });
      if (fits) saved.rows.forEach((row, r) => [...row].forEach((ch, c) => setCell(r, c, keyOf(ch))));
      saveProgress();

      hud.textContent = 'Free paint';
      buildPalette(ALL);
      setTools({ free: true });
      paintAxisButtons();
      state.onPaint = saveFree;
      setPhase('paint');
      tell('Paint anything you like! 🎨', 'The mirror copies you.');
    });
  }

  function tada() {
    if (state.mode !== 'free' || state.phase !== 'paint') return;
    if (!painted()) { hint('Paint something first!'); return; }
    AG.audio.play('win');
    document.querySelector('.ag-confetti')?.remove();
    AG.fx.confetti({ pieces: 110, duration: 3200 });
    AG.fx.animate(board, 'is-dancing', 950);
    tell(pick(PRAISE), 'Keep painting, or try a puzzle.');
  }

  function clearFree() {
    if (state.mode !== 'free' || state.phase !== 'paint') return;
    for (let r = 0; r < state.rows; r++) for (let c = 0; c < state.cols; c++) setCell(r, c, null);
    AG.audio.play('flip');
    saveFree();
    hint('All clean! Paint again.');
  }

  function setAxis(axis) {
    if (state.mode !== 'free' || state.phase !== 'paint') return;
    state.axis = axis;
    drawMirror();
    paintAxisButtons();
    AG.audio.play('flip');
    saveFree();
    hint(axis === 'v' ? 'A side to side mirror.' : axis === 'h' ? 'An up and down mirror.' : 'Two mirrors!');
  }

  tadaButton.addEventListener('click', tada);
  freeBar.querySelector('.mp-clear').addEventListener('click', clearFree);
  freeBar.querySelectorAll('.mp-axis').forEach((node) =>
    node.addEventListener('click', () => setAxis(node.dataset.axis)));
  toFree.addEventListener('click', () => { if (state.mode !== 'free') startFree(); });
  toPuzzles.addEventListener('click', () => showPuzzles());

  /* ---------------- the lesson ---------------- */

  /** Fold the left half over the mirror line; it lands painted on the right. */
  async function fold() {
    const ok = guard();
    const half = state.cols / 2;
    const bits = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < half; c++) {
        const key = state.grid[r][c];
        bits.push(el('i', { style: { background: key ? COLOURS[key] : 'transparent' } }));
      }
    }
    const flap = el('div', { class: 'mp-flap', style: { '--mp-cols': half, '--mp-rows': state.rows } }, bits);
    board.append(flap);
    flap.getBoundingClientRect();
    flap.classList.add('is-folded');
    AG.audio.play('flip');
    await ok(delay(1500));
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < half; c++) {
        const key = state.grid[r][c];
        if (!key) continue;
        setCell(r, state.cols - 1 - c, key);
        sparkle(r, state.cols - 1 - c);
      }
    }
    AG.audio.play('match');
    flap.remove();
    await ok(delay(500));
  }

  function startLesson() {
    run(async (ok) => {
      state.mode = 'lesson';
      const stepHud = (k) => { hud.textContent = `Lesson · ${k} of ${LESSON_STEPS}`; };
      paletteNode.replaceChildren();
      setTools({});
      setPhase('idle');

      // 1 — one wing
      stepHud(1);
      loadPicture(LESSON_WING);
      tell('Look! A butterfly. 🦋', 'Only one wing is painted.');
      await ok(waitNext());

      // 2 — fold it over: the other wing is the same, the other way round
      stepHud(2);
      tell('Watch! The wing folds over.');
      await ok(delay(900));
      await ok(fold());
      tell('The two wings match!', 'Just like in a mirror.');
      await ok(waitNext());

      // 3 — a live mirror copies her
      stepHud(3);
      setBoard({ cols: 6, rows: 4, axis: 'v' });
      buildPalette(['v', 'y', 'b'], { eraser: false });
      tell('This line is a magic mirror. 🪞', 'Tap three squares.');
      await ok(waitPaint(() => painted() >= 6));
      tell('The mirror copies you!', 'Each square has a twin on the other side.');
      await ok(waitNext());

      // 4 — mirror off: she is the mirror
      stepHud(4);
      const heart = loadPicture(LESSON_HEART);
      buildPalette(coloursIn(heart), { eraser: false });
      setTools({ check: true });
      tell('Your turn! The mirror is asleep. 😴', 'Paint the empty side to match.');
      callOpenSide();
      await ok(waitPaint(solved));
      setTools({});
      AG.audio.play('match');
      state.grid.forEach((row, r) => row.forEach((key, c) => { if (key) sparkle(r, c); }));

      // 5 — the word for it, and where she can find it
      stepHud(5);
      tell('A heart! ❤️ Both sides match.', 'That is called symmetric. Butterflies 🦋, faces 🙂 and hearts ❤️ are symmetric.');
      await ok(waitNext("Let's paint! ▶"));

      progress.lesson = true;
      saveProgress();
      startPuzzle(state.puzzle);
    });
  }

  /* ---------------- puzzle picker & how to play ---------------- */

  function thumb(P) {
    const full = fullArt(P);
    return el('span', { class: 'mp-thumb', style: { '--mp-cols': full[0].length, '--mp-rows': full.length } },
      full.flat().map((key) => el('i', { style: key ? { background: COLOURS[key] } : {} })));
  }

  function showPuzzles() {
    const grid = el('div', { class: 'mp-puzzles' }, PUZZLES.map((P, i) => {
      const n = i + 1;
      const open = n <= progress.unlocked;
      return el('button', {
        class: 'mp-puzzle' + (progress.done[n] ? ' is-done' : '') + (n === state.puzzle && state.mode === 'puzzle' ? ' is-here' : ''),
        type: 'button',
        disabled: open ? null : '',
        'aria-label': open ? `Puzzle ${n}, ${P.name}` : `Puzzle ${n}, locked`,
        onClick: () => startPuzzle(n),
      }, [
        open ? thumb(P) : el('span', { class: 'mp-thumb-lock', text: '🔒' }),
        el('span', { class: 'mp-puzzle-num', text: String(n) }),
      ]);
    }));
    AG.shell.overlay({
      title: 'Pick a puzzle 🧩',
      dismissable: true,
      body: grid,
      actions: [{ label: 'Keep painting', variant: 'quiet' }],
    });
  }

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🦋',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { html: '<b>🎨 Paint:</b> pick a colour and tap or drag. The <b style="color:#b06cf0">mirror</b> copies you on the other side.' }),
        el('li', { html: '<b>🧩 Puzzles:</b> the mirror is asleep. Paint the empty side so both sides match.' }),
        el('li', { html: 'A right square sparkles ✨. Tap a square again to rub it out, or tap <b>Check 👀</b> for help.' }),
        el('li', { text: 'When both sides match, the picture is symmetric — like a butterfly!' }),
      ]),
      actions: [
        { label: 'Watch the lesson 🎓', variant: 'quiet', onClick: startLesson },
        { label: "Let's play!", variant: 'green' },
      ],
    });
  }

  /* ---------------- boot ---------------- */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Mirror Painter',
    emoji: '🦋',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      { icon: '🎓', label: 'The lesson', onClick: startLesson },
      { icon: AG.shell.icons.grid, label: 'Puzzles', color: '#b06cf0', onClick: showPuzzles },
      {
        icon: AG.shell.icons.restart,
        label: 'Start again',
        color: 'var(--ag-green)',
        onClick: () => {
          if (state.mode === 'lesson') startLesson();
          else if (state.mode === 'free') startFree();
          else startPuzzle(state.puzzle);
        },
      },
    ],
  });
  page.prepend(headerNode);
  // Muting should stop a sentence that is already being read.
  headerNode.addEventListener('click', () => { if (AG.audio.muted) hush(); });

  setBoard({ cols: 4, rows: 4, axis: 'v' });
  setTools({});

  if (progress.lesson) {
    if (progress.mode === 'free') startFree();
    else startPuzzle(state.puzzle);
  } else {
    // The first tap also lets the browser start talking.
    AG.shell.overlay({
      title: 'Mirror Painter 🦋',
      message: 'Paint one wing. The mirror paints the other!',
      actions: [{ label: 'Start ▶', variant: 'green', onClick: startLesson }],
    });
  }

  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__mpProbe = {
      state: () => state,
      progress: () => progress,
      puzzles: PUZZLES.length,
      target: () => state.target,
      solved,
      startPuzzle,
      startFree,
      startLesson,
      // one dab, through the same path as a tap; colour defaults to the brush
      paint: (r, c, colour) => stroke(r, c, colour === undefined ? state.colour : colour),
      erase: (r, c) => stroke(r, c, null),
      pickColour,
      next,
      check,
      tada,
      clear: clearFree,
      setAxis,
      /** Do whatever the game is waiting for: finish the picture, or feed the lesson's mirror. */
      solve() {
        if (state.phase !== 'paint') return false;
        if (state.target) {
          for (const [r, c] of openCells()) {
            if (state.grid[r][c] !== state.target[r][c]) stroke(r, c, state.target[r][c]);
          }
          return true;
        }
        if (state.mode === 'lesson') {
          for (let c = 0; c < 3; c++) stroke(0, c, 'v');
          return true;
        }
        return false;
      },
    };
  }
})();
