import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsView } from '../features/notifications/NotificationsView';
import { fetchNotificationPrefs, NotificationPrefs, saveNotificationPrefs } from '../services/notificationPrefs';
import PushTokenService, { PermissionState } from '../services/PushTokenService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { userPhone } = useAuth();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Also after returning from the system settings
  useFocusEffect(
    useCallback(() => {
      PushTokenService.permission().then(setPermission);
    }, [])
  );

  useEffect(() => {
    fetchNotificationPrefs()
      .then((loaded) => {
        lastSaved.current = loaded;
        setPrefs(loaded);
      })
      .catch(() => Alert.alert('Nicht geladen', 'Deine Einstellungen konnten nicht geladen werden.'));
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Steppers fire quickly: collect changes and save once the user pauses
  const pending = useRef<Partial<NotificationPrefs>>({});
  const lastSaved = useRef<NotificationPrefs | null>(null);
  const change = (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    if (!lastSaved.current) lastSaved.current = prefs;
    pending.current = { ...pending.current, ...patch };
    setPrefs({ ...prefs, ...patch });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const changes = pending.current;
      pending.current = {};
      try {
        lastSaved.current = await saveNotificationPrefs(changes);
      } catch {
        if (lastSaved.current) setPrefs(lastSaved.current);
        Alert.alert('Nicht gespeichert', 'Deine Einstellung konnte nicht gespeichert werden.');
      }
    }, 500);
  };

  const allow = async () => {
    if (!userPhone) return;
    setPermission(await PushTokenService.requestAndRegister(userPhone));
  };

  return (
    <NotificationsView
      permission={permission}
      prefs={prefs}
      onBack={() => router.back()}
      onAllow={allow}
      onOpenSettings={() => Linking.openSettings()}
      onChange={change}
    />
  );
}
