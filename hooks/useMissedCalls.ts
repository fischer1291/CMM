import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { fetchUnseenMissed } from '../services/callsApi';
import { socket } from '../services/socket';

/**
 * Missed calls since the call list was last opened: refreshed on focus, when
 * the app comes back, after a call ends, and when another device saw them.
 */
export function useMissedCalls() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    fetchUnseenMissed()
      .then(setCount)
      .catch(() => {});
  }, []);

  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    // The server knows only a moment later that a call ended unanswered
    const onEnded = () => setTimeout(refresh, 800);
    const onSeen = () => setCount(0);
    socket.on('callEnded', onEnded);
    socket.on('callsSeen', onSeen);
    return () => {
      sub.remove();
      socket.off('callEnded', onEnded);
      socket.off('callsSeen', onSeen);
    };
  }, [refresh]);

  return { count, refresh };
}
