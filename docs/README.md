# Docs: Index

Alle Betriebs-, Release- und Planungsdokumente der App und des Backends
liegen hier (ein Ort je Thema, Leitprinzip 10 in `SCALE-PLAN.md`). Jede
Datei hat einen Owner und ein Datum "zuletzt geprüft"; älter als 90 Tage
heißt: lesen, korrigieren, Datum setzen (Kennzahl aus Plan 1.8). Die
Ausnahme im Backend-Repo ist `CMM-backend-new/COMPLIANCE.md`, weil die
CI sie gegen die Modelle prüft.

| Datei | Zweck | Owner | Zuletzt geprüft |
|---|---|---|---|
| [`RUNBOOK.md`](RUNBOOK.md) | Alarmliste mit Gegenmaßnahmen, Quittung und Dead-Man-Regel, Kill-Switch, Phased Release, Twilio gesperrt, Datenpanne, Backup und Restore, Rollback, Deploy-Fenster, genau eine Instanz | | 2026-10-01 |
| [`SERVICES.md`](SERVICES.md) | Jeder Dienst mit Zweck, Kontoinhaber, Vault-Eintrag, Kosten, Ablauf und wie man Zugang gewährt oder entzieht | | 2026-10-01 |
| [`EMERGENCY.md`](EMERGENCY.md) | Fällt der Gründer aus: 30 Tage weiterführen oder geordnet einstellen; Checkliste für Vollmacht und Notfallzugang | | 2026-10-01 |
| [`SCALE-PLAN.md`](SCALE-PLAN.md) | Der 12-Monats-Plan: Phasen, Punkte, Kennzahlen, Unit Economics | | 2026-10-01 |
| [`RELEASE.md`](RELEASE.md) | Checkliste für TestFlight und App Store, OTA oder Store-Build (Rollback, Tags, Phased Release), Testmatrix vor jedem Release | | 2026-10-02 |
| [`APPSTORE.md`](APPSTORE.md) | Texte und Screenshots für App Store Connect zum Kopieren | | |
| [`DEV_SETUP.md`](DEV_SETUP.md) | Dev- und Prod-Variante der App parallel auf einem Gerät | | |
| [`PRIVACY-CHANGE.md`](PRIVACY-CHANGE.md) | Datenschutz-Änderungsprozess: was jede neue Datenart im PR mitbringt | | 2026-10-01 |
| [`RESEARCH.md`](RESEARCH.md) | Nutzerforschung als Prozess: Rekrutierung, Leitfaden, Ablage | | 2026-10-01 |
| [`adr/`](adr/) | Architekturentscheidungen, eine Datei je Entscheidung (`0001-i18n.md`: keine Übersetzung, Locale nur messen) | | 2026-10-01 |
| [`brand/`](brand/) | Logo, App-Icon und Splash als Code, Export-Skripte | | |
| [`history/`](history/) | Historische Fix-Notizen (Anruf-Architektur, Crashes, Migration); nur zum Nachlesen, nicht gepflegt | | n. a. |

Außerhalb dieses Ordners: `../CLAUDE.md` (Konventionen für die Arbeit im
App-Repo), `../README.md` (Setup), `../CHANGELOG.md` (was Nutzer je Version
merken; Quelle der GitHub-Releases), `../marketing/AGENT.md` (Marketing-Agent),
`CMM-backend-new/README.md` (Umgebungsvariablen, Health Check, Backup,
Alarme, Team), `CMM-backend-new/COMPLIANCE.md` (Verarbeitungsverzeichnis,
Auftragsverarbeiter), `CMM-backend-new/CLAUDE.md`.
