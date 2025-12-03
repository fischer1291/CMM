/**
 * VoipPushService - iOS VoIP Push Notification handler
 * Enables CallKit to work when app is in background/terminated
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import CallStateManager from './CallStateManager';
import PlatformCallAdapter from './PlatformCallAdapter';

// Only import VoIP push on iOS
let RNVoipPushNotification: any = null;
if (Platform.OS === 'ios') {
  try {
    RNVoipPushNotification = require('react-native-voip-push-notification').default;
  } catch (error) {
    console.warn('⚠️ VoIP push notification not available:', error);
  }
}

class VoipPushService {
  private static instance: VoipPushService;
  private isInitialized = false;
  private voipToken: string | null = null;

  private constructor() {}

  static getInstance(): VoipPushService {
    if (!VoipPushService.instance) {
      VoipPushService.instance = new VoipPushService();
    }
    return VoipPushService.instance;
  }

  /**
   * Initialize VoIP push notifications (iOS only)
   */
  async initialize(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      console.log('⚠️ VoIP push is iOS only');
      return null;
    }

    if (!RNVoipPushNotification) {
      console.warn('⚠️ VoIP push notification library not available');
      return null;
    }

    if (this.isInitialized) {
      console.log('✅ VoipPushService already initialized');
      return this.voipToken;
    }

    try {
      console.log('📱 Initializing VoIP push notifications...');

      // Verify RNVoipPushNotification has required methods
      if (!RNVoipPushNotification.registerVoipToken ||
          !RNVoipPushNotification.addEventListener) {
        console.warn('⚠️ VoIP push methods not available');
        return null;
      }

      // Register for VoIP notifications
      RNVoipPushNotification.registerVoipToken();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ VoipPushService initialized');

      return this.voipToken;
    } catch (error) {
      console.error('❌ Failed to initialize VoIP push:', error);
      console.error('Error details:', error);
      return null;
    }
  }

  /**
   * Setup VoIP push event listeners
   */
  private setupEventListeners(): void {
    try {
      // Called when VoIP push token is received
      RNVoipPushNotification.addEventListener('register', async (token: string) => {
      console.log('📱 VoIP push token received:', token);
      this.voipToken = token;

      // Send token to backend
      try {
        const userPhone = await SecureStore.getItemAsync('userPhone');

        if (userPhone) {
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
        } else {
          console.log('⚠️ No userPhone found, will register VoIP token later');
        }
      } catch (error) {
        console.error('❌ Error sending VoIP token to backend:', error);
      }
    });

    // Called when VoIP push notification is received
    RNVoipPushNotification.addEventListener('notification', (notification: any) => {
      console.log('📱 VoIP push notification received:', notification);
      this.handleVoipPush(notification);
    });

    // Called when user taps on notification
    RNVoipPushNotification.addEventListener('didLoadWithEvents', (events: any) => {
      console.log('📱 VoIP push events loaded:', events);
      if (events && events.length > 0) {
        events.forEach((event: any) => this.handleVoipPush(event));
      }
    });
    } catch (error) {
      console.error('❌ Failed to setup VoIP event listeners:', error);
      throw error; // Re-throw so caller knows initialization failed
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
      } = notification;

      if (!callerPhone || !channel) {
        console.error('❌ Invalid VoIP push data');
        return;
      }

      // Create call in state manager
      const callData = CallStateManager.createIncomingCall({
        channel,
        callerPhone,
        calleePhone,
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
   * Check if VoIP push is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && this.isInitialized;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (Platform.OS === 'ios') {
      RNVoipPushNotification.removeEventListener('register');
      RNVoipPushNotification.removeEventListener('notification');
      RNVoipPushNotification.removeEventListener('didLoadWithEvents');
    }
    this.isInitialized = false;
    this.voipToken = null;
    console.log('🧹 VoipPushService cleaned up');
  }
}

export default VoipPushService.getInstance();
