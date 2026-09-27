// Renders the animated ads (src/ads.js) to MP4 with headless Chrome and ffmpeg.
//
//   cd marketing && npm install && npm run video            # all
//   npm run video -- ad-2                                    # names containing "ad-2"
//   MUSIC=track.mp3 npm run video                            # with a sound bed
//
// Every CSS animation is paused and seeked to each frame's time, so frames are
// exact regardless of rendering speed. Output: dist/video/<name>.mp4 (H.264,
// 30 fps, yuv420p, faststart: accepted by TikTok, Meta and YouTube).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const { markOnly } = require('../docs/brand/logo');
const ads = require('./src/ads');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = Number(process.env.FPS || 30);
const SITE = (process.env.SITE_URL || 'https://wannayap.app').replace(/^https?:\/\//, '');
const OUT = path.join(__dirname, 'dist/video');

function encoder(file, seconds) {
  const music = process.env.MUSIC;
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  if (music) args.push('-i', music);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (music) {
    // Fade the sound bed out with the end card
    args.push('-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=out:st=${Math.max(0, seconds - 1.5)}:d=1.5`, '-shortest');
  }
  args.push(file);
  const child = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))));
  return { stdin: child.stdin, done };
}

async function render(browser, ad) {
  const page = await browser.newPage();
  await page.setViewport({ width: ad.w, height: ad.h, deviceScaleFactor: 1 });
  await page.setContent(ad.html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  // Stop the clock: from now on we set every animation's time ourselves
  await page.evaluate(() => document.getAnimations().forEach((anim) => anim.pause()));

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${ad.name}.mp4`);
  const { stdin, done } = encoder(file, ad.seconds);
  const frames = Math.round(ad.seconds * FPS);
  for (let i = 0; i < frames; i++) {
    const ms = (i * 1000) / FPS;
    await page.evaluate((t) => document.getAnimations().forEach((anim) => (anim.currentTime = t)), ms);
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!stdin.write(jpeg)) await new Promise((r) => stdin.once('drain', r));
    if (i % FPS === 0) process.stdout.write(`\r${ad.name}: ${Math.round((i / frames) * 100)} %`);
  }
  stdin.end();
  await done;
  await page.close();
  process.stdout.write(`\r✓ ${path.relative(__dirname, file)} (${ad.seconds} s, ${ad.w}×${ad.h})\n`);
}

async function main() {
  const filter = process.argv[2];
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  const list = ads({ logoSvg, shortUrl: SITE }).filter((ad) => !filter || ad.name.includes(filter));
  if (!list.length) throw new Error(`No ad matches "${filter}"`);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  try {
    for (const ad of list) await render(browser, ad);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
