# Runbook: Betrieb von Wanna yap?

Was du tust, wenn ein Alarm kommt, etwas kaputt ist oder du etwas
zurückdrehen musst. Ein Ort je Thema (Leitprinzip 10 in
[`SCALE-PLAN.md`](SCALE-PLAN.md)): Gegenmaßnahmen zu Alarmen stehen nur
hier (die README des Backends nennt die Regeln), Release-Schritte
in [`RELEASE.md`](RELEASE.md), Umgebungsvariablen in der README des
Backend-Repos, Dienste und Zugänge in [`SERVICES.md`](SERVICES.md), der
Ausfall des Gründers in [`EMERGENCY.md`](EMERGENCY.md).

Das Gerüst stammt aus Plan-Punkt 1.9, die Alarmliste aus 1.10, Quittung,
Kill-Switch, Phased Release, Twilio und Datenpanne aus 1.8; die Zeilen
`gift_days` (2.12), `pepper_changed` (2.8), `sentry_fatal` und
`review_login` (2.1b), `purchase_failures` (2.6a), `weekly_silent`
(2.11), `agora_tokens` (2.15), `agent_failed` (2.14) und
`apple_notifications` (2.6b) sowie der Störungs-Banner (2.15) aus
Phase 2.

**Zuletzt geprüft:** 2026-10-03

## Alarme

`lib/alerts.js` im Backend prüft alle 30 Minuten auf dem Job-Leader die
Regeln unten (nach den Metrik-Snapshots). Ein Treffer geht als Web-Push der
Admin-Konsole (Kind `alerts`, nur Owner) aufs Handy, als Mail an jeden
Owner (nur mit `SMTP_URL`) und bei Stufe **error** zusätzlich als SMS an
die Nummer unter Konsole → App → Betrieb → "Alarm-SMS an". Entprellung:
höchstens einmal pro Stunde je Tag, bei unverändertem Text einmal pro Tag
(`AlertState`-Dokument je Tag, überlebt einen Leader-Wechsel). Die Karte
"Heute" in der Konsole listet die letzten Alarme (`GET /admin/alerts`), der
Morgen-Push nennt die Tags der letzten 12 Stunden. Der `tag` unten ist der
Schlüssel in `lib/alerts.js` `RULES` (Titel der Mitteilung = `title` dort).

