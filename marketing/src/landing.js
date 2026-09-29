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

// Same wording as the backend stores as proof of consent (lib/waitlist.js CONSENT_TEXT)
const CONSENT_TEXT =
  'Ich möchte per E-Mail erfahren, wenn Wanna yap? startet, und bis dahin höchstens ein paar Neuigkeiten bekommen. Abmelden geht jederzeit über den Link in jeder Mail.';

const WAITLIST_FAQ = [
  ['Wann kommt die App?', 'Wir sind im Endspurt. Trag dich auf die Warteliste ein, dann bekommst du den Link am Launch-Tag als eine der Ersten.'],
  ['Was bringt mir die Warteliste?', 'Am Launch-Tag den Link direkt ins Postfach, das Abzeichen „Von Anfang an“ in der App, und wenn drei Freunde über deinen Link dazukommen, einen Monat Wanna yap+ geschenkt.'],
];

const FAQ = [
  ['Was kostet Wanna yap?', 'Nichts. Die App ist kostenlos und ohne Werbung.'],
  ['Brauchen meine Freunde die App auch?', 'Ja, damit ihr euren Status gegenseitig seht. Du lädst sie mit einem Link ein. Wer über deinen Link kommt, ist nach der Anmeldung direkt mit dir verbunden.'],
  ['Wer sieht, dass ich erreichbar bin?', 'Nur deine Kontakte, die ebenfalls Wanna yap? nutzen. Fremde finden dich nicht, und du kannst jede Person blockieren.'],
  ['Ist das ein Video- oder ein Telefon-Anruf?', 'Beides. Du startest einen Video- oder Audioanruf direkt in der App, auch in der Gruppe mit deinem Kreis.'],
  ['Gibt es die App für Android?', 'Zuerst kommt die iPhone-Version. Eine Android-Version ist geplant, aber noch nicht terminiert.'],
  ['Was passiert mit meinen Daten?', 'Wir speichern nur, was die App zum Funktionieren braucht. Du kannst deine Daten jederzeit exportieren und dein Konto in der App löschen. Details stehen in der Datenschutzerklärung.'],
];

