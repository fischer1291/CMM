import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { VerifyView } from '../../features/auth/VerifyView';
import { apiFetch, apiPostJson } from '../../utils/api';
import { deviceRegion, toE164 } from '../../utils/phone';

const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const { signIn, pendingPhone } = useAuth();

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
      const res = await apiPostJson('/verify/check', { phone: sentTo, code: entered }, 10000);
      const data = await res.json();
      if (!data.success) {
        setCode('');
        Alert.alert('Falscher Code', data.error || 'Bitte prüfe den Code aus der SMS.');
        return;
      }

      const token: string | null = data.token ?? null;
      if (!token) {
        // Backend without token auth creates the account here
        await apiPostJson('/auth/register', { phone: sentTo }, 10000);
      }
      // New users set up their profile first; the root layout routes accordingly
      let name: string | undefined = data.user?.name;
      if (name === undefined) {
        const profileRes = await apiFetch(`/me?phone=${encodeURIComponent(sentTo)}`, {}, 10000);
        name = (await profileRes.json())?.user?.name;
      }
      await signIn(sentTo, token, { needsProfileSetup: !name });
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
