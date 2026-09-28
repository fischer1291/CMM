// Real app screens for the App Store screenshots: renders the app's own
// component gallery (dev/DevPreview.tsx, sample data) in the web build and
// saves each screen at iPhone 6.9" size (440×956 pt, @3x = 1320×2868) to
// static/appstore/. src/kit.js puts them into the store layout.
//
//   npx expo start --web --port 8081        (in the repo root, dev mode)
//   node tools/app-screens.js               (here, in marketing/)
//
// Needs Chrome (CHROME=…) and puppeteer-core (dev dependency).
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const APP = process.env.APP_URL || 'http://localhost:8081/';
const OUT = path.join(__dirname, '../static/appstore');
// Gallery sections used in the store (see STORE in src/kit.js)
const SCREENS = ['status-on', 'contacts', 'status-daily-open', 'call-connected', 'circle', 'moments', 'stats'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // dev/previewControl.ts asks this server which section to show
  let state = {};
  const control = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(state));
  }).listen(8099);

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean),
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 440, height: 956, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    // Sample photos load with curl, which follows the system's proxy settings
    const photos = {};
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('https://images.unsplash.com/')) return req.continue();
      try {
        photos[url] ||= execFileSync('curl', ['-sfL', url], { maxBuffer: 20e6 });
        req.respond({ status: 200, contentType: 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: photos[url] });
      } catch {
        req.abort();
      }
    });
    for (const section of SCREENS) {
      state = { open: true, section };
      await page.goto(APP, { waitUntil: 'networkidle2', timeout: 120000 });
      await wait(4000);
      // Native-only modules (SecureStore) throw on the web: hide the dev error overlay and its toast
      for (let i = 0; i < 3; i++) {
        const dismissed = await page.evaluate(() => {
          const b = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && e.textContent === 'Dismiss');
          b?.click();
          return !!b;
        });
        if (!dismissed) break;
        await wait(800);
      }
      await wait(2500);
      await page.evaluate(() => {
        for (const e of document.querySelectorAll('*')) {
          if (e.childElementCount !== 0 || !/^ExpoSecureStore/.test(e.textContent)) continue;
          let n = e;
          while (n.parentElement && !['fixed', 'absolute'].includes(getComputedStyle(n).position)) n = n.parentElement;
          n.style.display = 'none';
        }
      });
      await page.screenshot({ path: path.join(OUT, `${section}.png`) });
      console.log('✓', section);
    }
  } finally {
    await browser.close();
    control.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
