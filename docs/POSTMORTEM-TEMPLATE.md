# Postmortem: <kurzer Titel, z. B. "Anmelde-SMS abgelehnt">

Vorlage für jeden Alarm mit Nutzerwirkung (Regel und Ablage in
[`incidents/README.md`](incidents/README.md), Plan-Punkt 2.15). Kopieren
nach `docs/incidents/JJJJ-MM-TT-<tag>.md`, die Platzhalter `<…>` ersetzen,
nicht Zutreffendes streichen. Ohne Schuldfrage: gesucht wird, was das
System hätte abfangen können, nicht wer etwas falsch gemacht hat.

Keine personenbezogenen Daten in dieser Datei (das Repo liegt auf GitHub):
keine Namen, Telefonnummern, Mail-Adressen, User-IDs oder Ticket-Texte von
Nutzern. Zahlen und Zeiten reichen. Ist es eine Datenpanne, gilt zuerst
[`RUNBOOK.md`](RUNBOOK.md), Abschnitt "Datenpanne (72 Stunden)"; die
Einzelheiten bleiben dort im Firmenordner.

| | |
|---|---|
| **Datum** | <JJJJ-MM-TT> |
| **Dauer** | <HH:MM>–<HH:MM> Europe/Berlin (<n> Minuten), von den ersten Fehlern bis behoben |
| **Alarm-Tag** | `<tag>` (Stufe <error/warn>); weitere: <–> |
| **Nutzerwirkung** | <wer merkte was, z. B. "neue Nutzer kamen nicht durch die SMS-Anmeldung"; wie viele, mit Quelle (Tageszähler, Konsole → Heute) oder als Schätzung markiert> |
| **Banner** | <ja/nein>; <automatisch (`alert:<tag>`) / von Hand>, <HH:MM>–<HH:MM>; von Hand abgeschaltet: <ja/nein> |
| **Autor** | <Name> |
| **Stand** | <Entwurf / fertig, JJJJ-MM-TT> |

## Zusammenfassung

<Zwei bis drei Sätze: was passiert ist, wen es traf, wie es behoben wurde.>

## Zeitlinie

Alle Zeiten Europe/Berlin. Quellen: Zeitpunkt der Admin-Push oder Mail,
Konsole → Heute (letzte Alarme), Render-Logs ("Störungs-Banner an/aus"),
Sentry, Tageszähler.

| Uhrzeit | Ereignis |
|---|---|
| <HH:MM> | Erste Fehler (laut <Zähler/Log/Sentry>) |
| <HH:MM> | Alarm `<tag>` aufs Handy |
| <HH:MM> | Banner an |
| <HH:MM> | Erste Gegenmaßnahme: <was> |
| <HH:MM> | Behoben: <was> |
| <HH:MM> | Banner aus |

## Ursache

<Technische Ursache, und warum sie möglich war (ein, zwei Mal "warum?"
weiterfragen). Auslöser (Deploy, Schlüssel abgelaufen, Anbieter-Störung …)
getrennt von der eigentlichen Ursache.>

## Was hat geholfen

- <z. B. Gegenmaßnahme im RUNBOOK passte, Banner kam von selbst>

## Was nicht

- <z. B. Gegenmaßnahme fehlte im RUNBOOK, Logs schon abgelaufen>

## Alarm kam rechtzeitig

<ja/nein>. Von den ersten Fehlern bis zum Alarm: <n> Minuten (Ziel unter
5 Minuten, Annahme aus dem Plan). Bis zum Banner: <n> Minuten. Kam kein
Alarm oder zu spät: welche Regel hat gefehlt oder war zu träge?

## Tickets während der Störung

<Zahl der Tickets in der Störung, davon mit automatischer Antwort
(Konsole → Support, "Automatisch"). Sinkt die Zahl je Stunde gegenüber
früheren Störungen, wirkt der Banner.>

## Maßnahmen

Je Maßnahme ein GitHub-Issue im passenden Repo (`CMM` oder
`CMM-backend-new`), hier verlinkt. Eine Maßnahme ohne Issue gibt es nicht.

| Maßnahme | Issue | Wer | Bis |
|---|---|---|---|
| <z. B. Alarmregel für … ergänzen> | <Link zum Issue> | <Name> | <JJJJ-MM-TT> |
| <z. B. RUNBOOK-Zeile `<tag>` präzisieren> | <Link zum Issue> | <Name> | <JJJJ-MM-TT> |
