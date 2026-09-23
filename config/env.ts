/**
 * Runtime configuration. EXPO_PUBLIC_* variables are inlined at build time,
 * e.g. `EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start`.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://cmm-backend-gdqx.onrender.com';

// Not a secret: the App ID is public, tokens are issued by the backend
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '28a507f76f1a400ba047aa629af4b81d';

export const EXPO_PROJECT_ID = 'b5b430e0-3b17-49fe-bf44-ad9c6a49b8e3';
