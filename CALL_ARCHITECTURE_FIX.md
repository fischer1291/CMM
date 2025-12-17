# Call Architecture Analysis & Fix Plan

## Current Flow Analysis

### Backend (Socket.io)
✅ **CORRECT IMPLEMENTATION**
```
1. Caller emits 'callRequest' → { from, to, channel }
2. Backend:
   - Gets caller name from DB
   - Emits 'incomingCall' to receiver (if online via socket)
   - Sends VoIP push (iOS, works in background)
   - Falls back to regular push notification
3. Receiver answers → emits 'acceptCall'
4. Backend → emits 'startCall' to caller
```

### Frontend Issues

#### 🔴 CRITICAL BUG FOUND:
**Videocall screen is mounting on BOTH devices simultaneously!**

From logs:
```
🎥 VideoCallScreen mounted with params: {"channel": "call_26v"...}
📞 CallNotificationService: Handling incoming call  ← Happens AFTER!
```

The videocall screen mounts on the RECEIVER before they answer!

## Root Causes

### 1. **Routing Architecture Problem**
- Videocall is at `/(tabs)/videocall` - a tab route
- Both devices can access this route simultaneously
- When caller navigates, receiver's app might also load the route
- Expo Router might be syncing state across instances

### 2. **Missing Navigation Guards**
- No check if user is caller vs receiver
- No check if call was actually answered
- Videocall screen runs useEffects immediately on mount
- Agora initialization happens before call is ready

### 3. **State Synchronization Issue**
- Both devices might be on the same network/account
- Router history persists across app reloads
- Previous call routes stay in navigation stack

## WhatsApp's Correct Flow

### Caller Side:
```
1. User taps "Call" button
2. App immediately navigates to call screen
3. Shows "Calling..." state
4. Initializes Agora
5. Waits for receiver to answer
6. When receiver answers → video connects
```

### Receiver Side:
```
1. Receives VoIP push OR socket event
2. Shows native CallKit interface (iOS)
3. User sees native "Accept/Decline" buttons
4. If accepted → THEN navigate to call screen
5. Initialize Agora and connect
```

## Complete Fix Plan

### Phase 1: Fix Routing Architecture

**Move videocall screen out of tabs:**
```
Current: app/(tabs)/videocall.tsx
New:     app/videocall.tsx (modal route)
```

This prevents tab-based routing conflicts.

### Phase 2: Add Proper Navigation Guards

**In videocall screen:**
```typescript
// Only allow mounting if:
// 1. User initiated the call (caller), OR
// 2. User answered an incoming call (receiver)

useEffect(() => {
  const { isOutgoing } = route.params;

  if (!isOutgoing) {
    // This is receiver - check if they answered
    const activeCall = CallStateManager.getActiveCall();
    if (!activeCall || activeCall.callState !== 'answered') {
      console.log('❌ Receiver tried to enter call screen without answering');
      router.replace('/(tabs)/contacts');
      return;
    }
  }
}, []);
```

### Phase 3: Fix Call Flow States

**Add explicit states:**
```typescript
type CallState =
  | 'idle'
  | 'ringing'      // Receiver: call coming in, CallKit showing
  | 'connecting'   // Both: answered, connecting to Agora
  | 'connected'    // Both: video/audio active
  | 'ending'       // Either: ending call
  | 'ended';       // Call finished
```

### Phase 4: Backend Enhancement

**Add 'acceptCall' handler** (missing in current backend):
```javascript
socket.on("acceptCall", ({ from, to, channel }) => {
  // Notify caller that receiver answered
  const callerSocketId = userSockets.get(from);
  if (callerSocketId) {
    io.to(callerSocketId).emit("callAccepted", {
      from: to,
      channel,
      timestamp: Date.now()
    });
  }
});
```

### Phase 5: Frontend Call Flow Rewrite

**Caller Flow:**
```typescript
startVideoCall(calleePhone) {
  const channel = generateChannel();

  // 1. Set state FIRST
  setCallState('connecting');
  setIsOutgoing(true);

  // 2. Emit to backend
  socket.emit('callRequest', { from, to, channel });

  // 3. Navigate to call screen with flag
  router.push({
    pathname: '/videocall',
    params: {
      channel,
      isOutgoing: true,  // ← KEY: marks as caller
      targetPhone
    }
  });
}
```

**Receiver Flow:**
```typescript
// When CallKit "Answer" is tapped:
handleCallAnswered(callData) {
  // 1. Update state
  setCallState('connecting');

  // 2. Emit acceptance to backend
  socket.emit('acceptCall', {
    from: callData.callerPhone,
    to: userPhone,
    channel: callData.channel
  });

  // 3. THEN navigate
  router.push({
    pathname: '/videocall',
    params: {
      channel: callData.channel,
      isOutgoing: false,  // ← KEY: marks as receiver
      targetPhone: callData.callerPhone
    }
  });
}
```

## Implementation Checklist

- [ ] Move videocall to modal route
- [ ] Add isOutgoing parameter to all call navigations
- [ ] Add navigation guard in videocall screen
- [ ] Implement proper call states
- [ ] Add 'acceptCall' socket handler in backend
- [ ] Update frontend to emit 'acceptCall'
- [ ] Remove all auto-mounting code
- [ ] Add proper cleanup on unmount
- [ ] Test caller → receiver flow
- [ ] Test receiver → caller flow
- [ ] Test background calls (VoIP)
- [ ] Test foreground calls (socket)

## Expected Result

After fixes:
1. Caller navigates immediately ✅
2. Receiver sees ONLY CallKit ✅
3. Receiver answers → THEN navigates ✅
4. No duplicate mounting ✅
5. No crashes ✅
6. Clean state management ✅
