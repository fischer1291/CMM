/**
 * The personal invite link (content/links.ts inviteUrl): /einladung reports
 * its visit (backend POST /invites/visit, a counter per day, code and
 * platform), Android visitors join the waitlist (POST /waitlist with
 * platform), and a link that opened the app keeps its code on the device
 * until the sign-up sends it with POST /verify/check as inviteCode.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOWNLOAD_URL } from '../content/links';
import { apiPostJson } from '../utils/api';

const PENDING_KEY = 'pendingInviteCode';
// A tapped link attributes a sign-up for this long; afterwards the code is
// stale (same horizon as the backend's invite hashes) and is dropped.
const PENDING_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Same alphabet as the backend's codes (lib/waitlist.js newCode), 8 characters
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export type VisitPlatform = 'ios' | 'android' | 'other';

/** The code as the backend knows it (upper case), or null when it can't be one. */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/** Which app store the visitor's device would need, from the browser's user agent. */
export function platformFromUserAgent(userAgent: string | null | undefined): VisitPlatform {
  const ua = userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** The campaign that /download passes on to the App Store as ct. */
export const inviteCampaign = (code: string) => `invite-${code}`;

/** Where the store button on /einladung goes: /download passes the inviter's campaign on as ct. */
export function downloadLink(code: string | null): string | null {
  if (!DOWNLOAD_URL) return null;
  return code ? `${DOWNLOAD_URL}?ct=${inviteCampaign(code)}` : DOWNLOAD_URL;
}

/** /einladung was opened; nothing about the visitor, only the code and the platform. */
export async function reportInviteVisit(code: string, platform: VisitPlatform): Promise<void> {
  await apiPostJson('/invites/visit', { code, platform }, 8000);
}

const WAITLIST_ERRORS: Record<string, string> = {
  invalid_email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  undeliverable: 'An diese Adresse lässt sich keine Mail zustellen. Vielleicht ein Tippfehler?',
};

/**
 * An Android visitor wants to hear when the app comes for Android: the same
 * waitlist as the landing page (marketing/src/landing.js), tagged with the
 * platform and the inviter's campaign. Resolves with mailDelayed when the
 * backend kept the sign-up but could not send the confirmation mail right
 * away. Throws an Error whose message can be shown as is.
 */
export async function joinAndroidWaitlist(email: string, code: string | null): Promise<{ mailDelayed: boolean }> {
  let res: Response;
  try {
    res = await apiPostJson(
      '/waitlist',
      { email, website: '', platform: 'android', source: 'einladung', campaign: code ? inviteCampaign(code) : null },
      10000
    );
  } catch {
    throw new Error('Keine Verbindung. Versuch es gleich noch einmal.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { mailDelayed: data.mailDelayed === true };
  throw new Error(
    WAITLIST_ERRORS[data.error] ??
      (res.status === 429 ? 'Zu viele Versuche. Probier es in einer Stunde noch mal.' : 'Gerade klappt es nicht. Versuch es gleich noch einmal.')
  );
}

/** The app was opened through an invite link: keep the code for the sign-up. */
export async function rememberInviteCode(code: string, now = Date.now()): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ code, at: now })).catch(() => {});
}

/** The code waiting for the sign-up, if any and not older than 30 days. */
export async function pendingInviteCode(now = Date.now()): Promise<string | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
  if (!raw) return null;
  let entry: { code?: unknown; at?: unknown };
  try {
    entry = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof entry?.at !== 'number' || now - entry.at > PENDING_MAX_AGE_MS) return null;
  return normalizeInviteCode(entry.code);
}

/** After the sign-up sent it (or the user signed in anyway): forget it. */
export async function clearInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
}
