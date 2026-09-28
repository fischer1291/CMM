# Marketing-Agent (Stufe 1)

Jeden Morgen entwirft ein Agent neue Werbevideos für Instagram Reels und TikTok.
Du gibst sie in der Admin-Konsole frei und postest sie selbst.

```
GitHub Action (täglich)          Backend (Render)                 Du
─────────────────────────        ──────────────────────────        ─────────────────────────
Zahlen + frühere Entscheidungen ← GET  /marketing/context
Claude schreibt 2 Entwürfe
Videos rendern (Vorlagen)
Entwürfe + MP4 hochladen       → POST /marketing/drafts
                                 PUT  /marketing/drafts/:id/video → Cloudinary
                               → POST /marketing/notify           → Mail „2 Werbevideos warten“
                                                                    Konsole → Freigabe:
                                                                    ansehen, freigeben oder
                                                                    mit Grund verwerfen,
                                                                    MP4 laden, posten, abhaken
```

Der Grund beim Verwerfen und was gepostet wurde, gehen am nächsten Tag an den Agenten
zurück, zusammen mit den Besuchen und Anmeldungen pro Kampagne.

## Einmal einrichten

1. **Schlüssel für den Agenten erzeugen**, z. B. `openssl rand -hex 32`.
2. **Render → Backend → Environment:** `MARKETING_AGENT_KEY` = dieser Schlüssel.
   Ohne ihn lehnt das Backend den Agenten ab.
3. **Anthropic-API-Schlüssel** in der [Claude Console](https://console.anthropic.com)
   anlegen (Zahlungsmittel hinterlegen).
4. **GitHub → CMM → Settings → Secrets and variables → Actions → New repository secret:**
   - `ANTHROPIC_API_KEY`
   - `MARKETING_AGENT_KEY` (derselbe wie auf Render)
5. **Testen:** GitHub → Actions → Marketing-Agent → *Run workflow*. Nach 5–10 Minuten
   stehen die Videos in der Konsole unter **Freigabe**, und die Owner bekommen eine Mail
   (wenn SMTP eingerichtet ist).

Danach läuft er jeden Morgen um ca. 6 Uhr von selbst. GitHub pausiert geplante
Workflows, wenn im Repository 60 Tage lang nichts passiert; dann dort wieder aktivieren.

## Lokal ausprobieren

```bash
cd marketing
npm install
ANTHROPIC_API_KEY=… node agent/daily.js --dry-run   # rendert nach dist/agent/, lädt nichts hoch
```

Braucht wie `npm run video` Google Chrome und ffmpeg.

## Was der Agent darf und was nicht

- Er schreibt nur Texte für drei feste Vorlagen (`src/templates.js`: chat, moment,
  list). HTML schreibt er nicht, alle Texte werden escaped, Längen sind begrenzt.
- Er kann Entwürfe anlegen und Zahlen lesen, aber nichts freigeben, posten oder
  Geld ausgeben. Freigeben können nur Owner in der Konsole.
- Marke, Tonalität und Regeln kommen aus `PLAYBOOK.md` (Abschnitte 1, 5 und 6) und
  `agent/prompt.js`. Änderungen dort gelten ab dem nächsten Lauf.

## Kosten

Ein Lauf ist eine Anfrage an Claude (`claude-opus-5`, mit `AGENT_MODEL` änderbar), meist
wenige Cent bis unter einem Euro. Die Videos liegen auf Cloudinary (je 2–4 MB).
GitHub Actions ist für private Repositories bis 2.000 Minuten im Monat kostenlos, ein
Lauf braucht etwa 5–10 Minuten.

## Links in den Captions

Instagram und TikTok machen Links in Beschreibungen nicht klickbar. Die Links pro Video
(`utm_campaign` = Kampagnenname) sind für Story-Link-Sticker und später für Anzeigen
gedacht. Für normale Posts bleibt der Bio-Link; seine Besuche erscheinen in der
Konsole unter seiner eigenen Kampagne.

## Stufe 2 und 3

Automatisch posten (Instagram Graph API, TikTok Content Posting API) und bewerben
(Meta Marketing API, TikTok Business API) mit fester Budgetgrenze. Dafür braucht es
Entwickler-Apps bei Meta und TikTok; TikTok muss die App vorher prüfen.
