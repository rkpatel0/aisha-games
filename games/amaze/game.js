/* ------------------------------------------------------------------
   Amaze! 🌟 — escape a freshly generated maze, collecting stars.
   Rules live in spec.md (written by Aisha).
------------------------------------------------------------------ */

(() => {
  const { el, delay } = AG.util;
  const { N, E, S, W, DX, DY } = AmazeMaze;

  // Level 1 is a gentle 5×5; level 10 is a 21×21 with ten stars.
  const LEVELS = [
    { size: 5, stars: 3 }, { size: 7, stars: 3 }, { size: 9, stars: 4 },
    { size: 10, stars: 4 }, { size: 11, stars: 5 }, { size: 13, stars: 6 },
    { size: 15, stars: 7 }, { size: 17, stars: 8 }, { size: 19, stars: 9 },
    { size: 21, stars: 10 },
  ];

  const STEP_MS = 110;   // how long the player takes to slide one cell

  const page = document.querySelector('.ama-page');
  const banner = document.querySelector('.ama-banner');
  const levelsView = document.querySelector('.ama-view--levels');
  const levelsGrid = document.querySelector('.ama-levels');
  const mazeView = document.querySelector('.ama-view--maze');
  const hudLevel = document.querySelector('.ama-hud-level');
  const hudStars = document.querySelector('.ama-hud-stars');
  const canvas = document.querySelector('.ama-canvas');
  const ctx = canvas.getContext('2d');

  const progress = AG.store.get('amaze', { unlocked: 1, best: {} });

  const state = {
    level: 1,
    maze: null,
    pos: { x: 0, y: 0 },
    trail: [],          // every cell walked, in order — dead ends included
    collected: new Set(),
    sparkles: [],
    move: null,         // { from, to, started }
    queued: null,       // direction buffered while a step is animating
    playing: false,
    cell: 30,
    pad: 24,
  };

  /* ---------------- helpers ---------------- */

  const key = (x, y) => x + ',' + y;

  function say(html, { bump = false } = {}) {
    banner.innerHTML = html;
    if (bump) AG.fx.animate(banner, 'is-bumped', 500);
  }

  function saveProgress() {
    AG.store.set('amaze', progress);
  }

  /* ---------------- level select ---------------- */

  function showLevels() {
    state.playing = false;
    mazeView.hidden = true;
    levelsView.hidden = false;
    say('Pick a level! <span class="ama-hl">' + progress.unlocked + '</span> unlocked');

    levelsGrid.replaceChildren();
    LEVELS.forEach((level, index) => {
      const number = index + 1;
      const locked = number > progress.unlocked;
      const best = progress.best[number];

      const button = el('button', {
        class: 'ama-level' + (best ? ' is-done' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        'aria-label': locked ? `Level ${number}, locked` : `Level ${number}`,
        onClick: () => startLevel(number),
      }, [
        el('span', { class: 'ama-level-num', text: String(number) }),
        locked
          ? el('span', { class: 'ama-level-lock', text: '🔒' })
          : best
            ? el('span', { class: 'ama-level-stars', text: `⭐ ${best.stars} / ${best.total}` })
            : el('span', { class: 'ama-level-size', text: `${level.size}×${level.size}` }),
      ]);

      levelsGrid.append(button);
    });
  }

  /* ---------------- starting a level ---------------- */

  function startLevel(level) {
    state.level = level;
    newMaze();
  }

  function newMaze() {
    const { size, stars } = LEVELS[state.level - 1];
    state.maze = AmazeMaze.create(size, stars);
    state.pos = { ...state.maze.entry };
    state.trail = [{ ...state.maze.entry }];
    state.collected = new Set();
    state.sparkles = [];
    state.move = null;
    state.queued = null;
    state.playing = true;

    levelsView.hidden = true;
    mazeView.hidden = false;

    paintHud();
    say('Use the <span class="ama-hl">arrow keys</span> to find the way out!');
    resize();
  }

  function paintHud() {
    const total = state.maze ? state.maze.stars.length : 0;
    hudLevel.textContent = `Level ${state.level}`;
    hudStars.textContent = `⭐ ${state.collected.size} / ${total}`;
  }

  /* ---------------- layout ---------------- */

  function resize() {
    if (!state.maze) return;
    const size = state.maze.size;

    const availableW = Math.min(window.innerWidth * 0.94, 940);
    const availableH = window.innerHeight - 250;
    // Leave room either side of the grid for the doorway markers.
    const cell = Math.max(14, Math.floor(Math.min(availableW / (size + 1.8), availableH / (size + 0.6))));

    state.cell = cell;
    state.pad = Math.round(cell * 0.9);

    const cssW = size * cell + state.pad * 2;
    const cssH = size * cell + Math.round(cell * 0.3) * 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const originX = () => state.pad;
  const originY = () => Math.round(state.cell * 0.3);
  const cellCenter = (x, y) => ({
    cx: originX() + (x + 0.5) * state.cell,
    cy: originY() + (y + 0.5) * state.cell,
  });

  /* ---------------- drawing ---------------- */

  function draw() {
    if (!state.maze) return;
    const { size, open, entry, exit } = state.maze;
    const cell = state.cell;
    const ox = originX(), oy = originY();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // floor
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(ox, oy, size * cell, size * cell);

    drawDoorways(entry, exit);
    drawTrail();
    drawStars();
    drawWalls();
    drawSparkles();
    drawPlayer();
  }

  function drawWalls() {
    const { size, open } = state.maze;
    const cell = state.cell;
    const ox = originX(), oy = originY();

    ctx.strokeStyle = '#5b3d7a';
    ctx.lineWidth = Math.max(3, cell * 0.17);
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const left = ox + x * cell, top = oy + y * cell;
        const mask = open[y][x];
        if (!(mask & N)) { ctx.moveTo(left, top); ctx.lineTo(left + cell, top); }
        if (!(mask & W)) { ctx.moveTo(left, top); ctx.lineTo(left, top + cell); }
        if (y === size - 1 && !(mask & S)) { ctx.moveTo(left, top + cell); ctx.lineTo(left + cell, top + cell); }
        if (x === size - 1 && !(mask & E)) { ctx.moveTo(left + cell, top); ctx.lineTo(left + cell, top + cell); }
      }
    }
    ctx.stroke();
  }

  function drawDoorways(entry, exit) {
    const cell = state.cell;
    const entryPos = cellCenter(entry.x, entry.y);
    const exitPos = cellCenter(exit.x, exit.y);

    // green arrow pointing in
    const ax = entryPos.cx - cell * 0.5 - state.pad * 0.55;
    ctx.fillStyle = '#2fc98a';
    ctx.beginPath();
    ctx.moveTo(ax - cell * 0.22, entryPos.cy - cell * 0.28);
    ctx.lineTo(ax + cell * 0.26, entryPos.cy);
    ctx.lineTo(ax - cell * 0.22, entryPos.cy + cell * 0.28);
    ctx.closePath();
    ctx.fill();

    // golden door out
    const dx = exitPos.cx + cell * 0.5 + state.pad * 0.14;
    const dw = state.pad * 0.62, dh = cell * 0.78;
    ctx.fillStyle = '#ffc531';
    ctx.beginPath();
    ctx.roundRect(dx, exitPos.cy - dh / 2, dw, dh, [0, dw * 0.4, dw * 0.4, 0]);
    ctx.fill();
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(dx + dw * 0.7, exitPos.cy, Math.max(1.6, cell * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrail() {
    if (state.trail.length < 2) return;
    const cell = state.cell;

    ctx.lineWidth = cell * 0.34;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // blue at the start of the walk, purple by the end
    for (let i = 1; i < state.trail.length; i++) {
      const a = cellCenter(state.trail[i - 1].x, state.trail[i - 1].y);
      const b = cellCenter(state.trail[i].x, state.trail[i].y);
      const t = i / Math.max(1, state.trail.length - 1);
      ctx.strokeStyle = mixColour([58, 168, 255], [139, 92, 246], t, 0.55);
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(b.cx, b.cy);
      ctx.stroke();
    }
  }

  function mixColour(from, to, t, alpha) {
    const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
  }

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

  function drawStars() {
    const radius = state.cell * 0.3;
    for (const star of state.maze.stars) {
      if (state.collected.has(key(star.x, star.y))) continue;
      const { cx, cy } = cellCenter(star.x, star.y);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 197, 49, 0.75)';
      ctx.shadowBlur = state.cell * 0.35;
      drawStar(cx, cy, radius, '#ffc531');
      ctx.restore();
    }
  }

  /** A little ladybird, so there's someone to root for. */
  function drawPlayer() {
    const cell = state.cell;
    let { cx, cy } = cellCenter(state.pos.x, state.pos.y);

    if (state.move) {
      const t = Math.min(1, (performance.now() - state.move.started) / STEP_MS);
      const eased = t * t * (3 - 2 * t);
      const from = cellCenter(state.move.from.x, state.move.from.y);
      const to = cellCenter(state.move.to.x, state.move.to.y);
      cx = from.cx + (to.cx - from.cx) * eased;
      cy = from.cy + (to.cy - from.cy) * eased;
    }

    const r = cell * 0.33;

    ctx.fillStyle = 'rgba(59, 44, 74, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8365d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2c1b3d';
    ctx.lineWidth = Math.max(1.4, r * 0.13);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.72);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    ctx.fillStyle = '#2c1b3d';
    for (const [sx, sy] of [[-0.42, 0.1], [0.42, 0.1], [-0.3, 0.6], [0.3, 0.6]]) {
      ctx.beginPath();
      ctx.arc(cx + sx * r, cy + sy * r, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.82, r * 0.44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    for (const sx of [-0.2, 0.2]) {
      ctx.beginPath();
      ctx.arc(cx + sx * r, cy - r * 0.92, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------------- sparkles ---------------- */

  function addSparkle(x, y) {
    const { cx, cy } = cellCenter(x, y);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random();
      const speed = state.cell * (0.6 + Math.random() * 0.9);
      state.sparkles.push({
        x: cx, y: cy,
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
      const px = p.x + p.vx * t * 0.55;
      const py = p.y + p.vy * t * 0.55 + state.cell * t * t * 0.5;
      ctx.globalAlpha = 1 - t;
      drawStar(px, py, state.cell * 0.12 * (1 - t * 0.5), '#ffd23f');
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
    if (!state.playing) return;

    if (state.move) { state.queued = dir; return; }
    step(dir);
  }

  function step(dir) {
    const { x, y } = state.pos;
    const maze = state.maze;

    if (!AmazeMaze.canGo(maze, x, y, dir)) {
      AG.fx.animate(canvas, 'is-blocked', 300);
      AG.audio.play('miss');
      return;
    }

    const nx = x + DX[dir], ny = y + DY[dir];

    // Stepping off the right-hand edge through the exit door wins the level.
    if (nx >= maze.size) {
      if (x === maze.exit.x && y === maze.exit.y) { escape(); }
      return;
    }
    if (nx < 0 || ny < 0 || ny >= maze.size) return;   // the way you came in

    state.move = { from: { x, y }, to: { x: nx, y: ny }, started: performance.now() };
    state.pos = { x: nx, y: ny };
    AG.audio.play('flip');

    setTimeout(finishStep, STEP_MS);
  }

  function finishStep() {
    state.move = null;
    state.trail.push({ ...state.pos });
    collectStarHere();

    if (state.queued) {
      const dir = state.queued;
      state.queued = null;
      if (state.playing) step(dir);
    }
  }

  function collectStarHere() {
    const id = key(state.pos.x, state.pos.y);
    const onStar = state.maze.stars.some((s) => key(s.x, s.y) === id);
    if (!onStar || state.collected.has(id)) return;

    state.collected.add(id);
    addSparkle(state.pos.x, state.pos.y);
    AG.audio.play('match');
    paintHud();

    const total = state.maze.stars.length;
    say(state.collected.size === total
      ? 'All the stars! <span class="ama-hl">Now find the door!</span>'
      : `⭐ <span class="ama-hl">${state.collected.size}</span> of ${total}!`, { bump: true });
  }

  /* ---------------- finishing ---------------- */

  async function escape() {
    state.playing = false;
    const total = state.maze.stars.length;
    const stars = state.collected.size;

    const best = progress.best[state.level];
    if (!best || stars > best.stars) progress.best[state.level] = { stars, total };

    const nextLevel = state.level + 1;
    const unlockedSomething = nextLevel <= LEVELS.length && progress.unlocked < nextLevel;
    if (unlockedSomething) progress.unlocked = nextLevel;
    saveProgress();

    say('You did it! 🌟');
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    await delay(350);

    const actions = [];
    if (nextLevel <= LEVELS.length) {
      actions.push({
        label: `Level ${nextLevel} →`,
        variant: 'green',
        onClick: () => { stopConfetti(); startLevel(nextLevel); },
      });
    }
    actions.push({ label: 'Play again', variant: 'pink', onClick: () => { stopConfetti(); newMaze(); } });
    actions.push({ label: 'All levels', variant: 'quiet', onClick: () => { stopConfetti(); showLevels(); } });

    AG.shell.overlay({
      title: 'You did it! 🌟',
      message: nextLevel > LEVELS.length
        ? 'That was the last level — you finished the whole thing!'
        : (unlockedSomething ? `Level ${nextLevel} is unlocked!` : `Level ${state.level} escaped again!`),
      body: el('div', { class: 'ama-win-stars', text: `⭐ ${stars} / ${total} stars` }),
      actions,
    });
  }

  /* ---------------- how to play ---------------- */

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🌟',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'Use the arrow keys to move through the maze.' }),
        el('li', { text: 'Collect the stars ⭐' }),
        el('li', { text: 'Find your way out the other side!' }),
        el('li', { text: 'Your blue-and-purple trail shows where you have been.' }),
        el('li', { text: 'Finish a level to unlock the next one.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Amaze!',
    emoji: '🌟',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      {
        icon: AG.shell.icons.grid,
        label: 'All levels',
        color: 'var(--ag-blue)',
        onClick: () => {
          document.querySelector('.ag-overlay')?.remove();
          document.querySelector('.ag-confetti')?.remove();
          showLevels();
        },
      },
      {
        icon: AG.shell.icons.restart,
        label: 'New maze',
        color: 'var(--ag-green)',
        onClick: () => {
          document.querySelector('.ag-overlay')?.remove();
          document.querySelector('.ag-confetti')?.remove();
          if (state.maze) newMaze(); else showLevels();
        },
      },
    ],
  });

  page.prepend(headerNode);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);

  (function frame() {
    draw();
    requestAnimationFrame(frame);
  })();

  showLevels();

  // Debug seam — the Mac app sets __AISHA_DEV with AISHA_DEV=1; in a browser
  // add #dev to the URL.
  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__amazeProbe = {
      maze: () => state.maze,
      pos: () => ({ ...state.pos }),
      trail: () => state.trail.length,
      stars: () => state.collected.size,
      level: () => state.level,
      playing: () => state.playing,
    };
  }
})();
