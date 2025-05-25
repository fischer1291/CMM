import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import defaultAvatar from '../../assets/avatar-placeholder.png';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../theme';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function IndexScreen() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const router = useRouter();
  const { colors } = useTheme();

  const { name, avatarUrl, reloadProfile } = useProfile(userPhone);

  useEffect(() => {
    const init = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      const saved = await SecureStore.getItemAsync('userPhone');
      if (saved) {
        console.log("Phone:" + saved);
        setUserPhone(saved);
        fetchStatus(saved);
      } else {
        router.replace('/(auth)/onboarding');
      }
    };
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userPhone) {
        reloadProfile();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.greeting, { color: colors.text }]}>Guten Tag, {name || 'du'} 👋</Text>

      <View style={{ alignItems: 'center', padding: 20 }}>
        <Image
          source={{ uri: avatarUrl || defaultAvatar }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
        <Text style={{ fontSize: 16, color: colors.gray, padding: 10 }}>{userPhone}</Text>
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
          <Text style={[styles.cardLabel, { color: colors.gray }]}>Zuletzt erreichbar</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>vor 1 Tag</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.gray }]}>Gesamtzeit erreichbar</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>283 min</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.gray }]}>Erreichbare Kontakte</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>4</Text>
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