import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

/** Small uppercase heading above a group of content. */
export function SectionHeader({ title, right, style }: { title: string; right?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <AppText variant="label" color={colors.textMuted}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

/** Pill-shaped tag, e.g. a mood or a status. */
export function Chip({ label, color = colors.textSecondary, icon }: { label: string; color?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      {icon && <Ionicons name={icon} size={14} color={color} />}
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}

/** Centered placeholder for empty lists. */
export function EmptyState({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.textSecondary} />
      </View>
      <AppText variant="title" center>
        {title}
      </AppText>
      {text ? (
        <AppText variant="caption" color={colors.textSecondary} center>
          {text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
