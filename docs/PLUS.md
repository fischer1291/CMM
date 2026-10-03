# Wanna yap+: Produkte, Angebote, Paywall

Alles zum Bezahlplan an einem Ort (Leitprinzip 10 in
[`SCALE-PLAN.md`](SCALE-PLAN.md)): welche Produkte es gibt, wo die Preise
stehen, wie Trial, Grace Period und Family Sharing in App Store Connect
eingerichtet werden, wie die Paywall gemessen wird und was beim Ändern eines
Preises alles nachgezogen werden muss. Unit Economics und Break-even stehen in
[`FINANCE.md`](FINANCE.md), die Rechenregeln des Backends in der
Backend-README (Abschnitte "Subscriptions" und "Unit economics").

**Zuletzt geprüft:** 2026-10-03

## Produkte und Entitlement

| Was | Wert | Wo |
|---|---|---|
| Monatsabo | `wannayap_plus_monthly` | App Store Connect → Abonnements, Gruppe "Wanna yap+"; RevenueCat → Products |
| Jahresabo | `wannayap_plus_yearly` | wie oben, gleiche Abo-Gruppe |
| Entitlement | `plus` | RevenueCat → Entitlements; beide Produkte hängen daran (`services/purchases.ts` `ENTITLEMENT`) |
| Offering `default` | Paket `$rc_monthly` und `$rc_annual` | RevenueCat → Offerings, als "current" markiert; die App zeigt immer das aktuelle Offering |
| Offering `winback` | dieselben Produkte mit Promotional Offer | RevenueCat → Offerings (siehe Checkliste unten) |

Beide Produkte gehören in **eine** Abo-Gruppe: Dann ist ein Wechsel
monatlich ↔ jährlich ein Up- oder Downgrade statt eines zweiten Abos, und die
Trial-Berechtigung gilt einmal je Gruppe.

Das Backend kennt die Produkt-IDs an einer Stelle: `lib/plusReconcile.js`
(`PRODUCT_IDS`, auch in der Antwort von `GET /me/plan` als `products`). Ein
neues Produkt wird dort ergänzt.

## Preise

Die gültigen Preise stehen **nur in App Store Connect** (Abonnements →
Produkt → Abopreise). Die App zeigt immer den Preis aus dem Store
(`product.priceString`), nie einen fest eingetragenen Text; der Intro-Text
"7 Tage gratis, dann {Preis}" wird ebenfalls aus den Store-Daten gebaut
(`services/purchases.ts` `introLine`).

| Produkt | Preis (DE, inkl. USt.) | Stand |
|---|---|---|
| `wannayap_plus_monthly` | _Platzhalter: aus App Store Connect eintragen_ | |
| `wannayap_plus_yearly` | _Platzhalter: aus App Store Connect eintragen_ | |

Für die Break-even-Rechnung vor dem ersten echten Kauf liest das Backend die
Listenpreise aus `AppConfig.prices.plusMonthlyEurCents` und
`plusYearlyEurCents` (Konsole → App → Preise, siehe `FINANCE.md`).

## Webhooks

- **RevenueCat → `POST /webhooks/revenuecat`** (Backend `routes/plus.js`):
  jedes Abo-Ereignis landet idempotent in `SubscriptionEvent`; Secret
  `REVENUECAT_WEBHOOK_SECRET` auf Render. Nach Kauf und Wiederherstellen fragt
  die App zusätzlich `POST /me/plus/sync`, damit Plus vor dem Webhook da ist.
  Nachts gleicht `lib/plusReconcile.js` jedes Store-Plus mit RevenueCat ab.
- **Apple App Store Server Notifications V2 → `POST /webhooks/apple`**
  (Backend `routes/webhooks.js`, `lib/appleNotifications.js`, seit Plan
  2.6b): zweite Quelle neben RevenueCat, speichert jede geprüfte
  Benachrichtigung als `SubscriptionEvent` mit `source` apple; ändert Plus
  nur bei REFUND. Einrichtung und Regeln im Abschnitt "App Store Server
  Notifications" unten. RevenueCat bleibt die primäre Quelle für Plus.

## App Store Server Notifications

