// app/components/CallMeMomentPrompt.tsx
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../../theme';

const moods = ['😊', '😐', '😔'];

const CallMeMomentPrompt = ({ phone }: { phone: string | null }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === 'callMeMoment' && phone) {
        setShowModal(true);
      }
    });

    return () => subscription.remove();
  }, [phone]);

  const confirmMoment = async () => {
    if (!phone) return;
    setPending(true);
    try {
      await fetch('https://cmm-backend-gdqx.onrender.com/moment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mood: selectedMood }),
      });
    } catch (err) {
      console.error('❌ Fehler beim Senden der Stimmung:', err);
    } finally {
      setPending(false);
      setShowModal(false);
      setSelectedMood(null);
    }
  };

  return (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>🎯 Call Me Moment</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>Wie fühlst du dich gerade?</Text>

          <View style={styles.moodRow}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: selectedMood === mood ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ color: colors.gray }}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!selectedMood || pending}
              onPress={confirmMoment}
            >
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {pending ? '...' : 'Bestätigen'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default CallMeMomentPrompt;