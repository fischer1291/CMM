// Cuts the hero film from the clips in hero/clips/<format>/<id>.mp4 (see
// HERO-VIDEO.md), with captions, sound and the end card, and checks the result.
//
//   cd marketing && npm run video -- endcard && npm run music && npm run hero
//
// hero/shots.json per shot: seconds, caption, optional `clip` (use another
// file name), `fallback` (used while the clip is missing, path from marketing/)
// and `ambience` (volume of the clip's own sound; default from the top-level
// `ambience`, else 0.25; 0 = only voice and music). Clips that are too short
// hold their last frame. Missing clips without fallback become labelled
// placeholders, so the cut also works as an animatic.
//
// Sound: hero/audio/voiceover.(wav|mp3|m4a), placed phrase by phrase by the
// cues in shots.json; each caption appears when its phrase starts. Music:
// hero/audio/music.(wav|mp3|m4a), ducked under the voice. All audio is mixed
// as PCM and encoded once; loudness is measured first and applied as plain
// gain (-16 LUFS), because loudnorm's lookahead dropped seconds of audio.
//
// After rendering, a QC report checks the audio for gaps, the lengths, the
// loudness and, per shot, that caption and speech sit inside the shot. Any
// failure makes the script exit with an error.
// Output: dist/video/hero-<format>.mp4 for every format with at least one clip.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const RATE = 48000;
const END_SECONDS = 5;
const TARGET_LUFS = -16;
// Captions come up just before the voice
const CAPTION_LEAD = 0.1;
const HERO = path.join(__dirname, 'hero');
const OUT = path.join(__dirname, 'dist/video');
const TMP = path.join(OUT, '.hero');
const FORMATS = { '9x16': { w: 1080, h: 1920 }, '16x9': { w: 1920, h: 1080 } };

const config = JSON.parse(fs.readFileSync(path.join(HERO, 'shots.json'), 'utf8'));
const { shots } = config;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const firstExisting = (base) => ['wav', 'mp3', 'm4a'].map((ext) => `${base}.${ext}`).find((f) => fs.existsSync(f)) || null;
const fmtS = (s) => s.toFixed(2).padStart(5);

/** Where each shot starts in the film (seconds); "end" is the end card. */
const starts = {};
let total = 0;
for (const shot of shots) {
  starts[shot.id] = total;
  total += shot.seconds;
}
starts.end = total;
total += END_SECONDS;
const lengthOf = (id) => (id === 'end' ? END_SECONDS : shots.find((s) => s.id === id).seconds);

function ffmpeg(args) {
  const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}
/** Run ffmpeg for its analysis output (stderr). */
function analyse(args) {
  return spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
}
const probe = (args) => spawnSync('ffprobe', ['-v', 'error', ...args], { encoding: 'utf8' }).stdout.trim();

