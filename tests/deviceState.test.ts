import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import { DEVICE_STATE_INTERVAL_MS, deviceStateDue, forgetDeviceState, permissionValue, reportDeviceState } from '../services/deviceState';
import { session } from '../services/session';
import { apiPostJson } from '../utils/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('expo-contacts', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('../utils/api', () => ({ apiPostJson: jest.fn() }));

const post = jest.mocked(apiPostJson);
const notifications = jest.mocked(Notifications.getPermissionsAsync);
const contacts = jest.mocked(Contacts.getPermissionsAsync);
const HOUR = 3600 * 1000;
const state = (notifications: string, contactsPermission: string) => ({ notifications, contactsPermission }) as any;

function allow(notif: string, cont: string) {
  notifications.mockResolvedValue({ status: notif } as any);
  contacts.mockResolvedValue({ status: cont } as any);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  post.mockReset();
  post.mockResolvedValue({ ok: true } as Response);
  allow('granted', 'denied');
  session.setToken('token');
});

test('permissionValue: granted and denied as is, everything else undetermined', () => {
  expect(permissionValue('granted')).toBe('granted');
  expect(permissionValue('denied')).toBe('denied');
  expect(permissionValue('undetermined')).toBe('undetermined');
  expect(permissionValue('limited')).toBe('undetermined');
  expect(permissionValue(undefined)).toBe('undetermined');
});

test('due: first time, on a change, or after two hours', () => {
  const now = 1_000_000_000_000;
  const last = { ...state('granted', 'denied'), at: now };
  expect(deviceStateDue(null, state('granted', 'denied'), now)).toBe(true);
  expect(deviceStateDue(last, state('granted', 'denied'), now + HOUR)).toBe(false);
  expect(deviceStateDue(last, state('granted', 'granted'), now + HOUR)).toBe(true);
  expect(deviceStateDue(last, state('denied', 'denied'), now + 1)).toBe(true);
  expect(deviceStateDue(last, state('granted', 'denied'), now + DEVICE_STATE_INTERVAL_MS - 1)).toBe(false);
  expect(deviceStateDue(last, state('granted', 'denied'), now + DEVICE_STATE_INTERVAL_MS)).toBe(true);
});

test('report: sends the real permissions once, again after two hours or a change', async () => {
  const now = 1_000_000_000_000;
  expect(await reportDeviceState('+4915111111111', now)).toBe(true);
  expect(post).toHaveBeenCalledWith('/me/state', { notifications: 'granted', contactsPermission: 'denied' }, 10000);

  // a foreground an hour later: nothing new, nothing sent
  expect(await reportDeviceState('+4915111111111', now + HOUR)).toBe(false);
  expect(post).toHaveBeenCalledTimes(1);

  // the user allowed contacts meanwhile: sent at once
  allow('granted', 'granted');
  expect(await reportDeviceState('+4915111111111', now + HOUR)).toBe(true);
  expect(post).toHaveBeenLastCalledWith('/me/state', { notifications: 'granted', contactsPermission: 'granted' }, 10000);

  // two hours after the last send
  expect(await reportDeviceState('+4915111111111', now + 3 * HOUR)).toBe(true);
  expect(post).toHaveBeenCalledTimes(3);
});

test('report: concurrent calls share one request', async () => {
  const now = 1_000_000_000_000;
  const [a, b] = await Promise.all([reportDeviceState('+4915111111111', now), reportDeviceState('+4915111111111', now)]);
  expect(a).toBe(true);
  expect(b).toBe(true);
  expect(post).toHaveBeenCalledTimes(1);
});

test('report: failures stay silent and are retried on the next call', async () => {
  const now = 1_000_000_000_000;
  post.mockRejectedValueOnce(new Error('offline'));
  expect(await reportDeviceState('+4915111111111', now)).toBe(false);
  post.mockResolvedValueOnce({ ok: false } as Response);
  expect(await reportDeviceState('+4915111111111', now)).toBe(false);
  expect(await reportDeviceState('+4915111111111', now)).toBe(true);
  expect(post).toHaveBeenCalledTimes(3);

  // a permission API that throws counts as undetermined, still no throw
  notifications.mockRejectedValueOnce(new Error('nope'));
  expect(await reportDeviceState('+4915122222222', now)).toBe(true);
  expect(post).toHaveBeenLastCalledWith('/me/state', { notifications: 'undetermined', contactsPermission: 'denied' }, 10000);
});

test('forget: sign-out drops the stamp, the next login reports at once; other keys stay', async () => {
  const now = 1_000_000_000_000;
  await AsyncStorage.setItem('userPhoneKeychainMigrated', '1');
  expect(await reportDeviceState('+4915111111111', now)).toBe(true);
  expect(await reportDeviceState('+4915111111111', now + HOUR)).toBe(false);

  await forgetDeviceState();
  expect(await AsyncStorage.getItem('deviceState:+4915111111111')).toBeNull();
  expect(await AsyncStorage.getItem('userPhoneKeychainMigrated')).toBe('1');
  expect(await reportDeviceState('+4915111111111', now + HOUR)).toBe(true);
  expect(post).toHaveBeenCalledTimes(2);
});

test('report: without a session token nothing is sent (legacy sessions would only get 401s)', async () => {
  session.setToken(null);
  expect(await reportDeviceState('+4915111111111', 1_000_000_000_000)).toBe(false);
  expect(post).not.toHaveBeenCalled();
});

test('report: different phones do not share a request', async () => {
  const now = 1_000_000_000_000;
  const [a, b] = await Promise.all([reportDeviceState('+4915111111111', now), reportDeviceState('+4915122222222', now)]);
  expect(a && b).toBe(true);
  expect(post).toHaveBeenCalledTimes(2);
});

test('report: a request still running at sign-out does not write its stamp back', async () => {
  const now = 1_000_000_000_000;
  let answer: (r: Response) => void = () => {};
  post.mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));
  const running = reportDeviceState('+4915111111111', now);
  // let the request start before signing out
  for (let i = 0; i < 10 && post.mock.calls.length === 0; i++) await Promise.resolve();
  expect(post).toHaveBeenCalledTimes(1);

  await forgetDeviceState();
  answer({ ok: true } as Response);
  expect(await running).toBe(true);
  expect(await AsyncStorage.getItem('deviceState:+4915111111111')).toBeNull();

  // a new account on the same number reports at once
  expect(await reportDeviceState('+4915111111111', now + HOUR)).toBe(true);
  expect(post).toHaveBeenCalledTimes(2);
});
