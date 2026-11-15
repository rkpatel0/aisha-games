/* ------------------------------------------------------------------
   Bean Chain 🫘
   A running-total chain: 3 + 2 = _ − 1 = _ + 4 = _ … where each answer
   starts the next sum. Every step is a little story ("A bird brings two
   beans") acted out by beans flying in and out of a jar laid out in
   ten-frames. The colours match: blue beans and blue numbers come in,
   red ones go away, the yellow total is what's in the jar.
   Rules live in spec.md.
------------------------------------------------------------------ */

(() => {
  const { el, pick, delay } = AG.util;
  const NS = 'http://www.w3.org/2000/svg';

  const page = document.querySelector('.bc-page');
  const storyNode = document.querySelector('.bc-story');
  const questionNode = document.querySelector('.bc-question');
  const speakButton = document.querySelector('.bc-speak');
  const chainNode = document.querySelector('.bc-chain');
  const hud = document.querySelector('.bc-hud');
  const svg = document.querySelector('.bc-jar');
  const pad = document.querySelector('.bc-pad');

  /* ---------------- levels ---------------- */

  // max: biggest total · steps: sums in the chain · big: biggest jump
  // ops: which kinds of step may appear (add/take always; the rest are twists)
  const LEVELS = [
    { max: 10, steps: 3, big: 3, ops: ['add'] },
    { max: 10, steps: 4, big: 3, ops: ['add', 'take'] },
    { max: 10, steps: 5, big: 5, ops: ['add', 'take'] },
    { max: 10, steps: 5, big: 5, ops: ['add', 'take', 'double'] },
    { max: 10, steps: 5, big: 5, ops: ['add', 'take', 'ten'] },
    { max: 10, steps: 5, big: 5, ops: ['add', 'take', 'missing'] },
    { max: 15, steps: 5, big: 6, ops: ['add', 'take', 'double', 'ten'] },
    { max: 20, steps: 6, big: 6, ops: ['add', 'take'] },
    { max: 20, steps: 6, big: 7, ops: ['add', 'take', 'double', 'ten'] },
    { max: 20, steps: 6, big: 7, ops: ['add', 'take', 'missing'] },
    { max: 20, steps: 7, big: 8, ops: ['add', 'take', 'double', 'ten', 'missing'] },
    { max: 20, steps: 8, big: 9, ops: ['add', 'take', 'double', 'ten', 'missing'] },
  ];
  const TWIST = { double: '🪞', ten: '🔟', missing: '❓' };

  const progress = Object.assign({ unlocked: 1, done: {} }, AG.store.get('bean-chain', {}));
  const saveProgress = () => AG.store.set('bean-chain', progress);

  /* ---------------- words ---------------- */

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty'];

  // The number word is wrapped so it can share a colour with its digits.
  const beans = (n, cls) =>
    `<b class="bc-w ${cls}">${WORDS[n]}</b> ${n === 1 ? 'bean' : 'beans'}`;

  // {n} is the amount. Missing-middle steps say "some beans" instead.
  const ADDERS = [
    ['🐦', 'A bird brings {n}.'],
    ['🐰', 'Bunny hops in with {n}.'],
    ['🧚', 'A fairy magics up {n}!'],
    ['🐝', 'A bee drops in {n}.'],
    ['🦔', 'Hedgehog rolls in {n}.'],
    ['🐢', 'Turtle brings {n} on her back.'],
  ];
  const TAKERS = [
    ['🐿️', 'Squirrel takes {n}.'],
    ['🐭', 'A mouse eats {n}. Yum!'],
    ['🐻', 'Bear grabs {n}.'],
    ['🐸', 'Frog hops off with {n}.'],
    ['🦊', 'Fox sneaks away {n}.'],
  ];

  /* ---------------- making a chain ---------------- */

  const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function weighted(options) {
    let roll = Math.random() * options.reduce((sum, [, w]) => sum + w, 0);
    for (const [kind, w] of options) if ((roll -= w) < 0) return kind;
    return options[options.length - 1][0];
  }

  function makeChain(lv) {
    const start = rand(1, lv.ops.includes('take') ? 5 : 2);
    const steps = [];
    const seen = new Set();
    let n = start, last = null;

    for (let i = 0; i < lv.steps; i++) {
      const room = lv.max - n;
      const goal = n < 10 ? 10 : 20;
      const can = {
        add: room >= 1,
        take: n >= 1,
        double: n >= 1 && n * 2 <= lv.max && n <= 10,
        ten: n >= 1 && n !== goal && goal <= lv.max && goal - n <= 9,
        missing: room >= 1 || n >= 1,
      };
      // Lean towards adding when the jar is low and taking when it's full,
      // and make sure each twist turns up at least once.
      const options = lv.ops.filter((k) => can[k] && !(k !== 'add' && k !== 'take' && k === last))
        .map((k) => [k,
          k === 'add' ? 1 + 3 * room / lv.max :
          k === 'take' ? 1 + 3 * n / lv.max :
          seen.has(k) ? 0.6 : 4]);
      // Never paint into a corner: a full jar can always lose a bean.
      if (!options.length) options.push([room >= 1 ? 'add' : 'take', 1]);
      const kind = weighted(options);
      seen.add(kind);
      last = kind;

      let up = kind === 'add' || kind === 'double' || kind === 'ten';
      if (kind === 'missing') up = weighted([['up', room >= 1 ? 1 + room : 0], ['down', n >= 1 ? 1 + n : 0]]) === 'up';

      const amt =
        kind === 'double' ? n :
        kind === 'ten' ? goal - n :
        // add-only levels share out the room so the last sum still fits
        up ? rand(1, Math.min(lv.big, lv.ops.includes('take') ? room : Math.max(1, Math.floor(room / (lv.steps - i))))) :
        rand(1, Math.min(lv.big, n));
      const to = up ? n + amt : n - amt;

      const [who, line] =
        kind === 'double' ? ['🪞', 'The magic mirror doubles the beans!'] :
        kind === 'ten' ? ['⭐', `Fill the jar up to <b class="bc-w is-total">${WORDS[goal]}</b>!`] :
        pick(up ? ADDERS : TAKERS);

      const blank = kind === 'missing' || kind === 'ten' ? 'amt' : 'to';
      let story = line.replace('{n}', blank === 'amt' ? 'some beans' : beans(amt, up ? 'is-add' : 'is-take'));
      if (i === 0) story = `The jar has ${beans(start, 'is-total')}. ` + story;

      const ask =
        kind === 'ten' ? `How many more make ${WORDS[goal]}?` :
        blank === 'amt' ? `Now there are ${beans(to, 'is-total')}. How many ${up ? 'came in' : 'went away'}?` :
        'How many beans now?';

      steps.push({ kind, up, amt, from: n, to, blank, who, story, ask });
      n = to;
    }
    return { start, steps };
  }

  /* ---------------- state ---------------- */

  const state = {
    level: Math.min(progress.unlocked, LEVELS.length),
    chain: null,
    index: 0,        // which step is being asked
    count: 0,        // beans in the jar right now
    tries: 0,
    locked: true,
    typed: '',
  };
  const lv = () => LEVELS[state.level - 1];
  const step = () => state.chain.steps[state.index];
  const expected = () => (step().blank === 'to' ? step().to : step().amt);

  /* ---------------- the jar (SVG) ---------------- */

  const svgEl = (tag, attrs = {}, kids = []) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    for (const kid of kids) node.append(kid);
    return node;
  };

  // Beans sit in ten-frames: rows of five, two rows per frame, filling from
  // the bottom of the jar like real beans would.
  const GAP = 52, FRAME_GAP = 22, JAR_X = 330, JAR_W = 290, BOTTOM = 344;
  const slot = (i) => {
    const frame = Math.floor(i / 10), row = Math.floor((i % 10) / 5), col = i % 5;
    return { x: JAR_X + 41 + col * GAP, y: BOTTOM - 38 - (frame * 2 + row) * GAP - frame * FRAME_GAP };
  };
  // The animal waits on the left; beans it brings line up under it.
  // Its height follows the jar's (set in buildJar).
  const WHO = { x: 140, y: 92 };
  const source = (k) => ({ x: 52 + (k % 5) * 44, y: WHO.y + 84 + Math.floor(k / 5) * 46 });

  const layers = {};
  let jarBeans = [];     // jarBeans[i] is the bean in slot i
  let frames = [];       // the ten-frame outlines
  let countText = null;

  function buildJar() {
    svg.replaceChildren();
    const top = slot(lv().max - 1).y - 40;
    const left = JAR_X, right = JAR_X + JAR_W;

    layers.jar = svgEl('g', { class: 'bc-jar-glass' });
    layers.jar.append(svgEl('path', {
      class: 'bc-glass',
      d: `M ${left} ${top} L ${left} ${BOTTOM - 24} Q ${left} ${BOTTOM} ${left + 24} ${BOTTOM} ` +
         `L ${right - 24} ${BOTTOM} Q ${right} ${BOTTOM} ${right} ${BOTTOM - 24} L ${right} ${top}`,
    }));
    layers.jar.append(svgEl('line', { class: 'bc-rim', x1: left - 10, y1: top, x2: right + 10, y2: top }));

    frames = [];
    for (let f = 0; f * 10 < lv().max; f++) {
      const rows = Math.min(2, Math.ceil((lv().max - f * 10) / 5));
      const low = slot(f * 10), high = slot(f * 10 + (rows - 1) * 5);
      const frame = svgEl('rect', {
        class: 'bc-frame', rx: 14,
        x: low.x - 25, y: high.y - 24, width: 4 * GAP + 50, height: (rows - 1) * GAP + 48,
      });
      frames.push(frame);
      layers.jar.append(frame);
    }
    for (let i = 0; i < lv().max; i++) {
      const p = slot(i);
      layers.jar.append(svgEl('circle', { class: 'bc-slot', cx: p.x, cy: p.y, r: 4 }));
    }

    const countY = top - 18;
    WHO.y = Math.max(BOTTOM - 210, countY);
    countText = svgEl('text', { class: 'bc-count', x: JAR_X + JAR_W / 2, y: countY });

    // Crop the picture to what's in it, so small jars draw big.
    const crop = Math.min(countY - 52, WHO.y - 48);
    svg.setAttribute('viewBox', `0 ${crop} 640 ${360 - crop}`);
    svg.style.setProperty('--bc-aspect', 640 / (360 - crop));
    layers.beans = svgEl('g');
    layers.fx = svgEl('g');
    svg.append(layers.jar, countText, layers.beans, layers.fx);
    jarBeans = [];
  }

  // AG.fx.animate's offsetWidth reflow trick is a no-op on SVG nodes, so
  // restart their CSS animations by forcing layout another way.
  function replay(node, cls, ms) {
    node.classList.remove(cls);
    node.getBoundingClientRect();
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }

  function makeBean(cls = '') {
    const g = svgEl('g', { class: 'bc-bean ' + cls }, [
      svgEl('ellipse', { class: 'bc-bean-body', rx: 19, ry: 14 }),
      svgEl('path', { class: 'bc-bean-shine', d: 'M -10 -4 Q -2 -10 8 -6' }),
    ]);
    g._r = rand(-25, 25);
    layers.beans.append(g);
    return g;
  }

  function place(g, x, y, scale = 1) {
    g._x = x; g._y = y;
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${g._r}) scale(${scale.toFixed(3)})`);
  }

  function label(g, text) {
    g.querySelector('.bc-bean-num')?.remove();
    if (text === null) return;
    // Counter-rotate so the number stays upright on a tilted bean.
    g.append(svgEl('text', { class: 'bc-bean-num', transform: `rotate(${-g._r})` }, [document.createTextNode(text)]));
  }

  function setCount(n, pop = true) {
    state.count = n;
    countText.textContent = n;
    if (pop) replay(countText, 'is-pop', 300);
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

  const grow = (g, x, y) => tween(320, (t) => place(g, x, y, t));

  function fly(g, x, y, { ms = 640, shrink = false } = {}) {
    const x0 = g._x, y0 = g._y;
    const lift = 50 + Math.abs(x - x0) * 0.18;
    return tween(ms, (t) => place(g, x0 + (x - x0) * t, y0 + (y - y0) * t - Math.sin(Math.PI * t) * lift,
      shrink ? 1 - 0.8 * t : 1));
  }

  /* ---------------- a step on stage ---------------- */

  let staged = [];      // beans waiting beside the animal
  let ghosts = [];      // dashed outlines for "how many?" steps

  function stageStep() {
    const s = step();
    layers.fx.replaceChildren();
    staged = [];
    ghosts = [];

    const actor = svgEl('text', { class: 'bc-who', x: WHO.x, y: WHO.y }, [document.createTextNode(s.who)]);
    layers.fx.append(actor);
    replay(actor, 'is-pop', 400);

    if (s.blank === 'to' && s.up) {
      // The beans being brought wait in a little ten-frame of their own,
      // so "+ 4" is something she can see before she answers.
      for (let k = 0; k < s.amt; k++) {
        const g = makeBean('is-add');
        const p = source(k);
        place(g, p.x, p.y, 0);
        staged.push(g);
        delay(k * 70).then(() => grow(g, p.x, p.y));
      }
    } else if (s.blank === 'to') {
      for (let i = s.from - s.amt; i < s.from; i++) jarBeans[i].classList.add('is-take');
    } else if (s.up) {
      for (let i = s.from; i < s.to; i++) {
        const p = slot(i);
        const ghost = svgEl('ellipse', { class: 'bc-ghost' + (s.kind === 'ten' ? ' is-ten' : ''), cx: p.x, cy: p.y, rx: 19, ry: 14 });
        ghosts.push(ghost);
        layers.fx.append(ghost);
      }
      layers.fx.append(svgEl('text', { class: 'bc-mystery', x: WHO.x, y: WHO.y + 78 }, [document.createTextNode('?')]));
    } else {
      for (let i = s.to; i < s.from; i++) jarBeans[i].classList.add('is-take', 'is-mystery');
    }
  }

  // Count along on the beans in question — the "help me" after two tries.
  function countAlong() {
    const s = step();
    if (s.blank === 'to' && s.up) {
      staged.forEach((g, k) => label(g, s.from + k + 1));       // count on: 6, 7, 8…
      if (s.from) label(jarBeans[s.from - 1], s.from);
    } else if (s.blank === 'to') {
      for (let i = 0; i < s.to; i++) label(jarBeans[i], i + 1);  // the ones that stay
    } else if (s.up) {
      ghosts.forEach((ghost, k) => {
        layers.fx.append(svgEl('text', { class: 'bc-ghost-num', x: ghost.getAttribute('cx'), y: ghost.getAttribute('cy') },
          [document.createTextNode(k + 1)]));
      });
    } else {
      for (let i = s.to; i < s.from; i++) label(jarBeans[i], i - s.to + 1);
    }
  }

  async function playStep() {
    const s = step();
    jarBeans.forEach((g) => label(g, null));
    staged.forEach((g) => label(g, null));
    layers.fx.querySelectorAll('.bc-ghost-num, .bc-mystery').forEach((node) => node.remove());

    if (s.up) {
      const flying = [];
      for (let k = 0; k < s.amt; k++) {
        let g = staged[k];
        if (!g) {                       // "some beans" appear from the animal
          g = makeBean('is-add');
          place(g, WHO.x, WHO.y + 40, 0);
          await grow(g, WHO.x - 40 + (k % 5) * 20, WHO.y + 50);
        }
        flying.push(g);
      }
      await Promise.all(flying.map((g, k) => delay(k * 170).then(async () => {
        const i = s.from + k;
        const p = slot(i);
        await fly(g, p.x, p.y);
        jarBeans[i] = g;
        ghosts[k]?.remove();
        setCount(i + 1);
        AG.audio.play('flip');
        if (i % 10 === 9) tenFull(Math.floor(i / 10));
      })));
    } else {
      const leaving = jarBeans.slice(s.to, s.from).reverse();
      await Promise.all(leaving.map((g, k) => delay(k * 170).then(async () => {
        await fly(g, WHO.x + rand(-30, 30), WHO.y + 30, { shrink: true });
        g.remove();
        setCount(state.count - 1);
        AG.audio.play('flip');
      })));
      jarBeans.length = s.to;
    }

    await delay(350);
    // The newcomers settle in and turn into ordinary jar beans.
    jarBeans.forEach((g) => g.classList.remove('is-add', 'is-take', 'is-mystery'));
  }

  function tenFull(f) {
    const frame = frames[f];
    if (!frame) return;
    replay(frame, 'is-full', 900);
    const x = +frame.getAttribute('x') + +frame.getAttribute('width') + 4;
    const y = +frame.getAttribute('y') + +frame.getAttribute('height') / 2;
    const tag = svgEl('text', { class: 'bc-ten', x, y }, [document.createTextNode(f ? '20!' : '10!')]);
    layers.fx.append(tag);
    replay(tag, 'is-pop', 400);
  }

  /* ---------------- the chain of sums ---------------- */

  function token(text, cls) {
    return el('span', { class: 'bc-tok ' + cls, text: String(text) });
  }

  function renderChain() {
    const kids = [token(state.chain.start, 'is-total')];
    state.chain.steps.slice(0, state.index + 1).forEach((s, i) => {
      const current = i === state.index;
      const tone = s.up ? 'is-add' : 'is-take';
      kids.push(token(s.up ? '+' : '−', 'bc-op ' + tone));
      if (s.blank === 'amt' && current) kids.push(blankNode(tone));
      else kids.push(token(s.amt, tone + (s.blank === 'amt' ? ' is-solved' : '')));
      kids.push(token('=', 'bc-op'));
      if (s.blank === 'to' && current) kids.push(blankNode('is-total'));
      else kids.push(token(s.to, 'is-total' + (s.blank === 'to' ? ' is-solved' : '')));
      if (TWIST[s.kind]) kids.push(el('span', { class: 'bc-twist', text: TWIST[s.kind] }));
    });
    if (state.index < state.chain.steps.length - 1) kids.push(token('…', 'bc-op'));
    chainNode.replaceChildren(...kids);
    chainNode.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function blankNode(tone) {
    return el('span', { class: `bc-tok bc-blank is-active ${tone}`, text: state.typed || '?' });
  }

  /* ---------------- answering ---------------- */

  function buildPad() {
    const max = lv().max;
    const keys = [];
    for (let v = 1; v <= max; v++) keys.push(v);
    keys.push(0);
    pad.replaceChildren(...keys.map((v) => el('button', {
      class: 'bc-key' + (v === 0 ? ' is-zero' : ''),
      type: 'button',
      text: String(v),
      'data-v': v,
      onClick: () => answer(v),
    })));
  }

  async function answer(value) {
    if (state.locked) return;
    clearTimeout(typeTimer);
    state.typed = '';
    const key = pad.querySelector(`[data-v="${value}"]`);

    if (value !== expected()) {
      state.tries++;
      AG.audio.play('miss');
      if (key) AG.fx.animate(key, 'is-wrong', 400).then(() => key.classList.remove('is-wrong'));
      const blank = chainNode.querySelector('.is-active');
      if (blank) {
        blank.textContent = value;
        AG.fx.animate(blank, 'is-wrong', 400).then(() => {
          blank.classList.remove('is-wrong');
          if (!state.typed) blank.textContent = '?';
        });
      }
      if (state.tries === 2) {
        countAlong();
        questionNode.innerHTML = "Let's count the beans together! 👆";
        AG.fx.animate(questionNode, 'is-bumped', 500);
      }
      return;
    }

    state.locked = true;
    AG.audio.play('match');
    if (key) AG.fx.animate(key, 'is-right', 700).then(() => key.classList.remove('is-right'));
    const blank = chainNode.querySelector('.is-active');
    blank.textContent = value;
    blank.classList.replace('is-active', 'is-solved');

    await playStep();

    if (state.index === state.chain.steps.length - 1) return finish();
    state.index++;
    showStep();
  }

  // Keyboard: digits, with a short wait so "1" then "4" makes 14.
  let typeTimer = null;
  document.addEventListener('keydown', (event) => {
    if (state.locked || document.querySelector('.ag-overlay')) return;
    if (/^[0-9]$/.test(event.key)) {
      clearTimeout(typeTimer);
      state.typed += event.key;
      const v = +state.typed;
      if (state.typed.length === 2 || v * 10 > lv().max) return answer(v);
      const blank = chainNode.querySelector('.is-active');
      if (blank) blank.textContent = state.typed;
      typeTimer = setTimeout(() => answer(v), 900);
    } else if (event.key === 'Enter' && state.typed) {
      answer(+state.typed);
    } else if (event.key === 'Backspace') {
      clearTimeout(typeTimer);
      state.typed = '';
      const blank = chainNode.querySelector('.is-active');
      if (blank) blank.textContent = '?';
    }
  });

  /* ---------------- reading aloud ---------------- */

  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  speakButton.hidden = !canSpeak;

  function speak() {
    if (!canSpeak || !state.chain) return;
    const text = (storyNode.textContent + ' ' + questionNode.textContent).replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, '');
    try {
      speechSynthesis.cancel();
      const say = new SpeechSynthesisUtterance(text);
      say.rate = 0.85;
      say.pitch = 1.1;
      speechSynthesis.speak(say);
    } catch { /* no voice — the words are still on screen */ }
  }
  speakButton.addEventListener('click', speak);

  /* ---------------- flow ---------------- */

  function showStep() {
    const s = step();
    state.tries = 0;
    state.typed = '';
    storyNode.innerHTML = s.story;
    questionNode.innerHTML = s.ask;
    AG.fx.animate(storyNode, 'is-bumped', 500);
    hud.textContent = `Level ${state.level} · sum ${state.index + 1} of ${state.chain.steps.length}`;
    renderChain();
    stageStep();
    state.locked = false;
  }

  function startLevel(n) {
    document.querySelector('.ag-overlay')?.remove();
    document.querySelector('.ag-confetti')?.remove();
    try { speechSynthesis.cancel(); } catch { /* fine */ }
    state.level = Math.max(1, Math.min(n, LEVELS.length));
    state.chain = makeChain(lv());
    state.index = 0;
    buildJar();
    buildPad();
    for (let i = 0; i < state.chain.start; i++) {
      const g = makeBean();
      const p = slot(i);
      place(g, p.x, p.y);
      jarBeans[i] = g;
    }
    setCount(state.chain.start, false);
    showStep();
  }

  function finish() {
    state.locked = true;
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    progress.done[state.level] = true;
    progress.unlocked = Math.min(LEVELS.length, Math.max(progress.unlocked, state.level + 1));
    saveProgress();

    const last = state.level === LEVELS.length;
    const actions = [];
    if (!last) actions.push({ label: `Level ${state.level + 1} ▶`, variant: 'green', onClick: () => { stopConfetti(); startLevel(state.level + 1); } });
    actions.push({ label: 'Another chain 🫘', variant: last ? 'pink' : 'quiet', onClick: () => { stopConfetti(); startLevel(state.level); } });

    AG.shell.overlay({
      title: last ? 'Bean champion! 🏆' : `Level ${state.level} done! 🎉`,
      message: `${state.chain.steps.length} sums in a row, and the jar ends with ${state.count} ${state.count === 1 ? 'bean' : 'beans'}.`,
      actions,
    });
  }

  /* ---------------- levels & how to play ---------------- */

  function showLevels() {
    const grid = el('div', { class: 'bc-levels' }, LEVELS.map((L, i) => {
      const n = i + 1;
      const open = n <= progress.unlocked;
      const twists = L.ops.filter((k) => TWIST[k]).map((k) => TWIST[k]).join('');
      return el('button', {
        class: 'bc-level' + (progress.done[n] ? ' is-done' : '') + (n === state.level ? ' is-here' : ''),
        type: 'button',
        disabled: open ? null : '',
        'aria-label': open ? `Level ${n}` : `Level ${n}, locked`,
        onClick: () => startLevel(n),
      }, [
        el('span', { class: 'bc-level-num', text: open ? String(n) : '🔒' }),
        el('span', { class: 'bc-level-info', text: `to ${L.max} ${twists}` }),
      ]);
    }));
    AG.shell.overlay({ title: 'Pick a level 🫘', dismissable: true, body: grid, actions: [{ label: 'Keep playing', variant: 'quiet' }] });
  }

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🫘',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { html: 'Read the little story. Tap 🔊 to hear it.' }),
        el('li', { html: '<b style="color:#2b9cc0">Blue beans</b> come into the jar. <b style="color:#e0483b">Red beans</b> go away.' }),
        el('li', { text: 'Tap the number for the ? — each answer starts the next sum!' }),
        el('li', { text: '🪞 doubles the beans, 🔟 fills the jar to ten, ❓ hides how many came or went.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Bean Chain',
    emoji: '🫘',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      { icon: AG.shell.icons.grid, label: 'Levels', color: '#58c4dd', onClick: showLevels },
      { icon: AG.shell.icons.restart, label: 'New chain', color: 'var(--ag-green)', onClick: () => startLevel(state.level) },
    ],
  });

  page.prepend(headerNode);
  startLevel(state.level);

  if (window.__AISHA_DEV || location.hash === '#dev') {
    window.__bcProbe = {
      state: () => state,
      expected: () => (state.chain ? expected() : null),
      answer,
      startLevel,
      levels: LEVELS.length,
      makeChain: (n) => makeChain(LEVELS[n - 1]),
      progress: () => progress,
    };
  }
})();
