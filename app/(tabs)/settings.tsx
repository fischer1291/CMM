import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { usePlan } from '../../contexts/PlanContext';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileView } from '../../features/profile/ProfileView';
import { inviteText } from '../../content/links';
import { deleteAccount, exportAccountData } from '../../services/account';
import { pickAvatarImage, uploadAvatar } from '../../services/avatar';
import { redeemWaitlistCode, waitlistRedeemed } from '../../services/waitlistApi';


export default function ProfileScreen() {
  const { isPlus, refresh: refreshPlan } = usePlan();
  const [showWaitlist, setShowWaitlist] = useState(false);
  useEffect(() => {
    waitlistRedeemed().then((done) => setShowWaitlist(!done));
  }, []);

  const redeemWaitlist = async (code: string): Promise<string | null> => {
    try {
      const result = await redeemWaitlistCode(code);
      setShowWaitlist(false);
      if (result.plusDays) refreshPlan().catch(() => {});
      Alert.alert(
        'Von Anfang an 🚀',
        result.plusDays
          ? `Danke, dass du dabei warst! Das Abzeichen ist in deinem Sammelalbum, und weil ${result.referrals} Freunde über deinen Link gekommen sind, hast du ${result.plusDays} Tage Wanna yap+.`
          : 'Danke, dass du von Anfang an dabei bist! Das Abzeichen ist jetzt in deinem Sammelalbum.'
      );
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  };
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

  const exportData = () =>
    exportAccountData().catch(() =>
      Alert.alert('Export fehlgeschlagen', 'Deine Daten konnten nicht exportiert werden. Bitte versuche es erneut.')
    );

  const confirmDelete = () =>
    Alert.alert(
      'Konto löschen?',
      'Dein Profil, deine Moments, deine Gesprächszeit und alle Einstellungen werden endgültig gelöscht. Deine Kontakte sehen dich danach nicht mehr.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Weiter',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Wirklich endgültig löschen?', 'Das lässt sich nicht rückgängig machen.', [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Endgültig löschen',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteAccount();
                    await signOut({ local: true });
                    Alert.alert('Konto gelöscht', 'Deine Daten wurden gelöscht. Schön, dass du da warst.');
                  } catch {
                    Alert.alert('Nicht gelöscht', 'Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.');
                  }
                },
              },
            ]),
        },
      ]
    );

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
      onOpenAlbum={() => router.push('/album')}
      onOpenPlus={() => router.push('/plus')}
      onOpenAppIcon={() => router.push('/appicon')}
      isPlus={isPlus}
      onOpenSupport={() => router.push('/support')}
      onRedeemWaitlist={showWaitlist ? redeemWaitlist : null}
      onOpenSchedule={() => router.push('/schedule')}
      onInvite={() => Share.share({ message: inviteText(userProfile?.name?.split(' ')[0]) })}
      onExportData={exportData}
      onOpenPrivacy={() => router.push('/datenschutz')}
      onOpenImprint={() => router.push('/impressum')}
      onOpenCircles={() => router.push('/circles')}
      onOpenBlocked={() => router.push('/blocked')}
      onSignOut={confirmSignOut}
      onDeleteAccount={confirmDelete}
      version={Constants.expoConfig?.version ?? '1.0.0'}
    />
  );
}
