// eslint-disable-next-line @typescript-eslint/no-require-imports
const { outputs, summary } = require('../scripts/ios-build-summary.js');

// What `eas build --json --auto-submit` printed in run #7 (build 25): the state
// from before it waited, although it then waited for build and upload
const stale = [
  {
    id: 'f833209d',
    status: 'NEW',
    appVersion: '1.0.0',
    appBuildVersion: '25',
    submissions: [{ id: '09385593', status: 'AWAITING_BUILD' }],
  },
];

test('eas exited 0: the stale states count as done, the tag gets its build number', () => {
  expect(outputs(stale, { easOk: true })).toEqual({ version: '1.0.0', build: '25' });
  const text = summary(stale, { easOk: true });
  expect(text).toContain('Build 25');
  expect(text).toContain('✅ fertig');
  expect(text).toContain('✅ bei App Store Connect');
});

test('eas failed: nothing counts as finished, no tag', () => {
  expect(outputs(stale, { easOk: false })).toEqual({ version: '', build: '' });
  expect(summary(stale)).toContain('⏳ angelegt');
});

test('an errored build stays errored even when eas exited 0', () => {
  const errored = [{ ...stale[0], status: 'ERRORED', error: { message: 'Pod install failed' }, submissions: [] }];
  expect(outputs(errored, { easOk: true })).toEqual({ version: '', build: '' });
  expect(summary(errored, { easOk: true })).toContain('Pod install failed');
});

test('no JSON from eas: the summary says where to look', () => {
  expect(summary([])).toContain('Kein Ergebnis von EAS');
});
