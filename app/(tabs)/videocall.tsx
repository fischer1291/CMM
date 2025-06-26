import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import CallMomentCaptureModal from '../components/callmoments/CallMomentCaptureModal';

const APP_ID = '28a507f76f1a400ba047aa629af4b81d';

export default function VideoCallScreen() {
  const router = useRouter();
  const { userPhone: authUserPhone } = useAuth();
  const { emitCallEnded, onCallEnded } = useCall();
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
  const [isConnecting, setIsConnecting] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'bad' | 'unknown'>('unknown');
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [capturedScreenshotBase64, setCapturedScreenshotBase64] = useState<string | null>(null);
  const [showCallMomentModal, setShowCallMomentModal] = useState(false);

  const getQualityIcon = () => {
    switch (networkQuality) {
      case 'excellent':
        return '📶';
      case 'good':
        return '📶';
      case 'poor':
        return '📵';
      case 'bad':
        return '📵';
      default:
        return '❓';
    }
  };

  const getQualityColor = () => {
    switch (networkQuality) {
      case 'excellent':
        return '#00ff00';
      case 'good':
        return '#ffff00';
      case 'poor':
        return '#ff8800';
      case 'bad':
        return '#ff0000';
      default:
        return '#888888';
    }
  };

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

  const initializeEngine = async () => {
    if (engineRef.current) {
      // Engine already initialized
      return;
    }

    const engine = createAgoraRtcEngine();
    engineRef.current = engine;

    try {
      await engine.initialize({ appId: APP_ID });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      
      // Agora engine initialized

      engine.registerEventHandler({
        onJoinChannelSuccess: (_connection, uid) => {
          setJoined(true);
          setIsConnecting(false);
          setCallStartTime(Date.now());
        },
        onUserJoined: (_connection, uid) => {
          setRemoteUid(uid);
        },
        onUserOffline: (_connection, uid, reason) => {
          setRemoteUid(null);
        },
        onNetworkQuality: (_connection, uid, txQuality, rxQuality) => {
          // Only monitor local user's network quality
          if (uid === 0 || uid.toString() === agoraSafeUserAccount) {
            const quality = Math.max(txQuality, rxQuality);
            if (quality <= 2) {
              setNetworkQuality('excellent');
            } else if (quality <= 3) {
              setNetworkQuality('good');
            } else if (quality <= 4) {
              setNetworkQuality('poor');
            } else {
              setNetworkQuality('bad');
            }
          }
        },
        onError: (err) => {
          Alert.alert(
            'Verbindungsfehler',
            'Ein technischer Fehler ist aufgetreten. Bitte überprüfe deine Internetverbindung und versuche es erneut.',
            [{ text: 'OK' }]
          );
        },
      });

      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        
        if (permissions['android.permission.CAMERA'] !== 'granted' || 
            permissions['android.permission.RECORD_AUDIO'] !== 'granted') {
          Alert.alert(
            'Berechtigungen erforderlich',
            'Für Videoanrufe benötigen wir Zugriff auf Kamera und Mikrofon. Bitte erlaube diese in den Einstellungen.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await engine.enableVideo();
      await engine.startPreview();
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    } catch (error) {
      Alert.alert(
        'Initialisierungsfehler',
        'Die Video-Engine konnte nicht gestartet werden. Bitte starte die App neu und versuche es erneut.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    initializeEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.stopPreview();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Separate useEffect for socket listeners
  useEffect(() => {
    if (!onCallEnded || !channel) return;

    const cleanup = onCallEnded(({ from, channel: endedChannel }) => {
      // Only react if it's for the current call
      if (endedChannel === channel) {
        // Clean up call without notifying remote
        if (engineRef.current) {
          try {
            engineRef.current.leaveChannel();
            engineRef.current.stopPreview();
          } catch (e) {
            // Disconnect error - silent handling as call is ending anyway
          }
        }

        setJoined(false);
        setRemoteUid(null);
        setLocalUid(null);

        // Navigate back to contacts
        router.replace('/(tabs)/contacts');
      }
    });

    return cleanup;
  }, [channel, router, onCallEnded]); // Re-run when channel changes

  // Timer useEffect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (callStartTime && joined) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callStartTime, joined]);

  useEffect(() => {
    const fetchTokenAndJoin = async () => {
      try {
        // Ensure engine is initialized before joining
        await initializeEngine();

        if (!engineRef.current) {
          console.error('❌ Agora Engine not initialized');
          return;
        }

        const res = await axios.post("https://cmm-backend-gdqx.onrender.com/rtcToken", {
          channelName: channel,
          uid: agoraSafeUserAccount,
          role: 'publisher',
        });

        const token = res.data.token;

        // Restart video and preview before joining channel
        await engineRef.current.enableVideo();
        await engineRef.current.startPreview();
        
        await engineRef.current.joinChannelWithUserAccount(token, channel, userPhone);
        setLocalUid(agoraSafeUserAccount);
      } catch (err) {
        Alert.alert(
          'Verbindung fehlgeschlagen',
          'Der Videoanruf konnte nicht hergestellt werden. Bitte überprüfe deine Internetverbindung und versuche es erneut.',
          [
            { text: 'OK', onPress: () => router.replace('/(tabs)/contacts') }
          ]
        );
      }
    };

    if (channel && userPhone) {
      fetchTokenAndJoin();
    }
  }, [channel, userPhone]);

  const cleanupCall = (notifyRemote = false) => {
    if (engineRef.current) {
      try {
        engineRef.current.leaveChannel();
        engineRef.current.stopPreview();
        // Don't release the engine here - keep it for reuse
      } catch (e) {
        // Disconnect error - silent handling as call is ending anyway
      }
    }

    // Notify other user that call has ended (only if we initiated the disconnect)
    if (notifyRemote && channel && userPhone && targetPhone && emitCallEnded) {
      // Ensure userPhone has + prefix for consistency
      const normalizedUserPhone = userPhone.startsWith('+') ? userPhone : `+${userPhone}`;
      
      emitCallEnded(normalizedUserPhone, targetPhone, channel);
    }

    setJoined(false);
    setRemoteUid(null);
    setLocalUid(null);

    // Navigation zurück
    router.replace('/(tabs)/contacts');
  };

  const disconnectCall = () => {
    cleanupCall(true); // Notify remote user
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      throw new Error('Failed to convert image to base64');
    }
  };

  const handleTakeScreenshot = async () => {
    try {
      const ref = viewShotRef.current;
      if (ref && typeof ref.capture === 'function') {
        // Capture with settings optimized for call moments feed display
        const uri = await ref.capture();
        console.log('📸 Screenshot captured:', uri);
        
        // Store the original URI for display in modal
        setCapturedScreenshot(uri);
        
        try {
          // Convert to base64 for cross-device compatibility
          const base64Image = await convertToBase64(uri);
          console.log('📸 Base64 conversion successful, length:', base64Image.length);
          setCapturedScreenshotBase64(base64Image);
        } catch (base64Error) {
          console.error('📸 Base64 conversion failed:', base64Error);
          // If base64 conversion fails, still proceed with the local URI
          setCapturedScreenshotBase64(uri);
        }
        
        setShowCallMomentModal(true);
      } else {
        Alert.alert('Fehler', 'Screenshot konnte nicht erstellt werden. Bitte versuche es erneut.');
      }
    } catch (error) {
      console.error('📸 Screenshot error:', error);
      Alert.alert('Fehler', 'Screenshot fehlgeschlagen. Überprüfe die Berechtigung für den Fotospeicher in den Einstellungen.');
    }
  };

  const handlePostCallMoment = async (callMomentData: any) => {
    try {
      // Use base64 version for posting if available, otherwise use original
      const screenshotToSend = capturedScreenshotBase64 || callMomentData.screenshot;
      
      const postData = {
        ...callMomentData,
        screenshot: screenshotToSend,
        timestamp: new Date().toISOString(),
      };
      
      console.log('🚀 Posting CallMoment with data keys:', Object.keys(postData));
      console.log('🚀 Screenshot length:', screenshotToSend?.length || 0);
      
      console.log('📸 Image size:', Math.round(screenshotToSend?.length/1000), 'KB');
      
      // Check if payload is too large (with 10MB server limit, 500KB should be safe)
      if (screenshotToSend && screenshotToSend.length > 500000) {
        Alert.alert(
          'Bild zu groß',
          `Das Screenshot ist zu groß für den Upload (${Math.round(screenshotToSend.length/1000)}KB). Bitte versuche es erneut.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      const response = await fetch('https://cmm-backend-gdqx.onrender.com/moment/callmoment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      console.log('🚀 Response status:', response.status);
      console.log('🚀 Response ok:', response.ok);
      
      const result = await response.json();
      console.log('🚀 Response result:', result);
      if (result.success) {
        Alert.alert(
          'CallMoment geteilt! 🎉',
          'Dein CallMoment wurde erfolgreich geteilt.',
          [{ text: 'OK' }]
        );
        setShowCallMomentModal(false);
        setCapturedScreenshot(null);
        setCapturedScreenshotBase64(null);
      } else {
        Alert.alert(
          'Fehler',
          'CallMoment konnte nicht geteilt werden. Bitte versuche es erneut.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Verbindungsfehler',
        'CallMoment konnte nicht geteilt werden. Bitte überprüfe deine Internetverbindung.',
        [{ text: 'OK' }]
      );
    }
  };

  const getContactName = (phone: string) => {
    // For now, return the phone number
    // In a real app, you'd fetch this from contacts
    return phone || 'Unbekannt';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Videoanruf</Text>
        <View style={styles.headerRight}>
          {joined && (
            <Text style={styles.timer}>{callDuration}</Text>
          )}
          {!isConnecting && (
            <View style={styles.qualityIndicator}>
              <Text style={[styles.qualityIcon, { color: getQualityColor() }]}>
                {getQualityIcon()}
              </Text>
            </View>
          )}
        </View>
      </View>
      {isConnecting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.status}>Verbindung wird hergestellt...</Text>
        </View>
      ) : (
        <>
          <View style={styles.videoContainer}>
            <ViewShot 
              ref={viewShotRef} 
              options={{ 
                format: 'jpg', 
                quality: 0.9
              }} 
              style={styles.liveVideoContainer}
            >
              <View style={styles.remoteVideoContainer}>
                {remoteUid !== null && (
                  <RtcSurfaceView
                    canvas={{ uid: remoteUid }}
                    style={styles.remoteVideo}
                  />
                )}
              </View>
              {joined && (
                <View style={styles.localVideoOverlay}>
                  <RtcSurfaceView
                    canvas={{ uid: 0 }}
                    style={styles.localVideo}
                  />
                </View>
              )}
            </ViewShot>
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
      
      <CallMomentCaptureModal
        visible={showCallMomentModal}
        onClose={() => {
          setShowCallMomentModal(false);
          setCapturedScreenshot(null);
          setCapturedScreenshotBase64(null);
        }}
        onPost={handlePostCallMoment}
        screenshotUri={capturedScreenshot}
        userPhone={userPhone || ''}
        userName={getContactName(userPhone || '')}
        targetPhone={targetPhone || ''}
        targetName={getContactName(targetPhone || '')}
        callDuration={callDuration}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e0e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  timer: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  status: {
    color: '#aaa',
    fontSize: 16,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveVideoContainer: {
    width: '100%',
    flex: 1, // Use full available height
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    flex: 1,
    aspectRatio: 16/9, // Maintain video's natural aspect ratio
    maxWidth: '100%',
    maxHeight: '100%',
  },
  localVideoOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: '25%', // Responsive width based on container
    aspectRatio: 3/4, // Portrait aspect ratio for local video
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 120, // Maximum size on larger screens
    minWidth: 80,  // Minimum size on smaller screens
  },
  localVideo: {
    flex: 1,
    aspectRatio: 3/4, // Maintain natural aspect ratio
    maxWidth: '100%',
    maxHeight: '100%',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
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