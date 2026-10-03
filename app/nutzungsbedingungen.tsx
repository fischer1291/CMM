import { useRouter } from 'expo-router';
import React from 'react';
import { TERMS_SECTIONS } from '../content/legal';
import { LegalView } from '../features/legal/LegalView';

/** Our own terms (plan 2.7), also public on the web (/nutzungsbedingungen, TERMS_URL). */
export default function TermsScreen() {
  const router = useRouter();
  return (
    <LegalView title="Nutzungsbedingungen" sections={TERMS_SECTIONS} onBack={router.canGoBack() ? () => router.back() : undefined} />
  );
}
