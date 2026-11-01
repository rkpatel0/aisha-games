/* ------------------------------------------------------------------
   ABC Caterpillar 🐛 — background music.
   A bouncy 8-bar chiptune loop made with WebAudio: no files to load, so it
   works from file://. Kept quiet and softened with a low-pass filter.
   Plays only while the music toggle is on AND the header mute is off.
------------------------------------------------------------------ */

const CaterpillarMusic = (() => {
  const BPM = 116;
  const STEP = 60 / BPM / 4;          // one 16th note, in seconds
  const LOOKAHEAD = 0.25;             // schedule this far ahead
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // C – Am – F – G, twice. [root for the bass, chord notes for the stabs]
  const CHORDS = [
    [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]],
  ];

  // [step, note, length in steps] per bar. Bars 1–4 are the tune, 5–8 answer it.
  const MELODY = [
    [[0, 76, 2], [2, 79, 2], [4, 84, 3], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
    [[0, 76, 2], [2, 77, 2], [4, 76, 2], [6, 72, 2], [8, 69, 4], [12, 72, 4]],
    [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 4], [12, 77, 2], [14, 76, 2]],
    [[0, 74, 2], [2, 79, 2], [4, 83, 2], [6, 79, 2], [8, 74, 6], [14, 71, 2]],
    [[0, 84, 2], [2, 83, 2], [4, 84, 2], [6, 79, 2], [8, 76, 2], [10, 79, 2], [12, 84, 4]],
    [[0, 81, 3], [3, 79, 1], [4, 76, 2], [6, 79, 2], [8, 81, 4], [12, 84, 4]],
    [[0, 81, 2], [2, 79, 2], [4, 77, 2], [6, 76, 2], [8, 77, 2], [10, 81, 2], [12, 79, 4]],
    [[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2], [8, 72, 8]],
  ];

  let on = AG.store.get('abc-caterpillar-music', true);
  let ctx = null, master = null, noise = null;
  let timer = null, nextTime = 0, step = 0;

  function setup() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 3200;
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(soften).connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function tone(freq, at, dur, gain, type) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(amp).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function hat(at, gain) {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    src.buffer = noise;
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    src.connect(hp).connect(amp).connect(master);
    src.start(at);
  }

  function playStep(s, at) {
    const bar = Math.floor(s / 16) % 8;
    const beat = s % 16;
    const [root, chord] = CHORDS[bar % 4];

    // Bass bounces root – fifth – octave – fifth.
    const bass = { 0: root, 4: root + 7, 8: root + 12, 12: root + 7 }[beat];
    if (bass !== undefined) tone(midi(bass), at, STEP * 3, 0.32, 'triangle');

    // Off-beat chord stabs give it the bounce.
    if (beat % 4 === 2) chord.forEach((n) => tone(midi(n), at, STEP * 1.2, 0.05, 'square'));

    // Soft hi-hat on every 8th, a little louder on the off-beats.
    if (beat % 2 === 0) hat(at, beat % 4 === 2 ? 0.05 : 0.025);

    for (const [when, note, len] of MELODY[bar]) {
      if (when === beat) tone(midi(note), at, STEP * len * 0.9, 0.09, 'square');
    }
  }

  function tick() {
    // Follow the header's mute button without needing a hook into it.
    const audible = on && !AG.audio.muted;
    master.gain.setTargetAtTime(audible ? 0.5 : 0.0001, ctx.currentTime, 0.08);

    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (audible) playStep(step, nextTime);
      step = (step + 1) % (16 * 8);
      nextTime += STEP;
    }
  }

  function start() {
    if (!on || timer) return;
    try {
      setup();
      if (ctx.state === 'suspended') ctx.resume();
      step = 0;
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(tick, 60);
    } catch { /* no audio — play on in silence */ }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
  }

  return {
    get on() { return on; },
    get playing() { return timer !== null; },
    start,
    toggle() {
      on = !on;
      AG.store.set('abc-caterpillar-music', on);
      if (on) start(); else stop();
      return on;
    },
  };
})();
