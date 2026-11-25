/* ------------------------------------------------------------------
   Maze Speller 🔤 — walk the maze, collect the letters in order to
   spell the word in the picture. Rules live in spec.md (designed by Aisha).
------------------------------------------------------------------ */

(() => {
  const { el, delay, shuffle, pick } = AG.util;
  const { N, E, S, W, DX, DY } = MazeSpellerMaze;

  // Bigger mazes and longer words as the levels climb.
  const LEVELS = [
    { cols: 5, rows: 4, letters: 3, decoys: 1 },
    { cols: 5, rows: 4, letters: 3, decoys: 2 },
    { cols: 6, rows: 5, letters: 3, decoys: 2 },
    { cols: 6, rows: 5, letters: 3, decoys: 3 },
    { cols: 7, rows: 5, letters: 4, decoys: 2 },
    { cols: 7, rows: 6, letters: 4, decoys: 3 },
    { cols: 8, rows: 6, letters: 4, decoys: 4 },
    { cols: 9, rows: 6, letters: 5, decoys: 3 },
    { cols: 9, rows: 7, letters: 5, decoys: 4 },
    { cols: 10, rows: 7, letters: 5, decoys: 5 },
    { cols: 11, rows: 8, letters: 6, decoys: 4 },
    { cols: 12, rows: 8, letters: 6, decoys: 5 },
  ];

  const STEP_MS = 150;        // how long the girl takes to walk one square
  const MISSES_FOR_HINT = 2;  // wrong letters before the right one glows
  const TILE_COLOURS = ['#ff5c9e', '#8b5cf6', '#2fc98a', '#3aa8ff', '#ff8a3d'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const page = document.querySelector('.ms-page');
  const banner = document.querySelector('.ms-banner');
  const levelsView = document.querySelector('.ms-view--levels');
  const levelsGrid = document.querySelector('.ms-levels');
  const mazeView = document.querySelector('.ms-view--maze');
  const clue = document.querySelector('.ms-clue');
  const slots = document.querySelector('.ms-slots');
  const infoLevel = document.querySelector('.ms-info-level');
  const infoClock = document.querySelector('.ms-info-clock');
  const board = document.querySelector('.ms-board');
  const canvas = document.querySelector('.ms-canvas');
  const bigX = document.querySelector('.ms-x');
  const ctx = canvas.getContext('2d');
  const fontFamily = getComputedStyle(document.body).fontFamily;

  const progress = AG.store.get('maze-speller', { unlocked: 1, best: {} });

  const state = {
    level: 1,
    word: '',
    emoji: '',
    maze: null,
    letters: [],        // { x, y, ch, colour, taken }
    spelled: 0,         // how many letters of the word are collected
    misses: 0,          // wrong letters since the last right one
    mistakes: 0,        // wrong letters this maze, for the win screen
    pos: { x: 0, y: 0 },
    facing: 1,          // 1 = looking right, -1 = looking left
    visited: new Set(),
    sparkles: [],
    shake: null,        // { letter, started } — the tile that just said no
    move: null,         // { from, to, started }
    queued: null,       // direction buffered while a step is animating
    path: [],           // directions still to walk after a tap
    playing: false,
    startedAt: 0,
    seconds: 0,
    lastWords: [],
    cell: 60,
    pad: 10,
  };

  /* ---------------- helpers ---------------- */

  const key = (x, y) => x + ',' + y;

  function say(html, { bump = false } = {}) {
    banner.innerHTML = html;
    if (bump) AG.fx.animate(banner, 'is-bumped', 500);
  }

  const clockText = (seconds) =>
    Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

  /** Read a word out loud. Quietly does nothing where speech isn't available. */
  function speak(text) {
    if (AG.audio.muted) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch { /* no speech here — the picture is still the clue */ }
  }

  const nextLetter = () => state.word[state.spelled];
  const letterAt = (x, y) => state.letters.find((l) => !l.taken && l.x === x && l.y === y);
  const hinting = () => state.playing && state.misses >= MISSES_FOR_HINT;

  /* ---------------- level select ---------------- */

  function showLevels() {
    state.playing = false;
    state.maze = null;
    mazeView.hidden = true;
    levelsView.hidden = false;
    say('Pick a level! <span class="ms-hl">' + progress.unlocked + '</span> unlocked');

    levelsGrid.replaceChildren();
    LEVELS.forEach((level, index) => {
      const number = index + 1;
      const locked = number > progress.unlocked;
      const best = progress.best[number];

      levelsGrid.append(el('button', {
        class: 'ms-level' + (best !== undefined ? ' is-done' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        'aria-label': locked ? `Level ${number}, locked` : `Level ${number}`,
        onClick: () => startLevel(number),
      }, [
        el('span', { class: 'ms-level-num', text: String(number) }),
        locked
          ? el('span', { class: 'ms-level-lock', text: '🔒' })
          : best !== undefined
            ? el('span', { class: 'ms-level-best', text: '⏱ ' + clockText(best) })
            : el('span', { class: 'ms-level-size', text: level.letters + ' letters' }),
      ]));
    });
  }

  /* ---------------- starting a maze ---------------- */

  function startLevel(level) {
    state.level = level;
    newMaze();
  }

  function pickWord(length) {
    const pool = MazeSpellerWords[length];
    const fresh = pool.filter(([word]) => !state.lastWords.includes(word));
    const choice = pick(fresh.length ? fresh : pool);
    state.lastWords = [choice[0], ...state.lastWords].slice(0, 8);
    return choice;
  }

  function newMaze() {
    const level = LEVELS[state.level - 1];
    const [word, emoji] = pickWord(level.letters);
    const maze = MazeSpellerMaze.create(level.cols, level.rows, word.length + level.decoys);

    // Dead ends first; if a tiny maze came up short, drop decoys before
    // anything else, and only then spill letters into ordinary squares.
    const decoyCount = Math.min(level.decoys, Math.max(0, maze.ends.length - word.length));
    const decoys = shuffle(ALPHABET.split('').filter((ch) => !word.includes(ch))).slice(0, decoyCount);
    const isEnd = (x, y) => maze.ends.some((c) => c.x === x && c.y === y);
    const spare = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (!isEnd(x, y) && !(x === maze.start.x && y === maze.start.y)) spare.push({ x, y });
      }
    }
    const homes = [...shuffle(maze.ends), ...shuffle(spare)];

    state.word = word;
    state.emoji = emoji;
    state.maze = maze;
    state.letters = shuffle([...word.split(''), ...decoys]).map((ch, i) => ({
      ...homes[i], ch, colour: TILE_COLOURS[i % TILE_COLOURS.length], taken: false,
    }));
    state.spelled = 0;
    state.misses = 0;
    state.mistakes = 0;
    state.pos = { ...maze.start };
    state.facing = 1;
    state.visited = new Set([key(maze.start.x, maze.start.y)]);
    state.sparkles = [];
    state.shake = null;
    state.move = null;
    state.queued = null;
    state.path = [];
    state.playing = true;
    state.startedAt = performance.now();
    state.seconds = 0;

    levelsView.hidden = true;
    mazeView.hidden = false;
    bigX.classList.remove('is-showing');

    clue.textContent = emoji;
    infoLevel.textContent = `Level ${state.level}`;
    paintSlots();
    paintClock();
    say('What is in the picture? <span class="ms-hl">Spell it!</span>');
    resize();
  }

  function paintSlots() {
    slots.replaceChildren(...state.word.split('').map((ch, i) =>
      el('span', {
        class: 'ms-slot' + (i < state.spelled ? ' is-filled' : '') + (i === state.spelled ? ' is-next' : ''),
        text: i < state.spelled ? ch : '',
      })
    ));
  }

  function paintClock() {
    infoClock.textContent = '⏱ ' + clockText(state.seconds);
  }

  function tick() {
    if (!state.playing) return;
    const seconds = Math.floor((performance.now() - state.startedAt) / 1000);
    if (seconds !== state.seconds) { state.seconds = seconds; paintClock(); }
  }

  /* ---------------- layout ---------------- */

  function resize() {
    if (!state.maze) return;
    const { cols, rows } = state.maze;

    const availableW = Math.min(window.innerWidth * 0.94, 1100);
    const availableH = window.innerHeight - board.getBoundingClientRect().top - window.scrollY - 26;
    const cell = Math.max(30, Math.min(120, Math.floor(Math.min(availableW / (cols + 0.3), availableH / (rows + 0.3)))));

    state.cell = cell;
    state.pad = Math.round(cell * 0.15);

    const cssW = cols * cell + state.pad * 2;
    const cssH = rows * cell + state.pad * 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bigX.style.fontSize = Math.round(Math.min(cssW, cssH) * 0.8) + 'px';
  }

  const cellCenter = (x, y) => ({
    cx: state.pad + (x + 0.5) * state.cell,
    cy: state.pad + (y + 0.5) * state.cell,
  });

  /* ---------------- drawing ---------------- */

  function draw() {
    if (!state.maze) return;
    const { cols, rows } = state.maze;
    const cell = state.cell;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(state.pad, state.pad, cols * cell, rows * cell);

    drawFootprints();
    drawWalls();
    drawLetters();
    drawSparkles();
    drawGirl();
  }

  /** A soft dot on every square she has walked, so she can see where she's been. */
  function drawFootprints() {
    ctx.fillStyle = 'rgba(255, 138, 61, 0.2)';
    for (const id of state.visited) {
      const [x, y] = id.split(',').map(Number);
      const { cx, cy } = cellCenter(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, state.cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWalls() {
    const { cols, rows, open } = state.maze;
    const cell = state.cell;

    ctx.strokeStyle = '#5b3d7a';
    ctx.lineWidth = Math.max(4, cell * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const left = state.pad + x * cell, top = state.pad + y * cell;
        const mask = open[y][x];
        if (!(mask & N)) { ctx.moveTo(left, top); ctx.lineTo(left + cell, top); }
        if (!(mask & W)) { ctx.moveTo(left, top); ctx.lineTo(left, top + cell); }
        if (y === rows - 1) { ctx.moveTo(left, top + cell); ctx.lineTo(left + cell, top + cell); }
        if (x === cols - 1) { ctx.moveTo(left + cell, top); ctx.lineTo(left + cell, top + cell); }
      }
    }
    ctx.stroke();
  }

  function drawLetters() {
    const cell = state.cell;
    const now = performance.now();
    const glowLetter = hinting() ? nextLetter() : null;

    for (const letter of state.letters) {
      if (letter.taken) continue;
      let { cx, cy } = cellCenter(letter.x, letter.y);
      let size = cell * 0.66;
      const glowing = letter.ch === glowLetter;

      if (state.shake && state.shake.letter === letter) {
        const t = (now - state.shake.started) / 450;
        if (t >= 1) state.shake = null;
        else cx += Math.sin(t * Math.PI * 6) * cell * 0.08 * (1 - t);
      }

      ctx.save();
      if (glowing) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 260);
        size *= 1 + pulse * 0.1;
        ctx.shadowColor = 'rgba(255, 197, 49, 0.95)';
        ctx.shadowBlur = cell * (0.3 + pulse * 0.35);
        ctx.fillStyle = '#ffc531';
        ctx.beginPath();
        ctx.roundRect(cx - size * 0.58, cy - size * 0.58, size * 1.16, size * 1.16, size * 0.3);
        ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(96, 62, 130, 0.22)';
        ctx.shadowBlur = cell * 0.1;
        ctx.shadowOffsetY = cell * 0.04;
      }
      ctx.fillStyle = letter.colour;
      ctx.beginPath();
      ctx.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.26);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.round(size * 0.74)}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter.ch, cx, cy + size * 0.05);
    }
  }

  /** The little girl: pigtails, pink dress, and legs that swing as she walks. */
  function drawGirl() {
    const cell = state.cell;
    const now = performance.now();
    let { cx, cy } = cellCenter(state.pos.x, state.pos.y);
    let swing = 0;

    if (state.move) {
      const t = Math.min(1, (now - state.move.started) / STEP_MS);
      const from = cellCenter(state.move.from.x, state.move.from.y);
      const to = cellCenter(state.move.to.x, state.move.to.y);
      cx = from.cx + (to.cx - from.cx) * t;
      cy = from.cy + (to.cy - from.cy) * t - Math.sin(t * Math.PI) * cell * 0.05;
      swing = Math.sin(now / 55);
    }

    const u = cell * 0.4;            // she is about 2u tall
    const skin = '#d9a273', hair = '#3a2317', dress = '#ff5c9e';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(state.facing, 1);
    ctx.lineCap = 'round';

    // shadow
    ctx.fillStyle = 'rgba(59, 44, 74, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, u * 1.02, u * 0.62, u * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs and shoes
    ctx.strokeStyle = skin;
    ctx.lineWidth = u * 0.17;
    for (const side of [-1, 1]) {
      const footX = side * u * 0.2 + swing * side * u * 0.22;
      ctx.beginPath();
      ctx.moveTo(side * u * 0.18, u * 0.5);
      ctx.lineTo(footX, u * 0.9);
      ctx.stroke();
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.ellipse(footX + u * 0.06, u * 0.94, u * 0.17, u * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // arms
    ctx.strokeStyle = skin;
    ctx.lineWidth = u * 0.15;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * u * 0.2, -u * 0.02);
      ctx.lineTo(side * u * 0.52 - swing * side * u * 0.1, u * 0.3);
      ctx.stroke();
    }

    // dress
    ctx.fillStyle = dress;
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, -u * 0.12);
    ctx.lineTo(u * 0.2, -u * 0.12);
    ctx.lineTo(u * 0.52, u * 0.6);
    ctx.quadraticCurveTo(0, u * 0.74, -u * 0.52, u * 0.6);
    ctx.closePath();
    ctx.fill();

    // pigtails, behind the head
    const headY = -u * 0.5, headR = u * 0.4;
    ctx.fillStyle = hair;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * headR * 1.12, headY + headR * 0.05, headR * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    // bobbles
    ctx.fillStyle = '#ffc531';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * headR * 0.86, headY - headR * 0.22, headR * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // fringe
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(0, headY, headR * 1.03, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(0, headY - headR * 0.55, -headR * 1.03, headY - headR * 0.06);
    ctx.closePath();
    ctx.fill();

    // face — nudged the way she is walking
    ctx.fillStyle = '#2c1b3d';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * headR * 0.34 + headR * 0.1, headY + headR * 0.12, headR * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#2c1b3d';
    ctx.lineWidth = Math.max(1.2, headR * 0.09);
    ctx.beginPath();
    ctx.arc(headR * 0.1, headY + headR * 0.32, headR * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------------- sparkles ---------------- */

  function drawStar(cx, cy, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? radius * 0.46 : radius;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function addSparkle(x, y, colour) {
    const { cx, cy } = cellCenter(x, y);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random();
      const speed = state.cell * (0.6 + Math.random() * 0.9);
      state.sparkles.push({
        x: cx, y: cy, colour,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: performance.now(),
        life: 420 + Math.random() * 260,
      });
    }
  }

  function drawSparkles() {
    const now = performance.now();
    state.sparkles = state.sparkles.filter((p) => now - p.born < p.life);

    for (const p of state.sparkles) {
      const t = (now - p.born) / p.life;
      ctx.globalAlpha = 1 - t;
      drawStar(p.x + p.vx * t * 0.55, p.y + p.vy * t * 0.55 + state.cell * t * t * 0.4,
        state.cell * 0.1 * (1 - t * 0.5), p.colour);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- movement ---------------- */

  const DIRECTIONS = {
    ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W,
    w: N, d: E, s: S, a: W,
  };

  function onKeyDown(event) {
    const dir = DIRECTIONS[event.key] ?? DIRECTIONS[event.key.toLowerCase?.()];
    if (!dir) return;
    event.preventDefault();
    if (!state.playing || document.querySelector('.ag-overlay')) return;

    state.path = [];
    if (state.move) { state.queued = dir; return; }
    step(dir);
  }

  /** Tap a square and she walks there — in this maze there is only one way. */
  function onPointerDown(event) {
    if (!state.playing) return;
    event.preventDefault();
    const box = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left - state.pad) / state.cell);
    const y = Math.floor((event.clientY - box.top - state.pad) / state.cell);
    const { cols, rows } = state.maze;
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;

    state.queued = null;
    state.path = MazeSpellerMaze.route(state.maze, state.pos, { x, y });
    if (!state.move && state.path.length) step(state.path.shift());
  }

  function step(dir) {
    const { x, y } = state.pos;

    if (!MazeSpellerMaze.canGo(state.maze, x, y, dir)) {
      state.path = [];
      AG.fx.animate(canvas, 'is-blocked', 300);
      return;
    }

    const to = { x: x + DX[dir], y: y + DY[dir] };
    if (dir === E) state.facing = 1;
    if (dir === W) state.facing = -1;
    state.move = { from: { x, y }, to, started: performance.now() };
    state.pos = to;
    AG.audio.play('flip');

    setTimeout(finishStep, STEP_MS);
  }

  function finishStep() {
    if (!state.move) return;            // the maze was swapped mid-step
    state.move = null;
    state.visited.add(key(state.pos.x, state.pos.y));
    arrive();
    if (!state.playing) return;

    const dir = state.queued || state.path.shift();
    state.queued = null;
    if (dir) step(dir);
  }

  /* ---------------- letters ---------------- */

  function arrive() {
    const letter = letterAt(state.pos.x, state.pos.y);
    if (!letter) return;
    if (letter.ch === nextLetter()) collect(letter); else wrong(letter);
  }

  function collect(letter) {
    letter.taken = true;
    state.spelled += 1;
    state.misses = 0;
    addSparkle(letter.x, letter.y, letter.colour);
    AG.audio.play('match');
    paintSlots();
    AG.fx.animate(slots.children[state.spelled - 1], 'is-popped', 500);

    if (state.spelled === state.word.length) { finish(); return; }
    say(`<span class="ms-hl">${letter.ch}</span> — yes! What comes next?`, { bump: true });
  }

  function wrong(letter) {
    state.misses += 1;
    state.mistakes += 1;
    state.path = [];
    state.shake = { letter, started: performance.now() };
    AG.audio.play('miss');
    AG.fx.animate(bigX, 'is-showing', 900);
    say(hinting()
      ? 'Look for the <span class="ms-hl">glowing</span> letter! ✨'
      : 'Not that one yet — try another letter!', { bump: true });
  }

  /* ---------------- finishing ---------------- */

  async function finish() {
    state.playing = false;
    state.path = [];
    state.queued = null;
    const { word, emoji, level, seconds, mistakes } = state;

    const best = progress.best[level];
    if (best === undefined || seconds < best) progress.best[level] = seconds;
    const nextLevel = level + 1;
    const unlockedSomething = nextLevel <= LEVELS.length && progress.unlocked < nextLevel;
    if (unlockedSomething) progress.unlocked = nextLevel;
    AG.store.set('maze-speller', progress);

    say(`${emoji} <span class="ms-hl">${word}</span>!`, { bump: true });
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    await delay(700);
    speak(word);

    const actions = [];
    if (nextLevel <= LEVELS.length) {
      actions.push({
        label: 'Next maze →',
        variant: 'green',
        onClick: () => { stopConfetti(); startLevel(nextLevel); },
      });
    }
    actions.push({ label: 'Another word', variant: 'pink', onClick: () => { stopConfetti(); newMaze(); } });
    actions.push({ label: 'All levels', variant: 'quiet', onClick: () => { stopConfetti(); showLevels(); } });

    AG.shell.overlay({
      title: `${emoji} ${word}!`,
      message: nextLevel > LEVELS.length
        ? 'That was the last level — you can spell them all!'
        : (unlockedSomething ? `You spelled it! Level ${nextLevel} is unlocked.` : 'You spelled it!'),
      body: el('div', { class: 'ms-win' }, [
        el('div', { class: 'ms-win-word' }, word.split('').map((ch) => el('span', { text: ch }))),
        el('div', {
          class: 'ms-win-stats',
          text: '⏱ ' + clockText(seconds) + (mistakes ? '' : '   ·   ⭐ No wrong letters!'),
        }),
      ]),
      actions,
    });
  }

  /* ---------------- how to play ---------------- */

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🔤',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'Look at the picture. What is it? Tap it to hear the word.' }),
        el('li', { text: 'Walk through the maze with the arrow keys, or tap where you want to go.' }),
        el('li', { text: 'Pick up the letters in the right order to spell the word.' }),
        el('li', { text: 'A big X means not that letter yet — just try another one.' }),
        el('li', { text: 'Stuck? After two X’s the right letter starts to glow ✨' }),
        el('li', { text: 'Take as long as you like. The clock is only for fun.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  const clearPanels = () => {
    document.querySelector('.ag-overlay')?.remove();
    document.querySelector('.ag-confetti')?.remove();
  };

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Maze Speller',
    emoji: '🔤',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      {
        icon: AG.shell.icons.grid,
        label: 'All levels',
        color: 'var(--ag-blue)',
        onClick: () => { clearPanels(); showLevels(); },
      },
      {
        icon: AG.shell.icons.restart,
        label: 'New maze',
        color: 'var(--ag-green)',
        onClick: () => { clearPanels(); if (state.maze) newMaze(); else showLevels(); },
      },
    ],
  });

  page.prepend(headerNode);

  clue.addEventListener('click', () => {
    if (!state.word) return;
    speak(state.word);
    AG.fx.animate(clue, 'is-popped', 500);
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  setInterval(tick, 250);

  (function frame() {
    draw();
    requestAnimationFrame(frame);
  })();

  showLevels();

  // Debug seam — the Mac app sets __AISHA_DEV with AISHA_DEV=1; in a browser
  // add #dev to the URL.
  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__mazeSpellerProbe = {
      state: () => state,
      levels: () => LEVELS,
      pos: () => ({ ...state.pos }),
      route: (x, y) => MazeSpellerMaze.route(state.maze, state.pos, { x, y }),
      /** Where on screen a square is, so a test can really click it. */
      point: (x, y) => {
        const box = canvas.getBoundingClientRect();
        const { cx, cy } = cellCenter(x, y);
        return { x: box.left + cx, y: box.top + cy };
      },
    };
  }
})();
