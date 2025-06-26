import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';
const socket = io(baseUrl, { transports: ['websocket'], secure: true });

interface CallContextType {
    incomingCall: boolean;
    callerPhoneNumber: string | null;
    incomingChannel: string | null;
    acceptCall: () => void;
    declineCall: () => void;
    startVideoCall: (calleePhone: string, callerPhone: string) => void;
    updateContactStatus: (phone: string, isAvailable: boolean) => void;
    onStatusUpdate: (callback: (phone: string, isAvailable: boolean) => void) => () => void;
    emitCallEnded: (from: string, to: string, channel: string) => void;
    onCallEnded: (callback: (data: { from: string; channel: string }) => void) => () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { userPhone, isLoading } = useAuth();
    const router = useRouter();
    const [incomingCall, setIncomingCall] = useState(false);
    const [callerPhoneNumber, setCallerPhoneNumber] = useState<string | null>(null);
    const [incomingChannel, setIncomingChannel] = useState<string | null>(null);
    const [recentlyEndedChannels, setRecentlyEndedChannels] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isLoading && userPhone) {
            socket.emit('register', userPhone);
        }

        socket.on('connect', () => {
            // WebSocket connected
        });

        socket.on('incomingCall', ({ from, channel, action }) => {
            if (action === 'end') {
                return;
            }
            
            // Ignore incoming calls for recently ended channels
            if (recentlyEndedChannels.has(channel)) {
                return;
            }
            
            // Handle normal incoming call
            if (!from || !channel) {
                return;
            }
            setCallerPhoneNumber(from);
            setIncomingChannel(channel);
            setIncomingCall(true);
        });

        // Socket event listeners configured

        return () => {
            socket.off('incomingCall');
        };
    }, [userPhone, isLoading]);

    // Remove this useEffect - no longer needed

    const acceptCall = (navigation?: any) => {
        if (!callerPhoneNumber || !userPhone || !incomingChannel) {
            return;
        }

        // Navigate to video call
        router.push({
            pathname: '/(tabs)/videocall',
            params: {
                channel: incomingChannel,
                userPhone,
                targetPhone: callerPhoneNumber,
            },
        });

        setIncomingCall(false);
        setCallerPhoneNumber(null);
        setIncomingChannel(null);
    };

    const declineCall = () => {
        setIncomingCall(false);
        setCallerPhoneNumber(null);
        setIncomingChannel(null);
    };

    const startVideoCall = (calleePhone: string, callerPhone: string) => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const raw = `${callerPhone}_${calleePhone}_${timestamp}_${randomId}`;
        const shortHash = Math.abs(raw.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)).toString(36).slice(0, 12);
        const channel = `call_${shortHash}`;

        // Send call request to callee
        socket.emit('callRequest', {
            from: callerPhone,
            to: calleePhone,
            channel: channel,
        });

        // Navigate to video call screen
        router.push({
            pathname: '/(tabs)/videocall',
            params: {
                channel,
                userPhone: callerPhone,
                targetPhone: calleePhone,
            },
        });
    };

    const updateContactStatus = (phone: string, isAvailable: boolean) => {
        // Status update functionality can be implemented here
    };

    const onStatusUpdate = (callback: (phone: string, isAvailable: boolean) => void) => {
        const handleStatusUpdate = (payload: { phone: string; isAvailable: boolean }) => {
            callback(payload.phone, payload.isAvailable);
        };

        socket.on('statusUpdate', handleStatusUpdate);

        // Return cleanup function
        return () => {
            socket.off('statusUpdate', handleStatusUpdate);
        };
    };

    const emitCallEnded = (from: string, to: string, channel: string) => {
        socket.emit('callEnded', { from, to, channel });
    };

    const onCallEnded = (callback: (data: { from: string; channel: string }) => void) => {
        let hasHandled = false; // Prevent duplicate event handling
        
        const handleCallEnded = (data: { from: string; channel: string }) => {
            if (hasHandled) {
                return;
            }
            
            hasHandled = true;
            
            // Add channel to recently ended list to prevent spurious incoming calls
            setRecentlyEndedChannels(prev => new Set(prev).add(data.channel));
            
            callback(data);
            
            // Reset flag after a delay to allow for new calls
            setTimeout(() => {
                hasHandled = false;
                // Remove channel from recently ended list after 10 seconds
                setRecentlyEndedChannels(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.channel);
                    return newSet;
                });
            }, 10000);
        };

        socket.on('callEnded', handleCallEnded);

        // Return cleanup function
        return () => {
            socket.off('callEnded', handleCallEnded);
        };
    };

    return (
        <CallContext.Provider value={{ 
            incomingCall, 
            callerPhoneNumber, 
            incomingChannel, 
            acceptCall, 
            declineCall, 
            startVideoCall,
            updateContactStatus,
            onStatusUpdate,
            emitCallEnded,
            onCallEnded
        }}>
            {children}
        </CallContext.Provider>
    );
}

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};