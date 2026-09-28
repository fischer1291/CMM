# App Store Connect: Texte und Screenshots

Alles, was im App-Store-Eintrag von Wanna yap? steht, zum Kopieren. Sprache: Deutsch
(Hauptsprache). Die Grenzen in Klammern sind Apples Höchstlängen in Zeichen.

## App-Informationen

| Feld | Inhalt |
|---|---|
| Name (30) | `Wanna yap?` |
| Untertitel (30) | `Sieh, wer gerade Zeit hat` |
| Primäre Kategorie | Soziale Netze |
| Sekundäre Kategorie | Lifestyle |
| Datenschutz-URL | `https://wannayap.app/datenschutz` |
| Inhaltsrechte | Enthält keine Inhalte Dritter |

Der Untertitel wird mitdurchsucht: „Zeit“ und „gerade“ gehören deshalb nicht noch
einmal in die Keywords, ebenso wenig der Name.

## Version 1.0

**Werbetext (170), jederzeit ohne neue Prüfung änderbar:**

```
Sieh, wer aus deinen Leuten gerade Zeit hat, und ruf einfach an. Jeden Tag 10 Minuten Yap Moment. Kein Feed, keine Likes, keine Fremden.
```

**Keywords (100, Komma ohne Leerzeichen):**

```
telefonieren,videoanruf,anrufen,freunde,familie,erreichbar,gruppenanruf,fernbeziehung,ersti,studium
```

**Beschreibung (4000):**

```
Wir schreiben hundert Nachrichten und telefonieren nie. Wanna yap? ändert das.

SIEH, WER GERADE ZEIT HAT
Ein Tipp auf den Ring, und deine Kontakte sehen: Jetzt passt ein Anruf. Für 15 Minuten, eine halbe Stunde oder eine Stunde. Haben du und jemand aus deinen Leuten gleichzeitig Zeit, zeigt dir die App das sofort. Ein Tipp, und ihr redet, per Video oder nur mit Ton.

DER YAP MOMENT
Einmal am Tag haben alle gleichzeitig 10 Minuten. Wer dabei ist, ist erreichbar. Kein Planen, kein „wann passt es dir?“.

KREISE UND RITUALE
Familie, WG, die Leute von früher: Leg einen Kreis an und ein Ritual wie „jeden Sonntag 18 Uhr“. Haben mehrere aus dem Kreis Zeit, startet ihr eine Runde. Ein gemeinsames Wochenziel zählt jedes Gespräch im Kreis, gemeinsam statt gegeneinander.

AUTOMATISCH ERREICHBAR
Leg im Zeitplan fest, wann du meistens Zeit hast, zum Beispiel abends nach der Uni. Dann bist du in diesen Fenstern von selbst erreichbar. Nachts ist Ruhe.

ANSTUPSEN
Jemand ist gerade nicht erreichbar? Stups die Person an. Sie bekommt eine freundliche Nachricht, dass du gern mit ihr sprechen würdest.

MOMENTS, ABER ANDERS
Halte im Anruf einen Moment fest. Erst wenn ihr beide einverstanden seid, sehen ihn eure Kontakte, 24 Stunden lang, und nur, wer heute selbst ein echtes Gespräch geführt hat. Erst reden, dann gucken.

DEINE GESPRÄCHSZEIT
Wie viel Zeit du dir diese Woche für echte Gespräche genommen hast, Serien und Abzeichen für Zeit mit deinen Menschen. Privat, bis du entscheidest, wer sie sehen darf.

DEINE DATEN
Deine Kontakte werden nur als Prüfwerte abgeglichen, Namen verlassen dein Gerät nicht. Anrufe werden weder aufgezeichnet noch gespeichert. Du kannst alle Daten exportieren und dein Konto jederzeit in der App löschen.

KEIN FEED. KEINE LIKES. KEINE FREMDEN. KEINE WERBUNG.

Kostenlos fürs iPhone. Wanna yap? macht am meisten Spaß mit deinen Leuten: Lade die ein, mit denen du öfter reden willst.
```

**Neuerungen in dieser Version:** `Die erste Version von Wanna yap?. Schön, dass du da bist.`

| Feld | Inhalt |
|---|---|
| Support-URL | `https://wannayap.app` (Kontakt steht im Impressum) |
| Marketing-URL | `https://wannayap.app` |
| Copyright | `2026 Leroy Fischer` |
| Preis | Kostenlos |

## Screenshots (iPhone 6,9″ und 6,5″)

Sieben Stück, in dieser Reihenfolge hochladen. Die ersten drei sieht man in der Suche.
Jedes Bild gibt es in zwei Größen: ohne Zusatz 1320 × 2868 (6,9″), mit `-1284x2778` im
Namen 1284 × 2778 (6,5″). Hochladen, was App Store Connect im Feld verlangt; eine der
beiden Größen reicht, die kleineren iPhones rechnet Apple selbst herunter.

| Nr. | Datei | Überschrift |
|---|---|---|
| 1 | `appstore-1-status-on.png` | Sieh, wer gerade Zeit hat. |
| 2 | `appstore-2-contacts.png` | Ein Tipp, und ihr redet. |
| 3 | `appstore-3-status-daily-open.png` | Jeden Tag 10 Minuten, alle haben Zeit. |
| 4 | `appstore-4-call-connected.png` | Video und Audio, einfach so. |
| 5 | `appstore-5-circle.png` | Eure Runde passiert von allein. |
| 6 | `appstore-6-moments.png` | Erst reden, dann gucken. |
| 7 | `appstore-7-stats.png` | Zeit mit deinen Menschen, privat. |

Die Handy-Inhalte sind echte Screens der App: die Komponenten-Galerie
(`dev/DevPreview.tsx`) mit Beispieldaten, im Web-Build gerendert. Apple rechnet die
6,9″-Bilder für die kleineren iPhones selbst herunter.

**iPad (13″):** Dieselben sieben Motive gibt es auch im iPad-Format, mit `-ipad-2064x2752`
bzw. `-ipad-2048x2732` im Namen. Version 1.0 ist eine reine iPhone-App (`supportsTablet:
false`, `TARGETED_DEVICE_FAMILY = 1`); sobald ein solcher Build der Version zugeordnet ist,
verlangt App Store Connect normalerweise keine iPad-Screenshots mehr. Solange das Feld
noch da ist, diese hochladen.

**Neu erzeugen**, wenn sich Screens ändern:

```bash
npx expo start --web --port 8081          # im Hauptordner, läuft weiter
cd marketing && node tools/app-screens.js  # echte Screens nach static/appstore/
npm run build                              # Store-Layout nach dist/kit/appstore/
```

Überschriften und Reihenfolge stehen in `marketing/src/kit.js` (`store(...)`).
