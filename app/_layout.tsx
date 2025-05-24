import { useAuth, AuthProvider } from '../contexts/AuthContext';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

function InnerLayout() {
    const { userPhone, setUserPhone } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        SecureStore.getItemAsync('userPhone')
            .then(setUserPhone)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {userPhone ? (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            ) : (
                <Stack.Screen name="(auth)" />
            )}
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <InnerLayout />
        </AuthProvider>
    );
}