/* ------------------------------------------------------------------
   Bundle Bakery 🍪
   A first look at place value: loose cookies are slow to count, so we
   pack them in boxes of ten. "23" is 2 boxes and 3 loose. The colours
   match everywhere: boxes are blue, loose cookies are orange, the whole
   number is yellow.
   A spoken lesson comes first, then levels. Rules live in spec.md.
------------------------------------------------------------------ */

(() => {
  const { el, pick, delay } = AG.util;
  const $ = (sel) => document.querySelector(sel);

  const page = $('.bb-page');
  const storyNode = $('.bb-story');
  const questionNode = $('.bb-question');
  const speakButton = $('.bb-speak');
  const numNode = $('.bb-num');
  const shelf = $('.bb-shelf');
  const tray = $('.bb-tray');
  const countNode = $('.bb-count');
  const animalNode = $('.bb-animal');
  const runNode = $('.bb-run');
  const hud = $('.bb-hud');
  const pad = $('.bb-pad');
  const packButton = $('.bb-pack');
  const makeBox = $('.bb-make');
  const doneButton = $('.bb-done');
  const nextButton = $('.bb-next');

  /* ---------------- levels ---------------- */

  // lo–hi: the numbers in play. kinds: one tray per entry —
  //   pack    loose cookies from the oven: pack the tens, then say boxes and loose
  //   read    boxes and loose cookies are shown: what number is it?
  //   read0   a read with no loose cookies (20, 30, 40…)
  //   make    an animal orders a number: add boxes and cookies to fill it
  //   more1   one more cookie makes ten loose: pack a new box (19 → 20)
  //   more    a few more cookies spill over ten: pack, then what number now?
  const LEVELS = [
    { lo: 11, hi: 19, kinds: ['pack', 'pack', 'read'] },
    { lo: 11, hi: 19, kinds: ['read', 'make', 'read', 'make'] },
    { lo: 21, hi: 29, kinds: ['pack', 'read', 'make'] },
    { lo: 21, hi: 39, kinds: ['pack', 'read', 'make', 'read'] },
    { lo: 10, hi: 59, kinds: ['read0', 'more1', 'read0', 'more1'] },
    { lo: 31, hi: 59, kinds: ['read', 'make', 'pack', 'make'] },
    { lo: 41, hi: 69, kinds: ['make', 'read', 'more', 'make'] },
    { lo: 51, hi: 79, kinds: ['read', 'make', 'pack', 'more'] },
    { lo: 61, hi: 99, kinds: ['make', 'read', 'more', 'make'] },
    { lo: 11, hi: 99, kinds: ['read', 'make', 'pack', 'more', 'make'] },
  ];
  const KIND_ICON = { pack: '📦', read: '👀', read0: '0️⃣', make: '🦊', more1: '➕', more: '➕' };
  const ANIMALS = [
    { name: 'Fox', emoji: '🦊' },
    { name: 'Bear', emoji: '🐻' },
    { name: 'Panda', emoji: '🐼' },
    { name: 'Frog', emoji: '🐸' },
    { name: 'Owl', emoji: '🦉' },
    { name: 'Cat', emoji: '🐱' },
  ];
  const LESSON_STEPS = 6;

  const progress = Object.assign({ lesson: false, unlocked: 1, done: {} }, AG.store.get('bundle-bakery', {}));
  const saveProgress = () => AG.store.set('bundle-bakery', progress);

  /* ---------------- words ---------------- */

  const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const word = (n) => (n < 20 ? SMALL[n]
    : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + SMALL[n % 10] : ''));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // Number words are wrapped so they share a colour with the cookies and the digits.
  const boxesOf = (b, upper = false) =>
    `<b class="bb-w is-tens">${upper ? cap(word(b)) : word(b)} ${b === 1 ? 'box' : 'boxes'}</b>`;
  const looseOf = (l) => `<b class="bb-w is-ones">${word(l)} loose</b>`;
  const whole = (n, upper = false) => `<b class="bb-w is-total">${upper ? cap(word(n)) : word(n)}</b>`;
  const parts = (b, l, upper = false) => `${boxesOf(b, upper)} and ${looseOf(l)}`;

  /* ---------------- state ---------------- */

  const state = {
    mode: 'idle',      // 'lesson' | 'level'
    level: Math.min(progress.unlocked, LEVELS.length),
    index: 0,          // which tray of the level
    rounds: [],
    phase: 'idle',     // 'ask' | 'pack' | 'make' | 'next' | 'idle'
    boxes: 0,          // closed boxes of ten on the shelf
    loose: 0,          // loose cookies on the tray
    num: null,         // { tens, ones, blank: 'tens'|'ones'|'both'|null, solved }
    expected: null,    // the number the pad is waiting for
    target: null,      // { tens, ones } a make round is aiming for (for tests)
    typed: '',
    tries: 0,
    busy: false,       // a box is being packed during a make round
    resolve: null,     // settles whatever the game is waiting on
  };

  // Tests can speed every pause up.
  let speed = 1;
  const pause = (ms) => delay(ms * speed);

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
    state.busy = false;
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

  /* ---------------- the shelf and the tray ---------------- */

  function boxNode(full) {
    const cells = [];
    for (let k = 0; k < 10; k++) cells.push(el('span', { class: 'bb-cell', text: full ? '🍪' : '' }));
    return el('div', { class: 'bb-box ' + (full ? 'is-closed' : 'is-open') }, cells);
  }

  // Cookies sit a little crooked so a loose pile looks like a pile.
  function cookieNode(i, fresh = false) {
    return el('span', {
      class: 'bb-cookie' + (fresh ? ' is-new' : ''),
      text: '🍪',
      style: { '--bb-tilt': ((i * 37) % 31 - 15) + 'deg', '--bb-drop': ((i * 53) % 9 - 4) + 'px' },
    });
  }

  /** Redraw the shelf and the tray from state. */
  function render() {
    const boxes = [];
    for (let i = 0; i < state.boxes; i++) boxes.push(boxNode(true));
    shelf.replaceChildren(...boxes);
    if (state.phase === 'pack') openBox();

    const cookies = [];
    for (let i = 0; i < state.loose; i++) cookies.push(cookieNode(i));
    tray.replaceChildren(...cookies);
    tray.classList.toggle('is-many', state.loose > 26);
  }

  function setCount(boxes, loose) {
    state.boxes = boxes;
    state.loose = loose;
    render();
  }

  /** The empty box waiting to be filled. */
  function openBox() {
    let box = shelf.querySelector('.bb-box.is-open');
    if (!box) {
      box = boxNode(false);
      shelf.append(box);
    }
    box.classList.toggle('is-target', state.phase === 'pack');
    return box;
  }

  /** Cookies come out of the oven onto the tray. */
  async function pour(n, gap = 55) {
    const ok = guard();
    for (let k = 0; k < n; k++) {
      tray.append(cookieNode(state.loose, true));
      state.loose++;
      tray.classList.toggle('is-many', state.loose > 26);
      if (k % 2 === 0) AG.audio.play('flip');
      await ok(pause(gap));
    }
  }

  /** Ten loose cookies go into a box, one at a time, and the box closes. */
  async function packTen() {
    const ok = guard();
    if (state.loose < 10 || state.boxes >= 9) return;
    const box = openBox();
    box.classList.remove('is-target');
    const cells = box.querySelectorAll('.bb-cell');
    for (let k = 0; k < 10; k++) {
      tray.lastElementChild?.remove();
      state.loose--;
      cells[k].textContent = '🍪';
      AG.audio.play('flip');
      await ok(pause(95));
    }
    box.classList.remove('is-open');
    box.classList.add('is-closed', 'is-new');
    state.boxes++;
    AG.audio.play('match');
    await ok(pause(500));
  }

  /* ---------------- counting out loud ---------------- */

  function showCounter(animal = '') {
    animalNode.textContent = animal;
    animalNode.hidden = !animal;
    runNode.textContent = '';
    countNode.hidden = false;
  }

  function tick(value) {
    runNode.textContent = value;
    AG.fx.animate(runNode, 'is-pop', 300);
    AG.audio.play('flip');
  }

  function clearMarks() {
    countNode.hidden = true;
    shelf.querySelectorAll('.is-lit').forEach((node) => node.classList.remove('is-lit'));
  }

  /** Each box lights up: 10, 20, 30 (or 1, 2, 3 with step = 1). */
  async function countBoxes(step = 10, gap = 520) {
    const ok = guard();
    for (const [i, box] of [...shelf.querySelectorAll('.bb-box.is-closed')].entries()) {
      box.classList.add('is-lit');
      tick((i + 1) * step);
      await ok(pause(gap));
      box.classList.remove('is-lit');
    }
  }

  /** Each loose cookie hops and gets the next number. */
  async function countLoose(from = 0, gap = 300) {
    const ok = guard();
    for (const [i, cookie] of [...tray.querySelectorAll('.bb-cookie')].entries()) {
      AG.fx.animate(cookie, 'is-lit', 350).then(() => cookie.classList.remove('is-lit'));
      tick(from + i + 1);
      await ok(pause(gap));
    }
  }

  /** The quick way: tens first, then the loose ones. */
  async function countAll(animal = '🐇') {
    const ok = guard();
    showCounter(animal);
    await ok(countBoxes(10));
    await ok(countLoose(state.boxes * 10));
    if (!state.boxes && !state.loose) tick(0);
  }

  /* ---------------- the number ---------------- */

  function renderNum() {
    const q = state.num;
    if (!q) return numNode.replaceChildren();
    const digit = (key, caption, at) => {
      const active = q.blank === key || q.blank === 'both';
      const value = active ? (q.blank === 'both' ? state.typed[at] : state.typed) || '?' : (q[key] ?? '?');
      const cls = `bb-digit is-${key}` +
        (active ? ' is-active' : '') +
        (!active && q[key] == null ? ' is-unknown' : '') +
        (q.solved === key || q.solved === 'both' ? ' is-solved' : '');
      return el('div', { class: cls }, [
        el('span', { class: 'bb-digit-n', text: String(value) }),
        el('span', { class: 'bb-digit-cap', text: caption, 'aria-hidden': 'true' }),
      ]);
    };
    numNode.replaceChildren(digit('tens', '📦', 0), digit('ones', '🍪', 1));
  }

  function setNum(q) {
    state.num = q;
    renderNum();
  }

  function pulseNum() {
    numNode.querySelectorAll('.bb-digit').forEach((node) => AG.fx.animate(node, 'is-pulse', 1100));
  }

  /* ---------------- waiting on Aisha ---------------- */

  function setPhase(phase) {
    state.phase = phase;
    pad.hidden = phase !== 'ask';
    packButton.hidden = phase !== 'pack';
    makeBox.hidden = phase !== 'make';
    nextButton.hidden = phase !== 'next';
    tray.classList.toggle('is-target', phase === 'pack');
    if (phase === 'pack') openBox();
    else shelf.querySelector('.bb-box.is-target')?.classList.remove('is-target');
  }

  const waiting = () => new Promise((resolve) => { state.resolve = resolve; });

  function settle(value) {
    const resolve = state.resolve;
    if (!resolve) return;
    state.resolve = null;
    resolve(value);
  }

  /** Ask for a number on the pad. `help` runs after two wrong tries. */
  async function askNumber(expected, num, help) {
    const ok = guard();
    state.expected = expected;
    state.tries = 0;
    state.typed = '';
    setNum(num);
    setPhase('ask');

    for (;;) {
      const value = await ok(waiting());
      if (value === expected) break;
      state.tries++;
      AG.audio.play('miss');
      numNode.querySelectorAll('.is-active').forEach((node) => {
        AG.fx.animate(node, 'is-wrong', 400).then(() => node.classList.remove('is-wrong'));
      });
      if (state.tries === 2 && help) {
        hint("Let's count together! 👆");
        await ok(help());
      }
    }

    AG.audio.play('match');
    const solved = { ...num, blank: null, solved: num.blank };
    if (num.blank === 'tens') solved.tens = expected;
    else if (num.blank === 'ones') solved.ones = expected;
    else { solved.tens = Math.floor(expected / 10); solved.ones = expected % 10; }
    setNum(solved);
    state.expected = null;
    setPhase('idle');
  }

  /** Wait for a tap on the empty box (or the Pack button). */
  async function waitPack() {
    const ok = guard();
    setPhase('pack');
    await ok(waiting());
    setPhase('idle');
  }

  /** Let her add and take away boxes and cookies, and wait for Done. */
  async function waitMake() {
    const ok = guard();
    setPhase('make');
    await ok(waiting());
    setPhase('idle');
    return { boxes: state.boxes, loose: state.loose };
  }

  async function waitNext(label = 'Next ▶') {
    const ok = guard();
    nextButton.textContent = label;
    setPhase('next');
    await ok(waiting());
    AG.audio.play('flip');
    setPhase('idle');
  }

  /* ---------------- buttons, pad & keyboard ---------------- */

  function type(digit) {
    if (state.phase !== 'ask' || !state.num) return;
    if (state.num.blank === 'both') {
      if (state.typed.length >= 2) return;
      state.typed += digit;
    } else {
      state.typed = digit;   // one digit: a new tap swaps it
    }
    AG.audio.play('flip');
    renderNum();
  }
  function backspace() {
    state.typed = state.typed.slice(0, -1);
    renderNum();
  }
  function submit() {
    if (state.phase !== 'ask' || !state.typed || !state.resolve) return;
    const value = +state.typed;
    state.typed = '';
    renderNum();
    settle(value);
  }
  const pack = () => { if (state.phase === 'pack') settle(); };
  const next = () => { if (state.phase === 'next') settle(); };
  const done = () => { if (state.phase === 'make' && !state.busy) settle(); };

  /** The + and − buttons of a make round. Ten loose cookies pack themselves. */
  function step(what, by) {
    if (state.phase !== 'make' || state.busy) return;
    clearMarks();
    if (what === 'box') {
      const boxes = state.boxes + by;
      if (boxes < 0 || boxes > 9) return AG.audio.play('miss');
      state.boxes = boxes;
      render();
      if (by > 0) shelf.lastElementChild?.classList.add('is-new');
      AG.audio.play('flip');
      return;
    }
    const loose = state.loose + by;
    if (loose < 0 || (loose > 9 && state.boxes >= 9)) return AG.audio.play('miss');
    state.loose = loose;
    render();
    if (by > 0) tray.lastElementChild?.classList.add('is-new');
    AG.audio.play('flip');
    if (loose === 10) {
      state.busy = true;
      const mine = runId;
      hint('Ten loose cookies! They go in a box.');
      packTen()
        .then(() => { if (mine === runId) { state.busy = false; render(); } })
        .catch((err) => { if (err !== CANCEL) throw err; });
    }
  }

  function buildPad() {
    const key = (text, cls, label, onClick) =>
      el('button', { class: 'bb-key ' + cls, type: 'button', text, 'aria-label': label, onClick });
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => key(String(d), '', String(d), () => type(String(d))));
    keys.push(
      key('⌫', 'is-back', 'Rub out', backspace),
      key('0', '', '0', () => type('0')),
      key('✓', 'is-ok', 'Done', submit),
    );
    pad.replaceChildren(...keys);
  }

  packButton.addEventListener('click', pack);
  tray.addEventListener('click', pack);
  shelf.addEventListener('click', (event) => { if (event.target.closest('.bb-box.is-target')) pack(); });
  nextButton.addEventListener('click', next);
  doneButton.addEventListener('click', done);
  speakButton.addEventListener('click', readAll);
  makeBox.querySelectorAll('.bb-step').forEach((button) => {
    button.addEventListener('click', () => step(button.dataset.what, +button.dataset.by));
  });

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('.ag-overlay')) return;
    const { key } = event;
    if (state.phase === 'ask') {
      if (/^[0-9]$/.test(key)) type(key);
      else if (key === 'Enter') submit();
      else if (key === 'Backspace') backspace();
    } else if (state.phase === 'pack' && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      pack();
    } else if (state.phase === 'make') {
      if (key === 'ArrowUp') step('box', 1);
      else if (key === 'ArrowDown') step('box', -1);
      else if (key === 'ArrowRight') step('cookie', 1);
      else if (key === 'ArrowLeft') step('cookie', -1);
      else if (key === 'Enter') done();
      else return;
      event.preventDefault();
    } else if (state.phase === 'next' && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      next();
    }
  });

  /* ---------------- pieces every tray is made of ---------------- */

  function freshTray() {
    state.target = null;
    state.busy = false;
    clearMarks();
    setNum(null);
    setPhase('idle');
    setCount(0, 0);
  }

  /** Keep packing until fewer than ten cookies are loose. */
  async function packAll() {
    const ok = guard();
    while (state.loose >= 10 && state.boxes < 9) {
      await ok(waitPack());
      await ok(packTen());
      if (state.loose >= 10) hint('Still lots loose! Pack ten more.');
    }
  }

  /** "How many boxes?" then "How many loose?" — and the number appears. */
  async function askParts() {
    const ok = guard();
    const { boxes, loose } = state;
    await ok(askNumber(boxes, { tens: null, ones: null, blank: 'tens' }, async () => {
      showCounter('');
      await countBoxes(1);
    }));
    clearMarks();
    hint('How many loose cookies?');
    await ok(askNumber(loose, { tens: boxes, ones: null, blank: 'ones' }, async () => {
      showCounter('');
      await countLoose(0);
      if (!state.loose) tick(0);
    }));
    clearMarks();
    setNum({ tens: boxes, ones: loose, solved: 'both' });
  }

  const leftOver = (l) => (l === 0 ? 'No cookies are left over.'
    : `Only ${word(l)} left. Not enough for a box.`);

  /* ---------------- the kinds of tray ---------------- */

  const ROUNDS = {
    async pack({ n }) {
      const ok = guard();
      // Big numbers start with some boxes already packed, so the tray never overflows.
      const pre = Math.max(0, Math.floor(n / 10) - 2);
      setCount(pre, 0);
      tell('Cookies from the oven! 🍪', 'Tap the empty box to pack ten.');
      await ok(pour(n - pre * 10));
      await ok(packAll());
      tell(leftOver(state.loose), 'How many boxes?');
      await ok(askParts());
      tell(`${parts(state.boxes, state.loose, true)} is ${whole(n)}!`);
      await ok(countAll());
      await ok(pause(1100));
    },

    async read({ n }) {
      const ok = guard();
      const tens = Math.floor(n / 10), ones = n % 10;
      setCount(tens, ones);
      shelf.querySelectorAll('.bb-box').forEach((node) => node.classList.add('is-new'));
      tray.querySelectorAll('.bb-cookie').forEach((node) => node.classList.add('is-new'));
      AG.audio.play('flip');
      tell('Look at the boxes and the loose cookies.', 'What number is it?');
      await ok(askNumber(n, { tens: null, ones: null, blank: 'both' }, () => countAll()));
      tell(`Yes! ${parts(tens, ones, true)} is ${whole(n)}.`);
      await ok(countAll());
      await ok(pause(1100));
    },

    async make({ n }) {
      const ok = guard();
      const tens = Math.floor(n / 10), ones = n % 10;
      const animal = pick(ANIMALS);
      state.target = { tens, ones };
      setNum({ tens, ones });
      tell(`${animal.name} wants ${whole(n)} cookies. ${animal.emoji}`, 'Add boxes and cookies. Then tap Done.');

      for (let tries = 1; ; tries++) {
        const made = await ok(waitMake());
        if (made.boxes === tens && made.loose === ones) break;
        AG.audio.play('miss');
        if (tries < 2) {
          hint(`That is ${whole(made.boxes * 10 + made.loose)}. ${animal.name} wants ${whole(n)}.`);
        } else {
          hint(`${animal.name} wants ${parts(tens, ones)}.`);
          pulseNum();
        }
      }

      state.target = null;
      AG.audio.play('match');
      setNum({ tens, ones, solved: 'both' });
      tell(`Yes! ${parts(tens, ones, true)} is ${whole(n)}.`, `${animal.name} says thank you! ${animal.emoji}`);
      await ok(countAll(animal.emoji));
      await ok(pause(1100));
    },

    async more({ n, k }) {
      const ok = guard();
      const tens = Math.floor(n / 10), ones = n % 10;
      setCount(tens, ones);
      setNum({ tens, ones });
      tell(`Here are ${whole(n)} cookies.`, k === 1 ? 'Here comes one more!' : `Here come ${word(k)} more!`);
      await ok(pause(2600));
      await ok(pour(k, 320));
      setNum({ tens: null, ones: null });
      tell(state.loose === 10 ? 'Ten loose cookies!' : 'Lots of loose cookies!', 'Tap the empty box to pack ten.');
      await ok(packAll());
      tell('A new box! 📦', 'What number is it now?');
      await ok(askNumber(n + k, { tens: null, ones: null, blank: 'both' }, () => countAll()));
      tell(`${whole(n, true)} and ${word(k)} more is ${whole(n + k)}.`,
        `${parts(state.boxes, state.loose, true)}.`);
      await ok(countAll());
      await ok(pause(1100));
    },
  };
  ROUNDS.read0 = ROUNDS.read;
  ROUNDS.more1 = ROUNDS.more;

  /* ---------------- levels ---------------- */

  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function makeRounds(L) {
    const used = new Set();
    return L.kinds.map((kind) => {
      let round;
      for (let t = 0; t < 60; t++) {
        if (kind === 'read0') {
          round = { kind, n: 10 * randInt(Math.max(1, Math.ceil(L.lo / 10)), Math.floor(L.hi / 10)) };
        } else if (kind === 'more1' || kind === 'more') {
          const tens = randInt(Math.max(1, Math.floor(L.lo / 10)), Math.min(8, Math.floor(L.hi / 10)));
          const ones = kind === 'more1' ? 9 : randInt(6, 9);
          const k = kind === 'more1' ? 1 : randInt(10 - ones, Math.min(13 - ones, 5));
          round = { kind, n: tens * 10 + ones, k };
        } else {
          round = { kind, n: randInt(L.lo, L.hi) };
          if (round.n % 10 === 0) continue;
        }
        if (!used.has(round.n)) break;
      }
      used.add(round.n);
      return round;
    });
  }

  function startLevel(n) {
    run(async (ok) => {
      state.mode = 'level';
      state.level = Math.max(1, Math.min(n, LEVELS.length));
      state.rounds = makeRounds(LEVELS[state.level - 1]);

      for (let i = 0; i < state.rounds.length; i++) {
        state.index = i;
        hud.textContent = `Level ${state.level} · tray ${i + 1} of ${state.rounds.length}`;
        freshTray();
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
    actions.push({ label: 'More cookies 🍪', variant: last ? 'pink' : 'quiet', onClick: () => { stopConfetti(); startLevel(state.level); } });

    AG.shell.overlay({
      title: last ? 'Master baker! 🏆' : `Level ${state.level} done! 🎉`,
      message: `You packed ${word(count)} trays of cookies.`,
      actions,
    });
  }

  /* ---------------- the lesson ---------------- */

  function startLesson() {
    run(async (ok) => {
      state.mode = 'lesson';
      const stepHud = (k) => { hud.textContent = `Lesson · ${k} of ${LESSON_STEPS}`; };

      // 1 — a pile of loose cookies is slow to count
      stepHud(1);
      freshTray();
      tell('So many cookies! 🍪', 'Snail counts them one by one. So slow…');
      await ok(pour(13, 90));
      await ok(pause(1500));
      showCounter('🐌');
      await ok(countLoose(0, 520));
      tell(`${whole(13, true)} cookies.`, 'That took a long time!');
      await ok(waitNext());

      // 2 — ten of them go in a box
      stepHud(2);
      clearMarks();
      tell('Let us pack ten cookies in a box. 📦', 'Tap the empty box!');
      await ok(waitPack());
      await ok(packTen());
      tell('Ten cookies in one box!', 'Three are left over. They are loose.');
      await ok(waitNext());

      // 3 — now counting is quick
      stepHud(3);
      tell('Bunny counts the box first: ten!', 'Then eleven, twelve, thirteen. So fast!');
      await ok(pause(1200));
      await ok(countAll('🐇'));
      await ok(waitNext());

      // 4 — how it is written
      stepHud(4);
      setNum({ tens: 1, ones: 3, solved: 'both' });
      pulseNum();
      tell(`${parts(1, 3, true)} is ${whole(13)}.`,
        'The blue number is the boxes. The orange number is the loose cookies.');
      await ok(waitNext());

      // 5 — her turn
      stepHud(5);
      freshTray();
      tell('Your turn! Here are more cookies.', 'Tap the empty box to pack ten.');
      await ok(pour(15, 70));
      await ok(packAll());
      tell(leftOver(state.loose), 'How many boxes?');
      await ok(askParts());
      tell(`${parts(1, 5, true)} is ${whole(15)}!`);
      await ok(countAll('🐇'));
      await ok(waitNext());

      // 6 — a bigger pile: two boxes
      stepHud(6);
      freshTray();
      tell('A big pile!', 'Pack ten. Then pack ten again.');
      await ok(pour(24, 55));
      await ok(packAll());
      tell(leftOver(state.loose), 'How many boxes?');
      await ok(askParts());
      tell(`${parts(2, 4, true)} is ${whole(24)}!`, 'Boxes of ten make counting quick.');
      await ok(countAll('🐇'));
      await ok(waitNext("Let's play! ▶"));

      progress.lesson = true;
      saveProgress();
      startLevel(state.level);
    });
  }

  /* ---------------- levels & how to play ---------------- */

  function showLevels() {
    const grid = el('div', { class: 'bb-levels' }, LEVELS.map((L, i) => {
      const n = i + 1;
      const open = n <= progress.unlocked;
      const icons = [...new Set(L.kinds.map((k) => KIND_ICON[k]))].join('');
      return el('button', {
        class: 'bb-level' + (progress.done[n] ? ' is-done' : '') + (n === state.level && state.mode === 'level' ? ' is-here' : ''),
        type: 'button',
        disabled: open ? null : '',
        'aria-label': open ? `Level ${n}` : `Level ${n}, locked`,
        onClick: () => startLevel(n),
      }, [
        el('span', { class: 'bb-level-num', text: open ? String(n) : '🔒' }),
        el('span', { class: 'bb-level-info', text: `to ${L.hi} ${icons}` }),
      ]);
    }));
    AG.shell.overlay({ title: 'Pick a level 🍪', dismissable: true, body: grid, actions: [{ label: 'Keep playing', variant: 'quiet' }] });
  }

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🍪',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { html: 'Tap the empty box to pack <b style="color:#2b9cc0">ten cookies</b> in it.' }),
        el('li', { html: 'Count the <b style="color:#2b9cc0">boxes</b>, then the <b style="color:#d9742a">loose cookies</b>. Tap the number, then <b>✓</b>.' }),
        el('li', { html: 'In a number like 23, the <b style="color:#2b9cc0">2 is boxes</b> and the <b style="color:#d9742a">3 is loose</b>.' }),
        el('li', { text: '🦊 An animal orders cookies: tap + and − to make the number, then Done.' }),
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
    title: 'Bundle Bakery',
    emoji: '🍪',
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
  freshTray();

  if (progress.lesson) {
    startLevel(state.level);
  } else {
    // The first tap also lets the browser start talking.
    hud.textContent = '';
    AG.shell.overlay({
      title: 'Bundle Bakery 🍪',
      message: "Let's pack cookies in boxes of ten!",
      actions: [{ label: 'Start ▶', variant: 'green', onClick: startLesson }],
    });
  }

  if (window.__AISHA_DEV || location.hash === '#dev') {
    /** Play whatever the game is waiting for, until a pop-up shows (or the mode changes). */
    async function auto(untilMode = null, maxMs = 38000) {
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        if (document.querySelector('.ag-overlay')) return 'overlay';
        if (untilMode && state.mode === untilMode) return untilMode;
        if (state.phase === 'pack') pack();
        else if (state.phase === 'ask') { state.typed = String(state.expected); submit(); }
        else if (state.phase === 'make' && !state.busy && state.target) {
          setCount(state.target.tens, state.target.ones);
          done();
        } else if (state.phase === 'next') next();
        await delay(30);
      }
      return 'timeout';
    }

    window.__bbProbe = {
      state: () => state,
      progress: () => progress,
      levels: LEVELS.length,
      makeRounds: (n) => makeRounds(LEVELS[n - 1]),
      fast: (factor = 0.05) => { speed = factor; },
      answer: (n) => { state.typed = String(n); submit(); },
      pack,
      step,                                   // step('box' | 'cookie', +1 | -1)
      make: (boxes, loose) => { if (state.phase === 'make' && !state.busy) setCount(boxes, loose); },
      done,
      next,
      auto,
      startLevel,
      startLesson,
    };
  }
})();
