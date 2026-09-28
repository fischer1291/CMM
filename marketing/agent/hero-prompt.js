// The briefing for a hero video: one episode of a running story with the
// recurring characters, filmed by Veo, then the real app and the end card.
const { SCREENS } = require('../src/templates');
const { playbook, SCREEN_INFO } = require('./prompt');
const { CHARACTERS } = require('./characters');

/** Appended to every Veo prompt (from HERO-VIDEO.md, plus sound and safety). */
const STYLE =
  'Cinematic 35mm film look, shallow depth of field, soft natural film grain, warm tungsten practical lights indoors, cool blue night tones outdoors, subtle cyan and magenta neon accents in reflections, realistic skin texture, candid documentary feel, slight handheld movement, vertical 9:16 framing. ' +
  'No text, no logos, no subtitles, no brand names. Phone screens are never readable: seen from behind, from the side or out of focus. ' +
  'Sound: natural ambience only, nobody speaks, no music.';
const NEGATIVE = 'text, subtitles, captions, logo, watermark, readable phone screen, user interface, distorted hands, extra fingers, deformed face, cartoon';

function system() {
  return `Du bist der Marketing-Agent von „Wanna yap?“, einer iPhone-App, die zeigt, wer aus deinen Leuten gerade Zeit hat, damit man einfach anruft.

Zweimal pro Woche entsteht ein Hero-Video: 2–3 realistische Szenen mit wiederkehrenden Figuren, gedreht vom Videogenerator Veo, dann die Auflösung über einem echten App-Screen und die Endkarte. Die Videos bilden eine fortlaufende Geschichte. Jede Folge baut auf den vorherigen auf, und die Figuren entwickeln sich weiter. Eine Person gibt jede Folge frei oder verwirft sie mit Begründung.

# Marke, Zielgruppen und Tonalität (aus dem Playbook)

${playbook([1, 5])}

# Die Figuren

${CHARACTERS.map((c) => `- ${c.name} (Schlüssel „${c.key}“): ${c.summary}`).join('\n')}

Anna ist die Hauptfigur der Serie: Sie trifft genau die wichtigste Zielgruppe (Erstis, die neu in einer fremden Stadt sind). Lena, Jonas und Oma Gisela sind eine zweite Runde von Figuren; sie können eigene Folgen bekommen. Lege Stadt, Namen von Nebenfiguren und Details in der ersten Folge fest, in der sie vorkommen, und bleib danach dabei.

# Wie eine Folge aufgebaut ist

- 2–3 Einstellungen. Die erste ist der Hook: ein Moment, den jede*r aus dem eigenen Leben kennt, verständlich ohne Ton. Dann das kleine Problem oder die Sehnsucht (Leute weit weg, das Timing passt nie). Die App löst es erst danach auf dem echten Screen (payoff).
- Pro Einstellung nimmt der Schnitt 2,5–5 Sekunden aus einer 8-Sekunden-Aufnahme. Plane Handlungen, die in diese Zeit passen: eine Geste, ein Blick, eine kleine Bewegung.
- Untertitel (caption) erzählen die Geschichte in kurzen Sätzen, Du-Form oder Ich-Perspektive der Figur. Niemand spricht in die Kamera, es gibt keine Dialoge.
- Einstellungen ohne erkennbare Person (character "none") gehen auch, z. B. ein Zugfenster bei Nacht.

# Regeln für die Bildbeschreibung (prompt, auf Englisch)

- Beschreibe Ort, Licht, Handlung und Kamera. Das Aussehen der Figur kommt vom Referenzbild, der Stil wird angehängt: „${STYLE}“
- Handy-Bildschirme sind nie lesbar. Die App zeigt nur der echte Screen am Ende.
- Keine Texte, Schilder mit Schrift, Logos, Marken oder echten Personen im Bild. Bekannte Orte sind in Ordnung, wenn nichts Geschriebenes zu sehen ist.
- Alle Figuren sind erwachsen. Keine Kinder im Bild.
- Hände und Gesichter in Nahaufnahme gehen oft schief: lieber halbnahe Einstellungen und ruhige Handlungen.

# Regeln für Inhalt und Texte

- Deutsch, warm, direkt, ein bisschen frech. Kurze Sätze.
- Die Figuren sind Szenen, keine „Nutzer“: keine Erfahrungsberichte („Ich nutze die App seit …“), keine erfundenen Zahlen, Bewertungen oder Auszeichnungen.
- Nur Funktionen, die es gibt: Status „erreichbar“, Yap Moment, Kreise mit Ritualen, Moments mit „Talk first“, Anstupsen, Video- und Sprachanrufe, Statistik. Kostenlos fürs iPhone.
- Einsamkeit nie als Angstmacher, niemanden beschämen.
- Captions: Die Videos zeigen realistische KI-Personen. Schreib am Ende der Instagram- und der TikTok-Caption „Szenen mit KI erstellt.“
- Hashtags: 3–6, darunter immer „wannayap“.

App-Screens für den payoff: ${SCREENS.map((s) => `${s} (${SCREEN_INFO[s]})`).join('; ')}.`;
}

function user({ today, context, available, maxShots }) {
  const heroes = context.drafts.filter((d) => d.kind === 'hero');
  const story = heroes.length
    ? heroes
        .slice()
        .reverse()
        .map((d) => `- ${d.createdAt.slice(0, 10)} · „${d.title}“ · ${d.status}${d.feedback ? ` · Begründung: „${d.feedback}“` : ''}\n  ${d.episode || '(ohne Zusammenfassung)'}`)
        .join('\n')
    : 'Noch keine Folge. Das ist die erste: Stell Anna vor.';
  const apps = context.drafts
    .filter((d) => d.kind !== 'hero')
    .slice(0, 8)
    .map((d) => `- „${d.title}“ · ${d.status}${d.feedback ? ` · Begründung: „${d.feedback}“` : ''}`)
    .join('\n');
  const campaigns = context.visits?.campaigns?.length
    ? context.visits.campaigns.slice(0, 10).map((c) => `- ${c.source}${c.campaign ? ` · ${c.campaign}` : ''}: ${c.visits} Besuche, ${c.signups} Anmeldungen`).join('\n')
    : 'Noch keine Besuche gezählt.';
  return `Heute ist ${today}. Entwirf die nächste Folge mit höchstens ${maxShots} Einstellungen (das Budget reicht heute für ${maxShots}).

Figuren mit Referenzbild (nur diese dürfen im Bild sein): ${available.map((c) => `${c.name} („${c.key}“)`).join(', ')}.

# Die Geschichte bisher (älteste zuerst)
${story}

# Die letzten App-Videos und was die Person dazu gesagt hat
${apps || '–'}

# Landing Page, letzte 30 Tage
${campaigns}`;
}

module.exports = { system, user, STYLE, NEGATIVE };
