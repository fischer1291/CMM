/**
 * The badge album (backend lib/badges.js, routes/gamification.js).
 */
import { apiFetch, apiPostJson } from '../utils/api';

export type AlbumBadge = {
  id: string;
  category: string;
  /** Ionicons name ("help" for undiscovered secrets) */
  icon: string;
  title: string;
  description: string;
  secret: boolean;
  /** Earned tiers: 0 = not yet */
  tier: number;
  tiers: number;
  tierName: string | null;
  earned: boolean;
  /** Towards the next tier */
  progress: number;
  current: number | null;
  next: number | null;
};

export type Album = {
  categories: { id: string; title: string }[];
  badges: AlbumBadge[];
  /** Earned since last time: to celebrate */
  new: AlbumBadge[];
  nextUp: { id: string; icon: string; title: string; progress: number; hint: string } | null;
  showcase: string[];
};

export type ShowcaseBadge = { id: string; title: string; icon: string; tierName: string | null };

export type Friendship = {
  together: { talks: number; seconds: number; since: string | null };
  badges: AlbumBadge[];
  showcase: ShowcaseBadge[];
};

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}

export async function fetchAlbum(): Promise<Album> {
  return ok(await apiFetch('/me/badges', {}, 15000));
}

export async function markBadgesSeen(): Promise<void> {
  await ok(await apiPostJson('/me/badges/seen', {}, 10000));
}

export async function saveShowcase(ids: string[]): Promise<string[]> {
  const res = await apiFetch(
    '/me/showcase',
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) },
    10000
  );
  return (await ok<{ showcase: string[] }>(res)).showcase;
}

export async function fetchFriendship(phone: string): Promise<Friendship | null> {
  const res = await apiFetch(`/friends/${encodeURIComponent(phone)}`, {}, 10000);
  if (res.status === 404) return null;
  return ok(res);
}
