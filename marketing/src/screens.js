// Phone screens for the landing page and marketing assets. They mirror the real
// app screens (status, Yap Moment, circles, moments, stats, call) with
// example people. Swap in real App Store screenshots where Apple requires them.

const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
  flash: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 9V7A5 5 0 0 0 7 7v2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM9 7a3 3 0 0 1 6 0v2H9V7z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.6"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.6"/><path d="M2 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z"/><circle cx="17" cy="9" r="2.8" opacity=".6"/><path d="M17 13.3c2.9.2 5 2.3 5 5.7h-4.4c0-2.3-.2-4-.6-5.7z" opacity=".6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.3 7.3 0 0 0-1.7 1l-2.5-1-2 3.5L6.5 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"/></svg>',
  end: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.2.3-4.6.7v3.1c0 .4-.2.7-.6.9-1 .5-1.9 1.1-2.7 1.8-.2.2-.4.3-.7.3s-.5-.1-.7-.3L.3 13.1a1 1 0 0 1 0-1.4C3.3 8.9 7.5 7 12 7s8.7 1.9 11.7 4.7a1 1 0 0 1 0 1.4l-2.5 2.5c-.2.2-.4.3-.7.3s-.5-.1-.7-.3c-.8-.7-1.7-1.3-2.7-1.8a1 1 0 0 1-.6-.9V9.7C15.2 9.3 13.6 9 12 9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

const AV = {
  M: 'linear-gradient(135deg,#00E5FF,#8B5CFF)',
  J: 'linear-gradient(135deg,#FFB547,#FF2E93)',
  H: 'linear-gradient(135deg,#3DF5A7,#00E5FF)',
  D: 'linear-gradient(135deg,#8B5CFF,#FF2E93)',
  S: 'linear-gradient(135deg,#FF2E93,#FFB547)',
  L: 'linear-gradient(135deg,#00E5FF,#3DF5A7)',
  P: 'linear-gradient(135deg,#A6A6BF,#6C6C88)',
};
const avatar = (letter, state = 'on') => `<div class="avatar ${state}" style="background:${AV[letter] || AV.P}">${letter}</div>`;

const statusBar = () => `
  <div class="island"></div>
  <div class="sb"><span>9:41</span><span class="sb-icons">
    <i style="width:calc(17*var(--u));height:calc(11*var(--u));clip-path:polygon(0 70%,20% 70%,20% 100%,0 100%,0 70%,27% 50%,47% 50%,47% 100%,27% 100%,27% 50%,54% 28%,74% 28%,74% 100%,54% 100%,54% 28%,81% 0,100% 0,100% 100%,81% 100%);border-radius:0"></i>
    <i style="width:calc(25*var(--u));height:calc(12*var(--u));border-radius:calc(3.5*var(--u));opacity:.9"></i>
  </span></div>`;

const tabbar = (active) => `
  <div class="tabbar">${['home', 'people', 'spark', 'gear'].map((k) => `<span class="${k === active ? 'active' : ''}">${ICON[k]}</span>`).join('')}</div>
  <div class="home-ind"></div>`;

const frame = (inner, { pw = 320, extraClass = '', style = '' } = {}) =>
  `<div class="phone ${extraClass}" style="--pw:${pw}px;${style}"><div class="screen">${inner}</div></div>`;

const person = (letter, name, sub, { on = true, btn = true } = {}) => `
  <div class="row">${avatar(letter, on ? 'on' : 'off')}
    <div class="grow"><div class="name">${name}</div><div class="cap">${on ? '<span class="dot"></span>&nbsp; ' : ''}${sub}</div></div>
    ${btn && on ? `<div class="call-btn">${ICON.phone}</div>` : ''}
  </div>`;

