// Builds the landing page (dist/landing) and renders every marketing asset
// (dist/kit) to PNG, plus the flyer to PDF, with headless Chrome.
//
//   cd marketing && npm install && npm run build
//
// Set the URLs below before printing anything with a QR code on it.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const QRCode = require('qrcode');
const { markOnly } = require('../docs/brand/logo');
const landing = require('./src/landing');
const kit = require('./src/kit');

const CONFIG = {
  /** Where the landing page will live (used for og:image and share links). */
  siteUrl: process.env.SITE_URL || 'https://callmemaybe-app.netlify.app',
  /** The existing app web build with /impressum and /datenschutz. */
  legalUrl: 'https://cmm-app.netlify.app',
  /** TestFlight public link or App Store link; null shows the waitlist. Mirrors content/links.ts. */
  downloadUrl: process.env.DOWNLOAD_URL || null,
};
/** QR target on print material: the landing page, tagged so scans show up separately. */
const QR_URL = `${CONFIG.siteUrl}/?utm_source=flyer&utm_medium=print`;
const SHORT_URL = CONFIG.siteUrl.replace(/^https?:\/\//, '');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIST = path.join(__dirname, 'dist');
const TMP = path.join(DIST, '.html');

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');

  // Landing page
  const landingDir = path.join(DIST, 'landing');
  fs.mkdirSync(landingDir, { recursive: true });
  fs.writeFileSync(path.join(landingDir, 'index.html'), landing({ ...CONFIG, logoSvg, ogImage: 'og-image.png' }));
  fs.copyFileSync(path.join(__dirname, '../assets/images/favicon.png'), path.join(landingDir, 'favicon.png'));
  fs.copyFileSync(path.join(__dirname, '../assets/images/icon.png'), path.join(landingDir, 'apple-touch-icon.png'));
  fs.writeFileSync(path.join(landingDir, 'netlify.toml'), NETLIFY_TOML);

  // Marketing assets
  const qrSvg = (await QRCode.toString(QR_URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B0B12', light: '#FFFFFF' } }))
    .replace('<svg ', '<svg width="100%" height="100%" ');
  const assets = kit({ logoSvg, qrSvg, shortUrl: SHORT_URL });

  for (const a of assets) {
    const outDir = path.join(DIST, 'kit', a.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const htmlPath = path.join(TMP, `${a.name}.html`);
    fs.writeFileSync(htmlPath, a.html);
    const png = path.join(outDir, `${a.name}.png`);
    await chrome([`--window-size=${a.w},${a.h}`, `--screenshot=${png}`, `file://${htmlPath}`], png);
    if (a.pdf) {
      // Print from the 300 dpi render: Chrome's PDF output drops blur and mask effects.
      const printPath = path.join(TMP, `${a.name}.print.html`);
      fs.writeFileSync(printPath, `<!doctype html><style>@page{size:${a.pdf.width} ${a.pdf.height};margin:0}html,body{margin:0}img{display:block;width:${a.pdf.width};height:${a.pdf.height}}</style><img src="file://${png}">`);
      const pdf = path.join(outDir, `${a.name}.pdf`);
      await chrome(['--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${printPath}`], pdf);
    }
    console.log('✓', path.relative(DIST, png));
  }

  // The landing page references its OG image next to index.html.
  fs.copyFileSync(path.join(DIST, 'kit/web/og-image.png'), path.join(landingDir, 'og-image.png'));
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\nLanding page: ${path.relative(process.cwd(), landingDir)}/index.html`);
  console.log(`QR code points to: ${QR_URL}`);
}

/**
 * One headless Chrome run with its own profile. Chrome sometimes keeps running
 * after writing its output, so wait for the file and then stop it.
 */
function chrome(args, output) {
  const profile = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cmm-chrome-'));
  const child = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`,
    '--virtual-time-budget=6000', '--run-all-compositor-stages-before-draw', ...args,
  ], { stdio: 'ignore' });
  let exited = false;
  child.on('exit', () => { exited = true; });
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let lastSize = -1;
    const tick = setInterval(() => {
      const size = fs.existsSync(output) ? fs.statSync(output).size : -1;
      const done = size > 0 && size === lastSize;
      lastSize = size;
      if (done || exited || Date.now() - started > 60000) {
        clearInterval(tick);
        if (!exited) child.kill('SIGKILL');
        setTimeout(() => fs.rm(profile, { recursive: true, force: true, maxRetries: 5 }, () => {}), 1000);
        size > 0 ? resolve() : reject(new Error(`Chrome produced no ${path.basename(output)}`));
      }
    }, 500);
  });
}

const NETLIFY_TOML = `# Deploy this folder as its own Netlify site (drag & drop or netlify deploy).
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
