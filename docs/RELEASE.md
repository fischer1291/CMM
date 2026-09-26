# Release: TestFlight und App Store

Die Checkliste für die erste Veröffentlichung von Wanna yap? auf iOS.
Android ist noch nicht dabei: Die Anruf-Oberfläche für eingehende Anrufe
fehlt dort.

## 1. Vor dem ersten Release (einmalig)

| Punkt | Wo | Status |
|---|---|---|
| Anbieterangaben (Name, Anschrift, E-Mail) | `content/legal.ts` → `OPERATOR` | **offen** |
| Datenschutzerklärung juristisch prüfen lassen | `content/legal.ts` → `PRIVACY_SECTIONS` | Entwurf |
| App-Eintrag in App Store Connect (Bundle-ID `com.schly21.kontaktlisteapp`) | App Store Connect | offen |
| Demo-Zugang für App Review: `REVIEW_PHONE` und `REVIEW_CODE` (6–10 Ziffern) | Render → Environment | offen |
| Datenschutz-URL: `https://wannayap.app/datenschutz` | App Store Connect → App-Informationen | offen |

### Backend-Umgebung (Render)

Muss gesetzt sein:
`MONGODB_URI`, `JWT_SECRET`, `AUTH_REQUIRED=true`, `AGORA_APP_CERTIFICATE`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`VOIP_KEY_CONTENT`, `VOIP_KEY_ID`, `VOIP_TEAM_ID`.

Optional: `EXPO_ACCESS_TOKEN` (empfohlen) und `REVIEW_PHONE`/`REVIEW_CODE`.

Prüfen: `https://cmm-backend-gdqx.onrender.com/api/push-health` sollte
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
