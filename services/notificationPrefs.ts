import { apiFetch } from '../utils/api';

export type NotificationPrefs = {
  available: boolean;
  nudges: boolean;
  moments: boolean;
  quietHours: { enabled: boolean; start: number; end: number };
};

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await apiFetch('/me/notifications', {}, 10000);
  const data = await res.json();
  if (!res.ok || !data.prefs) throw new Error(`HTTP ${res.status}`);
  return data.prefs;
}

export async function saveNotificationPrefs(prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const res = await apiFetch(
    '/me/notifications',
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) },
    10000
  );
  const data = await res.json();
  if (!res.ok || !data.prefs) throw new Error(`HTTP ${res.status}`);
  return data.prefs;
}
