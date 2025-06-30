/**
 * Updated VideoCall integration - Replace relevant parts in videocall.tsx
 * This shows how to integrate with the new call system
 */

// REPLACE THESE IMPORTS IN videocall.tsx:
// OLD:
// import { useCall } from '../../contexts/CallContext';
// import EnhancedCallService from '../../services/enhancedCallService';

// NEW:
import { useNewCall } from '../../contexts/NewCallContext';
import CallNotificationService from '../../services/CallNotificationService';

// REPLACE THE CLEANUP FUNCTION:
const cleanupCall = async (notifyRemote = false) => {
  // NEW: Single service cleanup - much simpler!
  try {
    if (channel) {
      await CallNotificationService.endCallByChannel(channel);
      console.log('✅ Call service cleaned up for channel:', channel);
    }
  } catch (error) {
    console.log('Call service cleanup error:', error);
  }

  // Existing Agora cleanup
  if (engineRef.current) {
    try {
      engineRef.current.leaveChannel();
      engineRef.current.stopPreview();
    } catch (e) {
      // Disconnect error - silent handling
    }
  }

  // Notify other user that call has ended (only if we initiated the disconnect)
  if (notifyRemote && channel && userPhone && targetPhone) {
    // Use the new call context
    const { endCall } = useNewCall();
    endCall();
  }

  setJoined(false);
  setRemoteUid(null);
  setLocalUid(null);

  // Navigation back
  router.replace('/(tabs)/contacts');
};

// REPLACE THE SETUP CALL EFFECT:
useEffect(() => {
  const setupCall = async () => {
    // NEW: Simple cleanup - the CallNotificationService handles everything
    try {
      if (channel) {
        console.log('🔇 Stopping call notifications for channel:', channel);
        await CallNotificationService.endCallByChannel(channel);
      }
    } catch (error) {
      console.log('Error stopping call notifications:', error);
    }

    await initializeEngine();
  };

  setupCall();

  return () => {
    if (engineRef.current) {
      engineRef.current.leaveChannel();
      engineRef.current.stopPreview();
      engineRef.current.release();
      engineRef.current = null;
    }
  };
}, [channel]);

// REPLACE THE CALL CONTEXT USAGE:
// OLD:
// const { emitCallEnded, onCallEnded } = useCall();

// NEW:
const { endCall } = useNewCall();

// The disconnectCall function becomes much simpler:
const disconnectCall = async () => {
  await cleanupCall(true); // Notify remote user
};