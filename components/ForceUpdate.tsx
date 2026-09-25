import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { APP_BUILD, APP_VERSION } from '../services/appInfo';
import { AppText, Button, colors, Screen, spacing } from '../ui';
import { LogoMark } from '../ui/components/LogoMark';

/** Blocks the app while this build is older than the server's minimum. */
export function ForceUpdate({ updateUrl }: { updateUrl: string | null }) {
  return (
    <Screen>
      <View style={styles.center}>
        <LogoMark size={96} />
        <AppText variant="h1" center style={{ marginTop: spacing.xl }}>
          Zeit für ein Update
        </AppText>
        <AppText variant="body" color={colors.textSecondary} center style={styles.text}>
          Diese Version von Call Me Maybe wird nicht mehr unterstützt. Mit dem Update klappen Anrufe, Kreise und alles
          andere wieder zuverlässig.
        </AppText>
        {updateUrl ? (
          <Button title="Jetzt aktualisieren" icon="arrow-down-circle" onPress={() => Linking.openURL(updateUrl)} style={styles.button} />
        ) : (
          <AppText variant="bodyStrong" center style={styles.text}>
            Bitte aktualisiere die App im App Store oder in TestFlight.
          </AppText>
        )}
        <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.xl }}>
          Deine Version: {APP_VERSION} ({APP_BUILD})
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  text: { marginTop: spacing.md, maxWidth: 320 },
  button: { marginTop: spacing.xxl, alignSelf: 'stretch' },
});
