# Marketing-Agent

Ein Agent entwirft Werbevideos für Instagram Reels und TikTok. Du gibst sie in der
Admin-Konsole frei und postest sie (noch) selbst.

| Was | Wann | Wie | Kosten |
|---|---|---|---|
| **Trends** | vor jedem Lauf | Claude sucht im Web, welche englischen Hashtags, Anlässe, Formate und Sounds (TikTok, Reels) in der Nische gerade laufen (`agent/trends.js`); fließt in Captions, Hashtags und Sound-Tipps ein | ~0,10–0,50 € |
| **App-Videos** | täglich ~6 Uhr, 2 Stück | 25–30 s: Claude schreibt eine kleine Geschichte aus 3–5 Blöcken der Vorlage `story` in `src/templates.js` (Chat als Gespräch, Liste, Yap Moment, großer Satz, echter App-Screen), gerendert mit eigener Musik (Stil passend zum Video, siehe unten) | ~0,10–0,20 € |
| **Hero-Videos** | Di und Fr ~6:30 | bis 40 s, die nächste Folge einer Serie (jede Hauptfigur hat ihre eigene, siehe Figuren): Claude schreibt die Folge mit Gesprächen auf Deutsch, Veo 3.1 Fast dreht bis zu 7 Einstellungen mit Referenzbild und fester Stimme pro Figur, Claude prüft die Bilder, Gemini hört den Ton (`agent/speech.js`) und bis zu zwei schlechte Aufnahmen werden neu gedreht; dann Schnitt mit „Folge n“ und Hook, Untertiteln, echtem App-Screen als Wendung, Payoff, Endkarte und Musik, die unter der Sprache leiser wird | ~8–10 € (bei kleinerem Budget kürzere Folgen) |
| **Referenzbilder** | nebenbei, bis pro Figur eins gewählt ist | Gemini-Bildmodell, 3 Vorschläge pro Figur | ~0,07 € pro Bild |

```
GitHub Action                      Backend (Render)                       Du (Konsole → Freigabe)
───────────────────────────        ─────────────────────────────          ──────────────────────────
Zahlen, Entscheidungen, Budget  ←  GET  /marketing/context
vor jedem bezahlten Aufruf      →  POST /marketing/budget/reserve         Budget: Tag / Woche
  (Claude, Veo, Bild)                ↳ 402, wenn Tag oder Woche voll
danach echte Kosten             →  POST /marketing/budget/:id/settle
Referenzbilder vorschlagen      →  POST /marketing/characters/:key/…      Figuren: Bild auswählen
Entwurf + MP4                   →  POST /marketing/drafts, PUT …/video    ansehen, freigeben oder mit
Mail an die Owner               →  POST /marketing/notify                 Grund verwerfen, posten
```

Der Grund beim Verwerfen, was gepostet wurde, die Besuche pro Kampagne und die bisherige
Geschichte der Hero-Videos gehen beim nächsten Lauf an den Agenten zurück. Dazu kommen die
Hinweise aus der Wochenreview am Montag (Konsole → App → „Marketing-Hinweise für den
Agenten“, `AppConfig.marketingNotes`, höchstens 1.000 Zeichen, Plan 2.11): `context.notes`
steht in App- und Hero-Läufen als Abschnitt „Hinweise des Owners für diese Woche“ im Prompt
(`agent/notes.js`) und hat Vorrang vor eigenen Themenideen. Leeres Feld = kein Abschnitt.
Welche Entscheidung dahintersteht, steht in [`../docs/DECISIONS.md`](../docs/DECISIONS.md).

## Budget

- **Tagesbudget und Wochenbudget** (Woche ab Montag, Zeitzone Berlin) stellst du in der
  Konsole unter **Freigabe** ein. Start: 5 € pro Tag, 25 € pro Woche. Für Hero-Folgen bis
  40 Sekunden (7 Einstellungen plus Neudrehs) braucht der Hero-Tag rund **11 €**, die Woche
  rund **30 €**. Mit weniger dreht der Agent automatisch kürzere Folgen (so viele
  Einstellungen, wie ins Budget passen, mindestens zwei).
