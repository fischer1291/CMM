# Finanzen: Unit Economics, Kosten, Break-even, Runway

Was die App je Nutzer kostet, was ein Plus-Abo beiträgt, wie viele Abos
die Kosten decken und wie lange das Geld reicht. Die Zahlen rechnet das
Backend (Plan 2.5); hier steht, woher sie kommen, wie sie definiert sind,
was du jeden Monat von Hand prüfst und welche Entscheidung offen ist. Ein
Ort je Thema (Leitprinzip 10 in [`SCALE-PLAN.md`](SCALE-PLAN.md)): die
Rechenregeln im Detail stehen in der Backend-README, Abschnitt "Unit
economics"; Preis-Annahmen stehen in der Konsole, nicht hier.

**Alle Zahlen in diesem Dokument sind Annahmen** aus öffentlichen
Preislisten (Stand 2026) und Erfahrungswerten, bis sie gegen Rechnungen
und Kontoauszüge geprüft sind. Ist-Werte stehen nur in der Konsole und im
Export, nie hier.

**Zuletzt geprüft:** 2026-10-02

## Datenquellen

| Quelle | Was drinsteht | Wo du es siehst |
|---|---|---|
| `MetricsDaily.costs` (Backend, `lib/metrics.js` computeDay und priceCosts) | Mengen des Tages: `smsStarted`, `smsChecked`, `agoraAudioMinutes`, `agoraVideoMinutes` (Teilnehmerminuten je Modus), `cloudinaryUploads`, `pushSent`, `voipSent`; dazu `variableEurCents` (Mengen × Preise, Euro-Cent mit zwei Nachkommastellen) und `perMauEurCents` (= `variableEurCents` / `users.mau`, ohne MAU `null`) | Konsole → Plus → Unit Economics; Export `metrics.csv` |
| `MetricsDaily.plus` (Plan 2.4) | `activeStore`, `activeGift`, `activeSandbox`, `newPaid`, `renewed`, `cancelled`, `billingIssue`, `expired`, `refunds`, `trialsStarted`, `trialsConverted`, `mrrCents` (Summe der monatlich normalisierten Preise aktiver Store-Abos, nur PRODUCTION); seit 2.12 `giftDaysGranted { referral, waitlist, admin }` und `giftToStore` | Konsole → Plus (Kpi-Reihe "Umsatz", Chart MRR); Export `metrics.csv` und `plus.csv` |
| `AppConfig.prices` | Stückpreise, jeder Standard eine Annahme (Tabelle unten) | Konsole → App → Preise (Owner) |
| `AppConfig.fixedCosts` | Bis zu 50 Posten `{ service, monthlyEurCents, note, until }`; Gutschriften (Startup-Credits) als negative Posten mit `until`; ein Posten zählt, solange `until` leer oder nicht vor heute ist | Konsole → App → Fixkosten (Owner) |
| `AppConfig.ops.bankBalanceEurCents` und `ops.bankBalanceAt` | Bankstand, von Hand eingetragen (`null` = unbekannt); das Datum setzt das Backend bei jeder Änderung | Konsole → App → Fixkosten; den Betrag sehen nur Owner (`"•••"` für Support und Viewer), die Runway alle |
| `GET /admin/economics` (Viewer) | Die Monatszahlen unten, gerechnet in `lib/economics.js` summary | Konsole → Plus → Unit Economics |
| `GET /admin/export/<name>.csv` (Owner, mit Audit-Eintrag) | `metrics`, `plus`, `marketing-spend`, `support`. `metrics.csv` trägt die Kostenspalten `agora_audio_min`, `agora_video_min`, `cloudinary_uploads`, `voip_gesendet`, `kosten_variabel_cent`, `kosten_je_mau_cent` und die Geschenk-Spalten `geschenk_tage_einladung`, `geschenk_tage_warteliste`, `geschenk_tage_konsole`, `geschenk_zu_store` | Konsole → Plus → "Export (CSV)"; für Steuerberater und eigene Tabellen |
| `GET /admin/metrics/funnel` (Viewer, Plan 2.4) | Funnel-Stufen je Wochenkohorte | Konsole → Plus |

