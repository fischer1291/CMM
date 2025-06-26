import axios from 'axios';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
} from 'react-native-agora';
import Icon from 'react-native-vector-icons/Ionicons';
import ViewShot from 'react-native-view-shot';
import { io } from 'socket.io-client';

const APP_ID = '28a507f76f1a400ba047aa629af4b81d';
const socket = io('https://cmm-backend-gdqx.onrender.com');

export default function VideoCallScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const channel = Array.isArray(rawParams.channel) ? rawParams.channel[0] : rawParams.channel;
  let userPhone = Array.isArray(rawParams.userPhone) ? rawParams.userPhone[0] : rawParams.userPhone;
  if (typeof userPhone === "string" && userPhone.startsWith("+")) {
    userPhone = userPhone.substring(1);
  }
  const agoraSafeUserAccount = userPhone;
  const targetPhone = Array.isArray(rawParams.targetPhone) ? rawParams.targetPhone[0] : rawParams.targetPhone;

  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const viewShotRef = useRef<ViewShot | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [localUid, setLocalUid] = useState<string | null>(null);

  const toggleMute = () => {
    if (engineRef.current) {
      const newMuted = !micMuted;
      engineRef.current.muteLocalAudioStream(newMuted);
      setMicMuted(newMuted);
    }
  };

  const switchCamera = () => {
    if (engineRef.current) {
      engineRef.current.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    }
  };

  useEffect(() => {
    const engine = createAgoraRtcEngine();
    engineRef.current = engine;

    (async () => {
      await engineRef.current?.initialize({ appId: APP_ID });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    })();

    console.log("🎥 Agora Engine initialisiert");

    engine.registerEventHandler({
      onJoinChannelSuccess: (_connection, uid) => {
        console.log(`[Agora] Lokaler User gejoined: ${uid}`);
        setJoined(true);
      },
      onUserJoined: (_connection, uid) => {
        console.log(`[Agora] Remote user joined: ${uid}`);
        setRemoteUid(uid);
      },
      onUserOffline: (_connection, uid, reason) => {
        console.log(`[Agora] Remote user offline: ${uid}, Grund: ${reason}`);
        setRemoteUid(null);
      },
      onError: (err) => {
        console.error('[Agora] Fehler:', err);
      },
    });

    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }

    engine.enableVideo();
    engine.startPreview();
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    return () => {
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.stopPreview();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchTokenAndJoin = async () => {
      try {
        const res = await axios.post("https://cmm-backend-gdqx.onrender.com/rtcToken", {
          channelName: channel,
          uid: agoraSafeUserAccount,
          role: 'publisher',
        });

        const token = res.data.token;
        console.log("✅ Token erhalten:", token);

        await engineRef.current?.joinChannelWithUserAccount(token, channel, userPhone);
        console.log("✅ Agora Channel gejoined:", channel);
        setLocalUid(agoraSafeUserAccount);
      } catch (err) {
        console.error("❌ Fehler beim Token holen oder Channel join:", err);
      }
    };

    if (channel && userPhone) {
      fetchTokenAndJoin();
    }
  }, [channel, userPhone]);

  const disconnectCall = () => {
    if (engineRef.current) {
      try {
        engineRef.current.leaveChannel();
        engineRef.current.stopPreview();
        engineRef.current.release();
        engineRef.current = null;
        console.log('[Agora] Call beendet.');
      } catch (e) {
        console.warn('[Agora] Fehler beim Disconnect:', e);
      }
    }
    setJoined(false);
    setRemoteUid(null);
    setLocalUid(null);

    // optional Navigation zurück
    router.replace('/');
  };

  const handleTakeScreenshot = async () => {
    try {
      const ref = viewShotRef.current;
      if (ref && typeof ref.capture === 'function') {
        const uri = await ref.capture();
        const asset = await MediaLibrary.createAssetAsync(uri);
        console.log('📸 Screenshot gespeichert:', asset.uri);
        alert('Screenshot wurde gespeichert');
      } else {
        console.warn('⚠️ viewShotRef.current ist null');
        alert('Screenshot konnte nicht gemacht werden (Referenz nicht vorhanden)');
      }
    } catch (error) {
      console.error('❌ Fehler beim Screenshot:', error);
      alert('Screenshot fehlgeschlagen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Agora Videoanruf</Text>
      {!joined ? (
        <Text style={styles.status}>Verbindung wird hergestellt...</Text>
      ) : (
        <>
          <View style={styles.videoContainer}>
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.remoteVideo}>
              {remoteUid !== null && (
                <RtcSurfaceView
                  canvas={{ uid: remoteUid }}
                  style={styles.remoteVideo}
                />
              )}
            </ViewShot>
            {joined && (
              <View style={styles.localVideoOverlay}>
                <RtcSurfaceView
                  canvas={{ uid: 0 }}
                  style={styles.localVideo}
                />
              </View>
            )}
          </View>
          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
              <Icon name={micMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={disconnectCall} style={[styles.iconButton, styles.hangupButton]}>
              <Icon name="call" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={switchCamera} style={styles.iconButton}>
              <Icon name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTakeScreenshot} style={styles.iconButton}>
              <Icon name="camera" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e0e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 20,
  },
  status: {
    color: '#aaa',
    fontSize: 16,
  },
  videoContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localVideoOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
  },
  iconButton: {
    backgroundColor: '#555',
    marginHorizontal: 10,
    padding: 15,
    borderRadius: 50,
  },
  hangupButton: {
    backgroundColor: '#e53935',
  },
});