- Vor **jedem** bezahlten Aufruf reserviert der Agent den Höchstbetrag im Backend. Passt er
  nicht mehr in den Tag oder die Woche, lehnt das Backend ab und der Agent lässt den Aufruf
  aus. Danach wird mit den echten Kosten abgerechnet. Eine Reservierung, die nie abgerechnet
  wird (Lauf abgestürzt), zählt mit ihrem Höchstbetrag.
- Grundlage sind die Listenpreise in `agent/common.js` (Claude Opus 5: 5/25 $ pro Million
  Tokens; Websuche: 0,01 $ pro Suche; Veo 3.1 Fast 1080p: 0,12 $ pro Sekunde, ein Clip = 8 s =
  0,96 $; Bild: 0,067 $; Tonprüfung: aufgerundet 0,01 €).
  Ein Dollar wird als ein Euro gerechnet, das liegt auf der sicheren Seite.
- Reicht das Budget an einem Hero-Tag nicht für mindestens zwei Einstellungen, fällt das
  Hero-Video aus (Hinweis im GitHub-Lauf); unter fünf Einstellungen steht im Lauf, wie viel
  eine volle Folge bräuchte. Die App-Videos kosten Cent-Beträge.
- **Zweite Absicherung:** In der Claude Console ein monatliches Ausgabenlimit setzen, in
  Google Cloud (Billing → Budgets & alerts) eine Budgetwarnung für das Gemini-Projekt.

## Figuren

Wer die Figuren sind, steht in `agent/characters.js` (Aussehen auf Englisch für die
Bildmodelle, Beschreibung auf Deutsch). Der Agent schlägt pro Figur drei Referenzbilder
vor; du wählst in der Konsole unter **Freigabe → Figuren** eins aus oder forderst mit
einem Satz, was anders sein soll, neue an. Ohne gewähltes Bild keine Hero-Videos mit
dieser Figur. Alle Figuren sind erwachsen (in der EU erlaubt Veo nur Erwachsene).

**Serien:** Jede Hauptfigur hat ihre eigene Serie mit rotem Faden, Staffelbogen, Running Gag,
Serien-Hashtag und fester Stimme (alles in `agent/characters.js`):

| Serie | Figur | Serien-Tag |
|---|---|---|
| Anna zieht los (Hauptserie, etwa jede zweite Folge) | Anna, 18, nach dem Abi unterwegs, dann Medizin in einer fremden Stadt | #annayaps |
| Lena · neu in Leipzig | Lena, 21 | #lenayaps |
| Jonas · 23:14 („Ah, du hattest angerufen?“) | Jonas, 23, Schichtdienst in Hamburg | #jonasyaps |
| Oma Gisela lernt yappen | Gisela, 78, Lenas Oma | #grandmayaps |

Lena, Jonas und Gisela teilen eine Welt (Crossover erlaubt), Annas Stadt und Nebenfiguren
legt der Agent in ihrer ersten Folge fest. Welche Serie dran ist, entscheidet der Agent:
Anna etwa jede zweite Folge, sonst die Serie, deren letzte Folge am längsten her ist. Die
Folgen werden pro Serie gezählt („Folge 3“ steht im Titel und im Video), verworfene Folgen
zählen nicht zur Geschichte. Das Backend gibt dem Agenten die letzten 60 Hero-Folgen mit,
damit keine Serie ihr Gedächtnis verliert.

**Aufbau einer Folge (höchstens 40 s):** Hook-Einstellung mit „Serie · Folge n“ und einem
Hook-Satz oben im Bild → Setup → der echte App-Screen als Wendung → Payoff-Einstellungen →
offenes Ende (Teaser für die nächste Folge) → Endkarte (2,5 s).

## Einmal einrichten

1. **Render → Backend → Environment:** `MARKETING_AGENT_KEY` (z. B. `openssl rand -hex 32`).
2. **GitHub → CMM → Settings → Secrets and variables → Actions:**
   - `ANTHROPIC_API_KEY` (Claude Console)
   - `GEMINI_API_KEY` (Google AI Studio, mit aktivierter Abrechnung: Veo gibt es nur bezahlt)
   - `MARKETING_AGENT_KEY` (derselbe wie auf Render)
