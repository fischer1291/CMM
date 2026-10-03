import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { WEB_URL } from '../content/links';
import { useAuth } from '../contexts/AuthContext';
import {
  clearInviteCode,
  downloadLink,
  joinAndroidWaitlist,
  normalizeInviteCode,
  platformFromUserAgent,
  rememberInviteCode,
  reportInviteVisit,
  type VisitPlatform,
} from '../services/invites';
import { AppText, Button, colors, GlassCard, Screen, spacing, TextField } from '../ui';
import { LogoMark } from '../ui/components/LogoMark';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'radio-button-on', title: 'Sehen, wer gerade Zeit hat', text: 'Kein Anruf ins Leere mehr: Du siehst, wann deine Leute erreichbar sind.' },
  { icon: 'flash', title: 'Kurz und echt', text: 'Ein spontanes Gespräch statt endlosem Schreiben.' },
  { icon: 'heart', title: 'Nur deine Menschen', text: 'Keine Fremden, keine Likes, keine Werbung.' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Same wording as the backend stores as proof of consent (lib/waitlist.js
// CONSENT_TEXT) and as the landing shows (marketing/src/landing.js)
const CONSENT_TEXT =
  'Ich möchte per E-Mail erfahren, wenn Wanna yap? startet, und bis dahin höchstens ein paar Neuigkeiten bekommen. Abmelden geht jederzeit über den Link in jeder Mail.';

/**
 * Public landing page for invite links (/einladung?von=CODE), mostly opened
 * on the web: reports the visit, sends iPhones to /download and lets Android
 * visitors join the waitlist. When the link opens the app instead (Universal
 * Link), the code is kept for the sign-up and the user goes there.
 */
export default function InviteScreen() {
  const { von } = useLocalSearchParams<{ von?: string }>();
  const code = useMemo(() => normalizeInviteCode(von), [von]);
  const router = useRouter();
  const { userPhone, pendingPhone } = useAuth();
  const web = Platform.OS === 'web';
  // Only known in the browser: the static export has no navigator, so the
  // first render is the neutral store branch on every platform (no hydration
  // mismatch) and Android switches to the waitlist right after mounting.
  const [platform, setPlatform] = useState<VisitPlatform>('other');
  const reported = useRef(false);
  const left = useRef(false);

  useEffect(() => {
    if (!web) return;
    const detected = platformFromUserAgent(globalThis.navigator?.userAgent);
    setPlatform(detected);
    // Once per page, even when the parameter only arrives after the first render
    if (code && !reported.current) {
      reported.current = true;
      reportInviteVisit(code, detected).catch(() => {});
    }
  }, [web, code]);

  useEffect(() => {
    if (web || left.current) return;
    left.current = true;
    // In the app: keep the code for the sign-up and go there. Someone who is
    // signed in already has a friend's link tapped by accident: the code must
    // not wait on the device and be sent with a later re-verification.
    (async () => {
      if (userPhone) await clearInviteCode();
      else if (code) await rememberInviteCode(code);
      router.replace(userPhone ? '/' : pendingPhone ? '/(auth)/verify' : '/(auth)/onboarding');
    })();
  }, [web, code, userPhone, pendingPhone, router]);

  if (!web) {
    return (
      <Screen>
        <View style={styles.spinner}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <LogoMark size={140} />
        <AppText variant="display" center style={styles.title}>
          Du bist eingeladen 💛
        </AppText>
        <AppText variant="body" color={colors.textSecondary} center style={styles.lead}>
          Ein Freund möchte mit dir über Wanna yap? in Kontakt bleiben. Ruf an, wenn’s passt.
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

      {platform === 'android' ? <AndroidWaitlist code={code} /> : <StoreButton code={code} />}
      <AppText variant="caption" color={colors.textMuted} center style={styles.note}>
        Melde dich mit deiner Handynummer an. Wer dich eingeladen hat, ist dann direkt in deinen Kontakten.
      </AppText>
    </Screen>
  );
}

function StoreButton({ code }: { code: string | null }) {
  const link = downloadLink(code);
  if (!link) {
    return (
      <GlassCard style={styles.cta}>
        <AppText variant="bodyStrong" center>
          Wir sind gerade im Test
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} center>
          Frag die Person, die dich eingeladen hat, nach dem Test-Link.
        </AppText>
      </GlassCard>
    );
  }
  return <Button title="App holen" icon="download-outline" onPress={() => Linking.openURL(link)} style={styles.cta} />;
}

/** Android has no app yet: the waitlist tells them when it comes. */
function AndroidWaitlist({ code }: { code: string | null }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ email: string; mailDelayed: boolean } | null>(null);

  const submit = async () => {
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { mailDelayed } = await joinAndroidWaitlist(address, code);
      setSent({ email: address, mailDelayed });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gerade klappt es nicht. Versuch es gleich noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard style={styles.cta}>
      <AppText variant="bodyStrong" center>
        Wanna yap? gibt es bisher nur fürs iPhone
      </AppText>
      {sent ? (
        <AppText variant="caption" color={colors.textSecondary} center style={{ marginTop: spacing.sm }}>
          {sent.mailDelayed
            ? // The sign-up is kept; the mail follows as soon as sending works again (same as the landing)
              `Du bist eingetragen! Die Bestätigungsmail an ${sent.email} kommt in den nächsten Minuten. Bestätige deine Adresse, dann sagen wir dir Bescheid, sobald es die App für Android gibt. Schau auch im Spam-Ordner nach.`
            : `Fast geschafft! Wir haben dir eine Mail an ${sent.email} geschickt. Bestätige deine Adresse, dann sagen wir dir Bescheid, sobald es die App für Android gibt.`}
        </AppText>
      ) : (
        <>
          <AppText variant="caption" color={colors.textSecondary} center style={{ marginTop: spacing.sm }}>
            Trag deine E-Mail-Adresse ein, dann sagen wir dir Bescheid, sobald es die App auch für Android gibt.
          </AppText>
          <View style={styles.form}>
            <TextField
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              placeholder="deine@mail.de"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
              onSubmitEditing={submit}
            />
            <Button title="Bescheid sagen, wenn es für Android kommt" icon="mail-outline" onPress={submit} loading={busy} />
          </View>
          <AppText variant="caption" color={colors.textMuted} center style={styles.consent}>
            {CONSENT_TEXT}{' '}
            <AppText
              variant="caption"
              color={colors.cyan}
              onPress={() => Linking.openURL(`${WEB_URL}/datenschutz`).catch(() => {})}
              accessibilityRole="link"
            >
              Datenschutz
            </AppText>
          </AppText>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxl, maxWidth: 560, alignSelf: 'center' },
  title: { marginTop: spacing.lg },
  lead: { marginTop: spacing.sm },
  points: { gap: spacing.md, marginTop: spacing.xxl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cta: { marginTop: spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  form: { gap: spacing.md, marginTop: spacing.lg },
  consent: { marginTop: spacing.md },
  note: { marginTop: spacing.lg, maxWidth: 480, alignSelf: 'center' },
  spinner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
