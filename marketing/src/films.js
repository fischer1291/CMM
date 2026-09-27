// The films cut from hero/shots.json: the full hero film and its short cuts.
// Shared by hero.js (picture and sound) and music.js (music timed to the cut).
//
// A cut in `cuts` reuses the shots and voice phrases of the full film:
//   { "name": "15s-problem", "shots": [{ "id": "01", "seconds": 2.667, "offset": 0 }, …, { "id": "end", "seconds": 4 }] }
// Per entry `seconds` (rounded to whole frames) and optionally `offset`, the
// start of the shot's voice phrase after the cut (default: as in the full
// film), and `start`, where in the clip the shot begins (e.g. to skip a slow
// fade-in). `end` is the end card. Cuts start hard, without the full film's
// fade from black: in a feed the first frame has to catch the eye. Output: dist/video/hero-<name>-<format>.mp4
// with the music hero/audio/music-<name>.wav.
const fs = require('fs');
const path = require('path');

const FPS = 30;
const HERO = path.join(__dirname, '..', 'hero');
const config = JSON.parse(fs.readFileSync(path.join(HERO, 'shots.json'), 'utf8'));
const frames = (s) => Math.round(s * FPS) / FPS;

function film(id, name, shots, cues, endSeconds, music, fadeIn) {
  // Where each shot starts in the film (seconds); "end" is the end card
  const starts = {};
  let total = 0;
  for (const shot of shots) {
    starts[shot.id] = total;
    total += shot.seconds;
  }
  starts.end = total;
  total += endSeconds;
  return { id, name, shots, cues, endSeconds, music, fadeIn, starts, total };
}

function films() {
  const cues = config.voice?.cues || [];
  const all = [film('hero', 'hero', config.shots, cues, 5, 'music', 0.6)];
  for (const cut of config.cuts || []) {
    const entries = cut.shots.filter((s) => s.id !== 'end');
    const end = cut.shots.find((s) => s.id === 'end') || {};
    const shots = entries.map((s) => {
      const base = config.shots.find((b) => b.id === s.id);
      if (!base) throw new Error(`Schnitt ${cut.name}: Shot ${s.id} gibt es nicht`);
      return { ...base, seconds: frames(s.seconds ?? base.seconds), start: s.start ?? base.start ?? 0 };
    });
    const cutCues = [...entries, { ...end, id: 'end' }].flatMap((s) => {
      const cue = cues.find((c) => c.shot === s.id);
      return cue ? [{ ...cue, offset: s.offset ?? cue.offset }] : [];
    });
    all.push(film(cut.name, `hero-${cut.name}`, shots, cutCues, frames(end.seconds ?? 5), `music-${cut.name}`, 0));
  }
  return all;
}

/** The films named on the command line (by name, e.g. "hero" or "15s-problem"), or all. */
function selected(args = process.argv.slice(2)) {
  const all = films();
  if (!args.length) return all;
  const picked = all.filter((f) => args.includes(f.id) || args.includes(f.name));
  const unknown = args.filter((a) => !all.some((f) => f.id === a || f.name === a));
  if (unknown.length) throw new Error(`Unbekannter Film: ${unknown.join(', ')} (vorhanden: ${all.map((f) => f.id).join(', ')})`);
  return picked;
}

module.exports = { FPS, HERO, config, films, selected };
