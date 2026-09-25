import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { useNewCall } from '../contexts/NewCallContext';
import { FriendView } from '../features/contacts/FriendView';
import { useNudges } from '../hooks/useNudges';
import { useSafetyMenu } from '../hooks/useSafetyMenu';
import { fetchFriendship, Friendship } from '../services/badgesApi';
import { fetchSharedStats, nextNudgeLabel, SharedStats } from '../services/gamificationApi';
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
  const [friendship, setFriendship] = useState<Friendship | null>(null);

  const contact = contacts.find((c) => c.phone === phone);

  useEffect(() => {
    if (!phone) return;
    fetchSharedStats(phone)
      .then((result) => setShared(result?.stats ?? null))
      .catch(() => {});
    fetchFriendship(phone)
      .then(setFriendship)
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
      together={friendship?.together ?? null}
      friendshipBadges={friendship?.badges ?? []}
      showcase={friendship?.showcase ?? []}
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
