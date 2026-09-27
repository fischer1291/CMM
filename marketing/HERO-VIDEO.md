# Hero-Video mit KI

45 Sekunden, für Landing Page, YouTube, Presse und als Anzeige mit hohem Budget.
Die KI liefert die Szenen mit Menschen. Die App selbst, die Untertitel und die
Endkarte kommen aus echtem Material und aus `npm run hero`.

**Wofür das Video nicht taugt:** als App-Store-Preview. Apple verlangt dort
echte Aufnahmen aus der App (siehe „Store-Preview“ unten).

---

## Ablauf

1. **Figuren festlegen:** Mit einem Bildmodell je ein Referenzbild für Lena, Jonas
   und Oma Gisela erzeugen (Beschreibungen unten). Das beste Bild pro Figur behalten.
   Ohne diese Referenzen sieht Lena in jedem Shot anders aus.
2. **Shots generieren:** Pro Shot den Prompt unten plus den Stil-Block einsetzen,
   bei Figuren das Referenzbild mitgeben (Image-to-Video bzw. „Referenzen/Elemente“
   im Tool). Pro Shot 3–6 Versuche einplanen und den besten nehmen.
3. **In beiden Formaten erzeugen:** 16:9 für Web und YouTube, 9:16 für Reels,
   TikTok und Stories. Aus 16:9 hochkant zuzuschneiden verliert zu viel vom Bild.
4. **Ablegen:** `hero/clips/16x9/01.mp4` … `10.mp4` und `hero/clips/9x16/01.mp4` … Clips
   dürfen länger sein, das Skript kürzt sie auf die Länge in `hero/shots.json`.
5. **Shot 05 ist echt:** Bildschirmaufnahme der App im Simulator (Status-Ring
   antippen). Siehe „Echte App-Aufnahmen“.
6. **Ton:** `hero/audio/voiceover.mp3` (Sprechertext unten) und
   `hero/audio/music.mp3`. Die Musik wird unter der Stimme automatisch leiser.
**Feinschliff in `hero/shots.json`:**
- `clip`: anderen Dateinamen für einen Shot verwenden (z. B. `"clip": "03"`).
- `ambience`: Lautstärke des Clip-eigenen Tons, oben für alle oder pro Shot (derzeit 0: nur Stimme und Musik).
- `musicVolume`, `voiceVolume`: Balance; die Musik wird unter der Stimme zusätzlich abgesenkt, der fertige
  Ton auf -16 LUFS normalisiert (üblich für TikTok, Instagram, YouTube).
- `fallback`: Ersatz, solange der Clip fehlt (Shot 08 nutzt die animierte Yap-Moment-Einblendung).
- `voice.cues`: welcher Abschnitt der Sprachaufnahme (`from`/`to` in Sekunden) bei welchem Shot beginnt
  (`offset`). Die Grenzen nicht nach Gehör raten, sondern aus dem Wort-Transkript nehmen:
  `npm run transcribe -- hero/audio/voiceover.wav` (lokale Spracherkennung von macOS, fragt beim ersten
  Mal nach Zugriff). Richtwert: `from` 0,15 s vor dem ersten Wort, `to` 0,2 s nach dem letzten.
- Untertitel erscheinen automatisch mit dem Einsatz ihres Satzes, nicht schon mit dem Schnitt.
- Zu kurze Clips halten ihr letztes Bild. Formate ohne einen einzigen Clip werden übersprungen.

**Qualitätsbericht:** `npm run hero` prüft nach jedem Schnitt automatisch, dass die Tonspur keine
Lücken hat, Bild und Ton gleich lang sind, die Lautheit bei -16 LUFS liegt (Spitze unter -1 dBFS) und
pro Shot Untertitel und Stimme innerhalb des Shots liegen. Schlägt etwas fehl, bricht das Skript mit
einer Liste der Probleme ab. `npm run music` richtet die Musik an denselben Schnittzeiten aus
(Aufbruch beim ersten App-Shot, Beats auf den Schnitten, Schlussakkord exakt auf der Endkarte).
Nach Änderungen an der Shotliste deshalb beides neu: `npm run music && npm run hero`.

7. **Schneiden:** `npm run video -- endcard && npm run hero` ergibt
   `dist/video/hero-16x9.mp4` und `hero-9x16.mp4`. Fehlende Clips erscheinen als
   beschriftete Platzhalter, so kannst du das Timing schon vorher prüfen.

## Werkzeuge und Kosten

