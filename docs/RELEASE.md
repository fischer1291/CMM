# Release: TestFlight und App Store

Die Checkliste für die erste Veröffentlichung von Wanna yap? auf iOS.
Android ist noch nicht dabei: Die Anruf-Oberfläche für eingehende Anrufe
fehlt dort.

## 1. Vor dem ersten Release (einmalig)

| Punkt | Wo | Status |
|---|---|---|
| Anbieterangaben (Name, Anschrift, E-Mail) | `content/legal.ts` → `OPERATOR` | erledigt (E-Mail muss ankommen) |
| Datenschutzerklärung juristisch prüfen lassen | `content/legal.ts` → `PRIVACY_SECTIONS` | ergänzt um Abo, E-Mail, Hash-Verfahren, Mindestalter (1. Oktober 2026); anwaltliche Prüfung offen (Anwaltspaket, Plan 1.6). Änderungen laufen über `docs/PRIVACY-CHANGE.md` |
| App-Eintrag in App Store Connect (Bundle-ID `com.schly21.kontaktlisteapp`) | App Store Connect | erledigt |
| Demo-Zugang für App Review: `REVIEW_PHONE` und `REVIEW_CODE` (6–10 Ziffern) | Render → Environment | erledigt (nach der Freigabe entfernen) |
| Datenschutz-URL: `https://wannayap.app/datenschutz` | App Store Connect → App-Informationen | erledigt |
| Store-Texte und Screenshots | `docs/APPSTORE.md`, Bilder aus `marketing/` (`npm run build` → `dist/kit/appstore/`) | erledigt (1.0 mit Build 22 in der Prüfung) |

### Backend-Umgebung (Render)

Muss gesetzt sein:
`MONGODB_URI`, `JWT_SECRET`, `AUTH_REQUIRED=true`, `AGORA_APP_CERTIFICATE`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`VOIP_KEY_CONTENT`, `VOIP_KEY_ID`, `VOIP_TEAM_ID`.

Optional: `EXPO_ACCESS_TOKEN` (empfohlen) und `REVIEW_PHONE`/`REVIEW_CODE`.

Prüfen: `https://api.wannayap.app/api/push-health` sollte
`authRequired`, `voipConfigured` und `agoraCertificateFromEnv` jeweils mit
`true` zeigen, dazu unter `version` den erwarteten Commit.

## 2. Build und Upload (TestFlight)

Es gibt **einen** Weg: EAS baut in der Cloud, zählt die Build-Nummer und lädt nach
App Store Connect hoch. So gibt es nur einen Zähler und keine doppelten Nummern mehr.

**Normalfall, ohne Mac:** GitHub → CMM → Actions → **iOS-Build** → *Run workflow*
(Branch `main`, „hochladen“ angehakt, optional „Was testen?“ für die Tester).
Der Lauf wartet, bis der Build fertig und bei Apple ist (meist 20–30 Minuten), und
ist nur dann grün. Die Zusammenfassung des Laufs zeigt die Build-Nummer und die
Links zu expo.dev. Danach verarbeitet Apple den Build noch 10–30 Minuten, dann
steht er in TestFlight. Die Frage nach der
Exportverschlüsselung kommt nicht (`ITSAppUsesNonExemptEncryption: false`).

**Vom Mac aus, gleicher Weg:** `scripts/testflight.sh "Was testen?"` (vorher einmal
`npx eas-cli login`). Gebaut wird, was committet ist.

Nicht mehr bauen: direkt mit Xcode (*Archive → Distribute*) oder mit `xcodebuild`.
Solche Builds zählen an EAS vorbei, und die nächste Nummer von EAS gibt es dann
schon bei Apple.

### Nummern

| | Wo | Wer ändert sie |
|---|---|---|
| Version (1.0.0, 1.0.1, …): die Version im App Store | `app.config.js` und `ios/CallMeMaybe/Info.plist` | du, mit `node scripts/version.js 1.0.1` (setzt beide) |
| Build-Nummer (23, 24, …): jeder Upload eine neue | EAS (`appVersionSource: remote`) | EAS, bei jedem Build +1 |

`CFBundleVersion` in der Info.plist ist nur ein Platzhalter; EAS schreibt beim Bauen
die richtige Nummer hinein. Die aktuelle Nummer bei EAS: `npx eas-cli build:version:get -p ios`.
CI prüft, dass beide Dateien dieselbe Version haben (`node scripts/version.js`).

