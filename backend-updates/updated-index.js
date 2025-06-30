/**
 * Updated Backend - Optimized notification system
 * Replace the notification part in your backend index.js with this
 */

// Add this to your existing index.js file - ENHANCED NOTIFICATION SYSTEM

// Import expo-server-sdk properly
const { Expo } = require('expo-server-sdk');
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional but recommended
  useFcmV1: true // Use the newer FCM v1 API
});

/**
 * Enhanced push notification sending with proper error handling
 */
async function sendEnhancedCallNotification(callerPhone, calleePhone, channel, callerName) {
  try {
    console.log(`📞 Sending enhanced call notification: ${callerPhone} -> ${calleePhone}`);
    
    // Get callee's push token
    const calleeUser = await User.findOne({ phone: calleePhone });
    if (!calleeUser || !calleeUser.pushToken) {
      console.log(`❌ No push token found for user: ${calleePhone}`);
      return false;
    }

    const pushToken = calleeUser.pushToken;

    // Validate push token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log(`❌ Invalid push token for user: ${calleePhone}`);
      return false;
    }

    // Create enhanced notification message
    const message = {
      to: pushToken,
      sound: 'default',
      title: `📞 ${callerName || callerPhone}`,
      body: 'Videoanruf', // Simplified, consistent with frontend
      data: {
        type: 'incoming_call',
        callerPhone: callerPhone,
        calleePhone: calleePhone,
        channel: channel,
        callerName: callerName || callerPhone,
        hasVideo: true,
        timestamp: Date.now()
      },
      categoryId: 'incoming_call',
      priority: 'high',
      ttl: 30,
      badge: 1,
      // Enhanced properties for better call experience
      android: {
        channelId: 'incoming-calls',
        priority: 'max',
        vibrate: [0, 250, 250, 250],
        color: '#FF0000',
        sticky: true,
        autoDismiss: false
      },
      ios: {
        interruptionLevel: 'active',
        relevanceScore: 1.0
      }
    };

    // Send notification using expo-server-sdk
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending notification chunk:', error);
        return false;
      }
    }

    // Check for errors in tickets
    for (let ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('❌ Notification ticket error:', ticket.message);
        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          // Remove invalid push token
          await User.findOneAndUpdate(
            { phone: calleePhone },
            { $unset: { pushToken: 1 } }
          );
          console.log(`🧹 Removed invalid push token for user: ${calleePhone}`);
        }
        return false;
      }
    }

    console.log(`✅ Enhanced call notification sent successfully to: ${calleePhone}`);
    return true;

  } catch (error) {
    console.error('❌ Error in sendEnhancedCallNotification:', error);
    return false;
  }
}

/**
 * Updated call request handler - replace your existing one
 */
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userPhone) => {
    userSockets.set(userPhone, socket.id);
    console.log(`📱 User registered: ${userPhone} -> ${socket.id}`);
  });

  socket.on('callRequest', async (data) => {
    const { from, to, channel } = data;
    console.log(`📞 Call request: ${from} -> ${to} (${channel})`);

    try {
      // Get caller's name for better UX
      const callerUser = await User.findOne({ phone: from });
      const callerName = callerUser?.name || from;

      // Try socket notification first (for online users)
      const targetSocketId = userSockets.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incomingCall', {
          from,
          channel,
          callerName,
          timestamp: Date.now()
        });
        console.log(`🔔 Socket notification sent to: ${to}`);
      }

      // Always send push notification (for offline users and notification actions)
      const pushSent = await sendEnhancedCallNotification(from, to, channel, callerName);
      
      if (!pushSent && !targetSocketId) {
        console.log(`❌ Failed to notify user: ${to} (no socket connection and push failed)`);
        // Optionally emit back to caller that user is unreachable
        socket.emit('callFailed', { 
          reason: 'User unreachable',
          target: to 
        });
      }

    } catch (error) {
      console.error('❌ Error handling call request:', error);
      socket.emit('callFailed', { 
        reason: 'Server error',
        target: to 
      });
    }
  });

  socket.on('callEnded', (data) => {
    const { from, to, channel } = data;
    console.log(`📞 Call ended: ${from} -> ${to} (${channel})`);

    // Notify the other party
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('callEnded', { from, channel });
    }

    // Send push notification to end call on remote device
    sendCallEndNotification(from, to, channel);
  });

  socket.on('disconnect', () => {
    // Remove user from socket map
    for (let [phone, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(phone);
        console.log(`📱 User disconnected: ${phone}`);
        break;
      }
    }
  });
});

/**
 * Send call end notification
 */
async function sendCallEndNotification(from, to, channel) {
  try {
    const calleeUser = await User.findOne({ phone: to });
    if (!calleeUser || !calleeUser.pushToken) return;

    const message = {
      to: calleeUser.pushToken,
      data: {
        type: 'call_ended',
        channel: channel,
        from: from
      },
      priority: 'high'
    };

    await expo.sendPushNotificationsAsync([message]);
    console.log(`📞 Call end notification sent to: ${to}`);
  } catch (error) {
    console.error('❌ Error sending call end notification:', error);
  }
}

/**
 * Health check endpoint for push notifications
 */
app.get('/api/push-health', async (req, res) => {
  try {
    const activeTokens = await User.countDocuments({ pushToken: { $exists: true } });
    res.json({
      success: true,
      activeTokens,
      sdkVersion: Expo.version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enhanced push token registration - update your existing endpoint
 */
app.post("/user/push-token", async (req, res) => {
  try {
    const { userPhone, token, deviceId, platform } = req.body;

    if (!userPhone || !token) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userPhone, token",
      });
    }

    // Validate the push token with enhanced checking
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expo push token format",
      });
    }

    // Update user's push token in database with additional metadata
    const user = await User.findOneAndUpdate(
      { phone: userPhone },
      {
        pushToken: token,
        pushTokenMetadata: {
          deviceId,
          platform,
          registeredAt: new Date(),
          lastValidated: new Date()
        },
        lastOnline: new Date(),
      },
      { new: true, upsert: true },
    );

    console.log(`✅ Enhanced push token registered for ${userPhone}: ${token.substring(0, 20)}...`);

    res.json({
      success: true,
      message: "Push token registered successfully",
      metadata: {
        platform,
        deviceId,
        registeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error registering push token:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Export functions if using modules
module.exports = {
  sendEnhancedCallNotification,
  sendCallEndNotification
};