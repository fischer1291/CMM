import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Slot } from '../../services/gamificationApi';
import { clock, WEEK_ORDER, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../../services/gamificationApi';
import { AppText, Button, colors, GlassCard, PageHeader, radius, Screen, SectionHeader, spacing, Toggle } from '../../ui';

const STEP = 15;
const PRESETS: { label: string; days: number[]; start: number; end: number }[] = [
  { label: 'Feierabend', days: [1, 2, 3, 4, 5], start: 18 * 60, end: 20 * 60 },
  { label: 'Mittagspause', days: [1, 2, 3, 4, 5], start: 12 * 60, end: 13 * 60 },
  { label: 'Wochenende', days: [6, 0], start: 10 * 60, end: 12 * 60 },
];

type Props = {
  enabled: boolean;
  slots: Slot[];
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  nextLabel: string | null;
  onBack: () => void;
  onToggle: (enabled: boolean) => void;
  onAdd: (days: number[], start: number, end: number) => void;
  onRemove: (slot: Slot) => void;
  onSave: () => void;
};

function TimeStepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
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
        <Pressable onPress={() => step(-STEP)} onLongPress={() => step(-60)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${label} früher`} style={styles.stepButton}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="h2" style={styles.stepValue} accessibilityLabel={`${label} ${clock(value)}`}>
          {clock(value)}
        </AppText>
        <Pressable onPress={() => step(STEP)} onLongPress={() => step(60)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${label} später`} style={styles.stepButton}>
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

/** Mounted while open, so every opening starts fresh. */
function AddSlotSheet({ onClose, onAdd, initialDay }: { onClose: () => void; onAdd: Props['onAdd']; initialDay: number | null }) {
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<number[]>(initialDay === null ? [] : [initialDay]);
  const [start, setStart] = useState(18 * 60);
  const [end, setEnd] = useState(20 * 60);

  const toggleDay = (day: number) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="h2">Zeitfenster hinzufügen</AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setDays(p.days);
                setStart(p.start);
                setEnd(p.end);
              }}
              accessibilityRole="button"
              style={styles.preset}
            >
              <AppText variant="caption">
                {p.label} · {clock(p.start)}–{clock(p.end)}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        <AppText variant="label" color={colors.textMuted}>
          Tage
        </AppText>
        <View style={styles.days}>
          {WEEK_ORDER.map((day) => {
            const selected = days.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={WEEKDAYS_LONG[day]}
                style={[styles.day, selected && styles.dayActive]}
              >
                <AppText variant="bodyStrong" color={selected ? colors.bg : colors.textSecondary}>
                  {WEEKDAYS_SHORT[day]}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.times}>
          <TimeStepper
            label="Von"
            value={start}
            min={0}
            max={24 * 60 - 2 * STEP}
            onChange={(v) => {
              setStart(v);
              if (end - v < STEP) setEnd(v + STEP);
            }}
          />
          <TimeStepper label="Bis" value={end} min={start + STEP} max={24 * 60 - STEP} onChange={setEnd} />
        </View>

        <Button
          title={days.length > 1 ? `An ${days.length} Tagen hinzufügen` : 'Hinzufügen'}
          icon="add"
          disabled={days.length === 0}
          onPress={() => onAdd(days, start, end)}
        />
        <Button title="Abbrechen" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

/** Weekly plan of times at which the user is automatically available. */
export function ScheduleView({ enabled, slots, loading, saving, dirty, nextLabel, onBack, onToggle, onAdd, onRemove, onSave }: Props) {
  const [adding, setAdding] = useState<number | null | false>(false);

  return (
    <Screen scroll contentStyle={{ paddingBottom: 140 }}>
      <PageHeader title="Zeitplan" onBack={onBack} right={saving ? <ActivityIndicator color={colors.cyan} /> : null} />

      <GlassCard glow={enabled ? colors.cyan : undefined}>
        <Toggle
          label="Automatisch erreichbar"
          description="Zu diesen Zeiten sehen deine Kontakte, dass du Zeit hast. Du kannst dich jederzeit selbst ausschalten."
          value={enabled}
          onChange={onToggle}
          disabled={loading}
        />
        {enabled && nextLabel && !dirty ? (
          <View style={styles.next}>
            <Ionicons name="time-outline" size={16} color={colors.cyan} />
            <AppText variant="caption" color={colors.cyan}>
              Nächstes Mal: {nextLabel}
            </AppText>
          </View>
        ) : null}
      </GlassCard>

      <SectionHeader
        title="Deine Woche"
        right={
          <Pressable onPress={() => setAdding(null)} accessibilityRole="button" hitSlop={8} style={styles.addAll}>
            <Ionicons name="add" size={16} color={colors.cyan} />
            <AppText variant="caption" color={colors.cyan}>
              Zeitfenster
            </AppText>
          </Pressable>
        }
      />

      {loading ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xl }} />
      ) : (
        <GlassCard padded={false} style={!enabled ? styles.dimmed : undefined}>
          {WEEK_ORDER.map((day, i) => {
            const daySlots = slots.filter((s) => s.day === day);
            return (
              <View key={day} style={[styles.dayRow, i > 0 && styles.divider]}>
                <AppText variant="bodyStrong" style={styles.dayName}>
                  {WEEKDAYS_SHORT[day]}
                </AppText>
                <View style={styles.slotList}>
                  {daySlots.length === 0 ? (
                    <AppText variant="caption" color={colors.textMuted}>
                      frei
                    </AppText>
                  ) : (
                    daySlots.map((slot) => (
                      <Pressable
                        key={`${slot.day}-${slot.start}`}
                        onPress={() => onRemove(slot)}
                        accessibilityRole="button"
                        accessibilityLabel={`${WEEKDAYS_LONG[day]} ${clock(slot.start)} bis ${clock(slot.end)} entfernen`}
                        style={styles.slot}
                      >
                        <AppText variant="caption">
                          {clock(slot.start)}–{clock(slot.end)}
                        </AppText>
                        <Ionicons name="close" size={14} color={colors.textSecondary} />
                      </Pressable>
                    ))
                  )}
                </View>
                <Pressable
                  onPress={() => setAdding(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Zeitfenster am ${WEEKDAYS_LONG[day]} hinzufügen`}
                  hitSlop={8}
                  style={styles.addDay}
                >
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            );
          })}
        </GlassCard>
      )}

      {dirty && <Button title="Speichern" icon="checkmark" onPress={onSave} loading={saving} style={{ marginTop: spacing.xl }} />}

      <AppText variant="caption" color={colors.textMuted} center style={styles.footer}>
        Wenn ein Zeitfenster beginnt, wirst du bis zu seinem Ende als erreichbar angezeigt.
      </AppText>

      {adding !== false && (
        <AddSlotSheet
          initialDay={adding}
          onClose={() => setAdding(false)}
          onAdd={(days, start, end) => {
            onAdd(days, start, end);
            setAdding(false);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  next: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  addAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dimmed: { opacity: 0.55 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dayName: { width: 32 },
  slotList: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,229,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
  },
  addDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  footer: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  presets: { gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dayActive: { backgroundColor: colors.cyan },
  times: { flexDirection: 'row', gap: spacing.md },
  stepper: { flex: 1, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  stepValue: { fontVariant: ['tabular-nums'] },
});
