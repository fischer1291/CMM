# Marketing-Agent

Ein Agent entwirft Werbevideos für Instagram Reels und TikTok. Du gibst sie in der
Admin-Konsole frei und postest sie (noch) selbst.

| Was | Wann | Wie | Kosten |
|---|---|---|---|
| **App-Videos** | täglich ~6 Uhr, 2 Stück | Claude schreibt Texte für die Vorlagen in `src/templates.js` (chat, moment, list), gerendert mit eigener Musik | ~0,10–0,20 € |
| **Hero-Videos** | Di und Fr ~6:30 | nächste Folge der Serie mit Anna (und Lena, Jonas, Oma Gisela): Claude schreibt die Folge, Veo 3.1 Fast dreht 2–3 Einstellungen mit den Referenzbildern, Claude prüft die Aufnahmen, dann Schnitt mit Untertiteln, echtem App-Screen, Endkarte, Musik | ~3–5 € |
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
  Tokens; Veo 3.1 Fast 1080p: 0,12 $ pro Sekunde, ein Clip = 8 s = 0,96 $; Bild: 0,067 $).
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
- Hero-Videos werden immer als KI markiert: in der Konsole, und die Captions enden mit
  „Szenen mit KI erstellt.“ Beim Posten auf TikTok „KI-generierter Inhalt“ und auf Instagram
  „KI-Info“ einschalten. Handy-Bildschirme in KI-Szenen sind nie lesbar; die App zeigt immer
  der echte Screen.
- Marke, Tonalität und Regeln kommen aus `PLAYBOOK.md`, `HERO-VIDEO.md`, `agent/prompt.js`
  und `agent/hero-prompt.js`. Änderungen dort gelten ab dem nächsten Lauf.

## Links in den Captions

Instagram und TikTok machen Links in Beschreibungen nicht klickbar. Die Links pro Video
(`utm_campaign` = Kampagnenname) sind für Story-Link-Sticker und später für Anzeigen
gedacht. Für normale Posts bleibt der Bio-Link.

## Nächste Stufe

Automatisch posten nach der Freigabe (Instagram Graph API mit `is_ai_generated`, TikTok
Content Posting API) und bewerben (Meta Marketing API, TikTok Business API) im selben
Budget. Dafür braucht es Entwickler-Apps bei Meta und TikTok; TikTok muss die App vorher
prüfen (bis dahin nur private Posts bzw. Entwürfe in der TikTok-App).
