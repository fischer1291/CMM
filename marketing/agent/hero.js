// Hero video (twice a week): the next episode of one character's series, up
// to 40 s. Claude writes the episode with German dialogue, Veo films up to 7
// shots with the chosen reference images and each character's voice, Claude
// checks the pictures and Gemini listens (a planned line must come in German
// and roughly as written; a bad take is filmed again while the budget
// allows, otherwise its sound is muted and the caption carries the line).
// Then the cut: series label and hook on the first scene, captions, the real
// app screen as the turn, the payoff scenes, the end card, music that ducks
// under the voices. The draft is marked as AI and waits for approval in the
// admin console like every other video.
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
const { HeroPlan, Review, MAX_SHOTS } = require('./hero-schema');
const heroPrompt = require('./hero-prompt');
const { ask } = require('./claude');
const { byKey, ensureReferences } = require('./characters');
const { generateClip, SECONDS } = require('./veo');
const { cutHero, frames } = require('./cut');
const { trends } = require('./trends');
const { listen } = require('./speech');
const { tidy } = require('./texts');
const { KEY, backend, spent, uploadDraft, today, dayTag, videoCost, BudgetExceeded } = require('./common');
const { chooseStyles, recentStyles, soundTip, withDefaults } = require('./soundtrack');

const { MAX_SCENES, seriesHistory, aired } = heroPrompt;
const OUT = path.join(__dirname, '../dist/agent');
const SITE = (process.env.SITE_URL || 'https://wannayap.app').replace(/^https?:\/\//, '');
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const PLAN_FILE = arg('--plan');
const CLIPS_DIR = arg('--clips');
// Trend research, plan and the checks of the clips (Claude, Gemini), kept free on top of the clips
const OVERHEAD_EUR = 2;
const MAX_RETAKES = 2;
// Around a spoken line in the cut (seconds before the first and after the last word)
const LEAD = 0.35;
const TAIL = 0.45;
const MIN_SHOT = 2;

/** Share of the planned words that were heard (0–1). */
function heardShare(planned, heard) {
  const words = (t) => String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const want = words(planned);
  const got = new Set(words(heard));
  return want.length ? want.filter((w) => got.has(w)).length / want.length : 1;
}

/** What is wrong with the sound of a shot that plans a line, or null. */
function speechProblem(shot, heard) {
  if (!shot.line || !heard) return null;
  if (!heard.speech) return 'kein gesprochener Satz zu hören';
  if (heard.language !== 'de') return `sprach ${heard.language ? `„${heard.language}“` : 'eine andere Sprache'} statt Deutsch`;
  if (heardShare(shot.line, heard.words) < 0.6) return `sagte „${(heard.words || '').slice(0, 80)}“ statt „${shot.line}“`;
  return null;
}

/**
 * Where each shot is cut from its clip: the reviewed best start, moved and
 * lengthened so a kept spoken line is whole. Then the scenes are shortened to
 * fit the episode into MAX_SCENES, where there is most to spare; a line is
 * never cut.
 */
function planCut(shots, checks, clips, warnings) {
  const parts = shots.map((shot, i) => {
    let start = checks[i].bestStart;
    let seconds = shot.seconds;
    const h = clips[i].heard;
    const lock = clips[i].voice && h?.start != null ? { from: Math.max(0, h.start - LEAD), to: Math.min(SECONDS, h.end + TAIL) } : null;
    if (lock && (start > lock.from || start + seconds < lock.to)) {
      start = lock.from;
      seconds = Math.max(seconds, lock.to - lock.from);
    }
    seconds = Math.min(seconds, SECONDS - start);
    return { start, seconds, lock };
  });
  const total = () => parts.reduce((n, p) => n + p.seconds, 0);
  // Frame by frame from the shot with the most time to spare
  const spare = (p) => p.seconds - (p.lock ? p.lock.to - p.lock.from : MIN_SHOT);
  for (let over = total() - MAX_SCENES; over > 1e-6; over = total() - MAX_SCENES) {
    const part = parts.reduce((a, b) => (spare(b) > spare(a) ? b : a));
    if (spare(part) <= 1e-6) break;
    part.seconds -= Math.min(over, spare(part), 1 / 30);
    if (part.lock) part.start = Math.min(Math.max(part.start, part.lock.to - part.seconds), part.lock.from);
  }
  if (total() > MAX_SCENES + 0.05) warnings.push(`Folge länger als geplant (${total().toFixed(1)} s Szenen): die Sätze passen nicht kürzer`);
  // Whole frames, rounded down so the episode never grows past its limit
  return parts.map((p) => ({ start: Math.round(p.start * 30) / 30, seconds: Math.floor(p.seconds * 30 + 1e-6) / 30 }));
}

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
    return { ...r, bestStart: Math.max(0, Math.min(r.bestStart, SECONDS - Math.min(shot.seconds, SECONDS))) };
  });
}

