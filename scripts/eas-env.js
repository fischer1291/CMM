#!/usr/bin/env node
/**
 * eas update does not read the env of eas.json: that block applies "during the
 * build process" only, and an OTA is an export, not a build. Without it the JS
 * bundle would ship with EXPO_PUBLIC_REVENUECAT_IOS_KEY empty and switch
 * purchases off for everyone. So ota-update.yml exports the env of the build
 * profile that owns the channel (profile name = channel name) before eas
 * update, from this one source, and CI checks that every EXPO_PUBLIC_* the
 * code reads without a production default is set there, identically for
 * preview and production.
 *
 *   node scripts/eas-env.js production        print KEY=value lines ($GITHUB_ENV)
 *   node scripts/eas-env.js --check           preview and production complete
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'config', 'contexts', 'hooks', 'lib', 'services', 'utils', 'features', 'ui'];
const OTA_PROFILES = ['preview', 'production'];
// Variables that come from a secret store, not from eas.json: EAS environment
// variables for builds, a GitHub Actions secret for OTA bundles
// (ota-update.yml). Missing means the feature stays off, the bundle still runs.
const SECRET_KEYS = { EXPO_PUBLIC_SENTRY_DSN: 'ohne DSN bleibt Sentry aus' };
// Variables that are meant to differ between preview and production
const PROFILE_SPECIFIC = ['EXPO_PUBLIC_SENTRY_ENV'];

/** Env block of one build profile in eas.json. */
function profileEnv(profile, eas = readEas()) {
  const p = eas.build?.[profile];
  if (!p) throw new Error(`eas.json kennt kein Build-Profil "${profile}"`);
  return p.env ?? {};
}

function readEas() {
  return JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
}

/**
 * EXPO_PUBLIC_* variables the source reads, with whether the line falls back
 * to a real value (`?? 'https://…'`); `|| ''` or no fallback means required.
 * Pure, used by the tests.
 */
function referencedKeys(sources) {
  const keys = new Map();
  for (const src of sources) {
    for (const line of src.split('\n')) {
      const re = /process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(line))) {
        const rest = line.slice(m.index + m[0].length);
        const hasDefault = /^\s*\?\?\s*(['"`])(?!\1)/.test(rest);
        keys.set(m[1], (keys.get(m[1]) ?? false) || hasDefault);
      }
    }
  }
  return keys;
}

function listSources(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSources(p));
    else if (/\.(ts|tsx|js)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(fs.readFileSync(p, 'utf8'));
  }
  return out;
}

/** Problems with the OTA profiles' env, as German lines; empty when fine. Pure. */
function check(eas, referenced) {
  const problems = [];
  const envs = OTA_PROFILES.map((p) => [p, eas.build?.[p]?.env ?? {}]);
  const required = [...referenced].filter(([k, hasDefault]) => !hasDefault && !(k in SECRET_KEYS)).map(([k]) => k);
  for (const [profile, env] of envs) {
    for (const key of required) {
      if (!env[key]) problems.push(`eas.json build.${profile}.env: ${key} fehlt (der Code hat dafür keinen Produktionswert)`);
    }
  }
  const [[, a], [, b]] = envs;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!(key in a) || !(key in b)) problems.push(`eas.json: ${key} steht nur in einem der Profile preview/production`);
    else if (key.startsWith('EXPO_PUBLIC_') && !PROFILE_SPECIFIC.includes(key) && a[key] !== b[key]) problems.push(`eas.json: ${key} unterscheidet sich zwischen preview und production`);
  }
  return problems;
}

function main() {
  const arg = process.argv[2];
  if (arg === '--check') {
    const referenced = referencedKeys(SOURCE_DIRS.flatMap((d) => listSources(path.join(root, d))));
    const problems = check(readEas(), referenced);
    if (problems.length) {
      console.error('✖ Die Build-Umgebung in eas.json ist unvollständig; ein OTA-Bundle würde ohne diese Werte laufen:');
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log(`✔ eas.json: ${OTA_PROFILES.join(' und ')} setzen ${[...referenced.keys()].filter((k) => !referenced.get(k) && !(k in SECRET_KEYS)).join(', ')}`);
    for (const [k, note] of Object.entries(SECRET_KEYS)) {
      if (referenced.has(k)) console.log(`  ${k} kommt aus einem Secret (${note})`);
    }
    return;
  }
  if (!arg || !OTA_PROFILES.includes(arg)) {
    console.error(`Aufruf: node scripts/eas-env.js <${OTA_PROFILES.join('|')}> | --check`);
    process.exit(2);
  }
  for (const [k, v] of Object.entries(profileEnv(arg))) {
    if (/[\n\r]/.test(String(v))) throw new Error(`${k} enthält einen Zeilenumbruch`);
    console.log(`${k}=${v}`);
  }
}

module.exports = { profileEnv, referencedKeys, check, OTA_PROFILES, SECRET_KEYS, PROFILE_SPECIFIC };
if (require.main === module) main();
