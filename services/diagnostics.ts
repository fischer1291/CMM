/**
 * Uncaught JavaScript errors go to our own backend (routes/diagnostics.js),
 * grouped there without any user reference. No tracking SDK. Native crashes
 * are in Xcode Organizer.
 */
import { API_BASE_URL } from '../config/env';
import { fetchWithTimeout } from '../utils/apiUtils';
import { appInfo } from './appInfo';

// Per app start: the same error at most this often, all errors at most 20
const MAX_SAME = 3;
const MAX_TOTAL = 20;
const sent = new Map<string, number>();
let total = 0;

export function reportError(error: unknown, fatal = false): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = `${err.name}: ${err.message}`.slice(0, 500);
  const times = sent.get(message) ?? 0;
  if (times >= MAX_SAME || total >= MAX_TOTAL) return;
  sent.set(message, times + 1);
  total += 1;
  fetchWithTimeout(
    `${API_BASE_URL}/diagnostics/errors`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack: (err.stack ?? '').slice(0, 4000),
        fatal,
        version: `${appInfo.version} (${appInfo.build})`,
        platform: appInfo.platform,
      }),
    },
    5000
  ).catch(() => {});
}

/** Report uncaught errors, then let React Native handle them as before. */
export function installErrorReporting(): void {
  if (__DEV__) return;
  const utils = (global as any).ErrorUtils;
  if (!utils?.setGlobalHandler) return;
  const previous = utils.getGlobalHandler?.();
  utils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    reportError(error, !!isFatal);
    previous?.(error, isFatal);
  });
}
