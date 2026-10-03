# Nutzerforschung: Gespräche mit Nutzern als Prozess

Solange keine Kohorte 50 Nutzer hat, sagt dir Statistik nichts Belastbares.
Gespräche schon. Dieses Dokument legt fest, wie du jede Woche mit Nutzern
sprichst, was du fragst, wie du es ablegst und was daraus wird. Es gehört zu
Plan-Punkt 1.13 in `docs/SCALE-PLAN.md`.

## Ziel

**5 Gespräche pro Woche**, solange die Wochenkohorten unter 50 Nutzern liegen
(Annahme; danach reichen 2–3, und die Zahlen übernehmen). Je 15 Minuten, per
Video oder Telefon, mit Menschen, die die App schon zweimal benutzt haben.

Kennzahlen (Plan 1.13): Gespräche geführt/Woche ≥ 5; dokumentierte
Zahlungsbereitschaft (Median des akzeptablen Monatspreises); Quote
Karte → Buchung.

## Rekrutierung: die Karte nach dem zweiten Gespräch

Das Backend setzt `User.research.invitedAt`, sobald jemand zwei Gespräche
hinter sich hat (`lib/calls.js` recordTalk, gezählt wie die Statistik:
1:1-Gespräche und eigene Kreis-Runden; geprüft wird aber nur nach einem
beendeten 1:1-Gespräch, Runden zählen mit, lösen selbst keine Einladung aus;
wer schon länger aktiv ist, wird beim nächsten 1:1-Gespräch gefragt; Nutzer
mit Plus aus der Konsole werden nicht gefragt). Die App zeigt dann auf dem Startbildschirm die Karte „15 Minuten
mit dem Gründer sprechen? 7 Tage Plus als Dank“:

- **Termin wählen** öffnet die Buchungsseite `RESEARCH_URL` aus
  `content/links.ts` (cal.com, kostenloser Plan, Annahme) mit dem Namen aus
  dem Profil vorbelegt (`?name=`) und meldet `booked`, sobald sich die Seite
  öffnen ließ (lässt sie sich nicht öffnen, bleibt die Karte). Mehr geht
  nicht mit:
  Die Buchung ordnest du über den Namen und die Nummer oder E-Mail zu, die
  cal.com beim Buchen abfragt (Konsole: Nutzer suchen).
- **Später** meldet `dismissed`. Die Karte kommt nicht wieder; wer später
  doch möchte, findet den Weg über den Support.

Die Antwort landet in `research.bookedAt` bzw. `research.dismissedAt`
(`POST /me/research`). **Was du heute siehst:** Die Konsolenseite zeigt
dazu noch nichts; nur die Antwort von `GET /admin/users/:id` trägt das Feld
`research` (eingeladen, gebucht, abgelehnt, geführt). Eine Zeile „Research“
im Nutzerdetail und ein Knopf „Gespräch geführt“ sind ein Folge-Punkt
(siehe unten).

**Handarbeit einmalig:** cal.com-Konto anlegen, einen 15-Minuten-Termintyp
„Wanna yap? Gespräch“ einrichten, den Link in `content/links.ts` eintragen
(heute ein Platzhalter). Buchungsformular: nur Vorname und die Nummer oder
E-Mail, die cal.com ohnehin braucht; keine weiteren Pflichtfelder. Dazu den
AVV (Data Processing Agreement) mit cal.com abschließen und ablegen und in
`CMM-backend-new/COMPLIANCE.md` eintragen (siehe `docs/PRIVACY-CHANGE.md`,
Punkte 3 und 4); App-Privacy-Label prüfen (`docs/RELEASE.md`, Abschnitt 3).
Wählst du einen anderen Anbieter, muss der Absatz in `content/legal.ts`
mitziehen.

## Leitfaden (15 Minuten)

Du moderierst, nicht du redest. Erst zuhören, dann fragen, nie verteidigen.
Reihenfolge und Wortlaut sind ein Vorschlag; die Zahlenfragen am Ende
stellst du immer gleich, damit die Antworten vergleichbar bleiben.

1. **Einstieg (2 Min.)** Wofür hast du die App bisher benutzt? Mit wem?
2. **Wann hast du zuletzt jemanden spontan angerufen?** Wen, warum, wie hat
   es sich angefühlt? Und wann hat dich zuletzt jemand spontan angerufen?
3. **Wer fehlt in der App?** Welche Person würdest du am liebsten
   erreichen, die noch nicht dabei ist? Warum ist sie nicht dabei?
