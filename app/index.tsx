import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Image,
  Switch
} from 'react-native';
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

  const { colors, fonts } = useTheme();

  useEffect(() => {
    const init = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

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
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
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
    }
  };

  if (!userPhone) {
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        </View>
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.profileSection}>
          <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy9vJcd7MwHTueWR7UkfpzCQpg6OokIs_6K-Jhe21d62QBq5tgt9H-kBv4fkIUB2jwDpq1BU_ips9QCfIW7_CzfH5sWJfEo7omg62nv0I8ilbRtd9p3dnugYHj0Pds9S-GtfZQWJYm7H2CaVNfXnOCVHvkCSCCZ9PtDfNMfh-5_D6Z3lkeC2PIhyxFXCFqH-oQ1bZfir9Zg4LJBG65Ew8FE6TSZ3iCt3Sq4mmQpOlIR90s2GYJNIRAH9T7or5tr3BVttUAKHUR4EA' }}
              style={styles.avatar}
          />
          <Text style={[styles.name, { color: colors.text }]}>Ava Harper</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>Software Engineer</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            {isAvailable ? '✅ Du bist erreichbar' : '❌ Du bist nicht erreichbar'}
          </Text>
          <Switch
              value={isAvailable}
              onValueChange={toggleStatus}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor="#fff"
          />
        </View>
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
  profileSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});