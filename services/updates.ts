/**
 * OTA updates (EAS Update): when the app comes back to the foreground, at
 * most every 30 minutes, it looks for a new JavaScript bundle on its channel,
 * downloads it and offers a restart. Nothing is forced: "Später" keeps the
 * running bundle, the update applies on the next cold start anyway. The
 * start itself is not checked here: expo-updates does that natively before
 * the bundle runs (EXUpdatesCheckOnLaunch in ios/.../Expo.plist), so the
 * first check from JavaScript is due 30 minutes after launch and never
 * interrupts the launch animation. During a call the hint waits for the
 * next foreground change without a call. Only in release builds with
 * updates enabled; every failure is silent. The rules for when a change
 * ships as an OTA and when as a Store build are in docs/RELEASE.md ("OTA
 * oder Store-Build").
 *
 * The time logic is kept apart from expo-updates so it is testable without
 * native modules.
 */
import * as Updates from 'expo-updates';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import CallStateManager from './CallStateManager';

export const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Is a check due? Never twice within the interval; always when never checked. */
export function isCheckDue(now: number, lastCheckedAt: number | null, interval = CHECK_INTERVAL_MS): boolean {
  if (lastCheckedAt === null) return true;
  return now - lastCheckedAt >= interval;
}

/** The id the backend groups errors by: the OTA update, or the bundle shipped with the build. */
export function describeUpdate(u: { isEmbeddedLaunch: boolean; updateId: string | null }): string {
  return !u.isEmbeddedLaunch && u.updateId ? u.updateId : 'embedded';
}

export type UpdateClient = {
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean }>;
  reloadAsync: () => Promise<void>;
};

export type UpdatePrompt = (restart: () => void) => void;

/** Check, download, and offer the restart. Resolves to true when an update was fetched. */
export async function checkAndOffer(client: UpdateClient, prompt: UpdatePrompt): Promise<boolean> {
  try {
    const check = await client.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    const fetched = await client.fetchUpdateAsync();
    if (!fetched.isNew) return false;
    prompt(() => {
      client.reloadAsync().catch(() => {});
    });
    return true;
  } catch {
    // Offline, the update server is down, or the runtime does not match: the next check tries again
    return false;
  }
}

/** No hint while a call rings or runs; the restart would end it. */
export function noCallActive(): boolean {
  return CallStateManager.getActiveCall() === null;
}

/**
 * Drives checkAndOffer from AppState changes with the 30-minute throttle.
 * Mounting counts as the launch check (done natively), so the first check
 * from here comes with the first foreground change after the interval. When
 * an update is downloaded while `canPrompt` says no (a call is active), the
 * hint is kept and shown on the next foreground change that allows it.
 * Returns the unsubscribe function. `now`, the state source and `canPrompt`
 * are injectable for the tests; the app calls it with the defaults from
 * app/_layout.tsx.
 */
export function watchForUpdates(
  client: UpdateClient,
  prompt: UpdatePrompt,
  deps: {
    now?: () => number;
    addListener?: (cb: (state: AppStateStatus) => void) => { remove: () => void };
    interval?: number;
    canPrompt?: () => boolean;
  } = {}
): () => void {
  const now = deps.now ?? Date.now;
  const addListener = deps.addListener ?? ((cb) => AppState.addEventListener('change', cb));
  const canPrompt = deps.canPrompt ?? noCallActive;
  let lastCheckedAt: number | null = now();
  let running = false;
  let pendingRestart: (() => void) | null = null;
  const offer: UpdatePrompt = (restart) => {
    if (canPrompt()) prompt(restart);
    else pendingRestart = restart;
  };
  const run = async () => {
    if (pendingRestart) {
      // Already downloaded, only the hint is outstanding
      if (!canPrompt()) return;
      const restart = pendingRestart;
      pendingRestart = null;
      prompt(restart);
      return;
    }
    if (running || !isCheckDue(now(), lastCheckedAt, deps.interval)) return;
    running = true;
    lastCheckedAt = now();
    try {
      await checkAndOffer(client, offer);
    } finally {
      running = false;
    }
  };
  const sub = addListener((state) => {
    if (state === 'active') run();
  });
  return () => sub.remove();
}

/** The gentle hint: restart now or later, no pressure. */
export const alertPrompt: UpdatePrompt = (restart) => {
  Alert.alert('Ein kleines Update ist da', 'Beim nächsten Start ist es sowieso drin. Magst du jetzt kurz neu starten?', [
    { text: 'Später', style: 'cancel' },
    { text: 'Jetzt neu starten', onPress: restart },
  ]);
};

/** Release builds only; development builds and Expo Go run no OTA updates. */
export function updatesActive(): boolean {
  return Updates.isEnabled && !__DEV__;
}

/** Wire everything up for the app; no-op where updates are off. */
export function startUpdateWatcher(): () => void {
  if (!updatesActive()) return () => {};
  return watchForUpdates(Updates, alertPrompt);
}
