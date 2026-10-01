# Runbook: Betrieb von Wanna yap?

Was du tust, wenn ein Alarm kommt, etwas kaputt ist oder du etwas
zurückdrehen musst. Ein Ort je Thema (Leitprinzip 10 in
[`SCALE-PLAN.md`](SCALE-PLAN.md)): Alarme stehen nur hier, Release-Schritte
in [`RELEASE.md`](RELEASE.md), Umgebungsvariablen in der README des
Backend-Repos.

Dieses Gerüst stammt aus Plan-Punkt 1.9. Punkt 1.8 ergänzt Kill-Switch,
Phased Release pausieren, Twilio gesperrt und Datenpanne (72 h); Punkt
1.10 füllt die Alarmtabelle.

**Zuletzt geprüft:** 2026-10-01

## Alarme

Alle Alarme kommen als Web-Push der Admin-Konsole aufs Handy. Der `tag`
ist der Schlüssel in der Tabelle; er steht im Backend im jeweiligen
`tell()`-Aufruf an `lib/adminPush.js`, der Titel in der Mitteilung ist der
Titel aus demselben Aufruf.

| Alarm-Tag | Kanal | Bedeutung | Gegenmaßnahme |
|---|---|---|---|
| `mail-failing` | alerts | Der Mail-Anbieter lehnt Wartelisten-Bestätigungsmails ab (`lib/waitlist.js`); höchstens einmal pro Stunde. Anmeldungen bleiben gespeichert. | Status und Guthaben beim Mail-Anbieter prüfen, dann `SMTP_URL` und `MAIL_FROM` auf Render. Sobald das Senden wieder klappt, verschickt `resendMissing()` die offenen Mails alle 10 Minuten von selbst. |
| `post-<kampagne>-<kanal>` | posting | Auto-Posting auf Instagram oder TikTok ist nach dem letzten Versuch fehlgeschlagen (`lib/socialPosting.js`, `urgency: high`). Der Text der Mitteilung nennt den Fehler. | Konsole → Freigabe: Kanal-Token prüfen (abgelaufen → in der Konsole neu verbinden), den Entwurf von Hand posten oder verwerfen. Gleicher Tag ohne `high`: nur Hinweis (gepostet, TikTok-Entwurf wartet), nichts zu tun. |
| weitere | alerts | ab Plan-Punkt 1.10 (11 Regeln, u. a. "letzter Dump > 8 Tage", `/healthz` rot, Push-Fehlerquote) | |

## Backup und Restore

