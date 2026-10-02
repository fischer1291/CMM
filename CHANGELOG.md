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

## [1.0.0] – noch nicht freigegeben

### Hinzugefügt

- Erste Version im App Store: Erreichbarkeit setzen, Freunde anrufen,
  Moments aus echten Anrufen, Kreise mit Einladungslink, Wanna yap+.
