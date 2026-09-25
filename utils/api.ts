import { API_BASE_URL } from '../config/env';
import { appHeaders } from '../services/appInfo';
import { session } from '../services/session';
import { DEFAULT_TIMEOUT, fetchWithTimeout } from './apiUtils';

/**
 * fetch against the backend: prefixes API_BASE_URL, adds the auth token and
 * signs the user out when the backend rejects the token.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const token = session.getToken();
  const headers: Record<string, string> = { ...appHeaders, ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers }, timeout);
  if (response.status === 401 && token) {
    session.handleUnauthorized();
  }
  return response;
}

/** POST/PUT a JSON body. */
export function apiPostJson(path: string, body: unknown, timeout?: number): Promise<Response> {
  return apiFetch(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    timeout
  );
}
