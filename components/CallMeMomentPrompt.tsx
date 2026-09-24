import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SessionMinutes, startSession } from '../services/gamificationApi';
import { AppText, Button, colors, glow, radius, Segmented, spacing } from '../ui';

const MOODS = ['😊', '😌', '🤪', '😴', '🤔'];
const DURATIONS: { value: SessionMinutes; label: string }[] = [
  { value: 15, label: '15 Min.' },
  { value: 30, label: '30 Min.' },
  { value: 60, label: '1 Std.' },
];

/**
 * Asks after a "Call Me Moment" push whether the user has time for a call;
 * confirming makes them available to their contacts for that long.
 */
export default function CallMeMomentPrompt({ onClose }: { onClose: () => void }) {
  const [mood, setMood] = useState(MOODS[0]);
  const [minutes, setMinutes] = useState<SessionMinutes>(15);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await startSession(minutes, mood);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch {
      Alert.alert('Nicht gespeichert', 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, glow(colors.violet, 0.4)]}>
          <AppText variant="label" color={colors.cyan}>
            Call Me Moment ✨
          </AppText>
          <AppText variant="h2">Hast du gerade Zeit für ein echtes Gespräch?</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Deine Kontakte sehen dann, dass du erreichbar bist. Wie ist deine Stimmung?
          </AppText>

          <View style={styles.moods}>
            {MOODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMood(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: mood === m }}
                style={[styles.mood, mood === m && styles.moodActive]}
              >
                <AppText style={styles.moodEmoji}>{m}</AppText>
              </Pressable>
            ))}
          </View>

          <Segmented options={DURATIONS} value={minutes} onChange={setMinutes} />

          <Button title="Erreichbar sein" icon="flash" onPress={confirm} loading={pending} />
          <Button title="Nicht jetzt" variant="ghost" onPress={onClose} disabled={pending} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  moods: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.sm },
  mood: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodActive: { borderColor: colors.cyan, backgroundColor: 'rgba(0,229,255,0.14)' },
  moodEmoji: { fontSize: 26, lineHeight: 32 },
});
