// What is going on right now: before each run Claude searches the web for the
// hashtags, occasions and formats that work in Wanna yap?'s niche in Germany
// this week, and which sounds are trending on TikTok, so captions, hashtags
// and sound tips follow current trends instead of the model's training data. Inside a budget reservation like every paid call;
// if it fails or the budget is used up, the run goes on without it.
const Anthropic = require('@anthropic-ai/sdk');
const { MODEL, spend, claudeCost, claudeMax, PRICES, eur } = require('./common');

const MAX_SEARCHES = 7;
// A paused server-side search loop is resumed at most this often
const MAX_CONTINUES = 2;
const MAX_CHARS = 4000;

const PROMPT = `Du recherchierst für den Marketing-Agenten von „Wanna yap?“, einer iPhone-App, die zeigt, wer aus deinen Leuten gerade Zeit hat, damit man einfach anruft. Zielgruppe in Deutschland, 18–30: Erstis und Studis in einer neuen Stadt, Fernfreundschaften, Leute nach einem Umzug, Familie weit weg. Die Videos laufen als Instagram Reels und auf TikTok, auf Deutsch.

Such im Web (bevorzugt Quellen der letzten vier Wochen, z. B. TikTok Creative Center, Instagram- und TikTok-Newsroom, Social-Media-Fachseiten):

1. Welche Hashtags in diesem Umfeld auf TikTok und Instagram in Deutschland gerade gut laufen oder steigen (Studium, Ersti, Umzug, neue Stadt, Freundschaft, Fernbeziehung, Heimweh, Telefonieren …). Unterscheide große Allerwelts-Tags von passenden Nischen-Tags.
2. Was diese und nächste Woche Anlass ist: Semesterstart, Feiertage, Ereignisse, Formate oder Memes, die gerade laufen und zur Marke passen.
3. Die aktuellen Regeln und Empfehlungen der Plattformen zu Hashtags und Suchbegriffen in Captions (wie viele Hashtags, was Reichweite bringt).
4. Welche Sounds und Songs gerade auf TikTok in Deutschland trenden oder steigen (z. B. TikTok Creative Center → Songs, Region Deutschland, Filter „Für Geschäftszwecke freigegeben“ bzw. „Approved for business use“), und welche Audios auf Instagram Reels gerade laufen. 6–10 Stück mit unterschiedlicher Stimmung (ruhig, gefühlvoll, fröhlich, treibend, witzig). Pro Sound: Titel, Interpret, Stimmung, und ob er belegt in der kommerziellen Musikbibliothek von TikTok ist (nur dann darf ein Unternehmenskonto ihn nutzen).

Antworte auf Deutsch in knappen Stichpunkten, höchstens ${MAX_CHARS - 500} Zeichen, mit den Abschnitten „Hashtags“, „Anlässe und Formate“, „Regeln“, „Sounds“. Schreib zu jedem Hashtag und Sound dazu, wie gut belegt er ist. Erfinde nichts: Was du nicht belegen kannst, lässt du weg.`;

/** Research notes as text, or null when the search did not work out. */
async function trends({ campaign } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES, user_location: { type: 'approximate', country: 'DE', timezone: 'Europe/Berlin' } }];
  // Search results make the input large, and a resumed loop sends it again
  const estimateEur = claudeMax(60000 * (MAX_CONTINUES + 1), 8000) + eur(MAX_SEARCHES * PRICES.search);
  try {
    return await spend({ provider: 'anthropic', purpose: 'trends', estimateEur, campaign }, async () => {
      const messages = [{ role: 'user', content: PROMPT }];
      let costEur = 0;
      let response;
      for (let turn = 0; turn <= MAX_CONTINUES; turn++) {
        response = await client.messages.create({
          model: MODEL,
          max_tokens: 8000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium' },
          tools,
          messages,
        });
        costEur += claudeCost(response.usage) + eur((response.usage.server_tool_use?.web_search_requests || 0) * PRICES.search);
        if (response.stop_reason !== 'pause_turn') break;
        messages.push({ role: 'assistant', content: response.content });
      }
      if (response.stop_reason === 'refusal') throw Object.assign(new Error('Claude hat die Recherche abgelehnt'), { costEur });
      const notes = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      if (!notes || response.stop_reason === 'pause_turn') throw Object.assign(new Error('Recherche ohne Ergebnis'), { costEur });
      console.log(`  Trends recherchiert (${response.usage.server_tool_use?.web_search_requests || 0} Suchen in der letzten Runde, ${costEur.toFixed(2)} €)`);
      return { result: notes.slice(0, MAX_CHARS), costEur };
    });
  } catch (err) {
    // Also when the budget is used up: the videos matter more than the research
    console.log(`::warning::Trend-Recherche übersprungen: ${err.message}`);
    return null;
  }
}

/** The notes as a section of the planning prompt. */
const section = (notes) =>
  `# Aktuelle Trends (Websuche von heute)
${notes || 'Heute keine Recherche. Nimm Hashtags, die sicher zum Thema passen, und lass den Sound-Tipp leer.'}`;

module.exports = { trends, section };