3. **Erster Lauf:** GitHub → Actions → Marketing-Agent → *Run workflow* → Modus **figuren**.
   Danach in der Konsole pro Figur ein Bild wählen. Dann Modus **hero** für die erste Folge.

Danach läuft alles von selbst. GitHub pausiert geplante Workflows, wenn im Repository
60 Tage lang nichts passiert; dann dort wieder aktivieren.

## Lokal ausprobieren

```bash
cd marketing && npm install
ANTHROPIC_API_KEY=… node agent/daily.js --dry-run                  # App-Videos nach dist/agent/, lädt nichts hoch
node agent/daily.js --dry-run --plan plan.json                       # gespeicherten Plan neu rendern, ohne Claude
node agent/hero.js --plan heroplan.json --clips clips/               # Hero-Schnitt mit clips/1.mp4 …, ohne Veo
```

Braucht wie `npm run video` Google Chrome und ffmpeg.

## Musik und Sounds

- **Musik im Video:** kommt aus Code (`music.js`), ohne Rechte Dritter, und darf deshalb
  automatisch auf Instagram und TikTok. Sechs Stile: Lo-Fi, House, Pop, Trap/Hip-Hop, Afro,
  Akustik. Claude wählt pro Video den Stil, der zur Stimmung passt; derselbe Stil läuft nie
  zweimal hintereinander (`agent/soundtrack.js`). In Hero-Folgen wird die Musik unter jedem
  gesprochenen Satz um gut 10 dB leiser. Tonart, Akkordfolge und Tempo hängen am
  Kampagnennamen, jedes Video klingt also anders. Probehören: `npm run music -- --styles`
  (nach `dist/music/`).
- **Sound-Tipp für TikTok:** Die Trend-Recherche sucht auch Sounds, die gerade auf TikTok in
  Deutschland laufen. Claude schlägt pro Video einen passenden vor: bevorzugt einen aus der
  kommerziellen Musikbibliothek (für Unternehmenskonten freigegeben, „kommerziell frei“),
  sonst einen anderen Trend-Sound („prüfen“: in TikTok nachsehen, ob er für das Konto
  verfügbar ist). Leer bleibt der Tipp nur, wenn die Recherche gar keine Sounds findet. Im Modus **Entwurf** legst du ihn in der TikTok-App
  dazu und stellst den Originalton aus (bei Hero-Videos mit gesprochenem Satz nur leiser);
  die Schritte stehen auf der Karte.
- **Keine viralen Songs in der Datei:** Sie gehören ihren Labels. Über die Schnittstellen darf
  man keine Plattform-Sounds anhängen, und in einer hochgeladenen Datei erkennen Instagram und
  TikTok fremde Musik und schalten sie stumm oder sperren das Video. Trend-Sounds deshalb
  nur über die Apps selbst.

## Was der Agent darf und was nicht

- Er schreibt nur Texte für feste Vorlagen und Bildbeschreibungen für Veo. HTML schreibt er
  nicht, alle Texte werden escaped, Längen sind begrenzt.
- Er kann Entwürfe, Referenzbild-Vorschläge und Ausgaben anlegen und Zahlen lesen, aber nichts
  freigeben, auswählen, posten oder das Budget ändern. Das können nur Owner in der Konsole.
- Hero-Videos werden immer als KI markiert: in der Konsole und beim automatischen Posten über
  die Plattform (Instagram „KI-Info“, TikTok „KI-generierter Inhalt“), nicht im Text der
  Caption. Wer ein Hero-Video von Hand postet, schaltet den Hinweis dort selbst ein.
  Handy-Bildschirme in KI-Szenen sind nie lesbar; die App zeigt immer der echte Screen.
- Die Figuren reden auf Deutsch miteinander, meistens am Telefon: pro Einstellung höchstens ein
  Satz (bis 12 Wörter), gut die Hälfte der Einstellungen hat einen. Gemini hört jede Aufnahme:
  Kommt der Satz nicht auf Deutsch oder deutlich anders, wird die Aufnahme neu gedreht (höchstens
  zwei Neudrehs pro Folge, wenn das Budget reicht), sonst wird ihr Ton stumm geschaltet und der
  Untertitel trägt den Satz. Ungeplante Sprache wird immer stumm geschaltet. Der Schnitt schneidet
  nie in einen Satz; die Karte in der Konsole nennt alles, was nicht geklappt hat.
