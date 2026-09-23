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

    // CRITICAL: Wrap ALL event listeners with maximum defensive checks
    // to prevent native TurboModule bridge crashes

    // Answer call event
    RNCallKeep.addEventListener('answerCall', (data: any) => {
      // CRITICAL: Don't destructure - validate payload first
      try {
        console.log('📱 CallKeep: Answer call event received', data);

        // Validate payload structure
        if (!data || typeof data !== 'object') {
          console.error('❌ Invalid answerCall event payload:', data);
          return;
        }

        const callUUID = data.callUUID || data.callId;
        if (!callUUID || typeof callUUID !== 'string') {
          console.error('❌ Invalid callUUID in answerCall event:', callUUID);
          return;
        }

        console.log('✅ Validated callUUID:', callUUID);

        // CRITICAL: Validate callback exists AND is a function
        if (typeof this.onAnswerCallCallback === 'function') {
          try {
            console.log('🎯 Invoking onAnswerCallCallback');
            this.onAnswerCallCallback(callUUID);
            console.log('✅ onAnswerCallCallback completed');
          } catch (callbackError: any) {
            console.error('❌ Error invoking onAnswerCallCallback:', {
              error: callbackError,
              message: callbackError?.message,
              stack: callbackError?.stack,
            });
          }
        } else {
          console.warn('⚠️  onAnswerCallCallback not set or not a function:', typeof this.onAnswerCallCallback);
        }
      } catch (error: any) {
        console.error('❌ Critical error in answerCall event handler:', {
          error: error,
          message: error?.message,
          stack: error?.stack,
        });
      }
    });

    // End call event
    RNCallKeep.addEventListener('endCall', (data: any) => {
      try {
        console.log('📱 CallKeep: End call event received', data);

        if (!data || typeof data !== 'object') {
          console.error('❌ Invalid endCall event payload:', data);
          return;
        }

        const callUUID = data.callUUID || data.callId;
        if (!callUUID || typeof callUUID !== 'string') {
          console.error('❌ Invalid callUUID in endCall event:', callUUID);
          return;
        }

        if (typeof this.onEndCallCallback === 'function') {
          try {
            this.onEndCallCallback(callUUID);
          } catch (callbackError: any) {
            console.error('❌ Error invoking onEndCallCallback:', {
              error: callbackError,
              message: callbackError?.message,
            });
          }
        } else {
          console.warn('⚠️  onEndCallCallback not set or not a function');
        }
      } catch (error: any) {
        console.error('❌ Critical error in endCall event handler:', {
          error: error,
          message: error?.message,
        });
      }
    });

    // Reject call event (iOS only)
    RNCallKeep.addEventListener('didPerformDTMFAction', (data: any) => {
      try {
        console.log('📱 CallKeep: DTMF action event received', data);

        if (!data || typeof data !== 'object') {
          console.error('❌ Invalid DTMF event payload:', data);
          return;
        }

        const callUUID = data.callUUID || data.callId;
        const digits = data.digits;
        console.log('📱 CallKeep: DTMF action', callUUID, digits);
      } catch (error: any) {
        console.error('❌ Error in didPerformDTMFAction event handler:', {
          error: error,
          message: error?.message,
        });
      }
    });

    // Call display event
    RNCallKeep.addEventListener('didDisplayIncomingCall', (data: any) => {
      try {
        console.log('📱 CallKeep: Did display incoming call event received', data);

        if (!data || typeof data !== 'object') {
          console.error('❌ Invalid didDisplayIncomingCall event payload:', data);
          return;
        }

        const callUUID = data.callUUID || data.callId;
        const handle = data.handle;
        const fromPushKit = data.fromPushKit;
        console.log('✅ CallKeep: Successfully displayed incoming call', callUUID, handle, fromPushKit);
      } catch (error: any) {
        console.error('❌ Error in didDisplayIncomingCall event handler:', {
          error: error,
          message: error?.message,
        });
      }
    });

    // Mute/unmute events
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', (data: any) => {
      try {
        console.log('📱 CallKeep: Set muted event received', data);

        if (!data || typeof data !== 'object') {
          console.error('❌ Invalid mute event payload:', data);
          return;
        }

        const muted = data.muted;
        const callUUID = data.callUUID || data.callId;
        console.log('📱 CallKeep: Set muted', muted, callUUID);
      } catch (error: any) {
        console.error('❌ Error in didPerformSetMutedCallAction event handler:', {
          error: error,
          message: error?.message,
        });
      }
    });

    console.log('✅ CallKeep event listeners registered successfully');
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
          true // hasVideo
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
          true // hasVideo
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

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
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