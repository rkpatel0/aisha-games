/* ------------------------------------------------------------------
   {{TITLE}} {{EMOJI}}
   Rules live in spec.md. Replace the placeholder round below with the
   real gameplay — the scaffolding around it is already wired up.
------------------------------------------------------------------ */

(() => {
  const { el } = AG.util;

  const page = document.querySelector('.{{PREFIX}}-page');
  const banner = document.querySelector('.{{PREFIX}}-banner');
  const stage = document.querySelector('.{{PREFIX}}-stage');

  const state = {
    score: 0,
    locked: false,
  };

  /* ---------------- helpers ---------------- */

  function say(html, { bump = false } = {}) {
    banner.innerHTML = html;
    if (bump) AG.fx.animate(banner, 'is-bumped', 500);
  }

  /* ---------------- gameplay (REPLACE ME) ---------------- */

  const TARGET = 3;

  function newGame() {
    state.score = 0;
    state.locked = false;
    stage.replaceChildren(
      el('button', {
        class: 'ag-btn',
        type: 'button',
        text: 'Tap me! {{EMOJI}}',
        onClick: score,
      })
    );
    say('Tap the button <span class="{{PREFIX}}-hl">' + TARGET + '</span> times!');
  }

  function score() {
    if (state.locked) return;
    state.score += 1;
    AG.audio.play('match');
    say('<span class="{{PREFIX}}-hl">' + state.score + '</span> / ' + TARGET, { bump: true });
    if (state.score >= TARGET) finish();
  }

  /* ---------------- finishing ---------------- */

  function finish() {
    state.locked = true;
    AG.audio.play('win');
    const stopConfetti = AG.fx.confetti();

    AG.shell.overlay({
      title: 'You win! 🏆',
      message: 'Nice one!',
      actions: [
        { label: 'Play again {{EMOJI}}', variant: 'pink', onClick: () => { stopConfetti(); newGame(); } },
      ],
    });
  }

  /* ---------------- how to play ---------------- */

  function showRules() {
    AG.shell.overlay({
      title: 'How to play {{EMOJI}}',
      dismissable: true,
      body: el('ol', { class: 'ag-rules' }, [
        el('li', { text: 'TODO: rule one.' }),
        el('li', { text: 'TODO: rule two.' }),
      ]),
      actions: [{ label: "Let's play!", variant: 'green' }],
    });
  }

  /* ---------------- boot ---------------- */

  const { node: headerNode } = AG.shell.header({
    mount: page,
    title: '{{TITLE}}',
    emoji: '{{EMOJI}}',
    home: '../../index.html',
    buttons: [
      { icon: AG.shell.icons.help, label: 'How to play', color: 'var(--ag-purple)', onClick: showRules },
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
