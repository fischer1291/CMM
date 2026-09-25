import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Audience, CircleInvite, CircleSummary } from '../../services/circlesApi';
import { AppText, Button, colors, GlassCard, PageHeader, radius, Screen, SectionHeader, Segmented, spacing, TextField, WarmthRing } from '../../ui';
import { circleStatus } from './CircleCard';

const EMOJIS = ['🏡', '💛', '🎓', '⚽️', '🎸', '💼', '🌍', '✨'];

type Props = {
  circles: CircleSummary[] | null;
  invites: CircleInvite[];
  audience: Audience;
  myPhone: string | null;
  onBack: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onJoinCode: () => void;
  onAnswerInvite: (circleId: string, accept: boolean) => void;
  onChangeAudience: (audience: Audience) => void;
};

/** All circles, invites, "new" and "join with code", and who sees that you have time. */
export function CirclesView({ circles, invites, audience, myPhone, onBack, onOpen, onNew, onJoinCode, onAnswerInvite, onChangeAudience }: Props) {
  const toggle = (id: string) => {
    const chosen = audience.circles.includes(id) ? audience.circles.filter((c) => c !== id) : [...audience.circles, id];
    if (chosen.length) onChangeAudience({ mode: 'circles', circles: chosen });
  };

  return (
    <Screen scroll>
      <PageHeader title="Kreise" onBack={onBack} />

      {invites.map((inv) => (
        <GlassCard key={inv.circleId} glow={colors.violet} style={{ marginBottom: spacing.md }}>
          <AppText variant="bodyStrong">
            {inv.invitedByName.split(' ')[0] || 'Jemand'} lädt dich in {inv.emoji} {inv.name} ein
          </AppText>
          <View style={styles.row2}>
            <Button title="Nein danke" variant="ghost" onPress={() => onAnswerInvite(inv.circleId, false)} style={{ flex: 1 }} />
            <Button title="Beitreten" onPress={() => onAnswerInvite(inv.circleId, true)} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      ))}

      {!circles ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xl }} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {circles.map((c) => {
            const status = circleStatus(c, myPhone);
            return (
              <Pressable key={c.id} onPress={() => onOpen(c.id)} accessibilityRole="button" accessibilityLabel={c.name}>
                <GlassCard>
                  <View style={styles.circleRow}>
                    <WarmthRing
                      emoji={c.emoji}
                      value={c.warmth.memberCount > 1 ? c.warmth.talkedCount / c.warmth.memberCount : 0}
                      size={52}
                      full={c.warmth.goalReached}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{c.name}</AppText>
                      <AppText variant="caption" color={status.hot ? colors.cyan : colors.textSecondary}>
                        {status.text}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
          <View style={styles.row2}>
            <Button title="Neuer Kreis" icon="add" onPress={onNew} style={{ flex: 1 }} />
            <Button title="Mit Code" icon="key-outline" variant="secondary" onPress={onJoinCode} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      <SectionHeader title="Wer sieht, dass du Zeit hast?" />
      <GlassCard>
        <Segmented
          options={[
            { value: 'all', label: 'Alle' },
            { value: 'circles', label: 'Nur Kreise' },
          ]}
          value={audience.mode}
          onChange={(mode) => {
            if (mode === 'all') onChangeAudience({ mode: 'all', circles: [] });
            else if (circles?.length) onChangeAudience({ mode: 'circles', circles: circles.map((c) => c.id) });
          }}
        />
        {audience.mode === 'circles' && circles ? (
          <View style={styles.chips}>
            {circles.map((c) => {
              const on = audience.circles.includes(c.id);
              return (
                <Pressable key={c.id} onPress={() => toggle(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
                  <AppText variant="caption" color={on ? colors.bg : colors.textSecondary}>
                    {c.emoji} {c.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {audience.mode === 'all'
            ? 'Deine Kontakte und alle in deinen Kreisen sehen, wenn du erreichbar bist.'
            : circles?.length
              ? 'Nur die Menschen in den gewählten Kreisen sehen, wenn du erreichbar bist.'
              : 'Leg zuerst einen Kreis an.'}
        </AppText>
      </GlassCard>
    </Screen>
  );
}

/** Name and emoji for a new circle. */
export function NewCircleSheet({
  initialName,
  initialEmoji,
  busy,
  onCreate,
  onClose,
}: {
  initialName: string;
  initialEmoji: string;
  busy: boolean;
  onCreate: (name: string, emoji: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="h2">Neuer Kreis</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Danach lädst du die Menschen ein, die dazugehören.
          </AppText>
          <TextField value={name} onChangeText={setName} placeholder="z. B. Familie Fischer" maxLength={30} autoFocus={!initialName} />
          <View style={styles.emojis}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} accessibilityRole="radio" accessibilityState={{ selected: e === emoji }} style={[styles.emojiOption, e === emoji && styles.emojiOn]}>
                <AppText style={styles.emoji}>{e}</AppText>
              </Pressable>
            ))}
          </View>
          <Button title="Kreis gründen" onPress={() => onCreate(name.trim(), emoji)} disabled={!name.trim()} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Join a circle with the code from an invite link. */
export function JoinCodeSheet({ busy, onJoin, onClose }: { busy: boolean; onJoin: (code: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="h2">Mit Code beitreten</AppText>
          <TextField
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="8 Zeichen, z. B. K7M2Q9XA"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
          <Button title="Beitreten" onPress={() => onJoin(code)} disabled={code.length !== 8} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row2: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  circleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
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
  emojis: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiOption: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emojiOn: { backgroundColor: 'rgba(0,229,255,0.2)', borderWidth: 1, borderColor: colors.cyan },
  emoji: { fontSize: 22, lineHeight: 28 },
});
