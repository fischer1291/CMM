# Call Me Maybe – Launch-Playbook

Alles, was du brauchst, um die ersten 1.000 aktiven Nutzer zu holen: Positionierung,
Wachstumsplan, fertige Texte und Skripte. Die Motive dazu liegen in `dist/kit/`.

---

## 1. Positionierung

**Einzeiler:** Sieh, wer aus deinen Leuten gerade Zeit hat, und ruf einfach an.

**Claim:** Ruf an, wenn’s passt.

**Pitch (30 Sekunden):**
Wir schreiben hundert Nachrichten und telefonieren nie. Nicht, weil wir keine Lust
haben, sondern weil das Timing nie passt. Call Me Maybe zeigt dir, wann deine
Freunde und deine Familie gerade Zeit haben. Ein Tipp, und du bist erreichbar.
Jeden Tag gibt es den Call Me Moment: 10 Minuten, in denen alle gleichzeitig Zeit
haben. Kein Feed, keine Likes, keine Fremden. Nur echte Gespräche.

**Kategorie, in der wir gewinnen:** „BeReal für echte Gespräche“. Nicht noch ein
Messenger, sondern das Gegenmittel zu „Lass mal bald telefonieren“.

**Zielgruppen, in dieser Reihenfolge:**

1. **Studis und Azubis im ersten Jahr (18–25).** Frisch umgezogen, die besten
   Freunde plötzlich weit weg, sehr aktiv auf TikTok und Instagram. Hier startet
   das Wachstum.
2. **Freundeskreise über Städte verteilt (22–35).** Die WhatsApp-Gruppe, in der
   seit Monaten „wir müssen mal telefonieren“ steht.
3. **Familien auf Abstand.** Das Sonntagsritual mit Eltern und Großeltern. Kommt
   meist über Gruppe 1 und 2 in die App (die Kinder installieren es für die Eltern).

**Tonalität:** warm, direkt, ein bisschen frech. Du-Form. Kurze Sätze.
Nie belehrend, nie Einsamkeit beschämen („Du bist einsam?“), nie Druck aufbauen
(„Deine Serie reißt ab!“). Wir feiern Gespräche, statt Nicht-Anrufer schlecht zu machen.

**Do:** Humor über Alltagssituationen („Ah, du hattest angerufen?“), konkrete
Menschen (Oma, WG, beste Freundin in Leipzig), das Gefühl nach einem guten Gespräch.
**Don’t:** Statistiken über Einsamkeit als Angstmacher, erfundene Nutzerzahlen oder
Bewertungen, Vergleiche, die andere Apps schlecht machen.

---

## 2. Warum Reichweite allein nicht reicht: die Dichte-Regel

Call Me Maybe ist nur so gut wie die Zahl deiner Leute, die es auch haben. Eine
einzelne Person mit der App sieht einen leeren Status-Screen und löscht sie wieder.
Daraus folgen drei Regeln:

1. **Dichte vor Reichweite.** 200 Nutzer in *einem* Studiengang schlagen 2.000
   verstreute Downloads. Starte in abgeschlossenen Gruppen (ein Jahrgang, ein
   Wohnheim, ein Sportverein, eine Familie) und geh erst weiter, wenn dort die
   meisten dabei sind.
2. **Jede Kampagne ist eine Einladungskampagne.** Die Botschaft ist nie nur „Hol
   dir die App“, sondern „Hol sie dir mit der Person, die du anrufen solltest“.
3. **Die Warteliste ist ein Gruppen-Ticket.** Wer sich einträgt, soll direkt drei
   Freunde mitbringen (siehe Vorschläge in Abschnitt 7).

**Die wichtigste Kennzahl:** Anteil der neuen Nutzer, die in den ersten 7 Tagen
mindestens einen Anruf über die App führen. Erst wenn der über 40 % liegt, lohnt
sich bezahlte Reichweite.

---

## 3. Launchplan (6 Wochen)

