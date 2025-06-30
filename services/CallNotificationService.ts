/**
 * CallNotificationService - THE notification handler
 * Replaces: EnhancedCallService, NotificationService (call parts), HybridCallService, etc.
 */
import * as Notifications from 'expo-notifications';
import { Platform, Vibration, AppState } from 'react-native';
import CallStateManager, { CallData } from './CallStateManager';
import PlatformCallAdapter from './PlatformCallAdapter';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface IncomingCallNotification {
  type: 'incoming_call';
  callerPhone: string;
  calleePhone: string;
  channel: string;
  callerName?: string;
  hasVideo?: boolean;
}

class CallNotificationService {
  private static instance: CallNotificationService;
  private isInitialized = false;
  private vibrationInterval: NodeJS.Timeout | null = null;
  private notificationSubscriptions: (() => void)[] = [];

  private constructor() {}

  static getInstance(): CallNotificationService {
    if (!CallNotificationService.instance) {
      CallNotificationService.instance = new CallNotificationService();
    }
    return CallNotificationService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('📞 CallNotificationService: Initializing...');

      // Setup notification categories for actions
      await this.setupNotificationCategories();

      // Setup notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      // Setup notification listeners
      this.setupNotificationListeners();

      // Setup call state listeners
      this.setupCallStateListeners();

      this.isInitialized = true;
      console.log('✅ CallNotificationService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ CallNotificationService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('incoming-calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  /**
   * Setup notification categories for call actions
   */
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'answer',
        buttonTitle: 'Annehmen',
        options: {
          opensAppToForeground: true,
          isDestructive: false,
        },
      },
      {
        identifier: 'decline',
        buttonTitle: 'Ablehnen',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notifications when app is in foreground
    const foregroundSub = Notifications.addNotificationReceivedListener(
      this.handleForegroundNotification.bind(this)
    );

    // Handle notification responses (taps, actions)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.notificationSubscriptions.push(
      () => foregroundSub.remove(),
      () => responseSub.remove()
    );
  }

  /**
   * Setup call state listeners
   */
  private setupCallStateListeners(): void {
    CallStateManager.on('call:answered', this.handleCallAnswered.bind(this));
    CallStateManager.on('call:declined', this.handleCallDeclined.bind(this));
    CallStateManager.on('call:ended', this.handleCallEnded.bind(this));
  }

  /**
   * Handle incoming call notification from backend
   */
  async handleIncomingCall(notification: IncomingCallNotification): Promise<void> {
    try {
      console.log('📞 CallNotificationService: Handling incoming call:', notification);

      // Create call in state manager
      const callData = CallStateManager.createIncomingCall({
        channel: notification.channel,
        callerPhone: notification.callerPhone,
        calleePhone: notification.calleePhone,
        callerName: notification.callerName,
        hasVideo: notification.hasVideo ?? true,
      });

      // Try platform-specific call UI first (iOS CallKit, Android InCallService)
      const platformHandled = await PlatformCallAdapter.displayIncomingCall(callData);
      
      if (platformHandled) {
        console.log('📱 Platform call UI displayed successfully');
        return;
      }

      // Fallback to notification-based call UI
      await this.displayNotificationCall(callData);
      
      // Start ringing
      this.startRinging();

    } catch (error) {
      console.error('❌ CallNotificationService: Error handling incoming call:', error);
    }
  }

