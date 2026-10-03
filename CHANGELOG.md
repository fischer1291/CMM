# Changelog

Alle Änderungen an der App, die Nutzer merken, nach Version. Das Format folgt
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Jede Store-Version
bekommt beim Build ihren Abschnitt als GitHub-Release
(`.github/workflows/ios-build.yml`, `scripts/changelog-section.js`); OTA-Updates
stehen unter der Version, zu der sie gehören, mit dem Zusatz "(OTA)". Eine
Version trägt das Datum ihrer Freigabe durch Apple (YYYY-MM-DD), bis dahin
"noch nicht freigegeben"; die Build-Nummer steht im Tag, nicht hier. Was
wann als OTA und was als Store-Build rausgeht: `docs/RELEASE.md`.

## [Unreleased]

### Hinzugefügt

- Kleine Updates kommen ohne App Store an: Die App holt sie beim Öffnen und
  fragt, ob du kurz neu starten magst. Nichts ist Pflicht.
- Stürzt die App ab, erfahren wir davon: Fehlerberichte ohne Nummer, Namen
  oder Inhalte gehen an Sentry (EU). Was genau drinsteht, erklärt der neue
  Abschnitt „Absturzberichte“ in der Datenschutzerklärung (Stand 2. Oktober
  2026).
- Neuer Schalter „Erinnerungen und Tipps“ unter Mitteilungen: höchstens zwei
  Hinweise pro Woche, zum Beispiel wenn dein Plus bald endet. Jederzeit
  ausschaltbar.
- Plus: Klappt eine Zahlung nicht, zeigt dir die App einen ruhigen Hinweis mit
  direktem Weg zu Apple. Nach einer Kündigung kannst du uns freiwillig sagen,
  warum.
- Läuft gerade die Aktion für beide, sagt dir die Einladungskarte, dass ihr
  nach eurem ersten Gespräch beide 7 Tage Plus bekommt.
- Datenschutzerklärung ergänzt: welche Berechtigungen dein Gerät erlaubt
  (Mitteilungen, Kontakte) und welche Erinnerungen wir dir geschickt haben.
- Plus: Bietet der App Store eine Probezeit an und kannst du sie nutzen,
  steht sie direkt am Angebot („7 Tage gratis, dann …“, Preis aus dem App
  Store). Kurz vor ihrem Ende sagt dir die App, dass du nichts tun musst.
- Hinweise zu Grenzen (Kreise, Rituale, volle Kreise, Rundenlänge) haben
  jetzt einen Knopf „Mehr zu Plus“; in einer Runde läuft das Gespräch dabei
  weiter. Sind die Moments für heute aufgebraucht, sagt dir die App das
  freundlich, statt einen Fehler zu zeigen.
- Unter Profil → Geräte siehst du, auf welchen Geräten du angemeldet bist,
  und kannst dich mit „Überall abmelden“ von allen anderen abmelden. Meldet
  sich ein neues Gerät mit deiner Nummer an, bekommst du eine Mitteilung.
- Neu vergebene Nummern: Gehörte deine Nummer vorher jemand anderem, fragt
  die App bei der Anmeldung „Ist das dein Konto?“, statt dich in ein fremdes
  Konto zu lassen. Die Datenschutzerklärung erklärt beides im neuen
  Abschnitt „Angemeldete Geräte und neu vergebene Nummern“.
- Nach dem Einrichten deines Profils fragen wir einmal, woher du Wanna yap?
  kennst und wie viele deiner fünf engsten Freunde ein Android-Handy haben.
  Beides ist freiwillig, „Überspringen“ speichert nichts; kommst du über
  einen Einladungslink, ist „Freund·in“ schon ausgewählt. Die
  Datenschutzerklärung erklärt das im neuen Abschnitt „Woher du uns kennst“.
- Gibt es eine Störung (Anmeldung per SMS, Mitteilungen, Anrufe), sagt dir
  ein ruhiger Hinweis oben in der App Bescheid, und er verschwindet von
  selbst, sobald alles wieder läuft. Hast du ihn geschlossen, siehst du ihn
  bei der nächsten Störung wieder. Schreibst du uns in der Zeit, bekommst
  du gleich eine Antwort, dass wir dran sind.
- Hast du schon Kontakte in der App, aber noch kein Gespräch geführt, zeigt
  dir der Home-Screen die Karte „Dein erstes Gespräch“ mit einem Kontakt,
  „Anstupsen“ und „Beim Yap Moment treffen“. Vor dem Yap Moment
  siehst du, wann er heute startet.
- Nutzt noch niemand aus deinen Kontakten Wanna yap?, schlägt dir die
  Kontaktliste bis zu drei Menschen zum Einladen vor.
- Neuer, freiwilliger Schalter unter Mitteilungen: „Sag mir, wenn jemand aus
  meinem Adressbuch dazukommt“. Dafür behalten wir zu den Kontakten,
  die die App noch nicht nutzen, 90 Tage lang Prüfwerte (keine Nummern,
  keine Namen);
  Ausschalten löscht sie sofort. Die Datenschutzerklärung erklärt das im
  Abschnitt „Kontakte“.
- Eigene Nutzungsbedingungen statt Apples Standard-EULA, kurz und auf
  Deutsch: unter Profil, beim Start und auf wannayap.app/nutzungsbedingungen
  (Stand 3. Oktober 2026).
- Verstoß melden geht jetzt auch ohne Konto auf wannayap.app/melden; in der
  App führt „Hilfe & Feedback“ dorthin. Nach dem Senden siehst du eine
  Vorgangsnummer.
- Blenden wir einen deiner Moments aus oder sperren dein Konto auf Zeit,
  sagen wir dir unter „Hilfe & Feedback“, warum und wie lange. Siehst du das
  anders, antwortest du einfach dort.

### Geändert

- Das Impressum nennt unsere Kontaktstelle nach dem Digital Services Act;
  die Datenschutzerklärung erklärt im neuen Abschnitt „Melden ohne Konto“,
  was wir bei einer Meldung speichern.
- Ohne App-Store-Angebot zeigt die Plus-Seite nur „Plus kommt bald.“; die
  Umfrage „Interesse zeigen“ gibt es nur noch, wenn wir sie einschalten.
- Hast du bei einer Grenze schon alles, was Plus erlaubt, sagt der Hinweis
  das einfach, ohne Plus zu bewerben. Ohne Verbindung zeigt die Plus-Seite
  einen Hinweis zum erneuten Versuchen statt eines endlosen Ladekreises.

## [1.0.0] – noch nicht freigegeben

### Hinzugefügt

- Erste Version im App Store: Erreichbarkeit setzen, Freunde anrufen,
  Moments aus echten Anrufen, Kreise mit Einladungslink, Wanna yap+.