| Alarm-Tag | Stufe | Bedeutung | Gegenmaßnahme |
|---|---|---|---|
| `sms_failures` | error | Twilio hat heute mehr als 20 % der Anmelde-SMS abgelehnt (ab 5 Starts; Zähler `smsStarted`/`smsFailed` in `lib/opsCounters.js`). Neue Nutzer kommen nicht in die App. Setzt den Störungs-Banner (unten), solange die Quote auch in der laufenden und der letzten Stunde (UTC) zusammen darüber liegt. | 1. Twilio-Konsole: Guthaben, Status des Verify-Service, Fraud Guard. 2. Viele Starts aus fremden Nummernkreisen → SMS-Pumping: Konsole → App → Betrieb `smsPaused` an oder `smsRegions` enger. 3. Konto gesperrt → Abschnitt "Twilio gesperrt". |
| `push_failures` | warn | Von den in der letzten Stunde versuchten Pushes (`PushDecision` sent/failed, ab 20) sind über 10 % fehlgeschlagen oder mit Fehlerquittung zurück. Setzt den Störungs-Banner (unten). | 1. `GET /api/push-health` und Expo-Status prüfen. 2. Konsole → Fehler: häuft sich ein Build, Mindest-Build hochsetzen. 3. Bleibt es, APNs-/Expo-Zugangsdaten prüfen (siehe `push_credentials`). |
| `push_credentials` | error | Apple oder Expo haben heute unsere Zugangsdaten abgelehnt (`InvalidProviderToken`, `TopicDisallowed` …, Zähler `pushCredentialErrors`). Niemand bekommt Pushes, Anrufe klingeln nicht im Hintergrund. Setzt den Störungs-Banner (unten), solange es auch in dieser oder der letzten Stunde (UTC) Ablehnungen gab. | 1. APNs-Key in Apple Developer prüfen (widerrufen? abgelaufen?). 2. Neuen Key erzeugen, `VOIP_KEY_CONTENT`/`VOIP_KEY_ID`/`VOIP_TEAM_ID` auf Render und die EAS-Credentials aktualisieren. 3. Redeploy, `GET /api/push-health` muss `voipConfigured:true` zeigen. |
| `agora_tokens` | error | Heute (Berlin) sind mehr als 5 Agora-Tokens fehlgeschlagen und mehr als 20 % der ausgestellten (Tageszähler `rtcTokenFailed`/`rtcTokenIssued` aus `POST /rtcToken`; fehlgeschlagen heißt: `AGORA_APP_CERTIFICATE` fehlt oder der Token-Builder wirft). Ohne Token kommt kein Anruf zustande. Setzt den Störungs-Banner „Anrufe sind gerade gestört. Wir arbeiten dran.“, solange die Schwelle auch in der laufenden und der letzten Stunde (UTC) zusammen gilt. | 1. Render → Environment: `AGORA_APP_ID` und `AGORA_APP_CERTIFICATE` gesetzt und passend zum Projekt in der Agora-Konsole (Zertifikat aktiv, nicht ohne Redeploy gedreht). 2. Agora-Statusseite prüfen. 3. Render-Logs nach „Fehler beim Erstellen des Tokens“ durchsuchen. 4. Kam es mit einem Deploy, zurückrollen (Abschnitt "Rollback"). Danach Postmortem (Abschnitt "Störungs-Banner"). |
| `tick_late` | error | Der Minutentick (`tickAt` auf dem `jobs`-Lock) ist über 3 Minuten alt; nicht in den ersten 5 Minuten nach einem Start. Zeitpläne, Yap Moment und Rituale laufen nicht. | 1. `/healthz` und Render-Logs lesen (Fehler im Tick?). 2. Render → Manual Deploy → "Restart service", der Leader-Lease geht an die neue Instanz. 3. Kommt es wieder, letzten Deploy zurückrollen (Abschnitt "Rollback"). |
| `moment_missing` | warn | Nach 21:30 Berlin hat der heutige `DailyMoment` für Europe/Berlin kein `sentAt`. | 1. Render-Logs nach `tickDailyMoments` durchsuchen. 2. Hängt der Tick, siehe `tick_late`. 3. Nichts nachholen; morgen kommt der nächste Moment von selbst. |
| `client_errors` | warn | Neuer fataler `ClientError` in der letzten Stunde, oder heute mehr als dreimal so viele App-Fehler wie gestern (ab 10). | 1. Konsole → Fehler: Nachricht, Stack, Versionen. 2. Nur ein Build betroffen → Mindest-Build hochsetzen und Banner. 3. Hotfix nach [`RELEASE.md`](RELEASE.md). |
| `revenuecat` | error | RevenueCat-Webhook heute abgelehnt (`rcUnauthorized`, Secret stimmt nicht) oder mit unbekanntem Nutzer (`rcUnknownUser`). Zahlende Kunden könnten ohne Plus dastehen. | 1. `REVENUECAT_WEBHOOK_SECRET` auf Render mit dem Authorization-Wert im RevenueCat-Webhook vergleichen. 2. Unbekannte Nutzer: Kauf in RevenueCat suchen (App-User-ID = unsere User-ID), in der Konsole Plus von Hand gewähren. 3. In der App "Plus wiederherstellen" (`POST /me/plus/sync`) empfehlen. |
| `purchase_failures` | warn | Heute (Berlin) sind Kaufen, Wiederherstellen oder das Laden des Angebots in der App zusammen mehr als dreimal gescheitert (Tageszähler `purchaseError` + `restoreError` + `offeringEmpty` aus `POST /me/plus/funnel`, `lib/paywall.js`; ein abgebrochener Kauf ist eine Entscheidung und zählt nicht). Der Text nennt die drei Zahlen. | 1. Konsole → Plus, Zeile Paywall: welcher Fehler überwiegt? 2. Vor allem „kein Angebot geladen“: App Store Connect (Vereinbarungen, Steuer, Bankdaten, Produkte freigegeben) und RevenueCat (Offering `default` aktuell, Produkte zugeordnet, App-Store-Schlüssel gültig), Einrichtung in [`PLUS.md`](PLUS.md). 3. Kauf-Fehler: Konsole → Fehler („Purchase failed: <Code>“); nur ein Build betroffen → Hotfix nach [`RELEASE.md`](RELEASE.md). „no_entitlement“ heißt bezahlt, aber ohne Plus: Produkt dem Entitlement `plus` zuordnen, Betroffenen „Plus wiederherstellen“ empfehlen, sonst Plus in der Konsole von Hand gewähren (wie bei `revenuecat`). |
| `apple_notifications` | warn | App Store Server Notifications (`POST /webhooks/apple`, `lib/appleNotifications.js`, [`PLUS.md`](PLUS.md)) haken: heute (Berlin) wurde eine Meldung als nicht prüfbar abgelehnt (`appleUnverified`: Zertifikatskette, Signatur, Bundle-ID oder Umgebung stimmt nicht; reine Nicht-JWS-Bodies zählen als `appleMalformed` und alarmieren nie), oder eine geprüfte Meldung der letzten 24 Stunden gehört 30 Minuten nach Eingang noch niemandem (`unknown_user`), oder heute ist eine Antwort auf `CONSUMPTION_REQUEST` gescheitert (`appleConsumptionFailed`). Der Text nennt die drei Zahlen. Plus selbst kommt weiter aus RevenueCat. | 1. Abgelehnt: Render-Logs nach „Apple notification refused: <Grund>“ durchsuchen. Viele Ablehnungen ohne passende Käufe sind Abtasten von außen: nichts tun. Grund `bundle_id` oder `environment` nach einer Änderung in App Store Connect: `APPLE_BUNDLE_ID` auf Render und die URLs prüfen (RevenueCats URL bleibt in App Store Connect, unsere steht in RevenueCats Forwarding-Feld, [`PLUS.md`](PLUS.md)). 2. Niemandem zugeordnet: Transaktion in der CSV `plus` (Konsole → Plus, `quelle` apple) und in RevenueCat suchen; kam RevenueCats Webhook überhaupt an (Alarm `revenuecat`)? Meist geht nichts verloren, weil RevenueCat die Quelle für Plus ist. 3. Antwort gescheitert: die Logs nennen Apples Status; `ASC_ISSUER_ID`/`ASC_KEY_ID`/`ASC_PRIVATE_KEY` prüfen (Schlüssel widerrufen?) oder das Flag `apple_consumption` ausschalten (Konsole → App → Feature-Flags). Apple wartet zwölf Stunden auf eine Antwort. |
| `agent_silent` | warn | Der neueste `AdDraft` ist über 36 Stunden alt (nur, wenn es je einen gab). GitHub pausiert den Cron nach 60 Tagen ohne Commit. | 1. GitHub → CMM → Actions → marketing-agent: pausiert → "Enable workflow". 2. Fehlgeschlagener Lauf → Log lesen (meist ein Schlüssel oder das Budget). 3. Kein Handlungsdruck für Nutzer; nichts wird ohne Freigabe gepostet. |
| `agent_failed` | warn | Keine Regel in `RULES`, sondern `POST /marketing/notify { failed: true, step, runUrl }` (`lib/marketing.js` reportRun): Der Workflow `marketing-agent` ist in einem Schritt abgebrochen; sein `if: failure()`-Schritt meldet das (auch ein Lauf, der nach 55 Minuten abbricht). Titel „Marketing-Agent fehlgeschlagen“, der Text nennt den Schritt und den Link zum Lauf, nie die Fehlermeldung (die bleibt im GitHub-Log). Tageszähler `agentRunsFailed`. | 1. Link öffnen (GitHub → CMM → Actions → marketing-agent) und das Log lesen. 2. Ausfall eines Anbieters (Anthropic, Google, Cloudinary): nichts tun, der nächste geplante Lauf versucht es wieder. 3. Schlüssel abgelehnt oder Spend Limit erreicht: Schlüssel bzw. Limit beim Anbieter erneuern und das Secret im CMM-Repo setzen. 4. Code-Fehler: in `marketing/agent` im CMM-Repo beheben. Kein Handlungsdruck für Nutzer; nichts wird ohne Freigabe gepostet. Läuft der Agent gar nicht mehr (Cron pausiert), meldet das `agent_silent`. |
| `support_overdue` | warn | Ein offenes Ticket wartet seit über 24 Stunden auf eine Antwort (`overdueTickets`, dieselbe Zahl wie im Morgen-Push). | 1. Konsole → Support: antworten (der Nutzer bekommt einen Push). 2. Bei Vertretung: Antwortzeit im Banner nennen. |
| `social_token` | warn | Der Token eines verbundenen Kanals (Instagram; TikTok: Refresh-Token) läuft in unter 7 Tagen ab. | 1. Konsole → Freigabe → Kanäle → neu verbinden. 2. Läuft er ab, scheitern Posts mit `post-…` (unten); nichts geht verloren, Entwürfe bleiben. |
| `no_talks` | error | Gestern über 20 aktive Nutzer, aber kein einziges Gespräch (`talks.count == 0`). Die Anrufzustellung ist wahrscheinlich kaputt. | 1. `GET /api/push-health`: `voipConfigured` und `authRequired` müssen `true` sein. 2. Testanruf zwischen zwei Geräten (Testmatrix in [`RELEASE.md`](RELEASE.md)). 3. Agora-Zertifikat und `AGORA_*` auf Render prüfen; bei neuem Deploy zurückrollen. |
| `backup_stale` | warn | `AppConfig.ops.lastBackupAt` ist über 8 Tage alt: der wöchentliche Dump hat sich nicht gemeldet. | 1. GitHub → CMM-backend-new → Actions → DB-Backup: pausiert → aktivieren, fehlgeschlagen → Log (meist Atlas Network Access oder ein Secret). 2. "Run workflow" von Hand. 3. Secrets nach Abschnitt "Backup und Restore" prüfen. 4. Lauf grün, aber Alarm → Ping-Schritt im Log prüfen (`BACKUP_PING_URL`, `BACKUP_PING_KEY`; nur er setzt `ops.lastBackupAt`). |
| `sms_cap` | warn | Heute sind 80 % des SMS-Tagesdeckels (`ops.smsPerDay`) erreicht. | 1. Echter Andrang (Konsole → Heute, Anmeldungen passen dazu) → Deckel unter App → Betrieb erhöhen. 2. Sonst SMS-Pumping: `smsRegions` enger oder `smsPaused`. 3. Twilio Fraud Guard prüfen. |
| `gift_days` | warn | Verschenkte Plus-Tage der letzten 7 Tage (heute und die sechs davor; Tageszähler `giftDays_referral`, `giftDays_waitlist`, `giftDays_admin`: Einladungen, Warteliste, Konsolen-Grants mit Enddatum) liegen über `AppConfig.goals.giftDaysPerWeek` (Standard 200, Annahme; Faustregel: Geschenk-Plus unter 20 % der MRR). Der Text nennt die Tage je Quelle. | 1. Konsole → Plus, Kachel "Geschenk-Tage 7 Tage": aus welcher Quelle kommen die Tage? 2. Echte Einladungswelle → Budget anheben (Konsole → App → Ziele, "Geschenk-Plus-Tage je Woche"). 3. Eine Quelle läuft davon (ein Einladender, Konsolen-Grants) → ansehen, bei Missbrauch Plus entziehen. 4. Versuch `referral_two_sided` zu teuer → Flag aus (Konsole → App → Feature-Flags). |
| `pepper_changed` | warn | Keine Regel in `RULES`, sondern `lib/pseudonyms.js` beim Start: gespeicherte `User.phoneHmac` passten nicht zum aktuellen Pepper (`PHONE_HASH_PEPPER`, ohne ihn ein Wert aus `JWT_SECRET`) und wurden samt ihrer `ActiveDay`-Zeilen umgeschlüsselt. Einmal, und nur wenn sich der Pepper geändert hat. | 1. Erwartet genau einmal: direkt nachdem `PHONE_HASH_PEPPER` auf Render gesetzt wurde (erster Deploy lief noch ohne). Dann nichts tun. 2. Sonst wurde die Variable oder `JWT_SECRET` geändert, oder etwas lief mit fremder Umgebung gegen die Produktions-DB: alten Wert auf Render wiederherstellen, der nächste Start schlüsselt zurück. 3. Den Pepper nie drehen, ohne das zu wollen (Backend-README "Pseudonymous data"). |
| `review_login` | warn | Der Demo-Zugang für App Review (`REVIEW_PHONE`/`REVIEW_CODE`, Anmeldung ohne SMS, `routes/verify.js`) ist an, aber ohne `REVIEW_UNTIL` („Demo-Zugang ohne Ablaufdatum aktiv“); oder `REVIEW_UNTIL` ist vorbei und die Variablen stehen noch auf Render („Demo-Zugang abgelaufen“, der Zugang ist schon aus); oder `REVIEW_UNTIL` ist kein Datum (der Zugang ist dann aus). | 1. Läuft gerade eine Prüfung: Render → Environment → `REVIEW_UNTIL` auf den letzten Tag setzen, den die Prüfung braucht (`JJJJ-MM-TT`, Europe/Berlin; eine Woche nach dem Einreichen reicht). 2. Prüfung durch: `REVIEW_PHONE`, `REVIEW_CODE` und `REVIEW_UNTIL` entfernen. 3. Bei jeder Einreichung neu setzen ([`RELEASE.md`](RELEASE.md), Abschnitt 4). `GET /api/push-health` zeigt den Stand unter `reviewLogin` (`off`, `on`, `expired`, `invalid_until` …). |
| `sentry_fatal` | error | Keine Regel in `RULES`, sondern `POST /webhooks/sentry` (`routes/webhooks.js`, signiert mit `SENTRY_WEBHOOK_SECRET`): eine Sentry-Alarmregel mit der Aktion „Send a notification via Wanna yap? Alarme“ hat ausgelöst (App: neuer fataler Absturz; Backend: fatal oder error), oder, nur falls die `issue`-Webhooks der Integration an sind, ein neues Issue mit Level fatal. Der Text nennt Projekt, Level, Release, Issue-Kurz-ID und den Sentry-Link, nie die Fehlermeldung. Höchstens einmal pro Stunde: ein zweiter neuer Absturz in der Stunde steht nur in Sentry. | 1. Link öffnen: welcher Build, Commit oder welches OTA-Update, wie viele Nutzer. 2. App, JS-Fehler: OTA-Hotfix oder OTA-Rollback; nativ: Phased Release pausieren (unten), Mindest-Build hochsetzen, Banner; Regeln in [`RELEASE.md`](RELEASE.md), Abschnitt 2a. 3. Backend: Render auf das letzte grüne `api/…`-Tag zurückrollen (Abschnitt "Rollback"), dann Ursache. 4. Kommen 401 statt Alarmen (Tageszähler `sentryUnauthorized`): Client Secret der Integration und `SENTRY_WEBHOOK_SECRET` vergleichen. |
| `owner_silent` | warn | Keine Regel in `lib/alerts.js`, sondern die Dead-Man-Prüfung in `lib/adminPush.js` (stündlich): 7 Tage lang hat kein Owner den Morgen-Push quittiert oder sich angemeldet. Mail an den Notfallkontakt, sonst Push an die Owner; einmal je 7 Tage. | Owner: Konsole öffnen, Morgen-Push quittieren (unten). Notfallkontakt: [`EMERGENCY.md`](EMERGENCY.md). |
| `weekly_silent` | warn | Keine Regel in `lib/alerts.js`, sondern dieselbe Dead-Man-Prüfung in `lib/adminPush.js` (stündlich): Der Wochenreport geht seit mindestens 14 Tagen raus (`AppConfig.ops.weeklyReportFirstAt`), aber kein aktiver Owner hat in den letzten 14 Tagen einen quittiert (`WeeklyReview.ackAt`; Quittungen von Support zählen nicht). Nur, solange `owner_silent` nicht gilt (nie zwei Mails zu derselben Stille). Mail an den Notfallkontakt mit dem Grund, sonst Push „Wochenreport seit 14 Tagen offen“ an die Owner (`#weekly`); einmal je 7 Tage. | Owner: Konsole → Woche, Stunden eintragen und quittieren, Entscheidungen in [`DECISIONS.md`](DECISIONS.md) nachtragen. Notfallkontakt: nachfragen, ob alles in Ordnung ist; sonst [`EMERGENCY.md`](EMERGENCY.md). |
| `mail-failing` | – (Push, keine Stufe) | Push-Kind `alerts` direkt aus `lib/waitlist.js`: der Mail-Anbieter lehnt Wartelisten-Mails ab (höchstens einmal pro Stunde). Anmeldungen bleiben gespeichert. | 1. Status und Guthaben beim Mail-Anbieter prüfen. 2. `SMTP_URL` und `MAIL_FROM` auf Render prüfen. 3. Sobald das Senden klappt, schickt `resendMissing()` die offenen Mails alle 10 Minuten von selbst. |
| `post-<kampagne>-<kanal>` | – (Push, keine Stufe) | Push-Kind `posting` aus `lib/socialPosting.js` mit `urgency: high`: Auto-Posting auf Instagram oder TikTok ist nach dem letzten Versuch fehlgeschlagen; der Text nennt den Fehler. Gleicher Tag ohne `high` ist nur ein Hinweis (gepostet, TikTok-Entwurf wartet). | 1. Konsole → Freigabe → Kanäle: Token prüfen, bei Ablauf neu verbinden. 2. Entwurf von Hand posten oder verwerfen. |