### Woche 0 – Startklar machen
- [ ] Landing Page als eigene Netlify-Site deployen (`dist/landing/`), Domain
      verbinden, `SITE_URL` in `build.js` setzen, `npm run build` neu laufen lassen
      (QR-Code und Links ziehen dann mit).
- [ ] Netlify Forms aktivieren, E-Mail-Benachrichtigung für neue Einträge einrichten.
- [ ] Datenschutzerklärung um die Warteliste ergänzen (siehe Abschnitt 9).
- [ ] Öffentlichen TestFlight-Link erzeugen, in `content/links.ts` (`DOWNLOAD_URL`)
      und als `DOWNLOAD_URL` beim Build der Landing Page setzen.
- [ ] Profile sichern: Instagram, TikTok, ggf. YouTube Shorts. Gleicher Handle
      überall, Bio: „Ruf an, wenn’s passt. 📞 Die App für echte Gespräche.“ + Link.
- [ ] 9 Posts vorproduzieren, damit das Profil beim ersten Besuch nicht leer ist
      (die 3 Posts + das Karussell aus dem Kit, dazu 3 Videos).

### Woche 1 – Die ersten 50: Friends & Family
- Lade persönlich 5–8 enge Gruppen ein (deine Familie, deine WG, dein Freundeskreis,
  ein Team). Persönliche Nachricht, keine Massen-Mail.
- Richte für jede Gruppe gemeinsam einen Kreis mit Ritual ein. Das ist der
  „Aha-Moment“: Die Runde am Sonntag passiert von allein.
- Sammle jeden Tag Feedback: Wo hängen die Leute? Wer hat nach 3 Tagen noch nicht
  angerufen und warum?

### Woche 2 – Content-Motor anwerfen
- Täglich ein kurzes Video auf TikTok und Reels (Skripte in Abschnitt 5).
- Der Call Me Moment ist der tägliche Anlass: Poste zur Moment-Uhrzeit eine Story
  mit `story-2-call-me-moment.png` („Jetzt! 10 Minuten, alle haben Zeit.“).
- Karussell posten, in den Stories die „Ich hab Zeit“-Story teilen und Freunde
  bitten, sie zu reposten.

### Woche 3 – Ein Campus
- Such dir *eine* Hochschule (am besten deine eigene oder eine, wo du Leute kennst).
- 3–5 Botschafter:innen aus verschiedenen Studiengängen gewinnen (Anreiz: früher
  Zugang, exklusives Abzeichen, Merch, Nennung in der App).
- Flyer (`print/flyer-a6.pdf`) in Mensa, Bibliothek, Wohnheimen, Schwarzen Brettern.
  Die QR-Codes sind mit `utm_source=flyer` markiert, so siehst du, was wirkt.
- Aktion für Erstis: „Dein erster Anruf nach Hause“. In der ersten Uni-Woche vermissen
  viele ihre Leute, genau da ist die App am wertvollsten.

### Woche 4 – Communities & Creator
- 10–20 Micro-Creator (5k–50k Follower) aus Studi-Life, WG-Life, Fernbeziehung,
  Long-Distance-Friendship anschreiben. Kein bezahlter Werbespot, sondern „Probier es
  eine Woche mit deinen Leuten und erzähl, was passiert ist“. Kennzeichnungspflicht
  beachten („Anzeige“/„Werbung“, sobald es eine Gegenleistung gibt).
- In Communities, in denen Eigenwerbung erlaubt ist, eine ehrliche Gründergeschichte
  posten (Reddit r/de_IAmA, r/Studium, Discord-Server von Hochschulen), statt Werbung.

### Woche 5–6 – Presse und Verstärkung
- Pressetext (Abschnitt 8) an Lokalzeitung, Hochschulmagazine, Tech-Blogs (t3n,
  Gründerszene/Business Insider, Deutschlandfunk Nova), Podcasts über Freundschaft
  und mentale Gesundheit.
- Einsamkeit ist in Deutschland ein politisches Thema. Kontakt zu Initiativen und
  Stiftungen, die sich damit beschäftigen, kann Glaubwürdigkeit und Reichweite bringen.
