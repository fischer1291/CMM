// Cuts the hero film from the clips in hero/clips/<format>/<id>.mp4 (see
// HERO-VIDEO.md), with captions, sound and the end card.
//
//   cd marketing && npm run video -- endcard && npm run hero
//
// hero/shots.json per shot: seconds, caption, optional `clip` (use another
// file name), `fallback` (used while the clip is missing, path from marketing/)
// and `ambience` (volume of the clip's own sound; default from the top-level
// `ambience`, else 0.25; 0 = only voice and music). Clips that are
// too short hold their last frame. Missing clips without fallback become
// labelled placeholders, so the cut also works as an animatic.
//
// Sound: hero/audio/voiceover.(wav|mp3|m4a), placed phrase by phrase by the
// cues in shots.json (or from 0 without cues), and hero/audio/music.(mp3|wav|m4a),
// ducked under the voice. Output: dist/video/hero-<format>.mp4 for every format
// that has at least one clip.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const RATE = 48000;
const END_SECONDS = 5;
const HERO = path.join(__dirname, 'hero');
const OUT = path.join(__dirname, 'dist/video');
const TMP = path.join(OUT, '.hero');
const FORMATS = { '9x16': { w: 1080, h: 1920 }, '16x9': { w: 1920, h: 1080 } };

const config = JSON.parse(fs.readFileSync(path.join(HERO, 'shots.json'), 'utf8'));
const { shots } = config;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const firstExisting = (base) => ['wav', 'mp3', 'm4a'].map((ext) => `${base}.${ext}`).find((f) => fs.existsSync(f)) || null;

/** Where each shot starts in the film (seconds); "end" is the end card. */
const starts = {};
let total = 0;
for (const shot of shots) {
  starts[shot.id] = total;
  total += shot.seconds;
}
starts.end = total;
total += END_SECONDS;

function clipFor(fmt, shot) {
  const own = path.join(HERO, 'clips', fmt, `${shot.clip || shot.id}.mp4`);
  if (fs.existsSync(own)) return { file: own, kind: 'clip' };
  const fallback = shot.fallback && path.join(__dirname, shot.fallback);
  if (fallback && fs.existsSync(fallback) && fmt === '9x16') return { file: fallback, kind: 'fallback' };
  return { file: null, kind: 'placeholder' };
}

const hasAudio = (file) =>
  spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim() !== '';

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

function ffmpeg(args) {
  const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

async function renderOverlay(page, size, shot, placeholder, png) {
  await page.setContent(overlayHtml(size, shot, placeholder), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: png, omitBackground: !placeholder });
}

/**
 * One normalised segment per shot: exact length, size, 30 fps, caption burned
 * in, and a stereo track with the clip's own sound (or silence).
 */
