import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { useNewCall } from '../contexts/NewCallContext';
import { FriendView } from '../features/contacts/FriendView';
import { useNudges } from '../hooks/useNudges';
import { useSafetyMenu } from '../hooks/useSafetyMenu';
import { fetchSharedStats, fetchStats, nextNudgeLabel, SharedStats } from '../services/gamificationApi';
import { formatLastSeen } from '../utils/time';

export default function FriendScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { userPhone } = useAuth();
  const { contacts } = useContacts();
  const { startVideoCall } = useNewCall();
  const { nudge, nudged, nextNudge } = useNudges();
  const safety = useSafetyMenu();
  const [shared, setShared] = useState<SharedStats | null>(null);
  const [together, setTogether] = useState<{ seconds: number; talks: number } | null>(null);

  const contact = contacts.find((c) => c.phone === phone);

  useEffect(() => {
    if (!phone) return;
    fetchSharedStats(phone)
      .then((result) => setShared(result?.stats ?? null))
      .catch(() => {});
    fetchStats()
      .then(({ stats }) => {
        const entry = stats.people.find((p) => p.phone === phone);
        if (entry) setTogether({ seconds: entry.seconds, talks: entry.talks });
      })
      .catch(() => {});
  }, [phone]);

  if (!phone) return null;
  const name = contact?.name || phone;
  const available = !!contact?.isAvailable;
  const seen = formatLastSeen(contact?.lastOnline ?? null);

  return (
    <FriendView
      name={name}
      avatarUrl={contact?.avatarUrl ?? null}
      available={available}
      statusText={available ? 'Jetzt erreichbar' : seen ? `Zuletzt erreichbar ${seen}` : 'Gerade offline'}
      together={together}
      shared={shared}
      nudged={nudged(phone)}
      nextNudgeLabel={nextNudge(phone) ? nextNudgeLabel(nextNudge(phone)!) : null}
      onBack={() => router.back()}
      onCall={({ video }) => userPhone && startVideoCall(phone, userPhone, { video })}
      onNudge={() => nudge(phone, name)}
      onMore={() => safety.open({ phone, name }, () => router.back())}
    />
  );
}
