// Original background music for the ad videos, synthesised from code, so
// there are no third-party rights in it and it can be used in ads freely.
//
//   cd marketing && npm run music            # hero/audio/music.wav + music-<cut>.wav
//   npm run music -- 15s-problem             # only this film (names: src/films.js)
//   npm run music -- --styles                # one sample per style: dist/music/<style>.wav
//
// Every piece follows the cut: until the first app shot the problem (held
// back, sparse), from there the groove in whole bars, then a short breath and,
// exactly on the cut to the end card, one final chord that rings out. The intro
// bars stretch so the first app shot starts on a bar. In the short cuts a
// groove that does not fill its last bar is cut off by the final chord (from a
// fifth of a bar on).
//
// Styles (STYLES below) set tempo, chords, drums and instruments. The hero film
// uses lo-fi in D major. The marketing agent picks a style per video and passes
// a seed: from it come the key, the chord progression and a little tempo, so
// every video sounds different, and the same again when it is re-rendered.
const path = require('path');
const fs = require('fs');
const { HERO, selected } = require('./src/films');

const SR = 44100;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Lo-fi voicings: [bass, ...pad voices] as MIDI notes
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

const PITCH = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const QUALITY = {
  '': [0, 4, 7, 12],
  m: [0, 3, 7, 12],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  add9: [0, 4, 7, 14],
  maj9: [0, 4, 7, 11, 14],
  sus: [0, 5, 7, 12],
};
/** "Am7" → [bass, ...voices]: the bass between A1 and G#2, the voices from G3 up. */
function chord(symbol) {
  const [, root, quality] = symbol.match(/^([A-G][b#]?)(.*)$/);
  const pc = PITCH[root];
  const voices = QUALITY[quality].map((i) => {
    let m = 48 + pc + i;
    while (m < 55) m += 12;
    return m;
  });
  return [33 + ((pc - 9 + 12) % 12), ...voices.sort((a, b) => a - b)];
}

/** Steps of a 16th pattern ("x..x....") that sound, as [index, symbol]. */
const steps = (pattern) => [...pattern].map((s, i) => [i, s]).filter(([, s]) => s !== '.');

/** End card for the styles other than lo-fi: the chord rings out with an upward arpeggio. */
function finale(c, x, sound = 'pluck') {
  x.pad(c.voices, c.t, 3.2, 0.028);
  x.bass(c.root, c.t, 4.5, 0.2);
  c.voices.slice(1).forEach((m, i) => (sound === 'bell'
    ? x.bell(m + 12, c.t + i * 0.28, 0.08, 0.3 + i * 0.1, { decay: 1.2 })
    : x.pluck(m + 12, c.t + i * 0.28, 0.14, 0.3 + i * 0.1, 0.9985)));
  x.kick(c.t, 0.5);
}

/**
 * The styles. chords: intro (repeats), leadIn (last intro bar, leads into the
 * groove), groove (one progression is chosen by the seed), final (end card).
 * bar(c, x) plays one bar: c = { t, len, step, i, intro, first, lastIntro,
 * outro, root, voices }, x = the instruments and hits(pattern, fn).
 */
const STYLES = {
  lofi: {
    label: 'Lo-Fi',
    mood: 'warm, ruhig, nachdenklich; Heimweh, Abendstimmung, leise Momente',
    bpm: 90,
    table: C,
    chords: { intro: ['Bm7', 'Gmaj7', 'Bm7', 'Gmaj7', 'Em7'], leadIn: 'Asus', groove: [['D', 'AC', 'Bm7', 'Gmaj7', 'D', 'A', 'Gadd9']], final: 'Dmaj9' },
    bar(c, x) {
      const { t, root, voices, b } = c;
      x.pad(voices, t, c.outro ? 3.2 : c.len, c.intro ? 0.018 + b * 0.002 : c.outro ? 0.03 : 0.026);
      if (c.intro) {
        // A few plucked notes from bar 3 on, like someone hesitating
        if (b >= 2) {
          [0, 1.5, 2.5].forEach((beat, i) => x.pluck(voices[(i + b) % voices.length] + 12, t + beat * c.beat, 0.16, 0.35 + 0.15 * i));
        }
        if (c.lastIntro) x.bass(root + 12, t + 2 * c.beat, 2 * c.beat, 0.12); // lead-in
        return;
      }
      if (c.outro) {
        x.bass(root, t, 4.5, 0.2);
        // A slow upward arpeggio that rings into the end card
        voices.slice(1).forEach((m, i) => x.pluck(m + 12, t + i * 0.28, 0.14, 0.3 + i * 0.1, 0.9985));
        x.kick(t, 0.5);
        return;
      }
      // Groove: arpeggio in eighths, bass, kick on 1 and 3, hats on the offbeats,
      // a soft clap on 2 and 4 from the second groove bar
      const arp = [voices[0], voices[1], voices[2], voices[3], voices[2] + 12, voices[3], voices[1], voices[2]];
      arp.forEach((m, i) => x.beforeOutro(t + i * (c.beat / 2)) && x.pluck(m + 12, t + i * (c.beat / 2), 0.12, i % 2 ? 0.7 : 0.3));
      x.bass(root, t, c.len, 0.15);
      x.kick(t, 0.42);
      if (x.beforeOutro(t + 2 * c.beat)) x.kick(t + 2 * c.beat, 0.34);
      for (let i = 0; i < 4; i++) {
        if (x.beforeOutro(t + i * c.beat + c.beat / 2)) x.noiseHit(t + i * c.beat + c.beat / 2, 0.05, { decay: 70, bright: 0.9, pan: 0.6 });
      }
      if (!c.first) {
        if (x.beforeOutro(t + c.beat)) x.noiseHit(t + c.beat, 0.09, { decay: 22, bright: 0.25, send: 0.5 });
        if (x.beforeOutro(t + 3 * c.beat)) x.noiseHit(t + 3 * c.beat, 0.09, { decay: 22, bright: 0.25, send: 0.5 });
      }
    },
  },

  house: {
    label: 'House',
    mood: 'treibend, Aufbruch, Wochenende, Party, Energie',
    bpm: 122,
    chords: {
      intro: ['Am7', 'Fmaj7'],
      leadIn: 'G',
      groove: [['Am7', 'Fmaj7', 'Cmaj7', 'G'], ['Dm7', 'Am7', 'Fmaj7', 'G'], ['Fmaj7', 'G', 'Em7', 'Am7']],
      final: 'Am9',
    },
    bar(c, x) {
      if (c.outro) return finale(c, x);
      x.pad(c.voices, c.t, c.len, c.intro ? 0.016 : 0.011);
      if (c.intro) {
        if (c.i >= 1) x.hits('..x...x...x...x.', (time) => x.noiseHit(time, 0.035, { decay: 16, bright: 0.9, pan: 0.6 }));
        if (c.lastIntro) {
          x.riser(c.t, c.len, 0.18);
          x.hits('........x.x.xxxx', (time, _, i) => x.snare(time, 0.04 + i * 0.008));
        }
        return;
      }
      x.hits('x...x...x...x...', (time) => x.kick(time, 0.5));
      x.hits('....x.......x...', (time) => x.noiseHit(time, 0.11, { decay: 22, bright: 0.25, send: 0.5 }));
      x.hits('..x...x...x...x.', (time) => x.noiseHit(time, 0.05, { decay: 14, bright: 0.9, pan: 0.6 }));
      x.hits('x.xxx.xxx.xxx.xx', (time) => x.noiseHit(time, 0.018, { decay: 90, bright: 0.95, pan: 0.35 }));
      x.hits('..x...x...x...x.', (time) => x.bass(c.root + 12, time, c.step * 1.8, 0.17));
      x.hits('...x..x....x..x.', (time) => x.synth(c.voices, time, c.step * 1.4, 0.022, { bright: 0.55 }));
    },
  },

  pop: {
    label: 'Pop',
    mood: 'hell, fröhlich, gute Laune, Freundschaft, Wiedersehen',
    bpm: 112,
    chords: {
      intro: ['C', 'Am'],
      leadIn: 'G',
      groove: [['C', 'G', 'Am', 'F'], ['F', 'C', 'G', 'Am'], ['Am', 'F', 'C', 'G']],
      final: 'Cadd9',
    },
    bar(c, x) {
      if (c.outro) return finale(c, x);
      x.pad(c.voices, c.t, c.len, c.intro ? 0.017 : 0.013);
      if (c.intro) {
        x.hits('x.....x...x.....', (time, _, i) => x.pluck(c.voices[(i + c.i) % c.voices.length] + 12, time, 0.12, 0.4, 0.995, true));
        if (c.lastIntro) x.riser(c.t, c.len, 0.12);
        return;
      }
      x.hits('x.......x.x.....', (time) => x.kick(time, 0.48));
      x.hits('....x.......x...', (time) => x.snare(time, 0.2));
      x.hits('x.x.x.x.x.x.x.x.', (time, _, i) => x.noiseHit(time, i % 4 ? 0.03 : 0.045, { decay: 60, bright: 0.9, pan: 0.6 }));
      x.hits('x.x.x.x.x.x.x.x.', (time, _, i) => x.bass(c.root + (i % 4 === 2 ? 24 : 12), time, c.step * 1.8, 0.14));
      const arp = [0, 1, 2, 3, 2, 1];
      x.hits('xxxxxxxxxxxxxxxx', (time, _, i) => x.pluck(c.voices[arp[i % arp.length] % c.voices.length] + 12, time, 0.07, i % 2 ? 0.65 : 0.35, 0.993, false));
    },
  },

  trap: {
    label: 'Trap / Hip-Hop',
    mood: 'cool, selbstbewusst, Punchline, Meme-Humor, „so nicht mehr“',
    bpm: 140,
    chords: {
      intro: ['Cm7', 'Abmaj7'],
      leadIn: 'Bb',
      groove: [['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb'], ['Fm7', 'Cm7', 'Abmaj7', 'Bb'], ['Ebmaj7', 'Cm7', 'Abmaj7', 'Bb']],
      final: 'Ebmaj9',
    },
    bar(c, x) {
      if (c.outro) return finale(c, x, 'bell');
      x.pad(c.voices, c.t, c.len, c.intro ? 0.015 : 0.01);
      const melody = (gain) => x.hits('x..x..x.....x...', (time, _, i) => x.bell(c.voices[(i + c.i) % c.voices.length] + 12, time, gain, i % 2 ? 0.65 : 0.35));
      if (c.intro) {
        melody(0.05);
        if (c.lastIntro) x.riser(c.t, c.len, 0.14);
        return;
      }
      melody(0.06);
      // Half time: the 808 follows the kick and rings until the next one
      const kicks = [0, 6, 10];
      x.hits('x.....x...x.....', (time, _, i) => {
        x.kick(time, 0.36);
        const next = kicks.find((k) => k > i) ?? 16;
        x.sub(c.root, time, Math.min((next - i) * c.step, x.until(time)), 0.22);
      });
      x.hits('........x.......', (time) => {
        x.snare(time, 0.2);
        x.noiseHit(time, 0.07, { decay: 22, bright: 0.25, send: 0.5 });
      });
      x.hits(c.i % 2 ? 'x.x.x.x.x.x.xxxx' : 'x.x.x.x.x.x.x.x.', (time) => x.noiseHit(time, 0.035, { decay: 80, bright: 0.95, pan: 0.6 }));
    },
  },

  afro: {
    label: 'Afro',
    mood: 'sommerlich, leicht, tanzbar, unbeschwert, draußen',
    bpm: 104,
    chords: {
      intro: ['Dm7', 'Cmaj7'],
      leadIn: 'G',
      groove: [['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], ['Dm7', 'G', 'Cmaj7', 'Am7'], ['Am7', 'Dm7', 'G', 'Cmaj7']],
      final: 'Cmaj9',
    },
    bar(c, x) {
      if (c.outro) return finale(c, x, 'bell');
      x.pad(c.voices, c.t, c.len, c.intro ? 0.015 : 0.011);
      const marimba = (gain) => x.hits('..x..x.x..x..x..', (time, _, i) => x.bell(c.voices[(i + c.i) % c.voices.length] + 12, time, gain, i % 2 ? 0.7 : 0.3, { ratio: 4, index: 1.1, decay: 7, send: 0.25 }));
      if (c.intro) {
        marimba(0.06);
        x.hits('x.xxx.xxx.xxx.xx', (time) => x.noiseHit(time, 0.012, { decay: 90, bright: 0.95, pan: 0.4 }));
        return;
      }
      marimba(0.075);
      x.hits('x.....x...x.....', (time) => x.kick(time, 0.45));
      x.hits('x..x..x.x..x..x.', (time) => x.noiseHit(time, 0.05, { decay: 45, bright: 0.7, pan: 0.35 }));
      x.hits('....x.......x...', (time) => x.noiseHit(time, 0.07, { decay: 24, bright: 0.3, send: 0.4 }));
      x.hits('x.xxx.xxx.xxx.xx', (time, s, i) => x.noiseHit(time, i % 4 ? 0.014 : 0.024, { decay: 90, bright: 0.95, pan: 0.65 }));
      x.hits('x..x..x...x.x...', (time, _, i) => x.bass(c.root + (i === 6 || i === 12 ? 7 : 0) + 12, time, c.step * 2.4, 0.16));
    },
  },

  acoustic: {
    label: 'Akustik',
    mood: 'nah, ehrlich, gefühlvoll; Familie, Heimweh, Oma, Fernfreundschaft',
    bpm: 98,
    chords: {
      intro: ['G', 'C'],
      leadIn: 'D',
      groove: [['G', 'D', 'Em', 'C'], ['C', 'G', 'Am', 'F'], ['Em', 'C', 'G', 'D']],
      final: 'Gadd9',
    },
    bar(c, x) {
      if (c.outro) return finale(c, x);
      x.pad(c.voices, c.t, c.len, c.intro ? 0.01 : 0.007);
      if (c.intro) {
        // Picked guitar: bass note, then the chord tones
        const pick = [c.root + 12, c.voices[1], c.voices[2], c.voices[3], c.voices[2], c.voices[1]];
        x.hits('x.x.x.x.x.x.x.x.', (time, _, i) => x.pluck(pick[(i / 2) % pick.length], time, 0.11, 0.35 + ((i / 2) % 3) * 0.15, 0.996, false));
        return;
      }
      x.hits('d...d.u...u.d.u.', (time, s) => x.strum(c.voices, time, s === 'd' ? 0.085 : 0.06, s === 'u'));
      x.hits('x.......x.......', (time) => x.kick(time, 0.42));
      x.hits('....x.......x...', (time) => x.noiseHit(time, 0.1, { decay: 18, bright: 0.3, send: 0.6 }));
      x.hits('x.......x.......', (time) => x.bass(c.root, time, c.step * 7, 0.12));
    },
  },
};

/**
 * Music for one film: { shots: [{ id, seconds, source? }], starts: { <id>: s, end: s }, total }.
 * The first shot with source "app" is where the music lifts, `starts.end` is
 * where the final chord hits. options: { style (key of STYLES, default lo-fi),
 * seed (varies key, progression and tempo; without one, the style as written) }.
 * Also used by the marketing agent (agent/common.js).
 */
function render(film, OUT = path.join(HERO, 'audio', `${film.music}.wav`), { style = 'lofi', seed } = {}) {
  const S = STYLES[style];
  if (!S) throw new Error(`Unbekannter Musikstil: ${style}`);
  const vary = Number.isInteger(seed);
  const choice = vary ? Math.abs(seed) : 0;
  // Key: up to three semitones up or down; tempo: up to 2 bpm either way
  const KEY = vary ? (choice % 7) - 3 : 0;
  const BPM = S.bpm + (vary ? ((choice >>> 3) % 5) - 2 : 0);
  const PROGRESSION = S.chords.groove[(choice >>> 6) % S.chords.groove.length];
  const BAR = (4 * 60) / BPM;
  const BEAT = BAR / 4;
  const voicing = (name) => (S.table?.[name] || chord(name)).map((m) => m + KEY);

  // Cut points from the shot list
  const lift = film.shots.find((s) => s.source === 'app') || film.shots[Math.floor(film.shots.length / 3)];
  const LIFT_AT = film.starts[lift.id];
  const END_CARD_AT = film.starts.end;
  const SECONDS = film.total;
  const N = Math.round(SR * SECONDS);

  // Deterministic "random" so every build sounds the same
  let state = vary ? 12345 + (choice % 100000) : 12345;
  const rand = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;

  const introBars = LIFT_AT > 0 ? Math.max(1, Math.round(LIFT_AT / BAR)) : 0;
  const INTRO_BAR = introBars ? LIFT_AT / introBars : BAR;
  const INTRO_BEAT = INTRO_BAR / 4;
  const grooveSpan = (END_CARD_AT - LIFT_AT) / BAR;
  const grooveBars = grooveSpan - Math.floor(grooveSpan + 0.01) >= 0.2 ? Math.ceil(grooveSpan) : Math.floor(grooveSpan + 0.01);
  // The intro ends on the chord that leads into the lift
  const INTRO_CHORDS = S.chords.intro;
  const INTRO = Array.from({ length: introBars }, (_, i) => (i === introBars - 1 ? S.chords.leadIn : INTRO_CHORDS[i % INTRO_CHORDS.length]));
  const GROOVE = Array.from({ length: grooveBars }, (_, i) => PROGRESSION[i % PROGRESSION.length]);
  const bars = [...INTRO, ...GROOVE, S.chords.final];
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

  /** Bright synth (additive saw, two detuned voices): chord stabs. */
  function synth(notes, start, dur, gain, { bright = 0.6, harmonics = 8, attack = 0.004, release = 0.12, send = 0.3 } = {}) {
    const s0 = Math.floor(start * SR);
    const len = Math.floor((dur + release) * SR);
    const amps = Array.from({ length: harmonics }, (_, h) => bright ** h / (h + 1));
    for (const m of notes) {
      for (const [detune, pan] of [[-9, 0.25], [9, 0.75]]) {
        const f = midi(m) * 2 ** (detune / 1200);
        const ph = (rand() + 1) * 3.14;
        const top = Math.min(harmonics, Math.floor(12000 / f));
        for (let k = 0; k < len; k++) {
          const t = k / SR;
          const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
          if (!env) continue;
          const w = 2 * Math.PI * f * t + ph;
          let v = 0;
          for (let h = 0; h < top; h++) v += amps[h] * Math.sin((h + 1) * w);
          v *= env * gain;
          add(L, s0 + k, v * (1 - pan));
          add(R, s0 + k, v * pan);
          add(sendL, s0 + k, v * send * (1 - pan));
          add(sendR, s0 + k, v * send * pan);
        }
      }
    }
  }

  /** Snare: a short tone and a burst of noise. */
  function snare(start, gain, send = 0.35) {
    const s0 = Math.floor(start * SR);
    let lp = 0;
    for (let k = 0; k < 0.25 * SR; k++) {
      const t = k / SR;
      const n = rand();
      lp += 0.5 * (n - lp);
      const v = (Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 35) * 0.6 + (n - lp * 0.6) * Math.exp(-t * 16) * 0.8) * gain;
      add(L, s0 + k, v);
      add(R, s0 + k, v);
      add(sendL, s0 + k, v * send);
      add(sendR, s0 + k, v * send);
    }
  }

  /** 808: a sine bass with a pitch drop at the start, slightly driven. */
  function sub(m, start, dur, gain) {
    const f = midi(m);
    const s0 = Math.floor(start * SR);
    const len = Math.floor((dur + 0.05) * SR);
    let phase = 0;
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      phase += (2 * Math.PI * f * (1 + 0.8 * Math.exp(-t * 45))) / SR;
      const env = Math.min(1, t / 0.004) * Math.exp(-t * 0.8) * Math.min(1, Math.max(0, (dur + 0.05 - t) / 0.05));
      const v = Math.tanh(1.8 * Math.sin(phase)) * env * gain;
      add(L, s0 + k, v);
      add(R, s0 + k, v);
    }
  }

  /** Bell or marimba (FM): `ratio` and `index` set the colour, `decay` the length. */
  function bell(m, start, gain, pan = 0.5, { ratio = 3.5, index = 1.6, decay = 3, send = 0.4 } = {}) {
    const f = midi(m);
    const s0 = Math.floor(start * SR);
    const len = Math.floor(Math.min(3, 6 / decay) * SR);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const env = Math.min(1, t / 0.003) * Math.exp(-t * decay);
      const v = Math.sin(2 * Math.PI * f * t + index * Math.exp(-t * decay * 1.5) * Math.sin(2 * Math.PI * f * ratio * t)) * env * gain;
      add(L, s0 + k, v * (1 - pan));
      add(R, s0 + k, v * pan);
      add(sendL, s0 + k, v * send * (1 - pan));
      add(sendR, s0 + k, v * send * pan);
    }
  }

  /** Guitar strum: the chord's strings one after another, down or up. */
  function strum(notes, start, gain, up = false) {
    const strings = up ? [...notes].reverse().slice(0, 4) : notes;
    strings.forEach((m, i) => pluck(m, start + i * 0.014, gain, 0.3 + (0.4 * i) / strings.length, 0.9965, false));
  }

  /** Noise that opens up over `dur`: the build-up into the groove. */
  function riser(start, dur, gain) {
    const s0 = Math.floor(start * SR);
    const len = Math.floor(dur * SR);
    let lp = 0;
    for (let k = 0; k < len; k++) {
      const x = k / len;
      lp += (0.02 + 0.5 * x * x) * (rand() - lp);
      const v = lp * x * x * gain;
      add(L, s0 + k, v);
      add(R, s0 + k, v);
      add(sendL, s0 + k, v * 0.5);
      add(sendR, s0 + k, v * 0.5);
    }
  }

  // --- Arrangement -------------------------------------------------------------

  bars.forEach((name, b) => {
    const outro = b === bars.length - 1;
    const intro = b < INTRO.length;
    const t = outro ? OUTRO_START : intro ? b * INTRO_BAR : b * BAR + GRID_SHIFT;
    const [root, ...voices] = voicing(name);
    // The last groove bar may be cut short by the final chord
    const len = intro ? INTRO_BAR : Math.min(BAR, OUTRO_START - t);
    const beat = intro ? INTRO_BEAT : BEAT;
    const step = beat / 4;
    /** Plays fn(time, symbol, index) on the steps of a 16th pattern that fit in this bar. */
    const hits = (pattern, fn) => {
      for (const [i, s] of steps(pattern)) {
        const time = t + i * step;
        if (i * step < len - 0.01 && beforeOutro(time)) fn(time, s, i);
      }
    };
    const c = { t, len, beat, step, b, i: intro ? b : b - INTRO.length, intro, outro, first: b === INTRO.length, lastIntro: intro && b === INTRO.length - 1, root, voices };
    S.bar(c, { pad, pluck, bass, kick, noiseHit, synth, snare, sub, bell, strum, riser, hits, beforeOutro, until: (time) => OUTRO_START - time });
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
  console.log(`✓ ${path.relative(__dirname, OUT)} (${S.label}, ${SECONDS.toFixed(2)} s, ${BPM} bpm, groove from ${GROOVE_START.toFixed(2)} s, final chord at ${OUTRO_START.toFixed(2)} s)`);
}

module.exports = { render, STYLES };

if (require.main === module) {
  if (process.argv.includes('--styles')) {
    // One sample per style, cut like an app video: 5 s problem, groove, end card
    const film = { shots: [{ id: 'intro', seconds: 5 }, { id: 'app', source: 'app', seconds: 7 }], starts: { intro: 0, app: 5, end: 12 }, total: 15 };
    for (const style of Object.keys(STYLES)) render(film, path.join(__dirname, 'dist', 'music', `${style}.wav`), { style });
  } else {
    for (const film of selected()) render(film);
  }
}