function segment(size, shot, source, png, out) {
  const d = shot.seconds;
  const fit = `scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},fps=${FPS},setsar=1`;
  const video = source.file
    ? ['-i', source.file]
    : ['-f', 'lavfi', '-i', `color=c=#13131E:s=${size.w}x${size.h}:r=${FPS}`];
  const withSound = source.file && source.kind === 'clip' && hasAudio(source.file);
  const audio = withSound ? [] : ['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`];
  const audioIn = withSound ? '0:a' : '2:a';
  const volume = shot.ambience ?? config.ambience ?? 0.25;
  ffmpeg([
    ...video, '-i', png, ...audio,
    '-filter_complex',
    `[0:v]tpad=stop_mode=clone:stop_duration=${d},trim=duration=${d},setpts=PTS-STARTPTS,${fit}[v];[v][1:v]overlay=0:0,format=yuv420p[vout];` +
      `[${audioIn}]aresample=${RATE},aformat=channel_layouts=stereo,volume=${withSound ? volume : 1},apad,atrim=duration=${d},asetpts=PTS-STARTPTS[aout]`,
    '-map', '[vout]', '-map', '[aout]', '-t', String(d),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-c:a', 'aac', '-b:a', '192k', out,
  ]);
}

function endSegment(fmt, size, out) {
  const endcard = path.join(OUT, `endcard-${fmt}.mp4`);
  if (!fs.existsSync(endcard)) throw new Error(`${path.relative(__dirname, endcard)} fehlt: erst "npm run video -- endcard"`);
  ffmpeg([
    '-i', endcard, '-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`,
    '-vf', `scale=${size.w}:${size.h},fps=${FPS},setsar=1,format=yuv420p`, '-map', '0:v', '-map', '1:a',
    '-t', String(END_SECONDS), '-c:v', 'libx264', '-crf', '17', '-c:a', 'aac', '-b:a', '192k', out,
  ]);
}

/**
 * The voice track: every cue cut into its own file first, then laid at its
 * shot. (Splitting one input into many trimmed branches stalls ffmpeg.)
 */
function voiceTrack(voice) {
  const cues = config.voice?.cues?.length ? config.voice.cues : [{ shot: shots[0].id, from: 0, to: null, offset: 0 }];
  const files = cues.map((c, i) => {
    const file = path.join(TMP, `cue-${i}.wav`);
    ffmpeg(['-i', voice, '-ss', String(c.from), ...(c.to == null ? [] : ['-to', String(c.to)]), '-ar', String(RATE), '-ac', '2', file]);
    return file;
  });
  const out = path.join(TMP, 'voice.wav');
  const delays = cues.map((c, i) => {
    const at = Math.round(((starts[c.shot] ?? 0) + (c.offset ?? 0.3)) * 1000);
    return `[${i}:a]adelay=${at}|${at}[v${i}]`;
  });
  ffmpeg([
    ...files.flatMap((f) => ['-i', f]),
    // Gentle compression keeps every phrase clearly above the music
    '-filter_complex', `${delays.join(';')};${cues.map((_, i) => `[v${i}]`).join('')}amix=inputs=${cues.length}:normalize=0,acompressor=threshold=0.08:ratio=3:attack=5:release=120,volume=${config.voiceVolume ?? 1.6},apad,atrim=duration=${total}[a]`,
    '-map', '[a]', '-ar', String(RATE), '-ac', '2', out,
  ]);
  return out;
}

/** Voice on top, the music ducked under it, the clips' own sound below; -16 LUFS like social platforms expect. */
function mix(cut, out) {
  const voice = firstExisting(path.join(HERO, 'audio/voiceover'));
  const music = firstExisting(path.join(HERO, 'audio/music'));
  const inputs = ['-i', cut];
  const parts = [];
  const beds = ['[0:a]'];
  if (voice) {
    inputs.push('-i', voiceTrack(voice));
    // A second copy steers the music ducking; only split when there is music
    parts.push(music ? '[1:a]asplit=2[voice][key]' : '[1:a]anull[voice]');
  }
  if (music) {
    inputs.push('-i', music);
    const m = voice ? 2 : 1;
    parts.push(`[${m}:a]aresample=${RATE},aformat=channel_layouts=stereo,volume=${config.musicVolume ?? 0.5},apad,atrim=duration=${total}[mraw]`);
    parts.push(voice ? '[mraw][key]sidechaincompress=threshold=0.015:ratio=14:attack=15:release=600[music]' : '[mraw]anull[music]');
    beds.push('[music]');
  }
  if (voice) beds.push('[voice]');
  parts.push(`${beds.join('')}amix=inputs=${beds.length}:duration=first:normalize=0,afade=t=out:st=${total - 1.5}:d=1.5,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${RATE},alimiter=limit=0.84:level=false[a]`);
  parts.push('[0:v]fade=t=in:st=0:d=0.6[v]');
  ffmpeg([...inputs, '-filter_complex', parts.join(';'), '-map', '[v]', '-map', '[a]', '-t', String(total),
    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  return { voice, music };
}

async function build(browser, fmt, size) {
  const sources = Object.fromEntries(shots.map((s) => [s.id, clipFor(fmt, s)]));
  if (!shots.some((s) => sources[s.id].kind === 'clip')) {
    console.log(`– ${fmt}: keine Clips in hero/clips/${fmt}/, übersprungen`);
    return;
  }
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h });
  const segments = [];
  for (const shot of shots) {
    const src = sources[shot.id];
    const png = path.join(TMP, `${fmt}-${shot.id}.png`);
    await renderOverlay(page, size, shot, src.kind === 'placeholder', png);
    const out = path.join(TMP, `${fmt}-${shot.id}.mp4`);
    segment(size, shot, src, png, out);
    segments.push(out);
  }
  await page.close();
  const end = path.join(TMP, `${fmt}-end.mp4`);
  endSegment(fmt, size, end);
  const list = path.join(TMP, `${fmt}-list.txt`);
  fs.writeFileSync(list, [...segments, end].map((f) => `file '${f}'`).join('\n'));
  const cut = path.join(TMP, `${fmt}-cut.mp4`);
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', cut]);

  const out = path.join(OUT, `hero-${fmt}.mp4`);
  const { voice, music } = mix(cut, out);
  const note = (kind) => shots.filter((s) => sources[s.id].kind === kind).map((s) => s.id);
  const extras = [
    note('fallback').length ? `Ersatz für Shot ${note('fallback').join(', ')}` : null,
    note('placeholder').length ? `Platzhalter für Shot ${note('placeholder').join(', ')}` : null,
    voice ? null : 'ohne Stimme',
    music ? null : 'ohne Musik',
  ].filter(Boolean);
  console.log(`✓ ${path.relative(__dirname, out)} (${total} s)${extras.length ? ` · ${extras.join(' · ')}` : ''}`);
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const [fmt, size] of Object.entries(FORMATS)) await build(browser, fmt, size);
    // Kept after a failure (or with KEEP=1), for debugging
    if (!process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true });
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
