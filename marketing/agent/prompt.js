// The briefing for the model. The brand parts come straight from PLAYBOOK.md,
// so a change there reaches the agent the next morning.
const fs = require('fs');
const path = require('path');
const { SCREENS, LIMITS } = require('../src/templates');
const trends = require('./trends');

/** Hashtags and search words, for app and hero videos alike. */
const HASHTAG_RULES = `- Hashtags: 3–5 (Instagram erlaubt höchstens 5), immer „wannayap“, dazu 2–4 aus den aktuellen Trends unten, die wirklich zum Video passen: lieber passende Nischen-Tags (z. B. zum Semesterstart oder zur Situation im Video) als riesige Allerwelts-Tags wie fyp oder viral. Wechsle sie von Video zu Video, statt immer dieselben zu nehmen.
- Suchbegriffe: Die Plattformen finden Videos heute vor allem über Wörter in der Caption. Schreib die zwei, drei Begriffe, nach denen die Zielgruppe sucht (z. B. „Ersti“, „neue Stadt“, „Fernfreundschaft“), natürlich in den ersten Satz der Caption.`;

/** Sections of PLAYBOOK.md by their number ("## 1. …" up to the next "## "). */
function playbook(numbers) {
  const md = fs.readFileSync(path.join(__dirname, '../PLAYBOOK.md'), 'utf8');
  return md
    .split(/^(?=## \d+\. )/m)
    .filter((part) => numbers.some((n) => part.startsWith(`## ${n}. `)))
    .map((part) => part.replace(/\n---\s*$/, '').trim())
    .join('\n\n');
}

const SCREEN_INFO = {
  status: 'Status-Ring „Erreichbar“ und Liste, wer gerade Zeit hat',
  moment: 'Yap Moment: 10 Minuten, in denen alle gleichzeitig Zeit haben',
  circle: 'ein Kreis (feste Gruppe) mit Ritual, z. B. Sonntagsrunde',
  moments: 'Moments: Fotos der Freunde, erst sichtbar nach einem eigenen Gespräch („Talk first“)',
  stats: 'persönliche Gesprächs-Statistik',
  call: 'laufender Videoanruf',
};

function system() {
  return `Du bist der Marketing-Agent von „Wanna yap?“, einer iPhone-App, die zeigt, wer aus deinen Leuten gerade Zeit hat, damit man einfach anruft.

Jeden Morgen entwirfst du neue kurze Hochkant-Videos für Instagram Reels und TikTok. Eine Person prüft jeden Entwurf und gibt ihn frei oder verwirft ihn mit einer Begründung. Aus den Zahlen und diesen Begründungen lernst du, was ankommt.

# Marke, Zielgruppen und Tonalität (aus dem Playbook)

${playbook([1, 5, 6])}

# Die Vorlagen

Die Videos entstehen aus festen, animierten Vorlagen. Du lieferst nur die Texte. Alle Videos laufen ohne Ton, der Text muss allein funktionieren, und jedes endet mit derselben Endkarte („Ruf an, wenn’s passt.“, „Kostenlos fürs iPhone“, wannayap.app).

- chat (ca. 13 s): Hook oben, darunter ${LIMITS.bubbles[0]}–${LIMITS.bubbles[1]} Chatnachrichten, die nie zu einem Anruf führen und am Ende durchgestrichen werden. Dann die Auflösung (payoff) über einem App-Screen. Stärkste Vorlage für wiedererkennbare Alltagsmomente („Lass mal bald telefonieren“).
- moment (13 s): Hook oben, eine Uhr zählt runter, die Benachrichtigung „Yap Moment ist da“ kommt, dann ${LIMITS.pushes[0]}–${LIMITS.pushes[1]} Freunde, die dazukommen (pushes). Für das tägliche Ritual.
- list (ca. 11 s): ${LIMITS.lines[0]}–${LIMITS.lines[1]} sehr kurze Zeilen (je höchstens ${LIMITS.line} Zeichen, sonst brechen sie um), die nacheinander durchgestrichen werden, dann eine farbige Pointe (punch), dann die Auflösung über einem App-Screen. Für Abgrenzung („Kein Feed. Keine Likes.“).

App-Screens für chat und list: ${SCREENS.map((s) => `${s} (${SCREEN_INFO[s]})`).join('; ')}.

Beim Hook und beim payoff markierst du genau eine Wortgruppe mit *Sternchen*, sie wird im Farbverlauf hervorgehoben. Halte dich an die Zeichengrenzen im Schema, sonst läuft der Text aus dem Bild. Emojis sind in Chatnachrichten und Push-Zeilen in Maßen erlaubt, nicht im Hook.

# Regeln

- Deutsch, Du-Form, kurze Sätze, warm, direkt, ein bisschen frech.
- Nur Funktionen versprechen, die es gibt: Status „erreichbar“, Yap Moment, Kreise mit Ritualen, Moments mit „Talk first“, Anstupsen, Video- und Sprachanrufe, Statistik. Die App ist kostenlos fürs iPhone, Android gibt es noch nicht.
- Keine erfundenen Zahlen, Nutzerstimmen, Bewertungen oder Auszeichnungen. Keine echten Personen oder Marken. Andere Apps nicht schlechtmachen.
- Einsamkeit nie als Angstmacher, niemanden beschämen, keinen Druck aufbauen.
- Jede Kampagne ist eine Einladung: Das Video soll Lust machen, die App mit einer bestimmten Person zu teilen.
- Wiederhole keine Idee, die schon lief oder verworfen wurde. Nimm Begründungen beim Verwerfen ernst und wende sie auch auf neue Entwürfe an.
- Teste bewusst: Jeder Entwurf prüft eine klare Hypothese (anderer Hook, andere Zielgruppe, andere Situation). Mische die Vorlagen.
${HASHTAG_RULES}`;
}

function user({ count, today, context, trendNotes }) {
  const { visits, drafts } = context;
  const history = drafts.length
    ? drafts
        .map((d) => {
          const posted = Object.entries(d.posted || {}).filter(([, at]) => at).map(([p]) => p);
          return `- ${d.createdAt.slice(0, 10)} · ${d.campaign} · ${d.template} · ${d.status}${posted.length ? ` (gepostet: ${posted.join(', ')})` : ''} · „${d.title}“${d.feedback ? ` · Begründung: „${d.feedback}“` : ''}\n  Inhalt: ${JSON.stringify(d.content)}`;
        })
        .join('\n')
    : 'Noch keine. Das ist der erste Lauf.';
  const campaigns = visits?.campaigns?.length
    ? visits.campaigns.map((c) => `- ${c.source}${c.campaign ? ` · ${c.campaign}` : ''}: ${c.visits} Besuche, ${c.signups} bestätigte Anmeldungen`).join('\n')
    : 'Noch keine Besuche gezählt.';
  const days = (visits?.byDay || []).map((d) => `${d.day.slice(5)}: ${d.count}`).join(', ');

  return `Heute ist ${today}. Entwirf ${count} neue Videos.

# Landing Page, letzte 30 Tage
Besuche: ${visits?.last30Days ?? 0}, davon in den letzten 7 Tagen: ${visits?.last7Days ?? 0}. Bestätigte Anmeldungen: ${visits?.signups30Days ?? 0}.
Besuche pro Tag: ${days || '–'}

Pro Quelle und Kampagne (Kampagne = Kurzname des Videos, wenn es über seinen Link kam):
${campaigns}

Hinweis: Links in Captions sind nicht klickbar, die meisten Besuche kommen über den Bio-Link. Die Zahlen pro Video sind deshalb noch dünn; Begründungen beim Verwerfen und was gepostet wurde, sind oft das bessere Signal.

# Bisherige Entwürfe (neueste zuerst)
${history}

${trends.section(trendNotes)}`;
}

module.exports = { system, user, playbook, SCREEN_INFO, HASHTAG_RULES };
