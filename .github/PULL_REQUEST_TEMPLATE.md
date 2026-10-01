## Was ändert sich?

<!-- Ein, zwei Sätze: was und warum. Plan-Punkt aus docs/SCALE-PLAN.md nennen, wenn es einen gibt. -->

## Datenschutz (docs/PRIVACY-CHANGE.md)

- [ ] Keine neue Datenart, kein neuer Dienstleister, keine geänderte Speicherdauer
- [ ] Sonst: Zeile in `CMM-backend-new/COMPLIANCE.md`
- [ ] Abschnitt in `content/legal.ts` (`PRIVACY_SECTIONS`) und `PRIVACY_UPDATED` angepasst
- [ ] App-Privacy-Label in App Store Connect geprüft (`docs/RELEASE.md`, Abschnitt 3)
- [ ] AVV mit neuem Dienstleister abgeschlossen und benannt
- [ ] Speicherdauer (TTL oder Aufräumjob) festgelegt
- [ ] Löschpfad in `CMM-backend-new/lib/account.js` (löschen und exportieren)
- [ ] Test für Löschpfad oder TTL

## Getestet

- [ ] `npm run check` grün (und im Backend `npm test`, wenn betroffen)
- [ ] Testmatrix aus `docs/RELEASE.md`, Abschnitt 5, auf zwei Geräten, wenn Anrufe, Pushes, Moments oder Konto löschen berührt sind