Die Kostenspalten gibt es ab `METRICS_VERSION` 3; das Backend zählt die
letzten 30 Tage nach einem Versionssprung neu (fünf Tage je Lauf). Ältere
Tage haben keine Kostenspalte. Eine Preisänderung gilt für die Tage, die
ab dann gezählt werden (heute eingeschlossen); fertige Tage behalten ihren
Preis bis zur nächsten Neuzählung.

### Preise (`AppConfig.prices`)

| Schlüssel | Standard (Annahme) | Bedeutung |
|---|---|---|
| `smsEurCents` | 8 | Euro-Cent je gestarteter Prüfung (`smsStarted`); nur dieser eine Preis zählt. Der Plan nennt ≈ 5 ct Verify-Gebühr plus ≈ 8 ct je SMS (DE): beim ersten Abgleich mit der Twilio-Rechnung den tatsächlichen Betrag je gestarteter Prüfung eintragen |
| `agoraAudioUsdCentsPer1000Min` | 99 | US-Cent je 1.000 Teilnehmerminuten Audio (Agora rechnet in Dollar) |
| `agoraVideoUsdCentsPer1000Min` | 399 | US-Cent je 1.000 Teilnehmerminuten Video HD |
| `agoraFreeMinutesPerMonth` | 10.000 | Freiminuten je Monat; jeder Tag bekommt Monatsminuten / Tage des Monats und verrechnet sie zuerst mit Video (Untergrenze der Rechnung) |
| `cloudinaryEurCentsPerUpload` | 0 | Free-Tier |
| `pushEurCentsPer1000` | 0 | Expo-Push und APNs kosten nichts je Nachricht |
| `appleCommissionPct` | 15 | Small Business Program; ohne es 30 |
| `eurPerUsd` | 0,92 | Kurs für die Agora-Preise |
| `plusMonthlyEurCents` | `null` | Listenpreis Monatsabo für den Break-even vor dem ersten Kauf; `null` = letzter echter Kauf |
| `plusYearlyEurCents` | `null` | Listenpreis Jahresabo (ganzer Jahresbetrag), sonst wie oben |

Die Agora-Preise heißen bewusst `…UsdCents…`: wer Euro-Beträge einträgt,
rechnet sie sonst doppelt um. Gespeichert werden nur Preise, die du
geändert hast; ein geleertes Feld setzt den Standard zurück.

## Definitionen (so rechnet das Backend)

Ein "Monat" sind die letzten 30 abgeschlossenen Tage. Haben weniger Tage
eine Kostenspalte, rechnet das Backend auf 30 Tage hoch (`days` in der
Antwort sagt, wie viele Tage gezählt sind). Alle Beträge in Euro-Cent je
Monat; `month.*` in `GET /admin/economics`.

- **Variable Kosten** (`month.variableEurCents`): Summe von
  `costs.variableEurCents` der gezählten Tage, hochgerechnet auf 30 Tage.
  Je Tag (`costs.variableEurCents`):
  `smsStarted × smsEurCents + (Video-Minuten nach Freiminuten × agoraVideoUsdCentsPer1000Min + Audio-Minuten nach Freiminuten × agoraAudioUsdCentsPer1000Min) / 1000 × eurPerUsd + cloudinaryUploads × cloudinaryEurCentsPerUpload + (pushSent + voipSent) / 1000 × pushEurCentsPer1000`.
  Teilnehmerminuten: ein 1:1-Talk zählt seine Sekunden zweimal und nimmt
  den Modus aus `Call.video`; eine Runde hat einen `Talk` je Teilnehmer
  und zählt als Video. Video zählt immer als Agora-HD (siehe unten).
- **Variable Kosten je MAU** (`month.perMau`): variable Kosten / `users.mau`
  des letzten Snapshots. Die Tageswerte stehen in `costs.perMauEurCents`.
  Daneben `month.minutesPerMau { audio, video }` (Teilnehmerminuten je
  aktivem Nutzer und Monat) und `month.perTalkMinute` (variable Kosten je
  Gesprächsminute; Gesprächsminuten wie in den Stats: 1:1-Minuten plus
  Rundenminuten je Teilnehmer).
