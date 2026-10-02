import { safeExternalUrl, safeRoute } from '../services/notifications';

test('push deep links: only known app routes', () => {
  expect(safeRoute('/')).toBe('/');
  expect(safeRoute('/callmoments')).toBe('/callmoments');
  expect(safeRoute('/friend?phone=%2B4915111111111')).toBe('/friend?phone=%2B4915111111111');
  expect(safeRoute('/stats')).toBe('/stats');
  expect(safeRoute('/circle?id=0123456789abcdef01234567')).toBe('/circle?id=0123456789abcdef01234567');
  expect(safeRoute('/circle?id=../../x')).toBeNull();
  expect(safeRoute('https://evil.example.com')).toBeNull();
  expect(safeRoute('/videocall?channel=x')).toBeNull();
  expect(safeRoute('/friend?phone=1&x=<script>')).toBeNull();
  expect(safeRoute(undefined)).toBeNull();
  expect(safeRoute(42)).toBeNull();
});

test('lifecycle pushes: every data.url of the backend contract opens', () => {
  // CMM-backend-new/lib/notify.js CATALOG, the lifecycle types of plan 2.3
  const urls = [
    '/contacts', // invite_reminder
    `/friend?phone=${encodeURIComponent('+4915111111111')}`, // first_call_hint
    '/', // yap_moment_invite, week_open, friends_were_available, come_back, come_back_30
    '/plus', // referral_pair_reward
    '/plus?from=plus_expiring',
    '/plus?from=billing_issue',
    '/plus?from=plus_winback_3',
    '/plus?from=plus_winback_30',
    '/plus?from=cancel', // cancel_survey
  ];
  for (const url of urls) expect(safeRoute(url)).toBe(url);
  expect(safeRoute('/plus?from=x&y=1')).toBeNull();
  expect(safeRoute('/plus?from=<b>')).toBeNull();
  expect(safeRoute('/plus?from=')).toBeNull();
  expect(safeRoute('/contacts/../videocall')).toBeNull();
});

test('external links: only https on apps.apple.com', () => {
  expect(safeExternalUrl('https://apps.apple.com/account/billing')).toBe('https://apps.apple.com/account/billing');
  expect(safeExternalUrl('https://apps.apple.com/account/subscriptions')).toBe('https://apps.apple.com/account/subscriptions');
  expect(safeExternalUrl('http://apps.apple.com/account/billing')).toBeNull();
  expect(safeExternalUrl('https://apps.apple.com.evil.example/x')).toBeNull();
  expect(safeExternalUrl('https://apps.apple.com@evil.example/x')).toBeNull();
  expect(safeExternalUrl('https://evil.example/?u=https://apps.apple.com')).toBeNull();
  expect(safeExternalUrl('/plus')).toBeNull();
  expect(safeExternalUrl(undefined)).toBeNull();
});
