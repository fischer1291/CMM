import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import { useNewCall } from '../../contexts/NewCallContext';
import { StatusView } from '../../features/status/StatusView';
import { useCountdown } from '../../hooks/useCountdown';
import { useNudges } from '../../hooks/useNudges';
import { useDailyMoment } from '../../hooks/useDailyMoment';
import { useCircles } from '../../hooks/useCircles';
import { CirclesStrip } from '../../features/circles/CirclesStrip';
import { answerCircleInvite } from '../../services/circlesApi';
import {
  clock,
  fetchSchedule,
  fetchStats,
  nextSlotLabel,
  SessionMinutes,
  startSession,
  talkTime,
} from '../../services/gamificationApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushTokenService from '../../services/PushTokenService';
import { apiFetch, apiPostJson } from '../../utils/api';

// "Später" hides the notification explanation for a week
const PROMPT_DISMISSED_KEY = 'notificationPromptDismissedAt';
const PROMPT_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_OPTIONS = [
  { minutes: 15, label: '15 Min.' },
  { minutes: 30, label: '30 Min.' },
  { minutes: 60, label: '1 Std.' },
];

type OwnStatus = { available: boolean; until: string | null; source: string | null };

export default function StatusScreen() {
  const router = useRouter();
  const { userPhone, userProfile, reloadProfile } = useAuth();
  const { contacts } = useContacts();
  const { startVideoCall } = useNewCall();
  const { received, dismiss: dismissNudges, reload: reloadNudges } = useNudges();
  const { daily, join: joinDaily } = useDailyMoment();
  const { circles, invites: circleInvites, reload: reloadCircles, setInvites: setCircleInvites } = useCircles();

  const answerInvite = async (circleId: string, accept: boolean) => {
    setCircleInvites((list) => list.filter((i) => i.circleId !== circleId));
    try {
      await answerCircleInvite(circleId, accept);
      if (accept) router.push({ pathname: '/circle', params: { id: circleId } });
    } catch {
      Alert.alert('Hat nicht geklappt', 'Bitte versuche es erneut.');
    } finally {
      reloadCircles();
    }
  };

  const [status, setStatus] = useState<OwnStatus>({ available: false, until: null, source: null });
  const [toggling, setToggling] = useState(false);
  const [week, setWeek] = useState<{ label: string; streak: number } | null>(null);
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const { formatted: countdown, remaining } = useCountdown(status.available ? status.until : null);
  // Length of the running session as first seen, for the countdown ring
  const [sessionSeconds, setSessionSeconds] = useState(1);
  useEffect(() => {
    if (status.until) setSessionSeconds(Math.max(1, (new Date(status.until).getTime() - Date.now()) / 1000));
  }, [status.until]);
  const timed = status.available && !!status.until && remaining > 0;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/status/get', {}, 10000);
      const data = await res.json();
      if (typeof data?.isAvailable === 'boolean') {
        setStatus({ available: data.isAvailable, until: data.availableUntil ?? null, source: data.availableSource ?? null });
      }
    } catch {
      // keep the last known state
    }
  }, []);

  const checkNotificationPrompt = useCallback(async () => {
    const [permission, dismissedAt] = await Promise.all([
      PushTokenService.permission(),
      AsyncStorage.getItem(PROMPT_DISMISSED_KEY),
    ]);
    const paused = dismissedAt && Date.now() - Number(dismissedAt) < PROMPT_PAUSE_MS;
    setShowNotificationPrompt(permission === 'undetermined' && !paused);
  }, []);

  const allowNotifications = async () => {
    setShowNotificationPrompt(false);
    if (userPhone) await PushTokenService.requestAndRegister(userPhone);
  };

  const dismissNotifications = () => {
    setShowNotificationPrompt(false);
    AsyncStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())).catch(() => {});
  };

  const loadExtras = useCallback(() => {
    fetchStats()
      .then(({ stats }) => setWeek({ label: talkTime(stats.totals.weekSeconds), streak: stats.streak.current }))
      .catch(() => {});
    fetchSchedule()
      .then(({ next }) => setScheduleLabel(nextSlotLabel(next)))
      .catch(() => {});
  }, []);

  // While visible: refresh now and every minute (a schedule may switch us on)
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      reloadProfile();
      loadExtras();
      checkNotificationPrompt().catch(() => {});
      const timer = setInterval(fetchStatus, 60 * 1000);
      return () => clearInterval(timer);
    }, [fetchStatus, reloadProfile, loadExtras, checkNotificationPrompt])
  );

  // A session ran out: the server switched us off
  useEffect(() => {
    if (status.available && status.until && remaining === 0) {
      const t = setTimeout(fetchStatus, 1500);
      return () => clearTimeout(t);
    }
  }, [status.available, status.until, remaining, fetchStatus]);

  const toggleAvailable = async () => {
    const previous = status;
    const next = !status.available;
    setStatus({ available: next, until: null, source: next ? 'manual' : null }); // optimistic
    setToggling(true);
    try {
      const res = await apiPostJson('/status/set', { phone: userPhone, isAvailable: next }, 10000);
      if (!res.ok) throw new Error(String(res.status));
      // Becoming available answers open nudges on the server
      if (next) reloadNudges();
    } catch {
      setStatus(previous);
      Alert.alert('Nicht gespeichert', 'Dein Status konnte nicht geändert werden. Bitte versuche es erneut.');
    } finally {
      setToggling(false);
    }
  };

  const beginSession = async (minutes: number) => {
    setToggling(true);
    try {
      await startSession(minutes as SessionMinutes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await fetchStatus();
      reloadNudges();
    } catch {
      Alert.alert('Nicht gespeichert', 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
    } finally {
      setToggling(false);
    }
  };

  const availableContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.registered && c.isAvailable)
        .map(({ phone, name, avatarUrl }) => ({ phone, name, avatarUrl })),
    [contacts]
  );

  const nudges = useMemo(
    () =>
      received.map((n) => {
        const contact = contacts.find((c) => c.phone === n.from);
        return { from: n.from, name: contact?.name || n.name || 'Jemand', avatarUrl: contact?.avatarUrl ?? null };
      }),
    [received, contacts]
  );

  let sessionCaption: string | null = null;
  if (timed && status.until) {
    const until = new Date(status.until);
    sessionCaption = status.source === 'schedule' ? `bis ${clock(until.getHours() * 60 + until.getMinutes())}` : `${countdown} übrig`;
  }

  return (
    <>
      <StatusView
        name={userProfile?.name || ''}
        avatarUrl={userProfile?.avatarUrl || null}
        available={status.available}
        onToggleAvailable={toggleAvailable}
        toggling={toggling}
        sessionProgress={timed ? Math.min(1, remaining / sessionSeconds) : null}
        sessionCaption={sessionCaption}
        sessionOptions={SESSION_OPTIONS}
        onStartSession={beginSession}
        availableContacts={availableContacts}
        onCallContact={(phone) => userPhone && startVideoCall(phone, userPhone)}
        nudges={nudges}
        week={week}
        onOpenStats={() => router.push('/stats')}
        scheduleLabel={scheduleLabel}
        onOpenSchedule={() => router.push('/schedule')}
        onOpenProfile={() => router.push('/(tabs)/settings')}
        onDismissNudges={() => dismissNudges()}
        circlesStrip={
          <CirclesStrip
            circles={circles}
            invites={circleInvites}
            myPhone={userPhone}
            onOpen={(id) => router.push({ pathname: '/circle', params: { id } })}
            onNew={(s) => router.push({ pathname: '/circles', params: s ? { newName: s.name, newEmoji: s.emoji } : { newName: '' } })}
            onAnswerInvite={answerInvite}
            onSeeAll={() => router.push('/circles')}
          />
        }
        daily={
          daily.active
            ? {
                endsAt: daily.endsAt,
                joined: daily.joined,
                participants: daily.participants.map((phone) => {
                  const c = contacts.find((x) => x.phone === phone);
                  return { phone, name: c?.name || 'Jemand', avatarUrl: c?.avatarUrl ?? null };
                }),
                onJoin: async () => {
                  if (await joinDaily()) fetchStatus();
                },
                onCall: (phone) => userPhone && startVideoCall(phone, userPhone),
                onSurprise: () => {
                  const pick = daily.participants[Math.floor(Math.random() * daily.participants.length)];
                  if (pick && userPhone) startVideoCall(pick, userPhone);
                },
              }
            : null
        }
        showNotificationPrompt={showNotificationPrompt}
        onAllowNotifications={allowNotifications}
        onDismissNotifications={dismissNotifications}
      />
    </>
  );
}
