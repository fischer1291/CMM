/**
 * CallStateManager - Centralized call state management
 * Single source of truth for all call-related state
 */

// Simple event emitter implementation for React Native
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  setMaxListeners(n: number): void {
    // Not needed for our simple implementation
  }
}

export interface CallData {
  callId: string;
  channel: string;
  callerPhone: string;
  calleePhone: string;
  callerName?: string;
  callState: 'incoming' | 'outgoing' | 'active' | 'ended';
  startTime?: Date;
  endTime?: Date;
  hasVideo: boolean;
}

export type CallStateEvent = 
  | 'call:incoming'
  | 'call:answered' 
  | 'call:declined'
  | 'call:ended'
  | 'call:timeout';

class CallStateManager extends SimpleEventEmitter {
  private static instance: CallStateManager;
  private activeCall: CallData | null = null;
  private callHistory: CallData[] = [];

  private constructor() {
    super();
    this.setMaxListeners(20); // Allow multiple listeners
  }

  static getInstance(): CallStateManager {
    if (!CallStateManager.instance) {
      CallStateManager.instance = new CallStateManager();
    }
    return CallStateManager.instance;
  }

  /**
   * Create a new incoming call
   */
  createIncomingCall(data: {
    channel: string;
    callerPhone: string;
    calleePhone: string;
    callerName?: string;
    hasVideo: boolean;
  }): CallData {
    // Check if we already have an active call for this channel
    if (this.activeCall && this.activeCall.channel === data.channel) {
      console.log('📞 CallStateManager: Call already exists for channel:', data.channel);
      return this.activeCall;
    }

    // Check if we have any active incoming call (prevent multiple incoming calls)
    if (this.activeCall && this.activeCall.callState === 'incoming') {
      console.log('📞 CallStateManager: Already have an active incoming call:', this.activeCall.callId);
      return this.activeCall;
    }

    const callData: CallData = {
      callId: `call_${Date.now()}`,
      callState: 'incoming',
      startTime: new Date(),
      ...data,
    };

    this.activeCall = callData;
    this.emit('call:incoming', callData);
    
    console.log('📞 CallStateManager: Incoming call created:', callData.callId);
    return callData;
  }

  /**
   * Answer the current incoming call
   */
  answerCall(): boolean {
    if (!this.activeCall || this.activeCall.callState !== 'incoming') {
      console.warn('⚠️ CallStateManager: No incoming call to answer');
      return false;
    }

    this.activeCall.callState = 'active';
    this.emit('call:answered', this.activeCall);
    
    console.log('✅ CallStateManager: Call answered:', this.activeCall.callId);
    return true;
  }

  /**
   * Decline the current incoming call
   */
  declineCall(): boolean {
    if (!this.activeCall || this.activeCall.callState !== 'incoming') {
      console.warn('⚠️ CallStateManager: No incoming call to decline');
      return false;
    }

    this.activeCall.callState = 'ended';
    this.activeCall.endTime = new Date();
    this.callHistory.push(this.activeCall);
    
    this.emit('call:declined', this.activeCall);
    
    const endedCall = this.activeCall;
    this.activeCall = null;
    
    console.log('❌ CallStateManager: Call declined:', endedCall.callId);
    return true;
  }

  /**
   * End the current active call
   */
  endCall(): boolean {
    if (!this.activeCall) {
      console.warn('⚠️ CallStateManager: No active call to end');
      return false;
    }

    this.activeCall.callState = 'ended';
    this.activeCall.endTime = new Date();
    this.callHistory.push(this.activeCall);
    
    this.emit('call:ended', this.activeCall);
    
    const endedCall = this.activeCall;
    this.activeCall = null;
    
    console.log('🔚 CallStateManager: Call ended:', endedCall.callId);
    return true;
  }

  /**
   * Get current active call
   */
  getActiveCall(): CallData | null {
    return this.activeCall;
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.activeCall !== null;
  }

  /**
   * Get call by channel (for socket events)
   */
  getCallByChannel(channel: string): CallData | null {
    return this.activeCall?.channel === channel ? this.activeCall : null;
  }

  /**
   * Clear all state (for cleanup)
   */
  reset(): void {
    const wasActive = this.activeCall !== null;
    this.activeCall = null;
    
    if (wasActive) {
      this.emit('call:ended', null);
    }
    
    console.log('🧹 CallStateManager: State reset');
  }

  /**
   * Get call history
   */
  getCallHistory(): CallData[] {
    return [...this.callHistory];
  }
}

export default CallStateManager.getInstance();