/* global __dirname */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { icon, markOnly } = require('./logo');
const rgbPng = require('./rgbpng');
const opaque = (svg, width) => { const r = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render(); return rgbPng(r.pixels, r.width, r.height); };
const APP = path.join(__dirname, '..', '..');
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
const write = (rel, buf) => { fs.writeFileSync(path.join(APP, rel), buf); console.log(rel, buf.length); };

// App icon (opaque) for Expo config and the native iOS asset catalog
write('assets/images/icon.png', opaque(icon(1024), 1024));
write('ios/CallMeMaybe/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png', opaque(icon(1024), 1024));
write('assets/images/favicon.png', png(icon(1024), 196));
// Android adaptive icon: foreground mark on transparent, background colour in app.config
write('assets/images/adaptive-icon.png', png(markOnly(1024), 1024));
// Splash logo: 200 pt wide on the #0B0B12 splash background
write('assets/images/splash-icon.png', png(markOnly(600), 600));
for (const [suffix, w] of [['', 200], ['@2x', 400], ['@3x', 600]]) {
  write(`ios/CallMeMaybe/Images.xcassets/SplashScreenLogo.imageset/image${suffix}.png`, png(markOnly(600), w));
}
