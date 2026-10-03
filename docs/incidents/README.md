# Postmortems

Hier liegt zu jeder Störung mit Nutzerwirkung ein Postmortem (Plan-Punkt
2.15). Ziel: aus jeder Störung eine Maßnahme, nicht dieselbe Störung
zweimal.

**Zuletzt geprüft:** 2026-10-03

## Regel

- **Jeder Alarm mit Nutzerwirkung bekommt binnen 5 Werktagen ein
  Postmortem hier**, nach [`../POSTMORTEM-TEMPLATE.md`](../POSTMORTEM-TEMPLATE.md).
  Nutzerwirkung haben die Alarme, die den Störungs-Banner setzen
  (`userFacing` in `CMM-backend-new/lib/alerts.js`): `sms_failures`,
  `push_failures`, `push_credentials`, `agora_tokens`
  ([`../RUNBOOK.md`](../RUNBOOK.md), Abschnitt "Störungs-Banner"). Dazu
  jede andere Störung, die Nutzer gemerkt haben (z. B. `sentry_fatal` mit
  vielen Betroffenen, `no_talks`, ein Rollback), nach deinem Urteil.
- **Dateiname:** `JJJJ-MM-TT-<tag>.md`, Datum des Beginns (Europe/Berlin),
  Tag des ersten Alarms, z. B. `2026-11-14-sms_failures.md`. Zwei Störungen
  mit demselben Tag an einem Tag: `-2` anhängen.
- **Maßnahmen** stehen als GitHub-Issues im Postmortem; das Postmortem ist
  fertig, wenn jede Maßnahme ein Issue hat, nicht erst, wenn alle erledigt
  sind.
- **Keine personenbezogenen Daten** in den Dateien (Namen, Nummern,
  Mail-Adressen, User-IDs, Ticket-Texte). Eine Datenpanne läuft nach
  [`../RUNBOOK.md`](../RUNBOOK.md), Abschnitt "Datenpanne (72 Stunden)",
  der einzige Ort dafür; ein Postmortem hier kommt höchstens zusätzlich und
  ohne die Einzelheiten.
- **Prüfen:** Der Wochenreport am Montag nennt die Alarme der Woche
  ([`../DECISIONS.md`](../DECISIONS.md)); für jeden der vier Tags oben muss
  hier eine Datei liegen oder in Arbeit sein (Kennzahl aus dem Plan:
  Postmortems je Nutzerwirkungs-Alarm = 100 %).

## Postmortems

| Datum | Alarm-Tag | Kurz | Datei |
|---|---|---|---|
| – | – | Noch keine. | – |
