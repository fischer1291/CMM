#!/usr/bin/env node
/**
 * OTA updates may only reach builds whose native side matches. runtimeVersion
 * stays an explicit string (app.config.js and Expo.plist, see
 * scripts/version.js), so this script is the guard: it computes the native
 * fingerprint (expo-updates fingerprint:generate, @expo/fingerprint, options
 * in fingerprint.config.js) and compares it with ios/fingerprint.json. When the
 * fingerprint changed but runtimeVersion did not, CI and the OTA workflow stop:
 * a Store build with a higher runtimeVersion is needed, not an OTA. A bumped
 * runtimeVersion without a rewritten file stops them too (stale). The
 * fingerprint is always computed for the production variant: app.config.js
 * switches bundle id and scheme on APP_VARIANT (docs/DEV_SETUP.md), and
 * @expo/fingerprint reads .env/.env.local, so without a pinned env a local
 * --write after a native change could store the development hash that CI
 * then rejects. eas.json is left out (fingerprint.config.js), so a new env
 * variable there never asks for a runtimeVersion bump.
 *
 *   node scripts/fingerprint.js          check (CI, ota-update.yml)
 *   node scripts/fingerprint.js --write  store the current fingerprint with the
 *                                        current runtimeVersion (after a native
 *                                        change and the runtimeVersion bump)
 */
/* global __dirname */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const STORED = path.join(root, 'ios/fingerprint.json');

function runtimeVersion() {
  const config = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');
  const m = config.match(/\n\s*runtimeVersion: '([^']+)'/);
  if (!m) throw new Error('runtimeVersion in app.config.js muss eine Zeichenkette sein (siehe scripts/version.js)');
  return m[1];
}

// The variant the fingerprint is computed for, whatever the shell or .env say
const VARIANT = 'production';

function generate() {
  const out = execFileSync('npx', ['expo-updates', 'fingerprint:generate', '--platform', 'ios'], {
    cwd: root,
    env: { ...process.env, APP_VARIANT: VARIANT, NODE_ENV: 'production' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out).hash;
}

/**
 * Pure comparison, used by the tests. The stored file must always name the
 * current runtimeVersion: a bump without `--write` would otherwise pass for
 * good and let every later native change through unnoticed.
 */
function compare({ hash, runtime, stored }) {
  if (!stored) return { ok: false, reason: 'missing' };
  if (runtime !== stored.runtimeVersion) return { ok: false, reason: 'stale' };
  if (hash === stored.hash) return { ok: true, reason: 'same' };
  return { ok: false, reason: 'drift' };
}

function main() {
  const write = process.argv.includes('--write');
  const runtime = runtimeVersion();
  const hash = generate();
  if (write) {
    fs.writeFileSync(STORED, JSON.stringify({ runtimeVersion: runtime, hash, platform: 'ios' }, null, 2) + '\n');
    console.log(`✔ ios/fingerprint.json geschrieben: ${hash} für runtimeVersion ${runtime} (Variante ${VARIANT})`);
    return;
  }
  let stored = null;
  try {
    stored = JSON.parse(fs.readFileSync(STORED, 'utf8'));
  } catch {
    // handled below
  }
  const result = compare({ hash, runtime, stored });
  if (result.reason === 'missing') {
    console.error('✖ ios/fingerprint.json fehlt. Einmal schreiben mit: node scripts/fingerprint.js --write');
    process.exit(1);
  }
  if (result.reason === 'drift') {
    console.error(
      `✖ Native Abhängigkeiten haben sich geändert (Fingerprint ${hash}, gespeichert ${stored.hash}, Variante ${VARIANT}), runtimeVersion ist aber noch ${runtime}.\n` +
        '  Ein OTA-Update würde auf alten Builds nicht laufen. Deshalb: runtimeVersion erhöhen (runtimeVersion in app.config.js und ' +
        'EXUpdatesRuntimeVersion in ios/CallMeMaybe/Supporting/Expo.plist, dann node scripts/version.js) und ios/fingerprint.json ' +
        'neu schreiben (node scripts/fingerprint.js --write). Danach braucht es einen Store-Build, kein OTA (docs/RELEASE.md).'
    );
    process.exit(1);
  }
  if (result.reason === 'stale') {
    console.error(
      `✖ runtimeVersion ist jetzt ${runtime}, ios/fingerprint.json nennt ${stored.runtimeVersion}: ` +
        'node scripts/fingerprint.js --write ausführen und mitcommitten, damit der Fingerprint zur neuen Runtime gehört.'
    );
    process.exit(1);
  }
  console.log(`✔ Fingerprint ${hash} passt zu runtimeVersion ${runtime} (Variante ${VARIANT})`);
}

module.exports = { compare, VARIANT };
if (require.main === module) main();
