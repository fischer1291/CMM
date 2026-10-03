#!/usr/bin/env node
/**
 * Turns the JSON of `eas build --json` into the summary of the iOS-Build run
 * on GitHub: which build number, whether it reached App Store Connect, links.
 *
 *   node scripts/ios-build-summary.js build.json >> "$GITHUB_STEP_SUMMARY"
 *   node scripts/ios-build-summary.js build.json --outputs >> "$GITHUB_OUTPUT"
 *
 * --outputs prints version=… and build=… of the finished build (empty when
 * none finished) for the tag ios/v<version>-b<build> and the GitHub release.
 */
const fs = require('fs');

const PROJECT = 'https://expo.dev/accounts/schly21/projects/kontaktliste-app';
const BUILD_STATUS = {
  FINISHED: '✅ fertig',
  ERRORED: '❌ fehlgeschlagen',
  CANCELED: '⏹ abgebrochen',
  IN_QUEUE: '⏳ in der Warteschlange',
  IN_PROGRESS: '⏳ läuft',
  NEW: '⏳ angelegt',
};
const SUBMIT_STATUS = {
  FINISHED: '✅ bei App Store Connect, erscheint nach Apples Verarbeitung in TestFlight',
  ERRORED: '❌ Upload fehlgeschlagen',
  CANCELED: '⏹ abgebrochen',
  IN_QUEUE: '⏳ wartet',
  IN_PROGRESS: '⏳ läuft',
  AWAITING_BUILD: '⏳ wartet auf den Build',
};

let builds = [];
try {
  builds = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
} catch {
  // eas stopped before printing JSON: the log above says why
}

if (process.argv.includes('--outputs')) {
  const done = builds.find((b) => b.status === 'FINISHED' && b.appVersion && b.appBuildVersion);
  console.log(`version=${done?.appVersion ?? ''}`);
  console.log(`build=${done?.appBuildVersion ?? ''}`);
  process.exit(0);
}

const lines = ['## iOS-Build', ''];
if (!builds.length) {
  lines.push(`Kein Ergebnis von EAS. Der Grund steht im Log dieses Laufs, alle Builds: ${PROJECT}/builds`);
}
for (const b of builds) {
  lines.push(`**Wanna yap? ${b.appVersion ?? '?'} (Build ${b.appBuildVersion ?? '?'})**`, '');
  lines.push(`- Build: ${BUILD_STATUS[b.status] ?? b.status} · ${PROJECT}/builds/${b.id}`);
  if (b.error?.message) lines.push(`  - ${b.error.message}`);
  for (const s of b.submissions ?? []) {
    lines.push(`- Upload: ${SUBMIT_STATUS[s.status] ?? s.status} · ${PROJECT}/submissions/${s.id}`);
    if (s.error?.message) lines.push(`  - ${s.error.message}`);
  }
  if (!b.submissions?.length) lines.push(`- Upload: ${b.status === 'FINISHED' ? 'nicht gewählt' : 'keiner, der Build wurde nicht fertig'}`);
}
console.log(lines.join('\n'));
