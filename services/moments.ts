import { apiFetch } from '../utils/api';

/**
 * Upload a moment's picture (a local JPEG) to the backend, which stores it
 * on Cloudinary. Returns the hosted URL, or null if the upload failed.
 * No Content-Type header: fetch sets multipart/form-data with the boundary.
 */
export async function uploadMomentImage(fileUri: string): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('image', { uri: fileUri, type: 'image/jpeg', name: 'moment.jpg' } as any);
    const response = await apiFetch('/upload/moment', { method: 'POST', body: form }, 30000);
    const data = await response.json().catch(() => ({}));
    return response.ok && typeof data.url === 'string' ? data.url : null;
  } catch (error) {
    console.warn('📸 Moment upload failed:', error);
    return null;
  }
}
