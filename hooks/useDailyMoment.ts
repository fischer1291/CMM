import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { DailyState, fetchDaily, joinDaily } from '../services/dailyApi';
import { socket } from '../services/socket';

/**
 * The daily Yap Moment: live while it runs, refreshed by socket events; before
 * it starts, `daily.nextAt` says when (the countdown on the first talk card).
 */
export function useDailyMoment() {
  const [daily, setDaily] = useState<DailyState>({ active: false });

  const reload = useCallback(() => {
    fetchDaily()
      .then(setDaily)
      .catch(() => {});
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    const onStart = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      reload();
    };
    // Someone joined (they become available): refresh the participants
    socket.on('dailyMoment', onStart);
    socket.on('statusUpdate', reload);
    return () => {
      socket.off('dailyMoment', onStart);
      socket.off('statusUpdate', reload);
    };
  }, [reload]);

  // Ends on its own
  useEffect(() => {
    if (!daily.active) return;
    const left = new Date(daily.endsAt).getTime() - Date.now();
    const timer = setTimeout(reload, Math.max(1000, left + 1000));
    return () => clearTimeout(timer);
  }, [daily, reload]);

  // Due: load again shortly after nextAt (the server starts it on its minute
  // tick, the "dailyMoment" socket event usually comes first)
  useEffect(() => {
    if (daily.active || !daily.nextAt) return;
    const left = new Date(daily.nextAt).getTime() - Date.now();
    if (Number.isNaN(left)) return;
    const timer = setTimeout(reload, Math.max(1000, left + 1500));
    return () => clearTimeout(timer);
  }, [daily, reload]);

  const join = useCallback(async () => {
    try {
      await joinDaily();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      reload();
      return true;
    } catch (error: any) {
      Alert.alert(
        'Yap Moment',
        error?.code === 'not_active' ? 'Der Moment ist schon vorbei. Morgen gibt es einen neuen!' : 'Das hat leider nicht geklappt.'
      );
      reload();
      return false;
    }
  }, [reload]);

  return { daily, join, reload };
}
