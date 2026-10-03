import React, { useState } from 'react';
import { Linking, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Contact, useContacts } from '../../contexts/ContactsContext';
import { useNewCall } from '../../contexts/NewCallContext';
import { useRouter } from 'expo-router';
import { useNudges } from '../../hooks/useNudges';
import { useNudgeComposer } from '../../hooks/useNudgeComposer';
import { useMissedCalls } from '../../hooks/useMissedCalls';
import { inviteText } from '../../content/links';
import { recordInvites } from '../../services/socialApi';
import { ContactsView } from '../../features/contacts/ContactsView';
import { ReferralCard } from '../../features/plus/ReferralCard';
import { usePlan } from '../../contexts/PlanContext';
import { showReferral } from '../../services/planApi';


export default function ContactsScreen() {
  const { userPhone, userProfile } = useAuth();
  const { contacts, loading, permissionDenied, refresh } = useContacts();
  const { startVideoCall } = useNewCall();
  const router = useRouter();
  const { nudge, nudged } = useNudges();
  const composer = useNudgeComposer(nudge);
  const missed = useMissedCalls();
  const { plan } = usePlan();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh({ askPermission: true });
    setRefreshing(false);
  };

  const invite = (contact: Contact) => {
    // Remembered (as a hash): when they sign up, you're connected right away
    recordInvites([contact.phone]).catch(() => {});
    const text = inviteText(userProfile?.name?.split(' ')[0], userProfile?.inviteCode);
    // SMS to that contact; the share sheet if SMS isn't available (e.g. iPad)
    Linking.openURL(`sms:${contact.phone}&body=${encodeURIComponent(text)}`).catch(() => Share.share({ message: text }));
  };

  return (
    <>
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
        onNudge={(contact) => composer.start(contact.phone, contact.name)}
        onOpenCalls={() => router.push('/calls')}
        missedCalls={missed.count}
        nudged={nudged}
        referral={showReferral(plan) ? <ReferralCard referral={plan.referral} compact /> : null}
      />
      {composer.sheet}
    </>
  );
}
