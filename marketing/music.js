// Original background music for the hero film and its short cuts, synthesised
// from code, so there are no third-party rights in it and it can be used in ads
// freely.
//
//   cd marketing && npm run music        # hero/audio/music.wav + music-<cut>.wav
//   npm run music -- 15s-problem         # only this film (names: src/films.js)
//
// Warm lo-fi/ambient in D major, timed to the cut in hero/shots.json:
//   until the first app shot (16 s)  the problem: soft pad in B minor, plucks
//   from there, in whole bars         the app appears: major, arpeggio, bass,
//                                     soft drums; every 4 s cut lands on a kick
//   a short breath, then exactly on   end card: one open D major chord rings out
//   the cut to the end card
// The groove runs at 90 bpm from the first app shot; the intro bars stretch
// so that shot starts on a bar. In the short cuts a groove that does not fill
// its last bar is cut off by the final chord (from a fifth of a bar on).
const path = require('path');
const fs = require('fs');
const { HERO, selected } = require('./src/films');

const SR = 44100;
const BAR = (4 * 60) / 90;
const BEAT = BAR / 4;
const BPM = 90;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Chords: [bass, ...pad voices] as MIDI notes
const C = {
  Bm7: [35, 59, 62, 66, 69],
  Gmaj7: [31, 55, 59, 62, 66],
  Em7: [28, 55, 59, 62, 64],
  Asus: [33, 57, 62, 64, 69],
  D: [38, 57, 62, 66, 69],
  AC: [37, 57, 61, 64, 69],
  A: [33, 57, 61, 64, 69],
  Gadd9: [31, 55, 59, 62, 69],
  Dmaj9: [38, 50, 57, 66, 73, 76],
};
const INTRO_CHORDS = ['Bm7', 'Gmaj7', 'Bm7', 'Gmaj7', 'Em7', 'Asus'];
const GROOVE_CHORDS = ['D', 'AC', 'Bm7', 'Gmaj7', 'D', 'A', 'Gadd9'];

