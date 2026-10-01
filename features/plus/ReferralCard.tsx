import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Referral } from '../../services/planApi';
import { AppText, colors, GlassCard, spacing } from '../../ui';

type Props = { referral: Referral; onPress?: () => void; compact?: boolean };

/** Invite reward: progress towards the next free Plus days (a friend counts after the first call). */
export function ReferralCard({ referral, onPress, compact }: Props) {
  const { step, rewardDays, joined, toNext } = referral;
  const activated = referral.activated ?? joined;
  const done = step - (toNext ?? step);
  const months = rewardDays === 30 ? '1 Monat' : `${rewardDays} Tage`;
  const waiting = joined - activated;
  const text =
    joined === 0
      ? `Für je ${step} Leute, die über deine Einladung dazukommen und einmal telefonieren: ${months} Wanna yap+ geschenkt.`
      : `Noch ${toNext} ${toNext === 1 ? 'Person' : 'Leute'} bis zu ${months} Wanna yap+.` +
        (waiting > 0
          ? ` ${waiting === 1 ? 'Eine Person ist' : `${waiting} sind`} schon dabei und ${waiting === 1 ? 'zählt' : 'zählen'} nach dem ersten Gespräch.`
          : '');
  const body = (
    <GlassCard glow={compact ? undefined : colors.pink}>
      <View style={styles.row}>
        <Ionicons name="gift" size={22} color={colors.pink} />
        <View style={styles.texts}>
          <AppText variant="bodyStrong">Freunde mitbringen, Plus geschenkt</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {text}
          </AppText>
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
