// Hero video (twice a week): the next episode of the running story with the
// recurring characters. Claude writes the episode, Veo films 2–3 shots with the
// chosen reference images, Claude checks the clips (one more take for a bad
// one if the budget allows), Gemini listens for words nobody planned (those
// clips are muted), then the cut: scenes with captions, the real
// app screen, the end card, music. The draft is marked as AI and waits for
// approval in the admin console like every other video.
//
// Every paid call is reserved against the daily and weekly budget first; if
// the budget doesn't cover at least two shots today, there is no hero video.
//
//   ANTHROPIC_API_KEY=… GEMINI_API_KEY=… MARKETING_AGENT_KEY=… node agent/hero.js
//   node agent/hero.js --plan p.json --clips dir/   # test the cut: saved plan, clips dir/1.mp4 …, no backend
const fs = require('fs');
const path = require('path');
const { markOnly } = require('../../docs/brand/logo');
const { launch } = require('../video');
const { HeroPlan, Review } = require('./hero-schema');
const heroPrompt = require('./hero-prompt');
const { ask } = require('./claude');
const { byKey, ensureReferences } = require('./characters');
const { generateClip, SECONDS } = require('./veo');
const { cutHero, frames } = require('./cut');
const { trends } = require('./trends');
const { listen } = require('./speech');
const { KEY, backend, spent, uploadDraft, today, dayTag, videoCost, BudgetExceeded } = require('./common');
const { chooseStyles, recentStyles, soundTip, withDefaults } = require('./soundtrack');

const OUT = path.join(__dirname, '../dist/agent');
const SITE = (process.env.SITE_URL || 'https://wannayap.app').replace(/^https?:\/\//, '');
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const PLAN_FILE = arg('--plan');
const CLIPS_DIR = arg('--clips');
// Trend research, plan and the check of the clips (Claude), kept free on top of the clips
const OVERHEAD_EUR = 1.3;
const MAX_RETAKES = 1;

/** Claude looks at three frames of every clip next to the reference image. */
async function review(plan, clips, tmp) {
  const content = [{ type: 'text', text: `Prüfe die Aufnahmen für das Hero-Video „${plan.title}“. Jede Aufnahme ist ${SECONDS} Sekunden lang; von jeder zeige ich dir drei Standbilder (bei 1,5 s, 4 s und 6,5 s). Eine Aufnahme ist nicht ok bei: verformten Händen oder Gesichtern, lesbarem Text oder Handy-Bildschirm, Logos, einer Person, die nicht zur Referenz passt, Kindern im Bild, oder wenn die Handlung nicht zu sehen ist. Kleine Schönheitsfehler sind ok. Wähle für jede Aufnahme den besten Startpunkt für den Ausschnitt der angegebenen Länge.` }];
  for (const [i, shot] of plan.shots.entries()) {
    const character = byKey(shot.character);
    content.push({ type: 'text', text: `\nAufnahme ${i + 1}: ${shot.action} (Figur: ${character?.name || 'keine'}, Ausschnitt ${shot.seconds} s)` });
    if (clips[i].reference) content.push({ type: 'text', text: 'Referenzbild der Figur:' }, { type: 'image', source: { type: 'url', url: clips[i].reference } });
    for (const f of frames(clips[i].file, [1.5, 4, 6.5], tmp, `review-${i}`)) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(f).toString('base64') } });
    }
  }
  const { output } = await ask({ schema: Review, system: 'Du prüfst KI-Videoaufnahmen für Werbung auf handwerkliche Fehler. Sei streng bei Gesichtern, Händen und lesbarem Text, großzügig bei Stilfragen. Antworte mit einem Eintrag pro Aufnahme in der gegebenen Reihenfolge.', content, purpose: 'review', effort: 'medium', maxTokens: 6000 });
  return plan.shots.map((shot, i) => {
    const r = output.shots[i] || { ok: true, problems: '', bestStart: 0 };
    return { ...r, bestStart: Math.max(0, Math.min(r.bestStart, SECONDS - shot.seconds)) };
  });
}