Keine Alarme, sondern Arbeitshinweise über eigene Push-Kinds: `approvals`
(neuer Werbe-Entwurf wartet auf Freigabe), `support` (neues Ticket),
`reports` (Meldung eines Nutzers), `weekly` (Wochenreport, Montag ab
08:00, unten). Sie brauchen eine Hand in der Konsole, aber keinen
Eingriff im Betrieb.

**Geplant, noch ohne Tag** (kommen mit ihrer Regel und ihrer Zeile hier,
Plan 1.10): KI-Modell deprecated; Phase 3: Bewertung ≤ 3,
Moderations-SLA, Reconciliation-Abweichung > 5 %, VoIP-Push ohne Register
binnen 10 s.

## Störungs-Banner

Nutzer erfahren eine Störung von uns, nicht aus einem Fehlerdialog
(Plan 2.15, Leitprinzip 9). Vier Alarmregeln haben Nutzerwirkung
(`userFacing` in `lib/alerts.js`) und schalten `AppConfig.banner` selbst
an und wieder aus (`lib/statusBanner.js`, Einzelheiten in der README des
Backends, Abschnitt "Outage banner"):

| Alarm-Tag | Bannertext |
|---|---|
| `sms_failures` | Die Anmeldung per SMS ist gerade gestört. Wir arbeiten dran. |
| `push_failures`, `push_credentials` | Mitteilungen kommen gerade verzögert an. Wir arbeiten dran. |
| `agora_tokens` | Anrufe sind gerade gestört. Wir arbeiten dran. |

