import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
} from '../lib/agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '../contexts/AuthContext';
import { useNewCall } from '../contexts/NewCallContext';
import CallMomentCaptureModal from '../components/callmoments/CallMomentCaptureModal';
import { resolveContact, normalizePhone } from '../utils/contactResolver';
import { CallPhase, CallView, localPreviewStyle } from '../features/call/CallView';
import CallNotificationService from '../services/CallNotificationService';
import CallStateManager from '../services/CallStateManager';
import { apiFetch, apiPostJson } from '../utils/api';
import { AGORA_APP_ID } from '../config/env';


/**
 * Agora token for this call. The backend only issues it once it knows the
 * call; the caller's socket callRequest may still be in flight, so a 403 is
 * retried briefly.
 */
async function fetchRtcToken(channel: string, account: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await apiPostJson('/rtcToken', { channelName: channel, uid: account, role: 'publisher' }, 10000);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.token === 'string') return data.token;
      throw new Error('RTC token missing in response');
    }
    if (res.status !== 403 || attempt >= 4) {
      throw new Error(`RTC token request failed: ${res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Local file path of the ringback tone for Agora's audio mixing. */
async function ringbackPath(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../assets/sounds/ringback.wav'));
    await asset.downloadAsync();
    return asset.localUri ? decodeURI(asset.localUri.replace(/^file:\/\//, '')) : null;
  } catch {
    return null;
  }
}

/** What the caller sees when the call ends before or during the conversation. */
function endMessageFor(reason: string | undefined, name: string): string | null {
  switch (reason) {
    case 'declined':
      return `${name} hat abgelehnt`;
    case 'missed':
      return `${name} geht gerade nicht ran`;
    case 'busy':
      return `${name} telefoniert gerade`;
    case 'unreachable':
      return `${name} ist gerade nicht erreichbar`;
    case 'hangup':
      return 'Anruf beendet';
    case 'invalid':
    case 'server_error':
    case 'channel_in_use':
    case 'failed':
      return 'Anruf konnte nicht aufgebaut werden';
    default:
      return null;
  }
}

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Route entry: validates the params before the call screen (and its hooks)
 * mounts, so the screen itself never has to return early.
 */
export default function VideoCallRoute() {
  const router = useRouter();
  const { userPhone: authUserPhone } = useAuth();
  const rawParams = useLocalSearchParams();

  const channel = firstParam(rawParams.channel);
  // Agora user account: the phone number without the leading "+"
  const userPhone = firstParam(rawParams.userPhone)?.replace(/^\+/, '');
  const targetPhone = firstParam(rawParams.targetPhone);
  const isOutgoing = firstParam(rawParams.isOutgoing) === 'true';

  // Only the authenticated user may join as userPhone
  const authPhone = authUserPhone?.replace(/^\+/, '');
  const isForeignUser = !!authPhone && !!userPhone && authPhone !== userPhone;
  const isValid = !!channel && !!userPhone && !!targetPhone && !isForeignUser;

  useEffect(() => {
    if (!isValid) {
      console.error('❌ VideoCallScreen: invalid params or foreign user, navigating back', {
        hasChannel: !!channel,
        hasTargetPhone: !!targetPhone,
        isForeignUser,
      });
      router.replace('/(tabs)/contacts');
    }
  }, [isValid]);

  if (!isValid) {
    return null;
  }

  return (
    <VideoCallScreen
      channel={channel!}
      userPhone={userPhone!}
      targetPhone={targetPhone!}
      isOutgoing={isOutgoing}
    />
  );
}

type VideoCallScreenProps = {
  channel: string;
  userPhone: string;
  targetPhone: string;
  isOutgoing: boolean;
};

function VideoCallScreen({ channel, userPhone, targetPhone, isOutgoing }: VideoCallScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userPhone: authUserPhone, userProfile } = useAuth();
  const { endCall } = useNewCall();
  const agoraSafeUserAccount = userPhone;

  useEffect(() => {
    console.log('🎥 VideoCallScreen mounted with params:', {
      channel,
      userPhone,
      targetPhone,
      isOutgoing,
    });
  }, []); // Empty deps - only log on actual mount

  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const viewShotRef = useRef<ViewShot | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'bad' | 'unknown'>('unknown');
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [capturedScreenshotBase64, setCapturedScreenshotBase64] = useState<string | null>(null);
  const [showCallMomentModal, setShowCallMomentModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());
  // Outgoing calls ring until the callee answers
  const [answered, setAnswered] = useState(!isOutgoing);
  const answeredRef = useRef(!isOutgoing);
  const [endMessage, setEndMessage] = useState<string | null>(null);
  const ringbackPlayingRef = useRef(false);

  const startRingback = async () => {
    const path = await ringbackPath();
    const engine = engineRef.current;
    if (!path || !engine || answeredRef.current) return;
    if (engine.startAudioMixing(path, true, -1) === 0) {
      ringbackPlayingRef.current = true;
    }
  };

  const stopRingback = () => {
    if (!ringbackPlayingRef.current) return;
    ringbackPlayingRef.current = false;
    try {
      engineRef.current?.stopAudioMixing();
    } catch (error) {
      console.error('Error stopping ringback:', error);
    }
  };

  const markAnswered = () => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    stopRingback();
  };

  const toggleMute = () => {
    if (engineRef.current) {
      try {
        const newMuted = !micMuted;
        engineRef.current.muteLocalAudioStream(newMuted);
        setMicMuted(newMuted);
      } catch (error) {
        console.error('❌ Error toggling mute:', error);
        Alert.alert('Fehler', 'Mikrofon konnte nicht stummgeschaltet werden.');
      }
    }
  };

  // Fetch user profiles when component mounts or users change
  useEffect(() => {
    if (authUserPhone && targetPhone) {
      fetchUserProfiles();
    }
  }, [authUserPhone, targetPhone]);

  const switchCamera = () => {
    if (engineRef.current) {
      try {
        engineRef.current.switchCamera();
        setIsFrontCamera(!isFrontCamera);
      } catch (error) {
        console.error('❌ Error switching camera:', error);
        Alert.alert('Fehler', 'Kamera konnte nicht gewechselt werden.');
      }
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
      await engine.initialize({ appId: AGORA_APP_ID });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      
      // Agora engine initialized

      engine.registerEventHandler({
        onJoinChannelSuccess: (_connection, uid) => {
          setJoined(true);
          setIsConnecting(false);
          // The caller hears the ringback tone until the other side joins
          if (isOutgoing && !answeredRef.current) startRingback();
        },
        onUserJoined: (_connection, uid) => {
          setRemoteUid(uid);
          markAnswered();
          // The call duration counts from when both are in the call
          setCallStartTime((prev) => prev ?? Date.now());
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
          console.error('❌ Agora engine error:', err);
          Alert.alert(
            'Verbindungsfehler',
            'Ein technischer Fehler ist aufgetreten. Der Anruf wird beendet.',
            [{ text: 'OK', onPress: () => cleanupCall(false) }]
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
      console.error('❌ Agora initialization failed:', error);

      // Clean up partially initialized engine
      if (engineRef.current) {
        try {
          engineRef.current.release();
        } catch (releaseError) {
          console.error('Error releasing engine during init cleanup:', releaseError);
        }
        engineRef.current = null;
      }

      Alert.alert(
        'Initialisierungsfehler',
        'Die Video-Engine konnte nicht gestartet werden. Bitte starte die App neu und versuche es erneut.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/contacts') }]
      );
      throw error; // Re-throw to prevent further execution
    }
  };

  // CRITICAL: Track if engine is being initialized to prevent multiple simultaneous inits
  const initializingRef = useRef(false);
  const setupCompleteRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate setup
    if (setupCompleteRef.current || initializingRef.current) {
      console.log('⏭️  Skipping duplicate setup call');
      return;
    }

    const setupCall = async () => {
      initializingRef.current = true;

      try {
        // Do not end the call here: answering already stopped the ringing, and
        // ending it would also end the CallKit call the user just answered.

        await initializeEngine();
        setupCompleteRef.current = true;
      } catch (error) {
        console.error('❌ Error in setupCall:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    setupCall();

    return () => {
      // Cleanup on unmount
      console.log('🧹 VideoCallScreen: Cleanup triggered');
      setupCompleteRef.current = false;

      if (engineRef.current) {
        try {
          engineRef.current.leaveChannel();
        } catch (error) {
          console.error('Error leaving channel during cleanup:', error);
        }

        try {
          engineRef.current.stopPreview();
        } catch (error) {
          console.error('Error stopping preview during cleanup:', error);
        }

        try {
          engineRef.current.release();
        } catch (error) {
          console.error('Error releasing engine during cleanup:', error);
        }

        engineRef.current = null;
      }
    };
  }, []); // CRITICAL: Empty deps - only run once on mount

  // Note: Call ending is now handled by the NewCallContext automatically

  // Leave the call when it ends elsewhere: hung up in the CallKit UI, or the
  // other party ended it (socket) for an incoming or outgoing call
  const cleanedUpRef = useRef(false);
  useEffect(() => {
    const onCallEnded = (call: { channel?: string } | null) => {
      if (call?.channel === channel) {
        cleanupCall(false);
      }
    };
    // Outgoing call ended by the other side: show why, then close
    const onRemoteEnded = ({ channel: ended, reason }: { channel?: string; reason?: string }) => {
      if (ended !== channel) return;
      stopRingback();
      const message = endMessageFor(reason, getContactName(targetPhone));
      if (message) {
        setEndMessage(message);
        setTimeout(() => cleanupCall(false), 1800);
      } else {
        cleanupCall(false);
      }
    };
    const onAccepted = ({ channel: accepted }: { channel?: string }) => {
      if (accepted === channel) markAnswered();
    };
    CallStateManager.on('call:ended', onCallEnded);
    CallStateManager.on('call:remote-ended', onRemoteEnded);
    CallStateManager.on('call:accepted', onAccepted);
    return () => {
      CallStateManager.off('call:ended', onCallEnded);
      CallStateManager.off('call:remote-ended', onRemoteEnded);
      CallStateManager.off('call:accepted', onAccepted);
    };
  }, [channel]);

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

  // CRITICAL: Track if we've already joined to prevent duplicate joins
  const joinedRef = useRef(false);
  const joiningRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate joins
    if (joinedRef.current || joiningRef.current) {
      console.log('⏭️  Skipping duplicate join attempt');
      return;
    }

    if (!channel || !userPhone) {
      console.warn('⚠️  Missing channel or userPhone, skipping join');
      return;
    }

    const fetchTokenAndJoin = async () => {
      joiningRef.current = true;

      try {
        // Wait for engine to be ready
        let attempts = 0;
        while (!engineRef.current && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!engineRef.current) {
          console.error('❌ Agora Engine not initialized after waiting');
          Alert.alert(
            'Initialisierungsfehler',
            'Die Video-Engine konnte nicht initialisiert werden.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/contacts') }]
          );
          return;
        }

        console.log('🔑 Fetching RTC token for channel:', channel);
        const token = await fetchRtcToken(channel, agoraSafeUserAccount);

        console.log('🚪 Joining Agora channel:', channel);
        // Restart video and preview before joining channel
        await engineRef.current.enableVideo();
        await engineRef.current.startPreview();

        await engineRef.current.joinChannelWithUserAccount(token, channel, userPhone);
        joinedRef.current = true;
        console.log('✅ Successfully joined channel');
      } catch (err) {
        console.error('❌ Failed to fetch token or join channel:', err);

        // Clean up engine before navigating away
        if (engineRef.current) {
          try {
            engineRef.current.leaveChannel();
            engineRef.current.stopPreview();
            engineRef.current.release();
          } catch (cleanupError) {
            console.error('Error during error cleanup:', cleanupError);
          }
          engineRef.current = null;
        }

        Alert.alert(
          'Verbindung fehlgeschlagen',
          'Der Videoanruf konnte nicht hergestellt werden. Bitte überprüfe deine Internetverbindung und versuche es erneut.',
          [
            { text: 'OK', onPress: () => router.replace('/(tabs)/contacts') }
          ]
        );
      } finally {
        joiningRef.current = false;
      }
    };

    fetchTokenAndJoin();
  }, []); // CRITICAL: Empty deps - only join once on mount

  const cleanupCall = async (notifyRemote = false) => {
    // Ending the call emits call:ended, which calls cleanupCall again
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    console.log('🧹 Starting call cleanup, notifyRemote:', notifyRemote);
    stopRingback();

    // Notify the other user first: it needs the call state that ending clears
    if (notifyRemote) {
      try {
        endCall(); // Use the new call context to handle ending
      } catch (error) {
        console.error('❌ Error notifying remote user:', error);
      }
    }

    // Stop any call notifications
    try {
      if (channel) {
        CallNotificationService.endCallByChannel(channel);
        console.log('✅ Call service cleaned up for channel:', channel);
      }
    } catch (error) {
      console.error('❌ Call service cleanup error:', error);
    }

    // Clean up Agora engine
    if (engineRef.current) {
      try {
        await engineRef.current.leaveChannel();
        console.log('✅ Left Agora channel');
      } catch (error) {
        console.error('❌ Error leaving channel:', error);
      }

      try {
        await engineRef.current.stopPreview();
        console.log('✅ Stopped preview');
      } catch (error) {
        console.error('❌ Error stopping preview:', error);
      }

      try {
        engineRef.current.release();
        console.log('✅ Released engine');
      } catch (error) {
        console.error('❌ Error releasing engine:', error);
      }

      engineRef.current = null;
    }

    // Reset state
    setJoined(false);
    setRemoteUid(null);
    setCallStartTime(null);
    setCallDuration('00:00');

    // Navigation zurück
    router.replace('/(tabs)/contacts');
  };

  const disconnectCall = () => {
    cleanupCall(true); // Notify remote user
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
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
      
      const response = await apiFetch(
        `/moment/callmoment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        },
        10000
      );

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

  // Fetch user profiles for both users
  const fetchUserProfiles = async () => {
    const profilesMap = new Map();
    
    // Add current user's profile if available
    if (authUserPhone && userProfile?.name) {
      profilesMap.set(normalizePhone(authUserPhone), userProfile);
    }
    
    // Fetch target user's profile from backend
    if (targetPhone) {
      try {
        const response = await apiFetch(
          `/me?phone=${encodeURIComponent(targetPhone)}`,
          {},
          10000
        );
        const data = await response.json();
        if (data.success && data.user && data.user.name) {
          const targetProfile = {
            name: data.user.name,
            avatarUrl: data.user.avatarUrl || '',
            lastOnline: data.user.lastOnline || '',
            momentActiveUntil: data.user.momentActiveUntil || null,
          };
          profilesMap.set(normalizePhone(targetPhone), targetProfile);
        }
      } catch (error) {
        console.log('Failed to fetch target user profile:', error);
      }
    }
    
    setUserProfiles(profilesMap);
    return profilesMap;
  };

  // Create user profiles map for contact resolution
  const createUserProfilesMap = () => {
    return userProfiles;
  };

  // Helper function to resolve contact information
  const getContactInfo = (phone: string) => {
    const userProfilesMap = createUserProfilesMap();
    
    return resolveContact(normalizePhone(phone), {
      userProfiles: userProfilesMap,
      fallbackToFormatted: true,
    });
  };

  const getContactName = (phone: string) => {
    return getContactInfo(phone).name;
  };

  const phase: CallPhase = endMessage ? 'ended' : isConnecting ? 'connecting' : !answered ? 'ringing' : 'connected';
  const targetContact = getContactInfo(targetPhone);

  // Remote video full screen, own camera as a tile; both inside ViewShot so a
  // captured moment shows the call as seen
  const videoLayer = isConnecting ? null : (
    <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={StyleSheet.absoluteFill}>
      {remoteUid !== null && <RtcSurfaceView canvas={{ uid: remoteUid }} style={StyleSheet.absoluteFill} />}
      {joined && (
        <View style={localPreviewStyle(insets.top)}>
          <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} />
        </View>
      )}
    </ViewShot>
  );

  return (
    <>
      <CallView
        name={targetContact.name}
        avatarUrl={targetContact.avatarUrl ?? null}
        phase={phase}
        statusText={endMessage}
        hasRemoteVideo={remoteUid !== null}
        duration={callDuration}
        quality={networkQuality}
        videoLayer={videoLayer}
        micMuted={micMuted}
        onToggleMute={toggleMute}
        onSwitchCamera={switchCamera}
        onCapture={handleTakeScreenshot}
        onHangup={disconnectCall}
      />
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
        userProfiles={createUserProfilesMap()}
      />
    </>
  );
}

