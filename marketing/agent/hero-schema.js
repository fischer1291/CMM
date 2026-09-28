// What Claude returns for a hero video (one episode of the running story)
// and for the check of the generated clips.
const { z } = require('zod');
const { SCREENS, LIMITS } = require('../src/templates');
const { CHARACTERS } = require('./characters');

const text = (max, what) => z.string().min(1).max(max).describe(`${what}, höchstens ${max} Zeichen`);

const Shot = z.object({
  character: z.enum([...CHARACTERS.map((c) => c.key), 'none']).describe('Wer im Bild ist (Referenzbild wird mitgegeben), "none" für Einstellungen ohne erkennbare Person'),
  action: text(200, 'Was in der Einstellung passiert, auf Deutsch, für die Freigabe'),
  prompt: text(700, 'Bildbeschreibung für den Videogenerator auf Englisch: Ort, Licht, Handlung, Kamera. Ohne Aussehen der Figur (kommt vom Referenzbild) und ohne Stil (wird angehängt)'),
  caption: z.string().max(56).describe('Untertitel auf Deutsch, der eingeblendet wird (höchstens 56 Zeichen, darf leer sein)'),
  line: z.string().max(60).describe('Satz auf Deutsch, den die Figur hörbar sagt, höchstens 8 Wörter; fast immer leer, höchstens eine Einstellung pro Folge'),
  seconds: z.number().min(2.5).max(5).describe('Wie viele Sekunden der 8-Sekunden-Aufnahme ins Video kommen'),
});

const HeroPlan = z.object({
  analysis: text(1000, 'Was die Zahlen, das Feedback und die bisherige Geschichte für diese Folge bedeuten, kurz'),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+){0,4}$/).max(30).describe('Kurzname für den Kampagnen-Link, z. B. "anna-erste-nacht"'),
  title: text(80, 'Arbeitstitel der Folge'),
  idea: text(600, 'Welche Hypothese die Folge testet und warum'),
  episode: text(600, 'Was in dieser Folge passiert, als Gedächtnis für die nächsten Folgen'),
  shots: z.array(Shot).min(2).max(3),
  payoff: text(LIMITS.payoff, 'Auflösung über dem echten App-Screen nach den Szenen; genau eine Stelle in *Sternchen* wird farbig'),
  screen: z.enum(SCREENS),
  captions: z.object({
    instagram: text(600, 'Caption für Instagram Reels mit „Link in Bio“'),
    tiktok: text(300, 'Caption für TikTok, kürzer und lockerer'),
  }),
  hashtags: z.array(z.string().regex(/^[a-z0-9äöüß_]+$/).max(30)).min(3).max(5).describe('ohne #, klein geschrieben, 3–5'),
});

const Review = z.object({
  shots: z.array(
    z.object({
      ok: z.boolean().describe('Taugt die Aufnahme für ein Werbevideo?'),
      problems: z.string().max(300).describe('Was nicht stimmt (leer, wenn ok)'),
      bestStart: z.number().min(0).max(5.5).describe('Ab welcher Sekunde der Aufnahme der Ausschnitt am besten ist'),
    }),
  ),
});

module.exports = { HeroPlan, Review };
