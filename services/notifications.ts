/**
 * App-wide notification setup: how pushes look in the foreground, Android
 * channels, iOS action buttons, and the app badge. The backend's catalog
 * (CMM-backend-new/lib/notify.js) uses the same type, channel and
 * category names.
 */
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { bannerRecentlyShown } from './bannerLog';

export type PushType =
  | 'contact_available'
  | 'nudge'
  | 'moment_shared'
  | 'missed_call'
  | 'incoming_call'
  | 'call_ended';

/** Types the open app shows itself, live via socket (components/InAppBanner) */
const LIVE_IN_APP = new Set<string>([
  'contact_available',
  'nudge',
  'contact_joined',
  'daily_moment',
  'moment_consent',
  'room_open',
  'circle_invite',
]);

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = (notification.request.content.data ?? {}) as { type?: string; phone?: string };
    const type = String(data.type ?? '');
    // Hidden only if the live banner already showed it; a push must never
    // disappear unseen (e.g. if the backend thought the app was closed)
    const show = type !== 'call_ended' && !(LIVE_IN_APP.has(type) && bannerRecentlyShown(type, data.phone));
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
    Notifications.setNotificationCategoryAsync('daily_moment', [
      { identifier: 'join_daily', buttonTitle: 'Dabei sein', options: { opensAppToForeground: true } },
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
  return /^\/(friend\?phone=[%+0-9A-Za-z]+|circle\?id=[0-9a-f]{24}|callmoments|stats|schedule|circles|support)?$/.test(url) ? url : null;
}
