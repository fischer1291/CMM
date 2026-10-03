// The briefing for a hero video: the next episode of one character's series,
// up to 40 s, with German dialogue, filmed by Veo, the real app as the turn
// and the end card. Every main character has their own running series
// (agent/characters.js); the story so far comes from the backend.
const { SCREENS } = require('../src/templates');
const { playbook, SCREEN_INFO, STORY_RULES, editedNote, soundNote } = require('./prompt');
const { CAPTION_RULES, HASHTAG_RULES } = require('./texts');
const trends = require('./trends');
const soundtrack = require('./soundtrack');
const { CHARACTERS, byKey } = require('./characters');
const { notesSection } = require('./notes');
const { performanceSection, linksNote, viewsNote } = require('./performance');

// The parts around the scenes (agent/cut.js), and the longest episode
const APP_SECONDS = 3.6;
const END_SECONDS = 2.5;
const MAX_TOTAL = 40;
const MAX_SCENES = MAX_TOTAL - APP_SECONDS - END_SECONDS;

/** Appended to every Veo prompt (from HERO-VIDEO.md, plus safety). */
const STYLE =
  'Cinematic 35mm film look, shallow depth of field, soft natural film grain, warm tungsten practical lights indoors, cool blue night tones outdoors, subtle cyan and magenta neon accents in reflections, realistic skin texture, candid documentary feel, slight handheld movement, vertical 9:16 framing. ' +
  'No text, no logos, no subtitles, no brand names. Phone screens are never readable: seen from behind, from the side or out of focus.';

/** The sound of a shot: the German line it plans, in the character's voice, otherwise no words at all. */
const sound = (shot, voice) =>
  shot.line
    ? `Sound: natural ambience. The person speaks German (Deutsch) like a native speaker from Germany, clearly and naturally${voice ? `, ${voice}` : ''}, and says exactly this once: "${shot.line.replace(/"/g, "'")}". No other words in any language, no music.`
    : 'Sound: natural ambience and non-verbal sounds only, like laughter, a sigh or a breath. Nobody says any words, in any language. No music.';
const NEGATIVE = 'text, subtitles, captions, logo, watermark, readable phone screen, user interface, distorted hands, extra fingers, deformed face, cartoon';

/** The series of a hero draft; episodes from before the series belong to their first character. */
const seriesOf = (d) => d.content?.series || (d.characters?.includes('anna') ? 'anna' : d.characters?.[0]) || 'anna';

/** Episodes per series, oldest first; rejected ones never aired and don't count. */
function seriesHistory(heroes = []) {
  const bySeries = Object.fromEntries(CHARACTERS.map((c) => [c.key, []]));
  for (const d of heroes.slice().reverse()) (bySeries[seriesOf(d)] ||= []).push(d);
  return bySeries;
}
const aired = (episodes) => episodes.filter((d) => d.status !== 'rejected');

