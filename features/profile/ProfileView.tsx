import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, colors, GlassCard, glow, radius, Screen, SectionHeader, spacing, TAB_BAR_SPACE, TextField } from '../../ui';
import { deviceLabel, type SignedInDevice } from '../../services/devices';
import { formatLastSeen } from '../../utils/time';

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
  onOpenNotifications: () => void;
  onOpenStats: () => void;
  onOpenAlbum: () => void;
  onOpenPlus: () => void;
  onOpenAppIcon: () => void;
  isPlus: boolean;
  onOpenSupport: () => void;
  onOpenSchedule: () => void;
  onInvite: () => void;
  onExportData: () => void;
  onOpenPrivacy: () => void;
  onOpenImprint: () => void;
  /** Our own terms (plan 2.7); the row is hidden without it */
  onOpenTerms?: () => void;
  onOpenCircles: () => void;
  onOpenBlocked: () => void;
  /** Code from the waitlist launch mail; returns an error to show, or null. Hidden once redeemed. */
  onRedeemWaitlist?: ((code: string) => Promise<string | null>) | null;
  /** Devices signed in to the account (plan 2.9); null while loading or when the backend has no list */
  devices: SignedInDevice[] | null;
  /** "Überall abmelden": every other device is signed out */
  onSignOutEverywhere: () => void;
  signingOutEverywhere: boolean;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  version: string;
};

/** The device list in the settings: model, "Dieses Gerät" or when it was last seen. */
function DeviceList({ devices, onSignOutEverywhere, busy }: { devices: SignedInDevice[] | null; onSignOutEverywhere: () => void; busy: boolean }) {
  return (
    <GlassCard padded={false}>
      {(devices ?? []).map((device, i) => (
        <View key={device.id} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Ionicons name="phone-portrait-outline" size={20} color={device.current ? colors.cyan : colors.textSecondary} />
          <View style={{ flex: 1, paddingVertical: spacing.sm }}>
            <AppText variant="bodyStrong">{deviceLabel(device)}</AppText>
            <AppText variant="caption" color={device.current ? colors.cyan : colors.textMuted}>
              {device.current ? 'Dieses Gerät' : `zuletzt aktiv ${formatLastSeen(device.lastSeenAt) ?? 'unbekannt'}`}
            </AppText>
          </View>
        </View>
      ))}
      <Pressable
        onPress={onSignOutEverywhere}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, (devices?.length ?? 0) > 0 && styles.rowDivider, pressed && { backgroundColor: colors.surface }]}
      >
        <Ionicons name={busy ? 'hourglass-outline' : 'exit-outline'} size={20} color={colors.textSecondary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          Überall abmelden
        </AppText>
      </Pressable>
    </GlassCard>
  );
}

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
  const [redeeming, setRedeeming] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);

  const redeem = async () => {
    if (!props.onRedeemWaitlist || code.trim().length < 8) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      const error = await props.onRedeemWaitlist(code.trim());
      if (error) setCodeError(error);
      else {
        setRedeeming(false);
        setCode('');
      }
    } finally {
      setCodeBusy(false);
    }
  };

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

      <Pressable onPress={props.onOpenPlus} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: spacing.xl }]}>
        <GlassCard glow={colors.violet}>
          <View style={styles.plusRow}>
            <View style={styles.plusIcon}>
              <Ionicons name="sparkles" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{props.isPlus ? 'Du hast Wanna yap+ ✨' : 'Wanna yap+'}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {props.isPlus ? 'Danke, dass du uns unterstützt' : 'Größere Kreise, Erinnerungen für immer, HD-Video'}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </GlassCard>
      </Pressable>

      <SectionHeader title="Erreichbarkeit" />
      <RowGroup
        rows={[
          { icon: 'calendar-outline', label: 'Zeitplan', onPress: props.onOpenSchedule },
          { icon: 'people-circle-outline', label: 'Kreise & Sichtbarkeit', onPress: props.onOpenCircles },
          { icon: 'pulse-outline', label: 'Gesprächszeit & Freigabe', onPress: props.onOpenStats },
          { icon: 'ribbon-outline', label: 'Sammelalbum & Vitrine', onPress: props.onOpenAlbum },
        ]}
      />

      <SectionHeader title="Einstellungen" />
      <RowGroup
        rows={[
          { icon: 'notifications-outline', label: 'Mitteilungen', onPress: props.onOpenNotifications },
          { icon: 'color-palette-outline', label: 'App-Icon', onPress: props.onOpenAppIcon },
          { icon: 'people-outline', label: 'Kontaktzugriff', onPress: props.onOpenSystemSettings },
        ]}
      />

      <SectionHeader title="Community" />
      <RowGroup
        rows={[
          { icon: 'gift-outline', label: 'Freunde einladen', onPress: props.onInvite },
          ...(props.onRedeemWaitlist
            ? [{ icon: 'rocket-outline' as const, label: 'Warteliste-Code einlösen', onPress: () => { setCodeError(null); setRedeeming(true); } }]
            : []),
          { icon: 'help-buoy-outline', label: 'Hilfe & Feedback', onPress: props.onOpenSupport },
        ]}
      />

      <SectionHeader title="Deine Daten" />
      <RowGroup
        rows={[
          { icon: 'download-outline', label: 'Meine Daten exportieren', onPress: props.onExportData },
          { icon: 'hand-left-outline', label: 'Blockierte Personen', onPress: props.onOpenBlocked },
          { icon: 'shield-checkmark-outline', label: 'Datenschutz', onPress: props.onOpenPrivacy },
          ...(props.onOpenTerms ? [{ icon: 'reader-outline' as const, label: 'Nutzungsbedingungen', onPress: props.onOpenTerms }] : []),
          { icon: 'document-text-outline', label: 'Impressum', onPress: props.onOpenImprint },
        ]}
      />

      <SectionHeader title="Geräte" />
      <DeviceList devices={props.devices} onSignOutEverywhere={props.onSignOutEverywhere} busy={props.signingOutEverywhere} />

      <View style={{ marginTop: spacing.xl }}>
        <RowGroup
          rows={[
            { icon: 'log-out-outline', label: 'Abmelden', onPress: props.onSignOut, danger: true },
            { icon: 'trash-outline', label: 'Konto löschen', onPress: props.onDeleteAccount, danger: true },
          ]}
        />
      </View>

      <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.xl }}>
        Wanna yap? · Version {props.version}
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

      <Modal visible={redeeming} transparent animationType="fade" onRequestClose={() => setRedeeming(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <AppText variant="h2">Warteliste-Code</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Den Code findest du in unserer Launch-Mail. Er bringt dir das Abzeichen „Von Anfang an“, und wer drei Freunde mitgebracht hat, bekommt dazu einen Monat Wanna yap+.
            </AppText>
            <TextField
              value={code}
              onChangeText={setCode}
              placeholder="ABCD-1234"
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={redeem}
            />
            {codeError ? (
              <AppText variant="caption" color={colors.danger}>
                {codeError}
              </AppText>
            ) : null}
            <Button title="Einlösen" onPress={redeem} loading={codeBusy} disabled={code.trim().length < 8} />
            <Button title="Abbrechen" variant="ghost" onPress={() => setRedeeming(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
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