- **Netto-Umsatz** (`month.netRevenueCents`): `mrrCents × (1 − appleCommissionPct / 100)`.
- **Deckungsbeitrag** (`month.contributionCents`): Netto-Umsatz − variable
  Kosten; je MAU `month.contributionPerMau` (die Konsole zeigt ihn auch je
  Tag). Leitplanke im Plan: > 0 ab Phase 3.
- **Deckungsbeitrag je Plus-Abo** (`month.perPlusSub`):
  `mrrCents / activeStore × (1 − Provision) − variable Kosten je MAU`.
  Annahme dahinter: ein Plus-Nutzer kostet so viel wie ein
  durchschnittlicher aktiver Nutzer.
- **Break-even-Abozahl** (`breakEvenYearlySubs`, `breakEvenMonthlySubs`):
  `(Fixkosten + variable Kosten der Free-Nutzer) / (Monatspreis × (1 − Provision) − variable Kosten je MAU)`,
  aufgerundet. Variable Kosten der Free-Nutzer = variable Kosten −
  `activeStore` × Kosten je MAU. Monatspreis
  (`planPriceMonthlyCents { yearly, monthly }`): letzter
  PRODUCTION-Kauf des Jahres- bzw. Monatsprodukts (Jahr / 12), sonst
  `plusYearlyEurCents / 12` bzw. `plusMonthlyEurCents`. `null` ohne Preis
  oder wenn der Beitrag je Abo ≤ 0 ist.
- **Verbrauch** (`burnEurCents`): Fixkosten + variable Kosten − Netto-Umsatz.
- **Runway** (`runwayMonths`): Bankstand / Verbrauch, eine
  Nachkommastelle; `null` ohne Bankstand oder ohne Verbrauch (Umsatz deckt
  die Kosten). Ziel im Plan: > 12 Monate.

## Beispielrechnung (aus dem Plan, Annahmen)

Übernommen aus [`SCALE-PLAN.md`](SCALE-PLAN.md), Abschnitt "Unit
Economics und Cash-Plan". Sie steht hier, damit du sie mit den Messwerten
aus der Konsole ersetzt, nicht damit du sie glaubst. In Klammern das Feld,
das den Messwert liefert.

**Nutzungsannahme:** 2 Gespräche/Woche × 8 Minuten × 2 Teilnehmer ≈ 139
Teilnehmerminuten/Monat (Messwert: `month.minutesPerMau.audio + .video`).
ARPPU 3 €/Monat, Jahresabo entsprechend günstiger (Messwert:
`month.mrrCents / month.activeStore`).

| Posten | Video-Default | Audio-Default |
|---|---|---|
| Variable Kosten je MAU (Agora) (`month.perMau`, Anteil Agora aus `agora_*_min` × Preis) | ≈ 0,55 $ ≈ 0,50 € | ≈ 0,14 $ ≈ 0,13 € |
| SMS einmalig je Registrierung (1,5 SMS) (`costs.smsStarted` × `smsEurCents` / neue Nutzer) | ≈ 0,15–0,20 € | ≈ 0,15–0,20 € |
| Push/Cloudinary (`cloudinaryUploads`, `pushSent`, `voipSent`) | < 0,02 € | < 0,02 € |
| Erlös je MAU bei 3 % Free→Paid × 3 € × 85 % (`month.netRevenueCents / month.mau`) | ≈ 0,08 € | ≈ 0,08 € |
| Erlös je MAU bei 10 % Conversion | ≈ 0,26 € | ≈ 0,26 € |
| Deckungsbeitrag je MAU bei 2–5 % Conversion (`month.contributionPerMau`) | ≈ −0,40 € | knapp negativ bis null |
| Deckungsbeitrag je Plus-Abo (3 € × 0,85 − variable Kosten) (`month.perPlusSub`) | ≈ 2,05 € | ≈ 2,42 € |
| Je Nicht-Zahler | ≈ −0,50 € | ≈ −0,13 € |

