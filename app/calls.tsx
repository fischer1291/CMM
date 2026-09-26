import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { useNewCall } from '../contexts/NewCallContext';
import { CallsView } from '../features/calls/CallsView';
import { CallEntry, fetchCalls, markCallsSeen } from '../services/callsApi';

export default function CallsScreen() {
  const router = useRouter();
  const { userPhone } = useAuth();
  const { find } = useContacts();
  const { startVideoCall } = useNewCall();
  const [calls, setCalls] = useState<CallEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await fetchCalls();
      setCalls(data.calls);
      // Opening the list counts as seen (also clears the badge elsewhere)
      if (data.unseenMissed) markCallsSeen().catch(() => {});
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const person = (entry: CallEntry) => {
    const contact = find(entry.otherPhone);
    return { name: contact?.name || entry.otherName || entry.otherPhone, avatarUrl: contact?.avatarUrl ?? entry.otherAvatarUrl ?? null };
  };

  return (
    <CallsView
      calls={calls}
      error={error}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      onBack={() => router.back()}
      person={person}
      onOpen={(entry) => router.push({ pathname: '/friend', params: { phone: entry.otherPhone } })}
      onCallBack={(entry) => userPhone && startVideoCall(entry.otherPhone, userPhone, { video: entry.video })}
    />
  );
}