- Erst jetzt, wenn Aktivierung und Einladungen funktionieren: kleines Budget
  (z. B. 10–20 €/Tag) auf die bestlaufenden organischen Videos als Spark Ads bzw.
  Instagram-Boosts, eng auf eine Stadt und 18–25 begrenzt.

---

## 4. Motive im Kit und wofür sie gedacht sind

| Datei | Format | Einsatz |
|---|---|---|
| `social/instagram/post-1-hook.png` | 1080×1350 | Erster Post, Hook-Frage |
| `social/instagram/post-2-excuse.png` | 1080×1350 | Wiedererkennung, gut zum Teilen |
| `social/instagram/post-3-talk-first.png` | 1080×1350 | Moments-Feature, Differenzierung |
| `social/instagram/carousel-1…5.png` | 1080×1350 | Erklär-Karussell „So geht’s“ |
| `social/stories/story-1-ich-hab-zeit.png` | 1080×1920 | Status-Story zum Reposten |
| `social/stories/story-2-call-me-moment.png` | 1080×1920 | Täglicher Moment-Reminder |
| `social/stories/story-3-warteliste.png` | 1080×1920 | Story mit Link-Sticker zur Warteliste |
| `appstore/appstore-1…6.png` | 1290×2796 | App-Store-Screenshots 6,9″ |
| `print/flyer-a6.pdf` / `.png` | A6 | Flyer mit QR-Code (ohne Beschnittzugabe) |
| `web/og-image.png` | 1200×630 | Linkvorschau (WhatsApp, iMessage, LinkedIn) |

Texte und Farben änderst du in `src/kit.js`, danach `npm run build`.

---

## 5. TikTok- und Reels-Skripte

Format: Hochkant, 7–20 Sekunden, Text-Overlay in den ersten 1,5 Sekunden, Ton an.
Immer mit echten Menschen und echter App-Nutzung. Die stärksten Hooks sind
wiedererkennbare Alltagsmomente.

1. **„Lass mal bald telefonieren“-Zähler**
   Overlay: *„Wie oft ich dieses Jahr ‚lass mal bald telefonieren‘ geschrieben habe“*
   → Screen-Recording, wie ein Chatverlauf voller „bald!“ nach oben scrollt → Schnitt:
   Status-Ring leuchtet, Freundin ruft an. Text: *„Jetzt ruf ich einfach an, wenn der Ring leuchtet.“*
2. **Der Call Me Moment**
   Overlay: *„Jeden Tag bekommen alle meine Freunde gleichzeitig 10 Minuten“*
   → Push kommt rein, drei Leute tippen „Dabei sein“, Gruppen-Runde startet, alle lachen.
3. **Oma-Content** (funktioniert immer)
   Overlay: *„Ich hab meiner Oma eine App installiert, damit sie sieht, wann ich Zeit hab“*
   → Oma sieht den leuchtenden Ring und ruft an. Echte Reaktion filmen, nichts stellen.
4. **POV Fernfreundschaft**
   Overlay: *„POV: Deine beste Freundin wohnt jetzt 500 km weg“*
   → Split-Screen, beide scrollen im Handy → eine schaltet sich erreichbar, die andere
   sieht es sofort, Anruf. *„Ihr habt gerade beide Zeit ✨“* als Screenshot.
5. **Talk first**
   Overlay: *„Diese App zeigt mir die Fotos meiner Freunde erst, wenn ich selbst mit jemandem telefoniert hab“*
   → Gesperrter Moments-Screen, Anruf, danach Moments sichtbar.
6. **Sonntagsritual**
   Overlay: *„Seit 6 Wochen telefoniert meine Familie jeden Sonntag. Keiner muss dran denken.“*
   → 18:00 Push, Familie springt nacheinander in die Runde.
7. **Gründer-Story** (für LinkedIn, TikTok und Reddit)
   *„Ich hab eine App gebaut, weil ich gemerkt habe, dass ich mit meinen besten Freunden
   seit Monaten nicht mehr gesprochen hab. Hier ist, was passiert ist, als wir sie eine
   Woche lang getestet haben.“* → ehrliche Zahlen aus deinem Testkreis.
