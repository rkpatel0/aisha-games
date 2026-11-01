/* Tiny localStorage wrapper. Safe to call from file:// where storage may throw. */
window.AG = window.AG || {};

AG.store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem('aisha-games:' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem('aisha-games:' + key, JSON.stringify(value));
    } catch {
      /* private mode / file:// restrictions — the game still plays fine. */
    }
  },
};
