// Music and sound for the agent's videos. Two parts:
// - The music in the video comes from code (../music.js), in one of several
//   styles. It has no third-party rights, so it can go out automatically on
//   Instagram and TikTok. Claude picks the style per video; the key, chords and
//   tempo vary with the campaign name, and the same style never runs twice in
//   a row.
// - A sound tip: a sound that is trending on TikTok right now (from the trend
//   research), added by hand in the TikTok app when the video waits there as a
//   draft. Viral songs are not put into the file: they belong to their labels,
//   and only the platforms' own libraries license them for a brand account.
const { z } = require('zod');
const { STYLES } = require('../music');

const STYLE_KEYS = Object.keys(STYLES);

const Music = z.enum(STYLE_KEYS).describe(`Musikstil des Videos: ${STYLE_KEYS.join(', ')}`);

const Sound = z
  .object({
    title: z.string().max(80).describe('Titel des Sounds oder Songs, wie er in TikTok heißt; leer, wenn die Recherche keinen passenden belegt'),
    artist: z.string().max(80).describe('Interpret oder Urheber, leer wenn unbekannt'),
    commercial: z.boolean().describe('Laut Recherche in der kommerziellen Musikbibliothek von TikTok (für Unternehmenskonten freigegeben)'),
    why: z.string().max(200).describe('Warum er zu diesem Video passt, kurz'),
  })
  .describe('Sound-Tipp für TikTok: wird in der TikTok-App zum Video gelegt, nicht in die Datei');

/** Recent styles, newest first, from the drafts in the context. */
const recentStyles = (drafts = []) => drafts.map((d) => d.music?.style).filter((s) => STYLE_KEYS.includes(s));

/**
 * The styles to use, in the order of `wanted`: Claude's choice, unless it is
 * the same as the video right before (in this run or the last one); then the
 * style used least recently.
 */
function chooseStyles(wanted, recent = []) {
  const history = [...recent];
  return wanted.map((style) => {
    let pick = STYLE_KEYS.includes(style) ? style : null;
    if (!pick || pick === history[0]) {
      const age = (s) => {
        const i = history.indexOf(s);
        return i === -1 ? Infinity : i;
      };
      pick = STYLE_KEYS.filter((s) => s !== history[0]).sort((a, b) => age(b) - age(a))[0];
    }
    history.unshift(pick);
    return pick;
  });
}

/** A whole number from the campaign name: the same video sounds the same when re-rendered. */
function seedFor(campaign) {
  let h = 2166136261;
  for (const ch of String(campaign)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The tip as the backend stores it, or null when there is none. */
const soundTip = (s) => (s?.title?.trim() ? { title: s.title.trim(), artist: s.artist?.trim() || '', commercial: !!s.commercial, why: s.why?.trim() || '' } : null);

/** The briefing part on music and sound, for app and hero videos alike. */
function rules(recent = []) {
  const last = recent.slice(0, 6).map((s) => STYLES[s].label);
  return `- Musik: Jedes Video bekommt eigene Musik (aus Code, frei von Rechten). Wähle pro Video den Stil, der zur Stimmung passt, und sorg für Abwechslung: nie zweimal hintereinander derselbe, und möglichst keiner, der in den letzten Videos schon lief${last.length ? ` (zuletzt, neueste zuerst: ${last.join(', ')})` : ''}. Tonart, Akkorde und Tempo variieren von selbst. Die Stile:
${STYLE_KEYS.map((k) => `  - ${k}: ${STYLES[k].label}, ${STYLES[k].bpm} bpm; ${STYLES[k].mood}`).join('\n')}
- Sound-Tipp (sound): ein Sound, der laut Trend-Recherche gerade auf TikTok läuft und zur Stimmung des Videos passt. Die Person legt ihn in der TikTok-App zum Video, bevor sie es veröffentlicht. Schlag fast immer einen vor: Passt ein Sound aus der kommerziellen Musikbibliothek (für Unternehmenskonten freigegeben), nimm den, mit commercial: true, aber nur, wenn die Recherche das belegt. Sonst nimm einen anderen Trend-Sound aus der Recherche mit commercial: false; die Person prüft dann in TikTok, ob er für ihr Konto verfügbar ist. Nur Sounds, die in der Recherche stehen, nichts erfinden; leer (title leer) nur, wenn die Recherche gar keine Sounds nennt. Keinen Sound zweimal hintereinander. Songtexte gehören nicht in die Texte des Videos.`;
}

/** Saved plans from before music and sound tips: lo-fi (as then), no tip. */
function withDefaults(plan) {
  const fill = (d) => ({ music: 'lofi', sound: { title: '', artist: '', commercial: false, why: '' }, ...d });
  return plan.drafts ? { ...plan, drafts: plan.drafts.map(fill) } : fill(plan);
}

module.exports = { STYLE_KEYS, Music, Sound, recentStyles, chooseStyles, seedFor, soundTip, rules, withDefaults };
