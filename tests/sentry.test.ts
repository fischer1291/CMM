import {
  type ScrubbableEvent,
  hasEmail,
  hasPhoneNumber,
  scrubBreadcrumb,
  scrubDeep,
  scrubEvent,
  scrubText,
  scrubUrl,
  stripQuery,
} from '../services/sentryScrub';
import { WRAP_OPTIONS, buildOptions, captureException, environmentOf, init, isActive, releaseOf, resetForTests, setUser, wrap } from '../services/sentry';
import { hashPhone } from '../utils/phone';
import * as Sentry from '@sentry/react-native';

const mockSentry = jest.mocked(Sentry) as unknown as {
  init: jest.Mock;
  setUser: jest.Mock;
  captureException: jest.Mock;
  wrap: jest.Mock;
};

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn((c: unknown, o: unknown) => ({ wrapped: c, options: o })),
}));
jest.mock('expo-application', () => ({ applicationId: 'com.schly21.kontaktlisteapp' }));
jest.mock('../services/appInfo', () => ({ appInfo: { version: '1.0.0', build: '42' } }));

const input = {
  dsn: 'https://abc@o1.ingest.de.sentry.io/1',
  dev: false,
  environment: 'production',
  bundleId: 'com.schly21.kontaktlisteapp',
  version: '1.0.0',
  build: '42',
};

beforeEach(() => {
  jest.clearAllMocks();
  resetForTests();
});

// ---- scrubbing (pure) ----

test('scrubText replaces phone numbers and e-mail addresses, keeps the rest', () => {
  expect(scrubText('Anruf an +4915111111111 fehlgeschlagen')).toBe('Anruf an [nummer] fehlgeschlagen');
  expect(scrubText('0151 1111 1111 und 0176-222 22222')).toBe('[nummer] und [nummer]');
  expect(scrubText('mail an test@example.com bitte')).toBe('mail an [email] bitte');
  // short numbers (status codes, counts, ids with 7 digits) stay
  expect(scrubText('HTTP 500 nach 1234567 ms, 3 Versuche')).toBe('HTTP 500 nach 1234567 ms, 3 Versuche');
  expect(hasPhoneNumber('+49 151 11111111')).toBe(true);
  expect(hasPhoneNumber('status 404')).toBe(false);
  expect(hasEmail('a@b.de')).toBe(true);
  expect(hasEmail('kein at')).toBe(false);
  // repeated calls (global regexes keep no state between them)
  expect(hasPhoneNumber('+4915111111111')).toBe(true);
  expect(hasPhoneNumber('+4915111111111')).toBe(true);
});

test('stripQuery drops the query string and the fragment', () => {
  expect(stripQuery('https://api.wannayap.app/friend?phone=%2B4915111111111')).toBe('https://api.wannayap.app/friend');
  expect(stripQuery('/calls#x')).toBe('/calls');
  expect(stripQuery('/calls')).toBe('/calls');
});

test('scrubEvent: texts scrubbed, request and extra gone, user only id, no device name', () => {
  const event = {
    message: 'Fehler bei +4915111111111',
    exception: { values: [{ type: 'Error', value: 'kontakt a@b.de nicht erreicht' }] },
    request: { url: 'https://api.wannayap.app/me?phone=1', headers: { Authorization: 'x' } },
    user: { id: 'hash', ip_address: '1.2.3.4', username: 'leroy' },
    contexts: { device: { name: 'Leroys iPhone', model: 'iPhone15,2' }, os: { name: 'iOS' } },
    extra: { phone: '+4915111111111' },
    breadcrumbs: [
      { category: 'console', message: 'login +4915111111111' },
      { category: 'fetch', data: { url: '/friend?phone=%2B49151', method: 'GET', status_code: 200, request_body: 'x' } },
    ],
    tags: { update: 'embedded' },
  };
  const out = scrubEvent(event);
  expect(out.message).toBe('Fehler bei [nummer]');
  expect(out.exception.values[0].value).toBe('kontakt [email] nicht erreicht');
  expect(out).not.toHaveProperty('request');
  expect(out).not.toHaveProperty('extra');
  expect(out.user).toEqual({ id: 'hash' });
  expect(out.contexts.device).toEqual({ model: 'iPhone15,2' });
  expect(out.contexts.os).toEqual({ name: 'iOS' });
  expect(out.breadcrumbs).toEqual([{ category: 'fetch', data: { url: '/friend', method: 'GET', status_code: 200 } }]);
  expect(out.tags).toEqual({ update: 'embedded' });
  // the input is not changed
  expect(event.request).toBeDefined();
  expect(event.breadcrumbs).toHaveLength(2);
});

