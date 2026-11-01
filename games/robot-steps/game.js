/* ------------------------------------------------------------------
   Robot Steps 🤖 — build a plan out of picture blocks, press Play,
   and watch the robot follow it one step at a time.
   Rules live in spec.md (written by Aisha).
------------------------------------------------------------------ */

(() => {
  const { el, delay } = AG.util;

  const STEP_MS = 900;      // one block per step — slow enough to follow
  const MOVE_MS = 460;      // how much of that the robot spends moving
  const REPEAT_CHOICES = [2, 3, 4, 5];

  // dir 0 = north, 1 = east, 2 = south, 3 = west
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  const icon = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const BLOCKS = {
    forward: { word: 'Go', icon: icon('<path d="M12 20V5"/><path d="M6 11l6-6 6 6"/>') },
    left: { word: 'Left', icon: icon('<path d="M15.5 20v-9.5H9"/><path d="M13 6.2 8.4 10.5 13 14.8"/>') },
    right: { word: 'Right', icon: icon('<path d="M8.5 20v-9.5H15"/><path d="M11 6.2l4.6 4.3L11 14.8"/>') },
    jump: { word: 'Jump', icon: icon('<path d="M3.5 19.5Q12 2.5 20.5 19.5"/><circle cx="12" cy="19.6" r="2.1" fill="currentColor" stroke="none"/>') },
    repeat: { word: 'Repeat', icon: icon('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.6v5.2h-5.2"/>') },
  };

  const page = document.querySelector('.rs-page');
  const banner = document.querySelector('.rs-banner');
  const levelsView = document.querySelector('.rs-view--levels');
  const levelsGrid = document.querySelector('.rs-levels');
  const playView = document.querySelector('.rs-view--play');
  const canvas = document.querySelector('.rs-canvas');
  const ctx = canvas.getContext('2d');
  const palette = document.querySelector('.rs-palette');
  const strip = document.querySelector('.rs-strip');
  const playButton = document.querySelector('.rs-play');
  const resetButton = document.querySelector('.rs-reset');
  const clearButton = document.querySelector('.rs-clear');

  const progress = AG.store.get('robot-steps', { unlocked: 1, best: {} });

  let nextId = 1;

  const state = {
    level: 1,
    def: null,
    program: [],
    selectedRepeat: null,
    robot: { x: 0, y: 0, dir: 1 },
    gems: new Set(),
    pose: { x: 0, y: 0, angle: 0 },
    tween: null,
    hop: 0,
    face: 'happy',
    sparkles: [],
    running: false,
    dancing: false,
    cell: 60,
  };

  const cellKey = (x, y) => x + ',' + y;

  function say(html, { bump = false } = {}) {
    banner.innerHTML = html;
    if (bump) AG.fx.animate(banner, 'is-bumped', 500);
  }

  /* ================= program model ================= */

  const makeNode = (kind) =>
    kind === 'repeat'
      ? { id: nextId++, kind: 'repeat', times: 2, body: [] }
      : { id: nextId++, kind };

  /** The list a new block should go into: inside the selected repeat, else the strip. */
  function targetList(kind) {
    if (kind === 'repeat' || state.selectedRepeat === null) return state.program;
    const repeat = state.program.find((n) => n.kind === 'repeat' && n.id === state.selectedRepeat);
    return repeat ? repeat.body : state.program;
  }

  function addBlock(kind) {
    if (state.running) return;
    const node = makeNode(kind);
    targetList(kind).push(node);
    if (kind === 'repeat') state.selectedRepeat = node.id;
    AG.audio.play('flip');
    renderStrip();
  }

  /** Remove a node by id from wherever it lives, and return it. */
  function takeNode(id) {
    const lists = [state.program, ...state.program.filter((n) => n.kind === 'repeat').map((n) => n.body)];
    for (const list of lists) {
      const index = list.findIndex((n) => n.id === id);
      if (index !== -1) return list.splice(index, 1)[0];
    }
    return null;
  }

  function removeBlock(id) {
    if (state.running) return;
    const node = takeNode(id);
    if (node && node.id === state.selectedRepeat) state.selectedRepeat = null;
    AG.audio.play('miss');
    renderStrip();
  }

  /** Expand repeats into the flat list of steps the robot will perform. */
  function flatten(nodes, out = []) {
    for (const node of nodes) {
      if (node.kind === 'repeat') {
        for (let i = 0; i < node.times; i++) flatten(node.body, out);
      } else {
        out.push(node);
      }
    }
    return out;
  }

  const countBlocks = (nodes) =>
    nodes.reduce((total, node) => total + 1 + (node.kind === 'repeat' ? countBlocks(node.body) : 0), 0);

  /* ================= palette + strip ================= */

  function blockButton(kind, { inStrip = false, node = null } = {}) {
    const spec = BLOCKS[kind];
    const button = el('button', {
      class: `rs-block rs-block--${kind}`,
      type: 'button',
      draggable: 'true',
      'data-id': node ? String(node.id) : null,
      'data-kind': kind,
      'aria-label': inStrip ? `${spec.word} — tap to remove` : `Add ${spec.word}`,
      title: inStrip ? 'Tap to take it out' : `Add ${spec.word}`,
      onClick: () => (inStrip ? removeBlock(node.id) : addBlock(kind)),
    }, [
      el('span', { class: 'rs-block-icon', html: spec.icon }),
      el('span', { class: 'rs-block-word', text: spec.word }),
    ]);

    button.addEventListener('dragstart', (event) => {
      dragPayload = inStrip ? { from: 'strip', id: node.id } : { from: 'palette', kind };
      droppedSomewhere = false;
      button.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', kind);
    });
    button.addEventListener('dragend', () => {
      button.classList.remove('is-dragging');
      // dragged off the strip entirely — that means "take it out"
      if (!droppedSomewhere && dragPayload && dragPayload.from === 'strip') removeBlock(dragPayload.id);
      dragPayload = null;
    });

    return button;
  }

  function renderPalette() {
    palette.replaceChildren(...state.def.allow.map((kind) => blockButton(kind)));
  }

  function repeatContainer(node) {
    const times = el('button', {
      class: 'rs-repeat-times',
      type: 'button',
      title: 'How many times?',
      'aria-label': `Repeat ${node.times} times — tap to change`,
      text: '🔁 ×' + node.times,
      onClick: (event) => {
        event.stopPropagation();
        if (state.running) return;
        const at = REPEAT_CHOICES.indexOf(node.times);
        node.times = REPEAT_CHOICES[(at + 1) % REPEAT_CHOICES.length];
        AG.audio.play('flip');
        renderStrip();
      },
    });

    const body = el('div', { class: 'rs-repeat-body' },
      node.body.length
        ? node.body.map((child) => blockButton(child.kind, { inStrip: true, node: child }))
        : [el('span', { class: 'rs-repeat-hint', text: '➕', 'aria-hidden': 'true' })]
    );
    makeDropZone(body, () => node.body);

    const wrap = el('div', {
      class: 'rs-repeat' + (state.selectedRepeat === node.id ? ' is-selected' : ''),
      'data-id': String(node.id),
      onClick: (event) => {
        if (state.running) return;
        if (event.target.closest('.rs-block')) return;   // tapping a child removes it
        state.selectedRepeat = state.selectedRepeat === node.id ? null : node.id;
        renderStrip();
      },
    }, [times, body]);

    return wrap;
  }

  function renderStrip() {
    if (!state.program.length) {
      strip.replaceChildren(el('span', {
        class: 'rs-strip-empty',
        text: 'Tap a block above to start your plan…',
      }));
    } else {
      strip.replaceChildren(...state.program.map((node) =>
        node.kind === 'repeat' ? repeatContainer(node) : blockButton(node.kind, { inStrip: true, node })
      ));
    }

    const used = countBlocks(state.program);
    const hint = state.def.hint;
    playButton.disabled = state.running || used === 0;

    if (state.selectedRepeat !== null) {
      say('Blocks are going <span class="rs-hl">inside the 🔁</span> — tap the empty strip to stop');
    } else {
      say(`Level <span class="rs-hl">${state.level}</span> — can you do it in ${hint} blocks? ` +
          `<span class="rs-hl">${used}</span> used`);
    }
  }

  /* ================= drag and drop ================= */

  let dragPayload = null;
  let droppedSomewhere = false;

  function insertIndex(container, clientX) {
    const kids = [...container.children].filter((c) => c.dataset && c.dataset.id);
    for (let i = 0; i < kids.length; i++) {
      const box = kids[i].getBoundingClientRect();
      if (clientX < box.left + box.width / 2) return i;
    }
    return kids.length;
  }

  function makeDropZone(element, getList) {
    element.addEventListener('dragover', (event) => {
      if (!dragPayload) return;
      event.preventDefault();
      event.stopPropagation();
      element.classList.add('is-drop-target');
    });
    element.addEventListener('dragleave', () => element.classList.remove('is-drop-target'));
    element.addEventListener('drop', (event) => {
      if (!dragPayload) return;
      event.preventDefault();
      event.stopPropagation();
      element.classList.remove('is-drop-target');
      droppedSomewhere = true;

      const list = getList();
      const isRepeatBody = list !== state.program;
      let index = insertIndex(element, event.clientX);

      if (dragPayload.from === 'palette') {
        // repeats never nest inside repeats
        if (dragPayload.kind === 'repeat' && isRepeatBody) { dragPayload = null; return; }
        list.splice(index, 0, makeNode(dragPayload.kind));
      } else {
        const node = takeNode(dragPayload.id);
        if (!node) { dragPayload = null; return; }
        if (node.kind === 'repeat' && isRepeatBody) state.program.push(node);
        else list.splice(Math.min(index, list.length), 0, node);
      }

      dragPayload = null;
      AG.audio.play('flip');
      renderStrip();
    });
  }

  makeDropZone(strip, () => state.program);

  // Tapping the empty part of the strip closes an open repeat bubble, so the
  // next blocks go after it rather than inside it.
  strip.addEventListener('click', (event) => {
    if (state.running || state.selectedRepeat === null) return;
    const bare = event.target === strip || event.target.classList.contains('rs-strip-empty');
    if (!bare) return;
    state.selectedRepeat = null;
    renderStrip();
  });

  /* ================= board drawing ================= */

  function resize() {
    if (!state.def) return;
    const size = state.def.size;
    const availableW = Math.min(window.innerWidth * 0.9, 620);
    const availableH = window.innerHeight - 440;
    const cell = Math.max(34, Math.min(96, Math.floor(Math.min(availableW, availableH) / size)));

    state.cell = cell;
    const px = size * cell;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const centre = (x, y) => ({
    cx: (x + 0.5) * state.cell,
    cy: (y + 0.5) * state.cell,
  });

  function starPath(cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? radius * 0.46 : radius;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function draw() {
    if (!state.def) return;
    const { size, walls, goal } = state.def;
    const cell = state.cell;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // chequered floor
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f4f7ff' : '#ffffff';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    ctx.strokeStyle = '#e2dcf0';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size * cell);
      ctx.moveTo(0, i * cell); ctx.lineTo(size * cell, i * cell);
      ctx.stroke();
    }

    // goal pad
    const g = centre(goal.x, goal.y);
    ctx.save();
    ctx.shadowColor = 'rgba(255, 197, 49, 0.85)';
    ctx.shadowBlur = cell * 0.4;
    ctx.fillStyle = 'rgba(255, 197, 49, 0.28)';
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, cell * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffc531';
    starPath(g.cx, g.cy, cell * 0.3);
    ctx.fill();
    ctx.restore();

    // rocks
    for (const [x, y] of walls) {
      const { cx, cy } = centre(x, y);
      ctx.fillStyle = '#8b7f9c';
      ctx.beginPath();
      ctx.ellipse(cx, cy + cell * 0.06, cell * 0.34, cell * 0.29, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a99dba';
      ctx.beginPath();
      ctx.ellipse(cx - cell * 0.08, cy - cell * 0.06, cell * 0.19, cell * 0.14, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // gems
    for (const [x, y] of state.def.gems) {
      if (!state.gems.has(cellKey(x, y))) continue;
      const { cx, cy } = centre(x, y);
      const r = cell * 0.22;
      ctx.save();
      ctx.shadowColor = 'rgba(58, 168, 255, 0.8)';
      ctx.shadowBlur = cell * 0.3;
      ctx.fillStyle = '#3aa8ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.25);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r * 1.25);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.25);
      ctx.lineTo(cx + r * 0.42, cy - r * 0.2);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
    }

    drawSparkles();
    drawRobot();
  }

  function drawRobot() {
    const cell = state.cell;
    let { x, y, angle } = state.pose;

    if (state.tween) {
      const t = Math.min(1, (performance.now() - state.tween.start) / state.tween.dur);
      const eased = t * t * (3 - 2 * t);
      x = state.tween.fromX + (state.tween.toX - state.tween.fromX) * eased;
      y = state.tween.fromY + (state.tween.toY - state.tween.fromY) * eased;
      angle = state.tween.fromA + (state.tween.toA - state.tween.fromA) * eased;
      if (t >= 1) { state.pose = { x, y, angle }; state.tween = null; }
    }

    const cx = (x + 0.5) * cell;
    let cy = (y + 0.5) * cell;

    // little arc while hopping, little bounce while dancing
    if (state.tween && state.hop) {
      const t = Math.min(1, (performance.now() - state.tween.start) / state.tween.dur);
      cy -= Math.sin(t * Math.PI) * cell * 0.45;
    }
    if (state.dancing) cy -= Math.abs(Math.sin(performance.now() / 140)) * cell * 0.16;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(59, 44, 74, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, cell * 0.33, cell * 0.3, cell * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // The body and face stay upright — only the nose swings round to show the
    // way it is facing. A rotated face just reads as a broken robot.
    if (state.dancing) ctx.rotate(Math.sin(performance.now() / 190) * 0.3);

    const r = cell * 0.34;

    // antenna
    ctx.strokeStyle = '#5b3d7a';
    ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, -r * 1.45);
    ctx.stroke();
    ctx.fillStyle = '#ff5c9e';
    ctx.beginPath();
    ctx.arc(0, -r * 1.6, r * 0.19, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = '#2fc98a';
    ctx.beginPath();
    ctx.roundRect(-r, -r * 0.95, r * 2, r * 1.95, r * 0.5);
    ctx.fill();

    // the nose points the way it is facing
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#ffc531';
    ctx.strokeStyle = '#e0a000';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.34);
    ctx.lineTo(r * 0.42, -r * 0.84);
    ctx.lineTo(-r * 0.42, -r * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // face
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(-r * 0.72, -r * 0.42, r * 1.44, r * 1.02, r * 0.28);
    ctx.fill();

    ctx.fillStyle = '#2c1b3d';
    const eyeY = r * 0.02;
    if (state.face === 'oops') {
      for (const sx of [-0.34, 0.34]) {
        ctx.beginPath();
        ctx.arc(sx * r, eyeY, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const sx of [-0.34, 0.34]) {
        ctx.beginPath();
        ctx.arc(sx * r, eyeY, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#2c1b3d';
      ctx.lineWidth = Math.max(1.6, r * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, r * 0.24, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  function addSparkle(x, y) {
    const { cx, cy } = centre(x, y);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random();
      const speed = state.cell * (0.5 + Math.random() * 0.8);
      state.sparkles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        born: performance.now(), life: 420 + Math.random() * 240,
      });
    }
  }

  function drawSparkles() {
    const now = performance.now();
    state.sparkles = state.sparkles.filter((p) => now - p.born < p.life);
    for (const p of state.sparkles) {
      const t = (now - p.born) / p.life;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#7fd4ff';
      starPath(p.x + p.vx * t * 0.55, p.y + p.vy * t * 0.55 + state.cell * t * t * 0.4,
               state.cell * 0.1 * (1 - t * 0.5));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ================= running the program ================= */

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < state.def.size && y < state.def.size;
  const isWall = (x, y) => state.def.walls.some(([wx, wy]) => wx === x && wy === y);

  function tweenTo(x, y, angle, dur) {
    state.tween = {
      fromX: state.pose.x, fromY: state.pose.y, fromA: state.pose.angle,
      toX: x, toY: y, toA: angle,
      start: performance.now(), dur,
    };
    state.pose = { x, y, angle };
  }

  function collectGem() {
    const id = cellKey(state.robot.x, state.robot.y);
    if (!state.gems.has(id)) return;
    state.gems.delete(id);
    addSparkle(state.robot.x, state.robot.y);
    AG.audio.play('match');
  }

  /** Perform one block. Returns false if the robot bonked. */
  async function performStep(node) {
    const robot = state.robot;

    if (node.kind === 'left' || node.kind === 'right') {
      const turn = node.kind === 'right' ? 1 : -1;
      robot.dir = (robot.dir + turn + 4) % 4;
      tweenTo(state.pose.x, state.pose.y, state.pose.angle + turn * Math.PI / 2, MOVE_MS);
      AG.audio.play('flip');
      await delay(MOVE_MS);
      return true;
    }

    const distance = node.kind === 'jump' ? 2 : 1;
    const nx = robot.x + DX[robot.dir] * distance;
    const ny = robot.y + DY[robot.dir] * distance;

    if (!inBounds(nx, ny) || isWall(nx, ny)) return false;

    state.hop = node.kind === 'jump' ? 1 : 0;
    robot.x = nx; robot.y = ny;
    tweenTo(nx, ny, state.pose.angle, MOVE_MS);
    AG.audio.play('flip');
    await delay(MOVE_MS);
    state.hop = 0;
    collectGem();
    return true;
  }

  function highlight(node) {
    strip.querySelectorAll('.is-running').forEach((n) => n.classList.remove('is-running'));
    strip.querySelector(`[data-id="${node.id}"]`)?.classList.add('is-running');
  }

  const clearHighlight = () =>
    strip.querySelectorAll('.is-running').forEach((n) => n.classList.remove('is-running'));

  function setRunning(running) {
    state.running = running;
    playButton.disabled = running || countBlocks(state.program) === 0;
    palette.style.pointerEvents = running ? 'none' : '';
    strip.style.pointerEvents = running ? 'none' : '';
  }

  async function run() {
    if (state.running) return;
    const steps = flatten(state.program);
    if (!steps.length) { say('Add some blocks to your plan first! 🧩'); return; }

    setRunning(true);
    resetRobot();
    state.selectedRepeat = null;
    renderStrip();
    say('Off we go! 🤖');
    await delay(400);

    for (const node of steps) {
      highlight(node);
      await delay(140);

      const ok = await performStep(node);
      if (!ok) { await bonk(node); return; }

      if (state.robot.x === state.def.goal.x && state.robot.y === state.def.goal.y) {
        clearHighlight();
        await celebrate();
        return;
      }
      await delay(STEP_MS - MOVE_MS - 140);
    }

    clearHighlight();
    state.face = 'oops';
    setRunning(false);
    say('So close! Fix your plan and play again 🙂', { bump: true });
  }

  async function bonk(node) {
    state.face = 'oops';
    AG.audio.play('miss');
    AG.fx.animate(canvas, 'is-bonk', 500);
    strip.querySelector(`[data-id="${node.id}"]`)?.classList.add('is-wrong');
    say('Bonk! 💥 That step bumped into something.', { bump: true });
    await delay(1600);
    clearHighlight();
    strip.querySelectorAll('.is-wrong').forEach((n) => n.classList.remove('is-wrong'));
    setRunning(false);
  }

  async function celebrate() {
    state.face = 'happy';
    state.dancing = true;
    setRunning(false);

    const total = state.def.gems.length;
    const collected = total - state.gems.size;

    const best = progress.best[state.level];
    if (!best || collected > best.gems) progress.best[state.level] = { gems: collected, total };
    const nextLevel = state.level + 1;
    const unlockedSomething = nextLevel <= RobotLevels.length && progress.unlocked < nextLevel;
    if (unlockedSomething) progress.unlocked = nextLevel;
    AG.store.set('robot-steps', progress);

    say('You did it! 🎉');
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    await delay(900);

    const actions = [];
    if (nextLevel <= RobotLevels.length) {
      actions.push({
        label: `Level ${nextLevel} →`, variant: 'green',
        onClick: () => { stopConfetti(); startLevel(nextLevel); },
      });
    }
    actions.push({ label: 'Try again', variant: 'pink', onClick: () => { stopConfetti(); startLevel(state.level); } });
    actions.push({ label: 'All levels', variant: 'quiet', onClick: () => { stopConfetti(); showLevels(); } });

    AG.shell.overlay({
      title: 'You did it! 🎉',
      message: nextLevel > RobotLevels.length
        ? 'That was the last level — you programmed them all!'
        : (unlockedSomething ? `Level ${nextLevel} is unlocked!` : `Level ${state.level} solved again!`),
      body: total
        ? el('div', { class: 'rs-win-gems', text: `💎 ${collected} / ${total} gems` })
        : el('div', { class: 'rs-win-gems', text: `${countBlocks(state.program)} blocks used` }),
      actions,
    });
  }

  /* ================= levels ================= */

  function resetRobot() {
    const start = state.def.robot;
    state.robot = { ...start };
    state.pose = { x: start.x, y: start.y, angle: start.dir * Math.PI / 2 };
    state.tween = null;
    state.hop = 0;
    state.face = 'happy';
    state.dancing = false;
    state.sparkles = [];
    state.gems = new Set(state.def.gems.map(([x, y]) => cellKey(x, y)));
  }

  function startLevel(level) {
    state.level = level;
    state.def = RobotLevels[level - 1];
    state.program = [];
    state.selectedRepeat = null;
    resetRobot();

    levelsView.hidden = true;
    playView.hidden = false;

    resize();
    renderPalette();
    renderStrip();
  }

  function showLevels() {
    state.running = false;
    state.dancing = false;
    playView.hidden = true;
    levelsView.hidden = false;
    say(`Pick a level! <span class="rs-hl">${progress.unlocked}</span> unlocked`);

    levelsGrid.replaceChildren(...RobotLevels.map((level) => {
      const locked = level.number > progress.unlocked;
      const best = progress.best[level.number];
      return el('button', {
        class: 'rs-level' + (best ? ' is-done' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        'aria-label': locked ? `Level ${level.number}, locked` : `Level ${level.number}`,
        onClick: () => startLevel(level.number),
      }, [
        el('span', { class: 'rs-level-num', text: String(level.number) }),
        el('span', {
          class: 'rs-level-tag',
          text: locked ? '🔒' : best && best.total ? `💎 ${best.gems}/${best.total}` : best ? '✅' : `${level.hint} blocks`,
        }),
      ]);
    }));
  }

  /* ================= how to play ================= */

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🤖',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: '🧩 Tap the picture blocks to build a plan.' }),
        el('li', { text: '▶️ Press Play and watch your robot follow it.' }),
        el('li', { text: '💥 Bonk? No problem — tap a block to take it out, then play again!' }),
        el('li', { text: '⭐ Get your robot to the star.' }),
        el('li', { text: '🔁 Tap the Repeat bubble, then add blocks inside it.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ================= boot ================= */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Robot Steps',
    emoji: '🤖',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      {
        icon: AG.shell.icons.grid, label: 'All levels', color: 'var(--ag-blue)',
        onClick: () => {
          document.querySelector('.ag-overlay')?.remove();
          document.querySelector('.ag-confetti')?.remove();
          showLevels();
        },
      },
    ],
  });

  page.prepend(headerNode);

  playButton.addEventListener('click', run);
  resetButton.addEventListener('click', () => {
    if (state.running) return;
    resetRobot();
    say('Back to the start! Press ▶️ when you are ready.');
  });
  clearButton.addEventListener('click', () => {
    if (state.running) return;
    state.program = [];
    state.selectedRepeat = null;
    resetRobot();
    renderStrip();
  });

  window.addEventListener('resize', resize);

  (function frame() {
    draw();
    requestAnimationFrame(frame);
  })();

  showLevels();

  // Debug seam — the Mac app sets __AISHA_DEV with AISHA_DEV=1; in a browser
  // add #dev to the URL.
  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__robotProbe = {
      state: () => state,
      robot: () => ({ ...state.robot }),
      program: () => state.program,
      blocks: () => countBlocks(state.program),
      steps: () => flatten(state.program).length,
      gemsLeft: () => state.gems.size,
      add: addBlock,
      start: startLevel,
      run,
      level: () => state.level,
      running: () => state.running,
    };
  }
})();
