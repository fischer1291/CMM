// Landing page: one self-contained HTML file (CSS, logo and screens inline).
const fs = require('fs');
const path = require('path');
const { screens, ICON } = require('./screens');

const brandCss = fs.readFileSync(path.join(__dirname, 'brand.css'), 'utf8');

const EXCUSES = [
  'Lass mal bald telefonieren!',
  'Sorry, grad schlecht',
  'Ruf ich dich später an',
  'Hab dich verpasst 🙈',
  'Wir müssen echt mal wieder quatschen',
  'Passt es dir heute?',
  'Ah, du hattest angerufen?',
  'Nächste Woche vielleicht?',
];

const FEATURES = [
  { tag: 'Status', title: 'Ein Tipp, und alle wissen: Du hast Zeit.', text: 'Schalte dich erreichbar, wenn es dir passt. Deine Leute sehen den Neon-Ring und rufen an, statt ins Leere zu tippen.', screen: 'status' },
  { tag: 'Yap Moment', title: 'Jeden Tag 10 Minuten, in denen alle Zeit haben.', text: 'Einmal am Tag bekommen alle gleichzeitig den Moment. Wer dabei ist, ist erreichbar, bis er endet. Oder tipp auf „Überrasch mich“.', screen: 'moment' },
  { tag: 'Kreise & Rituale', title: 'Sonntag, 18 Uhr: Familienrunde.', text: 'Leg einen Kreis für Familie, WG oder die Leute von früher an. Mit festem Ritual öffnet sich eure Videorunde von allein, und alle bekommen Bescheid.', screen: 'circle' },
  { tag: 'Moments', title: 'Erst reden, dann gucken.', text: 'Halte im Anruf mit ✨ einen Moment fest, nur wenn beide zustimmen. Sichtbar 24 Stunden, und nur für Leute, die heute selbst ein echtes Gespräch geführt haben.', screen: 'moments' },
  { tag: 'Gesprächszeit', title: 'Sieh, wie viel Zeit du dir für deine Menschen nimmst.', text: 'Wochen-Serien und Abzeichen zum Sammeln, ohne Rangliste. Privat, bis du selbst entscheidest, wer es sehen darf. Mit wem du sprichst, sieht nie jemand.', screen: 'stats' },
];

const NOPE = [
  ['Kein Feed', 'Nichts zum Endlos-Scrollen. Die App will, dass du sie zumachst und redest.'],
  ['Keine Likes', 'Niemand zählt Herzen. Gezählt wird nur Zeit, die du mit deinen Leuten verbracht hast, und die siehst nur du.'],
  ['Keine Fremden', 'Nur Menschen aus deinen Kontakten und Leute, die du einlädst. Blockieren und Melden mit zwei Tipps.'],
  ['Keine Werbung', 'Deine Gespräche sind kein Werbeinventar.'],
  ['Kein Druck', 'Keine Lesebestätigung, kein „zuletzt online“. Du bist erreichbar, wenn du willst, und sonst eben nicht.'],
];

const FAQ = [
  ['Was kostet Wanna yap?', 'Nichts. Die App ist kostenlos und ohne Werbung.'],
  ['Brauchen meine Freunde die App auch?', 'Ja, damit ihr euren Status gegenseitig seht. Du lädst sie mit einem Link ein. Wer über deinen Link kommt, ist nach der Anmeldung direkt mit dir verbunden.'],
  ['Wer sieht, dass ich erreichbar bin?', 'Nur deine Kontakte, die ebenfalls Wanna yap? nutzen. Fremde finden dich nicht, und du kannst jede Person blockieren.'],
  ['Ist das ein Video- oder ein Telefon-Anruf?', 'Beides. Du startest einen Video- oder Audioanruf direkt in der App, auch in der Gruppe mit deinem Kreis.'],
  ['Gibt es die App für Android?', 'Zuerst kommt die iPhone-Version. Eine Android-Version ist geplant, aber noch nicht terminiert.'],
  ['Was passiert mit meinen Daten?', 'Wir speichern nur, was die App zum Funktionieren braucht. Du kannst deine Daten jederzeit exportieren und dein Konto in der App löschen. Details stehen in der Datenschutzerklärung.'],
];

