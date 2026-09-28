// The daily marketing agent (stage 1): reads the numbers and past decisions
// from the backend, has Claude write new ads for the templates, renders them
// to MP4 and uploads them as drafts. A person approves them in the admin
// console (tab Freigabe) and posts them by hand.
//
//   ANTHROPIC_API_KEY=… MARKETING_AGENT_KEY=… node agent/daily.js
//   node agent/daily.js --dry-run     # no backend: renders to dist/agent/, uploads nothing
//   node agent/daily.js --plan p.json # use a saved plan instead of asking Claude (re-render, tests)
//
// Runs every morning as a GitHub Action (.github/workflows/marketing-agent.yml).
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { markOnly } = require('../../docs/brand/logo');
const { buildAd } = require('../src/ads');
const { render, launch } = require('../video');
const { Plan } = require('./schema');
const prompt = require('./prompt');

const API = (process.env.API_URL || 'https://api.wannayap.app').replace(/\/$/, '');
const KEY = process.env.MARKETING_AGENT_KEY;
const COUNT = Math.min(4, Math.max(1, Number(process.env.AD_COUNT || 2)));
const MODEL = process.env.AGENT_MODEL || 'claude-opus-5';
const DRY = process.argv.includes('--dry-run');
const PLAN_FILE = process.argv.includes('--plan') ? process.argv[process.argv.indexOf('--plan') + 1] : null;
const OUT = path.join(__dirname, '../dist/agent');
const SITE = (process.env.SITE_URL || 'https://wannayap.app').replace(/^https?:\/\//, '');

async function backend(method, route, body, headers = {}) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, ...(Buffer.isBuffer(body) ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body == null ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${method} ${route}: ${res.status} ${data.error || ''}`), { status: res.status, code: data.error });
  return data;
}

/** Claude writes the plan. One more try if the answer breaks the schema's limits. */
async function propose(context) {
  const client = new Anthropic();
  const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const messages = [{ role: 'user', content: prompt.user({ count: COUNT, today, context }) }];
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;
    try {
      response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: zodOutputFormat(Plan) },
        system: prompt.system(),
        messages,
      });
    } catch (err) {
      // The answer didn't pass the schema (too long, wrong shape): say why and ask again
      if (attempt === 1 && err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) {
        console.warn(`Antwort passte nicht zum Schema, zweiter Versuch: ${err.message}`);
        messages.push({ role: 'user', content: `Deine letzte Antwort war ungültig: ${err.message.slice(0, 1500)}\nBitte halte dich genau an das Schema und die Zeichengrenzen.` });
        continue;
      }
      throw err;
    }
    if (response.stop_reason === 'refusal') throw new Error(`Das Modell hat abgelehnt: ${response.stop_details?.explanation || 'ohne Begründung'}`);
    if (response.stop_reason === 'max_tokens') throw new Error('Antwort abgeschnitten (max_tokens)');
    if (!response.parsed_output) throw new Error('Keine auswertbare Antwort');
    console.log(`Modell: ${response.model}, Tokens: ${response.usage.input_tokens} rein, ${response.usage.output_tokens} raus`);
    return { plan: response.parsed_output, model: response.model };
  }
  throw new Error('Kein gültiger Plan nach zwei Versuchen');
}

/** Upload one draft: the text first, then the video. Returns the campaign or null. */
async function upload(draft, file, seconds, model, day) {
  const base = `yap-${day}-${draft.slug}`.slice(0, 56);
  for (const campaign of [base, `${base}-2`, `${base}-3`]) {
    let created;
    try {
      created = await backend('POST', '/marketing/drafts', {
        campaign,
        template: draft.ad.template,
        title: draft.title,
        idea: draft.idea,
        content: draft.ad,
        seconds,
        captions: draft.captions,
        hashtags: draft.hashtags,
        model,
      });
    } catch (err) {
      if (err.code === 'campaign_taken') continue;
      throw err;
    }
    await backend('PUT', `/marketing/drafts/${created.draft.id}/video`, fs.readFileSync(file), { 'Content-Type': 'video/mp4' });
    return campaign;
  }
  return null;
}

async function main() {
  if (!DRY && !KEY) throw new Error('MARKETING_AGENT_KEY fehlt (oder --dry-run)');
  const context = DRY && !KEY ? { visits: null, drafts: [] } : await backend('GET', '/marketing/context');
  console.log(`Kontext: ${context.drafts.length} bisherige Entwürfe, ${context.visits?.last30Days ?? 0} Besuche in 30 Tagen`);

  const { plan, model } = PLAN_FILE
    ? { plan: Plan.parse(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'))), model: null }
    : await propose(context);
  console.log(`\nAnalyse: ${plan.analysis}\n`);

  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(5).replace('-', '');
  const logoSvg = markOnly(120).replace(/width="120" height="120"/, 'width="100%" height="100%"');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const done = [];
  try {
    for (const draft of plan.drafts) {
      const { template, ...content } = draft.ad;
      const ad = buildAd({ name: `${day}-${draft.slug}`, template, content, logoSvg, shortUrl: SITE });
      console.log(`→ ${draft.title} (${template}, ${ad.seconds} s)`);
      const file = await render(browser, ad, OUT);
      fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify(draft, null, 2));
      if (DRY) {
        done.push(ad.name);
        continue;
      }
      const campaign = await upload(draft, file, ad.seconds, model, day);
      if (campaign) done.push(campaign);
      else console.warn(`  übersprungen: Kampagnenname ${draft.slug} schon vergeben`);
    }
  } finally {
    await browser.close();
  }

  if (!DRY && done.length) {
    const { pending, mailed } = await backend('POST', '/marketing/notify');
    console.log(`\n${done.length} Entwürfe hochgeladen, ${pending} warten auf Freigabe, ${mailed} Mail(s) verschickt.`);
  } else {
    console.log(`\n${done.length} Videos in ${path.relative(process.cwd(), OUT)}/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
