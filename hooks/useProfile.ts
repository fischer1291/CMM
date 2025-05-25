// hooks/useProfile.ts
import { useCallback, useEffect, useState } from 'react';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export const useProfile = (phone: string | null) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [lastOnline, setLastOnline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    if (!phone) return;
    setLoading(true);
    fetch(`${baseUrl}/me?phone=${encodeURIComponent(phone)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setName(data.user.name || '');
          setAvatarUrl(data.user.avatarUrl || '');
          setLastOnline(data.user.lastOnline || '');
          console.log("useprofile: "+lastOnline);
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
    loading,
    error,
    setName,
    setAvatarUrl,
    reloadProfile: loadProfile
  };
};