import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../../theme';

const moods = ['😊', '😐', '😔'];

export default function MomentCaptureModal({
  visible,
  onClose,
  onUpload,
  phone,
}: {
  visible: boolean;
  onClose: () => void;
  onUpload: (data: { image: string; mood: string; text: string }) => void;
  phone: string;
}) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mood, setMood] = useState<string>('😊');
  const [text, setText] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = () => {
    if (imageUri && mood) {
      onUpload({ image: imageUri, mood, text });
      reset();
    }
  };

  const reset = () => {
    setImageUri(null);
    setMood('😊');
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>📸 Deinen Moment festhalten</Text>

          {!imageUri ? (
            <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
              <Text style={{ color: colors.gray }}>Kamera öffnen</Text>
            </TouchableOpacity>
          ) : (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          )}

          <View style={styles.moodRow}>
            {moods.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMood(m)}
                style={[styles.moodButton, { backgroundColor: mood === m ? colors.primary : colors.border }]}
              >
                <Text style={{ fontSize: 22 }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Was möchtest du teilen?"
            placeholderTextColor={colors.gray}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={text}
            onChangeText={setText}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={reset}>
              <Text style={{ color: colors.gray }}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleUpload} disabled={!imageUri}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Posten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePlaceholder: {
    height: 180,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  preview: {
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});