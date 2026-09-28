# Release: TestFlight und App Store

Die Checkliste für die erste Veröffentlichung von Wanna yap? auf iOS.
Android ist noch nicht dabei: Die Anruf-Oberfläche für eingehende Anrufe
fehlt dort.

## 1. Vor dem ersten Release (einmalig)

| Punkt | Wo | Status |
|---|---|---|
| Anbieterangaben (Name, Anschrift, E-Mail) | `content/legal.ts` → `OPERATOR` | erledigt (E-Mail muss ankommen) |
| Datenschutzerklärung juristisch prüfen lassen | `content/legal.ts` → `PRIVACY_SECTIONS` | Entwurf |
| App-Eintrag in App Store Connect (Bundle-ID `com.schly21.kontaktlisteapp`) | App Store Connect | offen |
| Demo-Zugang für App Review: `REVIEW_PHONE` und `REVIEW_CODE` (6–10 Ziffern) | Render → Environment | offen |
| Datenschutz-URL: `https://wannayap.app/datenschutz` | App Store Connect → App-Informationen | offen |
| Store-Texte und Screenshots | `docs/APPSTORE.md`, Bilder aus `marketing/` (`npm run build` → `dist/kit/appstore/`) | fertig zum Hochladen |

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

## 2. Build und Upload

Mit EAS (Expo-Konto `schly21`):

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

Oder direkt von diesem Mac mit dem in Xcode angemeldeten Apple-Konto
(ohne EAS). Das Skript baut das Release-Archiv, zählt die Build-Nummer
hoch und lädt es zu App Store Connect hoch:

```bash
scripts/testflight.sh
```

Alternativ über Xcode: `ios/CallMeMaybe.xcworkspace` öffnen, Schema
`CallMeMaybe`, Ziel „Any iOS Device“, dann *Product → Archive* und
*Distribute App → App Store Connect*.

Die Build-Nummer zählt EAS automatisch hoch (`appVersionSource: remote`).
Die Versionsnummer steht in `app.config.js` unter `version`.

Release-Builds entfernen `console.log/info/debug` (`babel.config.js`),
Fehler und Warnungen bleiben erhalten. VoIP- und normale Push-Tokens aus
TestFlight/App-Store-Builds sind „production“-Tokens; das Backend erkennt
die APNs-Umgebung selbst.

### Build über GitHub (ohne Mac)

Der Workflow **iOS-Build** (`.github/workflows/ios-build.yml`) startet den Build auf
den Macs von EAS und lädt ihn auf Wunsch gleich zu App Store Connect hoch:
GitHub → Actions → iOS-Build → *Run workflow*. Den Fortschritt zeigt expo.dev
(Projekt → Builds), am Ende kommt eine Mail von Expo.

Einmal einrichten, auf dem Mac im Projektordner:

1. `npx eas-cli login` mit dem Expo-Konto `schly21`.
2. `npx eas-cli credentials --platform ios` → Profil *production*:
   - Distributionszertifikat und Provisioning-Profil von EAS verwalten lassen
     (mit dem Apple-Konto anmelden, EAS legt sie an oder übernimmt die vorhandenen).
   - Push-Schlüssel (APNs) ebenso, und einen **App Store Connect API Key** anlegen
     lassen: den braucht der automatische Upload.
3. `npx eas-cli build:version:set --platform ios` und die **höchste Build-Nummer**
   eintragen, die schon bei App Store Connect liegt (z. B. 22 nach dem letzten
   `scripts/testflight.sh`). EAS zählt ab da selbst hoch; eine doppelte Nummer
   lehnt Apple ab.
4. expo.dev → Account Settings → Access Tokens → Token anlegen, dann in GitHub →
   CMM → Settings → Secrets and variables → Actions als Secret **`EXPO_TOKEN`**.
5. Die **Apple-ID der App** (App Store Connect → App → App-Informationen → Apple-ID,
   nur Ziffern) in `eas.json` unter `submit.production.ios.ascAppId` eintragen.
   Sie ist nicht geheim (steht auch im App-Store-Link).

Wer weiter vom Mac baut (`scripts/testflight.sh`), setzt danach mit Schritt 3 die
Build-Nummer bei EAS nach, sonst kollidieren die Nummern.

## 3. App Store Connect: App-Datenschutz

Keine Daten werden zum Tracking verwendet. Anzugeben (alle „mit der
Identität verknüpft“, Zweck „App-Funktionalität“):

- **Kontaktinformationen:** Telefonnummer, Name
- **Kontakte:** Abgleich per Hash; gespeichert werden nur Treffer mit registrierten Nutzern
- **Nutzerinhalte:** Fotos (Profilbild, Moments)
- **Kennungen:** Geräte-ID (Push-Tokens)
- **Sonstige Daten:** Erreichbarkeit, Zeitplan, Gesprächsdauer

Video und Ton der Anrufe werden nicht gespeichert.

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
3. Nach dem Deploy `/api/push-health` prüfen, ob `version` stimmt.
