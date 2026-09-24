import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme';
import { apiFetch, apiPostJson } from '../../utils/api';
import { deviceRegion, toE164 } from '../../utils/phone';

export default function VerifyScreen() {
  const { colors } = useTheme();
  const { signIn, pendingPhone } = useAuth();

  const [phone, setPhone] = useState(pendingPhone ?? '');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    const e164 = toE164(phone, deviceRegion());
    if (!e164) {
      Alert.alert('Ungültige Nummer', 'Bitte gib deine Handynummer ein, z. B. 0171 1234567.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPostJson('/verify/start', { phone: e164 }, 10000);
      const data = await res.json();
      if (data.success) {
        setVerifiedPhone(e164);
      } else {
        Alert.alert('Fehler', data.error || 'Code konnte nicht gesendet werden.');
      }
    } catch (e) {
      console.error('❌ Fehler bei startVerification:', e);
      Alert.alert('Fehler', 'Netzwerkproblem. Bitte später erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const checkCode = async () => {
    if (!verifiedPhone || !code) {
      Alert.alert('Fehler', 'Bitte gib den Code aus der SMS ein.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPostJson('/verify/check', { phone: verifiedPhone, code: code.trim() }, 10000);
      const data = await res.json();
      if (!data.success) {
        Alert.alert('Fehler', data.error || 'Code ungültig');
        return;
      }

      const token: string | null = data.token ?? null;
      if (!token) {
        // Backend without token auth creates the account here
        await apiPostJson('/auth/register', { phone: verifiedPhone }, 10000);
      }
      // New users set up their profile first; the root layout routes accordingly
      let name: string | undefined = data.user?.name;
      if (name === undefined) {
        const profileRes = await apiFetch(`/me?phone=${encodeURIComponent(verifiedPhone)}`, {}, 10000);
        name = (await profileRes.json())?.user?.name;
      }
      await signIn(verifiedPhone, token, { needsProfileSetup: !name });
    } catch (e) {
      console.error('❌ Fehler bei checkCode:', e);
      Alert.alert('Fehler', 'Netzwerkproblem. Bitte später erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Verifizierung</Text>

      {pendingPhone && !verifiedPhone && (
        <Text style={[styles.note, { color: colors.gray }]}>
          Sicherheitsupdate: Bitte bestätige deine Nummer einmal neu per SMS.
        </Text>
      )}

      {!verifiedPhone ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Deine Nummer</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="0171 1234567"
            placeholderTextColor={colors.gray}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          <Button title="Code senden" onPress={startVerification} disabled={loading} />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Code für {verifiedPhone}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="123456"
            placeholderTextColor={colors.gray}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
          <Button title="Bestätigen" onPress={checkCode} disabled={loading} />
          <Button title="Andere Nummer" onPress={() => setVerifiedPhone(null)} disabled={loading} />
        </>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  note: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  label: { marginTop: 20, fontWeight: '600', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
});
