import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import CallMeMomentPrompt from '../../components/CallMeMomentPrompt';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import { useNewCall } from '../../contexts/NewCallContext';
import { StatusView } from '../../features/status/StatusView';
import { useCallHistory } from '../../hooks/useCallHistory';
import { useCountdown } from '../../hooks/useCountdown';
import { weekStats } from '../../services/callsApi';
import { apiFetch, apiPostJson } from '../../utils/api';

/** A Call Me Moment lasts 15 minutes (backend MOMENT_DURATION_MS). */
const MOMENT_SECONDS = 15 * 60;

export default function StatusScreen() {
  const router = useRouter();
  const { userPhone, userProfile, reloadProfile } = useAuth();
  const { contacts } = useContacts();
  const { startVideoCall } = useNewCall();
  const { calls } = useCallHistory();

  const [available, setAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const { formatted: countdown, remaining } = useCountdown(userProfile?.momentActiveUntil ?? null);
  const momentActive = available && remaining > 0;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/status/get', {}, 10000);
      const data = await res.json();
      if (typeof data?.isAvailable === 'boolean') setAvailable(data.isAvailable);
    } catch {
      // keep the last known state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      reloadProfile();
    }, [fetchStatus, reloadProfile])
  );

  // A Call Me Moment push (tap or while open) opens the mood prompt
  useEffect(() => {
    const isMoment = (n: Notifications.Notification) => n.request.content.data?.type === 'callMeMoment';
    const responseSub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (isMoment(r.notification)) setShowPrompt(true);
    });
    const receiveSub = Notifications.addNotificationReceivedListener((n) => {
      if (isMoment(n)) setShowPrompt(true);
    });
    return () => {
      responseSub.remove();
      receiveSub.remove();
    };
  }, []);

  const toggleAvailable = async () => {
    const next = !available;
    setAvailable(next); // optimistic
    setToggling(true);
    try {
      const res = await apiPostJson('/status/set', { phone: userPhone, isAvailable: next }, 10000);
      if (!res.ok) throw new Error(String(res.status));
      reloadProfile();
    } catch {
      setAvailable(!next);
      Alert.alert('Nicht gespeichert', 'Dein Status konnte nicht geändert werden. Bitte versuche es erneut.');
    } finally {
      setToggling(false);
    }
  };

  const availableContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.registered && c.isAvailable)
        .map(({ phone, name, avatarUrl }) => ({ phone, name, avatarUrl })),
    [contacts]
  );

  const stats = useMemo(() => weekStats(calls), [calls]);

  return (
    <>
      {showPrompt && userPhone && (
        <CallMeMomentPrompt
          phone={userPhone}
          onClose={() => {
            setShowPrompt(false);
            fetchStatus();
            reloadProfile();
          }}
        />
      )}
      <StatusView
        name={userProfile?.name || ''}
        avatarUrl={userProfile?.avatarUrl || null}
        available={available}
        onToggleAvailable={toggleAvailable}
        toggling={toggling}
        momentProgress={momentActive ? remaining / MOMENT_SECONDS : null}
        momentRemaining={momentActive ? countdown : null}
        availableContacts={availableContacts}
        onCallContact={(phone) => userPhone && startVideoCall(phone, userPhone)}
        stats={stats}
        onOpenProfile={() => router.push('/(tabs)/settings')}
      />
    </>
  );
}
