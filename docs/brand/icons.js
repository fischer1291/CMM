/* global __dirname */
// Alternate app icons (Wanna yap+): colour variants of the brand icon.
//   node docs/brand/icons.js
// Writes ios/CallMeMaybe/Images.xcassets/AppIcon-<Name>.appiconset and a
// small preview per icon for the picker in the app (assets/images/icons).
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { icon } = require('./logo');
const rgbPng = require('./rgbpng');

const APP = path.join(__dirname, '..', '..');

// Colour swaps on the default icon: ring gradient, background, glows
const VARIANTS = {
  Sunset: { '#00E5FF': '#FFB547', '#8B5CFF': '#FF6A3D', '#FF2E93': '#FF2E93', '#171727': '#26141C', '#0B0B12': '#120A0E' },
  Ocean: { '#00E5FF': '#3DF5A7', '#8B5CFF': '#00B4FF', '#FF2E93': '#3B6BFF', '#171727': '#0F1E2E', '#0B0B12': '#07111C' },
  Lilac: { '#00E5FF': '#E0B3FF', '#8B5CFF': '#8B5CFF', '#FF2E93': '#5B2BD9', '#171727': '#1A1330', '#0B0B12': '#0E0A1C' },
  Mono: { '#00E5FF': '#FFFFFF', '#8B5CFF': '#A6A6BF', '#FF2E93': '#6C6C88', '#171727': '#1A1A1F', '#0B0B12': '#0B0B0D' },
};

function variant(svg, swaps) {
  let out = svg;
  for (const [from, to] of Object.entries(swaps)) out = out.split(from).join(to);
  return out;
}

const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render();

fs.mkdirSync(path.join(APP, 'assets/images/icons'), { recursive: true });
for (const [name, swaps] of Object.entries(VARIANTS)) {
  const svg = variant(icon(1024), swaps);
  const dir = path.join(APP, `ios/CallMeMaybe/Images.xcassets/AppIcon-${name}.appiconset`);
  fs.mkdirSync(dir, { recursive: true });
  const big = render(svg, 1024);
  fs.writeFileSync(path.join(dir, 'icon-1024.png'), rgbPng(big.pixels, big.width, big.height));
  fs.writeFileSync(
    path.join(dir, 'Contents.json'),
    JSON.stringify({ images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n'
  );
  fs.writeFileSync(path.join(APP, `assets/images/icons/${name.toLowerCase()}.png`), render(svg, 180).asPng());
  console.log('icon', name);
}
