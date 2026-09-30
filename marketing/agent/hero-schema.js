// What Claude returns for a hero video (one episode of a character's series)
// and for the check of the generated clips.
const { z } = require('zod');
const { SCREENS, LIMITS } = require('../src/templates');
const { CHARACTERS } = require('./characters');
const { Music, Sound } = require('./soundtrack');
const { Captions, Hashtags } = require('./schema');

// Up to this many Veo shots per episode (the budget may allow fewer)
const MAX_SHOTS = 7;

const text = (max, what) => z.string().min(1).max(max).describe(`${what}, höchstens ${max} Zeichen`);
const keys = CHARACTERS.map((c) => c.key);

const Shot = z.object({
  character: z.enum([...keys, 'none']).describe('Wer im Bild ist (Referenzbild wird mitgegeben), "none" für Einstellungen ohne erkennbare Person'),
  action: text(200, 'Was in der Einstellung passiert, auf Deutsch, für die Freigabe'),
  prompt: text(700, 'Bildbeschreibung für den Videogenerator auf Englisch: Ort, Licht, Handlung, Mimik, Kamera. Ohne Aussehen der Figur (kommt vom Referenzbild), ohne Stil (wird angehängt) und ohne gesprochenen Text (der steht in line)'),
  line: z.string().max(90).describe('Was die Figur im Bild hörbar auf Deutsch sagt: ein natürlicher Satz, höchstens 12 Wörter; leer, wenn in dieser Einstellung niemand spricht'),
  caption: z.string().max(80).describe('Untertitel auf Deutsch (höchstens 80 Zeichen, darf leer sein); bei einem gesprochenen Satz genau dieser Satz'),
  seconds: z.number().min(2).max(6).describe('Wie viele Sekunden der 8-Sekunden-Aufnahme ins Video kommen; mit gesprochenem Satz mindestens Wörter ÷ 2,5 + 1'),
});

const HeroPlan = z.object({
  analysis: text(1000, 'Was die Zahlen, das Feedback und die bisherige Geschichte der Serie für diese Folge bedeuten, kurz'),
  series: z.enum(keys).describe('Wessen Serie diese Folge ist (Schlüssel der Hauptfigur)'),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+){0,4}$/).max(30).describe('Kurzname für den Kampagnen-Link, z. B. "anna-erste-nacht"'),
  title: text(60, 'Titel der Folge (ohne Serienname und Nummer, die setzt der Code davor)'),
  idea: text(600, 'Welche Hypothese die Folge testet und warum'),
  episode: text(600, 'Was in dieser Folge passiert, als Gedächtnis für die nächsten Folgen'),
  teaser: text(200, 'Der offene Faden am Ende (Cliffhanger oder Frage), an den die nächste Folge anknüpft'),
  hook: text(44, 'Text oben im Bild während der ersten Einstellung: der Hook, verständlich ohne Ton, eine Stelle in *Sternchen*'),
  shots: z.array(Shot).min(2).max(MAX_SHOTS),
  appAfter: z.number().int().min(1).max(MAX_SHOTS).describe('Nach der wievielten Einstellung der echte App-Screen kommt (die Wendung der Folge); die Einstellungen danach sind der Payoff'),
  payoff: text(LIMITS.payoff, 'Satz über dem echten App-Screen; genau eine Stelle in *Sternchen* wird farbig'),
  screen: z.enum(SCREENS),
  captions: Captions,
  hashtags: Hashtags,
  music: Music,
  sound: Sound,
});

const Review = z.object({
  shots: z.array(
    z.object({
      ok: z.boolean().describe('Taugt die Aufnahme für ein Werbevideo?'),
      problems: z.string().max(300).describe('Was nicht stimmt (leer, wenn ok)'),
      bestStart: z.number().min(0).max(6).describe('Ab welcher Sekunde der Aufnahme der Ausschnitt am besten ist'),
    }),
  ),
});

module.exports = { HeroPlan, Review, MAX_SHOTS };