test('scrubDeep: strings at any depth, Errors as text, cycles stop, input untouched', () => {
  const inner = { phone: '+4915111111111' };
  const value: Record<string, unknown> = { a: ['x', inner, 3, null], err: new Error('mail a@b.de'), b: { c: 'ok' } };
  value.self = value;
  expect(scrubDeep(value)).toEqual({
    a: ['x', { phone: '[nummer]' }, 3, null],
    err: 'Error: mail [email]',
    b: { c: 'ok' },
    self: '[cycle]',
  });
  expect(inner.phone).toBe('+4915111111111');
  expect(scrubDeep(7)).toBe(7);
  expect(scrubDeep(undefined)).toBeUndefined();
});

test('scrubEvent: contexts and tags are scrubbed in depth', () => {
  const out = scrubEvent({
    contexts: { device: { name: 'Max', model: 'iPhone' }, call: { peer: { phone: '+4915111111111' } } },
    tags: { mail: 'a@b.de', update: 'embedded' },
  } as ScrubbableEvent);
  expect(out.contexts).toEqual({ device: { model: 'iPhone' }, call: { peer: { phone: '[nummer]' } } });
  expect(out.tags).toEqual({ mail: '[email]', update: 'embedded' });
});

test('machine ids survive the phone pattern: UUIDs, hex trace ids, ISO dates (numbers still go)', () => {
  const callId = '3f2c9a1e-1234-4abc-9def-012345678901';
  expect(scrubText(`call ${callId} von +4915111111111`)).toBe(`call ${callId} von [nummer]`);
  expect(scrubText('CB2C1A1F-7A0B-4C55-8D2D-4E1E0D3B6F11')).toBe('CB2C1A1F-7A0B-4C55-8D2D-4E1E0D3B6F11');
  expect(scrubText('trace 4bf92f3577b34da6a3ce929d0e0e4736 span 00f067aa0ba902b7')).toBe(
    'trace 4bf92f3577b34da6a3ce929d0e0e4736 span 00f067aa0ba902b7',
  );
  expect(scrubText('2026-10-02T14:08:46Z')).toBe('2026-10-02T14:08:46Z');
  expect(scrubText('um 2026-10-02 14:08:46.123+02:00 an 0176 22222222')).toBe('um 2026-10-02 14:08:46.123+02:00 an [nummer]');
  expect(hasPhoneNumber(callId)).toBe(false);
  expect(hasPhoneNumber('2026-10-02')).toBe(false);
  // a number shaped like a date with digits after it, a 00 prefix with 17 digits, digits around an id
  expect(scrubText('0176-12-22 2222')).toBe('[nummer]');
  // (a 17-digit run is no hex id: it is cut as a number, at most two digits stay)
  expect(scrubText('00491511111111111')).toMatch(/^\[nummer\]\d{0,2}$/);
  expect(scrubText(`${callId}/+4915111111111`)).toBe(`${callId}/[nummer]`);
  // random UUIDs never lose a part (the old pattern hit about a quarter of them)
  for (let i = 0; i < 500; i++) {
    const hex = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
    expect(scrubText(uuid)).toBe(uuid);
  }
});

test('a console crumb with a call id is kept, one with a number still dropped', () => {
  const callId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const crumb = { category: 'console', message: '[CallKit] reportCall failed', data: { arguments: ['failed', { callId }] } };
  expect(scrubBreadcrumb(crumb)).toEqual(crumb);
  expect(scrubBreadcrumb({ ...crumb, data: { arguments: [{ callId, peer: '+4915111111111' }] } })).toBeNull();
});

