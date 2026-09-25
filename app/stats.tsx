import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useContacts } from '../contexts/ContactsContext';
import { PeoplePicker } from '../features/stats/PeoplePicker';
import { StatsView } from '../features/stats/StatsView';
import { fetchStats, saveSharing, Sharing, Stats, Visibility } from '../services/gamificationApi';

export default function StatsScreen() {
  const router = useRouter();
  const { contacts } = useContacts();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sharing, setSharing] = useState<Sharing>({ visibility: 'private', sharedWith: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [picking, setPicking] = useState(false);
  const [savingSharing, setSavingSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchStats();
      setStats(data.stats);
      setSharing(data.sharing);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const registered = useMemo(
    () => contacts.filter((c) => c.registered).map(({ phone, name, avatarUrl }) => ({ phone, name, avatarUrl })),
    [contacts]
  );

  const person = useCallback(
    (phone: string) => {
      const contact = contacts.find((c) => c.phone === phone);
      return { name: contact?.name || phone, avatarUrl: contact?.avatarUrl ?? null };
    },
    [contacts]
  );

  const updateSharing = async (next: Sharing) => {
    const previous = sharing;
    setSharing(next);
    setSavingSharing(true);
    try {
      await saveSharing(next);
    } catch {
      setSharing(previous);
      Alert.alert('Nicht gespeichert', 'Deine Freigabe konnte nicht geändert werden.');
    } finally {
      setSavingSharing(false);
    }
  };

  const changeVisibility = (visibility: Visibility) => {
    if (visibility === sharing.visibility) return;
    updateSharing({ visibility, sharedWith: visibility === 'selected' ? sharing.sharedWith : [] });
    if (visibility === 'selected' && sharing.sharedWith.length === 0) setPicking(true);
  };

  return (
    <>
      <StatsView
        stats={stats}
        sharing={sharing}
        loading={loading}
        error={error}
        onRetry={load}
        onBack={() => router.back()}
        onOpenAlbum={() => router.push('/album')}
        person={person}
        onChangeVisibility={changeVisibility}
        onPickPeople={() => setPicking(true)}
        savingSharing={savingSharing}
      />
      {picking && (
        <PeoplePicker
          title="Wer darf deine Statistik sehen?"
          people={registered}
          initial={sharing.sharedWith}
          onCancel={() => setPicking(false)}
          onDone={(phones) => {
            setPicking(false);
            updateSharing({ visibility: 'selected', sharedWith: phones });
          }}
        />
      )}
    </>
  );
}