/** A saved plan; older ones get what they lack (lines, series, hook, the app at the end). */
function savedPlan(file) {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = plan.plan || plan;
  const shots = (p.shots || []).map((s) => ({ line: '', ...s }));
  const first = shots.find((s) => s.character && s.character !== 'none')?.character;
  const cut = (t, n) => String(t || '').slice(0, n);
  return withDefaults({
    series: first || 'anna',
    hook: cut(p.title, 44),
    teaser: '–',
    appAfter: Math.max(1, shots.length - 1),
    ...p,
    title: cut(p.title, 60),
    captions: { instagram: cut(p.captions?.instagram, 220), tiktok: cut(p.captions?.tiktok, 160) },
    shots,
  });
}

async function main() {
  const test = !!(PLAN_FILE && CLIPS_DIR);
  if (!test && !KEY) throw new Error('MARKETING_AGENT_KEY fehlt (oder --plan … --clips … zum Testen)');
  const context = KEY ? await backend('GET', '/marketing/context') : { visits: null, drafts: [], heroes: [], characters: [], budget: null };

  // Characters with a chosen reference image; propose images for the others
  const characters = test ? [] : await ensureReferences(context.characters);
  const available = test ? [] : characters.filter((c) => c.chosen).map((c) => ({ ...byKey(c.key), chosen: c.chosen })).filter((c) => c.key);
  if (!test && !available.length) {
    console.log('::warning::Noch kein Referenzbild gewählt (Konsole → Freigabe → Figuren). Heute kein Hero-Video.');
    return;
  }

  // How many shots the budget covers today
  const left = context.budget?.leftEur ?? Infinity;
  const maxShots = test ? MAX_SHOTS : Math.min(MAX_SHOTS, Math.floor((left - OVERHEAD_EUR) / videoCost(SECONDS)));
  if (maxShots < 2) {
    console.log(`::warning::Budget reicht heute nicht für ein Hero-Video (noch ${left} € frei, gebraucht mindestens ${(OVERHEAD_EUR + 2 * videoCost(SECONDS)).toFixed(2)} €).`);
    return;
  }
  if (maxShots < 5) console.log(`::notice::Budget reicht heute für ${maxShots} Einstellungen: eine kurze Folge. Für bis zu 40 s braucht es rund ${(OVERHEAD_EUR + MAX_SHOTS * videoCost(SECONDS)).toFixed(0)} € (plus Neudrehs) am Hero-Tag.`);

  const trendNotes = PLAN_FILE ? null : await trends();
  const { output: plan, model } = PLAN_FILE
    ? { output: HeroPlan.parse(savedPlan(PLAN_FILE)), model: null }
    : await ask({ schema: HeroPlan, system: heroPrompt.system(), content: heroPrompt.user({ today: today(), context, available, maxShots, trendNotes }), purpose: 'plan-hero' });
  plan.shots = plan.shots.slice(0, maxShots);
  // Only characters that have a reference image may appear
  for (const shot of plan.shots) if (!test && shot.character !== 'none' && !available.some((c) => c.key === shot.character)) shot.character = 'none';
  // The series: its main character needs a reference image
  if (!test && !available.some((c) => c.key === plan.series)) {
    const other = plan.shots.find((s) => s.character !== 'none')?.character || available[0].key;
    console.log(`::warning::Serie „${plan.series}“ ohne Referenzbild, Folge läuft unter „${other}“`);
    plan.series = other;
  }
  const hero = byKey(plan.series);
  const episodeNo = aired(seriesHistory(context.heroes || context.drafts.filter((d) => d.kind === 'hero'))[hero.key] || []).length + 1;
  const label = `${hero.series.title} · Folge ${episodeNo}`;
  // The app comes as the turn, with at least one scene after it
  plan.appAfter = Math.max(1, Math.min(plan.appAfter, plan.shots.length - 1));
  console.log(`\nAnalyse: ${plan.analysis}\n${label}: ${plan.title}\n${plan.episode}\nOffener Faden: ${plan.teaser}\n`);

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
  const film = (i, hint) => {
    const shot = plan.shots[i];
    const character = available.find((c) => c.key === shot.character);
    return generateClip({ shot, look: character?.look, voice: character?.voice, reference: character?.chosen, out: clips[i].file, campaign, hint });
  };
  for (const [i, shot] of plan.shots.entries()) {
    const character = available.find((c) => c.key === shot.character);
    clips.push({ file: path.join(tmp, `clip-${i + 1}.mp4`), reference: character?.chosen || null });
    if (test) fs.copyFileSync(path.join(CLIPS_DIR, `${i + 1}.mp4`), clips[i].file);
    else {
      console.log(`→ Aufnahme ${i + 1}: ${shot.action}${shot.line ? ` („${shot.line}“)` : ''}`);
      await film(i);
    }
  }

  // Listen: what is said, in which language, when (Gemini)
  const warnings = [];
  const hear = async (i) => {
    try {
      clips[i].heard = await listen(clips[i].file, { campaign, tmp });
      const h = clips[i].heard;
      console.log(`  Aufnahme ${i + 1}: ${h.speech ? `gesprochen (${h.language || '?'}${h.start != null ? `, ${h.start}–${h.end} s` : ''}): ${h.words || '–'}` : 'keine Sprache'}`);
    } catch (err) {
      // Also when the budget is used up: the clips are paid for, the video still gets cut
      clips[i].heard = null;
      clips[i].unheard = err.message.slice(0, 120);
    }
  };

  // Check pictures and sound; film the worst shot again while the budget allows
  const unchecked = () => plan.shots.map(() => ({ ok: true, problems: '', bestStart: 1 }));
  let checks;
  try {
    checks = test ? unchecked() : await review(plan, clips, tmp);
  } catch (err) {
    // The clips are paid for: cut them unchecked rather than lose them
    if (!(err instanceof BudgetExceeded)) throw err;
    checks = unchecked();
    warnings.push(`Bilder nicht geprüft (${err.message})`);
  }
  if (!test) for (const i of plan.shots.keys()) await hear(i);
  const problem = (i) => [checks[i].ok ? null : checks[i].problems, speechProblem(plan.shots[i], clips[i].heard)].filter(Boolean).join('; ');
  for (let retake = 0; retake < MAX_RETAKES && !test; retake++) {
    const bad = plan.shots.findIndex((_, i) => problem(i));
    if (bad < 0) break;
    const reason = problem(bad);
    console.log(`  Aufnahme ${bad + 1} nicht gut: ${reason}. Neue Aufnahme …`);
    const spoken = speechProblem(plan.shots[bad], clips[bad].heard);
    try {
      await film(bad, [checks[bad].ok ? null : checks[bad].problems, spoken ? 'speaking any language other than German, saying anything other than the planned line' : null].filter(Boolean).join('; '));
      checks = await review(plan, clips, tmp);
      await hear(bad);
    } catch (err) {
      if (!(err instanceof BudgetExceeded)) throw err;
      console.log(`  ${err.message}`);
      break;
    }
  }
  checks.forEach((c, i) => c.ok || warnings.push(`Aufnahme ${i + 1}: ${c.problems}`));

  // Keep a planned line that came right; mute everything else that talks
  for (const [i, shot] of plan.shots.entries()) {
    const h = clips[i].heard;
    if (test) {
      clips[i].voice = !!shot.line;
      continue;
    }
    if (clips[i].unheard) {
      // Not checked: a planned line stays audible (Veo usually gets it), anything else goes quiet
      if (shot.line) clips[i].voice = true;
      else clips[i].mute = true;
      warnings.push(`Aufnahme ${i + 1}: Ton nicht geprüft (${clips[i].unheard})`);
      continue;
    }
    if (!h.speech) {
      if (shot.line) warnings.push(`Aufnahme ${i + 1}: Veo ließ den Satz weg, nur der Untertitel zeigt ihn`);
      continue;
    }
    const wrong = speechProblem(shot, h);
    if (shot.line && !wrong) clips[i].voice = true;
    else {
      clips[i].mute = true;
      warnings.push(`Aufnahme ${i + 1}: Ton stumm geschaltet, ${shot.line ? wrong : `Veo ließ ungeplant sprechen („${(h.words || '').slice(0, 80)}“)`}`);
    }
  }

  // The cut
  const cuts = planCut(plan.shots, checks, clips, warnings);
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  const browser = await launch();
  let video;
  try {
    video = await cutHero({
      browser,
      shots: plan.shots.map((s, i) => ({ file: clips[i].file, ...cuts[i], caption: s.caption, mute: !!clips[i].mute, voice: !!clips[i].voice })),
      app: { payoff: plan.payoff, screen: plan.screen },
      appAfter: plan.appAfter,
      intro: { label, hook: plan.hook },
      logoSvg,
      shortUrl: SITE,
      out: path.join(OUT, `${day}-hero-${plan.slug}.mp4`),
      tmp: path.join(tmp, 'cut'),
      music: { style, campaign },
    });
  } finally {
    await browser.close();
  }
  const texts = tidy(plan, { seriesTag: hero.tag });
  fs.writeFileSync(video.file.replace(/\.mp4$/, '.json'), JSON.stringify({ plan, label, texts, checks, cuts, heard: clips.map((c) => c.heard || null), warnings }, null, 2));
  console.log(`✓ ${path.relative(process.cwd(), video.file)} (${video.seconds} s, App ab ${video.appStart.toFixed(1)} s)`);
  if (warnings.length) console.log(`  Prüfung: ${warnings.join(' · ')}`);
  if (video.seconds > heroPrompt.MAX_TOTAL + 0.05) console.log(`::warning::Folge ist ${video.seconds} s lang (höchstens ${heroPrompt.MAX_TOTAL} s geplant)`);
  if (test) return;

  const uploaded = await uploadDraft(campaign, {
    kind: 'hero',
    ai: true,
    template: 'hero',
    title: `${label}: ${plan.title}`,
    idea: warnings.length ? `${plan.idea}\n\nPrüfung: ${warnings.join(' · ')}` : plan.idea,
    episode: plan.episode,
    characters: [...new Set([hero.key, ...plan.shots.map((s) => s.character).filter((k) => k !== 'none')])],
    content: {
      series: hero.key,
      episodeNo,
      hook: plan.hook,
      teaser: plan.teaser,
      appAfter: plan.appAfter,
      // A line only where it is heard: the console then keeps the original sound on
      shots: plan.shots.map(({ character, action, caption, line }, i) => ({ character, action, caption, line: clips[i].voice ? line : '', seconds: cuts[i].seconds })),
      payoff: plan.payoff,
      screen: plan.screen,
    },
    seconds: video.seconds,
    // The AI label comes from the platforms (set when posting), not from the text
    captions: texts.captions,
    hashtags: texts.hashtags,
    music: { style },
    sound,
    model,
    costEur: spent(),
  }, video.file);
  const { pending, mailed } = await backend('POST', '/marketing/notify');
  console.log(`\nHero-Folge ${uploaded} hochgeladen, ${pending} warten auf Freigabe, ${mailed} Mail(s). Kosten: ${spent().toFixed(2)} €`);
}

main().catch((err) => {
  if (err instanceof BudgetExceeded) {
    console.log(`::warning::${err.message}`);
    return;
  }
  console.error(err);
  process.exit(1);
});
