import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, colors, spacing } from '../../ui';
import type { Moment } from './model';

/**
 * Someone wants to share a moment from your call: you see it and decide.
 * Shows the first of the open requests.
 */
export function ConsentSheet({
  request,
  count,
  authorName,
  busy,
  onApprove,
  onDecline,
  onClose,
}: {
  request: Moment;
  count: number;
  authorName: string;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const first = authorName.split(' ')[0];
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <Image source={{ uri: request.screenshot }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(11,11,18,0.9)', 'transparent']} style={[styles.shade, { top: 0, height: 200 }]} />
        <LinearGradient colors={['transparent', 'rgba(11,11,18,0.95)']} style={[styles.shade, { bottom: 0, height: 380 }]} />

        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Später entscheiden" style={styles.close}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{first} möchte diesen Moment teilen</AppText>
            {count > 1 ? (
              <AppText variant="caption" color={colors.textSecondary}>
                1 von {count} Anfragen
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.mood}>
            <AppText variant="caption">{request.mood}</AppText>
          </View>
          {request.note ? <AppText variant="title">{request.note}</AppText> : null}
          <AppText variant="caption" color={colors.textSecondary}>
            Ein Bild aus eurem Gespräch. Gibst du es frei, sehen es eure Kontakte 24 Stunden lang, danach nur noch ihr beide unter
            Erinnerungen.
          </AppText>
          <Button title="Freigeben ✨" onPress={onApprove} loading={busy} />
          <Button title="Nicht teilen" variant="ghost" onPress={onDecline} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shade: { position: 'absolute', left: 0, right: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,11,18,0.6)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.md, paddingHorizontal: spacing.xl },
  mood: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(11,11,18,0.62)',
    borderWidth: 1,
    borderColor: colors.pink,
  },
});
