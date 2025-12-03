# VoIP Push Notification Setup Guide

## What Changed
I've implemented VoIP Push Notification support to enable CallKit when the app is in the background or terminated. Regular push notifications don't wake up the app enough for CallKit to work properly.

## What You Need to Do

### 1. **Rebuild the iOS App** (CRITICAL)
VoIP push requires native code, so you MUST rebuild:

```bash
# For development build
eas build --profile development --platform ios

# OR for production
eas build --profile production --platform ios
```

**You cannot test VoIP push with Expo Go!** You must use a development build or production build.

### 2. **Update Backend to Send VoIP Push**

Your backend needs to send **VoIP push notifications** instead of regular push notifications for incoming calls.

#### Changes Needed in Backend:

**A. Store VoIP Token**
When a user registers/updates their push token, store the VoIP token separately:

```javascript
// Example backend code
app.post('/user/voip-token', async (req, res) => {
  const { userPhone, voipToken } = req.body;

  // Store voipToken in database
  await db.users.update({
    phone: userPhone,
    voipToken: voipToken
  });

  res.json({ success: true });
});
```

**B. Send VoIP Push for Incoming Calls**
When someone initiates a call, send a VoIP push (NOT regular push):

```javascript
const apn = require('apn');

// Setup APN provider with VoIP certificate
const voipProvider = new apn.Provider({
  token: {
    key: fs.readFileSync('path/to/AuthKey_XXXXXXX.p8'),
    keyId: 'YOUR_KEY_ID',
    teamId: 'YOUR_TEAM_ID'
  },
  production: false // Set to true for production
});

// Send VoIP push
function sendVoipPush(voipToken, callData) {
  const notification = new apn.Notification();
  notification.topic = 'com.schly21.kontaktlisteapp.voip'; // Your app's bundle ID + .voip
  notification.payload = {
    callerPhone: callData.callerPhone,
    calleePhone: callData.calleePhone,
    channel: callData.channel,
    callerName: callData.callerName,
    hasVideo: true
  };
  notification.pushType = 'voip';

  voipProvider.send(notification, voipToken);
}
```

**C. Prioritize VoIP Push Over Regular Push**
```javascript
// When initiating a call
if (user.voipToken) {
  // Send VoIP push for CallKit
  await sendVoipPush(user.voipToken, callData);
} else {
  // Fallback to regular push notification
  await sendRegularPush(user.pushToken, callData);
}
```

### 3. **Get VoIP Push Certificate from Apple**

1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a new **VoIP Services Certificate**
4. Download and configure it in your backend

### 4. **Test the Implementation**

After rebuilding and updating backend:

1. Install the new build on device
2. Open app and log in (VoIP token will be registered)
3. Put app in background or close it completely
4. Have someone call you
5. **You should see native iOS CallKit screen immediately!**

## Current Status

✅ **App Code Ready** - VoipPushService implemented
✅ **CallKit Integration** - Full CallKit support
✅ **Token Registration** - VoIP token will be obtained on app start
⏳ **Backend Update Needed** - You need to update backend to send VoIP push
⏳ **App Rebuild Needed** - Must rebuild with native code

## Debugging

Check the logs when app starts:
```
📱 Initializing VoIP push notifications...
📱 VoIP push token received: <token>
✅ VoIP push initialized with token
```

If you see these logs, the app is ready! Just need backend updates.

## Alternative: Keep Using Regular Push (Temporary)

If you can't implement VoIP push right now, CallKit will still work when:
- App is in **foreground**
- User **taps the notification** when app is backgrounded

But it won't show the native call screen automatically when backgrounded/terminated without VoIP push.
