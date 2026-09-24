import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, colors, GlassCard, glow, radius, Screen, SectionHeader, spacing, TAB_BAR_SPACE, TextField } from '../../ui';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

type Props = {
  name: string;
  phone: string;
  avatarUrl: string | null;
  uploadingAvatar: boolean;
  onChangeAvatar: () => void;
  onSaveName: (name: string) => Promise<void>;
  onOpenSystemSettings: () => void;
  onInvite: () => void;
  onSignOut: () => void;
  version: string;
};

function RowGroup({ rows }: { rows: Row[] }) {
  return (
    <GlassCard padded={false}>
      {rows.map((row, i) => (
        <Pressable
          key={row.label}
          onPress={row.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && { backgroundColor: colors.surface }]}
        >
          <Ionicons name={row.icon} size={20} color={row.danger ? colors.danger : colors.textSecondary} />
          <AppText variant="bodyStrong" color={row.danger ? colors.danger : colors.text} style={{ flex: 1 }}>
            {row.label}
          </AppText>
          {!row.danger && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        </Pressable>
      ))}
    </GlassCard>
  );
}

/** Own profile and app settings. */
export function ProfileView(props: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.name);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDraft(props.name);
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await props.onSaveName(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentStyle={{ paddingBottom: TAB_BAR_SPACE }}>
      <View style={styles.head}>
        <Pressable onPress={props.onChangeAvatar} accessibilityRole="button" accessibilityLabel="Profilbild ändern">
          <Avatar name={props.name || '?'} uri={props.avatarUrl} size={112} available />
          <View style={[styles.badge, glow(colors.violet, 0.6)]}>
            <Ionicons name={props.uploadingAvatar ? 'hourglass' : 'camera'} size={16} color={colors.text} />
          </View>
        </Pressable>
        <Pressable onPress={openEditor} accessibilityRole="button" accessibilityLabel="Namen ändern" style={styles.nameRow}>
          <AppText variant="h1">{props.name || 'Name hinzufügen'}</AppText>
          <Ionicons name="pencil" size={16} color={colors.textMuted} />
        </Pressable>
        <AppText variant="caption" color={colors.textMuted}>
          {props.phone}
        </AppText>
      </View>

      <SectionHeader title="Einstellungen" />
      <RowGroup
        rows={[
          { icon: 'notifications-outline', label: 'Mitteilungen', onPress: props.onOpenSystemSettings },
          { icon: 'people-outline', label: 'Kontaktzugriff', onPress: props.onOpenSystemSettings },
        ]}
      />

      <SectionHeader title="Community" />
      <RowGroup rows={[{ icon: 'gift-outline', label: 'Freunde einladen', onPress: props.onInvite }]} />

      <View style={{ marginTop: spacing.xl }}>
        <RowGroup rows={[{ icon: 'log-out-outline', label: 'Abmelden', onPress: props.onSignOut, danger: true }]} />
      </View>

      <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.xl }}>
        Call Me Maybe · Version {props.version}
      </AppText>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <AppText variant="h2">Dein Name</AppText>
            <TextField value={draft} onChangeText={setDraft} autoFocus maxLength={50} returnKeyType="done" onSubmitEditing={save} />
            <Button title="Speichern" onPress={save} loading={saving} disabled={!draft.trim()} />
            <Button title="Abbrechen" variant="ghost" onPress={() => setEditing(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modal: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
