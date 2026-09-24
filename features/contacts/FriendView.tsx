import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedStats } from '../../services/gamificationApi';
import { talkTime } from '../../services/gamificationApi';
import { AppText, Avatar, Button, colors, glow, GlassCard, gradients, PageHeader, Screen, SectionHeader, spacing } from '../../ui';

type Props = {
  name: string;
  avatarUrl: string | null;
  available: boolean;
  statusText: string;
  /** Your own time with this person (only you see it) */
  together: { seconds: number; talks: number } | null;
  shared: SharedStats | null;
  nudged: boolean;
  onBack: () => void;
  onCall: () => void;
  onNudge: () => void;
};

/** A contact: call or nudge them, your time together, and their stats if they share them. */
export function FriendView({ name, avatarUrl, available, statusText, together, shared, nudged, onBack, onCall, onNudge }: Props) {
  const firstName = name.split(' ')[0];
  return (
    <Screen scroll>
      <PageHeader title="" onBack={onBack} />
      <View style={styles.hero}>
        <Avatar name={name} uri={avatarUrl} size={112} available={available} />
        <AppText variant="h1" center style={{ marginTop: spacing.lg }}>
          {name}
        </AppText>
        <AppText variant="caption" color={available ? colors.cyan : colors.textSecondary} center>
          {statusText}
        </AppText>
      </View>

      {available ? (
        <Button title={`${firstName} anrufen`} icon="videocam" onPress={onCall} />
      ) : (
        <Button
          title={nudged ? 'Heute schon angestupst' : `${firstName} anstupsen 👋`}
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
              <View style={styles.badges}>
                {shared.badges.map((b) => (
                  <View key={b.id} style={[styles.badge, glow(colors.pink, 0.3)]}>
                    <LinearGradient colors={gradients.brandSoft} style={StyleSheet.absoluteFill} />
                    <AppText variant="caption">{b.title}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassCard>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  together: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sharedRow: { flexDirection: 'row', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
