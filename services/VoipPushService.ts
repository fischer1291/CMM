/**
 * VoipPushService - registers the iOS PushKit (VoIP) token with the backend.
 *
 * PushKit itself is handled natively in ios/CallMeMaybe/AppDelegate.swift:
 * it receives the token and reports every incoming VoIP push to CallKit.
 * This service only forwards the token to the backend so it can send
 * VoIP pushes when the app is in the background or killed.
 */
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../utils/api';

// Lazy-loaded like CallKeep, so a missing native module cannot crash app launch
let RNVoipPush: any = null;
function loadVoipPushLibrary(): boolean {
  if (RNVoipPush) return true;
  try {
    // iOS-only native module: loaded lazily so the web build works
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-voip-push-notification');
    RNVoipPush = mod?.default || mod;
    return !!RNVoipPush;
  } catch (error: any) {
    console.warn('⚠️ VoIP push library could not be loaded:', error?.message);
    return false;
  }
}

class VoipPushService {
  private static instance: VoipPushService;
  private userPhone: string | null = null;
  // Kept across logout/login: PushKit only delivers the token once per launch
  private voipToken: string | null = null;
  private registeredFor: string | null = null;
  private listening = false;

  static getInstance(): VoipPushService {
    if (!VoipPushService.instance) {
      VoipPushService.instance = new VoipPushService();
    }
    return VoipPushService.instance;
  }

  initialize(userPhone: string): void {
    if (Platform.OS !== 'ios' || !loadVoipPushLibrary()) return;

    this.userPhone = userPhone;

    if (!this.listening) {
      // 'didLoadWithEvents' must be registered first: the token usually arrives
      // natively before JS is ready and is then delivered as a cached event.
      RNVoipPush.addEventListener('didLoadWithEvents', (events: any[]) => {
        (events || []).forEach((event) => {
          if (event?.name === RNVoipPush.RNVoipPushRemoteNotificationsRegisteredEvent) {
            this.handleToken(event.data);
          }
        });
      });
      RNVoipPush.addEventListener('register', (token: string) => this.handleToken(token));
      this.listening = true;
    }

    if (this.voipToken) {
      this.sendTokenToBackend();
    }
  }

  private handleToken(token: unknown): void {
    if (typeof token !== 'string' || token.length === 0) return;
    if (token !== this.voipToken) {
      this.voipToken = token;
      this.registeredFor = null;
    }
    this.sendTokenToBackend();
  }

  private async sendTokenToBackend(): Promise<void> {
    const { userPhone, voipToken } = this;
    if (!userPhone || !voipToken || this.registeredFor === `${userPhone}:${voipToken}`) return;

    try {
      const response = await apiFetch(
        `/user/voip-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPhone,
            voipToken,
            deviceId: `${Platform.OS}-${Device.deviceName}-${Device.osVersion}`.replace(/[^a-zA-Z0-9-]/g, ''),
            platform: Platform.OS,
          }),
        },
        10000
      );
      if (response.ok) {
        this.registeredFor = `${userPhone}:${voipToken}`;
        console.log('✅ VoIP token registered with backend');
      } else {
        console.error('❌ VoIP token registration failed:', response.status);
      }
    } catch (error) {
      console.error('❌ VoIP token registration error:', error);
    }
  }

  /** This device's VoIP token, if PushKit delivered one. */
  getToken(): string | null {
    return this.voipToken;
  }

  cleanup(): void {
    this.userPhone = null;
    this.registeredFor = null;
  }
}

export default VoipPushService.getInstance();
