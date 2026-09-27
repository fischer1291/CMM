import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { noteTalk } from '../services/reviewPrompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => {}),
}));

const DAY = 24 * 3600 * 1000;

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  jest.mocked(StoreReview.requestReview).mockClear();
});
afterEach(() => jest.useRealTimers());

test('asks after the third real conversation, not after short calls', async () => {
  const now = Date.now();
  expect(await noteTalk(30, now)).toBe(false);
  expect(await noteTalk(200, now)).toBe(false);
  expect(await noteTalk(200, now)).toBe(false);
  expect(await noteTalk(200, now)).toBe(true);
  jest.runAllTimers();
  expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
});

test('asks again only after 120 days', async () => {
  const now = Date.now();
  for (let i = 0; i < 3; i++) await noteTalk(300, now);
  expect(await noteTalk(300, now + 30 * DAY)).toBe(false);
  expect(await noteTalk(300, now + 121 * DAY)).toBe(true);
});
