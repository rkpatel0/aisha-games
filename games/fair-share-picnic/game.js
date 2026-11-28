/* ------------------------------------------------------------------
   Fair Share Picnic 🧺
   A first look at division: sharing snacks so every friend gets the same.
   Snacks are dealt out one at a time ("one for you, one for you"), the
   ones that cannot go round go to the dog, and it is written 12 ÷ 3 = 4.
   The colours match everywhere: all the snacks are orange, the friends
   are blue, how many each is green, leftovers are purple.
   A spoken lesson comes first, then levels. Rules live in spec.md.
------------------------------------------------------------------ */

(() => {
  const { el, pick, delay, shuffle } = AG.util;
  const $ = (sel) => document.querySelector(sel);

  const page = $('.fsp-page');
  const storyNode = $('.fsp-story');
  const questionNode = $('.fsp-question');
  const speakButton = $('.fsp-speak');
  const eqNode = $('.fsp-eq');
  const hud = $('.fsp-hud');
  const pileNode = $('.fsp-pile');
  const heap = $('.fsp-heap');
  const dogNode = $('.fsp-dog');
  const dogFace = $('.fsp-dogface');
  const bowl = $('.fsp-bowl');
  const dogBadge = $('.fsp-dogbadge');
  const friendsNode = $('.fsp-friends');
  const pad = $('.fsp-pad');
  const goButton = $('.fsp-go');

  /* ---------------- levels ---------------- */

  // n: how many friends (lowest, highest) · each: how many each friend gets
  // kinds: one picnic per entry —
  //   share     tap a friend to give one snack at a time, then: how many each?
  //   quick     the "One each" button deals a whole round, then: how many each?
  //   leftover  it does not come out even: the rest go to the dog
  //   friends   12 cookies, 3 each: add friends until they are gone. How many friends?
  //   mult      4 friends with 3 each: how many cookies were in the basket?
  const LEVELS = [
    { n: [2, 2], each: [2, 4], kinds: ['share', 'share', 'share'] },
    { n: [2, 3], each: [2, 4], kinds: ['share', 'share', 'share'] },
    { n: [2, 3], each: [3, 5], kinds: ['share', 'quick', 'quick'] },
    { n: [2, 2], each: [2, 4], kinds: ['quick', 'leftover', 'leftover'] },
    { n: [2, 3], each: [2, 5], kinds: ['share', 'quick', 'leftover', 'quick'] },
    { n: [2, 3], each: [2, 4], kinds: ['quick', 'friends', 'friends'] },
    { n: [2, 4], each: [2, 4], kinds: ['friends', 'leftover', 'quick', 'friends'] },
    { n: [2, 4], each: [2, 4], kinds: ['quick', 'mult', 'quick', 'mult'] },
    { n: [3, 4], each: [2, 4], kinds: ['leftover', 'friends', 'mult', 'leftover'] },
    { n: [3, 5], each: [2, 4], kinds: ['quick', 'leftover', 'friends', 'mult'] },
    { n: [3, 5], each: [2, 4], kinds: ['leftover', 'mult', 'friends', 'leftover'] },
    { n: [2, 5], each: [2, 4], kinds: ['share', 'leftover', 'friends', 'mult', 'quick'] },
  ];
  const KIND_ICON = { quick: '⚡', leftover: '🐶', friends: '➕', mult: '✖️' };
  const SHARE_MAX = 12;       // more taps than this is a chore
  const LESSON_STEPS = 6;

  const FRIENDS = [
    { e: '🐰', name: 'Bunny' }, { e: '🐻', name: 'Bear' }, { e: '🦊', name: 'Fox' },
    { e: '🐼', name: 'Panda' }, { e: '🐸', name: 'Frog' }, { e: '🐱', name: 'Cat' },
    { e: '🐷', name: 'Pig' }, { e: '🐵', name: 'Monkey' },
  ];
  const SNACKS = [
    { e: '🍪', one: 'cookie', many: 'cookies' },
    { e: '🍓', one: 'strawberry', many: 'strawberries' },
    { e: '🍎', one: 'apple', many: 'apples' },
    { e: '🧁', one: 'cupcake', many: 'cupcakes' },
    { e: '🥕', one: 'carrot', many: 'carrots' },
    { e: '🍩', one: 'donut', many: 'donuts' },
    { e: '🍌', one: 'banana', many: 'bananas' },
  ];

  const progress = Object.assign({ lesson: false, unlocked: 1, done: {} }, AG.store.get('fair-share-picnic', {}));
  const saveProgress = () => AG.store.set('fair-share-picnic', progress);

  /* ---------------- words ---------------- */

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
    'twenty-three', 'twenty-four', 'twenty-five'];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // Number words are wrapped so they share a colour with the picnic and the sum.
  const w = (n, tone, upper = false) =>
    `<b class="fsp-w ${tone}">${upper ? cap(WORDS[n]) : WORDS[n]}</b>`;
  const snackWord = (k) => (k === 1 ? state.snack.one : state.snack.many);

  /* ---------------- state ---------------- */

  const state = {
    mode: 'idle',      // 'lesson' | 'level'
    level: Math.min(progress.unlocked, LEVELS.length),
    index: 0,          // which picnic of the level
    rounds: [],
    phase: 'idle',     // 'deal' | 'go' | 'dog' | 'ask' | 'next' | 'idle'
    snack: SNACKS[0],
    friends: [],       // who is at the picnic
    pile: 0,           // snacks still in the basket
    plates: [],        // snacks on each friend's plate
    dog: 0,            // snacks in the dog's bowl
    eq: null,          // { parts: [{k, v, tone} | {op}], blank, solved }
    expected: null,
    typed: '',
    tries: 0,
    nudges: 0,
    speed: 1,          // tests turn this down to hurry the animations
    resolve: null,     // settles whatever the game is waiting on
  };

  const P = (ms) => delay(ms * state.speed);

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
    const clean = text
      .replace(/÷/g, ' sharing ')
      .replace(/×/g, ' times ')
      .replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, ' ');
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

  /* ---------------- the picnic ---------------- */

  let friendNodes = [];       // [{ node, plate, badge, bubble }]

  const snackNode = (pop) =>
    el('span', { class: 'fsp-snack' + (pop ? ' is-new' : ''), text: state.snack.e });
  const snacks = (count) => Array.from({ length: count }, () => snackNode(false));

  function addFriend(friend, filled = 0) {
    const i = friendNodes.length;
    const plate = el('span', { class: 'fsp-plate' }, snacks(filled));
    const badge = el('span', { class: 'fsp-badge' });
    const bubble = el('span', { class: 'fsp-bubble' });
    const node = el('button', {
      class: 'fsp-friend is-new',
      type: 'button',
      'aria-label': `Give one to ${friend.name}`,
      onClick: () => tapPlate(i),
    }, [
      el('span', { class: 'fsp-face' }, [el('span', { class: 'fsp-animal', text: friend.e }), bubble]),
      el('span', { class: 'fsp-name', text: friend.name }),
      el('span', { class: 'fsp-platewrap' }, [plate, badge]),
    ]);
    friendsNode.append(node);
    friendNodes.push({ node, plate, badge, bubble });
    state.friends.push(friend);
    state.plates.push(filled);
    return i;
  }

  /** Lay the picnic: `total` snacks in the basket and `n` friends with plates. */
  function setTable({ total, n, each = 0, dog = false, snack = pick(SNACKS), friends = shuffle(FRIENDS).slice(0, n) }) {
    state.snack = snack;
    state.pile = total;
    state.dog = 0;
    state.friends = [];
    state.plates = [];
    state.nudges = 0;
    friendNodes = [];
    friendsNode.replaceChildren();
    heap.replaceChildren(...snacks(total));
    pileNode.classList.toggle('is-empty', total === 0);
    bowl.replaceChildren();
    dogBadge.textContent = '';
    dogNode.hidden = !dog;
    for (const friend of friends) addFriend(friend, each);
    return snack;
  }

  /** One snack from the basket onto a plate. */
  function give(i) {
    if (state.pile <= 0 || !friendNodes[i]) return;
    state.pile--;
    heap.lastChild?.remove();
    state.plates[i]++;
    friendNodes[i].plate.append(snackNode(true));
    pileNode.classList.toggle('is-empty', state.pile === 0);
    AG.audio.play('flip');
  }

  /** Whatever is left in the basket goes into the dog's bowl. */
  async function giveDog() {
    const ok = guard();
    while (state.pile > 0) {
      state.pile--;
      heap.lastChild?.remove();
      state.dog++;
      bowl.append(snackNode(true));
      AG.audio.play('flip');
      await ok(P(260));
    }
    pileNode.classList.add('is-empty');
    AG.fx.animate(dogFace, 'is-pop', 400);
  }

  const fewest = () => Math.min(...state.plates);
  const allEqual = () => state.plates.every((count) => count === state.plates[0]);

  function setBubble(i, text) {
    if (friendNodes[i]) friendNodes[i].bubble.textContent = text;
  }

  function clearMarks() {
    for (const f of friendNodes) {
      f.bubble.textContent = '';
      f.badge.textContent = '';
      f.node.classList.remove('is-want', 'is-glow');
    }
    dogBadge.textContent = '';
  }

  function setBadge(i, value, tone) {
    const badge = friendNodes[i].badge;
    badge.className = 'fsp-badge ' + tone;
    badge.textContent = value;
    AG.fx.animate(badge, 'is-pop', 350);
  }

  /** Every plate shows how many it holds. */
  function showEach() {
    friendNodes.forEach((f, i) => setBadge(i, state.plates[i], 'is-each'));
  }

  const hop = () => friendNodes.forEach((f) => AG.fx.animate(f.node, 'is-hop', 450));

  /* ---------------- counting together (the help) ---------------- */

  /** Count the snacks on one plate: 1, 2, 3. */
  async function countPlate(i = 0) {
    const ok = guard();
    clearMarks();
    const f = friendNodes[i];
    f.node.classList.add('is-glow');
    const kids = [...f.plate.children];
    for (let k = 0; k < kids.length; k++) {
      AG.fx.animate(kids[k], 'is-pop', 350);
      setBadge(i, k + 1, 'is-each');
      AG.audio.play('flip');
      await ok(P(420));
    }
    await ok(P(300));
    f.node.classList.remove('is-glow');
  }

  /** Count what is in the dog's bowl. */
  async function countDog() {
    const ok = guard();
    const kids = [...bowl.children];
    dogBadge.className = 'fsp-badge fsp-dogbadge is-left';
    for (let k = 0; k < kids.length; k++) {
      AG.fx.animate(kids[k], 'is-pop', 350);
      dogBadge.textContent = k + 1;
      AG.audio.play('flip');
      await ok(P(420));
    }
    await ok(P(300));
  }

  /** Count the friends: 1, 2, 3, 4. */
  async function countFriends() {
    const ok = guard();
    clearMarks();
    for (let i = 0; i < friendNodes.length; i++) {
      setBadge(i, i + 1, 'is-friends');
      AG.fx.animate(friendNodes[i].node, 'is-hop', 450);
      AG.audio.play('flip');
      await ok(P(420));
    }
    await ok(P(300));
  }

  /** Count by plates: each plate lights up with the running total — 3, 6, 9. */
  async function sweepPlates() {
    const ok = guard();
    clearMarks();
    let total = 0;
    for (let i = 0; i < friendNodes.length; i++) {
      total += state.plates[i];
      friendNodes[i].node.classList.add('is-glow');
      setBadge(i, total, 'is-total');
      AG.audio.play('flip');
      await ok(P(520));
    }
    await ok(P(300));
  }

  /* ---------------- the sum ---------------- */

  const op = (text) => ({ op: text });

  /** 12 ÷ 3 = 4, and with `left` given, a dog and the leftovers after it. */
  function divEq(total, by, res, { byTone = 'is-friends', resTone = 'is-each', left } = {}) {
    const parts = [
      { k: 't', v: total, tone: 'is-total' }, op('÷'),
      { k: 'by', v: by, tone: byTone }, op('='),
      { k: 'res', v: res, tone: resTone },
    ];
    if (left !== undefined) parts.push(op('🐶'), { k: 'left', v: left, tone: 'is-left' });
    return { parts };
  }

  const mulEq = (n, each, total) => ({
    parts: [
      { k: 'by', v: n, tone: 'is-friends' }, op('×'),
      { k: 'res', v: each, tone: 'is-each' }, op('='),
      { k: 't', v: total, tone: 'is-total' },
    ],
  });

  function renderEq() {
    const q = state.eq;
    if (!q) return eqNode.replaceChildren();
    eqNode.replaceChildren(...q.parts.map((part) => {
      if (part.op) return el('span', { class: 'fsp-tok fsp-op', text: part.op });
      const active = q.blank === part.k;
      const cls = `fsp-tok ${part.tone}` +
        (active ? ' fsp-blank is-active' : '') +
        (q.solved === part.k ? ' is-solved' : '');
      return el('span', { class: cls, text: active ? (state.typed || '?') : String(part.v ?? '?') });
    }));
  }

  function setEq(q) {
    state.eq = q;
    renderEq();
  }

  /* ---------------- waiting on Aisha ---------------- */

  function setPhase(phase) {
    state.phase = phase;
    page.dataset.phase = phase;
    pad.hidden = phase !== 'ask';
    goButton.hidden = phase !== 'go' && phase !== 'next';
    goButton.classList.toggle('is-next', phase === 'next');
    dogNode.classList.toggle('is-wanting', phase === 'dog');
  }

  const waiting = () => new Promise((resolve) => { state.resolve = resolve; });

  function settle(value) {
    const resolve = state.resolve;
    if (!resolve) return;
    state.resolve = null;
    resolve(value);
  }

  /** Ask for the number that fills blank `key` of the sum on screen.
      `help` runs after two wrong tries. */
  async function askNumber(expected, key, help) {
    const ok = guard();
    state.expected = expected;
    state.tries = 0;
    state.typed = '';
    setEq({ ...state.eq, blank: key, solved: null });
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
        setPhase('idle');
        await ok(help());
        setPhase('ask');
      }
    }

    AG.audio.play('match');
    const parts = state.eq.parts.map((part) => (part.k === key ? { ...part, v: expected } : part));
    setEq({ parts, blank: null, solved: key });
    state.expected = null;
    setPhase('idle');
  }

  /** Show the big button and wait for a tap on it. */
  async function waitButton(label, phase = 'go') {
    const ok = guard();
    goButton.textContent = label;
    setPhase(phase);
    await ok(waiting());
    setPhase('idle');
  }

  async function waitNext(label = 'Next ▶') {
    const ok = guard();
    await ok(waitButton(label, 'next'));
    AG.audio.play('flip');
  }

  /* ---------------- her moves ---------------- */

  // While she is sharing, a plate may never get two ahead of another, and a
  // new round may only start if there is one for everyone. So the plates are
  // always even when the sharing stops.
  function tapPlate(i) {
    if (state.phase !== 'deal' || !state.resolve || !friendNodes[i]) return;
    const low = fewest();
    for (const f of friendNodes) f.node.classList.remove('is-want');

    if (state.plates[i] > low) {
      // not fair yet — someone else is still waiting for theirs
      const j = state.plates.indexOf(low);
      state.nudges++;
      AG.audio.play('miss');
      AG.fx.animate(friendNodes[i].node, 'is-no', 400);
      friendNodes.forEach((f, k) => { f.bubble.textContent = state.plates[k] === low ? '🥺' : ''; });
      friendNodes[j].node.classList.add('is-want');
      hint(`${state.friends[j].name} has fewer! Give one to ${state.friends[j].name}.`);
      return;
    }

    give(i);
    friendNodes.forEach((f, k) => { f.bubble.textContent = ''; });
    if (allEqual()) hop();
    if (state.pile === 0 || (allEqual() && state.pile < state.plates.length)) settle();
  }

  function tapPile() {
    if (state.phase === 'deal') tapPlate(state.plates.indexOf(fewest()));
    else if (state.phase === 'go') go();
    else if (state.phase === 'dog') tapDog();
  }

  const go = () => { if (state.phase === 'go') settle(); };
  const next = () => { if (state.phase === 'next') settle(); };
  const tapDog = () => { if (state.phase === 'dog') settle(); };

  /** She gives the snacks out one at a time until they are shared. */
  async function dealOut() {
    const ok = guard();
    state.nudges = 0;
    setPhase('deal');
    await ok(waiting());
    setPhase('idle');
    clearMarks();
  }

  /** The "One each" button: a whole round at a time, while there is enough. */
  async function roundsOut() {
    const ok = guard();
    const n = state.plates.length;
    while (state.pile >= n) {
      await ok(waitButton(`One each ${state.snack.e}`));
      for (let i = 0; i < n; i++) {
        give(i);
        await ok(P(220));
      }
      hop();
      await ok(P(250));
    }
  }

  /** The leftovers: wait for a tap on the dog, then feed him. */
  async function feedDog() {
    const ok = guard();
    setPhase('dog');
    await ok(waiting());
    setPhase('idle');
    await ok(giveDog());
  }

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

  function buildPad() {
    const key = (text, cls, label, onClick) =>
      el('button', { class: 'fsp-key ' + cls, type: 'button', text, 'aria-label': label, onClick });
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => key(String(d), '', String(d), () => type(String(d))));
    keys.push(
      key('⌫', 'is-back', 'Rub out', backspace),
      key('0', '', '0', () => type('0')),
      key('✓', 'is-ok', 'Done', submit),
    );
    pad.replaceChildren(...keys);
  }

  goButton.addEventListener('click', () => (state.phase === 'next' ? next() : go()));
  pileNode.addEventListener('click', tapPile);
  dogNode.addEventListener('click', tapDog);
  speakButton.addEventListener('click', readAll);

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('.ag-overlay')) return;
    const { key } = event;
    const press = key === 'Enter' || key === ' ';
    if (state.phase === 'ask') {
      if (/^[0-9]$/.test(key)) type(key);
      else if (key === 'Enter') submit();
      else if (key === 'Backspace') backspace();
    } else if (state.phase === 'deal') {
      if (/^[1-9]$/.test(key)) tapPlate(+key - 1);
      else if (press) { event.preventDefault(); tapPile(); }
    } else if (press && ['go', 'next', 'dog'].includes(state.phase)) {
      event.preventDefault();
      if (state.phase === 'go') go();
      else if (state.phase === 'next') next();
      else tapDog();
    }
  });

  /* ---------------- the five kinds of picnic ---------------- */

  /** "How many does each friend get?" for the plates on screen. */
  async function askEach(total, n, each) {
    const ok = guard();
    await ok(askNumber(each, 'res', () => countPlate(0)));
    showEach();
    tell(`Yes! ${w(total, 'is-total', true)} shared between ${w(n, 'is-friends')} is ${w(each, 'is-each')} each.`);
  }

  const ROUNDS = {
    async share({ n, each }) {
      const ok = guard();
      const total = n * each;
      setTable({ total, n });
      setEq(divEq(total, n, null));
      tell(`${w(total, 'is-total', true)} ${snackWord(total)} for ${w(n, 'is-friends')} friends.`,
        `Tap a friend to give one ${state.snack.one}.`);
      await ok(dealOut());
      AG.audio.play('match');
      tell('All gone! Everyone has the same.', `How many ${state.snack.many} does each friend get?`);
      await ok(askEach(total, n, each));
    },

    async quick({ n, each }) {
      const ok = guard();
      const total = n * each;
      setTable({ total, n });
      setEq(divEq(total, n, null));
      tell(`${w(total, 'is-total', true)} ${snackWord(total)} for ${w(n, 'is-friends')} friends.`,
        'Tap One each to share them fast!');
      await ok(roundsOut());
      AG.audio.play('match');
      tell('All gone! Everyone has the same.', `How many ${state.snack.many} does each friend get?`);
      await ok(askEach(total, n, each));
    },

    async leftover({ n, each, rem }) {
      const ok = guard();
      const total = n * each + rem;
      setTable({ total, n, dog: true });
      setEq(divEq(total, n, null, { left: null }));
      tell(`${w(total, 'is-total', true)} ${snackWord(total)} for ${w(n, 'is-friends')} friends.`,
        'Tap One each to share them.');
      await ok(roundsOut());
      tell(`Only ${w(rem, 'is-left')} left. Not enough for everyone!`, 'Tap the dog. The dog gets the rest.');
      await ok(feedDog());
      tell('Now it is fair.', `How many ${state.snack.many} does each friend get?`);
      await ok(askNumber(each, 'res', () => countPlate(0)));
      showEach();
      hint('How many are left over for the dog?');
      await ok(askNumber(rem, 'left', countDog));
      dogBadge.className = 'fsp-badge fsp-dogbadge is-left';
      dogBadge.textContent = rem;
      tell(`${w(total, 'is-total', true)} shared between ${w(n, 'is-friends')} is ${w(each, 'is-each')} each,`,
        `and ${w(rem, 'is-left')} left over for the dog. 🐶`);
    },

    async friends({ n, each }) {
      const ok = guard();
      const total = n * each;
      const guests = shuffle(FRIENDS).slice(0, n);
      setTable({ total, n: 0, friends: [] });
      setEq(divEq(total, each, null, { byTone: 'is-each', resTone: 'is-friends' }));
      tell(`${w(total, 'is-total', true)} ${snackWord(total)}. Every friend gets ${w(each, 'is-each')}.`,
        'Tap Add a friend until they are all gone.');
      while (state.pile > 0) {
        await ok(waitButton('Add a friend ➕'));
        const i = addFriend(guests[state.plates.length]);
        AG.audio.play('flip');
        await ok(P(250));
        for (let k = 0; k < each; k++) {
          give(i);
          await ok(P(160));
        }
      }
      AG.audio.play('match');
      tell('All gone!', 'How many friends can eat?');
      await ok(askNumber(n, 'res', countFriends));
      showEach();
      tell(`Yes! ${w(total, 'is-total', true)} ${snackWord(total)}, ${w(each, 'is-each')} each, feeds ${w(n, 'is-friends')} friends.`);
    },

    async mult({ n, each }) {
      const ok = guard();
      const total = n * each;
      setTable({ total: 0, n, each });
      setEq(mulEq(n, each, null));
      tell(`${w(n, 'is-friends', true)} friends. ${w(each, 'is-each', true)} ${snackWord(each)} each.`,
        `How many ${state.snack.many} were in the basket?`);
      await ok(askNumber(total, 't', sweepPlates));
      tell(`Yes! ${w(n, 'is-friends', true)} friends with ${w(each, 'is-each')} each is ${w(total, 'is-total')}.`,
        `And ${w(total, 'is-total')} shared between ${w(n, 'is-friends')} is ${w(each, 'is-each')} each.`);
      await ok(sweepPlates());
      setEq({ ...divEq(total, n, each), solved: 'res' });
    },
  };

  /* ---------------- levels ---------------- */

  function makeRounds(L) {
    const all = [];
    for (let n = L.n[0]; n <= L.n[1]; n++) {
      for (let each = L.each[0]; each <= L.each[1]; each++) all.push({ n, each });
    }
    let pool = shuffle(all);
    return L.kinds.map((kind) => {
      if (!pool.length) pool = shuffle(all);
      // she taps once per snack in a share, so keep those small
      let at = pool.findIndex((p) => kind !== 'share' || p.n * p.each <= SHARE_MAX);
      if (at < 0) at = 0;
      const [p] = pool.splice(at, 1);
      const round = { kind, n: p.n, each: p.each };
      if (kind === 'share' && p.n * p.each > SHARE_MAX) round.each = Math.floor(SHARE_MAX / p.n);
      if (kind === 'leftover') round.rem = 1 + Math.floor(Math.random() * (p.n - 1));
      return round;
    });
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function freshPicnic() {
    clearMarks();
    setEq(null);
    setPhase('idle');
  }

  function startLevel(n) {
    run(async (ok) => {
      state.mode = 'level';
      state.level = clamp(n, 1, LEVELS.length);
      state.rounds = makeRounds(LEVELS[state.level - 1]);

      for (let i = 0; i < state.rounds.length; i++) {
        state.index = i;
        hud.textContent = `Level ${state.level} · picnic ${i + 1} of ${state.rounds.length}`;
        freshPicnic();
        await ok(ROUNDS[state.rounds[i].kind](state.rounds[i]));
        await ok(waitNext());
      }
      finish();
    });
  }

  function finish() {
    setPhase('idle');
    hush();
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();
    progress.done[state.level] = true;
    progress.unlocked = Math.min(LEVELS.length, Math.max(progress.unlocked, state.level + 1));
    saveProgress();

    const last = state.level === LEVELS.length;
    const count = state.rounds.length;
    const actions = [];
    if (!last) actions.push({ label: `Level ${state.level + 1} ▶`, variant: 'green', onClick: () => { stopConfetti(); startLevel(state.level + 1); } });
    actions.push({ label: 'More picnics 🧺', variant: last ? 'pink' : 'quiet', onClick: () => { stopConfetti(); startLevel(state.level); } });

    AG.shell.overlay({
      title: last ? 'Sharing champion! 🏆' : `Level ${state.level} done! 🎉`,
      message: `You shared ${WORDS[count]} picnics fairly.`,
      actions,
    });
  }

  /* ---------------- the lesson ---------------- */

  function startLesson() {
    run(async (ok) => {
      state.mode = 'lesson';
      const stepHud = (k) => { hud.textContent = `Lesson · ${k} of ${LESSON_STEPS}`; };
      const cookie = SNACKS[0];
      const pair = [FRIENDS[0], FRIENDS[1]];   // Bunny and Bear

      // 1 — two friends and a basket
      stepHud(1);
      freshPicnic();
      setTable({ total: 6, n: 2, snack: cookie, friends: pair });
      tell(`Bunny and Bear have ${w(6, 'is-total')} cookies to share.`);
      await ok(waitNext());

      // 2 — an unfair share
      stepHud(2);
      tell('Bear takes lots…');
      for (let k = 0; k < 5; k++) { give(1); await ok(P(260)); }
      give(0);
      await ok(P(500));
      setBubble(0, '🥺');
      setBubble(1, '😋');
      setBadge(0, 1, 'is-each');
      setBadge(1, 5, 'is-each');
      tell('Bear has five. Bunny has only one!', 'Is that fair? No!');
      await ok(waitNext('Share again ▶'));

      // 3 — one for you, one for you
      stepHud(3);
      setTable({ total: 6, n: 2, snack: cookie, friends: pair });
      tell("Let's share fairly.", 'One for you, one for you…');
      await ok(P(1400));
      for (let k = 0; k < 6; k++) { give(k % 2); await ok(P(650)); }
      hop();
      AG.audio.play('match');
      setEq({ parts: [{ k: 'res', v: null, tone: 'is-each' }] });
      tell('All gone! Now they have the same.', 'How many cookies does each friend get?');
      await ok(askNumber(3, 'res', () => countPlate(0)));
      showEach();

      // 4 — how it is written
      stepHud(4);
      setEq(divEq(6, 2, 3));
      tell(`${w(6, 'is-total', true)} shared between ${w(2, 'is-friends')} is ${w(3, 'is-each')} each.`,
        'We write it like this. The ÷ sign means “shared between”.');
      await ok(waitNext());

      // 5 — her turn to share
      stepHud(5);
      freshPicnic();
      setTable({ total: 6, n: 3, snack: SNACKS[1], friends: [FRIENDS[2], FRIENDS[3], FRIENDS[4]] });
      setEq(divEq(6, 3, null));
      tell(`Your turn! ${w(6, 'is-total', true)} strawberries for ${w(3, 'is-friends')} friends.`,
        'Tap a friend to give one strawberry.');
      await ok(dealOut());
      AG.audio.play('match');
      tell('All gone! Everyone has the same.', 'How many strawberries does each friend get?');
      await ok(askEach(6, 3, 2));
      await ok(waitNext());

      // 6 — what if it does not come out even? The dog helps.
      stepHud(6);
      freshPicnic();
      setTable({ total: 5, n: 2, dog: true, snack: SNACKS[2], friends: [FRIENDS[5], FRIENDS[6]] });
      setEq(divEq(5, 2, null, { left: null }));
      tell(`${w(5, 'is-total', true)} apples for ${w(2, 'is-friends')} friends. And here is Dog!`,
        'Tap One each to share them.');
      await ok(roundsOut());
      tell(`Only ${w(1, 'is-left')} left. Not enough for everyone!`, 'Tap the dog. The dog gets the rest.');
      await ok(feedDog());
      AG.audio.play('match');
      setEq({ ...divEq(5, 2, 2, { left: 1 }), solved: 'left' });
      showEach();
      tell(`${w(2, 'is-each', true)} each, and ${w(1, 'is-left')} left over for the dog.`, 'That is fair!');
      await ok(waitNext("Let's play! ▶"));

      progress.lesson = true;
      saveProgress();
      startLevel(state.level);
    });
  }

  /* ---------------- levels & how to play ---------------- */

  function showLevels() {
    const grid = el('div', { class: 'fsp-levels' }, LEVELS.map((L, i) => {
      const n = i + 1;
      const open = n <= progress.unlocked;
      const icons = [...new Set(L.kinds)].map((k) => KIND_ICON[k] || '').join('');
      const who = L.n[0] === L.n[1] ? `${L.n[0]}` : `${L.n[0]}–${L.n[1]}`;
      return el('button', {
        class: 'fsp-level' + (progress.done[n] ? ' is-done' : '') + (n === state.level && state.mode === 'level' ? ' is-here' : ''),
        type: 'button',
        disabled: open ? null : '',
        'aria-label': open ? `Level ${n}` : `Level ${n}, locked`,
        onClick: () => startLevel(n),
      }, [
        el('span', { class: 'fsp-level-num', text: open ? String(n) : '🔒' }),
        el('span', { class: 'fsp-level-info', text: `🐾 ${who} ${icons}` }),
      ]);
    }));
    AG.shell.overlay({ title: 'Pick a level 🧺', dismissable: true, body: grid, actions: [{ label: 'Keep playing', variant: 'quiet' }] });
  }

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🧺',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { html: 'Share the <b style="color:#e07a00">snacks</b> so every <b style="color:#1e88d2">friend</b> gets the <b style="color:#1f9d57">same</b>.' }),
        el('li', { html: 'Tap a friend to give one snack. <b>One each ⚡</b> gives everyone one.' }),
        el('li', { html: 'Not enough to go round? The rest go to the <b style="color:#a855c7">dog 🐶</b>.' }),
        el('li', { html: 'Tap the number, then <b>✓</b>. Stuck? We count together.' }),
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
    title: 'Fair Share Picnic',
    emoji: '🧺',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
      { icon: '🎓', label: 'The lesson', onClick: startLesson },
      { icon: AG.shell.icons.grid, label: 'Levels', color: 'var(--ag-orange)', onClick: showLevels },
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
  setPhase('idle');

  if (progress.lesson) {
    startLevel(state.level);
  } else {
    // The first tap also lets the browser start talking.
    setTable({ total: 6, n: 2, snack: SNACKS[0], friends: [FRIENDS[0], FRIENDS[1]] });
    AG.shell.overlay({
      title: 'Fair Share Picnic 🧺',
      message: "Let's learn how to share fairly!",
      actions: [{ label: 'Start ▶', variant: 'green', onClick: startLesson }],
    });
  }

  if (window.__AISHA_DEV || location.hash === '#dev') {
    const answer = (n) => { state.typed = String(n); submit(); };
    window.__fspProbe = {
      state: () => state,
      progress: () => progress,
      levels: LEVELS.length,
      makeRounds: (n) => makeRounds(LEVELS[n - 1]),
      startLevel,
      startLesson,
      give: tapPlate,       // tap friend i's plate (while phase is 'deal')
      pile: tapPile,        // tap the basket
      go,                   // the One each / Add a friend button
      dog: tapDog,
      answer,
      next,
      fast: (speed = 0.1) => { state.speed = speed; },
      // Do the right thing for whatever the game is waiting on; returns the phase it saw.
      step() {
        const phase = state.phase;
        if (phase === 'deal') tapPile();
        else if (phase === 'go') go();
        else if (phase === 'dog') tapDog();
        else if (phase === 'ask') answer(state.expected);
        else if (phase === 'next') next();
        return phase;
      },
    };
  }
})();
