/**
 * The daily Call Me Moment and moment consent (backend routes/daily.js,
 * routes/moment.js).
 */
import { apiFetch, apiPostJson } from '../utils/api';

export type DailyState =
  | { active: false }
  | { active: true; startedAt: string; endsAt: string; joined: boolean; participants: string[] };

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}

export async function fetchDaily(): Promise<DailyState> {
  return ok(await apiFetch('/daily', {}, 10000));
}

/** I'm in: available until the moment ends. */
export async function joinDaily(mood?: string): Promise<{ endsAt: string; availableUntil: string }> {
  return ok(await apiPostJson('/daily/join', mood ? { mood } : {}, 10000));
}

/** The other person's answer to a moment waiting for consent. */
export async function answerMoment(id: string, approve: boolean): Promise<void> {
  await ok(await apiPostJson(`/moment/${id}/consent`, { approve }, 10000));
}