function clipFor(fmt, shot) {
  const own = path.join(HERO, 'clips', fmt, `${shot.clip || shot.id}.mp4`);
  if (fs.existsSync(own)) return { file: own, kind: 'clip' };
  const fallback = shot.fallback && path.join(__dirname, shot.fallback);
  if (fallback && fs.existsSync(fallback) && fmt === '9x16') return { file: fallback, kind: 'fallback' };
  return { file: null, kind: 'placeholder' };
}
const hasAudio = (file) => probe(['-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file]) !== '';

// --- Voice ---------------------------------------------------------------------

/** Where the speech in a file really starts and ends (without silence). */
function speechBounds(file) {
  const out = analyse(['-i', file, '-af', 'silencedetect=noise=-40dB:d=0.08']);
  const duration = parseFloat(probe(['-show_entries', 'format=duration', '-of', 'csv=p=0', file]));
  const silStarts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const silEnds = [...out.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const lead = silStarts[0] !== undefined && silStarts[0] < 0.01 ? silEnds[0] ?? 0 : 0;
  // A silence that starts and never ends runs to the end of the file
  const tail = silStarts.length > silEnds.length ? duration - silStarts[silStarts.length - 1] : 0;
  return { lead, speech: Math.max(0, duration - lead - tail) };
}

/**
 * The voice track: every cue cut into its own file first, then laid at its
 * shot. (Splitting one input into many trimmed branches stalls ffmpeg.)
 * Returns the file and, per cue, when the speech runs in the film.
 */
function voiceTrack(voice) {
  const cues = config.voice?.cues?.length ? config.voice.cues : [{ shot: shots[0].id, from: 0, to: null, offset: 0 }];
  const placed = cues.map((c, i) => {
    const file = path.join(TMP, `cue-${i}.wav`);
    ffmpeg(['-i', voice, '-ss', String(c.from), ...(c.to == null ? [] : ['-to', String(c.to)]), '-ar', String(RATE), '-ac', '2', file]);
    const at = (starts[c.shot] ?? 0) + (c.offset ?? 0.2);
    const { lead, speech } = speechBounds(file);
    return { ...c, file, at, speechFrom: at + lead, speechTo: at + lead + speech };
  });
  const out = path.join(TMP, 'voice.wav');
  const delays = placed.map((c, i) => {
    const ms = Math.round(c.at * 1000);
    return `[${i}:a]adelay=${ms}|${ms}[v${i}]`;
  });
  ffmpeg([
    ...placed.flatMap((c) => ['-i', c.file]),
    // Gentle compression keeps every phrase clearly above the music
    '-filter_complex', `${delays.join(';')};${placed.map((_, i) => `[v${i}]`).join('')}amix=inputs=${placed.length}:normalize=0,acompressor=threshold=0.08:ratio=3:attack=5:release=120,volume=${config.voiceVolume ?? 1.6},apad,atrim=end_sample=${Math.round(total * RATE)}[a]`,
    '-map', '[a]', '-ar', String(RATE), '-ac', '2', out,
  ]);
  return { file: out, placed };
}

// --- Picture -------------------------------------------------------------------

/** Transparent caption overlay (and a placeholder card for missing clips). */
function overlayHtml({ w, h }, shot, placeholder) {
  const wide = w > h;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Space+Mono&display=swap">
<style>html,body{margin:0;width:${w}px;height:${h}px;background:${placeholder ? '#13131E' : 'transparent'};font-family:'Space Grotesk',sans-serif;color:#F4F4FA;overflow:hidden}
.cap{position:absolute;left:0;right:0;${wide ? 'bottom:90px' : 'bottom:430px'};display:flex;justify-content:center;padding:0 ${wide ? 200 : 80}px}
.cap span{font-weight:700;font-size:${wide ? 54 : 64}px;line-height:1.2;letter-spacing:-.02em;text-align:center;text-shadow:0 2px 24px rgba(0,0,0,.8),0 0 2px rgba(0,0,0,.9)}
.ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;text-align:center;padding:0 120px}
.ph b{font-family:'Space Mono',monospace;font-size:${wide ? 34 : 40}px;color:${shot.source === 'app' ? '#FF2E93' : '#00E5FF'};letter-spacing:.12em}
.ph p{margin:0;font-size:${wide ? 44 : 52}px;color:#A6A6BF;max-width:24ch}</style></head><body>
${placeholder ? `<div class="ph"><b>SHOT ${shot.id} · ${shot.source === 'app' ? 'ECHTE APP' : 'KI'} · ${shot.seconds} s</b><p>${esc(shot.what)}</p></div>` : ''}
${shot.caption ? `<div class="cap"><span>${esc(shot.caption)}</span></div>` : ''}
</body></html>`;
}

async function renderOverlay(page, size, shot, placeholder, png) {
  await page.setContent(overlayHtml(size, shot, placeholder), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: png, omitBackground: !placeholder });
}

/**
 * One shot: the picture (exact length, size, 30 fps, caption from `captionAt`
 * seconds into the shot) and, separately, its sound as PCM with exactly the
 * right number of samples.
 */
function segment(size, shot, source, png, captionAt, video, audio) {
  const d = shot.seconds;
  const fit = `scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},fps=${FPS},setsar=1`;
  const input = source.file ? ['-i', source.file] : ['-f', 'lavfi', '-i', `color=c=#13131E:s=${size.w}x${size.h}:r=${FPS}`];
  const placeholder = source.kind === 'placeholder';
  ffmpeg([
    ...input, '-i', png,
    '-filter_complex',
    `[0:v]tpad=stop_mode=clone:stop_duration=${d},trim=duration=${d},setpts=PTS-STARTPTS,${fit}[v];` +
      `[v][1:v]overlay=0:0:enable='gte(t,${placeholder ? 0 : captionAt.toFixed(3)})',format=yuv420p[out]`,
    '-map', '[out]', '-frames:v', String(Math.round(d * FPS)), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', video,
  ]);
  const volume = shot.ambience ?? config.ambience ?? 0.25;
  const withSound = source.kind === 'clip' && volume > 0 && hasAudio(source.file);
  const samples = Math.round(d * RATE);
  ffmpeg([
    ...(withSound ? ['-i', source.file] : ['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`]),
    '-af', `aresample=${RATE},aformat=channel_layouts=stereo,volume=${withSound ? volume : 0},apad,atrim=end_sample=${samples}`,
    '-ar', String(RATE), '-ac', '2', audio,
  ]);
}

function endSegment(fmt, size, video, audio) {
  const endcard = path.join(OUT, `endcard-${fmt}.mp4`);
  if (!fs.existsSync(endcard)) throw new Error(`${path.relative(__dirname, endcard)} fehlt: erst "npm run video -- endcard"`);
  ffmpeg(['-i', endcard, '-vf', `scale=${size.w}:${size.h},fps=${FPS},setsar=1,format=yuv420p`, '-frames:v', String(END_SECONDS * FPS), '-an', '-c:v', 'libx264', '-crf', '17', video]);
  ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`, '-af', `atrim=end_sample=${END_SECONDS * RATE}`, '-ar', String(RATE), '-ac', '2', audio]);
}

// --- Sound ---------------------------------------------------------------------

/** Clips' sound, voice on top, music ducked under the voice: one PCM file. */
function mixAudio(bed, voice, music, out) {
  const inputs = ['-i', bed];
  const parts = [];
  const beds = ['[0:a]'];
  if (voice) {
    inputs.push('-i', voice);
    // A second copy steers the music ducking; only split when there is music
    parts.push(music ? '[1:a]asplit=2[voice][key]' : '[1:a]anull[voice]');
  }
  if (music) {
    inputs.push('-i', music);
    const m = voice ? 2 : 1;
    parts.push(`[${m}:a]aresample=${RATE},aformat=channel_layouts=stereo,volume=${config.musicVolume ?? 0.5},apad,atrim=end_sample=${Math.round(total * RATE)}[mraw]`);
    parts.push(voice ? '[mraw][key]sidechaincompress=threshold=0.015:ratio=14:attack=15:release=600[music]' : '[mraw]anull[music]');
    beds.push('[music]');
  }
  if (voice) beds.push('[voice]');
  parts.push(`${beds.join('')}amix=inputs=${beds.length}:duration=first:normalize=0,afade=t=out:st=${total - 1.5}:d=1.5[a]`);
  ffmpeg([...inputs, '-filter_complex', parts.join(';'), '-map', '[a]', '-ar', String(RATE), '-ac', '2', '-c:a', 'pcm_f32le', out]);
}

/** Integrated loudness (LUFS) and true peak (dBFS) of a file. */
function loudness(file) {
  const out = analyse(['-i', file, '-vn', '-af', 'ebur128=peak=true']);
  const summary = out.slice(out.lastIndexOf('Summary:'));
  return {
    lufs: parseFloat(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]),
    peak: parseFloat(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]),
  };
}

// --- QC ------------------------------------------------------------------------

function qc(file, placed, captions) {
  const problems = [];
  const lines = [];
  // 1. The audio has no holes: every packet follows the previous one
  const pts = probe(['-select_streams', 'a', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).split('\n').map(parseFloat);
  let maxStep = 0;
  for (let i = 1; i < pts.length; i++) maxStep = Math.max(maxStep, pts[i] - pts[i - 1]);
  const audioSeconds = (pts.length * 1024) / RATE;
  lines.push(`Ton lückenlos: ${maxStep < 0.03 ? 'ja' : `NEIN (Sprung ${maxStep.toFixed(2)} s)`} · ${audioSeconds.toFixed(2)} s Ton für ${total} s Film`);
  if (maxStep >= 0.03) problems.push('Lücke in der Tonspur');
  if (Math.abs(audioSeconds - total) > 0.1) problems.push(`Tonlänge ${audioSeconds.toFixed(2)} s statt ${total} s`);
  // 2. Lengths
  const videoSeconds = parseFloat(probe(['-select_streams', 'v', '-show_entries', 'stream=duration', '-of', 'csv=p=0', file]));
  if (Math.abs(videoSeconds - total) > 0.1) problems.push(`Bildlänge ${videoSeconds} s statt ${total} s`);
  // 3. Loudness
  const { lufs, peak } = loudness(file);
  lines.push(`Lautheit: ${lufs.toFixed(1)} LUFS (Ziel ${TARGET_LUFS}), Spitze ${peak.toFixed(1)} dBFS`);
  if (Math.abs(lufs - TARGET_LUFS) > 1) problems.push(`Lautheit ${lufs} LUFS`);
  if (peak > -1) problems.push(`Spitze ${peak} dBFS`);
  // 4. Per shot: caption and speech inside the shot, in order
  lines.push('', 'Shot   Bild            Untertitel ab   Stimme');
  for (const id of [...shots.map((s) => s.id), 'end']) {
    const from = starts[id];
    const to = from + lengthOf(id);
    const cue = placed.find((c) => c.shot === id);
    const cap = captions[id];
    let status = 'ok';
    if (cue) {
      if (cue.speechFrom < from + 0.1) status = 'Stimme beginnt vor dem Schnitt';
      else if (cue.speechTo > (id === 'end' ? total - 1.5 : to - 0.05)) status = 'Stimme läuft über den Schnitt';
      else if (cap != null && Math.abs(from + cap + CAPTION_LEAD - cue.speechFrom) > 0.05) status = 'Untertitel nicht mit Stimme';
    }
    if (status !== 'ok') problems.push(`Shot ${id}: ${status}`);
    lines.push(
      `${id.padEnd(5)}  ${fmtS(from)}–${fmtS(to)} s   ${cap == null ? '     –       ' : `${fmtS(from + cap)} s     `}   ${cue ? `${fmtS(cue.speechFrom)}–${fmtS(cue.speechTo)} s` : '–'}   ${status}`,
    );
  }
  return { ok: problems.length === 0, report: lines.join('\n'), problems };
}

// --- Build ---------------------------------------------------------------------

async function build(browser, fmt, size) {
  const sources = Object.fromEntries(shots.map((s) => [s.id, clipFor(fmt, s)]));
  if (!shots.some((s) => sources[s.id].kind === 'clip')) {
    console.log(`– ${fmt}: keine Clips in hero/clips/${fmt}/, übersprungen`);
    return true;
  }
  const voiceFile = firstExisting(path.join(HERO, 'audio/voiceover'));
  const music = firstExisting(path.join(HERO, 'audio/music'));
  const voice = voiceFile ? voiceTrack(voiceFile) : { file: null, placed: [] };

  // Captions come up with their phrase (shots without a phrase: from the cut)
  const captions = {};
  for (const shot of shots) {
    if (!shot.caption) continue;
    const cue = voice.placed.find((c) => c.shot === shot.id);
    captions[shot.id] = cue ? Math.max(0, cue.speechFrom - starts[shot.id] - CAPTION_LEAD) : 0;
  }

  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h });
  const videos = [];
  const audios = [];
  for (const shot of shots) {
    const png = path.join(TMP, `${fmt}-${shot.id}.png`);
    await renderOverlay(page, size, shot, sources[shot.id].kind === 'placeholder', png);
    const v = path.join(TMP, `${fmt}-${shot.id}.mp4`);
    const a = path.join(TMP, `${fmt}-${shot.id}.wav`);
    segment(size, shot, sources[shot.id], png, captions[shot.id] ?? 0, v, a);
    videos.push(v);
    audios.push(a);
  }
  await page.close();
  const endV = path.join(TMP, `${fmt}-end.mp4`);
  const endA = path.join(TMP, `${fmt}-end.wav`);
  endSegment(fmt, size, endV, endA);
  videos.push(endV);
  audios.push(endA);

  // Picture: concatenated as is. Sound: joined sample-exactly as PCM.
  const list = path.join(TMP, `${fmt}-list.txt`);
  fs.writeFileSync(list, videos.map((f) => `file '${f}'`).join('\n'));
  const cut = path.join(TMP, `${fmt}-cut.mp4`);
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', cut]);
  const bed = path.join(TMP, `${fmt}-bed.wav`);
  ffmpeg([...audios.flatMap((f) => ['-i', f]), '-filter_complex', `${audios.map((_, i) => `[${i}:a]`).join('')}concat=n=${audios.length}:v=0:a=1[a]`, '-map', '[a]', bed]);

  const mixed = path.join(TMP, `${fmt}-mix.wav`);
  mixAudio(bed, voice.file, music, mixed);
  const gain = TARGET_LUFS - loudness(mixed).lufs;

  const out = path.join(OUT, `hero-${fmt}.mp4`);
  ffmpeg([
    '-i', cut, '-i', mixed,
    '-filter_complex',
    `[0:v]fade=t=in:st=0:d=0.6,fade=t=out:st=${total - 0.6}:d=0.6[v];` +
      `[1:a]volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false,atrim=end_sample=${Math.round(total * RATE)},asetpts=N/SR/TB[a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(RATE), '-movflags', '+faststart', out,
  ]);

  const check = qc(out, voice.placed, captions);
  const note = (kind) => shots.filter((s) => sources[s.id].kind === kind).map((s) => s.id);
  const extras = [
    note('fallback').length ? `Ersatz für Shot ${note('fallback').join(', ')}` : null,
    note('placeholder').length ? `Platzhalter für Shot ${note('placeholder').join(', ')}` : null,
    voiceFile ? null : 'ohne Stimme',
    music ? null : 'ohne Musik',
  ].filter(Boolean);
  console.log(`${check.ok ? '✓' : '✗'} ${path.relative(__dirname, out)} (${total} s)${extras.length ? ` · ${extras.join(' · ')}` : ''}`);
  console.log(check.report.replace(/^/gm, '  '));
  if (!check.ok) console.log(`\n  Probleme: ${check.problems.join('; ')}`);
  return check.ok;
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  let ok = true;
  try {
    for (const [fmt, size] of Object.entries(FORMATS)) ok = (await build(browser, fmt, size)) && ok;
    // Kept after a failure (or with KEEP=1), for debugging
    if (ok && !process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true });
  } finally {
    await browser.close();
  }
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