/** A saved plan; plans from before spoken lines existed have none. */
function savedPlan(file) {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = plan.plan || plan;
  return withDefaults({ ...p, shots: (p.shots || []).map((s) => ({ line: '', ...s })) });
}

async function main() {
  const test = !!(PLAN_FILE && CLIPS_DIR);
  if (!test && !KEY) throw new Error('MARKETING_AGENT_KEY fehlt (oder --plan … --clips … zum Testen)');
  const context = KEY ? await backend('GET', '/marketing/context') : { visits: null, drafts: [], characters: [], budget: null };

  // Characters with a chosen reference image; propose images for the others
  const characters = test ? [] : await ensureReferences(context.characters);
  const available = test ? [] : characters.filter((c) => c.chosen).map((c) => ({ ...byKey(c.key), chosen: c.chosen })).filter((c) => c.key);
  if (!test && !available.length) {
    console.log('::warning::Noch kein Referenzbild gewählt (Konsole → Freigabe → Figuren). Heute kein Hero-Video.');
    return;
  }

  // How many shots the budget covers today
  const left = context.budget?.leftEur ?? Infinity;
  const maxShots = test ? 3 : Math.min(3, Math.floor((left - OVERHEAD_EUR) / videoCost(SECONDS)));
  if (maxShots < 2) {
    console.log(`::warning::Budget reicht heute nicht für ein Hero-Video (noch ${left} € frei, gebraucht mindestens ${(OVERHEAD_EUR + 2 * videoCost(SECONDS)).toFixed(2)} €).`);
    return;
  }

  const trendNotes = PLAN_FILE ? null : await trends();
  const { output: plan, model } = PLAN_FILE
    ? { output: HeroPlan.parse(savedPlan(PLAN_FILE)), model: null }
    : await ask({ schema: HeroPlan, system: heroPrompt.system(), content: heroPrompt.user({ today: today(), context, available, maxShots, trendNotes }), purpose: 'plan-hero' });
  plan.shots = plan.shots.slice(0, maxShots);
  // Only characters that have a reference image may appear
  for (const shot of plan.shots) if (!test && shot.character !== 'none' && !available.some((c) => c.key === shot.character)) shot.character = 'none';
  console.log(`\nAnalyse: ${plan.analysis}\nFolge: ${plan.title}: ${plan.episode}\n`);

  const day = dayTag();
  const campaign = `yap-${day}-${plan.slug}`;
  const [style] = chooseStyles([plan.music], recentStyles(context.drafts));
  const sound = soundTip(plan.sound);
  console.log(`Musik: ${style}${sound ? `, Sound-Tipp: ${sound.title}` : ''}`);
  const tmp = path.join(OUT, `.hero-${plan.slug}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  // Film the shots
  const clips = [];
  for (const [i, shot] of plan.shots.entries()) {
    const character = available.find((c) => c.key === shot.character);
    const file = path.join(tmp, `clip-${i + 1}.mp4`);
    if (test) fs.copyFileSync(path.join(CLIPS_DIR, `${i + 1}.mp4`), file);
    else {
      console.log(`→ Aufnahme ${i + 1}: ${shot.action}`);
      await generateClip({ shot, look: character?.look, reference: character?.chosen, out: file, campaign });
    }
    clips.push({ file, reference: character?.chosen || null, look: character?.look });
  }

  // Check them; one more take for the worst one if the budget allows
  let checks = test ? plan.shots.map(() => ({ ok: true, problems: '', bestStart: 1 })) : await review(plan, clips, tmp);
  for (let retake = 0; retake < MAX_RETAKES; retake++) {
    const bad = checks.findIndex((c) => !c.ok);
    if (bad < 0) break;
    console.log(`  Aufnahme ${bad + 1} nicht gut: ${checks[bad].problems}. Neue Aufnahme …`);
    try {
      await generateClip({ shot: plan.shots[bad], look: clips[bad].look, reference: clips[bad].reference, out: clips[bad].file, campaign, hint: checks[bad].problems });
      checks = await review(plan, clips, tmp);
    } catch (err) {
      if (!(err instanceof BudgetExceeded)) throw err;
      console.log(`  ${err.message}`);
      break;
    }
  }
  const warnings = checks.map((c, i) => (c.ok ? null : `Aufnahme ${i + 1}: ${c.problems}`)).filter(Boolean);

  // Listen: words nobody planned (Veo likes to add English chatter) are muted
  for (const [i, shot] of plan.shots.entries()) {
    if (test) break;
    let heard;
    try {
      heard = await listen(clips[i].file, { campaign, tmp });
    } catch (err) {
      // Also when the budget is used up: the clips are paid for, the video still gets cut
      warnings.push(`Aufnahme ${i + 1}: Ton nicht geprüft (${err.message.slice(0, 120)})`);
      continue;
    }
    if (!heard.speech) continue;
    if (shot.line && heard.language === 'de') clips[i].voice = true;
    else {
      clips[i].mute = true;
      warnings.push(`Aufnahme ${i + 1}: Ton stumm geschaltet, Veo ließ ${heard.language ? `auf „${heard.language}“ ` : ''}sprechen${heard.words ? ` („${heard.words.slice(0, 80)}“)` : ''}`);
    }
    console.log(`  Aufnahme ${i + 1}: gesprochen (${heard.language || '?'}): ${heard.words || '–'}${clips[i].mute ? ' → stumm' : ''}`);
  }

  // The cut
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  const browser = await launch();
  let video;
  try {
    video = await cutHero({
      browser,
      shots: plan.shots.map((s, i) => ({ file: clips[i].file, start: checks[i].bestStart, seconds: s.seconds, caption: s.caption, mute: !!clips[i].mute, voice: !!clips[i].voice })),
      app: { payoff: plan.payoff, screen: plan.screen },
      logoSvg,
      shortUrl: SITE,
      out: path.join(OUT, `${day}-hero-${plan.slug}.mp4`),
      tmp: path.join(tmp, 'cut'),
      music: { style, campaign },
    });
  } finally {
    await browser.close();
  }
  fs.writeFileSync(video.file.replace(/\.mp4$/, '.json'), JSON.stringify({ plan, checks }, null, 2));
  console.log(`✓ ${path.relative(process.cwd(), video.file)} (${video.seconds} s)`);
  if (test) return;

  const uploaded = await uploadDraft(campaign, {
    kind: 'hero',
    ai: true,
    template: 'hero',
    title: plan.title,
    idea: warnings.length ? `${plan.idea}\n\nPrüfung: ${warnings.join(' · ')}` : plan.idea,
    episode: plan.episode,
    characters: [...new Set(plan.shots.map((s) => s.character).filter((k) => k !== 'none'))],
    content: { shots: plan.shots.map(({ character, action, caption, line, seconds }) => ({ character, action, caption, line, seconds })), payoff: plan.payoff, screen: plan.screen },
    seconds: video.seconds,
    // The AI label comes from the platforms (set when posting), not from the text
    captions: plan.captions,
    hashtags: plan.hashtags,
    music: { style },
    sound,
    model,
    costEur: spent(),
  }, video.file);
  const { pending, mailed } = await backend('POST', '/marketing/notify');
  console.log(`\nHero-Video ${uploaded} hochgeladen, ${pending} warten auf Freigabe, ${mailed} Mail(s). Kosten: ${spent().toFixed(2)} €`);
}

main().catch((err) => {
  if (err instanceof BudgetExceeded) {
    console.log(`::warning::${err.message}`);
    return;
  }
  console.error(err);
  process.exit(1);
});
