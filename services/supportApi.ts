/**
 * "Hilfe & Feedback": tickets answered in the admin console.
 */
import { apiFetch, apiPostJson } from '../utils/api';
import { appInfo } from './appInfo';

export type SupportCategory = 'bug' | 'idea' | 'account' | 'other';
export type SupportMessage = { from: 'user' | 'support'; text: string; at: string };
export type SupportTicket = {
  id: string;
  category: SupportCategory;
  status: 'open' | 'answered' | 'closed';
  unread: boolean;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  /** When support closed it (null while open) */
  closedAt?: string | null;
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
