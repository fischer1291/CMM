// The recurring people of the hero videos. Who they are is written here (and
// in HERO-VIDEO.md); their reference images are proposed by the image model
// and chosen by a person in the admin console (Freigabe → Figuren). Veo gets
// the chosen image with every shot, so faces stay the same across episodes.
// Each of them carries their own series (title, premise, season arc, running
// gag, hashtag) and a voice, so they sound alike from episode to episode.
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
    voice: 'bright, lively young female voice, 18 years old, speaks fast when excited',
    tag: 'annayaps',
    series: {
      title: 'Anna zieht los',
      premise: 'Nach dem Abi reist Anna allein los, danach beginnt sie Medizin in einer Stadt, in der sie niemanden kennt. Zeitverschiebung, neue Leute, alte Leute: Sie will niemanden verlieren.',
      arc: 'Letzte Nacht zu Hause und das Versprechen, jeden Sonntag zu telefonieren · unterwegs: zu Hause schlafen alle, wenn sie Zeit hat · verpasste Anrufe mitten im Abenteuer · der Ring passt endlich, erstes echtes Gespräch über die Zeitzonen · Zusage fürs Medizinstudium · erste Nacht im Wohnheim, niemand da · Anatomie überfordert, der Yap Moment mit den Leuten von zu Hause · neue Freunde und alte Freunde in einer Runde',
      gag: 'Die Zeitverschiebung: Mama ruft immer genau im falschen Moment an.',
    },
  },
  {
    key: 'lena',
    name: 'Lena',
    summary: '21, Studentin, gerade in eine neue Stadt (Leipzig) gezogen, vermisst ihre Leute von zu Hause.',
    look: '21-year-old German woman, shoulder-length dark curly hair, light freckles, oversized cream knit hoodie, small silver hoop earrings',
    voice: 'warm, slightly husky young female voice, 21 years old, relaxed and a little ironic',
    tag: 'lenayaps',
    series: {
      title: 'Lena · neu in Leipzig',
      premise: 'Neue Stadt, WG-Zimmer mit Umzugskartons, die eigenen Leute plötzlich weit weg, und jedes „lass mal bald telefonieren“ bleibt ein Versprechen.',
      arc: 'erste Nacht: 40 Chats, kein Anruf · Lena und Jonas verpassen sich dreimal an einem Tag · der Ring leuchtet, erster echter Anruf (dieselbe Szene wie bei Jonas) · Yap Moment: die stille Mitbewohnerin steht plötzlich mit Handy in der Tür · Talk first: sie muss erst selbst anrufen und ruft Oma an · Sonntag 18 Uhr: Oma, Jonas und die WG in einer Runde',
      gag: 'Ihr Zähler „lass mal bald telefonieren“: erst steigt er, später zählt ein zweiter die echten Anrufe.',
    },
  },
  {
    key: 'jonas',
    name: 'Jonas',
    summary: '23, Lenas bester Freund aus der Heimat, lebt in Hamburg, arbeitet im Schichtdienst und pendelt viel mit der S-Bahn.',
    look: '23-year-old German man, short dark-blond hair, light stubble, olive-green bomber jacket over a grey hoodie',
    voice: 'calm, low young male voice, 23 years old, dry humour, a little tired',
    tag: 'jonasyaps',
    series: {
      title: 'Jonas · 23:14',
      premise: 'Jonas ist wach, wenn alle schlafen, und ruft grundsätzlich drei Minuten zu spät zurück.',
      arc: 'fünf verpasste Anrufe, fünfmal „Ah, du hattest angerufen?“ · 23:14 in der S-Bahn: endlich Zeit, alle schlafen · sein Ring leuchtet, zum ersten Mal ist er pünktlich (Lenas Anruf von seiner Seite) · Wochenplan: nach der Schicht steht sein Status von selbst auf „Zeit“ · Rollentausch: diesmal geht Lena nicht ran · er ruft zum ersten Mal zuerst an, bei Oma Gisela',
      gag: '„Ah, du hattest angerufen?“',
    },
  },
  {
    key: 'gisela',
    name: 'Oma Gisela',
    summary: '78, Lenas Oma, liebt den Sonntagsanruf mit der Familie, hat die App von ihrer Enkelin bekommen.',
    look: '78-year-old German grandmother, silver bob haircut, round glasses, burgundy cardigan, warm smile',
    voice: 'warm, clear elderly female voice, 78 years old, a bit too loud on the phone',
    tag: 'grandmayaps',
    series: {
      title: 'Oma Gisela lernt yappen',
      premise: 'Lena hat ihrer Oma die App installiert, und Gisela nimmt sie sehr ernst. Sie ist nie die Witzfigur: Am Ende ist sie die Coolste von allen.',
      arc: 'Lena erklärt am Telefon, Gisela sieht nur ihr eigenes Ohr · sie merkt, dass sie sieht, wer Zeit hat, und ruft alle an · Yap Moment mit Opa Heinz, der nur kurz zuschauen wollte · ein Moment festhalten: beide müssen zustimmen, sie drückt vierzehnmal · sie teilt stolz ihre Gesprächszeit mit Lena · sie hat das Sonntagsritual selbst angelegt, alle sind da',
      gag: 'Handy viel zu nah am Gesicht, um 5:58 Uhr schon auf „Zeit“; „Ich hab Zeit, Kind.“',
    },
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
