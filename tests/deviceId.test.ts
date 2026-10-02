import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { appHeaders } from '../services/appInfo';
import {
  cleanDeviceId,
  cleanDeviceModel,
  currentDeviceId,
  deviceIdReady,
  initDeviceId,
  MAX_DEVICE_ID_LENGTH,
  resetDeviceIdForTests,
} from '../services/deviceId';

jest.mock('expo-application', () => ({ getIosIdForVendorAsync: jest.fn() }));
jest.mock('expo-device', () => ({ modelName: 'iPhone 15 Pro' }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), AFTER_FIRST_UNLOCK: 0 }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: '18.0' } }));
jest.mock('expo-updates', () => ({}));

const vendorId = jest.mocked(Application.getIosIdForVendorAsync);
const getItem = jest.mocked(SecureStore.getItemAsync);
const setItem = jest.mocked(SecureStore.setItemAsync);

beforeEach(() => {
  resetDeviceIdForTests();
  vendorId.mockReset();
  getItem.mockReset();
  setItem.mockReset();
});

test('cleanDeviceId keeps what the backend accepts: [A-Za-z0-9-], at most 64', () => {
  expect(cleanDeviceId('6F1A2B3C-0000-4000-8000-ABCDEFABCDEF')).toBe('6F1A2B3C-0000-4000-8000-ABCDEFABCDEF');
  expect(cleanDeviceId('  ab_c.d/e f-1  ')).toBe('abcdef-1');
  expect(cleanDeviceId('x'.repeat(100))).toHaveLength(MAX_DEVICE_ID_LENGTH);
  expect(cleanDeviceId('äöü !!')).toBeNull();
  expect(cleanDeviceId('')).toBeNull();
  expect(cleanDeviceId(null)).toBeNull();
  expect(cleanDeviceId(42)).toBeNull();
});

test('cleanDeviceModel: printable ASCII, no angle brackets, at most 40', () => {
  expect(cleanDeviceModel('iPhone 15 Pro')).toBe('iPhone 15 Pro');
  expect(cleanDeviceModel('  iPhone\n15\tPro  ')).toBe('iPhone 15 Pro');
  expect(cleanDeviceModel('<script>iPad</script>')).toBe('scriptiPad/script');
  expect(cleanDeviceModel('Pixel ✨ 9')).toBe('Pixel 9');
  expect(cleanDeviceModel('M'.repeat(60))).toHaveLength(40);
  expect(cleanDeviceModel('✨')).toBeNull();
  expect(cleanDeviceModel(null)).toBeNull();
});

test('init: the identifierForVendor and the model land in the headers, once', async () => {
  vendorId.mockResolvedValue('6F1A2B3C-0000-4000-8000-ABCDEFABCDEF');
  await initDeviceId();
  expect(appHeaders['X-Device-Id']).toBe('6F1A2B3C-0000-4000-8000-ABCDEFABCDEF');
  expect(appHeaders['X-Device-Model']).toBe('iPhone 15 Pro');
  expect(currentDeviceId()).toBe('6F1A2B3C-0000-4000-8000-ABCDEFABCDEF');
  expect(getItem).not.toHaveBeenCalled();
  // a second call reuses the first
  await initDeviceId();
  await deviceIdReady();
  expect(vendorId).toHaveBeenCalledTimes(1);
});

test('init without identifierForVendor: a UUID made once and kept in the keychain', async () => {
  vendorId.mockResolvedValue(null);
  getItem.mockResolvedValue(null);
  await initDeviceId();
  const made = appHeaders['X-Device-Id'];
  expect(made).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(setItem).toHaveBeenCalledWith('deviceId', made, expect.anything());

  // the next launch reads it back instead of making a new one
  resetDeviceIdForTests();
  vendorId.mockRejectedValue(new Error('unavailable'));
  getItem.mockResolvedValue(made);
  await initDeviceId();
  expect(appHeaders['X-Device-Id']).toBe(made);
  expect(setItem).toHaveBeenCalledTimes(1);
});

test('init without any id sends no X-Device-Id (the backend treats that as no device)', async () => {
  vendorId.mockResolvedValue(null);
  getItem.mockRejectedValue(new Error('keychain locked'));
  await initDeviceId();
  expect(appHeaders['X-Device-Id']).toBeUndefined();
  expect(currentDeviceId()).toBeNull();
});

test('deviceIdReady resolves at once when nothing started', async () => {
  await expect(deviceIdReady()).resolves.toBeUndefined();
});
