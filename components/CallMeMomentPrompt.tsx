import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, colors, glow, radius, spacing } from '../ui';
import { apiPostJson } from '../utils/api';

const MOODS = ['😊', '😌', '🤪', '😴', '🤔'];

/**
 * Asks after a "Call Me Moment" push whether the user has 15 minutes for a
 * call; confirming makes them available to their contacts for that time.
 */
export default function CallMeMomentPrompt({ phone, onClose }: { phone: string; onClose: () => void }) {
  const [mood, setMood] = useState(MOODS[0]);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await apiPostJson('/moment/confirm', { phone, mood }, 10000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.error('❌ Fehler beim Bestätigen des Moments:', err);
    } finally {
      setPending(false);
      onClose();
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, glow(colors.violet, 0.4)]}>
          <AppText variant="label" color={colors.cyan}>
            Call Me Moment ✨
          </AppText>
          <AppText variant="h2">Hast du 15 Minuten für ein echtes Gespräch?</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Deine Kontakte sehen dann, dass du gerade erreichbar bist. Wie ist deine Stimmung?
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

          <Button title="Für 15 Min. erreichbar" icon="flash" onPress={confirm} loading={pending} />
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
