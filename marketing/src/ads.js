// Animated ads (Reels, TikTok, Stories) as HTML pages with CSS animations.
// video.js pauses every animation and seeks it frame by frame, so the result
// is exact and doesn't depend on how fast the machine renders.
//
// Rules for sound-off feeds: the hook is on screen within 1.5 s, every ad
// ends on the same end card, texts stay inside the safe zone (TikTok/Reels UI
// covers roughly the bottom 20 % and the right 12 %).
const { page } = require('./kit');
const { ICON } = require('./screens');
const { templates } = require('./templates');

const W = 1080;
const H = 1920;

const MOTION = `
@keyframes rise { from { opacity: 0; transform: translateY(60px) scale(.96) } to { opacity: 1; transform: none } }
@keyframes pop { 0% { opacity: 0; transform: scale(.6) } 70% { opacity: 1; transform: scale(1.06) } 100% { opacity: 1; transform: scale(1) } }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes fadeOut { from { opacity: 1 } to { opacity: 0; filter: blur(12px) } }
@keyframes strike { from { background-size: 0 .09em } to { background-size: 100% .09em } }
@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 380px) rotate(-4deg) } to { opacity: 1; transform: translate(-50%, 0) rotate(-4deg) } }
@keyframes drop { from { opacity: 0; transform: translateY(-140px) } to { opacity: 1; transform: none } }
@keyframes pulse { 0%, 100% { opacity: .35; transform: scale(1) } 50% { opacity: .6; transform: scale(1.12) } }
@property --s { syntax: '<integer>'; inherits: true; initial-value: 59; }
@keyframes tick { from { --s: 59 } to { --s: 50 } }
.a { animation-fill-mode: both; animation-timing-function: cubic-bezier(.2,.8,.2,1) }
.scene { position: absolute; inset: 0 }
.safe { position: absolute; left: 90px; right: 130px }
.bubble { max-width: 720px; padding: 30px 40px; border-radius: 44px; font-size: 46px; line-height: 1.25; font-weight: 500 }
.bubble.me { align-self: flex-end; background: var(--brand); color: #0B0B12; border-bottom-right-radius: 12px }
.bubble.them { align-self: flex-start; background: var(--surface-strong); border: 1px solid var(--border-strong); border-bottom-left-radius: 12px }
.struck { background: linear-gradient(var(--pink), var(--pink)) no-repeat 0 55% / 0 .09em }
.bubble.me .struck { background-image: linear-gradient(#0B0B12, #0B0B12) }
.push { display: flex; gap: 26px; align-items: center; padding: 30px 34px; border-radius: 40px; background: rgba(30,30,46,.82); border: 1px solid var(--border-strong); backdrop-filter: blur(30px); box-shadow: 0 30px 80px rgba(0,0,0,.45) }
.push .ic { width: 84px; height: 84px; border-radius: 22px; flex: none; display: grid; place-items: center; background: var(--brand); color: #0B0B12 }
.push .ic svg { width: 48px; height: 48px }
.push b { display: block; font-size: 38px; letter-spacing: -.01em }
.push span { display: block; font-size: 34px; color: var(--text-2); margin-top: 4px }
.push time { margin-left: auto; align-self: flex-start; font-size: 28px; color: var(--text-3) }
.clock::after { counter-reset: s var(--s); content: '09:' counter(s, decimal-leading-zero) }
`;


/** The shared end card, from `t` seconds on. */
function endCardFor({ logoSvg, shortUrl }) {
  return (t, { w = W, h = H } = {}) => {
    const wide = w > h;
    return `<div class="scene" style="animation:fadeIn .5s ${t}s both;background:var(--bg)">
      <div class="glowblob" style="width:${wide ? 700 : 820}px;height:${wide ? 700 : 820}px;left:50%;top:50%;margin:-${wide ? 350 : 410}px 0 0 -${wide ? 350 : 410}px;animation:pulse 3s ${t}s infinite both"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${wide ? 36 : 56}px;text-align:center">
        <div style="animation:pop .8s ${t + 0.15}s both;width:${wide ? 190 : 260}px;height:${wide ? 190 : 260}px">${logoSvg}</div>
        <h1 style="animation:rise .7s ${t + 0.45}s cubic-bezier(.2,.8,.2,1) both;font-size:${wide ? 110 : 132}px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
        <span class="btn" style="animation:rise .7s ${t + 0.8}s cubic-bezier(.2,.8,.2,1) both;font-size:${wide ? 36 : 44}px;padding:${wide ? '24px 44px' : '30px 56px'}">${ICON.flash} Kostenlos fürs iPhone</span>
        <p style="animation:fadeIn .6s ${t + 1.1}s both;font-family:var(--mono);font-size:${wide ? 28 : 34}px;color:var(--text-2)">${shortUrl}</p>
      </div>
    </div>`;
  };
}