- **An:** Die Regeln laufen mit den Alarmen alle 30 Minuten und, nur für
  den Banner, im Leader-Job `banner` alle 5 Minuten. Feuert eine, gilt
  `banner = { enabled: true, text, level: "warning", until: null, source:
  "alert:<tag>" }`. Offene Apps bekommen ihn sofort über das Socket-Event
  `appConfig` (oben auf dem Home-Screen, `components/NoticeBanner.tsx`),
  andere beim nächsten Start oder Wechsel in den Vordergrund; wannayap.app
  zeigt ihn als Statuszeile oben (`GET /app-config`, ohne Cookie). Bei
  `sms_failures`, `push_credentials` und `agora_tokens` muss die Schwelle
  zusätzlich in der laufenden und der letzten Stunde (UTC) zusammen gelten
  (beide Stunden addiert, `opsCounters.countsOfRecent`), damit ein Fehler
  vom Morgen abends keinen Banner mehr setzt.
- **Aus:** Der erste Lauf, in dem die Regel nicht mehr feuert, schaltet
  den Banner ab, solange er noch `alert:<tag>` gehört. Du musst nichts tun.
  Wer ihn in der App geschlossen hatte, sieht ihn bei der nächsten Störung
  wieder: Das Schließen gilt nur, bis die App einmal einen Stand ohne
  diesen Banner geladen hat (live über den Socket oder beim nächsten Start
  bzw. Wechsel in den Vordergrund).
