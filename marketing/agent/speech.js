// Listens to a Veo clip: Veo makes sound with its pictures and sometimes has
// people talk (often in English) although the prompt says nobody speaks.
// Gemini hears the clip's sound and says whether words are spoken and in
// which language; hero.js mutes clips with speech that wasn't planned.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { z } = require('zod');
const { GoogleGenAI } = require('@google/genai');
const { spend, eur, PRICES, SPEECH_MODEL } = require('./common');

const Heard = z.object({
  speech: z.boolean(),
  language: z.string().nullable().optional(),
  words: z.string().nullable().optional(),
});

let client;
const ai = () => (client ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const PROMPT = `Hör dir diese Tonspur an (8 Sekunden aus einem Video). Werden verständliche Wörter gesprochen? Lachen, Seufzen, Summen, Atmen und Stimmengewirr im Hintergrund zählen nicht als Sprache.
Antworte nur mit JSON: {"speech": true|false, "language": "ISO-639-1-Code der gesprochenen Sprache oder null", "words": "was gesagt wird, wörtlich, oder null"}`;

/**
 * What is said in `file`: { speech, language, words }. Clips without a sound
 * track are silent. Throws when the check itself fails.
 */
async function listen(file, { campaign, tmp }) {
  const wav = path.join(tmp, `${path.basename(file, '.mp4')}-voice.wav`);
  const res = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', wav]);
  if (res.status !== 0 || !fs.existsSync(wav)) return { speech: false, language: null, words: null };
  const data = fs.readFileSync(wav).toString('base64');
  const cost = eur(PRICES.speech);
  return spend({ provider: 'google', purpose: 'speech-check', estimateEur: cost, campaign }, async () => {
    const answer = await ai().models.generateContent({
      model: SPEECH_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/wav', data } }, { text: PROMPT }] }],
      config: { responseMimeType: 'application/json' },
    });
    let heard;
    try {
      heard = Heard.parse(JSON.parse(answer.text));
    } catch {
      throw Object.assign(new Error(`Tonprüfung unverständlich: ${String(answer.text).slice(0, 200)}`), { costEur: cost });
    }
    return { result: { speech: heard.speech, language: heard.language?.toLowerCase().slice(0, 2) || null, words: heard.words || null }, costEur: cost };
  });
}

module.exports = { listen };
