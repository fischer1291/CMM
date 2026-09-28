// The daily marketing agent: reads the numbers, past decisions and the
// budget from the backend, has Claude write new ads for the app templates,
// renders them to MP4 with music and uploads them as drafts. A person
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
const { Plan } = require('./schema');
const prompt = require('./prompt');
const { ask } = require('./claude');
const { ensureReferences } = require('./characters');
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

  const { output: plan, model } = PLAN_FILE
    ? { output: Plan.parse(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'))), model: null }
    : await ask({ schema: Plan, system: prompt.system(), content: prompt.user({ count: COUNT, today: today(), context }), purpose: 'plan-app' });
  console.log(`\nAnalyse: ${plan.analysis}\n`);

  const day = dayTag();
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const done = [];
  try {
    for (const draft of plan.drafts) {
      const { template, ...content } = draft.ad;
      const ad = buildAd({ name: `${day}-${draft.slug}`, template, content, logoSvg, shortUrl: SITE });
      console.log(`→ ${draft.title} (${template}, ${ad.seconds} s)`);
      const music = musicFor(ad, path.join(OUT, `${ad.name}.wav`));
      const file = await render(browser, ad, OUT, { music });
      fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify(draft, null, 2));
      if (DRY) {
        done.push(ad.name);
        continue;
      }
      const campaign = await uploadDraft(`yap-${day}-${draft.slug}`, {
        kind: 'app',
        template,
        title: draft.title,
        idea: draft.idea,
        content: draft.ad,
        seconds: ad.seconds,
        captions: draft.captions,
        hashtags: draft.hashtags,
        model,
      }, file);
      if (campaign) done.push(campaign);
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
