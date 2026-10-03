import { canStart } from '../features/auth/OnboardingView';
import {
  IMPRINT_SECTIONS,
  MIN_AGE,
  OPERATOR,
  PRIVACY_SECTIONS,
  PRIVACY_UPDATED,
  REPORT_URL,
  TERMS_SECTIONS,
  TERMS_UPDATED,
  TERMS_URL,
  TERMS_VERSION,
} from '../content/legal';

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
  // plan 2.7: our own terms, dated; the version a sign-up sends is that date
  expect(TERMS_VERSION).toBe('2026-10-03');
  expect(TERMS_UPDATED).toBe('3. Oktober 2026');
  expect(TERMS_SECTIONS.find((s) => s.title === 'Stand')!.paragraphs).toEqual([TERMS_UPDATED]);
  expect(MIN_AGE).toBe(16);
});

const terms = (title: string) => {
  const section = TERMS_SECTIONS.find((s) => s.title === title);
  expect(section).toBeDefined();
  return section!.paragraphs.join(' ');
};

test('our own terms: public page, minimum age, rules, moderation with reasons and objection (plan 2.7)', () => {
  expect(TERMS_URL).toBe('https://wannayap.app/nutzungsbedingungen');
  expect(terms('Worum es geht')).toContain(OPERATOR!.name);
  expect(terms('Mindestalter')).toContain(`ab ${MIN_AGE} Jahren`);
  const rules = terms('Fair miteinander');
  for (const named of ['Keine Belästigung', 'Keine rechtswidrigen Inhalte', 'Moments nur mit Zustimmung']) expect(rules).toContain(named);
  const moderation = terms('Moderation und Sperren');
  // statement of reasons in the app, the objection is a reply in that ticket (backend lib/moderation.js)
  for (const named of ['„Hilfe & Feedback“', 'aus welchem Grund', 'Art. 17 DSA', 'Du kannst widersprechen', 'Antworte einfach', 'Art. 20 DSA', OPERATOR!.email]) {
    expect(moderation).toContain(named);
  }
  expect(terms('Melden')).toContain(REPORT_URL);
  expect(REPORT_URL).toBe('https://wannayap.app/melden');
});

test('the terms name how to cancel Plus, the trial, Family Sharing and that gifts can be taken back', () => {
  const plus = terms('Wanna yap+');
  for (const named of ['über Apple', 'verlängert sich automatisch', 'Kündigen kannst du jederzeit', 'iPhone-Einstellungen', '24 Stunden vor Ablauf', 'Probezeit', 'Familienfreigabe', 'Jahresabo']) {
    expect(plus).toContain(named);
  }
  // deleting the account does not cancel the store subscription: said where people look
  expect(plus).toContain('kündigt das Abo nicht');
  expect(terms('Dein Konto')).toContain('kündigst du zusätzlich bei Apple');
  const gift = terms('Geschenktes Plus');
  for (const named of ['Einladungen', 'Warteliste', 'freiwillig', 'Missbrauch', 'entziehen']) expect(gift).toContain(named);
  expect(terms('Haftung')).toContain('Vorsatz und grober Fahrlässigkeit');
  expect(terms('Änderungen dieser Bedingungen')).toContain('in der App');
  expect(terms('Anwendbares Recht')).toContain('deutsches Recht');
  // no leftover of Apple's standard EULA as our terms
  expect(TERMS_SECTIONS.map((s) => s.paragraphs.join(' ')).join(' ')).not.toContain('Standard-EULA');
});

test('the imprint names the DSA contact point with languages and the report page (Art. 11 and 12 DSA)', () => {
  const dsa = IMPRINT_SECTIONS.find((s) => s.title.startsWith('Kontaktstelle nach dem Digital Services Act'));
  expect(dsa).toBeDefined();
  expect(dsa!.title).toContain('Art. 11 und 12 DSA');
  const text = dsa!.paragraphs.join(' ');
  for (const named of [OPERATOR!.email, 'Deutsch', 'Englisch', REPORT_URL, 'ohne Konto']) expect(text).toContain(named);
});

test('the policy names reports without an account and statements of reasons (plan 2.7)', () => {
  const reports = PRIVACY_SECTIONS.find((s) => s.title === 'Melden ohne Konto')!.paragraphs.join(' ');
  // what SupportTicket keeps for category "report": category, text, reportedPhone, email, momentHint; TTL 180 days
  for (const named of ['wannayap.app/melden', 'ohne Konto', 'Kategorie', 'Beschreibung', 'Telefonnummer der gemeldeten Person', 'E-Mail-Adresse', 'Moment', 'freiwillig', '6 Monaten', 'Art. 16 DSA', 'erfährt nicht']) {
    expect(reports).toContain(named);
  }
  expect(reports).toContain('IP-Adresse');
  const usage = PRIVACY_SECTIONS.find((s) => s.title === 'Nutzungsstatistik, Support und Moderation')!.paragraphs.join(' ');
  expect(usage).toContain('Art. 17 DSA');
  // the mail section no longer claims mails go to waitlist addresses only
  const mail = PRIVACY_SECTIONS.find((s) => s.title === 'E-Mail-Versand')!.paragraphs.join(' ');
  expect(mail).toContain('Meldung ohne Konto');
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

test('the policy names the re-match lists: opt-in, peppered, 90 days, deleted when switched off (plan 2.13)', () => {
  const contacts = PRIVACY_SECTIONS.find((s) => s.title === 'Kontakte')!.paragraphs.join(' ');
  // the switch as the app labels it (features/notifications/NotificationsView.tsx)
  expect(contacts).toContain('Sag mir, wenn jemand aus meinem Adressbuch dazukommt');
  for (const named of ['standardmäßig aus', 'HMAC-SHA256', '5.000 Einträge', '90 Tage', 'Ausschalten löscht deine Liste sofort', 'Art. 6 Abs. 1 lit. a', 'Art. 6 Abs. 1 lit. f']) {
    expect(contacts).toContain(named);
  }
  // the old absolute "never stored" must not stand without the exception
  expect(contacts).not.toContain('Prüfwerte von Nummern ohne Konto speichern wir nicht.');
});
