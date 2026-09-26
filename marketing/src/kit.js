// Marketing assets as fixed-size HTML pages, rendered to PNG/PDF by build.js.
const fs = require('fs');
const path = require('path');
const { screens, ICON } = require('./screens');

const brandCss = fs.readFileSync(path.join(__dirname, 'brand.css'), 'utf8');

const page = (w, h, body, css = '') => `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<style>${brandCss}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.art{position:relative;width:${w}px;height:${h}px;overflow:hidden;
  background:radial-gradient(70% 45% at 0% 0%,rgba(0,229,255,.20),transparent 70%),radial-gradient(70% 45% at 100% 100%,rgba(255,46,147,.20),transparent 70%),radial-gradient(50% 40% at 70% 50%,rgba(139,92,255,.16),transparent 70%),var(--bg)}
.art::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.07;background-image:radial-gradient(rgba(255,255,255,.9) 1px,transparent 1px);background-size:6px 6px;mix-blend-mode:overlay}
h1,h2{margin:0;letter-spacing:-.05em;line-height:.95;text-wrap:balance}
p{margin:0}
.eyebrow{font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--cyan)}
.brand{display:flex;align-items:center;gap:16px;font-weight:700;letter-spacing:-.02em}
.strike{text-decoration:line-through;text-decoration-color:var(--pink);text-decoration-thickness:.09em;color:var(--text-3)}
.btn{display:inline-flex;align-items:center;gap:14px;border-radius:999px;background:var(--brand);color:#0B0B12;font-weight:700}
.btn svg{width:1em;height:1em}
.glowblob{position:absolute;border-radius:50%;background:var(--brand);filter:blur(140px);opacity:.35}
${css}</style></head><body><div class="art">${body}</div></body></html>`;