- Captions: kurz, knackig, nicht werblich, höchstens zwei Emojis (mehr entfernt der Code),
  „Link in Bio“ nur ab und zu. Suchbegriffe stehen auf Deutsch im ersten Satz.
- Hashtags: englisch, 3–5 (Instagram erlaubt höchstens 5), immer #wannayap, bei Hero-Folgen
  der Serien-Tag, der Rest aus den aktuell trendenden Tags der Recherche. Der Code erzwingt
  #wannayap, den Serien-Tag und die Obergrenze.
- Marke, Tonalität und Regeln kommen aus `PLAYBOOK.md`, `HERO-VIDEO.md`, `agent/prompt.js`
  und `agent/hero-prompt.js`. Änderungen dort gelten ab dem nächsten Lauf.

## Links in den Captions

Instagram und TikTok machen Links in Beschreibungen nicht klickbar. Die Links pro Video
(`utm_campaign` = Kampagnenname) sind für Story-Link-Sticker und später für Anzeigen
gedacht. Für normale Posts bleibt der Bio-Link.

## Automatisch posten

Freigegebene Videos gehen im nächsten freien Zeitfenster (12:00 und 18:00 Uhr, ein Video
pro Fenster, `POST_SLOTS` auf Render) auf jeden verbundenen Kanal. Verbunden wird in der
Konsole unter **Freigabe → Kanäle**; ohne Verbindung bleibt es beim Herunterladen und
Abhaken. KI-Videos werden automatisch gekennzeichnet (Instagram `is_ai_generated`,
TikTok `is_aigc`).

**Instagram** (Instagram API mit Instagram-Login)
1. Instagram-Konto auf **Professionell (Business)** umstellen.
2. [developers.facebook.com](https://developers.facebook.com) → App erstellen → Typ
   **Business** → Produkt **Instagram** → „API-Einrichtung mit Instagram-Login“.
3. Dort das Instagram-Konto hinzufügen (es bekommt eine Rolle in der App) und
   **Token generieren**, mit den Berechtigungen `instagram_business_basic` und
   `instagram_business_content_publish`.
4. Den Token in der Konsole unter Kanäle → Instagram einfügen. Das Backend erneuert ihn
   selbst, bevor er nach 60 Tagen abläuft.

**TikTok** (Content Posting API)
1. [developers.tiktok.com](https://developers.tiktok.com) → App anlegen, Produkte
   **Login Kit** und **Content Posting API** (Direct Post aktivieren), Scopes
   `user.info.basic`, `video.upload`, `video.publish`.
2. Redirect-URI: `https://api.wannayap.app/marketing/tiktok/callback`.
3. Client Key und Client Secret auf Render als `TIKTOK_CLIENT_KEY` und
   `TIKTOK_CLIENT_SECRET` eintragen.
4. In der Konsole unter Kanäle **Mit TikTok verbinden**.
5. Bis TikTok die App geprüft hat („Audit“), sind direkte Posts nur privat sichtbar. Bis
   dahin im Modus **Entwurf** lassen: Das Video landet in der TikTok-App, du fügst dort den
   Text ein (bei KI-Videos „KI-generierter Inhalt“ einschalten), veröffentlichst und hakst es
   in der Konsole ab; die Karte zeigt die Schritte. Nach dem Audit auf **Direkt**.
6. **Sandbox:** Solange die App bei TikTok in Prüfung ist, geht es nur mit den Sandbox-Schlüsseln
   (eigener Client Key und Secret im Reiter Sandbox) und nur für Konten, die dort als
   Target User eingetragen sind. Nach der Freigabe die Produktions-Schlüssel auf Render
   eintragen und in der Konsole TikTok trennen und neu verbinden: Sandbox-Anmeldungen gelten
   in der Produktion nicht.

## Nächste Stufe

Bezahlte Reichweite (Meta Marketing API, TikTok Business API) im selben Budget.
