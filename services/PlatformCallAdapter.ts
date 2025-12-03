/**
 * PlatformCallAdapter - Platform-specific call integrations
 * Replaces: CallKeepService, CallKeepServiceSimple, NativeCallService
 */
import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { CallData } from './CallStateManager';

interface PlatformCallCapabilities {
  supportsNativeCallUI: boolean;
  supportsCallKit: boolean;
  supportsInCallService: boolean;
  supportsVoIP: boolean;
}

class PlatformCallAdapter {
  private static instance: PlatformCallAdapter;
  private capabilities: PlatformCallCapabilities;
  private isInitialized = false;
  private callKeepOptions = {
    ios: {
      appName: 'Call Me Maybe',
      supportsVideo: true,
      maximumCallGroups: '1',
      maximumCallsPerCallGroup: '1',
    },
    android: {
      alertTitle: 'Permissions Required',
      alertDescription: 'This application needs to access your phone accounts',
      cancelButton: 'Cancel',
      okButton: 'Ok',
      imageName: 'phone_account_icon',
      additionalPermissions: [],
      selfManaged: true,
    },
  };
  // Callbacks for call events
  private onAnswerCallCallback?: (callId: string) => void;
  private onEndCallCallback?: (callId: string) => void;
  private onRejectCallCallback?: (callId: string) => void;

  private constructor() {
    this.capabilities = this.detectCapabilities();
  }

  static getInstance(): PlatformCallAdapter {
    if (!PlatformCallAdapter.instance) {
      PlatformCallAdapter.instance = new PlatformCallAdapter();
    }
    return PlatformCallAdapter.instance;
  }

  /**
   * Detect platform capabilities
   */
  private detectCapabilities(): PlatformCallCapabilities {
    return {
      supportsNativeCallUI: Platform.OS === 'ios' || Platform.OS === 'android',
      supportsCallKit: Platform.OS === 'ios',
      supportsInCallService: Platform.OS === 'android',
      supportsVoIP: Platform.OS === 'ios', // Could be enabled later
    };
  }

  /**
   * Initialize platform integrations
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('📱 PlatformCallAdapter: Initializing...');
      console.log('📱 Detected capabilities:', this.capabilities);

      // Initialize CallKit for iOS
      if (this.capabilities.supportsCallKit && Platform.OS === 'ios') {
        await this.initializeCallKit();
      }

      // Initialize InCallService for Android (future implementation)
      if (this.capabilities.supportsInCallService && Platform.OS === 'android') {
        await this.initializeAndroidCallService();
      }

      this.isInitialized = true;
      console.log('✅ PlatformCallAdapter: Initialized');
      return true;
    } catch (error) {
      console.error('❌ PlatformCallAdapter: Initialization failed:', error);
      // Fall back to notification-based calls
      this.isInitialized = true;
      return true;
    }
  }

  /**
   * Initialize iOS CallKit
   */
  private async initializeCallKit(): Promise<void> {
    try {
      console.log('📱 Initializing iOS CallKit...');

      // Setup CallKeep
      await RNCallKeep.setup(this.callKeepOptions);

      // Register event listeners
      this.setupCallKeepEventListeners();

      console.log('✅ iOS CallKit initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize CallKit:', error);
      throw error;
    }
  }

  /**
   * Initialize Android InCallService (future implementation)
   */
  private async initializeAndroidCallService(): Promise<void> {
    try {
      console.log('📱 Initializing Android InCallService...');

      // Setup CallKeep for Android
      await RNCallKeep.setup(this.callKeepOptions);

      // Register event listeners
      this.setupCallKeepEventListeners();

      console.log('✅ Android InCallService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Android InCallService:', error);
      throw error;
    }
  }

