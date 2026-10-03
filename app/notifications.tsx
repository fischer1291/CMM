import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsView } from '../features/notifications/NotificationsView';
import { useContacts } from '../contexts/ContactsContext';
import {
  fetchNotificationPrefs,
  fetchRecentNotifications,
  NotificationPrefs,
  RecentPush,
  saveNotificationPrefs,
  saveRematch,
} from '../services/notificationPrefs';
import PushTokenService, { PermissionState } from '../services/PushTokenService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { userPhone, userProfile, reloadProfile } = useAuth();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [recent, setRecent] = useState<RecentPush[]>([]);
  const { find, refresh: refreshContacts } = useContacts();
  // Re-match (plan 2.13): shown as saved, the profile is the source
  const [rematch, setRematch] = useState<boolean | undefined>(userProfile?.rematchOptIn);
  useEffect(() => setRematch(userProfile?.rematchOptIn), [userProfile?.rematchOptIn]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Also after returning from the system settings
  useFocusEffect(
    useCallback(() => {
      PushTokenService.permission().then(setPermission);
      fetchRecentNotifications()
        .then(setRecent)
        .catch(() => {});
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

  const changeRematch = async (optIn: boolean) => {
    const previous = rematch;
    setRematch(optIn);
    try {
      setRematch(await saveRematch(optIn));
      // The hashes are stored with the next sync: run it now (asks for the
      // contacts permission if it was never asked)
      if (optIn) refreshContacts({ askPermission: true }).catch(() => {});
      reloadProfile();
    } catch {
      setRematch(previous);
      Alert.alert('Nicht gespeichert', 'Deine Einstellung konnte nicht gespeichert werden.');
    }
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
      recent={recent}
      nameOf={(phone) => find(phone)?.name.split(' ')[0] || 'Jemand'}
      rematch={rematch}
      onRematchChange={changeRematch}
    />
  );
}
