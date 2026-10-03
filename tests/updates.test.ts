import type { AppStateStatus } from 'react-native';
import { CHECK_INTERVAL_MS, checkAndOffer, describeUpdate, isCheckDue, watchForUpdates } from '../services/updates';

jest.mock('expo-updates', () => ({
  isEnabled: false,
  isEmbeddedLaunch: true,
  updateId: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeClient(available = true, isNew = true) {
  return {
    checkForUpdateAsync: jest.fn(async () => ({ isAvailable: available })),
    fetchUpdateAsync: jest.fn(async () => ({ isNew })),
    reloadAsync: jest.fn(async () => {}),
  };
}

test('a check is due at the start and then at most every 30 minutes', () => {
  const t0 = 1_000_000;
  expect(isCheckDue(t0, null)).toBe(true);
  expect(isCheckDue(t0 + 5 * 60_000, t0)).toBe(false);
  expect(isCheckDue(t0 + CHECK_INTERVAL_MS - 1, t0)).toBe(false);
  expect(isCheckDue(t0 + CHECK_INTERVAL_MS, t0)).toBe(true);
});

test('the update id is "embedded" for the bundle that shipped with the build', () => {
  expect(describeUpdate({ isEmbeddedLaunch: true, updateId: 'abc' })).toBe('embedded');
  expect(describeUpdate({ isEmbeddedLaunch: false, updateId: null })).toBe('embedded');
  expect(describeUpdate({ isEmbeddedLaunch: false, updateId: 'abc' })).toBe('abc');
});

test('offers the restart only after a new update was downloaded; restart reloads', async () => {
  const client = fakeClient();
  const prompt = jest.fn();
  expect(await checkAndOffer(client, prompt)).toBe(true);
  expect(client.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  expect(prompt).toHaveBeenCalledTimes(1);
  prompt.mock.calls[0][0]();
  expect(client.reloadAsync).toHaveBeenCalledTimes(1);

  const nothing = fakeClient(false);
  expect(await checkAndOffer(nothing, prompt)).toBe(false);
  expect(nothing.fetchUpdateAsync).not.toHaveBeenCalled();
  expect(prompt).toHaveBeenCalledTimes(1);
});

test('errors stay silent', async () => {
  const client = fakeClient();
  client.checkForUpdateAsync.mockRejectedValue(new Error('offline'));
  const prompt = jest.fn();
  expect(await checkAndOffer(client, prompt)).toBe(false);
  expect(prompt).not.toHaveBeenCalled();
});

function watch(client: ReturnType<typeof fakeClient>, prompt: jest.Mock, state: { now: number; canPrompt?: () => boolean }) {
  let listener: ((s: AppStateStatus) => void) | null = null;
  const remove = jest.fn();
  const stop = watchForUpdates(client, prompt, {
    now: () => state.now,
    canPrompt: state.canPrompt,
    addListener: (cb) => {
      listener = cb;
      return { remove };
    },
  });
  return { fire: (s: AppStateStatus) => listener!(s), remove, stop };
}

test('foreground changes trigger a check, throttled to the interval; the launch is not checked here', async () => {
  const state = { now: 10_000_000 };
  const client = fakeClient(false);
  const { fire, remove, stop } = watch(client, jest.fn(), state);
  await flush();
  expect(client.checkForUpdateAsync).not.toHaveBeenCalled(); // the native launch check covers the start

  state.now += 10 * 60_000;
  fire('active');
  await flush();
  expect(client.checkForUpdateAsync).not.toHaveBeenCalled(); // too soon after launch

  state.now += CHECK_INTERVAL_MS;
  fire('background');
  await flush();
  expect(client.checkForUpdateAsync).not.toHaveBeenCalled(); // not a foreground change

  fire('active');
  await flush();
  expect(client.checkForUpdateAsync).toHaveBeenCalledTimes(1);

  state.now += 10 * 60_000;
  fire('active');
  await flush();
  expect(client.checkForUpdateAsync).toHaveBeenCalledTimes(1); // throttled

  stop();
  expect(remove).toHaveBeenCalled();
});

test('during a call the hint waits for the next foreground change without a call', async () => {
  let inCall = true;
  const state = { now: 10_000_000, canPrompt: () => !inCall };
  const client = fakeClient();
  const prompt = jest.fn();
  const { fire } = watch(client, prompt, state);

  state.now += CHECK_INTERVAL_MS;
  fire('active');
  await flush();
  expect(client.fetchUpdateAsync).toHaveBeenCalledTimes(1); // downloaded quietly
  expect(prompt).not.toHaveBeenCalled();

  fire('active');
  await flush();
  expect(prompt).not.toHaveBeenCalled(); // still in the call
  expect(client.checkForUpdateAsync).toHaveBeenCalledTimes(1); // no second check needed

  inCall = false;
  fire('active');
  await flush();
  expect(prompt).toHaveBeenCalledTimes(1);
  prompt.mock.calls[0][0]();
  expect(client.reloadAsync).toHaveBeenCalledTimes(1);

  fire('active');
  await flush();
  expect(prompt).toHaveBeenCalledTimes(1); // offered once
});
