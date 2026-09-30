// Captions and hashtags, for app and hero videos alike: the rules Claude gets
// in its briefing, and the same rules checked in code afterwards (at most two
// emojis per caption; English hashtags, always #wannayap and, for a series,
// its own tag; at most five, Instagram's limit).

const MAX_EMOJIS = 2;
const MAX_HASHTAGS = 5;
const BRAND_TAG = 'wannayap';

const CAPTION_RULES = `- Captions: Deutsch, ein bis zwei kurze Sätze (Instagram höchstens ~200 Zeichen, TikTok höchstens ~150). Klingt wie eine Person Anfang 20, nicht wie eine Marke; Kleinschreibung ist okay. Kurz, knackig, ein bisschen frech.
- Nicht werblich: kein „Jetzt downloaden“, „revolutionär“, „Die App, die …“, keine Aufzählung von Funktionen. „Link in Bio“ nur ab und zu (höchstens in jedem dritten Video), nicht als Pflichtsatz.
- Emojis sparsam: 0–2 pro Caption, nie mehrere hintereinander, nie als Aufzählungszeichen (mehr als zwei werden automatisch entfernt).
- Genau ein Auslöser zum Mitmachen: eine Frage an die Kommentare, ein „schick das …“ (Teilen ist das stärkste Signal) oder bei Serien ein Teaser auf die nächste Folge.
- Suchbegriffe: Die Plattformen finden Videos heute vor allem über Wörter in Caption, Bild und Ton. Die zwei, drei deutschen Begriffe, nach denen die Zielgruppe sucht (z. B. „Ersti“, „neue Stadt“, „Fernfreundschaft“), stehen natürlich im ersten Satz.
- Kein Hinweis auf KI im Text: Das Video wird beim Posten über die Plattform gekennzeichnet.
- Zur Kalibrierung, nicht zum Kopieren: „wir wohnen 400 km auseinander und haben uns trotzdem jeden tag verpasst“ · „oma gisela hat den ring verstanden. wir sind nicht bereit 😭“ · „schick das der person, der du seit drei wochen ‚ruf dich morgen an‘ schreibst“`;

const HASHTAG_RULES = `- Hashtags: 3–5 (Instagram erlaubt höchstens 5), auf Englisch, klein, ohne #. Immer „${BRAND_TAG}“ (bei Hero-Folgen dazu der Serien-Tag, den der Code ergänzt). Der Rest kommt aus der Trend-Recherche des Tages: zuerst englische Tags, die gerade trenden und wirklich zum Video passen, dann passende Nischen-Tags (z. B. longdistancefriendship, unilife, movingout, grandma, pov). Keine Riesen-Tags ohne Bezug wie fyp, foryou oder viral. Wechsle sie von Video zu Video.`;

/** Emoji graphemes in a text, in order. */
function emojis(text) {
  const out = [];
  for (const { segment, index } of new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(text)) {
    if (/\p{Extended_Pictographic}/u.test(segment)) out.push({ segment, index });
  }
  return out;
}

/** The caption with at most MAX_EMOJIS emojis (the first ones stay). */
function limitEmojis(text = '') {
  const found = emojis(text);
  if (found.length <= MAX_EMOJIS) return text;
  let out = text;
  for (const { segment, index } of found.slice(MAX_EMOJIS).reverse()) out = out.slice(0, index) + out.slice(index + segment.length);
  return out.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

/**
 * Hashtags as they go out: lower case, without #, only English letters,
 * digits and underscores, no duplicates, the required ones included, at most
 * MAX_HASHTAGS (extra ones are dropped from the end, the required ones stay).
 */
function hashtags(list = [], required = [BRAND_TAG]) {
  const tags = [...new Set(list.map((h) => String(h).toLowerCase().replace(/^#/, '')).filter((h) => /^[a-z0-9_]{2,30}$/.test(h)))];
  for (const tag of required) if (!tags.includes(tag)) tags.push(tag);
  while (tags.length > MAX_HASHTAGS) {
    const i = tags.map((t) => required.includes(t)).lastIndexOf(false);
    tags.splice(i, 1);
  }
  return tags;
}

/** Captions and hashtags of a plan or draft, tidied up. */
function tidy({ captions, hashtags: tags }, { seriesTag } = {}) {
  return {
    captions: { instagram: limitEmojis(captions?.instagram), tiktok: limitEmojis(captions?.tiktok) },
    hashtags: hashtags(tags, [BRAND_TAG, ...(seriesTag ? [seriesTag] : [])]),
  };
}

module.exports = { CAPTION_RULES, HASHTAG_RULES, BRAND_TAG, limitEmojis, hashtags, tidy };
