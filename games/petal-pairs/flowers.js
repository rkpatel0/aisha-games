/* ------------------------------------------------------------------
   The eight flower faces for Petal Pairs.
   Hand-drawn SVG, bright marker colours, each one a different SHAPE as
   well as a different colour so they are easy to tell apart.
------------------------------------------------------------------ */

const PetalPairsFlowers = (() => {
  /** Repeat a petal shape evenly around the middle of the card. */
  const ring = (count, petal, { from = 0 } = {}) =>
    Array.from({ length: count }, (_, i) =>
      `<g transform="rotate(${from + (i * 360) / count} 50 50)">${petal}</g>`
    ).join('');

  const stem = (d, leaves = '') =>
    `<path d="${d}" stroke="#3fae5a" stroke-width="6" stroke-linecap="round" fill="none"/>${leaves}`;

  const leaf = (x, y, rotate, flip = 1) =>
    `<path d="M${x} ${y} c ${10 * flip} -10 ${22 * flip} -8 ${26 * flip} 2
              c ${-12 * flip} 8 ${-22 * flip} 6 ${-26 * flip} -2 Z"
           fill="#4cc46a" transform="rotate(${rotate} ${x} ${y})"/>`;

  const art = (inner) =>
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  const flowers = [
    {
      id: 'rose',
      name: 'Rose',
      svg: art(`
        ${stem('M50 96 L50 60', leaf(50, 76, 0, -1))}
        ${ring(7, '<ellipse cx="50" cy="27" rx="15" ry="16" fill="#ff7d9c"/>')}
        <circle cx="50" cy="46" r="24" fill="#ef3b6b"/>
        <path d="M64 46 A14 14 0 1 1 50 32 A10 10 0 1 1 60 42 A6 6 0 1 1 54 46"
              fill="none" stroke="#ffd3e0" stroke-width="4.5" stroke-linecap="round"/>
      `),
    },
    {
      id: 'sunflower',
      name: 'Sunflower',
      svg: art(`
        ${stem('M50 98 L50 66', leaf(50, 82, 0, 1))}
        ${ring(16, '<ellipse cx="50" cy="17" rx="6.5" ry="15" fill="#ffc531" stroke="#f0a01c" stroke-width="2"/>')}
        <circle cx="50" cy="47" r="19" fill="#8a5a2b"/>
        <circle cx="50" cy="47" r="12" fill="#6d4420"/>
        ${ring(6, '<circle cx="50" cy="40" r="2.4" fill="#c98a44"/>')}
      `),
    },
    {
      id: 'daisy',
      name: 'Daisy',
      svg: art(`
        ${stem('M50 98 L50 66', leaf(50, 84, 10, -1))}
        ${ring(11, '<ellipse cx="50" cy="19" rx="6" ry="17" fill="#ffffff" stroke="#e4dcf0" stroke-width="2.4"/>')}
        <circle cx="50" cy="47" r="14" fill="#ffd23f"/>
        <circle cx="50" cy="47" r="8" fill="#ffb300"/>
      `),
    },
    {
      id: 'tulip',
      name: 'Tulip',
      svg: art(`
        ${stem('M50 98 L50 56', leaf(48, 82, -12, -1) + leaf(52, 74, 12, 1))}
        <path d="M27 26 Q27 70 50 88 Q73 70 73 26 Q62 46 50 30 Q38 46 27 26 Z" fill="#ff4d4d"/>
        <path d="M50 30 Q58 50 50 88 Q42 50 50 30 Z" fill="#ff7a6b"/>
        <path d="M27 26 Q31 44 40 54" fill="none" stroke="#e03a3a" stroke-width="3" stroke-linecap="round"/>
      `),
    },
    {
      id: 'lily',
      name: 'Lily',
      svg: art(`
        ${stem('M50 98 L50 72')}
        ${ring(6, `<g><path d="M50 54 C 32 36 36 14 50 2 C 64 14 68 36 50 54 Z"
                            fill="#ff9a3d" stroke="#ea6a12" stroke-width="2.6"/>
                     <path d="M50 46 C 44 34 45 20 50 12" fill="none"
                           stroke="#ea6a12" stroke-width="2" stroke-linecap="round"/>
                     <circle cx="44" cy="28" r="2.3" fill="#9a3412"/>
                     <circle cx="56" cy="24" r="2.3" fill="#9a3412"/></g>`)}
        <circle cx="50" cy="50" r="11" fill="#ffd23f"/>
        <circle cx="50" cy="50" r="5" fill="#c2410c"/>
      `),
    },
    {
      id: 'orchid',
      name: 'Orchid',
      svg: art(`
        ${stem('M50 99 L50 86')}
        <ellipse cx="50" cy="22" rx="12" ry="18" fill="#a855f7"/>
        <ellipse cx="24" cy="34" rx="10" ry="17" fill="#a855f7" transform="rotate(-42 24 34)"/>
        <ellipse cx="76" cy="34" rx="10" ry="17" fill="#a855f7" transform="rotate(42 76 34)"/>
        <ellipse cx="21" cy="58" rx="19" ry="12" fill="#c084fc" transform="rotate(-10 21 58)"/>
        <ellipse cx="79" cy="58" rx="19" ry="12" fill="#c084fc" transform="rotate(10 79 58)"/>
        <path d="M50 48 C 67 48 73 68 62 82 C 56 89 44 89 38 82 C 27 68 33 48 50 48 Z" fill="#ec4899"/>
        <path d="M50 74 C 44 80 42 84 43 88" fill="none" stroke="#be185d" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M50 74 C 56 80 58 84 57 88" fill="none" stroke="#be185d" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="50" cy="58" r="10" fill="#ffd23f"/>
        <circle cx="50" cy="58" r="4.5" fill="#f59e0b"/>
      `),
    },
    {
      id: 'lavender',
      name: 'Lavender',
      svg: art(`
        ${stem('M50 98 C 47 76 50 56 50 34', leaf(44, 80, -20, -1) + leaf(56, 72, 20, 1))}
        ${[
          [50, 10, 7], [40, 22, 7.5], [60, 24, 7.5], [42, 36, 8],
          [58, 38, 8], [44, 50, 8], [56, 52, 8], [47, 64, 7.5],
        ].map(([cx, cy, r]) =>
          `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.25}" fill="#8b5cf6"/>
           <ellipse cx="${cx - 1.5}" cy="${cy - 2}" rx="${r * 0.42}" ry="${r * 0.5}" fill="#c4b5fd"/>`
        ).join('')}
      `),
    },
    {
      id: 'blossom',
      name: 'Cherry Blossom',
      svg: art(`
        <path d="M12 96 C 26 70 34 62 46 54" stroke="#a1662f" stroke-width="7"
              stroke-linecap="round" fill="none"/>
        ${ring(5, `<path d="M50 50 C 34 44 27 24 36 13 C 42 6 47 11 50 18
                            C 53 11 58 6 64 13 C 73 24 66 44 50 50 Z"
                         fill="#ffb7d5" stroke="#ff85b3" stroke-width="2.4"/>`)}
        <circle cx="50" cy="50" r="9" fill="#fff0f6"/>
        ${ring(7, '<circle cx="50" cy="38" r="2.6" fill="#f9a8d4"/>')}
        <circle cx="50" cy="50" r="4" fill="#ffd23f"/>
      `),
    },
  ];

  return flowers;
})();
