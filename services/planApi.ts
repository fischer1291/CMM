/**
 * Wanna yap+ plan (backend lib/plan.js, routes/plus.js).
 */
import { apiFetch, apiPostJson } from '../utils/api';

export type Limits = {
  circles: number;
  circleMembers: number;
  roomParticipants: number;
  /** null: no limit */
  roomMinutes: number | null;
  /** null: all memories */
  memoriesDays: number | null;
  hdVideo: boolean;
  rituals?: number;
  nudgeMessage?: boolean;
  yearReview?: boolean;
  appIcons?: boolean;
};

export type Plan = {
  plan: 'free' | 'plus';
  limits: Limits;
  plus: { until: string | null; source: string | null; productId: string | null } | null;
  userId: string;
  all: { free: Limits; plus: Limits };
  usage: { circlesFounded: number };
  products: string[];
  interest: { at: string; features: string[] } | null;
  /** Invite rewards (backend lib/referral.js); missing on older servers */
  referral?: Referral;
};

export type Referral = {
  /** Every `step` people who join through your invites give `rewardDays` of Plus */
  step: number;
  rewardDays: number;
  maxRewards: number;
  joined: number;
  earned: number;
  /** People still needed for the next reward; null when all are earned */
  toNext: number | null;
};

/** Worth showing the invite reward: not all earned, and no store subscription. */
export const showReferral = (plan: Plan | null): plan is Plan & { referral: Referral } =>
  !!plan?.referral && plan.referral.toNext != null && plan.plus?.source !== 'store';

export const PLUS_FEATURES: { id: string; icon: string; title: string; text: string }[] = [
  { id: 'memories', icon: 'images', title: 'Erinnerungen für immer', text: 'Alle eure Moments, nicht nur die letzten 30 Tage' },
  { id: 'bigger_circles', icon: 'people-circle', title: 'Größere Kreise', text: 'Mehr Kreise gründen, bis zu 50 Leute pro Kreis' },
  { id: 'longer_rounds', icon: 'mic', title: 'Runden ohne Zeitlimit', text: 'Bis zu 12 Leute, so lange ihr wollt' },
  { id: 'hd_video', icon: 'videocam', title: 'Video in HD', text: 'Schärfere Videoanrufe' },
  { id: 'year_review', icon: 'sparkles', title: 'Dein Jahresrückblick', text: 'Dein Jahr in Gesprächen, zum Teilen' },
  { id: 'rituals', icon: 'repeat', title: 'Mehr Rituale', text: 'Mehrere Rituale und geplante Runden pro Kreis' },
  { id: 'icons', icon: 'color-palette', title: 'App-Icons & Themen', text: 'Mach Wanna yap? zu deinem' },
  { id: 'family', icon: 'home', title: 'Familien-Abo', text: 'Plus für bis zu 6 Personen' },
  { id: 'support', icon: 'heart', title: 'Unterstützen', text: 'Hilf mit, dass Wanna yap? werbefrei bleibt' },
];

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}

export async function fetchPlan(): Promise<Plan> {
  return ok(await apiFetch('/me/plan', {}, 10000));
}

export async function sendInterest(features: string[]): Promise<void> {
  await ok(await apiPostJson('/me/plus-interest', { features }, 10000));
}

type Person = { phone: string; name: string | null; avatarUrl: string | null } | null;

export type YearReview = {
  year: number;
  minutes: number;
  talks: number;
  people: number;
  /** false: only the headline (free); the rest is Wanna yap+ */
  full: boolean;
  topPeople?: (NonNullable<Person> & { minutes: number; talks: number })[];
  longest?: { minutes: number; with: Person; at: string } | null;
  busiestMonth?: { month: number; minutes: number } | null;
  firstTalk?: { at: string; with: Person } | null;
  bestWeekStreak?: number;
  rounds?: number;
  roundMinutes?: number;
  dailyJoins?: number;
  unlockDays?: number;
  moments?: number;
  bestMoment?: { id: string; screenshot: string; note: string; reactions: number; with: Person; at: string } | null;
  badges?: number;
};

export async function fetchYearReview(year?: number): Promise<YearReview> {
  return (await ok<{ review: YearReview }>(await apiFetch(`/me/year-review${year ? `?year=${year}` : ''}`, {}, 15000))).review;
}