8. **„Ah, du hattest angerufen?“**
   Sketch: Zwei Freunde verpassen sich fünfmal hintereinander (Zeitraffer, Uhrzeit
   eingeblendet). Dann mit App: Ring leuchtet, erster Versuch klappt.

---

## 6. Captions

**Post 1 (Hook):**
Ehrliche Frage: Wann hast du zuletzt jemanden einfach so angerufen? 📞
Call Me Maybe zeigt dir, wer aus deinen Leuten gerade Zeit hat. Ein Tipp, und du
bist erreichbar. Link in Bio.
#callmemaybe #echtegespräche #freundschaft #fernfreundschaft #studentlife

**Post 2 (Ausreden):**
Wir alle kennen diese Sätze. Wir wollen sie nicht mehr schreiben. 💛
Schick das an die Person, mit der du „bald mal“ telefonieren wolltest.
#callmemaybe #lassmalbaldtelefonieren #freunde #wgleben

**Post 3 (Talk first):**
Talk first. Then see. ✨ Die Moments deiner Leute siehst du erst, wenn du heute selbst
ein echtes Gespräch geführt hast. Kein Feed, kein Endlos-Scrollen.
#callmemaybe #digitalwellbeing #echteverbindung

**Karussell:**
Deine Freunde haben gerade Zeit. Du weißt es nur nicht. Wisch dich durch 👉
Welcher Freundin würdest du als Erstes Bescheid geben? Markier sie.
#callmemaybe #freundschaft #familie #appempfehlung

---

## 7. Viralität in der App (Vorschläge für die nächsten Phasen)

Die Werbung bringt Leute auf die Warteliste, aber die App selbst muss die nächsten
holen. Diese Hebel passen zum bestehenden Einladungs- und Kreis-System:

1. **„Ich hab Zeit“-Story teilen:** Beim Erreichbar-Schalten optional ein Story-Bild
   wie `story-1-ich-hab-zeit.png` erzeugen, mit Einladungslink. Jede Story ist Werbung.
2. **Leerer Status-Screen = Einladungsscreen:** Wer noch keine Kontakte in der App
   hat, sieht statt „niemand erreichbar“ eine Liste der drei wichtigsten Kontakte mit
   „Einladen“-Button.
3. **Kreis zuerst:** Im Onboarding direkt fragen „Mit wem willst du öfter reden?“
   und daraus einen Kreis mit Einladungslink bauen.
4. **Einladungs-Abzeichen** („Brückenbauer: 3 Leute dazugeholt“) im Sammelalbum.
   Belohnt wird das Einladen, nie das Vergleichen.
5. **Warteliste mit Freunden:** Nach dem Eintragen auf der Landing Page einen Link zum
   Teilen anzeigen: „Wer mit 3 Freunden kommt, bekommt den Beta-Link zuerst.“

---

## 8. Pressetext (Kurzfassung)

**Call Me Maybe: Die App, die aus „Lass mal bald telefonieren“ echte Gespräche macht**

Wir schreiben mehr Nachrichten als je zuvor und telefonieren trotzdem kaum noch mit
den Menschen, die uns wichtig sind. Die neue iPhone-App Call Me Maybe setzt genau da
an: Sie zeigt, wer aus dem eigenen Freundes- und Familienkreis gerade Zeit für einen
Anruf hat. Ein Tipp auf den Status-Ring genügt, und die eigenen Kontakte sehen:
Jetzt passt es.

Einmal am Tag gibt es den „Call Me Moment“, zehn Minuten, in denen alle Nutzer
gleichzeitig erreichbar sein können. Familien und Freundeskreise können feste Rituale
anlegen, etwa „jeden Sonntag um 18 Uhr“, zu denen sich die gemeinsame Videorunde von
allein öffnet. Fotos aus Gesprächen („Moments“) werden nur geteilt, wenn beide
zustimmen, und sind erst sichtbar, wenn man selbst ein Gespräch geführt hat.

