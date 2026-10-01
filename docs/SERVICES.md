# Dienste: Zweck, Zugang, Kosten

Jeder Dienst, von dem Wanna yap? abhängt, mit dem, was eine zweite Person
braucht, um ihn zu übernehmen oder zu kündigen (Plan-Punkt 1.8). Die
Spalten Kontoinhaber, Vault-Eintrag, Kosten und Ablauf trägt der Owner von
Hand ein; leer heißt "noch nicht eingetragen", nicht "gibt es nicht".
Keine Secrets hier: Zugangsdaten liegen nur im Passwort-Manager, der
Vault-Eintrag nennt den Namen des Eintrags dort. Welche Umgebungsvariable
zu welchem Dienst gehört, steht in der README des Backend-Repos
(Abschnitt "Environment"); welche Daten ein Dienst sieht, in
`CMM-backend-new/COMPLIANCE.md` (Auftragsverarbeiter).

**Zuletzt geprüft:** 2026-10-01

| Dienst | Zweck | Kontoinhaber | Vault-Eintrag | Kosten/Monat | Ablauf / Kündigungsfrist | Zugang gewähren / entziehen |
|---|---|---|---|---|---|---|
| Render | Hosting des Backends (`CMM-backend-new`, Auto-Deploy von `main`, genau eine Instanz), Umgebungsvariablen, Health Check `/healthz`, Shell für `scripts/` | | | | | Dashboard → Team → Member einladen (Kosten je Sitz prüfen); entziehen: Member entfernen, danach alle Env-Secrets drehen, die die Person gesehen hat |
| MongoDB Atlas | Produktionsdatenbank (`MONGODB_URI`), optional tägliche Snapshots je nach Tier | | | Free-Tier (Tier in der Atlas-Konsole prüfen); Credits aus Plan 1.7 eintragen | | Project → Access Manager → Invite (Rolle Project Owner für Vertretung); DB-User unter Database Access; entziehen: Projektmitglied entfernen, DB-Passwort drehen, `MONGODB_URI` auf Render und als GitHub-Secret (Backup) nachziehen |
| Twilio | Verify-SMS für die Anmeldung (`routes/verify.js`), Alarm-SMS an den Owner (`lib/twilio.js`, `TWILIO_SMS_FROM`) | | | nutzungsabhängig | | Console → Account → Manage users; entziehen: User entfernen, Auth Token drehen (`TWILIO_AUTH_TOKEN` auf Render) |
| Agora | Audio-/Video-Ströme der Anrufe, Token-Erzeugung (`lib/agora.js`, `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`; App ID auch in `config/env.ts`) | | | nutzungsabhängig (Minuten) | | Console → Member Management; entziehen: Member entfernen, App Certificate drehen (Render), App ID bleibt |
| Cloudinary | Avatare und Moment-Bilder (`CLOUDINARY_*`) | | | Free-Tier | | Settings → Users; entziehen: User entfernen, API Secret drehen (Render) |
| Expo / EAS | iOS-Builds und TestFlight-Upload (`.github/workflows/ios-build.yml`, `EXPO_TOKEN`), Expo-Push (`EXPO_ACCESS_TOKEN`), EAS-Credentials (APNs-Schlüssel, Distribution-Zertifikat). Heute ein persönliches Konto (`owner: 'schly21'` in `app.config.js`); Plan 1.8: Organization anlegen und das Projekt übertragen, die `projectId` bleibt | | | | | Organization → Members (ein Personal-Konto kann keine Mitglieder aufnehmen); entziehen: Member entfernen, `EXPO_TOKEN` (GitHub-Secret in `CMM`) und `EXPO_ACCESS_TOKEN` (Render) neu erzeugen |
| Apple Developer / App Store Connect | App Store, TestFlight, In-App-Abos, APNs/VoIP-Schlüssel (`VOIP_KEY_*`), Universal Links (`applinks:wannayap.app`); App-ID `6746295124` (`eas.json`), Bundle `com.schly21.kontaktlisteapp` | | | | jährliche Programm-Mitgliedschaft, verlängern sonst verschwindet die App | App Store Connect → Users and Access → eigene Apple-ID mit Rolle Admin (Plan 1.8); entziehen: Nutzer entfernen, betroffene APNs-Keys widerrufen und neu erzeugen (Render + EAS-Credentials) |
| RevenueCat | Abo-Ereignisse und -Status (`routes/plus.js`, `lib/revenuecat.js`; `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY`; öffentliche SDK-Keys in `eas.json`) | | | Free-Tier bis zur Umsatzgrenze des Anbieters | | Project → Collaborators; entziehen: Collaborator entfernen, Secret API Key und Webhook-Authorization neu setzen (Render) |
| Netlify | Website `wannayap.app` (Landing, `/einladung`, `/kreis`, Rechtstexte, Universal-Links-Datei; `netlify.toml`, `scripts/build-web.sh`, Build-Variablen wie `STORE_URL`, `LANDING_MODE`) | | | Free-Tier | | Team → Members; entziehen: Member entfernen, persönliche Access-Tokens prüfen |
| Domain / DNS (`wannayap.app`) | Apex → Netlify, `api.` → Render, SPF/DKIM für den Mailanbieter, Universal Links hängen daran | | | | Domain-Verlängerung (Datum eintragen; läuft sie aus, sind App-Links, API und Mail tot) | Registrar-Konto mit 2FA; Zweitzugang über den Passwort-Manager; entziehen: Passwort und 2FA neu, API-Tokens des Registrars löschen |
| Mailanbieter (`SMTP_URL`, `MAIL_FROM`) | Wartelisten-, Alarm-, Einladungs- und Dead-Man-Mails (`lib/mailer.js`); Anbieter in `content/legal.ts` `MAIL_PROVIDER` eintragen, sobald gewählt | | | Free-Tier | | Konto beim Anbieter; entziehen: SMTP-Passwort drehen, `SMTP_URL` auf Render nachziehen |
| Backup-Bucket (Backblaze B2 oder Cloudflare R2) | Wöchentlicher age-verschlüsselter Dump (`db-backup.yml`, README "Backup"); der private age-Schlüssel liegt nur im Passwort-Manager | | | Free-Tier | | Application Key je Bucket (read, write, delete); entziehen: Key löschen, neuen Key als GitHub-Secrets (`BACKUP_S3_*`) hinterlegen; age-Schlüsselpaar drehen heißt alle alten Dumps neu verschlüsseln oder verwerfen |
| Anthropic | Texte des Marketing-Agenten (`marketing/agent/*`, `ANTHROPIC_API_KEY` als GitHub-Secret in `CMM`) | | | nutzungsabhängig, Deckel über `lib/marketingBudget.js` | | Console → Organization → Members; entziehen: Member entfernen, API-Key drehen (GitHub-Secret) |
| Google AI (Gemini / Veo) | Hero-Videos des Marketing-Agenten (`GEMINI_API_KEY` als GitHub-Secret in `CMM`) | | | nutzungsabhängig, Deckel über `lib/marketingBudget.js` | | Google-Cloud-Projekt bzw. AI Studio → IAM; entziehen: Key drehen (GitHub-Secret) |
| Meta / Instagram | Firmenkonto für Auto-Posting (`lib/socialPosting.js`, `MarketingChannel`), verbunden in Konsole → Freigabe → Kanäle | | | Free-Tier | Token läuft ab, Alarm `social_token` 7 Tage vorher | Meta Business Suite → Nutzer; Developer-App → Rollen; entziehen: Kanal in der Konsole trennen, Rollen entfernen |
| TikTok | Firmenkonto und Developer-App für Auto-Posting (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, Redirect `api.wannayap.app/marketing/tiktok/callback`) | | | Free-Tier | Refresh-Token läuft ab, Alarm `social_token` | TikTok for Developers → App → Collaborators; entziehen: Kanal trennen, Client Secret drehen (Render) |
| GitHub | Repos `fischer1291/CMM` und `fischer1291/CMM-backend-new`, Actions (CI, iOS-Build, Marketing-Agent, DB-Backup), alle Actions-Secrets | | | Free-Tier | Actions-Crons pausieren nach 60 Tagen ohne Commit | Repo → Settings → Collaborators (Rolle Admin für Vertretung); entziehen: Collaborator entfernen, alle Secrets drehen, die die Person setzen konnte |
| Uptime-Monitor (Better Stack oder UptimeRobot) | Externe Prüfung von `/healthz`, `/api/push-health`, Website und AASA-Datei (Backend-README "Health check"; Einrichtung noch offen) | | | Free-Tier | | Konto beim Anbieter, Alarmziel = Handy des Owners; Vertretung als zweiten Empfänger eintragen |
| Passwort-Manager (Bitwarden oder 1Password) | Alle Zugänge oben, der private age-Schlüssel, Vollmachten; Notfallzugang für die Vertrauensperson (Bitwarden Emergency Access bzw. 1Password Family) | | | | | Notfallzugang einrichten und einmal testen (Datum in [`EMERGENCY.md`](EMERGENCY.md)); entziehen: Notfallkontakt entfernen, Master-Passwort neu |
| Admin-Konsole (eigene, `admin-ui/`) | Betrieb: Team, Freigaben, Support, Moderation, App-Config, Alarme | | n. a. | n. a. | n. a. | Konsole → Team → einladen (`owner`/`support`/`viewer`, Mail mit Setup-Link, 7 Tage gültig); entziehen: deaktivieren (sofort abgemeldet). Mindestens zwei Owner mit Passkey (Plan 1.8) |

Noch kein Konto, aber im Plan vorgesehen (Punkt 1.7, 2.1): Gewerbe,
Geschäftskonto, Steuerberater, D-U-N-S, Sentry. Sie bekommen hier eine
Zeile, sobald sie existieren.
