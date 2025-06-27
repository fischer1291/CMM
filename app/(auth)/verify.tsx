import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
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

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function VerifyScreen() {
  const { colors } = useTheme();
  const { setUserPhone } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  };

  const startVerification = async () => {
    if (!phone.startsWith('+')) {
      Alert.alert('Ungültige Nummer', 'Bitte gib eine Nummer im Format +49... ein.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/verify/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.success) {
        setCodeRequested(true);
        Alert.alert('Code gesendet');
      } else {
        Alert.alert('Fehler', data.error || 'Unbekannter Fehler');
      }
    } catch (e) {
      console.error('❌ Fehler bei startVerification:', e);
      Alert.alert('Fehler', 'Netzwerkproblem. Bitte später erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const checkCode = async () => {
    if (!phone || !code) {
      Alert.alert('Fehler', 'Bitte gib deine Nummer und den Code ein.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/verify/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (data.success) {
        // 🔐 PushToken holen
        const pushToken = await registerForPushNotificationsAsync();

        // ✅ Registrierung im Backend mit optionalem pushToken
        await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            ...(pushToken ? { pushToken } : {}),
          }),
        });

        // 📲 Persistieren und Weiterleitung
        await SecureStore.setItemAsync('userPhone', phone);
        setUserPhone(phone);
        
        // Check if user needs to set up profile
        try {
          const profileResponse = await fetch(`${baseUrl}/me?phone=${encodeURIComponent(phone)}`);
          const profileData = await profileResponse.json();
          
          // If user has no name set, redirect to profile setup
          if (!profileData.success || !profileData.user?.name) {
            router.replace('/(auth)/profile-setup');
          } else {
            router.replace('/');
          }
        } catch (error) {
          // On error, assume profile setup is needed
          router.replace('/(auth)/profile-setup');
        }
        
        console.log('✅ Registrierung abgeschlossen – Phone:', phone, 'PushToken:', pushToken);
      } else {
        Alert.alert('Fehler', data.error || 'Code ungültig');
      }
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

      {!codeRequested ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Deine Nummer</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="+49..."
            placeholderTextColor={colors.gray}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Button title="Code senden" onPress={startVerification} disabled={loading} />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Bestätigungscode</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="123456"
            placeholderTextColor={colors.gray}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <Button title="Bestätigen" onPress={checkCode} disabled={loading} />
        </>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { marginTop: 20, fontWeight: '600', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
});