test('scrubEvent: SDK contexts and tags pass untouched (update id stays filterable)', () => {
  const updateId = '0f4c3a2e-9d41-4f6b-8b0e-2d3c4b5a6f70';
  const out = scrubEvent({
    contexts: {
      ota_updates: { update_id: updateId, channel: 'production', created_at: '2026-10-02T14:08:46.000Z' },
      trace: { trace_id: '4bf92f3577b34da6a3ce929d0e0e4736', span_id: '00f067aa0ba902b7' },
      app: { app_start_time: '2026-10-02T14:08:46Z', app_build: '12345678901' },
      route: { params: { phone: '+4915111111111' } },
    },
    tags: { 'expo.updates.update_id': updateId, 'event.origin': 'ios', note: '+4915111111111' },
  } as ScrubbableEvent);
  expect(out.contexts!.ota_updates).toEqual({ update_id: updateId, channel: 'production', created_at: '2026-10-02T14:08:46.000Z' });
  expect(out.contexts!.trace).toEqual({ trace_id: '4bf92f3577b34da6a3ce929d0e0e4736', span_id: '00f067aa0ba902b7' });
  expect(out.contexts!.app).toEqual({ app_start_time: '2026-10-02T14:08:46Z', app_build: '12345678901' });
  expect(out.contexts!.route).toEqual({ params: { phone: '[nummer]' } });
  expect(out.tags).toEqual({ 'expo.updates.update_id': updateId, 'event.origin': 'ios', note: '[nummer]' });
});

test('scrubEvent: a user without id becomes empty', () => {
  expect(scrubEvent({ user: { email: 'a@b.de' } } as ScrubbableEvent).user).toEqual({});
  expect(scrubEvent({} as ScrubbableEvent).user).toBeUndefined();
});

test('scrubBreadcrumb: fetch keeps only url without query, method and status', () => {
  const crumb = scrubBreadcrumb({
    category: 'xhr',
    message: 'GET /me?phone=1',
    data: { url: 'https://api.wannayap.app/me?phone=%2B49151', method: 'GET', status_code: 401, response: 'x' },
  });
  expect(crumb).toEqual({ category: 'xhr', message: 'GET /me', data: { url: 'https://api.wannayap.app/me', method: 'GET', status_code: 401 } });
});

test('scrubBreadcrumb: a friend\'s number in the path is removed, encoded or not', () => {
  const host = 'https://api.wannayap.app';
  for (const [category, path] of [
    ['fetch', '/friends/'],
    ['xhr', '/stats/'],
    ['fetch', '/blocks/'],
  ] as const) {
    const crumb = scrubBreadcrumb({
      category,
      message: `GET ${host}${path}%2B491711234567`,
      data: { url: `${host}${path}%2B491711234567?x=1`, method: 'DELETE', status_code: 200 },
    });
    expect(crumb).toEqual({
      category,
      message: `GET ${host}${path}[nummer]`,
      data: { url: `${host}${path}[nummer]`, method: 'DELETE', status_code: 200 },
    });
  }
  expect(scrubBreadcrumb({ category: 'http', data: { url: `${host}/friends/+49 171 1234567` } })?.data).toEqual({ url: `${host}/friends/[nummer]` });
});

test('scrubUrl: ids in the path stay, encoding kept without a hit, broken escapes still scrubbed', () => {
  const callId = '3f2b8c1e-9a4d-4e7b-8c21-0d5e6f7a8b9c';
  const objectId = '65f1a2b3c4d5e6f7a8b9c0d1';
  expect(scrubUrl(`https://api.wannayap.app/calls/${callId}/moment?phone=1`)).toBe(`https://api.wannayap.app/calls/${callId}/moment`);
  expect(scrubUrl(`https://api.wannayap.app/kreis/${objectId}/rituals`)).toBe(`https://api.wannayap.app/kreis/${objectId}/rituals`);
  expect(scrubUrl('https://api.wannayap.app/me/stats/sharing')).toBe('https://api.wannayap.app/me/stats/sharing');
  expect(scrubUrl('https://api.wannayap.app/search/Anna%20M')).toBe('https://api.wannayap.app/search/Anna%20M');
  expect(scrubUrl('https://api.wannayap.app/invite/a%40b.de')).toBe('https://api.wannayap.app/invite/[email]');
  expect(scrubUrl('https://api.wannayap.app/friends/%E0%A4%2B491711234567')).not.toMatch(/491711234567/);
});