function system() {
  return `Du bist der Marketing-Agent von „Wanna yap?“, einer iPhone-App, die zeigt, wer aus deinen Leuten gerade Zeit hat, damit man einfach anruft.

Zweimal pro Woche entsteht eine Hero-Folge: höchstens ${MAX_TOTAL} Sekunden, realistische Szenen mit wiederkehrenden Figuren, gedreht vom Videogenerator Veo, mit Gesprächen auf Deutsch, dem echten App-Screen als Wendung und der Endkarte. Jede Hauptfigur hat ihre eigene Serie mit rotem Faden. Wer eine Folge sieht, soll die nächste sehen wollen und dem Kanal folgen: So wächst die Community. Eine Person gibt jede Folge frei oder verwirft sie mit Begründung.

# Marke, Zielgruppen und Tonalität (aus dem Playbook)

${playbook([1, 5])}

# Die Serien

${CHARACTERS.map((c) => `## ${c.series.title} (Serie „${c.key}“, Hauptfigur ${c.name}, Serien-Tag #${c.tag})
${c.name}: ${c.summary}
Worum es geht: ${c.series.premise}
Staffelbogen (Leitplanke; wo die Geschichte schon anders läuft, gilt die Geschichte): ${c.series.arc}
Running Gag: ${c.series.gag}`).join('\n\n')}

Lena, Jonas und Oma Gisela leben in einer gemeinsamen Welt: Sie dürfen in den Folgen der anderen vorkommen, und dieselbe Szene aus zwei Perspektiven (Lenas Anruf, gesehen von Jonas) ist ein starker Serien-Moment. Annas Welt ist ihre eigene; ihre Stadt und ihre Nebenfiguren legst du in ihrer ersten Folge fest und bleibst dabei. Nebenfiguren ohne Referenzbild sind nie erkennbar im Bild: nur von hinten, unscharf oder als Hand.

Welche Serie dran ist: Anna ist die Hauptserie und bekommt ungefähr jede zweite Folge. Sonst die Serie, deren letzte Folge am längsten her ist. Weiche davon ab, wenn Zahlen oder Begründungen klar für eine Serie sprechen. Eine Serie geht nur, wenn ihre Hauptfigur ein Referenzbild hat.

# Wie eine Folge aufgebaut ist (höchstens ${MAX_TOTAL} Sekunden)

- Der Code blendet während der ersten Einstellung oben „<Serie> · Folge <n>“ und deinen hook ein. Der hook (höchstens 44 Zeichen) wirkt ohne Ton und in der ersten Sekunde.
- Einstellung 1 ist der Hook im Bild: ein Moment, den jede*r kennt, ein Konflikt mitten drin oder eine offene Frage. Kein Establishing Shot, kein langsamer Einstieg.
- Dann Setup und Eskalation: Was will die Figur, was steht im Weg (meist das Timing, die Entfernung, die Zeitverschiebung).
- Nach der Einstellung appAfter kommt der echte App-Screen (${APP_SECONDS} s, mit deinem payoff): die Wendung. Die App passiert in der Geschichte (der Ring leuchtet, weil Jonas gerade Zeit hat), sie ist keine Werbepause.
- Die Einstellungen danach sind der Payoff: Das Gespräch passiert, jemand lacht, Erleichterung, eine Pointe. Mindestens eine Einstellung kommt nach dem App-Screen.
- Die letzte Einstellung lässt einen Faden offen (teaser): ein Cliffhanger, eine Frage, ein Blick. Danach kommt die Endkarte (${END_SECONDS} s).
- Jede Folge funktioniert allein (wer neu ist, versteht nach drei Sekunden, worum es geht), belohnt aber alle, die dranbleiben: ein Detail aus einer früheren Folge, der Running Gag, der offene Faden der letzten Folge wird aufgenommen.
- Pro Einstellung nimmt der Schnitt 2–6 Sekunden aus einer 8-Sekunden-Aufnahme. Plane Handlungen, die in diese Zeit passen: eine Geste, ein Blick, ein Satz. Alle Einstellungen zusammen höchstens ${Math.floor(MAX_SCENES)} Sekunden.
- Echt wirkt es durch Mimik, Lachen und Gesten: ein Grinsen beim Lesen einer Nachricht, ein Lachen, das rausplatzt, Augenrollen, ein Seufzer. Beschreib das im prompt konkret.

# Gespräche auf Deutsch

- Die Figuren reden miteinander, meistens am Telefon oder im Videoanruf: Figur A sagt etwas in ihrer Einstellung, Schnitt, Figur B antwortet in ihrer. So entsteht ein Gespräch, obwohl jede Einstellung nur eine Person zeigt. Auch ein Satz vor sich hin („Na toll.“) geht.
- Pro Einstellung höchstens ein Satz (line), höchstens 12 Wörter. Gut die Hälfte der Einstellungen hat einen Satz, die anderen leben von Mimik und Musik.
- So, wie die Figur wirklich redet: Leute Anfang 20 wie unter Freunden („warte, was?“, „ey, endlich!“, halbe Sätze), Oma Gisela wie eine Oma. Kein aufgesetzter Jugendslang, kein Werbesatz, keine Funktionsnamen, nie in die Kamera.
- „Wanna yap?“ darf höchstens einmal pro Folge als echte Frage zwischen den Figuren fallen.
- Eine Einstellung mit Satz braucht mindestens Wörter ÷ 2,5 + 1 Sekunden (seconds).
- caption: bei einer Einstellung mit Satz genau dieser Satz (für alle, die ohne Ton schauen). Bei stummen Einstellungen eine kurze Zeile, die die Geschichte erzählt, oder leer.
- Veo spricht manchmal falsch oder auf Englisch. Der Code hört jede Aufnahme ab, dreht wenn möglich neu und schaltet sonst den Ton der Aufnahme stumm; der Untertitel bleibt. Plane so, dass die Szene notfalls auch mit Untertitel funktioniert.

# Regeln für die Bildbeschreibung (prompt, auf Englisch)

- Beschreibe Ort, Licht, Handlung, Mimik und Kamera. Das Aussehen der Figur kommt vom Referenzbild, Stil, Stimme und der gesprochene Satz werden angehängt: „${STYLE}“
- Schreib keinen gesprochenen Text in den prompt; der Satz gehört nur in line.
- Bei Telefon- und Videoanrufen hält die Figur das Handy so, dass der Bildschirm nie lesbar ist (von hinten, von der Seite, unscharf). Die App zeigt nur der echte Screen.
- Keine Texte, Schilder mit Schrift, Logos, Marken oder echten Personen im Bild. Bekannte Orte sind in Ordnung, wenn nichts Geschriebenes zu sehen ist.
- Alle Figuren sind erwachsen. Keine Kinder im Bild.
- Hände und Gesichter in Nahaufnahme gehen oft schief: lieber halbnahe Einstellungen und ruhige Handlungen. Bei gesprochenen Sätzen das Gesicht halbnah und gut sichtbar, damit die Lippen passen.
- Einstellungen ohne erkennbare Person (character "none") gehen auch, z. B. ein Zugfenster bei Nacht oder ein vibrierendes Handy.

# Storytelling

${STORY_RULES}

# Regeln für Inhalt und Texte

- Die Figuren sind Szenen einer Serie, keine „Nutzer“: keine Erfahrungsberichte („Ich nutze die App seit …“), keine erfundenen Zahlen, Bewertungen oder Auszeichnungen.
- Nur Funktionen, die es gibt: Status „erreichbar“, Wochenplan, Yap Moment, Kreise mit Ritualen, Moments mit „Talk first“, Anstupsen, Video- und Sprachanrufe, Statistik. Kostenlos fürs iPhone.
- Einsamkeit nie als Angstmacher, niemanden beschämen, niemanden zur Witzfigur machen.
- Hat die Person Captions oder Hashtags früherer Videos vor dem Posten geändert (steht in der Geschichte unten), schreib so, wie sie es wollte.
- Zur Folge zwei Hook-Varianten (hookVariants): andere Hook-Sätze für die erste Einstellung (Frage, POV, Konflikt, Zitat), je höchstens 44 Zeichen, nicht der Hook selbst. Damit lässt sich später testen, welcher Einstieg trägt.
- Captions dürfen die Serie aufgreifen („jonas, bitte“, „teil 4 kommt“), müssen aber auch für Neue funktionieren.
${CAPTION_RULES}
${HASHTAG_RULES}

App-Screens für den payoff: ${SCREENS.map((s) => `${s} (${SCREEN_INFO[s]})`).join('; ')}.`;
}

