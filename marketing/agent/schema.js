// What the model has to return (structured output): an analysis of the numbers
// and a few ad drafts, each a 25–30 s story from the blocks in
// src/templates.js. The SDK sends the shape to the API and checks the limits
// here after the answer. Saved plans with the older short templates (chat,
// moment, list) still load for re-rendering (PlanFile).
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

/** Captions and hashtags: short, not salesy, English tags (agent/texts.js). */
const Captions = z.object({
  instagram: text(220, 'Caption für Instagram Reels: ein, zwei kurze Sätze, nicht werblich, 0–2 Emojis'),
  tiktok: text(160, 'Caption für TikTok: noch kürzer und lockerer, 0–2 Emojis'),
});
const Hashtags = z.array(z.string().regex(/^[a-z0-9_]+$/).max(30)).min(3).max(5).describe('englisch, ohne #, klein geschrieben, 3–5, immer "wannayap"');

// The blocks of a story (src/templates.js → BLOCKS)
const TextBlock = z.object({
  type: z.literal('text'),
  eyebrow: z.string().max(LIMITS.eyebrow).describe(`Kleine Zeile darüber, darf leer sein, höchstens ${LIMITS.eyebrow} Zeichen`),
  text: highlighted(LIMITS.text, 'Ein großer Satz: Hook, Wendung oder Pointe'),
});
const ChatBlock = z.object({
  type: z.literal('chat'),
  hook: z.string().max(LIMITS.hook).describe(`Hook über dem Chat (im ersten Block), sonst leer; höchstens ${LIMITS.hook} Zeichen, eine Stelle in *Sternchen*`),
  bubbles: z
    .array(
      z.object({
        from: z.enum(['me', 'them']),
        name: z.string().max(LIMITS.name).describe('Vorname über der Nachricht bei „them“ (z. B. Jonas, Oma), darf leer sein'),
        text: text(LIMITS.bubble, 'Chatnachricht, gesprochenes Deutsch'),
      }),
    )
    .min(LIMITS.storyBubbles[0])
    .max(LIMITS.storyBubbles[1]),
  strike: z.boolean().describe('true: Der Chat führt nie zu einem Anruf und wird am Ende durchgestrichen'),
});
const ListBlock = z.object({
  type: z.literal('list'),
  lines: z
    .array(text(LIMITS.line, 'kurze Zeile, wird durchgestrichen'))
    .min(LIMITS.lines[0])
    .max(LIMITS.lines[1]),
  punch: text(LIMITS.punch, 'Pointe nach den durchgestrichenen Zeilen, ganz farbig'),
});
const MomentBlock = z.object({
  type: z.literal('moment'),
  hook: z.string().max(LIMITS.hook).describe(`Satz über der Uhr, darf leer sein, höchstens ${LIMITS.hook} Zeichen, eine Stelle in *Sternchen*`),
  pushes: Moment.shape.pushes,
});
const AppBlock = z.object({
  type: z.literal('app'),
  payoff: highlighted(LIMITS.payoff, 'Auflösung über dem echten App-Screen'),
  screen: z.enum(SCREENS),
});

const Story = z.object({
  template: z.literal('story'),
  blocks: z
    .array(z.discriminatedUnion('type', [TextBlock, ChatBlock, ListBlock, MomentBlock, AppBlock]))
    .min(LIMITS.blocks[0])
    .max(LIMITS.blocks[1])
    .describe('Die Szenen der Geschichte in ihrer Reihenfolge; der erste Block ist der Hook, mindestens ein app-Block, nie als erster'),
});

/**
 * Two other ways into the same story (plan 2.14), uploaded with the draft and
 * shown in the console, for a later test of which hook carries. Saved plans
 * from before have none.
 */
const HookVariants = z
  .array(text(120, 'Hook-Variante: ein anderer Einstieg in dieselbe Geschichte (Frage, POV, Konflikt, Zitat), nicht der Hook aus dem ersten Block'))
  .length(2)
  .describe('Genau zwei Hook-Varianten, je höchstens 120 Zeichen');

const draft = (ad, hooks = HookVariants) =>
  z.object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+){0,4}$/)
      .max(30)
      .describe('Kurzname für den Kampagnen-Link, klein, mit Bindestrichen, z. B. "oma-sonntag"'),
    title: text(80, 'Arbeitstitel für die Freigabe'),
    idea: text(600, 'Warum dieses Video, welche Hypothese es testet und worauf es sich in den Zahlen oder im Feedback stützt'),
    ad,
    hookVariants: hooks,
    captions: Captions,
    hashtags: Hashtags,
    music: Music,
    sound: Sound,
  });

const Draft = draft(Story);
const Plan = z.object({
  analysis: text(1200, 'Was die Zahlen und das Feedback der letzten Tage sagen, kurz'),
  drafts: z.array(Draft).min(1).max(4),
});
/** A saved plan (--plan), also one from before the stories. */
const PlanFile = z.object({
  analysis: z.string(),
  drafts: z.array(draft(z.discriminatedUnion('template', [Story, Chat, Moment, List]), z.array(z.string()).max(2).optional())).min(1),
});

module.exports = { Plan, PlanFile, Draft, Captions, Hashtags, HookVariants };