Folge: Mit Video-Default ist der Deckungsbeitrag je MAU bei realistischer
Consumer-Conversion negativ. Positiv wird er erst bei ≥ 10–15 %
Conversion oder höherem Preis. Die ersten ≈ 70 MAU/Monat sind durch die
10.000 Agora-Freiminuten kostenfrei (`agoraFreeMinutesPerMonth`), deshalb
fällt das Problem erst ab ≈ 500 MAU in der Rechnung auf.

### Break-even-Abozahl (Annahmen)

Break-even = (Fixkosten + variable Kosten der Free-Nutzer) /
Deckungsbeitrag je Abo (Messwert: `breakEvenYearlySubs`,
`breakEvenMonthlySubs`).

| Szenario | Rechnung | Abos | Conversion |
|---|---|---|---|
| 300 € Fixkosten, 1.000 MAU, Video-Default | (300 + 485) / 2,05 | ≈ 380 | 38 % (unrealistisch) |
| 300 € Fixkosten, 1.000 MAU, Audio-Default | (300 + 126) / 2,42 | ≈ 176 | 17,6 % |
| 300 € Fixkosten, 10.000 MAU, Audio-Default | (300 + 1.300) / 2,42 | ≈ 660 | 6,6 % |
| Nur Fixkosten 350 €, Audio-Default | 350 / 2,42 | ≈ 145 | |
| Nur Fixkosten 350 €, Video-Default | 350 / 2,05 | ≈ 170 | |

Rückrechnung: Bei 2–5 % Free→Paid und ≈ 3 € ARPPU braucht 1.000 € MRR
etwa 7.000–15.000 MAU. Deshalb muss der Deckungsbeitrag je MAU positiv
sein, bevor du Reichweite kaufst.

### Cash-Plan (Annahmen)

Fixkosten heute ≈ 150–250 €/Monat (Render, Atlas, Expo/EAS, Apple
Developer ≈ 8 €/Monat, Domains, Mailanbieter, KI-Marketing bis 108 €/Monat).
Ab Phase 2 laufend ≈ 350–600 €/Monat ohne dein Gehalt, Einmalposten
≈ 4.000–10.000 € (Anwalt, Marke, Pentest, Versicherung, Rechtsform), Media
nur aus freigegebenem Budget; Summe ≈ 9.000–18.000 € in 12 Monaten. Die
neuen Posten je Phase und die Kostenkurve bei Skalierung stehen im Plan.
Regel: Fixkosten erhöhst du nur mit Eintrag in `AppConfig.fixedCosts`,
dann stimmen Break-even und Runway von selbst.

## Offene Entscheidung Ende Phase 2: Video-Default oder Audio-Default

**Frage:** Bleibt Video der Standard für alle (heute), oder wird Audio der
Standard und Video ein Plus-Merkmal bzw. ein Video-Minutenkontingent für
Free (z. B. 60 Videominuten/Monat, Rest Audio; Zahl ist eine Annahme)?

**Grundlage:** gemessene Teilnehmerminuten je Modus
(`month.minutesPerMau`, `agora_audio_min`/`agora_video_min` im Export),
`month.contributionPerMau` und `month.perPlusSub` über mindestens 4 Wochen
mit gezählten Kostenspalten, dazu die Beispielrechnung oben. Hebel in
dieser Reihenfolge (Plan): (1) Video als Plus-Merkmal oder Kontingent,
(2) höherer Jahresabo-Anteil (Trial auf yearly), (3) Agora-Staffel oder
anderer Anbieter erst ab ≥ 500.000 min/Monat, (4) Kreis-/Campus-Lizenz,
falls der Stop-Loss greift.

**Technischer Hebel:** Plan-Limit `video` in `lib/plan.js`
`DEFAULT_LIMITS` (Backend), einstellbar unter Konsole → Plus → Grenzen:
`true` (Video wie heute, Standard für Free und Plus), `false` (immer
Audio) oder ganze Videominuten je Kalendermonat (Europe/Berlin; gezählt
werden angenommene Videoanrufe, die die Person gestartet hat).
`lib/calls.js` startCall startet den Anruf sonst als Audio, die Antwort
trägt `videoDowngraded: "plan_limit"`, und der Anrufer bekommt das
Socket-Event `callVideoDowngraded { reason: "plan_limit", target, channel }`.