function render(film) {
  const OUT = path.join(HERO, 'audio', `${film.music}.wav`);

  // Cut points from the shot list
  const lift = film.shots.find((s) => s.source === 'app') || film.shots[Math.floor(film.shots.length / 3)];
  const LIFT_AT = film.starts[lift.id];
  const END_CARD_AT = film.starts.end;
  const SECONDS = film.total;
  const N = Math.round(SR * SECONDS);

  // Deterministic "random" so every build sounds the same
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;

  const introBars = LIFT_AT > 0 ? Math.max(1, Math.round(LIFT_AT / BAR)) : 0;
  const INTRO_BAR = introBars ? LIFT_AT / introBars : BAR;
  const INTRO_BEAT = INTRO_BAR / 4;
  const grooveSpan = (END_CARD_AT - LIFT_AT) / BAR;
  const grooveBars = grooveSpan - Math.floor(grooveSpan + 0.01) >= 0.2 ? Math.ceil(grooveSpan) : Math.floor(grooveSpan + 0.01);
  // The intro ends on the suspended A that leads into the lift
  const INTRO = Array.from({ length: introBars }, (_, i) => (i === introBars - 1 ? 'Asus' : INTRO_CHORDS[i % (INTRO_CHORDS.length - 1)]));
  const GROOVE = Array.from({ length: grooveBars }, (_, i) => GROOVE_CHORDS[i % GROOVE_CHORDS.length]);
  const bars = [...INTRO, ...GROOVE, 'Dmaj9'];
  const GROOVE_START = LIFT_AT;
  // Groove bar b starts at b * BAR, shifted so the groove starts at the lift
  const GRID_SHIFT = GROOVE_START - INTRO.length * BAR;
  // The final chord hits the cut to the end card, not the bar grid
  const OUTRO_START = END_CARD_AT;
  // Groove notes from the final chord on are left out
  const beforeOutro = (time) => time < OUTRO_START - 0.02;

  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const sendL = new Float32Array(N); // reverb send
  const sendR = new Float32Array(N);

  function add(buf, i, v) {
    if (i >= 0 && i < N) buf[i] += v;
  }

  /** Soft pad: a few harmonics, two detuned voices panned apart, slow envelope. */
  function pad(notes, start, dur, gain) {
    const a = 0.9;
    const r = 1.6;
    const s0 = Math.floor(start * SR);
    const len = Math.floor((dur + r) * SR);
    for (const m of notes) {
      for (const [detune, pan] of [[-7, 0.25], [7, 0.75]]) {
        const f = midi(m) * 2 ** (detune / 1200);
        const ph = (rand() + 1) * 3.14;
        for (let k = 0; k < len; k++) {
          const t = k / SR;
          const env = Math.min(1, t / a) * (t > dur ? Math.max(0, 1 - (t - dur) / r) : 1);
          if (!env) continue;
          const w = 2 * Math.PI * f * t + ph;
          const v = (Math.sin(w) + 0.35 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w) + 0.05 * Math.sin(4 * w)) * env * gain;
          add(L, s0 + k, v * (1 - pan));
          add(R, s0 + k, v * pan);
          add(sendL, s0 + k, v * 0.3 * (1 - pan));
          add(sendR, s0 + k, v * 0.3 * pan);
        }
      }
    }
  }

  /** Plucked string (Karplus-Strong), with a ping-pong echo. */
  function pluck(m, start, gain, pan = 0.5, decay = 0.996, echo = true) {
    const f = midi(m);
    const period = Math.round(SR / f);
    const buf = new Float32Array(period).map(() => rand() * 0.5);
    // Soften the attack
    for (let i = 1; i < period; i++) buf[i] = 0.5 * (buf[i] + buf[i - 1]);
    const s0 = Math.floor(start * SR);
    const len = Math.floor(2.5 * SR);
    const out = new Float32Array(len);
    let idx = 0;
    for (let k = 0; k < len; k++) {
      const next = (idx + 1) % period;
      const v = buf[idx];
      buf[idx] = decay * 0.5 * (buf[idx] + buf[next]);
      idx = next;
      out[k] = v * gain * Math.min(1, k / 40);
    }
    const taps = echo ? [[0, 1, pan], [0.5, 0.33, 0.15], [1.0, 0.12, 0.85]] : [[0, 1, pan]];
    for (const [delay, g, p] of taps) {
      const d = Math.floor(delay * SR);
      for (let k = 0; k < len; k++) {
        const v = out[k] * g;
        add(L, s0 + d + k, v * (1 - p));
        add(R, s0 + d + k, v * p);
        add(sendL, s0 + d + k, v * 0.35);
        add(sendR, s0 + d + k, v * 0.35);
      }
    }
  }

  /** Round sub bass for one bar. */
  function bass(m, start, dur, gain) {
    const f = midi(m);
    const s0 = Math.floor(start * SR);
    const len = Math.floor(dur * SR);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const env = Math.min(1, t / 0.02) * Math.exp(-t * 0.9) * Math.min(1, (dur - t) / 0.1);
      const v = (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t)) * env * gain;
      add(L, s0 + k, v);
      add(R, s0 + k, v);
    }
  }

  function kick(start, gain) {
    const s0 = Math.floor(start * SR);
    let phase = 0;
    for (let k = 0; k < 0.45 * SR; k++) {
      const t = k / SR;
      phase += (2 * Math.PI * (44 + 80 * Math.exp(-t * 32))) / SR;
      const v = Math.sin(phase) * Math.exp(-t * 8) * gain;
      add(L, s0 + k, v);
      add(R, s0 + k, v);
    }
  }

  function noiseHit(start, gain, { decay, bright, pan = 0.5, send = 0 }) {
    const s0 = Math.floor(start * SR);
    let lp = 0;
    for (let k = 0; k < 0.3 * SR; k++) {
      const t = k / SR;
      const n = rand();
      lp += bright * (n - lp);
      const v = (bright > 0.5 ? n - lp : lp) * Math.exp(-t * decay) * gain;
      add(L, s0 + k, v * (1 - pan));
      add(R, s0 + k, v * pan);
      add(sendL, s0 + k, v * send);
      add(sendR, s0 + k, v * send);
    }
  }

  // --- Arrangement -------------------------------------------------------------

  bars.forEach((name, b) => {
    const outroBar = b === bars.length - 1;
    const intro = b < INTRO.length;
    const t = outroBar ? OUTRO_START : intro ? b * INTRO_BAR : b * BAR + GRID_SHIFT;
    const [root, ...voices] = C[name];
    const outro = name === 'Dmaj9';
    // The last groove bar may be cut short by the final chord
    const barLength = intro ? INTRO_BAR : Math.min(BAR, OUTRO_START - t);
    pad(voices, t, outro ? 3.2 : barLength, intro ? 0.018 + b * 0.002 : outro ? 0.03 : 0.026);

    if (intro) {
      // A few plucked notes from bar 3 on, like someone hesitating
      if (b >= 2) {
        [0, 1.5, 2.5].forEach((beat, i) => pluck(voices[(i + b) % voices.length] + 12, t + beat * INTRO_BEAT, 0.16, 0.35 + 0.15 * i));
      }
      if (b === INTRO.length - 1) bass(root + 12, t + 2 * INTRO_BEAT, 2 * INTRO_BEAT, 0.12); // lead-in
      return;
    }

    if (outro) {
      bass(root, t, 4.5, 0.2);
      // A slow upward arpeggio that rings into the end card
      voices.slice(1).forEach((m, i) => pluck(m + 12, t + i * 0.28, 0.14, 0.3 + i * 0.1, 0.9985));
      kick(t, 0.5);
      return;
    }

    // Groove: arpeggio in eighths, bass, kick on 1 and 3, hats on the offbeats,
    // a soft clap on 2 and 4 from the second groove bar
    const arp = [voices[0], voices[1], voices[2], voices[3], voices[2] + 12, voices[3], voices[1], voices[2]];
    arp.forEach((m, i) => beforeOutro(t + i * (BEAT / 2)) && pluck(m + 12, t + i * (BEAT / 2), 0.12, i % 2 ? 0.7 : 0.3));
    bass(root, t, barLength, 0.15);
    kick(t, 0.42);
    if (beforeOutro(t + 2 * BEAT)) kick(t + 2 * BEAT, 0.34);
    for (let i = 0; i < 4; i++) {
      if (beforeOutro(t + i * BEAT + BEAT / 2)) noiseHit(t + i * BEAT + BEAT / 2, 0.05, { decay: 70, bright: 0.9, pan: 0.6 });
    }
    if (b > INTRO.length) {
      if (beforeOutro(t + BEAT)) noiseHit(t + BEAT, 0.09, { decay: 22, bright: 0.25, send: 0.5 });
      if (beforeOutro(t + 3 * BEAT)) noiseHit(t + 3 * BEAT, 0.09, { decay: 22, bright: 0.25, send: 0.5 });
    }
  });

  // --- Reverb (Schroeder: four combs, two allpasses) ---------------------------

  function reverb(input, offset) {
    const out = new Float32Array(N);
    for (const [len, fb] of [[1557, 0.86], [1617, 0.85], [1491, 0.86], [1422, 0.84]]) {
      const d = len + offset;
      const buf = new Float32Array(d);
      let i = 0;
      let damp = 0;
      for (let k = 0; k < N; k++) {
        const y = buf[i];
        damp = y * 0.6 + damp * 0.4;
        buf[i] = input[k] + damp * fb;
        out[k] += y * 0.25;
        i = (i + 1) % d;
      }
    }
    for (const len of [225 + offset, 556 + offset]) {
      const buf = new Float32Array(len);
      let i = 0;
      for (let k = 0; k < N; k++) {
        const b = buf[i];
        const x = out[k];
        buf[i] = x + b * 0.5;
        out[k] = b - x * 0.5;
        i = (i + 1) % len;
      }
    }
    return out;
  }
  const revL = reverb(sendL, 0);
  const revR = reverb(sendR, 23);

  // --- Master: high-pass, reverb in, gentle saturation, fade, normalise --------

  // High-pass around 35 Hz: no rumble from the plucks, no DC offset
  function highpass(buf) {
    let x1 = 0;
    let y1 = 0;
    for (let k = 0; k < N; k++) {
      const y = buf[k] - x1 + 0.995 * y1;
      x1 = buf[k];
      buf[k] = y1 = y;
    }
  }
  for (const buf of [L, R, revL, revR]) highpass(buf);

  let peak = 0;
  for (let k = 0; k < N; k++) {
    const t = k / SR;
    const fade = t > SECONDS - 2.5 ? Math.max(0, (SECONDS - t) / 2.5) : 1;
    L[k] = Math.tanh(1.3 * (L[k] + revL[k] * 0.9)) * fade;
    R[k] = Math.tanh(1.3 * (R[k] + revR[k] * 0.9)) * fade;
    peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
  }
  const norm = 0.89 / peak;

  const data = Buffer.alloc(N * 4);
  for (let k = 0; k < N; k++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k] * norm)) * 32767), k * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k] * norm)) * 32767), k * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.concat([header, data]));
  console.log(`✓ ${path.relative(__dirname, OUT)} (${SECONDS.toFixed(2)} s, ${BPM} bpm, groove from ${GROOVE_START.toFixed(2)} s, final chord at ${OUTRO_START.toFixed(2)} s)`);
}

for (const film of selected()) render(film);
