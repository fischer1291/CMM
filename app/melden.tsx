import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { OPERATOR } from '../content/legal';
import { WEB_URL } from '../content/links';
import {
  REPORT_CATEGORIES,
  REPORT_HINT_MAX,
  REPORT_TEXT_MAX,
  submitPublicReport,
  validateReport,
  type ReportCategory,
  type ReportField,
} from '../services/reports';
import { AppText, Button, colors, GlassCard, PageHeader, radius, Screen, spacing, TextField } from '../ui';

/**
 * Report a violation, with or without an account (plan 2.7, DSA Art. 16):
 * public on the web (wannayap.app/melden) and reachable in the app from
 * "Hilfe & Feedback". Sends POST /reports/public without the app's token
 * (services/reports.ts) and shows the reference the backend returns.
 */
export default function ReportScreen() {
  const router = useRouter();
  const web = Platform.OS === 'web';
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [text, setText] = useState('');
  const [reportedPhone, setReportedPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [momentHint, setMomentHint] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ReportField, string>>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const clear = (field: ReportField) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setSendError(null);
  };

  const submit = async () => {
    const result = validateReport({ category, text, reportedPhone, reporterEmail, momentHint });
    if (!result.body) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSendError(null);
    setBusy(true);
    try {
      setReference(await submitPublicReport({ ...result.body, website }));
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Gerade klappt es nicht. Versuch es gleich noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  const header =
    !web && router.canGoBack() ? (
      <PageHeader title="Verstoß melden" onBack={() => router.back()} />
    ) : (
      <AppText variant="h1" style={styles.webTitle}>
        Verstoß melden
      </AppText>
    );

  if (reference) {
    return (
      <Screen scroll ambient={false}>
        <View style={styles.page}>
          {header}
          <GlassCard glow={colors.cyan}>
            <AppText variant="bodyStrong">Danke, deine Meldung ist bei uns angekommen.</AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.paragraph}>
              Wir schauen sie uns so bald wie möglich an. {reporterEmail.trim() ? 'Wenn wir Fragen haben oder etwas unternommen haben, schreiben wir dir per Mail.' : ''}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.paragraph}>
              Deine Vorgangsnummer: {reference}
            </AppText>
          </GlassCard>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll ambient={false}>
      <View style={styles.page}>
        {header}
        <AppText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          Hat dich jemand über Wanna yap? belästigt, oder hast du einen Inhalt gesehen, der nicht in Ordnung ist? Sag uns Bescheid. Dafür brauchst du kein Konto. Wer gemeldet wird, erfährt nicht, von wem die Meldung kommt.
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={styles.paragraph}>
          Bist du in Gefahr, ruf bitte die 110 an.
        </AppText>

        <AppText variant="label" color={colors.textMuted} style={styles.label}>
          Worum geht es?
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {REPORT_CATEGORIES.map((c) => {
            const on = c.value === category;
            return (
              <Pressable
                key={c.value}
                onPress={() => {
                  setCategory(c.value);
                  clear('category');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <AppText variant="caption" color={on ? colors.bg : colors.textSecondary}>
                  {c.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {errors.category ? (
          <AppText variant="caption" color={colors.danger}>
            {errors.category}
          </AppText>
        ) : null}

        <AppText variant="label" color={colors.textMuted} style={styles.label}>
          Was ist passiert?
        </AppText>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            clear('text');
          }}
          placeholder="Wer, wann, was? Ein paar Sätze reichen."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={REPORT_TEXT_MAX}
          textAlignVertical="top"
          style={[styles.input, errors.text ? { borderColor: colors.danger } : null]}
        />
        {errors.text ? (
          <AppText variant="caption" color={colors.danger}>
            {errors.text}
          </AppText>
        ) : null}

        <View style={styles.fields}>
          <TextField
            label="Nummer der gemeldeten Person (freiwillig)"
            value={reportedPhone}
            onChangeText={(v) => {
              setReportedPhone(v);
              clear('reportedPhone');
            }}
            placeholder="z. B. 0151 23456789"
            keyboardType="phone-pad"
            autoComplete="off"
            error={errors.reportedPhone}
          />
          <TextField
            label="Um welchen Moment geht es? (freiwillig)"
            value={momentHint}
            onChangeText={(v) => {
              setMomentHint(v);
              clear('momentHint');
            }}
            placeholder="z. B. Datum, Uhrzeit, was zu sehen war"
            maxLength={REPORT_HINT_MAX}
            error={errors.momentHint}
          />
          <TextField
            label="Deine E-Mail für Rückfragen (freiwillig)"
            value={reporterEmail}
            onChangeText={(v) => {
              setReporterEmail(v);
              clear('reporterEmail');
            }}
            placeholder="deine@mail.de"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.reporterEmail}
          />
        </View>

        {/* Honeypot for bots: hidden from people and screen readers, sent as `website` */}
        <View style={styles.honeypot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <TextInput value={website} onChangeText={setWebsite} autoComplete="off" placeholder="Website" />
        </View>

        {sendError ? (
          <AppText variant="caption" color={colors.danger} style={styles.paragraph}>
            {sendError}
          </AppText>
        ) : null}
        <Button title="Meldung senden" icon="flag-outline" onPress={submit} loading={busy} style={styles.button} />

        <AppText variant="caption" color={colors.textMuted} style={styles.paragraph}>
          Wir speichern deine Meldung bis zu 6 Monate, um sie zu prüfen.{' '}
          <AppText variant="caption" color={colors.cyan} onPress={() => (web ? Linking.openURL(`${WEB_URL}/datenschutz`).catch(() => {}) : router.push('/datenschutz'))} accessibilityRole="link">
            Datenschutz
          </AppText>
          {OPERATOR ? ` · Lieber per Mail? ${OPERATOR.email}` : ''}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 640, width: '100%', alignSelf: 'center', paddingBottom: spacing.xxl },
  webTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  paragraph: { marginTop: spacing.sm, lineHeight: 22 },
  label: { marginTop: spacing.xl, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  input: {
    minHeight: 140,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16,
  },
  fields: { gap: spacing.lg, marginTop: spacing.xl },
  honeypot: { position: 'absolute', left: -10000, top: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  button: { marginTop: spacing.xl },
});
