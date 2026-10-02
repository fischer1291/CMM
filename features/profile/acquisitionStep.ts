/**
 * The optional second step of profile setup (plan 2.10): "Woher kennst du
 * Wanna yap?" and how many of the five closest friends have Android. Kept
 * free of React so the choice rules are testable on their own
 * (tests/acquisitionStep.test.ts).
 */
import type { Acquisition, AcquisitionAnswer, AcquisitionSource } from '../../services/acquisitionApi';

/** The answers in the order the backend lists them (lib/acquisition.js SOURCES) */
export const SOURCE_OPTIONS: { value: AcquisitionSource; label: string }[] = [
  { value: 'friend', label: 'Freund·in' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'press', label: 'Presse' },
  { value: 'other', label: 'Sonstiges' },
];

/** "Weiß ich nicht" is a choice of its own; it is sent as null */
export const ANDROID_UNKNOWN = 'unknown';
export type AndroidChoice = number | typeof ANDROID_UNKNOWN;

export const ANDROID_OPTIONS: { value: AndroidChoice; label: string }[] = [
  ...[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
  { value: ANDROID_UNKNOWN, label: 'Weiß ich nicht' },
];

export type AcquisitionChoice = { source: AcquisitionSource | null; android: AndroidChoice | null };

/** What the step needs from the own profile (GET /me) */
type ProfileFacts = { acquisition?: Acquisition | null; joinedViaInvite?: boolean } | null | undefined;

/**
 * Shown only when the server says there is no answer yet (acquisition: null).
 * A profile that is not loaded, or an older server without the field
 * (undefined), skips the step rather than asking into the void.
 */
export function acquisitionStepVisible(profile: ProfileFacts): boolean {
  return !!profile && profile.acquisition === null;
}

/** Someone who came through an invite link most likely heard of us from a friend */
export function initialAcquisitionChoice(profile: ProfileFacts): AcquisitionChoice {
  return { source: profile?.joinedViaInvite ? 'friend' : null, android: null };
}

/**
 * The body of POST /me/acquisition, or null while no source is chosen (then
 * "Weiter" waits). "Weiß ich nicht" and no Android choice both send null.
 */
export function acquisitionAnswer(choice: AcquisitionChoice): AcquisitionAnswer | null {
  if (!choice.source) return null;
  const androidFriends = typeof choice.android === 'number' ? choice.android : null;
  return { source: choice.source, androidFriends };
}
