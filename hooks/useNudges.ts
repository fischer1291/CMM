import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { dismissNudges, fetchNudges, nextNudgeLabel, Nudges, sendNudge } from '../services/gamificationApi';
import { socket } from '../services/socket';

const EMPTY: Nudges = { received: [], sent: [] };

function errorText(code: string | undefined, name: string, nextAllowedAt?: string): string {
  const when = nextAllowedAt ? nextNudgeLabel(nextAllowedAt) : null;
  switch (code) {
    case 'already_nudged':
      return when ? `Du kannst ${name} ${when} wieder anstupsen.` : `Du hast ${name} gerade erst angestupst.`;
    case 'resting':
      return `${name} hat gerade wohl viel um die Ohren. Du kannst es ${when ?? 'in ein paar Tagen'} wieder versuchen.`;
    case 'already_available':
      return 'Gerade erreichbar: ruf einfach an!';
    case 'too_many':
      return 'Für heute hast du genug angestupst.';
    case 'not_allowed':
      return 'Anstupsen geht nur bei Leuten, die dich auch in ihren Kontakten haben.';
    default:
      return 'Das hat leider nicht geklappt. Bitte versuche es später erneut.';
  }
}

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

  const remember = (to: string, nextAllowedAt: string | null | undefined) => {
    if (!nextAllowedAt) return;
    setNudges((current) => ({
      ...current,
      sent: [...current.sent.filter((n) => n.to !== to), { to, nextAllowedAt }],
    }));
  };

  const nudge = useCallback(async (phone: string, name: string) => {
    const firstName = name.split(' ')[0];
    try {
      const result = await sendNudge(phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      remember(phone, result.nextAllowedAt);
      return true;
    } catch (error: any) {
      remember(phone, error?.data?.nextAllowedAt);
      Alert.alert(`${firstName} anstupsen`, errorText(error?.code, firstName, error?.data?.nextAllowedAt));
      return false;
    }
  }, []);

  /** "Nicht jetzt": hides the card right away, tells the server */
  const dismiss = useCallback(
    (from?: string) => {
      setNudges((current) => ({
        ...current,
        received: from ? current.received.filter((n) => n.from !== from) : [],
      }));
      dismissNudges(from).catch(reload);
    },
    [reload]
  );

  /** When `phone` can be nudged again, or null if now */
  const nextNudge = useCallback(
    (phone: string) => {
      const entry = nudges.sent.find((n) => n.to === phone);
      return entry && new Date(entry.nextAllowedAt) > new Date() ? entry.nextAllowedAt : null;
    },
    [nudges.sent]
  );

  const nudged = useCallback((phone: string) => nextNudge(phone) !== null, [nextNudge]);

  return { received: nudges.received, nudged, nextNudge, nudge, dismiss, reload };
}