- **Hand gewinnt:** Ein Banner, den du in der Konsole (App → Hinweis-Banner)
  gesetzt hast, wird nie überschrieben. Änderst du einen automatischen
  Banner (Text, Schalter, Stufe, Ende) und speicherst, gehört er dir
  (`source: null`) und bleibt, bis du ihn abschaltest; die Automatik bringt
  denselben Text für diese Störung nicht zurück (`banner.muted`). Hat ein
  Alarm den Banner geändert, während die Konsole offen war, lehnt das
  Speichern mit einem Hinweis ab (`banner_changed`) und lädt den aktuellen
  Stand.
- **Abschalten:** Konsole → App: bei einem automatischen Banner steht
  "Automatisch (Alarm `<tag>`)" mit dem Knopf **"Banner jetzt abschalten"**
  (nur Owner). Er bleibt aus, bis der Alarm vorbei ist; die nächste Störung
  setzt ihn wieder. Nötig etwa, wenn der Alarm falsch liegt (Zählerfehler)
  oder du einen genaueren Text von Hand setzen willst.
- **Support-Auto-Antwort:** Ein Ticket, das während eines automatischen
  Banners angelegt wird, bekommt sofort die Antwort „Danke für deine
  Nachricht! Gerade gibt es eine bekannte Störung: <Bannertext> Wir melden
  uns, sobald sie behoben ist.“ Das Ticket bleibt offen und zählt weiter
  für `support_overdue` und den Morgen-Push; die Konsole markiert die
  Antwort "Automatisch". Nach der Störung jedem dieser Tickets kurz von
  Hand antworten.
