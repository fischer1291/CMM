import { session } from '../services/session';
import { signOutEverywhere } from '../services/devices';
import { apiFetch, apiPostJson } from '../utils/api';
import { fetchWithTimeout } from '../utils/apiUtils';

jest.mock('../utils/apiUtils', () => ({ DEFAULT_TIMEOUT: 10000, fetchWithTimeout: jest.fn() }));
jest.mock('../services/appInfo', () => ({ appHeaders: { 'X-App-Version': '1.0.1', 'X-Device-Id': 'DEVICE-1' } }));
jest.mock('../services/deviceId', () => ({ deviceIdReady: () => Promise.resolve() }));
jest.mock('../services/PushTokenService', () => ({ __esModule: true, default: { getToken: () => 'ExponentPushToken[own]' } }));
jest.mock('../services/VoipPushService', () => ({ __esModule: true, default: { getToken: () => 'voip-own' } }));

const fetchMock = jest.mocked(fetchWithTimeout);
const signedOut = jest.fn();
const respond = (status: number, body: unknown = {}) => ({ status, ok: status < 400, json: async () => body }) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  signedOut.mockReset();
  session.setToken('old');
  session.onUnauthorized(signedOut);
});

test('a 401 for the current token signs out, one for a replaced token does not', async () => {
  fetchMock.mockResolvedValue(respond(401));
  await apiFetch('/me');
  expect(signedOut).toHaveBeenCalledTimes(1);

  // a request sent with "old" comes back after the swap to "new"
  let answer!: (r: Response) => void;
  fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));
  const pending = apiFetch('/me');
  await Promise.resolve();
  session.setToken('new');
  answer(respond(401));
  await pending;
  expect(signedOut).toHaveBeenCalledTimes(1);
});

test('requests carry the device headers and the token', async () => {
  fetchMock.mockResolvedValue(respond(200));
  await apiFetch('/me/devices');
  const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
  expect(headers['X-Device-Id']).toBe('DEVICE-1');
  expect(headers.Authorization).toBe('Bearer old');
});

test('sign out everywhere: own tokens go along, the new token replaces the old without signing out', async () => {
  const replaceToken = jest.fn(async (token: string) => session.setToken(token));
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).endsWith('/me/logout-all')) {
      // meanwhile another request with the old token is refused
      await apiFetch('/plan');
      return respond(200, { success: true, token: 'fresh' });
    }
    return respond(401);
  });
  await signOutEverywhere(replaceToken);

  const [, init] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/me/logout-all'))!;
  expect(JSON.parse(String(init?.body))).toEqual({ pushToken: 'ExponentPushToken[own]', voipToken: 'voip-own' });
  expect(replaceToken).toHaveBeenCalledWith('fresh');
  expect(session.getToken()).toBe('fresh');
  expect(signedOut).not.toHaveBeenCalled();

  // afterwards a 401 for the new token signs out as before
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respond(401));
  await apiPostJson('/me/state', {});
  expect(signedOut).toHaveBeenCalledTimes(1);
});

test('sign out everywhere: errors in German, the token stays', async () => {
  const replaceToken = jest.fn();
  fetchMock.mockResolvedValue(respond(500, { success: false, error: 'Abmelden hat nicht geklappt. Bitte versuch es noch einmal.' }));
  await expect(signOutEverywhere(replaceToken)).rejects.toThrow('Abmelden hat nicht geklappt');
  fetchMock.mockRejectedValue(new Error('Request timeout - please check your internet connection'));
  await expect(signOutEverywhere(replaceToken)).rejects.toThrow('Keine Verbindung');
  expect(replaceToken).not.toHaveBeenCalled();
  expect(session.getToken()).toBe('old');
});
