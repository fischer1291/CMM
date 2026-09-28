// One 8-second clip from Google Veo (Gemini API), inside a budget reservation.
// With a reference image the character keeps their face; Veo only returns
// 8-second clips with references anyway, and deletes them after two days, so
// the clip is downloaded right away.
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { spend, videoCost, VIDEO_MODEL } = require('./common');
const { STYLE, NEGATIVE } = require('./hero-prompt');

const SECONDS = 8;
const POLL_MS = 10000;
const TIMEOUT_MS = 10 * 60 * 1000;

let client;
const ai = () => (client ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

/** The chosen reference image of a character, as Veo wants it. */
async function referenceImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Referenzbild nicht ladbar (${res.status}): ${url}`);
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { image: { imageBytes: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType }, referenceType: 'asset' };
}

// Settings Veo may refuse for some accounts ("… is not supported in your use
// case"): dropped one by one, before that refusal costs anything
const OPTIONAL = { resolution: /resolution/i, personGeneration: /person/i, numberOfVideos: /number of videos|sample count/i };

async function start(prompt, referenceImages) {
  const config = {
    aspectRatio: '9:16',
    durationSeconds: SECONDS,
    resolution: '1080p',
    personGeneration: 'allow_adult',
    numberOfVideos: 1,
    ...(referenceImages ? { referenceImages } : {}),
  };
  for (;;) {
    try {
      return await ai().models.generateVideos({ model: VIDEO_MODEL, source: { prompt }, config });
    } catch (err) {
      if (err.status !== 400 || !/not supported|unsupported|not allowed/i.test(err.message)) throw err;
      // The setting the message names; if it names none, the next optional one
      const left = Object.keys(OPTIONAL).filter((k) => k in config);
      const key = left.find((k) => OPTIONAL[k].test(err.message)) || left[0];
      if (!key) throw err;
      console.warn(`  Veo lehnt „${key}“ ab (${err.message.slice(0, 160)}), neuer Versuch ohne`);
      delete config[key];
    }
  }
}

/**
 * Generate one clip for `shot` into `out`. `look` describes the character
 * (reinforces the reference image), `reference` is its image URL or null.
 * `hint` adds what went wrong in an earlier attempt.
 */
async function generateClip({ shot, look, reference, out, campaign, hint }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY fehlt');
  // No negativePrompt parameter: not every account may use it, so it goes into the prompt
  const prompt = [shot.prompt, look ? `The person: ${look}.` : '', `Avoid: ${NEGATIVE}${hint ? `; ${hint}` : ''}.`, STYLE].filter(Boolean).join(' ');
  const referenceImages = reference ? [await referenceImage(reference)] : undefined;
  const cost = videoCost(SECONDS);
  return spend({ provider: 'google', purpose: 'video-clip', estimateEur: cost, campaign, note: shot.action.slice(0, 120) }, async () => {
    let operation = await start(prompt, referenceImages);
    const started = Date.now();
    while (!operation.done) {
      if (Date.now() - started > TIMEOUT_MS) throw Object.assign(new Error('Veo hat nach 10 Minuten nicht geliefert'), { costEur: cost });
      await new Promise((r) => setTimeout(r, POLL_MS));
      operation = await ai().operations.getVideosOperation({ operation });
    }
    // Failed before anything was made: nothing to pay
    if (operation.error) throw new Error(`Veo: ${JSON.stringify(operation.error).slice(0, 300)}`);
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) {
      // Blocked by Google's filters; counted as spent, to stay on the safe side
      const reasons = operation.response?.raiMediaFilteredReasons?.join('; ') || 'ohne Begründung';
      throw Object.assign(new Error(`Veo hat die Aufnahme gefiltert: ${reasons}`), { costEur: cost, filtered: true });
    }
    if (video.videoBytes) fs.writeFileSync(out, Buffer.from(video.videoBytes, 'base64'));
    else {
      await ai().files.download({ file: video, downloadPath: out });
      // The SDK may still be writing when the promise resolves
      for (let i = 0; i < 20 && !(fs.existsSync(out) && fs.statSync(out).size > 1024); i++) await new Promise((r) => setTimeout(r, 500));
    }
    if (!fs.existsSync(out) || fs.statSync(out).size < 1024) throw Object.assign(new Error('Veo-Download leer'), { costEur: cost });
    return { result: out, costEur: cost };
  });
}

module.exports = { generateClip, SECONDS };
