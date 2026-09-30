// Ad templates as fill-in forms, so the marketing agent (agent/daily.js) can
// write new ads without touching HTML: `story` (25–30 s, built from blocks,
// what the agent writes) and the three short launch ads (chat, moment, list).
// Every text is escaped; *stars* around a few words mark the gradient highlight.
//
// Timings follow the original ads: hook on screen within 1.5 s, app screen,
// then the shared end card (2.5 s).
const { screens, ICON } = require('./screens');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** Escaped text; the first *…* becomes the gradient highlight. */
const hl = (s) => esc(s).replace(/\*([^*]+)\*/, '<span class="grad-text">$1</span>').replace(/\*/g, '');
/** Long headlines get a smaller size so they stay inside the safe zone. */
const size = (text, big, small, limit) => (String(text).replace(/\*/g, '').length > limit ? small : big);
const ease = 'cubic-bezier(.2,.8,.2,1)';

const SCREENS = ['status', 'moment', 'circle', 'moments', 'stats', 'call'];

/**
 * Limits the agent must keep (agent/schema.js), measured on renders at the
 * limit: longer texts wrap into the bottom 20 %, which the TikTok/Reels UI covers.
 */
const LIMITS = {
  eyebrow: 24,
  hook: 60,
  payoff: 48,
  bubble: 26,
  bubbles: [3, 5],
  pushTitle: 24,
  pushSub: 30,
  pushes: [2, 3],
  line: 14,
  lines: [2, 4],
  punch: 20,
  // story (25–30 s): blocks in a row, see templates.story
  text: 60,
  name: 12,
  blocks: [3, 5],
  storyBubbles: [2, 5],
};

// A story lasts 25–30 s including its 2.5 s end card: shorter plans are
// held a little longer, longer ones play a little faster
const STORY_MIN = 22.6;
const STORY_MAX = 27.4;

/**
 * One-line texts (.fit) shrink until they fit their width. video.js calls
 * window.fitText() once the fonts are loaded, before the first frame.
 */
const FIT_SCRIPT = `<style>.fit { white-space: nowrap }</style>
<script>window.fitText = () => document.querySelectorAll('.fit').forEach((el) => {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth && size > 56) el.style.fontSize = (size -= 2) + 'px';
});</script>`;

function appScene(at, until, payoff, screen, big = 112) {
  return `<div class="scene" style="animation:fadeIn .5s ${at}s both, fadeOut .5s ${until}s both">
      <div class="safe" style="top:190px;text-align:left">
        <h1 style="font-size:${size(payoff, big, 96, 36)}px;animation:rise .7s ${at + 0.1}s ${ease} both">${hl(payoff)}</h1>
      </div>
      <div class="glowblob" style="width:760px;height:760px;left:160px;top:900px;animation:pulse 3s ${at}s infinite both"></div>
      <div style="position:absolute;left:50%;top:700px;animation:slideUp .9s ${at + 0.4}s ${ease} both">${screens[screen]({ pw: 600 })}</div>
    </div>`;
}

/**
 * The templates. Each takes the content and the shared end card and returns
 * { seconds, body, liftAt, endAt }: liftAt is where the app comes in (the
 * music lifts there), endAt where the end card starts.
 */
