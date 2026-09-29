/**
 * Legal texts shown in the app and on the web (/datenschutz, /impressum).
 *
 * OPERATOR holds the details of whoever runs the app (§ 5 DDG, Art. 13
 * GDPR): the address must be one where legal documents can be served.
 */
type Operator = { name: string; careOf?: string; street: string; city: string; country: string; email: string };
export const OPERATOR = {
  name: 'Leroy Fischer',
  careOf: 'c/o flexdienst – #22251',
  street: 'Kurt-Schumacher-Straße 74',
  city: '67663 Kaiserslautern',
  country: 'Deutschland',
  email: 'hallo@wannayap.app',
} as Operator | null;

const addressLines = (o: Operator) => [o.name, ...(o.careOf ? [o.careOf] : []), o.street, o.city, o.country];

export const PRIVACY_UPDATED = '29. September 2026';

export type LegalSection = { title: string; paragraphs: string[] };

const operatorLines = () =>
  OPERATOR
    ? [addressLines(OPERATOR).join(', '), `E-Mail: ${OPERATOR.email}`]
    : ['Die Angaben zum Verantwortlichen werden vor der Veröffentlichung ergänzt.'];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Verantwortlich',
    paragraphs: operatorLines(),
  },
  {
    title: 'Kurz gesagt',
    paragraphs: [
      'Wanna yap? zeigt dir, wann Menschen aus deinem Adressbuch Zeit für ein Gespräch haben. Dafür verarbeiten wir nur, was die App zum Funktionieren braucht.',
      'Keine Werbung, kein Tracking, keine Analyse-Tools, kein Verkauf von Daten.',
    ],
  },
  {
    title: 'Anmeldung mit deiner Telefonnummer',
    paragraphs: [
      'Zur Anmeldung bestätigst du deine Nummer mit einem SMS-Code. Den Versand übernimmt Twilio (Twilio Inc., USA). Wir speichern deine Nummer als dein Konto (Art. 6 Abs. 1 lit. b DSGVO).',
    ],
  },
  {
    title: 'Kontakte',
    paragraphs: [
      'Wenn du den Zugriff erlaubst, bildet die App aus den Nummern deines Adressbuchs Prüfwerte (SHA-256-Hashes) und gleicht sie mit registrierten Nutzern ab. Namen und andere Kontaktdaten verlassen dein Gerät nicht.',
      'Wir speichern nur, welche registrierten Nutzer in deinem Adressbuch stehen. Nummern von Menschen ohne Konto speichern wir nicht.',
      'Lädst du jemanden ein, speichern wir bis zu 60 Tage einen Prüfwert (Hash) dieser Nummer. Meldet sich die Person an, seid ihr automatisch verbunden und du bekommst Bescheid.',
    ],
  },
  {
    title: 'Profil, Erreichbarkeit und Zeitplan',
    paragraphs: [
      'Dein Name, dein Profilbild, ob du gerade erreichbar bist (und bis wann) sowie wann du zuletzt erreichbar warst, sehen Nutzer, die deine Nummer in ihrem Adressbuch haben.',
      'Profilbilder speichern wir bei Cloudinary (Cloudinary Ltd., mit Servern in den USA). Deinen Zeitplan und deine Zeitzone nutzen wir, um dich automatisch als erreichbar anzuzeigen und Ruhezeiten einzuhalten.',
    ],
  },
  {
    title: 'Kreise, Melden und Blockieren',
    paragraphs: [
      'Kreise sind gemeinsame Gruppen, denen man bewusst beitritt (Einladung oder Code). Wir speichern Name, Mitglieder und offene Einladungen; Einladungen an Menschen ohne App nur als Prüfwert (Hash) der Nummer. Mitglieder eines Kreises sehen einander, auch wenn sie ihre Nummern nicht gespeichert haben, und sehen, wann die anderen erreichbar sind (außer du schränkst das ein).',
      'Für Gruppenanrufe (Runden) speichern wir, wer wann dabei war, 30 Tage, und für deine Gesprächszeit-Statistik deine Zeit in der Runde.',
      'Blockierst du jemanden, speichern wir das, bis du es aufhebst. Meldungen (Grund, optionaler Hinweis, ggf. der betroffene Moment) speichern wir bis zu 6 Monate, um Missbrauch zu prüfen. Die gemeldete Person erfährt nicht, von wem die Meldung kommt.',
    ],
  },
  {
    title: 'Anrufe',
    paragraphs: [
      'Video- und Sprachanrufe laufen über Agora (Agora Lab, Inc., USA). Die Inhalte deiner Gespräche werden weder aufgezeichnet noch von uns gespeichert.',
      'Wer wen wann angerufen hat und wie der Anruf endete, speichern wir 30 Tage, um Anrufe zuzustellen und Missbrauch zu verhindern.',
      'Für deine persönliche Gesprächszeit-Statistik speichern wir von angenommenen Anrufen Beginn, Dauer und Gesprächspartner bis zu 400 Tage. Diese Statistik ist privat. Nur wenn du sie freigibst, sehen die von dir gewählten Kontakte deine Gesamtzeit, Serie und Abzeichen, nie aber, mit wem du gesprochen hast.',
    ],
  },
  {
    title: 'Moments',
    paragraphs: [
      'Teilst du einen Moment, speichern wir das Bild aus dem Anruf (bei Cloudinary), deine Notiz und Stimmung. Sehen können ihn deine Kontakte und die Person, mit der du gesprochen hast. Reaktionen speichern wir mit der Nummer der reagierenden Person.',
    ],
  },
  {
    title: 'Mitteilungen',
    paragraphs: [
      'Für Mitteilungen speichern wir ein Push-Token deines Geräts und versenden über den Expo Push Service (650 Industries, Inc., USA) sowie Apple (Apple Push Notification Service, auch für eingehende Anrufe). Welche Mitteilungen du bekommst, stellst du in der App ein.',
      'Welche Mitteilungen wir dir geschickt oder aus welchem Grund nicht geschickt haben, speichern wir 3 Tage; du siehst das unter „Mitteilungen → Zuletzt“.',
    ],
  },
  {
    title: 'Nutzungsstatistik, Support und Moderation',
    paragraphs: [
      'Um die App zu verbessern, zählen wir auf dem Server, an welchen Tagen die App genutzt wird. Dafür speichern wir statt deiner Nummer nur einen Prüfwert (Hash) und das Datum, bis zu 400 Tage. Daraus entstehen ausschließlich Gesamtzahlen (z. B. wie viele Menschen heute aktiv waren). Es gibt kein Tracking-SDK, keine Werbe-IDs und keine Weitergabe an Dritte.',
      'Die App übermittelt bei jeder Anfrage ihre Version, Plattform und Betriebssystem-Version, damit wir Fehler eingrenzen und veraltete Versionen erkennen können.',
      'Schreibst du uns über „Hilfe & Feedback“, speichern wir deine Nachrichten, die Kategorie und die App-Version, bis du dein Konto löschst.',
      'Für Support und Moderation hat ein kleiner Kreis berechtigter Personen Zugriff auf ein geschütztes Admin-Werkzeug (Anmeldung mit Zwei-Faktor). Nummern sind dort maskiert; jeder Zugriff auf Daten einer Person wird protokolliert (1 Jahr). Bei Verstößen gegen die Regeln kann ein Konto gesperrt werden; bei einer dauerhaften Sperre speichern wir einen Prüfwert (Hash) der Nummer, damit sie sich nicht erneut registrieren kann.',
    ],
  },
  {
    title: 'Besuchszählung auf wannayap.app',
    paragraphs: [
      'Öffnest du die Startseite von wannayap.app, zählen wir den Besuch. Die Seite schickt dafür nur an unseren Server, über welchen Kampagnen-Link (z. B. „tiktok“) oder von welcher Plattform (z. B. Instagram oder Google) du gekommen bist. Außerdem zählen wir, ob die Seite gelesen wurde (15 Sekunden geöffnet oder nach unten gescrollt) und ob jemand angefangen hat, eine E-Mail-Adresse einzutippen (nicht, was eingetippt wurde). Gespeichert wird nur ein Zähler pro Tag, Herkunft und Kampagne: ohne IP-Adresse, ohne Cookies und ohne etwas auf deinem Gerät abzulegen; die Kampagne gilt nur für diesen Besuch. Ein Besuch lässt sich damit keiner Person zuordnen. Wir nutzen die Zahlen, um zu sehen, welche Werbung funktioniert (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
    ],
  },
  {
    title: 'Warteliste auf wannayap.app',
    paragraphs: [
      'Trägst du dich auf der Website in die Warteliste ein, speichern wir deine E-Mail-Adresse, um dir zu schreiben, sobald die App startet, und dir bis dahin höchstens ein paar Neuigkeiten zu schicken. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).',
      'Wir nutzen das Double-Opt-in-Verfahren: Erst wenn du den Link in unserer Bestätigungsmail anklickst, stehst du auf der Liste. Als Nachweis deiner Einwilligung speichern wir den Zeitpunkt der Anmeldung und der Bestätigung, die dabei verwendete IP-Adresse und den Wortlaut der Einwilligung. Bestätigst du nicht, löschen wir den Eintrag nach 7 Tagen.',
      'Kommst du über den Einladungslink einer anderen Person, speichern wir, über wessen Link du gekommen bist, damit sie für Empfehlungen belohnt werden kann. Sie erfährt nur die Anzahl, nicht wer sich eingetragen hat. Kommst du über einen Link aus einer Kampagne, speichern wir deren Kennzeichen (z. B. „tiktok“), um zu sehen, welche Werbung funktioniert.',
      'Auf deinem Gerät merkt sich die Website im lokalen Speicher deines Browsers deinen Wartelisten-Code und einen Einladungslink, über den du gekommen bist. Das ist für die von dir gewünschte Funktion nötig (§ 25 Abs. 2 TDDDG) und verlässt dein Gerät nicht.',
      'Die Mails versenden wir über einen E-Mail-Dienstleister, der sie in unserem Auftrag verarbeitet (Art. 28 DSGVO). Du kannst deine Einwilligung jederzeit widerrufen, über den Abmelde-Link in jeder Mail oder per Mail an uns. Dann löschen wir deine Adresse sofort. Andernfalls löschen wir die Warteliste spätestens 12 Monate nach dem Start der App.',
      'Löst du deinen Wartelisten-Code in der App ein, verknüpfen wir den Eintrag mit deinem Konto, um dir das Abzeichen und gegebenenfalls die geschenkten Plus-Tage zu geben.',
    ],
  },
  {
    title: 'Hosting',
    paragraphs: [
      'Der Server läuft bei Render (Render Services, Inc., USA), die Datenbank bei MongoDB Atlas (MongoDB, Inc.).',
    ],
  },
  {
    title: 'Übermittlung in die USA',
    paragraphs: [
      'Einige der genannten Dienstleister verarbeiten Daten in den USA. Die Übermittlung stützt sich auf das EU-US Data Privacy Framework bzw. auf Standardvertragsklauseln der EU-Kommission (Art. 45, 46 DSGVO).',
    ],
  },
  {
    title: 'Deine Rechte',
    paragraphs: [
      'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO).',
      'In der App kannst du unter „Profil → Deine Daten“ alle gespeicherten Daten exportieren und dein Konto mit allen Daten löschen.',
      'Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.',
    ],
  },
  {
    title: 'Stand',
    paragraphs: [PRIVACY_UPDATED],
  },
];

export const IMPRINT_SECTIONS: LegalSection[] = [
  {
    title: 'Angaben gemäß § 5 DDG',
    paragraphs: OPERATOR
      ? addressLines(OPERATOR)
      : ['Die Anbieterangaben werden vor der Veröffentlichung ergänzt.'],
  },
  {
    title: 'Kontakt',
    paragraphs: OPERATOR ? [`E-Mail: ${OPERATOR.email}`] : ['–'],
  },
  {
    title: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
    paragraphs: OPERATOR ? [`${OPERATOR.name}, Anschrift wie oben`] : ['–'],
  },
  {
    title: 'Verbraucherstreitbeilegung',
    paragraphs: ['Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'],
  },
];
