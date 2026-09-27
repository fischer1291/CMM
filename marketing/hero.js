// Cuts the hero film from the clips in hero/clips/<format>/<id>.mp4 (see
// HERO-VIDEO.md), with captions, sound and the end card.
//
//   cd marketing && npm run video -- endcard && npm run hero
//
// Missing clips become labelled placeholders, so the cut works as an animatic
// before a single clip exists. Optional audio: hero/audio/voiceover.mp3 (on
// top) and hero/audio/music.mp3 (ducked under the voice).
// Output: dist/video/hero-16x9.mp4 and hero-9x16.mp4.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const HERO = path.join(__dirname, 'hero');
const OUT = path.join(__dirname, 'dist/video');
const TMP = path.join(OUT, '.hero');
const FORMATS = { '16x9': { w: 1920, h: 1080 }, '9x16': { w: 1080, h: 1920 } };

const { shots } = JSON.parse(fs.readFileSync(path.join(HERO, 'shots.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

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

async function renderOverlays(browser, fmt, size) {
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h });
  const files = {};
  for (const shot of shots) {
    const clip = path.join(HERO, 'clips', fmt, `${shot.id}.mp4`);
    const placeholder = !fs.existsSync(clip);
    await page.setContent(overlayHtml(size, shot, placeholder), { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const png = path.join(TMP, `${fmt}-${shot.id}.png`);
    await page.screenshot({ path: png, omitBackground: !placeholder });
    files[shot.id] = { png, clip: placeholder ? null : clip };
  }
  await page.close();
  return files;
}

/** One normalised segment per shot: exact length, size, 30 fps, caption burned in. */
function segment(fmt, size, shot, { png, clip }) {
  const out = path.join(TMP, `${fmt}-${shot.id}.mp4`);
  const fit = `scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},fps=${FPS},setsar=1`;
  const inputs = clip ? ['-i', clip, '-i', png] : ['-f', 'lavfi', '-i', `color=c=#13131E:s=${size.w}x${size.h}:r=${FPS}`, '-i', png];
  ffmpeg([
    ...inputs,
    '-filter_complex', `[0:v]trim=duration=${shot.seconds},setpts=PTS-STARTPTS,${fit}[v];[v][1:v]overlay=0:0,format=yuv420p[out]`,
    '-map', '[out]', '-t', String(shot.seconds), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', out,
  ]);
  return out;
}

function assemble(fmt, size, segments) {
  const endcard = path.join(OUT, `endcard-${fmt}.mp4`);
  if (!fs.existsSync(endcard)) throw new Error(`${path.relative(__dirname, endcard)} fehlt: erst "npm run video -- endcard"`);
  const list = path.join(TMP, `${fmt}-list.txt`);
  const endSeg = path.join(TMP, `${fmt}-end.mp4`);
  ffmpeg(['-i', endcard, '-vf', `scale=${size.w}:${size.h},fps=${FPS},setsar=1,format=yuv420p`, '-an', '-c:v', 'libx264', '-crf', '17', endSeg]);
  fs.writeFileSync(list, [...segments, endSeg].map((f) => `file '${f}'`).join('\n'));
  const cut = path.join(TMP, `${fmt}-cut.mp4`);
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', cut]);

  const total = shots.reduce((s, x) => s + x.seconds, 0) + 5;
  const vo = path.join(HERO, 'audio/voiceover.mp3');
  const music = path.join(HERO, 'audio/music.mp3');
  const out = path.join(OUT, `hero-${fmt}.mp4`);
  const hasVo = fs.existsSync(vo);
  const hasMusic = fs.existsSync(music);
  const fadeIn = 'fade=t=in:st=0:d=0.6';
  if (!hasVo && !hasMusic) {
    ffmpeg(['-i', cut, '-vf', fadeIn, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  } else {
    const inputs = ['-i', cut];
    let graph;
    if (hasVo && hasMusic) {
      inputs.push('-i', vo, '-i', music);
      // Music quieter while the voice speaks
      graph = `[2:a]volume=0.5[m];[m][1:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[duck];[duck][1:a]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=${total - 2}:d=2[a]`;
    } else {
      inputs.push('-i', hasVo ? vo : music);
      graph = `[1:a]apad,afade=t=out:st=${total - 2}:d=2[a]`;
    }
    ffmpeg([...inputs, '-filter_complex', `[0:v]${fadeIn}[v];${graph}`, '-map', '[v]', '-map', '[a]', '-t', String(total),
      '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  }
  const missing = shots.filter((s) => !fs.existsSync(path.join(HERO, 'clips', fmt, `${s.id}.mp4`))).map((s) => s.id);
  console.log(`✓ ${path.relative(__dirname, out)} (${total} s)${missing.length ? ` · Platzhalter für Shot ${missing.join(', ')}` : ''}`);
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const [fmt, size] of Object.entries(FORMATS)) {
      const files = await renderOverlays(browser, fmt, size);
      const segments = shots.map((shot) => segment(fmt, size, shot, files[shot.id]));
      assemble(fmt, size, segments);
    }
  } finally {
    await browser.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