Apple meldet Abo-Ereignisse (Kauf, Verlängerung, Zahlungsproblem,
Erstattung, Erstattungsanfrage) signiert an eine URL je Umgebung. Unser
Empfänger ist **`https://api.wannayap.app/webhooks/apple`**, **Version 2**,
für **Produktion und Sandbox** dieselbe URL (das Backend liest die Umgebung
aus der Benachrichtigung).

**Einrichtung (Owner, einmalig).** App Store Connect nimmt nur **eine** URL
je Umgebung, und RevenueCat will Apples Benachrichtigungen auch (sonst
erfährt es Erstattungen und Zahlungsprobleme erst beim nächsten Abgleich).
Deshalb zuerst nachsehen: App Store Connect → App → App-Informationen →
App Store Server Notifications.

- [ ] **Dort steht die URL von RevenueCat** (der Normalfall): stehen
      lassen. Unsere URL in RevenueCat eintragen: Project → App-Store-App →
      "Apple Server Notification Forwarding URL" →
      `https://api.wannayap.app/webhooks/apple`. RevenueCat reicht Apples
      signierte Nachricht unverändert weiter, die Prüfung unten gilt also
      genauso.
- [ ] **Dort steht keine URL:** unsere direkt eintragen, Version 2, für
      Production und Sandbox.
- [ ] Danach einen Sandbox-Kauf machen und in der Konsole → Plus, CSV
      `plus`, prüfen, dass eine Zeile mit `quelle` apple ankommt (Typ
      `SUBSCRIBED:INITIAL_BUY`, Umgebung Sandbox).

Die URL von RevenueCat **nie** durch unsere ersetzen: Dann bekäme die
primäre Quelle für Plus Apples Meldungen nicht mehr.

**Was das Backend prüft.** Jede Benachrichtigung ist ein JWS. Das Backend
prüft ohne zusätzliche Bibliothek: Algorithmus ES256, die Zertifikatskette
im Header (Leaf → Intermediate → Apple Root CA - G3; die Root ist im
Backend eingebettet und per SHA-256-Fingerabdruck festgenagelt), Gültigkeit
jedes Zertifikats zum Zeitpunkt der Meldung, Apples Kennzeichen an Leaf und
Intermediate, die Signatur, dann Bundle-ID (`APPLE_BUNDLE_ID`, Standard
`com.schly21.kontaktlisteapp`) und Umgebung (Production oder Sandbox).
Transaktion und Verlängerungsinfo darin werden genauso geprüft. Stimmt
etwas nicht: 401, Tageszähler `appleUnverified`, Alarm
`apple_notifications`. Was gar kein JWS ist (Scanner, leere Bodies), zählt
als `appleMalformed` und alarmiert nie.

**Was das Backend speichert.** Jede geprüfte Meldung wird ein
`SubscriptionEvent` mit `source` apple, `rcEventId`
`apple:<notificationUUID>` (Apples Wiederholungen sind harmlose Duplikate),
`type` = notificationType mit Subtyp nach Doppelpunkt (`REFUND`,
`SUBSCRIBED:INITIAL_BUY`), `originalTransactionId`, Produkt, Umgebung,
Preis in der Kaufwährung, Ablauf und Zeitpunkt. RevenueCat-Events speichern
die `originalTransactionId` seit Plan 2.6b ebenfalls. Darüber findet das
Backend die Person: das jüngste Ereignis mit derselben
`originalTransactionId`; sonst das `appAccountToken` der Transaktion, falls
es unsere User-ID trägt (die App setzt heute keins); sonst bleibt die
Meldung `unknown_user` (Tageszähler `appleUnknownUser`). Apple ist oft
Sekunden schneller als RevenueCat; kommt RevenueCats Ereignis derselben
Transaktion, bekommt die wartende Meldung die Person nachträglich. Der
Alarm zählt nur Meldungen, die 30 Minuten nach Eingang noch niemandem
gehören. In der CSV `plus` (Konsole → Plus) zeigt die Spalte `quelle`
revenuecat oder apple.

**Was das Backend tut, je Typ:**

- **`REFUND`** (Apple hat erstattet): beendet ein Store-Plus (bei einer
  Sandbox-Erstattung ein Sandbox-Plus) desselben Produkts, wenn die
  erstattete Transaktion der laufende Zeitraum ist: `plus.active` false,
  Status abgelaufen, Ende = Erstattungsdatum; die App bekommt `planChanged`
  über den Socket. Geschenktes Plus (Einladung, Warteliste, Konsole) bleibt
  unberührt.
