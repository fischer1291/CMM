import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Referral } from '../../services/planApi';
import { AppText, colors, GlassCard, spacing } from '../../ui';

type Props = { referral: Referral; onPress?: () => void; compact?: boolean };

/**
 * The card's lines: what the reward is or how far it is, who is in already,
 * and, while the two-sided experiment runs (plan 2.12), that both of a pair
 * get Plus after their first talk. Warm, no pressure: a friend who has not
 * talked yet is just "dabei".
 */
export function referralLines(referral: Referral): { text: string; stats: string | null; pair: string | null } {
  const { step, rewardDays, joined, toNext, activated } = referral;
  const months = rewardDays === 30 ? '1 Monat' : `${rewardDays} Tage`;
  const pair = referral.twoSided ? `Nach eurem ersten Gespräch bekommt ihr beide ${referral.pairDays ?? 7} Tage Plus geschenkt.` : null;
  if (joined === 0) {
    return { text: `Für je ${step} Leute, die über deine Einladung dazukommen und einmal telefonieren: ${months} Wanna yap+ geschenkt.`, stats: null, pair };
  }
  return {
    pair,
    text: `Noch ${toNext} ${toNext === 1 ? 'Person' : 'Leute'} bis zu ${months} Wanna yap+.`,
    // An older server leaves activated out: then only say who joined
    stats:
      activated === undefined
        ? `${joined} beigetreten`
        : activated === 0
          ? `${joined} beigetreten · noch niemand hat telefoniert`
          : `${joined} beigetreten · ${activated} ${activated === 1 ? 'hat' : 'haben'} schon telefoniert`,
  };
}

/** Invite reward: progress towards the next free Plus days (a friend counts after the first call). */
export function ReferralCard({ referral, onPress, compact }: Props) {
  const { step, toNext } = referral;
  const done = step - (toNext ?? step);
  const { text, stats, pair } = referralLines(referral);
  const body = (
    <GlassCard glow={compact ? undefined : colors.pink}>
      <View style={styles.row}>
        <Ionicons name="gift" size={22} color={colors.pink} />
        <View style={styles.texts}>
          <AppText variant="bodyStrong">Freunde mitbringen, Plus geschenkt</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {text}
          </AppText>
          {stats ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {stats}
            </AppText>
          ) : null}
          {pair ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {pair}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.dots} accessibilityLabel={`${done} von ${step}`}>
        {Array.from({ length: step }, (_, i) => (
          <View key={i} style={[styles.dot, i < done && styles.dotOn]} />
        ))}
      </View>
    </GlassCard>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.md, marginLeft: 22 + spacing.md },
  dot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong },
  dotOn: { backgroundColor: colors.pink },
});
