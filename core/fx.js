/* Celebration effects shared across games. */
window.AG = window.AG || {};

AG.fx = (() => {
  const COLORS = ['#ff5c9e', '#8b5cf6', '#2fc98a', '#ffc531', '#3aa8ff', '#ff8a3d'];

  return {
    /**
     * Rain confetti over the whole window.
     * Returns a stop() function; also cleans itself up automatically.
     */
    confetti({ pieces = 140, duration = 4200 } = {}) {
      const layer = AG.util.el('div', { class: 'ag-confetti', 'aria-hidden': 'true' });

      for (let i = 0; i < pieces; i++) {
        const wide = Math.random() > 0.5;
        layer.append(AG.util.el('i', {
          style: {
            left: Math.random() * 100 + 'vw',
            width: (wide ? 15 : 10) + 'px',
            height: (wide ? 10 : 17) + 'px',
            background: AG.util.pick(COLORS),
            borderRadius: Math.random() > 0.7 ? '50%' : '2px',
            animationDuration: AG.util.randomBetween(2.6, 4.2) + 's',
            animationDelay: Math.random() * 1.4 + 's',
            '--ag-spin': Math.round(AG.util.randomBetween(-900, 900)) + 'deg',
          },
        }));
      }

      document.body.append(layer);
      const timer = setTimeout(() => layer.remove(), duration + 1600);

      return () => { clearTimeout(timer); layer.remove(); };
    },

    /**
     * Restart a CSS animation on an element by toggling a class.
     * Resolves once the animation finishes.
     */
    async animate(node, className, fallbackMs = 600) {
      node.classList.remove(className);
      void node.offsetWidth; // force reflow so the animation replays
      node.classList.add(className);
      await new Promise((resolve) => {
        const done = () => { node.removeEventListener('animationend', done); resolve(); };
        node.addEventListener('animationend', done);
        setTimeout(done, fallbackMs);
      });
    },
  };
})();
