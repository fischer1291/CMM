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
import { UnlockCelebration } from '../features/moments/UnlockCelebration';
import { ProfileSetupView } from '../features/profile/ProfileSetupView';
import { ProfileView } from '../features/profile/ProfileView';
import { MomentComposer } from '../features/moments/MomentComposer';
import { StatusView } from '../features/status/StatusView';
import { StatsView } from '../features/stats/StatsView';
import { AlbumView, BadgeSheet } from '../features/album/AlbumView';
import { BadgeCelebration } from '../components/BadgeCelebration';
import { ForceUpdate } from '../components/ForceUpdate';
import { NoticeBanner } from '../components/NoticeBanner';
import { SupportView, TicketView } from '../features/support/SupportView';
import type { SupportTicket } from '../services/supportApi';
import type { Album, AlbumBadge } from '../services/badgesApi';
import { ScheduleView } from '../features/schedule/ScheduleView';
import { FriendView } from '../features/contacts/FriendView';
import { NotificationsView } from '../features/notifications/NotificationsView';
import { BannerCard } from '../components/InAppBanner';
import { LegalView } from '../features/legal/LegalView';
import { CirclesView } from '../features/circles/CirclesView';
import { CircleView } from '../features/circles/CircleView';
import { RoomView } from '../features/circles/RoomView';
import { CirclesStrip } from '../features/circles/CirclesStrip';
import type { CircleDetail, CircleSummary } from '../services/circlesApi';
import { PRIVACY_SECTIONS } from '../content/legal';
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
      <AppText variant="display">Wanna yap?</AppText>
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
  onDismissNudges: () => {},
};

