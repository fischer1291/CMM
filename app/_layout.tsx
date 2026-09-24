/**
 * app/_layout.tsx - Modern calling system with native CallKit (iOS) / custom UI (Android)
 * WhatsApp-style implementation: Pure native on iOS, custom overlay on Android
 */
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NewCallProvider } from '../contexts/NewCallContext';

function InnerLayout() {
  const { userPhone, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {userPhone ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="videocall"
            options={{
              presentation: 'fullScreenModal',
              animation: 'none',
              // Prevent unmounting when parent re-renders
              freezeOnBlur: true,
            }}
          />
        </>
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NewCallProvider>
          <InnerLayout />
        </NewCallProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}