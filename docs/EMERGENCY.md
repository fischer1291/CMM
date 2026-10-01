# Notfall: Fällt der Gründer aus

Für die Vertrauensperson, die die Dead-Man-Mail der Admin-Konsole bekommt
("Owner hat 7 Tage nicht quittiert"), oder für den zweiten Owner. Ziel:
Du kannst Wanna yap? 30 Tage weiterführen oder geordnet einstellen, ohne
dass Nutzer Daten oder Geld verlieren. Alles, was du dafür brauchst, steht
in [`SERVICES.md`](SERVICES.md) (Dienste und Zugänge), [`RUNBOOK.md`](RUNBOOK.md)
(Alarme und Handgriffe) und im Passwort-Manager (Notfallzugang, unten).

**Zuletzt geprüft:** 2026-10-01

## Erste Stunde

1. Erreichbarkeit klären: Ist der Gründer nur im Urlaub ohne Netz? Die Mail
   kommt nach 7 Tagen ohne Quittung, nicht erst im Ernstfall.
2. Notfallzugang im Passwort-Manager auslösen (Wartezeit siehe Checkliste
   unten). Bis er frei ist: Konsole mit deinem eigenen Owner-Zugang öffnen
   (`<PUBLIC_API_URL>/console/`, Passkey oder TOTP).
3. Lagebild: `https://api.wannayap.app/healthz` muss 200 sein; in der
   Konsole Karte "Heute" (Alarme der letzten Tage, offene Tickets),
   Freigabe (wartende Entwürfe), Support.
4. Entscheiden, mit dem Umfeld des Gründers: **A** weiterführen (30 Tage,
   verlängerbar) oder **B** geordnet einstellen. Nichts überstürzen: Der
   Betrieb läuft ohne Eingriff weiter, solange die Konten bezahlt sind.

## A: Betrieb 30 Tage weiterführen

**Was von allein läuft** (nichts anfassen): Backend auf Render inklusive
Neustart nach Absturz; Hintergrundjobs (Yap Moment, Rituale, Nudges,
Snapshots, Alarme, Push-Quittungen); Anrufe, Pushes, Moments; Anmeldung
per SMS (Deckel 100/Tag, nur DE/AT/CH); Abos über Apple und RevenueCat
inklusive Verlängerung, Kündigung und Plus-Status; Wartelisten-Mails;
wöchentliches Backup (Sonntag); Marketing-Agent (rendert Entwürfe, postet
nur Freigegebenes); DSGVO-Export und Kontolöschung in der App
(Einstellungen); Moments, die 3 verschiedene Personen gemeldet haben,
werden automatisch ausgeblendet. Konten werden nie automatisch gesperrt,
das passiert nur von Hand in der Konsole: eine Meldung unter "Meldungen"
mit "Sperren …" auflösen oder auf der Nutzerkarte (Konsole → Nutzer)
"für N Tage sperren" (siehe Tabelle unten).

**Was wöchentlich eine Hand braucht** (zusammen unter einer Stunde):

| Aufgabe | Wo | Woran du es merkst |
|---|---|---|
| Tages-Push quittieren (sonst geht die Dead-Man-Mail weiter raus) | Konsole, Push antippen oder `#ack` | Morgen-Push |
| Support-Tickets beantworten, Meldungen prüfen | Konsole → Support (Tickets); Konsole → Meldungen (verwerfen, Moment ausblenden oder löschen, sperren) | Push-Kinds `support`, `reports`; Alarm `support_overdue` nach 24 h |
| Alarme abarbeiten | [`RUNBOOK.md`](RUNBOOK.md), Abschnitt "Alarme" | Push `alerts`, Mail, bei `error` SMS |
| Werbe-Entwürfe freigeben oder liegen lassen | Konsole → Freigabe | Push `approvals`. Liegen lassen ist in Ordnung: ohne Freigabe wird nichts gepostet und nichts ausgegeben |
| Social-Kanäle neu verbinden, wenn der Token abläuft | Konsole → Freigabe → Kanäle | Alarm `social_token` |
| Rechnungen und Guthaben: Twilio-Guthaben, Render, Atlas, Apple-Mails zu Verträgen und Steuern | Konten nach [`SERVICES.md`](SERVICES.md) | Mail des Anbieters; Alarm `sms_failures` bei leerem Twilio-Guthaben |
| Backup-Lauf prüfen | GitHub → CMM-backend-new → Actions → DB-Backup | Alarm `backup_stale` |

**Was du nicht tust:** keine Deploys außer Rollback nach RUNBOOK, keine
zweite Render-Instanz, keine Datenänderungen in Atlas, keine neuen
Store-Builds, keine Änderungen an Preisen oder Abos. Bei einer Störung,
die du nicht lösen kannst: Banner in der Konsole (App → Banner) setzen und
Nutzern sagen, was ist; Markenton "kein Druck", Du-Form.

Nach 30 Tagen neu entscheiden: weiter so, Übergabe an eine andere Person
(dann Konsole → Team, Dienste nach SERVICES.md übertragen) oder B.

## B: Geordnet einstellen

Frist: 30 Tage ab Ankündigung, damit Nutzer ihre Daten exportieren können.
Belege zu Käufen (`SubscriptionEvent`) müssen nach § 147 AO aufbewahrt
werden; den Steuerberater (SERVICES.md, sobald eingetragen) und den Anwalt
aus dem Anwaltspaket (Plan 1.6) vorher fragen, was die Firma darüber hinaus
aufheben muss.

