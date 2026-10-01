import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearInviteCode,
  downloadLink,
  inviteCampaign,
  normalizeInviteCode,
  pendingInviteCode,
  platformFromUserAgent,
  rememberInviteCode,
} from '../services/invites';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

test('platform from the user agent: iPhone and iPad are ios, Android is android, the rest other', () => {
  expect(platformFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('ios');
  expect(platformFromUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)')).toBe('ios');
  expect(platformFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile')).toBe('android');
  expect(platformFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15')).toBe('other');
  expect(platformFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('other');
  expect(platformFromUserAgent('')).toBe('other');
  expect(platformFromUserAgent(undefined)).toBe('other');
});

test('invite codes: eight characters from the backend alphabet, upper-cased', () => {
  expect(normalizeInviteCode('abcd2345')).toBe('ABCD2345');
  expect(normalizeInviteCode(' ABCD2345 ')).toBe('ABCD2345');
  expect(normalizeInviteCode('ABCD234')).toBeNull();
  expect(normalizeInviteCode('ABCD23450')).toBeNull();
  // No 0, 1, I, O in the alphabet (lib/waitlist.js newCode)
  expect(normalizeInviteCode('ABCD0145')).toBeNull();
  expect(normalizeInviteCode('ABCDIO45')).toBeNull();
  expect(normalizeInviteCode(undefined)).toBeNull();
  expect(normalizeInviteCode(['ABCD2345'])).toBeNull();
  expect(inviteCampaign('ABCD2345')).toBe('invite-ABCD2345');
});

test('the store button carries the inviter campaign to /download, or none without a code', () => {
  expect(downloadLink('ABCD2345')).toBe('https://wannayap.app/download?ct=invite-ABCD2345');
  expect(downloadLink(null)).toBe('https://wannayap.app/download');
});

test('a code from an invite link waits on the device until the sign-up clears it', async () => {
  expect(await pendingInviteCode()).toBeNull();
  await rememberInviteCode('ABCD2345');
  expect(await pendingInviteCode()).toBe('ABCD2345');
  await clearInviteCode();
  expect(await pendingInviteCode()).toBeNull();
  // Something broken in storage is not a code
  await AsyncStorage.setItem('pendingInviteCode', 'nope');
  expect(await pendingInviteCode()).toBeNull();
});
