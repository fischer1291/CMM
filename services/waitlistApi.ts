/**
 * Waitlist code from the launch mail (backend lib/waitlist.js): the badge
 * "Von Anfang an", plus Wanna yap+ days for three confirmed friends.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPostJson } from '../utils/api';

const REDEEMED_KEY = 'waitlistRedeemed';

export type Redeemed = { badge: string; referrals: number; plusDays: number };

const MESSAGES: Record<string, string> = {
  unknown_code: 'Diesen Code kennen wir nicht. Prüf ihn in deiner Mail, er sieht so aus: ABCD-1234.',
  code_used: 'Dieser Code wurde schon eingelöst.',
  already_redeemed: 'Du hast schon einen Warteliste-Code eingelöst.',
};

/** Redeem; throws an Error whose message can be shown as is. */
export async function redeemWaitlistCode(code: string): Promise<Redeemed> {
  let res: Response;
  try {
    res = await apiPostJson('/me/waitlist/redeem', { code });
  } catch {
    throw new Error('Keine Verbindung. Versuch es gleich noch einmal.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    if (data.error === 'already_redeemed') await AsyncStorage.setItem(REDEEMED_KEY, '1').catch(() => {});
    throw new Error(MESSAGES[data.error] ?? 'Das hat nicht geklappt. Versuch es gleich noch einmal.');
  }
  await AsyncStorage.setItem(REDEEMED_KEY, '1').catch(() => {});
  return { badge: data.badge, referrals: data.referrals, plusDays: data.plusDays };
}

/** Hide the settings row once a code is redeemed on this device. */
export async function waitlistRedeemed(): Promise<boolean> {
  return (await AsyncStorage.getItem(REDEEMED_KEY).catch(() => null)) === '1';
}
