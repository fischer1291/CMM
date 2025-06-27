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
  View,
} from 'react-native';
import defaultAvatar from '../../assets/avatar-placeholder.png';
import { useAuth } from '../../contexts/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../theme';
import CallMeMomentPrompt from '../components/CallMeMomentPrompt';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function IndexScreen() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();
  const { userPhone: authUserPhone, userProfile } = useAuth();

  const {
    name,
    avatarUrl,
    momentActiveUntil,
    lastOnline,
    reloadProfile,
  } = useProfile(userPhone);
  const { formatted: countdown, remaining } = useCountdown(momentActiveUntil);

  useEffect(() => {
    const init = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      const saved = await SecureStore.getItemAsync('userPhone');
      if (saved) {
        setUserPhone(saved);
        await fetchStatus(saved);
        reloadProfile();
      } else {
        router.replace('/(auth)/onboarding');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleTrigger = () => setShowPrompt(true);

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response?.notification?.request?.content?.data?.type === 'callMeMoment') {
        handleTrigger();
      }
    });

    const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
      if (notification?.request?.content?.data?.type === 'callMeMoment') {
        handleTrigger();
      }
    });

    return () => {
      responseSub.remove();
      receiveSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userPhone) {
        reloadProfile();
        fetchStatus(userPhone);
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
      await fetchStatus(userPhone!);
      reloadProfile();
    } catch (e) {
      console.error('❌ Fehler beim Status setzen:', e);
    }
  };

  const formatLastOnline = () => {
    if (isAvailable) return 'Jetzt';
    if (!lastOnline) return '–';
    const date = new Date(lastOnline);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showPrompt && userPhone && (
  <CallMeMomentPrompt
    phone={userPhone}
    onClose={(shouldReload) => {
      setShowPrompt(false);
      reloadProfile();
        fetchStatus(userPhone);
      if (shouldReload && userPhone) {
        reloadProfile();
        fetchStatus(userPhone);
      }
    }}
  />
)}

      <Text style={[styles.greeting, { color: colors.text }]}>
        Guten Tag, {userProfile?.name || name || 'du'} 👋
      </Text>

      <View style={{ alignItems: 'center', padding: 20 }}>
        <Image
          source={{ uri: (userProfile?.avatarUrl || avatarUrl) || defaultAvatar }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
        <Text style={{ fontSize: 18, color: colors.text, padding: 10, fontWeight: '600' }}>
          {userProfile?.name || name || 'Unbekannt'}
        </Text>
        {(userProfile?.name || name) && (
          <Text style={{ fontSize: 14, color: colors.gray, paddingBottom: 10 }}>
            {authUserPhone || userPhone}
          </Text>
        )}
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

      {momentActiveUntil && remaining > 0 && (
        <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.timerTitle, { color: colors.primary }]}>⏳ Call Me Moment aktiv</Text>
          <Text style={[styles.timerValue, { color: colors.text }]}>{countdown} Minuten verbleibend</Text>
        </View>
      )}

      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.gray }]}>Zuletzt erreichbar</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{formatLastOnline()}</Text>
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
  greeting: { fontSize: 20, fontWeight: '600', marginBottom: 10 },
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
  timerCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    padding: 14,
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