  /**
   * Setup CallKeep event listeners
   */
  private setupCallKeepEventListeners(): void {
    // Answer call event
    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      console.log('📱 CallKeep: Answer call', callUUID);
      if (this.onAnswerCallCallback) {
        this.onAnswerCallCallback(callUUID);
      }
    });

    // End call event
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      console.log('📱 CallKeep: End call', callUUID);
      if (this.onEndCallCallback) {
        this.onEndCallCallback(callUUID);
      }
    });

    // Reject call event (iOS only)
    RNCallKeep.addEventListener('didPerformDTMFAction', ({ callUUID, digits }) => {
      console.log('📱 CallKeep: DTMF action', callUUID, digits);
    });

    // Call display event
    RNCallKeep.addEventListener('didDisplayIncomingCall', ({ callUUID, handle, fromPushKit }) => {
      console.log('📱 CallKeep: Did display incoming call', callUUID, handle, fromPushKit);
    });

    // Mute/unmute events
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }) => {
      console.log('📱 CallKeep: Set muted', muted, callUUID);
    });
  }

  /**
   * Set callback for when call is answered
   */
  setOnAnswerCallCallback(callback: (callId: string) => void): void {
    this.onAnswerCallCallback = callback;
  }

  /**
   * Set callback for when call is ended
   */
  setOnEndCallCallback(callback: (callId: string) => void): void {
    this.onEndCallCallback = callback;
  }

  /**
   * Set callback for when call is rejected
   */
  setOnRejectCallCallback(callback: (callId: string) => void): void {
    this.onRejectCallCallback = callback;
  }

  /**
   * Display incoming call using platform-specific UI
   */
  async displayIncomingCall(callData: CallData): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ PlatformCallAdapter not initialized, using notification fallback');
        return false;
      }

      if (this.capabilities.supportsCallKit && Platform.OS === 'ios') {
        console.log('📱 Displaying iOS CallKit incoming call');
        await this.displayCallKitIncomingCall(callData);
        return true;
      }

      if (this.capabilities.supportsInCallService && Platform.OS === 'android') {
        console.log('📱 Displaying Android InCallService incoming call');
        await this.displayAndroidIncomingCall(callData);
        return true;
      }

      return false; // Use notification-based fallback
    } catch (error) {
      console.error('❌ PlatformCallAdapter: Error displaying call:', error);
      return false;
    }
  }

  /**
   * Display incoming call using iOS CallKit
   */
  private async displayCallKitIncomingCall(callData: CallData): Promise<void> {
    try {
      const { callId, callerPhone, callerName } = callData;

      // Display incoming call in CallKit
      await RNCallKeep.displayIncomingCall(
        callId,
        callerPhone,
        callerName || 'Unknown',
        'generic',
        true // hasVideo
      );

      console.log('✅ CallKit incoming call displayed:', callId);
    } catch (error) {
      console.error('❌ Failed to display CallKit incoming call:', error);
      throw error;
    }
  }

  /**
   * Display incoming call using Android InCallService
   */
  private async displayAndroidIncomingCall(callData: CallData): Promise<void> {
    try {
      const { callId, callerPhone, callerName } = callData;

      // Display incoming call in Android
      await RNCallKeep.displayIncomingCall(
        callId,
        callerPhone,
        callerName || 'Unknown',
        'generic',
        true // hasVideo
      );

      console.log('✅ Android incoming call displayed:', callId);
    } catch (error) {
      console.error('❌ Failed to display Android incoming call:', error);
      throw error;
    }
  }

  /**
   * Handle call answered event
   */
  onCallAnswered(callData: CallData): void {
    console.log('📱 PlatformCallAdapter: Call answered:', callData.callId);

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Start call in CallKeep (changes UI state to "in call")
        RNCallKeep.startCall(callData.callId, callData.callerPhone, callData.callerName || 'Unknown');
        console.log('✅ CallKeep call started:', callData.callId);
      }
    } catch (error) {
      console.error('❌ Failed to start CallKeep call:', error);
    }
  }

  /**
   * Handle call declined event
   */
  onCallDeclined(callData: CallData): void {
    console.log('📱 PlatformCallAdapter: Call declined:', callData.callId);

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // End call in CallKeep
        RNCallKeep.endCall(callData.callId);
        console.log('✅ CallKeep call declined:', callData.callId);
      }
    } catch (error) {
      console.error('❌ Failed to end CallKeep call:', error);
    }
  }

  /**
   * Handle call ended event
   */
  onCallEnded(callData: CallData): void {
    console.log('📱 PlatformCallAdapter: Call ended:', callData.callId);

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // End call in CallKeep
        RNCallKeep.endCall(callData.callId);
        console.log('✅ CallKeep call ended:', callData.callId);
      }
    } catch (error) {
      console.error('❌ Failed to end CallKeep call:', error);
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): PlatformCallCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if platform supports native call UI
   */
  supportsNativeCallUI(): boolean {
    return this.capabilities.supportsNativeCallUI;
  }

  /**
   * Cleanup platform integrations
   */
  cleanup(): void {
    try {
      // Remove all CallKeep event listeners
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didPerformDTMFAction');
        RNCallKeep.removeEventListener('didDisplayIncomingCall');
        RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
        console.log('✅ CallKeep event listeners removed');
      }

      // Clear callbacks
      this.onAnswerCallCallback = undefined;
      this.onEndCallCallback = undefined;
      this.onRejectCallCallback = undefined;

      this.isInitialized = false;
      console.log('🧹 PlatformCallAdapter: Cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export default PlatformCallAdapter.getInstance();