test('scrubEvent: logentry template, formatted text and params are scrubbed', () => {
  const out = scrubEvent({
    logentry: { message: 'call to %s failed', formatted: 'call to +491711234567 failed', params: ['+491711234567', { mail: 'a@b.de' }, 3] },
  } as ScrubbableEvent);
  expect(out.logentry).toEqual({
    message: 'call to %s failed',
    formatted: 'call to [nummer] failed',
    params: ['[nummer]', { mail: '[email]' }, 3],
  });
});

test('scrubBreadcrumb: console lines with a number or address are dropped, others scrubbed', () => {
  expect(scrubBreadcrumb({ category: 'console', message: 'token for +4915111111111' })).toBeNull();
  // the real shape of Sentry's console integration: data.arguments is the
  // array of logged values, the message shows objects only as [object Object]
  expect(
    scrubBreadcrumb({
      category: 'console',
      message: 'CallKit failed: [object Object]',
      data: { arguments: ['CallKit failed:', { callId: 'abc', callerPhone: '+4915111111111', callerName: 'Max' }], logger: 'console' },
    })
  ).toBeNull();
  expect(
    scrubBreadcrumb({
      category: 'console',
      message: 'profile [object Object]',
      data: { arguments: ['profile', { nested: { list: [{ mail: 'a@b.de' }] } }], logger: 'console' },
    })
  ).toBeNull();
  expect(scrubBreadcrumb({ category: 'console', message: 'x', data: { arguments: [new Error('call +4915111111111 lost')], logger: 'console' } })).toBeNull();
  expect(scrubBreadcrumb({ category: 'console', message: 'socket connected' })).toEqual({ category: 'console', message: 'socket connected' });
  // arguments without a number stay, as a copy
  const args = { arguments: ['joined', { channel: 'c1', count: 2 }], logger: 'console' };
  expect(scrubBreadcrumb({ category: 'console', message: 'joined [object Object]', data: args })).toEqual({
    category: 'console',
    message: 'joined [object Object]',
    data: { arguments: ['joined', { channel: 'c1', count: 2 }], logger: 'console' },
  });
  // other categories: nested strings are scrubbed, not dropped
  expect(scrubBreadcrumb({ category: 'custom', data: { list: [{ phone: '+4915111111111' }], n: 1 } })).toEqual({
    category: 'custom',
    data: { list: [{ phone: '[nummer]' }], n: 1 },
  });
  expect(scrubBreadcrumb({ category: 'navigation', message: 'to /friend', data: { to: '/friend?phone=+4915111111111' } })).toEqual({
    category: 'navigation',
    message: 'to /friend',
    data: { to: '/friend?phone=[nummer]' },
  });
});

test('scrubBreadcrumb: touch crumbs keep component names only, never the label', () => {
  const crumb = scrubBreadcrumb({
    category: 'touch',
    type: 'user',
    message: 'Touch event within element: Moment mit Max',
    data: {
      path: [
        { name: 'Pressable', label: 'Moment mit Max', element: 'MomentCard', file: 'app/memories.tsx' },
        { name: 'MemoriesScreen' },
        'garbage',
      ],
    },
  });
  expect(crumb).toEqual({
    category: 'touch',
    type: 'user',
    message: 'Touch event within element: Pressable',
    data: { path: [{ name: 'Pressable', element: 'MomentCard', file: 'app/memories.tsx' }, { name: 'MemoriesScreen' }] },
  });
  expect(JSON.stringify(crumb)).not.toContain('Max');
  // rage taps and a crumb without a path
  expect(scrubBreadcrumb({ category: 'ui.multiClick', message: 'Rage tap on Max', data: { path: [{ label: 'Max' }] } })).toEqual({
    category: 'ui.multiClick',
    message: 'Touch event within element: unknown',
    data: { path: [{}] },
  });
  expect(scrubBreadcrumb({ category: 'touch', message: 'Touch event within element: Anna' })).toEqual({
    category: 'touch',
    message: 'Touch event within element: unknown',
    data: { path: [] },
  });
  // through the event as well (breadcrumbs are synced to the native scope too)
  const event = scrubEvent({ breadcrumbs: [{ category: 'touch', message: 'x: Anna', data: { path: [{ name: 'Button', label: 'Anna' }] } }] } as ScrubbableEvent);
  expect(JSON.stringify(event)).not.toContain('Anna');
});

