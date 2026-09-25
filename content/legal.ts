/**
 * Legal texts shown in the app and on the web (/datenschutz, /impressum).
 *
 * OPERATOR must hold the real details of whoever runs the app before a
 * public release (§ 5 DDG, Art. 13 GDPR). Until then the screens say that
 * the details are missing instead of showing made-up ones.
 */
type Operator = { name: string; street: string; city: string; email: string };
export const OPERATOR = null as Operator | null;

export const PRIVACY_UPDATED = '25. September 2026';

export type LegalSection = { title: string; paragraphs: string[] };

const operatorLines = () =>
  OPERATOR
    ? [`${OPERATOR.name}, ${OPERATOR.street}, ${OPERATOR.city}`, `E-Mail: ${OPERATOR.email}`]
    : ['Die Angaben zum Verantwortlichen werden vor der Veröffentlichung ergänzt.'];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Verantwortlich',
    paragraphs: operatorLines(),
  },
  {
    title: 'Kurz gesagt',
    paragraphs: [
      'Call Me Maybe zeigt dir, wann Menschen aus deinem Adressbuch Zeit für ein Gespräch haben. Dafür verarbeiten wir nur, was die App zum Funktionieren braucht.',
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
      ? [OPERATOR.name, OPERATOR.street, OPERATOR.city]
      : ['Die Anbieterangaben werden vor der Veröffentlichung ergänzt.'],
  },
  {
    title: 'Kontakt',
    paragraphs: OPERATOR ? [`E-Mail: ${OPERATOR.email}`] : ['–'],
  },
  {
    title: 'Verantwortlich für den Inhalt',
    paragraphs: OPERATOR ? [`${OPERATOR.name}, Anschrift wie oben`] : ['–'],
  },
];
