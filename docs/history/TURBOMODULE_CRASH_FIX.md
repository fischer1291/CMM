# TurboModule Bridge Crash Fix - Complete Solution

## Problem Analysis

**Native Crash Report:**
```
Thread 7 - com.meta.react.turbomodulemanager.queue
React → ObjCTurboModule::performVoidMethodInvocation
→ objc_exception_rethrow
→ abort
```

**Timing:**
- Crash occurred when user pressed "Answer" in CallKit UI
- Happened BEFORE JS answer callback could execute
- Crash was in the TurboModule bridge when native tried to invoke JS callback

**Root Causes Identified:**

1. **Race Condition in Initialization Order**
   - `PlatformCallAdapter.initialize()` was called first (setting up native event listeners)
   - `setupCallKitCallbacks()` was called second (registering JS callbacks)
   - If an incoming call arrived between these two steps and user answered immediately, the event listener fired but callback was undefined

2. **Unsafe Event Payload Destructuring**
   - Event listeners used direct destructuring: `({ callUUID }) =>`
   - If event payload structure was unexpected, destructuring would fail
   - Failure in event handler could crash TurboModule bridge

3. **Missing JS Runtime Readiness Check**
   - Event listeners were registered immediately after CallKeep setup
   - No delay to ensure JS runtime was fully ready
   - Native could try to invoke JS callbacks before runtime was ready

4. **Insufficient Callback Validation**
   - Callbacks checked for existence but not for being actual functions
   - No validation when callbacks were being set
   - No detailed logging when callbacks failed

## Solutions Applied

### 1. Fixed Initialization Order (NewCallContext.tsx)

**Before:**
```typescript
await PlatformCallAdapter.initialize(); // Native listeners registered
setupCallKitCallbacks();                // JS callbacks registered - RACE CONDITION!
```

**After:**
```typescript
setupCallKitCallbacks();                // JS callbacks registered FIRST
await PlatformCallAdapter.initialize(); // Native listeners registered AFTER
```

**File:** `contexts/NewCallContext.tsx`
**Lines:** 61-95

**Why this fixes the crash:**
- Callbacks are now guaranteed to be registered before any events can fire
- No window where undefined callbacks can be invoked
- Event listeners can safely call callbacks immediately upon receiving events

---

### 2. Added JS Runtime Delay (PlatformCallAdapter.ts)

**Change:**
```typescript
await RNCallKeep.setup(this.callKeepOptions);

// CRITICAL: Delay event listener setup to ensure JS runtime is fully ready
await new Promise(resolve => setTimeout(resolve, 100));

this.setupCallKeepEventListeners();
```

**File:** `services/PlatformCallAdapter.ts`
**Lines:** 144-150

**Why this fixes the crash:**
- Ensures JS runtime is fully initialized before native can invoke callbacks
- Prevents TurboModule bridge crashes from premature callback invocations
- 100ms delay is minimal but sufficient for runtime initialization

---

### 3. Defensive Event Payload Validation (PlatformCallAdapter.ts)

**Before:**
```typescript
RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
  if (this.onAnswerCallCallback) {
    this.onAnswerCallCallback(callUUID);
  }
});
```

**After:**
```typescript
RNCallKeep.addEventListener('answerCall', (data: any) => {
  try {
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

    // Validate callback exists AND is a function
    if (typeof this.onAnswerCallCallback === 'function') {
      try {
        this.onAnswerCallCallback(callUUID);
      } catch (callbackError) {
        console.error('❌ Error invoking callback:', callbackError);
      }
    }
  } catch (error) {
    console.error('❌ Critical error in event handler:', error);
  }
});
```

**File:** `services/PlatformCallAdapter.ts`
**Lines:** 178-330

**Why this fixes the crash:**
- No destructuring - validates payload before accessing properties
- Graceful handling of malformed events
- Double try-catch prevents exceptions from propagating to native
- Detailed logging for debugging

---

### 4. Callback Function Validation (PlatformCallAdapter.ts)

**Before:**
```typescript
setOnAnswerCallCallback(callback: (callId: string) => void): void {
  this.onAnswerCallCallback = callback;
}
```

**After:**
```typescript
setOnAnswerCallCallback(callback: (callId: string) => void): void {
  if (typeof callback !== 'function') {
    console.error('❌ callback is not a function:', typeof callback);
    return;
  }
  console.log('✅ setOnAnswerCallCallback: Callback registered');
  this.onAnswerCallCallback = callback;
}
```

**File:** `services/PlatformCallAdapter.ts`
**Lines:** 332-369

**Why this fixes the crash:**
- Validates callbacks are functions before registering
- Prevents setting invalid callbacks that would crash when invoked
- Clear logging when callbacks are successfully registered

