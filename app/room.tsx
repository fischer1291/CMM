import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { RoomTile, RoomView } from '../features/circles/RoomView';
import { AGORA_APP_ID } from '../config/env';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine, RtcSurfaceView } from '../lib/agora';
import { fetchCircle, leaveRoom } from '../services/circlesApi';
import { apiPostJson } from '../utils/api';

type Remote = { uid: number; account: string | null; video: boolean };

async function roomToken(channel: string, account: string): Promise<string> {
  const res = await apiPostJson('/rtcToken', { channelName: channel, uid: account, role: 'publisher' }, 10000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.token !== 'string') throw new Error(`token ${res.status}`);
  return data.token;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A circle's group call ("Offene Runde"). */
export default function RoomScreen() {
  const router = useRouter();
  const { roomId, channel, circleId } = useLocalSearchParams<{ roomId: string; channel: string; circleId: string }>();
  const { userPhone, userProfile } = useAuth();
  const { find } = useContacts();
  const engineRef = useRef<IRtcEngine | null>(null);
  const leftRef = useRef(false);
  const [connecting, setConnecting] = useState(true);
  const [remotes, setRemotes] = useState<Map<number, Remote>>(new Map());
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState('Runde');
  const [memberNames, setMemberNames] = useState<Map<string, { name: string; avatarUrl: string | null }>>(new Map());
  const account = (userPhone ?? '').replace(/^\+/, '');

  // Names of circle members who aren't in the address book
  useEffect(() => {
    if (!circleId) return;
    fetchCircle(circleId)
      .then((c) => {
        setTitle(`${c.emoji} ${c.name}`);
        setMemberNames(new Map(c.members.map((m) => [m.phone.replace(/^\+/, ''), { name: m.name, avatarUrl: m.avatarUrl || null }])));
      })
      .catch(() => {});
  }, [circleId]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const update = (uid: number, patch: Partial<Remote>) =>
    setRemotes((prev) => {
      const next = new Map(prev);
      next.set(uid, { uid, account: null, video: false, ...prev.get(uid), ...patch });
      return next;
    });

  useEffect(() => {
    if (!channel || !account) return;
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA]);
        }
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: AGORA_APP_ID });
        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.registerEventHandler({
          onJoinChannelSuccess: () => setConnecting(false),
          onUserJoined: (_c, uid) => update(uid, {}),
          onUserOffline: (_c, uid) =>
            setRemotes((prev) => {
              const next = new Map(prev);
              next.delete(uid);
              return next;
            }),
          onUserInfoUpdated: (uid, info) => update(uid, { account: info.userAccount ?? null }),
          onRemoteVideoStateChanged: (_c, uid, state) => update(uid, { video: state === 2 || state === 3 }),
          onAudioVolumeIndication: (_c, speakers) => {
            const loudest = [...speakers].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
            setSpeaking(loudest && (loudest.volume ?? 0) > 30 ? (loudest.uid ?? 0) : null);
          },
        });
        engine.enableVideo();
        engine.enableAudioVolumeIndication(400, 3, false);
        engine.startPreview();
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        const token = await roomToken(channel, account);
        if (cancelled) return;
        engine.joinChannelWithUserAccount(token, channel, account);
      } catch (error) {
        console.error('❌ Room join failed:', error);
        Alert.alert('Runde', 'Du konntest der Runde nicht beitreten.', [{ text: 'OK', onPress: () => leave() }]);
      }
    })();
    return () => {
      cancelled = true;
      leave(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per room
  }, [channel, account]);

  const leave = (navigate = true) => {
    if (!leftRef.current) {
      leftRef.current = true;
      const engine = engineRef.current;
      engineRef.current = null;
      try {
        engine?.leaveChannel();
        engine?.release();
      } catch (error) {
        console.warn('Room engine cleanup:', error);
      }
      if (roomId) leaveRoom(roomId).catch(() => {});
    }
    if (navigate) router.back();
  };

  const personFor = (acc: string | null) => {
    const phone = acc ? `+${acc}` : '';
    const contact = phone ? find(phone) : undefined;
    const member = acc ? memberNames.get(acc) : undefined;
    return { name: contact?.name || member?.name || 'Jemand', avatarUrl: contact?.avatarUrl ?? member?.avatarUrl ?? null };
  };

  const tiles: RoomTile[] = [
    {
      key: 'me',
      name: userProfile?.name || 'Du',
      avatarUrl: userProfile?.avatarUrl || null,
      video: cameraOn && !connecting ? <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} /> : null,
      speaking: speaking === 0 && !micMuted,
      isMe: true,
    },
    ...[...remotes.values()].map((r) => {
      const p = personFor(r.account);
      return {
        key: String(r.uid),
        name: p.name,
        avatarUrl: p.avatarUrl,
        video: r.video ? <RtcSurfaceView canvas={{ uid: r.uid }} style={StyleSheet.absoluteFill} /> : null,
        speaking: speaking === r.uid,
        isMe: false,
      };
    }),
  ];

  return (
    <RoomView
      title={title}
      duration={clock(seconds)}
      tiles={tiles}
      connecting={connecting}
      micMuted={micMuted}
      cameraOn={cameraOn}
      onToggleMute={() => {
        const next = !micMuted;
        engineRef.current?.muteLocalAudioStream(next);
        setMicMuted(next);
      }}
      onToggleCamera={() => {
        const next = !cameraOn;
        engineRef.current?.enableLocalVideo(next);
        setCameraOn(next);
      }}
      onSwitchCamera={() => engineRef.current?.switchCamera()}
      onLeave={() => leave()}
    />
  );
}
