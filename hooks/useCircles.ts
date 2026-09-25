import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleInvite, CircleSummary, fetchCircles } from '../services/circlesApi';
import { socket } from '../services/socket';

/**
 * My circles and invites, reloaded on focus and live when something happens
 * in a circle (invite, member joined, room opened, someone's availability).
 */
export function useCircles() {
  const [circles, setCircles] = useState<CircleSummary[] | null>(null);
  const [invites, setInvites] = useState<CircleInvite[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    fetchCircles()
      .then((data) => {
        setCircles(data.circles);
        setInvites(data.invites);
      })
      .catch(() => setCircles((c) => c ?? []));
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    // Several events can arrive at once (a room opening): reload once
    const soon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 400);
    };
    const events = ['circleInvite', 'circleUpdated', 'roomOpened', 'roomUpdated', 'statusUpdate'];
    events.forEach((e) => socket.on(e, soon));
    return () => {
      events.forEach((e) => socket.off(e, soon));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reload]);

  return { circles, invites, reload, setInvites };
}