---

## Testing Checklist

After rebuilding the iOS app, test these scenarios:

### 1. Incoming Call (Receiver) - Primary Test Case
- [ ] **App in foreground:**
  - Caller initiates call
  - Receiver sees CallKit UI immediately
  - Press "Answer" → Should NOT crash
  - Should navigate to VideoCallScreen
  - Video connection should establish

- [ ] **App in background:**
  - Caller initiates call
  - Receiver gets CallKit notification
  - Press "Answer" → Should NOT crash
  - App should come to foreground
  - Should navigate to VideoCallScreen

- [ ] **App terminated:**
  - Caller initiates call
  - Receiver device wakes up with CallKit UI
  - Press "Answer" → Should NOT crash
  - App should launch
  - Should navigate to VideoCallScreen

### 2. Call Flow Testing
- [ ] Answer call → Both parties see each other on video
- [ ] Audio works bidirectionally
- [ ] End call from receiver → Clean cleanup
- [ ] End call from caller → Receiver sees call ended

### 3. Edge Cases
- [ ] Decline incoming call → Should not crash
- [ ] Incoming call while on another call → Should handle gracefully
- [ ] Network interruption during call → Should handle gracefully
- [ ] Background → Foreground transitions → No crashes

---

## What Changed - Technical Summary

### Files Modified:

1. **contexts/NewCallContext.tsx**
   - Reordered initialization: callbacks first, then platform init
   - Prevents race condition in callback registration

2. **services/PlatformCallAdapter.ts**
   - Added 100ms delay before event listener setup
   - Rewrote all event listeners with defensive validation
   - Added callback type validation in setters
   - Removed unsafe payload destructuring
   - Added extensive error logging

---

## Why This Should Fix the Crash

**Before:**
```
1. PlatformCallAdapter.initialize()
   → Native event listeners registered
2. [WINDOW OF VULNERABILITY]
   → Incoming call arrives
   → User presses Answer
   → Native tries to invoke undefined JS callback
   → TurboModule bridge crash 💥
3. setupCallKitCallbacks()
   → Callbacks finally registered (too late)
```

**After:**
```
1. setupCallKitCallbacks()
   → JS callbacks registered
2. [100ms delay]
   → JS runtime fully ready
3. PlatformCallAdapter.initialize()
   → Native event listeners registered
   → Event listeners have valid callbacks to invoke
4. Incoming call arrives
   → User presses Answer
   → Native invokes validated JS callback
   → Callback executes successfully ✅
```

---

## Rebuild Instructions

The changes are in JavaScript/TypeScript only, so a full native rebuild is **not required**.

**Option 1: Development Build**
```bash
npx expo start --clear
```

**Option 2: If You Need Full Rebuild**
```bash
rm -rf ios/build
npx expo run:ios
```

**Option 3: EAS Build**
```bash
eas build --profile development --platform ios
```

---

## Logging to Watch For

When testing, you should see this sequence in the logs:

### On App Launch:
```
🚀 NewCallContext: Initializing services...
🔧 Setting up CallKit callbacks BEFORE platform initialization...
✅ setOnAnswerCallCallback: Callback registered
✅ setOnEndCallCallback: Callback registered
✅ setOnRejectCallCallback: Callback registered
🚀 Initializing platform services with callbacks already registered...
📱 PlatformCallAdapter: Initializing...
📱 Initializing iOS CallKit...
⏳ Waiting for JS runtime to be ready before registering event listeners...
🔧 Setting up CallKeep event listeners with defensive error handling...
✅ CallKeep event listeners registered successfully
✅ iOS CallKit initialized successfully
✅ NewCallContext: Services initialized successfully
```

### On Incoming Call Answer:
```
📱 CallKeep: Answer call event received { callUUID: '...' }
✅ Validated callUUID: ...
🎯 Invoking onAnswerCallCallback
📱 CallKit answer callback triggered: ...
📞 handleCallAnswered: Call was answered, navigating to videocall
✅ onAnswerCallCallback completed
🚀 handleCallAnswered: Navigating to /videocall
✅ handleCallAnswered: Navigation called
```

**If you see this sequence without crashes, the fix is successful!**

---

## Summary

- ✅ Fixed race condition by reordering initialization
- ✅ Added JS runtime readiness delay
- ✅ Implemented defensive event payload validation
- ✅ Added callback function type validation
- ✅ Enhanced error logging throughout
- ✅ Removed unsafe destructuring patterns
- ✅ All changes in JS/TS - no native rebuild required

**Next Step:** Test incoming call answer on receiver device to verify no crash occurs.
