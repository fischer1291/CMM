// Cuts a hero episode: the Veo scenes (each trimmed, with its caption burned
// in and its own ambience kept quietly, a planned German line at full volume,
// unplanned speech muted), the real app screen with the payoff as the turn
// after `appAfter` scenes, the remaining scenes as the payoff, the end card,
// and the code-composed music (music.js) under all of it. The first scene
// carries the series label and the hook at the top; the music ducks whenever
// someone speaks. Loudness is measured and set as plain gain (-16 LUFS), like
// hero.js.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ads = require('../src/ads');
const { render } = require('../video');
const { musicFor } = require('./common');
const { END_SECONDS } = require('./hero-prompt');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const W = 1080;
const H = 1920;
const FPS = 30;
const RATE = 48000;
const TARGET_LUFS = -16;
const AMBIENCE = 0.35;
const VOICE = 1;

function ffmpeg(args) {
  const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}
const probe = (args) => spawnSync('ffprobe', ['-v', 'error', ...args], { encoding: 'utf8' }).stdout.trim();
const hasAudio = (file) => probe(['-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file]) !== '';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// On moving pictures a gradient text blurs into the background: the
// highlight is a pink bar with white text, readable on any shot
const MARK = 'background:#FF2E93;color:#fff;padding:0 .14em;border-radius:.14em;-webkit-box-decoration-break:clone;box-decoration-break:clone;text-shadow:none';
/** Escaped text; the first *…* becomes the highlight. */
const highlight = (s) => esc(s).replace(/\*([^*]+)\*/, `<span style="${MARK}">$1</span>`).replace(/\*/g, '');
/** Long captions get smaller so they stay in two or three lines. */
const captionSize = (caption) => (caption.length <= 40 ? 64 : caption.length <= 64 ? 56 : 50);

/**
 * Transparent overlay: the caption above the TikTok/Reels UI at the bottom;
 * on the first scene also the series label and the hook at the top, over a
 * soft shade so they read on any picture.
 */
const captionHtml = (caption, intro) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap">
<style>html,body{margin:0;width:${W}px;height:${H}px;background:transparent;font-family:'Space Grotesk',sans-serif;color:#F4F4FA;overflow:hidden}
.cap{position:absolute;left:0;right:0;bottom:430px;display:flex;justify-content:center;padding:0 90px 0 80px}
.cap span{font-weight:700;line-height:1.2;letter-spacing:-.02em;text-align:center;text-shadow:0 2px 24px rgba(0,0,0,.8),0 0 2px rgba(0,0,0,.9)}
.shade{position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(rgba(11,11,18,.72),rgba(11,11,18,.35) 60%,rgba(11,11,18,0))}
.intro{position:absolute;left:80px;right:140px;top:200px}
.intro p{margin:0 0 20px;font-weight:700;font-size:34px;letter-spacing:.06em;text-transform:uppercase;color:#00E5FF;text-shadow:0 2px 16px rgba(0,0,0,.8)}
.intro h1{margin:0;font-weight:700;font-size:80px;line-height:1.08;letter-spacing:-.03em;text-shadow:0 2px 28px rgba(0,0,0,.7)}</style></head>
<body>${intro ? `<div class="shade"></div><div class="intro"><p>${esc(intro.label)}</p><h1>${highlight(intro.hook)}</h1></div>` : ''}${caption ? `<div class="cap"><span style="font-size:${captionSize(caption)}px">${esc(caption)}</span></div>` : ''}</body></html>`;

function silence(seconds, out) {
  ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`, '-af', `atrim=end_sample=${Math.round(seconds * RATE)}`, '-ar', String(RATE), '-ac', '2', out]);
}

/** Integrated loudness of a file (LUFS). */
function lufs(file) {
  const out = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const summary = out.slice(out.lastIndexOf('Summary:'));
  return parseFloat(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]);
}

/**
 * shots: [{ file, start, seconds, caption, mute, voice }], app: { payoff, screen }
 * after the first `appAfter` shots, intro: { label, hook } on the first shot,
 * music: { style, campaign } (agent/soundtrack.js).
 * Returns { file, seconds }.
 */
