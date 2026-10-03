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

test('the policy names the crash reports: Sentry, pseudonymous key, EU, 90 days (plan 2.1a)', () => {
  const crashes = PRIVACY_SECTIONS.find((s) => s.title === 'Absturzberichte')!.paragraphs.join(' ');
  for (const named of ['Sentry', 'Prüfwert (Hash)', 'Europäischen Union', '90 Tage', 'keine Telefonnummern', 'Art. 6 Abs. 1 lit. f']) {
    expect(crashes).toContain(named);
  }
  // only what the code backs: no deletion at Sentry on account deletion (there is no such path)
  expect(crashes).not.toContain('bei der Löschung deines Kontos');
  expect(crashes).toContain('schreib uns');
  // the key is an unsalted hash of the number: pseudonymous, never claimed irreversible
  expect(crashes).not.toContain('nicht zu deiner Nummer zurückrechnen');
  expect(crashes).not.toContain('nicht lesbar');
  expect(crashes).toContain('pseudonym, nicht anonym');
  expect(crashes).toContain('durch Durchprobieren');
  // sessions are sent without an error (enableAutoSessionTracking), TestFlight builds send too
  expect(crashes).toContain('bei jedem Start');
  expect(crashes).toContain('ohne Absturz');
  expect(crashes).toContain('App Store und TestFlight');
  // crash reports are no tracking: the statement in the usage section still holds
  const usage = PRIVACY_SECTIONS.find((s) => s.title === 'Nutzungsstatistik, Support und Moderation')!.paragraphs.join(' ');
  expect(usage).toContain('kein Tracking-SDK');
  // the summary does not promise "no outside service at all" (session pings go to Sentry)
  const summary = PRIVACY_SECTIONS.find((s) => s.title === 'Kurz gesagt')!.paragraphs.join(' ');
  expect(summary).toContain('Absturzberichte');
});

test('the policy names the device list and the question for recycled numbers (plan 2.9)', () => {
  const devices = PRIVACY_SECTIONS.find((s) => s.title === 'Angemeldete Geräte und neu vergebene Nummern')!.paragraphs.join(' ');
  // what User.devices and User.lastVerifiedAt keep, and what never goes there
  for (const named of ['IDFV', 'Modell', 'Plattform', 'App-Version', 'zuletzt aktiv', 'bis zu 10 Geräte', 'zuletzt per SMS bestätigt', 'Eine Werbe-ID nutzen wir nicht']) {
    expect(devices).toContain(named);
  }
  expect(devices).toContain('Überall abmelden');
  expect(devices).toContain('Neue Anmeldung');
  // the question: after 180 days, first name, picture, month; "no" deletes and keeps a copy 30 days for support
  for (const named of ['180 Tagen', 'Vornamen', 'Profilbild', 'Monat der letzten Aktivität', 'Ist das dein Konto?', '30 Tage', 'Support']) {
    expect(devices).toContain(named);
  }
  const usage = PRIVACY_SECTIONS.find((s) => s.title === 'Nutzungsstatistik, Support und Moderation')!.paragraphs.join(' ');
  expect(usage).toContain('Gerätekennung und das Modell');
});

test('the policy date and the terms version are the October 2026 revision', () => {
  expect(PRIVACY_UPDATED).toBe('3. Oktober 2026');
  expect(PRIVACY_SECTIONS.find((s) => s.title === 'Stand')!.paragraphs).toEqual([PRIVACY_UPDATED]);
  expect(TERMS_VERSION).toBe('2026-10-01');
  expect(MIN_AGE).toBe(16);
});

test('onboarding only starts with the age box ticked', () => {
  expect(canStart(false)).toBe(false);
  expect(canStart(true)).toBe(true);
});

test('the policy names the question where people heard of us (plan 2.10)', () => {
  const section = PRIVACY_SECTIONS.find((s) => s.title === 'Woher du uns kennst')!.paragraphs.join(' ');
  for (const named of ['freiwillig', 'Überspringen', 'Android-Handy', 'Einladungscode', 'Kampagne', 'Art. 6 Abs. 1 lit. f', 'nicht an Dritte', 'mit deinem Konto gelöscht']) {
    expect(section).toContain(named);
  }
  expect(section).toContain('kein Tracking-SDK');
});
