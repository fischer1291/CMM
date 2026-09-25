import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { DOWNLOAD_URL } from '../content/links';
import { useAuth } from '../contexts/AuthContext';
import { joinCircleByCode, previewCircleCode } from '../services/circlesApi';
import { AppText, Button, colors, GlassCard, Screen, spacing, WarmthRing } from '../ui';

/**
 * Invite link to a circle (/kreis?code=...): public on the web, and in the
 * app a way to join right away.
 */
export default function CircleInviteScreen() {
  const router = useRouter();
  const { code = '' } = useLocalSearchParams<{ code?: string }>();
  const { userPhone } = useAuth();
  const [circle, setCircle] = useState<{ name: string; emoji: string; memberCount: number; createdByName: string } | null | false>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    previewCircleCode(code)
      .then(setCircle)
      .catch(() => setCircle(false));
  }, [code]);

  const join = async () => {
    setBusy(true);
    try {
      const joined = await joinCircleByCode(code);
      router.replace({ pathname: '/circle', params: { id: joined.id } });
    } catch {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        {circle === null ? (
          <ActivityIndicator color={colors.cyan} />
        ) : circle === false ? (
          <AppText variant="title" center>
            Diesen Kreis gibt es nicht (mehr).
          </AppText>
        ) : (
          <>
            <WarmthRing emoji={circle.emoji} value={1} size={120} full />
            <AppText variant="display" center style={{ marginTop: spacing.lg }}>
              {circle.emoji} {circle.name}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} center>
              {circle.createdByName || 'Jemand'} lädt dich in diesen Kreis ein · {circle.memberCount}{' '}
              {circle.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
            </AppText>
            {userPhone ? (
              <Button title="Beitreten" icon="enter-outline" onPress={join} loading={busy} style={styles.cta} />
            ) : (
              <GlassCard style={styles.cta}>
                <AppText variant="bodyStrong" center>
                  So kommst du rein
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} center>
                  Hol dir Call Me Maybe und tippe unter Kreise auf „Mit Code“:
                </AppText>
                <AppText variant="h1" center style={styles.code} selectable>
                  {code.toUpperCase()}
                </AppText>
                {DOWNLOAD_URL ? <Button title="App holen" icon="download-outline" onPress={() => Linking.openURL(DOWNLOAD_URL!)} /> : null}
              </GlassCard>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: spacing.xxxl, maxWidth: 520, width: '100%', alignSelf: 'center', gap: spacing.sm },
  cta: { marginTop: spacing.xl, alignSelf: 'stretch', gap: spacing.sm },
  code: { letterSpacing: 4, marginVertical: spacing.sm },
});
