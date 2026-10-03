import {
  acquisitionAnswer,
  acquisitionStepVisible,
  ANDROID_OPTIONS,
  ANDROID_UNKNOWN,
  initialAcquisitionChoice,
  SOURCE_OPTIONS,
} from '../features/profile/acquisitionStep';

const answered = { source: 'tiktok' as const, androidFriends: 1, campaign: null, code: null, at: '2026-10-02T10:00:00.000Z' };

test('the step shows only while the server has no answer', () => {
  expect(acquisitionStepVisible({ acquisition: null, joinedViaInvite: false })).toBe(true);
  expect(acquisitionStepVisible({ acquisition: answered, joinedViaInvite: false })).toBe(false);
  // older server without the field, or the profile is not loaded yet: no question
  expect(acquisitionStepVisible({ joinedViaInvite: false })).toBe(false);
  expect(acquisitionStepVisible(null)).toBe(false);
  expect(acquisitionStepVisible(undefined)).toBe(false);
});

test('an invite preselects "Freund·in", otherwise nothing is chosen', () => {
  expect(initialAcquisitionChoice({ acquisition: null, joinedViaInvite: true })).toEqual({ source: 'friend', android: null });
  expect(initialAcquisitionChoice({ acquisition: null, joinedViaInvite: false })).toEqual({ source: null, android: null });
  expect(initialAcquisitionChoice(null)).toEqual({ source: null, android: null });
});

test('"Weiß ich nicht" and no choice send null, a number is sent as is', () => {
  expect(acquisitionAnswer({ source: 'friend', android: ANDROID_UNKNOWN })).toEqual({ source: 'friend', androidFriends: null });
  expect(acquisitionAnswer({ source: 'flyer', android: null })).toEqual({ source: 'flyer', androidFriends: null });
  expect(acquisitionAnswer({ source: 'press', android: 0 })).toEqual({ source: 'press', androidFriends: 0 });
  expect(acquisitionAnswer({ source: 'other', android: 5 })).toEqual({ source: 'other', androidFriends: 5 });
});

test('without a source there is nothing to send ("Weiter" waits)', () => {
  expect(acquisitionAnswer({ source: null, android: 3 })).toBeNull();
});

test('the options match the backend contract (lib/acquisition.js SOURCES, 0–5)', () => {
  expect(SOURCE_OPTIONS.map((o) => o.value)).toEqual(['friend', 'tiktok', 'instagram', 'flyer', 'press', 'other']);
  expect(SOURCE_OPTIONS.map((o) => o.label)).toEqual(['Freund·in', 'TikTok', 'Instagram', 'Flyer', 'Presse', 'Sonstiges']);
  expect(ANDROID_OPTIONS.map((o) => o.value)).toEqual([0, 1, 2, 3, 4, 5, ANDROID_UNKNOWN]);
  expect(ANDROID_OPTIONS[ANDROID_OPTIONS.length - 1].label).toBe('Weiß ich nicht');
});
