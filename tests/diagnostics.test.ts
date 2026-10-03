import { reportError, reportHeaders } from '../services/diagnostics';
import { session } from '../services/session';
import { fetchWithTimeout } from '../utils/apiUtils';

jest.mock('../utils/apiUtils', () => ({ fetchWithTimeout: jest.fn(() => Promise.resolve({ ok: true })) }));
jest.mock('../services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('../services/appInfo', () => ({
  appHeaders: { 'X-App-Version': '1.0.1', 'X-App-Build': '30', 'X-App-Update': 'embedded' },
  appInfo: { version: '1.0.1', build: '30', update: 'embedded', platform: 'ios' },
}));

const mockFetch = jest.mocked(fetchWithTimeout);

afterEach(() => {
  session.setToken(null);
  mockFetch.mockClear();
});

test('report headers carry the token only when signed in', () => {
  expect(reportHeaders(null)).not.toHaveProperty('Authorization');
  expect(reportHeaders('abc')).toMatchObject({ Authorization: 'Bearer abc', 'X-App-Version': '1.0.1', 'Content-Type': 'application/json' });
});

test('a signed-in report sends the token, so the backend keeps fatal', () => {
  session.setToken('tok-1');
  reportError(new TypeError('signed in'), true);
  const [, init] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
  expect(init.headers.Authorization).toBe('Bearer tok-1');
  expect(JSON.parse(init.body)).toMatchObject({ fatal: true, update: 'embedded', version: '1.0.1 (30)' });
});

test('before sign-in the report goes without a token', () => {
  reportError(new TypeError('signed out'));
  const [, init] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }];
  expect(init.headers).not.toHaveProperty('Authorization');
});
