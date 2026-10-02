import { apiFetch } from '../utils/api';

/**
 * A plan limit the server answered with (403 plan_limit, backend lib/plan.js),
 * shaped for explainLimit: `code` is the server's `error`.
 */
export type PlanLimit = { code: 'plan_limit'; limit: string; value?: number; plus?: number | string | null };

/** The server's answer as a plan limit, or null when it is something else. */
export function planLimitOf(status: number, data: any): PlanLimit | null {
  if (status !== 403 || data?.error !== 'plan_limit' || typeof data?.limit !== 'string') return null;
  return { code: 'plan_limit', limit: data.limit, value: data.value, plus: data.plus };
}

/**
 * Upload a moment's picture (a local JPEG) to the backend, which stores it
 * on Cloudinary. Returns the hosted URL, or null if the upload failed; with
 * `limit` when the server refused it for the plan limit momentsPerDay (then
 * the inline fallback must not be tried, it would be refused too).
 * No Content-Type header: fetch sets multipart/form-data with the boundary.
 */
export async function uploadMomentImage(fileUri: string): Promise<{ url: string | null; limit?: PlanLimit }> {
  try {
    const form = new FormData();
    form.append('image', { uri: fileUri, type: 'image/jpeg', name: 'moment.jpg' } as any);
    const response = await apiFetch('/upload/moment', { method: 'POST', body: form }, 30000);
    const data = await response.json().catch(() => ({}));
    const limit = planLimitOf(response.status, data);
    if (limit) return { url: null, limit };
    return { url: response.ok && typeof data.url === 'string' ? data.url : null };
  } catch (error) {
    console.warn('📸 Moment upload failed:', error);
    return { url: null };
  }
}
