import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, colors, radius, spacing, TextField } from '../ui';

const PRESETS = ['Kaffee-Call? ☕', 'Hab was zu erzählen 🙌', 'Kurz quatschen?', 'Vermiss dich 💛', 'Ruf an, wenn du magst 📞'];

/** Wanna yap+: nudge with an own line (or the standard text). */
export function NudgeSheet({ name, busy, onSend, onClose }: { name: string; busy: boolean; onSend: (message: string | null) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const firstName = name.split(' ')[0];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.head}>
            <AppText variant="h2">{firstName} anstupsen 👋</AppText>
            <View style={styles.plus}>
              <Ionicons name="sparkles" size={12} color={colors.text} />
              <AppText variant="caption">Plus</AppText>
            </View>
          </View>
          <AppText variant="caption" color={colors.textSecondary}>
            Schreib eine kurze Zeile dazu, oder schick den Standardtext.
          </AppText>
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable key={p} onPress={() => setText(p)} accessibilityRole="button" style={[styles.preset, text === p && styles.presetOn]}>
                <AppText variant="caption" color={text === p ? colors.bg : colors.text}>
                  {p}
                </AppText>
              </Pressable>
            ))}
          </View>
          <TextField value={text} onChangeText={setText} placeholder="Eigene Zeile (max. 80 Zeichen)" maxLength={80} />
          <Button title={text.trim() ? 'Mit Nachricht anstupsen' : 'Anstupsen'} icon="hand-left" loading={busy} onPress={() => onSend(text.trim() || null)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.violet },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  presetOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
});
