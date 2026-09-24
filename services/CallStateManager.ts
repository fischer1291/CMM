/**
 * CallStateManager - Centralized call state management
 * Single source of truth for all call-related state
 */
import { uuidv4 } from '../utils/uuid';

// Simple event emitter implementation for React Native
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
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
  | 'call:timeout'
  | 'call:remote-ended' // outgoing call ended by the other side: { channel, reason }
  | 'call:accepted'; // outgoing call answered: { channel }

/**
 * An incoming call that is still "ringing" after this long is over, even if
 * the end signal never arrived (app suspended, socket down). A bit longer
 * than the backend's 45 s ring timeout.
 */
export const INCOMING_RING_TIMEOUT_MS = 60 * 1000;

class CallStateManager extends SimpleEventEmitter {
  private static instance: CallStateManager;
  private activeCall: CallData | null = null;
  private callHistory: CallData[] = [];
  private ringTimer: ReturnType<typeof setTimeout> | null = null;

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
   * Create a new incoming call. Returns the existing call for the same
   * channel, or null if the user is busy with another call (the caller
   * should then be told). A leftover call that stopped ringing long ago is
   * dropped instead of blocking the new one.
   */
  createIncomingCall(data: {
    callId?: string;
    channel: string;
    callerPhone: string;
    calleePhone: string;
    callerName?: string;
    hasVideo: boolean;
  }): CallData | null {
    if (this.activeCall && this.activeCall.channel === data.channel) {
      console.log('📞 CallStateManager: Call already exists for channel:', data.channel);
      return this.activeCall;
    }

    if (this.activeCall) {
      if (!this.isStale(this.activeCall)) {
        console.log('📞 CallStateManager: Busy with', this.activeCall.channel, '- rejecting', data.channel);
        return null;
      }
      console.log('📞 CallStateManager: Dropping stale call:', this.activeCall.channel);
      this.endCall();
    }

    const { callId, ...rest } = data;
    const callData: CallData = {
      // Must be a UUID: CallKit rejects (and crashes on) any other id format.
      // The backend assigns one per call so socket, VoIP push and CallKit agree.
      callId: callId ? callId.toLowerCase() : uuidv4(),
      callState: 'incoming',
      startTime: new Date(),
      ...rest,
    };

    this.activeCall = callData;
    this.startRingTimer(callData.callId);
    this.emit('call:incoming', callData);

    console.log('📞 CallStateManager: Incoming call created:', callData.callId);
    return callData;
  }

  /** An incoming call nobody answered in time, or an old ended one. */
  private isStale(call: CallData): boolean {
    if (call.callState === 'ended') return true;
    if (call.callState !== 'incoming') return false;
    return !call.startTime || Date.now() - call.startTime.getTime() > INCOMING_RING_TIMEOUT_MS;
  }

  /** Stop ringing on this device if the end signal gets lost. */
  private startRingTimer(callId: string): void {
    this.clearRingTimer();
    this.ringTimer = setTimeout(() => {
      this.ringTimer = null;
      if (this.activeCall?.callId === callId && this.activeCall.callState === 'incoming') {
        console.log('⏱️ CallStateManager: Incoming call timed out:', callId);
        this.endCall();
      }
    }, INCOMING_RING_TIMEOUT_MS);
  }

  private clearRingTimer(): void {
    if (this.ringTimer) clearTimeout(this.ringTimer);
    this.ringTimer = null;
  }

  /**
   * Answer the current incoming call
   */
  answerCall(): boolean {
    if (!this.activeCall || this.activeCall.callState !== 'incoming') {
      console.warn('⚠️ CallStateManager: No incoming call to answer');
      return false;
    }

    this.clearRingTimer();
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

    // Clear the active call before notifying listeners: a listener may end
    // the call again (e.g. via CallKit), which must find nothing to end
    this.clearRingTimer();
    const endedCall = this.activeCall;
    this.activeCall = null;
    endedCall.callState = 'ended';
    endedCall.endTime = new Date();
    this.callHistory.push(endedCall);

    console.log('❌ CallStateManager: Call declined:', endedCall.callId);
    this.emit('call:declined', endedCall);
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

    // Clear the active call before notifying listeners: the call screen's
    // cleanup ends the call again, which must find nothing to end
    this.clearRingTimer();
    const endedCall = this.activeCall;
    this.activeCall = null;
    endedCall.callState = 'ended';
    endedCall.endTime = new Date();
    this.callHistory.push(endedCall);

    console.log('🔚 CallStateManager: Call ended:', endedCall.callId);
    this.emit('call:ended', endedCall);
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
    this.clearRingTimer();
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