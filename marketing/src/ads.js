// Animated ads (Reels, TikTok, Stories) as HTML pages with CSS animations.
// video.js pauses every animation and seeks it frame by frame, so the result
// is exact and doesn't depend on how fast the machine renders.
//
// Rules for sound-off feeds: the hook is on screen within 1.5 s, every ad
// ends on the same end card, texts stay inside the safe zone (TikTok/Reels UI
// covers roughly the bottom 20 % and the right 12 %).
const { page } = require('./kit');
const { screens, ICON } = require('./screens');

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


module.exports = function ads({ logoSvg, shortUrl }) {
  const brandRow = (size = 34) =>
    `<div class="brand" style="font-size:${size}px"><span style="width:${size * 1.5}px;height:${size * 1.5}px;display:block">${logoSvg}</span>Wanna yap?</div>`;

  /** The same end card everywhere, from `t` seconds on. */
  const endCard = (t, { w = W, h = H } = {}) => {
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

  const ads = [];
  const add = (name, seconds, body, { w = W, h = H } = {}) => ads.push({ name, w, h, seconds, html: page(w, h, body, MOTION) });

  /* ---------- 1: "Lass mal bald telefonieren" (13 s) ---------- */
  const chat = [
    ['me', 'Lass mal bald telefonieren! 🥺'],
    ['them', 'Jaaa unbedingt, nächste Woche?'],
    ['them', 'Sorry, war im Zug 🙈'],
    ['me', 'Ah, du hattest angerufen?'],
    ['them', 'Lass mal bald telefonieren!!'],
  ];
  add('ad-1-bald-telefonieren', 13, `
    <div class="scene" style="animation:fadeOut .6s 5.6s both">
      <div class="safe" style="top:190px">
        <p class="eyebrow" style="font-size:30px;animation:fadeIn .4s 0s both">Ehrliche Frage</p>
        <h1 style="font-size:96px;margin-top:24px;animation:rise .7s .1s cubic-bezier(.2,.8,.2,1) both">Wie oft hast du das dieses Jahr geschrieben?</h1>
      </div>
      <div class="safe" style="top:760px;display:flex;flex-direction:column;gap:26px">
        ${chat.map(([who, text], i) => `<div class="bubble ${who}" style="animation:rise .5s ${1.2 + i * 0.75}s cubic-bezier(.2,.8,.2,1) both"><span class="struck" style="animation:strike .35s ${4.9 + i * 0.08}s both">${text}</span></div>`).join('')}
      </div>
    </div>
    <div class="scene" style="animation:fadeIn .5s 6s both, fadeOut .5s 10.1s both">
      <div class="safe" style="top:190px;text-align:left">
        <h1 style="font-size:112px;animation:rise .7s 6.1s cubic-bezier(.2,.8,.2,1) both">Sieh einfach, wer <span class="grad-text">gerade Zeit</span> hat.</h1>
      </div>
      <div class="glowblob" style="width:760px;height:760px;left:160px;top:900px;animation:pulse 3s 6s infinite both"></div>
      <div style="position:absolute;left:50%;top:700px;animation:slideUp .9s 6.4s cubic-bezier(.2,.8,.2,1) both">${screens.status({ pw: 600 })}</div>
    </div>
    ${endCard(10.5)}`);

  /* ---------- 2: Yap Moment (13 s) ---------- */
  const joins = [
    ['M', 'Mila ist dabei', 'hat 10 Minuten Zeit'],
    ['J', 'Jonas ist dabei', 'aus Hamburg'],
    ['O', 'Oma ist dabei 👵', 'Küche, wie immer'],
  ];
  add('ad-2-yap-moment', 13, `
    <div class="scene" style="animation:fadeOut .5s 10.1s both">
      <div class="safe" style="top:190px">
        <p class="eyebrow" style="font-size:30px;color:var(--pink);animation:fadeIn .4s 0s both">⚡ Yap Moment</p>
        <h1 style="font-size:100px;margin-top:24px;animation:rise .7s .1s cubic-bezier(.2,.8,.2,1) both">Jeden Tag haben alle meine Leute <span class="grad-text">gleichzeitig Zeit.</span></h1>
      </div>
      <div class="safe clock grad-text" style="top:760px;font-family:var(--mono);font-weight:700;font-size:210px;letter-spacing:-.04em;line-height:1;animation:fadeIn .4s 1.2s both, tick 9s 1.2s steps(9, end) both"></div>
      <div class="safe" style="top:1040px;display:flex;flex-direction:column;gap:24px">
        <div class="push" style="animation:drop .6s 1.8s cubic-bezier(.2,.8,.2,1) both"><div class="ic">${ICON.flash}</div><div><b>Yap Moment ist da</b><span>10 Minuten, alle haben Zeit</span></div><time>jetzt</time></div>
        ${joins.map(([l, t, s], i) => `<div class="push" style="animation:drop .6s ${3.4 + i * 1.3}s cubic-bezier(.2,.8,.2,1) both"><div class="ic" style="border-radius:50%;font-size:42px;font-weight:700">${l}</div><div><b>${t}</b><span>${s}</span></div><time>jetzt</time></div>`).join('')}
      </div>
    </div>
    ${endCard(10.5)}`);

  /* ---------- 3: Kein Feed (11 s) ---------- */
  const nots = ['Kein Feed.', 'Keine Likes.', 'Keine Fremden.', 'Keine Werbung.'];
  add('ad-3-kein-feed', 11, `
    <div class="scene" style="animation:fadeOut .5s 4.9s both">
      <div class="safe" style="top:360px;display:flex;flex-direction:column;gap:30px">
        ${nots.map((t, i) => `<h1 style="font-size:108px;animation:rise .45s ${0.1 + i * 0.7}s cubic-bezier(.2,.8,.2,1) both"><span class="struck" style="animation:strike .3s ${0.45 + i * 0.7}s both;color:var(--text-2)">${t}</span></h1>`).join('')}
        <h1 style="font-size:132px;margin-top:40px;animation:pop .7s 3.2s both"><span class="grad-text">Nur deine Menschen.</span></h1>
      </div>
    </div>
    <div class="scene" style="animation:fadeIn .5s 5.2s both, fadeOut .5s 8.1s both">
      <div class="safe" style="top:190px">
        <h1 style="font-size:104px;animation:rise .7s 5.3s cubic-bezier(.2,.8,.2,1) both">Sieh, wer Zeit hat. <span class="grad-text">Ruf einfach an.</span></h1>
      </div>
      <div class="glowblob" style="width:760px;height:760px;left:160px;top:900px;animation:pulse 3s 5.2s infinite both"></div>
      <div style="position:absolute;left:50%;top:700px;animation:slideUp .9s 5.5s cubic-bezier(.2,.8,.2,1) both">${screens.status({ pw: 600 })}</div>
    </div>
    ${endCard(8.5)}`);

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
