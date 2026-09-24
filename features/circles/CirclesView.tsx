import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Audience, Circle } from '../../services/socialApi';
import { AppText, Avatar, Button, colors, GlassCard, PageHeader, radius, Screen, SectionHeader, Segmented, spacing, TextField } from '../../ui';

export type CirclePerson = { phone: string; name: string; avatarUrl: string | null };
export type CircleDraft = { id?: string; name: string; emoji: string; members: string[] };

const EMOJIS = ['🏡', '💛', '🎓', '⚽️', '🎸', '💼', '🌍', '✨'];
const SUGGESTIONS: CircleDraft[] = [
  { name: 'Familie', emoji: '🏡', members: [] },
  { name: 'Enge Freunde', emoji: '💛', members: [] },
];

type Props = {
  circles: Circle[] | null;
  audience: Audience;
  saving: boolean;
  person: (phone: string) => CirclePerson;
  onBack: () => void;
  onChangeAudience: (audience: Audience) => void;
  onEdit: (draft: CircleDraft | null) => void;
};

function CircleCard({ circle, person, onPress }: { circle: Circle; person: Props['person']; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${circle.name} bearbeiten`}>
      <GlassCard>
        <View style={styles.circleRow}>
          <View style={styles.emojiBadge}>
            <AppText style={styles.emoji}>{circle.emoji}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{circle.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {circle.members.length === 1 ? '1 Person' : `${circle.members.length} Personen`}
            </AppText>
          </View>
          <View style={styles.avatars}>
            {circle.members.slice(0, 4).map((phone, i) => {
              const p = person(phone);
              return (
                <View key={phone} style={{ marginLeft: i ? -10 : 0 }}>
                  <Avatar name={p.name} uri={p.avatarUrl} size={28} />
                </View>
              );
            })}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

/** Circles of people, and whether availability is shown to all contacts or only some circles. */
export function CirclesView({ circles, audience, saving, person, onBack, onChangeAudience, onEdit }: Props) {
  const toggleCircle = (id: string) => {
    const chosen = audience.circles.includes(id) ? audience.circles.filter((c) => c !== id) : [...audience.circles, id];
    if (chosen.length) onChangeAudience({ mode: 'circles', circles: chosen });
  };

  return (
    <Screen scroll>
      <PageHeader title="Kreise" onBack={onBack} right={saving ? <ActivityIndicator color={colors.cyan} /> : null} />

      <SectionHeader title="Wer sieht, dass du Zeit hast?" />
      <GlassCard>
        <Segmented
          options={[
            { value: 'all', label: 'Alle Kontakte' },
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
                <Pressable
                  key={c.id}
                  onPress={() => toggleCircle(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
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
            ? 'Alle Kontakte, die dich gespeichert haben, sehen, wenn du erreichbar bist.'
            : circles?.length
              ? 'Nur Menschen in den gewählten Kreisen sehen, wenn du erreichbar bist. Alle anderen sehen dich als nicht erreichbar.'
              : 'Leg zuerst einen Kreis an.'}
        </AppText>
      </GlassCard>

      <SectionHeader
        title="Deine Kreise"
        right={
          circles && circles.length < 12 ? (
            <Pressable onPress={() => onEdit({ name: '', emoji: '✨', members: [] })} hitSlop={8} style={styles.add}>
              <Ionicons name="add" size={16} color={colors.cyan} />
              <AppText variant="caption" color={colors.cyan}>
                Neuer Kreis
              </AppText>
            </Pressable>
          ) : null
        }
      />
      {!circles ? (
        <ActivityIndicator color={colors.cyan} />
      ) : circles.length === 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" color={colors.textSecondary}>
            Mit Kreisen bestimmst du, wer sieht, dass du Zeit hast. Fang mit einem Vorschlag an:
          </AppText>
          {SUGGESTIONS.map((s) => (
            <Button key={s.name} title={`${s.emoji} ${s.name} anlegen`} variant="secondary" onPress={() => onEdit(s)} />
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {circles.map((c) => (
            <CircleCard key={c.id} circle={c} person={person} onPress={() => onEdit(c)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Create or edit a circle: name, emoji, members. */
export function CircleEditor({
  draft,
  onPickMembers,
  onSave,
  onDelete,
  onClose,
}: {
  draft: CircleDraft;
  onPickMembers: (current: CircleDraft) => void;
  onSave: (draft: CircleDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(draft.name);
  const [emoji, setEmoji] = useState(draft.emoji);
  const current = { ...draft, name, emoji };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="h2">{draft.id ? 'Kreis bearbeiten' : 'Neuer Kreis'}</AppText>
          <TextField value={name} onChangeText={setName} placeholder="Name, z. B. Familie" maxLength={30} />
          <View style={styles.emojis}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                accessibilityRole="radio"
                accessibilityState={{ selected: e === emoji }}
                style={[styles.emojiOption, e === emoji && styles.emojiOptionOn]}
              >
                <AppText style={styles.emoji}>{e}</AppText>
              </Pressable>
            ))}
          </View>
          <Button
            title={draft.members.length ? `Mitglieder (${draft.members.length})` : 'Mitglieder wählen'}
            icon="people-outline"
            variant="secondary"
            onPress={() => onPickMembers(current)}
          />
          <Button title="Speichern" onPress={() => onSave(current)} disabled={!name.trim()} />
          {onDelete ? <Button title="Kreis löschen" variant="ghost" onPress={onDelete} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  add: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  circleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  emoji: { fontSize: 22, lineHeight: 28 },
  avatars: { flexDirection: 'row' },
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
  emojiOptionOn: { backgroundColor: 'rgba(0,229,255,0.2)', borderWidth: 1, borderColor: colors.cyan },
});
