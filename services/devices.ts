/**
 * The devices the account is signed in on and "Überall abmelden" (plan 2.9,
 * backend GET /me/devices and POST /me/logout-all). The settings show the
 * list; signing out everywhere ends every other session, removes the push
 * and VoIP tokens of the other devices and hands this device a new token.
 */
import { apiFetch, apiPostJson } from '../utils/api';
import PushTokenService from './PushTokenService';
import VoipPushService from './VoipPushService';
import { session } from './session';

export type SignedInDevice = {
  id: string;
  model: string | null;
  platform: string | null;
  appVersion: string | null;
  appBuild: string | null;
  lastSeenAt: string | null;
  /** The device this request came from (X-Device-Id) */
  current: boolean;
};

/** The account's devices, most recently seen first; null when the backend has no list. */
export async function fetchDevices(): Promise<SignedInDevice[] | null> {
  const res = await apiFetch('/me/devices', {}, 10000);
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body?.success || !Array.isArray(body.devices)) return null;
  return body.devices.filter((d: unknown): d is SignedInDevice => !!d && typeof (d as SignedInDevice).id === 'string');
}

/** What a device row says: the model, else a neutral name. */
export const deviceLabel = (device: Pick<SignedInDevice, 'model' | 'platform'>) =>
  device.model || (device.platform === 'ios' ? 'iPhone' : 'Unbekanntes Gerät');

/**
 * End every other session. The backend refuses the current token from that
 * moment and answers with a new one, which `replaceToken` (AuthContext)
 * stores and uses for the socket; 401s for the old token meanwhile do not
 * sign this device out (session.swapToken). Throws an Error whose message
 * can be shown as is.
 */
export async function signOutEverywhere(replaceToken: (token: string) => Promise<void>): Promise<void> {
  await session.swapToken(async () => {
    let res: Response;
    try {
      res = await apiPostJson(
        '/me/logout-all',
        { pushToken: PushTokenService.getToken() ?? undefined, voipToken: VoipPushService.getToken() ?? undefined },
        15000
      );
    } catch {
      throw new Error('Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.');
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success || typeof body.token !== 'string') {
      throw new Error(body?.error || 'Das hat nicht geklappt. Bitte versuch es noch einmal.');
    }
    await replaceToken(body.token);
  });
}
