/**
 * VoipPushService - iOS VoIP Push Notification handler
 * Enables CallKit to work when app is in background/terminated
 *
 * COMPLETELY DEFENSIVE implementation to prevent crashes
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import CallStateManager from './CallStateManager';
import PlatformCallAdapter from './PlatformCallAdapter';

// Lazy-loaded VoIP push module (only loaded when needed, not at module init)
let RNVoipPushNotification: any = null;
let isLibraryAvailable = false;
let libraryLoadAttempted = false;

/**
 * Lazily load the VoIP library only when needed
 * This prevents crashes on app launch if the library isn't properly linked
 */
function loadVoipLibrary(): boolean {
  if (libraryLoadAttempted) {
    return isLibraryAvailable;
  }

  libraryLoadAttempted = true;

  if (Platform.OS !== 'ios') {
    console.log('📱 VoIP push is iOS only, skipping library load');
    return false;
  }

  try {
    console.log('📱 Attempting to load VoIP push library...');
    const voipModule = require('react-native-voip-push-notification');
    RNVoipPushNotification = voipModule?.default || voipModule;
    isLibraryAvailable = !!RNVoipPushNotification;
    console.log('✅ VoIP library loaded successfully:', isLibraryAvailable);
    return isLibraryAvailable;
  } catch (error: any) {
    console.warn('⚠️ VoIP push notification library could not be loaded:', error?.message);
    console.warn('   This is normal in development builds without proper native linking');
    isLibraryAvailable = false;
    return false;
  }
}

class VoipPushService {
  private static instance: VoipPushService;
  private isInitialized = false;
  private voipToken: string | null = null;
  private initializationAttempted = false;

  private constructor() {}

  static getInstance(): VoipPushService {
    if (!VoipPushService.instance) {
      VoipPushService.instance = new VoipPushService();
    }
    return VoipPushService.instance;
  }

  /**
   * Initialize VoIP push notifications (iOS only) with maximum safety
   */
  async initialize(): Promise<string | null> {
    // Only try once to prevent repeated crashes
    if (this.initializationAttempted) {
      console.log('⚠️ VoIP initialization already attempted');
      return this.voipToken;
    }

    this.initializationAttempted = true;

    // Platform check
    if (Platform.OS !== 'ios') {
      console.log('⚠️ VoIP push is iOS only');
      return null;
    }

    // Lazy load the library (only now, not at module import time)
    const libraryLoaded = loadVoipLibrary();
    if (!libraryLoaded || !RNVoipPushNotification) {
      console.warn('⚠️ VoIP push notification library not available - continuing without VoIP');
      return null;
    }

    // Already initialized check
    if (this.isInitialized) {
      console.log('✅ VoipPushService already initialized');
      return this.voipToken;
    }

    try {
      console.log('📱 Initializing VoIP push notifications...');

      // Verify the library has the required methods
      if (typeof RNVoipPushNotification.registerVoipToken !== 'function') {
        console.warn('⚠️ registerVoipToken method not found');
        return null;
      }

      if (typeof RNVoipPushNotification.addEventListener !== 'function') {
        console.warn('⚠️ addEventListener method not found');
        return null;
      }

      // Setup event listeners FIRST (before registering)
      const listenersSetup = await this.setupEventListeners();
      if (!listenersSetup) {
        console.warn('⚠️ Failed to setup event listeners');
        return null;
      }

      // Now register for VoIP token
      console.log('📱 Registering for VoIP token...');
      RNVoipPushNotification.registerVoipToken();

      this.isInitialized = true;
      console.log('✅ VoipPushService initialized successfully');

      return this.voipToken;
    } catch (error: any) {
      console.error('❌ Failed to initialize VoIP push:', error?.message || error);
      console.error('Stack:', error?.stack);
      this.isInitialized = false;
      return null;
    }
  }

