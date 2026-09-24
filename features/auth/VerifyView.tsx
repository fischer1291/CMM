import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, CodeInput, colors, GlassCard, Screen, spacing, TextField } from '../../ui';

type Props = {
  step: 'phone' | 'code';
  phone: string;
  onPhoneChange: (value: string) => void;
  phoneError?: string | null;
  onSubmitPhone: () => void;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmitCode: (code?: string) => void;
  /** E.164 number the code was sent to */
  sentTo?: string | null;
  /** Seconds until "resend" is possible; 0 = now */
  resendIn: number;
  onResend: () => void;
  onChangeNumber: () => void;
  loading: boolean;
  /** Logged in before token auth: confirm the number once */
  reverify?: boolean;
};

/** Phone number entry, then the SMS code. */
export function VerifyView(props: Props) {
  const { step, loading, reverify } = props;
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.head}>
          <AppText variant="label" color={colors.cyan}>
            {step === 'phone' ? 'Schritt 1 von 2' : 'Schritt 2 von 2'}
          </AppText>
          <AppText variant="h1">{step === 'phone' ? 'Deine Nummer' : 'Code eingeben'}</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {step === 'phone'
              ? 'Deine Kontakte finden dich über deine Handynummer.'
              : `Wir haben dir einen 6-stelligen Code an ${props.sentTo} geschickt.`}
          </AppText>
        </View>

        {reverify && step === 'phone' && (
          <GlassCard glow={colors.cyan} style={{ marginTop: spacing.xl }}>
            <AppText variant="bodyStrong">Sicherheitsupdate</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Bitte bestätige deine Nummer einmal neu per SMS. Danach bist du wie gewohnt angemeldet.
            </AppText>
          </GlassCard>
        )}

        <View style={styles.body}>
          {step === 'phone' ? (
            <TextField
              value={props.phone}
              onChangeText={props.onPhoneChange}
              placeholder="0171 1234567"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus={!reverify}
              error={props.phoneError}
              returnKeyType="done"
              onSubmitEditing={props.onSubmitPhone}
              accessibilityLabel="Handynummer"
            />
          ) : (
            <View style={{ gap: spacing.xl }}>
              <CodeInput value={props.code} onChange={props.onCodeChange} onComplete={props.onSubmitCode} autoFocus />
              <View style={styles.links}>
                <Pressable onPress={props.onChangeNumber} accessibilityRole="button" disabled={loading}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Nummer ändern
                  </AppText>
                </Pressable>
                <Pressable onPress={props.onResend} accessibilityRole="button" disabled={loading || props.resendIn > 0}>
                  <AppText variant="caption" color={props.resendIn > 0 ? colors.textMuted : colors.cyan}>
                    {props.resendIn > 0 ? `Neuer Code in ${props.resendIn} s` : 'Code erneut senden'}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {step === 'phone' ? (
            <Button title="Code senden" onPress={props.onSubmitPhone} loading={loading} disabled={!props.phone.trim()} />
          ) : (
            <Button title="Bestätigen" onPress={() => props.onSubmitCode()} loading={loading} disabled={props.code.length < 6} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: spacing.xxl, gap: spacing.sm },
  body: { marginTop: spacing.xxl },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
