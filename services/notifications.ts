/**
 * App-wide notification setup: how pushes look in the foreground, Android
 * channels, iOS action buttons, and the app badge. The backend's catalog
 * (CMM-backend-new/lib/notify.js) uses the same type, channel and
 * category names.
 */
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

export type PushType =
  | 'contact_available'
  | 'nudge'
  | 'moment_shared'
  | 'missed_call'
  | 'incoming_call'
  | 'call_ended';

/** Types whose content the open app already shows live */
const SILENT_IN_FOREGROUND = new Set<string>(['contact_available', 'call_ended']);

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = String(notification.request.content.data?.type ?? '');
    const show = !SILENT_IN_FOREGROUND.has(type);
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  },
});

async function setupAndroidChannels() {
  const { AndroidImportance } = Notifications;
  await Promise.all([
    Notifications.setNotificationChannelAsync('availability', {
      name: 'Wer gerade erreichbar ist',
      description: 'Wenn Kontakte Zeit für einen Anruf haben',
      importance: AndroidImportance.DEFAULT,
      lightColor: '#00E5FF',
    }),
    Notifications.setNotificationChannelAsync('social', {
      name: 'Anstupser & Moments',
      description: 'Wenn jemand gern mit dir sprechen würde oder einen Moment teilt',
      importance: AndroidImportance.DEFAULT,
      lightColor: '#FF2E93',
    }),
    Notifications.setNotificationChannelAsync('missed-calls', {
      name: 'Verpasste Anrufe',
      importance: AndroidImportance.HIGH,
      lightColor: '#FF2E93',
    }),
  ]);
}

async function setupCategories() {
  await Promise.all([
    Notifications.setNotificationCategoryAsync('contact_available', [
      { identifier: 'call', buttonTitle: 'Anrufen', options: { opensAppToForeground: true } },
    ]),
    Notifications.setNotificationCategoryAsync('missed_call', [
      { identifier: 'call', buttonTitle: 'Zurückrufen', options: { opensAppToForeground: true } },
    ]),
    Notifications.setNotificationCategoryAsync('nudge', [
      { identifier: 'go_available', buttonTitle: '30 Min. erreichbar', options: { opensAppToForeground: true } },
    ]),
  ]);
}

let initialized = false;

/** Once at startup. */
export function setupNotifications(): void {
  if (initialized) return;
  initialized = true;
  if (Platform.OS === 'android') setupAndroidChannels().catch(() => {});
  setupCategories().catch(() => {});

  // The badge shows unseen pushes; opening the app means they were seen
  const clearBadge = () => Notifications.setBadgeCountAsync(0).catch(() => {});
  clearBadge();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') clearBadge();
  });
}

/** Deep links a push may open; anything else is ignored. */
export function safeRoute(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  return /^\/(friend\?phone=[%+0-9A-Za-z]+|callmoments|stats|schedule)?$/.test(url) ? url : null;
}
