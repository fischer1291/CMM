import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, colors, GlassCard, Screen, spacing } from '../../ui';

type Props = {
  /** First name of the previous account ('' when it had none) */
  name: string;
  avatarUrl: string | null;
  /** "März 2026", or null when unknown */
  lastActive: string | null;
  busy: 'mine' | 'not_mine' | null;
  onMine: () => void;
  onNotMine: () => void;
};

/**
 * "Ist das dein Konto?" (plan 2.9): the number was confirmed, but its
 * account has been quiet for half a year and this device is new to it.
 * Phone numbers get passed on, so the person asks first instead of opening
 * someone else's account.
 */
export function AccountCheckView({ name, avatarUrl, lastActive, busy, onMine, onNotMine }: Props) {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.head}>
        <AppText variant="h1">Ist das dein Konto?</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Zu dieser Nummer gibt es schon ein Konto, das länger nicht genutzt wurde. Nummern werden manchmal neu vergeben,
          deshalb fragen wir kurz nach.
        </AppText>
      </View>

      <GlassCard style={styles.card}>
        <Avatar name={name || '?'} uri={avatarUrl || null} size={96} />
        <AppText variant="h2" center>
          {name || 'Ohne Namen'}
        </AppText>
        {lastActive && (
          <AppText variant="caption" color={colors.textMuted} center>
            zuletzt aktiv {lastActive}
          </AppText>
        )}
      </GlassCard>

      <View style={styles.footer}>
        <Button title="Ja, das bin ich" onPress={onMine} loading={busy === 'mine'} disabled={!!busy} />
        <Button title="Nein, ich fange neu an" variant="ghost" onPress={onNotMine} loading={busy === 'not_mine'} disabled={!!busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: spacing.xxl, gap: spacing.sm },
  card: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  footer: { marginTop: 'auto', paddingTop: spacing.xl, gap: spacing.sm },
});
