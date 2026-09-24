import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNewCall } from '../contexts/NewCallContext';
import { startSession } from '../services/gamificationApi';
import { safeRoute } from '../services/notifications';

/**
 * Opens the right screen for a tapped push, also when the tap launched the
 * app (cold start), and handles the action buttons. Incoming calls are
 * handled by CallNotificationService.
 */
export function NotificationRouter() {
  const router = useRouter();
  const { userPhone } = useAuth();
  const { startVideoCall } = useNewCall();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !userPhone) return;
    const { notification, actionIdentifier } = response;
    const key = `${notification.request.identifier}:${actionIdentifier}`;
    if (handled.current === key) return;
    handled.current = key;

    const data = (notification.request.content.data ?? {}) as { type?: string; phone?: string; url?: string };
    if (data.type === 'incoming_call' || data.type === 'call_ended') return;
    Notifications.clearLastNotificationResponse();

    if (actionIdentifier === 'call' && data.phone) {
      startVideoCall(data.phone, userPhone);
      return;
    }
    if (actionIdentifier === 'go_available') {
      startSession(30)
        .catch(() => {})
        .finally(() => router.navigate('/'));
      return;
    }
    const route = safeRoute(data.url);
    if (route) router.push(route as any);
  }, [response, userPhone, router, startVideoCall]);

  return null;
}