/** One ad from a template and its content (src/templates.js), 1080×1920. */
function buildAd({ name, template, content, logoSvg, shortUrl }) {
  if (!templates[template]) throw new Error(`Unknown template "${template}"`);
  const { seconds, body } = templates[template](content, endCardFor({ logoSvg, shortUrl }));
  return { name, w: W, h: H, seconds, html: page(W, H, body, MOTION) };
}

/** The three launch ads, as template content. */
const LAUNCH_ADS = [
  {
    name: 'ad-1-bald-telefonieren',
    template: 'chat',
    content: {
      eyebrow: 'Ehrliche Frage',
      hook: 'Wie oft hast du das dieses Jahr geschrieben?',
      bubbles: [
        { from: 'me', text: 'Lass mal bald telefonieren! 🥺' },
        { from: 'them', text: 'Jaaa unbedingt, nächste Woche?' },
        { from: 'them', text: 'Sorry, war im Zug 🙈' },
        { from: 'me', text: 'Ah, du hattest angerufen?' },
        { from: 'them', text: 'Lass mal bald telefonieren!!' },
      ],
      payoff: 'Sieh einfach, wer *gerade Zeit* hat.',
      screen: 'status',
    },
  },
  {
    name: 'ad-2-yap-moment',
    template: 'moment',
    content: {
      eyebrow: '⚡ Yap Moment',
      hook: 'Jeden Tag haben alle meine Leute *gleichzeitig Zeit.*',
      pushes: [
        { initial: 'M', title: 'Mila ist dabei', sub: 'hat 10 Minuten Zeit' },
        { initial: 'J', title: 'Jonas ist dabei', sub: 'aus Hamburg' },
        { initial: 'O', title: 'Oma ist dabei 👵', sub: 'Küche, wie immer' },
      ],
    },
  },
  {
    name: 'ad-3-kein-feed',
    template: 'list',
    content: {
      lines: ['Kein Feed.', 'Keine Likes.', 'Keine Fremden.', 'Keine Werbung.'],
      punch: 'Nur deine Menschen.',
      payoff: 'Sieh, wer Zeit hat. *Ruf einfach an.*',
      screen: 'status',
    },
  },
];

module.exports = function ads({ logoSvg, shortUrl }) {
  const endCard = endCardFor({ logoSvg, shortUrl });
  const ads = LAUNCH_ADS.map((ad) => buildAd({ ...ad, logoSvg, shortUrl }));
  const add = (name, seconds, body, { w = W, h = H } = {}) => ads.push({ name, w, h, seconds, html: page(w, h, body, MOTION) });
  const joins = LAUNCH_ADS[1].content.pushes.map((p) => [p.initial, p.title, p.sub]);

  /* ---------- Hero insert: Yap Moment without headline (4 s) ----------
     Stand-in for shot 08 until there is a filmed/AI clip (hero/shots.json).
     The lower third stays free for the hero's caption. */
  add('insert-yap-moment', 4, `
    <div class="glowblob" style="width:760px;height:760px;left:160px;top:420px;animation:pulse 3s 0s infinite both"></div>
    <div class="safe clock grad-text" style="top:300px;left:0;right:0;text-align:center;font-family:var(--mono);font-weight:700;font-size:230px;letter-spacing:-.04em;line-height:1;animation:fadeIn .3s 0s both, tick 9s 0s steps(9, end) both"></div>
    <div style="position:absolute;left:90px;right:90px;top:640px;display:flex;flex-direction:column;gap:24px">
      <div class="push" style="animation:drop .5s .2s cubic-bezier(.2,.8,.2,1) both"><div class="ic">${ICON.flash}</div><div><b>Yap Moment ist da</b><span>10 Minuten, alle haben Zeit</span></div><time>jetzt</time></div>
      ${joins.map(([l, t, s], i) => `<div class="push" style="animation:drop .5s ${0.9 + i * 0.7}s cubic-bezier(.2,.8,.2,1) both"><div class="ic" style="border-radius:50%;font-size:42px;font-weight:700">${l}</div><div><b>${t}</b><span>${s}</span></div><time>jetzt</time></div>`).join('')}
    </div>`);

  /* ---------- End card alone, for the hero film and edits (5 s) ---------- */
  add('endcard-9x16', 5, endCard(0));
  add('endcard-16x9', 5, endCard(0, { w: 1920, h: 1080 }), { w: 1920, h: 1080 });

  return ads;
};

module.exports.buildAd = buildAd;
module.exports.LAUNCH_ADS = LAUNCH_ADS;
