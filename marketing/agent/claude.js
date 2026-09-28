// One structured request to Claude inside a budget reservation: the answer is
// checked against a zod schema; if it breaks the schema's limits, Claude gets
// one more try with the reason.
const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { MODEL, spend, claudeCost, claudeMax } = require('./common');

// A generous guess of the input size: characters / 3, plus ~1,600 tokens per image
function inputTokens(system, content) {
  const parts = typeof content === 'string' ? [{ type: 'text', text: content }] : content;
  const text = system.length + parts.reduce((n, p) => n + (p.type === 'text' ? p.text.length : 0), 0);
  return Math.ceil(text / 3) + parts.filter((p) => p.type === 'image').length * 1600;
}

/**
 * Ask Claude for `schema`. `content` is the user message (text or content
 * blocks with images). Returns { output, model }.
 */
async function ask({ schema, system, content, purpose, campaign, maxTokens = 16000, effort = 'high' }) {
  const client = new Anthropic();
  const messages = [{ role: 'user', content }];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const estimateEur = claudeMax(inputTokens(system, content) * attempt, maxTokens);
    const answer = await spend({ provider: 'anthropic', purpose, estimateEur, campaign }, async () => {
      let response;
      try {
        response = await client.messages.parse({
          model: MODEL,
          max_tokens: maxTokens,
          thinking: { type: 'adaptive' },
          output_config: { effort, format: zodOutputFormat(schema) },
          system,
          messages,
        });
      } catch (err) {
        // The answer came back but broke the schema: it was paid for
        if (err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) {
          return { result: { invalid: err.message }, costEur: estimateEur };
        }
        throw err;
      }
      const costEur = claudeCost(response.usage);
      if (response.stop_reason === 'refusal') throw Object.assign(new Error(`Claude hat abgelehnt: ${response.stop_details?.explanation || 'ohne Begründung'}`), { costEur });
      if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('Antwort abgeschnitten (max_tokens)'), { costEur });
      if (!response.parsed_output) throw Object.assign(new Error('Keine auswertbare Antwort'), { costEur });
      console.log(`  Claude (${purpose}): ${response.usage.input_tokens} Tokens rein, ${response.usage.output_tokens} raus, ${costEur.toFixed(2)} €`);
      return { result: { output: response.parsed_output, model: response.model }, costEur };
    });
    if (!answer.invalid) return answer;
    if (attempt === 2) throw new Error(`Keine gültige Antwort nach zwei Versuchen: ${answer.invalid.slice(0, 500)}`);
    console.warn(`  Antwort passte nicht zum Schema, zweiter Versuch: ${answer.invalid.slice(0, 300)}`);
    messages.push({ role: 'user', content: `Deine letzte Antwort war ungültig: ${answer.invalid.slice(0, 1500)}\nBitte halte dich genau an das Schema und die Zeichengrenzen.` });
  }
  throw new Error('unreachable');
}

module.exports = { ask };