  /**
   * Display notification-based call UI
   */
  private async displayNotificationCall(callData: CallData): Promise<void> {
    const content = {
      title: `📞 ${callData.callerName || callData.callerPhone}`,
      body: callData.hasVideo ? 'Videoanruf' : 'Anruf',
      categoryIdentifier: 'incoming_call',
      sound: 'default',
      data: {
        type: 'incoming_call',
        callId: callData.callId,
        channel: callData.channel,
        callerPhone: callData.callerPhone,
        callerName: callData.callerName,
        hasVideo: callData.hasVideo,
      },
      badge: 1,
    };

    if (Platform.OS === 'android') {
      await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          channelId: 'incoming-calls',
          vibrate: [0, 1000, 500, 1000],
          color: '#FF0000',
          sticky: true,
          autoDismiss: false,
        },
        trigger: null,
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          interruptionLevel: 'active',
        },
        trigger: null,
      });
    }

    console.log('📱 Notification call UI displayed');
  }

  /**
   * Handle foreground notifications
   */
  private async handleForegroundNotification(notification: Notifications.Notification): Promise<void> {
    const data = notification.request.content.data as any;
    
    if (data?.type === 'incoming_call') {
      // Check if we already have an active call to prevent duplicates
      const activeCall = CallStateManager.getActiveCall();
      if (activeCall && activeCall.channel === data.channel) {
        console.log('📞 CallNotificationService: Ignoring duplicate foreground notification for channel:', data.channel);
        return;
      }
      
      // If we receive the notification in foreground, handle it directly
      await this.handleIncomingCall(data);
    }
  }

  /**
   * Handle notification responses (taps, actions)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as any;

    if (data?.type !== 'incoming_call') return;

    console.log('📞 CallNotificationService: Notification action:', actionIdentifier);

    switch (actionIdentifier) {
      case 'answer':
        this.answerCall();
        break;
      case 'decline':
        this.declineCall();
        break;
      default:
        // Default tap - show call screen
        this.showCallScreen();
        break;
    }
  }

  /**
   * Answer the current call
   */
  answerCall(): void {
    const success = CallStateManager.answerCall();
    if (success) {
      this.stopRinging();
      this.clearNotifications();
    }
  }

  /**
   * Decline the current call
   */
  declineCall(): void {
    const success = CallStateManager.declineCall();
    if (success) {
      this.stopRinging();
      this.clearNotifications();
    }
  }

  /**
   * Show call screen (for notification taps)
   */
  private showCallScreen(): void {
    const activeCall = CallStateManager.getActiveCall();
    if (activeCall && activeCall.callState === 'incoming') {
      // The UI will react to the call state through CallStateManager events
      console.log('📱 Call screen should be visible for:', activeCall.callId);
    }
  }

  /**
   * Start ringing and vibration
   */
  private startRinging(): void {
    this.stopRinging(); // Clear any existing ringing

    // Start continuous vibration pattern
    Vibration.vibrate([500, 1000, 500, 1000], true);

    // Additional periodic vibration for emphasis
    this.vibrationInterval = setInterval(() => {
      Vibration.vibrate(1000);
    }, 3000);

    console.log('📳 Ringing started');
  }

  /**
   * Stop ringing and vibration
   */
  private stopRinging(): void {
    Vibration.cancel();
    
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }

    console.log('🔇 Ringing stopped');
  }

  /**
   * Clear all call notifications
   */
  private async clearNotifications(): Promise<void> {
    try {
      const notifications = await Notifications.getPresentedNotificationsAsync();
      const callNotifications = notifications.filter(n => 
        n.request.content.data?.type === 'incoming_call'
      );

      for (const notification of callNotifications) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Handle call answered event
   */
  private handleCallAnswered(callData: CallData): void {
    this.stopRinging();
    this.clearNotifications();
    PlatformCallAdapter.onCallAnswered(callData);
  }

  /**
   * Handle call declined event
   */
  private handleCallDeclined(callData: CallData): void {
    this.stopRinging();
    this.clearNotifications();
    PlatformCallAdapter.onCallDeclined(callData);
  }

  /**
   * Handle call ended event
   */
  private handleCallEnded(callData: CallData | null): void {
    this.stopRinging();
    this.clearNotifications();
    if (callData) {
      PlatformCallAdapter.onCallEnded(callData);
    }
  }

  /**
   * End call by channel (for socket events)
   */
  endCallByChannel(channel: string): void {
    const call = CallStateManager.getCallByChannel(channel);
    if (call) {
      CallStateManager.endCall();
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopRinging();
    this.clearNotifications();
    CallStateManager.reset();
    
    // Remove notification listeners
    this.notificationSubscriptions.forEach(unsub => unsub());
    this.notificationSubscriptions = [];
    
    // Remove call state listeners
    CallStateManager.removeAllListeners();
    
    this.isInitialized = false;
    console.log('🧹 CallNotificationService: Cleaned up');
  }
}

export default CallNotificationService.getInstance();