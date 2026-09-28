/* global __dirname */
// Promotional images for the Wanna yap+ subscriptions in App Store Connect
// (1024×1024, opaque RGB, one distinct image per product).
//   node docs/brand/iap.js
// Writes marketing/static/iap/<product id>.png
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { mark, defs } = require('./logo');
const rgbPng = require('./rgbpng');

const OUT = path.join(__dirname, '..', '..', 'marketing/static/iap');
const SIZE = 1024;

const PRODUCTS = {
  wannayap_plus_monthly: { label: '1 MONAT', glow: '#00E5FF' },
  wannayap_plus_yearly: { label: '1 JAHR', glow: '#FFB547' },
};

/** Pink "+" badge with a dark rim, like the logo's dot. */
function plus(cx, cy, r) {
  const arm = r * 0.52, bar = r * 0.2;
  return `
  <circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="#FF2E93" filter="url(#soft)" opacity="0.7"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FF2E93" stroke="#0B0B12" stroke-width="${r * 0.14}"/>
  <rect x="${cx - arm}" y="${cy - bar / 2}" width="${arm * 2}" height="${bar}" rx="${bar / 2}" fill="#FFFFFF"/>
  <rect x="${cx - bar / 2}" y="${cy - arm}" width="${bar}" height="${arm * 2}" rx="${bar / 2}" fill="#FFFFFF"/>`;
}

function image({ label, glow }) {
  const cx = SIZE / 2, cy = SIZE * 0.43, r = SIZE * 0.26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${defs(SIZE)}
  <radialGradient id="accent" cx="0.5" cy="0.95" r="0.55">
    <stop offset="0" stop-color="${glow}" stop-opacity="0.28"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glowC)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glowP)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#accent)"/>
  ${mark(cx, cy, r)}
  ${plus(cx + r * 0.78, cy + r * 0.78, r * 0.3)}
  <text x="${cx}" y="${SIZE * 0.87}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial" font-weight="700" font-size="${SIZE * 0.085}" letter-spacing="${SIZE * 0.012}" fill="#F4F4FA">${label}</text>
</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [id, spec] of Object.entries(PRODUCTS)) {
  const r = new Resvg(image(spec), { fitTo: { mode: 'width', value: SIZE }, font: { loadSystemFonts: true } }).render();
  const file = path.join(OUT, `${id}.png`);
  fs.writeFileSync(file, rgbPng(r.pixels, r.width, r.height));
  console.log(path.relative(process.cwd(), file));
}
