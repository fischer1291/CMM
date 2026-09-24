import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { fetchNudges, Nudges, sendNudge } from '../services/gamificationApi';
import { socket } from '../services/socket';

const EMPTY: Nudges = { received: [], sent: [] };

const NUDGE_ERRORS: Record<string, string> = {
  already_nudged: 'Du hast heute schon angestupst. Morgen geht es wieder.',
  already_available: 'Gerade erreichbar: ruf einfach an!',
  too_many: 'Für heute hast du genug angestupst.',
  not_allowed: 'Anstupsen geht nur bei Leuten, die dich auch in ihren Kontakten haben.',
};

/** Received and sent nudges; reloaded on focus and when a nudge arrives. */
export function useNudges() {
  const [nudges, setNudges] = useState<Nudges>(EMPTY);

  const reload = useCallback(() => {
    fetchNudges()
      .then(setNudges)
      .catch(() => {});
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    socket.on('nudge', reload);
    return () => {
      socket.off('nudge', reload);
    };
  }, [reload]);

  const nudge = useCallback(async (phone: string, name: string) => {
    try {
      await sendNudge(phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setNudges((current) => ({ ...current, sent: [...current.sent, { to: phone, at: new Date().toISOString() }] }));
      return true;
    } catch (error: any) {
      if (error?.code === 'already_nudged') {
        setNudges((current) => ({ ...current, sent: [...current.sent, { to: phone, at: new Date().toISOString() }] }));
      }
      Alert.alert(`${name} anstupsen`, NUDGE_ERRORS[error?.code] ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.');
      return false;
    }
  }, []);

  const nudged = useCallback((phone: string) => nudges.sent.some((n) => n.to === phone), [nudges.sent]);

  return { received: nudges.received, nudged, nudge, reload };
}
