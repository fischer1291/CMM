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

test('the policy names what the invite link brings: the inviter, the device language and the waitlist platform', () => {
  const contacts = PRIVACY_SECTIONS.find((s) => s.title === 'Kontakte')!.paragraphs.join(' ');
  expect(contacts).toContain('wer dich eingeladen hat');
  expect(contacts).toContain('sie sieht nur die Anzahl');
  const usage = PRIVACY_SECTIONS.find((s) => s.title === 'Nutzungsstatistik, Support und Moderation')!.paragraphs.join(' ');
  expect(usage).toContain('Sprache deines Geräts');
  // plan 1.13: User.research (invited, booked, dismissed, done) and the cal.com booking page with ?name=
  expect(usage).toContain('Gespräch mit dem Gründer');
  expect(usage).toContain('cal.com');
  expect(usage).toContain('Profilnamen vorbelegt');
  const waitlist = PRIVACY_SECTIONS.find((s) => s.title === 'Warteliste auf wannayap.app')!.paragraphs.join(' ');
  expect(waitlist).toContain('iPhone oder ein Android-Gerät');
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
