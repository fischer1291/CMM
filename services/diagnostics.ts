/**
 * Uncaught JavaScript errors go to our own backend (routes/diagnostics.js),
 * grouped there without any user reference, and, when the build carries a
 * DSN, to Sentry (services/sentry.ts) which also sees most native crashes.
 * What neither sees: a crash before the JavaScript bundle runs (a cold start
 * through a VoIP push, PushKit and CallKit in AppDelegate) and system kills;
 * those are only in Xcode → Organizer and App Store Connect → Abstürze
 * (docs/RELEASE.md, section 2b).
 *
 * Signed in, the report carries the token: only then does the backend keep
 * `fatal` (a fatal error alerts the owner, lib/alerts.js client_errors), so
 * a stranger with curl can't page anyone. Before sign-in it goes without.
 */
import { API_BASE_URL } from '../config/env';
import { fetchWithTimeout } from '../utils/apiUtils';
import { appHeaders, appInfo } from './appInfo';
import { captureException } from './sentry';
import { session } from './session';

// Per app start: the same error at most this often, all errors at most 20
const MAX_SAME = 3;
const MAX_TOTAL = 20;
const sent = new Map<string, number>();
let total = 0;

/**
 * Report a handled error: to our backend and, when active, to Sentry (fatal
 * keeps its level there). The global handler below reports uncaught errors
 * to the backend only, because Sentry's own handler (installed by init()
 * before ours) already captures them; two copies would be noise.
 */
export function reportError(error: unknown, fatal = false): void {
  record(error, fatal, true);
}

/** The report's headers: the app's version headers, and the token when signed in. */
export function reportHeaders(token: string | null): Record<string, string> {
  return { ...appHeaders, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function record(error: unknown, fatal: boolean, toSentry: boolean): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = `${err.name}: ${err.message}`.slice(0, 500);
  const times = sent.get(message) ?? 0;
  if (times >= MAX_SAME || total >= MAX_TOTAL) return;
  sent.set(message, times + 1);
  total += 1;
  if (toSentry) captureException(err, fatal);
  fetchWithTimeout(
    `${API_BASE_URL}/diagnostics/errors`,
    {
      method: 'POST',
      // Same version headers as every other request (X-App-Version/Build/Update)
      headers: reportHeaders(session.getToken()),
      body: JSON.stringify({
        message,
        stack: (err.stack ?? '').slice(0, 4000),
        fatal,
        version: `${appInfo.version} (${appInfo.build})`,
        // Which JavaScript ran: the OTA update id or "embedded" (docs/RELEASE.md)
        update: appInfo.update,
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
    record(error, !!isFatal, false);
    previous?.(error, isFatal);
  });
}
