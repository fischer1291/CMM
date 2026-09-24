import { clock, nextNudgeLabel, nextSlotLabel, talkTime } from '../services/gamificationApi';
import { bannerRecentlyShown, markBannerShown } from '../services/bannerLog';
import { formatLastSeen } from '../utils/time';

test('talkTime: minutes, hours, hours and minutes', () => {
  expect(talkTime(0)).toBe('0 Min.');
  expect(talkTime(5 * 60 + 20)).toBe('5 Min.');
  expect(talkTime(3600)).toBe('1 Std.');
  expect(talkTime(3720)).toBe('1 Std. 2 Min.');
});

test('clock: minutes since midnight to HH:MM', () => {
  expect(clock(0)).toBe('00:00');
  expect(clock(18 * 60 + 5)).toBe('18:05');
  expect(clock(24 * 60 - 15)).toBe('23:45');
});

test('nextSlotLabel: today, tomorrow, weekday', () => {
  const today = new Date().getDay();
  expect(nextSlotLabel(null)).toBeNull();
  expect(nextSlotLabel({ day: today, start: 18 * 60, end: 20 * 60, inMinutes: 30 })).toBe('Heute 18:00');
  expect(nextSlotLabel({ day: (today + 1) % 7, start: 9 * 60, end: 10 * 60, inMinutes: 900 })).toBe('Morgen 09:00');
  const inThree = (today + 3) % 7;
  const label = nextSlotLabel({ day: inThree, start: 12 * 60, end: 13 * 60, inMinutes: 3 * 24 * 60 });
  expect(label).toMatch(/^(Sonntag|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag) 12:00$/);
});

test('bannerLog: only hides a push the live banner showed in the last 30 s', () => {
  jest.useFakeTimers();
  expect(bannerRecentlyShown('contact_available', '+491')).toBe(false);
  markBannerShown('contact_available', '+491');
  expect(bannerRecentlyShown('contact_available', '+491')).toBe(true);
  expect(bannerRecentlyShown('nudge', '+491')).toBe(false);
  expect(bannerRecentlyShown('contact_available', '+492')).toBe(false);
  expect(bannerRecentlyShown('contact_available', undefined)).toBe(false);
  jest.setSystemTime(Date.now() + 31 * 1000);
  expect(bannerRecentlyShown('contact_available', '+491')).toBe(false);
  jest.useRealTimers();
});

test('formatLastSeen: nothing for unknown, relative text otherwise', () => {
  expect(formatLastSeen(null)).toBeNull();
  const now = new Date('2026-09-24T12:00:00Z');
  expect(typeof formatLastSeen('2026-09-24T11:00:00Z', now)).toBe('string');
});

test('nextNudgeLabel: minutes, today, tomorrow, weekday', () => {
  const now = new Date(2026, 8, 24, 10, 0); // Thursday 10:00
  const at = (days: number, h: number, m = 0) => new Date(2026, 8, 24 + days, h, m).toISOString();
  expect(nextNudgeLabel(new Date(now.getTime() + 20 * 60000).toISOString(), now)).toBe('in 20 Min.');
  expect(nextNudgeLabel(at(0, 14, 30), now)).toBe('ab 14:30');
  expect(nextNudgeLabel(at(1, 9, 5), now)).toBe('morgen ab 9:05');
  expect(nextNudgeLabel(at(4, 10), now)).toBe('ab Montag');
});