module.exports = function landing({ logoSvg, siteUrl, legalUrl, downloadUrl, ogImage }) {
  const heroCta = `<a class="cta" href="${downloadUrl}">${ICON.phone}<span>Im App Store laden</span></a>`;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Wanna yap? · Ruf an, wenn’s passt</title>
<meta name="description" content="Sieh, wer aus deinen Leuten gerade Zeit hat, und ruf einfach an. Die App für echte Gespräche: kein Feed, keine Likes, keine Fremden.">
<meta name="theme-color" content="#0B0B12">
<meta property="og:type" content="website">
<meta property="og:title" content="Wanna yap? · Ruf an, wenn’s passt">
<meta property="og:description" content="Sieh, wer aus deinen Leuten gerade Zeit hat, und ruf einfach an.">
<meta property="og:url" content="${siteUrl}">
<meta property="og:image" content="${siteUrl}/${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<style>
${brandCss}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 17px; line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; border-radius: 6px; }
.wrap { width: 100%; max-width: 1160px; margin: 0 auto; padding-inline: 24px; }
h1, h2, h3 { margin: 0; text-wrap: balance; letter-spacing: -0.03em; line-height: 1.02; }
p { margin: 0; }
.eyebrow { font-family: var(--mono); font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cyan); }
.muted { color: var(--text-2); }

/* Nav */
.nav { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20; backdrop-filter: blur(18px); background: rgba(11,11,18,0.72); border-bottom: 1px solid var(--border); }
.nav .wrap { display: flex; align-items: center; justify-content: space-between; height: 68px; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 19px; letter-spacing: -0.02em; text-decoration: none; }
.logo svg { width: 36px; height: 36px; }
.nav-links { display: flex; gap: 28px; align-items: center; font-size: 15px; }
.nav-links a { text-decoration: none; color: var(--text-2); }
.nav-links a:hover { color: var(--text); }
.nav-links .mini { color: var(--bg); background: var(--text); padding: 9px 16px; border-radius: 999px; font-weight: 600; }
.nav-links .mini:hover { color: var(--bg); background: var(--cyan); }

/* Buttons */
.cta { display: inline-flex; align-items: center; gap: 10px; height: 60px; padding: 0 30px; border-radius: 999px; background: var(--brand); color: #0B0B12; font-weight: 700; font-size: 18px; text-decoration: none; box-shadow: 0 0 40px rgba(255,46,147,0.35), 0 0 20px rgba(0,229,255,0.25); transition: transform .2s, box-shadow .2s; border: 0; cursor: pointer; font-family: inherit; }
.cta svg { width: 20px; height: 20px; }
.cta:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(255,46,147,0.5), 0 0 30px rgba(0,229,255,0.35); }
.ghost { display: inline-flex; align-items: center; height: 60px; padding: 0 24px; border-radius: 999px; border: 1px solid var(--border-strong); color: var(--text); text-decoration: none; font-weight: 600; }
.ghost:hover { background: var(--surface); }

/* Hero */
.hero { position: relative; padding-block: 72px 40px; }
.hero::before { content: ''; position: absolute; inset: -200px 0 auto; height: 900px; background: radial-gradient(50% 45% at 78% 40%, rgba(139,92,255,0.28), transparent 70%), radial-gradient(40% 40% at 10% 10%, rgba(0,229,255,0.16), transparent 70%); pointer-events: none; z-index: -1; }
.hero .wrap { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center; }
.hero h1 { font-size: clamp(56px, 9vw, 116px); font-weight: 700; letter-spacing: -0.055em; line-height: 0.92; }
.hero h1 .line2 { display: block; }
.hero .lead { font-size: clamp(19px, 2vw, 22px); color: var(--text-2); max-width: 30ch; margin-top: 28px; }
.hero .lead b { color: var(--text); font-weight: 600; }
.hero .actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 36px; }
.hero .note { margin-top: 18px; font-size: 14px; color: var(--text-3); font-family: var(--mono); }
.stage { position: relative; display: flex; justify-content: center; min-height: 640px; }
.stage .phone { position: absolute; }
.stage .back { transform: translate(-28%, 8%) rotate(-8deg) scale(0.86); opacity: 0.9; filter: saturate(0.9); }
.stage .front { transform: translate(18%, 0) rotate(4deg); }
.stage .ping { position: absolute; z-index: 3; display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 10px; border-radius: 999px; background: rgba(24,24,38,0.9); border: 1px solid var(--border-strong); backdrop-filter: blur(16px); font-size: 14px; font-weight: 600; box-shadow: 0 10px 40px rgba(0,0,0,0.5); white-space: nowrap; }
.stage .ping .av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #0B0B12; font-weight: 700; font-size: 13px; }
.stage .ping small { color: var(--cyan); font-weight: 500; }
.stage .p1 { top: 12%; right: -4%; animation: bob 5s ease-in-out infinite; }
.stage .p2 { bottom: 16%; left: -2%; animation: bob 6s ease-in-out -2s infinite; }
@keyframes bob { 50% { transform: translateY(-10px); } }
.phone .ring::after { animation: breathe 3.2s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: 0.55; transform: scale(0.94); } }

