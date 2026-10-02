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

/**
 * The mail provider behind SMTP_URL (backend README), e.g. 'Brevo (Sendinblue
 * SAS, Frankreich)'. The code does not fix one, so it is named in the imprint
 * and the privacy policy only once it is entered here.
 */
export const MAIL_PROVIDER: string | null = null;

export const PRIVACY_UPDATED = '2. Oktober 2026';
/**
 * Version of the terms a new user accepts in onboarding. Until our own terms
 * exist (plan 2.7) Apple's standard EULA applies; the version still records
 * which wording was shown. Sent with privacyVersion = PRIVACY_UPDATED on
 * POST /verify/check as ageConfirmed/termsVersion/privacyVersion.
 */
export const TERMS_VERSION = '2026-10-01';
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** Minimum age to use the app on one's own (Art. 8 GDPR, German threshold). */
export const MIN_AGE = 16;

export type LegalSection = { title: string; paragraphs: string[] };

const mailProviderLines = () =>
  MAIL_PROVIDER
    ? [`Den Versand übernimmt unser E-Mail-Dienstleister ${MAIL_PROVIDER}, der die Adressen in unserem Auftrag verarbeitet (Art. 28 DSGVO) und sie für nichts anderes nutzen darf.`]
    : [
        'Den Versand übernimmt ein E-Mail-Dienstleister, der die Adressen in unserem Auftrag verarbeitet (Art. 28 DSGVO) und sie für nichts anderes nutzen darf. Welcher Dienstleister das ist, nennen wir im Impressum, sobald wir ihn eingetragen haben.',
      ];

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
      'Keine Werbung, kein Tracking, keine Analyse-Tools, kein Verkauf von Daten. Nur Abstürze und die Stabilität der App melden wir an einen Dienstleister (siehe „Absturzberichte“).',
    ],
  },
  {
    title: 'Anmeldung mit deiner Telefonnummer',
    paragraphs: [
      'Zur Anmeldung bestätigst du deine Nummer mit einem SMS-Code. Den Versand übernimmt Twilio (Twilio Inc., USA). Wir speichern deine Nummer als dein Konto (Art. 6 Abs. 1 lit. b DSGVO).',
      'Bei der Anmeldung bestätigst du außerdem dein Mindestalter und akzeptierst die Nutzungsbedingungen. Wir speichern dazu den Zeitpunkt der Bestätigung sowie die Fassung der Nutzungsbedingungen und dieser Datenschutzerklärung, die du dabei gesehen hast, als Nachweis.',
    ],
  },
  {
    title: 'Mindestalter',
    paragraphs: [
      `Wanna yap? ist für Menschen ab ${MIN_AGE} Jahren. Bist du jünger als ${MIN_AGE}, darfst du die App nur nutzen, wenn deine Eltern oder Erziehungsberechtigten zustimmen (Art. 8 DSGVO).`,
    ],
  },
  {
    title: 'Kontakte',
    paragraphs: [
      'Wenn du den Zugriff erlaubst, bildet die App aus jeder Nummer deines Adressbuchs einen Prüfwert (SHA-256-Hash der Nummer im internationalen Format) und schickt nur diese Prüfwerte an unseren Server. Namen und andere Kontaktdaten verlassen dein Gerät nicht.',
      'Der Server gleicht die Prüfwerte ausschließlich mit den Prüfwerten registrierter Nutzer ab und antwortet, wer davon ein Konto hat. Prüfwerte sind pseudonym, nicht anonym: Wer eine Nummer kennt, kann ihren Prüfwert bilden. Wir behandeln sie deshalb wie personenbezogene Daten. Prüfwerte von Nummern ohne Konto speichern wir nicht.',
      'Wir speichern nur, welche registrierten Nutzer in deinem Adressbuch stehen, damit nur sie deine Erreichbarkeit sehen und dich anrufen können. Diese Liste und der Prüfwert deiner eigenen Nummer werden mit deinem Konto gelöscht.',
      'Lädst du jemanden ein, speichern wir bis zu 60 Tage einen Prüfwert (Hash) dieser Nummer. Meldet sich die Person an, seid ihr automatisch verbunden und du bekommst Bescheid.',
      'Jeder Nutzer hat einen persönlichen Einladungslink mit einem Code. Meldest du dich über den Link einer Person an, speichern wir bei deinem Konto, wer dich eingeladen hat, verbinden euch und zählen das für diese Person; sie sieht nur die Anzahl. Öffnest du den Link im Browser, zählen wir nur den Besuch je Code und Plattform (iPhone, Android oder andere), ohne etwas über dich zu speichern.',
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
      'Für „Erinnerungen und Tipps“ (zum Beispiel wenn du noch niemanden eingeladen hast oder dein geschenktes Plus bald endet) meldet die App unserem Server beim Start und bei der Rückkehr in den Vordergrund, höchstens alle zwei Stunden, ob du Mitteilungen und den Zugriff auf deine Kontakte erlaubt hast. Wir speichern davon nur den letzten Stand mit Zeitpunkt und außerdem, welche Erinnerung wir dir wann geschickt haben, damit jede nur einmal kommt; beides bis zur Löschung deines Kontos. Höchstens zwei solcher Mitteilungen kommen pro Woche, und du kannst sie unter „Mitteilungen“ ausschalten (Art. 6 Abs. 1 lit. b DSGVO).',
    ],
  },
  {
    title: 'Wanna yap+ und Käufe',
    paragraphs: [
      'Wanna yap+ kaufst du über Apple (App Store, In-App-Kauf). Die Zahlung wickelt Apple ab; Zahlungsdaten wie Karten- oder Kontonummern bekommen wir nicht zu sehen und speichern sie nicht.',
      'Den Abo-Status verwaltet in unserem Auftrag RevenueCat (RevenueCat, Inc., USA; Art. 28 DSGVO). Als Kennung nutzen wir dort die interne Nummer deines Kontos, nicht deine Telefonnummer. RevenueCat meldet uns jede Änderung deines Abos; wir speichern davon das Produkt, den Status (z. B. aktiv, gekündigt, Zahlungsproblem, abgelaufen), die Laufzeit, den Preis und die Währung des Ereignisses, den Kündigungsgrund, das dir angezeigte Angebot, ob es sich um einen Testkauf handelt und bei einem Gerätewechsel die betroffenen internen Kontokennungen, um dir Wanna yap+ freizuschalten und unsere Einnahmen zu berechnen (Art. 6 Abs. 1 lit. b DSGVO).',
      'Diese Abo-Ereignisse bleiben als Nachweis gespeichert, auch wenn du dein Konto löschst; sie sind dann nur noch über die interne Kennung bezeichnet und keiner Nummer mehr zuzuordnen. Wanna yap+ kannst du auch geschenkt bekommen (Einladungen, Warteliste); dann speichern wir nur, bis wann es gilt und woher es kommt. Kaufst du danach selbst ein Abo, merken wir uns die frühere Geschenk-Quelle, um zu messen, ob Geschenke zu Käufen führen. Bekommt ihr nach einem ersten Gespräch beide Plus geschenkt (Einladung für beide), speichern wir bei der eingeladenen Person, von welcher einladenden Nummer das kam, damit jedes Paar das nur einmal bekommt; löscht eine der beiden Personen ihr Konto, verschwindet der Eintrag.',
      'Öffnest du die Seite zu Wanna yap+, startest dort einen Kauf oder stellst Käufe wieder her, zählt unser Server das nur als Tageszahl je Schritt und je Einstieg (zum Beispiel „aus den Einstellungen“ oder „aus einer Mitteilung“), ohne zu speichern, wer es war. Schlägt ein Kauf fehl, geht ein Fehlerbericht mit dem Fehlercode des App Store an uns, wie unter „Absturzberichte“ beschrieben. So sehen wir, ob Käufe klappen und welcher Weg zu Plus genutzt wird (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
    ],
  },
  {
    title: 'Nutzungsstatistik, Support und Moderation',
    paragraphs: [
      'Um die App zu verbessern, zählen wir auf dem Server, an welchen Tagen die App genutzt wird. Dafür speichern wir statt deiner Nummer nur einen Prüfwert (Hash) und das Datum, bis zu 400 Tage. Daraus entstehen ausschließlich Gesamtzahlen (z. B. wie viele Menschen heute aktiv waren). Es gibt kein Tracking-SDK, keine Werbe-IDs und keine Weitergabe an Dritte.',
      'Die App übermittelt bei jeder Anfrage ihre Version, Plattform und Betriebssystem-Version, damit wir Fehler eingrenzen und veraltete Versionen erkennen können. Bei der Anmeldung speichern wir außerdem die Sprache deines Geräts (aus der Anfrage der App), nur um zu messen, ob eine Übersetzung nötig wird; die App verhält sich dadurch nicht anders.',
      'Schreibst du uns über „Hilfe & Feedback“, speichern wir deine Nachrichten, die Kategorie und die App-Version, bis du dein Konto löschst.',
      'Nach deinem zweiten Gespräch laden wir dich in der App zu einem 15-minütigen Gespräch mit dem Gründer ein. Wir speichern dazu nur, wann wir dich eingeladen haben, ob du einen Termin gewählt oder abgelehnt hast und ob das Gespräch stattfand (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO); mit deinem Konto wird das gelöscht. Tippst du auf „Termin wählen“, öffnet sich die Buchungsseite unseres Terminanbieters cal.com (Cal.com, Inc., USA) mit deinem Profilnamen vorbelegt; was du dort eingibst, verarbeitet cal.com nach seiner eigenen Datenschutzerklärung.',
      'Für Support und Moderation hat ein kleiner Kreis berechtigter Personen Zugriff auf ein geschütztes Admin-Werkzeug (Anmeldung mit Zwei-Faktor). Nummern sind dort maskiert; jeder Zugriff auf Daten einer Person wird protokolliert (1 Jahr). Bei Verstößen gegen die Regeln kann ein Konto gesperrt werden; bei einer dauerhaften Sperre speichern wir einen Prüfwert (Hash) der Nummer, damit sie sich nicht erneut registrieren kann.',
    ],
  },
  {
    title: 'Absturzberichte',
    paragraphs: [
      'Stürzt die App ab oder tritt ein technischer Fehler auf, schickt sie einen Fehlerbericht an unseren Server und an den Dienst Sentry (Functional Software, Inc., USA), den wir in der Region Europäische Union nutzen; die Berichte werden dort auf Servern in der Europäischen Union verarbeitet, im Auftrag und nach unseren Weisungen (Art. 28 DSGVO). Ein Bericht enthält die Fehlermeldung, die Stelle im Programmcode, die App-Version, das Gerätemodell, die iOS-Version, ob die App gerade im Vordergrund war und die letzten Bedienschritte in technischer Form (zum Beispiel „Schaltfläche angetippt“ oder „Anfrage an den Server gesendet“). Statt deiner Nummer steht im Bericht nur ein Prüfwert (Hash) davon, damit wir sehen, ob viele oder immer dieselbe Person betroffen ist; Telefonnummern, E-Mail-Adressen und Adressparameter von Anfragen entfernt die App vor dem Senden, bei nativen Abstürzen Sentry vor der Speicherung; Beschriftungen angetippter Elemente (etwa Namen) werden nicht übertragen. Es werden keine Telefonnummern, keine Namen, keine Bilder und keine Gesprächsinhalte übertragen, auch keine Werbe-IDs oder Standortdaten. Außerdem meldet die App bei jedem Start und jeder Rückkehr in den Vordergrund kurz an Sentry, dass sie läuft (App-Version, Gerätemodell, iOS-Version, Prüfwert), damit wir sehen, welcher Anteil der Sitzungen ohne Absturz bleibt.',
      'Rechtsgrundlage ist unser berechtigtes Interesse an einer funktionierenden App (Art. 6 Abs. 1 lit. f DSGVO). Sentry löscht die Berichte spätestens nach 90 Tagen. Sentry erhält deine Nummer nicht im Klartext, sondern nur den Prüfwert. Weil sich Telefonnummern durch Durchprobieren aus einem Prüfwert zurückrechnen ließen, behandeln wir ihn wie die Nummer selbst (pseudonym, nicht anonym); Sentry verarbeitet ihn nur in unserem Auftrag. Möchtest du Berichte zu deinem Prüfwert früher entfernt haben, schreib uns, wir veranlassen das bei Sentry. Berichte senden nur Release-Versionen (App Store und TestFlight); in Entwicklungsversionen ist die Übertragung abgeschaltet.',
    ],
  },
  {
    title: 'Besuchszählung auf wannayap.app',
    paragraphs: [
      'Öffnest du die Startseite von wannayap.app, zählen wir den Besuch. Die Seite schickt dafür nur an unseren Server, über welchen Kampagnen-Link (z. B. „tiktok“) oder von welcher Plattform (z. B. Instagram oder Google) du gekommen bist. Außerdem zählen wir, ob die Seite gelesen wurde (15 Sekunden geöffnet oder nach unten gescrollt) und ob jemand angefangen hat, eine E-Mail-Adresse einzutippen (nicht, was eingetippt wurde). Gespeichert wird nur ein Zähler pro Tag, Herkunft und Kampagne: ohne IP-Adresse, ohne Cookies und ohne etwas auf deinem Gerät abzulegen; die Kampagne gilt nur für diesen Besuch. Nur wer es ausdrücklich anfordert (ein Link für unser Team, damit eigene Besuche nicht mitzählen), bekommt im Browser einen Vermerk, dass seine Besuche nicht gezählt werden. Ein Besuch lässt sich damit keiner Person zuordnen. Wir nutzen die Zahlen, um zu sehen, welche Werbung funktioniert (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
    ],
  },
  {
    title: 'Warteliste auf wannayap.app',
    paragraphs: [
      'Trägst du dich auf der Website in die Warteliste ein, speichern wir deine E-Mail-Adresse, um dir zu schreiben, sobald die App startet, und dir bis dahin höchstens ein paar Neuigkeiten zu schicken. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).',
      'Wir nutzen das Double-Opt-in-Verfahren: Erst wenn du den Link in unserer Bestätigungsmail anklickst, stehst du auf der Liste. Als Nachweis deiner Einwilligung speichern wir den Zeitpunkt der Anmeldung und der Bestätigung, die dabei verwendete IP-Adresse und den Wortlaut der Einwilligung. Bestätigst du nicht, löschen wir den Eintrag nach 7 Tagen.',
      'Kommst du über den Einladungslink einer anderen Person, speichern wir, über wessen Link du gekommen bist, damit sie für Empfehlungen belohnt werden kann. Sie erfährt nur die Anzahl, nicht wer sich eingetragen hat. Kommst du über einen Link aus einer Kampagne, speichern wir deren Kennzeichen (z. B. „tiktok“), um zu sehen, welche Werbung funktioniert. Beim Eintragen speichern wir außerdem, ob du ein iPhone oder ein Android-Gerät nutzt (aus der Browser-Kennung), um dir zum passenden Zeitpunkt zu schreiben.',
      'Auf deinem Gerät merkt sich die Website im lokalen Speicher deines Browsers deinen Wartelisten-Code und einen Einladungslink, über den du gekommen bist. Das ist für die von dir gewünschte Funktion nötig (§ 25 Abs. 2 TDDDG) und verlässt dein Gerät nicht.',
      'Die Mails versenden wir über einen E-Mail-Dienstleister, der sie in unserem Auftrag verarbeitet (Art. 28 DSGVO). Du kannst deine Einwilligung jederzeit widerrufen, über den Abmelde-Link in jeder Mail oder per Mail an uns. Dann löschen wir deine Adresse sofort. Andernfalls löschen wir die Warteliste spätestens 12 Monate nach dem Start der App.',
      'Löst du deinen Wartelisten-Code in der App ein, verknüpfen wir den Eintrag mit deinem Konto, um dir das Abzeichen und gegebenenfalls die geschenkten Plus-Tage zu geben.',
    ],
  },
  {
    title: 'E-Mail-Versand',
    paragraphs: [
      'In der App brauchen wir keine E-Mail-Adresse. E-Mails schicken wir nur an Adressen aus der Warteliste: die Bestätigungsmail, die Nachricht zum Start der App und gelegentliche Neuigkeiten, bis du dich abmeldest.',
      ...mailProviderLines(),
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
  ...(MAIL_PROVIDER ? [{ title: 'E-Mail-Dienstleister', paragraphs: [MAIL_PROVIDER] }] : []),
  {
    title: 'Verbraucherstreitbeilegung',
    paragraphs: ['Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'],
  },
];