4. **Wie viele deiner engsten 5 haben Android?** (Zahl notieren; das ist
   die Entscheidungsgrundlage für den Android-Zeitpunkt.)
5. **Was hat dich gestört oder verwirrt?** Ein konkreter Moment.
6. **Sean-Ellis-Frage:** Wie würdest du dich fühlen, wenn es Wanna yap? ab
   morgen nicht mehr gäbe? sehr enttäuscht / etwas enttäuscht / gar nicht
   enttäuscht. Warum?
7. **Was würdest du zahlen?** Erst offen fragen, dann Van Westendorp,
   jeweils für monatlich und für jährlich:
   - Ab welchem Preis wäre es **so günstig, dass du an der Qualität
     zweifelst**?
   - Ab welchem Preis wäre es **ein guter Deal**?
   - Ab welchem Preis wäre es **teuer, aber du würdest es noch überlegen**?
   - Ab welchem Preis wäre es **zu teuer, egal wie gut**?
8. **Schluss (1 Min.)** Gibt es jemanden, mit dem ich auch sprechen sollte?
   Dank aussprechen, die 7 Tage Plus ankündigen.

## Ablage: eine Zeile je Gespräch

Jedes Gespräch wird direkt danach in `docs/research/log.md` als eine Zeile
festgehalten. Der Ordner `docs/research/` steht in `.gitignore` und bleibt
lokal: Vornamen sind personenbezogene Daten und gehören nicht in das
GitHub-Repo. Keine Transkripte, keine Audioaufnahmen.

| Datum | ID/Vorname | Tags | Kernsatz | Zahlungsbereitschaft (Monat / Jahr) | Sean-Ellis | Android unter engsten 5 |
|---|---|---|---|---|---|---|
| | | | | | | |

- **ID/Vorname:** nur der Vorname oder die Nutzer-ID aus der Konsole (steht in
  der Adresse der Nutzerseite, `/admin/users/<id>`); nie die Nummer.
- **Tags:** feste Liste, damit die Freitag-Triage zählen kann:
  `android`, `fehlende-person`, `preis`, `anruf-hemmung`, `push`, `kreise`,
  `video`, `bug`, `onboarding`, `idee`. Neue Tags nur, wenn drei Gespräche sie
  brauchen.
- **Kernsatz:** ein Satz in den Worten der Person, in Anführungszeichen.
- **Zahlungsbereitschaft:** die vier Van-Westendorp-Werte als
  `günstig/deal/teuer/zu teuer`, einmal pro Monat, einmal pro Jahr.

Ab zehn Zeilen rechnest du den Median von „guter Deal“ und „teuer, aber
überlegen“ (monatlich): Zwischen beiden liegt der Preis, den Phase 2 testet.

## Dank: 7 Tage Plus über die Konsole

Nach dem Gespräch in der Admin-Konsole den Nutzer öffnen und **Plus für 7
Tage** geben (Knopf im Nutzerdetail, `POST /admin/users/:id/plus { days: 7 }`,
auditiert). Das Gespräch als geführt markieren geht heute nur als
Aufruf gegen die API (Rolle Support, auditiert als `research_done`). Die
Konsole verlangt bei jedem Schreibaufruf den Header `X-Admin-Request: 1`;
am einfachsten in der Browser-Konsole der eingeloggten Admin-Seite, das
Cookie kommt dann automatisch mit:

```
fetch('/admin/users/<id>/research-done', { method: 'POST', headers: { 'X-Admin-Request': '1' } })
```

Beides zusammen ist dein Nachweis, dass die Zusage eingelöst ist.

**Folge-Punkt (Konsole):** eine Zeile „Research“ neben „Plan“ im
Nutzerdetail (eingeladen / gebucht / abgelehnt / geführt mit Datum) und ein
Knopf „Gespräch geführt“, der diese Route aufruft. Kommt, sobald
`admin-ui/app.js` nicht mehr von einer parallel laufenden Änderung belegt
ist.

## Freitag-Triage

Die Freitag-Triage (Support-Tickets, Reports) liest die Research-Notizen der
Woche mit: neue Zeilen im Log, die Tags gezählt, der Kernsatz der Woche. Was
dreimal mit demselben Tag auftaucht, wird ein Ticket oder ein Plan-Punkt. Die
Zahl „Gespräche geführt/Woche“ kommt ab 2.11 in den Wochenreport; bis dahin
zählst du die Zeilen im Log.
