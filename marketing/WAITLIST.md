# Warteliste

Die Landing Page (wannayap.app) sammelt bis zum Release E-Mail-Adressen mit
Double-Opt-in. Gespeichert wird im Backend (`CMM-backend-new`, `lib/waitlist.js`),
die Zahlen stehen in der Admin-Konsole unter **Warteliste**.

## So funktioniert es

1. Eintragen auf der Landing Page → Bestätigungsmail → Klick auf den Link.
2. Nach der Bestätigung: Platz auf der Liste, **persönlicher Einladungslink**
   (`wannayap.app/?ref=CODE`) und Fortschritt „x von 3 Freunden“.
3. Belohnungen (Einlösen in der App unter Einstellungen → Warteliste-Code):
   - alle Bestätigten: Abzeichen **„Von Anfang an“**
   - 3 bestätigte Freunde über den eigenen Link: **1 Monat Wanna yap+**
4. Release-Tag: Launch-Mail an alle Bestätigten, mit App-Store-Link und Code.

## Einmal einrichten (vor der ersten Werbung)

1. **Impressum:** `content/legal.ts` → `OPERATOR` ist ausgefüllt. Die E-Mail-Adresse
   dort muss Post empfangen können (§ 5 DDG).
2. **E-Mail-Anbieter** mit Sitz in der EU anlegen, z. B. Brevo, Mailjet oder Amazon SES
   in Frankfurt. Mit dem Anbieter einen Auftragsverarbeitungsvertrag abschließen.
3. **Domain verifizieren:** Die DNS-Einträge (SPF, DKIM, DMARC), die der Anbieter
   vorgibt, bei deinem Domain-Anbieter für wannayap.app eintragen. Ohne sie landen die
   Mails im Spam.
4. **Render → Environment** im Backend:
   - `SMTP_URL`, z. B. `smtps://LOGIN:SMTP-SCHLÜSSEL@smtp-relay.brevo.com:465`
   - `MAIL_FROM`, z. B. `Wanna yap? <hallo@wannayap.app>`
   - optional `WAITLIST_BATCH` (Mails pro 15 s, Standard 40): unter dem Limit deines
     Tarifs bleiben.
5. **Testen:** selbst eintragen, Mail bestätigen, in der Konsole unter Warteliste
   „Testmail schicken“ an die eigene Adresse.

## Kampagnen-Links

Hängt an jeden Link zur Landing Page eine Quelle, dann zeigt die Konsole, welche
Werbung Anmeldungen bringt:

```
https://wannayap.app/?utm_source=tiktok&utm_campaign=hook-bald-telefonieren
https://wannayap.app/?utm_source=instagram&utm_campaign=reel-yap-moment
https://wannayap.app/?utm_source=flyer&utm_campaign=campus-leipzig
```

Die wichtigsten Zahlen in der Konsole: **Bestätigungsquote** (unter 50 %: Betreff oder
Absender der Bestätigungsmail prüfen), **Anteil über Empfehlung** (je höher, desto
günstiger jede Anmeldung) und **Neue Bestätigungen pro Tag** nach jeder Kampagne.

**Besuche:** Oben im Tab Warteliste zählt die Konsole die Aufrufe der Landing Page
(ohne Neuladen und ohne die Links aus den Mails) und stellt sie pro Quelle und Kampagne
den bestätigten Anmeldungen gegenüber. Ohne `utm_source` nimmt sie die Plattform, von der
der Besuch kam. TikTok schickt diese Angabe oft nicht mit, solche Besuche landen unter
„direkt“. Deshalb auch in der Bio immer einen Link mit `utm_source` verwenden.

## Release-Tag

1. **App-Store-Link setzen:** in Netlify unter *Site configuration → Environment
   variables* `STORE_URL` (`https://apps.apple.com/app/id…`) und `PROVIDER_TOKEN`
   (App Store Connect → Kampagnen) eintragen, dazu `LANDING_MODE=live`, und neu
   deployen. Der Build schreibt die Werte in `/download`; alle Links darauf
   (`/k/…`, Flyer-QR, Launch-Mail) führen dann mit `ct`/`pt` in den App Store.
   Ohne `STORE_URL` bricht der Build im Live-Modus ab. `public/download.html`
   bleibt im Repo unverändert (`null`).
2. **Landing Page umschalten:** passiert mit `LANDING_MODE=live` aus Schritt 1.
   Statt des Formulars erscheinen die App-Store-Buttons; jeder Klick darauf zählt
   als Store-Klick in der Konsole (Warteliste → Landing Page).
3. **Launch-Mail:** Konsole → Warteliste → erst „Testmail schicken“, prüfen, dann
   „Launch-Mail an alle …“ und `STARTEN` eingeben. Der Versand läuft im Hintergrund,
   der Fortschritt steht in der Konsole.

Optional vorher: Wenn die App im App Store zur **Vorbestellung** steht, mit
`PREORDER=1` neu deployen. Neben dem Formular erscheint dann „Im App Store vorbestellen“.
Vorbestellungen installieren sich am Release-Tag automatisch, das bringt den
Download-Schub für die Charts.

## Datenschutz

- Bestätigt wird per Double-Opt-in. Zeitpunkt, IP und Einwilligungstext werden als
  Nachweis gespeichert.
- Unbestätigte Einträge werden nach 7 Tagen gelöscht, Abmeldungen sofort.
- 12 Monate nach der Launch-Mail wird die ganze Liste automatisch gelöscht.
- Die Datenschutzerklärung (`content/legal.ts`) hat dafür einen eigenen Abschnitt.
  Vor dem Start von Anwalt oder Datenschutz-Generator gegenlesen lassen.
