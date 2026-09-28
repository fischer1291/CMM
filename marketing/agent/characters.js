// The recurring people of the hero videos. Who they are is written here (and
// in HERO-VIDEO.md); their reference images are proposed by the image model
// and chosen by a person in the admin console (Freigabe → Figuren). Veo gets
// the chosen image with every shot, so faces stay the same across episodes.
//
// All of them are adults: Veo only allows adults in the EU, and with
// reference images anyway.
const { GoogleGenAI } = require('@google/genai');
const { backend, spend, imageCost, IMAGE_MODEL, KEY } = require('./common');

const CHARACTERS = [
  {
    key: 'anna',
    name: 'Anna',
    summary:
      '18, hat gerade Abi gemacht und reist vor dem Studium durch die Welt. Bald zieht sie in eine fremde Stadt (nicht ihre Heimat) und fängt dort Medizin an. Ihre Leute sind plötzlich weit weg.',
    look: '18-year-old German woman, long wavy light-brown hair often tied in a loose low ponytail, sun-kissed skin and a few freckles from travelling, natural look without make-up, small gold stud earrings, faded denim jacket over a white t-shirt, woven friendship bracelets on her wrist',
  },
  {
    key: 'lena',
    name: 'Lena',
    summary: '21, Studentin, gerade in eine neue Stadt (Leipzig) gezogen, vermisst ihre Leute von zu Hause.',
    look: '21-year-old German woman, shoulder-length dark curly hair, light freckles, oversized cream knit hoodie, small silver hoop earrings',
  },
  {
    key: 'jonas',
    name: 'Jonas',
    summary: '23, Lenas bester Freund aus der Heimat, lebt in Hamburg, pendelt viel mit der S-Bahn.',
    look: '23-year-old German man, short dark-blond hair, light stubble, olive-green bomber jacket over a grey hoodie',
  },
  {
    key: 'gisela',
    name: 'Oma Gisela',
    summary: '78, Lenas Oma, liebt den Sonntagsanruf mit der Familie, hat die App von ihrer Enkelin bekommen.',
    look: '78-year-old German grandmother, silver bob haircut, round glasses, burgundy cardigan, warm smile',
  },
];

const PROPOSALS = 3;
const byKey = (key) => CHARACTERS.find((c) => c.key === key);

function portraitPrompt(character, feedback) {
  return [
    `Realistic reference portrait photo of one person: ${character.look}.`,
    'Head and shoulders, facing the camera with a relaxed natural expression, soft daylight, plain light-grey background,',
    'sharp focus on the face, realistic skin texture, 35mm photo, no text, no logos, no jewellery beyond what is described.',
    'This must look like an ordinary real person, not a celebrity or any real, identifiable person.',
    feedback ? `Change compared to earlier proposals: ${feedback}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** One image from the image model, as PNG/JPEG bytes. */
async function generateImage(ai, prompt) {
  const models = [IMAGE_MODEL, 'gemini-2.5-flash-image'].filter((m, i, all) => all.indexOf(m) === i);
  let lastError;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4' } },
      });
      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw Object.assign(new Error(`${model}: kein Bild in der Antwort (${response.candidates?.[0]?.finishReason || 'ohne Grund'})`), { costEur: imageCost() });
      return Buffer.from(part.inlineData.data, 'base64');
    } catch (err) {
      lastError = err;
      // Only an unknown model is worth trying the next one
      if (!/404|not found|not supported/i.test(err.message)) throw err;
    }
  }
  throw lastError;
}

/**
 * Keep the characters in the backend in sync and propose reference images for
 * those without a choice (or where a person asked for new ones). Stops quietly
 * when the budget is used up; returns the characters as the backend has them.
 */
async function ensureReferences(known = []) {
  if (!KEY) return known;
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY fehlt: keine Referenzbilder');
    return known;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (const character of CHARACTERS) {
    await backend('PUT', `/marketing/characters/${character.key}`, { name: character.name, summary: character.summary });
    const state = known.find((c) => c.key === character.key);
    const needed = state?.wantsNew ? PROPOSALS : state?.chosen ? 0 : Math.max(0, PROPOSALS - (state?.candidates.length || 0));
    for (let i = 0; i < needed; i++) {
      try {
        const image = await spend(
          { provider: 'google', purpose: 'reference-image', estimateEur: imageCost(), note: character.name },
          async () => ({ result: await generateImage(ai, portraitPrompt(character, state?.feedback)), costEur: imageCost() }),
        );
        const type = image[0] === 0xff ? 'image/jpeg' : 'image/png';
        await backend('POST', `/marketing/characters/${character.key}/candidates`, image, { 'Content-Type': type });
        console.log(`  Referenzbild für ${character.name} vorgeschlagen (${i + 1}/${needed})`);
      } catch (err) {
        console.warn(`  Referenzbild für ${character.name}: ${err.message}`);
        if (err.budget) return (await backend('GET', '/marketing/characters')).characters;
        break;
      }
    }
  }
  return (await backend('GET', '/marketing/characters')).characters;
}

module.exports = { CHARACTERS, byKey, ensureReferences };
