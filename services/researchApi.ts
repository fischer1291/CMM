/**
 * User research (backend routes/me.js, docs/RESEARCH.md): after the second
 * talk the server invites to a 15-minute call with the founder; the person
 * books or dismisses once.
 */
import { apiPostJson } from '../utils/api';

export type Research = {
  invitedAt: string | null;
  bookedAt: string | null;
  dismissedAt: string | null;
  doneAt: string | null;
};

export type ResearchAnswer = 'booked' | 'dismissed';

export async function answerResearch(action: ResearchAnswer): Promise<void> {
  const res = await apiPostJson('/me/research', { action }, 10000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
}
