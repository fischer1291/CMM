#!/usr/bin/env node
/**
 * Prints the CHANGELOG.md section of one version, for the GitHub release the
 * iOS-Build workflow creates after a successful build. Without a section the
 * release gets a short hint instead of failing: a missing changelog entry must
 * not block TestFlight.
 *
 *   node scripts/changelog-section.js 1.0.1 [CHANGELOG.md]
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');

/** The body under "## [version]" up to the next "## " heading, trimmed; null when absent. */
function section(markdown, version) {
  const lines = markdown.split('\n');
  const heading = new RegExp(`^## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end).join('\n').trim();
  return body || null;
}

function main() {
  const version = process.argv[2];
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
    console.error('Version wie 1.0.1 angeben');
    process.exit(1);
  }
  const file = process.argv[3] || path.join(__dirname, '..', 'CHANGELOG.md');
  const body = section(fs.readFileSync(file, 'utf8'), version);
  console.log(body || `Kein Abschnitt für ${version} in CHANGELOG.md. Bitte nachtragen; die Regeln stehen in docs/RELEASE.md.`);
}

module.exports = { section };
if (require.main === module) main();
