import { apiFetch } from '../utils/api';

export type CallHistoryEntry = {
  callId: string;
  direction: 'outgoing' | 'incoming';
  otherPhone: string;
  status: 'ringing' | 'accepted' | 'ended' | 'declined' | 'cancelled' | 'missed' | 'busy';
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  durationSec: number;
};

/** The signed-in user's recent calls, newest first. */
export async function fetchCallHistory(limit = 50): Promise<CallHistoryEntry[]> {
  const res = await apiFetch(`/calls?limit=${limit}`, {}, 10000);
  if (!res.ok) throw new Error(`Call history failed: ${res.status}`);
  const data = await res.json();
  return data.calls ?? [];
}

/** Monday 00:00 of the current week, local time. */
export function startOfWeek(now = new Date()): Date {
  const start = new Date(now);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Conversations (answered calls) and talk minutes since Monday. */
export function weekStats(calls: CallHistoryEntry[], now = new Date()) {
  const since = startOfWeek(now).getTime();
  const talked = calls.filter((c) => c.acceptedAt && new Date(c.createdAt).getTime() >= since);
  const seconds = talked.reduce((sum, c) => sum + (c.durationSec || 0), 0);
  return { conversations: talked.length, minutes: Math.round(seconds / 60) };
}