**Tag 0**

1. App Store Connect → App → Abos: jedes Abo "Remove from sale" bzw. aus
   allen Ländern nehmen; laufende Abos enden mit ihrer Periode, Apple
   bucht nichts Neues. In RevenueCat nichts ändern.
2. App Store Connect → Pricing and Availability: App aus dem Verkauf
   nehmen (bestehende Installationen bleiben nutzbar).
3. Konsole → App → Betrieb: `smsPaused` an (keine neuen Konten).
4. Konsole → App → Banner, Stufe `warning`, Ablauf = Tag 30, Text in
   Du-Form, zum Beispiel: "Wanna yap? wird am <Datum> eingestellt. Bis
   dahin kannst du deine Daten unter Einstellungen exportieren; danach
   löschen wir alle Konten." (Export in der App über `GET /me/export`,
   Löschung über `DELETE /me`.)
5. Warteliste: Die Landing lässt du stehen. Sie kennt nur die Modi
   `waitlist` (Formular) und `live` (Store-Buttons; würde auf die gerade
   zurückgezogene Store-Seite zeigen), eine Hinweisseite gibt es nicht.
   Neue Anmeldungen sind harmlos: Sie bekommen nur die Bestätigungsmail,
   die Start-Mail an alle geht ausschließlich von Hand raus
   (`POST /admin/waitlist/launch`), also nichts auslösen. Ein Hinweis
   auf das Ende gehört in das Banner aus Schritt 4. `SMTP_URL` auf Render nicht
   entfernen: darüber laufen auch Alarm-Mails, Einladungen in die Konsole
   und die Dead-Man-Mail, die du bis Tag 29 brauchst.
6. Marketing: GitHub → CMM → Actions → marketing-agent deaktivieren;
   Konsole → Freigabe → Kanäle trennen.

**Tag 1 bis 29**

- Support weiter beantworten; wer nach Rückerstattung fragt, geht über
  Apple (Nutzer: "Problem melden" in der Kauf-Historie).
- Keine neuen Builds, keine Deploys.

**Tag 30**

1. Export der Buchungsbelege: `SubscriptionEvent` und die Umsatzberichte
   aus App Store Connect in den Firmenordner (Aufbewahrung).
2. Konten löschen: Render → Service löschen; Atlas → Cluster löschen
   (vorher einen letzten Dump nach RUNBOOK ziehen und verschlüsselt in
   den Firmenordner legen, Aufbewahrungsfrist mit dem Anwalt klären);
   Cloudinary → alle Assets löschen; Twilio → Verify-Service und Nummer
   freigeben; Expo → Push-Tokens sind mit dem Backend weg.
3. Backup-Bucket: Dumps löschen, sobald der letzte Dump im Firmenordner
   liegt; den age-Schlüssel im Passwort-Manager behalten, solange der Dump
   existiert.
4. Dienste kündigen nach [`SERVICES.md`](SERVICES.md), Spalte "Ablauf /
   Kündigungsfrist": Apple-Mitgliedschaft nicht verlängern (die App
   verschwindet dann endgültig), Domain mindestens ein Jahr behalten
   (Impressum, Datenschutzerklärung, Mail erreichbar), Website auf eine
   Hinweisseite reduzieren.
5. `CMM-backend-new/COMPLIANCE.md`: Datum der Löschung je
   Auftragsverarbeiter eintragen; Löschung den Auftragsverarbeitern
   bestätigen lassen, wo der AVV das vorsieht.
6. Gewerbe abmelden, Geschäftskonto schließen, Steuerberater informieren
   (sobald vorhanden, Plan 1.7).

## Vollmacht und Notfallzugang (Checkliste)

Der Gründer füllt das aus und hält es aktuell; "getestet am" ist ein
echtes Datum, an dem der Zugang einmal benutzt wurde.

| Punkt | Eintrag |
|---|---|
| Vertrauensperson (Name, Telefon, E-Mail) | |
| Notfallkontakt in der Konsole eingetragen (App → Betrieb → Notfallkontakt), Datum | |
| Der Person gesagt, wo diese Datei liegt (`CMM/docs/EMERGENCY.md`), Datum | |
| Schriftliche Vollmacht (Umfang: Firmenkonto, Apple Developer, Domain, Dienste), Datum, Ablageort | |
| Passwort-Manager: Anbieter, Notfallzugang eingerichtet für, Wartezeit, getestet am | |
| Zweiter Owner in der Konsole (E-Mail), Passkey oder TOTP getestet am | |
| Expo: Organization angelegt, Projekt übertragen, Person als Admin, Datum | |
| Apple: eigene Apple-ID der Person als Admin in App Store Connect, Datum | |
| Render: Team-Mitglied, Datum | |
| MongoDB Atlas: Projektmitglied, Datum | |
| GitHub: Collaborator (Admin) in beiden Repos, Datum | |
| Backup: privater age-Schlüssel im Passwort-Manager, Eintragsname; Bucket-Zugang | |
| Domain: Registrar-Zugang im Passwort-Manager, Verlängerungsdatum | |
| Twilio, Agora, Cloudinary, RevenueCat, Netlify, Mailanbieter: Zugang im Passwort-Manager | |
| Letzter vollständiger Test dieser Checkliste (Datum, wer) | |
