import { useCallback, useEffect, useState } from 'react';
import { fetchWithTimeout } from '../utils/apiUtils';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export const useProfile = (phone: string | null) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [lastOnline, setLastOnline] = useState('');
  const [momentActiveUntil, setMomentActiveUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    if (!phone) return;

    setLoading(true);
    fetchWithTimeout(`${baseUrl}/me?phone=${encodeURIComponent(phone)}`, {}, 10000)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setName(data.user.name || '');
          setAvatarUrl(data.user.avatarUrl || '');
          setLastOnline(data.user.lastOnline || '');
          setMomentActiveUntil(data.user.momentActiveUntil || null);
          setError(null);
        } else {
          setError('Profil konnte nicht geladen werden');
        }
      })
      .catch(() => setError('Fehler beim Laden des Profils'))
      .finally(() => setLoading(false));
  }, [phone]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    name,
    avatarUrl,
    lastOnline,
    momentActiveUntil,
    loading,
    error,
    setName,
    setAvatarUrl,
    reloadProfile: loadProfile
  };
};