const BADGE = (id: string, title: string, earned: boolean, progress = 1, icon = 'star', tierName: string | null = null) => ({ id, title, description: '', earned, progress, icon, tierName });
const TIERS = ['Bronze', 'Silber', 'Gold'];
const AB = (id: string, category: string, icon: string, title: string, description: string, tier: number, tiers: number, progress: number, secret = false): AlbumBadge => ({
  id,
  category,
  icon: secret && !tier ? 'help' : icon,
  title: secret && !tier ? 'Geheim' : title,
  description,
  secret,
  tier,
  tiers,
  tierName: tiers > 1 && tier ? TIERS[tier - 1] : null,
  earned: tier > 0,
  progress,
  current: Math.round(progress * 10),
  next: tier === tiers ? null : 10,
});
const ALBUM_BADGES: AlbumBadge[] = [
  AB('first_talk', 'connection', 'chatbubbles', 'Erstes Gespräch', 'Dein erstes echtes Gespräch', 1, 1, 1),
  AB('talks', 'connection', 'call', 'Gesprächig', '50 Gespräche geführt', 1, 3, 0.46),
  AB('people', 'connection', 'people', 'Menschenfreund', 'Mit 15 Menschen gesprochen', 1, 3, 0.6),
  AB('reunion', 'connection', 'refresh', 'Wiedersehen', 'Nach 30 Tagen wieder gesprochen', 0, 3, 0.4),
  AB('bridge', 'connection', 'git-merge', 'Brückenbauer', 'Jemanden in die App geholt', 0, 3, 0),
  AB('deep_talk', 'depth', 'water', 'Tiefgang', '30 Minuten am Stück gesprochen', 1, 1, 1),
  AB('marathon', 'depth', 'infinite', 'Marathon', '90 Minuten am Stück', 0, 1, 0.3, true),
  AB('hours', 'depth', 'hourglass', 'Zeit geschenkt', '10 Stunden Gesprächszeit', 2, 3, 0.25),
  AB('streak', 'rituals', 'flame', 'Dranbleiber', '12 Wochen in Folge', 1, 3, 0.25),
  AB('planner', 'rituals', 'calendar', 'Planer', 'Einen Zeitplan angelegt', 1, 1, 1),
  AB('daily', 'rituals', 'sunny', 'Moment-Mensch', 'Beim Yap Moment dabei', 1, 3, 0.3),
  AB('blitz', 'rituals', 'flash', 'Blitzschnell', 'In der ersten Minute dabei', 1, 1, 1, true),
  AB('founder', 'circles', 'add-circle', 'Gründer', 'Einen Kreis gegründet', 1, 1, 1),
  AB('host', 'circles', 'mic', 'Gastgeber', '10 Runden eröffnet', 0, 3, 0.5),
  AB('together', 'circles', 'people-circle', 'Zusammen', '4 Runden mit deinem Kreis', 3, 3, 1),
  AB('full_house', 'circles', 'home', 'Volles Haus', 'Alle in einer Runde', 0, 1, 0, true),
  AB('storyteller', 'discover', 'sparkles', 'Erzähler', 'Einen Moment geteilt', 1, 3, 0.1),
  AB('night_owl', 'discover', 'moon', 'Nachteule', 'Ein Gespräch nach 23 Uhr', 1, 1, 1, true),
  AB('early_bird', 'discover', 'partly-sunny', 'Frühaufsteher', 'Vor 7 Uhr', 0, 1, 0, true),
];
const SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: 't1',
    category: 'bug',
    status: 'answered',
    unread: true,
    messages: [
      { from: 'user', text: 'Wenn die App geschlossen ist, klingelt es bei mir nicht.', at: '2026-09-24T18:02:00Z' },
      { from: 'support', text: 'Danke dir! Schau bitte in Einstellungen → Mitteilungen, ob „Anrufe“ erlaubt ist. Wir haben außerdem einen Fix in Build 21.', at: '2026-09-25T08:15:00Z' },
    ],
    createdAt: '2026-09-24T18:02:00Z',
    updatedAt: '2026-09-25T08:15:00Z',
  },
  {
    id: 't2',
    category: 'idea',
    status: 'open',
    unread: false,
    messages: [{ from: 'user', text: 'Kreise mit eigenem Chat wären cool', at: '2026-09-20T10:00:00Z' }],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },  {
    id: 't3',
    category: 'account',
    status: 'closed',
    unread: false,
    messages: [
      { from: 'user', text: 'Wie ändere ich mein Profilbild?', at: '2026-09-18T09:00:00Z' },
      { from: 'support', text: 'Tippe im Profil auf dein Bild, dann kannst du ein neues wählen.', at: '2026-09-18T12:00:00Z' },
    ],
    createdAt: '2026-09-18T09:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
    closedAt: '2026-09-18T12:00:00Z',
  },
];
const SAMPLE_ALBUM: Album = {
  categories: [
    { id: 'connection', title: 'Verbindung' },
    { id: 'depth', title: 'Tiefe' },
    { id: 'rituals', title: 'Rituale' },
    { id: 'circles', title: 'Kreise' },
    { id: 'discover', title: 'Entdecken' },
  ],
  badges: ALBUM_BADGES,
  new: [],
  nextUp: { id: 'talks', icon: 'call', title: 'Gesprächig', progress: 0.84, hint: 'Noch 2 Gespräche bis Gesprächig (Silber)' },
  showcase: ['together', 'deep_talk', 'night_owl'],
};
const FRIEND_BADGES: AlbumBadge[] = [
  AB('f_talks', 'friendship', 'chatbubbles', 'Plaudertaschen', '10 Gespräche zu zweit', 1, 3, 0.6),
  AB('f_time', 'friendship', 'heart', 'Herzenszeit', '5 Stunden zusammen', 1, 3, 0.66),
  AB('f_streak', 'friendship', 'flame', 'Wie verabredet', '4 Wochen in Folge', 1, 3, 0.4),
  AB('f_year', 'friendship', 'gift', 'Ein Jahr', 'Seit einem Jahr in Kontakt', 0, 1, 0.9),
];
const SHOWCASE = [
  { id: 'together', title: 'Zusammen', icon: 'people-circle', tierName: 'Gold' },
  { id: 'deep_talk', title: 'Tiefgang', icon: 'water', tierName: null },
  { id: 'streak', title: 'Dranbleiber', icon: 'flame', tierName: 'Silber' },
];
const STATS: Stats = {
  totals: { weekSeconds: 57 * 60, lastWeekSeconds: 80 * 60, monthSeconds: 4 * 3600 + 10 * 60, allTimeSeconds: 12 * 3600, talks: 23, longestSeconds: 48 * 60 },
  weeks: [20, 0, 45, 80, 30, 95, 80, 57].map((m, i) => ({ week: new Date(Date.UTC(2026, 7, 3 + i * 7)).toISOString().slice(0, 10), seconds: m * 60 })),
  streak: { current: 3, best: 4 },
  badges: [
    BADGE('first_talk', 'Erstes Gespräch', true, 1, 'chatbubbles'),
    BADGE('deep_talk', 'Tiefgang', true, 1, 'water'),
    BADGE('hours', 'Zeit geschenkt', true, 1, 'hourglass', 'Silber'),
    BADGE('talks', 'Gesprächig', true, 1, 'call', 'Bronze'),
    BADGE('together', 'Zusammen', true, 1, 'people-circle', 'Gold'),
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

const MEMBER = (phone: string, name: string, isAvailable = false) => ({ phone, name, avatarUrl: '', isAvailable, availableUntil: null });
const SAMPLE_CIRCLES: CircleSummary[] = [
  {
    id: 'c1',
    name: 'Familie Fischer',
    emoji: '🏡',
    createdBy: '+490',
    members: [MEMBER('+490', 'Leroy'), MEMBER('+491', 'Anna Berg', true), MEMBER('+493', 'Mama', true)],
    invitedCount: 1,
    warmth: { minutes: 84, talkedCount: 2, memberCount: 3, goalReached: false },
    room: { id: 'r1', channel: 'room_x', participants: ['+491', '+493'] },
    ritual: { enabled: true, day: 0, start: 18 * 60 },
  },
  {
    id: 'c2',
    name: 'Enge Freunde',
    emoji: '💛',
    createdBy: '+490',
    members: [MEMBER('+490', 'Leroy'), MEMBER('+492', 'Ben Koch'), MEMBER('+494', 'Clara')],
    invitedCount: 0,
    warmth: { minutes: 45, talkedCount: 3, memberCount: 3, goalReached: true },
    room: null,
    ritual: { enabled: false, day: 0, start: 18 * 60 },
  },
];
const SAMPLE_CIRCLE_DETAIL: CircleDetail = {
  ...SAMPLE_CIRCLES[0],
  room: null,
  code: 'K7M2Q9XA',
  invites: [
    { phone: '+495', name: 'Papa', status: 'pending', pendingSignup: false },
    { phone: '+496', name: 'Oma', status: 'draft', pendingSignup: false },
  ],
  moments: [
    { id: 'm1', screenshot: MOMENTS[0].screenshot, userPhone: '+491', targetPhone: '+493', mood: '😊', timestamp: new Date().toISOString() },
  ],
  badges: [
    AB('c_goal', 'circle', 'flag', 'Wochenziel', '4 Wochen alle gesprochen', 1, 3, 0.5),
    AB('c_rooms', 'circle', 'mic', 'Rundenzeit', '10 Runden', 1, 3, 0.3),
    AB('c_ritual', 'circle', 'repeat', 'Ritual', 'Eine Ritual-Runde', 1, 1, 1),
    AB('c_all', 'circle', 'home', 'Alle da', 'Alle in einer Runde', 0, 1, 0.66),
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
      onOpenAlbum={() => {}}
      onOpenSupport={() => {}}
      onOpenSchedule={() => {}}
      onInvite={() => {}}
      onExportData={() => {}}
      onOpenPrivacy={() => {}}
      onOpenImprint={() => {}}
      onOpenCircles={() => {}}
      onOpenBlocked={() => {}}
      onSignOut={() => {}}
      onDeleteAccount={() => {}}
      version="1.0.0"
    />
  ),
  moments: () => (
    <MomentsView
      moments={MOMENTS}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      onReact={() => {}}
      person={person}
      onGoToContacts={() => {}}
      requestCount={1}
      waitingCount={1}
      locked
      lockedCount={3}
      onOpenRequests={() => {}}
      onOpenMemories={() => {}}
    />
  ),
  'moments-locked': () => (
    <MomentsView
      moments={[]}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      onReact={() => {}}
      person={person}
      onGoToContacts={() => {}}
      requestCount={0}
      waitingCount={0}
      locked
      lockedCount={2}
      lockedMoments={[
        { id: 'l1', userPhone: '+491', userName: 'Anna Berg', targetPhone: '+492', targetName: 'Ben Koch', screenshot: MOMENTS[0].screenshot, timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
        { id: 'l2', userPhone: '+493', userName: 'Clara', targetPhone: '+491', targetName: 'Anna', screenshot: null, timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
      ]}
      unlock={{ unlocked: false, via: null, streak: 4, best: 6, total: 20 }}
      onOpenRequests={() => {}}
      onOpenMemories={() => {}}
    />
  ),
  unlock: () => <UnlockCelebration screenshot={MOMENTS[0].screenshot} count={3} streak={5} via="talk" onDone={() => {}} />,
  'moments-empty': () => (
    <MomentsView
      moments={[]}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      onReact={() => {}}
      person={person}
      onGoToContacts={() => {}}
      requestCount={0}
      waitingCount={0}
      locked
      lockedCount={3}
      onOpenRequests={() => {}}
      onOpenMemories={() => {}}
    />
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
  circles: () => (
    <CirclesView
      circles={SAMPLE_CIRCLES}
      invites={[{ circleId: 'c9', name: 'Uni-Crew', emoji: '🎓', memberCount: 4, invitedBy: '+492', invitedByName: 'Ben Koch' }]}
      audience={{ mode: 'circles', circles: ['c1'] }}
      myPhone="+490"
      onBack={() => {}}
      onOpen={() => {}}
      onNew={() => {}}
      onJoinCode={() => {}}
      onAnswerInvite={() => {}}
      onChangeAudience={() => {}}
    />
  ),
  circle: () => (
    <CircleView
      circle={SAMPLE_CIRCLE_DETAIL}
      myPhone="+490"
      person={(phone, name) => ({ name: name || 'Jemand', avatarUrl: phone === '+491' ? PHOTO : null })}
      busy={false}
      onBack={() => {}}
      onMore={() => {}}
      onRoom={() => {}}
      onCall={() => {}}
      onInvite={() => {}}
      onShareLink={() => {}}
      onSendDrafts={() => {}}
      onSaveRitual={() => {}}
    />
  ),
  room: () => (
    <RoomView
      title="🏡 Familie Fischer"
      duration="12:04"
      connecting={false}
      micMuted={false}
      cameraOn
      tiles={[
        { key: 'me', name: 'Leroy', avatarUrl: null, video: <FakeVideo />, speaking: false, isMe: true },
        { key: '1', name: 'Anna Berg', avatarUrl: PHOTO, video: null, speaking: true, isMe: false },
        { key: '2', name: 'Mama', avatarUrl: null, video: null, speaking: false, isMe: false },
      ]}
      onToggleMute={() => {}}
      onToggleCamera={() => {}}
      onSwitchCamera={() => {}}
      onLeave={() => {}}
    />
  ),
  support: () => <SupportView tickets={SAMPLE_TICKETS} sending={false} onBack={() => {}} onSend={async () => true} onOpen={() => {}} version="1.0.0 (21)" />,
  'ticket-closed': () => <TicketView ticket={SAMPLE_TICKETS[2]} sending={false} onBack={() => {}} onReply={async () => true} />,
  ticket: () => <TicketView ticket={SAMPLE_TICKETS[0]} sending={false} onBack={() => {}} onReply={async () => true} />,
  'force-update': () => <ForceUpdate updateUrl="https://testflight.apple.com/join/abc" />,
  album: () => <AlbumView album={SAMPLE_ALBUM} error={false} onRetry={() => {}} onBack={() => {}} onSelect={() => {}} />,
  'album-sheet': () => (
    <>
      <AlbumView album={SAMPLE_ALBUM} error={false} onRetry={() => {}} onBack={() => {}} onSelect={() => {}} />
      <BadgeSheet badge={ALBUM_BADGES[1]} pinned={false} canPin onTogglePin={() => {}} onClose={() => {}} />
    </>
  ),
  celebration: () => (
    <>
      <AlbumView album={SAMPLE_ALBUM} error={false} onRetry={() => {}} onBack={() => {}} onSelect={() => {}} />
      <BadgeCelebration badges={[ALBUM_BADGES[7], ALBUM_BADGES[17]]} onOpenAlbum={() => {}} onDone={() => {}} />
    </>
  ),
  'status-circles': () => (
    <StatusView
      {...statusProps}
      available={false}
      availableContacts={[]}
      nudges={[]}
      nextUp={SAMPLE_ALBUM.nextUp}
      onOpenAlbum={() => {}}
      notice={<NoticeBanner banner={{ text: 'Heute ab 22 Uhr kurze Wartung, Anrufe können kurz ausfallen.', level: 'warning', until: null }} />}
      circlesStrip={
        <CirclesStrip
          circles={SAMPLE_CIRCLES}
          invites={[{ circleId: 'c9', name: 'Uni-Crew', emoji: '🎓', memberCount: 4, invitedBy: '+492', invitedByName: 'Ben Koch' }]}
          myPhone="+490"
          onOpen={() => {}}
          onNew={() => {}}
          onAnswerInvite={() => {}}
          onSeeAll={() => {}}
        />
      }
    />
  ),
  'friend-available': () => (
    <FriendView
      name="Anna Berg"
      avatarUrl={PHOTO}
      available
      statusText="Jetzt erreichbar"
      together={{ seconds: 3 * 3600 + 20 * 60, talks: 7 }}
      friendshipBadges={FRIEND_BADGES}
      showcase={SHOWCASE}
      shared={null}
      nudged={false}
      onBack={() => {}}
      onCall={() => {}}
      onNudge={() => {}}
      onMore={() => {}}
    />
  ),
  datenschutz: () => <LegalView title="Datenschutz" sections={PRIVACY_SECTIONS} onBack={() => {}} />,
  'status-daily': () => (
    <StatusView
      {...statusProps}
      available
      availableContacts={PEOPLE.slice(0, 2)}
      nudges={[]}
      daily={{
        endsAt: new Date(Date.now() + 7 * 60 * 1000 + 32 * 1000).toISOString(),
        joined: true,
        participants: PEOPLE.slice(0, 3),
        onJoin: () => {},
        onCall: () => {},
        onSurprise: () => {},
      }}
    />
  ),
  'status-daily-open': () => (
    <StatusView
      {...statusProps}
      available={false}
      availableContacts={[]}
      nudges={[]}
      daily={{
        endsAt: new Date(Date.now() + 9 * 60 * 1000).toISOString(),
        joined: false,
        participants: [],
        onJoin: () => {},
        onCall: () => {},
        onSurprise: () => {},
      }}
    />
  ),
  'status-prompt': () => (
    <StatusView {...statusProps} available={false} availableContacts={PEOPLE.slice(0, 2)} nudges={[]} showNotificationPrompt />
  ),
  notifications: () => (
    <NotificationsView
      permission="granted"
      prefs={{ available: true, nudges: true, moments: false, dailyMoment: true, quietHours: { enabled: false, start: 22 * 60, end: 8 * 60 } }}
      onBack={() => {}}
      onAllow={() => {}}
      onOpenSettings={() => {}}
      onChange={() => {}}
      recent={[
        { type: 'contact_available', about: '+491', result: 'sent', app: 'background', delivery: 'delivered', at: new Date().toISOString() },
        { type: 'contact_available', about: '+491', result: 'throttled', app: 'closed', delivery: null, at: new Date(Date.now() - 60000).toISOString() },
        { type: 'nudge', about: '+492', result: 'in_app', app: 'foreground', delivery: null, at: new Date(Date.now() - 60 * 60000).toISOString() },
        { type: 'moment_shared', about: '+492', result: 'quiet_hours', app: 'closed', delivery: null, at: new Date(Date.now() - 26 * 3600000).toISOString() },
      ]}
      nameOf={(phone) => (phone === '+491' ? 'Anna' : 'Ben')}
    />
  ),
  'notifications-denied': () => (
    <NotificationsView
      permission="denied"
      prefs={{ available: false, nudges: true, moments: true, dailyMoment: false, quietHours: { enabled: false, start: 22 * 60, end: 8 * 60 } }}
      onBack={() => {}}
      onAllow={() => {}}
      onOpenSettings={() => {}}
      onChange={() => {}}
      recent={[]}
      nameOf={() => 'Jemand'}
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
      onOpenAlbum={() => {}}
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
      friendshipBadges={FRIEND_BADGES}
      showcase={SHOWCASE}
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
      onMore={() => {}}
    />
  ),
};

const SECTIONS: Record<string, () => React.ReactElement> = {
  components: Components,
  banners: () => (
    <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
      <BannerCard name="Anna Berg" avatarUrl={PHOTO} kind="available" onPress={() => {}} onAction={() => {}} />
      <BannerCard name="Ben Koch" avatarUrl={null} kind="nudge" onPress={() => {}} onAction={() => {}} />
      <BannerCard name="Clara Diaz" avatarUrl={null} kind="joined" onPress={() => {}} onAction={() => {}} />
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