const templates = {
  /** A chat that never turns into a call, crossed out; then the app. */
  chat(c, endCard) {
    const n = c.bubbles.length;
    const strikeAt = 1.2 + (n - 1) * 0.75 + 0.7;
    const out = strikeAt + 0.7;
    const app = out + 0.4;
    const end = app + 4.5;
    return {
      seconds: Math.round((end + 2.5) * 10) / 10,
      liftAt: app,
      endAt: end,
      body: `
    <div class="scene" style="animation:fadeOut .6s ${out}s both">
      <div class="safe" style="top:190px">
        ${c.eyebrow ? `<p class="eyebrow" style="font-size:30px;animation:fadeIn .4s 0s both">${esc(c.eyebrow)}</p>` : ''}
        <h1 style="font-size:${size(c.hook, 96, 84, 48)}px;margin-top:24px;animation:rise .7s .1s ${ease} both">${hl(c.hook)}</h1>
      </div>
      <div class="safe" style="top:760px;display:flex;flex-direction:column;gap:26px">
        ${c.bubbles.map((b, i) => `<div class="bubble ${b.from === 'me' ? 'me' : 'them'}" style="animation:rise .5s ${1.2 + i * 0.75}s ${ease} both"><span class="struck" style="animation:strike .35s ${strikeAt + i * 0.08}s both">${esc(b.text)}</span></div>`).join('')}
      </div>
    </div>
    ${appScene(app, end - 0.4, c.payoff, c.screen)}
    ${endCard(end)}`,
    };
  },

  /** Countdown to the Yap Moment, friends joining as notifications. */
  moment(c, endCard) {
    return {
      seconds: 13,
      liftAt: 1.8,
      endAt: 10.5,
      body: `
    <div class="scene" style="animation:fadeOut .5s 10.1s both">
      <div class="safe" style="top:190px">
        ${c.eyebrow ? `<p class="eyebrow" style="font-size:30px;color:var(--pink);animation:fadeIn .4s 0s both">${esc(c.eyebrow)}</p>` : ''}
        <h1 style="font-size:${size(c.hook, 100, 86, 52)}px;margin-top:24px;animation:rise .7s .1s ${ease} both">${hl(c.hook)}</h1>
      </div>
      <div class="safe clock grad-text" style="top:760px;font-family:var(--mono);font-weight:700;font-size:210px;letter-spacing:-.04em;line-height:1;animation:fadeIn .4s 1.2s both, tick 9s 1.2s steps(9, end) both"></div>
      <div class="safe" style="top:1040px;display:flex;flex-direction:column;gap:24px">
        <div class="push" style="animation:drop .6s 1.8s ${ease} both"><div class="ic">${ICON.flash}</div><div><b>Yap Moment ist da</b><span>10 Minuten, alle haben Zeit</span></div><time>jetzt</time></div>
        ${c.pushes.map((p, i) => `<div class="push" style="animation:drop .6s ${3.4 + i * 1.3}s ${ease} both"><div class="ic" style="border-radius:50%;font-size:42px;font-weight:700">${esc(p.initial.slice(0, 1).toUpperCase())}</div><div><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div><time>jetzt</time></div>`).join('')}
      </div>
    </div>
    ${endCard(10.5)}`,
    };
  },

  /** Short lines crossed out one by one, a punchline, then the app. */
  list(c, endCard) {
    const n = c.lines.length;
    const punchAt = 0.1 + n * 0.7 + 0.3;
    const out = punchAt + 1.7;
    const app = out + 0.3;
    const end = app + 3.3;
    return {
      seconds: Math.round((end + 2.5) * 10) / 10,
      liftAt: app,
      endAt: end,
      body: `
    <div class="scene" style="animation:fadeOut .5s ${out}s both">
      <div class="safe" style="top:360px;display:flex;flex-direction:column;gap:30px">
        ${c.lines.map((t, i) => `<h1 class="fit" style="font-size:108px;animation:rise .45s ${0.1 + i * 0.7}s ${ease} both"><span class="struck" style="animation:strike .3s ${0.45 + i * 0.7}s both;color:var(--text-2)">${esc(t)}</span></h1>`).join('')}
        <h1 style="font-size:132px;margin-top:40px;animation:pop .7s ${punchAt}s both"><span class="grad-text">${esc(c.punch.replace(/\*/g, ''))}</span></h1>
      </div>
    </div>
    ${appScene(app, end - 0.4, c.payoff, c.screen, 104)}
    ${endCard(end)}
    ${FIT_SCRIPT}`,
    };
  },
};

/**
 * Only the app part (payoff over a real app screen), for the hero videos:
 * between the AI scenes, the turn of the episode (agent/cut.js).
 */
templates.app = (c) => ({ seconds: 3.6, liftAt: 0, endAt: 3.6, body: appScene(0, 99, c.payoff, c.screen) });

/**
 * The blocks of a story. Each gives its natural length at pace `k` (1 =
 * normal, below 1 faster) and its scene from `t` for `d` seconds. Times
 * inside a block are relative to its start and scale with `k`.
 */
