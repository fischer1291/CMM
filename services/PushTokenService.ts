/**
 * Expo push token of this device: registered with the backend once the user
 * allowed notifications, removed from the account on logout.
 *
 * The permission is not asked at login. The app first explains what it's
 * for (see features/notifications/PermissionPrompt), then asks.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EXPO_PROJECT_ID } from '../config/env';
import { apiPostJson } from '../utils/api';
import { deviceTimezone } from './gamificationApi';
import VoipPushService from './VoipPushService';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

class PushTokenService {
  private pushToken: string | null = null;
  private registeredFor: string | null = null;

  async permission(): Promise<PermissionState> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  }

  /** Ask for permission (shows the system dialog once), then register. */
  async requestAndRegister(userPhone: string): Promise<PermissionState> {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') await this.register(userPhone);
    return status as PermissionState;
  }

  /** Register the token if notifications are allowed; never asks. */
  async register(userPhone: string): Promise<boolean> {
    if (!Device.isDevice) return false;
    try {
      if ((await this.permission()) !== 'granted') return false;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
      this.pushToken = token;
      if (this.registeredFor === `${userPhone}:${token}`) return true;

      const response = await apiPostJson(
        '/user/push-token',
        {
          userPhone,
          token,
          deviceId: `${Platform.OS}-${Device.deviceName}-${Device.osVersion}`.replace(/[^a-zA-Z0-9-]/g, ''),
          platform: Platform.OS,
          timezone: deviceTimezone(),
        },
        10000
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.registeredFor = `${userPhone}:${token}`;
      return true;
    } catch (error) {
      console.warn('Push token registration failed:', error);
      return false;
    }
  }

  /**
   * Remove this device's tokens from the account, so it stops receiving
   * pushes and calls after logout. Needs the auth token, so call it first.
   */
  async unregister(): Promise<void> {
    try {
      await apiPostJson(
        '/auth/logout',
        { pushToken: this.pushToken ?? undefined, voipToken: VoipPushService.getToken() ?? undefined },
        8000
      );
    } catch (error) {
      console.warn('Logout on the server failed:', error);
    } finally {
      this.registeredFor = null;
    }
  }
}

export default new PushTokenService();