**Was läuft automatisch:** Der Workflow
`CMM-backend-new/.github/workflows/db-backup.yml` macht wöchentlich einen
`mongodump` der Produktions-DB, verschlüsselt ihn mit
[age](https://github.com/FiloSottile/age) gegen den öffentlichen Schlüssel
und legt ihn in einen S3-kompatiblen Bucket (Backblaze B2 oder Cloudflare
R2, Free-Tier). Falls der Atlas-Tier Snapshots hat (nicht bei M0; der
Owner prüft das in der Atlas-Konsole), decken sie "letzte Nacht" ab, der
Dump deckt "Anbieter weg". Sonst ist der wöchentliche Dump das einzige
Backup. Point-in-Time erst in Phase 3 (Plan 1.9).

GitHub-Secrets im Backend-Repo: `MONGODB_URI`, `BACKUP_AGE_PUBLIC_KEY`,
`BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
`BACKUP_S3_SECRET_ACCESS_KEY`.

**Der private age-Schlüssel** liegt nirgends im Repo und nirgends bei
GitHub: nur im Passwort-Manager (Eintrag "Backup age-Schlüssel", mit
Notfallzugang für die Vertrauensperson aus Plan 1.8). Ohne ihn ist jeder
Dump wertlos; mit ihm ist jeder Dump Klartext. Beides ist Absicht.

**Restore in einen temporären Cluster** (einmal jetzt, dann alle 90 Tage,
nie in die Produktions-DB):

1. Temporären Cluster in Atlas anlegen (Free-Tier reicht), Verbindungs-URI
   in `RESTORE_URI` ablegen. Neuesten Dump aus dem Bucket holen
   (`aws s3 cp --endpoint-url "$BACKUP_S3_ENDPOINT" s3://<bucket>/<datei>.age .`).
2. Entschlüsseln und einspielen:
   `age -d -i <privater-schlüssel> -o dump.archive <datei>.age`
   `mongorestore --uri "$RESTORE_URI" --archive=dump.archive --gzip --drop`
   (`--gzip` nur, wenn `db-backup.yml` den Dump mit `mongodump --archive
   --gzip` erzeugt; Plan 1.9b legt das fest, dann hier abgleichen).
3. Prüfen, dass die Daten brauchbar sind: in `mongosh "$RESTORE_URI"` die
   Collection-Zahlen (`db.users.countDocuments()`,
   `db.calls.countDocuments()`, `db.talks.countDocuments()`) mit den
   Zahlen in der Konsole vergleichen und einen Nutzer stichprobenartig
   öffnen. **Nicht** `npm test` gegen die Restore-URI starten: die Suite
   läuft heute immer gegen eine In-Memory-DB (`test/helpers.js`) und
   würde eine fremde DB per `dropDatabase()` leeren. Die Prüfung per
   Testsuite kommt, sobald 1.9b `test/helpers.js` eine Restore-URI
   beibringt (Abweichung von Plan 1.9). Danach den temporären Cluster
   löschen.

Zielwerte (Plan 1.9): Alter des letzten Dumps < 8 Tage, Tage seit letztem
Restore-Test ≤ 90.

**Letzter Restore-Test:** noch nie

## Rollback

- **Backend (Render):** Dashboard → Service → Deploys → vorheriges Deploy →
  "Rollback to this deploy". Dauert eine Minute, danach `/healthz` und
  `/api/push-health` prüfen (`version` muss der alte Stand sein). Deploys
  laufen automatisch von `main`; ein Revert-Commit ist der dauerhafte Weg.
- **App:** Einen Store-Build nimmst du nicht zurück. Was geht: in der
  Konsole unter "App" ein Hinweis-Banner für alle setzen und, falls ein
  Build gefährlich ist, den Mindest-Build hochsetzen; die App zeigt dann den Update-Hinweis
  (`services/appInfo.ts` isOutdated). JS-Fehler per OTA ab Plan 2.16
  (`eas update:republish`); bis dahin Hotfix-Build über den Weg in
  [`RELEASE.md`](RELEASE.md).

## Deploy-Fenster

Nie ±15 Minuten um den Yap Moment deployen. Der Moment liegt je Zeitzone
zufällig zwischen 10:00 und 21:00 (`lib/dailyMoment.js`, `DailyMoment.at`
in der DB); ein Deploy in dem Fenster lässt laufende Klingelvorgänge
hängen (Plan 2.2), bis der Aufräumer im Minutentick da ist. Vor dem
Deploy in Atlas den heutigen `DailyMoment`-Eintrag für `Europe/Berlin`
nachsehen (die Konsole zeigt die Zeit noch nicht). Sonst morgens vor
10:00 deployen.

## Genau eine Instanz

Das Backend läuft bewusst auf genau einer Render-Instanz. Socket.IO hat
keinen Adapter, die Rate-Limiter leben im Prozessspeicher, Ring-Timer
liegen in einer Map im Prozess. Eine zweite Instanz würde Anrufe
verlieren, weil Anrufer und Angerufener auf verschiedenen Instanzen
landen. Mehr Instanzen gibt es erst nach dem Lasttest aus Plan 3.12 und
nur, wenn er es erzwingt. Render "Scale" bleibt auf 1; Leader-Lease in
`lib/leader.js` sorgt dafür, dass beim Deploy trotzdem nur eine Instanz
die Hintergrundjobs fährt.
