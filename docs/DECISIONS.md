# Entscheidungen: Wochenreview

Jeden Montag 30 Minuten, genau drei Entscheidungen, eine Zeile Begründung
je Entscheidung (Plan-Punkt 2.11, Leitprinzip 8 in
[`SCALE-PLAN.md`](SCALE-PLAN.md): ein Report statt Dashboards). Diese
Datei ist das Gedächtnis dafür: Was wurde wann entschieden, und auf
welche Zahlen hin. Die Zahlen selbst stehen im Wochenreport des Backends;
hier stehen nur die, auf die sich eine Entscheidung stützt, abgeschrieben
aus dem Report, nie geschätzt.

**Zuletzt geprüft:** 2026-10-03

## Die drei Entscheidungen

1. **Kanal +/−:** Welcher Kanal bekommt mehr Zeit oder Geld, welcher
   weniger oder keins (Einladungen, TikTok, Instagram, Flyer/Campus,
   Creator, Presse). Grundlage: Neue je Quelle und Seed-Cluster im Report,
   Konsole → Kampagnen (Besuche, Anmeldungen, aktiviert in 7 Tagen, Spend
   je Kampagne). Umsetzung: Kampagne anlegen, beenden oder als
   Seed-Kampagne markieren (Konsole → Kampagnen, Konsole → App → Ziele).
2. **Hook-Thema für den Agenten:** ein Thema oder eine Situation, die der
   Marketing-Agent diese Woche ausprobiert (z. B. eine Zielgruppe, ein
   Anlass, ein Ablauf, der zuletzt freigegeben oder verworfen wurde).
   Umsetzung: Konsole → App → „Marketing-Hinweise für den Agenten“
   (`AppConfig.marketingNotes`, höchstens 1.000 Zeichen). Der Agent liest
   den Text bei jedem Lauf als `notes` aus `GET /marketing/context` und
   stellt ihn als „Hinweise des Owners für diese Woche“ über seine eigenen
   Ideen ([`../marketing/AGENT.md`](../marketing/AGENT.md)). Der Text gilt,
   bis du ihn änderst oder leerst; jede Woche neu schreiben.
3. **Budget:** Tages- und Wochenbudget des Agenten (Konsole → Freigabe)
   und Ausgaben je Kampagne (`budgetEurCents` im Kampagnen-Tab). Bezahlte
   Reichweite erst, wenn der Nordstern über 40 % liegt und die Stichprobe
   reicht (Playbook-Regel in `SCALE-PLAN.md`, Abschnitt "North Star").

„Bleibt so“ ist eine gültige Entscheidung, aber nur mit Begründung. Ist
eine Kennzahl im Report als „kleine Stichprobe“ markiert (Kohorte unter
50, Paywall unter 200 Aufrufen je Woche), entscheiden die
Nutzergespräche der Woche ([`RESEARCH.md`](RESEARCH.md)), nicht die
Prozentzahl (Leitprinzip 6).

## Ablauf am Montag

1. **08:00 Report:** Der Leader-Job `weekly` im Backend schickt ab Montag
   08:00 (Europe/Berlin) den Report der letzten vollen Woche (Montag bis
   Sonntag): eine Mail an jeden aktiven Owner (Betreff „Wanna yap? Woche
   <KW>: <Kernzahl>“, mit Link auf die Konsole) und den Push „Wochenreport
   KW <n>“ an Owner, Support und Viewer (Push-Kind `weekly`, je Person in
   den Push-Einstellungen der Konsole abschaltbar). Verpasst der Job den
   Montag, holt er ihn in derselben Woche nach. Details:
   `CMM-backend-new/README.md`, Abschnitt "Weekly report".
2. **Lesen (10 Minuten):** Konsole → Woche (`#weekly`; ältere Wochen über
   die Pfeile oder `#weekly/2026-W40`). Abschnitte: Nordstern gegen Ziel,
   Kohorten W1/W4, Einladungen und k, Neue je Quelle, Plus, Paywall,
   variable Kosten, Alarme der Woche, was gerade wartet (Tickets,
   Freigaben, Meldungen), Nutzergespräche (Ziel 5), Seed-Cluster gegen
   `goals.seedSignupsPerWeek` (Standard 30, Annahme), Betriebsstunden.
3. **Entscheiden (15 Minuten):** die drei Entscheidungen oben.
4. **Quittieren:** im Formular unter dem Report. Pflicht sind die Stunden
   Betrieb dieser Woche in drei Feldern (Alarme, Support, Freigaben; 0 ist
   erlaubt, Ziel zusammen unter 5 Stunden ab Ende Phase 2). Dazu bis zu
   drei Entscheidungen (je höchstens 300 Zeichen). Eine zweite Quittung
   derselben Woche ersetzt die erste. Support kann quittieren, für die
   Dead-Man-Regel zählt nur die Quittung eines Owners.
5. **Eintragen (5 Minuten):** die Woche hier oben unter "Wochen"
   anlegen (Vorlage unten), Hook-Thema in die Marketing-Hinweise, Budget
   und Kampagnen in der Konsole ändern. Commit im App-Repo genügt, kein
   Release nötig.

Ohne Owner-Quittung über 14 Tage meldet das Backend `weekly_silent` an
den Notfallkontakt ([`RUNBOOK.md`](RUNBOOK.md), Alarmliste und
"Quittung und Vertretung").

**Kennzahlen (Plan 2.11):** Wochenreport pünktlich 4 von 4 im Monat;
3 dokumentierte Entscheidungen je Woche; Betriebszeit unter 5 Stunden je
Woche (Ziel ab Ende Phase 2, Annahme).

## Vorlage je Woche

Kopieren, oben unter "Wochen" einfügen, ausfüllen. Zahlen aus dem
Report abschreiben; was der Report nicht zeigt, bleibt „–“.

```markdown
### KW <nn> / <JJJJ> (<TT.MM.>–<TT.MM.>), Review am <TT.MM.JJJJ>

**Zahlen aus dem Report:** Nordstern <x> % (Ziel 40 %, Stichprobe <n>) ·
Gespräche <n> (Vorwoche <n>) · WAU <n> (Vorwoche <n>) · k <x> ·
Seed-Cluster <n> von <Ziel> · Plus netto <+/−n>, MRR <x> € ·
Betriebsstunden <a>/<s>/<f> h (Alarme/Support/Freigaben)

1. **Kanal +/−:** <Entscheidung>. Weil: <Begründung, Zahl oder Gespräch>.
2. **Hook-Thema:** <Entscheidung>. Weil: <Begründung>.
3. **Budget:** <Entscheidung>. Weil: <Begründung>.

**Marketing-Hinweise (AppConfig.marketingNotes):** „<Text, wie in der
Konsole eingetragen>“

**Nachschau:** <Was ist aus den Entscheidungen der Vorwoche geworden?>
```

## Wochen

Neueste Woche oben.

### KW 40 / 2026 (28.09.–04.10.), Review am 05.10.2026

Erste Woche mit Report, noch nicht ausgefüllt.

**Zahlen aus dem Report:** Nordstern – % (Ziel 40 %, Stichprobe –) ·
Gespräche – (Vorwoche –) · WAU – (Vorwoche –) · k – ·
Seed-Cluster – von – · Plus netto –, MRR – € ·
Betriebsstunden –/–/– h (Alarme/Support/Freigaben)

1. **Kanal +/−:** –. Weil: –.
2. **Hook-Thema:** –. Weil: –.
3. **Budget:** –. Weil: –.

**Marketing-Hinweise (AppConfig.marketingNotes):** –

**Nachschau:** erste Woche, keine Vorwoche.
