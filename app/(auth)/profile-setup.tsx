import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme';

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const { userPhone, updateUserProfile, isProfileLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        'Berechtigung erforderlich',
        'Wir benötigen Zugriff auf deine Fotobibliothek, um ein Profilbild auszuwählen.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      
      // Add phone number to the request
      if (userPhone) {
        formData.append('phone', userPhone);
      }

      const response = await fetch('https://cmm-backend-gdqx.onrender.com/upload/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      
      if (data.success && data.avatarUrl) {
        return data.avatarUrl;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein.');
      return;
    }

    setIsUploading(true);

    try {
      let finalAvatarUrl = '';

      // Upload avatar if one was selected
      if (avatarUri) {
        const uploadedUrl = await uploadImage(avatarUri);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          Alert.alert(
            'Upload-Fehler',
            'Das Profilbild konnte nicht hochgeladen werden. Möchtest du trotzdem fortfahren?',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Fortfahren', onPress: () => saveProfileData('') },
            ]
          );
          return;
        }
      }

      await saveProfileData(finalAvatarUrl);
    } catch (error) {
      console.error('Profile setup error:', error);
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfileData = async (avatarUrl: string) => {
    await updateUserProfile({
      name: name.trim(),
      avatarUrl,
    });

    router.replace('/');
  };

  const handleSkip = () => {
    Alert.alert(
      'Profil überspringen?',
      'Du kannst dein Profil später in den Einstellungen vervollständigen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Überspringen', onPress: () => router.replace('/') },
      ]
    );
  };

  const generateAvatarUrl = (name: string) => {
    const encodedName = encodeURIComponent(name.trim() || 'User');
    return `https://ui-avatars.com/api/?name=${encodedName}&background=007AFF&color=ffffff&rounded=true&size=128`;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profil erstellen</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>
            Erzähle anderen, wer du bist
          </Text>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : name.trim() ? (
              <Image source={{ uri: generateAvatarUrl(name) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.avatarPlaceholderText, { color: colors.gray }]}>📷</Text>
              </View>
            )}
            <View style={[styles.avatarOverlay, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarOverlayText}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.gray }]}>
            Tippe, um ein Foto auszuwählen
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.text }]}>Dein Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Wie sollen dich andere nennen?"
            placeholderTextColor={colors.gray}
            value={name}
            onChangeText={setName}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text style={[styles.charCount, { color: colors.gray }]}>
            {name.length}/50
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveProfile}
            disabled={isUploading || isProfileLoading || !name.trim()}
          >
            {isUploading || isProfileLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Profil speichern</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
            onPress={handleSkip}
            disabled={isUploading || isProfileLoading}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.gray }]}>
              Später einrichten
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarOverlayText: {
    fontSize: 16,
  },
  avatarHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  buttonSection: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});