- **Postmortem-Pflicht:** Jeder dieser Alarme bekommt binnen 5 Werktagen
  ein Postmortem in [`incidents/`](incidents/README.md) nach
  [`POSTMORTEM-TEMPLATE.md`](POSTMORTEM-TEMPLATE.md), Dateiname
  `JJJJ-MM-TT-<tag>.md`, je Maßnahme ein GitHub-Issue. Eine Datenpanne
  läuft nicht hierüber, sondern nach dem Abschnitt "Datenpanne (72
  Stunden)" unten.

## Quittung und Vertretung

- **Tages-Push quittieren:** Der Morgen-Push der Konsole
  (`lib/adminPush.js` dailyDue) öffnet `#ack`; die Konsole ruft dann
  `POST /admin/daily/ack` und setzt `Admin.lastAckAt`. Jede Rolle kann
  quittieren, aber nur die Quittung oder Anmeldung eines **Owners** zählt
  für die Dead-Man-Regel. Einmal am Tag den Push antippen reicht.
- **Dead-Man-Mail:** `deadManCheck` läuft stündlich auf dem Leader. Hat
  7 Tage lang kein aktiver Owner quittiert oder sich angemeldet
  (`lastAckAt`, `lastLoginAt`), geht eine Mail an den Notfallkontakt
  (Konsole → App → Betrieb → "Notfallkontakt", `AppConfig.ops.emergencyContact`)
  mit dem Hinweis auf [`EMERGENCY.md`](EMERGENCY.md). Ohne Kontakt, oder
  wenn die Mail nicht rausgeht (`SMTP_URL` fehlt, SMTP-Fehler), bekommen
  die Owner stattdessen den Push "Quittung fehlt seit 7 Tagen"
  (`owner_silent` in der Alarmliste). Höchstens einmal je 7 Tage.
- **Wochenreport quittieren (Plan 2.11):** Montag ab 08:00 kommen Mail
  ("Wanna yap? Woche <KW>: <Kernzahl>", an jeden aktiven Owner) und Push
  "Wochenreport KW <n>" (Kind `weekly`, Owner, Support, Viewer; je
  Person in den Push-Einstellungen abschaltbar). Konsole → Woche
  (`#weekly`) zeigt den Report der letzten vollen Woche; quittieren mit
  den Stunden Betrieb in drei Pflichtfeldern (Alarme, Support, Freigaben;
  0 ist erlaubt) und bis zu drei Entscheidungen (`POST /admin/weekly/ack`,
  Owner und Support). Die Entscheidungen und das Hook-Thema trägst du
  zusätzlich in [`DECISIONS.md`](DECISIONS.md) und unter Konsole → App →
  "Marketing-Hinweise für den Agenten" ein. Der tägliche Morgen-Push
  bleibt daneben bestehen; der Wochenreport ersetzt ihn nicht.
- **Wochenreport offen (`weekly_silent`):** Geht der Report seit
  mindestens 14 Tagen raus und hat in den letzten 14 Tagen kein aktiver
  Owner einen quittiert, bekommt der Notfallkontakt eine Mail mit dem
  Grund (sonst die Owner den Push "Wochenreport seit 14 Tagen offen").
  Das fängt den Fall, dass die Konsole noch geöffnet wird, die
  wöchentliche Durchsicht aber fehlt. Gilt schon `owner_silent`, bleibt
  `weekly_silent` still; höchstens einmal je 7 Tage. Quittungen von
  Support zählen nicht, eine Vertretung braucht deshalb die Rolle `owner`.
- **Vertretung vor Urlaub oder Ausfall:** zweiter Owner mit funktionierendem
  Passkey oder TOTP (Konsole → Team, Rolle `owner`); Notfallkontakt
  eingetragen und der Person gesagt, wo `EMERGENCY.md` liegt;
  Notfallzugang im Passwort-Manager getestet (Checkliste in
  `EMERGENCY.md`). Verlorener Authenticator ohne zweiten Owner: Render
  Shell, `node scripts/reset-admin-totp.js <email>` (Backend-README "Team").

