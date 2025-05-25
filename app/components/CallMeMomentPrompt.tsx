import React, { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../theme';

const moods = ['😊', '😐', '😔'];

const CallMeMomentPrompt = ({
  phone,
  onClose,
}: {
  phone: string;
  onClose: (shouldReload?: boolean) => void;
}) => {
  const [step, setStep] = useState<'confirm' | 'mood' | null>('confirm');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { colors } = useTheme();

  const confirmMoment = async () => {
    if (!phone || !selectedMood) return;
    setPending(true);
    try {
      await fetch('https://cmm-backend-gdqx.onrender.com/moment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mood: selectedMood }),
      });
      onClose(true); // 👉 signalisiere dem IndexScreen, dass reload nötig ist
    } catch (err) {
      console.error('❌ Fehler beim Bestätigen des Moments:', err);
      onClose(false);
    } finally {
      setPending(false);
      setStep(null);
      setSelectedMood(null);
    }
  };

  const handleReject = () => {
    setStep(null);
    setSelectedMood(null);
    onClose(false); // kein reload nötig
  };

  return (
    <Modal visible={!!step} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>🎯 Call Me Moment</Text>

          {step === 'confirm' && (
            <>
              <Text style={[styles.subtitle, { color: colors.text }]}>
                Möchtest du 15 Minuten erreichbar sein?
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={handleReject}>
                  <Text style={{ color: colors.gray }}>Nicht jetzt</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('mood')}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Ja, bin bereit</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'mood' && (
            <>
              <Text style={[styles.subtitle, { color: colors.text }]}>Wie fühlst du dich gerade?</Text>
              <View style={styles.moodRow}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    onPress={() => setSelectedMood(mood)}
                    style={[
                      styles.moodButton,
                      {
                        backgroundColor:
                          selectedMood === mood ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{mood}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={handleReject}>
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
            </>
          )}
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
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
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
    marginTop: 12,
  },
});

export default CallMeMomentPrompt;