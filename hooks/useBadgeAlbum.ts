import { useCallback, useRef, useState } from 'react';
import { Album, AlbumBadge, fetchAlbum, markBadgesSeen } from '../services/badgesApi';

/**
 * The album for the status screen: "Fast geschafft" and badges to celebrate.
 * Call `check()` on focus; `celebrated()` once the overlay is closed.
 */
export function useBadgeAlbum() {
  const [album, setAlbum] = useState<Album | null>(null);
  const [celebrate, setCelebrate] = useState<AlbumBadge[]>([]);
  const showing = useRef(false);

  const check = useCallback(async () => {
    try {
      const data = await fetchAlbum();
      setAlbum(data);
      if (data.new.length && !showing.current) {
        showing.current = true;
        setCelebrate(data.new);
      }
    } catch {
      // Not important enough to bother anyone
    }
  }, []);

  const celebrated = useCallback(() => {
    setCelebrate([]);
    showing.current = false;
    markBadgesSeen().catch(() => {});
  }, []);

  return { album, celebrate, check, celebrated };
}
