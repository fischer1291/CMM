# Wanna yap+: Produkte, Angebote, Paywall

Alles zum Bezahlplan an einem Ort (Leitprinzip 10 in
[`SCALE-PLAN.md`](SCALE-PLAN.md)): welche Produkte es gibt, wo die Preise
stehen, wie Trial, Grace Period und Family Sharing in App Store Connect
eingerichtet werden, wie die Paywall gemessen wird und was beim Ändern eines
Preises alles nachgezogen werden muss. Unit Economics und Break-even stehen in
[`FINANCE.md`](FINANCE.md), die Rechenregeln des Backends in der
Backend-README (Abschnitte "Subscriptions" und "Unit economics").

**Zuletzt geprüft:** 2026-10-02

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
- **Apple App Store Server Notifications V2 → `POST /webhooks/apple`:**
  folgt mit Plan 2.6b (JWS-Prüfung gegen die Apple Root CA, REFUND,
  CONSUMPTION_REQUEST). Bis dahin ist RevenueCat die einzige Quelle.

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
