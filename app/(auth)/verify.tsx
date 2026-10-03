import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { PRIVACY_UPDATED, TERMS_VERSION } from '../../content/legal';
import { useAuth } from '../../contexts/AuthContext';
import { VerifyView } from '../../features/auth/VerifyView';
import { finishSignIn, verifyOutcome } from '../../features/auth/signInFlow';
import { pendingInviteCode } from '../../services/invites';
import { apiPostJson } from '../../utils/api';
import { deviceRegion, toE164 } from '../../utils/phone';

const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const { signIn, pendingPhone } = useAuth();
  const router = useRouter();
  // Set by onboarding once the age box is ticked; re-verifying an old login
  // skips onboarding and sends nothing, which the backend accepts
  const { ageConfirmed } = useLocalSearchParams<{ ageConfirmed?: string }>();
  const consent = ageConfirmed === '1' ? { ageConfirmed: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_UPDATED } : {};

  const [phone, setPhone] = useState(pendingPhone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async (e164: string) => {
    setLoading(true);
    try {
      const res = await apiPostJson('/verify/start', { phone: e164 }, 10000);
      const data = await res.json();
      if (data.success) {
        setSentTo(e164);
        setCode('');
        setResendIn(RESEND_SECONDS);
      } else {
        setPhoneError(data.error || 'Code konnte nicht gesendet werden.');
      }
    } catch {
      Alert.alert('Keine Verbindung', 'Bitte prüfe deine Internetverbindung und versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const submitPhone = () => {
    const e164 = toE164(phone, deviceRegion());
    if (!e164) {
      setPhoneError('Bitte gib eine gültige Handynummer ein, z. B. 0171 1234567.');
      return;
    }
    setPhoneError(null);
    sendCode(e164);
  };

  const submitCode = async (entered: string = code) => {
    if (!sentTo || entered.length < 6 || loading) return;
    setLoading(true);
    try {
      // Opened through an invite link (app/einladung.tsx): the backend connects
      // both people and credits the inviter
      const inviteCode = await pendingInviteCode();
      const res = await apiPostJson(
        '/verify/check',
        { phone: sentTo, code: entered, ...consent, ...(inviteCode ? { inviteCode } : {}) },
        10000
      );
      const outcome = verifyOutcome(await res.json(), sentTo, ageConfirmed === '1');
      if (outcome.kind === 'error') {
        setCode('');
        Alert.alert('Falscher Code', outcome.message || 'Bitte prüfe den Code aus der SMS.');
        return;
      }
      if (outcome.kind === 'account_check') {
        // The number belonged to an account that was quiet for half a year
        // (plan 2.9): ask first. Back from there means a new SMS, so this
        // screen returns to the number; the invite code stays until sign-in.
        setSentTo(null);
        setCode('');
        router.push({ pathname: '/account-check', params: outcome.params });
        return;
      }
      await finishSignIn(sentTo, outcome, signIn, !!inviteCode);
    } catch {
      Alert.alert('Keine Verbindung', 'Bitte prüfe deine Internetverbindung und versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VerifyView
      step={sentTo ? 'code' : 'phone'}
      phone={phone}
      onPhoneChange={(value) => {
        setPhone(value);
        setPhoneError(null);
      }}
      phoneError={phoneError}
      onSubmitPhone={submitPhone}
      code={code}
      onCodeChange={setCode}
      onSubmitCode={submitCode}
      sentTo={sentTo}
      resendIn={resendIn}
      onResend={() => sentTo && sendCode(sentTo)}
      onChangeNumber={() => {
        setSentTo(null);
        setCode('');
      }}
      loading={loading}
      reverify={!!pendingPhone}
    />
  );
}