- **Video:** Google Veo (in Gemini/Flow oder per API), Kling, Runway oder Sora. Für
  realistische Menschen und gleichbleibende Figuren sind Veo und Kling derzeit am
  stärksten. Nimm ein Tool für alle Shots, damit der Look einheitlich bleibt.
- **Figurenbilder:** ein Bildmodell deiner Wahl (z. B. Gemini, Midjourney).
- **Stimme:** am glaubwürdigsten ist deine eigene (iPhone in einem stillen Raum
  mit Decke drumherum reicht). Alternativ eine KI-Stimme mit kommerzieller Lizenz.
- **Musik:** `npm run music` erzeugt eine eigene, per Code komponierte Spur
  (`hero/audio/music.wav`, 90 bpm, Aufbruch genau bei Sekunde 16, wenn die App
  erscheint). Daran gibt es keine fremden Rechte. Wer eine produzierte Spur will:
  nur mit Lizenz für Werbung (Musikbibliothek im Abo oder ein KI-Musiktool mit
  kommerziellen Rechten), einfach als `hero/audio/music.mp3` ablegen.
- **Budget:** realistisch **50–200 €** für einen Monat Abo bzw. Credits, je nachdem
  wie viele Versuche du brauchst. Ein Dreh mit Videograf läge eher bei 1.500–5.000 €.

Prüfe vor der Veröffentlichung die aktuellen Nutzungsbedingungen des Tools: Die
kommerzielle Nutzung ist meist nur in den bezahlten Stufen erlaubt.

## Regeln, damit es nicht billig wirkt und rechtlich sauber bleibt

- **Keine lesbaren Handy-Bildschirme in KI-Shots.** Von KI erzeugte App-Oberflächen
  sehen falsch aus und würden die App falsch darstellen. Das Handy immer von hinten,
  von der Seite oder unscharf zeigen, das Licht auf dem Gesicht erzählt den Rest.
- **Keine Ähnlichkeit mit echten Personen**, keine Prominenten, keine echten Marken
  im Bild.
- **Kennzeichnen:** TikTok und Meta verlangen, realistische KI-Inhalte als solche zu
  markieren (Schalter „KI-generiert“ beim Hochladen). Auch die Transparenzpflichten
  des EU AI Act sprechen dafür. Ein kleines „Szenen mit KI erstellt“ in der
  Videobeschreibung genügt.
- **Keine gestellten Erfahrungsberichte:** Die KI-Figuren sind Szenen, keine „Nutzer“.
- **Ehrlicher Hinweis zur Zielgruppe:** Eine App für echte Gespräche, beworben mit
  KI-Menschen, kann auf TikTok Kommentare wie „KI-Leute für echte Verbindung?“
  auslösen. Setz das Hero-Video deshalb vor allem auf Landing Page, YouTube und in
  der Presse ein. Auf TikTok und Reels funktionieren echte Menschen (UGC, du als
  Gründer) meist besser, siehe PLAYBOOK §5.

---

## Stil-Block (an jeden Prompt anhängen)

```
Cinematic 35mm film look, shallow depth of field, soft natural film grain, warm tungsten
practical lights indoors, cool blue night tones outdoors, subtle cyan and magenta neon
accents in reflections, realistic skin texture, candid documentary feel, slight handheld
movement, contemporary Germany. No text, no logos, no subtitles, phone screen never
readable (seen from behind, from the side or out of focus).
```

## Figuren

- **Lena**, 21, Studentin, gerade in eine neue Stadt gezogen: schulterlange dunkle Locken,
  leichte Sommersprossen, übergroßer cremefarbener Strickhoodie, kleine silberne Creolen.
  `21-year-old German woman, shoulder-length dark curly hair, light freckles, oversized cream knit hoodie, small silver hoop earrings`
- **Jonas**, 23, ihr bester Freund aus der Heimat, lebt in Hamburg: kurze dunkelblonde
  Haare, leichter Bart, olivgrüne Bomberjacke über grauem Hoodie.
  `23-year-old German man, short dark-blond hair, light stubble, olive-green bomber jacket over a grey hoodie`
- **Oma Gisela**, 78: silberner Bob, runde Brille, bordeauxfarbene Strickjacke, warmes Lächeln.
  `78-year-old German grandmother, silver bob haircut, round glasses, burgundy cardigan, warm smile`

---

## Shots und Prompts

Längen und Untertitel stehen in `hero/shots.json`. Die Untertitel brennt das Skript
ein, deshalb nie Text im KI-Bild.

