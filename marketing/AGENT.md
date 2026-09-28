# Marketing-Agent

Ein Agent entwirft Werbevideos für Instagram Reels und TikTok. Du gibst sie in der
Admin-Konsole frei und postest sie (noch) selbst.

| Was | Wann | Wie | Kosten |
|---|---|---|---|
| **Trends** | vor jedem Lauf | Claude sucht im Web, welche Hashtags, Anlässe und Formate in der Nische gerade laufen (`agent/trends.js`); fließt in Captions und Hashtags ein | ~0,10–0,40 € |
| **App-Videos** | täglich ~6 Uhr, 2 Stück | Claude schreibt Texte für die Vorlagen in `src/templates.js` (chat, moment, list), gerendert mit eigener Musik | ~0,10–0,20 € |
| **Hero-Videos** | Di und Fr ~6:30 | nächste Folge der Serie mit Anna (und Lena, Jonas, Oma Gisela): Claude schreibt die Folge, Veo 3.1 Fast dreht 2–3 Einstellungen mit den Referenzbildern, Claude prüft die Aufnahmen, Gemini hört den Ton (`agent/speech.js`), dann Schnitt mit Untertiteln, echtem App-Screen, Endkarte, Musik | ~3–5 € |
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
Geschichte der Hero-Videos gehen beim nächsten Lauf an den Agenten zurück.

## Budget

- **Tagesbudget und Wochenbudget** (Woche ab Montag, Zeitzone Berlin) stellst du in der
  Konsole unter **Freigabe** ein. Start: 5 € pro Tag, 25 € pro Woche.
- Vor **jedem** bezahlten Aufruf reserviert der Agent den Höchstbetrag im Backend. Passt er
  nicht mehr in den Tag oder die Woche, lehnt das Backend ab und der Agent lässt den Aufruf
  aus. Danach wird mit den echten Kosten abgerechnet. Eine Reservierung, die nie abgerechnet
  wird (Lauf abgestürzt), zählt mit ihrem Höchstbetrag.
- Grundlage sind die Listenpreise in `agent/common.js` (Claude Opus 5: 5/25 $ pro Million
  Tokens; Websuche: 0,01 $ pro Suche; Veo 3.1 Fast 1080p: 0,12 $ pro Sekunde, ein Clip = 8 s =
  0,96 $; Bild: 0,067 $; Tonprüfung: aufgerundet 0,01 €).
  Ein Dollar wird als ein Euro gerechnet, das liegt auf der sicheren Seite.
- Reicht das Budget an einem Hero-Tag nicht für mindestens zwei Einstellungen, fällt das
  Hero-Video aus (Hinweis im GitHub-Lauf). Die App-Videos kosten Cent-Beträge.
- **Zweite Absicherung:** In der Claude Console ein monatliches Ausgabenlimit setzen, in
  Google Cloud (Billing → Budgets & alerts) eine Budgetwarnung für das Gemini-Projekt.

## Figuren

Wer die Figuren sind, steht in `agent/characters.js` (Aussehen auf Englisch für die
Bildmodelle, Beschreibung auf Deutsch). Der Agent schlägt pro Figur drei Referenzbilder
vor; du wählst in der Konsole unter **Freigabe → Figuren** eins aus oder forderst mit
einem Satz, was anders sein soll, neue an. Ohne gewähltes Bild keine Hero-Videos mit
dieser Figur. Alle Figuren sind erwachsen (in der EU erlaubt Veo nur Erwachsene).

Anna ist die Hauptfigur: 18, Abi, reist vor dem Studium, dann Medizin in einer fremden
Stadt. Stadt und Nebenfiguren legt der Agent in ihrer ersten Folge fest und bleibt dabei.

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

## Was der Agent darf und was nicht

- Er schreibt nur Texte für feste Vorlagen und Bildbeschreibungen für Veo. HTML schreibt er
  nicht, alle Texte werden escaped, Längen sind begrenzt.
- Er kann Entwürfe, Referenzbild-Vorschläge und Ausgaben anlegen und Zahlen lesen, aber nichts
  freigeben, auswählen, posten oder das Budget ändern. Das können nur Owner in der Konsole.
- Hero-Videos werden immer als KI markiert: in der Konsole und beim automatischen Posten über
  die Plattform (Instagram „KI-Info“, TikTok „KI-generierter Inhalt“), nicht im Text der
  Caption. Wer ein Hero-Video von Hand postet, schaltet den Hinweis dort selbst ein.
  Handy-Bildschirme in KI-Szenen sind nie lesbar; die App zeigt immer der echte Screen.
- Die Figuren wirken durch Mimik, Lachen und Gesten, sie sprechen meistens nicht. Höchstens ein
  kurzer Satz pro Folge, dann auf Deutsch. Spricht Veo trotzdem (oft Englisch), hört Gemini das
  und der Ton der Aufnahme wird stumm geschaltet; die Karte in der Konsole sagt es dazu.
- Hashtags: 3–5 (Instagram erlaubt höchstens 5), immer #wannayap, der Rest passend aus der
  Trend-Recherche des Tages. Suchbegriffe stehen im ersten Satz der Caption.
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
