import { useRouter } from 'expo-router';
import React from 'react';
import { OnboardingView } from '../../features/auth/OnboardingView';

export default function OnboardingScreen() {
  const router = useRouter();
  // The view only lets onStart through with the age box ticked; the verify
  // screen sends that with the code (POST /verify/check)
  return (
    <OnboardingView
      onStart={() => router.push({ pathname: '/(auth)/verify', params: { ageConfirmed: '1' } })}
      onOpenPrivacy={() => router.push('/datenschutz')}
    />
  );
}
