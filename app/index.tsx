import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useTheme } from '../theme';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function IndexScreen() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const { colors, fonts, mode } = useTheme();

  useEffect(() => {
    const init = async () => {
      // Berechtigung für Notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('📵 Push-Benachrichtigungen wurden nicht erlaubt');
        }
      }

      // Lokale Nummer prüfen
      const saved = await SecureStore.getItemAsync('userPhone');
      if (saved) {
        setUserPhone(saved);
        fetchStatus(saved);
      }
    };

    init();
  }, []);

  const fetchStatus = async (phone: string) => {
    try {
      const res = await fetch(`${baseUrl}/status/get?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data?.isAvailable !== undefined) setIsAvailable(data.isAvailable);
    } catch (e) {
      console.error('❌ Fehler bei fetchStatus:', e);
    }
  };

  const toggleStatus = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await fetch(`${baseUrl}/status/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, isAvailable: newStatus })
      });
    } catch (e) {
      console.error('❌ Fehler beim Status setzen:', e);
    }
  };

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
    try {
      const res = await fetch(`${baseUrl}/verify/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Code gesendet');
        setCodeRequested(true);
      } else {
        Alert.alert('Fehler', data.error || 'Unbekannter Fehler');
      }
    } catch (e) {
      console.error('❌ Fehler bei startVerification:', e);
      Alert.alert('Fehler', 'Keine gültige Serverantwort erhalten.');
    }
  };

  const checkCode = async () => {
    try {
      const res = await fetch(`${baseUrl}/verify/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (data.success) {
        await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });

        await SecureStore.setItemAsync('userPhone', phone);
        setUserPhone(phone);

        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await fetch(`${baseUrl}/auth/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, pushToken }),
          });
        }

      } else {
        Alert.alert('Fehler', data.error || 'Code ungültig');
      }
    } catch (e) {
      console.error('❌ Fehler bei checkCode:', e);
      Alert.alert('Fehler', 'Keine gültige Serverantwort erhalten.');
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userPhone');
    setUserPhone(null);
    setCodeRequested(false);
  };

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!userPhone ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>📱 Registrierung</Text>
              {!codeRequested ? (
                  <>
                    <Text style={[styles.label, { color: colors.text }]}>Deine Nummer</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                        placeholder="+49..."
                        placeholderTextColor={colors.placeholder}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                    />
                    <Button title="Code senden" onPress={startVerification} />
                  </>
              ) : (
                  <>
                    <Text style={[styles.label, { color: colors.text }]}>Bestätigungscode</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                        placeholder="Code"
                        placeholderTextColor={colors.placeholder}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                    />
                    <Button title="Code prüfen" onPress={checkCode} />
                  </>
              )}
            </>
        ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>👋 Hallo, du bist aktuell:</Text>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isAvailable ? '✅ erreichbar' : '❌ nicht erreichbar'}
              </Text>
              <Button
                  title={isAvailable ? 'Nicht erreichbar' : 'Erreichbar'}
                  onPress={toggleStatus}
                  color={isAvailable ? colors.error : colors.success}
              />
              <View style={{ marginTop: 20 }}>
                <Button title="Abmelden" color={colors.gray} onPress={logout} />
              </View>
            </>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  label: {
    marginTop: 20,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  statusText: {
    fontSize: 18,
    marginVertical: 20,
    textAlign: 'center',
  },
});