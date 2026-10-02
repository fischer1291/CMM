import { finishSignIn, formatActiveMonth, verifyOutcome } from '../features/auth/signInFlow';
import { clearInviteCode } from '../services/invites';
import { apiFetch, apiPostJson } from '../utils/api';

jest.mock('../utils/api', () => ({ apiFetch: jest.fn(), apiPostJson: jest.fn() }));
jest.mock('../services/invites', () => ({ clearInviteCode: jest.fn() }));

const PHONE = '+4915111111111';
const fetchMock = jest.mocked(apiFetch);
const postMock = jest.mocked(apiPostJson);
const clearMock = jest.mocked(clearInviteCode);

beforeEach(() => {
  fetchMock.mockReset();
  postMock.mockReset();
  clearMock.mockReset();
});

test('a recycled number (accountCheck, checkToken, no token) leads to the question with all params', () => {
  const outcome = verifyOutcome(
    {
      success: true,
      phone: PHONE,
      accountCheck: { name: 'Lea', avatarUrl: 'https://x/a.jpg', lastActiveMonth: '2026-03' },
      checkToken: 'abc.123.def',
    },
    PHONE,
    true
  );
  expect(outcome).toEqual({
    kind: 'account_check',
    params: { phone: PHONE, checkToken: 'abc.123.def', name: 'Lea', avatarUrl: 'https://x/a.jpg', lastActiveMonth: '2026-03', ageConfirmed: '1' },
  });
  // route params are strings only; without the age box the consent stays empty
  const plain = verifyOutcome({ success: true, accountCheck: {}, checkToken: 't' }, PHONE, false);
  expect(plain).toEqual({
    kind: 'account_check',
    params: { phone: PHONE, checkToken: 't', name: '', avatarUrl: '', lastActiveMonth: '', ageConfirmed: '' },
  });
});

test('a token signs in, also when an accountCheck rides along; errors stay errors', () => {
  expect(verifyOutcome({ success: true, token: 'jwt', user: { name: 'Max' } }, PHONE, false)).toEqual({
    kind: 'signed_in',
    token: 'jwt',
    name: 'Max',
  });
  expect(verifyOutcome({ success: true, token: 'jwt', accountCheck: { name: 'Lea' }, checkToken: 't' }, PHONE, false).kind).toBe('signed_in');
  // a fresh account after "not_mine" has an empty name: profile setup follows
  expect(verifyOutcome({ success: true, token: 'jwt', user: { name: '' } }, PHONE, false)).toEqual({ kind: 'signed_in', token: 'jwt', name: '' });
  // backend without token auth
  expect(verifyOutcome({ success: true }, PHONE, false)).toEqual({ kind: 'signed_in', token: null, name: undefined });
  // accountCheck without checkToken cannot be answered: sign-in path, not a dead end
  expect(verifyOutcome({ success: true, token: 'jwt', accountCheck: {} }, PHONE, false).kind).toBe('signed_in');
  expect(verifyOutcome({ success: false, error: 'Falscher Code' }, PHONE, false)).toEqual({ kind: 'error', message: 'Falscher Code' });
  expect(verifyOutcome(null, PHONE, false)).toEqual({ kind: 'error', message: null });
});

test('formatActiveMonth: German month and year', () => {
  expect(formatActiveMonth('2026-03')).toBe('März 2026');
  expect(formatActiveMonth('2025-12')).toBe('Dezember 2025');
  expect(formatActiveMonth('2025-13')).toBeNull();
  expect(formatActiveMonth('März')).toBeNull();
  expect(formatActiveMonth(undefined)).toBeNull();
});

test('finishSignIn: the invite code goes only now; a name decides the profile setup', async () => {
  const signIn = jest.fn().mockResolvedValue(undefined);
  await finishSignIn(PHONE, { token: 'jwt', name: '' }, signIn, true);
  expect(clearMock).toHaveBeenCalledTimes(1);
  expect(postMock).not.toHaveBeenCalled();
  expect(signIn).toHaveBeenCalledWith(PHONE, 'jwt', { needsProfileSetup: true });

  await finishSignIn(PHONE, { token: 'jwt', name: 'Lea' }, signIn, false);
  expect(clearMock).toHaveBeenCalledTimes(1);
  expect(signIn).toHaveBeenLastCalledWith(PHONE, 'jwt', { needsProfileSetup: false });
});

test('finishSignIn without token auth registers and reads the name', async () => {
  const signIn = jest.fn().mockResolvedValue(undefined);
  postMock.mockResolvedValue({ ok: true } as Response);
  fetchMock.mockResolvedValue({ json: async () => ({ user: { name: 'Max' } }) } as Response);
  await finishSignIn(PHONE, { token: null, name: undefined }, signIn, false);
  expect(postMock).toHaveBeenCalledWith('/auth/register', { phone: PHONE }, 10000);
  expect(signIn).toHaveBeenCalledWith(PHONE, null, { needsProfileSetup: false });
});
