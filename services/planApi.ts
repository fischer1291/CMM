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
};

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