Nach der Freigabe von 1.0.0 braucht jede neue Store-Version eine höhere Version
(`node scripts/version.js 1.0.1`, committen, dann bauen). Für TestFlight allein
genügt eine neue Build-Nummer, die Version kann bleiben.

### App Store Connect: welcher Build wofür

- **In der Prüfung / im Store:** der Build, der unter *Distribution → Version →
  Build* ausgewählt ist. Diesen während der Prüfung nicht austauschen, sonst
  beginnt sie neu.
- **TestFlight:** jeder neue Build. Zum Testen neuer Stände einfach bauen; die
  Version im Store bleibt davon unberührt.
- Aufräumen: alte Builds unter *TestFlight → Build → Build ablaufen lassen*.
  Löschen kann man bei Apple nichts, abgelaufene Builds sind für Tester weg.
  Build-Nummern werden nie wiederverwendet, Lücken sind normal.

Release-Builds entfernen `console.log/info/debug` (`babel.config.js`),
Fehler und Warnungen bleiben erhalten. VoIP- und normale Push-Tokens aus
TestFlight/App-Store-Builds sind „production“-Tokens; das Backend erkennt
die APNs-Umgebung selbst.

### Einrichtung (einmalig, erledigt)

Nur falls es neu eingerichtet werden muss, z. B. mit einem neuen Expo-Konto:

1. `npx eas-cli login` mit dem Expo-Konto `schly21`.
2. `npx eas-cli credentials --platform ios` → Profil *production*: Zertifikat,
   Provisioning-Profil, Push-Schlüssel und einen **App Store Connect API Key**
   von EAS verwalten lassen (den braucht der Upload).
3. `npx eas-cli build:version:set --platform ios`: die **höchste Build-Nummer**
   eintragen, die schon bei App Store Connect liegt. EAS zählt ab da weiter.
4. expo.dev → Account Settings → Access Tokens → Token anlegen, in GitHub → CMM →
   Settings → Secrets and variables → Actions als Secret **`EXPO_TOKEN`**.
5. Die **Apple-ID der App** (App Store Connect → App-Informationen → Apple-ID) in
   `eas.json` unter `submit.production.ios.ascAppId` (ist `6746295124`).

## 2a. OTA oder Store-Build

Die Regeln dafür stehen nur hier; RUNBOOK (Rollback, Phased Release) und
der Plan verweisen hierher.

**Welcher Weg?**

| Änderung | Weg |
|---|---|
| Nur JavaScript/TypeScript, Texte, Bilder, die schon im Build sind | **OTA** im Kanal `production` (GitHub → Actions → **OTA-Update** → *Run workflow*, Kanal und Nachricht). Erreicht alle Builds mit derselben `runtimeVersion`; die App holt es beim nächsten Öffnen und fragt, ob sie neu starten soll (`services/updates.ts`, kein Zwang) |
| Native Änderung: neues Modul, `ios/`-Projekt, Info.plist, Expo-SDK, neuer Push-Typ, Berechtigungen | **Store-Build** über *iOS-Build* mit höherer Version **und** höherer `runtimeVersion` (`app.config.js` und `ios/CallMeMaybe/Supporting/Expo.plist`, dann `node scripts/version.js` und `node scripts/fingerprint.js --write`) |

`runtimeVersion` bleibt eine feste Zeichenkette (heute `1.0.1`, erhöht mit
dem nativen Sentry-Modul aus Plan 2.1a), weil das
iOS-Projekt committet ist. Dass niemand vergisst, sie zu erhöhen, prüft
`scripts/fingerprint.js` in CI und vor jedem OTA: Es berechnet den nativen
Fingerprint (`expo-updates fingerprint:generate`, Optionen in
`fingerprint.config.js`) und vergleicht ihn mit `ios/fingerprint.json`.
Weicht er ab und `runtimeVersion` ist unverändert, bricht der Lauf ab; das
OTA darf nicht raus. Genauso, wenn `runtimeVersion` erhöht wurde, aber
`ios/fingerprint.json` noch die alte nennt (`--write` vergessen).
`--write` rechnet immer die Produktions-Variante (`APP_VARIANT=production`,
egal was Shell oder `.env` sagen; die Dev-Variante hat eine andere Bundle-ID
und damit einen anderen Hash). `eas.json` zählt nicht zum Fingerprint: eine
neue Env-Variable dort ist keine native Änderung und braucht weder
`--write` noch einen Store-Build.