## Kill-Switch

Alles in der Konsole unter App → Betrieb bzw. App, wirkt binnen 30 Sekunden
(Cache in `lib/appConfig.js`), kein Deploy nötig:

- **Anmeldung per SMS pausieren:** `smsPaused` an. Jeder `POST /verify/start`
  antwortet 503 "Die Anmeldung per SMS ist gerade pausiert". Bestehende
  Nutzer bleiben angemeldet (JWT), nur neue Konten und neue Geräte sind
  betroffen. Dazu ein Banner, damit niemand die App für kaputt hält.
- **Länder und Deckel:** `smsRegions` (Standard DE, AT, CH) und
  `smsPerDay` (Standard 100) gegen SMS-Pumping.
- **Feature-Flags:** App → Flags; die App liest sie beim Start
  (`GET /app-config`). Ein Flag aus, wenn ein Feature Schaden anrichtet.
- **Mindest-Build und Banner:** Mindest-Build hochsetzen sperrt einen
  gefährlichen Build aus (Update-Hinweis in der App); das Banner
  (`info`/`warning`, mit Ablauf) sagt Nutzern, was los ist. Markenton
  "kein Druck" gilt auch hier.
- **Marketing:** Konsole → Freigabe: Budget auf 0 bzw. Kanal trennen stoppt
  Ausgaben und Posts sofort; der Agent rendert weiter Entwürfe, postet aber
  nichts ohne Freigabe.

## Phased Release pausieren

Ein neuer Store-Build geht mit "Phased Release" über 7 Tage an einen
wachsenden Anteil der Nutzer mit automatischen Updates. Zeigt die Konsole
nach einem Release neue fatale Fehler (`client_errors`) oder brechen
Anrufe (`no_talks`): App Store Connect → App → Version → Phased Release
→ **Pause**. Pausiert bleibt der Anteil stehen; wer die App schon hat,
behält sie. Dann Mindest-Build **nicht** auf den neuen Build setzen, Banner
setzen, Hotfix-Build nach [`RELEASE.md`](RELEASE.md), danach "Resume" oder
den Hotfix als neue Version einreichen. Pausieren ist tageweise begrenzt
(Apple zeigt die Frist in App Store Connect); nicht vergessen, wieder
freizugeben oder zu ersetzen.

## Twilio gesperrt

Twilio sperrt Konten bei Betrugsverdacht (SMS-Pumping) oder bei leerem
Guthaben ohne Auto-Recharge. Folge: keine Anmelde-SMS, keine Alarm-SMS,
Alarm `sms_failures` (Push und Mail kommen weiter).

1. Twilio-Konsole: Grund lesen (Billing oder Trust & Safety), Guthaben
   aufladen bzw. Ticket beim Twilio-Support, Verify Fraud Guard prüfen.
2. Konsole → App → Betrieb: `smsPaused` an und Banner "Neue Anmeldungen
   sind gerade nicht möglich, bestehende Konten laufen weiter". Der
   Review-Login (`REVIEW_PHONE`) sendet keine SMS und geht weiter.
3. Nach der Entsperrung `smsPaused` aus, Banner weg, einen Testlogin mit
   einer echten Nummer machen. War es Pumping: `smsRegions` enger,
   `smsPerDay` kleiner, Fraud Guard auf "Max".

## Datenpanne (72 Stunden)

Art. 33 DSGVO: Meldung an die zuständige Aufsichtsbehörde binnen 72 Stunden
nach Bekanntwerden, wenn ein Risiko für Betroffene besteht; Art. 34:
Information der Betroffenen bei hohem Risiko. Die Uhr läuft ab dem Moment,
in dem du es weißt.

1. **Stoppen (Stunde 0–2):** betroffenen Zugang schließen. Geleakte Secrets
   drehen: `JWT_SECRET` (meldet alle Nutzer ab), `MONGODB_URI`-Passwort in
   Atlas, `AGORA_APP_CERTIFICATE`, Cloudinary-Secret, Twilio Auth Token,
   `ADMIN_API_KEY`, GitHub-Secrets; betroffene Admins in Konsole → Team
   deaktivieren. Alle Fundorte stehen in [`SERVICES.md`](SERVICES.md).
2. **Festhalten (Tag 1):** Was, seit wann, wie entdeckt, welche Daten,
   wie viele Personen, was getan wurde. `AdminAudit` und Render-Logs
   sichern (Logs laufen bei Render ab). Alles in ein Dokument im
   Firmenordner; der Vorfall bekommt eine Zeile in
   `CMM-backend-new/COMPLIANCE.md`.
3. **Melden (bis Stunde 72):** Aufsichtsbehörde des Bundeslandes, in dem
   die Firma sitzt, über deren Online-Formular; Anwalt aus dem Anwaltspaket
   (Plan 1.6) vorher anrufen, wenn erreichbar. Auftragsverarbeiter
   benachrichtigen, wenn der Vorfall bei ihnen liegt.