  /**
   * Setup VoIP push event listeners with error handling
   */
  private async setupEventListeners(): Promise<boolean> {
    try {
      console.log('📱 Setting up VoIP event listeners...');

      // Register event - called when VoIP push token is received
      try {
        RNVoipPushNotification.addEventListener('register', async (token: string) => {
          try {
            console.log('📱 VoIP push token received:', token?.substring(0, 20) + '...');
            this.voipToken = token;

            // Send token to backend
            await this.registerTokenWithBackend(token);
          } catch (error) {
            console.error('❌ Error in register event handler:', error);
          }
        });
        console.log('✅ Register event listener added');
      } catch (error) {
        console.error('❌ Failed to add register listener:', error);
        return false;
      }

      // Notification event - called when VoIP push notification is received
      try {
        RNVoipPushNotification.addEventListener('notification', (notification: any) => {
          try {
            console.log('📱 VoIP push notification received');
            this.handleVoipPush(notification);
          } catch (error) {
            console.error('❌ Error in notification event handler:', error);
          }
        });
        console.log('✅ Notification event listener added');
      } catch (error) {
        console.error('❌ Failed to add notification listener:', error);
        return false;
      }

      // DidLoadWithEvents - called when user taps on notification
      try {
        RNVoipPushNotification.addEventListener('didLoadWithEvents', (events: any) => {
          try {
            console.log('📱 VoIP push events loaded');
            if (events && Array.isArray(events) && events.length > 0) {
              events.forEach((event: any) => this.handleVoipPush(event));
            }
          } catch (error) {
            console.error('❌ Error in didLoadWithEvents handler:', error);
          }
        });
        console.log('✅ DidLoadWithEvents listener added');
      } catch (error) {
        console.error('❌ Failed to add didLoadWithEvents listener:', error);
        return false;
      }

      console.log('✅ All VoIP event listeners setup successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to setup VoIP event listeners:', error);
      return false;
    }
  }

  /**
   * Register VoIP token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const userPhone = await SecureStore.getItemAsync('userPhone');

      if (!userPhone) {
        console.log('⚠️ No userPhone found, will register VoIP token later');
        return;
      }

      console.log('📤 Registering VoIP token with backend...');

      const response = await fetch('https://cmm-backend-gdqx.onrender.com/user/voip-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          voipToken: token,
          deviceId: 'ios-device',
          platform: 'ios',
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ VoIP token registered with backend');
      } else {
        console.error('❌ Failed to register VoIP token:', data.message);
      }
    } catch (error) {
      console.error('❌ Error sending VoIP token to backend:', error);
    }
  }

  /**
   * Handle incoming VoIP push notification
   */
  private async handleVoipPush(notification: any): Promise<void> {
    try {
      console.log('📱 Processing VoIP push:', notification);

      const {
        callerPhone,
        calleePhone,
        channel,
        callerName,
        hasVideo = true,
      } = notification || {};

      if (!callerPhone || !channel) {
        console.error('❌ Invalid VoIP push data - missing callerPhone or channel');
        return;
      }

      // Create call in state manager
      const callData = CallStateManager.createIncomingCall({
        channel,
        callerPhone,
        calleePhone: calleePhone || '',
        callerName: callerName || callerPhone,
        hasVideo,
      });

      // Display CallKit UI immediately
      await PlatformCallAdapter.displayIncomingCall(callData);

      console.log('✅ VoIP push processed, CallKit displayed');
    } catch (error) {
      console.error('❌ Error processing VoIP push:', error);
    }
  }

  /**
   * Get current VoIP token
   */
  getVoipToken(): string | null {
    return this.voipToken;
  }

  /**
   * Check if VoIP push is available and initialized
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && isLibraryAvailable && this.isInitialized;
  }

  /**
   * Cleanup - safe cleanup with error handling
   */
  cleanup(): void {
    // Don't attempt cleanup if library wasn't loaded
    if (Platform.OS !== 'ios' || !libraryLoadAttempted || !isLibraryAvailable || !RNVoipPushNotification) {
      return;
    }

    try {
      if (typeof RNVoipPushNotification.removeEventListener === 'function') {
        try {
          RNVoipPushNotification.removeEventListener('register');
        } catch (e) {
          console.warn('Failed to remove register listener:', e);
        }

        try {
          RNVoipPushNotification.removeEventListener('notification');
        } catch (e) {
          console.warn('Failed to remove notification listener:', e);
        }

        try {
          RNVoipPushNotification.removeEventListener('didLoadWithEvents');
        } catch (e) {
          console.warn('Failed to remove didLoadWithEvents listener:', e);
        }
      }

      this.isInitialized = false;
      this.voipToken = null;
      console.log('🧹 VoipPushService cleaned up');
    } catch (error) {
      console.error('❌ Error during VoIP cleanup:', error);
    }
  }
}

export default VoipPushService.getInstance();
