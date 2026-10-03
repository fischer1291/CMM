/**
 * "Hilfe & Feedback": tickets answered in the admin console. Since plan 2.7
 * the list also holds statements of reasons (category "moderation", written
 * by the backend's lib/moderation.js when a moment is hidden or deleted or
 * the account suspended); replying to one is the objection (DSA Art. 20).
 */
import { apiFetch, apiPostJson } from '../utils/api';
import { appInfo } from './appInfo';

export type SupportCategory = 'bug' | 'idea' | 'account' | 'other';
export type SupportMessage = { from: 'user' | 'support'; text: string; at: string };
export type ModerationAction = 'suspend' | 'hide_moment' | 'delete_moment';
export type SupportTicket = {
  id: string;
  /** What the user can pick, or "moderation" for a statement of reasons */
  category: SupportCategory | 'moderation';
  status: 'open' | 'answered' | 'closed';
  unread: boolean;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  /** When support closed it (null while open) */
  closedAt?: string | null;
  /** Only on category "moderation": the measure and when it ends (null: no end) */
  moderation?: { action: ModerationAction | null; until: string | null };
};

async function ok<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return data;
}

export async function fetchTickets(): Promise<SupportTicket[]> {
  return (await ok<{ tickets: SupportTicket[] }>(await apiFetch('/support', {}, 10000))).tickets;
}

export async function openTicket(category: SupportCategory, message: string): Promise<SupportTicket> {
  return (await ok<{ ticket: SupportTicket }>(await apiPostJson('/support', { category, message, app: appInfo }, 15000))).ticket;
}

export async function replyToTicket(id: string, message: string): Promise<SupportTicket> {
  return (await ok<{ ticket: SupportTicket }>(await apiPostJson(`/support/${id}/reply`, { message }, 15000))).ticket;
}

export async function markTicketRead(id: string): Promise<void> {
  await apiPostJson(`/support/${id}/read`, {}, 10000).catch(() => {});
}
