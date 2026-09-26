import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Avatar,
  Button,
  colors,
  GlassCard,
  radius,
  Screen,
  SectionHeader,
  spacing,
  StatusOrb,
  TAB_BAR_SPACE,
} from '../../ui';
import { DailyMomentCard } from './DailyMomentCard';
import { NextUpCard } from '../album/AlbumView';
import type { Album } from '../../services/badgesApi';

export type AvailableContact = { phone: string; name: string; avatarUrl: string | null };
export type ReceivedNudge = { from: string; name: string; avatarUrl: string | null };

type Props = {
  name: string;
  avatarUrl: string | null;
  available: boolean;
  onToggleAvailable: () => void;
  toggling?: boolean;
  /** Timed availability (session or schedule): share left (0..1) and caption */
  sessionProgress?: number | null;
  sessionCaption?: string | null;
  sessionOptions: { minutes: number; label: string }[];
  onStartSession: (minutes: number) => void;
  availableContacts: AvailableContact[];
  onCallContact: (phone: string) => void;
  nudges: ReceivedNudge[];
  week: { label: string; streak: number } | null;
  onOpenStats: () => void;
  /** Missed calls not yet seen in the call list */
  missedCalls?: number;
  onOpenCalls?: () => void;
  /** Notice from the admin console (components/NoticeBanner) */
  notice?: React.ReactNode;
  /** "Fast geschafft": the closest badge */
  nextUp?: Album['nextUp'];
  onOpenAlbum?: () => void;
  scheduleLabel: string | null;
  onOpenSchedule: () => void;
  onOpenProfile?: () => void;
  /** "Deine Kreise" (features/circles/CirclesStrip) */
  circlesStrip?: React.ReactNode;
  /** The daily Yap Moment while it runs */
  daily?: React.ComponentProps<typeof DailyMomentCard> | null;
  /** "Nicht jetzt" on the nudge card */
  onDismissNudges: () => void;
  /** Explain notifications before the system asks */
  showNotificationPrompt?: boolean;
  onAllowNotifications?: () => void;
  onDismissNotifications?: () => void;
};

function NotificationPrompt({ onAllow, onDismiss }: { onAllow?: () => void; onDismiss?: () => void }) {
  return (
    <GlassCard glow={colors.cyan} style={{ marginTop: spacing.xl }}>
      <View style={styles.nudgeRow}>
        <View style={[styles.linkIcon, { backgroundColor: `${colors.cyan}22` }]}>
          <Ionicons name="notifications" size={22} color={colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Erfahre, wann deine Leute Zeit haben</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Und verpasse keine Anrufe. Nachts ist Ruhe, und du bestimmst, was dich erreicht.
          </AppText>
        </View>
      </View>
      <View style={styles.promptActions}>
        <Button title="Später" variant="ghost" onPress={() => onDismiss?.()} style={{ flex: 1 }} />
        <Button title="Erlauben" onPress={() => onAllow?.()} style={{ flex: 1 }} />
      </View>
    </GlassCard>
  );
}

function NudgeCard({
  nudges,
  available,
  onCall,
  onStartSession,
  onDismiss,
}: {
  nudges: ReceivedNudge[];
  available: boolean;
  onCall: (phone: string) => void;
  onStartSession: () => void;
  onDismiss: () => void;
}) {
  const first = nudges[0];
  const others = nudges.length - 1;
  const who = others > 0 ? `${first.name.split(' ')[0]} und ${others} ${others === 1 ? 'weitere Person' : 'weitere'}` : first.name.split(' ')[0];
  return (
    <GlassCard glow={colors.pink} style={{ marginTop: spacing.xl }}>
      <View style={styles.nudgeRow}>
        <Avatar name={first.name} uri={first.avatarUrl} size={44} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">
            {who} {others > 0 ? 'würden' : 'würde'} gern mit dir sprechen 👋
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {available ? 'Du bist erreichbar: ruf doch einfach an.' : 'Kein Druck. Wenn es dir passt, schalte dich erreichbar.'}
          </AppText>
        </View>
        {/* Part of the row, so the card's rounded corner never cuts it */}
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Nicht jetzt, ausblenden"
          style={styles.nudgeClose}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      {available ? (
        <Button title={`${first.name.split(' ')[0]} anrufen`} icon="videocam" onPress={() => onCall(first.from)} style={{ marginTop: spacing.md }} />
      ) : (
        <Button title="30 Min. erreichbar" icon="flash" variant="secondary" onPress={onStartSession} style={{ marginTop: spacing.md }} />
      )}
    </GlassCard>
  );
}

function LinkCard({ icon, accent, title, text, onPress, right }: { icon: keyof typeof Ionicons.glyphMap; accent: string; title: string; text: string; onPress: () => void; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <GlassCard>
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: `${accent}22` }]}>
            <Ionicons name={icon} size={22} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{title}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {text}
            </AppText>
          </View>
          {right}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

