/**
 * NewCallContext - Simplified React bridge to call services
 * Replaces the complex existing CallContext
 */
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import CallNotificationService from '../services/CallNotificationService';
import CallStateManager, { CallData } from '../services/CallStateManager';
import PlatformCallAdapter from '../services/PlatformCallAdapter';
import VoipPushService from '../services/VoipPushService';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';
const socket = io(baseUrl, { transports: ['websocket'], secure: true });

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

  // Initialize services
  useEffect(() => {
    if (!isLoading && userPhone) {
      initializeServices();
    }
    
    return () => {
      cleanup();
    };
  }, [userPhone, isLoading]);

  /**
   * Initialize all call services
   */
  const initializeServices = async () => {
    try {
      console.log('🚀 NewCallContext: Initializing services...');

      // Register user with socket
      socket.emit('register', userPhone);

      // Initialize services
      await PlatformCallAdapter.initialize();
      await CallNotificationService.initialize();

      // Initialize VoIP push for iOS (enables background CallKit)
      // TEMPORARILY DISABLED FOR DEBUGGING
      if (false && Platform.OS === 'ios') {
        try {
          const voipToken = await VoipPushService.initialize();
          if (voipToken) {
            console.log('✅ VoIP push initialized with token');
          } else {
            console.log('⚠️ VoIP push initialization returned null (this is OK - fallback to regular push)');
          }
        } catch (error) {
          console.error('❌ VoIP push initialization error (non-fatal):', error);
          // Continue without VoIP push - regular push notifications will work
        }
      }
      console.log('⚠️ VoIP push DISABLED for debugging');

      // Setup CallKit callbacks
      setupCallKitCallbacks();

      // Setup call state listeners
      setupCallStateListeners();

      // Setup socket listeners
      setupSocketListeners();

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
      console.log('📱 CallKit answer callback triggered:', callId);
      CallNotificationService.answerCall();
    });

    // When user ends call via CallKit
    PlatformCallAdapter.setOnEndCallCallback((callId) => {
      console.log('📱 CallKit end callback triggered:', callId);
      const call = CallStateManager.getActiveCall();
      if (call) {
        // Notify backend that call ended
        socket.emit('call:end', {
          channel: call.channel,
          calleePhone: call.callerPhone === userPhone ? call.targetPhone : call.callerPhone,
        });
      }
      CallStateManager.endCall();
    });

    // When user rejects call via CallKit
    PlatformCallAdapter.setOnRejectCallCallback((callId) => {
      console.log('📱 CallKit reject callback triggered:', callId);
      CallNotificationService.declineCall();
    });
  };

  /**
   * Setup call state event listeners
   */
  const setupCallStateListeners = () => {
    CallStateManager.on('call:incoming', handleCallIncoming);
    CallStateManager.on('call:answered', handleCallAnswered);
    CallStateManager.on('call:declined', handleCallDeclined);
    CallStateManager.on('call:ended', handleCallEnded);
  };

  /**
   * Setup socket event listeners
   */
  const setupSocketListeners = () => {
    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('incomingCall', handleSocketIncomingCall);
    socket.on('callEnded', handleSocketCallEnded);
  };

  /**
   * Handle socket incoming call event
   */
  const handleSocketIncomingCall = async ({ from, channel, action, callerName }: any) => {
    if (action === 'end') {
      // Handle call end from socket
      CallNotificationService.endCallByChannel(channel);
      return;
    }

    if (!from || !channel) return;

    // Create incoming call through notification service
    await CallNotificationService.handleIncomingCall({
      type: 'incoming_call',
      callerPhone: from,
      calleePhone: userPhone!,
      channel,
      callerName,
      hasVideo: true,
    });
  };

  /**
   * Handle socket call ended event
   */
  const handleSocketCallEnded = ({ channel }: any) => {
    CallNotificationService.endCallByChannel(channel);
  };

  /**
   * Handle call state events
   */
  const handleCallIncoming = (callData: CallData) => {
    setActiveCall(callData);
    setHasActiveCall(true);
  };

  const handleCallAnswered = (callData: CallData) => {
    setActiveCall(callData);
    
    // Navigate to video call screen
    router.push({
      pathname: '/(tabs)/videocall',
      params: {
        channel: callData.channel,
        userPhone: userPhone!,
        targetPhone: callData.callerPhone,
      },
    });
  };

  const handleCallDeclined = (callData: CallData) => {
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
    const call = CallStateManager.getActiveCall();
    if (call) {
      // Emit call ended to socket
      socket.emit('callEnded', {
        from: userPhone,
        to: call.callerPhone,
        channel: call.channel,
      });
    }
    
    CallStateManager.endCall();
  };

  /**
   * Start a new video call
   */
  const startVideoCall = (calleePhone: string, callerPhone: string) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const raw = `${callerPhone}_${calleePhone}_${timestamp}_${randomId}`;
    const shortHash = Math.abs(raw.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)).toString(36).slice(0, 12);
    const channel = `call_${shortHash}`;

    // Send call request to socket
    socket.emit('callRequest', {
      from: callerPhone,
      to: calleePhone,
      channel: channel,
    });

    // Navigate to video call screen
    router.push({
      pathname: '/(tabs)/videocall',
      params: {
        channel,
        userPhone: callerPhone,
        targetPhone: calleePhone,
      },
    });
  };

  /**
   * Cleanup services
   */
  const cleanup = () => {
    socket.off('incomingCall');
    socket.off('callEnded');
    CallStateManager.removeAllListeners();
    CallNotificationService.cleanup();
    PlatformCallAdapter.cleanup();
    if (Platform.OS === 'ios') {
      VoipPushService.cleanup();
    }
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