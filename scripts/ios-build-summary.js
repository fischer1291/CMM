#!/usr/bin/env node
/**
 * Turns the JSON of `eas build --json` into the summary of the iOS-Build run
 * on GitHub: which build number, whether it reached App Store Connect, links.
 *
 *   node scripts/ios-build-summary.js build.json [--eas-ok] >> "$GITHUB_STEP_SUMMARY"
 *   node scripts/ios-build-summary.js build.json [--eas-ok] --outputs >> "$GITHUB_OUTPUT"
 *
 * --outputs prints version=… and build=… of the finished build (empty when
 * none finished) for the tag ios/v<version>-b<build> and the GitHub release.
 *
 * `eas build --json` prints the builds as they were when it started waiting
 * (status NEW, submission AWAITING_BUILD), not when it is done. It only exits
 * 0 after the build finished and, with --auto-submit, the upload too; the
 * workflow passes --eas-ok in that case, and the stale states count as done.
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
const PENDING_BUILD = ['NEW', 'IN_QUEUE', 'IN_PROGRESS'];
const PENDING_SUBMIT = ['AWAITING_BUILD', 'IN_QUEUE', 'IN_PROGRESS'];

/** The builds as eas left them; with easOk, what was still pending when it started waiting is done. */
function settle(builds, { easOk = false } = {}) {
  if (!easOk) return builds;
  return builds.map((b) => ({
    ...b,
    status: PENDING_BUILD.includes(b.status) ? 'FINISHED' : b.status,
    submissions: (b.submissions ?? []).map((s) => ({ ...s, status: PENDING_SUBMIT.includes(s.status) ? 'FINISHED' : s.status })),
  }));
}

/** version and build of the finished build, or empty strings. */
function outputs(builds, options) {
  const done = settle(builds, options).find((b) => b.status === 'FINISHED' && b.appVersion && b.appBuildVersion);
  return { version: done?.appVersion ?? '', build: done?.appBuildVersion ?? '' };
}

/** The Markdown summary of the run. */
function summary(builds, options) {
  const lines = ['## iOS-Build', ''];
  if (!builds.length) {
    lines.push(`Kein Ergebnis von EAS. Der Grund steht im Log dieses Laufs, alle Builds: ${PROJECT}/builds`);
  }
  for (const b of settle(builds, options)) {
    lines.push(`**Wanna yap? ${b.appVersion ?? '?'} (Build ${b.appBuildVersion ?? '?'})**`, '');
    lines.push(`- Build: ${BUILD_STATUS[b.status] ?? b.status} · ${PROJECT}/builds/${b.id}`);
    if (b.error?.message) lines.push(`  - ${b.error.message}`);
    for (const s of b.submissions ?? []) {
      lines.push(`- Upload: ${SUBMIT_STATUS[s.status] ?? s.status} · ${PROJECT}/submissions/${s.id}`);
      if (s.error?.message) lines.push(`  - ${s.error.message}`);
    }
    if (!b.submissions?.length) lines.push(`- Upload: ${b.status === 'FINISHED' ? 'nicht gewählt' : 'keiner, der Build wurde nicht fertig'}`);
  }
  return lines.join('\n');
}

if (require.main === module) {
  let builds = [];
  try {
    builds = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  } catch {
    // eas stopped before printing JSON: the log above says why
  }
  const options = { easOk: process.argv.includes('--eas-ok') };
  if (process.argv.includes('--outputs')) {
    const o = outputs(builds, options);
    console.log(`version=${o.version}`);
    console.log(`build=${o.build}`);
  } else {
    console.log(summary(builds, options));
  }
}

module.exports = { settle, outputs, summary };
