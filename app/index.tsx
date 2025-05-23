import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import theme from '../theme';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function IndexScreen() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const mode = useColorScheme();

  useEffect(() => {
    SecureStore.getItemAsync('userPhone').then(saved => {
      if (saved) {
        setUserPhone(saved);
        fetchStatus(saved);
      }
    });
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
      <View style={[styles.container, mode === 'dark' && { backgroundColor: '#000' }]}>
        {!userPhone ? (
            <>
              <Text style={styles.title}>📱 Registrierung</Text>
              {!codeRequested ? (
                  <>
                    <Text style={styles.label}>Deine Nummer</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+49..."
                        placeholderTextColor={theme.colors.gray}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                    />
                    <Button title="Code senden" onPress={startVerification} />
                  </>
              ) : (
                  <>
                    <Text style={styles.label}>Bestätigungscode</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Code"
                        placeholderTextColor={theme.colors.gray}
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
              <Text style={styles.title}>👋 Hallo, du bist aktuell:</Text>
              <Text style={styles.statusText}>{isAvailable ? '✅ erreichbar' : '❌ nicht erreichbar'}</Text>
              <Button
                  title={isAvailable ? 'Nicht erreichbar' : 'Erreichbar'}
                  onPress={toggleStatus}
                  color={isAvailable ? theme.colors.error : theme.colors.success}
              />
              <View style={{ marginTop: 20 }}>
                <Button title="Abmelden" color={theme.colors.gray} onPress={logout} />
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
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold,
  },
  label: {
    marginTop: 20,
    fontWeight: '600',
    fontSize: 16,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  statusText: {
    fontSize: 18,
    marginVertical: 20,
    textAlign: 'center',
    color: theme.colors.text,
  },
});