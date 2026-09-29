// What the model has to return (structured output): an analysis of the numbers
// and a few ad drafts, each filling one template from src/templates.js. The
// SDK sends the shape to the API and checks the limits here after the answer.
const { z } = require('zod');
const { SCREENS, LIMITS } = require('../src/templates');
const { Music, Sound } = require('./soundtrack');

const text = (max, what) => z.string().min(1).max(max).describe(`${what}, höchstens ${max} Zeichen`);
const highlighted = (max, what) => text(max, `${what}; genau eine Stelle in *Sternchen* wird farbig hervorgehoben`);

const Chat = z.object({
  template: z.literal('chat'),
  eyebrow: z.string().max(LIMITS.eyebrow).describe(`Kleine Zeile über dem Hook, darf leer sein, höchstens ${LIMITS.eyebrow} Zeichen`),
  hook: highlighted(LIMITS.hook, 'Hook in der ersten Sekunde'),
  bubbles: z
    .array(z.object({ from: z.enum(['me', 'them']), text: text(LIMITS.bubble, 'Chatnachricht') }))
    .min(LIMITS.bubbles[0])
    .max(LIMITS.bubbles[1])
    .describe(`${LIMITS.bubbles[0]}–${LIMITS.bubbles[1]} Chatnachrichten, die am Ende durchgestrichen werden`),
  payoff: highlighted(LIMITS.payoff, 'Auflösung über dem App-Screen'),
  screen: z.enum(SCREENS),
});

const Moment = z.object({
  template: z.literal('moment'),
  eyebrow: z.string().max(LIMITS.eyebrow).describe(`Kleine Zeile über dem Hook, darf leer sein, höchstens ${LIMITS.eyebrow} Zeichen`),
  hook: highlighted(LIMITS.hook, 'Hook in der ersten Sekunde'),
  pushes: z
    .array(
      z.object({
        initial: z.string().min(1).max(1).describe('Anfangsbuchstabe des Namens'),
        title: text(LIMITS.pushTitle, 'z. B. „Mila ist dabei“'),
        sub: text(LIMITS.pushSub, 'kurze Unterzeile'),
      }),
    )
    .min(LIMITS.pushes[0])
    .max(LIMITS.pushes[1]),
});

const List = z.object({
  template: z.literal('list'),
  lines: z
    .array(text(LIMITS.line, 'kurze Zeile, wird durchgestrichen'))
    .min(LIMITS.lines[0])
    .max(LIMITS.lines[1]),
  punch: text(LIMITS.punch, 'Pointe nach den durchgestrichenen Zeilen, ganz farbig'),
  payoff: highlighted(LIMITS.payoff, 'Auflösung über dem App-Screen'),
  screen: z.enum(SCREENS),
});

const Draft = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+){0,4}$/)
    .max(30)
    .describe('Kurzname für den Kampagnen-Link, klein, mit Bindestrichen, z. B. "oma-sonntag"'),
  title: text(80, 'Arbeitstitel für die Freigabe'),
  idea: text(600, 'Warum dieses Video, welche Hypothese es testet und worauf es sich in den Zahlen oder im Feedback stützt'),
  ad: z.discriminatedUnion('template', [Chat, Moment, List]),
  captions: z.object({
    instagram: text(600, 'Caption für Instagram Reels, mit Call to Action „Link in Bio“'),
    tiktok: text(300, 'Caption für TikTok, kürzer und lockerer'),
  }),
  hashtags: z.array(z.string().regex(/^[a-z0-9äöüß_]+$/).max(30)).min(3).max(5).describe('ohne #, klein geschrieben, 3–5'),
  music: Music,
  sound: Sound,
});

const Plan = z.object({
  analysis: text(1200, 'Was die Zahlen und das Feedback der letzten Tage sagen, kurz'),
  drafts: z.array(Draft).min(1).max(4),
});

module.exports = { Plan, Draft };
