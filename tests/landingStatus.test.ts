// The status line on wannayap.app (plan 2.15): an active banner from
// GET /app-config shows at the top, as text only, and nothing else happens
// without one or when the request fails.
import landing, { bannerLine, statusScript } from '../marketing/src/landing';
import { forgetsDismissal } from '../components/NoticeBanner';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = Date.parse('2026-10-03T12:00:00Z');
const OUTAGE = 'Anrufe sind gerade gestört. Wir arbeiten dran.';

describe('bannerLine', () => {
  test('an active banner gives its text and level', () => {
    expect(bannerLine({ success: true, banner: { text: OUTAGE, level: 'warning', until: null } }, NOW)).toEqual({ text: OUTAGE, level: 'warning' });
    expect(bannerLine({ banner: { text: ' Wartung heute ab 22 Uhr ', level: 'info', until: '2026-10-03T22:00:00Z' } }, NOW)).toEqual({ text: 'Wartung heute ab 22 Uhr', level: 'info' });
  });

  test('no banner, no text or an end in the past: nothing', () => {
    expect(bannerLine({ success: true, banner: null }, NOW)).toBeNull();
    expect(bannerLine(null, NOW)).toBeNull();
    expect(bannerLine('oops', NOW)).toBeNull();
    expect(bannerLine({ banner: { text: '   ', level: 'warning' } }, NOW)).toBeNull();
    expect(bannerLine({ banner: { text: 42, level: 'warning' } }, NOW)).toBeNull();
    expect(bannerLine({ banner: { text: OUTAGE, level: 'warning', until: '2026-10-03T11:59:00Z' } }, NOW)).toBeNull();
  });

  test('an unknown level falls back to info', () => {
    expect(bannerLine({ banner: { text: OUTAGE, level: 'error' } }, NOW)?.level).toBe('info');
  });
});

/** Runs the page's status script against a fake element and fetch. */
async function runStatus(respond: () => Promise<unknown>) {
  const box: Record<string, unknown> & { attrs: Record<string, string> } = { hidden: true, attrs: {} };
  let innerHtmlWrites = 0;
  Object.defineProperty(box, 'innerHTML', { set: () => { innerHtmlWrites++; }, get: () => '' });
  (box as any).setAttribute = (k: string, v: string) => { box.attrs[k] = v; };
  const calls: { url: string; init: any }[] = [];
  const fetchFake = (url: string, init: unknown) => {
    calls.push({ url, init });
    return respond();
  };
  const document = { getElementById: (id: string) => (id === 'wy-status' ? box : null) };
  const html = statusScript({ apiUrl: 'https://api.example.test' });
  const code = html.replace(/^<script>/, '').replace(/<\/script>$/, '');
  new Function('document', 'fetch', code)(document, fetchFake);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  return { box, calls, innerHtmlWrites };
}

const ok = (body: unknown) => () => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

describe('status script', () => {
  test('escapes the text: it only ever goes in as textContent', async () => {
    const evil = '<img src=x onerror="alert(1)"><b>Störung</b>';
    const { box, calls, innerHtmlWrites } = await runStatus(ok({ success: true, banner: { text: evil, level: 'warning', until: null } }));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.example.test/app-config');
    // No cookie along
    expect(calls[0].init).toMatchObject({ credentials: 'omit' });
    expect(box.textContent).toBe(evil);
    expect(innerHtmlWrites).toBe(0);
    expect(box.attrs['data-level']).toBe('warning');
    expect(box.hidden).toBe(false);
    expect(statusScript({ apiUrl: 'x' })).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
  });

  test('without a banner the line stays hidden', async () => {
    const { box } = await runStatus(ok({ success: true, banner: null }));
    expect(box.hidden).toBe(true);
    expect(box.textContent).toBeUndefined();
  });

  test('a failed request stays silent', async () => {
    const down = await runStatus(() => Promise.reject(new Error('offline')));
    expect(down.box.hidden).toBe(true);
    const err = await runStatus(() => Promise.resolve({ ok: false, json: () => Promise.reject(new Error('no json')) }));
    expect(err.box.hidden).toBe(true);
  });
});

test('the landing carries the hidden line and the script in both modes', () => {
  for (const mode of ['live', 'waitlist']) {
    const page: string = landing({ logoSvg: '<svg></svg>', siteUrl: 'https://wannayap.app', legalUrl: 'https://wannayap.app', downloadUrl: '/download', ogImage: 'og.png', mode });
    expect(page).toContain('<div class="status" id="wy-status" role="status" hidden></div>');
    expect(page).toContain("'/app-config'");
    expect(page).toContain('.status[data-level="warning"] { color: var(--warning)');
    expect(page).toContain('--warning: #FFB547;');
  }
});

// The app side of the same banner (components/NoticeBanner): shown and
// hidden live through AppConfigContext (socket event appConfig); a line
// closed during one outage comes back at the next with the same text.
const PUSH = 'Mitteilungen kommen gerade verzögert an. Wir arbeiten dran.';

describe('NoticeBanner forgetsDismissal', () => {
  test('a loaded config without the closed banner forgets it', () => {
    expect(forgetsDismissal(OUTAGE, null, true)).toBe(true);
    expect(forgetsDismissal(OUTAGE, undefined, true)).toBe(true);
    expect(forgetsDismissal(OUTAGE, '', true)).toBe(true);
    expect(forgetsDismissal(OUTAGE, PUSH, true)).toBe(true);
  });

  test('the closed banner still active, or nothing closed: keep', () => {
    expect(forgetsDismissal(OUTAGE, OUTAGE, true)).toBe(false);
    expect(forgetsDismissal(null, null, true)).toBe(false);
    expect(forgetsDismissal(undefined, null, true)).toBe(false);
    expect(forgetsDismissal(null, OUTAGE, true)).toBe(false);
  });

  test('before a real config arrived (empty start value, offline): keep', () => {
    expect(forgetsDismissal(OUTAGE, null, false)).toBe(false);
    expect(forgetsDismissal(OUTAGE, PUSH, false)).toBe(false);
  });

  test('cold start: closed, app killed, outage ended, next outage shows again', () => {
    // The steps the component runs through, with the stored dismissal as state
    let stored: string | null = OUTAGE; // closed during the outage, then the app was killed
    const step = (current: string | null, loaded: boolean) => {
      if (forgetsDismissal(stored, current, loaded)) stored = null;
      return !!current && stored !== current; // visible?
    };
    expect(step(null, false)).toBe(false); // launch: empty start value, nothing loaded yet
    expect(step(null, true)).toBe(false); // first /app-config: no banner, dismissal is dropped
    expect(stored).toBeNull();
    expect(step(OUTAGE, true)).toBe(true); // next outage with the same text: shown again
  });

  test('live: closed during the outage stays closed until it ends', () => {
    let stored: string | null = null;
    const step = (current: string | null) => {
      if (forgetsDismissal(stored, current, true)) stored = null;
      return !!current && stored !== current;
    };
    expect(step(OUTAGE)).toBe(true);
    stored = OUTAGE; // the user taps close
    expect(step(OUTAGE)).toBe(false); // a reload during the same outage keeps it hidden
    expect(step(null)).toBe(false); // the alert is quiet: banner off over the socket
    expect(step(OUTAGE)).toBe(true);
  });
});
