import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AlbumView, BadgeSheet, SHOWCASE_MAX } from '../features/album/AlbumView';
import { Album, AlbumBadge, fetchAlbum, markBadgesSeen, saveShowcase } from '../services/badgesApi';

export default function AlbumScreen() {
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<AlbumBadge | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await fetchAlbum();
      setAlbum(data);
      // Seeing them here counts as celebrated
      if (data.new.length) markBadgesSeen().catch(() => {});
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePin = async (badge: AlbumBadge) => {
    if (!album) return;
    const pinned = album.showcase.includes(badge.id);
    const next = pinned ? album.showcase.filter((id) => id !== badge.id) : [...album.showcase, badge.id].slice(0, SHOWCASE_MAX);
    setSaving(true);
    try {
      const showcase = await saveShowcase(next);
      setAlbum({ ...album, showcase });
      setSelected(null);
    } catch {
      Alert.alert('Nicht gespeichert', 'Deine Vitrine konnte nicht geändert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AlbumView album={album} error={error} onRetry={load} onBack={() => router.back()} onSelect={setSelected} />
      {selected && album ? (
        <BadgeSheet
          badge={selected}
          pinned={album.showcase.includes(selected.id)}
          canPin={album.showcase.length < SHOWCASE_MAX}
          busy={saving}
          onTogglePin={() => togglePin(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