/* Excuses marquee */
.excuses { border-block: 1px solid var(--border); overflow: hidden; padding-block: 22px; margin-top: 40px; }
.excuses .track { display: flex; gap: 18px; width: max-content; animation: slide 48s linear infinite; }
.excuses span { font-size: clamp(22px, 3vw, 34px); font-weight: 600; letter-spacing: -0.02em; color: var(--text-3); white-space: nowrap; display: flex; align-items: center; gap: 18px; }
.excuses span::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--pink); box-shadow: 0 0 12px var(--pink); }
.excuses span:nth-child(3n+1) { color: var(--text-2); text-decoration: line-through; text-decoration-color: var(--pink); text-decoration-thickness: 3px; }
@keyframes slide { to { transform: translateX(-50%); } }

/* Statement */
.statement { padding-block: 120px 60px; }
.statement h2 { font-size: clamp(40px, 6vw, 80px); max-width: 16ch; }
.statement p { font-size: 20px; color: var(--text-2); max-width: 52ch; margin-top: 28px; }

/* Steps */
.steps { padding-block: 40px 60px; }
.steps ol { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; counter-reset: s; }
.steps li { counter-increment: s; padding: 28px; border-radius: 28px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
.steps li::before { content: '0' counter(s); font-family: var(--mono); font-size: 14px; color: var(--pink); }
.steps h3 { font-size: 26px; }
.steps p { color: var(--text-2); font-size: 16px; }

/* Features */
.features { padding-block: 80px; display: flex; flex-direction: column; gap: 110px; }
.feature { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.feature:nth-child(even) .copy { order: 2; }
.feature .copy { display: flex; flex-direction: column; gap: 18px; max-width: 30rem; }
.feature h3 { font-size: clamp(34px, 4.2vw, 54px); }
.feature p { font-size: 19px; color: var(--text-2); }
.feature .shot-wrap { display: flex; justify-content: center; position: relative; }
.feature .shot-wrap::before { content: ''; position: absolute; width: 70%; aspect-ratio: 1; border-radius: 50%; top: 15%; background: var(--brand); filter: blur(110px); opacity: 0.28; }

/* No list */
.nope { padding-block: 100px; }
.nope h2 { font-size: clamp(40px, 6vw, 80px); }
.nope-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 44px; }
.nope-grid div { padding: 24px; border-radius: 24px; border: 1px solid var(--border); background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent); }
.nope-grid h3 { font-size: 26px; margin-bottom: 10px; }
.nope-grid h3 s { text-decoration-color: var(--pink); text-decoration-thickness: 3px; }
.nope-grid p { color: var(--text-2); font-size: 15px; }