**Voraussetzung:** Die App wertet `callVideoDowngraded` noch nicht aus.
Bevor du `video` auf etwas anderes als `true` setzt, muss ein App-Build
das Event behandeln (Anrufer wechselt auf Audio und sagt es freundlich),
sonst zeigt der Anrufer Video, während die angerufene Person einen
Audioanruf bekommt. Dazu die Vergleichszeile "Video" in der Plus-Ansicht
anpassen.

**Warum nicht `hdVideo`:** Das bestehende Limit `hdVideo` (Free `false`,
Plus `true`; `app/room.tsx` und `app/videocall.tsx` applyVideoQuality)
ändert nur die Auflösung. Agora rechnet Video in Stufen nach Auflösung ab,
und 640×360 liegt in derselben HD-Stufe wie 720p; einen günstigeren
SD-Tarif gibt es nicht. `hdVideo` senkt also keine Agora-Kosten, deshalb
meldet die App auch keine Qualität und das Backend zählt jedes Video als
HD. Kosten senkt nur weniger Video, also das Limit `video`.

**Eintrag:** Entscheidung mit Datum, Messwerten und Begründung hier unter
"Entscheidungen" (bis `docs/DECISIONS.md` existiert).

## Monatsroutine: 5. des Monats

Teil des Betriebsrhythmus im Plan ("Monatlich am 1. und bis zum 5.").
Etwa 30 Minuten:

1. **Rechnungen gegen `prices` abgleichen:** Twilio (Preis je gestarteter
   Prüfung → `smsEurCents`), Agora (Audio-/Videopreis in US-Cent,
   Freiminuten, Kurs → `agora…UsdCentsPer1000Min`,
   `agoraFreeMinutesPerMonth`, `eurPerUsd`), Cloudinary (Credits, ab
   bezahltem Tarif `cloudinaryEurCentsPerUpload`), Apple (Provision 15 oder
   30 % → `appleCommissionPct`). Konsole → App → Preise.
2. **Agora-Minuten gegen die Rechnung:** Summe `agora_audio_min` und
   `agora_video_min` des Vormonats aus `metrics.csv` gegen die
   Minuten auf der Agora-Rechnung. Das Backend verrechnet Freiminuten
   zuerst mit Video, also ist `kosten_variabel_cent` eine Untergrenze.
   Weicht die Minutenzahl deutlich ab, ist die Zählung falsch, nicht der
   Preis: Issue im Backend-Repo.
3. **Fixkosten nachziehen:** neue Dienste, Preisänderungen, Credits mit
   Ablaufdatum (`until`), Ops-Posten (Uptime-Monitor, Sentry, Staging).
   Konsole → App → Fixkosten.
4. **Bankstand eintragen:** Konsole → App → Fixkosten → Bankstand. Dann
   Runway und Break-even in Konsole → Plus → Unit Economics ansehen.
5. **Belege:** Rechnungen an Steuerberater/Buchhaltungstool; bei Bedarf
   `metrics.csv` und `plus.csv` exportieren.

Ab Phase 3 holt `finance.yml` den Apple Financial Report und gleicht ihn
ab (Plan 3.9); bis dahin ist dieser Abgleich Handarbeit.

## Steuer und Buchhaltung

Antworten des Steuerberater-Erstgesprächs (Plan 1.7), sobald es
stattgefunden hat:

| Frage | Antwort | Datum |
|---|---|---|
| Kleinunternehmerregelung § 19 UStG ja/nein | offen | |
| Reverse-Charge für Apple Distribution International, Anthropic, Google, Twilio, Render inkl. USt-Voranmeldung und Zusammenfassende Meldung | offen | |
| EÜR und Vorauszahlungen | offen | |

## Entscheidungen

| Datum | Entscheidung | Messwerte | Begründung |
|---|---|---|---|
| | Video-Default vs. Audio-Default (offen bis Ende Phase 2) | | |
