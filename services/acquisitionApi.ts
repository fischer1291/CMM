/**
 * "Woher kennst du Wanna yap?" (plan 2.10, backend routes/me.js and
 * lib/acquisition.js): the optional answer from profile setup. The server
 * adds campaign and invite code itself; the app only sends the source and
 * how many of the five closest friends use Android (or null: not known).
 */
import { apiPostJson } from '../utils/api';

export type AcquisitionSource = 'friend' | 'tiktok' | 'instagram' | 'flyer' | 'press' | 'other';

/** User.acquisition as GET /me returns it */
export type Acquisition = {
  source: AcquisitionSource | null;
  androidFriends: number | null;
  campaign: string | null;
  code: string | null;
  at: string | null;
};

export type AcquisitionAnswer = { source: AcquisitionSource; androidFriends: number | null };

/**
 * Stores the answer. Throws on any failure (400, 409 already_answered after
 * 24 hours, offline); the caller ignores it, the user moves on either way.
 */
export async function sendAcquisition(answer: AcquisitionAnswer): Promise<Acquisition | null> {
  const res = await apiPostJson('/me/acquisition', answer, 10000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data.acquisition ?? null;
}
