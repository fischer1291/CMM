import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useContacts } from '../../contexts/ContactsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LockedMoment, Moment, toggleReaction, toLockedMoment, toMoment, UnlockState } from '../../features/moments/model';
import { UnlockCelebration } from '../../features/moments/UnlockCelebration';
import { ConsentSheet } from '../../features/moments/ConsentSheet';
import { answerMoment } from '../../services/dailyApi';
import { socket } from '../../services/socket';
import { MomentsView } from '../../features/moments/MomentsView';
import { useSafetyMenu } from '../../hooks/useSafetyMenu';
import { apiFetch, apiPostJson } from '../../utils/api';

// The unlock celebration plays once a day
const CELEBRATED_KEY = 'momentsUnlockCelebrated';

export default function MomentsScreen() {
  const router = useRouter();
  const { userPhone, userProfile } = useAuth();
  const { find } = useContacts();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [requests, setRequests] = useState<Moment[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [lock, setLock] = useState({ locked: false, count: 0 });
  const [lockedMoments, setLockedMoments] = useState<LockedMoment[]>([]);
  const [unlock, setUnlock] = useState<UnlockState | null>(null);
  const [celebrate, setCelebrate] = useState<{ screenshot: string | null; count: number } | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const safety = useSafetyMenu();
  const endCelebration = useCallback(() => setCelebrate(null), []);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/moment/callmoments', {}, 10000);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMoments((data.callMoments ?? []).map(toMoment));
      setRequests((data.pending ?? []).map(toMoment));
      setWaitingCount((data.waiting ?? []).length);
      setLock({ locked: !!data.locked, count: data.lockedCount ?? 0 });
      setLockedMoments((data.lockedMoments ?? []).map(toLockedMoment));
      const state: UnlockState | null = data.unlock ?? null;
      setUnlock(state);

      // Once a day, the first time friends' moments are visible: lift the blur
      if (state?.unlocked) {
        const all: Moment[] = (data.callMoments ?? []).map(toMoment);
        const friends = all.filter((m) => m.userPhone.replace(/^\+?/, '+') !== userPhone && m.targetPhone.replace(/^\+?/, '+') !== userPhone);
        const today = new Date().toLocaleDateString('sv-SE');
        const seen = await AsyncStorage.getItem(CELEBRATED_KEY).catch(() => null);
        if (friends.length && seen !== today) {
          setCelebrate({ screenshot: friends[0].screenshot, count: friends.length });
          AsyncStorage.setItem(CELEBRATED_KEY, today).catch(() => {});
        }
      }
    } catch {
      Alert.alert('Keine Verbindung', 'Moments konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userPhone]);

  useFocusEffect(
    useCallback(() => {
      load();
      // A consent request or an approval arrives live
      socket.on('momentConsent', load);
      socket.on('momentShared', load);
      return () => {
        socket.off('momentConsent', load);
        socket.off('momentShared', load);
      };
    }, [load])
  );

  const answer = async (approve: boolean) => {
    const request = requests[0];
    if (!request) return;
    setAnswering(true);
    try {
      await answerMoment(request.id, approve);
      const rest = requests.slice(1);
      setRequests(rest);
      if (!rest.length) setShowRequests(false);
      load();
    } catch {
      Alert.alert('Nicht gespeichert', 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
    } finally {
      setAnswering(false);
    }
  };

  const react = async (momentId: string, emoji: string) => {
    const before = moments;
    setMoments((prev) => prev.map((m) => (m.id === momentId ? toggleReaction(m, emoji) : m)));
    try {
      const res = await apiPostJson('/moment/react', { momentId, userPhone, emoji }, 10000);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      // Server state wins (other people may have reacted meanwhile)
      setMoments((prev) =>
        prev.map((m) =>
          m.id === momentId ? { ...m, reactions: data.reactions ?? [], totalReactions: data.totalReactions ?? 0 } : m
        )
      );
    } catch {
      setMoments(before);
    }
  };

  // Own moments show the own profile; others the address book name
  const person = (phone: string, fallbackName: string) => {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    if (normalized === userPhone) {
      return { name: userProfile?.name || 'Du', avatarUrl: userProfile?.avatarUrl || null };
    }
    const contact = find(normalized);
    return { name: contact?.name || fallbackName || 'Unbekannt', avatarUrl: contact?.avatarUrl ?? null };
  };

  return (
    <>
      <MomentsView
        requestCount={requests.length}
        waitingCount={waitingCount}
        locked={lock.locked}
        lockedCount={lock.count}
        lockedMoments={lockedMoments}
        unlock={unlock}
        onOpenRequests={() => setShowRequests(true)}
        onOpenMemories={() => router.push('/memories')}
        myPhone={userPhone}
        onMore={(moment) => {
          const author = person(moment.userPhone, moment.userName);
          const phone = moment.userPhone.startsWith('+') ? moment.userPhone : `+${moment.userPhone}`;
          safety.open({ phone, name: author.name, momentId: moment.id }, () =>
            // Blocked: their moments leave the feed
            setMoments((prev) => prev.filter((m) => m.userPhone.replace(/^\+?/, '+') !== phone))
          );
        }}
        moments={moments}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        onReact={react}
        person={person}
        onGoToContacts={() => router.push('/(tabs)/contacts')}
      />
      {celebrate && (
        <UnlockCelebration
          screenshot={celebrate.screenshot}
          count={celebrate.count}
          streak={unlock?.streak ?? 0}
          via={unlock?.via ?? null}
          onDone={endCelebration}
        />
      )}
      {showRequests && requests[0] && (
        <ConsentSheet
          request={requests[0]}
          count={requests.length}
          authorName={person(requests[0].userPhone, requests[0].userName).name}
          busy={answering}
          onApprove={() => answer(true)}
          onDecline={() => answer(false)}
          onClose={() => setShowRequests(false)}
        />
      )}
    </>
  );
}