**01 · 4 s · Hook**
```
Extreme close-up of a young woman's face at night, lit only by the cold glow of her phone,
her thumb scrolling endlessly, eyes tired, reflections of chat bubbles as soft abstract light
on her face. Slow push in.
```

**02 · 4 s · Lena, neues Zimmer**
```
[Lena] sits cross-legged on her bed in a small student room in Leipzig at night, unpacked moving
boxes, fairy lights, she types a message on her phone, pauses, sighs and lets the phone sink to
her lap. Medium shot, static camera.
```

**03 · 4 s · Jonas, S-Bahn**
```
[Jonas] sits by the window of a nearly empty Hamburg S-Bahn at night, city lights streaking past,
earbuds in, looking at his phone, bored, thumb hovering. Medium close-up from the opposite seat.
```

**04 · 4 s · Verpasst**
```
A smartphone lies face down on a rumpled bed and vibrates, its edge glowing, while the room is
empty and a bathroom door is steamed up in the background. Then a quick second angle: the phone
stops buzzing. Static close-up, melancholic, slightly comedic timing.
```

**05 · 4 s · ECHTE APP (keine KI)**
Bildschirmaufnahme: Status-Ring antippen, er leuchtet auf. Optional: ein KI-Shot
einer Hand, die ein Handy von hinten hält, und die Aufnahme groß darübergelegt.

**06 · 4 s · Jonas sieht es**
```
Close-up of [Jonas] on the S-Bahn, a soft cyan light suddenly brightens his face from the phone,
his expression changes from bored to a genuine smile, he taps once and lifts the phone to video
call. Shallow depth of field.
```

**07 · 5 s · Das Gespräch**
```
[Lena] lying on her bed, holding her phone above her face on a video call (screen facing away from
camera), laughing out loud, completely relaxed, warm fairy light bokeh. Slow gentle orbit.
```

**08 · 4 s · Yap Moment**
```
Quick montage feeling in one shot sequence: [Oma Gisela] in a cosy kitchen looks up from her tablet
and smiles; three flatmates on a small city balcony glance at their phones at the same moment;
a young man at a bus stop at dusk checks his phone and grins. Same warm cinematic grade.
```
Tipp: als drei kurze Clips generieren und je ca. 1,3 s verwenden (vorher zu einer
Datei `08.mp4` zusammenfügen) oder einen Clip mit Kamerafahrt.

**09 · 4 s · Sonntagsritual**
```
Sunday afternoon in a warm living room, [Oma Gisela] and a grandfather sit at a table with coffee
and plum cake, waving and laughing at a tablet propped against a vase (screen facing away),
soft window light.
```

**10 · 3 s · Ausklang**
```
[Lena] puts her phone face down on the bed, smiles to herself and lets herself fall back into the
pillows, content. Top-down shot, fairy lights, calm.
```

Danach folgt die Endkarte (5 s, aus `npm run video -- endcard`).

---

## Sprechertext (ca. 40 s, ruhig, warm, nicht werblich)

> Wir schreiben hundert Nachrichten … und telefonieren nie.
> Nicht, weil wir nicht wollen. Sondern weil das Timing nie passt.
> Wanna yap? zeigt dir, wer aus deinen Leuten gerade Zeit hat.
> Ein Tipp – und ihr erwischt euch.
> *(Pause, Lachen aus dem Gespräch)*
> Jeden Tag der Yap Moment: zehn Minuten, in denen alle Zeit haben.
> Rituale mit deinen Menschen. Ganz von allein.
> Kein Feed. Keine Likes. Keine Fremden.
> Wanna yap? Ruf an, wenn’s passt.

---

## Echte App-Aufnahmen (Shot 05 und Store-Preview)

```bash
xcrun simctl io booted recordVideo --codec h264 --force hero/clips/app-raw.mov
```

Aufnahme mit Ctrl+C beenden, dann auf die gewünschte Stelle zuschneiden, zum Beispiel:

```bash
ffmpeg -ss 2 -t 4 -i hero/clips/app-raw.mov -vf "scale=1080:-2" hero/clips/9x16/05.mp4
```

Für 16:9 die Hochkant-Aufnahme auf einen Hintergrund setzen oder mit einem
KI-Shot einer Hand mit Handy kombinieren.

**Store-Preview (App Store):** 15–30 s, nur echte Aufnahmen aus der App, für das
6,9″-iPhone 886×1920 Pixel hochkant, 30 fps. Dafür brauchen wir ein Testkonto mit
Beispielfreunden, damit Status, Yap Moment und Kreise gefüllt sind. Das ist der
nächste Schritt nach der Aufnahme-Session.
