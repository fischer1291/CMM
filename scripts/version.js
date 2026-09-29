#!/usr/bin/env node
/**
 * The app version (1.0.0, 1.0.1, …) lives in two files, because the iOS
 * project is committed (no prebuild): app.config.js and the Info.plist, which
 * is what App Store Connect reads. The runtime version for OTA updates is
 * likewise in app.config.js and Expo.plist. This keeps them together.
 *
 *   node scripts/version.js          check: both files agree (CI, iOS-Build)
 *   node scripts/version.js 1.0.1    set the next App Store version in both
 *
 * The build number (23, 24, …) is not here: EAS counts it
 * (appVersionSource: remote) and writes it into the build.
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = {
  config: path.join(root, 'app.config.js'),
  plist: path.join(root, 'ios/CallMeMaybe/Info.plist'),
  expoPlist: path.join(root, 'ios/CallMeMaybe/Supporting/Expo.plist'),
};
const read = (f) => fs.readFileSync(f, 'utf8');
const configField = (src, key) => src.match(new RegExp(`\\n\\s*${key}: '([^']+)'`))?.[1];
const plistRe = (key) => new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);
const plistField = (src, key) => src.match(plistRe(key))?.[2];

function current() {
  const config = read(FILES.config);
  const plist = read(FILES.plist);
  const expoPlist = read(FILES.expoPlist);
  return {
    version: configField(config, 'version'),
    plistVersion: plistField(plist, 'CFBundleShortVersionString'),
    runtime: configField(config, 'runtimeVersion'),
    plistRuntime: plistField(expoPlist, 'EXUpdatesRuntimeVersion'),
  };
}

function check() {
  const v = current();
  const problems = [];
  if (!v.version || v.version !== v.plistVersion) {
    problems.push(`Version: app.config.js sagt ${v.version}, Info.plist ${v.plistVersion}. Angleichen mit: node scripts/version.js <version>`);
  }
  if (!v.runtime || v.runtime !== v.plistRuntime) {
    problems.push(`runtimeVersion: app.config.js sagt ${v.runtime}, Expo.plist ${v.plistRuntime}.`);
  }
  if (problems.length) {
    for (const p of problems) console.error(`✖ ${p}`);
    process.exit(1);
  }
  console.log(`✔ Version ${v.version} (runtime ${v.runtime}); die Build-Nummer vergibt EAS`);
}

function set(next) {
  if (!/^\d+\.\d+\.\d+$/.test(next)) {
    console.error('Version wie 1.0.1 angeben');
    process.exit(1);
  }
  const config = read(FILES.config).replace(/(\n\s*version: ')[^']+(')/, `$1${next}$2`);
  const plist = read(FILES.plist).replace(plistRe('CFBundleShortVersionString'), `$1${next}$3`);
  fs.writeFileSync(FILES.config, config);
  fs.writeFileSync(FILES.plist, plist);
  console.log(`Version ${next} gesetzt (app.config.js und Info.plist)`);
  check();
}

if (process.argv[2]) set(process.argv[2]);
else check();
