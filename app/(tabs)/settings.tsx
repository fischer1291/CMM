import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileView } from '../../features/profile/ProfileView';
import { pickAvatarImage, uploadAvatar } from '../../services/avatar';

const INVITE_TEXT = 'Hey! Ich nutze Call Me Maybe – da siehst du, wann ich Zeit für einen Anruf habe. Lad sie dir runter, dann können wir quatschen!';

export default function ProfileScreen() {
  const router = useRouter();
  const { userPhone, userProfile, updateUserProfile, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);

  const changeAvatar = async () => {
    const uri = await pickAvatarImage();
    if (!uri) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(uri, userPhone);
      if (!url) throw new Error('upload failed');
      await updateUserProfile({ avatarUrl: url });
    } catch {
      Alert.alert('Nicht gespeichert', 'Dein Profilbild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const saveName = async (name: string) => {
    try {
      await updateUserProfile({ name });
    } catch {
      Alert.alert('Nicht gespeichert', 'Dein Name konnte nicht geändert werden.');
      throw new Error('save failed');
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Abmelden?', 'Du kannst dich jederzeit wieder mit deiner Nummer anmelden.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <ProfileView
      name={userProfile?.name || ''}
      phone={userPhone || ''}
      avatarUrl={userProfile?.avatarUrl || null}
      uploadingAvatar={uploading}
      onChangeAvatar={changeAvatar}
      onSaveName={saveName}
      onOpenSystemSettings={() => Linking.openSettings()}
      onOpenNotifications={() => router.push('/notifications')}
      onOpenStats={() => router.push('/stats')}
      onOpenSchedule={() => router.push('/schedule')}
      onInvite={() => Share.share({ message: INVITE_TEXT })}
      onSignOut={confirmSignOut}
      version={Constants.expoConfig?.version ?? '1.0.0'}
    />
  );
}