const screens = {
  /** Status tab: the neon ring and who's free right now. */
  status: (o) => frame(`${statusBar()}
    <div class="content">
      <div class="row" style="justify-content:space-between"><div><div class="label">Hey Lea</div><div class="h1">Dein Status</div></div><div class="pill"><span class="dot"></span> 3 haben Zeit</div></div>
      <div class="ring-wrap"><div class="ring"><div><div class="power">${ICON.power}</div><div class="big">Erreichbar</div><div class="small">noch 28 min</div></div></div></div>
      <div class="cap" style="text-align:center">Deine Leute sehen, dass du gerade Zeit für einen Anruf hast.</div>
      <div class="glass" style="display:flex;flex-direction:column;gap:calc(12*var(--u))">
        <div class="label" style="color:var(--cyan)">Jetzt erreichbar</div>
        ${person('M', 'Mila', 'hat Zeit · 30 min')}
        ${person('H', 'Oma Helga', 'hat Zeit bis 19 Uhr')}
      </div>
    </div>${tabbar('home')}`, o),

  /** The daily Yap Moment card on the status tab. */
  moment: (o) => frame(`${statusBar()}
    <div class="content">
      <div><div class="label">Donnerstag</div><div class="h1">Dein Status</div></div>
      <div class="moment"><div>
        <div class="row" style="justify-content:space-between"><div class="label" style="color:var(--pink)">⚡ Yap Moment</div><div class="timer">09:42</div></div>
        <div class="h2">Deine Leute haben jetzt 10 Minuten.</div>
        <div class="cap">Alle bekommen den Moment gleichzeitig. Wer dabei ist, ist erreichbar, bis er endet.</div>
        <div class="row" style="gap:calc(-8*var(--u))">${['J', 'M', 'D', 'S'].map((l, i) => `<div style="margin-left:${i ? 'calc(-10*var(--u))' : 0}">${avatar(l)}</div>`).join('')}<div class="cap" style="margin-left:calc(12*var(--u))">4 sind dabei</div></div>
        <div class="btn">${ICON.flash} Dabei sein</div>
      </div></div>
      <div class="glass" style="display:flex;flex-direction:column;gap:calc(12*var(--u))">
        <div class="label" style="color:var(--cyan)">Ihr habt gerade beide Zeit ✨</div>
        ${person('J', 'Jonas', 'seit 4 Wochen nicht gesprochen')}
      </div>
    </div>${tabbar('home')}`, o),

  /** A circle with its weekly ritual. */
  circle: (o) => frame(`${statusBar()}
    <div class="content">
      <div><div class="label">Kreis</div><div class="h1">Familie 🏡</div></div>
      <div class="glass" style="display:flex;flex-direction:column;gap:calc(8*var(--u))">
        <div class="label" style="color:var(--pink)">Ritual</div>
        <div class="h2">Jeden Sonntag, 18 Uhr</div>
        <div class="cap">Dann öffnet sich eure Runde, und alle bekommen Bescheid.</div>
        <div class="row" style="gap:calc(6*var(--u));flex-wrap:wrap"><span class="pill" style="color:var(--success)">✓ Mama</span><span class="pill" style="color:var(--success)">✓ Papa</span><span class="pill" style="color:var(--success)">✓ Oma</span><span class="pill">Deniz</span></div>
      </div>
      <div class="glass" style="display:flex;flex-direction:column;gap:calc(12*var(--u))">
        ${person('H', 'Oma Helga', 'Hat gerade Zeit', { btn: false })}
        ${person('D', 'Deniz', 'Hat gerade Zeit', { btn: false })}
        ${person('P', 'Papa', 'Gerade nicht erreichbar', { on: false })}
      </div>
      <div class="btn">${ICON.video} Runde starten</div>
    </div>${tabbar('people')}`, o),

  /** Moments feed, locked until you've had a real talk today. */
  moments: (o) => frame(`${statusBar()}
    <div class="content">
      <div><div class="label">Heute · 24 h</div><div class="h1">Moments</div></div>
      <div class="shot">
        <div style="position:absolute;inset:0;background:radial-gradient(40% 35% at 30% 40%,#FFB547,transparent),radial-gradient(40% 35% at 70% 60%,#FF2E93,transparent),radial-gradient(50% 40% at 50% 90%,#00E5FF,transparent)"></div>
        <div class="blur"></div>
        <div class="lock">${ICON.lock}<div class="h2">Talk first.</div><div class="cap" style="color:var(--text)">Deine Leute haben heute Momente geteilt. Führ zuerst selbst ein echtes Gespräch, dann siehst du sie.</div>
          <div class="btn" style="padding:0 calc(22*var(--u));margin-top:calc(6*var(--u))">${ICON.phone} Wer hat gerade Zeit?</div></div>
      </div>
    </div>${tabbar('spark')}`, o),

  /** Private talk-time stats and badges. */
  stats: (o) => frame(`${statusBar()}
    <div class="content">
      <div><div class="label">Nur für dich</div><div class="h1">Deine Gesprächszeit</div></div>
      <div class="glass" style="display:flex;flex-direction:column;gap:calc(10*var(--u))">
        <div class="row" style="justify-content:space-between;align-items:flex-end">
          <div><div style="font-size:calc(40*var(--u));font-weight:700;letter-spacing:-0.03em;line-height:1">3 h 20</div><div class="cap">diese Woche mit deinen Menschen</div></div>
          <div style="text-align:right"><div style="font-size:calc(26*var(--u));font-weight:700" class="grad-text">6 🔥</div><div class="cap">Wochen in Folge</div></div>
        </div>
        <div class="bars">${[30, 45, 25, 60, 50, 72, 64, 92].map((h, i) => `<i class="${i === 7 ? 'now' : ''}" style="height:${h}%"></i>`).join('')}</div>
      </div>
      <div class="label">Abzeichen · 7/24</div>
      <div class="row" style="justify-content:space-between"><div class="badge lit">☎️</div><div class="badge lit">🌙</div><div class="badge lit">🏡</div><div class="badge locked">❓</div></div>
      <div class="cap">🔒 Deine Statistik ist privat. Niemand sonst sieht sie.</div>
    </div>${tabbar('home')}`, o),

  /** An ongoing video call with the ✨ moment button. */
  call: (o) => frame(`<div class="call-bg"></div>${statusBar()}
    <div class="pip">L</div>
    <div class="call-face" style="background:${AV.M};box-shadow:0 0 calc(60*var(--u)) rgba(0,229,255,0.5)">M</div>
    <div style="position:absolute;left:0;right:0;top:62%;text-align:center"><div class="h2">Mila</div><div class="cap" style="font-family:var(--mono)">12:48</div></div>
    <div class="call-ctrl"><span>${ICON.mic}</span><span class="spark">${ICON.spark}</span><span class="end">${ICON.end}</span></div>
    <div class="home-ind"></div>`, o),
};

module.exports = { screens, ICON };