const BLOCKS = {
  /** One big sentence: a hook, a turn ("Bis Mila das hier gemacht hat:"), a punchline. */
  text: {
    seconds: (b, k) => 3 * k,
    body: (b, t) => `<div class="safe" style="top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;padding-bottom:260px">
        ${b.eyebrow ? `<p class="eyebrow" style="font-size:30px;animation:fadeIn .4s ${t}s both">${esc(b.eyebrow)}</p>` : ''}
        <h1 style="font-size:${size(b.text, 112, 94, 36)}px;margin-top:24px;animation:rise .7s ${t + 0.1}s ${ease} both">${hl(b.text)}</h1>
      </div>`,
  },

  /** A conversation; with `strike` it never turns into a call and gets crossed out. */
  chat: {
    at: (b, k) => {
      const start = (b.hook ? 1.2 : 0.3) * k;
      const bubble = (i) => start + i * 0.85 * k;
      const strike = bubble(b.bubbles.length - 1) + 0.9 * k;
      return { bubble, strike };
    },
    seconds(b, k) {
      const { bubble, strike } = this.at(b, k);
      return b.strike ? strike + 0.35 + b.bubbles.length * 0.08 + 1 * k : bubble(b.bubbles.length - 1) + 1.6 * k;
    },
    body(b, t, d, k) {
      const { bubble, strike } = this.at(b, k);
      const text = (x, i) => (b.strike ? `<span class="struck" style="animation:strike .35s ${t + strike + i * 0.08}s both">${esc(x)}</span>` : esc(x));
      return `${b.hook ? `<div class="safe" style="top:190px"><h1 style="font-size:${size(b.hook, 96, 84, 48)}px;animation:rise .7s ${t + 0.1}s ${ease} both">${hl(b.hook)}</h1></div>` : ''}
      <div class="safe" style="top:${b.hook ? 640 : 420}px;display:flex;flex-direction:column;gap:22px">
        ${b.bubbles.map((x, i) => `<div class="bubble ${x.from === 'me' ? 'me' : 'them'}" style="animation:rise .5s ${t + bubble(i)}s ${ease} both">${x.from !== 'me' && x.name ? `<span class="who">${esc(x.name)}</span>` : ''}${text(x.text, i)}</div>`).join('')}
      </div>`;
    },
  },

  /** Short lines crossed out one by one, then a punchline. */
  list: {
    seconds: (b, k) => (0.4 + b.lines.length * 0.7) * k + 1.9 * k,
    body: (b, t, d, k) => {
      const punchAt = (0.4 + b.lines.length * 0.7) * k;
      return `<div class="safe" style="top:360px;display:flex;flex-direction:column;gap:30px">
        ${b.lines.map((x, i) => `<h1 class="fit" style="font-size:108px;animation:rise .45s ${t + (0.1 + i * 0.7) * k}s ${ease} both"><span class="struck" style="animation:strike .3s ${t + (0.45 + i * 0.7) * k}s both;color:var(--text-2)">${esc(x)}</span></h1>`).join('')}
        <h1 style="font-size:132px;margin-top:40px;animation:pop .7s ${t + punchAt}s both"><span class="grad-text">${esc(b.punch.replace(/\*/g, ''))}</span></h1>
      </div>`;
    },
  },

  /** Countdown to the Yap Moment, friends joining as notifications. */
  moment: {
    seconds: (b, k) => (3.4 + (b.pushes.length - 1) * 1.2 + 1.6) * k,
    body: (b, t, d, k) => `${b.hook ? `<div class="safe" style="top:190px"><h1 style="font-size:${size(b.hook, 100, 86, 52)}px;animation:rise .7s ${t + 0.1}s ${ease} both">${hl(b.hook)}</h1></div>` : ''}
      <div class="safe clock grad-text" style="top:600px;font-family:var(--mono);font-weight:700;font-size:210px;letter-spacing:-.04em;line-height:1;animation:fadeIn .4s ${t + 1.2 * k}s both, tick 9s ${t + 1.2 * k}s steps(9, end) both"></div>
      <div class="safe" style="top:860px;display:flex;flex-direction:column;gap:24px">
        <div class="push" style="animation:drop .6s ${t + 1.8 * k}s ${ease} both"><div class="ic">${ICON.flash}</div><div><b>Yap Moment ist da</b><span>10 Minuten, alle haben Zeit</span></div><time>jetzt</time></div>
        ${b.pushes.map((p, i) => `<div class="push" style="animation:drop .6s ${t + (3.4 + i * 1.2) * k}s ${ease} both"><div class="ic" style="border-radius:50%;font-size:42px;font-weight:700">${esc(p.initial.slice(0, 1).toUpperCase())}</div><div><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div><time>jetzt</time></div>`).join('')}
      </div>`,
  },

  /** The payoff over a real app screen. */
  app: {
    seconds: (b, k) => 4.5 * k,
    // appScene brings its own fades; the block wrapper handles them here
    body: (b, t) => appScene(t, 999, b.payoff, b.screen).replace(/^<div class="scene" style="[^"]*">/, '<div class="scene">'),
  },
};

/**
 * A 25–30 s story from 3–5 blocks, then the end card. The first block
 * carries the hook; the music lifts with the first app block. Every block
 * fades in and out on its own (outer and inner wrapper, so the two fades
 * never fight over the same element).
 */
templates.story = (c, endCard) => {
  const blocks = c.blocks.filter((b) => BLOCKS[b.type]);
  if (!blocks.some((b) => b.type === 'app')) blocks.push({ type: 'app', payoff: 'Sieh, wer *gerade Zeit* hat.', screen: 'status' });
  const natural = blocks.reduce((n, b) => n + BLOCKS[b.type].seconds(b, 1), 0);
  const k = natural > STORY_MAX ? STORY_MAX / natural : 1;
  const extra = natural < STORY_MIN ? (STORY_MIN - natural) / blocks.length : 0;
  let t = 0;
  let liftAt = null;
  const scenes = blocks.map((b, i) => {
    const d = BLOCKS[b.type].seconds(b, k) + extra;
    if (b.type === 'app' && liftAt === null) liftAt = t;
    const scene = `<div class="scene" style="${i ? `animation:fadeIn .4s ${t}s both` : ''}"><div class="scene" style="animation:fadeOut .4s ${t + d - 0.4}s both">
      ${BLOCKS[b.type].body(b, t, d, k)}
    </div></div>`;
    t += d;
    return scene;
  });
  const end = Math.round(t * 100) / 100;
  return {
    seconds: Math.round((end + 2.5) * 10) / 10,
    liftAt,
    endAt: end,
    body: `<style>.bubble .who { display: block; font-size: 30px; font-weight: 600; color: var(--text-2); margin-bottom: 6px }</style>
    ${scenes.join('\n')}
    ${endCard(end)}
    ${FIT_SCRIPT}`,
  };
};

module.exports = { templates, SCREENS, LIMITS, BLOCKS, esc, hl };
