import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Share } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { useNewCall } from '../contexts/NewCallContext';
import { CircleView } from '../features/circles/CircleView';
import { PeoplePicker } from '../features/stats/PeoplePicker';
import { WEB_URL } from '../content/links';
import {
  CircleDetail,
  fetchCircle,
  inviteToCircle,
  leaveCircle,
  openRoom,
  removeFromCircle,
  updateCircle,
} from '../services/circlesApi';
import { socket } from '../services/socket';

export default function CircleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userPhone } = useAuth();
  const { contacts, find } = useContacts();
  const { startVideoCall } = useNewCall();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchCircle(id)
      .then(setCircle)
      .catch(() => {
        Alert.alert('Kreis nicht gefunden', 'Vielleicht bist du nicht mehr Mitglied.');
        router.back();
      });
  }, [id, router]);

  useFocusEffect(load);

  useEffect(() => {
    const soon = (payload?: { circleId?: string; removed?: boolean }) => {
      if (payload?.circleId && payload.circleId !== id) return;
      if (payload?.removed) {
        router.back();
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, 300);
    };
    const events = ['circleUpdated', 'roomOpened', 'roomUpdated', 'statusUpdate'];
    events.forEach((e) => socket.on(e, soon));
    return () => events.forEach((e) => socket.off(e, soon));
  }, [id, load, router]);

  const person = useCallback(
    (phone: string, fallback: string) => {
      const c = find(phone);
      const member = circle?.members.find((m) => m.phone === phone);
      return { name: c?.name || fallback || member?.name || 'Jemand', avatarUrl: c?.avatarUrl ?? (member?.avatarUrl || null) };
    },
    [find, circle]
  );

  // Contacts with the app who aren't in the circle yet
  const invitable = useMemo(() => {
    const taken = new Set([...(circle?.members.map((m) => m.phone) ?? []), ...(circle?.invites.map((i) => i.phone).filter(Boolean) ?? [])]);
    return contacts.filter((c) => c.registered && !taken.has(c.phone)).map(({ phone, name, avatarUrl }) => ({ phone, name, avatarUrl }));
  }, [contacts, circle]);

  const room = async () => {
    if (!circle) return;
    setBusy(true);
    try {
      const r = await openRoom(circle.id);
      router.push({ pathname: '/room', params: { roomId: r.id, channel: r.channel, circleId: circle.id } });
    } catch {
      Alert.alert('Runde', 'Die Runde konnte nicht geöffnet werden. Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  };

  const shareLink = () => {
    if (!circle) return;
    const link = `${WEB_URL}/kreis?code=${circle.code}`;
    Share.share({
      message: `Komm in unseren Kreis ${circle.emoji} ${circle.name} bei Wanna yap? ${link} (Code: ${circle.code})`,
    });
  };

  const choose = (title: string, options: string[], destructive?: number) =>
    new Promise<number | null>((resolve) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title, options: [...options, 'Abbrechen'], cancelButtonIndex: options.length, destructiveButtonIndex: destructive },
          (i) => resolve(i === options.length ? null : i)
        );
      } else {
        Alert.alert(title, undefined, [
          ...options.map((text, i) => ({ text, onPress: () => resolve(i) })),
          { text: 'Abbrechen', style: 'cancel' as const, onPress: () => resolve(null) },
        ]);
      }
    });

  const more = async () => {
    if (!circle) return;
    const creator = circle.createdBy === userPhone;
    const options = creator ? ['Umbenennen', 'Mitglied entfernen', 'Kreis verlassen'] : ['Kreis verlassen'];
    const choice = await choose(`${circle.emoji} ${circle.name}`, options, options.length - 1);
    if (choice === null) return;
    const action = options[choice];
    if (action === 'Umbenennen' && Platform.OS === 'ios') {
      Alert.prompt('Kreis umbenennen', undefined, async (name) => {
        if (name?.trim()) setCircle(await updateCircle(circle.id, { name: name.trim() }));
      }, 'plain-text', circle.name);
    }
    if (action === 'Mitglied entfernen') {
      const others = circle.members.filter((m) => m.phone !== userPhone);
      const pick = await choose('Wen entfernen?', others.map((m) => person(m.phone, m.name).name), undefined);
      if (pick !== null) {
        await removeFromCircle(circle.id, others[pick].phone).catch(() => Alert.alert('Nicht entfernt', 'Bitte versuche es erneut.'));
        load();
      }
    }
    if (action === 'Kreis verlassen') {
      Alert.alert(`${circle.name} verlassen?`, 'Du kannst über eine neue Einladung wieder beitreten.', [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Verlassen',
          style: 'destructive',
          onPress: async () => {
            await leaveCircle(circle.id).catch(() => {});
            router.back();
          },
        },
      ]);
    }
  };

  return (
    <>
      <CircleView
        circle={circle}
        myPhone={userPhone}
        person={person}
        busy={busy}
        onBack={() => router.back()}
        onMore={more}
        onRoom={room}
        onCall={(phone) => userPhone && startVideoCall(phone, userPhone)}
        onInvite={() => setPicking(true)}
        onShareLink={shareLink}
        onSendDrafts={async () => {
          if (!circle) return;
          try {
            setCircle(await inviteToCircle(circle.id, { drafts: true }));
          } catch {
            Alert.alert('Nicht gesendet', 'Bitte versuche es erneut.');
          }
        }}
        onSaveRitual={async (ritual) => {
          if (!circle) return;
          try {
            setCircle(await updateCircle(circle.id, { ritual }));
          } catch {
            Alert.alert('Nicht gespeichert', 'Das Ritual konnte nicht gespeichert werden.');
          }
        }}
      />
      {picking && circle && (
        <PeoplePicker
          title={`Wen lädst du in ${circle.emoji} ${circle.name} ein?`}
          people={invitable}
          initial={[]}
          onCancel={() => setPicking(false)}
          onDone={async (phones) => {
            setPicking(false);
            if (!phones.length) return;
            try {
              setCircle(await inviteToCircle(circle.id, { phones }));
            } catch {
              Alert.alert('Nicht eingeladen', 'Bitte versuche es erneut.');
            }
          }}
        />
      )}
    </>
  );
}
