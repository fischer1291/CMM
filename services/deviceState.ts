/**
 * Tells the backend what this device allows (POST /me/state, plan 2.3):
 * notifications and contacts permission, each "granted" | "denied" |
 * "undetermined". The lifecycle pushes need it, e.g. invite_reminder has its
 * own text when the address book is denied. Sent after login and when the app
 * comes to the foreground, at most every two hours unless a value changed.
 * Failures stay silent: the next foreground tries again.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiPostJson } from '../utils/api';
import { session } from './session';

export type PermissionValue = 'granted' | 'denied' | 'undetermined';
export type DeviceState = { notifications: PermissionValue; contactsPermission: PermissionValue };
/** What was sent last, and when (ms) */
export type SentState = DeviceState & { at: number };

/** Same refresh as the backend (routes/me.js DEVICE_REFRESH_MS) */
export const DEVICE_STATE_INTERVAL_MS = 2 * 3600 * 1000;

const storageKey = (userPhone: string) => `deviceState:${userPhone}`;

/** Anything the OS reports besides granted/denied counts as not asked yet. */
export function permissionValue(status: unknown): PermissionValue {
  return status === 'granted' || status === 'denied' ? status : 'undetermined';
}

/** Send when nothing was sent yet, a value changed, or the last send is two hours old. */
export function deviceStateDue(last: SentState | null, current: DeviceState, now: number): boolean {
  if (!last) return true;
  if (last.notifications !== current.notifications || last.contactsPermission !== current.contactsPermission) return true;
  return now - last.at >= DEVICE_STATE_INTERVAL_MS;
}

async function readLast(userPhone: string): Promise<SentState | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userPhone));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.at === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

async function currentState(): Promise<DeviceState> {
  const [notifications, contacts] = await Promise.all([
    Notifications.getPermissionsAsync().catch(() => null),
    Contacts.getPermissionsAsync().catch(() => null),
  ]);
  return { notifications: permissionValue(notifications?.status), contactsPermission: permissionValue(contacts?.status) };
}

/**
 * Bumped by forgetDeviceState: a request still running from before a sign-out
 * must not write its stamp back afterwards.
 */
let generation = 0;

/** One running request per phone */
const inFlight = new Map<string, Promise<boolean>>();

/**
 * Drops every stamp on sign-out or account deletion, so the next login
 * (also a new account on the same number) reports at once. Never throws.
 */
export async function forgetDeviceState(): Promise<void> {
  generation += 1;
  inFlight.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('deviceState:'));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // nothing stored, or storage unavailable: the 2 h stamp just runs out
  }
}

/**
 * Reports the permissions if due; true when the server took them. Never
 * throws. Concurrent calls for the same phone (login and foreground at once)
 * share one request. Without a session token nothing is sent: /me/state
 * accepts tokens only, a legacy session would get a 401 on every foreground.
 */
export function reportDeviceState(userPhone: string, now: number = Date.now()): Promise<boolean> {
  // The web build has no device permissions worth telling
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (!session.getToken()) return Promise.resolve(false);
  const running = inFlight.get(userPhone);
  if (running) return running;
  const startedIn = generation;
  const request = (async () => {
    try {
      const current = await currentState();
      if (!deviceStateDue(await readLast(userPhone), current, now)) return false;
      const res = await apiPostJson('/me/state', current, 10000);
      if (!res.ok) return false;
      // Signed out meanwhile: the server took it, but the stamp stays gone
      if (generation === startedIn) {
        await AsyncStorage.setItem(storageKey(userPhone), JSON.stringify({ ...current, at: now } satisfies SentState)).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  })();
  inFlight.set(userPhone, request);
  // Registered before any caller awaits it, so the next call starts fresh
  void request.finally(() => {
    if (inFlight.get(userPhone) === request) inFlight.delete(userPhone);
  });
  return request;
}