module.exports = function kit({ logoSvg, qrSvg, shortUrl }) {
  const brandRow = (size = 34) => `<div class="brand" style="font-size:${size}px"><span style="width:${size * 1.5}px;height:${size * 1.5}px;display:block">${logoSvg}</span>Wanna yap?</div>`;
  const assets = [];
  const add = (dir, name, w, h, body, css, pdf) => assets.push({ dir, name, w, h, html: page(w, h, body, css), pdf });

  /* ---------- Open Graph / link preview ---------- */
  add('web', 'og-image', 1200, 630, `
    <div style="position:absolute;left:80px;top:80px;width:620px;display:flex;flex-direction:column;gap:30px">
      ${brandRow(30)}
      <h1 style="font-size:104px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
      <p style="font-size:28px;color:var(--text-2);max-width:22ch">Sieh, wer aus deinen Leuten gerade Zeit hat.</p>
    </div>
    <div class="glowblob" style="width:500px;height:500px;right:40px;top:40px"></div>
    <div style="position:absolute;right:90px;top:70px;transform:rotate(5deg)">${screens.status({ pw: 330 })}</div>`);

  /* ---------- Instagram feed posts 4:5 ---------- */
  add('social/instagram', 'post-1-hook', 1080, 1350, `
    <div style="position:absolute;inset:90px 90px auto;display:flex;flex-direction:column;gap:34px">
      <p class="eyebrow" style="font-size:26px">Ehrliche Frage</p>
      <h1 style="font-size:124px">Wann hast du zuletzt einfach <span class="grad-text">angerufen?</span></h1>
    </div>
    <div class="glowblob" style="width:600px;height:600px;left:240px;bottom:-60px"></div>
    <div style="position:absolute;left:50%;bottom:-340px;transform:translateX(-50%)">${screens.status({ pw: 520 })}</div>
    <div style="position:absolute;right:90px;top:84px">${brandRow(26)}</div>`);

  add('social/instagram', 'post-2-excuse', 1080, 1350, `
    <div style="position:absolute;inset:100px 90px;display:flex;flex-direction:column;justify-content:space-between">
      ${brandRow(30)}
      <div style="display:flex;flex-direction:column;gap:26px">
        <h2 class="strike" style="font-size:92px">Lass mal bald telefonieren.</h2>
        <h2 class="strike" style="font-size:92px">Sorry, grad schlecht.</h2>
        <h2 class="strike" style="font-size:92px">Hab dich verpasst.</h2>
        <h1 style="font-size:150px;margin-top:20px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
      </div>
      <p style="font-size:32px;color:var(--text-2)">Sieh, wer aus deinen Leuten gerade Zeit hat. <span style="color:var(--text)">Link in Bio.</span></p>
    </div>`);

  add('social/instagram', 'post-3-talk-first', 1080, 1350, `
    <div style="position:absolute;left:90px;top:100px;width:520px;display:flex;flex-direction:column;gap:30px">
      <p class="eyebrow" style="font-size:24px;color:var(--pink)">Moments</p>
      <h1 style="font-size:130px">Talk<br>first.<br><span class="grad-text">Then see.</span></h1>
      <p style="font-size:34px;color:var(--text-2);line-height:1.3">Die Moments deiner Leute siehst du erst, wenn du selbst ein echtes Gespräch geführt hast.</p>
    </div>
    <div class="glowblob" style="width:520px;height:520px;right:-80px;top:300px"></div>
    <div style="position:absolute;right:-70px;top:170px;transform:rotate(6deg)">${screens.moments({ pw: 460 })}</div>
    <div style="position:absolute;left:90px;bottom:90px">${brandRow(30)}</div>`);

  /* ---------- Instagram carousel ---------- */
  const slideNo = (n) => `<div style="position:absolute;right:90px;top:96px;font-family:var(--mono);font-size:26px;color:var(--text-3)">${n}/5</div>`;
  add('social/instagram', 'carousel-1', 1080, 1350, `${slideNo(1)}
    <div style="position:absolute;inset:100px 90px;display:flex;flex-direction:column;justify-content:space-between">
      ${brandRow(30)}
      <h1 style="font-size:132px">Deine Freunde haben gerade Zeit.<br><span class="grad-text">Du weißt es nur nicht.</span></h1>
      <p style="font-size:34px;color:var(--text-2)">Wisch, um das zu ändern →</p>
    </div>`);
  const carouselStep = (n, eyebrow, title, text, screen, rot) => add('social/instagram', `carousel-${n}`, 1080, 1350, `${slideNo(n)}
    <div style="position:absolute;left:90px;top:100px;width:900px;display:flex;flex-direction:column;gap:24px">
      <p class="eyebrow" style="font-size:24px">${eyebrow}</p>
      <h2 style="font-size:92px">${title}</h2>
      <p style="font-size:32px;color:var(--text-2);line-height:1.3;max-width:26ch">${text}</p>
    </div>
    <div class="glowblob" style="width:560px;height:560px;left:260px;bottom:0"></div>
    <div style="position:absolute;left:50%;bottom:-420px;transform:translateX(-50%) rotate(${rot}deg)">${screens[screen]({ pw: 520 })}</div>`);
  carouselStep(2, 'Schritt 1', 'Tipp auf den Ring, wenn du Zeit hast.', 'Deine Leute sehen sofort: Jetzt passt ein Anruf.', 'status', -3);
  carouselStep(3, 'Jeden Tag', 'Der Yap Moment: 10 Minuten, alle haben Zeit.', 'Alle bekommen ihn gleichzeitig. Wer dabei ist, ist erreichbar.', 'moment', 3);
  carouselStep(4, 'Kreise & Rituale', 'Sonntag, 18 Uhr: Familienrunde.', 'Die Runde öffnet sich von allein, und alle bekommen Bescheid.', 'circle', -3);
  add('social/instagram', 'carousel-5', 1080, 1350, `${slideNo(5)}
    <div class="glowblob" style="width:700px;height:700px;left:190px;top:300px"></div>
    <div style="position:absolute;inset:100px 90px;display:flex;flex-direction:column;justify-content:space-between">
      ${brandRow(30)}
      <div style="display:flex;flex-direction:column;gap:40px">
        <h1 style="font-size:150px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
        <p style="font-size:36px;color:var(--text-2)">Kein Feed. Keine Likes. Keine Fremden.<br>Nur deine Menschen.</p>
        <div><span class="btn" style="font-size:40px;padding:30px 50px">${ICON.flash} Link in Bio</span></div>
      </div>
      <p style="font-size:30px;color:var(--text-3)">Schick das an die Person, die du anrufen solltest. 💛</p>
    </div>`);

  /* ---------- Stories / Reels covers 9:16 ---------- */
  add('social/stories', 'story-1-ich-hab-zeit', 1080, 1920, `
    <div class="glowblob" style="width:760px;height:760px;left:160px;top:520px"></div>
    <div style="position:absolute;inset:180px 90px 160px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center">
      <p class="eyebrow" style="font-size:28px">Status</p>
      <div style="position:relative;width:640px;height:640px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 35%,#23233A,#101019 70%);box-shadow:0 0 0 22px transparent">
        <div style="position:absolute;inset:-22px;border-radius:50%;padding:22px;background:conic-gradient(from 200deg,#00E5FF,#8B5CFF,#FF2E93,#00E5FF);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude"></div>
        <div style="position:absolute;inset:-60px;border-radius:50%;z-index:-1;background:conic-gradient(from 200deg,rgba(0,229,255,.6),rgba(139,92,255,.5),rgba(255,46,147,.6),rgba(0,229,255,.6));filter:blur(60px)"></div>
        <div><div style="width:110px;height:110px;margin:0 auto 20px;color:var(--cyan);filter:drop-shadow(0 0 20px var(--cyan))">${ICON.power}</div>
        <div style="font-size:96px;font-weight:700;letter-spacing:-.04em">Ich hab Zeit.</div>
        <div style="font-family:var(--mono);font-size:34px;color:var(--text-2);margin-top:10px">noch 30 min</div></div>
      </div>
      <h1 style="font-size:120px">Ruf an. <span class="grad-text">Jetzt.</span></h1>
      ${brandRow(34)}
    </div>`);

  add('social/stories', 'story-2-yap-moment', 1080, 1920, `
    <div style="position:absolute;inset:170px 90px 160px;display:flex;flex-direction:column;justify-content:space-between">
      <p class="eyebrow" style="font-size:30px;color:var(--pink)">⚡ Yap Moment</p>
      <div>
        <div style="font-family:var(--mono);font-weight:700;font-size:250px;letter-spacing:-.04em;line-height:1" class="grad-text">09:59</div>
        <h1 style="font-size:112px;margin-top:40px">Deine Leute haben jetzt 10 Minuten.</h1>
        <p style="font-size:40px;color:var(--text-2);margin-top:40px;line-height:1.3">Jeden Tag einmal. Alle gleichzeitig. Wer dabei ist, ist erreichbar.</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">${brandRow(34)}<span class="btn" style="font-size:36px;padding:26px 42px">${ICON.flash} Dabei sein</span></div>
    </div>`);

  add('social/stories', 'story-3-warteliste', 1080, 1920, `
    <div class="glowblob" style="width:700px;height:700px;left:190px;top:700px"></div>
    <div style="position:absolute;left:50%;top:640px;transform:translateX(-50%) rotate(-4deg)">${screens.status({ pw: 560 })}</div>
    <div style="position:absolute;inset:170px 90px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:30px">
      ${brandRow(34)}
      <h1 style="font-size:128px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:linear-gradient(transparent,var(--bg) 45%)"></div>
    <div style="position:absolute;left:90px;right:90px;bottom:170px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:26px">
      <span class="btn" style="font-size:44px;padding:32px 56px">${ICON.flash} Auf die Warteliste</span>
      <p style="font-family:var(--mono);font-size:30px;color:var(--text-2)">${shortUrl}</p>
    </div>`);

  /* ---------- App Store screenshots 6.9" (1290×2796) ---------- */
  const store = (n, eyebrow, title, screen, opts = {}) => add('appstore', `appstore-${n}-${screen}`, 1290, 2796, `
    <div class="glowblob" style="width:900px;height:900px;left:195px;top:1100px;opacity:.3"></div>
    <div style="position:absolute;inset:170px 110px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:36px">
      <p class="eyebrow" style="font-size:40px;${opts.pink ? 'color:var(--pink)' : ''}">${eyebrow}</p>
      <h1 style="font-size:126px">${title}</h1>
    </div>
    <div style="position:absolute;left:50%;top:880px;transform:translateX(-50%)">${screens[screen]({ pw: 960 })}</div>`);
  store(1, 'Ruf an, wenn’s passt', 'Sieh, wer <span class="grad-text">gerade Zeit</span> hat.', 'status');
  store(2, '⚡ Yap Moment', 'Jeden Tag 10 Minuten, <span class="grad-text">alle haben Zeit.</span>', 'moment', { pink: true });
  store(3, 'Kreise & Rituale', 'Die Familienrunde, <span class="grad-text">die von allein passiert.</span>', 'circle');
  store(4, 'Echte Gespräche', 'Video und Audio, <span class="grad-text">einfach so.</span>', 'call');
  store(5, 'Talk first', 'Erst reden, <span class="grad-text">dann gucken.</span>', 'moments', { pink: true });
  store(6, 'Nur für dich', 'Zeit mit deinen Menschen, <span class="grad-text">privat.</span>', 'stats');

  /* ---------- Flyer A6 (105×148 mm) with QR ---------- */
  const flyerCss = '@page{size:105mm 148mm;margin:0}';
  add('print', 'flyer-a6', 1240, 1748, `
    <div class="glowblob" style="width:700px;height:700px;left:500px;top:520px"></div>
    <div style="position:absolute;right:-150px;top:480px;transform:rotate(8deg)">${screens.status({ pw: 560 })}</div>
    <div style="position:absolute;inset:100px 100px auto;display:flex;flex-direction:column;gap:34px;width:760px">
      ${brandRow(34)}
      <h1 style="font-size:150px">Ruf an,<br><span class="grad-text">wenn’s passt.</span></h1>
      <p style="font-size:40px;color:var(--text-2);line-height:1.3;max-width:15ch">Sieh, wer aus deinen Leuten gerade Zeit hat.</p>
    </div>
    <div style="position:absolute;left:100px;bottom:100px;display:flex;align-items:center;gap:36px;padding:28px;padding-right:44px;border-radius:40px;background:rgba(19,19,30,.92);border:2px solid var(--border-strong)">
      <div style="width:250px;height:250px;background:#fff;border-radius:22px;padding:14px">${qrSvg}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <p style="font-size:44px;font-weight:700;letter-spacing:-.02em">Scannen &amp;<br>dabei sein</p>
        <p style="font-family:var(--mono);font-size:24px;color:var(--text-2)">${shortUrl}</p>
      </div>
    </div>`, flyerCss, { width: '105mm', height: '148mm' });

  return assets;
};
