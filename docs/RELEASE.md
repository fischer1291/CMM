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

## 3. App Store Connect: App-Datenschutz

Keine Daten werden zum Tracking verwendet. Anzugeben (alle „mit der
Identität verknüpft“, Zweck „App-Funktionalität“):

- **Kontaktinformationen:** Telefonnummer, Name
- **Kontakte:** Abgleich per Hash; gespeichert werden nur Treffer mit registrierten Nutzern
- **Nutzerinhalte:** Fotos (Profilbild, Moments)
- **Kennungen:** Geräte-ID (Push-Tokens)
- **Käufe:** Kaufhistorie (Abo-Ereignisse von RevenueCat: Produkt, Status, Laufzeit, Preis, Währung, Kündigungsgrund; keine Zahlungsdaten)
- **Sonstige Daten:** Erreichbarkeit, Zeitplan, Gesprächsdauer

Video und Ton der Anrufe werden nicht gespeichert. Die Kategorie **Käufe** muss
in App Store Connect → App-Datenschutz eingetragen sein, bevor der nächste Build
in die Prüfung geht (Wanna yap+ speichert Abo-Ereignisse je Konto).

## 4. Hinweise für App Review

> Wanna yap? zeigt, wann Kontakte Zeit für einen Videoanruf haben.
> Anmeldung per SMS-Code. Demo-Zugang: Telefonnummer `<REVIEW_PHONE>`,
> Code `<REVIEW_CODE>`. Weil das Adressbuch des Testgeräts keine Nutzer
> enthält, ist die Kontaktliste dort leer. Anrufe lassen sich mit einem
> zweiten Gerät und eigenem Konto testen.
> Konto löschen: Profil → Konto löschen.

## 5. Vor jedem Release testen

1. `npm run check` (Typecheck, Lint, Tests) und im Backend `npm test`.
2. Auf zwei Geräten die Testmatrix aus PR #8 durchgehen: Anrufe
   annehmen, ablehnen (Vordergrund und Sperrbildschirm), verpassen,
   abbrechen; Erreichbarkeits-Push bei geschlossener App; Moment teilen;
   Konto löschen mit einem Testkonto.
3. Nach dem Deploy `/api/push-health` prüfen, ob `version` stimmt, und
   `/healthz` muss 200 antworten (Backend-README, Abschnitt Health check).
