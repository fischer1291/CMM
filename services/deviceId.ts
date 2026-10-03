/**
 * Which device this is, for the backend's device list (plan 2.9): every
 * request carries X-Device-Id and X-Device-Model (services/appInfo.ts
 * appHeaders), so the backend can show "Geräte" in the settings, tell a
 * sign-in from an unknown device (the "Ist das dein Konto?" question for
 * recycled numbers, the new_device push) and keep only this device on
 * "Überall abmelden".
 *
 * The id is Apple's identifierForVendor (the same for all apps of one
 * vendor on this device, never the advertising id). When iOS does not give
 * it (rare, e.g. right after a restore) or on other platforms, a random
 * UUID made once and kept in the keychain stands in. The model is the
 * marketing name from expo-device ("iPhone 15 Pro").
 *
 * The root layout calls initDeviceId() before anything else; apiFetch waits
 * for it (at most INIT_TIMEOUT_MS), so even the first request carries both
 * headers. The socket carries only the auth token: the backend reads no
 * headers there.
 */
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { uuidv4 } from '../utils/uuid';
import { appHeaders } from './appInfo';

// Same limits as the backend (CMM-backend-new/lib/devices.js)
export const MAX_DEVICE_ID_LENGTH = 64;
export const MAX_DEVICE_MODEL_LENGTH = 40;
const FALLBACK_KEY = 'deviceId';
// A slow keychain must not hold back requests for long
const INIT_TIMEOUT_MS = 3000;

/** The id as the backend accepts it ([A-Za-z0-9-], at most 64), or null. */
export function cleanDeviceId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().replace(/[^A-Za-z0-9-]/g, '').slice(0, MAX_DEVICE_ID_LENGTH);
  return id || null;
}

/**
 * The model for a header: printable ASCII only (header values must not
 * carry control or non-Latin characters), no angle brackets, at most 40.
 */
export function cleanDeviceModel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const model = raw
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[<>]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, MAX_DEVICE_MODEL_LENGTH)
    .trim();
  return model || null;
}

/** A random RFC 4122 UUID: crypto.getRandomValues where the runtime has it, else utils/uuid. */
function randomUuid(): string {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (!cryptoApi?.getRandomValues) return uuidv4();
  const b = cryptoApi.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The stand-in id from the keychain, made and stored on first use. */
async function fallbackId(): Promise<string | null> {
  try {
    const stored = cleanDeviceId(await SecureStore.getItemAsync(FALLBACK_KEY));
    if (stored) return stored;
    const made = randomUuid();
    await SecureStore.setItemAsync(FALLBACK_KEY, made, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    return made;
  } catch {
    return null;
  }
}

async function vendorId(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    return cleanDeviceId(await Application.getIosIdForVendorAsync());
  } catch {
    return null;
  }
}

let deviceId: string | null = null;
let ready: Promise<void> | null = null;

/** This device's id once initDeviceId() finished, else null. */
export const currentDeviceId = () => deviceId;

/** Find the id and the model and put them into appHeaders; runs once. */
export function initDeviceId(): Promise<void> {
  if (ready) return ready;
  const model = cleanDeviceModel(Device.modelName);
  if (model) appHeaders['X-Device-Model'] = model;
  const work = (async () => {
    const id = (await vendorId()) ?? (await fallbackId());
    if (!id) return;
    deviceId = id;
    appHeaders['X-Device-Id'] = id;
  })().catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, INIT_TIMEOUT_MS);
  });
  ready = Promise.race([work, timeout]).finally(() => clearTimeout(timer));
  return ready;
}

/** Resolves once the headers are set (or gave up); at once when nothing started. */
export const deviceIdReady = (): Promise<void> => ready ?? Promise.resolve();

/** For tests: forget the id so initDeviceId() runs again. */
export function resetDeviceIdForTests() {
  deviceId = null;
  ready = null;
  delete appHeaders['X-Device-Id'];
  delete appHeaders['X-Device-Model'];
}
