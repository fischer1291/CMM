import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MIN_AGE, TERMS_URL } from '../../content/legal';
import { AppText, Button, colors, GlassCard, Screen, spacing } from '../../ui';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'radio-button-on', title: 'Sieh, wer gerade Zeit hat', text: 'Deine Kontakte zeigen, wann sie erreichbar sind.' },
  { icon: 'flash', title: 'Ein Tipp – und du bist dabei', text: 'Schalte dich erreichbar, wenn es dir passt.' },
  { icon: 'videocam', title: 'Echte Gespräche', text: 'Videoanrufe statt endloser Chats.' },
];

/** The start button only works once the age box is ticked (Art. 8 GDPR). */
export const canStart = (ageConfirmed: boolean) => ageConfirmed === true;

/** First screen for new users. onStart only fires with the age confirmed. */
export function OnboardingView({ onStart, onOpenPrivacy }: { onStart: () => void; onOpenPrivacy?: () => void }) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <AppText variant="label" color={colors.cyan}>
          Wanna yap?
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
        <Pressable
          onPress={() => setAgeConfirmed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ageConfirmed }}
          accessibilityLabel={`Ich bin mindestens ${MIN_AGE} Jahre alt`}
          style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.7 }]}
        >
          <Ionicons
            name={ageConfirmed ? 'checkbox' : 'square-outline'}
            size={24}
            color={ageConfirmed ? colors.cyan : colors.textSecondary}
          />
          <AppText variant="body" style={{ flex: 1 }}>
            Ich bin mindestens {MIN_AGE} Jahre alt
          </AppText>
        </Pressable>
        <Button title="Los geht’s" icon="arrow-forward" onPress={onStart} disabled={!canStart(ageConfirmed)} />
        <AppText variant="caption" color={colors.textMuted} center>
          Mit „Los geht’s“ akzeptierst du die{' '}
          <AppText variant="caption" color={colors.cyan} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} accessibilityRole="link">
            Nutzungsbedingungen
          </AppText>{' '}
          (Apples Standard-EULA) und hast die{' '}
          <AppText variant="caption" color={colors.cyan} onPress={onOpenPrivacy} accessibilityRole="link">
            Datenschutzerklärung
          </AppText>{' '}
          gelesen. Wir schicken dir einen Code per SMS, um deine Nummer zu bestätigen.
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  footer: { marginTop: 'auto', gap: spacing.md },
});
