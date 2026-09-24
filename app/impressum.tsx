import { useRouter } from 'expo-router';
import React from 'react';
import { IMPRINT_SECTIONS } from '../content/legal';
import { LegalView } from '../features/legal/LegalView';

/** Also public on the web (/impressum). */
export default function ImprintScreen() {
  const router = useRouter();
  return (
    <LegalView title="Impressum" sections={IMPRINT_SECTIONS} onBack={router.canGoBack() ? () => router.back() : undefined} />
  );
}
