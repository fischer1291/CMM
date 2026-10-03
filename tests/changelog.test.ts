import fs from 'fs';
import path from 'path';
import { section } from '../scripts/changelog-section.js';

const sample = `# Changelog

## [Unreleased]

- offen

## [1.0.1] – 2026-11-01

### Behoben

- Anruf-Ton

## [1.0.0] – 2026-10-01

- Start
`;

test('extracts exactly the section of one version', () => {
  expect(section(sample, '1.0.1')).toBe('### Behoben\n\n- Anruf-Ton');
  expect(section(sample, '1.0.0')).toBe('- Start');
  expect(section(sample, '1.0.2')).toBeNull();
  // "1.0.1" must not match "11.0.1" or "1.0.10"
  expect(section('## [1.0.10]\n\n- zehn\n', '1.0.1')).toBeNull();
});

test('the real changelog has Unreleased and 1.0.0', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  expect(md).toMatch(/^## \[Unreleased\]/m);
  expect(section(md, '1.0.0')).toBeTruthy();
});
