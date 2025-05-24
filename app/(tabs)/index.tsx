import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Image,
  Switch,
  FlatList,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useTheme } from '../../theme';
import defaultAvatar from '../../assets/avatar-placeholder.png';
import { useFocusEffect } from '@react-navigation/native';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function IndexScreen() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const { colors } = useTheme();

  // Dummy-Daten
  const lastActive = 'vor 1 Tag';
  const totalOnlineMinutes = 283; // später evtl. in Sekunden und formatieren
  const onlineContactsCount = 4;

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
        fetchProfile(saved);
      }
    };
    init();
  }, []);

  useFocusEffect(
      useCallback(() => {
        if (userPhone) {
          fetchProfile(userPhone);
        }
      }, [userPhone])
  );

  const fetchStatus = async (phone: string) => {
    try {
      const res = await fetch(`${baseUrl}/status/get?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data?.isAvailable !== undefined) setIsAvailable(data.isAvailable);
    } catch (e) {
      console.error('❌ Fehler bei fetchStatus:', e);
    }
  };

  const fetchProfile = async (phone: string) => {
    try {
      const res = await fetch(`${baseUrl}/me?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success) {
        setName(data.user.name || '');
        setAvatarUrl(data.user.avatarUrl || '');
      }
    } catch (e) {
      console.error('❌ Fehler bei fetchProfile:', e);
    }
  };

  const toggleStatus = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await fetch(`${baseUrl}/status/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, isAvailable: newStatus }),
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
        body: JSON.stringify({ phone }),
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
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
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
        <Text style={[styles.greeting, { color: colors.text }]}>
          Guten Tag, {name || 'du'} 👋
        </Text>

        <View style={{ alignItems: 'center', padding: 20 }}>
          <Image
              source={{ uri: avatarUrl || defaultAvatar }}
              style={{ width: 100, height: 100, borderRadius: 50 }}
          />
          <Text style={{ fontSize: 16, color: colors.gray, padding:10 }}>{userPhone}</Text>
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

        <View style={styles.cardRow}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.gray }]}>
              Zuletzt erreichbar
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {lastActive}
            </Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.gray }]}>
              Gesamtzeit erreichbar
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {totalOnlineMinutes} min
            </Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.gray }]}>
              Erreichbare Kontakte
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {onlineContactsCount}
            </Text>
          </View>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  greeting: { fontSize: 20, fontWeight: '600', marginBottom: 10 },
  label: { marginTop: 20, fontWeight: '600', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
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
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});