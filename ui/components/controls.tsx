import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Switch, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

/** Title row with a back button, for screens pushed on top of the tabs. */
export function PageHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurück" style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <AppText variant="title" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </AppText>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

type SegmentOption<T extends string | number> = { value: T; label: string };

/** Row of pill options, one selected (e.g. 15 / 30 / 60 minutes). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <AppText variant="bodyStrong" color={selected ? colors.bg : colors.textSecondary}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const DAY = 24 * 60;
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Time of day in minutes with − / + buttons (long press: one hour).
 * `wrap` lets it run past midnight, e.g. for quiet hours.
 */
export function TimeStepper({
  label,
  value,
  onChange,
  step = 15,
  min = 0,
  max = DAY - step,
  wrap,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  wrap?: boolean;
}) {
  const move = (delta: number) => {
    const next = wrap ? (((value + delta) % DAY) + DAY) % DAY : Math.min(max, Math.max(min, value + delta));
    if (next !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(next);
    }
  };
  return (
    <View style={styles.stepper}>
      <AppText variant="label" color={colors.textMuted}>
        {label}
      </AppText>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => move(-step)} onLongPress={() => move(-60)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${label} früher`} style={styles.stepButton}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" style={styles.stepValue} accessibilityLabel={`${label} ${clock(value)}`}>
          {clock(value)}
        </AppText>
        <Pressable onPress={() => move(step)} onLongPress={() => move(60)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${label} später`} style={styles.stepButton}>
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** Labelled on/off switch in the app's colors. */
export function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceStrong, true: colors.cyan }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.surfaceStrong}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: { flex: 1 },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  segmented: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.cyan },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: { flex: 1, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  stepValue: { fontVariant: ['tabular-nums'] },
});