Bewusst verzichtet Call Me Maybe auf Feed, Likes, Werbung und Kontakt zu Fremden.
Eine private Statistik zeigt, wie viel Zeit man sich für echte Gespräche genommen
hat, und bleibt privat, bis man sie selbst teilt.

Call Me Maybe ist kostenlos und startet zunächst für das iPhone. Android folgt.

Kontakt: [Name, E-Mail, Telefon] · Website: [Landing-Page-URL] · Presse-Motive: `dist/kit/`

---

## 9. App-Store-Texte

**Name (max. 30):** Call Me Maybe
**Untertitel (max. 30):** Ruf an, wenn’s passt
**Werbetext (max. 170):** Sieh, wer aus deinen Leuten gerade Zeit hat, und ruf einfach an. Jeden Tag 10 Minuten Call Me Moment. Kein Feed, keine Likes, keine Fremden.
**Keywords (max. 100, ohne Leerzeichen nach Kommas):**
`anrufen,telefonieren,freunde,familie,erreichbar,videoanruf,gruppenanruf,kontakt,status,freundschaft`

**Beschreibung:**

Wir schreiben hundert Nachrichten und telefonieren nie. Call Me Maybe ändert das.

SIEH, WER GERADE ZEIT HAT
Ein Tipp auf den Ring, und deine Kontakte sehen: Jetzt passt ein Anruf. Wenn ihr beide
gerade Zeit habt, sagt dir die App Bescheid.

DER CALL ME MOMENT
Einmal am Tag haben alle gleichzeitig 10 Minuten. Wer dabei ist, ist erreichbar.

KREISE UND RITUALE
Familie, WG, die Leute von früher: Leg einen Kreis an und ein Ritual wie „jeden Sonntag
18 Uhr“. Die Runde öffnet sich von allein.

MOMENTS, ABER ANDERS
Halte im Anruf einen Moment fest, wenn beide zustimmen. Sichtbar 24 Stunden, und nur
für die, die heute selbst ein echtes Gespräch geführt haben.

DEINE GESPRÄCHSZEIT
Serien und Abzeichen für Zeit mit deinen Menschen. Privat, bis du entscheidest, wer
sie sehen darf.

KEIN FEED. KEINE LIKES. KEINE FREMDEN. KEINE WERBUNG.

**Wichtig zu den Screenshots:** Apple verlangt, dass Screenshots die App im Einsatz
zeigen. Die Mockups im Kit bilden die echten Screens nach. Prüf vor dem Hochladen,
dass jeder Screen genau so in der App aussieht, oder tausch den Handy-Inhalt gegen
echte Simulator-Screenshots (gleiche Vorlage, `src/kit.js` → `store(...)`).

---

## 10. Rechtliches und offene Punkte vor dem Start

- **Name prüfen:** „Call Me Maybe“ ist ein bekannter Songtitel. Lass vor größeren
  Werbeausgaben eine Markenrecherche machen (DPMA, EUIPO, Klasse 9 und 38) oder frag
  einen Markenanwalt. Das Risiko ist bei einer Wortmarke für Software ein anderes als
  bei Musik, aber ein Rebranding nach dem Launch wäre teuer.
- **Warteliste und Datenschutz:** Die Formulareinträge landen bei Netlify (USA, EU-US
  Data Privacy Framework). Die Datenschutzerklärung braucht einen Abschnitt zur
  Warteliste (Zweck, Rechtsgrundlage Einwilligung, Speicherdauer, Widerruf).
  Für Newsletter-Mails ist Double-Opt-in Pflicht, z. B. über Brevo oder Mailchimp.
- **Impressum:** Die Betreiberangaben in `content/legal.ts` (OPERATOR) müssen vor dem
  öffentlichen Launch ausgefüllt sein, die Landing Page verlinkt dorthin.
- **Creator-Kooperationen:** Werbung immer kennzeichnen lassen.
- **Flyer-Druck:** Das PDF hat keine Beschnittzugabe. Für Druckereien 2–3 mm
  Beschnitt anfragen, die meisten Online-Druckereien skalieren das auf Wunsch.