- **`CONSUMPTION_REQUEST`** (jemand hat bei Apple eine Erstattung
  beantragt; Apple fragt, wie viel genutzt wurde): wird gespeichert und
  gezählt (`appleConsumptionRequest`). Beantwortet wird sie nur, wenn
  `ASC_ISSUER_ID`, `ASC_KEY_ID` und `ASC_PRIVATE_KEY` auf Render gesetzt
  sind **und** das Flag `apple_consumption` an ist (Konsole → App →
  Feature-Flags, Standard **aus**). Die Antwort nennt die Gesprächsminuten
  seit dem Kauf und das Kontoalter. **Warum aus:** Apple verlangt in der
  Antwort `customerConsented: true`, also die Einwilligung der Person, dass
  wir Nutzungsdaten an Apple geben. Die App fragt heute niemanden danach,
  und die Datenschutzerklärung deckt es nicht. Einschalten erst, wenn beides
  steht ([`PRIVACY-CHANGE.md`](PRIVACY-CHANGE.md)). Ohne Antwort entscheidet
  Apple allein; nichts geht kaputt. Scheitert eine Antwort, zählt
  `appleConsumptionFailed` und der Alarm meldet es (Apple wartet zwölf
  Stunden, es lässt sich also von Hand nachholen).
- **Alle anderen Typen** (`DID_RENEW`, `DID_FAIL_TO_RENEW`, `EXPIRED`,
  `SUBSCRIBED` …) werden nur gespeichert. Plus, Verlängerungen, Kündigungen
  und alle anderen `plus.*`-Zahlen kommen weiter nur aus RevenueCat.

**Erstattungen zählen einmal.** `MetricsDaily.plus.refunds` zählt
RevenueCats `CANCELLATION` mit Grund `CUSTOMER_SUPPORT` **und** Apples
`REFUND`, denn beide melden dieselbe Erstattung. Regel: Eine Meldung zählt
an ihrem Tag, außer die andere Quelle hat dieselbe `originalTransactionId`
in den 7 Tagen davor schon als Erstattung gemeldet; kommen beide im selben
Augenblick, zählt Apples. So zählt die erste Meldung, und ein
abgeschlossener Tag ändert sich nicht, wenn die zweite kommt.
RevenueCat-Ereignisse ohne `originalTransactionId` (vor Plan 2.6b) zählen
immer. Nur Produktion, wie alles in `plus.*`.

**Umgebungsvariablen** (Render, Tabelle "Environment" in der
Backend-README):

| Variable | Pflicht | Wofür |
|---|---|---|
| `APPLE_BUNDLE_ID` | nein | Bundle-ID, die eine Meldung nennen muss; Standard `com.schly21.kontaktlisteapp` |
| `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY` | nein | Schlüssel der App Store Server API (App Store Connect → Benutzer und Zugriff → Integrationen → In-App-Kauf: Issuer-ID, Key-ID, Inhalt der `.p8` mit `\n` für Zeilenumbrüche); nur für die Antwort auf `CONSUMPTION_REQUEST` und nur mit Flag `apple_consumption`. Ohne sie wird gespeichert und gezählt, nie geantwortet |

Alarm `apple_notifications` (warn) und was dann zu tun ist:
[`RUNBOOK.md`](RUNBOOK.md), Tabelle "Alarme". Technische Einzelheiten:
Backend-README, Abschnitt "App Store Server Notifications (plan 2.6b)".

## Einrichtung in App Store Connect und RevenueCat (Checkliste)

Einmalig, vor dem ersten Release mit Kauf. Nichts davon braucht einen
App-Build; die App zeigt Trial und Preise, sobald der Store sie liefert.

- [ ] **Intro-Angebot "7 Tage gratis"** für `wannayap_plus_monthly` und
      `wannayap_plus_yearly`: App Store Connect → Abonnements → Produkt →
      Abopreise → Einführungsangebot erstellen → "Kostenlos", Dauer 1 Woche,
      alle Länder. Die App fragt je Konto bei Apple nach
      (`checkTrialOrIntroductoryPriceEligibility`) und verspricht die Probezeit
      nur, wenn Apple "berechtigt" sagt; wer schon einmal ein Abo der Gruppe
      hatte, sieht den normalen Preis.
