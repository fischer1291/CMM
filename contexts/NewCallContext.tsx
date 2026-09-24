/**
 * NewCallContext - Simplified React bridge to call services
 * Replaces the complex existing CallContext
 */
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { useAuth } from './AuthContext';
import CallNotificationService from '../services/CallNotificationService';
import CallStateManager, { CallData } from '../services/CallStateManager';
import PlatformCallAdapter from '../services/PlatformCallAdapter';
import VoipPushService from '../services/VoipPushService';
import { session } from '../services/session';
import { socket } from '../services/socket';
import { sendCallEnded } from '../services/callSignaling';
import { uuidv4 } from '../utils/uuid';


interface NewCallContextType {
  // Current call state
  activeCall: CallData | null;
  hasActiveCall: boolean;
  
  // Actions
  answerCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  startVideoCall: (calleePhone: string, callerPhone: string) => void;
}

const NewCallContext = createContext<NewCallContextType | null>(null);

export function NewCallProvider({ children }: { children: React.ReactNode }) {
  const { userPhone, isLoading } = useAuth();
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const servicesInitialized = useRef(false);
  const appStateSub = useRef<NativeEventSubscription | null>(null);
  // Outgoing calls have no CallStateManager entry; remember who we are calling
  const outgoingCallRef = useRef<{ channel: string; to: string } | null>(null);

  /**
   * Tell the other party (via backend) that the current call ended.
   * Must run before CallStateManager.endCall(), which clears the call.
   */
  const notifyRemoteCallEnded = () => {
    const call = CallStateManager.getActiveCall();
    const channel = call?.channel ?? outgoingCallRef.current?.channel;
    const to = call
      ? (call.callerPhone === userPhone ? call.calleePhone : call.callerPhone)
      : outgoingCallRef.current?.to;
    if (channel && to) {
      sendCallEnded(channel, to, userPhone);
    }
    outgoingCallRef.current = null;
  };

  // Initialize services
  useEffect(() => {
    console.log('🔍 NewCallProvider: useEffect triggered', {
      isLoading,
      userPhone: userPhone?.substring(0, 8) + '...',
      servicesInitialized: servicesInitialized.current
    });

    if (!isLoading && userPhone && !servicesInitialized.current) {
      initializeServices();
    }

    return () => {
      // Only cleanup if services were actually initialized
      if (servicesInitialized.current) {
        cleanup();
      }
    };
  }, [userPhone, isLoading]);

  /**
   * Initialize all call services
   */
  const initializeServices = async () => {
    try {
      console.log('🚀 NewCallContext: Initializing services...');

      // CRITICAL: Setup CallKit callbacks BEFORE initializing PlatformCallAdapter
      // This prevents a race condition where events can fire before callbacks are registered
      console.log('🔧 Setting up CallKit callbacks BEFORE platform initialization...');
      setupCallKitCallbacks();

      // Setup call state listeners before initialization
      setupCallStateListeners();

      // Setup socket listeners before initialization
      setupSocketListeners();

      // Connect with the current token; 'connect' registers the user
      socket.auth = { token: session.getToken() ?? undefined };
      socket.connect();

      // NOW initialize services - event listeners will be ready to receive events
      console.log('🚀 Initializing platform services with callbacks already registered...');
      await PlatformCallAdapter.initialize();
      await CallNotificationService.initialize();

      // iOS: send the PushKit token (received natively in AppDelegate.swift) to the backend
      VoipPushService.initialize(userPhone!);

      // Mark services as initialized
      servicesInitialized.current = true;

      console.log('✅ NewCallContext: Services initialized successfully');
    } catch (error) {
      console.error('❌ NewCallContext: Service initialization failed:', error);
    }
  };

  /**
   * Setup CallKit callbacks to handle native call UI events
   */
  const setupCallKitCallbacks = () => {
    // When user answers call via CallKit
    PlatformCallAdapter.setOnAnswerCallCallback((callId) => {
      try {
        console.log('📱 CallKit answer callback triggered:', callId);
        CallNotificationService.answerCall();
      } catch (error) {
        console.error('❌ Error in CallKit answer callback:', error);
      }
    });

    // When user ends call via CallKit
    PlatformCallAdapter.setOnEndCallCallback((callId) => {
      try {
        console.log('📱 CallKit end callback triggered:', callId);
        // Covers declining and hanging up in the CallKit UI. Also fires when
        // the app itself ended a CallKit call (remote end, stale call): then
        // the id no longer matches the active call and there is nothing to do.
        // (Outgoing calls don't use CallKit on iOS.)
        const active = CallStateManager.getActiveCall();
        if (!active || active.callId !== callId) {
          console.log('📱 CallKit end for a call that is not active, ignored:', callId);
          return;
        }
        notifyRemoteCallEnded();
        CallStateManager.endCall();
      } catch (error) {
        console.error('❌ Error in CallKit end callback:', error);
      }
    });

    // Call reported to CallKit natively from a VoIP push (app in background/killed)
    PlatformCallAdapter.setOnPushIncomingCallCallback((callId, payload) => {
      try {
        console.log('📱 VoIP push call reported by CallKit:', callId);
        CallNotificationService.registerPushKitCall(callId, payload, userPhone!);
      } catch (error) {
        console.error('❌ Error in VoIP push call callback:', error);
      }
    });

    // When user rejects call via CallKit (declineCall tells the caller)
    PlatformCallAdapter.setOnRejectCallCallback((callId) => {
      try {
        console.log('📱 CallKit reject callback triggered:', callId);
        CallNotificationService.declineCall();
      } catch (error) {
        console.error('❌ Error in CallKit reject callback:', error);
      }
    });
  };

  /**
   * Setup call state event listeners
   */
  const setupCallStateListeners = () => {
    // CRITICAL: Remove ALL listeners first to prevent duplicates
    // We must use removeAllListeners because the handler functions are recreated on each render
    CallStateManager.removeAllListeners('call:incoming');
    CallStateManager.removeAllListeners('call:answered');
    CallStateManager.removeAllListeners('call:declined');
    CallStateManager.removeAllListeners('call:ended');

    CallStateManager.on('call:incoming', handleCallIncoming);
    CallStateManager.on('call:answered', handleCallAnswered);
    CallStateManager.on('call:declined', handleCallDeclined);
    CallStateManager.on('call:ended', handleCallEnded);

    console.log('✅ CallStateManager listeners set up (duplicates removed)');
  };

  /**
   * Setup socket event listeners
   */
  const setupSocketListeners = () => {
    // CRITICAL: Remove any existing listeners first to prevent duplicates
    socket.off('connect');
    socket.off('incomingCall');
    socket.off('callEnded');
    socket.off('callFailed');
    socket.off('callAccepted');

    // Runs on every (re)connect: after a network drop the backend has
    // forgotten this socket, so the user must register again
    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      socket.emit('register', userPhone);
      reportPresence();
    });

    // While the app is in the foreground the backend sends no availability
    // pushes: the app shows a live banner instead (components/InAppBanner)
    appStateSub.current?.remove();
    appStateSub.current = AppState.addEventListener('change', reportPresence);

    socket.on('incomingCall', handleSocketIncomingCall);
    socket.on('callEnded', handleSocketCallEnded);
    socket.on('callFailed', handleSocketCallFailed);
    socket.on('callAccepted', handleSocketCallAccepted);

    console.log('✅ Socket listeners set up (duplicates removed)');
  };

  const reportPresence = () => {
    if (socket.connected) socket.emit('presence', { foreground: AppState.currentState === 'active' });
  };

  /**
   * Handle socket incoming call event
   */
  const handleSocketIncomingCall = async ({ from, channel, action, callerName, callId }: any) => {
    if (action === 'end') {
      // Handle call end from socket
      CallNotificationService.endCallByChannel(channel);
      return;
    }

    // CRITICAL: Validate incoming data from socket to prevent crashes
    if (!from || typeof from !== 'string') {
      console.error('❌ Invalid callerPhone from socket:', from);
      return;
    }

    if (!channel || typeof channel !== 'string') {
      console.error('❌ Invalid channel from socket:', channel);
      return;
    }

    if (!userPhone) {
      console.error('❌ No authenticated user phone available');
      return;
    }

    console.log('📞 Socket incoming call:', {
      from,
      channel,
      callerName: callerName || 'Unknown',
      userPhone,
    });

    try {
      // Create incoming call through notification service
      await CallNotificationService.handleIncomingCall({
        type: 'incoming_call',
        callId: typeof callId === 'string' ? callId : undefined,
        callerPhone: from,
        calleePhone: userPhone,
        channel,
        callerName: callerName || undefined,
        hasVideo: true,
      });
    } catch (error) {
      console.error('❌ Error handling socket incoming call:', error);
    }
  };

  /**
   * Handle socket call ended event
   */
  const handleSocketCallEnded = ({ channel, reason }: any) => {
    CallNotificationService.endCallByChannel(channel);
    if (outgoingCallRef.current?.channel === channel) {
      // declined | missed | hangup: close the caller's call screen with a reason
      outgoingCallRef.current = null;
      CallStateManager.emit('call:remote-ended', { channel, reason });
    }
  };

  /** The call could not be started (busy, unreachable, ...). */
  const handleSocketCallFailed = ({ channel, reason }: any) => {
    const outgoing = outgoingCallRef.current;
    // Older backends send no channel; any failure then belongs to the current call
    if (outgoing && (!channel || channel === outgoing.channel)) {
      outgoingCallRef.current = null;
      CallStateManager.emit('call:remote-ended', { channel: outgoing.channel, reason: reason || 'failed' });
    }
  };

  /** The callee answered: the caller's screen stops the ringback tone. */
  const handleSocketCallAccepted = ({ channel }: any) => {
    CallStateManager.emit('call:accepted', { channel });
  };

  /**
   * Handle call state events
   */
  const handleCallIncoming = (callData: CallData) => {
    console.log('📥 handleCallIncoming triggered:', callData.callId);
    setActiveCall(callData);
    setHasActiveCall(true);
  };

  const handleCallAnswered = (callData: CallData) => {
    try {
      console.log('📞 handleCallAnswered: Call was answered, navigating to videocall', {
        channel: callData.channel,
        userPhone,
        targetPhone: callData.callerPhone,
      });
      setActiveCall(callData);

      // Navigate to video call screen (receiver answered)
      console.log('🚀 handleCallAnswered: Navigating to /videocall');
      router.push({
        pathname: '/videocall',
        params: {
          channel: callData.channel,
          userPhone: userPhone!,
          targetPhone: callData.callerPhone,
          isOutgoing: 'false', // Receiver side
        },
      });
      console.log('✅ handleCallAnswered: Navigation called');

      // Notify backend that call was accepted
      socket.emit('acceptCall', {
        from: callData.callerPhone,
        to: userPhone,
        channel: callData.channel,
      });
    } catch (error) {
      console.error('❌ Error in handleCallAnswered:', error);
    }
  };

  // Declined in the app or a notification action: the caller must stop ringing
  const handleCallDeclined = (callData: CallData) => {
    if (callData?.channel && callData.callerPhone) {
      sendCallEnded(callData.channel, callData.callerPhone, userPhone);
    }
    setActiveCall(null);
    setHasActiveCall(false);
  };

  const handleCallEnded = (callData: CallData | null) => {
    setActiveCall(null);
    setHasActiveCall(false);
  };

  /**
   * Answer the current incoming call
   */
  const answerCall = () => {
    CallNotificationService.answerCall();
  };

  /**
   * Decline the current incoming call
   */
  const declineCall = () => {
    CallNotificationService.declineCall();
  };

  /**
   * End the current active call
   */
  const endCall = () => {
    notifyRemoteCallEnded();
    CallStateManager.endCall();
  };

  /**
   * Start a new video call (outgoing)
   */
  const startVideoCall = (calleePhone: string, callerPhone: string) => {
    try {
      // Unique per call; the backend rejects reused channels and only issues
      // Agora tokens to the two participants
      const channel = `call_${uuidv4()}`;

      console.log('📞 Starting outgoing call:', { from: callerPhone, to: calleePhone, channel });

      outgoingCallRef.current = { channel, to: calleePhone };

      // Send call request to backend
      socket.emit('callRequest', {
        from: callerPhone,
        to: calleePhone,
        channel: channel,
      });

      // Navigate to video call screen (caller side)
      console.log('🚀 startVideoCall: Navigating to /videocall');
      router.push({
        pathname: '/videocall',
        params: {
          channel,
          userPhone: callerPhone,
          targetPhone: calleePhone,
          isOutgoing: 'true', // Caller side
        },
      });
      console.log('✅ startVideoCall: Navigation called');
    } catch (error) {
      console.error('❌ Error starting video call:', error);
    }
  };

  /**
   * Cleanup services
   */
  const cleanup = () => {
    console.log('🧹 NewCallContext: Cleaning up...');

    // Remove socket listeners and drop the (authenticated) connection
    socket.off('connect');
    socket.off('incomingCall');
    socket.off('callEnded');
    socket.off('callFailed');
    socket.off('callAccepted');
    socket.disconnect();
    appStateSub.current?.remove();
    appStateSub.current = null;

    // Remove CallStateManager listeners
    CallStateManager.removeAllListeners();

    // Cleanup services
    CallNotificationService.cleanup();
    PlatformCallAdapter.cleanup();
    VoipPushService.cleanup();

    // Reset initialization flag
    servicesInitialized.current = false;

    console.log('✅ NewCallContext: Cleanup complete');
  };

  return (
    <NewCallContext.Provider
      value={{
        activeCall,
        hasActiveCall,
        answerCall,
        declineCall,
        endCall,
        startVideoCall,
      }}
    >
      {children}
    </NewCallContext.Provider>
  );
}

export const useNewCall = () => {
  const context = useContext(NewCallContext);
  if (!context) {
    throw new Error('useNewCall must be used within a NewCallProvider');
  }
  return context;
};