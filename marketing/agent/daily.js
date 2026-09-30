// The daily marketing agent: reads the numbers, past decisions and the
// budget from the backend, has Claude search the web for current trends
// (agent/trends.js) and write new 25–30 s stories for the app template
// (src/templates.js → story), renders them to MP4 with music and uploads them
// as drafts. A person
// approves them in the admin console (tab Freigabe). It also proposes
// reference images for the hero characters that still need one
// (agent/characters.js). Every paid call is reserved against the budget first.
//
//   ANTHROPIC_API_KEY=… GEMINI_API_KEY=… MARKETING_AGENT_KEY=… node agent/daily.js
//   node agent/daily.js --dry-run     # no backend: renders to dist/agent/, uploads nothing
//   node agent/daily.js --plan p.json # use a saved plan instead of asking Claude (re-render, tests)
//
// Runs every morning as a GitHub Action (.github/workflows/marketing-agent.yml).
const fs = require('fs');
const path = require('path');
const { markOnly } = require('../../docs/brand/logo');
const { buildAd } = require('../src/ads');
const { render, launch } = require('../video');
const { Plan, PlanFile } = require('./schema');
const prompt = require('./prompt');
const { ask } = require('./claude');
const { ensureReferences } = require('./characters');
const { trends } = require('./trends');
const { chooseStyles, recentStyles, soundTip, withDefaults } = require('./soundtrack');
const { tidy } = require('./texts');
const { KEY, backend, spent, uploadDraft, musicFor, today, dayTag, BudgetExceeded } = require('./common');

const COUNT = Math.min(4, Math.max(1, Number(process.env.AD_COUNT || 2)));
const DRY = process.argv.includes('--dry-run');
const PLAN_FILE = process.argv.includes('--plan') ? process.argv[process.argv.indexOf('--plan') + 1] : null;
const OUT = path.join(__dirname, '../dist/agent');
const SITE = (process.env.SITE_URL || 'https://wannayap.app').replace(/^https?:\/\//, '');

async function main() {
  if (!DRY && !KEY) throw new Error('MARKETING_AGENT_KEY fehlt (oder --dry-run)');
  const context = KEY ? await backend('GET', '/marketing/context') : { visits: null, drafts: [], characters: [], budget: null };
  const b = context.budget;
  console.log(`Kontext: ${context.drafts.length} bisherige Entwürfe, ${context.visits?.last30Days ?? 0} Besuche in 30 Tagen`);
  if (b) console.log(`Budget: heute ${b.spentTodayEur} von ${b.dailyEur} €, Woche ${b.spentWeekEur} von ${b.weeklyEur} €`);

  // Reference images for the hero videos, while a character still needs one
  if (!DRY && !PLAN_FILE) await ensureReferences(context.characters);

  const trendNotes = PLAN_FILE ? null : await trends();
  const { output: plan, model } = PLAN_FILE
    ? { output: PlanFile.parse(withDefaults(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')))), model: null }
    : await ask({ schema: Plan, system: prompt.system(), content: prompt.user({ count: COUNT, today: today(), context, trendNotes }), purpose: 'plan-app' });
  console.log(`\nAnalyse: ${plan.analysis}\n`);

  const day = dayTag();
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const done = [];
  // Claude's styles, but never the same twice in a row
  const styles = chooseStyles(plan.drafts.map((d) => d.music), recentStyles(context.drafts));
  try {
    for (const [n, draft] of plan.drafts.entries()) {
      const { template, ...content } = draft.ad;
      const ad = buildAd({ name: `${day}-${draft.slug}`, template, content, logoSvg, shortUrl: SITE });
      const campaign = `yap-${day}-${draft.slug}`;
      const style = styles[n];
      const sound = soundTip(draft.sound);
      // At most two emojis, English hashtags with #wannayap, at most five
      Object.assign(draft, tidy(draft));
      console.log(`→ ${draft.title} (${template}, ${ad.seconds} s, Musik: ${style}${sound ? `, Sound-Tipp: ${sound.title}` : ''})`);
      if (template === 'story' && (ad.seconds < 25 || ad.seconds > 30)) console.log(`::warning::${draft.title}: ${ad.seconds} s statt 25–30 s`);
      const music = musicFor(ad, path.join(OUT, `${ad.name}.wav`), { style, campaign });
      const file = await render(browser, ad, OUT, { music });
      fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify(draft, null, 2));
      if (DRY) {
        done.push(ad.name);
        continue;
      }
      const uploaded = await uploadDraft(campaign, {
        kind: 'app',
        template,
        title: draft.title,
        idea: draft.idea,
        content: draft.ad,
        seconds: ad.seconds,
        captions: draft.captions,
        hashtags: draft.hashtags,
        music: { style },
        sound,
        model,
      }, file);
      if (uploaded) done.push(uploaded);
      else console.warn(`  übersprungen: Kampagnenname ${draft.slug} schon vergeben`);
    }
  } finally {
    await browser.close();
  }

  if (!DRY && done.length) {
    const { pending, mailed } = await backend('POST', '/marketing/notify');
    console.log(`\n${done.length} Entwürfe hochgeladen, ${pending} warten auf Freigabe, ${mailed} Mail(s) verschickt. Kosten dieses Laufs: ${spent().toFixed(2)} €`);
  } else {
    console.log(`\n${done.length} Videos in ${path.relative(process.cwd(), OUT)}/`);
  }
}

main().catch((err) => {
  // Budget used up: not an error, just nothing more today (a note in the GitHub run)
  if (err instanceof BudgetExceeded) {
    console.log(`::warning::${err.message}`);
    return;
  }
  console.error(err);
  process.exit(1);
});
