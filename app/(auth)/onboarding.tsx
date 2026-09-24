import { useRouter } from 'expo-router';
import React from 'react';
import { OnboardingView } from '../../features/auth/OnboardingView';

export default function OnboardingScreen() {
  const router = useRouter();
  return <OnboardingView onStart={() => router.push('/(auth)/verify')} onOpenPrivacy={() => router.push('/datenschutz')} />;
}
