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
} from '../lib/agora';
import { Ionicons as Icon } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '../contexts/AuthContext';
import { useNewCall } from '../contexts/NewCallContext';
import CallMomentCaptureModal from '../components/callmoments/CallMomentCaptureModal';
import { resolveContact, normalizePhone } from '../utils/contactResolver';
import CallNotificationService from '../services/CallNotificationService';
import CallStateManager from '../services/CallStateManager';
import { fetchWithTimeout } from '../utils/apiUtils';
import { AGORA_APP_ID, API_BASE_URL } from '../config/env';


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
  const [localUid, setLocalUid] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'bad' | 'unknown'>('unknown');
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [capturedScreenshotBase64, setCapturedScreenshotBase64] = useState<string | null>(null);
  const [showCallMomentModal, setShowCallMomentModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

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
    CallStateManager.on('call:ended', onCallEnded);
    CallStateManager.on('call:remote-ended', onCallEnded);
    return () => {
      CallStateManager.off('call:ended', onCallEnded);
      CallStateManager.off('call:remote-ended', onCallEnded);
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
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/rtcToken`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channelName: channel,
              uid: agoraSafeUserAccount,
              role: 'publisher',
            }),
          },
          10000
        );

        const data = await res.json();
        const token = data.token;

        console.log('🚪 Joining Agora channel:', channel);
        // Restart video and preview before joining channel
        await engineRef.current.enableVideo();
        await engineRef.current.startPreview();

        await engineRef.current.joinChannelWithUserAccount(token, channel, userPhone);
        setLocalUid(agoraSafeUserAccount);
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
    setLocalUid(null);
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
      
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/moment/callmoment`,
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
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/me?phone=${encodeURIComponent(targetPhone)}`,
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
        userProfiles={createUserProfilesMap()}
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