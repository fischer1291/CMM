/**
 * The call list (backend GET /calls: the last 30 days).
 */
import { apiFetch, apiPostJson } from '../utils/api';

export type CallEntry = {
  callId: string;
  direction: 'incoming' | 'outgoing';
  otherPhone: string;
  otherName: string | null;
  otherAvatarUrl: string | null;
  /** ended | missed | declined | cancelled | busy | accepted */
  status: string;
  /** Incoming and not answered */
  missed: boolean;
  video: boolean;
  createdAt: string;
  durationSec: number;
};

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchCalls(): Promise<{ calls: CallEntry[]; unseenMissed: number }> {
  return ok(await apiFetch('/calls', {}, 15000));
}

export async function fetchUnseenMissed(): Promise<number> {
  return (await ok<{ count: number }>(await apiFetch('/calls/unseen', {}, 10000))).count;
}

export async function markCallsSeen(): Promise<void> {
  await ok(await apiPostJson('/calls/seen', {}, 10000));
}
