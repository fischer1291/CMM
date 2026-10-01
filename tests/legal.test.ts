import { canStart } from '../features/auth/OnboardingView';
import { MIN_AGE, PRIVACY_SECTIONS, PRIVACY_UPDATED, TERMS_VERSION } from '../content/legal';

const titles = PRIVACY_SECTIONS.map((s) => s.title);

test('the privacy policy covers purchases, mail, the contact hashes and the minimum age', () => {
  expect(titles).toEqual(expect.arrayContaining(['Wanna yap+ und Käufe', 'E-Mail-Versand', 'Kontakte', 'Mindestalter']));
  const contacts = PRIVACY_SECTIONS.find((s) => s.title === 'Kontakte')!.paragraphs.join(' ');
  expect(contacts).toContain('SHA-256');
  expect(contacts).toContain('pseudonym, nicht anonym');
  expect(PRIVACY_SECTIONS.find((s) => s.title === 'Mindestalter')!.paragraphs.join(' ')).toContain(`ab ${MIN_AGE} Jahren`);
  // every field models/SubscriptionEvent.js keeps per user is named
  const purchases = PRIVACY_SECTIONS.find((s) => s.title === 'Wanna yap+ und Käufe')!.paragraphs.join(' ');
  for (const named of ['Produkt', 'Status', 'Laufzeit', 'Preis', 'Währung', 'Kündigungsgrund', 'Angebot', 'Testkauf', 'Gerätewechsel']) {
    expect(purchases).toContain(named);
  }
});

test('the policy date and the terms version are the October 2026 revision', () => {
  expect(PRIVACY_UPDATED).toBe('1. Oktober 2026');
  expect(PRIVACY_SECTIONS.find((s) => s.title === 'Stand')!.paragraphs).toEqual([PRIVACY_UPDATED]);
  expect(TERMS_VERSION).toBe('2026-10-01');
  expect(MIN_AGE).toBe(16);
});

test('onboarding only starts with the age box ticked', () => {
  expect(canStart(false)).toBe(false);
  expect(canStart(true)).toBe(true);
});
