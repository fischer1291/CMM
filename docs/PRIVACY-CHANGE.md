# Datenschutz-Änderungsprozess

Jede neue Datenart bringt ihre Datenschutz-, Lösch- und Doku-Zeile im selben
PR mit (Leitprinzip 10 im `docs/SCALE-PLAN.md`). Dieser Prozess ersetzt alle
einzelnen „Datenschutz ergänzen“-Sätze in anderen Plan-Punkten. Die Checkliste
steht verkürzt in `.github/PULL_REQUEST_TEMPLATE.md`; hier steht, was jeder
Haken bedeutet.

## Wann gilt das?

Sobald ein PR eines davon tut:

- eine neue Collection in `CMM-backend-new/models/` anlegt,
- ein Feld an einem bestehenden Modell ergänzt, das sich auf eine Person
  bezieht (auch Hashes, Kennungen, Zeitpunkte, Zähler je Nutzer),
- Daten an einen neuen Dienstleister schickt (SDK, API, Webhook, Mail),
- die Dauer ändert, wie lange etwas liegt (TTL, Aufräumjob),
- etwas Neues im Export oder in der Löschung weglässt oder hinzufügt.

Reine Code-Änderungen ohne neue Daten brauchen keinen der Punkte, nur den
Haken „keine neue Datenart“ im PR.

## Checkliste je PR mit neuer Datenart

1. **Verarbeitungsverzeichnis:** Zeile in `CMM-backend-new/COMPLIANCE.md`
   (Collection oder Feld, Zweck, Rechtsgrundlage, Speicherdauer, Löschpfad,
   Dienstleister). Der CI-Test `test/compliance.test.js` prüft, dass jede
   Datei in `models/` dort vorkommt.
2. **Datenschutzerklärung:** Abschnitt in `CMM/content/legal.ts`
   (`PRIVACY_SECTIONS`) ergänzen oder anpassen, nur mit Fakten aus dem Code,
   und `PRIVACY_UPDATED` auf das Datum der Änderung setzen. Die Fassung wandert
   automatisch als `privacyVersion` in die Einwilligung neuer Nutzer
   (`POST /verify/check`).
3. **App-Privacy-Label:** Abschnitt 3 in `docs/RELEASE.md` prüfen und die
   Angaben in App Store Connect → App-Datenschutz nachziehen, wenn eine neue
   Datenkategorie dazukommt. Ohne das kann Apple den nächsten Build ablehnen.
4. **AVV:** Neuer Dienstleister → Auftragsverarbeitungsvertrag abschließen
   (meist in dessen Konsole) und ihn in `legal.ts` beim Abschnitt
   „Übermittlung in die USA“ bzw. beim Feature nennen. Ablage des AVV im
   Firmenordner, Verweis in `COMPLIANCE.md`.
5. **TTL:** Jede Datenart hat eine Speicherdauer: TTL-Index im Modell
   (`expireAfterSeconds`) oder Aufräumjob in `index.js`. „Bis Kontolöschung“ ist
   auch eine Antwort, dann muss Punkt 6 greifen.
6. **Löschpfad:** `CMM-backend-new/lib/account.js` (`deleteAccount`) löscht
   oder anonymisiert die Daten mit dem Konto; `exportAccount` liefert sie im
   Export. Bleibt etwas bewusst liegen (z. B. Abo-Ereignisse als Nachweis),
   steht das in `legal.ts` und in `COMPLIANCE.md`.
7. **Test:** Ein Test belegt den Löschpfad oder die TTL
   (`test/account.test.js` oder der Test des Features).

## Wer muss das noch wissen?

- Minderjährige: Alles, was Nutzer unter 16 betrifft, zählt als besonders
  schutzwürdig. Neue Features, die Standort, Fotos oder Verhalten auswerten,
  vorher mit der DSFA-Light abgleichen (Plan 1.6).
- Pseudonym ist nicht anonym: Hashes über Telefonnummern sind
  personenbezogen und bekommen Löschpfad und Rechtsgrundlage wie Klartext.
- Marketing-Zahlen (`MetricsDaily`) sind Summen ohne Personenbezug; sobald
  ein Zähler je Nutzer existiert, gilt diese Checkliste.
