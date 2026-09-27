import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import { useContacts } from '../contexts/ContactsContext';
import { YearReviewView } from '../features/plus/YearReviewView';
import { fetchYearReview, YearReview } from '../services/planApi';
import { WEB_URL } from '../content/links';

export default function YearScreen() {
  const router = useRouter();
  const { find } = useContacts();
  const [review, setReview] = useState<YearReview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetchYearReview()
      .then(setReview)
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const person = (phone: string | undefined, fallback: string | null | undefined) => {
    const contact = phone ? find(phone) : undefined;
    return { name: contact?.name || fallback || 'Jemand', avatarUrl: contact?.avatarUrl ?? null };
  };

  return (
    <YearReviewView
      review={review}
      error={error}
      person={person}
      onClose={() => router.back()}
      onPlus={() => router.push('/plus')}
      onRetry={load}
      onShare={() => {
        if (!review) return;
        const hours = review.minutes >= 120 ? `${Math.round(review.minutes / 60)} Stunden` : `${review.minutes} Minuten`;
        Share.share({ message: `Mein Jahr in Gesprächen: ${hours} mit ${review.people} Menschen, die mir wichtig sind. 💜 Wanna yap? ${WEB_URL}` }).catch(() => {});
      }}
    />
  );
}
