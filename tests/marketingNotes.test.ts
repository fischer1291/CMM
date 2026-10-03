// Plan 2.11: the owner's notes from the Monday review reach the marketing agent.
// prompt.js itself pulls in the agent's own dependencies (marketing/package.json),
// so the section is tested directly and the wiring through the source.
import fs from 'fs';
import path from 'path';
import { notesSection, MAX_NOTES } from '../marketing/agent/notes';

const AGENT = path.join(__dirname, '../marketing/agent');

test('no notes, no section', () => {
  expect(notesSection(null)).toBe('');
  expect(notesSection(undefined)).toBe('');
  expect(notesSection('   \n ')).toBe('');
  expect(notesSection(42)).toBe('');
});

test('notes come as their own section that takes precedence over own ideas', () => {
  const out = notesSection('  Hook-Thema: Sonntagsanruf bei Oma\nKanal: mehr TikTok  ');
  expect(out.startsWith('# Hinweise des Owners für diese Woche\n')).toBe(true);
  expect(out).toContain('Vorrang vor deinen eigenen Themenideen');
  expect(out).toContain('Hook-Thema: Sonntagsanruf bei Oma\nKanal: mehr TikTok\n');
  // Ends with a blank line, so the next heading of the prompt stays separate
  expect(out.endsWith('\n\n')).toBe(true);
});

test('notes are cut at the length the console allows', () => {
  const out = notesSection('x'.repeat(MAX_NOTES + 50));
  expect(out).toContain('x'.repeat(MAX_NOTES));
  expect(out).not.toContain('x'.repeat(MAX_NOTES + 1));
});

test('both agent prompts pass context.notes into the user prompt', () => {
  for (const file of ['prompt.js', 'hero-prompt.js']) {
    const source = fs.readFileSync(path.join(AGENT, file), 'utf8');
    expect(source).toContain("require('./notes')");
    expect(source).toContain('${notesSection(context.notes)}');
  }
});