4. **Nutzer informieren (bei hohem Risiko):** Banner `warning` in der
   Konsole, Push nur, wenn es nötig ist, Text in Du-Form ohne
   Beschönigung: was passiert ist, was wir getan haben, was sie tun können
   (z. B. nichts, oder Kontakte prüfen). Mail nur an Adressen, die wir
   haben (Warteliste, Admins).
5. **Nacharbeit:** Ursache beheben, Test dafür, Eintrag hier, falls eine
   Regel oder ein Alarm gefehlt hat. Dieser Abschnitt bleibt der eine Ort
   für Datenpannen; ein Postmortem in [`incidents/`](incidents/README.md)
   kommt höchstens zusätzlich und ohne personenbezogene Einzelheiten.

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
`BACKUP_S3_SECRET_ACCESS_KEY`; optional `BACKUP_PING_URL` und
`BACKUP_PING_KEY` (der Ping am Ende des Laufs, der `ops.lastBackupAt`
setzt; ohne ihn bleibt `backup_stale` auch bei grünem Lauf stehen).

**Der private age-Schlüssel** liegt nirgends im Repo und nirgends bei
GitHub: nur im Passwort-Manager (Eintrag "Backup age-Schlüssel", mit
Notfallzugang für die Vertrauensperson aus Plan 1.8). Ohne ihn ist jeder
Dump wertlos; mit ihm ist jeder Dump Klartext. Beides ist Absicht.

**Restore in einen temporären Cluster** (einmal jetzt, dann alle 90 Tage,
nie in die Produktions-DB):

1. Temporären Cluster in Atlas anlegen (Free-Tier reicht), Verbindungs-URI
   in `RESTORE_URI` ablegen. Neuesten Dump aus dem Bucket holen
   (`aws s3 cp --endpoint-url "$BACKUP_S3_ENDPOINT" s3://<bucket>/mongo/<YYYY-MM-DD>.archive.gz.age .`;
   der Workflow legt die Dumps unter `mongo/` ab, benannt nach dem Tag).
2. Entschlüsseln und einspielen (der Dump ist ein gzip-Archiv aus
   `mongodump --archive --gzip`):
   `age -d -i <privater-schlüssel> -o dump.archive.gz <YYYY-MM-DD>.archive.gz.age`
   `mongorestore --uri "$RESTORE_URI" --archive=dump.archive.gz --gzip --drop`
3. Prüfen, dass die Daten brauchbar sind: in `mongosh "$RESTORE_URI"` die
   Collection-Zahlen (`db.users.countDocuments()`,
   `db.calls.countDocuments()`, `db.talks.countDocuments()`) mit den
   Zahlen in der Konsole vergleichen und einen Nutzer stichprobenartig
   öffnen. Dann in `CMM-backend-new` die Suite gegen den Cluster laufen
   lassen: `TEST_MONGODB_URI="$RESTORE_URI" npm test`. Sie legt sich eine
   eigene Datenbank `wannayap-test-<pid>` neben die eingespielten Daten,
   leert nur diese (`test/helpers.js` weigert sich bei jedem anderen
   Namen) und zeigt, dass dieser Code-Stand mit dem Cluster arbeitet.
   Danach den temporären Cluster löschen.

Zielwerte (Plan 1.9): Alter des letzten Dumps < 8 Tage, Tage seit letztem
Restore-Test ≤ 90.

**Letzter Restore-Test:** noch nie

Nach jedem Restore-Test das Datum auch in der Konsole unter App → Betrieb
→ „Letzter Restore-Test“ eintragen: daraus rechnet das Launch-Gate den
Haken `restoreDrill` (jünger als 90 Tage, [`GATE.md`](GATE.md)).

## Rollback

- **Backend (Render):** Dashboard → Service → Deploys → vorheriges Deploy →
  "Rollback to this deploy". Dauert eine Minute, danach `/healthz` und
  `/api/push-health` prüfen (`version` muss der alte Stand sein). Deploys
  laufen automatisch von `main`; ein Revert-Commit ist der dauerhafte Weg.
  Ziel ist der letzte grüne Stand vor dem Fehler: Jeder Commit auf `main`,
  dessen Tests grün waren, trägt das Tag `api/<JJJJ-MM-TT>-<sha>`
  (Datum Europe/Berlin, Plan 2.1b); `git tag -l 'api/*' --sort=-creatordate`
  im Backend-Repo listet sie, der Commit dazu steht in Render unter Deploys.
  Sentry-Releases des Backends heißen wie der Commit (`RENDER_GIT_COMMIT`).
- **App:** Einen Store-Build nimmst du nicht zurück. Was geht: in der
  Konsole unter "App" ein Hinweis-Banner für alle setzen und, falls ein
  Build gefährlich ist, den Mindest-Build hochsetzen; die App zeigt dann den Update-Hinweis
  (`services/appInfo.ts` isOutdated). JS-Fehler: OTA-Rollback oder
  OTA-Hotfix, Store-Build nur bei nativen Änderungen. Die Regeln dafür
  (OTA oder Store-Build, `eas update:republish`, Phased Release, minBuild)
  stehen genau einmal in [`RELEASE.md`](RELEASE.md), Abschnitt "OTA oder
  Store-Build".

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
