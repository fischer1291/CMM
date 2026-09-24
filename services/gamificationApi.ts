/**
 * Schedules, sessions, talk-time stats and nudges (backend routes/gamification.js).
 */
import { apiFetch, apiPostJson } from '../utils/api';

export type Slot = { day: number; start: number; end: number };
export type Schedule = { enabled: boolean; timezone: string | null; slots: Slot[] };
export type NextSlot = { day: number; start: number; end: number; inMinutes: number } | null;

export type Badge = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
};

export type Stats = {
  totals: {
    weekSeconds: number;
    lastWeekSeconds: number;
    monthSeconds: number;
    allTimeSeconds: number;
    talks: number;
    longestSeconds: number;
  };
  weeks: { week: string; seconds: number }[];
  streak: { current: number; best: number };
  badges: Badge[];
  people: { phone: string; seconds: number; talks: number }[];
};

export type Visibility = 'private' | 'contacts' | 'selected';
export type Sharing = { visibility: Visibility; sharedWith: string[] };

export type SharedStats = {
  totals: { weekSeconds: number; monthSeconds: number; allTimeSeconds: number };
  streak: { current: number; best: number };
  badges: Pick<Badge, 'id' | 'title' | 'description'>[];
};

export type Nudges = {
  received: { from: string; name: string; at: string }[];
  sent: { to: string; at: string }[];
};

/** The device's IANA zone, e.g. "Europe/Berlin". */
export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';

export const SESSION_MINUTES = [15, 30, 60, 120] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error = new Error(data.error || `HTTP ${res.status}`) as Error & { code?: string; status?: number };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

/** Available for a limited session. */
export async function startSession(minutes: SessionMinutes, mood: string | null = null) {
  await json(await apiPostJson('/moment/confirm', { minutes, mood }, 10000));
}

export async function fetchSchedule(): Promise<{ schedule: Schedule; next: NextSlot }> {
  return json(await apiFetch('/me/schedule', {}, 10000));
}

export async function saveSchedule(schedule: Omit<Schedule, 'timezone'>): Promise<{ schedule: Schedule; next: NextSlot }> {
  return json(
    await apiFetch(
      '/me/schedule',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, timezone: deviceTimezone() }),
      },
      10000
    )
  );
}

export async function fetchStats(): Promise<{ stats: Stats; sharing: Sharing }> {
  return json(await apiFetch(`/me/stats?tz=${encodeURIComponent(deviceTimezone())}`, {}, 15000));
}

export async function saveSharing(sharing: Sharing): Promise<void> {
  await json(
    await apiFetch(
      '/me/stats/sharing',
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sharing) },
      10000
    )
  );
}

/** A contact's stats, or null if they don't share them with you. */
export async function fetchSharedStats(phone: string): Promise<{ name: string; stats: SharedStats } | null> {
  const res = await apiFetch(`/stats/${encodeURIComponent(phone)}`, {}, 10000);
  if (res.status === 403) return null;
  return json(res);
}

export async function sendNudge(phone: string): Promise<void> {
  await json(await apiPostJson('/nudge', { phone }, 10000));
}

export async function fetchNudges(): Promise<Nudges> {
  return json(await apiFetch('/nudges', {}, 10000));
}

// --- Formatting -----------------------------------------------------------

export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
/** Monday first, as people in Germany read a week */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** 1080 -> "18:00" */
export const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** 3720 s -> "1 Std. 2 Min.", 300 s -> "5 Min." */
export function talkTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}

/** "Heute 18:00", "Morgen 18:00", "Montag 18:00" */
export function nextSlotLabel(next: NextSlot): string | null {
  if (!next) return null;
  const today = new Date().getDay();
  const days = (next.day - today + 7) % 7;
  const sameDaySoon = days === 0 && next.inMinutes < 24 * 60;
  const when = sameDaySoon ? 'Heute' : days === 1 ? 'Morgen' : WEEKDAYS_LONG[next.day];
  return `${when} ${clock(next.start)}`;
}
