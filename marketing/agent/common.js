// Shared by the agent's jobs: the backend (numbers, drafts, budget) and the
// prices of every paid call, so each one is reserved against the budget
// before it runs and settled with its real cost afterwards.
const API = (process.env.API_URL || 'https://api.wannayap.app').replace(/\/$/, '');
const KEY = process.env.MARKETING_AGENT_KEY;
const MODEL = process.env.AGENT_MODEL || 'claude-opus-5';
const VIDEO_MODEL = process.env.VIDEO_MODEL || 'veo-3.1-fast-generate-preview';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
// Prices are in US dollars; counting a dollar as a euro keeps the budget on the safe side
const USD_TO_EUR = Number(process.env.USD_TO_EUR || 1);

/** US dollars (list prices, September 2026). */
const PRICES = {
  // per million tokens
  claude: { input: 5, output: 25 },
  // per generated second, 1080p, sound included
  video: { 'veo-3.1-fast-generate-preview': 0.12, 'veo-3.1-generate-preview': 0.4 },
  // per image up to 1K
  image: 0.067,
};
const eur = (usd) => Math.ceil(usd * USD_TO_EUR * 100) / 100;
const claudeCost = (usage) =>
  eur(((usage.input_tokens + (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1) * PRICES.claude.input + usage.output_tokens * PRICES.claude.output) / 1e6);
/** The most a Claude call can cost: its input plus max_tokens of output. */
const claudeMax = (inputTokens, maxTokens) => eur((inputTokens * PRICES.claude.input + maxTokens * PRICES.claude.output) / 1e6);
const videoCost = (seconds, model = VIDEO_MODEL) => eur(seconds * (PRICES.video[model] ?? PRICES.video['veo-3.1-generate-preview']));
const imageCost = () => eur(PRICES.image + 0.005);

async function backend(method, route, body, headers = {}) {
  const raw = Buffer.isBuffer(body);
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, ...(raw || body == null ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body == null ? undefined : raw ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${method} ${route}: ${res.status} ${data.error || ''}`), { status: res.status, code: data.error, data });
  return data;
}

class BudgetExceeded extends Error {
  constructor(budget, what) {
    super(`Budget reicht nicht für ${what}: heute ${budget?.spentTodayEur} von ${budget?.dailyEur} €, Woche ${budget?.spentWeekEur} von ${budget?.weeklyEur} €`);
    this.budget = budget;
  }
}

let spentThisRun = 0;
/**
 * Run one paid call inside a budget reservation. `fn` returns { result, costEur };
 * the real cost is booked. If `fn` throws before anything was spent, pass
 * `err.costEur = 0` (or leave it unset) and the reservation is released;
 * with a cost on the error, that cost is booked. Without a backend (dry run)
 * the call just runs.
 */
async function spend({ provider, purpose, estimateEur, campaign, note }, fn) {
  if (!KEY) {
    const { result, costEur } = await fn();
    spentThisRun += costEur;
    return result;
  }
  let reservation;
  try {
    reservation = await backend('POST', '/marketing/budget/reserve', { provider, purpose, estimateEur, campaign, note });
  } catch (err) {
    if (err.code === 'budget_exceeded') throw new BudgetExceeded(err.data?.budget, `${purpose} (${estimateEur.toFixed(2)} €)`);
    throw err;
  }
  try {
    const { result, costEur } = await fn();
    await backend('POST', `/marketing/budget/${reservation.id}/settle`, { costEur });
    spentThisRun += costEur;
    return result;
  } catch (err) {
    if (err.costEur) {
      await backend('POST', `/marketing/budget/${reservation.id}/settle`, { costEur: err.costEur }).catch(() => {});
      spentThisRun += err.costEur;
    } else {
      await backend('POST', `/marketing/budget/${reservation.id}/release`).catch(() => {});
    }
    throw err;
  }
}

const spent = () => Math.round(spentThisRun * 100) / 100;

/**
 * Upload one draft: the text first, then the MP4. The campaign name gets a
 * suffix if it is taken. Returns the campaign, or null when all were taken.
 */
async function uploadDraft(base, fields, file) {
  const fs = require('fs');
  const name = base.slice(0, 56);
  for (const campaign of [name, `${name}-2`, `${name}-3`]) {
    let created;
    try {
      created = await backend('POST', '/marketing/drafts', { ...fields, campaign });
    } catch (err) {
      if (err.code === 'campaign_taken') continue;
      throw err;
    }
    await backend('PUT', `/marketing/drafts/${created.draft.id}/video`, fs.readFileSync(file), { 'Content-Type': 'video/mp4' });
    return campaign;
  }
  return null;
}

/** Music for a video of `seconds`: lifts at `liftAt`, final chord at `endAt` (music.js). */
function musicFor({ seconds, liftAt, endAt }, out) {
  const { render } = require('../music');
  const lift = Math.max(0, Math.min(liftAt, endAt));
  const shots = [
    ...(lift > 0 ? [{ id: 'intro', seconds: lift }] : []),
    { id: 'app', source: 'app', seconds: endAt - lift },
  ];
  render({ shots, starts: { intro: 0, app: lift, end: endAt }, total: seconds }, out);
  return out;
}
const today = () => new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/** "0929": month and day in Berlin, the prefix of campaign names. */
const dayTag = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(5).replace('-', '');

module.exports = {
  API, KEY, MODEL, VIDEO_MODEL, IMAGE_MODEL,
  backend, spend, spent, BudgetExceeded, uploadDraft, musicFor,
  claudeCost, claudeMax, videoCost, imageCost,
  today, dayTag,
};