- [ ] **Billing Grace Period 16 Tage:** App Store Connect → App →
      Abonnements → Kulanzzeitraum für die Abrechnung → 16 Tage, für alle
      Verlängerungen, auch Sandbox. In der Zeit bleibt Plus aktiv; die App
      zeigt mit dem Push `billing_issue` den Hinweis "Zahlung bei Apple prüfen".
- [ ] **Family Sharing für `wannayap_plus_yearly`:** Produkt →
      Familienfreigabe aktivieren. Achtung: lässt sich danach für dieses
      Produkt nicht mehr abschalten. Kein Code nötig. **Offen:** RevenueCat
      kennzeichnet geteilte Abos (`ownership_type` `FAMILY_SHARED`); das
      Backend wertet das Feld heute nicht aus, nach dem ersten geteilten Abo
      in der Konsole prüfen, wie es gezählt wird (MRR nicht doppelt).
- [ ] **Win-back:** in App Store Connect einen Promotional Offer für beide
      Produkte anlegen (z. B. "1 Monat zum halben Preis"; Höhe ist eine
      Owner-Entscheidung, hier kein Wert), in RevenueCat das Offering
      `winback` mit diesen Paketen anlegen und den Subscription Key
      (In-App-Purchase Key) in RevenueCat hinterlegen, sonst lassen sich
      Promotional Offers nicht signieren. **Offen:** die App zeigt heute immer
      das Offering `current`; dass `/plus?from=plus_winback_3|plus_winback_30`
      das Offering `winback` lädt, ist noch nicht gebaut.
- [ ] **Agreements, Tax and Banking** in App Store Connect vollständig, sonst
      bleiben die Offerings leer (die App meldet dann `offering_empty`, Alarm
      `purchase_failures`).
- [ ] **Sandbox-Test** auf einem Gerät: Kauf mit Trial, Abbrechen,
      Wiederherstellen; danach in der Konsole → Plus die Paywall-Zeile prüfen.

## Paywall-Funnel und Quellen

Ohne Ereignis-Log (Leitprinzip 6): die App meldet jeden Schritt an
`POST /me/plus/funnel` `{ step, from }` (nur angemeldet, Fehler still,
`services/planApi.ts` `reportFunnel`); das Backend zählt Tageszähler, nichts je
Person (`lib/paywall.js`, `MetricsDaily.plus.funnel`, Konsole → Plus →
Paywall, Export `metrics.csv`). Steuernd erst ab 200 Paywall-Aufrufen pro
Woche.

**Schritte** (`step`): `paywall_view` (einmal je Öffnen, sobald der Plan
geladen ist; wer schon Plus hat, zählt nur aus `plus_expiring`,
`billing_issue`, `cancel` und `trial_ending`, sonst schaut er nur seinen Plan
an, `services/paywall.ts` `countsAsView`), `purchase_start`,
`purchase_success`, `purchase_cancel`, `purchase_error` (auch: gekauft, aber
kein Entitlement), `restore_success` (nur wenn Plus zurückkam; "nichts
gefunden" zählt nicht), `restore_error`, `offering_empty` (Store
eingerichtet, aber kein Angebot geladen). Ein Kauf, der auf Bestätigung wartet
(Kaufanfrage in der Familie), zählt nur als Start.

**Quellen** (`from`, `services/paywall.ts` `PAYWALL_SOURCES`; unbekannt oder
fehlend zählt als `other`):

| `from` | Einstieg |
|---|---|
| `settings` | Profil → Karte "Wanna yap+" |
| `memories` | Erinnerungen → "ältere Erinnerungen" |
| `appicon` | App-Icon wählen |
| `year` | Jahresrückblick |
| `room` | Runde: Hinweis "Noch 5 Minuten" (Runde läuft unter der Paywall weiter; endet sie dort, schließt sie sich beim Zurückkommen) und "Die Runde ist zu Ende" |
| `limit_circles` | Hinweis "Du hast schon alle deine Kreise" |
| `limit_rituals` | Hinweis "Ein Ritual pro Kreis" |
| `limit_members` | Hinweis "Der Kreis ist voll" |
| `limit_moments` | Hinweis "Genug Moments für heute" (außerhalb eines Anrufs; im Anruf nur Text, keine Navigation) |
| `referral` | reserviert: die Einladungskarte führt heute zu den Kontakten, nicht zu Plus |
| `plus_expiring`, `billing_issue`, `plus_winback_3`, `plus_winback_30`, `cancel`, `trial_ending` | Lifecycle-Pushes (`lib/notify.js`, `/plus?from=…`) |
| `push` | andere Pushes, die zu Plus führen |
| `other` | alles andere, auch `/plus` ohne Quelle |