// ---- init and user ----

test('init does nothing without a DSN or in development', () => {
  expect(init({ ...input, dsn: undefined })).toBe(false);
  expect(init({ ...input, dsn: '' })).toBe(false);
  expect(init({ ...input, dev: true })).toBe(false);
  expect(mockSentry.init).not.toHaveBeenCalled();
  expect(isActive()).toBe(false);
  // inactive: user and errors stay on the device, wrap returns the component
  setUser('+4915111111111');
  captureException(new Error('x'), true);
  const Root = () => null;
  expect(wrap(Root)).toBe(Root);
  expect(mockSentry.setUser).not.toHaveBeenCalled();
  expect(mockSentry.captureException).not.toHaveBeenCalled();
  expect(mockSentry.wrap).not.toHaveBeenCalled();
});

test('init with a DSN: no PII, no tracing, sessions on, release = bundleId@version+build', () => {
  expect(init(input)).toBe(true);
  expect(isActive()).toBe(true);
  expect(mockSentry.init).toHaveBeenCalledTimes(1);
  const options = mockSentry.init.mock.calls[0][0];
  expect(options).toMatchObject({
    dsn: input.dsn,
    enabled: true,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: false,
    enableAppHangTracking: false,
    // native NSURLSession crumbs carry queries past beforeSend; JS crumbs stay
    enableNetworkBreadcrumbs: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    attachScreenshot: false,
    release: 'com.schly21.kontaktlisteapp@1.0.0+42',
    dist: '42',
    environment: 'production',
  });
  expect(options.beforeSend({ message: '+4915111111111', request: {} })).toEqual({ message: '[nummer]' });
  expect(options.beforeBreadcrumb({ category: 'console', message: '+4915111111111' })).toBeNull();
  // a second init in the same process is a no-op in Sentry; ours is idempotent too
  const Root = () => null;
  // the touch boundary never reads the text of tapped elements (names)
  expect(WRAP_OPTIONS).toEqual({ touchEventBoundaryProps: { extractTextFromChildren: false } });
  expect(wrap(Root)).toEqual({ wrapped: Root, options: WRAP_OPTIONS });
});

test('the environment is preview only when the build says so', () => {
  expect(environmentOf('preview')).toBe('preview');
  expect(environmentOf('production')).toBe('production');
  expect(environmentOf(undefined)).toBe('production');
  expect(environmentOf('staging')).toBe('production');
  expect(buildOptions({ ...input, environment: 'preview' }).environment).toBe('preview');
  expect(releaseOf({ bundleId: null, version: '1.0.0', build: '7' })).toEqual({ release: 'app@1.0.0+7', dist: '7' });
});

test('the user is the SHA-256 of the E.164 number, cleared on sign-out', () => {
  init(input);
  setUser('+4915111111111');
  expect(mockSentry.setUser).toHaveBeenLastCalledWith({ id: hashPhone('+4915111111111') });
  expect(mockSentry.setUser.mock.calls[0][0].id).toBe('e2af3fa814fc74f16584396fc90134f4bbd0c4af995d8fe2506fe23b0716fffa');
  // a national number is normalised first so the hash matches the server's
  setUser('0151 11111111');
  expect(mockSentry.setUser).toHaveBeenLastCalledWith({ id: hashPhone('+4915111111111') });
  setUser(null);
  expect(mockSentry.setUser).toHaveBeenLastCalledWith(null);
});

test('captureException keeps the fatal level', () => {
  init(input);
  const err = new Error('boom');
  captureException(err);
  expect(mockSentry.captureException).toHaveBeenLastCalledWith(err, { level: 'error' });
  captureException(err, true);
  expect(mockSentry.captureException).toHaveBeenLastCalledWith(err, { level: 'fatal' });
});