**Kanäle, ehrlich:** TestFlight **und** App Store hängen beide am Kanal
`production` (es gibt nur den Store-Build aus *iOS-Build*, Profil
`production`). Ein OTA auf `production` erreicht also ohne Zwischenstufe
alle, auch die Tester; der Schutz davor sind die CI-Prüfungen im Workflow
(Fingerprint, Typecheck, Lint, Tests) und der Rückweg
`eas update:republish`. Der Kanal `preview` erreicht nur Builds des
Profils `preview`: interne Verteilung (Ad-hoc) auf registrierte Geräte,
kein TestFlight. Heute baut niemand so einen Build, ein OTA auf `preview`
kommt deshalb nirgends an. Wer einen echten Vorabtest will, baut einmal
`npx eas-cli build --platform ios --profile preview` (Gerät vorher mit
`npx eas-cli device:create` registrieren), installiert den Build über den
Link von expo.dev und lässt ihn auf dem Gerät; danach testet ein OTA auf
`preview` dort zuerst. Den Kanal `production` nimmt der Workflow nur vom
Branch `main`, von jedem anderen Branch bricht er ab.

`eas update` liest die `env`-Blöcke in `eas.json` nicht (die gelten nur
beim Build); der Workflow setzt sie deshalb selbst aus dem Build-Profil,
das wie der Kanal heißt (`scripts/eas-env.js`), und bricht ab, wenn
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` fehlt, weil das Bundle sonst ohne Kauf
liefe. Jede neue `EXPO_PUBLIC_*`-Variable ohne Produktions-Default im Code
muss in `eas.json` bei `preview` **und** `production` stehen; CI prüft das
(`node scripts/eas-env.js --check`).

**Rollback:** `eas update:republish --group <ID der letzten guten Gruppe>
--channel production` (Gruppen-IDs stehen in der Zusammenfassung jedes
OTA-Laufs und auf expo.dev unter *Updates*). Das ist der einzige Weg zurück
für JavaScript; einen Store-Build nimmt man nicht zurück (RUNBOOK,
Abschnitt "Rollback").

**Phased Release immer an:** Jede Store-Version geht über 7 Tage gestaffelt
raus (App Store Connect → Version → Phased Release). Pausieren und was
dann: RUNBOOK, Abschnitt "Phased Release pausieren".

**minBuild höchstens zwei Versionen zurück:** Der Mindest-Build in der
Konsole (App → Mindestversion) bleibt bei der Version, die zwei Store-
Versionen vor der aktuellen liegt, damit niemand ohne Not blockiert wird
und alte Builds trotzdem auslaufen.

**Erst breit bewerben nach 48 Stunden ohne neuen fatalen Fehler:** Eine
neue Version (Store oder OTA) wird erst in Posts, Mails und bezahlter
Reichweite genannt, wenn diese drei Quellen 48 Stunden lang keinen neuen
fatalen Fehler dieser Version zeigen:

1. Konsole → Fehler (JavaScript-Fehler, "Absturz" markiert).
2. Sentry (Issues, Filter `release:<bundleId>@<version>+<build>`, Level
   fatal; Abschnitt 2b). Sentry sieht die meisten nativen Abstürze
   (CallKit, Agora, PushKit), die die Konsole nie erreichen.
3. Xcode → Organizer → Crashes bzw. App Store Connect → TestFlight /
   App Analytics → Abstürze, für das, was Sentry nicht sehen kann (blinde
   Flecken in Abschnitt 2b). Apples Zahlen kommen mit einem Tag
   Verzögerung; das Gate wartet darauf.

Die Konsole unterscheidet nach Version, Build und Update-ID: die App
schickt die Update-ID mit (`X-App-Update`, `update` im Report; `embedded`
ist das Bundle aus dem Build), das Backend legt sie je Fehler unter
"Updates" ab. Für ein OTA-Update gilt die 48-Stunden-Regel je Update-ID.

**Tags und Changelog:** Jeder fertige iOS-Build taggt den Commit
`ios/v<version>-b<build>` und legt ein GitHub-Release mit dem Abschnitt
dieser Version aus `CHANGELOG.md` an (`scripts/changelog-section.js`;
fehlt der Abschnitt, steht ein Hinweis im Release). Vor einem Store-Build
also den Abschnitt `[Unreleased]` in `CHANGELOG.md` zur Version machen.
OTA-Updates bekommen keinen Tag; ihre Gruppe steht in der Zusammenfassung
des Laufs. Der Tag entsteht für jeden fertigen Build, auch wenn nur der
Upload zu App Store Connect scheiterte (der Build liegt dann bei EAS und
lässt sich von Hand hochladen). Geplant (Plan 2.16, Batch 2, Backend-Repo
`test.yml`): grüne Läufe auf `main` als `api/<datum>-<sha>` taggen.

**Demo-Zugang für App Review:** `REVIEW_PHONE`/`REVIEW_CODE` bekommen im
Backend ein Ablaufdatum `REVIEW_UNTIL`; danach gilt der Zugang nicht mehr
und ein Alarm erinnert daran, ihn zu entfernen oder zu verlängern (Backend,
`routes/verify.js`; Alarmliste im RUNBOOK).

## 2b. Crash-Telemetrie (Sentry)

Native Abstürze (CallKit, Agora, PushKit) erreichen unseren eigenen
Fehlerkanal nicht; dafür läuft `@sentry/react-native` im Release-Build
(`services/sentry.ts`, Plan 2.1a).

**Blinde Flecken:** Sentry startet erst, wenn das JavaScript-Bundle
`app/_layout.tsx` auswertet. Was davor nativ läuft, sieht es nicht:
`AppDelegate.swift` legt in `didFinishLaunching` die `PKPushRegistry` an,
und ein VoIP-Push bei beendeter App meldet den Anruf nativ über
`RNCallKeep.reportNewIncomingCall`, bevor JavaScript läuft. Ein Absturz
auf diesem Weg (Kaltstart über einen eingehenden Anruf) und Kills durch
das System (PushKit-Regel "jeder VoIP-Push muss einen Anruf melden",
Watchdog, Speicher) stehen nur in Xcode → Organizer → Crashes und App
Store Connect. Deshalb ist der Organizer die dritte Quelle im
48-Stunden-Gate (Abschnitt 2, "Erst breit bewerben"). Wer den
Kaltstart-Pfad abdecken will, muss sentry-cocoa nativ in
`AppDelegate.swift` vor der `PKPushRegistry` starten; das ist ein eigener
Schritt mit Store-Build, nicht Teil von Plan 2.1a. Es gibt **kein** Sentry-Config-Plugin in
`app.config.js`: Das `ios/`-Projekt ist committet, ohne Prebuild greift ein
Plugin nicht und würde das Projekt verändern wollen. Die Pods verlinkt
`use_native_modules!` im `Podfile` beim EAS-Build von selbst; lokale
Dev-Builds brauchen einmal `npx pod-install` (`DEV_SETUP.md`).

**Was die App macht:** `init()` nur, wenn `EXPO_PUBLIC_SENTRY_DSN` gesetzt
ist und der Build kein Development-Build ist; sonst läuft alles wie ohne
Sentry. Kein Tracing, keine Navigation-Integration, `sendDefaultPii: false`,
Sessions an (Crash-free Sessions je Build: jeder Start und jede Rückkehr in
den Vordergrund schickt ein Session-Envelope mit Release, Environment,
Gerätemodell, iOS-Version und dem Nutzerschlüssel; so steht es in der
Datenschutzerklärung), App-Hang-Erkennung aus (`enableAppHangTracking:
false`: Hänger erzeugt sentry-cocoa nativ am `beforeSend` vorbei und sie
zählen gegen die 5.000 Events des Free-Tiers; bei Bedarf später gezielt
an). Release = `<bundleId>@<version>+<build>`,
`dist` = Build-Nummer, `environment` = `EXPO_PUBLIC_SENTRY_ENV` aus `eas.json`
(`preview` oder `production`). Vor dem Senden entfernt die App
Telefonnummern, E-Mail-Adressen, Query-Parameter von URLs, Nummern im
URL-Pfad (`/friends/%2B49…`, `/stats/…`, `/blocks/…`: der Pfad wird vor
dem Scrubbing dekodiert), `request`, `extra` und den Gerätenamen (`services/sentryScrub.ts`, Tests in
`tests/sentry.test.ts`); Konsolen-Breadcrumbs mit einer Nummer oder
E-Mail-Adresse, auch tief in geloggten Objekten (`console.error` bleibt im
Release-Build), fallen ganz weg, alle anderen werden bis in verschachtelte
Felder gesäubert; Touch-Breadcrumbs (`Sentry.wrap`) verlieren ihre Beschriftung (Text,
`accessibilityLabel`, `testID`: in dieser App oft ein Name) und behalten
nur Komponentennamen; die Text-Extraktion der Touch-Boundary ist aus.
Maschinen-IDs (UUIDs wie Call-IDs und die OTA-`update_id`, Hex-Trace-IDs,
ISO-Daten) nimmt das Scrubbing vorher aus dem Nummernmuster heraus; die
Kontexte und Tags des SDK (`trace`, `app`, `os`, `device`, `ota_updates`,
`expo.*` …) gehen ungefiltert durch, damit ein OTA im Release-Gate
filterbar bleibt.
Native Abstürze erzeugt und sendet sentry-cocoa an unserem `beforeSend`
vorbei. Damit dort keine Anfrage-URL mit `?phone=` landet, sind die nativen
Netzwerk-Breadcrumbs aus (`enableNetworkBreadcrumbs: false`; die
JS-Breadcrumbs von fetch/xhr decken dieselben Aufrufe ab, ohne Query und
ohne Nummer im Pfad gesäubert und erst danach in den nativen Scope
gespiegelt); App-Start-, Frame- und Stall-Tracking sind
ebenfalls aus (`tracesSampleRate: 0` zählt für das SDK sonst als Tracing).
Für den Rest greift das serverseitige Scrubbing aus Schritt 1; Gerätename
und IP fehlen durch `sendDefaultPii: false`. Nutzer = `{ id: phoneHash }`
(SHA-256 der E.164-Nummer wie bei `/contacts/match`), gesetzt beim
Anmelden, gelöscht beim Abmelden. Der Schlüssel ist bewusst **ohne** den
Server-Pepper aus Plan 2.8 (die App kennt ihn nicht). Er schützt deshalb
kaum: Telefonnummern lassen sich in Minuten durchprobieren, wer den Hash
hat (auch Sentry), kann die Nummer zurückrechnen. Wir behandeln ihn wie die
Nummer selbst (pseudonym, nicht anonym, Sentry nur als Auftragsverarbeiter);
die Datenschutzerklärung sagt genau das und nicht mehr.
`services/diagnostics.ts` meldet behandelte Fehler weiter an unser Backend
**und** an Sentry (fatal bleibt fatal); unbehandelte Fehler fängt Sentrys
eigener Handler, unser Handler schickt sie nur ans Backend (keine Doppel).

**Einrichtung (einmalig, Owner):**

1. Sentry-Konto in der **EU-Region** anlegen (Organisation → Region
   "EU (Frankfurt)" bei der Erstellung; später nicht änderbar), Projekt
   "React Native", Free-Tier. In den Organisationseinstellungen den **AVV**
   (Data Processing Addendum) akzeptieren; Ablage im Firmenordner, Verweis
   in `CMM-backend-new/COMPLIANCE.md` (Zeile "Sentry", Plan 2.1b).
   Spam-Schutz und Datenlöschung: Settings → Security & Privacy →
   "Prevent Storing of IP Addresses" an; Aufbewahrung bleibt beim
   Sentry-Default 90 Tage (steht so in der Datenschutzerklärung).
   Project Settings → Security & Privacy → **Advanced Data Scrubbing**:
   Regel "Email addresses" sowie eine Regex-Regel für Telefonnummern
   (`\+?\d[\d\s\-/()]{6,13}\d`, Methode Replace, Quelle
   `$error.value || $message || $logentry.formatted`, **nicht** `$string`:
   sonst zerschneidet die Regel UUIDs, Trace-IDs und die `update_id` in
   Tags und Kontexten). Das deckt die Fehlertexte nativer Crash-Events ab,
   die das `beforeSend` der App nie sehen. Als zweite Absicherung dieselbe
   Regex-Regel noch einmal mit der Quelle
   `$breadcrumb.message || $breadcrumb.data.url` anlegen (Breadcrumbs
   nativer Crash-Events; den Selektor im Regel-Dialog mit einem
   Beispiel-Event prüfen, Sentry schlägt passende Pfade vor). Sie kann
   Ziffernfolgen einer Call-ID in einer URL treffen; das nehmen wir für
   die Breadcrumbs in Kauf, die App säubert sie ohnehin schon selbst. Es gibt keine Löschung je Nutzer über eine API: wer Berichte zu
   seinem Prüfwert früher weg haben will, schreibt uns; der Owner stellt
   die Anfrage an den Sentry-Support (die Datenschutzerklärung verspricht
   genau das, nicht mehr).
2. **DSN** als EAS-Umgebungsvariable, nicht in `eas.json` und nicht im Repo:
   `npx eas-cli env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <DSN> --visibility sensitive --scope project`
   und dasselbe für `--environment preview`. Die Build-Profile `preview`
   und `production` in `eas.json` pinnen ihre Umgebung (`"environment"`),
   damit der Build die Variablen der passenden EAS-Umgebung sicher bekommt
   und nicht vom CLI-Default abhängt. Das Feld kennt eas-cli erst ab
   13.4.0; `eas.json` verlangt deshalb `cli.version >= 13.4.0` (die
   Workflows nutzen `latest`, lokal `npx eas-cli@latest`).
   Für OTA-Bundles liest `ota-update.yml` den DSN aus dem **GitHub-Secret**
   `EXPO_PUBLIC_SENTRY_DSN` (CMM → Settings → Secrets and variables →
   Actions); fehlt es, warnt der Lauf und das Bundle meldet nichts an Sentry.
   `scripts/eas-env.js --check` kennt den DSN als Secret-Variable und
   verlangt ihn nicht in `eas.json`.
3. **dSYMs** (Symbole für native Stacks): Sentry → Project Settings →
   Debug Files → **App Store Connect**-Integration verbinden (App Store
   Connect API-Key mit Rolle Developer). Sentry lädt die dSYMs jedes
   Builds dann selbst von Apple; kein Build-Schritt in `ios-build.yml`
   nötig. Ohne das sind native Stacks unleserlich, der Crash-Typ aber
   trotzdem sichtbar.
4. **JavaScript-Source-Maps** (optional): nur über den Xcode-Build-Phase-
   Patch von `npx @sentry/wizard -i reactNative` einmal auf einem Mac
   (ändert `ios/`, danach `node scripts/fingerprint.js --write` und ein
   Store-Build mit höherer `runtimeVersion`). Ohne ihn sind JS-Stacks
   unsymbolisiert; die Konsole (Fehler) zeigt sie weiterhin, native
   Abstürze bleiben lesbar. Vor dem Patch: Sentry Auth-Token nur als
   EAS-Secret (`SENTRY_AUTH_TOKEN`), nie in `ios/`.
5. **Alarm:** Sentry → Alerts → "New issue" für Level fatal → Webhook an
   `POST /webhooks/sentry` (Backend, Plan 2.1b; Alarm-Tag `sentry_fatal`
   in der RUNBOOK-Alarmliste). Bis dahin: Mail-Alert an den Owner in Sentry.
6. **Datenschutz:** Abschnitt „Absturzberichte“ in `content/legal.ts`
   (`PRIVACY_SECTIONS`, Stand 2. Oktober 2026) ist der Text; App-Datenschutz
   in App Store Connect um **Diagnose → Absturzdaten** und **Sonstige
   Diagnosedaten** ergänzen (Abschnitt 3).
   Jede Änderung an dem, was Sentry sieht, läuft über `PRIVACY-CHANGE.md`.

**Prüfen nach dem ersten Build mit DSN:** Sentry → Releases zeigt den
Release `<bundleId>@<version>+<build>` mit einer Session, sobald der
TestFlight-Build einmal gestartet wurde; ein Fehler muss dafür nicht
provoziert werden. Erscheint er nicht, fehlt der DSN im Build
(`npx eas-cli env:list --environment production`). Ein neues natives Modul
ändert den Fingerprint: dieser Punkt kommt nur als Store-Build mit höherer
`runtimeVersion` raus (Abschnitt 2a), nie als OTA.

## 3. App Store Connect: App-Datenschutz

Keine Daten werden zum Tracking verwendet. Anzugeben (alle „mit der
Identität verknüpft“, Zweck „App-Funktionalität“):

- **Kontaktinformationen:** Telefonnummer, Name
- **Kontakte:** Abgleich per Hash; gespeichert werden nur Treffer mit registrierten Nutzern
- **Nutzerinhalte:** Fotos (Profilbild, Moments)
- **Kennungen:** Geräte-ID (Push-Tokens; seit Plan 2.9 außerdem die
  Gerätekennung des Herstellers für Apps eines Anbieters, IDFV, mit Modell
  für die Geräteliste und „Überall abmelden“, Zweck „App-Funktionalität“;
  keine Werbe-ID)
- **Käufe:** Kaufhistorie (Abo-Ereignisse von RevenueCat: Produkt, Status, Laufzeit, Preis, Währung, Kündigungsgrund; keine Zahlungsdaten)
- **Sonstige Daten:** Erreichbarkeit, Zeitplan, Gesprächsdauer; seit Plan
  2.10 außerdem die freiwillige Antwort „Woher kennst du Wanna yap?“ mit der
  Zahl der Android-Freunde (0–5 oder unbekannt), zusätzlicher Zweck
  „Analysen“ (Reichweite je Kanal, nur als Summen ausgewertet; kein Tracking,
  keine Weitergabe)
- **Diagnose:** Absturzdaten und Sonstige Diagnosedaten (Sentry, Abschnitt 2b:
  Fehlerberichte und Session-Meldungen bei jedem Start; mit der Identität
  verknüpft, weil der pseudonyme Nutzerschlüssel ein Hash der Nummer ist;
  kein Tracking)

Video und Ton der Anrufe werden nicht gespeichert. Die Kategorien **Käufe** und
**Diagnose** müssen in App Store Connect → App-Datenschutz eingetragen sein,
bevor der nächste Build in die Prüfung geht (Wanna yap+ speichert Abo-Ereignisse
je Konto; Sentry bekommt Absturzberichte, sobald der DSN im Build ist).

## 4. Hinweise für App Review

> Wanna yap? zeigt, wann Kontakte Zeit für einen Videoanruf haben.
> Anmeldung per SMS-Code. Demo-Zugang: Telefonnummer `<REVIEW_PHONE>`,
> Code `<REVIEW_CODE>`. Weil das Adressbuch des Testgeräts keine Nutzer
> enthält, ist die Kontaktliste dort leer. Anrufe lassen sich mit einem
> zweiten Gerät und eigenem Konto testen.
> Konto löschen: Profil → Konto löschen.

## 5. Vor jedem Release testen

1. `npm run check` (Typecheck, Lint, Tests), `node scripts/fingerprint.js`
   und im Backend `npm test`. Bei einem Store-Build: `CHANGELOG.md` hat
   den Abschnitt der Version (Abschnitt 2a).
2. Auf zwei Geräten die Testmatrix aus PR #8 durchgehen: Anrufe
   annehmen, ablehnen (Vordergrund und Sperrbildschirm), verpassen,
   abbrechen; Erreichbarkeits-Push bei geschlossener App; Moment teilen;
   Konto löschen mit einem Testkonto.
   Seit Plan 2.9 außerdem: auf Gerät B mit der Nummer von Gerät A anmelden
   (A bekommt „Neue Anmeldung“, der Tipp öffnet die Einstellungen), dann auf
   A „Überall abmelden“: B fällt bei der nächsten Anfrage auf die Anmeldung
   zurück und klingelt nicht mehr, A bleibt angemeldet, Anrufe kommen auf A
   weiter an. Die Frage „Ist das dein Konto?“ braucht ein Konto, das 180
   Tage ruht; sie ist durch die Backend-Tests (`test/verify.test.js`) und
   die App-Tests (`tests/signInFlow.test.ts`) abgedeckt.
   Seit Plan 2.10: ein neues Konto über einen Einladungslink anlegen; nach
   „Fertig“ kommt „Woher kennst du Wanna yap?“ mit „Freund·in“ vorausgewählt,
   „Weiter“ öffnet die App, beim nächsten Start (oder Profil-Setup) fragt sie
   nicht noch einmal. Ein zweites neues Konto ohne Einladung: nichts ist
   vorausgewählt, „Überspringen“ öffnet die App ohne Antwort.
3. Nach dem Deploy `/api/push-health` prüfen, ob `version` stimmt, und
   `/healthz` muss 200 antworten (Backend-README, Abschnitt Health check).