module.exports = function landing({ logoSvg, siteUrl, legalUrl, downloadUrl, ogImage, mode = 'live', apiUrl = 'https://api.wannayap.app', preorder = false }) {
  const waiting = mode === 'waitlist';
  const storeCta = `<a class="cta" href="${downloadUrl}">${ICON.phone}<span>Im App Store laden</span></a>`;
  const preorderLink = preorder ? `<a class="ghost" href="${downloadUrl}">Im App Store vorbestellen</a>` : '';
  /** Waitlist sign-up (the script at the end sends it to the backend). */
  const waitForm = (id) => `
    <form class="wl" data-waitlist novalidate>
      <div class="wl-row">
        <label class="sr" for="email-${id}">E-Mail-Adresse</label>
        <input id="email-${id}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="deine@mail.de" required>
        <button class="cta" type="submit">${ICON.flash}<span>Auf die Warteliste</span></button>
      </div>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="wl-note">${CONSENT_TEXT} <a href="${legalUrl}/datenschutz">Datenschutz</a></p>
      <p class="wl-msg" role="status" aria-live="polite"></p>
    </form>`;
  const heroCta = waiting ? `${waitForm('hero')}${preorderLink ? `<div class="actions" style="margin-top:14px">${preorderLink}</div>` : ''}` : storeCta;
  const faq = waiting ? [...WAITLIST_FAQ, ...FAQ] : FAQ;

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

/* Waitlist */
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.wl { max-width: 560px; }
.wl-row { display: flex; gap: 10px; padding: 6px; border-radius: 999px; background: var(--surface-strong); border: 1px solid var(--border-strong); }
.wl-row input { flex: 1; min-width: 0; height: 52px; padding: 0 18px; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 17px; outline: none; }
.wl-row input::placeholder { color: var(--text-3); }
.wl-row:focus-within { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,229,255,0.15); }
.wl .cta { height: 52px; padding: 0 22px; font-size: 16px; white-space: nowrap; }
.wl .cta[disabled] { opacity: .6; cursor: progress; transform: none; }
.wl-note { margin-top: 12px; font-size: 12.5px; line-height: 1.5; color: var(--text-3); max-width: 58ch; }
.wl-note a { color: var(--text-2); }
.wl-msg { margin-top: 10px; font-size: 15px; color: var(--pink); min-height: 1px; }
.wl-done { padding: 22px 24px; border-radius: 24px; background: var(--surface); border: 1px solid var(--border-strong); max-width: 560px; }
.wl-done h3 { font-size: 24px; margin-bottom: 6px; }
.wl-done p { color: var(--text-2); font-size: 16px; }
.perks { list-style: none; padding: 0; margin: 26px 0 0; display: grid; gap: 12px; }
.perks li { display: flex; gap: 12px; align-items: baseline; color: var(--text-2); font-size: 16px; }
.perks b { color: var(--text); }
dialog.wl-dialog { width: min(520px, calc(100vw - 32px)); padding: 0; border: 0; border-radius: 32px; background: transparent; color: var(--text); }
dialog.wl-dialog::backdrop { background: rgba(5,5,10,0.78); backdrop-filter: blur(6px); }
.wl-card { position: relative; padding: 2px; border-radius: 32px; background: var(--brand); box-shadow: 0 0 80px rgba(255,46,147,0.3); }
.wl-card > div { border-radius: 30px; background: #11111b; padding: 34px 28px 28px; display: flex; flex-direction: column; gap: 16px; }
.wl-card h2 { font-size: 36px; }
.wl-card p { color: var(--text-2); }
.wl-close { position: absolute; top: 14px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--surface-strong); color: var(--text); font-size: 20px; cursor: pointer; }
.dots { display: flex; gap: 6px; }
.dots i { flex: 1; height: 8px; border-radius: 4px; background: var(--surface-strong); }
.dots i.on { background: var(--pink); box-shadow: 0 0 12px rgba(255,46,147,0.6); }
.linkbox { display: flex; gap: 8px; }
.linkbox input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border-radius: 14px; border: 1px solid var(--border-strong); background: var(--bg); color: var(--text); font: inherit; font-family: var(--mono); font-size: 14px; }
.btn2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 18px; border-radius: 14px; border: 1px solid var(--border-strong); background: var(--surface-strong); color: var(--text); font: inherit; font-weight: 600; font-size: 15px; cursor: pointer; text-decoration: none; }
.btn2:hover { background: var(--surface); }
.share-row { display: flex; gap: 8px; flex-wrap: wrap; }
.share-row .btn2 { flex: 1; }

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
  .wl-row { flex-direction: column; border-radius: 24px; padding: 8px; }
  .wl-row input { height: 50px; }
  .wl .cta { justify-content: center; }
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
      ${waiting ? '<a class="mini" href="#warteliste">Warteliste</a>' : `<a class="mini" href="${downloadUrl}">Laden</a>`}
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
        ${waiting ? `<div style="margin-top:36px">${heroCta}</div>` : `<div class="actions">${heroCta}<a class="ghost" href="#so-gehts">So funktioniert’s</a></div>`}
        <p class="note">${waiting ? 'Kostenlos · Bald fürs iPhone' : 'Kostenlos'}</p>
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

  ${waiting ? `<section class="join wrap" id="warteliste">
    <div class="join-card"><div class="join-inner">
      <div>
        <p class="eyebrow">Bald im App Store</p>
        <h2 style="margin-top:18px">Sei von Anfang an dabei.</h2>
        <p class="sub">Trag dich ein, und du bekommst den Link am Launch-Tag direkt ins Postfach. Bring deine Leute mit: Zusammen macht die App am meisten Sinn.</p>
        <ul class="perks">
          <li><span>🚀</span><span><b>Abzeichen „Von Anfang an“</b> in der App, nur für die Warteliste</span></li>
          <li><span>🎁</span><span><b>1 Monat Wanna yap+ geschenkt</b>, wenn drei Freunde über deinen Link dazukommen</span></li>
          <li><span>📬</span><span><b>Der Link zum Start</b>, bevor wir laut werden</span></li>
        </ul>
      </div>
      <div>${waitForm('join')}${preorderLink ? `<div style="margin-top:14px">${preorderLink}</div>` : ''}</div>
    </div></div>
  </section>` : `<section class="join wrap" id="download">
    <div class="join-card"><div class="join-inner">
      <div>
        <p class="eyebrow">Jetzt im App Store</p>
        <h2 style="margin-top:18px">Bereit, wenn du es bist.</h2>
        <p class="sub">Lad dir Wanna yap? und sieh sofort, wer aus deinen Leuten gerade Zeit hat. Bring am besten gleich deine Leute mit: Zusammen macht die App am meisten Sinn.</p>
      </div>
      <div style="display:flex;align-items:center;justify-content:center">
        ${storeCta}
      </div>
    </div></div>
  </section>`}

  <section class="faq wrap" id="faq">
    <h2>Fragen?</h2>
    ${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
  </section>
</main>

<footer>
  <div class="wrap">
    <a class="logo" href="#top">${logoSvg}<span>Wanna yap?</span></a>
    <nav aria-label="Rechtliches"><a href="${legalUrl}/impressum">Impressum</a><a href="${legalUrl}/datenschutz">Datenschutz</a></nav>
    <span>Gemacht für echte Gespräche.</span>
  </div>
</footer>
${visitScript({ apiUrl, siteUrl })}
${waiting ? waitlistScript({ apiUrl, siteUrl }) : ''}
</body>
</html>`;
};

/**
 * Counts the visit (Admin console → Warteliste → Landing Page): one POST with
 * where it came from, no cookie, nothing stored on the device; then, once
 * each, whether the page was read and whether someone typed an address. Source is
 * utm_source, else the platform in the referrer (e.g. the link in the Instagram
 * bio). Reloads, back/forward, clicks within our own pages, the links from
 * our own mails and browsers switched off with ?nichtzaehlen=1 don't count.
 * Also leaves the source in window.wyVisitSource for the sign-up.
 */
function visitScript({ apiUrl, siteUrl }) {
  return `<script>
(() => {
  const q = new URLSearchParams(location.search);
  const PLATFORMS = [
    ['instagram', /(^|\\.)instagram\\.com$/], ['tiktok', /(^|\\.)tiktok\\.com$/], ['facebook', /(^|\\.)(facebook\\.com|fb\\.com|fb\\.me)$/],
    ['youtube', /(^|\\.)(youtube\\.com|youtu\\.be)$/], ['x', /(^|\\.)(x\\.com|twitter\\.com|t\\.co)$/], ['linkedin', /(^|\\.)(linkedin\\.com|lnkd\\.in)$/],
    ['reddit', /(^|\\.)reddit\\.com$/], ['snapchat', /(^|\\.)snapchat\\.com$/], ['whatsapp', /(^|\\.)whatsapp\\.(com|net)$/],
    ['google', /(^|\\.)google\\.[a-z.]+$/], ['bing', /(^|\\.)bing\\.com$/], ['duckduckgo', /(^|\\.)duckduckgo\\.com$/], ['ecosia', /(^|\\.)ecosia\\.org$/],
  ];
  let host = '';
  try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch {}
  const own = host === location.hostname || host === new URL(${JSON.stringify(siteUrl)}).hostname;
  const platform = host && !own ? (PLATFORMS.find(([, re]) => re.test(host)) || ['web'])[0] : null;
  const source = q.get('utm_source') || platform;
  window.wyVisitSource = source;

  // The team's own devices: ?nichtzaehlen=1 switches counting off in this
  // browser (on request, so it is kept on the device), ?nichtzaehlen=0 on again
  let off = false;
  try {
    const choice = q.get('nichtzaehlen');
    if (choice === '1') localStorage.setItem('wy_nocount', '1');
    if (choice === '0') localStorage.removeItem('wy_nocount');
    off = localStorage.getItem('wy_nocount') === '1';
  } catch {}
  if (q.has('nichtzaehlen')) {
    q.delete('nichtzaehlen');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    const note = document.createElement('div');
    note.textContent = off ? 'Besuche von diesem Browser werden nicht mehr gezählt.' : 'Besuche von diesem Browser werden wieder gezählt.';
    note.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;padding:12px 18px;border-radius:14px;background:#1c1c2b;color:#f4f4fa;font:500 15px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    document.addEventListener('DOMContentLoaded', () => { document.body.appendChild(note); setTimeout(() => note.remove(), 4000); });
  }
  if (off) return;

  // Reloads, back/forward and clicks within our own pages are no new visit
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav && nav.type !== 'navigate') return;
  if (own) return;
  if (q.has('bestaetigen') || q.has('abmelden') || navigator.webdriver) return;
  const send = (path, extra) => fetch(${JSON.stringify(apiUrl)} + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...extra, source, campaign: q.get('utm_campaign'), ref: q.has('ref') }),
    keepalive: true,
  }).catch(() => {});
  send('/waitlist/visit', {});

  // The way to a sign-up, once each: read (15 s on screen or scrolled past
  // the first screen), then typed into an e-mail field. Only counters.
  let read = false;
  const onScroll = () => { if (scrollY > innerHeight * 0.6) markRead(); };
  const timer = setTimeout(() => { if (document.visibilityState === 'visible') markRead(); }, 15000);
  function markRead() {
    if (read) return;
    read = true;
    clearTimeout(timer);
    removeEventListener('scroll', onScroll);
    send('/waitlist/event', { step: 'engaged' });
  }
  addEventListener('scroll', onScroll, { passive: true });
  let typed = false;
  document.addEventListener('input', (e) => {
    if (typed || !e.target || e.target.type !== 'email') return;
    typed = true;
    send('/waitlist/event', { step: 'form' });
  });
})();
</script>`;
}

/**
 * Waitlist in the browser: sign-up, the confirmation link (?bestaetigen=),
 * the unsubscribe link (?abmelden=), and the share card with the personal
 * referral link. Remembers ?ref= and the own code for the next visit
 * (localStorage, only on this device); utm_* only count for this visit.
 */
function waitlistScript({ apiUrl, siteUrl }) {
  return `<dialog class="wl-dialog" id="wl-dialog"><div class="wl-card"><div id="wl-body"></div></div><button class="wl-close" type="button" aria-label="Schließen" onclick="this.closest('dialog').close()">×</button></dialog>
