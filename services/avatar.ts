import { apiFetch } from '../utils/api';

/**
 * Upload a local image as the user's avatar; returns the hosted URL or null.
 * No Content-Type header: fetch sets multipart/form-data with the boundary.
 */
export async function uploadAvatar(imageUri: string, userPhone: string | null): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('avatar', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
    // Only read by backends without token auth
    if (userPhone) formData.append('phone', userPhone);

    const response = await apiFetch('/upload/avatar', { method: 'POST', body: formData }, 20000);
    const data = await response.json();
    return data.success && data.avatarUrl ? data.avatarUrl : null;
  } catch (error) {
    console.error('Avatar upload error:', error);
    return null;
  }
}
