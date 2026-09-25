import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CircleSummary } from '../../services/circlesApi';
import { AppText, colors, radius, spacing, WarmthRing } from '../../ui';

/** What's going on in a circle, in a few words. */
export function circleStatus(circle: CircleSummary, myPhone: string | null): { text: string; hot: boolean } {
  const inRoom = circle.room?.participants.length ?? 0;
  if (circle.room && inRoom > 0) return { text: `Runde läuft · ${inRoom} drin`, hot: true };
  const available = circle.members.filter((m) => m.phone !== myPhone && m.isAvailable).length;
  if (available > 0) return { text: available === 1 ? '1 hat gerade Zeit' : `${available} haben gerade Zeit`, hot: true };
  if (circle.warmth.goalReached) return { text: 'Wochenziel erreicht ✨', hot: false };
  if (circle.warmth.minutes > 0) return { text: `${circle.warmth.minutes} Min. diese Woche`, hot: false };
  return { text: circle.members.length === 1 ? 'Lade jemanden ein' : `${circle.members.length} Mitglieder`, hot: false };
}

/** Compact card for the status screen: warmth ring, name, what's happening. */
export function CircleCard({ circle, myPhone, onPress }: { circle: CircleSummary; myPhone: string | null; onPress: () => void }) {
  const status = circleStatus(circle, myPhone);
  const progress = circle.warmth.memberCount > 1 ? circle.warmth.talkedCount / circle.warmth.memberCount : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${circle.name}: ${status.text}`}
      style={({ pressed }) => [styles.card, status.hot && styles.cardHot, pressed && { opacity: 0.85 }]}
    >
      <WarmthRing emoji={circle.emoji} value={progress} size={56} full={circle.warmth.goalReached} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
        {circle.name}
      </AppText>
      <View style={styles.statusRow}>
        {status.hot && <View style={styles.dot} />}
        <AppText variant="caption" numberOfLines={1} color={status.hot ? colors.cyan : colors.textSecondary}>
          {status.text}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardHot: { borderColor: 'rgba(0,229,255,0.5)' },
  name: { marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
});
