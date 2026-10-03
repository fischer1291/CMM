import fs from 'fs';
import path from 'path';
import { compare, VARIANT } from '../scripts/fingerprint.js';

const stored = { runtimeVersion: '1.0.0', hash: 'aaa' };

test('same fingerprint passes, drift without a runtimeVersion bump fails', () => {
  expect(compare({ hash: 'aaa', runtime: '1.0.0', stored })).toEqual({ ok: true, reason: 'same' });
  expect(compare({ hash: 'bbb', runtime: '1.0.0', stored })).toEqual({ ok: false, reason: 'drift' });
  expect(compare({ hash: 'aaa', runtime: '1.0.0', stored: null })).toEqual({ ok: false, reason: 'missing' });
});

test('a bumped runtimeVersion without a rewritten ios/fingerprint.json fails, whatever the hash', () => {
  expect(compare({ hash: 'bbb', runtime: '1.0.1', stored })).toEqual({ ok: false, reason: 'stale' });
  expect(compare({ hash: 'aaa', runtime: '1.0.1', stored })).toEqual({ ok: false, reason: 'stale' });
  // after --write the file names the new runtime and the guard works again
  const rewritten = { runtimeVersion: '1.0.1', hash: 'bbb' };
  expect(compare({ hash: 'bbb', runtime: '1.0.1', stored: rewritten })).toEqual({ ok: true, reason: 'same' });
  expect(compare({ hash: 'ccc', runtime: '1.0.1', stored: rewritten })).toEqual({ ok: false, reason: 'drift' });
});

test('the stored fingerprint names the runtimeVersion from app.config.js', () => {
  const root = path.join(__dirname, '..');
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'ios/fingerprint.json'), 'utf8'));
  const config = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');
  expect(saved.runtimeVersion).toBe(config.match(/\n\s*runtimeVersion: '([^']+)'/)![1]);
  expect(saved.hash).toMatch(/^[0-9a-f]{40}$/);
});

test('the fingerprint is always the production variant and ignores eas.json', () => {
  expect(VARIANT).toBe('production');
  const config = require('../fingerprint.config.js');
  expect(config.ignorePaths).toEqual(expect.arrayContaining(['eas.json', 'ios/fingerprint.json']));
});
