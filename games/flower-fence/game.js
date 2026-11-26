/* ------------------------------------------------------------------
   Flower Fence 🌷
   A first look at multiplication: a fence around rows of flowers.
   "3 rows of 4" is drawn, built, turned around and counted by rows, and
   written as 3 × 4 = 12. The colours match everywhere: rows are blue,
   how many in each row is green, the total is yellow.
   A spoken lesson comes first, then levels. Rules live in spec.md.
------------------------------------------------------------------ */

(() => {
  const { el, pick, delay, shuffle } = AG.util;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (sel) => document.querySelector(sel);

  const page = $('.ff-page');
  const storyNode = $('.ff-story');
  const questionNode = $('.ff-question');
  const speakButton = $('.ff-speak');
  const eqNode = $('.ff-eq');
  const hud = $('.ff-hud');
  const svg = $('.ff-garden');
  const pad = $('.ff-pad');
  const plantButton = $('.ff-plant');
  const nextButton = $('.ff-next');

  /* ---------------- levels ---------------- */

  // max: the field is max × max · only: one of the two numbers is always this
  // kinds: one garden per entry —
  //   count    a garden is shown: how many flowers?
  //   build    make "3 rows of 4", then count it
  //   turn     a build, then the garden turns around: how many now?
  //   seeds    12 seeds: make any fence with exactly 12 spots
  //   missing  3 rows, 12 flowers: how many in each row?
  const LEVELS = [
    { max: 3, kinds: ['count', 'count', 'count'] },
    { max: 3, kinds: ['count', 'build', 'build'] },
    { max: 4, kinds: ['build', 'turn', 'build', 'turn'] },
    { max: 5, only: 2, kinds: ['count', 'build', 'turn', 'build'] },
    { max: 4, kinds: ['seeds', 'seeds', 'seeds'] },
    { max: 4, kinds: ['build', 'missing', 'build', 'missing'] },
    { max: 5, only: 5, kinds: ['count', 'build', 'turn', 'build'] },
    { max: 5, kinds: ['seeds', 'build', 'seeds', 'missing'] },
    { max: 5, only: 3, kinds: ['count', 'build', 'turn', 'missing'] },
    { max: 5, only: 4, kinds: ['count', 'build', 'turn', 'missing'] },
    { max: 5, kinds: ['seeds', 'missing', 'seeds', 'turn'] },
    { max: 5, kinds: ['build', 'seeds', 'missing', 'turn', 'build'] },
  ];
  const KIND_ICON = { turn: '🔄', seeds: '🌰', missing: '❓' };
  const FLOWERS = ['🌷', '🌻', '🌼', '🌸', '🌹', '🌺'];
  const LESSON_STEPS = 6;

  const progress = Object.assign({ lesson: false, unlocked: 1, done: {} }, AG.store.get('flower-fence', {}));
  const saveProgress = () => AG.store.set('flower-fence', progress);

  /* ---------------- words ---------------- */

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
    'twenty-three', 'twenty-four', 'twenty-five'];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // Number words are wrapped so they share a colour with the fence and the sum.
  const w = (n, tone, upper = false) =>
    `<b class="ff-w ${tone}">${upper ? cap(WORDS[n]) : WORDS[n]}</b>`;
  const rowsOf = (r, c, upper = false) =>
    `${w(r, 'is-rows', upper)} ${r === 1 ? 'row' : 'rows'} of ${w(c, 'is-cols')}`;

  /* ---------------- state ---------------- */

  const state = {
    mode: 'idle',      // 'lesson' | 'level'
    level: Math.min(progress.unlocked, LEVELS.length),
    index: 0,          // which garden of the level
    rounds: [],
    phase: 'idle',     // 'ask' | 'build' | 'next' | 'idle'
    M: 3,              // the field is M × M squares
    plot: { r: 0, c: 0 },
    hide: null,        // 'a' | 'b': that fence label shows "?"
    emoji: '🌷',
    eq: null,          // { a, b, n, blank, short, solo, solved }
    expected: null,
    target: null,      // what the build is aiming for (for tests)
    typed: '',
    tries: 0,
    resolve: null,     // settles whatever the game is waiting on
    onResize: null,
  };

  /* ---------------- one flow at a time ---------------- */

  // Lessons and levels are plain async functions. Starting a new one bumps
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
    state.onResize = null;
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
    const clean = text.replace(/×/g, ' times sign ').replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, ' ');
    try {
      speechSynthesis.cancel();
      const say = new SpeechSynthesisUtterance(clean);
      say.rate = 0.85;
      say.pitch = 1.1;
      speechSynthesis.speak(say);
    } catch { /* no voice — the words are still on screen */ }
  }

  const readAll = () => speak(storyNode.textContent + ' ' + questionNode.textContent);

  /** Put up the story and the question, and read them out. */
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

  /* ---------------- the garden (SVG) ---------------- */

  const S = 64;               // one square of soil
  const OX = 112, OY = 92;    // top-left corner of the field
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const svgEl = (tag, attrs = {}, kids = []) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    for (const kid of kids) node.append(kid);
    return node;
  };
  const svgText = (cls, x, y, text) =>
    svgEl('text', { class: cls, x, y }, [document.createTextNode(text)]);

  // AG.fx.animate's reflow trick is a no-op on SVG nodes, so restart their
  // CSS animations by forcing layout another way.
  function replay(node, cls, ms) {
    node.classList.remove(cls);
    node.getBoundingClientRect();
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }

  const layers = {};
  let flowers = [];           // flowers[row][col]
  let fence, rowsNum, colsNum, rowsBrace, colsBrace, handle;

  function drawField(M) {
    state.M = M;
    const W = OX + M * S + 96, H = OY + M * S + 28;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.setProperty('--ff-aspect', W / H);
    svg.classList.remove('is-bare', 'is-turning');

    const soil = svgEl('g');
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < M; j++) {
        soil.append(svgEl('rect', { class: 'ff-soil', x: OX + j * S + 4, y: OY + i * S + 4, width: S - 8, height: S - 8, rx: 10 }));
      }
    }

    layers.bed = svgEl('g');
    layers.glow = svgEl('g');
    layers.flowers = svgEl('g');
    fence = svgEl('rect', { class: 'ff-fence', rx: 12 });
    layers.plot = svgEl('g', {}, [layers.bed, layers.glow, fence, layers.flowers]);

    rowsBrace = svgEl('path', { class: 'ff-brace is-rows' });
    colsBrace = svgEl('path', { class: 'ff-brace is-cols' });
    rowsNum = svgText('ff-num is-rows', 0, 0, '');
    colsNum = svgText('ff-num is-cols', 0, 0, '');
    layers.labels = svgEl('g', { class: 'ff-labels' }, [rowsBrace, colsBrace, rowsNum, colsNum]);

    layers.ghost = svgEl('g');
    layers.marks = svgEl('g');
    handle = svgEl('g', { class: 'ff-handle' }, [
      svgEl('circle', { r: 17 }),
      svgEl('path', { d: 'M -6 -6 L 6 6 M 1 6 L 6 6 L 6 1 M -1 -6 L -6 -6 L -6 -1' }),
    ]);

    svg.replaceChildren(soil, layers.plot, layers.labels, layers.ghost, layers.marks, handle);
    flowers = [];
    state.hide = null;
    setPlot(0, 0);
  }

  /** Put the fence around r rows of c. */
  function setPlot(r, c) {
    state.plot = { r, c };
    const shown = r > 0 && c > 0;
    layers.plot.style.display = shown ? '' : 'none';
    layers.labels.style.display = shown ? '' : 'none';
    handle.style.display = shown ? '' : 'none';
    if (!shown) return;

    layers.bed.replaceChildren();
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        layers.bed.append(svgEl('rect', { class: 'ff-bed', x: OX + j * S + 3, y: OY + i * S + 3, width: S - 6, height: S - 6, rx: 10 }));
      }
    }

    const right = OX + c * S, bottom = OY + r * S;
    for (const [k, v] of Object.entries({ x: OX - 5, y: OY - 5, width: c * S + 10, height: r * S + 10 })) fence.setAttribute(k, v);

    rowsBrace.setAttribute('d', `M ${OX - 18} ${OY + 5} L ${OX - 27} ${OY + 5} L ${OX - 27} ${bottom - 5} L ${OX - 18} ${bottom - 5}`);
    colsBrace.setAttribute('d', `M ${OX + 5} ${OY - 18} L ${OX + 5} ${OY - 27} L ${right - 5} ${OY - 27} L ${right - 5} ${OY - 18}`);
    rowsNum.setAttribute('x', OX - 58);
    rowsNum.setAttribute('y', OY + r * S / 2);
    rowsNum.textContent = state.hide === 'a' ? '?' : r;
    colsNum.setAttribute('x', OX + c * S / 2);
    colsNum.setAttribute('y', OY - 54);
    colsNum.textContent = state.hide === 'b' ? '?' : c;

    handle.setAttribute('transform', `translate(${right} ${bottom})`);
  }

  function addFlower(i, j, emoji = state.emoji, pop = true) {
    const x = OX + j * S + S / 2, y = OY + i * S + S / 2;
    const node = svgText('ff-flower' + (pop ? ' is-new' : ''), x, y, emoji);
    node._x = x; node._y = y;
    layers.flowers.append(node);
    (flowers[i] = flowers[i] || [])[j] = node;
    return node;
  }

  /** Flowers pop up a row at a time, so the rows are something she sees. */
  async function plantRows(from = 0, to = state.plot.r, pause = 280) {
    const ok = guard();
    for (let i = from; i < to; i++) {
      for (let j = 0; j < state.plot.c; j++) addFlower(i, j);
      AG.audio.play('flip');
      await ok(delay(pause));
    }
  }

  function clearFlowers() {
    layers.flowers.replaceChildren();
    flowers = [];
  }

  function clearMarks() {
    layers.glow.replaceChildren();
    layers.marks.replaceChildren();
    layers.ghost.replaceChildren();
  }

  const markX = () => OX + state.plot.c * S + 50;

  function showAnimal(emoji) {
    layers.marks.querySelector('.ff-animal')?.remove();
    const node = svgText('ff-animal', markX(), OY - 40, emoji);
    layers.marks.append(node);
    replay(node, 'is-pop', 400);
  }

  /** Count by rows: each row lights up and the running total ticks — 4, 8, 12. */
  async function sweepRows(value) {
    const ok = guard();
    const { r, c } = state.plot;
    layers.glow.replaceChildren();
    layers.marks.querySelectorAll('.ff-run, .ff-tiny').forEach((node) => node.remove());
    for (let i = 0; i < r; i++) {
      layers.glow.append(svgEl('rect', { class: 'ff-rowglow', x: OX + 3, y: OY + i * S + 3, width: c * S - 6, height: S - 6, rx: 10 }));
      layers.marks.querySelectorAll('.ff-run').forEach((node) => node.classList.add('is-old'));
      const total = svgText('ff-run', markX(), OY + i * S + S / 2, value ? value(i) : (i + 1) * c);
      layers.marks.append(total);
      replay(total, 'is-pop', 350);
      AG.audio.play('flip');
      await ok(delay(560));
    }
  }

  /** Count one by one: every flower gets its number. */
  async function countOnes(rows = state.plot.r, pause = 260) {
    const ok = guard();
    const { c } = state.plot;
    layers.glow.replaceChildren();
    layers.marks.querySelectorAll('.ff-run, .ff-tiny').forEach((node) => node.remove());
    const counter = svgText('ff-run', markX(), OY + rows * S / 2, '');
    layers.marks.append(counter);
    let k = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < c; j++) {
        k++;
        const flower = flowers[i] && flowers[i][j];
        if (flower) {
          replay(flower, 'is-pop', 300);
          layers.marks.append(svgText('ff-tiny', flower._x + 17, flower._y + 19, k));
        }
        counter.textContent = k;
        AG.audio.play('flip');
        await ok(delay(pause));
      }
    }
  }

  function showGhost(r, c) {
    layers.ghost.replaceChildren(svgEl('rect', { class: 'ff-ghost', x: OX - 5, y: OY - 5, width: c * S + 10, height: r * S + 10, rx: 12 }));
  }

  /* ---------------- motion ---------------- */

  // Manim's "smooth": ease in and out so nothing jerks.
  const smooth = (t) => t * t * (3 - 2 * t);

  // requestAnimationFrame stops while the window is hidden, so a timer
  // makes sure every move still lands and the game never gets stuck.
  function tween(ms, paint) {
    return new Promise((done) => {
      const t0 = performance.now();
      let over = false;
      const finish = () => { if (!over) { over = true; paint(1); done(); } };
      const frame = (now) => {
        if (over) return;
        const t = Math.min(1, (now - t0) / ms);
        if (t < 1) { paint(smooth(t)); requestAnimationFrame(frame); } else finish();
      };
      requestAnimationFrame(frame);
      setTimeout(finish, ms + 80);
    });
  }

  /** Turn the whole garden a quarter turn: r rows of c become c rows of r. */
  async function turn() {
    const ok = guard();
    const { r, c } = state.plot;
    const plot = layers.plot;
    const all = flowers.flat();
    clearMarks();
    svg.classList.add('is-turning');
    await ok(delay(350));

    // Spin about the middle, sliding so the corner stays tucked in the corner.
    const cx = OX + c * S / 2, cy = OY + r * S / 2;
    const dx = (r - c) * S / 2, dy = (c - r) * S / 2;
    await ok(tween(1500, (t) => {
      const a = 90 * t;
      plot.setAttribute('transform', `translate(${(dx * t).toFixed(1)} ${(dy * t).toFixed(1)}) rotate(${a.toFixed(2)} ${cx} ${cy})`);
      // flowers stay upright while the bed turns under them
      // (the CSS transform-origin already makes each one spin about its own middle)
      for (const node of all) node.setAttribute('transform', `rotate(${(-a).toFixed(2)})`);
    }));

    plot.removeAttribute('transform');
    clearFlowers();
    setPlot(c, r);
    for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) addFlower(i, j, state.emoji, false);
    svg.classList.remove('is-turning');
  }

  /* ---------------- the sum ---------------- */

  function renderEq() {
    const q = state.eq;
    if (!q) return eqNode.replaceChildren();
    const tok = (key, tone) => {
      const active = q.blank === key;
      const cls = `ff-tok ${tone}` +
        (active ? ' ff-blank is-active' : '') +
        (q.solved === key ? ' is-solved' : '');
      return el('span', { class: cls, text: active ? (state.typed || '?') : String(q[key] ?? '?') });
    };
    const op = (text) => el('span', { class: 'ff-tok ff-op', text });
    const kids = q.solo ? [tok('n', 'is-total')] : [tok('a', 'is-rows'), op('×'), tok('b', 'is-cols')];
    if (!q.solo && !q.short) kids.push(op('='), tok('n', 'is-total'));
    eqNode.replaceChildren(...kids);
  }

  function setEq(q) {
    state.eq = q;
    renderEq();
  }

  /* ---------------- waiting on Aisha ---------------- */

  function setPhase(phase) {
    state.phase = phase;
    pad.hidden = phase !== 'ask';
    plantButton.hidden = phase !== 'build';
    nextButton.hidden = phase !== 'next';
    svg.classList.toggle('is-building', phase === 'build');
  }

  const waiting = () => new Promise((resolve) => { state.resolve = resolve; });

  function settle(value) {
    const resolve = state.resolve;
    if (!resolve) return;
    state.resolve = null;
    resolve(value);
  }

  /** Ask for a number on the pad. `help` runs after two wrong tries. */
  async function askNumber(expected, eq, help) {
    const ok = guard();
    state.expected = expected;
    state.tries = 0;
    state.typed = '';
    setEq(eq);
    setPhase('ask');

    for (;;) {
      const value = await ok(waiting());
      if (value === expected) break;
      state.tries++;
      AG.audio.play('miss');
      const blank = eqNode.querySelector('.is-active');
      if (blank) {
        blank.textContent = value;
        AG.fx.animate(blank, 'is-wrong', 400).then(() => {
          blank.classList.remove('is-wrong');
          if (blank.isConnected && !state.typed) blank.textContent = '?';
        });
      }
      if (state.tries === 2 && help) {
        hint("Let's count together! 👆");
        await ok(help());
      }
    }

    AG.audio.play('match');
    setEq({ ...eq, [eq.blank]: expected, solved: eq.blank, blank: null });
    state.expected = null;
    setPhase('idle');
  }

  /** Let her stretch the fence, and wait for the Plant button. */
  async function waitPlant() {
    const ok = guard();
    setPhase('build');
    await ok(waiting());
    setPhase('idle');
    return { ...state.plot };
  }

  async function waitNext(label = 'Next ▶') {
    const ok = guard();
    nextButton.textContent = label;
    setPhase('next');
    await ok(waiting());
    AG.audio.play('flip');
    setPhase('idle');
  }

  function resize(r, c) {
    if (state.phase !== 'build') return;
    r = clamp(r, 1, state.M);
    c = clamp(c, 1, state.M);
    if (r === state.plot.r && c === state.plot.c) return;
    clearFlowers();
    setPlot(r, c);
    AG.audio.play('flip');
    state.onResize?.();
  }

  // Pulling the yellow dot follows the pointer; a tap on a square of soil
  // stretches the fence out to hold that square.
  let dragging = null;
  function pointerCell(event) {
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    if (dragging === 'start') {
      const { r, c } = state.plot;
      dragging = Math.hypot(pt.x - (OX + c * S), pt.y - (OY + r * S)) < S * 0.55 ? 'handle' : 'cell';
    }
    const snap = dragging === 'handle' ? Math.round : Math.ceil;
    return { r: snap((pt.y - OY) / S), c: snap((pt.x - OX) / S) };
  }
  svg.addEventListener('pointerdown', (event) => {
    if (state.phase !== 'build') return;
    dragging = 'start';
    try { svg.setPointerCapture(event.pointerId); } catch { /* fine */ }
    const cell = pointerCell(event);
    resize(cell.r, cell.c);
    event.preventDefault();
  });
  svg.addEventListener('pointermove', (event) => {
    if (!dragging || state.phase !== 'build') return;
    const cell = pointerCell(event);
    resize(cell.r, cell.c);
  });
  const stopDrag = () => { dragging = null; };
  svg.addEventListener('pointerup', stopDrag);
  svg.addEventListener('pointercancel', stopDrag);

  /* ---------------- pad & keyboard ---------------- */

  function type(digit) {
    if (state.phase !== 'ask' || state.typed.length >= 2) return;
    state.typed += digit;
    AG.audio.play('flip');
    renderEq();
  }
  function backspace() {
    state.typed = state.typed.slice(0, -1);
    renderEq();
  }
  function submit() {
    if (state.phase !== 'ask' || !state.typed || !state.resolve) return;
    const value = +state.typed;
    state.typed = '';
    settle(value);
  }
  const plant = () => { if (state.phase === 'build') settle(); };
  const next = () => { if (state.phase === 'next') settle(); };

  function buildPad() {
    const key = (text, cls, label, onClick) =>
      el('button', { class: 'ff-key ' + cls, type: 'button', text, 'aria-label': label, onClick });
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => key(String(d), '', String(d), () => type(String(d))));
    keys.push(
      key('⌫', 'is-back', 'Rub out', backspace),
      key('0', '', '0', () => type('0')),
      key('✓', 'is-ok', 'Done', submit),
    );
    pad.replaceChildren(...keys);
  }
  plantButton.addEventListener('click', plant);
  nextButton.addEventListener('click', next);
  speakButton.addEventListener('click', readAll);

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('.ag-overlay')) return;
    const { key } = event;
    if (state.phase === 'ask') {
      if (/^[0-9]$/.test(key)) type(key);
      else if (key === 'Enter') submit();
      else if (key === 'Backspace') backspace();
    } else if (state.phase === 'build') {
      const { r, c } = state.plot;
      if (key === 'ArrowRight') resize(r, c + 1);
      else if (key === 'ArrowLeft') resize(r, c - 1);
      else if (key === 'ArrowDown') resize(r + 1, c);
      else if (key === 'ArrowUp') resize(r - 1, c);
      else if (key === 'Enter') plant();
      else return;
      event.preventDefault();
    } else if (state.phase === 'next' && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      next();
    }
  });

  /* ---------------- pieces every garden is made of ---------------- */

  function freshGarden(emoji = pick(FLOWERS)) {
    state.emoji = emoji;
    state.hide = null;
    state.target = null;
    state.onResize = null;
    clearFlowers();
    clearMarks();
    setEq(null);
    setPhase('idle');
  }

  /** Keep asking until the fence is r rows of c. */
  async function buildTo(r, c) {
    const ok = guard();
    state.target = { r, c };
    setPlot(1, 1);
    for (let tries = 1; ; tries++) {
      const made = await ok(waitPlant());
      if (made.r === r && made.c === c) break;
      AG.audio.play('miss');
      if (made.r !== r) replay(rowsNum, 'is-wrong', 400);
      if (made.c !== c) replay(colsNum, 'is-wrong', 400);
      hint(`That is ${rowsOf(made.r, made.c)}. Make ${rowsOf(r, c)}.`);
      if (tries >= 2) showGhost(r, c);
    }
    layers.ghost.replaceChildren();
    state.target = null;
    AG.audio.play('match');
  }

  /** "How many flowers?" for the garden on screen, then count it by rows. */
  async function askTotal() {
    const ok = guard();
    const { r, c } = state.plot;
    await ok(askNumber(r * c, { a: r, b: c, n: null, blank: 'n' }, () => sweepRows()));
    tell(`Yes! ${rowsOf(r, c, true)} is ${w(r * c, 'is-total')}.`);
    await ok(sweepRows());
    await ok(delay(900));
  }

  /* ---------------- the five kinds of garden ---------------- */

  const ROUNDS = {
    async count({ r, c }) {
      const ok = guard();
      setPlot(r, c);
      tell(`${rowsOf(r, c, true)}.`, 'How many flowers?');
      await ok(plantRows());
      await ok(askTotal());
    },

    async build({ r, c }) {
      const ok = guard();
      setEq({ a: r, b: c, short: true });
      tell(`Make ${rowsOf(r, c)}.`, 'Pull the yellow dot. Then tap Plant.');
      await ok(buildTo(r, c));
      tell(`${rowsOf(r, c, true)}.`, 'How many flowers?');
      await ok(plantRows());
      await ok(askTotal());
    },

    async turn({ r, c }) {
      const ok = guard();
      await ok(ROUNDS.build({ r, c }));
      tell('Watch! The garden turns around. 🔄');
      await ok(turn());
      tell(`Now it is ${rowsOf(c, r)}.`, 'How many flowers now?');
      await ok(askNumber(r * c, { a: c, b: r, n: null, blank: 'n' }, () => sweepRows()));
      tell(`Still ${w(r * c, 'is-total')}!`, 'Turning it does not change how many.');
      await ok(sweepRows());
      await ok(delay(1200));
    },

    async seeds({ r, c }) {
      const ok = guard();
      const total = r * c;
      state.target = { total };
      setPlot(1, 1);
      // The sum stays "? × ? = 12" until a fence fits — never a wrong sum on screen.
      setEq({ a: null, b: null, n: total });
      state.onResize = clearMarks;
      tell(`You have ${w(total, 'is-total')} seeds. 🌰`, 'Make a garden with a spot for every seed.');

      let made;
      for (let tries = 1; ; tries++) {
        made = await ok(waitPlant());
        clearFlowers();
        clearMarks();
        const spots = made.r * made.c;
        // Seeds go in one at a time until the seeds or the spots run out.
        for (let k = 0; k < Math.min(spots, total); k++) {
          addFlower(Math.floor(k / made.c), k % made.c, '🌱');
          if (k % 2 === 0) AG.audio.play('flip');
          await ok(delay(70));
        }
        if (spots === total) break;
        AG.audio.play('miss');
        const off = Math.abs(total - spots);
        hint(spots < total
          ? `${cap(WORDS[off])} ${off === 1 ? 'seed' : 'seeds'} left over! Make it bigger.`
          : `${cap(WORDS[off])} empty ${off === 1 ? 'spot' : 'spots'}! Make it smaller.`);
        if (tries >= 2) showGhost(r, c);
      }

      state.onResize = null;
      state.target = null;
      AG.audio.play('match');
      for (const node of flowers.flat()) node.textContent = state.emoji;
      setEq({ a: made.r, b: made.c, n: total, solved: 'n' });
      tell(`They all fit! ${rowsOf(made.r, made.c, true)} is ${w(total, 'is-total')}.`);
      await ok(sweepRows());
      await ok(delay(1200));
    },

    async missing({ r, c }) {
      const ok = guard();
      const total = r * c;
      // Hide one of the two fence numbers; the flowers are there to count.
      const hide = Math.random() < 0.5 ? 'a' : 'b';
      state.hide = hide;
      setPlot(r, c);
      if (hide === 'b') tell(`${w(r, 'is-rows', true)} rows. ${w(total, 'is-total', true)} flowers.`, 'How many in each row?');
      else tell(`${w(c, 'is-cols', true)} in each row. ${w(total, 'is-total', true)} flowers.`, 'How many rows?');
      await ok(plantRows());
      await ok(askNumber(hide === 'a' ? r : c,
        { a: hide === 'a' ? null : r, b: hide === 'b' ? null : c, n: total, blank: hide },
        () => (hide === 'a' ? sweepRows((i) => i + 1) : countOnes(1))));
      state.hide = null;
      setPlot(r, c);
      tell(`Yes! ${rowsOf(r, c, true)} is ${w(total, 'is-total')}.`);
      await ok(sweepRows());
      await ok(delay(900));
    },
  };

  /* ---------------- levels ---------------- */

  function makeRounds(L) {
    let pool = [];
    for (let r = 2; r <= L.max; r++) {
      for (let c = 2; c <= L.max; c++) {
        if (!L.only || r === L.only || c === L.only) pool.push({ r, c });
      }
    }
    pool = shuffle(pool);
    const totals = new Set();
    return L.kinds.map((kind) => {
      // a turn needs a garden that looks different turned; don't repeat a total
      const fits = (p) => !totals.has(p.r * p.c) && (kind !== 'turn' || p.r !== p.c);
      let at = pool.findIndex(fits);
      if (at < 0) at = pool.findIndex((p) => kind !== 'turn' || p.r !== p.c);
      const [p] = pool.splice(Math.max(at, 0), 1);
      totals.add(p.r * p.c);
      return { kind, r: p.r, c: p.c };
    });
  }

  function startLevel(n) {
    run(async (ok) => {
      state.mode = 'level';
      state.level = clamp(n, 1, LEVELS.length);
      const L = LEVELS[state.level - 1];
      state.rounds = makeRounds(L);
      drawField(L.max);

      for (let i = 0; i < state.rounds.length; i++) {
        state.index = i;
        hud.textContent = `Level ${state.level} · garden ${i + 1} of ${state.rounds.length}`;
        freshGarden();
        setPlot(0, 0);
        await ok(ROUNDS[state.rounds[i].kind](state.rounds[i]));
      }
      finish();
    });
  }

  function finish() {
    setPhase('idle');
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    progress.done[state.level] = true;
    progress.unlocked = Math.min(LEVELS.length, Math.max(progress.unlocked, state.level + 1));
    saveProgress();

    const last = state.level === LEVELS.length;
    const count = state.rounds.length;
    const actions = [];
    if (!last) actions.push({ label: `Level ${state.level + 1} ▶`, variant: 'green', onClick: () => { stopConfetti(); startLevel(state.level + 1); } });
    actions.push({ label: 'More gardens 🌷', variant: last ? 'pink' : 'quiet', onClick: () => { stopConfetti(); startLevel(state.level); } });

    AG.shell.overlay({
      title: last ? 'Garden champion! 🏆' : `Level ${state.level} done! 🎉`,
      message: `You grew ${WORDS[count]} gardens.`,
      actions,
    });
  }

  /* ---------------- the lesson ---------------- */

  function startLesson() {
    run(async (ok) => {
      state.mode = 'lesson';
      const stepHud = (k) => { hud.textContent = `Lesson · ${k} of ${LESSON_STEPS}`; };

      // 1 — a row
      stepHud(1);
      drawField(3);
      freshGarden('🌷');
      svg.classList.add('is-bare');
      setPlot(1, 2);
      tell(`Here is ${rowsOf(1, 2)} flowers.`);
      await ok(plantRows());
      await ok(waitNext());

      // 2 — another row, and she counts them
      stepHud(2);
      setPlot(2, 2);
      tell('Here comes another row!', 'How many flowers now?');
      await ok(plantRows(1));
      await ok(askNumber(4, { solo: true, n: null, blank: 'n' }, () => countOnes()));

      // 3 — the fence, and how it is written
      stepHud(3);
      clearMarks();
      svg.classList.remove('is-bare');
      setEq({ a: 2, b: 2, n: 4 });
      tell(`${rowsOf(2, 2, true)} makes ${w(4, 'is-total')}.`,
        `We say “${w(2, 'is-rows')} times ${w(2, 'is-cols')} is ${w(4, 'is-total')}”. The × means “rows of”.`);
      await ok(delay(700));
      await ok(sweepRows());
      await ok(waitNext());

      // 4 — her turn to build one
      stepHud(4);
      freshGarden('🌼');
      setEq({ a: 2, b: 3, short: true });
      tell(`Your turn! Make ${rowsOf(2, 3)}.`, 'Pull the yellow dot. Then tap Plant.');
      await ok(buildTo(2, 3));
      tell(`${rowsOf(2, 3, true)}.`, 'How many flowers?');
      await ok(plantRows());
      await ok(askNumber(6, { a: 2, b: 3, n: null, blank: 'n' }, () => sweepRows()));
      tell(`Yes! ${rowsOf(2, 3, true)} is ${w(6, 'is-total')}.`,
        `${w(2, 'is-rows', true)} times ${w(3, 'is-cols')} is ${w(6, 'is-total')}.`);
      await ok(sweepRows());
      await ok(waitNext());

      // 5 — turned around it is still the same
      stepHud(5);
      tell('Watch! The garden turns around. 🔄');
      await ok(turn());
      setEq({ a: 3, b: 2, n: 6 });
      tell(`Now it is ${rowsOf(3, 2)}.`, `Still ${w(6, 'is-total')} flowers! Turning it does not change how many.`);
      await ok(sweepRows());
      await ok(waitNext());

      // 6 — why it matters: rows are the fast way to count
      stepHud(6);
      drawField(5);
      freshGarden('🌻');
      setPlot(3, 5);
      setEq({ a: 3, b: 5, n: null });
      tell('A big garden! Snail counts one by one.', 'So slow…');
      await ok(plantRows(0, 3, 160));
      showAnimal('🐌');
      await ok(countOnes());
      await ok(delay(700));
      tell(`Bunny counts by rows: ${w(5, 'is-total')}, ${w(10, 'is-total')}, ${w(15, 'is-total')}!`,
        'So fast! Times is a quick way to count.');
      showAnimal('🐇');
      await ok(sweepRows());
      setEq({ a: 3, b: 5, n: 15, solved: 'n' });
      await ok(waitNext("Let's play! ▶"));

      progress.lesson = true;
      saveProgress();
      startLevel(state.level);
    });
  }

  /* ---------------- levels & how to play ---------------- */

  function showLevels() {
    const grid = el('div', { class: 'ff-levels' }, LEVELS.map((L, i) => {
      const n = i + 1;
      const open = n <= progress.unlocked;
      const icons = [...new Set(L.kinds)].map((k) => KIND_ICON[k] || '').join('');
      return el('button', {
        class: 'ff-level' + (progress.done[n] ? ' is-done' : '') + (n === state.level && state.mode === 'level' ? ' is-here' : ''),
        type: 'button',
        disabled: open ? null : '',
        'aria-label': open ? `Level ${n}` : `Level ${n}, locked`,
        onClick: () => startLevel(n),
      }, [
        el('span', { class: 'ff-level-num', text: open ? String(n) : '🔒' }),
        el('span', { class: 'ff-level-info', text: (L.only ? `× ${L.only}` : `to ${L.max * L.max}`) + ' ' + icons }),
      ]);
    }));
    AG.shell.overlay({ title: 'Pick a level 🌷', dismissable: true, body: grid, actions: [{ label: 'Keep playing', variant: 'quiet' }] });
  }

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🌷',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { html: 'A garden has <b style="color:#2b9cc0">rows</b>, with the <b style="color:#5a9a3d">same number</b> of flowers in each row.' }),
        el('li', { html: 'Pull the yellow dot to stretch the fence, then tap <b>Plant 🌱</b>.' }),
        el('li', { html: 'Tap the number of flowers, then <b>✓</b>. Count by rows — it is faster!' }),
        el('li', { text: '🔄 turns the garden, 🌰 gives you seeds to fit, ❓ hides a number.' }),
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
    title: 'Flower Fence',
    emoji: '🌷',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      { icon: '🎓', label: 'The lesson', onClick: startLesson },
      { icon: AG.shell.icons.grid, label: 'Levels', color: '#58c4dd', onClick: showLevels },
      {
        icon: AG.shell.icons.restart,
        label: 'Start again',
        color: 'var(--ag-green)',
        onClick: () => (state.mode === 'lesson' ? startLesson() : startLevel(state.level)),
      },
    ],
  });
  page.prepend(headerNode);
  // Muting should stop a sentence that is already being read.
  headerNode.addEventListener('click', () => { if (AG.audio.muted) hush(); });

  buildPad();
  drawField(3);

  if (progress.lesson) {
    startLevel(state.level);
  } else {
    // The first tap also lets the browser start talking.
    hud.textContent = '';
    AG.shell.overlay({
      title: 'Flower Fence 🌷',
      message: "Let's learn what “times” means!",
      actions: [{ label: 'Start ▶', variant: 'green', onClick: startLesson }],
    });
  }

  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__ffProbe = {
      state: () => state,
      progress: () => progress,
      levels: LEVELS.length,
      makeRounds: (n) => makeRounds(LEVELS[n - 1]),
      answer: (n) => { state.typed = String(n); submit(); },
      build: resize,
      plant,
      next,
      startLevel,
      startLesson,
    };
  }
})();
