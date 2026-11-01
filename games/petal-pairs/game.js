/* ------------------------------------------------------------------
   Petal Pairs — a 2-player memory match game.
   Rules live in spec.md (written by Aisha, age 5).
------------------------------------------------------------------ */

(() => {
  const { el, shuffle, delay } = AG.util;

  const PAIRS = 8;
  const PEEK_MS = 1800; // how long a wrong pair stays visible — long enough for a 5yo

  const PLAYERS = [
    { name: 'Player 1', color: 'var(--ag-pink)' },
    { name: 'Player 2', color: 'var(--ag-blue)' },
  ];

  const page = document.querySelector('.pp-page');
  const turnBanner = document.querySelector('.pp-turn');
  const board = document.querySelector('.pp-board');
  const scoreNodes = [...document.querySelectorAll('.pp-player')];

  const state = {
    cards: [],      // { flower, node, isFaceUp, isMatched }
    picked: [],
    scores: [0, 0],
    turn: 0,
    matched: 0,
    locked: true,
  };

  /* ---------------- rendering ---------------- */

  function makeCard(flower, index) {
    const cover = el('div', { class: 'pp-face pp-face--cover' });

    const face = el('div', { class: 'pp-face pp-face--flower', html: flower.svg });
    face.append(el('div', { class: 'pp-flower-name', text: flower.name }));

    const inner = el('div', { class: 'pp-card-inner' }, [cover, face]);
    const node = el('button', {
      class: 'pp-card',
      type: 'button',
      'aria-label': `Card ${index + 1}, face down`,
    }, [inner]);

    const card = { flower, node, isFaceUp: false, isMatched: false, index };
    node.addEventListener('click', () => onPick(card));
    return card;
  }

  function newGame() {
    const deck = shuffle(
      PetalPairsFlowers.flatMap((flower) => [flower, flower])
    );

    board.replaceChildren();
    state.cards = deck.map((flower, index) => {
      const card = makeCard(flower, index);
      board.append(card.node);
      return card;
    });

    state.picked = [];
    state.scores = [0, 0];
    state.matched = 0;
    state.turn = 0;
    state.locked = false;

    paintScores();
    announceTurn();
  }

  function paintScores() {
    scoreNodes.forEach((node, i) => {
      node.classList.toggle('is-active', i === state.turn);
      node.querySelector('.pp-player-score').textContent = state.scores[i];
      const pairs = state.scores[i];
      node.querySelector('.pp-player-sub').textContent =
        pairs === 1 ? '1 pair' : `${pairs} pairs`;
    });
  }

  function say(html, { bump = false } = {}) {
    turnBanner.innerHTML = html;
    turnBanner.style.setProperty('--pp-turn-color', PLAYERS[state.turn].color);
    if (bump) AG.fx.animate(turnBanner, 'is-bumped', 500);
  }

  function announceTurn() {
    say(`<span class="pp-hl">${PLAYERS[state.turn].name}</span>'s turn!`);
  }

  /* ---------------- gameplay ---------------- */

  function faceUp(card, isUp) {
    card.isFaceUp = isUp;
    card.node.classList.toggle('is-face-up', isUp);
    card.node.setAttribute(
      'aria-label',
      isUp ? `Card ${card.index + 1}, ${card.flower.name}` : `Card ${card.index + 1}, face down`
    );
  }

  function onPick(card) {
    if (state.locked || card.isFaceUp || card.isMatched) return;

    faceUp(card, true);
    AG.audio.play('flip');
    state.picked.push(card);

    if (state.picked.length === 2) resolvePick();
  }

  async function resolvePick() {
    state.locked = true;
    const [first, second] = state.picked;
    state.picked = [];

    if (first.flower.id === second.flower.id) {
      await handleMatch(first, second);
    } else {
      await handleMiss(first, second);
    }

    state.locked = false;
  }

  async function handleMatch(first, second) {
    AG.audio.play('match');
    say('Match! 🎉', { bump: true });

    // The wiggle — the effect Aisha asked for by name.
    await Promise.all([first, second].map((card) => AG.fx.animate(card.node, 'is-wiggling', 900)));

    for (const card of [first, second]) {
      card.isMatched = true;
      card.node.classList.add('is-settling', 'is-matched');
      card.node.disabled = true;
    }

    state.scores[state.turn] += 1;
    state.matched += 1;
    paintScores();

    if (state.matched === PAIRS) {
      await delay(450);
      finish();
      return;
    }

    say(`<span class="pp-hl">${PLAYERS[state.turn].name}</span> goes again!`, { bump: true });
  }

  async function handleMiss(first, second) {
    AG.audio.play('miss');
    say('Not a pair — remember where they are!');

    await delay(PEEK_MS);
    faceUp(first, false);
    faceUp(second, false);

    state.turn = 1 - state.turn;
    paintScores();
    await delay(180);
    announceTurn();
  }

  function finish() {
    const [p1, p2] = state.scores;
    const tie = p1 === p2;
    const winner = p1 > p2 ? 0 : 1;

    say(tie ? "It's a tie! 🌷" : `<span class="pp-hl">${PLAYERS[winner].name}</span> wins! 🏆`);
    if (!tie) turnBanner.style.setProperty('--pp-turn-color', PLAYERS[winner].color);

    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();

    AG.shell.overlay({
      title: tie ? "It's a tie! 🌷" : 'You win! 🏆',
      message: tie
        ? 'Four pairs each — brilliant remembering, both of you!'
        : `${PLAYERS[winner].name} found the most pairs!`,
      body: el('div', {}, [
        el('div', { class: 'pp-win-trophy', text: tie ? '🌸🌸' : '🌟' }),
        el('div', { class: 'pp-final' }, [
          el('span', { text: `Player 1: ${p1}` }),
          el('span', { text: `Player 2: ${p2}` }),
        ]),
      ]),
      actions: [
        { label: 'Play again 🌸', variant: 'pink', onClick: () => { stopConfetti(); newGame(); } },
      ],
    });
  }

  /* ---------------- how to play ---------------- */

  function showRules() {
    AG.shell.overlay({
      title: 'How to play 🌸',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'Take turns flipping two cards.' }),
        el('li', { text: 'If they match, keep them and go again!' }),
        el('li', { text: "If they don't match, they flip back — remember where they were!" }),
        el('li', { text: 'Whoever finds the most pairs wins 🌷' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: 'Petal Pairs',
    emoji: '🌸',
    home: '../../index.html',
    buttons: [
      {
        icon: AG.shell.icons.help,
        label: 'How to play',
        color: 'var(--ag-purple)',
        onClick: showRules,
      },
      {
        icon: AG.shell.icons.restart,
        label: 'New game',
        color: 'var(--ag-green)',
        onClick: () => {
          document.querySelector('.ag-overlay')?.remove();
          document.querySelector('.ag-confetti')?.remove();
          newGame();
        },
      },
    ],
  });

  page.prepend(headerNode);
  newGame();
})();
