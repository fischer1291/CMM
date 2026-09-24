import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { DOWNLOAD_URL } from '../content/links';
import { AppText, Button, colors, GlassCard, Screen, spacing } from '../ui';
import { LogoMark } from '../ui/components/LogoMark';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'radio-button-on', title: 'Sehen, wer gerade Zeit hat', text: 'Kein Anruf ins Leere mehr: Du siehst, wann deine Leute erreichbar sind.' },
  { icon: 'flash', title: 'Kurz und echt', text: 'Ein spontanes Gespräch statt endlosem Schreiben.' },
  { icon: 'heart', title: 'Nur deine Menschen', text: 'Keine Fremden, keine Likes, keine Werbung.' },
];

/** Public landing page for invite links (/einladung), mostly opened on the web. */
export default function InviteScreen() {
  return (
    <Screen scroll>
      <View style={styles.hero}>
        <LogoMark size={140} />
        <AppText variant="display" center style={styles.title}>
          Du bist eingeladen 💛
        </AppText>
        <AppText variant="body" color={colors.textSecondary} center style={styles.lead}>
          Ein Freund möchte mit dir über Call Me Maybe in Kontakt bleiben. Ruf an, wenn’s passt.
        </AppText>
      </View>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <GlassCard key={p.title}>
            <View style={styles.point}>
              <Ionicons name={p.icon} size={22} color={colors.cyan} />
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

      {DOWNLOAD_URL ? (
        <Button title="App holen" icon="download-outline" onPress={() => Linking.openURL(DOWNLOAD_URL!)} style={styles.cta} />
      ) : (
        <GlassCard style={styles.cta}>
          <AppText variant="bodyStrong" center>
            Wir sind gerade im Test
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} center>
            Frag die Person, die dich eingeladen hat, nach dem Test-Link.
          </AppText>
        </GlassCard>
      )}
      <AppText variant="caption" color={colors.textMuted} center style={styles.note}>
        Melde dich mit deiner Handynummer an. Wer dich eingeladen hat, ist dann direkt in deinen Kontakten.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxl, maxWidth: 560, alignSelf: 'center' },
  title: { marginTop: spacing.lg },
  lead: { marginTop: spacing.sm },
  points: { gap: spacing.md, marginTop: spacing.xxl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cta: { marginTop: spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  note: { marginTop: spacing.lg, maxWidth: 480, alignSelf: 'center' },
});
