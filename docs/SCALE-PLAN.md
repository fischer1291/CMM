# Vom Launch zur Firma: Prozesse und Automatisierung

Wanna yap? ist im App Store. Jetzt geht es darum, aus einer App eine Firma zu machen, die sich selbst betreibt: sicher, legal, messbar, mit Alarmen statt Dashboards und mit Gates im Code statt Vorsätzen im Kopf. Dieses Dokument ist dein Arbeitsplan für die nächsten zwölf Monate.

So liest du es: Vier Phasen bauen aufeinander auf. Jede Phase hat ein Ziel, ein Übergangskriterium (erst wenn es erfüllt ist, beginnt die nächste), eine Schnittlinie ("wenn nur drei Dinge gehen, dann diese") und ein Stundenbudget. Jeder Punkt sagt dir, was auslöst, was dann passiert, was am Ende steht, in welchen Dateien du arbeitest und woran du den Erfolg misst. Alle Zielwerte, Preise, Stunden und Nutzerzahlen sind Annahmen, bis echte Rechnungen und echte Kohorten vorliegen. Sie stehen als "Annahme" markiert. Ist-Zahlen enthält das Dokument bewusst nicht, weil sie noch nicht gemessen werden; genau das ändert Phase 1.

Grundlage ist eine Bestandsaufnahme beider Repos vom 1. Oktober 2026 (`CMM` auf Stand von PR #58, `CMM-backend-new` auf Stand von PR #50). Zeilenangaben wie "Z. 80" beziehen sich auf diesen Stand und verschieben sich mit jedem Commit; die Dateinamen bleiben der verlässliche Anker.

Stack, auf dem alles aufsetzt: App in `CMM` (Expo / React Native, expo-router), Backend in `CMM-backend-new` (Node, Express 5, Socket.IO, Mongoose, Render, Leader-Jobs in `index.js`), Website auf Netlify (`CMM/scripts/build-web.sh`, `CMM/marketing/build.js`, `CMM/netlify.toml`), Admin-Konsole als PWA in `CMM-backend-new/admin-ui/`.

## Wo wir stehen

Version 1.0 (Build 22) ist frisch im App Store, nur iOS, nur Deutschland. Nach allem, was in den Repos steht, betreibst du alles allein: ein persönliches Expo-Konto (`CMM/app.config.js` owner `schly21`), ein Owner in der Admin-Konsole, Docs in Du-Form. Seid ihr schon zu zweit oder zu dritt, werden die Bus-Faktor-Punkte (1.8, 4.2) leichter, der Rest des Plans bleibt gleich.

Die Produkt- und Content-Maschine ist für dieses Stadium ungewöhnlich weit: Plan-Limits mit Paywall und RevenueCat-Webhook, Referral- und Wartelisten-Geschenke, 14 Push-Typen mit Prefs und Tages-Cap, Yap Moment, Rituale, Nudges, Badges, ein Marketing-Agent mit Budget-Reservierung und Auto-Posting, Metrik-Snapshots mit Kohorten und der Playbook-Kennzahl "Gespräch in 7 Tagen", eine Admin-PWA mit Passkeys, Kill-Switch, Banner und Support-Tickets, CI in beiden Repos und ein reproduzierbarer TestFlight-Weg.

Die Wachstumsschleife ist an vier belegten Stellen gerissen. `CMM/public/download.html` hat `STORE_URL` null, und kein Build-Schritt ersetzt den Wert (`marketing/build.js` injiziert nur `DOWNLOAD_URL`, `LANDING_MODE`, `SITE_URL`, `PUBLIC_API_URL`, `PREORDER` in die Landing). Der Einladungslink trägt keinen Absender-Code. Nach dem Signup passiert vom System aus nichts mehr. Nichts vom Erfolg fließt zurück (keine Post-Insights, kein Push-Öffnungssignal, kein Onboarding-Funnel).

Die Geldseite existiert im Backend nicht. `routes/plus.js` verwirft Preis, Währung und Event-ID. `MetricsDaily` kennt weder Plus noch Kosten. Twilio-SMS sind nur je IP und je Zielnummer begrenzt, nicht global pro Tag. Agora-Minuten (Video ist Default: `lib/calls.js` startCall video = true) und Cloudinary werden nirgends in Euro gezählt. Gleichzeitig verkaufst du schon Abos, ohne Gewerbe, Geschäftskonto, Steuerberater, finale Datenschutzerklärung (`docs/RELEASE.md`: "Entwurf") oder Mindestalter.

Drei Sicherheitslücken wiegen schwerer als jeder fehlende Funnel, deshalb stehen sie in der Schnittlinie von Phase 1. `lib/calls.js` startCall prüft nur isBlocked, also kann jeder, der eine Nummer kennt, jede registrierte Person per VoIP-Push klingeln lassen. `/contacts/match` (`routes/contacts.js` Z. 8, 53–56) nimmt 5.000 ungesalzene SHA-256-Hashes nur hinter dem globalen 300/min/IP-Limiter an und antwortet mit Klartextnummer, Name, Avatar und lastOnline. `routes/verify.js` Z. 118–121 legt Konten per Upsert auf die Nummer an, sodass eine recycelte Prepaid-Nummer das alte Konto samt Kontakten und Plus übernimmt. Dazu kommt ein offener Punkt: Die Legacy-Auth-Zweige, die tokenlosen Clients Payload-Nummern glauben, existieren noch im Code (`lib/auth.js` Z. 9, 64, 106; `socket.js` Z. 13). `docs/RELEASE.md` verlangt `AUTH_REQUIRED=true` auf Render; ob das Flag in Produktion gesetzt ist, zeigt nur `/api/push-health` (authRequired).

Betrieblich ist alles auf eine Instanz ausgelegt: Socket.IO ohne Adapter, 8 In-Memory-Limiter (7 Aufrufstellen), Ring-Timer im Prozess, sweepStaleCalls nur beim Start. Es gibt keinen `/healthz`, keinen unhandledRejection-Handler, kein Backup. Der einzige Alarm über den alerts-Kanal betrifft Wartelisten-Mails (`lib/waitlist.js` Z. 137); Posting-Fehler laufen über Kind 'posting' (`lib/socialPosting.js` Z. 477); `lib/push.js` und `lib/receipts.js` melden nur per console.error. Bus-Faktor 1 gilt für Konsole, Dienste, Wissen und den Fall, dass du ausfällst.

Die gute Nachricht: Fast alle kritischen Lücken sind S/M-Aufwand auf vorhandenem Stack, weil Leader-Lease, Snapshots, Admin-Push und AppConfig schon da sind. Neu ist die Erkenntnis aus der Beispielrechnung (siehe Unit Economics): Bei Video-Default, 3 € ARPPU und 2–5 % Conversion ist der Deckungsbeitrag je MAU negativ. Der Preis-/Qualitätsmix ist deshalb eine Phase-2-Entscheidung, nicht Phase 4.

### Was heute schon automatisch läuft

| Bereich | Was | Wo |
|---|---|---|
| CI | App: typecheck + lint + jest; Backend: node --test mit mongodb-memory-server (21 Dateien, 156 Tests) | `CMM/.github/workflows/ci.yml`, `CMM-backend-new/.github/workflows/test.yml` |
| Build und Deploy | iOS-Build + TestFlight-Upload per EAS (workflow_dispatch, --auto-submit); Render Auto-Deploy von main | `CMM/.github/workflows/ios-build.yml`, `CMM/docs/RELEASE.md`, Render |
| Hintergrundjobs | Leader-Lease (90 s, SIGTERM-Übergabe): Minutentick (Zeitpläne, Moments, Rituale), Snapshots alle 30 min, Warteliste alle 15 s, Social-Posting alle 5 min, Token-Refresh stündlich, Waitlist-Resend alle 10 min, Admin-Tageszahlen alle 5 min, Push-Receipts alle 15 min | `CMM-backend-new/index.js` Z. 97–157, `lib/leader.js` |
| Marketing | Agent rendert täglich App-Videos, Di/Fr Hero-Videos mit Veo; Budget-Reservierung 5 €/Tag, 25 €/Woche; Auto-Posting Instagram/TikTok 12:00/18:00 mit Token-Refresh | `CMM/marketing/agent/*`, `CMM/.github/workflows/marketing-agent.yml`, `CMM-backend-new/lib/marketingBudget.js`, `lib/socialPosting.js` |
| Landing und Warteliste | Funnel je utm bis "gelesen" (visit/engaged/form/submitted), Double-Opt-in, Empfehlungslink, Launch-Mail, 30 Tage Plus ab 3 bestätigten Freunden | `CMM-backend-new/lib/waitlist.js`, `models/LandingVisit.js`, `CMM/marketing/src/landing.js` |
| Monetarisierung | Plan-Limits mit Enforcement, Paywall mit Offerings/Kauf/Restore, RevenueCat-Webhook mit Secret und Stale-Schutz, Referral-Geschenke (3 Geworbene = 30 Tage, max. 6×), Admin-Grant mit Audit | `CMM-backend-new/lib/plan.js`, `routes/plus.js`, `lib/referral.js`, `CMM/services/purchases.ts` |
| Push | 14 reaktive Typen mit Prefs, Quiet Hours, Tages-Cap 10; VoIP-Push für Anrufe; Receipts und Token-Hygiene | `CMM-backend-new/lib/notify.js`, `lib/push.js`, `lib/receipts.js` |
| Produkt-Loops | Yap Moment (zufällig 10:00–21:00 je Zeitzone), Rituale, Nudges mit Cooldowns und 20/Tag je Absender, Moments-Unlock mit 19-Uhr-Erinnerung, Badges, Bewertungs-Prompt | `lib/dailyMoment.js`, `lib/circles.js`, `lib/nudges.js`, `routes/gamification.js`, `lib/unlock.js`, `lib/badges.js`, `CMM/services/reviewPrompt.ts` |
| Kennzahlen | Tages-Snapshots (users, calls, talks, circles, rituals, growth, push, reports), ActiveDay-Hashes, Wochenkohorten mit Retention, Aktivierung (ACTIVATION_DAYS = 7) und k, Tageszahlen-Push, Versionsverteilung | `lib/metrics.js`, `models/MetricsDaily.js`, `lib/today.js`, `lib/adminPush.js` |
| Admin-Konsole | PWA mit Passkeys, Web-Push (Kinds inkl. 'alerts'), Freigaben, Support-Tickets, Moderation, App-Config (Min-Version, Banner, Flags, Limits), Metriken, Warteliste, Marketing-Budget/Kanäle | `CMM-backend-new/admin-ui/`, `routes/admin.js`, `lib/appConfig.js`, `lib/adminAuth.js` |
| Fehler | JS-Crash-Reports ohne SDK (max. 20/Start), `/api/push-health`, App-Version pro Nutzer | `routes/diagnostics.js`, `models/ClientError.js`, `app.js` Z. 66, `CMM/services/diagnostics.ts` |
| Support und Recht | Tickets mit Push und Antwort-Push, Reports mit Auto-Hide ab 3 Meldern, Sperren mit sofortiger Durchsetzung bei Sign-in und Token-Prüfung, Audit-Log, DSGVO-Export/-Löschung Self-Service, TTL-Löschfristen | `routes/support.js`, `routes/social.js`, `lib/moderation.js`, `lib/accessGate.js`, `lib/account.js` |
| Web | Statischer Export (Landing, /einladung, /kreis, /datenschutz, /impressum), Universal Links, /k/:campaign → /download?ct= | `CMM/scripts/build-web.sh`, `CMM/marketing/build.js`, `CMM/netlify.toml` Z. 31–34 |

### Die größten Lücken

| Lücke | Folge | Phase |
|---|---|---|
| `STORE_URL`, `PROVIDER_TOKEN`, `TESTFLIGHT_URL` sind null in `public/download.html`, kein Build-Schritt ersetzt sie | Alle /k/-Links, Flyer-QR und Launch-Mail enden auf "kommt in Kürze"; kein Store-Klick zählbar | 1 |
| startCall prüft nur isBlocked (`lib/calls.js` Z. 80–86) | Jeder mit einer Nummer kann jede registrierte Person klingeln lassen | 1 |
| `/contacts/match`: 5.000 SHA-256-Hashes, nur der globale 300/min/IP-Limiter, Antwort mit Klartextnummer und lastOnline | Nummern-Orakel über den kleinen deutschen Nummernraum | 1 |
| Legacy-Auth-Zweige noch im Code: ohne `AUTH_REQUIRED=true` werden tokenlosen Clients Payload-Nummern geglaubt (`lib/auth.js` Z. 9, 64, 106; `socket.js` Z. 13); RELEASE.md verlangt das Flag, Produktionsstand per `/api/push-health` prüfen | Identitätsübernahme ohne Token, falls das Flag fehlt; sonst toter Code mit Risiko bei jedem Env-Wechsel | 1 |
| Kein `/healthz`, kein Uptime-Check, kein unhandledRejection-Handler | Nächtlicher Ausfall von Anmeldung oder Anrufzustellung fällt erst über Tickets auf | 1 |
| Kein Backup, kein Restore je geübt, kein Runbook | Datenverlust ist Firmenende | 1 |
| RevenueCat-Webhook verwirft price/currency/event.id, ignoriert TRANSFER, trennt Sandbox nicht | Kein MRR, kein Churn; zahlender Kunde kann ohne Plus dastehen | 1 |
| SMS ohne Länder-Allowlist und globalen Tagesdeckel (nur IP-/Nummern-Limiter in `routes/verify.js` Z. 47–64); Verify-Fehler enden als 502 | Angreifer statt Nutzer treiben die Twilio-Rechnung | 1 |
| Referral zählt beim Beitritt (`lib/invites.js` Z. 29) | Drei Prepaid-SIMs kaufen 30 Tage Plus und kosten drei SMS | 1 |
| Einladungslink ohne Absender-Code (`content/links.ts`) | Einladungen über WhatsApp, Stories, Campus zählen als "direkt"; kein k-Faktor | 1 |
| Abos ohne Gewerbe, Geschäftskonto, Steuerberater; Datenschutzerklärung "Entwurf"; kein Mindestalter; nur Apples Standard-EULA | Steuer- und Datenschutzrisiko, während Geld fließt | 1, 2 |
| Ein Owner, ein Expo-Personal-Konto, keine Admin-Verwaltung (`routes/admin.js` ohne /admin/admins) | Bus-Faktor 1 für Konsole, Dienste, Wissen | 1 |
| Einziger Alarm über 'alerts': Wartelisten-Mailausfall (`lib/waitlist.js` Z. 137); Posting-Fehler nur über Kind 'posting' (`lib/socialPosting.js` Z. 477); `lib/push.js` und `lib/receipts.js` nur console.error | Störungen bleiben stumm | 1 |
| Nach Signup passiert nichts: kein Onboarding-, Inaktivitäts-, Plus-Ablauf-Push, keine lifecycle-Pref | Leerer Screen ist der wahrscheinlichste Churn, niemand holt zurück | 2 |
| Ring-Timer in Prozess-Map, sweepStaleCalls nur beim Start (`index.js` Z. 53) | Jeder Render-Deploy lässt Klingelvorgänge hängen | 2 |
| Native Crashes nur im Xcode Organizer | CallKit/Agora/PushKit-Fehler bleiben unsichtbar | 2 |
| Keine Kosten in Euro, Video-Default für Free | Deckungsbeitrag je MAU unbekannt, laut Beispielrechnung negativ | 2 |
| Phone-Hash reines SHA-256; ActiveDay fehlt im Löschpfad (`lib/account.js`) | Pseudonym statt anonym, Löschpflicht verletzt | 2 |
| Upsert auf Nummer in `routes/verify.js` Z. 118–121 | Recycelte Prepaid-Nummer übernimmt altes Konto | 2 |
| Keine Post-Insights, keine ASC-Daten, kein Kampagnen-Objekt, kein CAC | Agent und Budget lernen nichts; Reichweite wäre Blindflug | 2, 3 |
| Eine Instanz: Socket.IO ohne Adapter, 8 In-Memory-Limiter (7 Aufrufstellen) | Zweite Instanz würde Anrufe verlieren | 3 |
| Android nur Gerüst (0 `<service>`, keine google-services.json) | Gemischte Freundeskreise bleiben unvollständig | 3 (Entscheidung), 4 |

## Die ersten zehn Schritte

Damit fängst du morgen an. Reihenfolge ist Priorität.

1. Store-Link scharf schalten: `STORE_URL` und `PROVIDER_TOKEN` in Netlify eintragen, `marketing/build.js` schreibt sie in `public/download.html`, Build bricht ohne Link ab (Punkt 1.1).
2. Anrufe nur an gegenseitige Kontakte; per `/api/push-health` prüfen, ob authRequired=true ist, sonst sofort setzen, dann Legacy-Zweige löschen; `/contacts/match` mit eigenem Limiter und lastOnline nur für Kontakte (Punkt 1.5a).
3. Vertrauensperson benennen, die zweiter Owner, Notfallzugang und Vollmacht bekommt; ohne Namen bleibt Bus-Faktor 1 (Punkt 1.8, Offene Entscheidungen).
4. Gewerbe anmelden, Geschäftskonto eröffnen, Steuerberater-Erstgespräch mit drei Fragen terminieren, Small Business Program und D-U-N-S beantragen, Startup-Credits anfragen (Punkt 1.7).
5. `GET /healthz` bauen, als Render Health Check eintragen, externen Uptime-Monitor im Free-Tier anlegen, unhandledRejection-Handler setzen (Punkt 1.2).
6. Ersten mongodump age-verschlüsselt nach B2/R2 legen und einmal in einen temporären Cluster zurückspielen, Datum ins RUNBOOK (Punkt 1.9).
7. `SubscriptionEvent` anlegen und `routes/plus.js` applyEvent idempotent machen, Sandbox trennen, TRANSFER behandeln (Punkt 1.3).
8. Globaler SMS-Tagesdeckel, Länder-Allowlist, Referral erst nach firstTalkAt, Spend Limits in Anthropic- und Google-Konsole (Punkt 1.4).
9. Datenschutzerklärung aus dem Entwurf holen, Mindestalter 16 ins Onboarding, Anwaltstermin und eine Stunde Markenrecherche (Punkt 1.6).
10. Seed-Cluster-Plan ins PLAYBOOK schreiben (eine Hochschule, 10 benannte Freundeskreise, 30 Registrierungen/Woche als Ziel) und die ersten fünf Nutzergespräche terminieren (Punkt 1.13).

## Leitprinzipien

1. **Dichte vor Reichweite.** Jede Maßnahme wird daran gemessen, ob sie Freundeskreise komplett in die App bringt (≥ 3 registrierte Kontakte), nicht an Downloads. Gemischte iOS/Android-Kreise zählst du ab Phase 1, weil sie die Dichte strukturell begrenzen.
2. **Gates gehören in den Code, nicht in den Kopf.** Media-Spend, Android, zweite Instanz und Preis-Experimente werden über eine einzige Gate-Checkliste (`AppConfig.launchChecklist`, automatische und manuelle Haken) und `lib/marketingBudget.js` reserve() freigeschaltet.
3. **Erst sicher und legal, dann nicht blind, dann schneller.** Anrufe nur an gegenseitige Kontakte, Gewerbe/Steuer/Datenschutz final und ein Alarm aufs Handy in unter 5 Minuten kommen vor jedem Wachstumsschritt.
4. **Jeder Euro rein und raus landet in MetricsDaily.** RevenueCat- und Apple-Events, SMS, Agora-Minuten, Uploads, KI- und Mediakosten werden gespeichert, sonst ist Gewinn nicht messbar.
5. **Auf dem vorhandenen Stack bauen.** Leader-Jobs, MetricsDaily, AppConfig, adminPush, Admin-PWA. Kein Redis, kein Tracking-SDK, kein Microservice, keine zweite Instanz, solange ein Lasttest es nicht erzwingt.
6. **Ehrlich bei kleinen Zahlen.** Eine Kennzahl steuert erst ab definierter Stichprobe (Kohorte ≥ 50 oder 4 Kohorten ≥ 100 zusammen, Paywall ≥ 200 Views/Woche). Davor ersetzen 5 dokumentierte Nutzergespräche pro Woche die Statistik. Ereignis-Log und Push-Öffnungsmessung warten auf 200 WAU.
7. **Kapazität zuerst planen.** 15–20 Entwicklungsstunden pro Woche neben Launch-Support (Annahme). S ≈ 5 h, M ≈ 15 h, L ≈ 40 h. Jede Phase hat ein Stundenbudget und eine "Wenn nur drei Dinge"-Schnittlinie.
8. **Betrieb unter 5 Stunden pro Woche.** Wiederkehrendes wird Job, Alarm oder 30-Minuten-Slot. Du bekommst Ausnahmen, einen Tages-Push und ab Phase 2 einen Montagsreport, keine Dashboards zum Absuchen.
9. **Markenton "kein Druck" gilt auch für Automatisierung und Sicherheit.** Lifecycle-Pushes haben eigenen Schalter und Cap, Fremde erreichen niemanden ohne Zustimmung, Störungen werden Nutzern per Banner gesagt.
10. **Ein Ort je Thema.** RUNBOOK, Alarmliste, Gate-Checkliste, Export-Familie und Datenschutz-Änderungsprozess existieren genau einmal. Jedes Feature trägt seine Datenschutz-, Löschpfad- und Runbook-Zeile im PR mit.
11. **Pseudonym ist nicht anonym.** Hashes über Telefonnummern bleiben personenbezogen. Sie bekommen einen serverseitigen Pepper, einen Löschpfad und eine Rechtsgrundlage, bevor neue Hash-Daten entstehen.
12. **Geld früh ordnen.** Gewerbe, Geschäftskonto, Steuerberater, Startup-Credits und Small Business Program sind Woche-1-Aufgaben. Rechtsform und Versicherung folgen dem Umsatz.

## North Star und Kennzahlen

**North Star:** Anteil neuer Nutzer mit echtem Gespräch (Talk) innerhalb von 7 Tagen nach Registrierung, rollierend über die letzten 4 Wochenkohorten (`lib/metrics.js` activation(), ACTIVATION_DAYS = 7), Ziel > 40 % (Playbook) als Gate für jede bezahlte Reichweite. Steuernd erst ab Kohorte ≥ 50 oder 4 Kohorten ≥ 100 zusammen. Daneben zwei Leitplanken: Gespräche pro Woche (`MetricsDaily.talks.count`, muss Woche über Woche steigen) ab Phase 2 und Deckungsbeitrag je MAU > 0 ab Phase 3.

Alle Zielwerte sind Annahmen, sofern nicht als Playbook-Regel markiert. Nach 4 Wochen Messung justierst du sie.

| Kennzahl | Definition | Zielwert | Warum |
|---|---|---|---|
| Aktivierung D7 (North Star) | Anteil einer Registrierungswoche mit ≥ 1 Talk in 7 Tagen (activation(), ab Phase 1 zusätzlich `milestones.firstTalkAt`), rollierend 4 Kohorten | > 40 % vor bezahlter Reichweite (Playbook); 50 % bis Monat 12 (Annahme) | Misst Produktwert und Dichte zugleich; unter 40 % kauft Reichweite nur Deinstallationen |
| Dichte | Anteil neuer Nutzer mit ≥ 3 registrierten Kontakten (`User.contacts`) nach 7 Tagen je Kohorte und Kampagne; Anteil isoliert (0 Kontakte); Median contacts.length | > 50 %; isoliert < 20 % (Annahmen) | Leerer Screen ist der wahrscheinlichste Churn; Frühindikator für Aktivierung |
| Anruf-Sicherheit (neu) | calls.rejectedNotConnected/Tag; harassment-Meldungen je 1.000 Anrufe; tokenlose Requests; Match-Requests > 2.000 Hashes ohne Alarm | Meldungen je 1.000 Anrufe < 1 (Annahme); tokenlos = 0; Match ohne Alarm = 0 | Fremde dürfen niemanden klingeln lassen; Nummern-Orakel geschlossen |
| Gespräche pro Woche, je WAU, Annahmequote | `MetricsDaily.talks.count` Wochensumme; geteilt durch WAU (foreground); calls.answered / calls.started | Wochenwachstum ≥ 5 % über 8 Wochen; Annahmequote > 60 %, Alarm < 50 % (Annahmen) | Die Zahl, die jede Woche steigen muss; Annahmequote ist frühestes Signal für Push-/CallKit-Probleme |
| Einladungs- und Store-Funnel, k-Faktor | Eine Kette mit gleichem Nenner: Besuch → Store-Klick (Phase 1) → Download (ASC, Phase 3) → Registrierung → Talk; Einladungen geteilt → /einladung mit Code (InviteVisit) → beigetreten (joinedViaInvite); k = invitesJoined-Zuwachs / Neunutzer | Klick→Beitritt > 25 % (Annahme); k ≥ 0,5 vor Media-Spend, langfristig > 1 | Einladung ist der einzige kostenlose Kanal, der Dichte bringt |
| Android-Dichtebremse (neu) | Anteil Android unter eingeladenen Kontakten (`InviteVisit.platform` je Einlader); Mittel der Onboarding-Antwort androidFriends; Anteil Kreise mit ≥ 1 Nicht-Beitritt wegen Android | Gate > 30 % löst die Phase-3-Entscheidung aus | Entscheidet über Android anhand Dichte, nicht Klicks |
| Push→Anruf-Quote und Opt-out je Typ | Anteil Pushes je Typ mit Call desselben Empfängers in 30 min (PushDecision.openedAt, Call.origin); Opt-outs je Pref | contact_available > 10 %; Opt-out lifecycle < 5 % (Annahmen) | Steuernd erst mit Ereignis-Log ab > 200 WAU (Phase 3); bis dahin Ersatz "ActiveDay/Talk binnen 48 h nach Lifecycle-Push" |
| Retention W1/W4 (Vordergrund) | Anteil einer Kohorte mit app_foreground in Folgewoche 1 bzw. 4 (ActiveDay.kind foreground); W4/W1 als PMF-Signal | W1 > 50 %, W4 > 30 % (Annahmen); Kurve flacht ab | Heute überschätzt jeder Hintergrund-Request die Aktivität |
| MRR und Netto-Bewegung | Summe monatlich normalisierter Preise aktiver Store-Abos (PRODUCTION) aus SubscriptionEvent; Bewegung = neu + Reaktivierung − Kündigung − Ablauf; steuernd ab 30 Abos | MRR ≥ monatliche Fixkosten bis Monat 12 | Ohne gespeicherte Umsätze ist keine Preisentscheidung prüfbar |
| Free→Paid und Trial→Paid | Anteil Kohorte mit INITIAL_PURCHASE (non-sandbox) in 30 Tagen; Trial-Starts → NORMAL; Paywall-View → Kauf je Quelle | Free→Paid ≥ 2–3 %, Trial→Paid ≥ 40 % (Annahmen) | Hebel Nr. 1 für Umsatz bei gegebener Nutzerzahl |
| Churn freiwillig/unfreiwillig | EXPIRATION je Monat / aktive Abos zu Monatsbeginn, getrennt nach CANCELLATION und BILLING_ISSUE | < 6 %/Monat; unfreiwillig < 30 % des Churns (Annahmen) | Unfreiwilliger Churn ist mit Grace Period fast kostenlos vermeidbar |
| Deckungsbeitrag je MAU und je Plus-Abo | (Netto-Umsatz nach Apple − SMS/Agora/Cloudinary/Push zu `AppConfig.prices`) / MAU; je Abo: Preis × Takehome − variable Kosten | > 0 ab Monat 6, > 0,50 €/MAU bis Monat 12; variable Kosten < 25 % des ARPPU (Annahmen) | Bei Video-Default und 3 € ARPPU nur über Audio-Default/Video-Kontingent oder ≥ 10–15 % Conversion erreichbar; Entscheidung Ende Phase 2 |
| CAC je Kanal, LTV/CAC, Payback | MarketingSpend je Kampagne (KI + Media) / attribuierte Neunutzer (`User.acquisition`); LTV = ARPPU × (1/Churn) × Conversion (Annahme bis 3 Monate Daten) | LTV/CAC > 3; Payback < 6 Monate; Kanal aus bei CAC > 1/3 LTV | Einzige Grundlage für Budgetverteilung |
| Geschenk-Plus-Kosten | Gratis-Tage je Woche (referral/waitlist/admin); Geschenk→Store-Conversion | < 20 % des MRR; Geschenk→Store > 10 % (Annahmen) | Bis 180 Gratis-Tage je Werber fressen Marge unsichtbar |
| KI-Kosteneffizienz (neu) | KI-Euro je gepostetes (nicht gerendertes) Video; Actions-Minuten je Agent-Lauf; Anthropic/Google-Spend gegen Spend Limit | Sinkend; Spend Limit nie erreicht | Agent darf nicht teurer werden als sein Beitrag |
| SMS je Registrierung, Deckel-Auslastung | smsStarted / users.new; smsStarted gegen `AppConfig.ops.smsPerDay`; Verify-502-Quote | < 1,5 SMS je Registrierung; kein Tag über Deckel ohne Alarm | Einziger variabler Kostenkanal, den Angreifer treiben |
| Uptime, Zeit bis Alarm, MTTR | Externer Monitor auf /healthz; Minuten bis Owner-Push; Zeit bis Behebung (Rollback, OTA, Kill-Switch) | ≥ 99,5 %; Alarm < 5 min; MTTR Backend < 60 min, App < 24 h (Annahmen) | "Anruf kommt an" fällt heute nur über Tickets auf |
| Anruf-Verbindungsrate, Push-Zustellrate, VoIP→Klingeln | Angenommen / (klingelnd − abgebrochen < 5 s); 1 − push.failed/push.sent; VoIP gesendet → Socket-Register oder CallKit-Report binnen 10 s | > 90 %; > 98 %; > 95 % (Annahmen als SLO-Start) | Früheste Warngrößen für APNs, Agora, CallKit |
| Crash-free Sessions je Build | 1 − Sessions mit nativem oder fatalem JS-Fehler / Sessions (Sentry ab Phase 2 + ClientError) | ≥ 99,5 % vor breiter Bewerbung eines Builds | Release-Gate 48 h; die riskantesten Fehler sind nativ |
| Support-Erstantwortzeit, Meldungs-Rückstand | Median (firstResponseAt − createdAt); Meldungen älter 24 h (harassment 4 h) | < 24 h werktags; Rückstand 0 | Erste Support-Erfahrung entscheidet über Bewertung; DSA verlangt Tempo |
| Nutzerforschung (neu) | Gespräche geführt/Woche; dokumentierte Zahlungsbereitschaft (Median akzeptabler Monatspreis, Van Westendorp); Karte→Buchung-Quote | 5/Woche, solange Kohorten < 50 | Ersetzt Statistik bei kleinen Zahlen; Zahlungsbereitschaft der 18–25 ist ungeprüft |
| Betriebszeit Gründer, Automatisierungsgrad | Pflichtfeld beim Quittieren des Wochenreports (Alarme/Support/Freigaben); Anteil Tickets ohne Handarbeit | < 5 h/Woche ab Ende Phase 2; Tickets ohne Handarbeit > 40 % (Annahme) | Definition von "Firma, die sich selbst betreibt" |
| Bus-Faktor, Restore-Alter | Personen mit Owner-Passkey, Dienstezugang (SERVICES.md), selbst gefahrenem Release; Notfallzugang getestet (Datum); Vollmacht hinterlegt; Tage seit Restore-Test | ≥ 2 (Konsole ab Phase 1, Release ab Phase 4); Restore < 90 Tage | Alles hängt an einer Person, einem Expo-Konto, einer Atlas-DB |
| Firmenbasis (neu) | Gewerbe/Konto/Steuerberater (3/3), Credits bewilligt (€), Small-Business-Status, D-U-N-S, Versicherung, Marke angemeldet | Alle Haken grün vor erstem Media-Euro | Haken der Gate-Checkliste |
| Absolute Meilensteine (neu, alle Annahmen) | Registrierungen/Woche aus Seed-Cluster, MAU, WAU, Store-Abos | Ende P1: ≥ 30 Reg./Woche, ≈ 100 aktive Nutzer; Ende P2: ≈ 500 MAU, 200 WAU, ≥ 10 Abos; Ende P3: ≈ 2.000 MAU, 50 Abos; Ende P4: ≈ 10.000 MAU, 300 Abos, MRR ≥ Fixkosten | Ohne absolute Ziele ist "Wachstum" nicht falsifizierbar |
| Fixkosten, Cash-Plan, Runway | Σ `AppConfig.fixedCosts` (inkl. Ops-Stack, Anwalt, Steuerberater, Marke) + Marketing / Monat; Bankstand / monatliches Netto-Ergebnis | Runway > 12 Monate; Break-even-Abozahl sichtbar | Die Firma darf nicht vor dem Netzwerkeffekt sterben |

## Phase 1: Sicher, legal, nicht blind, Schleife schließen (Wochen 1–6, Oktober bis Mitte November 2026)

**Ziel:** Store-Link führt zuordenbar in den Store. Ausfall von API, Anmeldung, Anruf oder Kauf alarmiert dein Handy in < 5 min. Backup mit geübtem Restore. Jedes RevenueCat-Event dauerhaft gespeichert. Anrufe nur an gegenseitige Kontakte, Legacy-Zweige entfernt, Match-Orakel entschärft. SMS- und Geschenk-Kosten gedeckelt, Referral erst nach Aktivierung. Gewerbe, Geschäftskonto, Steuerberater-Erstgespräch, Credits, Small Business Program, D-U-N-S beantragt. Datenschutzerklärung final mit Mindestalter 16 und Anwaltstermin. Zweiter Owner mit Notfallordner. Einladungscode im Link. Aktivierung D7 als Tageszahl mit Ampel. Nutzergespräche laufen.

**Übergang zu Phase 2, wenn:** Store-Klicks/Tag > 0; externer Uptime-Check aktiv; Restore-Datum im RUNBOOK; SubscriptionEvent speichert Preise; `/api/push-health` meldet authRequired=true und die Legacy-Zweige sind aus dem Code entfernt; startCall lehnt Nicht-Kontakte ab; Gewerbe angemeldet, Steuerberater-Antworten in FINANCE.md; ≥ 2 Owner mit Passkey und Notfallzugang; Datenschutzerklärung nicht mehr "Entwurf"; Seed-Cluster liefert ≥ 30 Registrierungen/Woche (Annahme als Zielgröße, sonst Seed-Strategie ändern); ≥ 10 dokumentierte Nutzergespräche.

**Schnittlinie:** /healthz + Backup (1.2, 1.9), Anrufe nur an gegenseitige Kontakte und Legacy-Zweige entfernt (1.5a), SubscriptionEvent (1.3). Direkt danach Store-Link (1.1) und Kosten-Bremsen (1.4).

**Stundenbudget:** ≈ 90–120 h Code (6 Wochen × 15–20 h) plus ≈ 20 h Prozess ohne Code (Ämter, Konten, Anträge). S ≈ 5 h, M ≈ 15 h. Die 13 Punkte summieren sich auf ≈ 115 h Code; genau deshalb gibt es die Schnittlinie: Was nach der Schnittlinie nicht mehr passt, rutscht an den Anfang von Phase 2.

### 1.1 Store-Link und Kampagnen-Weiche scharf schalten, Build bricht ohne Link ab

**Art:** beides (Code + Netlify-Einstellung)
**Was genau:** Auslöser: sofort, dann jeder Netlify-Build. Ablauf: `STORE_URL` (apps.apple.com/app/id6746295124) und `PROVIDER_TOKEN` (App Store Connect → Kampagnen) als Netlify-Env eintragen, `LANDING_MODE=live`. `marketing/build.js` (Z. 19–31) injiziert heute schon `SITE_URL`, `DOWNLOAD_URL`, `LANDING_MODE`, `PUBLIC_API_URL`, `PREORDER` in die Landing; dort liest du zusätzlich `STORE_URL` und `PROVIDER_TOKEN` ein und schreibst sie in `public/download.html` (Z. 31–33), kein eigener sed-Schritt. Abbruch, wenn `LANDING_MODE=live` und `STORE_URL` leer. Landing zählt den Store-Klick: `marketing/src/landing.js` sendet step 'store', `lib/waitlist.js` STEPS (Z. 251) um store:'storeClicks', `LandingVisit.storeClicks`, Funnel-Karte in admin-ui. Nebenbei (10 min): Der Kommentar in `build-web.sh` behauptet einen Export nur der Web-Seiten; tatsächlich baut `expo export --platform web` alle 27 Screens aus `app/` statisch mit (friend, calls, stats, room, plus, videocall, …). Kommentar korrigieren; die Begrenzung der Web-Routen selbst ist ein eigener Schritt in 2.16, weil expo-router keinen Ausschluss je Plattform kennt. Funnel als eine Kette definieren: Besuch → Store-Klick → Download (ASC, Phase 3) → Registrierung, gleicher Nenner. Ergebnis: /k/:campaign, Flyer-QR, Launch-Mail (download?ct=waitlist) und /einladung landen im Store mit ct/pt.
**Wo:** `CMM/public/download.html`, `CMM/marketing/build.js`, `CMM/scripts/build-web.sh`, `CMM/netlify.toml`, `CMM/marketing/src/landing.js`; `CMM-backend-new/lib/waitlist.js`, `models/LandingVisit.js`, `admin-ui/app.js`
**Aufwand:** S
**Wirkung:** kritisch
**Kennzahl:** Anteil /download-Aufrufe mit Store-Redirect = 100 %; `LandingVisit.storeClicks`/Tag > 0; Besuch→Store-Klick-Quote je Quelle
**Hängt ab von:** nichts

### 1.2 /healthz, externer Uptime-Check, Prozess-Absturz-Handler

**Art:** Automatisierung
**Was genau:** Auslöser: Monitor alle 60 s. Ablauf: `GET /healthz` in `app.js`: mongoose.connection.readyState === 1 und Alter des letzten Leader-Ticks (lastTickAt im Lock-Doc, von `lib/leader.js` geschrieben), 200/503 ohne DB-Schreiben; als Render Health Check Path eintragen. Externer Monitor (Better Stack oder UptimeRobot, Free-Tier) auf /healthz, `/api/push-health` (existiert, `app.js` Z. 66, wird laut RELEASE.md bisher manuell geprüft; Bedingung voipConfigured=true, authRequired=true), wannayap.app und /.well-known/apple-app-site-association. Eskalation: Telefonanruf ist im Free-Tier nicht enthalten, deshalb zunächst nur der Monitor-Push; die SMS-Ausgabe über das vorhandene Twilio-Konto baut 1.10 als dritten Ausgabekanal von alert(). Ein bezahlter Tarif (≈ 20–30 $/Monat) kommt nur mit Eintrag in `AppConfig.fixedCosts`. `index.js`: process.on('unhandledRejection'/'uncaughtException') mit Log und kontrolliertem Exit, Render startet neu. Ergebnis: Ein nächtlicher Ausfall wird bemerkt, bevor Nutzer ihn melden.
**Wo:** `CMM-backend-new/app.js`, `index.js`, `lib/leader.js`, `models/Lock.js`; Render-Service-Einstellung; Uptime-Anbieter
**Aufwand:** S
**Wirkung:** kritisch
**Kennzahl:** Extern gemessene API-Verfügbarkeit 30 Tage ≥ 99,5 % (Annahme); Zeit bis Alarm < 5 min
**Hängt ab von:** nichts

### 1.3 RevenueCat-Events speichern: idempotent, Sandbox getrennt, TRANSFER, Status, Sync-Fallback

**Art:** Automatisierung
**Was genau:** Auslöser: jeder Webhook-Aufruf und jeder Kauf/Restore in der App. Ablauf: Neues Modell `SubscriptionEvent` {rcEventId unique, userId, type, productId, store, environment, periodType, priceCents, currency, takehomePercent, cancelReason, presentedOfferingId, expirationAt, eventAt, source 'revenuecat'|'apple'}; source, damit die Apple Server Notifications V2 aus Phase 2 ins selbe Modell schreiben. In `routes/plus.js` applyEvent (Z. 34–55) zuerst insertOne (Duplikat → 'duplicate', 200). event.environment === 'SANDBOX' → plus.source 'sandbox', in /admin/plus getrennt. TRANSFER (heute 'transfer_ignored', Z. 48–49): Plus von transferred_from auf transferred_to umhängen; fehlt expiration, RevenueCat REST GET /subscribers/{id} mit neuem Secret `REVENUECAT_API_KEY`. `User.plus.status` enum active|trial|cancelled|billing_issue|paused|expired. unknown_user und Exceptions → console.error, ab 1.10 alert('rc_unknown_user'). App: nach buy()/restore() POST /me/plus/sync, Backend verifiziert per REST. Tests: Duplikat, Sandbox, TRANSFER in `test/plus.test.js`. Ergebnis: Kein zahlender Kunde ohne Plus, Basis für MRR und Churn.
**Wo:** `CMM-backend-new/models/SubscriptionEvent.js` (neu), `routes/plus.js`, `models/User.js` (plus Z. 94–101), `test/plus.test.js`; `CMM/services/purchases.ts`
**Aufwand:** M (≈ 15 h)
**Wirkung:** kritisch
**Kennzahl:** Webhook-Duplikate und unknown_user pro Woche (Ziel 0 unbeantwortet); Sandbox-Anteil an "Plus aktiv" getrennt ausgewiesen; Support-Tickets "Plus fehlt" = 0
**Hängt ab von:** nichts für Modell und applyEvent; `lib/alerts.js` (1.10) nur für die Alarmzeile

### 1.4 Kosten-Bremsen: SMS-Deckel mit WhatsApp-Fallback, Referral erst nach Aktivierung, KI-Spend-Limits

**Art:** beides
**Was genau:** SMS: Auslöser jeder /verify/start. Heute ist /verify/start nur per IP (20/h, `routes/verify.js` Z. 57–64) und je Zielnummer (5 Codes/15 min, Z. 47–56, 67) begrenzt, /verify/check mit 10/15 min je Nummer; es fehlen der globale Tagesdeckel, die Länder-Allowlist und ein Zähler in MetricsDaily. Neu: `routes/verify.js` (Z. 82–84 channel fest 'sms') bekommt einen eigenen Konfigblock `AppConfig.ops` {smsPerDay, smsPaused, smsChannel 'sms'|'whatsapp', smsRegions ['DE','AT','CH']} mit eigener Validierung in `lib/appConfig.js` saveConfig und eigener Karte in admin-ui. Nicht unter `AppConfig.limits`: saveConfig (Z. 53–74) lehnt dort jeden Schlüssel ab, der nicht in DEFAULT_LIMITS[plan] steht ('invalid_limits'), und `flags` sind laut Z. 77 nur Booleans; dasselbe Muster eigener Teilbäume gilt für die später genannten `AppConfig.goals`, `prices`, `fixedCosts`, `aiModels`, `marketingNotes` und `launchChecklist`. Allowlist über regionOf aus `lib/phone.js` gegen smsRegions; globaler Tageszähler als Tally-Doc 'sms:<tag>' (Muster `lib/marketingBudget.js`) mit Limit smsPerDay (Start 3× Registrierungen/Tag, Annahme), Alarm bei 80 %, 429 plus Banner bei 100 %, Notschalter smsPaused. channel aus smsChannel, Button "Code per WhatsApp" in der App und automatischer Wechsel bei Verify-502-Quote > 20 % in 10 min. Zähler smsStarted/smsChecked/smsFailed in `MetricsDaily.ops`. Prozess: Twilio Verify Fraud Guard und Auto-Recharge-Grenze im Konto (einmalig, Annahme: noch nicht aktiv). Referral: `lib/referral.js` grantRewards zählt einen Geworbenen erst nach dessen firstTalkAt (Aufruf aus `lib/calls.js` recordTalk für die Inviter); `lib/invites.js` Z. 29 $inc invitesJoined bleibt als "beigetreten"; ReferralCard zeigt beides getrennt. KI: Anthropic Console Spend Limit ≈ 2× Monatsbudget, Google Cloud Budget Alert auf dem Veo-Projekt; `marketing/agent/common.js` (Z. 6–7 MODEL, VIDEO_MODEL; Z. 15–19 hartkodierte PRICES) liest Modell-IDs und Preise aus /marketing/context (`AppConfig.aiModels`), meldet 'model not found/deprecated' als Alarm; MarketingTally zählt Actions-Minuten je Lauf und "KI-Euro je gepostetes Video". Phase 3: `lib/verifyProvider.js` als Adapter für einen Zweitanbieter hinter Env-Schalter, quartalsweise ein Testcode. Ergebnis: Kein Kostenkanal ohne Deckel und Alarm.
**Wo:** `CMM-backend-new/routes/verify.js`, `lib/phone.js`, `lib/appConfig.js`, `models/AppConfig.js`, `lib/metrics.js`, `models/MetricsDaily.js`, `lib/referral.js` (Z. 11–13), `lib/invites.js`, `lib/calls.js`, `lib/marketing.js`, `models/MarketingTally.js`, `admin-ui/app.js`; `CMM/features/auth`, `features/plus/ReferralCard.tsx`, `marketing/agent/common.js`; Twilio-, Anthropic-, Google-Cloud-Konsole
**Aufwand:** S (≈ 8 h) + 1 h Konsolen
**Wirkung:** hoch
**Kennzahl:** SMS je erfolgreicher Registrierung < 1,5 (Annahme); kein Tag über Deckel ohne Alarm; WhatsApp-Anteil; Geworbene ohne Talk < 10 %; KI-Euro je gepostetes Video
**Hängt ab von:** Meilensteine firstTalkAt (1.12, gleiche Woche, Minimalversion reicht)

### 1.5 Anrufe nur an gegenseitige Kontakte, Legacy-Auth abschalten, /contacts/match entschärfen

**Art:** Automatisierung
**Was genau:** Zwei Teile, weil der zweite einen Store-Build voraussetzt.

1.5a Backend (sofort, M ≈ 15 h). Auslöser: jeder callRequest, jeder Request ohne Token, jeder /contacts/match. Ablauf: `lib/calls.js` startCall (Z. 80–86) prüft heute nur isBlocked(from, to). Neu: Anruf nur bei Gegenseitigkeit, sonst reason 'not_connected'. Gegenseitigkeit = Adressbuch-Treffer ODER Einladungs-Verbindung ODER gemeinsamer Kreis (Circle.members). Abhängigkeit, die vorher gelöst sein muss: `routes/contacts.js` Z. 44 ersetzt bei jedem /contacts/match die komplette Liste (`{ contacts: others.map(...) }`), während `lib/invites.js` Z. 25 und 29 Einlader und Eingeladenen per $addToSet verbinden; hat der Eingeladene die Nummer des Einladers nicht im Adressbuch, fliegt die Verbindung beim nächsten Sync wieder raus, und genau die Paare aus dem Einladungs-Loop könnten sich nicht mehr anrufen. Deshalb darf /contacts/match `User.contacts` nicht mehr ersetzen, sondern nur Adressbuch-Treffer pflegen (entfernt werden nur frühere Adressbuch-Treffer); Einladungs-Verbindungen aus connectInviters landen in einem eigenen Feld `User.connections` oder bleiben per $addToSet erhalten. Flag `AppConfig.flags.callsStrictContacts` für den Rollout, Zähler calls.rejectedNotConnected in MetricsDaily. Tests in `test/calls.test.js` (neu; die Anruf-Tests liegen heute in `test/api.test.js` Z. 228–233, 327, 478, 580 und ziehen dorthin um), darunter: Eingeladener ohne gespeicherte Nummer kann den Einlader nach einem Sync weiter anrufen. Später optional "Kontaktanfrage" als Push-Typ. Legacy-Auth: Die Zweige, die tokenlosen Clients Payload-Nummern glauben, existieren noch (`lib/auth.js` Z. 9, 64, 106; `socket.js` Z. 13; `app.js` /rtcToken Z. 217; `routes/contacts.js` phones-Variante Z. 14, 32). `docs/RELEASE.md` verlangt `AUTH_REQUIRED=true` auf Render. Schritt 1: per `/api/push-health` prüfen, ob authRequired=true ist; falls nein, sofort setzen. Schritt 2: Legacy-Zweige löschen und Tests anpassen, sobald minBuild ≥ erster Token-Build. /contacts/match: lastOnline (Z. 56) nur für gegenseitige Kontakte, eigener Limiter 10/Tag je Nutzer (heute greift nur der globale 300/min/IP-Limiter aus `app.js` Z. 54–60, MAX_CONTACTS 5000), Alarm bei > 2.000 Hashes ohne Treffer.

1.5b Match-Antwort ohne phone-Klartext (S, später). Antwort ohne phone (Z. 53), der Client ordnet über den Hash zu (`CMM/features/contacts`). Sobald das Backend phone weglässt, bricht jeder installierte Build, bis minBuild ihn zwingt; deshalb erst, wenn der Client-Build mit Hash-Auflösung als minBuild gesetzt ist (Release-Regeln 2.16).

Der Phone-Hash (`models/User.js` Z. 149–150, reines SHA-256) bleibt der Match-Schlüssel; Phase 2 ergänzt ein HMAC-Feld für Analytik (2.8). Ergebnis: Fremde erreichen niemanden, Nummern lassen sich nicht abfragen.
**Wo:** `CMM-backend-new/lib/calls.js`, `lib/relations.js`, `lib/invites.js`, `socket.js`, `app.js`, `routes/contacts.js`, `lib/auth.js`, `lib/appConfig.js`, `lib/metrics.js`, `models/User.js`, `test/calls.test.js` (neu), `test/api.test.js`, `README.md` (Rollout-Absatz Z. 31–33); `CMM/features/contacts` (phone aus Hash auflösen, 1.5b)
**Aufwand:** M bis L gesamt (1.5a M ≈ 15 h; 1.5b S)
**Wirkung:** kritisch
**Kennzahl:** calls.rejectedNotConnected/Tag; harassment-Meldungen je 1.000 Anrufe; Match-Requests > 2.000 Hashes/Tag = 0 ohne Alarm; tokenlose Requests = 0; Einladungs-Paare, die sich nach Sync nicht anrufen können = 0 (Test)
**Hängt ab von:** 1.5a: minBuild in AppConfig gesetzt; 1.5b: App-Release mit Hash-Auflösung als minBuild (2.16)

### 1.6 Rechts-Sofortpaket: Datenschutz final, Mindestalter 16, Impressum, Anwaltspaket, Markenrecherche, Datenschutz-Änderungsprozess

**Art:** beides
**Was genau:** Woche 1–2: `content/legal.ts` PRIVACY_SECTIONS um Abo/RevenueCat/Apple, Mailanbieter namentlich, Adressbuch-Hash-Verfahren ergänzen; Status "Entwurf" in `docs/RELEASE.md` Z. 12 streichen. OnboardingView (Z. 48) bekommt "Mit Los geht's akzeptierst du Datenschutz und Nutzungsbedingungen" plus Haken "Ich bin mindestens 16" (Art. 8 DSGVO); `routes/verify.js` speichert ageConfirmedAt/termsVersion. Impressum-Vollständigkeit prüfen (OPERATOR Z. 8). Anwalt: Fachanwalt IT-Recht, Festpreis-Paket AGB + Datenschutzerklärung + DSFA-Light + DSA-Kontaktpunkt (Annahme 1.500–3.000 €), Termin Ende Phase 1, Kosten im Cash-Plan; DSFA-Light vorher nach LfDI-Vorlage selbst ausfüllen (Adressbuch, Kommunikationsdaten, Fotos, Minderjährige, Verhaltensanalyse). Marke: 1 h TMview/DPMA-Recherche Klassen 9/38/42 in Woche 2; Kriterium: bei identischer oder ähnlicher Marke in Klasse 9/38 Namensalternative vor der ersten Campus-Kampagne; Unterscheidungskraft von "Wanna yap" ist unsicher, deshalb zuerst nur DPMA (≈ 290 €), EUIPO später. Prozess: `docs/PRIVACY-CHANGE.md` als Checkliste im PR-Template (neue Datenart? → Verarbeitungsverzeichnis, legal.ts-Abschnitt, App-Privacy-Label, AVV, TTL, Löschpfad `lib/account.js`, Test); CI-Test: jede Datei in models/ hat eine Zeile in `docs/COMPLIANCE.md`. Dieser Prozess ersetzt alle einzelnen "Datenschutz ergänzen"-Sätze in anderen Punkten. Ergebnis: Rechtsgrundlage für das, was heute schon läuft, und ein Prozess für alles Neue.
**Wo:** `CMM/content/legal.ts`, `features/auth/OnboardingView.tsx`, `docs/RELEASE.md`, `docs/PRIVACY-CHANGE.md` (neu), `docs/COMPLIANCE.md` (neu, Tabelle), `.github/PULL_REQUEST_TEMPLATE.md` (neu); `CMM-backend-new/routes/verify.js`, `models/User.js`, `test/compliance.test.js` (neu)
**Aufwand:** S (≈ 6 h Code) + ≈ 6 h Prozess + Anwalt extern
**Wirkung:** kritisch
**Kennzahl:** Datenschutzerklärung nicht "Entwurf" (ja/nein); Anteil Neunutzer mit ageConfirmedAt = 100 %; Anwaltstermin terminiert; Markenrecherche-Ergebnis dokumentiert; PRs ohne Datenschutz-Haken = 0
**Hängt ab von:** nichts

### 1.7 Firma anmelden und Konten absichern: Gewerbe, Geschäftskonto, Steuerberater, Credits, Small Business Program, D-U-N-S, Branch-Schutz

**Art:** Prozess
**Was genau:** Alles ohne Code, je 30–60 min, in Woche 1–3. Gewerbe anmelden. Geschäftskonto mit Buchhaltungs-Anbindung (Kontist/Qonto/Finom + lexoffice/sevDesk, Annahme). Steuerberater-Erstgespräch mit genau drei Fragen: Kleinunternehmerregelung § 19 UStG ja/nein; Reverse-Charge für Apple Distribution International, Anthropic, Google, Twilio, Render inkl. USt-Voranmeldung und Zusammenfassende Meldung; EÜR und Vorauszahlungen. Honorarrahmen ≈ 80–150 €/Monat (Annahme), Antworten in `docs/FINANCE.md`. Rechnungs-Mails aller Dienste auf eine Belege-Adresse mit Auto-Import. Apple Small Business Program beantragen (15 % statt 30 %). D-U-N-S-Nummer beantragen (kostenlos, 1–2 Wochen) als Vorbereitung für ein Organisationskonto. Startup-Credits beantragen: MongoDB for Startups, Twilio Startups, Google for Startups Cloud (Veo), Cloudflare; Tabelle `docs/FUNDING.md` (Programm, Voraussetzung, Frist, Summe, Status) inkl. EXIST/Gründungszuschuss/Landesstipendien/INVEST mit Fristen; Guthaben später als negative Posten in `AppConfig.fixedCosts`. GitHub: Branch Protection main in beiden Repos (Required Check 'check'/'test'), Render "Auto-Deploy after CI", Node pinnen (engines exakt + .nvmrc; heute nur >=20), Secret Scanning + Push Protection an. Monatsritual 30 min Belege ab Monat 1 in den Betriebsrhythmus. Ergebnis: Die Firma existiert formal, bevor der Umsatz es erzwingt.
**Wo:** Gewerbeamt, Bank, Steuerberater, App Store Connect, D&B, Anbieter-Programme; `CMM/docs/FINANCE.md` (neu), `docs/FUNDING.md` (neu); GitHub-/Render-Settings; `CMM-backend-new/package.json`, `.nvmrc` (neu)
**Aufwand:** S (≈ 8 h Prozess, < 1 h Code)
**Wirkung:** hoch
**Kennzahl:** Gewerbe/Konto/Steuerberater erledigt (3/3); Credits beantragt und bewilligt (Summe €); Small-Business-Status bestätigt; D-U-N-S vergeben; Direkt-Pushes auf main = 0
**Hängt ab von:** nichts

### 1.8 Zweiter Owner, Notfallordner und Doku-Gerüst (RUNBOOK, SERVICES, EMERGENCY, Index, CLAUDE.md)

**Art:** beides
**Was genau:** Code: `routes/admin.js` GET/POST/DELETE /admin/admins (Owner-only; heute 53 Routen in `routes/admin.js` plus 12 /admin/marketing-Routen in `routes/marketing.js`, keine davon zur Admin-Verwaltung; Admin.create nur im 409-gesperrten Setup Z. 84–91): Einladung per Mail mit einmaligem Setup-Link, Rolle aus `models/Admin.js` (owner/support/viewer), Deaktivieren, auditiert; Tab "Team" in admin-ui; `scripts/reset-admin-totp.js`. Prozess mit Namen und Datum: Vertrauensperson wird zweiter Owner in der Konsole. Expo: Organization anlegen, Projekt von schly21 übertragen (EAS-Projekt-ID bleibt), Person als Admin (ein Personal-Konto kann keine Mitglieder aufnehmen). Apple: eigene Apple-ID als Admin in App Store Connect. Render/Atlas: Team-Mitglied (Kosten prüfen). Passwort-Manager mit Notfallzugang (Bitwarden Emergency Access oder 1Password Family) für alle Dienste; schriftliche Vollmacht (Konto, Apple Developer, Domain). Docs einmal anlegen, danach nur Einträge. Alle Betriebs-Docs liegen im CMM-Repo unter `CMM/docs/`; das Backend-Repo hat keinen docs/-Ordner und bekommt auch keinen (ein Ort je Thema): `docs/SERVICES.md` (Zweck, Kontoinhaber, Vault-Eintrag, Kosten/Monat, Ablaufdatum, Kündigungsfrist, Zugang gewähren/entziehen); `docs/RUNBOOK.md` mit fester Struktur "Alarm-Tag → Gegenmaßnahme" plus Render-Rollback, Kill-Switch, Phased Release pausieren, Twilio gesperrt, Datenpanne 72 h, Deploy-Fenster nie ±15 min um DailyMoment.at, "genau 1 Instanz"; `docs/EMERGENCY.md` ("Betrieb 30 Tage weiterführen oder geordnet einstellen": Abos in ASC beenden, Banner, Datenexport, Löschung nach 30 Tagen); `docs/README.md` als Index mit Owner und "zuletzt geprüft"; `CLAUDE.md` in beiden Repos (Konventionen: Tests, Migrationen nur über Runner, keine Secrets, Deploy-Fenster, Glossar Call/Talk, Moment/Yap Moment, Plus-Quellen). Dead-Man-Regel: Tages-Push 7 Tage nicht quittiert (Quittungs-Link in der Konsole) → Mail an Vertrauensperson (`lib/adminPush.js`). Ergebnis: Fällst du aus, kann jemand den Betrieb 30 Tage weiterführen oder geordnet einstellen.
**Wo:** `CMM-backend-new/routes/admin.js`, `models/Admin.js`, `admin-ui/app.js`, `scripts/reset-admin-totp.js` (neu), `lib/adminPush.js`, `CLAUDE.md` (neu); `CMM/docs/SERVICES.md`, `docs/RUNBOOK.md`, `docs/EMERGENCY.md`, `docs/README.md`, `CLAUDE.md` (alle neu); Expo-/Apple-/Render-/Atlas-Settings, Passwort-Manager
**Aufwand:** M (≈ 12 h, davon 6 h Prozess)
**Wirkung:** hoch
**Kennzahl:** Owner mit funktionierendem Passkey ≥ 2; Dienste ohne dokumentierten Zweitzugang = 0; Notfallzugang getestet (Datum); Docs ohne "zuletzt geprüft" < 90 Tage = 0
**Hängt ab von:** Name der Vertrauensperson (Woche 1)

### 1.9 Backup mit Point-in-Time, anbieterunabhängiger Dump, Restore einmal wirklich üben

**Art:** beides
**Was genau:** Auslöser: einmalig, dann wöchentlich per Action, Restore quartalsweise. Ablauf: Kein Atlas M10 (≈ 60 $/Monat) in Phase 1; erst MongoDB-for-Startups-Credits beantragen (1.7), bis dahin tägliche Snapshots des aktuellen Tiers. GitHub Action `db-backup.yml` wöchentlich: mongodump → age-verschlüsselt → Backblaze B2 oder Cloudflare R2 (Free-Tier), AVV mit dem Anbieter in COMPLIANCE.md. Einmalige Restore-Übung in einen temporären Cluster, `npm test` gegen die Restore-URI, Datum als Eintrag im RUNBOOK-Gerüst aus 1.8. Alarm "letzter Dump > 8 Tage" ist Regel der Alarmliste (1.10). Point-in-Time erst in Phase 3 mit Staging oder über Credits. Ergebnis: Ein Datenverlust kostet höchstens eine Woche, nicht die Firma.
**Wo:** Atlas-Konsole; `CMM-backend-new/.github/workflows/db-backup.yml` (neu), `lib/alerts.js`; `CMM/docs/RUNBOOK.md`, `docs/COMPLIANCE.md`
**Aufwand:** S
**Wirkung:** kritisch
**Kennzahl:** Tage seit letztem erfolgreichen Restore-Test ≤ 90; Alter des letzten Dumps < 8 Tage
**Hängt ab von:** RUNBOOK-Gerüst (1.8)

### 1.10 lib/alerts.js: 11 Regeln über den vorhandenen alerts-Kanal, Entprellung, Mail-Kopie

**Art:** Automatisierung
**Was genau:** Auslöser: Leader-Job alle 30 min nach runSnapshots (nicht alle 5 min, DB-Kosten). Ablauf: Neue Datei `lib/alerts.js` mit alert(tag, text): max. 1×/h je Tag (State-Doc), Ausgabe über adminPush.tell('alerts') + `lib/mailer.js` + SMS über das vorhandene Twilio-Konto (dritter Kanal, ≈ 5 Zeilen, Zielnummer in `AppConfig.ops`; ersetzt den fehlenden Telefonanruf des Free-Tier-Monitors aus 1.2). Regeln Phase 1: (1) Verify-502-Quote > 20 %/10 min, (2) push.failed/(sent+failed) > 10 %/60 min aus PushDecision, (3) BadDeviceToken/InvalidProviderToken-Häufung in `lib/push.js`/`lib/receipts.js`, (4) Minuten-Tick > 3 min verspätet, (5) DailyMoment Europe/Berlin nach 21:30 ohne sentAt, (6) neuer fataler ClientError-Key oder count > 3× Vortag, (7) RevenueCat unknown_user/401, (8) kein AdDraft seit 36 h (GitHub pausiert Cron nach 60 Tagen), (9) Support-Ticket > 24 h ohne Antwort, (10) Instagram/TikTok-Token < 7 Tage (MarketingChannel.expiresAt), (11) Mongo readyState != 1 oder talks.count == 0 in 24 h bei dau > 20; dazu "Dump > 8 Tage", "SMS-Deckel 80 %", "Review-Login aktiv (REVIEW_UNTIL)". Eine Alarmliste mit Phasenkennzeichnung in `docs/RUNBOOK.md` Abschnitt "Alarme": Phase 2 ergänzt Kauf-Fehler > 3/Tag, Geschenk-Tage über Wochenschwelle, neuer nativer Crash-Typ, Modell deprecated, userFacing-Banner; Phase 3 Bewertung ≤ 3, moderation-sla, Reconciliation > 5 %, VoIP ohne Register binnen 10 s. Jede Regel bekommt beim Anlegen ihren RUNBOOK-Anker (CI-Test 'runbook-links' aus 2.15 prüft das). Test `test/alerts.test.js` inkl. "läuft nach Leader-Wechsel nicht doppelt". Ergebnis: Jede Störung erreicht dich zuerst per Alarm, nicht per Ticket.
**Wo:** `CMM-backend-new/lib/alerts.js` (neu), `index.js`, `routes/verify.js` (Zähler), `lib/push.js`, `lib/receipts.js`, `routes/diagnostics.js`, `routes/plus.js`, `lib/socialPosting.js`, `test/alerts.test.js` (neu); `CMM/docs/RUNBOOK.md`
**Aufwand:** M
**Wirkung:** kritisch
**Kennzahl:** Alarme/Woche (Ziel < 5 nach Einschwingen); Anteil Störungen, die zuerst per Alarm statt Ticket bekannt wurden = 100 %
**Hängt ab von:** /healthz und lastTickAt im Lock-Doc (1.2)

### 1.11 Persönlicher Einladungscode im Link und Beitritts-Attribution ohne Adressbuch

**Art:** Automatisierung
**Was genau:** Auslöser: Einladung teilen, /einladung öffnen, Registrierung. Ablauf: `User.inviteCode` (8 Zeichen, Alphabet wie `lib/circles.js` newCode) beim Anlegen in `routes/verify.js` /check; inviteText() in `content/links.ts` nutzt `${INVITE_URL}?von=CODE`. /einladung (Web-Export von `app/einladung.tsx`) ruft POST /invites/visit {code, platform aus userAgent} (Modell InviteVisit mit inviterCode + platform, Tageszähler wie LandingVisit) und hängt ct=invite-CODE an /download. Universal Link öffnet die App, App merkt den Code in AsyncStorage und sendet ihn mit /verify/check → POST /invites/claim setzt joinedViaInvite, verbindet Kontakte (`lib/invites.js` connectInviters), zählt invitesJoined. Android-Besucher von /einladung bekommen das Wartelisten-Formular mit platform='android' statt des Download-Buttons (`app/einladung.tsx` Z. 45 öffnet heute für alle DOWNLOAD_URL). Dafür neues Feld `WaitlistEntry.platform` ('ios'|'android'|null, aus userAgent beim POST /waitlist) in `models/WaitlistEntry.js` und `lib/waitlist.js` signUp(); heute hat das Modell nur email, status, code, token, referredBy, source, campaign, consent, Zeitstempel und claimedBy. Zähler waitlist.byPlatform in computeDay. Je Einlader wird der Android-Anteil seiner eingeladenen Kontakte berechnet (Grundlage der Android-Entscheidung 3.11). `User.locale` und device.region aus Accept-Language in `routes/verify.js` bzw. `routes/me.js` speichern, users.byLocale in computeDay (nur Messung, 0 Übersetzung); ADR "i18n-Strategie": neue Strings ab jetzt über `content/strings.ts`, keine Übersetzung in 12 Monaten. Ergebnis: Einladungen über WhatsApp-Gruppen, Stories, Campus zählen nicht mehr als "direkt"; Android-Bedarf wird gemessen.
**Wo:** `CMM-backend-new/models/User.js`, `routes/verify.js`, `routes/me.js`, `routes/social.js` (neue Routen), `models/InviteVisit.js` (neu), `models/WaitlistEntry.js`, `routes/waitlist.js`, `lib/invites.js`, `lib/waitlist.js`, `lib/metrics.js`; `CMM/content/links.ts` (Z. 7–11), `app/einladung.tsx`, `app/(tabs)/contacts.tsx` (Z. 39–41), `app/(tabs)/settings.tsx` (Z. 124), `docs/adr/0001-i18n.md` (neu)
**Aufwand:** M
**Wirkung:** kritisch
**Kennzahl:** Einladungs-Funnel je Woche: geteilt → /einladung geöffnet → beigetreten (Klick→Beitritt > 25 %, Annahme); Anteil Android-Geräte auf /einladung je Einlader
**Hängt ab von:** Store-Link gesetzt (1.1)

### 1.12 Onboarding-Meilensteine, Aktivierungsfunnel, Dichte und Nordstern als Tageszahl mit Ampel

**Art:** Automatisierung
**Was genau:** Auslöser: Verifizierung, Kontakt-Match, Push-Token, erster Anruf, erster Talk; Snapshot alle 30 min; Tages-Push morgens. Heute sendet `lib/adminPush.js` dailyDue (Z. 158–162) zur je Admin eingestellten Stunde `Admin.notify.dailyHour` (Default 20), und daySummary (Z. 176) zeigt über `lib/today.js` todayNumbers die Zahlen des laufenden Tages; um 08:00 stünden dort fast nur Nullen. Festlegung: Der Push wird ein Morgen-Push. dailyHour auf 8 stellen (Stellschraube bleibt je Admin), daySummary umbauen: gestern (series[-2]) als Tageszahlen, dazu rollierende Aktivierung 4 W, Dichte, Alarme der Nacht und überfällige Tickets. Ablauf (verschlankt auf ≈ 10 h): `User.milestones` {verifiedAt, contactsSyncedAt, firstRegisteredContactAt, pushGrantedAt, firstInviteAt (existiert), firstCallAt, firstTalkAt} mit $setOnInsert-Semantik in `routes/verify.js`, `routes/contacts.js` (Match mit ≥ 1 Treffer), Push-Token-Route in `app.js`, `lib/calls.js` (startCall, recordTalk). `lib/metrics.js`: activation4w rollierend und Dichte-Anteil ≥ 3 Kontakte. Ampel gegen `AppConfig.goals.activationPct` im Tages-Push (`lib/adminPush.js` daySummary Z. 176–187): "Aktivierung 4 W: xx % (Ziel 40)" und Dichte; `lib/marketing.js` context() gibt dem Agenten die Zahl mit; BudgetCard in admin-ui rot unter Ziel. Ersatzregel für kleine Zahlen: "rollierend 4 Kohorten zusammen ≥ 100" zählt wie Kohorte ≥ 50. Nach Phase 2 verschoben (Teil von 2.4): Funnel-Stufen je Wochenkohorte, Dichte-Histogramm (c0/c1_2/c3_5/c6plus), MetricsDaily.version mit Neuberechnung, `test/metrics.test.js` mit DST-Fällen. firstTalkAt nutzt 1.4 (Referral) sofort. Ergebnis: Du siehst jeden Morgen, ob der Nordstern grün ist.
**Wo:** `CMM-backend-new/models/User.js`, `routes/verify.js`, `routes/contacts.js`, `app.js` (/user/push-token), `lib/calls.js`, `lib/metrics.js`, `models/MetricsDaily.js`, `lib/today.js`, `lib/adminPush.js` (dailyDue Z. 158–162, daySummary Z. 176), `models/Admin.js` (notify.dailyHour), `lib/appConfig.js`, `lib/marketing.js`, `admin-ui/app.js`
**Aufwand:** S–M (≈ 10 h)
**Wirkung:** kritisch
**Kennzahl:** Aktivierung D7 rollierend vs. 40 %; Anteil neuer Nutzer mit ≥ 3 registrierten Kontakten nach 7 Tagen; Median Time-to-first-talk
**Hängt ab von:** nichts

### 1.13 Nutzerforschung als Prozess: Rekrutierungskarte, Leitfaden, Zahlungsbereitschaft

**Art:** beides
**Was genau:** Auslöser: 2. Talk eines Nutzers, gesetzt in `lib/calls.js` recordTalk: wenn die Talk-Anzahl des Nutzers nach diesem Talk == 2 und `User.research.invitedAt` leer ist → invitedAt setzen; die App zeigt die Karte bei gesetztem invitedAt ohne bookedAt (`lib/badges.js` kennt nur first_talk [1] und talks [10, 50, 150], beim zweiten Talk feuert keine Badge). Ablauf: In-App-Karte "15 Minuten mit dem Gründer sprechen? 7 Tage Plus als Dank" → Kalenderlink (cal.com Free, Annahme) mit vorbelegtem Nutzer-Hash; `User.research` {invitedAt, bookedAt, doneAt}; Plus-Dank über den bestehenden Admin-Grant (POST /admin/users/:id/plus). `docs/RESEARCH.md`: Leitfaden (Wann zuletzt spontan angerufen? Wer fehlt in der App? Wie viele deiner engsten 5 haben Android? Was würdest du zahlen? Van-Westendorp-Fragen monatlich/jährlich; Sean-Ellis-Frage), eine Zeile Zusammenfassung je Gespräch, Tags. Fake-Door: Interesse-Modus in PlusView zählt Jahrespreis- und Kreis-Plus-Klicks (plusInterest.features). Freitag-Triage sichtet Research-Notizen wie Tickets; der Wochenreport (2.11) zeigt "Gespräche geführt/Woche". Ziel 5/Woche, solange Kohorten < 50. Seed-Cluster-Plan (Woche 1, 0 Code): Abschnitt "Seed-Cluster" in `marketing/PLAYBOOK.md` mit einer Hochschule, 10 benannten Freundeskreisen/WhatsApp-Gruppen, Verantwortlichen und Terminen; absolute Zielgröße "Cluster liefert 30 Registrierungen/Woche bis Ende Phase 1" (Annahme), sonst Seed-Strategie ändern. Gezählt wird über den /k/seed-<name>-Link (`LandingVisit.campaign`) und `WaitlistEntry.campaign`, bis 2.10 `User.acquisition` liefert. Ergebnis: Du weißt, was Nutzer zahlen würden, bevor Statistik es dir sagen kann, und der erste Cluster hat Namen und Zahl.
**Wo:** `CMM/features/status/StatusView.tsx`, `features/plus/PlusView.tsx`, `docs/RESEARCH.md` (neu), `marketing/PLAYBOOK.md` (Abschnitt Seed-Cluster); `CMM-backend-new/models/User.js`, `lib/calls.js` (recordTalk), `routes/me.js`, `routes/admin.js`, `lib/adminPush.js` (Zähler); cal.com
**Aufwand:** S (≈ 5 h)
**Wirkung:** hoch
**Kennzahl:** Gespräche geführt/Woche ≥ 5; dokumentierte Zahlungsbereitschaft (Median akzeptabler Monatspreis); Karte→Buchung-Quote; Registrierungen/Woche über den Seed-Link (Ziel ≥ 30, Annahme)
**Hängt ab von:** nichts

## Phase 2: Lifecycle automatisieren, Geld messbar, Rechtsbasis komplett, Preis-/Qualitätsentscheidung (Mitte November 2026 bis Ende Januar 2027, ≈ 11 Wochen)

**Ziel:** Das System reagiert ohne Handarbeit auf den Nutzer-Lebenszyklus. MRR, Churn, Conversion, variable Kosten je MAU und Deckungsbeitrag stehen als Tageswerte. Trial, Grace Period, Dunning und Apple Server Notifications laufen. AGB, DSA-Meldeweg, Trader-Status, Versicherung und Gate-Checkliste sind live. Native Crashes und hängende Klingelvorgänge sind behoben bzw. sichtbar. Der Agent lernt aus Post-Performance. Du entscheidest Video-Default vs. Audio/Plus-Video anhand der Kostenrechnung.

**Übergang zu Phase 3, wenn:** Aktivierung D7 ≥ 40 % in 3 Kohorten mit ≥ 50 Nutzern (oder 4 Kohorten ≥ 100 zusammen); MRR-Zeitreihe und Deckungsbeitrag je MAU berechnet; Gate-Checkliste vollständig; Wochenreport läuft 4/4; ≈ 500 MAU, 200 WAU und ≥ 10 Store-Abos (Annahmen als Zielgrößen); Entscheidung Förderung vs. Bootstrapping getroffen.

**Schnittlinie:** Lifecycle-Engine, Umsatzkennzahlen + Unit Economics, Rechtsbasis-Rest mit Gate-Checkliste.

**Stundenbudget:** ≈ 165–190 h (11 Wochen × 15–17 h); 16 Punkte, davon 7 S. 2.6 ist mit ≈ 30 h ein L; passt 2.6b (Apple Server Notifications) nicht ins Budget, rutscht es neben 3.9 nach Phase 3.

### 2.1 Native Crash-Telemetrie: Sentry im iOS-Build und im Backend

**Art:** Automatisierung
**Was genau:** Auslöser: jeder Build, jeder Crash. Ablauf: `@sentry/react-native` mit Expo-Plugin in `app.config.js` (heute kein sentry/bugsnag/crashlytics in package.json), dSYM-Upload in `ios-build.yml`, Release = version+build, phoneHash statt Nummer als User-Kontext, PII-Scrubbing an. `@sentry/node` in `app.js` mit Release RENDER_GIT_COMMIT. Free-Tier. Datenschutz-Zeile über PRIVACY-CHANGE.md (AVV Sentry, EU-Region). Alarm bei neuem nativen Crash-Typ über Sentry-Webhook → POST /webhooks/sentry → adminPush 'alerts'. Release-Gate: Version erst breit bewerben nach 48 h ohne neuen fatalen Key. Der Observability-Punkt in Phase 3 (3.8) behält nur pino, System-Tab und Anrufqualität. Ergebnis: CallKit-, Agora- und PushKit-Crashes sind binnen einer Stunde bekannt.
**Wo:** `CMM/app.config.js`, `package.json`, `.github/workflows/ios-build.yml`, `services/diagnostics.ts`; `CMM-backend-new/app.js`, `routes/webhooks.js` (neu), `lib/alerts.js`, `docs/COMPLIANCE.md`
**Aufwand:** S (≈ 5 h)
**Wirkung:** hoch
**Kennzahl:** Crash-free Sessions je Build ≥ 99,5 % (Annahme); Zeit bis neuer nativer Crash bekannt < 1 h
**Hängt ab von:** Datenschutz-Änderungsprozess (1.6)

### 2.2 Klingel-Aufräumer im Minutentick und Ring-Übernahme nach Deploy

**Art:** Automatisierung
**Was genau:** Auslöser: jeder Leader-Minutentick, jeder Deploy. Ablauf: sweepStaleCalls() (`lib/calls.js` Z. 227) läuft heute nur in `index.js` Z. 53 beim Start; Ring-Timer liegen in einer Prozess-Map (Z. 44), sodass jeder Render-Deploy laufende Klingelvorgänge hängen lässt. Neu: sweepStaleCalls in den Leader-Minutentick (`index.js` tick Z. 60) mit callEnded/missed an beide Räume und missCall-Push; Ringing-Deadline als `Call.ringUntil` in der DB statt nur Timer, damit die neue Instanz nach Deploy übernimmt; Startup-Replay (`index.js` Z. 56–57 recordTalk über alle beendeten Calls) auf Calls seit letztem Talk begrenzen. Test: Call 'ringing' älter 60 s wird vom Tick beendet. Löst den heute realen Teil des Zwei-Instanzen-Punkts (3.12) vor. Ergebnis: Kein Klingeln ohne Ende mehr.
**Wo:** `CMM-backend-new/lib/calls.js`, `index.js`, `models/Call.js`, `test/calls.test.js` (neu aus 1.5; bis dahin `test/api.test.js`)
**Aufwand:** S (≈ 5 h)
**Wirkung:** hoch
**Kennzahl:** Hängende Klingelvorgänge nach Deploy = 0; Calls im Status ringing > 90 s = 0
**Hängt ab von:** nichts

### 2.3 Lifecycle-Engine: Onboarding Tag 1/3/7, Inaktive, Wochen-Serie, Plus-Ablauf, Win-back

**Art:** Automatisierung
**Was genau:** Auslöser: `lib/lifecycle.js` tickLifecycle() im Leader alle 30 min. Ablauf: Tag 1 ohne firstInviteAt → invite_reminder (/contacts; anderer Text bei contactsPermission denied). Tag 3 mit ≥ 1 registriertem Kontakt ohne Talk → first_call_hint mit zuletzt online gewesenem Kontakt. Tag 7 ohne Talk → yap_moment_invite 60 min vor DailyMoment.at. Inaktiv 3/14/30 Tage (ActiveDay foreground) → friends_were_available/come_back, danach Ruhe. Sonntag 16 Uhr week_open bei Streak ≥ 2 ohne Talk (`lib/stats.js` currentStreak), Ton ohne "reißt ab". 3 Tage vor plus.until bei referral/gift/waitlist → plus_expiring (/plus). BILLING_ISSUE → billing_issue (apps.apple.com/account/billing). Store-Abo abgelaufen vor 3/30 Tagen → plus_winback (Offering 'winback'). CANCELLATION → Umfrage-Push. Jede Stufe einmal (`User.lifecycle.sent`, phone-basiert, fällt unter den Löschpfad 2.8). Neue Pref notificationPrefs.lifecycle (Default an, "Erinnerungen und Tipps"), eigener Cap 2/Woche in `lib/notify.js`, contact_available hat Vorrang. POST /me/state {notifications, contactsPermission} → User.device als 2-h-Teil (Lifecycle braucht "denied"). Wirkung je Typ bis zum Ereignis-Log über "ActiveDay am Folgetag" und "Talk binnen 48 h" messen. Test `test/lifecycle.test.js` inkl. Idempotenz bei Leader-Wechsel. Ergebnis: Nach dem Signup passiert etwas, ohne dass du es anstößt.
**Wo:** `CMM-backend-new/lib/lifecycle.js` (neu), `lib/notify.js` (CATALOG, DAILY_SOCIAL_CAP Z. 21), `models/User.js` (notificationPrefs Z. 57–62), `routes/notifications.js`, `routes/me.js`, `index.js`, `test/lifecycle.test.js`; `CMM/features/notifications/NotificationsView.tsx`, `services/notifications.ts` (safeRoute /contacts, /plus)
**Aufwand:** M
**Wirkung:** kritisch
**Kennzahl:** Reaktivierungen je Typ (ActiveDay am Folgetag, Talk binnen 48 h); Aktivierung D7 Kohorten mit vs. ohne Lifecycle; Opt-out-Rate lifecycle < 5 % (Annahme)
**Hängt ab von:** Meilensteine (1.12), ActiveDay

### 2.4 Umsatzkennzahlen als Zeitreihe und nächtlicher RevenueCat-Abgleich

**Art:** Automatisierung
**Was genau:** Auslöser: Snapshot alle 30 min, Leader-Job plus-reconcile nachts. Ablauf: `lib/metrics.js` computeDay: `MetricsDaily.plus` {activeStore, activeGift, activeSandbox, newPaid, renewed, cancelled, billingIssue, expired, refunds (cancel_reason CUSTOMER_SUPPORT), trialsStarted, trialsConverted, mrrCents = Summe monatlich normalisierter Preise aktiver Store-Abos}; retention(): Anteil zahlend nach 30 Tagen je Kohorte. Nimmt die aus Phase 1 verschobenen Analytik-Teile auf: Funnel-Stufen je Wochenkohorte, Dichte-Histogramm (c0/c1_2/c3_5/c6plus), MetricsDaily.version mit Neuberechnung innerhalb der Rohdaten-TTL, `test/metrics.test.js` mit DST-Fällen. Konsole: Kpi-Reihe "Umsatz" und Chart im PlusPanel; Tages-Push "+2 Plus · 1 gekündigt · MRR 84 €". plus-reconcile: alle plus.source store gegen RevenueCat REST GET /subscribers/{id} prüfen, Abweichungen korrigieren und zählen. Regel: steuernd erst ab 30 aktiven Store-Abos (Annahme). Export-Familie einmal bauen: GET /admin/export/:collection.csv (metrics, plus, marketing-spend, support) nach dem Muster des einzigen vorhandenen Exports GET /admin/waitlist/export (CSV mit Audit-Eintrag, `routes/admin.js` Z. 328); der Export-Satz im Buchhaltungs-Punkt entfällt. Ergebnis: MRR und Churn sind Zeitreihen, keine Schätzung.
**Wo:** `CMM-backend-new/lib/metrics.js`, `models/MetricsDaily.js`, `lib/today.js`, `lib/adminPush.js`, `lib/plan.js`, `index.js`, `routes/admin.js` (/admin/plus Z. 640), `admin-ui/app.js`, `test/metrics.test.js` (neu)
**Aufwand:** M (≈ 15 h)
**Wirkung:** kritisch
**Kennzahl:** MRR und Bewegung; Free→Paid nach 30 Tagen je Kohorte; Churn freiwillig/unfreiwillig; Abgleich-Abweichungen = 0
**Hängt ab von:** SubscriptionEvent (1.3)

### 2.5 Unit Economics: variable und fixe Kosten, Deckungsbeitrag, Break-even, Ops-Stack-Kosten

**Art:** beides
**Was genau:** Auslöser: Snapshot; 5. des Monats Rechnungen abgleichen. Ablauf: `MetricsDaily.costs` {smsStarted, smsChecked, agoraAudioMinutes, agoraVideoMinutes (Talk.seconds × Teilnehmer × Call.video; HD ab Client-Meldung quality), cloudinaryUploads (gezählt in `app.js` /upload/avatar Z. 152–184 und /upload/moment Z. 187–213; `lib/moments.js` nutzt Cloudinary nur zum Löschen), pushSent, voipSent}. Audio/Video ist heute schon je Anruf erfasst (`Call.video`, Tageszähler `MetricsDaily.calls.audio` aus `lib/metrics.js` Z. 147ff); es fehlen nur Teilnehmerminuten je Modus und die Euro-Umrechnung. `AppConfig.prices` (Stückpreise aus Rechnungen, als Annahme markiert; Agora-Staffel Audio ≈ 0,99 $/1.000 min, HD-Video ≈ 3,99 $/1.000 min, 10.000 Freiminuten/Monat gegen Rechnung prüfen) und `AppConfig.fixedCosts` [{service, monthlyEurCents}] inkl. Ops-Posten (Uptime, Sentry, Staging) in admin-ui pflegbar; Credits aus FUNDING.md als negative Posten mit Ablaufdatum. Konsole: Kosten/Tag, Kosten/MAU, Kosten je Gesprächsminute, Deckungsbeitrag je Plus-Abo (Preis × (1 − Apple-Provision 15/30 %) − variable Kosten), Break-even in Jahresabos, Runway (Bankstand manuell). Upload: multer fileSize 5 MB (`app.js` Z. 148) existiert, Plan-Limit momentsPerDay 30 kommt dazu (keyGenerator req.auth.phone). Beispielrechnung aus "Unit Economics und Cash-Plan" in `docs/FINANCE.md` übernehmen und als offene Entscheidung Ende Phase 2 führen: Video-Default (`lib/calls.js` startCall video = true) vs. Audio-Default mit Video überhaupt als Plus-Merkmal oder Video-Minutenkontingent für Free. Das bestehende Limit `hdVideo` (DEFAULT_LIMITS free false, plus true; umgesetzt in `app/room.tsx` Z. 126 und `app/videocall.tsx` Z. 161 applyVideoQuality) senkt keine Agora-Kosten, weil 640×360 im selben HD-Tarif liegt wie 720p; Umsetzung wäre ein neuer Schlüssel `video` in DEFAULT_LIMITS (free: Minuten/Monat oder false, plus: true), geprüft in startCall statt `video = true`. Ergebnis: Deckungsbeitrag je MAU als Tageswert, Entscheidungsgrundlage für den Preis-/Qualitätsmix.
**Wo:** `CMM-backend-new/lib/metrics.js`, `models/MetricsDaily.js`, `routes/verify.js`, `lib/calls.js`, `app.js` (Z. 152, 187), `lib/plan.js` (DEFAULT_LIMITS Z. 14–16), `lib/appConfig.js`, `admin-ui/app.js`; `CMM/app/videocall.tsx` (quality melden), `docs/FINANCE.md`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Deckungsbeitrag je Plus-Abo > 0; variable Kosten je MAU < 25 % des ARPPU (Annahme); Break-even-Abozahl sichtbar; Talk-Minuten je MAU getrennt Audio/Video
**Hängt ab von:** SubscriptionEvent (1.3)

### 2.6 Trial, Grace Period, Dunning, Paywall-Funnel, Family Sharing

**Art:** beides
**Was genau:** Zwei Teile. 2.6a (M): Trial, Grace Period, Paywall-Funnel, Einstiege mit ?from, Kauf-Fehler als ClientError. 2.6b (M, hängt an 1.3, kann neben 3.9 reconcile-apple nach Phase 3 rutschen): `/webhooks/apple` mit ASN V2, REFUND und CONSUMPTION_REQUEST; die JWS-Verifikation gegen die Apple Root CA mit Zertifikatskette und Sandbox-Test ist allein ein M. Auslöser: Paywall-Aufruf, Kauf, Apple-/RevenueCat-Event. Ablauf 2.6a, App Store Connect (Prozess): Intro-Angebot 7 Tage gratis auf wannayap_plus_monthly/_yearly, Billing Grace Period 16 Tage, Family Sharing für yearly (kein Code), Offering 'winback' mit Promotional Offer in RevenueCat. App: `services/purchases.ts` checkTrialOrIntroductoryPriceEligibility → PlusView "7 Tage gratis, dann {price}"; alle Einstiege (`memories.tsx`, `appicon.tsx`, `year.tsx`, `settings.tsx`, `upsell.ts`; `room.tsx`-Alert bekommt erstmals einen Weg zur Paywall) rufen router.push('/plus?from=<quelle>'). Paywall-Funnel ohne Ereignis-Log: paywall_view/purchase_* als Zähler in `MetricsDaily.plus` über POST /me/plus/funnel {step, from}. Kauf-/Restore-Fehler und leeres Offering trotz purchasesAvailable() gehen als ClientError-Report; Interesse-Modus nur noch per Flag. Ablauf 2.6b, Backend: `/webhooks/apple` für App Store Server Notifications V2 (JWS verifizieren, Apple Root CA) als zweite Quelle in SubscriptionEvent (source 'apple'); REFUND → plus.active false + MetricsDaily.plus.refunds; CONSUMPTION_REQUEST automatisch mit Talk-Minuten seit Kauf beantworten; RevenueCat bleibt primär, Abweichungen zählt plus-reconcile. periodType TRIAL → trialsStarted/trialsConverted, `lib/notify.js` trial_ending (2 Tage vorher), limitError zählt plan_limit je Limit in MetricsDaily.plus.limitHits. `docs/PLUS.md` mit Produkt-IDs, Preisen, Offerings, Webhooks, Checkliste "Preis ändern". Ergebnis: Unfreiwilliger Churn sinkt, jede Paywall-Quelle ist messbar.
**Wo:** App Store Connect, RevenueCat; `CMM/services/purchases.ts`, `features/plus/PlusView.tsx` (storeLive Z. 79), `app/plus.tsx` (catch Z. 33), `features/plus/upsell.ts`, `app/room.tsx` (Z. 69), `docs/PLUS.md` (neu); `CMM-backend-new/routes/plus.js`, `routes/webhooks.js`, `lib/plan.js`, `lib/notify.js`, `lib/appConfig.js`
**Aufwand:** L gesamt (≈ 30 h: 2.6a M ≈ 15 h, 2.6b M ≈ 15 h)
**Wirkung:** hoch
**Kennzahl:** Paywall-View→Kauf je Quelle; Trial→Paid ≥ 40 % (Annahme); unfreiwilliger Churn < 30 % des Gesamtchurns; Kauf-Fehler/Tag (Alarm > 3)
**Hängt ab von:** SubscriptionEvent (1.3)

### 2.7 Rechtsbasis vor Media-Spend: AGB, DSA, Trader-Status, Versicherung, Gate-Checkliste

**Art:** Prozess (mit ≈ 10 h Code)
**Was genau:** Der Rest nach dem Sofortpaket (1.6): `content/legal.ts` TERMS_SECTIONS (Mindestalter 16, Verhaltensregeln, Moderation/Sperren mit Begründung und Beschwerdeweg, Abo/Kündigung, Geschenk-Plus widerrufbar); Seite /nutzungsbedingungen in `build-web.sh`; TERMS_URL in `app/plus.tsx` (Z. 11) und `docs/APPSTORE.md` umstellen. /melden für Nicht-Nutzer (POST /reports/public → SupportTicket 'report'), Impressum mit DSA-Kontaktpunkt Art. 11/12; `lib/moderation.js` sendet Statement of Reasons. Trader-Status (DSA), Altersfreigabe-Fragebogen und App-Privacy-Label in App Store Connect. `docs/COMPLIANCE.md`: AVV-Tabelle aller Dienste (inkl. B2/R2, Uptime, Sentry), Verarbeitungsverzeichnis, TOM, Löschkonzept finalisieren (Tabelle aus 1.6). `docs/INCIDENTS.md` (72 h, LfDI). IT-Haftpflicht/Cyber konkret (exali/Hiscox, Deckung 250 k€–1 M€, ≈ 300–600 €/Jahr, Annahmen) vor erstem Media-Euro. DPMA-Anmeldung, falls Recherche frei. `AppConfig.launchChecklist` wird DIE Gate-Checkliste: automatische Haken (/healthz antwortet, Restore-Datum < 90 Tage, ≥ 2 Owner, Datenschutz-Version, Pentest-Datum) und manuelle Haken (Branch-Schutz, Versicherung, Trader-Status, Marke); reserve() und die Phase-Gate-Kachel (3.1) lesen nur diese Liste. Ergebnis: Vor dem ersten Media-Euro ist alles Rechtliche an einem Ort abgehakt.
**Wo:** `CMM/content/legal.ts`, `app/nutzungsbedingungen.tsx` (neu), `app/plus.tsx`, `scripts/build-web.sh`, `docs/APPSTORE.md`, `docs/COMPLIANCE.md`, `docs/INCIDENTS.md` (neu), `marketing/src` (melden); `CMM-backend-new/routes/support.js`, `lib/moderation.js`, `lib/appConfig.js` (launchChecklist), `admin-ui/app.js`
**Aufwand:** M (≈ 10 h Code) + Prozess
**Wirkung:** hoch
**Kennzahl:** Pflichtpunkte in `AppConfig.launchChecklist` = 100 % vor erstem Media-Euro; DSGVO-Anfragen binnen 30 Tagen = 100 %; Marke angemeldet (ja/nein); Versicherung abgeschlossen (ja/nein)
**Hängt ab von:** Rechts-Sofortpaket (1.6), Anwaltstermin

### 2.8 Hash-Pepper und Löschpfad für pseudonyme Daten

**Art:** Automatisierung
**Was genau:** Auslöser: einmalige Migration, danach jede Kontolöschung. Ablauf: User.hashPhone (`models/User.js` Z. 149–150) ist reines SHA-256 über E.164, über den kleinen deutschen Nummernraum offline berechenbar, also pseudonym im Sinne Art. 4 Nr. 5 DSGVO. `User.phoneHash` (SHA-256) bleibt der einzige Schlüssel für /contacts/match, `Invite.toHash` (vom Client als SHA-256 berechnet), `Circle.invites.hash` und `BannedNumber.hash`; eine Neuberechnung würde Einladungen, Kreis-Einladungen und den Bann-Abgleich brechen, und der Client kann HMAC ohne Pepper nicht bilden. Neu: `User.phoneHmac` = HMAC-SHA256(PHONE_HASH_PEPPER, E.164) mit Pepper als Render-Secret, nur für Analytik-Collections (ActiveDay.who, Event.whoHash, Survey.whoHash). Migration: phoneHmac für alle User nachziehen (`scripts/add-phone-hmac.js`, später unter dem Migrationsrunner aus 3.2); ActiveDay.who per Join über User umschlüsseln oder ab Stichtag neu schreiben (400 Tage TTL). `lib/account.js` deleteAccount (Z. 77–106) löscht Talk, Call, PushDecision usw. über phone, aber ActiveDay (who = SHA-256, `models/ActiveDay.js` Z. 8; 0 Treffer in account.js) gar nicht; neu: ActiveDay, künftige Event-, Survey- und Invite-Hashes nach whoHash löschen, MomentUnlock und RevenueCat-Subscriber (REST DELETE) ebenfalls. Aufbewahrung 400 Tage vs. 3 Jahre als bewusster Eintrag im Verarbeitungsverzeichnis; Archiv-Export (4.6) nur nach echter Anonymisierung. Ergebnis: Keine Collection mit Personenbezug ohne Löschpfad.
**Wo:** `CMM-backend-new/models/User.js`, `models/ActiveDay.js`, `lib/account.js`, `lib/metrics.js`, `scripts/add-phone-hmac.js` (neu), `test/account.test.js`; `CMM/docs/COMPLIANCE.md`
**Aufwand:** S (≈ 6 h)
**Wirkung:** hoch
**Kennzahl:** Collections mit Personenbezug ohne Löschpfad = 0; Hash-Zeilen nach Kontolöschung = 0 (Test)
**Hängt ab von:** Datenschutz-Änderungsprozess (1.6); vor Ereignis-Log (3.7) und Lifecycle-Hash-Daten

### 2.9 Nummern-Recycling, Geräteliste, Alle Geräte abmelden

**Art:** Automatisierung
**Was genau:** Auslöser: Verifizierung einer Nummer, Push-Token-Registrierung, Logout-all. Ablauf: `routes/verify.js` Z. 118–121 findOneAndUpdate({phone}, upsert) übernimmt bei neu vergebener Prepaid-Nummer das alte Konto. Neu: `User.lastVerifiedAt` und `User.devices` [{id, model, appBuild, lastSeenAt}] aus /verify/check und Push-Token-Route; bei Verifizierung nach > 180 Tagen ohne ActiveDay Frage "Ist das dein Konto?" mit Name/Avatar → bei Nein altes Konto archivieren (Soft-Delete 30 Tage, dann `lib/account.js`) und frisch anlegen; Push "Neues Gerät angemeldet" an bestehende Tokens; POST /me/logout-all setzt `User.tokensValidAfter = now` (`models/User.js` Z. 89) und ruft gate.forget(phone), denn `lib/accessGate.js` tokenAllowed(phone, issuedAt) lehnt ältere Tokens schon heute ab und `lib/moderation.js` endSessions nutzt genau das; kein neues Feld. Zusätzlich Push- und VoIP-Token aller Geräte entfernen (wie /auth/logout ohne Body, `routes/notifications.js` Z. 76); Einstellungen zeigen die Geräteliste. JWT-Rotation mit JWT_SECRETS-Liste und kid bleibt eigener Schritt (siehe "Was wir bewusst nicht tun"). Ergebnis: Eine fremde Nummer öffnet kein fremdes Konto mehr.
**Wo:** `CMM-backend-new/routes/verify.js`, `routes/me.js`, `models/User.js`, `lib/accessGate.js`, `lib/auth.js`, `lib/account.js`, `routes/notifications.js`, `test/verify.test.js` (neu; Verify hat heute keinen eigenen Test, die Fälle laufen in `test/api.test.js`); `CMM/features/auth`, `app/(tabs)/settings.tsx`
**Aufwand:** M (≈ 12 h)
**Wirkung:** hoch
**Kennzahl:** Konten mit "Nicht mein Konto"-Antwort/Monat; Geräte je Nutzer; Support-Tickets "fremdes Konto" = 0
**Hängt ab von:** Meilensteine (ActiveDay-Inaktivität, 1.12)

### 2.10 Herkunftsfrage im Onboarding und Kampagnen-Objekt

**Art:** Automatisierung
**Was genau:** Auslöser: Profil-Setup; Kampagne anlegen in der Konsole. Ablauf: Optionaler Schritt in `features/profile/ProfileSetupView.tsx`: "Woher kennst du Wanna yap?" (Freund·in/TikTok/Instagram/Flyer/Presse/Sonstiges) plus "Wie viele deiner engsten 5 Freunde haben Android?" (0–5) plus vorbelegter Code aus Universal-Link → `User.acquisition` {source, campaign, code, androidFriends, at}. `models/Campaign.js` {slug, channel, title, startedAt, endedAt, budgetEur, partner, status, notes}; Konsolen-Tab "Kampagnen" mit Link-Generator (/k/slug, UTM, QR) und Zahlen je Slug aus LandingVisit, WaitlistEntry, MarketingSpend, User.acquisition; unregistrierte /k/-Slugs markiert. computeDay growth.byCampaign {new, activatedD7}. Ergebnis: First-Party-Attribution bis zum aktivierten Nutzer ohne ATT-Prompt; Voraussetzung für Post-Performance (2.14) und CAC (3.1).
**Wo:** `CMM/features/profile/ProfileSetupView.tsx`; `CMM-backend-new/routes/me.js`, `models/User.js`, `models/Campaign.js` (neu), `routes/admin.js`, `lib/metrics.js`, `admin-ui/app.js`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Anteil Neunutzer mit Quelle > 70 %; Aktivierung D7 je Kanal; Mittel androidFriends
**Hängt ab von:** Einladungscode (1.11)

### 2.11 Wochenreport, 30-Minuten-Wochenreview und Seed-Cluster-Plan

**Art:** beides
**Was genau:** Auslöser: Leader-Job weeklyDue Montag 08:00 Europe/Berlin. Ablauf: Verdichtung des Tages-Pushes (gleiche Funktionen in `lib/metrics.js`, Wochensumme/-mittel), keine zweite Datenquelle: Mail (`lib/mailer.js`) + Web-Push mit Nordstern vs. 40 %, Dichte, WAU WoW, Kohorten W1/W4, Einladungs-Funnel und k-Faktor, Neunutzer je Kanal, Abo-Bewegungen aus SubscriptionEvent (sobald die Quellen existieren), SMS je Registrierung, Alarme der Woche, offene Tickets/Freigaben, "Gespräche geführt/Woche" aus 1.13. Beim Quittieren in der Konsole Pflichtfeld "Stunden Betrieb diese Woche?" mit drei Kategorien (Alarme/Support/Freigaben); ohne Quittung zwei Wochen → Dead-Man-Mail (1.8). Prozess: Montag 30 min, genau drei Entscheidungen (Kanal +/−, Hook-Thema für den Agenten in `AppConfig.marketingNotes`, das context() weitergibt, Budget) in `docs/DECISIONS.md`. Der Report prüft das Seed-Cluster-Ziel aus 1.13 (Registrierungen/Woche über den Seed-Link). Ergebnis: Ein Report, drei Entscheidungen, keine Dashboards.
**Wo:** `CMM-backend-new/lib/adminPush.js`, `lib/mailer.js`, `lib/appConfig.js` (marketingNotes), `lib/marketing.js` (context), `index.js`, `admin-ui/app.js`; `CMM/docs/DECISIONS.md` (neu)
**Aufwand:** S
**Wirkung:** hoch
**Kennzahl:** Wochenreport pünktlich 4/4 pro Monat; dokumentierte Entscheidungen = 3/Woche; Betriebszeit Gründer/Woche (Ziel < 5 h ab Ende Phase 2)
**Hängt ab von:** Nordstern im Tages-Push (1.12), SubscriptionEvent (1.3)

### 2.12 Referral: Geschenk-Tage budgetieren, zweiseitige Belohnung testen

**Art:** Automatisierung
**Was genau:** Die Bindung an firstTalkAt ist in Phase 1 (1.4) erledigt. Hier bleibt: `MetricsDaily.plus.giftDaysGranted` je Quelle (referral/waitlist/admin) und giftToStore (INITIAL_PURCHASE bei früherer Geschenk-Quelle); Alarm bei Wochenschwelle in AppConfig (Regel der Alarmliste). Experiment (Flag, Ende Phase 2): zweiseitig, 7 Tage Plus für beide nach erstem gemeinsamen Gespräch. Ergebnis: Geschenk-Plus ist gedeckelt und sein Nutzen messbar.
**Wo:** `CMM-backend-new/lib/referral.js`, `lib/metrics.js`, `lib/alerts.js`, `lib/appConfig.js`; `CMM/features/plus/ReferralCard.tsx`
**Aufwand:** S (≈ 4 h)
**Wirkung:** hoch
**Kennzahl:** Geschenk-Tage je Woche; Geschenk→Store-Conversion > 10 % (Annahme); Selbst-Referral-Verdacht (Geworbene ohne Talk) < 10 %
**Hängt ab von:** Meilensteine (1.12), SubscriptionEvent (1.3)

### 2.13 Aha-Moment im Produkt: Karte "Dein erster Anruf", Einladungsvorschläge im Leerzustand, Re-Match

**Art:** Automatisierung
**Was genau:** Auslöser: App-Start mit registrierten Kontakten ohne first_talk; Leerzustand; Signup eines Kontakts. Ablauf: `app/(tabs)/index.tsx`: wenn Kontakte registriert und Badge first_talk nicht earned → Karte in StatusView mit zuletzt online gewesenem Kontakt (lastOnline aus /contacts/match, nur gegenseitig), Buttons "Anstupsen" (useNudgeComposer) und "Beim Yap Moment treffen" mit Countdown. Dafür GET /daily ändern: `routes/daily.js` Z. 21–37 antwortet vor dem Start nur mit { active: false } ohne Uhrzeit, weil activeMomentFor (`lib/dailyMoment.js` Z. 62–67) null liefert, solange sentAt fehlt oder moment.at > now. Neu: `nextAt` (DailyMoment.at der Zone des Nutzers, auch vor Start) und `nextEndsAt` über momentFor(zone) statt nur activeMomentFor; `hooks/useDailyMoment.ts` zeigt den Countdown; Test in `test/daily.test.js`. Lonely-Zustand (heute nur lokal, Z. 55): ContactsView sortiert "Noch nicht dabei" lokal nach Favoriten/Bild/Häufigkeit und schlägt "Die 3, die du am meisten anrufst" vor. Re-Match: bei Signup in `routes/verify.js` Owner finden, deren Adressbuch-Hashes den Neuen enthalten (Opt-in-Modell AddressBookHash, HMAC, TTL 90 Tage) → Push contact_joined; Silent Push nur als Ergänzung. Prüfen, ob Free-Limits (circleMembers 12, roomMinutes 60) Einladungen bremsen: limitError-Treffer je Grenze zählen, bevor Conversion optimiert wird. Ergebnis: Der erste Anruf passiert früher.
**Wo:** `CMM/app/(tabs)/index.tsx`, `features/status/StatusView.tsx`, `features/contacts/ContactsView.tsx`, `hooks/useDailyMoment.ts`; `CMM-backend-new/routes/daily.js` (Z. 21–37), `lib/dailyMoment.js` (momentFor, activeMomentFor Z. 62–67), `test/daily.test.js`, `routes/verify.js`, `models/AddressBookHash.js` (neu), `lib/invites.js` (announceJoined), `lib/plan.js` (limitError Z. 70)
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Median Time-to-first-talk < 48 h (Annahme); Anteil Nutzer mit ≥ 3 Einladungen in Woche 1; contact_joined-Reaktivierungsquote; Limit-Treffer je Grenze
**Hängt ab von:** Hash-Pepper (2.8) für AddressBookHash

### 2.14 Post-Performance zurück in den Agenten, Bio-Link mit Slug, Fehlschlag-Meldung

**Art:** Automatisierung
**Was genau:** Auslöser: Leader-Job alle 6 h für Posts der letzten 30 Tage; jeder Agent-Lauf. Ablauf: `lib/socialPosting.js` fetchStats(): Instagram GET /{media-id}/insights?metric=plays,reach,likes,shares,saved,comments (publish.instagram.id), TikTok POST /v2/video/query (Scope video.list ergänzen) → `AdDraft.stats`. `lib/marketing.js` context(): Top/Flop-10 nach Views/€, Neunutzer/activatedD7 je Kampagne, `AppConfig.marketingNotes`, Modell-IDs/Preise (`AppConfig.aiModels`, siehe 1.4), "KI-Euro je gepostetes Video" und Actions-Minuten je Lauf. `marketing/agent/prompt.js` bewertet Formate nach Aktivierung, liefert je Idee zwei Hook-Varianten (`schema.js`). Bio-Link wöchentlich /k/bio-<kw>. Fehlschlag-Meldung: POST /marketing/notify existiert schon (`routes/marketing.js` Z. 105–107), wird am Ende jedes erfolgreichen Agent-Laufs aufgerufen (`CMM/marketing/agent/daily.js` Z. 97, `hero.js` Z. 329) und ruft `lib/marketing.js` notifyOwners(), das nur mailt, wenn Entwürfe auf Freigabe warten; für einen Fehlschlag reicht das nicht. Neu: `marketing-agent.yml` Step 'if: failure()' → POST /marketing/failed (neu) bzw. /marketing/notify um {failed:true, step} erweitern, das adminPush.tell('alerts') auslöst; MarketingTally lastRunAt/lastOkAt. Kein höheres KI-Budget vor dieser Rückkopplung. Ergebnis: Der Agent sieht, was wirkt.
**Wo:** `CMM-backend-new/lib/socialPosting.js` (PLATFORMS Z. 29), `models/AdDraft.js` (publish Z. 71), `lib/marketing.js` (context Z. 244, notifyOwners), `routes/marketing.js` (notify Z. 105–107), `models/MarketingTally.js`, `index.js`, `admin-ui/app.js`; `CMM/marketing/agent/prompt.js` (Z. 128), `schema.js`, `.github/workflows/marketing-agent.yml`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Views pro Euro je Video; Neunutzer je Video-Kampagne; Agent-Läufe/Woche ohne Ausfall; Anteil freigegebener Entwürfe; KI-Euro je gepostetes Video
**Hängt ab von:** Kampagnen-Objekt (2.10)

### 2.15 Störungs-Banner aus Alarmen, Doku-Drift-Tests, Postmortem-Vorlage

**Art:** Automatisierung
**Was genau:** Auslöser: Alarmregel mit userFacing:true feuert bzw. kehrt zurück; jeder CI-Lauf. Ablauf: `AppConfig.banner` existiert (`lib/appConfig.js` Z. 13–24, 45–46), wird aber nur von Hand gesetzt. `lib/alerts.js`-Regeln mit userFacing:true (Verify-502-Quote, Push-Fehlerquote, Agora-Token-Fehler) setzen den Banner mit vordefiniertem Text ("SMS-Versand gestört, wir arbeiten dran") und Auto-Reset nach Rückkehr unter die Schwelle; Landing zeigt denselben Status über /app-config; Support-Auto-Antwort verweist bei aktivem Banner auf die Störung. CI-Tests: 'env-drift' (grep process.env.* in lib/routes/app/index gegen README-Tabelle; heute fehlen dort ADMIN_API_KEY, REVIEW_PHONE/REVIEW_CODE und REVENUECAT_WEBHOOK_SECRET (`routes/plus.js` Z. 107), also der Schlüssel der Monetarisierung; die von Render gesetzten RENDER_GIT_COMMIT/RENDER_INSTANCE_ID und NODE_ENV stehen als Allowlist im Test), 'runbook-links' (jeder Alarm-Tag in `lib/alerts.js` hat einen RUNBOOK-Anker). `docs/POSTMORTEM-TEMPLATE.md` (Zeitlinie, Ursache, Alarm ja/nein, Maßnahme als Issue); Regel: jeder Alarm mit Nutzerwirkung bekommt ein Postmortem in `docs/incidents/`. Ergebnis: Nutzer erfahren Störungen von dir, nicht aus dem Fehlerdialog.
**Wo:** `CMM-backend-new/lib/alerts.js`, `lib/appConfig.js`, `routes/support.js`, `test/env-drift.test.js` (neu), `test/runbook-links.test.js` (neu), `README.md`; `CMM/marketing/src/landing.js`, `docs/POSTMORTEM-TEMPLATE.md` (neu), `docs/RUNBOOK.md`
**Aufwand:** S (≈ 5 h)
**Wirkung:** mittel
**Kennzahl:** Störungen mit Banner binnen 5 min = 100 %; Tickets während Störung je Stunde (sinkend); Postmortems je Nutzerwirkungs-Alarm = 100 %
**Hängt ab von:** lib/alerts.js (1.10)

### 2.16 OTA-Hotfix-Weg, Tags, Changelog, Rollback-Definition

**Art:** beides
**Was genau:** Auslöser: JS-Fix gemerged; iOS-Build; Backend-Deploy. Ablauf: `.github/workflows/ota-update.yml` (workflow_dispatch: channel preview|production, Nachricht) mit eas update; runtimeVersion von '1.0.0' auf {policy:'fingerprint'}, damit native Änderungen nie ein inkompatibles OTA bekommen; `app/_layout.tsx` Updates.checkForUpdateAsync beim Foreground mit Neustart-Hinweis; `services/appInfo.ts` sendet Update-ID mit X-App-Version, damit ClientError OTA-Stände unterscheidet. `ios-build.yml` setzt Tag ios/v<version>-b<build> + GitHub-Release mit CHANGELOG-Auszug; `test.yml` taggt api/<datum>-<sha>. Release-Regeln genau einmal in `docs/RELEASE.md`: "OTA vs. Store-Build", Rollback = eas update:republish, Phased Release immer an, minBuild zwei Versionen zurück, Version erst breit bewerben nach 48 h ohne neuen fatalen Key; Betriebsrhythmus und Release-Train verweisen darauf. Demo-Login bekommt REVIEW_UNTIL; der Alarm ist Regel der Alarmliste. Web-Routen begrenzen (S, aus 1.1 hierher): expo-router kennt keinen Ausschluss von Routen je Plattform, deshalb halten `app/[route].web.tsx`-Stubs mit Redirect auf / die 27 App-Screens (21 in `app/`, 4 in `(tabs)`, 2 in `(auth)`) aus dem Web-Export; dazu `<meta name="robots" content="noindex">` für App-Routen im Web. Ergebnis: Ein JS-Fehler ist in Stunden behoben, nicht in einer Review-Runde.
**Wo:** `CMM/.github/workflows/ota-update.yml` (neu), `ios-build.yml`, `app.config.js` (runtimeVersion Z. 92), `app/_layout.tsx`, `app/*.web.tsx` (neu, Stubs), `scripts/build-web.sh`, `services/appInfo.ts`, `docs/RELEASE.md`, `CHANGELOG.md` (neu); `CMM-backend-new/.github/workflows/test.yml`, `routes/verify.js` (REVIEW_PHONE Z. 28–36)
**Aufwand:** S
**Wirkung:** hoch
**Kennzahl:** Zeit von JS-Fix-Merge bis 80 % Adoption < 48 h; OTA-Adoption je Runtime; Change-Failure-Rate aus Tags
**Hängt ab von:** nichts

## Phase 3: Geld je Kanal, Betrieb ohne Hand, Android-Entscheidung (Februar bis April 2027, ≈ 13 Wochen)

**Ziel:** Jeder Euro ist bis zum aktivierten Nutzer und Abo je Kanal nachverfolgbar. Bezahlte Reichweite startet nur über das Code-Gate inkl. Pentest. Staging existiert. Der Lasttest belegt oder widerlegt den Bedarf an zwei Instanzen. Moderation und Support laufen weitgehend ohne Hand. Monatsabschluss < 2 h. Die Android-Entscheidung ist über das Dichte-Gate getroffen. Hiring-, Partner- und IP-Rahmen stehen.

**Übergang zu Phase 4, wenn:** LTV/CAC je Kanal berechenbar; Staging produktiv; Crash-free ≥ 99,5 %; Reconciliation-Abweichung < 5 %; Betriebszeit Gründer < 5 h/Woche über 4 Wochen; PMF-Signal (W4/W1 flacht ab oder "sehr enttäuscht" > 40 %); ≈ 2.000 MAU und 50 Store-Abos (Annahmen); Android-Entscheidung dokumentiert.

**Schnittlinie:** Gate im Code (CAC/LTV), Staging + Smoke, Moderation ohne Hand.

**Stundenbudget:** ≈ 200 h (13 Wochen × 15 h); 15 Punkte, davon 3 S/Prozess.

### 3.1 CAC/LTV je Kanal, Mediakosten im Budgetsystem, Gate im Code

**Art:** Automatisierung
**Was genau:** Auslöser: Ausgabe eintragen, Budget reservieren, Snapshot. Ablauf: `MarketingSpend.provider` um meta, tiktok, apple-search-ads, print, creator erweitern; Konsolen-Formular "Ausgabe eintragen" (POST /admin/marketing/spend) mit campaign. `lib/marketingBudget.js` overview() je campaign; `lib/waitlist.js` visitStats um costEur, eurPerVisit, eurPerSignup; computeDay marketingSpendCents, cacCents je Kanal = spend / Neunutzer mit acquisition, ltvEstimate = ARPPU × (1/monatlicher Churn) × Conversion (markierte Annahme bis 3 Monate Daten), Payback-Monate; Kachel LTV/CAC mit Warnfarbe < 3. Gate: reserve() (Z. 89) verweigert provider meta/tiktok/apple-search-ads, solange activation4w < `AppConfig.goals.activationPct`, k < 0,5 oder `AppConfig.launchChecklist` unvollständig; es liest ausschließlich diese eine Liste, keine eigene Gate-Logik. Branch-Schutz-Haken manuell oder per GitHub-API mit Token (dann Token in SERVICES.md); Pentest-Haken aus 3.4. Ergebnis: Kein Media-Euro ohne grünes Gate, jeder Euro einem Kanal zugeordnet.
**Wo:** `CMM-backend-new/models/MarketingSpend.js` (provider Z. 10), `lib/marketingBudget.js` (reserve Z. 89), `lib/waitlist.js`, `lib/metrics.js`, `routes/marketing.js`, `routes/admin.js`, `admin-ui/app.js`
**Aufwand:** M
**Wirkung:** kritisch
**Kennzahl:** CAC je Kanal; LTV/CAC > 3; Anteil Media-Spend, der das Gate passiert hat = 100 %
**Hängt ab von:** Attribution (2.10), Umsatzkennzahlen (2.4), Gate-Checkliste (2.7)

### 3.2 Staging, render.yaml, Smoke-Test, Migrationsrunner, Dependency-Hygiene

**Art:** beides
**Was genau:** Auslöser: Push auf main, Push auf staging, wöchentlich Dependabot. Ablauf: `render.yaml` (Blueprint) mit api (healthCheckPath /healthz, autoDeploy nach CI) und api-staging aus Branch staging, eigene Atlas-DB, Twilio-Test-Credentials, RevenueCat-Sandbox; `eas.json` development/preview mit EXPO_PUBLIC_API_URL=https://api-staging.wannayap.app (heute nur APP_VARIANT und RevenueCat-Key); `.replit` löschen. `smoke.yml` pollt nach Push auf main /api/push-health bis version == HEAD-Kurzhash, prüft voipConfigured/authRequired und Socket-Handshake mit ungültigem Token, sonst Alarm. `migrations/NNN-name.js` mit Collection 'Migration' unter Leader-Lease vor server.listen; bestehende migrate()-Schritte (`index.js` Z. 22–36) überführen; Regel "Schema abwärtskompatibel bis minBuild". `dependabot.yml` in beiden Repos, npm audit --audit-level=high, gitleaks, permissions: contents: read, multer auf 2.x (heute ^1.4.5-lts.1). Prozess: Feature-Branch → PR → staging (interner TestFlight) → main; Migrationen zuerst gegen Staging. Ergebnis: Kein Backend-Change erreicht Produktion ungetestet.
**Wo:** `CMM-backend-new/render.yaml` (neu), `.github/workflows/smoke.yml` (neu), `.github/dependabot.yml` (neu), `.github/workflows/test.yml`, `migrations/` (neu), `index.js`, `package.json`; `CMM/eas.json`, `config/env.ts`, `.github/workflows/ci.yml`, `.github/dependabot.yml` (neu), `docs/DEV_SETUP.md`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Backend-Änderungen, die vor main auf Staging liefen = 100 %; Smoke grün nach jedem Deploy; offene High/Critical-Audit-Findings = 0
**Hängt ab von:** Credits-Antwort für zweite Atlas-DB (1.7), Fixkosten-Eintrag

### 3.3 Moderation ohne Hand: Bildprüfung, Auto-Sperre, Limits, Bans-Register, Quarantäne

**Art:** Automatisierung
**Was genau:** Auslöser: Upload, Report, Job moderation-sla. Ablauf: Cloudinary-Upload mit moderation 'aws_rek' für Moments und Avatare in `app.js` (beide upload_stream-Aufrufe, /upload/avatar Z. 152–184 und /upload/moment Z. 187–213; heute keine Moderationsoption; `lib/moments.js` lädt nichts hoch und bleibt für hidden und Löschung); Webhook /webhooks/cloudinary → bei rejected CallMoment.hidden + System-Report + adminPush 'reports'. `routes/social.js` POST /reports: eigener Limiter 5/Tag je Nummer (heute nur global 300/min/IP) plus Dedupe je (reporter, momentId), Melder-Gewichtung nach Dismiss-Quote. Nudges: Absender-Limit existiert (`routes/gamification.js` Z. 19 MAX_NUDGES_PER_DAY = 20), hier nur Empfänger-Limit 3/Tag in `lib/nudges.js` ergänzen. `lib/moderation.js` autoSuspend: ≥ 3 verschiedene harassment-Melder in 7 Tagen → vorläufig 3 Tage + Owner-Push; Regel moderation-sla (harassment > 4 h, sonst > 24 h) in der Alarmliste. ban() (Z. 53–61) setzt bannedAt, verschlüsselter Export in ModerationEvidence (TTL 90 Tage), endgültige Löschung nach 30 Tagen per Job statt sofort. Einziger Ort für GET /admin/bans + unban (BannedNumber wirkt heute bei Sign-in und Token-Prüfung, hat aber keine Ansicht). `MetricsDaily.moderation` {resolved, medianHours, suspends, bans, autoHidden}. Ergebnis: Meldungen werden bearbeitet, auch wenn du schläfst, und keine Sperre ist endgültig ohne Beweis.
**Wo:** `CMM-backend-new/app.js` (Uploads Z. 152 und 187, Webhook), `lib/moments.js` (hidden/Löschung), `routes/social.js` (HIDE_AFTER_REPORTS Z. 17), `lib/nudges.js`, `lib/moderation.js`, `models/Report.js`, `models/ModerationEvidence.js` (neu), `models/BannedNumber.js`, `routes/admin.js`, `admin-ui/app.js`, `index.js`, `lib/metrics.js`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Median Bearbeitungszeit Meldungen < 24 h (harassment < 4 h); automatisch verborgene Bilder/Tag; Fehlsperren (unban) pro Monat
**Hängt ab von:** Alarmliste (1.10)

### 3.4 Pentest und Admin-Härtung als Bedingung im Media-Gate

**Art:** beides
**Was genau:** Auslöser: vor dem ersten Media-Euro. Ablauf: /.well-known/security.txt und /sicherheit-Seite (Kontakt, Safe Harbor, keine Bounty) in `build-web.sh` (heute kein security.txt in beiden Repos). `docs/THREATMODEL.md` eine Seite je Pfad (SMS-Login, Adressbuch/Match, Anruf-Signalisierung, Admin-Konsole, Webhooks, Agent-Keys): Angreifer, Eintritt, Kontrolle, Lücke. Admin-Konsole: Session an Gerät binden, Alarm bei ≥ 5 fehlgeschlagenen TOTP/Passkey-Versuchen. Extern: Light-Pentest (2–3 Tage, Fixpreis, Annahme 2.000–4.000 €) mit Fokus auf die fünf Pfade; "keine offenen High/Critical" ist Haken in der Gate-Checkliste, die reserve() prüft. Fehlt das Budget, verschiebt sich der Media-Start, nicht der Pentest. Ergebnis: Reichweite trifft auf ein geprüftes System.
**Wo:** `CMM/scripts/build-web.sh`, `marketing/src`, `docs/THREATMODEL.md` (neu); `CMM-backend-new/lib/adminAuth.js`, `lib/alerts.js`, `lib/appConfig.js` (launchChecklist)
**Aufwand:** S (≈ 5 h) + extern
**Wirkung:** hoch
**Kennzahl:** Offene High/Critical-Findings = 0 vor erstem Media-Euro; Meldungen über security.txt beantwortet < 72 h
**Hängt ab von:** Anrufe nur an Kontakte und Legacy-Zweige entfernt (1.5), Hash-Pepper (2.8)

### 3.5 Bezahlte Reichweite Stufe 1 (manuell, messbar) und Creator-/Campus-Programm

**Art:** beides
**Was genau:** Auslöser: Gate grün (3.1) und Pentest-Haken (3.4). Ablauf: Spark Ads/Instagram-Boost nur auf Top-3-Videos nach Views/€ und Aktivierung, Ziel-URL /k/ads-<stadt>, eine Stadt, 18–25, Start 10 €/Tag (Annahme) zusätzlich zum KI-Budget; Apple Search Ads Basic auf Markenbegriffe; Kampagne aus, wenn CAC > 1/3 LTV. Creator/Campus: Campaign.channel creator|campus|press mit partner, je Partner /k/creator-<name> und Einladungscode für Nicht-Nutzer (PartnerCode), Belohnung über bestehenden Admin-Plus-Grant (POST /admin/users/:id/plus) oder Offer Codes; Konsole "Partner": Klicks → Installs → Aktivierte → Dichte. Vertrags- und Vergütungsrahmen kommt aus 3.15 (PARTNERS.md, PartnerCode.agreementSignedAt/payoutEur); kein Creator-Anschreiben ohne unterschriebene Vereinbarung. Prozess: Montag 10 Creator anschreiben (Vorlage, Kennzeichnungspflicht), alle 2 Wochen 10 Pressekontakte; nächste Hochschule erst bei Dichte-Ziel; Kampagnenkalender auf Semesterstart (Oktober/April) und Prüfungsphasen. Ergebnis: Erste bezahlte Reichweite, messbar bis zum aktivierten Nutzer.
**Wo:** `CMM-backend-new/models/Campaign.js`, `models/PartnerCode.js` (neu), `routes/social.js` (/invites/claim), `routes/admin.js` (Z. 615), `lib/metrics.js` (density je campaign), `admin-ui/app.js`; `CMM/marketing/PLAYBOOK.md`, `marketing/build.js` (/presse)
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Aktivierte Nutzer je 100 € Media; Dichte je Campus-Kampagne (Anteil ≥ 3 Kontakte nach 7 Tagen > 50 %, Annahme); Aktivierte je Partner
**Hängt ab von:** Gate im Code (3.1), Pentest (3.4), Rechtsbasis (2.7), Partner-Rahmen (3.15)

### 3.6 App-Store-Kennzahlen und Bewertungen automatisch (asynchrone ASC-API)

**Art:** Automatisierung
**Was genau:** Auslöser: Leader-Job täglich. Ablauf: `lib/appStore.js` (JWT aus ASC_KEY_ID/ISSUER/P8 als Render-Secrets): Analytics Reports korrekt asynchron (Report-Request anlegen, ONGOING-Instanz, Download mit 24–48 h Verzug; Kampagnen-Downloads je ct nur aggregiert mit Provider-Token) → `models/StoreDaily.js`; customerReviews → `StoreReview.js`, Alarm bei ≤ 3 Sternen mit ASC-Antwortlink. `MetricsDaily.store` {impressions, pageViews, downloads, ratingAvg, ratingsCount}; Quote downloads → users.new als Stufe der einen Funnel-Kette. review_prompted-Events aus `reviewPrompt.ts` gegen erhaltene Bewertungen. Ergebnis: Der Funnel reicht vom Store-Klick bis zur Registrierung ohne Lücke.
**Wo:** `CMM-backend-new/lib/appStore.js` (neu), `models/StoreDaily.js`, `models/StoreReview.js` (neu), `index.js`, `lib/metrics.js`, `lib/alerts.js`, `admin-ui/app.js`; `CMM/services/reviewPrompt.ts`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Produktseiten-Conversion; Download→Registrierung-Quote; Bewertungsdurchschnitt; Downloads je ct
**Hängt ab von:** Store-Link (1.1), Kampagnen-Objekt (2.10)

### 3.7 Sparsames Ereignis-Log, Push→Anruf-Quote, Berechtigungsstatus

**Art:** Automatisierung
**Was genau:** Gate: erst ab > 200 WAU (Leitprinzip "Ehrlich bei kleinen Zahlen"). Auslöser: App-Ereignis, Flush alle 30 s/Background. Ablauf: `models/Event.js` {whoHash (HMAC-Pepper aus 2.8, im Löschpfad), type, props, appBuild, at; TTL 400 Tage; Index type+at} und POST /events (Batch ≤ 50, Whitelist, Rate-Limit wie `routes/diagnostics.js`; kein Tracking-SDK; Datenschutz-Zeile über PRIVACY-CHANGE.md). App: `services/track.ts` mit AsyncStorage-Queue. Typen: app_foreground, onboarding_step, contacts_permission, push_permission, paywall_view {from}, purchase_start/success/cancel/fail, push_opened {type}, call_start {origin push|list|nudge|moment|circle}, review_prompted. Backend: PushDecision.openedAt via POST /me/notifications/opened (Match to+type+about, 24 h), Call.origin aus `socket.js` callRequest; computeDay push.byType {sent, delivered, opened, callsWithin30min} vor Ablauf der 3-Tage-TTL; ActiveDay.kind foreground|request für ehrliche DAU/Retention. App fasst bei 'denied' nach 7 Tagen mit Karte + Linking.openSettings() nach (POST /me/state ist seit 2.3 da). Ergebnis: Der Kern-Loop "Anna ist erreichbar → Anruf" ist messbar.
**Wo:** `CMM-backend-new/models/Event.js` (neu), `routes/events.js` (neu), `routes/notifications.js`, `models/PushDecision.js`, `models/Call.js`, `models/ActiveDay.js`, `socket.js` (Z. 46), `lib/metrics.js`; `CMM/services/track.ts` (neu), `services/notifications.ts`, `services/CallNotificationService.ts` (Z. 118), `app/_layout.tsx`, `app/(tabs)/index.tsx` (Z. 102–118)
**Aufwand:** M
**Wirkung:** kritisch
**Kennzahl:** Push→Anruf innerhalb 30 min je Typ (contact_available > 10 %, Annahme); Push-Opt-in und Kontakte-Berechtigung je Kohorte; DAU foreground vs. any
**Hängt ab von:** Hash-Pepper (2.8), > 200 WAU

### 3.8 Observability: strukturierte Logs, System-Tab, Anrufqualität, VoIP-Zustellvertrag

**Art:** Automatisierung
**Was genau:** Sentry ist seit 2.1 da. Auslöser: jeder Request, OpsSample alle 60 s, jeder Anruf. Ablauf: pino + pino-http in `app.js` (req.id, phoneHash statt Nummer, Dauer, Status; Call-Events mit channel als Korrelations-ID), Render Log Stream → Better Stack/Axiom Free-Tier. Lock-Doc um lastRunAt/lastOkAt/lastError je Job; OpsSample (Requests, 5xx, p95 je Route, io.engine.clientsCount); GET /admin/system + Tab "System". Anrufqualität: POST /calls/quality {channel, joinMs, agoraErrorCode, endReason, quality} aus `videocall.tsx`; computeDay calls.connectRate, joinMsMedian. VoIP-Vertrag: "VoIP gesendet, aber kein Socket-Register/CallKit-Report binnen 10 s" als Alarmgröße (häufigster stiller Anruf-Ausfall auf iOS). Datenschutz-Zeile über PRIVACY-CHANGE.md. Ergebnis: Du siehst Job-Gesundheit und Anrufqualität, ohne in Render-Logs zu suchen.
**Wo:** `CMM-backend-new/app.js` (Z. 424–427), `lib/log.js` (neu), `lib/leader.js`, `models/OpsSample.js` (neu), `routes/calls.js` (neu), `models/Call.js`, `lib/metrics.js`, `lib/alerts.js`, `routes/admin.js`, `admin-ui/app.js`; `CMM/app/videocall.tsx`, `services/PlatformCallAdapter.ts`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** 5xx-Rate < 0,5 %; Anruf-Verbindungsrate nach Annahme > 90 %; VoIP→Klingeln-Quote (Annahmen)
**Hängt ab von:** Sentry (2.1), Alarmliste (1.10)

### 3.9 Buchhaltung automatisieren: Financial Reports, Reconciliation, GuV-Tab, Runway

**Art:** beides
**Was genau:** Auslöser: monatlich finance.yml; nächtlich MonthlyFinance; Monatsabschluss bis zum 5. Ablauf: `CMM/.github/workflows/finance.yml` holt App Store Connect Financial Reports per API (Key als Secret) in privaten Ordner; `scripts/reconcile-apple.js` vergleicht Apple-Netto mit Σ SubscriptionEvent (price × takehome) je Monat, Abweichung > 5 % → Alarm. `models/MonthlyFinance.js` {revenueGross, appleFee, revenueNet, variableCost, fixedCost, marketing, result, cash (manuell), runwayMonths} nächtlich aus MetricsDaily + AppConfig; Tab "Finanzen" mit 12-Monats-Tabelle, Break-even in Abos, Runway. CSV-Exporte kommen aus der Export-Familie (2.4). Prozess Monatsabschluss bis zum 5. (45 min): Belege Render/Atlas/Twilio/Agora/Cloudinary/Expo/Anthropic/Google, Import in lexoffice/sevDesk (DATEV-Export), fixedCosts/prices nachziehen. Cash-Plan steht seit Phase 1 in `docs/FINANCE.md`; die Förderentscheidung ist Ende Phase 2 gefallen. Ergebnis: Monatsabschluss < 2 h, Runway sichtbar.
**Wo:** `CMM/.github/workflows/finance.yml` (neu), `docs/FINANCE.md`; `CMM-backend-new/scripts/reconcile-apple.js` (neu), `models/MonthlyFinance.js` (neu), `routes/admin.js`, `admin-ui/app.js`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** Monatsabschluss bis zum 10. erledigt 12/12 in < 2 h; Reconciliation-Abweichung < 5 %; Runway in Monaten sichtbar (> 12)
**Hängt ab von:** Umsatzkennzahlen (2.4), Unit Economics (2.5), Gewerbe/Konto/Steuerberater (1.7)

### 3.10 Support-Selbstbedienung: Auto-Eingang, Vorlagen, /hilfe, Kennzahlen

**Art:** beides
**Was genau:** Auslöser: Ticket-Erstellung; Freitag-Triage. Ablauf: `routes/support.js`: automatische Antwort bei Ticket-Erstellung ("binnen 24 h" + 3 Hilfe-Links je Kategorie; bei account/abo direkt Anleitung Push-Reset/Restore; bei aktivem Störungs-Banner Verweis auf die Störung); Kategorien 'abo' und 'privacy' (dueAt +30 Tage). SupportTicket.firstResponseAt/dueAt (+24 h Werktag)/tags/internalNote/issueUrl; die Überfälligkeits-Regel lebt in `lib/alerts.js` (kein eigener Job). `AppConfig.supportTemplates` mit Dropdown in der Ticketansicht. /hilfe in `marketing/src/help.js` (Anrufe & Push, Kontakte, Kreise, Plus kündigen/wiederherstellen, Konto & Daten, Melden) als Support-URL in ASC; SupportView zeigt 3 Hilfe-Einträge vor dem Formular. `MetricsDaily.support` {new, answered, medianFirstResponseMin, openOver24h, byCategory}. Prozess: Freitag 20 min Triage, Bugs als GitHub Issues 'aus-support'. Ergebnis: Ein Teil der Tickets löst sich, bevor du sie liest.
**Wo:** `CMM-backend-new/routes/support.js` (CATEGORIES Z. 9), `models/SupportTicket.js` (Z. 6), `lib/appConfig.js`, `lib/metrics.js`, `admin-ui/app.js`; `CMM/marketing/src/help.js` (neu), `scripts/build-web.sh`, `features/support/SupportView.tsx`, `docs/APPSTORE.md`
**Aufwand:** M
**Wirkung:** mittel
**Kennzahl:** Median Erstantwortzeit < 24 h werktags; Tickets je 1.000 MAU; Anteil Tickets ohne Handarbeit geschlossen > 40 % (Annahme)
**Hängt ab von:** Störungs-Banner (2.15)

### 3.11 Android-Entscheidung über Dichte-Gate mit Audio-only-Option

**Art:** Prozess
**Was genau:** Auslöser: Quartalsreview in Phase 3. Ablauf: Auswertung der seit Phase 1 gemessenen Werte: Anteil Android unter eingeladenen Kontakten (`InviteVisit.platform` je Einlader), Onboarding-Antwort androidFriends (`User.acquisition.androidFriends`), Wartelisten-Einträge mit platform 'android' (Feld aus 1.11), Dichte-Verlust (Kreise mit ≥ 1 Nicht-Beitritt wegen Android). Gate: "Android-Start, wenn > 30 % der eingeladenen Kontakte Android sind und iOS-Aktivierung ≥ 35 %" (neu; bisher gibt es keine dokumentierte Android-Regel, `marketing/PLAYBOOK.md` Z. 252 sagt nur "Android folgt"). Optionen: (a) volle Parität (XL), (b) Audio-only-Android mit FCM Full-Screen-Intent + Agora Audio (L, kein HD-Video, kein CallKit-Äquivalent für Video), (c) weiter warten mit Warteliste. Ergebnis als ADR in `docs/adr/0002-android.md` und Eintrag in DECISIONS.md; 4.1 startet nur mit (a) oder (b).
**Wo:** `CMM/docs/adr/0002-android.md` (neu), `docs/DECISIONS.md`; `CMM-backend-new/lib/metrics.js` (density.androidShare), `models/InviteVisit.js`, `models/WaitlistEntry.js` (platform), `models/User.js`
**Aufwand:** S (≈ 3 h Auswertung)
**Wirkung:** hoch
**Kennzahl:** Android-Anteil unter eingeladenen Kontakten; Dichte-Verlust durch Android (Anteil Kreise); Entscheidung dokumentiert (ja/nein)
**Hängt ab von:** Einladungscode (1.11), Herkunftsfrage (2.10)

### 3.12 Backend auf zwei Instanzen: Lasttest zuerst, dann Socket-Adapter, Rate-Limit-Store, Caches

**Art:** Automatisierung
**Was genau:** Vorbedingung: k6-Lasttest gegen Staging (≈ 5 h, aus 4.3 vorgezogen): 1.000/5.000 Sockets, Yap-Moment-Tick, contacts/match 5.000 Hashes. Adapter und Store werden nur gebaut, wenn der Test Grenzen unter 3× erwarteter Spitzenlast zeigt; sonst bleibt "genau 1 Instanz" im RUNBOOK und die Stunden gehen in Aktivierung. Falls gebaut: @socket.io/mongo-adapter in `app.js` über die vorhandene Mongo-Verbindung mit capped collection und Change Streams (Atlas ist Replica Set; Testsuite auf MongoMemoryReplSet umstellen); Client bleibt transports ['websocket'] (`services/socket.ts`), weil Render ohne Sticky Sessions Long-Polling bricht. Eigener 40-Zeilen-Store `lib/rateLimitStore.js` auf einer Mongo-Collection mit TTL für alle 8 Limiter-Instanzen (7 Aufrufstellen: `app.js` global 300/min, `routes/verify.js` perPhone(5), perPhone(10) und perIp, `routes/diagnostics.js`, `routes/support.js`, `routes/waitlist.js`, `routes/admin.js` authLimit; verify erzeugt perPhone zweimal). rate-limit-mongo ist unmaintained. Admin ban/logout per io.serverSideEmit (accessGate.forget); mailer.state und appConfig.known in Docs; sparse Indizes pushToken/voipToken, {lastOnline:-1}, {'app.seenAt':1}. Ring-Sweep und Startup-Replay sind seit 2.2 erledigt. Test `test/api.test.js`: zwei createApp()-Instanzen, Anruf über Instanzgrenze, geteilter Zähler. Erst danach Render auf 2 Instanzen. Ergebnis: Eine belegte Entscheidung statt vorsorglicher Komplexität.
**Wo:** `CMM-backend-new/loadtest/` (neu), `app.js` (Z. 36, 54, 274, 410), `lib/rateLimitStore.js` (neu), `routes/{verify,diagnostics,support,waitlist,admin}.js`, `lib/accessGate.js`, `lib/mailer.js` (Z. 28), `lib/appConfig.js` (Z. 87), `models/User.js`, `test/api.test.js`, `test/helpers.js`; `CMM/docs/RUNBOOK.md`
**Aufwand:** M (nur bei Bedarf; Lasttest allein ≈ 5 h)
**Wirkung:** hoch
**Kennzahl:** Lasttest-Ergebnis mit Reserve ≥ 3× Spitzenlast; falls gebaut: Zwei-Instanzen-Test grün, Anruf-Annahmequote bei 2 Instanzen gleich
**Hängt ab von:** Staging (3.2), Klingel-Aufräumer (2.2)

### 3.13 Feature-Flags mit Rollout und Varianten, Experiment-Prozess mit Mindeststichprobe

**Art:** beides
**Was genau:** Auslöser: /app-config-Aufruf, Experiment-Start. Ablauf: `lib/appConfig.js` Flag-Schema {key, enabled, rollout 0–100, variants [{name, weight}], audience {plusOnly, minBuild, platform}} (heute globale Booleans, FLAG-Regex, MAX_FLAGS 30); deterministisches Bucketing sha256(userId+key) % 100 im neuen GET /me/app-config (hinter authenticate) bzw. /app-config liest optional den Bearer-Token (readToken aus `lib/auth.js`) und bucketet nur mit req.auth; ohne Token bleiben globale Flags. GET /app-config ist heute bewusst unauthentifiziert, in `app.js` Z. 89–96 vor der authenticate-Middleware (Z. 124–128) gemountet ("read before sign-in, too"), req.auth existiert dort nicht. Zuweisung in `User.experiments`; App: useFlag()/useVariant() in AppConfigContext (flag() hat heute keinen Aufrufer), Events tragen Variante. GET /admin/experiments: je Flag Varianten × (Nutzer, activatedD7, talks/Nutzer, paywall→Kauf). `docs/EXPERIMENTS.md`: Hypothese, Primärmetrik, Mindestgröße (Paywall-Tests ≥ 200 Views/Woche, Onboarding ≥ 100 Nutzer je Variante, Annahmen), Laufzeit 4 Wochen, Stop-Regel. Rollout-Regel für neue Funktionen 10 → 50 → 100 %. Ergebnis: Preis- und Onboarding-Tests mit Entscheidung statt Bauchgefühl.
**Wo:** `CMM-backend-new/lib/appConfig.js` (Z. 9–10), `app.js` (/app-config Z. 89–96, authenticate Z. 124–128), `lib/auth.js` (readToken), `routes/me.js`, `models/User.js`, `routes/admin.js`, `admin-ui/app.js`; `CMM/contexts/AppConfigContext.tsx` (Z. 24–25), `services/track.ts`, `docs/EXPERIMENTS.md` (neu)
**Aufwand:** M
**Wirkung:** mittel
**Kennzahl:** Experimente mit Entscheidung nach Laufzeit = 100 %; Anteil Releases mit gestuftem Rollout
**Hängt ab von:** Ereignis-Log (3.7)

### 3.14 Qualitative Rückkopplung: Survey/NPS/Löschgründe, Yap-Moment- und Ritual-Lernschleife, Moments als Teilen-Anlass

**Art:** Automatisierung
**Was genau:** Auslöser: 5. Talk, Kontolöschung, CANCELLATION, Yap-Moment-Start, leere Ritualrunde, 1. des Monats. Ablauf: `models/Survey.js` {whoHash (HMAC), kind nps|churn|delete|onboarding|pmf, score, text, at} + POST /survey; NPS-Karte nach 5. Talk (1×/90 Tage), Sean-Ellis-Frage "Wie enttäuscht wärst du ohne die App?" als PMF-Gate, Pflicht-Löschgrund im Lösch-Flow, Churn-Umfrage bei CANCELLATION; Wochenreport zeigt Scores und Freitexte. computeDay: dailyRate (joined / berechtigte Nutzer) je Stunde/Wochentag, Heatmap; `lib/dailyMoment.js` momentFor (heute Math.random 10:00–21:00) gewichtet nach Beteiligung der letzten 4 Wochen (Fenster in AppConfig); Push daily_moment_friend 3 min nach Start; Circle.ritual.emptyRuns mit ritual_empty-Push an Ersteller nach 2 leeren Runden; ritualAttendance, nudgeAnswerRate, callback24h. Moments (CallMoment) als teilbares Bild mit Wasserzeichen und Einladungscode (react-native-view-shot), Monatsrückblick am 1. aus `lib/stats.js` als Push. Ergebnis: Das Produkt lernt aus Beteiligung, nicht aus Zufall.
**Wo:** `CMM-backend-new/models/Survey.js` (neu), `routes/support.js`, `routes/plus.js`, `lib/dailyMoment.js` (momentFor Z. 19), `lib/circles.js` (tickRituals Z. 233, endStaleRooms Z. 180), `models/Circle.js`, `lib/notify.js`, `lib/metrics.js`, `lib/stats.js`; `CMM/features/status/StatusView.tsx`, `features/profile/ProfileView.tsx`, `features/circles/CircleView.tsx`, `features/plus/YearReviewView.tsx`
**Aufwand:** M
**Wirkung:** mittel
**Kennzahl:** NPS; Anteil "sehr enttäuscht" > 40 % (PMF); Yap-Moment-Teilnahmequote; Ritual-Räume mit Talk / fällige Rituale; geteilte Moments mit Code → Beitritte
**Hängt ab von:** Hash-Pepper (2.8), Wochenreport (2.11)

### 3.15 Hiring-, Partner- und IP-Rahmen: Rollenreihenfolge, Vertragsvorlagen, KSK, IP-Inventar

**Art:** Prozess
**Was genau:** Auslöser: vor dem ersten Creator-Anschreiben und vor der ersten zweiten Person. Ablauf: `docs/HIRING.md`: Rollenreihenfolge (1. Campus-Werkstudent 10 h/Woche für Seed-Cluster, 2. Support-Freelancer, 3. Entwickler erst bei Deckungsbeitrag > 0), Vorlagen Freelancer-Vertrag mit Rechteübertragung + NDA, Werkstudentenvertrag, Onboarding = SERVICES.md-Spalte "Zugang gewähren/entziehen", Offboarding = Secrets rotieren. `docs/PARTNERS.md`: Creator-Vereinbarung (1 Seite: Vergütung in Plus-Tagen bis X aktivierte Nutzer, darüber Geld; Kennzeichnungspflicht § 5a UWG/MStV; Nutzungsrechte für Reposting; Laufzeit), Hochschul-Kooperationsvorlage (AStA/Fachschaft, Sponsoring-Regeln, Datenschutzhinweis auf Flyern), Textbausteine; PartnerCode um agreementSignedAt und payoutEur erweitern, damit die Konsole Kosten je aktiviertem Nutzer zeigt; Künstlersozialabgabe bei Creator-/Designer-Honoraren mit dem Steuerberater prüfen. IP-Inventar (Repos, Marke, Domains, Content, Musik-Lizenzen aus `marketing/music.js`) als Anlage für die Rechtsform-Entscheidung (4.5). Ergebnis: Keine Zahlung an Dritte ohne Vertrag.
**Wo:** `CMM/docs/HIRING.md` (neu), `docs/PARTNERS.md` (neu), `marketing/PLAYBOOK.md`; `CMM-backend-new/models/PartnerCode.js`, `admin-ui/app.js`
**Aufwand:** S (≈ 5 h, Vorlagen ggf. vom Anwalt)
**Wirkung:** mittel
**Kennzahl:** Partner ohne unterschriebene Vereinbarung = 0; Kosten je aktiviertem Nutzer je Partner; IP-Inventar vollständig (ja/nein)
**Hängt ab von:** Bezahlte Reichweite Stufe 1 (PartnerCode, 3.5)

## Phase 4: Plattform verbreitern, Team- und Übergabefähigkeit, Autonomie (Mai bis September 2027, ≈ 22 Wochen)

**Ziel:** Android in Produktion, falls das Phase-3-Gate es ergab. Ads per API mit Auto-Stopp. SLOs mit Fehlerbudget. Eine zweite Person übernimmt Release, Support und Freigaben nach Docs. Rechtsform, Apple-Organisationskonto und IP-Übertragung passen zum Umsatz. Archiv nur nach echter Anonymisierung.

**Übergang/Abschluss, wenn:** Android-Nordstern ≥ iOS − 5 Punkte nach 8 Wochen (falls gestartet); SLO-Erfüllung 30 Tage; Bus-Faktor ≥ 2 für Betrieb und Release; Investor-Reporting exportierbar; MRR ≥ monatliche Fixkosten bei ≈ 10.000 MAU und ≈ 300 Abos (Annahmen).

**Schnittlinie:** Android-Parität (wenn Gate grün, sonst Ads-API), Team-Fähigkeit, SLOs.

**Stundenbudget:** ≈ 330 h (22 Wochen × 15 h); Android allein ≈ 120 h.

### 4.1 Android-Parität, gestaffelt, nur über Gate

**Art:** Automatisierung
**Was genau:** Startbedingung: Ergebnis von 3.11 (> 30 % Android unter eingeladenen Kontakten, iOS-Aktivierung ≥ 35 %, Deckungsbeitrag je MAU > 0 oder Pfad dahin beschlossen). Variante (b) Audio-only-Android ist als erste Stufe ausdrücklich zulässig (L statt XL): FCM Full-Screen-Intent, Agora Audio, Play Billing, kein HD-Video. Meilensteine: (1) Firebase-Projekt + google-services.json (fehlt heute), Push-Kanal 'calls' (Full-Screen-Intent, Klingelton), `lib/push.js` sendet Datenpush priority high statt VoIP; (2) eingehender Anruf über react-native-callkeep selfManaged ConnectionService (Manifest hat heute 0 `<service>`) oder Full-Screen-Activity + Foreground Service für Agora; (3) RevenueCat Android-Key in `eas.json`, Play Billing, Produkt-IDs, purchasesAvailable() für Android (heute nur iOS); (4) `eas.json` production/android, `android-build.yml` (AAB → Internal → Closed Testing mit Android-Warteliste → Staged Rollout 10/50/100 %), Play Data Safety; (5) users.byPlatform in computeDay, minBuild je Plattform, Testmatrix Android. Ergebnis: Gemischte Freundeskreise werden vollständig.
**Wo:** `CMM/android/app/src/main/AndroidManifest.xml`, `android/app/google-services.json` (fehlt), `app.config.js` (android Z. 38–58), `eas.json` (nur manual-apk), `services/PlatformCallAdapter.ts` (Z. 59–67), `services/purchases.ts` (Z. 26), `.github/workflows/android-build.yml` (neu), `docs/TESTMATRIX.md` (aus 4.2); `CMM-backend-new/lib/push.js`, `lib/appConfig.js`, `lib/metrics.js`
**Aufwand:** L (Audio-only) bis XL (Parität), ≈ 120 h
**Wirkung:** kritisch
**Kennzahl:** Android-Anteil an Neunutzern; Aktivierung D7 Android ≥ iOS − 5 Punkte; Dichte-Anstieg in gemischten Freundeskreisen; Anruf-Zustellquote je Plattform
**Hängt ab von:** Android-Entscheidung (3.11), Deckungsbeitrag > 0 (2.5), Staging (3.2), Sentry nativ (2.1)

### 4.2 Team-Fähigkeit: Architekturdoku, Hotspots zerlegen, Anruflogik-Tests, Testmatrix, Shadow-Ops

**Art:** beides
**Was genau:** Auslöser: vor der ersten zweiten Person mit Code-Zugang. Ablauf: `docs/ARCHITECTURE.md` (Anruffluss Socket → Call → VoIP-Push → CallKit → Agora, Jobs, Datenmodelle, TTLs, Leader), `docs/adr/`. `admin-ui/app.js` (1.996 Zeilen) in Tab-Module, `routes/admin.js` (875) nach Domäne, `app/videocall.tsx` in Hooks (useAgoraSession, useCallTimer). @testing-library/react-native: NewCallContext (ringing/accepted/ended, doppelte Events), AppConfigContext (outdated, useVariant), CallNotificationService-Payload; heute gibt es fünf Jest-Dateien in `CMM/tests/` (callStateManager, phone, formatting, reviewPrompt, routes, Preset jest-expo), nichts davon testet NewCallContext, AppConfigContext oder CallNotificationService, die Anruf-Integration ist ungetestet. jest --coverage mit Schwelle ab Ist-Wert +5 %/Monat; Backend node --test --experimental-test-coverage + eslint. `docs/TESTMATRIX.md` als Pflichtfeld im PR-Template (Annehmen/Ablehnen Vordergrund+Sperrbildschirm, verpasst, Push bei geschlossener App, Moment, Kreis-Runde, Plus-Sandbox, Konto löschen); Maestro-Flows nächtlich auf Simulator-Build gegen Staging. CODEOWNERS für ios/, PlatformCallAdapter.ts, NewCallContext.tsx, lib/calls.js, socket.js, lib/push.js. Prozess: die zweite Person arbeitet eine Woche Shadow-Ops (Alarme, Support, Release) nach `docs/OPERATIONS.md`; Bereitschaftsplan. Ergebnis: Jemand anderes kann einen Release fahren.
**Wo:** `CMM/docs/ARCHITECTURE.md` (neu), `docs/adr/`, `docs/TESTMATRIX.md` (neu), `docs/OPERATIONS.md` (neu), `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS` (neu), `tests/`, jest-Config, `.maestro/` (neu), `app/videocall.tsx`; `CMM-backend-new/admin-ui/`, `routes/admin*.js`, `eslint.config.js` (neu), `.github/workflows/test.yml`
**Aufwand:** L
**Wirkung:** hoch
**Kennzahl:** Coverage-Trend (Anruflogik > 60 %, Annahme); Zeit bis erster produktiver PR einer neuen Person < 1 Woche; Bus-Faktor ≥ 2 für Release
**Hängt ab von:** Hiring-Rahmen (3.15), RUNBOOK/SERVICES (1.8)

### 4.3 SLOs, Fehlerbudget, Lasttest-Wiederholung und Kapazitätsregeln, Statusseite

**Art:** beides
**Was genau:** Auslöser: Snapshot; quartalsweiser Lasttest; Budget-Sprung. Ablauf: `docs/OPS.md` mit drei SLIs: API-Verfügbarkeit (extern), Anruf-Verbindungsrate (/calls/quality), Push-Zustellrate (1 − failed/sent); Startwerte 99,5 %/90 %/98 % (Annahmen, nach 4 Wochen justieren); Kachel "SLO 30 Tage" in admin-ui; Regel: Budget verbraucht → nächste Woche nur Stabilität. Lasttest-Erstlauf ist in 3.12 passiert; hier quartalsweise Wiederholung (1.000/5.000/20.000 Sockets, Yap-Moment-Tick, broadcastStatus-Fan-out, contacts/match mit 5.000 Hashes) und vor jedem Budget-Sprung; Schwellen als Eintrag im RUNBOOK "Kapazität" (ab X Sockets/Instanz zweite Instanz, ab Y Ops/s Atlas-Tier hoch, Redis nur wenn Mongo-Adapter messbar limitiert); retention() auf vorberechnete Kohorten-Docs. Statusseite über den Uptime-Anbieter ab > 1.000 aktiven Nutzern (Annahme). Kostenkurve je Skalenstufe in FINANCE.md. Ergebnis: Stabilität vs. Feature ist eine Regel, kein Streit mit dir selbst.
**Wo:** `CMM-backend-new/loadtest/`, `lib/metrics.js` (retention Z. 256), `admin-ui/app.js`; `CMM/docs/OPS.md` (neu), `docs/RUNBOOK.md`, `docs/FINANCE.md`
**Aufwand:** M
**Wirkung:** hoch
**Kennzahl:** SLO-Erfüllung 30 Tage; Fehlerbudget-Verbrauch; Kapazitätsreserve ≥ 3× Spitzenlast
**Hängt ab von:** Anrufqualitäts-Telemetrie (3.8), Staging (3.2)

### 4.4 Bezahlte Reichweite Stufe 2: Ads-APIs mit Budget-Reservierung und Auto-Stopp

**Art:** Automatisierung
**Was genau:** Voraussetzung: Stufe 1 zeigt ≥ 8 Wochen LTV/CAC > 3. Auslöser: Kampagne freigeben, täglicher Job. Ablauf: `lib/ads.js`: Meta Marketing API (Spark Ad/Boost aus Instagram-Media-ID der Top-Videos) und TikTok Business API; jede Kampagne reserviert über marketingBudget.reserve mit eigenen Caps je Provider; täglicher Job holt spend/impressions/clicks in MarketingSpend/StoreDaily; Kampagne pausiert automatisch, wenn CAC (aktiviert, 7 Tage) > `AppConfig.goals.maxCac` oder Kohorten-Aktivierung < 30 %; du gibst Kampagnen weiterhin frei, Budget-Erhöhung nur per Wochenreview. Ergebnis: Media-Spend mit Auto-Stopp statt Nachtschicht.
**Wo:** `CMM-backend-new/lib/ads.js` (neu), `lib/marketingBudget.js`, `models/MarketingSpend.js`, `index.js`, `lib/alerts.js`, `admin-ui/app.js`
**Aufwand:** L
**Wirkung:** hoch
**Kennzahl:** eurPerActivated je Kampagne vs. maxCac; automatisch pausierte Kampagnen; Anteil Paid-Kohorte mit ≥ 3 Kontakten
**Hängt ab von:** Stufe 1 mit ≥ 8 Wochen Daten (3.5)

### 4.5 Rechtsform, Apple-Organisationskonto, Stop-Loss und DACH-Feinschliff

**Art:** Prozess
**Was genau:** Versicherung ist seit 2.7 da. Auslöser: MRR ≥ monatliche Fixkosten oder Investoren-/Creator-Verträge (Annahme); Quartalsreview. Ablauf: Wechsel zu UG/GmbH; Impressum (`legal.ts` OPERATOR), App Store Connect, RevenueCat, Render auf die Gesellschaft; IP-Übertragung per Einbringungsvertrag anhand des IP-Inventars (3.15); USt/Reverse-Charge fixiert. Apple-Kontotyp-Roadmap in `docs/APPLE.md` (D-U-N-S aus 1.7, Organisationskonto, App-Transfer mit Prüfung von Abos, Passkeys, Universal Links; Review-Rejection-Checkliste 5.1.1 Kontakte, 2.1 Demo-Login, 3.1.2 Abo-Texte mit Standardantworten, Expedited-Review-Kriterien; die Doku-Teile schon in Phase 1 Woche 3 schreiben, 2 h). Stop-Loss/Pivot-Kriterium in `docs/DECISIONS.md`, quartalsweise geprüft: bleibt Aktivierung nach 6 Monaten Lifecycle-Betrieb unter 25 % oder Free→Paid unter 1 % bei ≥ 500 MAU, wird das Erlösmodell geprüft (Campus-/Gruppenlizenz, Kreis-Plus, Sponsoring) statt weiter zu skalieren. DACH: `User.locale` aus Accept-Language (seit 1.11 gemessen); regionOf (`lib/phone.js` Z. 9–13) leitet die Region schon heute aus der eigenen E.164-Nummer ab, AT/CH-Nutzer bekommen also AT/CH für Kontakte ohne Ländervorwahl, FALLBACK_REGION 'DE' greift nur für tokenlose Requests: diesen Fallback prüfen bzw. nach Entfernen der Legacy-Zweige (1.5) entfallen lassen; Feiertage AT/CH im Yap Moment, users.byRegion; echte i18n erst bei ≥ 5 % Nicht-DACH-Neunutzern. Ergebnis: Privathaftung endet, Konten gehören der Firma.
**Wo:** `CMM/content/legal.ts`, `docs/FINANCE.md`, `docs/COMPLIANCE.md`, `docs/DECISIONS.md`, `docs/APPLE.md` (neu); `CMM-backend-new/lib/phone.js` (FALLBACK_REGION Z. 3), `lib/auth.js`, `lib/metrics.js`, `models/User.js`
**Aufwand:** M
**Wirkung:** mittel
**Kennzahl:** Privathaftung beendet; Steuerfristen 12/12; Neunutzer und Aktivierung je Region
**Hängt ab von:** IP-Inventar (3.15), D-U-N-S (1.7)

### 4.6 Kennzahlen dauerhaft, dokumentiert, exportierbar; Archiv im Einklang mit Datenschutz

**Art:** Automatisierung
**Was genau:** Auslöser: täglicher Leader-Job nach runSnapshots; monatlicher Export. Ablauf: `lib/archive.js` exportiert ablaufende Rohdokumente (Call 30 d, PushDecision 3 d, Nudge, DailyMoment 60 d, Event) nur nach echter Anonymisierung (Aggregate je Tag/Kohorte oder k-Anonymität ≥ 5) als JSONL nach R2/B2 vor der TTL; kein Hash-JSONL; Zweckbindung, AVV und Aufnahme in COMPLIANCE.md/Datenschutzerklärung vor Aktivierung. TTL-Verlängerung auf 3 Jahre nur für aggregierte Daten; Hash-Zeilen (HMAC) bleiben personenbezogen und im Löschpfad. `docs/METRICS.md` je Kennzahl Definition, Quelle, Owner, Ziel, Verzerrung ("aktiv" = foreground). Investor-/Beirats-Reporting: Monatsupdate-Vorlage (Zahlen aus Wochenreport, 3 Learnings, 1 Ask) läuft seit Phase 2 an Mentoren/Beirat; hier nur Export (MetricsDaily, Kohorten, MonthlyFinance) mit Definitionen als Datenraum-Grundlage und Read-only-DB-User für Atlas Charts. Ergebnis: Keine Kennzahl ohne Definition, kein Archiv mit Personenbezug.
**Wo:** `CMM-backend-new/lib/archive.js` (neu), `models/Talk.js` (Z. 18), `models/ActiveDay.js` (Z. 13), `routes/admin.js`; `CMM/docs/METRICS.md` (neu), `docs/COMPLIANCE.md`, `content/legal.ts`
**Aufwand:** M
**Wirkung:** mittel
**Kennzahl:** Anteil Kennzahlen rückwirkend neu berechenbar; 0 Kennzahlen ohne Definition; Monatsreport an Beirat/Investoren 12/12
**Hängt ab von:** Hash-Pepper (2.8), Buchhaltung (3.9)

### 4.7 E-Mail als zweiter Kanal mit Double-Opt-in, Win-back, Wartelisten-Nachfass

**Art:** Automatisierung
**Was genau:** Erst jetzt, weil Push-Öffnung und Deinstallationen (tokensRemoved) seit Phase 2/3 gemessen sind. Auslöser: 3. Gespräch oder Rückblick; 30/60 Tage ohne Push-Token; 7/21 Tage nach Launch-Mail. Ablauf: Optionales E-Mail-Feld mit eigener Einwilligung (Token-Flow und layout() aus `lib/waitlist.js` wiederverwenden; Modell UserEmail {phoneHash (HMAC), email, confirmedAt}, im Löschpfad), abgefragt nach 3. Gespräch oder beim Rückblick ("Dein Rückblick per Mail"); Win-back-Mails 30/60 Tage ohne Push-Token aus `lib/lifecycle.js`; List-Unsubscribe; Warteliste: Nachfass 7/21 Tage nach Launch-Mail an Einträge ohne claimedBy. Datenschutz über PRIVACY-CHANGE.md-Checkliste. Ergebnis: Ein Kanal, der auch nach Deinstallation erreicht.
**Wo:** `CMM-backend-new/models/UserEmail.js` (neu), `lib/waitlist.js`, `lib/lifecycle.js`, `lib/mailer.js`, `routes/me.js`; `CMM/features/profile/ProfileView.tsx`, `content/legal.ts`
**Aufwand:** L
**Wirkung:** mittel
**Kennzahl:** E-Mail-Opt-in-Quote; Rückkehrquote nach Win-back-Mail; Warteliste→App-Quote nach Nachfass
**Hängt ab von:** Lifecycle-Engine (2.3), Push-Wirksamkeit (3.7)

### 4.8 Kreis-/Family-Plus als Experiment (nur bei belegter Nachfrage)

**Art:** beides
**Was genau:** Auslöser: plusInterest.features 'family' > 15 % der Interesse-Signale (Annahme) und limitHits bei circleMembers/roomMinutes dominieren. Ablauf: Produkt wannayap_plus_circle (Ersteller zahlt, Mitglieder bekommen Kreis-Limits) über `lib/plan.js` planOfPhone mit circle-scope, Paywall-Variante im Kreis-Kontext, 8 Wochen als Offering-Experiment; sonst bleibt es bei Family Sharing (2.6). Ergebnis: Ein zweites Produkt nur, wenn Nutzer danach gefragt haben.
**Wo:** `CMM-backend-new/lib/plan.js`, `routes/plus.js` (PRODUCT_IDS Z. 17, INTEREST Z. 15), `routes/circles.js`; `CMM/features/plus/PlusView.tsx`, `services/planApi.ts`; App Store Connect, RevenueCat
**Aufwand:** L
**Wirkung:** mittel
**Kennzahl:** ARPPU-Steigerung; Kreis-Plus-Conversion je Kreis mit ≥ 6 Mitgliedern
**Hängt ab von:** Paywall-Funnel (2.6), Experimente (3.13)

## Automatisierungslandkarte

| Bereich | Heute automatisch | Heute manuell | Ziel |
|---|---|---|---|
| Infrastruktur, Deployment, Skalierung | CI in beiden Repos, Render Auto-Deploy von main, EAS-Build + TestFlight per Action, Leader-Lease mit SIGTERM-Übergabe, TTL-Indizes, Kill-Switch (minVersion/minBuild/Banner), Push-Receipts/Token-Hygiene | Kein /healthz, kein unhandledRejection-Handler, kein Uptime-Check, kein Backup-Nachweis, keine Staging-Umgebung, keine render.yaml, keine Tags/Changelog, kein OTA-Publish, Socket.IO ohne Adapter, 8 In-Memory-Limiter (7 Aufrufstellen), Ring-Timer im Prozess, migrate() bei jedem Start, Startup-Replay aller Calls | P1: /healthz + Monitor + Backup/Restore + Branch-Schutz + Node-Pin; P2: Klingel-Aufräumer, OTA-Workflow, Tags, Changelog; P3: Staging + render.yaml + smoke.yml, Migrationsrunner, Dependabot/gitleaks, k6-Lasttest als Entscheidung über Adapter + Rate-Limit-Store; P4: SLOs mit Fehlerbudget, Kapazitätsschwellen |
| Beobachtbarkeit, Alarme, Incidents | JS-Crash-Reports ohne SDK, /api/push-health, Admin-Web-Push Kind 'alerts' (einziger Auslöser: Wartelisten-Mailausfall, `lib/waitlist.js` Z. 137), Posting-Fehler-Push über Kind 'posting' (`lib/socialPosting.js` Z. 477) | Health-Check nach Deploy von Hand, Render-Logs unstrukturiert, native Crashes nur in Xcode Organizer, kein Runbook, kein Postmortem, kein Datenpannen-Prozess | P1: lib/alerts.js mit Alarmliste + Mail + SMS, RUNBOOK, EMERGENCY; P2: Sentry nativ + Backend, Störungs-Banner, Doku-Drift-Tests, Postmortem-Vorlage, INCIDENTS.md; P3: pino-Logs mit Sink, System-Tab, Anrufqualität, VoIP→Klingeln-Metrik; P4: SLO-Kachel, Statusseite ab 1.000 Nutzern |
| Sicherheit und Identität | Blocklist bei Anruf, BannedNumber bei Sign-in und Token-Prüfung, Passkeys/TOTP in der Konsole, Audit-Log | startCall ohne Kontaktprüfung, Legacy-Auth-Zweige noch im Code (AUTH_REQUIRED laut RELEASE.md gesetzt, per /api/push-health prüfen), /contacts/match nur hinter dem globalen Limiter und mit Klartextnummer, SHA-256 ohne Pepper, Upsert auf Nummer, kein security.txt, kein Threat Model | P1: Anrufe nur an Kontakte, Legacy-Zweige entfernt, Match entschärft; P2: HMAC-Pepper + Löschpfad, Nummern-Recycling, Geräteliste, Logout-all; P3: security.txt, THREATMODEL.md, Admin-Härtung, Pentest als Gate-Haken |
| Monetarisierung und Finanzen | Plan-Limits mit Enforcement, Paywall mit Offerings/Kauf/Restore, RevenueCat-Webhook mit Secret und Stale-Schutz, Referral-/Wartelisten-Geschenke, Admin-Grant mit Audit, Marketing-Budget-Deckel | Webhook verwirft Preis/Währung/Event-ID, ignoriert TRANSFER, trennt Sandbox nicht; kein MRR/Churn/Conversion; keine Kosten je Dienst; kein Trial, kein Dunning, kein Win-back; kein Gewerbe, keine Buchhaltung, kein Apple-Abgleich, kein Cash-Plan | P1: SubscriptionEvent + Sync-Fallback, SMS-Deckel, Referral nach Aktivierung, KI-Spend-Limits, Gewerbe/Konto/Steuerberater/Credits/Small Business Program; P2: MRR/Churn/Conversion, plus-reconcile, Trial/Grace/Dunning, Apple Server Notifications, Kostenzähler + Deckungsbeitrag, Export-Familie, Video-Default-Entscheidung; P3: finance.yml, reconcile-apple, MonthlyFinance mit Runway, CAC/LTV, Gate im Code; P4: Rechtsform, Investor-Export, ggf. Kreis-Plus |
| Wachstum, Marketing, Attribution | Marketing-Agent täglich + Hero Di/Fr mit Budget-Reservierung, Auto-Posting mit Token-Refresh, Landing-Funnel je utm bis "gelesen", Warteliste mit Double-Opt-in und Launch-Mail, Kohorten-Metriken mit Aktivierung und k | Store-Link null, Einladungslink ohne Code, keine Post-Insights, keine ASC-Analytics, keine Attribution nach dem Store-Klick, kein Kampagnen-Objekt, kein CAC, Creator/Campus/Presse nur Playbook-Text, Aktivierungs-Gate nur Text, Modell-IDs/Preise im Agenten-Code | P1: Store-Link + Store-Klick, Einladungscode + InviteVisit + claim, Nordstern-Ampel, Seed-Cluster-Plan, Nutzerforschung; P2: Herkunftsfrage, Campaign-Objekt, Post-Insights im Agenten, Hook-Varianten, Bio-Slug, Wochenreport; P3: ASC-API, CAC/LTV, Gate in reserve(), Paid Stufe 1, Creator/Campus mit PartnerCode und Vertrag; P4: Ads-API mit Auto-Stopp |
| Aktivierung, Bindung, Lifecycle | 14 reaktive Push-Typen mit Prefs/Quiet Hours/Cap 10, Yap Moment, Rituale, Nudges mit Cooldowns und 20/Tag je Absender, Moments-Unlock mit 19-Uhr-Erinnerung, Badges, Referral-Push, Einlader-Push beim Beitritt, Bewertungs-Prompt | Kein Onboarding-Push Tag 1/3/7, keine Rückholung Inaktiver, kein Plus-Ablauf-Hinweis, keine Push-Öffnungsmessung, kein Onboarding-Funnel, kein Berechtigungsstatus serverseitig, Lonely-Zustand nur lokal, Flags ohne Aufrufer, keine Experimente, keine Umfragen | P1: Meilensteine + Aktivierung + Dichte im Tages-Push; P2: Lifecycle-Engine mit eigenem Cap, Aha-Karte, Re-Match, Geschenk-Budget; P3: Ereignis-Log ab 200 WAU, Push→Anruf-Quote, Flags mit Rollout/Varianten + EXPERIMENTS.md, Survey/NPS/PMF, Yap-Moment-/Ritual-Lernschleife; P4: E-Mail-Kanal, Monatsrückblick |
| Support, Moderation, Recht, Compliance | Support-Tickets mit Push, Reports mit Auto-Hide ab 3 Meldern, Sperren mit sofortiger Durchsetzung, Audit-Log, DSGVO-Export/-Löschung Self-Service, TTL-Löschfristen, Demo-Login für Review | Ein Owner ohne Weg zu weiteren Admins, keine SLA/Vorlagen/Hilfeseiten, kein Bans-Register, kein DSA-Meldeweg, keine eigenen AGB, kein Mindestalter, Datenschutz "Entwurf", keine AVV-Tabelle, keine Bildmoderation, Ban löscht sofort, kein Incident-Prozess, keine Marke, keine Versicherung, ActiveDay nicht im Löschpfad | P1: /admin/admins, SERVICES/RUNBOOK/EMERGENCY, Datenschutz final, 16+, PRIVACY-CHANGE.md, Markenrecherche, REVIEW_UNTIL; P2: AGB, DSA-Kontaktpunkt, /melden, Trader-Status, COMPLIANCE.md komplett, INCIDENTS.md, Versicherung, Gate-Checkliste, Löschpfad komplett; P3: aws_rek, autoSuspend, Report-Limits, Quarantäne mit Evidence, Bans-Register, moderation-sla, Support-Auto-Eingang/Vorlagen//hilfe, HIRING/PARTNERS; P4: UG/GmbH, OPERATIONS.md mit Vertretung |
| Analytik, Kennzahlen, Experimente | Tages-Snapshots (MetricsDaily), ActiveDay-Hashes, Wochenkohorten mit Retention/Aktivierung/k, Tageszahlen-Push, Versionsverteilung, Landing-Funnel, Plus-Bestand | Kein Ereignis-Log, keine Verhältniskennzahlen, Export nur für die Warteliste (CSV, /admin/waitlist/export), keine Exporte für MetricsDaily, Plus, Support, Marketing-Spend, kein Wochenreport, Rohdaten verfallen nach 3–60 Tagen (Call 30 d, PushDecision 3 d, DailyMoment 60 d, ClientError 30 d), Talk und ActiveDay nach 400 Tagen (`models/Talk.js` Z. 18, `models/ActiveDay.js` Z. 13), Report nach 180 Tagen, neue Snapshot-Felder werden nicht nachgerechnet, "aktiv" = jeder Request, keine Kennzahl-Definitionen, keine Tests für Kohorten-Mathematik | P1: Nordstern/Dichte im Tages-Push mit Ampel, 5 Nutzergespräche/Woche; P2: MetricsDaily.version, test/metrics.test.js, Funnel je Kohorte, Dichte-Histogramm, Wochenreport, Export-Familie; P3: StoreDaily, MonthlyFinance, /events mit ActiveDay.kind foreground, Mindeststichproben-Regel; P4: Archiv nur anonymisiert, METRICS.md, Investor-Export, Atlas Charts read-only |
| Plattform-Reichweite (Android, DACH, Web) | Web-Build für Landing/Rechtsseiten/Einladungs- und Kreis-Links, Universal Links, Dev/Prod-Varianten | Android nur Gerüst (0 `<service>`, keine google-services.json, kein Android-Build/Submit-Profil, Käufe nur iOS), keine i18n, Zeitzone und Telefon-Region kommen je Nutzer aus Gerät bzw. eigener Nummer, nur die Defaults (Europe/Berlin in `lib/localTime.js` Z. 5, 'DE' für tokenlose Requests) sind fest, kein Android-Bedarfsmesser, expo export baut alle 27 Screens mit | P1: Android-Warteliste auf /einladung mit Plattform-Zählung je Einlader, Locale-Messung, ADR i18n; P2: androidFriends im Onboarding, Web-Routen begrenzen (2.16); P3: Android-Entscheidung über Dichte-Gate (Parität/Audio-only/warten); P4: Android nach Gate, DACH-Feinschliff (tokenloser Fallback, Feiertage, byRegion); keine i18n und keine Web-Anrufe in diesen 12 Monaten |

## Betriebsrhythmus

Alles, was hier "automatisch" heißt, ist ein Job, eine Action oder ein Alarm. Dein Anteil ist der genannte Zeitslot. "(ab P2)" heißt: existiert erst ab der Phase.

| Takt | Was | Automatisiert durch |
|---|---|---|
| Laufend (alle 1–30 Minuten) | Externer Monitor auf /healthz, /api/push-health, wannayap.app, AASA. Alarmregeln siehe 1.10 und RUNBOOK Abschnitt "Alarme". Du: nur bei Alarm, Reaktion nach RUNBOOK-Anker. | Uptime-Anbieter (Free-Tier) + `lib/alerts.js` als Leader-Job alle 30 min; Reaktion manuell nach RUNBOOK, Vertretung laut OPERATIONS.md (ab P4) |
| Täglich (Jobs automatisch; du 10 Minuten am Morgen) | 08:00 Tages-Push + Mail mit Quittungs-Link (dailyHour je Admin, heute Default 20; Umbau in 1.12; Dead-Man-Regel: 7 Tage ohne Quittung → Mail an Vertrauensperson): Zahlen von gestern (neue Nutzer, aktiv, Gespräche), Aktivierung 4 W mit Ampel und Dichte (ab P1), Store-Klicks, Alarme der Nacht, überfällige Tickets; ab P2 +Plus/−Plus/MRR, Kosten gestern, SMS je Registrierung. Jobs: Marketing-Agent 04:07 UTC, Auto-Posting 12/18 Uhr, Snapshots alle 30 min; ab P2 Lifecycle alle 30 min, plus-reconcile nachts, Post-Insights alle 6 h; ab P3 App-Store-Report, moderation-sla; ab P4 Archiv-Export. Du: Alarme quittieren, Entwürfe freigeben, Tickets mit Frist heute mit Vorlage beantworten. | `index.js` Leader-Jobs, `lib/adminPush.js` daySummary, `marketing-agent.yml`; menschlicher Anteil ≤ 10 min/Tag |
| Montag 08:00 (30 Minuten) | P1: 30-Minuten-Review der Tages-Pushes und der Research-Notizen, Seed-Cluster-Ziel 30 Registrierungen/Woche prüfen, 5 Nutzergespräche terminieren (Kalenderlink). Ab P2: Wochenreport (Mail + Push) als Verdichtung des Tages-Pushes: Nordstern vs. 40 %, Dichte, WAU WoW, Kohorten W1/W4, Einladungs-Funnel und k, Push-Opt-in, MRR/neu/gekündigt/Trial-Conversion, CAC je Kanal und LTV/CAC (ab P3), Top-3/Flop-3 Videos, Top-5 Crashes, Support-Tags, Survey-Scores (ab P3), SLO-Stand (ab P4), Gate-Checkliste, Gespräche geführt/Woche. Beim Quittieren Pflichtfeld "Stunden Betrieb (Alarme/Support/Freigaben)". Genau drei Entscheidungen (Kanal +/−, Hook-Thema in `AppConfig.marketingNotes`, Budget/Preis/Experiment) in `docs/DECISIONS.md`. Zusätzlich: Dependabot-PRs mergen (ab P3), Bio-Link-Slug wechseln (ab P2), ab P3 zehn Creator/Campus-Kontakte anschreiben (nur mit Vereinbarung). | Report: `lib/adminPush.js` weeklyDue + `lib/mailer.js` (ab P2); Entscheidung, Gespräche und Kontakte manuell |
| Freitag (20–30 Minuten) | Support-/Produkt-Triage: Tickets taggen, Top-Themen als GitHub Issues 'aus-support', Research-Notizen der Woche sichten (`docs/RESEARCH.md`), Löschgründe/NPS sichten (ab P3), Meldungs-Rückstand prüfen, Budget-Auslastung der Woche, Datenschutz-Haken offener PRs prüfen. Release-Train: Build/OTA der nächsten Woche planen, Testmatrix-Protokoll, Phased Release und minBuild nach den Regeln in `docs/RELEASE.md`, Demo-Login mit REVIEW_UNTIL deaktivieren. | Digest, Überfälligkeits-Alarme, Build/Tag/Smoke/CHANGELOG (ab P2/P3) automatisch; Triage und Store-Einreichung manuell |
| Monatlich am 1. und bis zum 5. (30 + 60 + 45 Minuten) | Ab Monat 1: Belege-Ritual 30 min: Rechnungen Render/Atlas/Twilio/Agora/Cloudinary/Expo/Anthropic/Google in der Belege-Inbox prüfen, an Steuerberater/Buchhaltungstool, Credits-Stand in `docs/FUNDING.md`. Am 1. (ab P2): ASO-Runde, Push-Texte und Caps gegen Wirkung prüfen, Plan-Limits anhand limitHits justieren, ein Preis-/Paywall-Experiment starten oder auswerten (max. eines je 4 Wochen, nur bei Mindeststichprobe, ab P3); Monatsupdate (Zahlen, 3 Learnings, 1 Ask) an Mentoren/Beirat. Bis 5. (ab P3): finance.yml hat Apple Financial Report geholt, reconcile-apple.js abgeglichen; `AppConfig.prices`/fixedCosts nachziehen, GuV-Tab und Runway prüfen. | Exporte, Abgleich, GuV-Aggregation, Experiment-Auswertung automatisch (ab P2/P3); Buchung und Entscheidung manuell bzw. Steuerberater |
| Quartalsweise (halber Tag) | Restore-Übung (Snapshot in temporären Cluster bzw. Staging, `npm test` gegen Restore-URI), Notfallzugang des zweiten Owners testen, Testcode über Verify-Zweitweg (WhatsApp, ab P3 Zweitanbieter), k6-Lasttest gegen Staging und Kapazitätsschwellen aktualisieren (ab P3), Datenpannen-Trockenübung nach INCIDENTS.md (ab P2), Atlas Performance Advisor, Expo-SDK-Upgrade als eigener Branch mit TestFlight-Runde, Secrets/Pepper-Rotation nach Kalender, Ziele des nächsten Quartals in `AppConfig.goals`, Gate-Entscheidungen (nächster Campus, Android-Gate-Werte, Budget-Stufe) mit Stop-Loss-Prüfung in DECISIONS.md. | Erinnerung per Routine/GitHub-Issue; Backup-Dump wöchentlich und Lasttest-Skript automatisch; Durchführung manuell |
| Halbjährlich/jährlich | Datenschutz- und AVV-Review, Nutzungsbedingungen-Version, APNs-VoIP-Key/Agora-Zertifikat/JWT (erst mit JWT_SECRETS-Liste und kid), Anthropic/Google-Keys rotieren (SERVICES.md), Apple Membership, Domain, Marke, Versicherung verlängern, Vollmacht aktualisieren; SERVICES.md-Ablaufdaten mit 30-Tage-Vorwarnung; Rechtsform prüfen. | Erinnerungen und Token-/Zertifikatsablauf-Alarme automatisch; Inhalte manuell mit Anwalt/Steuerberater |
| Je Release (wöchentlicher Release-Train) | PR-Template, CI-Tests, Staging-Test (ab P3), `ios-build.yml` → TestFlight + Tag; Regeln siehe `docs/RELEASE.md` (2.16). | Build, Tag, Smoke, CHANGELOG, OTA-Publish automatisch; Einreichung, Testmatrix und Phased-Release-Entscheidung manuell nach `docs/RELEASE.md` |

## Unit Economics und Cash-Plan

Alle Zahlen in diesem Abschnitt sind Annahmen aus öffentlichen Preislisten (Stand 2026) und Erfahrungswerten, bis Rechnungen und Kontoauszüge in `AppConfig.prices`, `AppConfig.fixedCosts` und `docs/FINANCE.md` stehen. Die Rechnung steht hier, damit du sie ab Phase 2 mit Messwerten ersetzen kannst, nicht damit du sie glaubst.

### Kostentreiber je Nutzer

1. **Twilio Verify:** ≈ 0,05 € je Prüfung plus ≈ 0,08 € je SMS DE, etwa 1–2 SMS je Registrierung. Heute nur per IP (20/h) und je Zielnummer (5/15 min) begrenzt (`routes/verify.js` Z. 47–64), ohne globalen Tagesdeckel, Länder-Allowlist und Zähler in MetricsDaily. Der einzige Posten, den Angreifer statt Nutzer treiben.
2. **Agora:** Audio ≈ 0,99 $/1.000 Teilnehmerminuten, Video HD (bis 1280×720, deckt auch 640×360 ab, kein günstigerer SD-Tarif) ≈ 3,99 $/1.000, 10.000 Freiminuten/Monat. Linear mit dem Erfolg des Produkts. Video ist Default für Free (`lib/calls.js` startCall video = true). Heute gibt es `Call.video` und den Tageszähler `MetricsDaily.calls.audio`, aber keine Teilnehmerminuten je Modus und keine Euro; 2.5 ergänzt agoraAudioMinutes/agoraVideoMinutes aus Talk.seconds × Teilnehmer × Call.video.
3. **Cloudinary:** Free-Tier bis 25 Credits; Speicher und Transformationen für Moments/Avatare, heute ohne Nutzerkontingent (nur globales 300/min-Limit, multer 5 MB image-only).
4. **Expo-Push/APNs:** gezählt (push.sent), Kosten gering (< 0,02 € je MAU).
5. **Apple-Provision:** 30 %, mit Small Business Program 15 % (Takehome 70 → 85 %).

### Beispielrechnung je MAU und Monat

Nutzungsannahme: 2 Gespräche/Woche × 8 Minuten × 2 Teilnehmer ≈ 139 Teilnehmerminuten/Monat. ARPPU 3 €/Monat, Jahresabo entsprechend günstiger.

| Posten | Video-Default | Audio-Default |
|---|---|---|
| Variable Kosten je MAU (Agora) | ≈ 0,55 $ ≈ 0,50 € | ≈ 0,14 $ ≈ 0,13 € |
| SMS einmalig je Registrierung (1,5 SMS) | ≈ 0,15–0,20 € | ≈ 0,15–0,20 € |
| Push/Cloudinary | < 0,02 € | < 0,02 € |
| Erlös je MAU bei 3 % Free→Paid × 3 € × 85 % | ≈ 0,08 € | ≈ 0,08 € |
| Erlös je MAU bei 10 % Conversion | ≈ 0,26 € | ≈ 0,26 € |
| Deckungsbeitrag je MAU bei 2–5 % Conversion | ≈ −0,40 € | knapp negativ bis null |
| Deckungsbeitrag je Plus-Abo (3 € × 0,85 − variable Kosten) | ≈ 2,05 € | ≈ 2,42 € |
| Je Nicht-Zahler | ≈ −0,50 € | ≈ −0,13 € |

Folge: Mit Video-Default ist der Deckungsbeitrag je MAU bei realistischer Consumer-Conversion negativ. Positiv wird er erst bei ≥ 10–15 % Conversion oder höherem Preis. Die ersten ≈ 70 MAU/Monat sind durch die 10.000 Agora-Freiminuten kostenfrei, deshalb fällt das Problem erst ab ≈ 500 MAU in der Rechnung auf.

Hebel in dieser Reihenfolge: (1) Video überhaupt (nicht nur HD) als Plus-Merkmal oder Free-Video-Kontingent (z. B. 60 Videominuten/Monat, Rest Audio). Das bestehende Limit `hdVideo` (`lib/plan.js` DEFAULT_LIMITS: free false, plus true; `app/room.tsx` Z. 126, `app/videocall.tsx` Z. 161 applyVideoQuality) senkt keine Agora-Kosten, weil 640×360 im selben HD-Tarif liegt wie 720p. Umsetzung: neuer Schlüssel `video` in DEFAULT_LIMITS (free: Minuten/Monat oder false, plus: true), geprüft in `lib/calls.js` startCall statt `video = true`, Zähler Talk-Minuten Audio/Video aus 2.5; PlusView-Vergleichszeile "Video: Standard/HD" entsprechend anpassen. Entscheidung Ende Phase 2 mit gemessenen Talk.seconds und Video-Anteil. (2) Jahresabo-Anteil erhöhen (Trial auf yearly). (3) Agora-Volumenstaffel oder Alternativanbieter erst ab ≥ 500.000 min/Monat prüfen. (4) Kreis-/Campus-Lizenz als B2B2C-Erlös, falls der Stop-Loss greift.

### Break-even-Abozahl

Break-even = (Fixkosten + variable Kosten der Free-Nutzer) / Deckungsbeitrag je Abo.

| Szenario | Rechnung | Abos | Conversion |
|---|---|---|---|
| 300 € Fixkosten, 1.000 MAU, Video-Default | (300 + 485) / 2,05 | ≈ 380 | 38 % (unrealistisch) |
| 300 € Fixkosten, 1.000 MAU, Audio-Default | (300 + 126) / 2,42 | ≈ 176 | 17,6 % |
| 300 € Fixkosten, 10.000 MAU, Audio-Default | (300 + 1.300) / 2,42 | ≈ 660 | 6,6 % |
| Nur Fixkosten 350 €, Audio-Default | 350 / 2,42 | ≈ 145 | |
| Nur Fixkosten 350 €, Video-Default | 350 / 2,05 | ≈ 170 | |

Rückrechnung: Bei 2–5 % Free→Paid und ≈ 3 € ARPPU braucht 1.000 € MRR etwa 7.000–15.000 MAU. Deshalb muss der Deckungsbeitrag je MAU positiv sein, bevor du Reichweite kaufst.

### Kostenkurve bei Skalierung (Annahmen)

| MAU | Agora | Render | Atlas | Twilio | Sonstiges |
|---|---|---|---|---|---|
| 1.000 | 130–500 € | 25 € | 0–60 € | ≈ 30 € (200 Registrierungen) | |
| 10.000 | 1.300–5.000 € | 50–100 € (2 Instanzen) | M10–M20 60–150 € | ≈ 300 € | |
| 100.000 | 13.000–50.000 € (Staffelverhandlung Pflicht) | 300–600 € | M30+ 400–800 € | ≈ 3.000 € | Support-Person |

Geschenk-Plus: bis 180 Gratis-Tage je Werber × ≈ 0,10 €/Tag Opportunitätskosten, gedeckelt über die Wochenschwelle (2.12).

### Fixkosten heute und neue Posten

Heute ≈ 150–250 €/Monat: Render Starter/Standard 7–25 $, Atlas Free/Shared 0–9 $, Expo/EAS 0–19 $, Apple Developer 99 $/Jahr (≈ 8 €/Monat), Domains ≈ 2 €, Netlify 0, Mailanbieter 0–10 €, KI-Marketing bis 108 €/Monat (Cap 25 €/Woche), Twilio variabel ≈ 0,15 € je Registrierung, Agora in Freiminuten.

| Phase | Neue Posten |
|---|---|
| 1 | Steuerberater 80–150 €/Monat; Anwaltspaket einmalig 1.500–3.000 €; DPMA-Marke 290 € einmalig; Gewerbe/Konto ≈ 0–10 €/Monat; Uptime/Sentry/B2 Free-Tier 0 €; Passwort-Manager ≈ 3–5 €/Monat; kein Atlas M10 (erst Credits prüfen) |
| 2 | IT-Haftpflicht/Cyber 300–600 €/Jahr; Staging (zweiter Render-Service + Atlas-DB) ≈ 10–35 €/Monat; ggf. bezahlter Monitor 20–30 $/Monat |
| 3 | Pentest 2.000–4.000 € einmalig; Media Stufe 1 ≈ 300 €/Monat (10 €/Tag) nur über Gate; Werkstudent ≈ 600–900 €/Monat (optional) |
| 4 | Rechtsform UG/GmbH 500–2.500 € einmalig; Ads-API-Budget nach LTV/CAC; Atlas M10–M20 60–150 €; zweite Instanz 25–50 € |

Regel: Fixkosten erhöhst du nur mit Eintrag in `AppConfig.fixedCosts`.

### Credits und Förderung

Gegenposten: Startup-Credits (MongoDB for Startups, Twilio Startups, Google for Startups Cloud für Veo, Cloudflare), Summe und Laufzeit in `docs/FUNDING.md`, als negative fixedCosts-Posten mit Ablaufdatum. Small Business Program hebt den Takehome von 70 auf 85 %. Förderung mit Fristen in FUNDING.md: EXIST-Gründerstipendium (Hochschulbezug, bis 12 Monate Lebensunterhalt), Gründungszuschuss (nur aus Arbeitslosigkeit), Landes-Stipendien, INVEST-Zuschuss für Angels (20 % der Beteiligung). Entscheidung Förderung vs. Bootstrapping Ende Phase 2 anhand Runway und Aktivierung.

### 12-Monats-Bedarf und Runway

Ohne dein Gehalt: laufend ≈ 350–600 €/Monat ab Phase 2, Einmalposten ≈ 4.000–10.000 € (Anwalt, Marke, Pentest, Versicherung, Rechtsform), Media nur aus freigegebenem Budget. Summe ≈ 9.000–18.000 € in 12 Monaten. Runway = Bankstand / (Fixkosten + variable Kosten − Netto-Umsatz), Ziel > 12 Monate, in der Konsole ab Phase 2 (Bankstand manuell).

### Stop-Loss

Bleibt die Aktivierung nach 6 Monaten Lifecycle-Betrieb < 25 %, oder Free→Paid < 1 % bei ≥ 500 MAU, oder der Deckungsbeitrag je MAU trotz Audio-Default negativ, prüfst du das Erlösmodell (Kreis-/Campus-Lizenz, Sponsoring, höherer Preis), statt weiter zu skalieren. Prüfung quartalsweise in `docs/DECISIONS.md`. Die Zahlungsbereitschaft der Zielgruppe 18–25 ist ungeprüft; sie wird in den 5 Nutzergesprächen pro Woche abgefragt.

Zu messen ab Phase 2 (`MetricsDaily.costs`): Talk-Minuten je MAU getrennt Audio/Video, SMS je Registrierung, Uploads je MAU, Kosten je MAU, Deckungsbeitrag je Abo und je MAU, Break-even-Abozahl live in der Konsole, Geschenk-Plus-Kosten, CAC je Kanal und LTV/CAC (ab Phase 3).

## Was wir bewusst nicht tun

- Keine Anrufe an Nicht-Kontakte und keine tokenlosen Requests nach Phase 1. Keine neue Funktion, die Fremden Kontakt ermöglicht (Entdecken, öffentliche Profile, Nummern-Suche), vor Kontaktanfrage-Mechanik und Moderations-Automatik.
- Keine bezahlte Reichweite (Spark Ads, Meta, Apple Search Ads) und keine Erhöhung der Marketing-Caps, solange Aktivierung D7 < 40 % in drei Kohorten, k < 0,5, Attribution bis zum Nutzer fehlt oder die Gate-Checkliste offen ist. Das Gate steht in `lib/marketingBudget.js` reserve(), nicht im Kopf.
- Kein Media-Euro, kein Creator-Vertrag und keine Campus-Kampagne vor Gewerbeanmeldung, Steuerberater-Antworten, Versicherung, Pentest-Haken und unterschriebener Partner-Vereinbarung.
- Keine neuen Hash-basierten Datensammlungen (Ereignis-Log, Surveys, Archiv) vor HMAC-Pepper und Löschpfad. "Anonym" sagst du nur über Aggregate ohne Personenbezug.
- Kein Tracking-SDK (Firebase Analytics, Mixpanel, Amplitude, PostHog, Meta SDK). Das eigene POST /events mit HMAC-Hash ab 200 WAU reicht, hält Datenschutzlabel und "kein Tracking"-Versprechen. Sentry nur für Crashes und mit Datenschutz-Zeile.
- Kein Android-Build vor Phase 4. Entscheidung in Phase 3 über das Dichte-Gate (Android-Anteil unter eingeladenen Kontakten > 30 %, iOS-Aktivierung ≥ 35 %), nicht über Einladungs-Klick-Anteile allein. Audio-only-Variante erlaubt, wenn das Gate es ergibt. Bis dahin Android-Interessenten in die Warteliste zählen.
- Keine Internationalisierung, keine Märkte außerhalb DACH und keine Web-Anrufe im Browser in diesen 12 Monaten: XL/L ohne Umsatz, solange Deutschland nicht dicht ist.
- Kein Redis, Kubernetes, Microservices oder Anbieterwechsel. Kein Socket-Adapter und kein Rate-Limit-Store, bevor der k6-Lasttest in Phase 3 die Grenze zeigt. rate-limit-mongo nicht einsetzen (unmaintained).
- Keine zweite Render-Instanz oder Autoscaling, bevor Lasttest, Adapter, geteilter Rate-Limit-Store und Zwei-Instanzen-Test grün sind. Client bleibt websocket-only, weil Render ohne Sticky Sessions Long-Polling bricht.
- Kein Atlas-Tier-Upgrade, kein bezahlter Monitoring-Tarif und kein zweiter Render-Service, bevor Startup-Credits beantragt und beantwortet sind. Fixkosten nur mit Eintrag in `AppConfig.fixedCosts`.
- Keine Preisänderung, keine Rabatt-Aktionen, kein Kreis-/Family-Produkt vor SubscriptionEvent und Paywall-Funnel. Preis-/Paywall-A/B-Tests erst ab ≈ 200 Paywall-Views/Woche, sonst Rauschen. Family Sharing in App Store Connect ist der einzige kostenlose Vorab-Test.
- Referral-Belohnung nicht erhöhen und keine neuen Geschenk-Kanäle. Die Bindung an firstTalkAt ist Phase-1-Pflicht; Geschenk-Tage werden ab Phase 2 gemessen.
- Keine Modell-IDs und Stückpreise im Agenten-Code hartkodieren. Kein KI-Lauf ohne Spend Limit im Anbieter-Konto als zweite Verteidigungslinie.
- Keine Auto-Freigabe von KI-Marketing-Videos und kein höheres KI-Budget, bevor Post-Insights und Aktivierung je Video im Agenten-Kontext liegen. Freigabe bleibt beim Owner (oder zweiten Owner).
- Keine Lifecycle- oder Rückhol-Pushes ohne eigene Opt-out-Kategorie und eigenen Cap. Sie dürfen "X ist erreichbar" nie verdrängen und den Ton "kein Druck" nicht brechen.
- Keine JWT-Rotation vor JWT_SECRETS-Liste mit kid-Header. Ein einfacher Wechsel loggt alle Nutzer aus (TOKEN_TTL 180 d) und zerstört WAU für eine Woche.
- Keine großen Refactors als Selbstzweck (`admin-ui/app.js` 1.996 Zeilen, `routes/admin.js` 875, `videocall.tsx` zerlegen) vor Tests um die Anruflogik und vor der zweiten Person in Phase 4.
- Keine Mongo-Migrationen ad hoc in `index.js` migrate(), keine Deploys im Yap-Moment-Fenster, keine Direkt-Pushes auf main ohne grünes CI, sobald Branch-Schutz steht.
- Kein E-Mail-Newsletter an App-Nutzer vor Phase 4. Erst Push-Öffnung und Deinstallationen messen; E-Mail braucht Double-Opt-in, AVV und Datenschutz-Zeile.
- Kein Hire vor RUNBOOK, SERVICES.md, OPERATIONS.md und ARCHITECTURE.md. Keine Freelancer- oder Creator-Zahlung ohne Vertrag mit Rechteübertragung und KSK-Prüfung. Erste Rolle ist Campus-Werkstudent, nicht Entwickler.
- Keine Statusseite, kein SLO-Dashboard-Tool und kein BI-Werkzeug vor 1.000 aktiven Nutzern (Annahme). Ausnahme: der Störungs-Banner in App und Landing (Phase 2), weil er auf vorhandenem `AppConfig.banner` läuft.
- Keine automatischen endgültigen Bans und keine vollständig KI-beantworteten Support-Tickets. Nur vorläufige Sperren automatisch (DSA: Begründung und Beschwerdeweg); Auto-Eingang und Vorlagen ja, Antworten an zahlende Nutzer bleiben menschlich.
- Kein Rebranding und keine neuen Hashtag-Serien vor der Markenrecherche, aber auch keine Marketing-Pause deswegen. Recherche kostet eine Stunde, Rebranding nach Kampagnen Monate.

## Offene Entscheidungen

| Frage | Empfehlung |
|---|---|
| Video-Default für Free-Nutzer beibehalten (`lib/calls.js` startCall video = true) oder Audio-Default mit Video überhaupt als Plus-Merkmal bzw. Video-Kontingent? HD ist über `hdVideo` schon Plus-Merkmal, spart aber keine Agora-Kosten. | Entscheidung Ende Phase 2 mit gemessenen Talk-Minuten Audio/Video. Empfehlung: Free-Video-Kontingent (z. B. 60 min/Monat, danach Audio) als neuer Schlüssel `video` in DEFAULT_LIMITS, geprüft in startCall, mit 10/50/100-Rollout, weil die Beispielrechnung sonst bei realistischer Conversion keinen positiven Deckungsbeitrag je MAU zulässt. |
| Wer ist die Vertrauensperson (zweiter Owner, Notfallzugang, Vollmacht) und bis wann? | In Woche 1 benennen, bis Ende Woche 3 Passkey, Expo-Organization, ASC-Admin und Vollmacht erledigt. Ohne Namen bleibt Bus-Faktor 1. |
| Kleinunternehmerregelung § 19 UStG ja oder nein, und wie werden Apple-Auszahlungen (Reverse-Charge) behandelt? | Steuerberater-Erstgespräch in Woche 1–2 entscheidet. Tendenz: Regelbesteuerung, weil Vorsteuer aus Twilio/Render/Anthropic/Google anfällt und Apple-Umsätze B2B Reverse-Charge sind (Annahme, prüfen lassen). |
| Markenname "Wanna yap" schützbar und frei, oder Alternative vor der ersten Campus-Kampagne? | 1 h TMview-Recherche in Woche 2. Bei Kollision in Klasse 9/38 Namensalternative vor Phase 3, sonst DPMA-Anmeldung (≈ 290 €) in Phase 2. Unterscheidungskraft mit dem Anwalt klären. |
| Ereignis-Log und Push-Öffnungsmessung schon in Phase 2 oder erst ab 200 WAU (Phase 3)? | Phase 3 mit Gate 200 WAU. Bis dahin Meilensteine, ActiveDay-Folgetag und 5 Nutzergespräche pro Woche. Die Lifecycle-Engine braucht das Log nicht. |
| Android: volle Parität, Audio-only-Variante oder weiter warten? | Entscheidung in Phase 3 über das Dichte-Gate (> 30 % Android unter eingeladenen Kontakten, iOS-Aktivierung ≥ 35 %). Bei Grün zuerst Audio-only (L) in Phase 4, Parität nur bei nachgewiesener Nachfrage nach Video. |
| Förderung/Angel (EXIST, INVEST, Landesstipendium) oder Bootstrapping? | Credits sofort beantragen (kostenlos). Förderentscheidung Ende Phase 2 anhand Runway und Aktivierung. EXIST nur, wenn Hochschulbezug besteht und 12 Monate Vollzeit möglich sind. |
| Welche Ereignisse rechtfertigen den Pentest-Zeitpunkt und das Budget (2.000–4.000 €)? | Vor dem ersten Media-Euro (Phase 3) als Haken in der Gate-Checkliste. Fehlt das Budget, verschiebst du den Media-Start, nicht den Pentest. |
| Zweite Render-Instanz und Socket-Adapter bauen oder bei einer Instanz bleiben? | Erst der k6-Lasttest in Phase 3 entscheidet. Bei Reserve ≥ 3× Spitzenlast bleibt "genau 1 Instanz" im RUNBOOK, und die Stunden gehen in Aktivierung. |
| Erste zweite Person: Campus-Werkstudent, Support-Freelancer oder Entwickler? | Campus-Werkstudent (10 h/Woche) ab Phase 3 für Seed-Cluster und Partner, Support-Freelancer ab 2.000 MAU, Entwickler erst bei Deckungsbeitrag > 0 und fertiger ARCHITECTURE.md. |
