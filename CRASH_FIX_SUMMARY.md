# Receiver Crash Fix - Complete Solution

## Problem Identified

**Native Crash Report Analysis:**
```
Exception: NSInvalidArgumentException
Message: -[(dynamic class) pushRegistry:didUpdatePushCredentials:forType:]:
         unrecognized selector sent to instance
Location: PushKit framework → voipRegistrationSucceededWithDeviceToken
```

**Root Cause:**
The app had **two conflicting VoIP push implementations**:
1. ✅ **CallKeep** - Built-in VoIP push support (correct)
2. ❌ **react-native-voip-push-notification** - Separate library (conflicting)

The `react-native-voip-push-notification` library was setting up an incomplete PushKit delegate that didn't implement all required methods. When iOS tried to deliver VoIP credentials by calling `pushRegistry:didUpdatePushCredentials:forType:`, the incomplete delegate crashed the app.

## Solution Applied

### 1. Removed Conflicting Package
```bash
npm uninstall react-native-voip-push-notification
```

### 2. Deleted Related Files
- `services/VoipPushService.ts` - Unused service
- `VOIP_PUSH_SETUP.md` - Outdated documentation

### 3. Updated iOS Dependencies
```bash
cd ios && pod install
```
Result: `RNVoipPushNotification` pod successfully removed

### 4. Previous Fixes (Still Applied)
- ✅ Fixed VideoCallScreen remounting loop (useMemo + empty useEffect deps)
- ✅ Simplified Stack layout structure
- ✅ Added freezeOnBlur to prevent unmounting

## What to Do Next

### CRITICAL: Rebuild the iOS App

The native module has been removed, so you **MUST** rebuild:

```bash
# Clean previous build
rm -rf ios/build

# Rebuild with Expo
eas build --profile development --platform ios

# OR if using local build
npx expo run:ios
```

### Testing Checklist

After rebuilding, test the following scenarios:

1. **Incoming Call (Receiver)**:
   - App in foreground → Should show CallKit UI ✓
   - App in background → Should show CallKit UI ✓
   - App terminated → Should wake up and show CallKit UI ✓
   - Answer call → Should navigate to VideoCallScreen without crash ✓

2. **Outgoing Call (Caller)**:
   - Start call → VideoCallScreen should mount once ✓
   - Receiver gets notification → Caller should stay stable ✓

3. **Call Flow**:
   - Answer → Both parties connect to Agora ✓
   - Video/Audio → Should work bidirectionally ✓
   - End call → Clean cleanup without errors ✓

## Why This Fixes the Crash

**Before:**
```
App Launch
  → VoipPushService initializes
  → react-native-voip-push-notification sets up PushKit delegate
  → iOS calls pushRegistry:didUpdatePushCredentials:forType:
  → Delegate doesn't implement method
  → CRASH 💥
```

**After:**
```
App Launch
  → Only CallKeep handles VoIP push
  → CallKeep's native code properly implements ALL PushKit delegate methods
  → iOS calls pushRegistry:didUpdatePushCredentials:forType:
  → CallKeep handles it correctly
  → No crash ✅
```

## Technical Details

### Why CallKeep is Sufficient

CallKeep already handles:
- ✅ VoIP push registration
- ✅ PushKit delegate methods (ALL of them)
- ✅ CallKit UI integration
- ✅ Background wake-up
- ✅ Call state management

### Why react-native-voip-push-notification Was Problematic

The library:
- ❌ Set up incomplete PushKit delegate
- ❌ Missing `pushRegistry:didUpdatePushCredentials:forType:` implementation
- ❌ Conflicted with CallKeep's delegate
- ❌ Caused "unrecognized selector" crash

## Summary

- **Issue**: Receiver app crashed on incoming call
- **Cause**: Conflicting VoIP push library with incomplete delegate
- **Fix**: Removed react-native-voip-push-notification, using only CallKeep
- **Status**: Ready to rebuild and test

## Next Steps

1. Rebuild iOS app (REQUIRED)
2. Test incoming calls on receiver device
3. Verify no crash when answering
4. Confirm VideoCallScreen mounts only once
5. Test complete call flow

---

✅ **Crash should be completely resolved after rebuild!**
