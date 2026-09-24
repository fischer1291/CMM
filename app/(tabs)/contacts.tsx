import React, { useState } from 'react';
import { Linking, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Contact, useContacts } from '../../contexts/ContactsContext';
import { useNewCall } from '../../contexts/NewCallContext';
import { useRouter } from 'expo-router';
import { useNudges } from '../../hooks/useNudges';
import { ContactsView } from '../../features/contacts/ContactsView';

const INVITE_TEXT = 'Hey! Ich nutze Call Me Maybe – da siehst du, wann ich Zeit für einen Anruf habe. Lad sie dir runter, dann können wir quatschen!';

export default function ContactsScreen() {
  const { userPhone } = useAuth();
  const { contacts, loading, permissionDenied, refresh } = useContacts();
  const { startVideoCall } = useNewCall();
  const router = useRouter();
  const { nudge, nudged } = useNudges();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh({ askPermission: true });
    setRefreshing(false);
  };

  const invite = (contact: Contact) => {
    // SMS to that contact; the share sheet if SMS isn't available (e.g. iPad)
    Linking.openURL(`sms:${contact.phone}&body=${encodeURIComponent(INVITE_TEXT)}`).catch(() =>
      Share.share({ message: INVITE_TEXT })
    );
  };

  return (
    <ContactsView
      contacts={contacts}
      query={query}
      onQueryChange={setQuery}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      permissionDenied={permissionDenied}
      onRequestPermission={() => refresh({ askPermission: true })}
      onCall={(phone) => userPhone && startVideoCall(phone, userPhone)}
      onInvite={invite}
      onOpen={(contact) => router.push({ pathname: '/friend', params: { phone: contact.phone } })}
      onNudge={(contact) => nudge(contact.phone, contact.name)}
      nudged={nudged}
    />
  );
}