/** Home screen: own availability, who else has time, and gentle nudges towards real talks. */
export function StatusView({
  name,
  avatarUrl,
  available,
  onToggleAvailable,
  toggling,
  sessionProgress,
  sessionCaption,
  sessionOptions,
  onStartSession,
  availableContacts,
  onCallContact,
  nudges,
  week,
  onOpenStats,
  missedCalls = 0,
  onOpenCalls,
  notice,
  nextUp,
  onOpenAlbum,
  scheduleLabel,
  onOpenSchedule,
  onOpenProfile,
  onDismissNudges,
  circlesStrip,
  daily,
  showNotificationPrompt,
  onAllowNotifications,
  onDismissNotifications,
}: Props) {
  const firstName = name.split(' ')[0] || 'du';
  const match = available && availableContacts.length > 0;

  return (
    <Screen scroll contentStyle={{ paddingBottom: TAB_BAR_SPACE }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.textMuted}>
            {available ? 'Online' : 'Offline'}
          </AppText>
          <AppText variant="h1">Hey {firstName}</AppText>
        </View>
        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Profil">
          <Avatar name={name || '?'} uri={avatarUrl} size={48} />
        </Pressable>
      </View>

      {notice}

      {daily ? <DailyMomentCard {...daily} /> : null}

      <View style={styles.orb}>
        <StatusOrb
          available={available}
          onToggle={onToggleAvailable}
          disabled={toggling}
          progress={sessionProgress}
          caption={sessionCaption}
        />
        <AppText variant="body" color={colors.textSecondary} center style={styles.hint}>
          {available
            ? 'Deine Kontakte sehen, dass du gerade Zeit für einen Anruf hast.'
            : 'Tippe, wenn du Zeit für ein echtes Gespräch hast.'}
        </AppText>
        {!available && (
          <View style={styles.sessions}>
            <AppText variant="caption" color={colors.textMuted}>
              Oder nur für eine Weile:
            </AppText>
            <View style={styles.sessionRow}>
              {sessionOptions.map((option) => (
                <Pressable
                  key={option.minutes}
                  onPress={() => onStartSession(option.minutes)}
                  disabled={toggling}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} erreichbar`}
                  style={({ pressed }) => [styles.session, pressed && styles.sessionPressed]}
                >
                  <AppText variant="bodyStrong">{option.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {circlesStrip}

      {showNotificationPrompt && <NotificationPrompt onAllow={onAllowNotifications} onDismiss={onDismissNotifications} />}

      {missedCalls > 0 && onOpenCalls ? (
        <View style={{ marginTop: spacing.xl }}>
          <LinkCard
            icon="call"
            accent={colors.danger}
            title={missedCalls === 1 ? '1 verpasster Anruf' : `${missedCalls} verpasste Anrufe`}
            text="Schau, wer es versucht hat, und ruf zurück"
            onPress={onOpenCalls}
          />
        </View>
      ) : null}

      {nudges.length > 0 && (
        <NudgeCard
          nudges={nudges}
          available={available}
          onCall={onCallContact}
          onStartSession={() => onStartSession(30)}
          onDismiss={onDismissNudges}
        />
      )}

      <SectionHeader title={match ? 'Ihr habt gerade beide Zeit ✨' : 'Jetzt erreichbar'} />
      {availableContacts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Let the avatars' glow spill over instead of being clipped
          style={styles.peopleScroll}
          contentContainerStyle={styles.people}
        >
          {availableContacts.map((c) => (
            <Pressable
              key={c.phone}
              onPress={() => onCallContact(c.phone)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} anrufen`}
              style={styles.person}
            >
              <Avatar name={c.name} uri={c.avatarUrl} size={64} available />
              <AppText variant="caption" numberOfLines={1} style={styles.personName}>
                {c.name.split(' ')[0]}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <GlassCard>
          <AppText variant="bodyStrong">Gerade ist niemand erreichbar</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Sobald jemand aus deinen Kontakten Zeit hat, taucht er hier auf.
          </AppText>
        </GlassCard>
      )}

      <SectionHeader title="Für dich" />
      <View style={styles.links}>
        {nextUp && onOpenAlbum ? <NextUpCard nextUp={nextUp} onPress={onOpenAlbum} /> : null}
        <LinkCard
          icon="pulse"
          accent={colors.pink}
          title={week ? `${week.label} diese Woche` : 'Deine Gesprächszeit'}
          text="Zeit mit deinen Menschen, Serie und Abzeichen"
          onPress={onOpenStats}
          right={
            week && week.streak > 0 ? (
              <View style={styles.streak} accessibilityLabel={`${week.streak} Wochen in Folge`}>
                <Ionicons name="flame" size={14} color={colors.pink} />
                <AppText variant="caption" color={colors.pink}>
                  {week.streak}
                </AppText>
              </View>
            ) : null
          }
        />
        <LinkCard
          icon="calendar"
          accent={colors.cyan}
          title="Zeitplan"
          text={scheduleLabel ? `Automatisch erreichbar: ${scheduleLabel}` : 'Leg fest, wann du automatisch erreichbar bist'}
          onPress={onOpenSchedule}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  orb: { alignItems: 'center', marginTop: spacing.xxl },
  hint: { marginTop: spacing.lg, maxWidth: 300 },
  sessions: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, alignSelf: 'stretch' },
  sessionRow: { flexDirection: 'row', gap: spacing.sm },
  session: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  sessionPressed: { backgroundColor: 'rgba(0,229,255,0.18)', borderColor: colors.cyan },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nudgeClose: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  peopleScroll: { overflow: 'visible', marginHorizontal: -spacing.xl },
  people: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  person: { alignItems: 'center', width: 72 },
  personName: { marginTop: spacing.sm, maxWidth: 72 },
  links: { gap: spacing.md },
  promptActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,46,147,0.14)',
  },
});
