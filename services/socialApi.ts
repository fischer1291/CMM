/**
 * Blocking, reporting, invites, circles and who sees one's availability
 * (backend routes/social.js).
 */
import { hashPhone } from '../utils/phone';
import { apiFetch, apiPostJson } from '../utils/api';

export type BlockedPerson = { phone: string; name: string; avatarUrl: string; at: string };
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}

export async function fetchBlocked(): Promise<BlockedPerson[]> {
  return (await ok<{ blocked: BlockedPerson[] }>(await apiFetch('/blocks', {}, 10000))).blocked;
}

export async function blockPerson(phone: string): Promise<void> {
  await ok(await apiPostJson('/blocks', { phone }, 10000));
}

export async function unblockPerson(phone: string): Promise<void> {
  await ok(await apiFetch(`/blocks/${encodeURIComponent(phone)}`, { method: 'DELETE' }, 10000));
}

export async function reportPerson(report: {
  phone: string;
  reason: ReportReason;
  momentId?: string;
  note?: string;
  block?: boolean;
}): Promise<void> {
  await ok(await apiPostJson('/reports', report, 10000));
}

/** Remember that we invited these numbers (E.164): connected when they sign up. */
export async function recordInvites(phones: string[]): Promise<void> {
  if (!phones.length) return;
  await ok(await apiPostJson('/invites', { hashes: phones.map(hashPhone) }, 10000));
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Belästigung oder Mobbing' },
  { value: 'inappropriate', label: 'Unangemessener Inhalt' },
  { value: 'spam', label: 'Spam oder Fake' },
  { value: 'other', label: 'Etwas anderes' },
];
