// Example backend code for handling push notifications
// This should be added to your Node.js/Express backend at https://cmm-backend-gdqx.onrender.com

const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

// In-memory storage for push tokens (in production, use a database)
// Structure: { userPhone: { token, deviceId, platform, updatedAt } }
const pushTokens = new Map();

// Endpoint to register/update push tokens
app.post('/user/push-token', async (req, res) => {
    try {
        const { userPhone, token, deviceId, platform } = req.body;

        if (!userPhone || !token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userPhone, token'
            });
        }

        // Validate the push token
        if (!Expo.isExpoPushToken(token)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Expo push token'
            });
        }

        // Store the push token
        pushTokens.set(userPhone, {
            token,
            deviceId,
            platform,
            updatedAt: new Date()
        });

        console.log(`Push token registered for user ${userPhone}: ${token}`);

        res.json({
            success: true,
            message: 'Push token registered successfully'
        });
    } catch (error) {
        console.error('Error registering push token:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Function to send push notification for incoming calls
async function sendCallNotification(callerPhone, calleePhone, channel, callerName = null) {
    try {
        const calleeTokenData = pushTokens.get(calleePhone);
        
        if (!calleeTokenData) {
            console.log(`No push token found for user ${calleePhone}`);
            return false;
        }

        const { token } = calleeTokenData;

        // Create the push notification message
        const message = {
            to: token,
            sound: 'default',
            title: callerName ? `${callerName} ruft dich an` : 'Eingehender Anruf',
            body: callerName ? `${callerName} möchte mit dir sprechen` : `${callerPhone} ruft dich an`,
            data: {
                type: 'incoming_call',
                callerPhone: callerPhone,
                channel: channel,
                callerName: callerName
            },
            categoryId: 'incoming_call',
            priority: 'high',
            ttl: 30, // 30 seconds TTL for call notifications
        };

        // Send the push notification
        const ticket = await expo.sendPushNotificationsAsync([message]);
        console.log('Push notification sent:', ticket);

        return true;
    } catch (error) {
        console.error('Error sending call notification:', error);
        return false;
    }
}

// Update your existing socket.io callRequest handler
io.on('connection', (socket) => {
    // ... existing socket handlers ...

    socket.on('callRequest', async (data) => {
        const { from, to, channel } = data;
        
        try {
            // Get caller's name for the notification
            let callerName = null;
            try {
                // Fetch caller's profile (adjust this based on your user model)
                const callerUser = await User.findOne({ phone: from });
                if (callerUser && callerUser.name) {
                    callerName = callerUser.name;
                }
            } catch (err) {
                console.log('Could not fetch caller name:', err);
            }

            // Send push notification to the callee
            await sendCallNotification(from, to, channel, callerName);

            // Emit the call request via socket (for users currently in the app)
            socket.to(to).emit('incomingCall', {
                from,
                channel,
                callerName
            });

            console.log(`Call request sent from ${from} to ${to} on channel ${channel}`);
        } catch (error) {
            console.error('Error handling call request:', error);
        }
    });

    // Handle call ended to clean up notifications
    socket.on('callEnded', async (data) => {
        const { from, to, channel } = data;
        
        // Emit call ended to both participants
        socket.to(to).emit('callEnded', { from, channel });
        socket.to(from).emit('callEnded', { from: to, channel });
        
        // Note: Push notifications will be dismissed by the client app
        console.log(`Call ended between ${from} and ${to} on channel ${channel}`);
    });
});

// Endpoint to get push token for debugging
app.get('/user/push-token/:phone', (req, res) => {
    const { phone } = req.params;
    const tokenData = pushTokens.get(phone);
    
    if (tokenData) {
        res.json({
            success: true,
            tokenData: {
                ...tokenData,
                token: tokenData.token.substring(0, 20) + '...' // Partially hide token
            }
        });
    } else {
        res.json({
            success: false,
            message: 'No push token found for this user'
        });
    }
});

// Clean up old push tokens (run periodically)
setInterval(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    for (const [userPhone, tokenData] of pushTokens.entries()) {
        if (tokenData.updatedAt < thirtyDaysAgo) {
            pushTokens.delete(userPhone);
            console.log(`Removed old push token for user ${userPhone}`);
        }
    }
}, 24 * 60 * 60 * 1000); // Run daily

module.exports = {
    sendCallNotification,
    pushTokens
};