<script>
(() => {
  const API = ${JSON.stringify(apiUrl)};
  const SITE = ${JSON.stringify(siteUrl)};
  const q = new URLSearchParams(location.search);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: (k) => { try { localStorage.removeItem(k); } catch {} },
  };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // Where they came from, for the sign-up
  if (q.get('ref')) store.set('wy_ref', q.get('ref').slice(0, 16));
  // The campaign only for a sign-up on this visit: not stored on the device
  const utm = { source: q.get('utm_source')?.slice(0, 40) || null, campaign: q.get('utm_campaign')?.slice(0, 40) || null };
  store.del('wy_src');
  store.del('wy_camp');
  // Tokens don't belong in the address bar (or in a shared screenshot)
  const cleanUrl = () => history.replaceState(null, '', location.pathname + location.hash);

  const dialog = document.getElementById('wl-dialog');
  const show = (html) => {
    document.getElementById('wl-body').innerHTML = html;
    if (!dialog.open) dialog.showModal();
  };

  function shareCard(st, fresh) {
    const link = SITE + '/?ref=' + encodeURIComponent(st.code);
    const left = Math.max(0, st.goal - st.referrals);
    const text = 'Ich bin auf der Warteliste von Wanna yap?, der App, die zeigt, wann deine Leute Zeit zum Telefonieren haben. Komm mit: ' + link;
    const dots = Array.from({ length: st.goal }, (_, i) => '<i class="' + (i < st.referrals ? 'on' : '') + '"></i>').join('');
    return (fresh ? '<p class="eyebrow">Bestätigt</p><h2>Du bist dabei! 🎉</h2>' : '<p class="eyebrow">Deine Warteliste</p><h2>Schön, dass du da bist.</h2>') +
      '<p>Platz <b>#' + st.position + '</b> von ' + st.total + '. Am Launch-Tag bekommst du den Link per Mail.</p>' +
      '<div class="dots" aria-label="' + st.referrals + ' von ' + st.goal + ' Freunden">' + dots + '</div>' +
      '<p>' + (left ? 'Noch <b>' + left + '</b> ' + (left === 1 ? 'Freund' : 'Freunde') + ' über deinen Link, dann gehört dir <b>1 Monat Wanna yap+</b>.' : 'Geschafft: <b>1 Monat Wanna yap+</b> gehört dir zum Start.') + '</p>' +
      '<div class="linkbox"><input readonly value="' + esc(link) + '" aria-label="Dein Einladungslink"><button class="btn2" type="button" data-copy="' + esc(link) + '">Kopieren</button></div>' +
      '<div class="share-row"><a class="btn2" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">WhatsApp</a>' +
      (navigator.share ? '<button class="btn2" type="button" data-share>Teilen …</button>' : '') + '</div>' +
      '<p style="font-size:13px">Dein Code: <b style="font-family:var(--mono);color:var(--text)">' + esc(st.code) + '</b>. Du bekommst ihn zum Start auch per Mail und löst ihn in der App ein.</p>';
  }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-close]')) dialog.close();
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = 'Kopiert ✓'; } catch { copy.previousElementSibling.select(); }
    }
    if (e.target.closest('[data-share]')) {
      const link = dialog.querySelector('.linkbox input').value;
      navigator.share({ title: 'Wanna yap?', text: 'Komm mit auf die Warteliste von Wanna yap?', url: link }).catch(() => {});
    }
  });

  // Sign-up
  document.querySelectorAll('form[data-waitlist]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = form.querySelector('.wl-msg');
      const button = form.querySelector('button');
      const email = form.email.value.trim();
      msg.textContent = '';
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) {
        msg.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.';
        form.email.focus();
        return;
      }
      button.disabled = true;
      try {
        const res = await post('/waitlist', {
          email,
          website: form.website.value,
          ref: store.get('wy_ref'),
          source: utm.source || window.wyVisitSource,
          campaign: utm.campaign,
        });
        if (res.ok) {
          form.outerHTML = '<div class="wl-done"><h3>Fast geschafft! 📬</h3><p>Wir haben dir eine Mail an <b>' + esc(email) + '</b> geschickt. Bestätige deine Adresse, dann bist du auf der Liste. Keine Mail da? Schau im Spam-Ordner nach.</p></div>';
          return;
        }
        const data = await res.json().catch(() => ({}));
        msg.textContent = data.error === 'invalid_email' ? 'Bitte gib eine gültige E-Mail-Adresse ein.'
          : res.status === 429 ? 'Zu viele Versuche. Probier es in einer Stunde noch mal.'
          : 'Gerade klappt es nicht. Versuch es gleich noch einmal.';
      } catch {
        msg.textContent = 'Keine Verbindung. Versuch es gleich noch einmal.';
      } finally {
        button.disabled = false;
      }
    });
  });

  // Confirmation link from the mail
  const confirmToken = q.get('bestaetigen');
  const leaveToken = q.get('abmelden');
  if (confirmToken) {
    cleanUrl();
    post('/waitlist/confirm', { token: confirmToken })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const st = await res.json();
        store.set('wy_code', st.code);
        show(shareCard(st, true));
      })
      .catch(() => show('<h2>Der Link ist abgelaufen</h2><p>Bestätigungslinks gelten 7 Tage. Trag dich einfach noch einmal ein, dann schicken wir dir einen neuen.</p><a class="btn2" href="#warteliste" data-close>Zur Warteliste</a>'));
  } else if (leaveToken) {
    cleanUrl();
    post('/waitlist/unsubscribe', { token: leaveToken })
      .finally(() => {
        store.del('wy_code');
        show('<h2>Du bist abgemeldet</h2><p>Wir haben deine Adresse gelöscht und schreiben dir nicht mehr. Wenn du es dir anders überlegst, kannst du dich jederzeit wieder eintragen.</p>');
      });
  } else if (store.get('wy_code')) {
    // Coming back: the share card instead of the form
    fetch(API + '/waitlist/status/' + encodeURIComponent(store.get('wy_code')))
      .then(async (res) => {
        if (res.status === 404) { store.del('wy_code'); return; }
        if (!res.ok) return;
        const st = await res.json();
        document.querySelectorAll('form[data-waitlist]').forEach((form) => {
          form.outerHTML = '<div class="wl-done"><h3>Du bist dabei ✓</h3><p>Platz #' + st.position + ', ' + st.referrals + ' von ' + st.goal + ' Freunden sind über deinen Link gekommen.</p><p style="margin-top:12px"><button class="btn2" type="button" data-open-share>Freunde einladen</button></p></div>';
        });
        document.addEventListener('click', (e) => { if (e.target.closest('[data-open-share]')) show(shareCard(st, false)); });
      })
      .catch(() => {});
  }
})();
</script>`;
}
