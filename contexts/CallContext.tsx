import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';
const socket = io(baseUrl, { transports: ['websocket'], secure: true });

const CallContext = createContext<any>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { userPhone, isLoading } = useAuth();
    const router = useRouter();
    const [incomingCall, setIncomingCall] = useState(false);
    const [callerPhoneNumber, setCallerPhoneNumber] = useState<string | null>(null);
    const [incomingChannel, setIncomingChannel] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && userPhone) {
            socket.emit('register', userPhone);
            console.log(`📱 User registriert: ${userPhone}`);
        }

        socket.on('connect', () => {
            console.log('✅ WebSocket verbunden (CallContext)');
        });

        socket.on('incomingCall', ({ from, channel }) => {
            console.log('📞 IncomingCall empfangen:', from, channel);
            setCallerPhoneNumber(from);
            setIncomingChannel(channel);
            setIncomingCall(true);
        });

        return () => {
            socket.off('incomingCall');
        };
    }, [userPhone, isLoading]);

    useEffect(() => {
        console.log('📍 incomingCall geändert:', incomingCall);
    }, [incomingCall]);

    const acceptCall = () => {
        if (!callerPhoneNumber || !userPhone || !incomingChannel) return;

        console.log('📍 Navigiere zu videocall', { channel: incomingChannel });

        router.push({
            pathname: '/videocall',
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

    return (
        <CallContext.Provider value={{ incomingCall, callerPhoneNumber, incomingChannel, acceptCall, declineCall }}>
            {children}
        </CallContext.Provider>
    );
}

export const useCall = () => useContext(CallContext);