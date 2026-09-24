import { useRouter } from 'expo-router';
import React from 'react';
import { PRIVACY_SECTIONS } from '../content/legal';
import { LegalView } from '../features/legal/LegalView';

/** Also the public privacy policy URL on the web (/datenschutz). */
export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <LegalView title="Datenschutz" sections={PRIVACY_SECTIONS} onBack={router.canGoBack() ? () => router.back() : undefined} />
  );
}
