import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import { Moment, toggleReaction } from '../../features/moments/model';
import { MomentsView } from '../../features/moments/MomentsView';
import { apiFetch, apiPostJson } from '../../utils/api';

export default function MomentsScreen() {
  const router = useRouter();
  const { userPhone, userProfile } = useAuth();
  const { find } = useContacts();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/moment/callmoments', {}, 10000);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMoments(
        (data.callMoments ?? []).map((m: any) => ({
          ...m,
          id: m._id ?? m.id,
          reactions: m.reactions ?? [],
          totalReactions: m.totalReactions ?? 0,
        }))
      );
    } catch {
      Alert.alert('Keine Verbindung', 'Moments konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const react = async (momentId: string, emoji: string) => {
    const before = moments;
    setMoments((prev) => prev.map((m) => (m.id === momentId ? toggleReaction(m, emoji) : m)));
    try {
      const res = await apiPostJson('/moment/react', { momentId, userPhone, emoji }, 10000);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      // Server state wins (other people may have reacted meanwhile)
      setMoments((prev) =>
        prev.map((m) =>
          m.id === momentId ? { ...m, reactions: data.reactions ?? [], totalReactions: data.totalReactions ?? 0 } : m
        )
      );
    } catch {
      setMoments(before);
    }
  };

  // Own moments show the own profile; others the address book name
  const person = (phone: string, fallbackName: string) => {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    if (normalized === userPhone) {
      return { name: userProfile?.name || 'Du', avatarUrl: userProfile?.avatarUrl || null };
    }
    const contact = find(normalized);
    return { name: contact?.name || fallbackName || 'Unbekannt', avatarUrl: contact?.avatarUrl ?? null };
  };

  return (
    <MomentsView
      moments={moments}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      onReact={react}
      person={person}
      onGoToContacts={() => router.push('/(tabs)/contacts')}
    />
  );
}
