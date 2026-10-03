// What the agent learns from its own posted videos (plan 2.14): the prompt
// section with the top and flop videos of the last 30 days (GET
// /marketing/context → performance, aiCostPerPostedVideoEur), the note on
// this week's bio link, the cleanup of the two hook variants per draft and
// the run length for POST /marketing/notify. Kept apart from prompt.js, like
// notes.js, so it can be tested without the agent's own dependencies.

/** How long a hook variant may be (the backend cuts there too). */
const MAX_HOOK = 120;
/** At most this many videos per list in the prompt (the backend sends up to 10). */
const MAX_ROWS = 10;

const de = (n, digits = 0) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const eur = (n) => `${de(n, 2)} €`;
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** People who came over the video's link: "3 neu dabei, 1 davon aktiviert", or ''. */
function people(row) {
  const users = Number(row.newUsers) || 0;
  if (!users) return '';
  const active = Number(row.activatedD7) || 0;
  return ` · ${de(users)} neu dabei, ${de(active)} davon aktiviert`;
}

/** One video as a line of the prompt. */
function row(r) {
  const views = Number.isFinite(r.views) ? `${de(r.views)} Views` : 'Views –';
  const cost = Number.isFinite(r.costEur) ? eur(r.costEur) : '– €';
  const perEur = Number.isFinite(r.viewsPerEur) ? `${de(r.viewsPerEur)} Views/€` : '– Views/€';
  const extra = [Number.isFinite(r.likes) && r.likes ? `${de(r.likes)} Likes` : '', Number.isFinite(r.shares) && r.shares ? `${de(r.shares)} geteilt` : '']
    .filter(Boolean)
    .join(', ');
  return `- ${clip(r.campaign, 60)} · ${clip(r.kind, 10) || 'app'}/${clip(r.template, 12) || '–'} · „${clip(r.title, 80)}“ · ${views}${extra ? ` (${extra})` : ''} · ${cost} · ${perEur}${people(r)}`;
}

const rowsOf = (list) => (Array.isArray(list) ? list.filter((r) => r && typeof r === 'object' && r.campaign).slice(0, MAX_ROWS) : []);

/**
 * The prompt section "Was gewirkt hat (30 Tage)", or '' while no posted
 * video has numbers yet. Top and flop by views per euro; a third list ranks
 * the videos that brought people by how many of them had a real talk within
 * seven days, because that, not views, is what counts.
 */
function performanceSection(context) {
  const perf = context?.performance || {};
  const top = rowsOf(perf.top);
  const flop = rowsOf(perf.flop);
  if (!top.length && !flop.length) return '';
  const seen = new Map();
  for (const r of [...top, ...flop]) if (!seen.has(r.campaign)) seen.set(r.campaign, r);
  const byActivation = [...seen.values()]
    .filter((r) => (Number(r.newUsers) || 0) > 0)
    .sort((a, b) => (b.activatedD7 || 0) - (a.activatedD7 || 0) || (b.newUsers || 0) - (a.newUsers || 0) || (b.viewsPerEur || 0) - (a.viewsPerEur || 0));
  const aiCost = Number.isFinite(context.aiCostPerPostedVideoEur) ? context.aiCostPerPostedVideoEur : null;

  const parts = [
    `# Was gewirkt hat (30 Tage)
Gepostete Videos mit gemessenen Zahlen: Views (Instagram-Plays und TikTok-Views zusammen) je Euro KI-Kosten des Videos. Neunutzer und Aktivierte (erstes echtes Gespräch in 7 Tagen) zählen über den Link der Kampagne; da die meisten über den Bio-Link kommen, sind sie pro Video eher zu niedrig.`,
    `Vorne (meiste Views je Euro):\n${top.map(row).join('\n')}`,
  ];
  if (flop.length) parts.push(`Hinten (wenigste Views je Euro):\n${flop.map(row).join('\n')}`);
  if (byActivation.length) parts.push(`Nach Aktivierung (wer über das Video kam und wirklich telefoniert hat):\n${byActivation.map(row).join('\n')}`);
  if (aiCost != null) parts.push(`KI-Kosten je tatsächlich gepostetes Video: ${eur(aiCost)} (alle Ausgaben des Agenten in 30 Tagen geteilt durch die geposteten Videos; verworfene Entwürfe kosten mit).`);
  parts.push(`Bewerte Formate nach Aktivierung, nicht nach Views: Ein Video, das wenige Leute bringt, die dann wirklich telefonieren, schlägt eines mit vielen Views und niemandem, der bleibt. Views je Euro zeigen, was Aufmerksamkeit bekommt, Aktivierte, was wirkt. Bei wenigen Neunutzern ist das eine Tendenz, kein Beweis. Sag in deiner Analyse, welches Format, welchen Hook und welche Figur du deshalb wiederholst, abwandelst oder fallen lässt.`);
  return `${parts.join('\n\n')}\n\n`;
}

/** The note on links in captions, with this week's bio link when the backend sends one. */
function linksNote(bioLink) {
  const link = typeof bioLink === 'string' && /^https:\/\/\S+$/.test(bioLink) ? bioLink : '';
  return link
    ? `Links in Captions sind nicht klickbar; der Bio-Link dieser Woche ist ${link} (eine eigene Kampagne pro Woche), die meisten Besuche kommen über ihn. Schreib keine Links in die Captions; „Link in Bio“ nur ab und zu.`
    : 'Links in Captions sind nicht klickbar, die meisten Besuche kommen über den Bio-Link.';
}

/** Measured views of an earlier draft for its history line: " · 1.234 Views", or ''. */
function viewsNote(d) {
  const ig = d?.stats?.instagram?.plays;
  const tt = d?.stats?.tiktok?.views;
  if (!Number.isFinite(ig) && !Number.isFinite(tt)) return '';
  return ` · ${de((Number.isFinite(ig) ? ig : 0) + (Number.isFinite(tt) ? tt : 0))} Views`;
}

/** The two hook variants of a draft as the backend takes them: trimmed, at most 120 characters, no empty ones, at most two. */
function hookVariants(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((h) => typeof h === 'string')
    .map((h) => h.replace(/\s+/g, ' ').trim().slice(0, MAX_HOOK))
    .filter(Boolean)
    .slice(0, 2);
}

/** Whole seconds since `startedAt` (ms), for POST /marketing/notify { durationSec }. */
const runSeconds = (startedAt, now = Date.now()) => Math.max(0, Math.round((now - startedAt) / 1000));

module.exports = { performanceSection, linksNote, viewsNote, hookVariants, runSeconds, MAX_HOOK, MAX_ROWS };
