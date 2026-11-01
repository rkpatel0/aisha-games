/* The game library. Add one entry per game folder — the home page reads this.
   `dir` must name index.html explicitly: opened from file:// (or inside the Mac
   app) there is no server to turn a directory URL into its index page. */
window.AG = window.AG || {};

AG.games = [
  {
    id: 'petal-pairs',
    title: 'Petal Pairs',
    emoji: '🌸',
    dir: 'games/petal-pairs/index.html',
    blurb: 'Flip the cards and find the matching flowers.',
    players: '2 players',
    accent: '#ff5c9e',
  },
  {
    id: 'amaze',
    title: 'Amaze!',
    emoji: '🌟',
    dir: 'games/amaze/index.html',
    blurb: 'Escape the maze and collect the stars.',
    players: '1 player',
    accent: '#3aa8ff',
  },
  {
    id: 'robot-steps',
    title: 'Robot Steps',
    emoji: '🤖',
    dir: 'games/robot-steps/index.html',
    blurb: 'Program the robot with picture blocks.',
    players: '1 player',
    accent: '#2fc98a',
  },
  {
    id: 'abc-caterpillar',
    title: 'ABC Caterpillar',
    emoji: '🐛',
    dir: 'games/abc-caterpillar/index.html',
    blurb: 'Crawl through the letters A, B, C… and fill every square.',
    players: '1 player',
    accent: '#7ac943',
  },
];