Neue Quelle: in `services/paywall.ts` und im Backend `lib/paywall.js` **gleich**
ergänzen (Test `tests/paywall.test.ts` hält die App-Liste fest), Zeile hier
eintragen; Einstiege nur über `router.push(paywallHref('<quelle>'))`, ein
Test lehnt nackte `'/plus'`-Aufrufe in `app/` und `features/` ab.

**Kauf-Fehler** gehen zusätzlich als Fehlerbericht ohne Nutzerdaten an
`/diagnostics/errors` und Sentry: "Purchase failed: &lt;Code&gt;",
"Restore failed: &lt;Code&gt;", "Purchase offerings failed: &lt;Code&gt;"
(Code = RevenueCats `readableErrorCode`, Konsole → Fehler). Mehr als 3
Fehlschläge am Tag (`purchase_error + restore_error + offering_empty`)
lösen den Alarm `purchase_failures` aus (RUNBOOK, Tabelle "Alarme").

## Flag `plus_interest`

Konsole → App → Feature-Flags, Standard **aus**. Nur wenn es an ist **und**
der Build keinen Store eingerichtet hat (`purchasesAvailable()` falsch),
zeigt die Paywall den Modus "Interesse zeigen" (Auswahl der Features,
`POST /me/plus-interest`). Sonst steht ohne Store nur ruhig "Plus kommt
bald." Ist der Store eingerichtet, liefert aber kein Angebot
(`offering_empty`), steht dort "Die Angebote lassen sich gerade nicht laden"
statt des Interesse-Modus: das ist ein Store-Problem, kein "kommt bald". Wer
schon Interesse gezeigt hat, sieht weiter "Danke dir!".

## Probezeit endet (`trial_ending`)

Lifecycle-Push 1 bis 2 Tage vor Ende einer Probezeit (Backend
`lib/lifecycle.js`, einmal je Enddatum, Schalter "Erinnerungen und Tipps",
nicht nachts). Er öffnet `/plus?from=trial_ending`; die Paywall sagt dort nur
"Deine Probezeit endet bald. Du musst nichts tun, wenn Plus weiterlaufen
soll." Kündigen geht in den iPhone-Einstellungen; die App drängt nicht.

## Checkliste "Preis ändern"

1. **App Store Connect:** Abonnements → Produkt → Abopreise → Preisänderung
   planen. Bei einer Erhöhung entscheidet Apple, ob Bestandskunden zustimmen
   müssen; Bestandskunden bewusst behalten oder mitnehmen (Owner-Entscheidung,
   im Commit oder hier notieren).
2. **RevenueCat:** nichts am Preis selbst (kommt aus dem Store); prüfen, ob
   Offerings `default` und `winback` noch die richtigen Pakete zeigen und ein
   Promotional Offer noch zum neuen Preis passt.
3. **Backend:** Konsole → App → Preise (Owner):
   `AppConfig.prices.plusMonthlyEurCents` und `plusYearlyEurCents` auf den
   neuen Listenpreis (Euro-Cent, inkl. USt.) setzen.
4. **`FINANCE.md`:** Beispielrechnung und Break-even mit dem neuen Preis
   nachrechnen (bleiben Annahmen), Datum setzen.
5. **Datenschutzerklärung prüfen** (`content/legal.ts`, Abschnitt "Wanna yap+
   und Käufe"): steht dort ein Preis oder eine Laufzeit, anpassen und
   `PRIVACY_UPDATED` setzen ([`PRIVACY-CHANGE.md`](PRIVACY-CHANGE.md));
   ebenso App-Store-Texte in [`APPSTORE.md`](APPSTORE.md).
6. **Diese Datei:** Preistabelle oben mit Datum aktualisieren.