async function cutHero({ browser, shots, app, appAfter = shots.length, intro, logoSvg, shortUrl, out, tmp, music: musicOptions }) {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  // Per segment: picture, sound, and the voice alone (it ducks the music)
  const segments = [];

  // 1. The scenes
  const scenes = [];
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  for (const [i, shot] of shots.entries()) {
    const d = shot.seconds;
    const png = path.join(tmp, `cap-${i}.png`);
    await page.setContent(captionHtml(shot.caption, i === 0 ? intro : null), { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: png, omitBackground: true });
    const v = path.join(tmp, `shot-${i}.mp4`);
    ffmpeg([
      '-ss', String(shot.start), '-i', shot.file, '-i', png,
      '-filter_complex',
      `[0:v]tpad=stop_mode=clone:stop_duration=${d},trim=duration=${d},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1[v];[v][1:v]overlay=0:0,format=yuv420p[out]`,
      '-map', '[out]', '-frames:v', String(Math.round(d * FPS)), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', v,
    ]);
    const a = path.join(tmp, `shot-${i}.wav`);
    if (!shot.mute && hasAudio(shot.file)) {
      // A planned spoken line must be understood; plain ambience stays in the background
      const volume = shot.voice ? VOICE : AMBIENCE;
      ffmpeg(['-ss', String(shot.start), '-i', shot.file, '-af', `aresample=${RATE},aformat=channel_layouts=stereo,volume=${volume},apad,atrim=end_sample=${Math.round(d * RATE)}`, '-ar', String(RATE), '-ac', '2', a]);
    } else silence(d, a);
    scenes.push({ video: v, audio: a, voice: shot.voice && !shot.mute ? a : null, seconds: d });
  }
  await page.close();

  // 2. The real app screen with the payoff, 3. the end card (rendered from src/templates.js)
  const appAd = ads.buildAd({ name: 'hero-app', template: 'app', content: app, logoSvg, shortUrl });
  const end = ads({ logoSvg, shortUrl }).find((a) => a.name === 'endcard-9x16');
  const rendered = [];
  for (const ad of [appAd, end]) {
    const file = await render(browser, ad, tmp);
    const seconds = ad === end ? END_SECONDS : ad.seconds;
    const v = path.join(tmp, `${ad.name}-trim.mp4`);
    ffmpeg(['-i', file, '-vf', `scale=${W}:${H},fps=${FPS},setsar=1,format=yuv420p`, '-frames:v', String(Math.round(seconds * FPS)), '-an', '-c:v', 'libx264', '-crf', '17', v]);
    const a = path.join(tmp, `${ad.name}.wav`);
    silence(seconds, a);
    rendered.push({ video: v, audio: a, voice: null, seconds });
  }
  const turn = Math.max(1, Math.min(appAfter, scenes.length));
  segments.push(...scenes.slice(0, turn), rendered[0], ...scenes.slice(turn), rendered[1]);

  // Picture and ambience joined; music lifts with the app, ducks under voices and lands on the end card
  const appStart = scenes.slice(0, turn).reduce((s, x) => s + x.seconds, 0);
  const total = segments.reduce((s, x) => s + x.seconds, 0);
  const endStart = total - END_SECONDS;
  const cut = path.join(tmp, 'cut.mp4');
  ffmpeg([...segments.flatMap((x) => ['-i', x.video]), '-filter_complex', `${segments.map((_, i) => `[${i}:v]`).join('')}concat=n=${segments.length}:v=1:a=0[v]`, '-map', '[v]', '-c:v', 'libx264', '-crf', '17', cut]);
  const concat = (files, out) => ffmpeg([...files.flatMap((f) => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}:a]`).join('')}concat=n=${files.length}:v=0:a=1[a]`, '-map', '[a]', out]);
  const bed = path.join(tmp, 'bed.wav');
  concat(segments.map((x) => x.audio), bed);
  const voices = path.join(tmp, 'voices.wav');
  concat(
    segments.map((x, i) => {
      if (x.voice) return x.voice;
      const quiet = path.join(tmp, `quiet-${i}.wav`);
      silence(x.seconds, quiet);
      return quiet;
    }),
    voices,
  );
  const music = musicFor({ seconds: total, liftAt: appStart, endAt: endStart }, path.join(tmp, 'music.wav'), musicOptions);
  const mixed = path.join(tmp, 'mix.wav');
  ffmpeg([
    '-i', bed, '-i', music, '-i', voices,
    '-filter_complex',
    `[1:a]aresample=${RATE},aformat=channel_layouts=stereo,volume=0.55,apad,atrim=end_sample=${Math.round(total * RATE)}[m];` +
      `[2:a]aresample=${RATE},aformat=channel_layouts=stereo[key];` +
      `[m][key]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400[ducked];` +
      `[0:a][ducked]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=${total - 1.5}:d=1.5[a]`,
    '-map', '[a]', '-ar', String(RATE), '-ac', '2', '-c:a', 'pcm_f32le', mixed,
  ]);
  const gain = TARGET_LUFS - lufs(mixed);
  ffmpeg([
    '-i', cut, '-i', mixed,
    '-filter_complex', `[0:v]fade=t=out:st=${total - 0.6}:d=0.6[v];[1:a]volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false,atrim=end_sample=${Math.round(total * RATE)},asetpts=N/SR/TB[a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', String(RATE), '-movflags', '+faststart', out,
  ]);
  return { file: out, seconds: Math.round(total * 10) / 10, appStart, endStart };
}

/** A few frames of a clip as JPEG (for Claude's check). */
function frames(file, times, dir, prefix) {
  return times.map((t, i) => {
    const out = path.join(dir, `${prefix}-${i}.jpg`);
    ffmpeg(['-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=432:-2', '-q:v', '4', out]);
    return out;
  });
}

module.exports = { cutHero, frames };
