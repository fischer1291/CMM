import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Research } from '../../services/researchApi';
import { AppText, Button, colors, GlassCard, spacing } from '../../ui';

/**
 * The card shows once the server invited (after the second talk) and until
 * the person answered it, either way. Older servers send no `research`.
 */
export function researchCardVisible(research: Research | null | undefined): research is Research {
  return !!research?.invitedAt && !research.bookedAt && !research.dismissedAt;
}

type Props = { onBook: () => void; onLater: () => void; busy?: boolean };

/** "15 Minuten mit dem Gründer sprechen?": warm, no pressure, a thank-you in Plus days. */
export function ResearchCard({ onBook, onLater, busy }: Props) {
  return (
    <GlassCard glow={colors.pink} style={{ marginTop: spacing.xl }}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="chatbubbles" size={22} color={colors.pink} />
        </View>
        <View style={styles.texts}>
          <AppText variant="bodyStrong">15 Minuten mit dem Gründer sprechen?</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Du hast Wanna yap? jetzt schon ein paar Mal benutzt. Erzähl mir, was gut war und was fehlt. Als Dank bekommst du 7 Tage
            Wanna yap+.
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Später" variant="ghost" onPress={onLater} disabled={busy} style={{ flex: 1 }} />
        <Button title="Termin wählen" icon="calendar" onPress={onBook} disabled={busy} style={{ flex: 1 }} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,46,147,0.14)' },
  texts: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
