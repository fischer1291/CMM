import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ProfileSetupView } from '../features/profile/ProfileSetupView';
import { pickAvatarImage, uploadAvatar } from '../services/avatar';

export default function ProfileSetupScreen() {
  const { userPhone, updateUserProfile, completeProfileSetup } = useAuth();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (avatarUrl: string) => {
    await updateUserProfile({ name: name.trim(), avatarUrl });
    completeProfileSetup();
  };

  const onSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (avatarUri) {
        const uploaded = await uploadAvatar(avatarUri, userPhone);
        if (!uploaded) {
          Alert.alert('Foto nicht hochgeladen', 'Möchtest du ohne Foto weitermachen?', [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Weiter', onPress: () => saveProfile('').catch(() => {}) },
          ]);
          return;
        }
        await saveProfile(uploaded);
      } else {
        await saveProfile('');
      }
    } catch {
      Alert.alert('Nicht gespeichert', 'Dein Profil konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileSetupView
      name={name}
      onNameChange={setName}
      avatarUri={avatarUri}
      onPickAvatar={async () => {
        const uri = await pickAvatarImage();
        if (uri) setAvatarUri(uri);
      }}
      onSave={onSave}
      onSkip={() =>
        Alert.alert('Später einrichten?', 'Du kannst Name und Foto jederzeit im Profil ergänzen.', [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Später', onPress: completeProfileSetup },
        ])
      }
      saving={saving}
    />
  );
}
