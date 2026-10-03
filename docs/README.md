# Docs: Index

Alle Betriebs-, Release- und Planungsdokumente der App und des Backends
liegen hier (ein Ort je Thema, Leitprinzip 10 in `SCALE-PLAN.md`). Jede
Datei hat einen Owner und ein Datum "zuletzt geprüft"; älter als 90 Tage
heißt: lesen, korrigieren, Datum setzen (Kennzahl aus Plan 1.8). Die
Ausnahme im Backend-Repo ist `CMM-backend-new/COMPLIANCE.md`, weil die
CI sie gegen die Modelle prüft.

| Datei | Zweck | Owner | Zuletzt geprüft |
|---|---|---|---|
| [`RUNBOOK.md`](RUNBOOK.md) | Alarmliste mit Gegenmaßnahmen (seit Phase 2 auch `gift_days`, `pepper_changed`, `sentry_fatal`, `review_login`, `purchase_failures`, `weekly_silent`, `agora_tokens`), Störungs-Banner aus Alarmen mit Nutzerwirkung (Hand gewinnt, Abschalten, Support-Auto-Antwort, Postmortem-Pflicht), Quittung von Morgen-Push und Wochenreport, Dead-Man-Regeln, Kill-Switch, Phased Release, Twilio gesperrt, Datenpanne, Backup und Restore, Rollback (`api/…`-Tags), Deploy-Fenster, genau eine Instanz | | 2026-10-03 |
| [`POSTMORTEM-TEMPLATE.md`](POSTMORTEM-TEMPLATE.md) | Vorlage für Postmortems: Kopf (Datum, Dauer, Alarm-Tag, Nutzerwirkung, Banner, Autor), Zeitlinie, Ursache, was half und was nicht, Alarm rechtzeitig, Maßnahmen als GitHub-Issues | | 2026-10-03 |
| [`incidents/`](incidents/README.md) | Postmortems: jeder Alarm mit Nutzerwirkung binnen 5 Werktagen, Dateiname `JJJJ-MM-TT-<tag>.md`, keine personenbezogenen Daten; Datenpannen laufen über `RUNBOOK.md` | | 2026-10-03 |
| [`DECISIONS.md`](DECISIONS.md) | Wochenreview am Montag: Ablauf mit dem Wochenreport (Mail/Push 8 Uhr, Konsole → Woche, Quittung mit Betriebsstunden), genau drei Entscheidungen je Woche (Kanal, Hook-Thema für den Agenten in `AppConfig.marketingNotes`, Budget), Vorlage und Protokoll | | 2026-10-03 |
| [`FINANCE.md`](FINANCE.md) | Unit Economics: Datenquellen (`MetricsDaily.costs`, `AppConfig.prices`/`fixedCosts`, `GET /admin/economics`, CSV-Exporte), Definitionen wie das Backend rechnet, Beispielrechnung und Cash-Plan (Annahmen), offene Entscheidung Video- vs. Audio-Default, Monatsroutine am 5., Steuerberater-Antworten | | 2026-10-02 |
| [`PLUS.md`](PLUS.md) | Wanna yap+: Produkt-IDs, Entitlement, Offerings `default`/`winback`, wo die Preise stehen, Webhooks, Einrichtung in App Store Connect (Trial 7 Tage, Grace Period 16 Tage, Family Sharing, Win-back), Paywall-Funnel und Quellen (`?from=`), Flag `plus_interest`, Checkliste "Preis ändern" | | 2026-10-02 |
| [`SERVICES.md`](SERVICES.md) | Jeder Dienst mit Zweck, Kontoinhaber, Vault-Eintrag, Kosten, Ablauf und wie man Zugang gewährt oder entzieht (seit 2.1a/2.1b auch Sentry für App und Backend) | | 2026-10-03 |
| [`EMERGENCY.md`](EMERGENCY.md) | Fällt der Gründer aus: 30 Tage weiterführen oder geordnet einstellen; Checkliste für Vollmacht und Notfallzugang | | 2026-10-01 |
| [`SCALE-PLAN.md`](SCALE-PLAN.md) | Der 12-Monats-Plan: Phasen, Punkte, Kennzahlen, Unit Economics | | 2026-10-01 |
| [`RELEASE.md`](RELEASE.md) | Checkliste für TestFlight und App Store, OTA oder Store-Build (Rollback, Tags `ios/…` und `api/…`, Phased Release), Crash-Telemetrie mit Sentry (DSN, dSYMs, Datenschutz, Alarm-Webhook, Backend-DSN), Demo-Zugang mit `REVIEW_UNTIL`, Testmatrix vor jedem Release | | 2026-10-03 |
| [`APPSTORE.md`](APPSTORE.md) | Texte und Screenshots für App Store Connect zum Kopieren | | |
| [`DEV_SETUP.md`](DEV_SETUP.md) | Dev- und Prod-Variante der App parallel auf einem Gerät; Pods nach neuen nativen Modulen (`npx pod-install`) | | 2026-10-02 |
| [`PRIVACY-CHANGE.md`](PRIVACY-CHANGE.md) | Datenschutz-Änderungsprozess: was jede neue Datenart im PR mitbringt | | 2026-10-01 |
| [`RESEARCH.md`](RESEARCH.md) | Nutzerforschung als Prozess: Rekrutierung, Leitfaden, Ablage | | 2026-10-01 |
| [`adr/`](adr/) | Architekturentscheidungen, eine Datei je Entscheidung (`0001-i18n.md`: keine Übersetzung, Locale nur messen) | | 2026-10-01 |
| [`brand/`](brand/) | Logo, App-Icon und Splash als Code, Export-Skripte | | |
| [`history/`](history/) | Historische Fix-Notizen (Anruf-Architektur, Crashes, Migration); nur zum Nachlesen, nicht gepflegt | | n. a. |

Außerhalb dieses Ordners: `../CLAUDE.md` (Konventionen für die Arbeit im
App-Repo), `../README.md` (Setup), `../CHANGELOG.md` (was Nutzer je Version
merken; Quelle der GitHub-Releases), `../marketing/AGENT.md` (Marketing-Agent, liest die Marketing-Hinweise aus der Wochenreview),
`CMM-backend-new/README.md` (Umgebungsvariablen, Health Check, Backup,
Alarme, Team), `CMM-backend-new/COMPLIANCE.md` (Verarbeitungsverzeichnis,
Auftragsverarbeiter), `CMM-backend-new/CLAUDE.md`.
