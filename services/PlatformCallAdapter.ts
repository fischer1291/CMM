/**
 * PlatformCallAdapter - Platform-specific call integrations
 * Replaces: CallKeepService, CallKeepServiceSimple, NativeCallService
 */
import { Platform } from 'react-native';
import { CallData } from './CallStateManager';

// Lazy-loaded CallKeep module (only loaded when needed, not at module init)
let RNCallKeep: any = null;
let isCallKeepAvailable = false;
let callKeepLoadAttempted = false;

/**
 * Lazily load the CallKeep library only when needed
 * This prevents crashes on app launch if the library isn't properly linked
 */
function loadCallKeepLibrary(): boolean {
  if (callKeepLoadAttempted) {
    return isCallKeepAvailable;
  }

  callKeepLoadAttempted = true;

  try {
    console.log('📱 Attempting to load CallKeep library...');
    // Native-only module: loaded lazily so the web build works
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const callKeepModule = require('react-native-callkeep');
    RNCallKeep = callKeepModule?.default || callKeepModule;
    isCallKeepAvailable = !!RNCallKeep;
    console.log('✅ CallKeep library loaded successfully:', isCallKeepAvailable);
    return isCallKeepAvailable;
  } catch (error: any) {
    console.warn('⚠️ CallKeep library could not be loaded:', error?.message);
    console.warn('   This is normal in development builds without proper native linking');
    isCallKeepAvailable = false;
    return false;
  }
}

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
  private onPushIncomingCallCallback?: (callId: string, payload: any) => void;

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

      // Lazy load the CallKeep library
      const libraryLoaded = loadCallKeepLibrary();
      if (!libraryLoaded || !RNCallKeep) {
        console.warn('⚠️ CallKeep library not available - falling back to notification-based calls');
        this.isInitialized = true;
        return true;
      }

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

      // CRITICAL: Delay event listener setup to ensure JS runtime is fully ready
      // This prevents TurboModule bridge crashes when native tries to invoke JS callbacks
      console.log('⏳ Waiting for JS runtime to be ready before registering event listeners...');
      await new Promise(resolve => setTimeout(resolve, 100));

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
   * CRITICAL: Defensive event handling to prevent TurboModule bridge crashes
   */
  private setupCallKeepEventListeners(): void {
    console.log('🔧 Setting up CallKeep event listeners with defensive error handling...');

    // Must be registered FIRST: CallKeep flushes events that happened before JS
    // was ready (e.g. a call reported from a VoIP push and answered while the
    // app was still launching) as soon as the first listener is added.
    RNCallKeep.addEventListener('didLoadWithEvents', (events: any[]) => {
      this.safely('didLoadWithEvents', () => {
        (events || []).forEach((event) => this.dispatchDelayedEvent(event));
        RNCallKeep.clearInitialEvents?.();
      });
    });

    RNCallKeep.addEventListener('didDisplayIncomingCall', (data: any) =>
      this.safely('didDisplayIncomingCall', () => this.handleDidDisplayIncomingCall(data))
    );
    RNCallKeep.addEventListener('answerCall', (data: any) =>
      this.safely('answerCall', () => this.handleAnswerCall(data))
    );
    RNCallKeep.addEventListener('endCall', (data: any) =>
      this.safely('endCall', () => this.handleEndCall(data))
    );
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', (data: any) => {
      console.log('📱 CallKeep: Set muted', data?.muted, data?.callUUID);
    });

    console.log('✅ CallKeep event listeners registered successfully');
  }

  /**
   * Replays an event CallKeep cached before JS listeners existed.
   */
  private dispatchDelayedEvent(event: any): void {
    const data = event?.data;
    switch (event?.name) {
      case 'RNCallKeepDidDisplayIncomingCall':
        this.handleDidDisplayIncomingCall(data);
        break;
      case 'RNCallKeepPerformAnswerCallAction':
        this.handleAnswerCall(data);
        break;
      case 'RNCallKeepPerformEndCallAction':
        this.handleEndCall(data);
        break;
      default:
        break;
    }
  }

  private safely(eventName: string, fn: () => void): void {
    try {
      fn();
    } catch (error: any) {
      console.error(`❌ Error in CallKeep ${eventName} handler:`, error?.message);
    }
  }

  private getCallUUID(data: any): string | null {
    const callUUID = data?.callUUID || data?.callId;
    return typeof callUUID === 'string' && callUUID.length > 0 ? callUUID.toLowerCase() : null;
  }

  /**
   * Calls reported natively from a VoIP push (AppDelegate.swift) only reach JS
   * through this event, so this is where they enter the app's call state.
   */
  private handleDidDisplayIncomingCall(data: any): void {
    const callUUID = this.getCallUUID(data);
    console.log('📱 CallKeep: Did display incoming call', callUUID, data?.fromPushKit, data?.error);

    // An error here usually means the call was already reported (e.g. via socket)
    if (!callUUID || data?.error || data?.fromPushKit !== '1') return;

    const payload = data?.payload && typeof data.payload === 'object' ? data.payload : null;
    if (!payload?.channel || !payload?.callerPhone) {
      console.error('❌ VoIP call without channel/callerPhone, ending it:', callUUID);
      RNCallKeep.endCall(callUUID);
      return;
    }

    this.onPushIncomingCallCallback?.(callUUID, payload);
  }

  private handleAnswerCall(data: any): void {
    const callUUID = this.getCallUUID(data);
    console.log('📱 CallKeep: Answer call event received', callUUID);
    if (!callUUID) return;
    this.onAnswerCallCallback?.(callUUID);
  }

  private handleEndCall(data: any): void {
    const callUUID = this.getCallUUID(data);
    console.log('📱 CallKeep: End call event received', callUUID);
    if (!callUUID) return;
    this.onEndCallCallback?.(callUUID);
  }

  /**
   * Set callback for incoming calls that were reported from a VoIP push
   */
  setOnPushIncomingCallCallback(callback: (callId: string, payload: any) => void): void {
    this.onPushIncomingCallCallback = callback;
  }

  /**
   * Set callback for when call is answered
   * CRITICAL: Validate callback is a function to prevent TurboModule crashes
   */
  setOnAnswerCallCallback(callback: (callId: string) => void): void {
    if (typeof callback !== 'function') {
      console.error('❌ setOnAnswerCallCallback: callback is not a function:', typeof callback);
      return;
    }
    console.log('✅ setOnAnswerCallCallback: Callback registered');
    this.onAnswerCallCallback = callback;
  }

  /**
   * Set callback for when call is ended
   * CRITICAL: Validate callback is a function to prevent TurboModule crashes
   */
  setOnEndCallCallback(callback: (callId: string) => void): void {
    if (typeof callback !== 'function') {
      console.error('❌ setOnEndCallCallback: callback is not a function:', typeof callback);
      return;
    }
    console.log('✅ setOnEndCallCallback: Callback registered');
    this.onEndCallCallback = callback;
  }

  /**
   * Set callback for when call is rejected
   * CRITICAL: Validate callback is a function to prevent TurboModule crashes
   */
  setOnRejectCallCallback(callback: (callId: string) => void): void {
    if (typeof callback !== 'function') {
      console.error('❌ setOnRejectCallCallback: callback is not a function:', typeof callback);
      return;
    }
    console.log('✅ setOnRejectCallCallback: Callback registered');
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
      // CRITICAL: Check if CallKeep is loaded before attempting to use it
      if (!isCallKeepAvailable || !RNCallKeep) {
        console.warn('⚠️ CallKeep not loaded, cannot display incoming call');
        throw new Error('CallKeep not available');
      }

      const { callId, callerPhone, callerName } = callData;

      // CRITICAL: Validate all parameters before calling CallKeep
      // to prevent native crashes in TurboModule bridge
      if (!callId || typeof callId !== 'string') {
        throw new Error(`Invalid callId: ${callId}`);
      }

      if (!callerPhone || typeof callerPhone !== 'string') {
        throw new Error(`Invalid callerPhone: ${callerPhone}`);
      }

      // Sanitize caller name to prevent special characters causing issues
      const sanitizedCallerName = (callerName || 'Unknown Caller')
        .replace(/[^\w\s\-]/g, '') // Remove special characters
        .trim()
        .substring(0, 100) || 'Unknown Caller'; // Max 100 chars

      console.log('📱 Calling RNCallKeep.displayIncomingCall with:', {
        callId,
        callerPhone,
        sanitizedCallerName,
      });

      // Double try-catch to catch any native exception
      try {
        await RNCallKeep.displayIncomingCall(
          callId,
          callerPhone,
          sanitizedCallerName,
          'generic',
          callData.hasVideo !== false // audio-only calls show as audio
        );
        console.log('✅ CallKit incoming call displayed:', callId);
      } catch (nativeError: any) {
        console.error('❌ Native CallKeep.displayIncomingCall failed:', {
          error: nativeError,
          message: nativeError?.message,
          code: nativeError?.code,
          callId,
          callerPhone,
        });

        // Log detailed error for debugging
        if (nativeError?.message?.includes('permissions')) {
          console.error('⚠️  CallKit permissions may not be granted. Check Info.plist and iOS Settings.');
        }

        // CRITICAL: Do NOT rethrow - rethrowing causes TurboModule bridge to crash
        // Instead, log and return gracefully
        console.error('⚠️  CallKit failed, system will fall back to notification-based calling');
        return;
      }
    } catch (error: any) {
      console.error('❌ Failed to display CallKit incoming call:', {
        error: error,
        message: error?.message,
        callData,
      });
      // CRITICAL: Do NOT rethrow - return gracefully to prevent TurboModule crash
      return;
    }
  }

  /**
   * Display incoming call using Android InCallService
   */
  private async displayAndroidIncomingCall(callData: CallData): Promise<void> {
    try {
      // CRITICAL: Check if CallKeep is loaded before attempting to use it
      if (!isCallKeepAvailable || !RNCallKeep) {
        console.warn('⚠️ CallKeep not loaded, cannot display incoming call');
        throw new Error('CallKeep not available');
      }

      const { callId, callerPhone, callerName } = callData;

      // CRITICAL: Validate all parameters before calling CallKeep
      if (!callId || typeof callId !== 'string') {
        throw new Error(`Invalid callId: ${callId}`);
      }

      if (!callerPhone || typeof callerPhone !== 'string') {
        throw new Error(`Invalid callerPhone: ${callerPhone}`);
      }

      // Sanitize caller name to prevent special characters causing issues
      const sanitizedCallerName = (callerName || 'Unknown')
        .replace(/[^\w\s\-]/g, '')
        .trim()
        .substring(0, 100) || 'Unknown';

      console.log('📱 Calling RNCallKeep.displayIncomingCall (Android) with:', {
        callId,
        callerPhone,
        sanitizedCallerName,
      });

      try {
        // Display incoming call in Android
        await RNCallKeep.displayIncomingCall(
          callId,
          callerPhone,
          sanitizedCallerName,
          'generic',
          callData.hasVideo !== false // audio-only calls show as audio
        );

        console.log('✅ Android incoming call displayed:', callId);
      } catch (nativeError: any) {
        console.error('❌ Native CallKeep.displayIncomingCall (Android) failed:', {
          error: nativeError,
          message: nativeError?.message,
          code: nativeError?.code,
          callId,
          callerPhone,
        });

        if (nativeError?.message?.includes('permissions')) {
          console.error('⚠️  Android call permissions may not be granted. Check AndroidManifest.xml.');
        }

        // CRITICAL: Do NOT rethrow - rethrowing causes TurboModule bridge to crash
        console.error('⚠️  CallKeep failed, system will fall back to notification-based calling');
        return;
      }
    } catch (error: any) {
      console.error('❌ Failed to display Android incoming call:', {
        error: error,
        message: error?.message,
        callData,
      });
      // CRITICAL: Do NOT rethrow - return gracefully to prevent TurboModule crash
      return;
    }
  }

  /**
   * Handle call answered event
   */
  onCallAnswered(callData: CallData): void {
    console.log('📱 PlatformCallAdapter: Call answered:', callData.callId);

    try {
      if (!isCallKeepAvailable || !RNCallKeep) {
        console.warn('⚠️ CallKeep not available, skipping startCall');
        return;
      }

      if (!callData?.callId || typeof callData.callId !== 'string') {
        console.error('❌ Invalid callId in onCallAnswered:', callData?.callId);
        return;
      }

      // iOS: CallKit already marked the call active when the user answered in the
      // native UI. startCall would request a second (outgoing) call with the same
      // UUID, which CallKit rejects.
      if (Platform.OS === 'android') {
        // Validate and sanitize parameters
        const sanitizedCallerName = (callData.callerName || 'Unknown')
          .replace(/[^\w\s\-]/g, '')
          .trim()
          .substring(0, 100) || 'Unknown';

        try {
          // Start call in CallKeep (changes UI state to "in call")
          RNCallKeep.startCall(
            callData.callId,
            callData.callerPhone || 'Unknown',
            sanitizedCallerName
          );
          console.log('✅ CallKeep call started:', callData.callId);
        } catch (nativeError: any) {
          console.error('❌ Native startCall failed:', {
            error: nativeError,
            message: nativeError?.message,
            callId: callData.callId,
          });
        }
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
      if (!isCallKeepAvailable || !RNCallKeep) {
        console.warn('⚠️ CallKeep not available, skipping endCall');
        return;
      }

      if (!callData?.callId || typeof callData.callId !== 'string') {
        console.error('❌ Invalid callId in onCallDeclined:', callData?.callId);
        return;
      }

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          // End call in CallKeep
          RNCallKeep.endCall(callData.callId);
          console.log('✅ CallKeep call declined:', callData.callId);
        } catch (nativeError: any) {
          console.error('❌ Native endCall failed:', {
            error: nativeError,
            message: nativeError?.message,
            callId: callData.callId,
          });
        }
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
      if (!isCallKeepAvailable || !RNCallKeep) {
        console.warn('⚠️ CallKeep not available, skipping endCall');
        return;
      }

      if (!callData?.callId || typeof callData.callId !== 'string') {
        console.error('❌ Invalid callId in onCallEnded:', callData?.callId);
        return;
      }

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          // End call in CallKeep
          RNCallKeep.endCall(callData.callId);
          console.log('✅ CallKeep call ended:', callData.callId);
        } catch (nativeError: any) {
          console.error('❌ Native endCall failed:', {
            error: nativeError,
            message: nativeError?.message,
            callId: callData.callId,
          });
        }
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
      // Remove all CallKeep event listeners (only if library was loaded)
      if (isCallKeepAvailable && RNCallKeep && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        RNCallKeep.removeEventListener('didLoadWithEvents');
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didDisplayIncomingCall');
        RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
        console.log('✅ CallKeep event listeners removed');
      }

      // Clear callbacks
      this.onAnswerCallCallback = undefined;
      this.onEndCallCallback = undefined;
      this.onRejectCallCallback = undefined;
      this.onPushIncomingCallCallback = undefined;

      this.isInitialized = false;
      console.log('🧹 PlatformCallAdapter: Cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export default PlatformCallAdapter.getInstance();