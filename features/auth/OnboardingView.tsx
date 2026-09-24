import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, colors, GlassCard, Screen, spacing } from '../../ui';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'radio-button-on', title: 'Sieh, wer gerade Zeit hat', text: 'Deine Kontakte zeigen, wann sie erreichbar sind.' },
  { icon: 'flash', title: 'Ein Tipp – und du bist dabei', text: 'Schalte dich erreichbar, wenn es dir passt.' },
  { icon: 'videocam', title: 'Echte Gespräche', text: 'Videoanrufe statt endloser Chats.' },
];

/** First screen for new users. */
export function OnboardingView({ onStart, onOpenPrivacy }: { onStart: () => void; onOpenPrivacy?: () => void }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <AppText variant="label" color={colors.cyan}>
          Call Me Maybe
        </AppText>
        <AppText variant="display" style={styles.headline}>
          {'Ruf an,\nwenn’s passt.'}
        </AppText>
      </View>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <GlassCard key={p.title}>
            <View style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={20} color={colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{p.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {p.text}
                </AppText>
              </View>
            </View>
          </GlassCard>
        ))}
      </View>

      <View style={styles.footer}>
        <Button title="Los geht’s" icon="arrow-forward" onPress={onStart} />
        <AppText variant="caption" color={colors.textMuted} center>
          Wir schicken dir einen Code per SMS, um deine Nummer zu bestätigen.{' '}
          <AppText variant="caption" color={colors.cyan} onPress={onOpenPrivacy} accessibilityRole="link">
            Datenschutz
          </AppText>
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xxxl, gap: spacing.md },
  headline: { fontSize: 48, lineHeight: 52 },
  points: { gap: spacing.md, marginTop: spacing.xxl },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,229,255,0.12)',
  },
  footer: { marginTop: 'auto', gap: spacing.md },
});
