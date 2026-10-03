# Launch-Gate: die Checkliste vor dem ersten Media-Euro

Die Gate-Checkliste ist **der eine Ort**, an dem alles Rechtliche und
Betriebliche abgehakt wird, bevor bezahlte Reichweite (Media) startet
(Plan 2.7, Leitprinzip 2). Sie steht in der Konsole im Tab **Gate**
(`GET /admin/launch-checklist`, gespeichert in `AppConfig.launchChecklist`).

**Regel: kein Media-Euro vor 100 %.** Das ist nicht nur eine Abmachung: Das
Backend lehnt jede Reservierung mit `provider: "media"` ab
(`POST /marketing/budget/reserve` → 403 `launch_checklist_incomplete`),
solange auch nur ein Haken fehlt. KI-Kosten des Marketing-Agenten
(`anthropic`, `google`) laufen davon unabhängig weiter. Die Phase-Gate-Kachel
aus Plan 3.1 liest dieselbe Liste.

**Zuletzt geprüft:** 2026-10-03

## Automatische Haken

Das Backend prüft sie bei jedem Öffnen selbst (`lib/launchChecklist.js`).
Fällt einer weg, ist das Gate wieder zu, bis er zurück ist.

| Haken | Grün, wenn | Was tun, wenn rot |
|---|---|---|
| `healthz` | `/healthz` meldet ok (Datenbank verbunden, Jobs laufen) | Render-Logs und Uptime-Monitor, Abschnitte „Rollback“ und „Deploy-Fenster“ in [`RUNBOOK.md`](RUNBOOK.md) |
| `restoreDrill` | Letzter Restore-Test jünger als 90 Tage | Restore nach [`RUNBOOK.md`](RUNBOOK.md) „Backup und Restore“, danach Datum in der Konsole unter App → Betrieb eintragen und „Letzter Restore-Test“ im Runbook nachziehen |
| `backupFresh` | Letztes Backup jünger als 8 Tage (setzt die DB-Backup-Action selbst) | Alarm `backup_stale` im Runbook |
| `twoOwners` | Mindestens zwei aktive Owner mit Authenticator (TOTP) | Zweiten Owner anlegen, [`EMERGENCY.md`](EMERGENCY.md) |
| `pentest` | Letzter Pentest jünger als 365 Tage | Pentest beauftragen oder selbst durchführen (Bericht im Firmenordner), Datum unter App → Betrieb eintragen |

## Manuelle Haken

Nur ein Owner hakt ab (`PUT /admin/launch-checklist/:key`, steht im
Audit-Log). In die Notiz kommt, wo der Nachweis liegt; der Nachweis selbst
gehört in den Firmenordner, nie ins Repo.

| Haken | Erledigt, wenn | Nachweis |
|---|---|---|
| `gewerbe` | Gewerbe beim Gewerbeamt angemeldet | Gewerbeschein (Firmenordner → Behörden) |
| `bankAccount` | Eigenes Geschäftskonto für Apple-Auszahlungen und Ausgaben | Kontoeröffnung; in App Store Connect hinterlegt |
| `taxAdvisor` | Steuerberatung beauftragt oder bewusst selbst gemacht | Mandatsvereinbarung oder Notiz mit Begründung ([`FINANCE.md`](FINANCE.md)) |
| `branchProtection` | `main` in beiden Repos geschützt (Checks oder Review vor dem Merge) | GitHub → Settings → Branches, Screenshot im Firmenordner |
| `insurance` | IT-Haftpflicht/Cyber abgeschlossen | Versicherungspolice (Firmenordner → Versicherungen), Deckungssumme in der Notiz |
| `traderStatus` | Händlerstatus nach DSA in App Store Connect angegeben, Kontaktdaten wie im Impressum | App Store Connect → Business |
| `trademark` | Marke beim DPMA angemeldet oder nach Recherche bewusst verschoben | Anmeldebestätigung oder Notiz mit Grund |
| `ageRating` | Altersfreigabe-Fragebogen in App Store Connect beantwortet, passend zum Mindestalter 16 der Nutzungsbedingungen | App Store Connect → App-Informationen |
| `privacyLabel` | App-Privacy-Label passt zur Datenschutzerklärung und zu `CMM-backend-new/COMPLIANCE.md` | App Store Connect → App-Datenschutz |
| `dpaSigned` | Auftragsverarbeitungsverträge aller Dienste abgeschlossen | Liste in `CMM-backend-new/COMPLIANCE.md`, Verträge im Firmenordner → Datenschutz |
| `lawyerReview` | Nutzungsbedingungen, Datenschutzerklärung und Impressum anwaltlich geprüft (inkl. Wortlaut der Begründungen bei Moderation und Hinweis auf Art. 21 DSA) | Prüfvermerk oder Mail der Kanzlei (Firmenordner → Recht) |

## Wann prüfen

Vor jeder Budget-Entscheidung für Media in der Wochenreview
([`DECISIONS.md`](DECISIONS.md)) einmal den Tab Gate öffnen. Ändern sich die
Nutzungsbedingungen oder die Datenschutzerklärung wesentlich, den Haken
`lawyerReview` zurücknehmen, bis die Prüfung der neuen Fassung da ist.
