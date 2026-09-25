/**
 * Shared circles, invites and rooms (backend routes/circles.js).
 */
import { hashPhone } from '../utils/phone';
import { apiFetch, apiPostJson } from '../utils/api';

export type CircleMember = { phone: string; name: string; avatarUrl: string; isAvailable: boolean; availableUntil: string | null };
export type Warmth = { minutes: number; talkedCount: number; memberCount: number; goalReached: boolean };
export type RoomInfo = { id: string; channel: string; participants: string[] };
export type Ritual = { enabled: boolean; day: number; start: number };

export type CircleSummary = {
  id: string;
  name: string;
  emoji: string;
  createdBy: string;
  members: CircleMember[];
  invitedCount: number;
  warmth: Warmth;
  room: RoomInfo | null;
  ritual: Ritual;
};

export type CircleDetail = CircleSummary & {
  code: string;
  invites: { phone: string | null; name: string; status: 'draft' | 'pending'; pendingSignup: boolean }[];
  moments: { id: string; screenshot: string; userPhone: string; targetPhone: string; mood: string; note?: string; timestamp: string }[];
};

export type CircleInvite = {
  circleId: string;
  name: string;
  emoji: string;
  memberCount: number;
  invitedBy: string;
  invitedByName: string;
};

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}
const send = (path: string, method: string, body?: unknown) =>
  apiFetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }, 15000);

export async function fetchCircles(): Promise<{ circles: CircleSummary[]; invites: CircleInvite[] }> {
  return ok(await apiFetch('/circles', {}, 15000));
}

export async function fetchCircle(id: string): Promise<CircleDetail> {
  return (await ok<{ circle: CircleDetail }>(await apiFetch(`/circles/${id}`, {}, 15000))).circle;
}

/** App users are invited by number; people without the app by hash (+ the link). */
export async function createCircle(name: string, emoji: string, invite: string[] = []): Promise<CircleDetail> {
  return (await ok<{ circle: CircleDetail }>(await apiPostJson('/circles', { name, emoji, invite }, 15000))).circle;
}

export async function inviteToCircle(
  id: string,
  { phones = [], unregistered = [], drafts = false }: { phones?: string[]; unregistered?: string[]; drafts?: boolean }
): Promise<CircleDetail> {
  const body = { phones, hashes: unregistered.map(hashPhone), drafts };
  return (await ok<{ circle: CircleDetail }>(await apiPostJson(`/circles/${id}/invite`, body, 15000))).circle;
}

export async function answerCircleInvite(id: string, accept: boolean): Promise<void> {
  await ok(await apiPostJson(`/circles/${id}/${accept ? 'accept' : 'decline'}`, {}, 10000));
}

export async function joinCircleByCode(code: string): Promise<CircleDetail> {
  return (await ok<{ circle: CircleDetail }>(await apiPostJson('/circles/join', { code }, 10000))).circle;
}

export async function previewCircleCode(code: string): Promise<{ name: string; emoji: string; memberCount: number; createdByName: string }> {
  return (await ok(await apiFetch(`/circles/code/${encodeURIComponent(code)}`, {}, 10000))).circle;
}

export async function updateCircle(id: string, patch: { name?: string; emoji?: string; ritual?: Ritual }): Promise<CircleDetail> {
  return (await ok<{ circle: CircleDetail }>(await send(`/circles/${id}`, 'PATCH', patch))).circle;
}

export async function leaveCircle(id: string): Promise<void> {
  await ok(await apiPostJson(`/circles/${id}/leave`, {}, 10000));
}

export async function removeFromCircle(id: string, phone: string): Promise<void> {
  await ok(await send(`/circles/${id}/members/${encodeURIComponent(phone)}`, 'DELETE'));
}

/** Open the circle's room (or get the running one) and join it. */
export async function openRoom(circleId: string): Promise<{ id: string; channel: string; circleId: string }> {
  return (await ok(await apiPostJson(`/circles/${circleId}/room`, {}, 10000))).room;
}

export async function joinRoom(roomId: string): Promise<{ id: string; channel: string; circleId: string }> {
  return (await ok(await apiPostJson(`/rooms/${roomId}/join`, {}, 10000))).room;
}

export async function leaveRoom(roomId: string): Promise<void> {
  await ok(await apiPostJson(`/rooms/${roomId}/leave`, {}, 10000));
}

export type Audience = { mode: 'all' | 'circles'; circles: string[] };

export async function fetchAudience(): Promise<Audience> {
  return (await ok<{ audience: Audience }>(await apiFetch('/me/audience', {}, 10000))).audience;
}

export async function saveAudience(audience: Audience): Promise<Audience> {
  return (await ok<{ audience: Audience }>(await send('/me/audience', 'PUT', audience))).audience;
}
