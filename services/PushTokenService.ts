/**
 * PushTokenService - Simplified push token management
 * Replaces the notification parts of NotificationService
 * Only handles push token registration, no call notifications
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchWithTimeout } from '../utils/apiUtils';

export interface PushToken {
  token: string;
  deviceId: string;
  platform: string;
}

class PushTokenService {
  private static instance: PushTokenService;
  private pushToken: string | null = null;

  private constructor() {}

  static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b5b430e0-3b17-49fe-bf44-ad9c6a49b8e3',
      });
      
      const token = pushTokenData.data;
      this.pushToken = token;
      
      console.log('✅ Push token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  async registerPushToken(userPhone: string, token: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const pushTokenData: PushToken = {
        token,
        deviceId,
        platform: Platform.OS,
      };

      console.log('📤 Registering push token with backend...');

      const response = await fetchWithTimeout(
        'https://cmm-backend-gdqx.onrender.com/user/push-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userPhone,
            ...pushTokenData,
          }),
        },
        10000
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Push token registered successfully');
        return true;
      } else {
        console.error('❌ Failed to register push token:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      return false;
    }
  }

  /**
   * Get unique device identifier
   */
  private async getDeviceId(): Promise<string> {
    try {
      const deviceName = await Device.deviceName;
      const osVersion = Device.osVersion;
      const platform = Platform.OS;
      return `${platform}-${deviceName}-${osVersion}`.replace(/[^a-zA-Z0-9-]/g, '');
    } catch (error) {
      return Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Refresh push token
   */
  async refreshPushToken(userPhone: string): Promise<boolean> {
    try {
      console.log('🔄 Refreshing push token...');
      
      this.pushToken = null;
      const token = await this.registerForPushNotifications();
      
      if (token) {
        const success = await this.registerPushToken(userPhone, token);
        if (success) {
          console.log('✅ Push token refreshed successfully');
          return true;
        }
      }
      
      console.error('❌ Failed to refresh push token');
      return false;
    } catch (error) {
      console.error('❌ Error refreshing push token:', error);
      return false;
    }
  }
}

export default PushTokenService.getInstance();