/**
 * Development-only component gallery. app/_layout.tsx renders it instead of
 * the app when the preview control server says so (see previewControl.ts).
 * Not a route, so it can't be reached by a link.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { CallView, localPreviewStyle } from '../features/call/CallView';
import { OnboardingView } from '../features/auth/OnboardingView';
import { VerifyView } from '../features/auth/VerifyView';
import { ContactsView } from '../features/contacts/ContactsView';
import { MomentsView } from '../features/moments/MomentsView';
import { ProfileSetupView } from '../features/profile/ProfileSetupView';
import { ProfileView } from '../features/profile/ProfileView';
import { MomentComposer } from '../features/moments/MomentComposer';
import { StatusView } from '../features/status/StatusView';
import { BadgeGrid, StatsView } from '../features/stats/StatsView';
import { ScheduleView } from '../features/schedule/ScheduleView';
import { FriendView } from '../features/contacts/FriendView';
import { NotificationsView } from '../features/notifications/NotificationsView';
import type { Stats } from '../services/gamificationApi';
import { fetchPreviewState, PreviewState } from './previewControl';
import {
  AppText,
  Avatar,
  Button,
  Chip,
  colors,
  EmptyState,
  GlassCard,
  IconButton,
  Screen,
  SectionHeader,
  spacing,
  StatusOrb,
} from '../ui';

const PHOTO = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop';

function Components() {
  const [available, setAvailable] = useState(true);
  return (
    <>
      <AppText variant="display">Call Me Maybe</AppText>
      <AppText variant="h1">Heading 1</AppText>
      <AppText variant="h2">Heading 2</AppText>
      <AppText variant="title">Title</AppText>
      <AppText>Body – wer ist gerade erreichbar?</AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        Caption text
      </AppText>

      <SectionHeader title="Status" />
      <View style={{ alignItems: 'center' }}>
        <StatusOrb available={available} onToggle={() => setAvailable((a) => !a)} progress={0.62} caption={available ? '09:18 übrig' : null} />
      </View>

      <SectionHeader title="Avatare" />
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        <Avatar name="Anna Berg" uri={PHOTO} size={72} available />
        <Avatar name="Ben Koch" size={72} available={false} />
        <Avatar name="Carl" size={56} />
        <Avatar name="Dana Lee" size={44} available />
      </View>

      <SectionHeader title="Buttons" />
      <View style={{ gap: spacing.md }}>
        <Button title="Jetzt erreichbar sein" icon="flash" onPress={() => {}} />
        <Button title="Sekundär" variant="secondary" onPress={() => {}} />
        <Button title="Auflegen" variant="danger" icon="call" onPress={() => {}} />
        <Button title="Lädt" loading onPress={() => {}} />
        <Button title="Ghost" variant="ghost" onPress={() => {}} />
      </View>

      <SectionHeader title="Icon-Buttons" />
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <IconButton icon="mic-off" accessibilityLabel="Stumm" onPress={() => {}} active />
        <IconButton icon="camera-reverse" accessibilityLabel="Kamera" onPress={() => {}} />
        <IconButton icon="call" accessibilityLabel="Auflegen" color={colors.danger} onPress={() => {}} />
      </View>

      <SectionHeader title="Karten & Chips" />
      <GlassCard glow={colors.cyan}>
        <AppText variant="title">Glas-Karte</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Mit Blur, Rand und Neon-Glow.
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Chip label="erreichbar" color={colors.cyan} icon="radio-button-on" />
          <Chip label="😊 gut drauf" color={colors.pink} />
        </View>
      </GlassCard>

      <EmptyState icon="people-outline" title="Noch niemand da" text="Lade Freunde ein, um loszulegen." />
    </>
  );
}

/** Section and scroll position from the local preview control server. */
function usePreviewControl(): PreviewState {
  const [state, setState] = useState<PreviewState>({});
  useEffect(() => {
    const timer = setInterval(() => {
      fetchPreviewState().then((next) => {
        if (next) setState((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      });
    }, 700);
    return () => clearInterval(timer);
  }, []);
  return state;
}

const PEOPLE = [
  { phone: '+491', name: 'Anna Berg', avatarUrl: PHOTO },
  { phone: '+492', name: 'Ben Koch', avatarUrl: null },
  { phone: '+493', name: 'Clara Diaz', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop' },
  { phone: '+494', name: 'David', avatarUrl: null },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const CONTACTS = [
  { phone: '+491', name: 'Anna Berg', avatarUrl: PHOTO, registered: true, isAvailable: true, lastOnline: null },
  { phone: '+493', name: 'Clara Diaz', avatarUrl: PEOPLE[2].avatarUrl, registered: true, isAvailable: true, lastOnline: null },
  { phone: '+492', name: 'Ben Koch', avatarUrl: null, registered: true, isAvailable: false, lastOnline: hoursAgo(2) },
  { phone: '+495', name: 'Emil Wagner', avatarUrl: null, registered: true, isAvailable: false, lastOnline: hoursAgo(30) },
  { phone: '+496', name: 'Mama', avatarUrl: null, registered: false, isAvailable: false, lastOnline: null },
  { phone: '+497', name: 'Zahnarzt Dr. Weber', avatarUrl: null, registered: false, isAvailable: false, lastOnline: null },
];

const callProps = {
  name: 'Anna Berg',
  avatarUrl: PHOTO,
  duration: '04:12',
  quality: 'good' as const,
  micMuted: false,
  onToggleMute: () => {},
  onSwitchCamera: () => {},
  onCapture: () => {},
  onHangup: () => {},
};

/** Stand-in for the Agora video: a photo full screen, own camera as a tile. */
function FakeVideo() {
  return (
    <>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&fit=crop' }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={localPreviewStyle(59)}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&fit=crop' }} style={StyleSheet.absoluteFill} />
      </View>
    </>
  );
}

/** Full-screen previews render outside the gallery's ScrollView. */
const verifyProps = {
  phone: '0160 93181888',
  onPhoneChange: () => {},
  onSubmitPhone: () => {},
  code: '4821',
  onCodeChange: () => {},
  onSubmitCode: () => {},
  sentTo: '+4916093181888',
  resendIn: 17,
  onResend: () => {},
  onChangeNumber: () => {},
  loading: false,
};

const MOMENTS = [
  {
    id: 'm1',
    userPhone: '+491',
    userName: 'Anna Berg',
    targetPhone: '+49self',
    targetName: 'Leroy',
    screenshot: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&fit=crop',
    note: 'Endlich mal wieder richtig gelacht 😄',
    mood: '😂 albern',
    callDuration: '23:41',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    reactions: [
      { emoji: '❤️', count: 4, userReacted: true },
      { emoji: '😂', count: 2, userReacted: false },
    ],
    totalReactions: 6,
  },
];
const person = (phone: string, name: string) => ({ name, avatarUrl: phone === '+491' ? PHOTO : null });

const statusProps = {
  name: 'Leroy Fischer',
  avatarUrl: null,
  onToggleAvailable: () => {},
  sessionOptions: [
    { minutes: 15, label: '15 Min.' },
    { minutes: 30, label: '30 Min.' },
    { minutes: 60, label: '1 Std.' },
  ],
  onStartSession: () => {},
  onCallContact: () => {},
  week: { label: '57 Min.', streak: 3 },
  onOpenStats: () => {},
  scheduleLabel: 'Heute 18:00',
  onOpenSchedule: () => {},
};

const BADGE = (id: string, title: string, earned: boolean, progress = 1) => ({ id, title, description: '', earned, progress });
const STATS: Stats = {
  totals: { weekSeconds: 57 * 60, lastWeekSeconds: 80 * 60, monthSeconds: 4 * 3600 + 10 * 60, allTimeSeconds: 12 * 3600, talks: 23, longestSeconds: 48 * 60 },
  weeks: [20, 0, 45, 80, 30, 95, 80, 57].map((m, i) => ({ week: new Date(Date.UTC(2026, 7, 3 + i * 7)).toISOString().slice(0, 10), seconds: m * 60 })),
  streak: { current: 3, best: 4 },
  badges: [
    BADGE('first_talk', 'Erstes Gespräch', true),
    BADGE('deep_talk', 'Tiefgang', true),
    BADGE('hour', 'Eine Stunde', true),
    BADGE('ten_talks', 'Zehn Gespräche', true),
    BADGE('streak_4', 'Dranbleiber', false, 0.75),
    BADGE('circle', 'Dein Kreis', false, 0.6),
    BADGE('ten_hours', 'Zehn Stunden', false, 0.4),
    BADGE('planner', 'Planer', true),
    BADGE('storyteller', 'Erzähler', false, 0),
  ],
  people: [
    { phone: '+491', seconds: 5 * 3600 + 12 * 60, talks: 9 },
    { phone: '+492', seconds: 3 * 3600, talks: 6 },
    { phone: '+493', seconds: 95 * 60, talks: 4 },
  ],
};

const SCREENS: Record<string, () => React.ReactElement> = {
  composer: () => (
    <MomentComposer
      visible
      onClose={() => {}}
      onPost={() => {}}
      screenshotUri={MOMENTS[0].screenshot}
      userPhone="+49self"
      userName="Leroy"
      targetPhone="+491"
      targetName="Anna"
      callDuration="23:41"
    />
  ),
  profile: () => (
    <ProfileView
      name="Leroy Fischer"
      phone="+4916093181888"
      avatarUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&fit=crop"
      uploadingAvatar={false}
      onChangeAvatar={() => {}}
      onSaveName={async () => {}}
      onOpenSystemSettings={() => {}}
      onOpenNotifications={() => {}}
      onOpenStats={() => {}}
      onOpenSchedule={() => {}}
      onInvite={() => {}}
      onSignOut={() => {}}
      version="1.0.0"
    />
  ),
  moments: () => (
    <MomentsView moments={MOMENTS} loading={false} refreshing={false} onRefresh={() => {}} onReact={() => {}} person={person} onGoToContacts={() => {}} />
  ),
  'moments-empty': () => (
    <MomentsView moments={[]} loading={false} refreshing={false} onRefresh={() => {}} onReact={() => {}} person={person} onGoToContacts={() => {}} />
  ),
  onboarding: () => <OnboardingView onStart={() => {}} />,
  'verify-phone': () => <VerifyView {...verifyProps} step="phone" reverify />,
  'verify-code': () => <VerifyView {...verifyProps} step="code" />,
  'profile-setup': () => (
    <ProfileSetupView name="Leroy" onNameChange={() => {}} avatarUri={null} onPickAvatar={() => {}} onSave={() => {}} onSkip={() => {}} saving={false} />
  ),
  'call-ringing': () => <CallView {...callProps} phase="ringing" hasRemoteVideo={false} />,
  'call-connected': () => <CallView {...callProps} phase="connected" hasRemoteVideo videoLayer={<FakeVideo />} />,
  'call-ended': () => <CallView {...callProps} phase="ended" statusText="Anna hat abgelehnt" hasRemoteVideo={false} />,
  'call-muted': () => <CallView {...callProps} micMuted phase="connected" hasRemoteVideo videoLayer={<FakeVideo />} quality="poor" />,
  contacts: () => (
    <ContactsView
      contacts={CONTACTS}
      query=""
      onQueryChange={() => {}}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      permissionDenied={false}
      onRequestPermission={() => {}}
      onCall={() => {}}
      onInvite={() => {}}
      onOpen={() => {}}
      onNudge={() => {}}
      nudged={(phone) => phone === CONTACTS[2]?.phone}
    />
  ),
  'contacts-denied': () => (
    <ContactsView
      contacts={[]}
      query=""
      onQueryChange={() => {}}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      permissionDenied
      onRequestPermission={() => {}}
      onCall={() => {}}
      onInvite={() => {}}
      onOpen={() => {}}
      onNudge={() => {}}
      nudged={(phone) => phone === CONTACTS[2]?.phone}
    />
  ),
  'status-on': () => (
    <StatusView
      {...statusProps}
      available
      sessionProgress={0.62}
      sessionCaption="18:37 übrig"
      availableContacts={PEOPLE}
      nudges={[{ from: '+491', name: 'Anna Berg', avatarUrl: PHOTO }]}
    />
  ),
  'status-off': () => (
    <StatusView {...statusProps} available={false} availableContacts={[]} nudges={[]} week={null} scheduleLabel={null} />
  ),
  'status-nudged': () => (
    <StatusView
      {...statusProps}
      available={false}
      availableContacts={PEOPLE.slice(0, 1)}
      nudges={[
        { from: '+491', name: 'Anna Berg', avatarUrl: PHOTO },
        { from: '+492', name: 'Ben Koch', avatarUrl: null },
      ]}
    />
  ),
  'status-prompt': () => (
    <StatusView {...statusProps} available={false} availableContacts={PEOPLE.slice(0, 2)} nudges={[]} showNotificationPrompt />
  ),
  notifications: () => (
    <NotificationsView
      permission="undetermined"
      prefs={{ available: true, nudges: true, moments: false, quietHours: { enabled: true, start: 22 * 60, end: 8 * 60 } }}
      onBack={() => {}}
      onAllow={() => {}}
      onOpenSettings={() => {}}
      onChange={() => {}}
    />
  ),
  'notifications-denied': () => (
    <NotificationsView
      permission="denied"
      prefs={{ available: false, nudges: true, moments: true, quietHours: { enabled: false, start: 22 * 60, end: 8 * 60 } }}
      onBack={() => {}}
      onAllow={() => {}}
      onOpenSettings={() => {}}
      onChange={() => {}}
    />
  ),
  stats: () => (
    <StatsView
      stats={STATS}
      sharing={{ visibility: 'selected', sharedWith: ['+491', '+492'] }}
      loading={false}
      error={false}
      onRetry={() => {}}
      onBack={() => {}}
      person={(phone) => ({ name: phone === '+491' ? 'Anna Berg' : phone === '+492' ? 'Ben Koch' : 'Mama', avatarUrl: phone === '+491' ? PHOTO : null })}
      onChangeVisibility={() => {}}
      onPickPeople={() => {}}
    />
  ),
  schedule: () => (
    <ScheduleView
      enabled
      slots={[
        { day: 1, start: 18 * 60, end: 20 * 60 },
        { day: 3, start: 12 * 60, end: 13 * 60 },
        { day: 3, start: 18 * 60, end: 20 * 60 },
        { day: 6, start: 10 * 60, end: 12 * 60 },
      ]}
      loading={false}
      saving={false}
      dirty
      nextLabel="Heute 18:00"
      onBack={() => {}}
      onToggle={() => {}}
      onAdd={() => {}}
      onRemove={() => {}}
      onSave={() => {}}
    />
  ),
  friend: () => (
    <FriendView
      name="Anna Berg"
      avatarUrl={PHOTO}
      available={false}
      statusText="Zuletzt erreichbar vor 2 Std."
      together={{ seconds: 3 * 3600 + 20 * 60, talks: 7 }}
      shared={{
        totals: { weekSeconds: 42 * 60, monthSeconds: 5 * 3600, allTimeSeconds: 20 * 3600 },
        streak: { current: 5, best: 7 },
        badges: [
          { id: 'first_talk', title: 'Erstes Gespräch', description: '' },
          { id: 'deep_talk', title: 'Tiefgang', description: '' },
          { id: 'streak_4', title: 'Dranbleiber', description: '' },
        ],
      }}
      nudged={false}
      onBack={() => {}}
      onCall={() => {}}
      onNudge={() => {}}
    />
  ),
};

const SECTIONS: Record<string, () => React.ReactElement> = {
  components: Components,
  badges: () => (
    <View style={{ marginTop: spacing.xl }}>
      <BadgeGrid badges={STATS.badges} />
    </View>
  ),
};

export function DevPreview() {
  const { section = 'components', scrollY = 0 } = usePreviewControl();
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: scrollY, animated: false });
  }, [scrollY, section]);

  const FullScreen = SCREENS[section];
  if (FullScreen) return <FullScreen />;

  const Section = SECTIONS[section] ?? Components;
  return (
    <Screen>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <AppText variant="label" color={colors.cyan} style={{ marginTop: spacing.lg }}>
          Dev preview · {section}
        </AppText>
        <Section />
      </ScrollView>
    </Screen>
  );
}
