import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  type AcquisitionChoice,
  acquisitionAnswer,
  acquisitionStepVisible,
  initialAcquisitionChoice,
} from '../features/profile/acquisitionStep';
import { AcquisitionStepView, ProfileSetupView } from '../features/profile/ProfileSetupView';
import { sendAcquisition } from '../services/acquisitionApi';
import { pickAvatarImage, uploadAvatar } from '../services/avatar';

export default function ProfileSetupScreen() {
  const { userPhone, userProfile, updateUserProfile, completeProfileSetup, reloadProfile } = useAuth();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Plan 2.10: after the name, optionally where they heard of us
  const [step, setStep] = useState<'name' | 'acquisition'>('name');
  const [choice, setChoice] = useState<AcquisitionChoice>(() => initialAcquisitionChoice(userProfile));

  const saveProfile = async (avatarUrl: string) => {
    await updateUserProfile({ name: name.trim(), avatarUrl });
    if (acquisitionStepVisible(userProfile)) {
      setChoice(initialAcquisitionChoice(userProfile));
      setStep('acquisition');
    } else {
      completeProfileSetup();
    }
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

  if (step === 'acquisition') {
    const answer = acquisitionAnswer(choice);
    return (
      <AcquisitionStepView
        choice={choice}
        onChange={setChoice}
        canContinue={!!answer}
        onContinue={() => {
          // Sent in the background: a failure stays silent, the app opens either way
          if (answer) sendAcquisition(answer).then(reloadProfile, () => {});
          completeProfileSetup();
        }}
        onSkip={completeProfileSetup}
      />
    );
  }

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