function user({ today, context, available, maxShots, trendNotes }) {
  const heroes = context.heroes || context.drafts.filter((d) => d.kind === 'hero');
  const bySeries = seriesHistory(heroes);
  const ready = new Set(available.map((c) => c.key));
  const series = CHARACTERS.map((c) => {
    const episodes = bySeries[c.key] || [];
    const last = aired(episodes).at(-1);
    const lines = episodes.map((d) => {
      const n = d.content?.episodeNo ? `Folge ${d.content.episodeNo} · ` : '';
      return `- ${d.createdAt.slice(0, 10)} · ${n}„${d.title}“ · ${d.status}${viewsNote(d)}${soundNote(d)}${d.feedback ? ` · Begründung: „${d.feedback}“` : ''}\n  ${d.episode || '(ohne Zusammenfassung)'}${d.content?.teaser ? `\n  Offener Faden: ${d.content.teaser}` : ''}${editedNote(d)}`;
    });
    return `## ${c.series.title} (Serie „${c.key}“)${ready.has(c.key) ? '' : ' · Hauptfigur ohne Referenzbild: heute nicht möglich'}
Nächste Folge wäre Folge ${aired(episodes).length + 1}${last ? `, letzte Folge am ${last.createdAt.slice(0, 10)}` : ', bisher keine'}.
${lines.length ? lines.join('\n') : 'Noch keine Folge: Stell die Figur und ihre Welt vor.'}`;
  }).join('\n\n');
  const apps = context.drafts
    .filter((d) => d.kind !== 'hero')
    .slice(0, 8)
    .map((d) => `- „${d.title}“ · ${d.status}${d.feedback ? ` · Begründung: „${d.feedback}“` : ''}${editedNote(d)}`)
    .join('\n');
  const campaigns = context.visits?.campaigns?.length
    ? context.visits.campaigns.slice(0, 10).map((c) => `- ${c.source}${c.campaign ? ` · ${c.campaign}` : ''}: ${c.visits} Besuche, ${c.signups} Anmeldungen`).join('\n')
    : 'Noch keine Besuche gezählt.';
  const scenes = Math.min(Math.floor(MAX_SCENES), maxShots * 5);
  return `Heute ist ${today}. Entwirf die nächste Folge einer Serie mit höchstens ${maxShots} Einstellungen (das Budget reicht heute für ${maxShots}). Die Einstellungen zusammen dürfen höchstens ${scenes} Sekunden dauern, mit App-Screen und Endkarte höchstens ${MAX_TOTAL} Sekunden.${maxShots >= 5 ? ' Nutz den Platz für eine richtige kleine Geschichte (Ziel: 30–38 Sekunden insgesamt).' : ' Heute also eine kurze Folge: ein Moment, eine Wendung, ein Payoff.'}

Figuren mit Referenzbild (nur diese dürfen erkennbar im Bild sein): ${available.map((c) => `${c.name} („${c.key}“)`).join(', ')}.

${notesSection(context.notes)}# Die Serien bisher (älteste Folge zuerst; verworfene Folgen wurden nie gezeigt und zählen nicht zur Geschichte, ihre Begründungen aber schon)
${series}

# Die letzten App-Videos und was die Person dazu gesagt hat
${apps || '–'}

# Landing Page, letzte 30 Tage
${campaigns}
Hinweis: ${linksNote(context.bioLink)}

${performanceSection(context)}# Musik und Sound
Unter die Szenen kommt Musik; sie wird leiser, sobald jemand spricht. Die Szenen behalten ihren Ton (Sprache, leise Umgebung).
${soundtrack.rules(soundtrack.recentStyles(context.drafts))}

${trends.section(trendNotes)}`;
}

module.exports = { system, user, STYLE, NEGATIVE, sound, seriesHistory, aired, APP_SECONDS, END_SECONDS, MAX_TOTAL, MAX_SCENES };
