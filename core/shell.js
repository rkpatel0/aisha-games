/* Page chrome shared by every game: header bar and modal panels. */
window.AG = window.AG || {};

AG.shell = (() => {
  const { el } = AG.util;

  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const ICONS = {
    back: svg('<path d="M14.5 5 8 12l6.5 7"/>'),
    help: svg('<circle cx="12" cy="12" r="9.2" stroke-width="2.2"/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.2 2.8v1.4"/><circle cx="12.5" cy="17" r="1.15" fill="currentColor" stroke="none"/>'),
    restart: svg('<path d="M20 5.5v5h-5"/><path d="M19.4 10.6A8 8 0 1 0 20 14.6"/>'),
    grid: svg('<rect x="3.6" y="3.6" width="7" height="7" rx="2"/><rect x="13.4" y="3.6" width="7" height="7" rx="2"/><rect x="3.6" y="13.4" width="7" height="7" rx="2"/><rect x="13.4" y="13.4" width="7" height="7" rx="2"/>'),
    sound: svg('<path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4z" fill="currentColor" stroke-linejoin="round"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.4a8 8 0 0 1 0 11.2"/>'),
    mute: svg('<path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4z" fill="currentColor" stroke-linejoin="round"/><path d="M16.2 9.8l5 4.4M21.2 9.8l-5 4.4"/>'),
  };

  /** An icon button. `icon` may be an emoji, a plain glyph, or an SVG string. */
  const iconButton = ({ icon, label, color, onClick, tag = 'button', href = null }) => {
    const props = {
      class: 'ag-icon-btn',
      title: label,
      'aria-label': label,
      [icon.trim().startsWith('<') ? 'html' : 'text']: icon,
    };
    if (color) props.style = { color };
    if (tag === 'a') props.href = href;
    else { props.type = 'button'; props.onClick = onClick; }
    return el(tag, props);
  };

  return {
    icons: ICONS,
    /**
     * Build the standard header.
     *   AG.shell.header({ mount, title:'Petal Pairs', emoji:'🌸',
     *                     home:'../../index.html',
     *                     buttons:[{ icon:'❓', label:'How to play', onClick }] })
     * Returns { node, titleNode }.
     */
    header({ mount, title, emoji = '', home = null, buttons = [] }) {
      const kids = [];

      if (home) {
        kids.push(iconButton({
          tag: 'a',
          href: home,
          icon: ICONS.back,
          label: 'Back to all games',
          color: 'var(--ag-purple)',
        }));
      }

      const titleNode = el('h1', { class: 'ag-title' }, [
        emoji ? el('span', { text: emoji, 'aria-hidden': 'true' }) : null,
        el('span', { text: title }),
      ]);
      kids.push(titleNode, el('div', { class: 'ag-header-spacer' }));

      for (const button of buttons) kids.push(iconButton(button));

      kids.push(this.muteButton());

      const node = el('header', { class: 'ag-header' }, kids);
      (mount || document.body).append(node);
      return { node, titleNode };
    },

    /** Speaker button that reflects and toggles AG.audio's mute state. */
    muteButton() {
      const paint = (button) => {
        button.innerHTML = AG.audio.muted ? ICONS.mute : ICONS.sound;
        button.style.color = AG.audio.muted ? 'var(--ag-ink-soft)' : 'var(--ag-blue)';
        button.setAttribute('aria-label', AG.audio.muted ? 'Turn sound on' : 'Turn sound off');
        button.setAttribute('aria-pressed', String(AG.audio.muted));
      };

      const button = el('button', {
        class: 'ag-icon-btn',
        type: 'button',
        title: 'Sound on / off',
        onClick: () => {
          AG.audio.toggleMuted();
          paint(button);
          AG.audio.play('flip');
        },
      });

      paint(button);
      return button;
    },

    /**
     * Show a modal panel.
     *   AG.shell.overlay({ title:'You win!', message:'...',
     *                      actions:[{ label:'Play again', onClick, variant:'pink' }] })
     * Returns { close }.
     */
    overlay({ title, message = '', body = null, actions = [], dismissable = false }) {
      const panel = el('div', { class: 'ag-panel', role: 'dialog', 'aria-modal': 'true' }, [
        el('h2', { text: title }),
        message ? el('p', { text: message }) : null,
        body,
      ]);

      const layer = el('div', { class: 'ag-overlay' }, [panel]);
      const close = () => { layer.remove(); document.removeEventListener('keydown', onKey); };

      const onKey = (event) => { if (event.key === 'Escape' && dismissable) close(); };

      if (actions.length) {
        panel.append(el('div', { class: 'ag-panel-actions' }, actions.map((action) =>
          el('button', {
            class: 'ag-btn' + (action.variant ? ' ag-btn--' + action.variant : ''),
            type: 'button',
            text: action.label,
            onClick: () => {
              if (action.keepOpen !== true) close();
              action.onClick?.();
            },
          })
        )));
      }

      if (dismissable) {
        layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
        document.addEventListener('keydown', onKey);
      }

      document.body.append(layer);
      panel.querySelector('.ag-btn')?.focus();
      return { close };
    },
  };
})();
