/* Gentle WebAudio sound effects. No files to load, nothing harsh for little ears. */
window.AG = window.AG || {};

AG.audio = (() => {
  let ctx = null;
  let muted = AG.store.get('muted', false);

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Browsers start the context suspended until a user gesture.
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** One soft note. `at` is an offset in seconds from now. */
  function note(freq, { at = 0, dur = 0.18, gain = 0.14, type = 'sine' } = {}) {
    const audio = context();
    const start = audio.currentTime + at;
    const osc = audio.createOscillator();
    const amp = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    // Quick fade in / slow fade out so notes never click or startle.
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(amp).connect(audio.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  const sounds = {
    flip: () => note(520, { dur: 0.09, gain: 0.07, type: 'triangle' }),
    match: () => {
      note(659, { dur: 0.22, gain: 0.13 });          // E5
      note(880, { at: 0.11, dur: 0.3, gain: 0.13 }); // A5
    },
    miss: () => note(300, { dur: 0.22, gain: 0.07, type: 'triangle' }),
    win: () => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        note(freq, { at: i * 0.13, dur: 0.36, gain: 0.14 });
      });
    },
  };

  return {
    get muted() { return muted; },

    play(name) {
      if (muted || !sounds[name]) return;
      try { sounds[name](); } catch { /* audio unavailable — play on in silence */ }
    },

    setMuted(value) {
      muted = value;
      AG.store.set('muted', muted);
      return muted;
    },

    toggleMuted() { return this.setMuted(!muted); },
  };
})();
