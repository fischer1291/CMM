/**
 * The daily Yap Moment and moment consent (backend routes/daily.js,
 * routes/moment.js).
 */
import { apiFetch, apiPostJson } from '../utils/api';

/**
 * Today's Yap Moment in the user's time zone while it is still ahead (plan
 * 2.13): null once it runs or is over, and on days whose moment was set after
 * 21:00. Missing on older servers.
 */
export type NextMoment = { nextAt?: string | null; nextEndsAt?: string | null };

export type DailyState = NextMoment &
  (
    | { active: false }
    | { active: true; startedAt: string; endsAt: string; joined: boolean; participants: string[] }
  );

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
