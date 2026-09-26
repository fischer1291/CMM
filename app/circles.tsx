import { explainLimit } from '../features/plus/upsell';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CirclesView, JoinCodeSheet, NewCircleSheet } from '../features/circles/CirclesView';
import { useCircles } from '../hooks/useCircles';
import { answerCircleInvite, Audience, createCircle, fetchAudience, joinCircleByCode, saveAudience } from '../services/circlesApi';

export default function CirclesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ newName?: string; newEmoji?: string }>();
  const { userPhone } = useAuth();
  const { circles, invites, reload, setInvites } = useCircles();
  const [audience, setAudience] = useState<Audience>({ mode: 'all', circles: [] });
  const [creating, setCreating] = useState<{ name: string; emoji: string } | null>(
    params.newName !== undefined ? { name: params.newName, emoji: params.newEmoji || '💛' } : null
  );
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAudience().then(setAudience).catch(() => {});
  }, []);

  const open = (id: string) => router.push({ pathname: '/circle', params: { id } });

  const create = async (name: string, emoji: string) => {
    setBusy(true);
    try {
      const circle = await createCircle(name, emoji);
      setCreating(null);
      reload();
      open(circle.id);
    } catch (error: any) {
      if (!explainLimit(error, router)) Alert.alert('Nicht angelegt', error?.code === 'too_many_circles' ? 'Du bist schon in sehr vielen Kreisen.' : 'Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  };

  const join = async (code: string) => {
    setBusy(true);
    try {
      const circle = await joinCircleByCode(code);
      setJoining(false);
      reload();
      open(circle.id);
    } catch (error: any) {
      if (!explainLimit(error, router)) Alert.alert('Nicht beigetreten', 'Diesen Code gibt es nicht. Prüf ihn noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  const answer = async (circleId: string, accept: boolean) => {
    setInvites((list) => list.filter((i) => i.circleId !== circleId));
    try {
      await answerCircleInvite(circleId, accept);
      reload();
      if (accept) open(circleId);
    } catch {
      Alert.alert('Hat nicht geklappt', 'Bitte versuche es erneut.');
      reload();
    }
  };

  const changeAudience = async (next: Audience) => {
    const previous = audience;
    setAudience(next);
    try {
      setAudience(await saveAudience(next));
    } catch {
      setAudience(previous);
      Alert.alert('Nicht gespeichert', 'Die Sichtbarkeit konnte nicht geändert werden.');
    }
  };

  return (
    <>
      <CirclesView
        circles={circles}
        invites={invites}
        audience={audience}
        myPhone={userPhone}
        onBack={() => router.back()}
        onOpen={open}
        onNew={() => setCreating({ name: '', emoji: '💛' })}
        onJoinCode={() => setJoining(true)}
        onAnswerInvite={answer}
        onChangeAudience={changeAudience}
      />
      {creating && (
        <NewCircleSheet initialName={creating.name} initialEmoji={creating.emoji} busy={busy} onCreate={create} onClose={() => setCreating(null)} />
      )}
      {joining && <JoinCodeSheet busy={busy} onJoin={join} onClose={() => setJoining(false)} />}
    </>
  );
}
