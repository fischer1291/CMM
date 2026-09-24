import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { CallHistoryEntry, fetchCallHistory } from '../services/callsApi';

/** Call history, reloaded whenever the screen comes into focus. */
export function useCallHistory(limit = 50) {
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchCallHistory(limit)
        .then((list) => active && setCalls(list))
        .catch(() => {})
        .finally(() => active && setLoaded(true));
      return () => {
        active = false;
      };
    }, [limit])
  );

  return { calls, loaded };
}