/* For whom */
.who { padding-block: 40px 100px; }
.who-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
.who-grid figure { margin: 0; padding: 28px; border-radius: 28px; background: var(--bg-elevated); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.who-grid .emo { font-size: 36px; }
.who-grid h3 { font-size: 24px; }
.who-grid p { color: var(--text-2); font-size: 16px; }
.who h2 { font-size: clamp(36px, 5vw, 64px); }

/* Download */
.join { padding-block: 60px 120px; }
.join-card { position: relative; border-radius: 40px; padding: 2px; background: var(--brand); box-shadow: 0 0 80px rgba(255,46,147,0.25); }
.join-inner { border-radius: 38px; background: radial-gradient(80% 120% at 100% 0%, rgba(139,92,255,0.22), transparent 60%), #11111b; padding: clamp(32px, 6vw, 72px); display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; }
.join h2 { font-size: clamp(40px, 5.6vw, 72px); }
.join .sub { color: var(--text-2); font-size: 19px; margin-top: 18px; max-width: 36ch; }

/* FAQ */
.faq { padding-block: 20px 100px; }
.faq h2 { font-size: clamp(36px, 5vw, 60px); margin-bottom: 32px; }
.faq details { border-top: 1px solid var(--border); padding-block: 22px; }
.faq details:last-child { border-bottom: 1px solid var(--border); }
.faq summary { cursor: pointer; list-style: none; font-size: 21px; font-weight: 600; display: flex; justify-content: space-between; gap: 20px; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: '+'; font-family: var(--mono); color: var(--cyan); font-size: 24px; line-height: 1; transition: transform .2s; }
.faq details[open] summary::after { transform: rotate(45deg); }
.faq details p { color: var(--text-2); margin-top: 12px; max-width: 64ch; }

/* Footer */
footer { border-top: 1px solid var(--border); padding-block: 40px 60px; font-size: 14px; color: var(--text-3); }
footer .wrap { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center; }
footer nav { display: flex; gap: 22px; }
footer a { text-decoration: none; color: var(--text-2); }
footer a:hover { color: var(--text); }

@media (max-width: 960px) {
  .hero .wrap, .feature, .join-inner { grid-template-columns: 1fr; }
  .feature:nth-child(even) .copy { order: 0; }
  .stage { min-height: 560px; }
  .stage .phone { --pw: 270px !important; }
  .steps ol, .who-grid { grid-template-columns: 1fr; }
  .nav-links a:not(.mini) { display: none; }
  .features { gap: 80px; }
}
@media (max-width: 520px) {
  .wrap { padding-inline: 18px; }
  .hero { padding-block: 40px 20px; }
  .stage { min-height: 480px; }
  .stage .phone { --pw: 230px !important; }
  .stage .p1 { right: 0; } .stage .p2 { left: 0; }
  .feature .phone { --pw: 280px !important; }
  .cta { height: 56px; padding: 0 24px; font-size: 17px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
</style>
</head>
<body>
<header class="nav">
  <div class="wrap">
    <a class="logo" href="#top" aria-label="Wanna yap?">${logoSvg}<span>Wanna yap?</span></a>
    <nav class="nav-links" aria-label="Hauptnavigation">
      <a href="#so-gehts">So geht’s</a>
      <a href="#features">Features</a>
      <a href="#faq">FAQ</a>
      <a class="mini" href="${downloadUrl}">Laden</a>
    </nav>
  </div>
</header>

<main id="top">
  <section class="hero">
    <div class="wrap">
      <div>
        <p class="eyebrow">Die App für echte Gespräche</p>
        <h1 style="margin-top:20px">Ruf an,<span class="line2 grad-text">wenn’s passt.</span></h1>
        <p class="lead">Sieh, wer aus deinen Leuten <b>gerade Zeit hat</b>, und ruf einfach an. Kein Anruf ins Leere, kein „Lass mal bald telefonieren“.</p>
        <div class="actions">${heroCta}<a class="ghost" href="#so-gehts">So funktioniert’s</a></div>
        <p class="note">Kostenlos</p>
      </div>
      <div class="stage" aria-hidden="true">
        ${screens.moment({ pw: 300, extraClass: 'back' })}
        ${screens.status({ pw: 310, extraClass: 'front' })}
        <div class="ping p1"><span class="av" style="background:linear-gradient(135deg,#FFB547,#FF2E93)">J</span><span>Jonas hat jetzt Zeit<br><small>● erreichbar · 20 min</small></span></div>
        <div class="ping p2"><span class="av" style="background:linear-gradient(135deg,#3DF5A7,#00E5FF)">H</span><span>Oma Helga ruft an …</span></div>
      </div>
    </div>
    <div class="excuses" aria-label="Sätze, die du mit Wanna yap? nicht mehr brauchst">
      <div class="track">${[...EXCUSES, ...EXCUSES].map((e) => `<span>${e}</span>`).join('')}</div>
    </div>
  </section>

  <section class="statement wrap">
    <p class="eyebrow">Warum?</p>
    <h2 style="margin-top:18px">Wir schreiben hundert Nachrichten und telefonieren nie.</h2>
    <p>Dabei ist ein echtes Gespräch das, was Freundschaften wirklich trägt. Das Problem ist selten die Lust, sondern das Timing. Wanna yap? löst genau das: Du siehst, wann deine Leute Zeit haben, und sie sehen es bei dir.</p>
  </section>

  <section class="steps wrap" id="so-gehts">
    <ol>
      <li><h3>Erreichbar schalten</h3><p>Ein Tipp auf den Ring, wenn du Zeit hast. Oder leg fest, wann du automatisch erreichbar bist.</p></li>
      <li><h3>Sehen, wer Zeit hat</h3><p>Deine Kontakte leuchten auf, sobald sie frei sind. Habt ihr beide gerade Zeit, sagt dir die App Bescheid.</p></li>
      <li><h3>Einfach anrufen</h3><p>Video oder Audio, zu zweit oder in der Runde. Direkt in der App, ohne Terminabsprache.</p></li>
    </ol>
  </section>

  <section class="features wrap" id="features">
    ${FEATURES.map((f) => `
    <article class="feature">
      <div class="copy"><p class="eyebrow">${f.tag}</p><h3>${f.title}</h3><p>${f.text}</p></div>
      <div class="shot-wrap" aria-hidden="true">${screens[f.screen]({ pw: 330 })}</div>
    </article>`).join('')}
  </section>

  <section class="nope wrap">
    <p class="eyebrow">Was es bei uns nicht gibt</p>
    <h2 style="margin-top:18px">Weniger App.<br><span class="grad-text">Mehr Menschen.</span></h2>
    <div class="nope-grid">${NOPE.map(([t, p]) => `<div><h3><s>${t.replace(/^Kein(e)? /, '')}</s></h3><p><b style="color:var(--text)">${t}.</b> ${p}</p></div>`).join('')}</div>
  </section>

  <section class="who wrap">
    <p class="eyebrow">Für wen?</p>
    <h2 style="margin-top:18px">Für alle, die sich öfter hören wollen.</h2>
    <div class="who-grid">
      <figure><span class="emo">🎓</span><h3>Neu in der Stadt</h3><p>Studium, Job, Umzug: Die besten Freunde wohnen plötzlich 400 km weg. Mit Wanna yap? erwischst du sie trotzdem.</p></figure>
      <figure><span class="emo">🏡</span><h3>Familie auf Abstand</h3><p>Ein fester Sonntagstermin mit Eltern und Großeltern, der von allein stattfindet, statt jedes Mal neu geplant zu werden.</p></figure>
      <figure><span class="emo">🫶</span><h3>Freundschaften, die fehlen</h3><p>Die Leute, mit denen du „echt mal wieder“ reden wolltest. Die App zeigt dir, wann es passt, und stupst dich an.</p></figure>
    </div>
  </section>

  <section class="join wrap" id="download">
    <div class="join-card"><div class="join-inner">
      <div>
        <p class="eyebrow">Bald im App Store</p>
        <h2 style="margin-top:18px">Bereit, wenn du es bist.</h2>
        <p class="sub">Lad dir Wanna yap? und sieh sofort, wer aus deinen Leuten gerade Zeit hat. Bring am besten gleich deine Leute mit: Zusammen macht die App am meisten Sinn.</p>
      </div>
      <div style="display:flex;align-items:center;justify-content:center">
        <a class="cta" href="${downloadUrl}">${ICON.phone}<span>Im App Store laden</span></a>
      </div>
    </div></div>
  </section>

  <section class="faq wrap" id="faq">
    <h2>Fragen?</h2>
    ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
  </section>
</main>

<footer>
  <div class="wrap">
    <a class="logo" href="#top">${logoSvg}<span>Wanna yap?</span></a>
    <nav aria-label="Rechtliches"><a href="${legalUrl}/impressum">Impressum</a><a href="${legalUrl}/datenschutz">Datenschutz</a></nav>
    <span>Gemacht für echte Gespräche.</span>
  </div>
</footer>
</body>
</html>`;
};
