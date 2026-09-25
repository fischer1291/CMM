import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { AlbumBadge, ShowcaseBadge } from '../../services/badgesApi';
import type { SharedStats } from '../../services/gamificationApi';
import { talkTime } from '../../services/gamificationApi';
import { AppText, Avatar, BadgeMedal, Button, colors, GlassCard, IconButton, PageHeader, Screen, SectionHeader, spacing } from '../../ui';
import { BadgeGrid } from '../album/AlbumView';

type Props = {
  name: string;
  avatarUrl: string | null;
  available: boolean;
  statusText: string;
  /** Your own time with this person (only you see it) */
  together: { seconds: number; talks: number } | null;
  /** Badges only the two of you share (only you see them) */
  friendshipBadges: AlbumBadge[];
  /** Up to three badges they chose to show */
  showcase: ShowcaseBadge[];
  shared: SharedStats | null;
  nudged: boolean;
  /** e.g. "morgen ab 9:00" when nudged */
  nextNudgeLabel?: string | null;
  onBack: () => void;
  onCall: (options: { video: boolean }) => void;
  onNudge: () => void;
  onMore: () => void;
};

/** A contact: call or nudge them, your time together, and their stats if they share them. */
export function FriendView({ name, avatarUrl, available, statusText, together, friendshipBadges, showcase, shared, nudged, nextNudgeLabel, onBack, onCall, onNudge, onMore }: Props) {
  const firstName = name.split(' ')[0];
  return (
    <Screen scroll>
      <PageHeader
        title=""
        onBack={onBack}
        right={<IconButton icon="ellipsis-horizontal" size={40} onPress={onMore} accessibilityLabel="Melden oder blockieren" />}
      />
      <View style={styles.hero}>
        <Avatar name={name} uri={avatarUrl} size={112} available={available} />
        <AppText variant="h1" center style={{ marginTop: spacing.lg }}>
          {name}
        </AppText>
        <AppText variant="caption" color={available ? colors.cyan : colors.textSecondary} center>
          {statusText}
        </AppText>
        {showcase.length > 0 ? (
          <View style={styles.showcase} accessibilityLabel={`Vitrine: ${showcase.map((b) => b.title).join(', ')}`}>
            {showcase.map((b) => (
              <View key={b.id} style={styles.showcaseItem}>
                <BadgeMedal icon={b.icon} earned tierName={b.tierName} size={40} />
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} center>
                  {b.title}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {available ? (
        <View style={styles.callButtons}>
          <Button title="Videoanruf" icon="videocam" onPress={() => onCall({ video: true })} style={{ flex: 1 }} />
          <Button title="Nur Audio" icon="call" variant="secondary" onPress={() => onCall({ video: false })} style={{ flex: 1 }} />
        </View>
      ) : (
        <Button
          title={nudged ? `Angestupst ✓ · wieder ${nextNudgeLabel ?? 'später'}` : `${firstName} anstupsen 👋`}
          variant="secondary"
          disabled={nudged}
          onPress={onNudge}
        />
      )}
      {!available && !nudged ? (
        <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.sm }}>
          {firstName} bekommt eine freundliche Nachricht, dass du gern sprechen würdest.
        </AppText>
      ) : null}

      {together && together.talks > 0 ? (
        <>
          <SectionHeader title="Eure Zeit" />
          <GlassCard>
            <View style={styles.together}>
              <Ionicons name="heart" size={22} color={colors.pink} />
              <View style={{ flex: 1 }}>
                <AppText variant="title">{talkTime(together.seconds)}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  in {together.talks === 1 ? 'einem Gespräch' : `${together.talks} Gesprächen`} · nur für dich sichtbar
                </AppText>
              </View>
            </View>
          </GlassCard>
          {friendshipBadges.length > 0 ? (
            <GlassCard style={{ marginTop: spacing.md }}>
              <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.md }}>
                Eure Abzeichen
              </AppText>
              <BadgeGrid badges={friendshipBadges} />
            </GlassCard>
          ) : null}
        </>
      ) : null}

      {shared ? (
        <>
          <SectionHeader title={`${firstName}s Gesprächszeit`} />
          <GlassCard>
            <View style={styles.sharedRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="h2" color={colors.cyan}>
                  {talkTime(shared.totals.weekSeconds)}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  diese Woche
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h2" color={colors.pink}>
                  {shared.streak.current}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {shared.streak.current === 1 ? 'Woche in Folge' : 'Wochen in Folge'}
                </AppText>
              </View>
            </View>
            {shared.badges.length > 0 ? (
              <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                {shared.badges.length === 1 ? '1 Abzeichen gesammelt' : `${shared.badges.length} Abzeichen gesammelt`}
              </AppText>
            ) : null}
          </GlassCard>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  callButtons: { flexDirection: 'row', gap: spacing.sm },
  together: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sharedRow: { flexDirection: 'row', gap: spacing.md },
  showcase: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  showcaseItem: { width: 72, alignItems: 'center', gap: spacing.xs },
});
