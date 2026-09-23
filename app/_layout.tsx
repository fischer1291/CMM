/**
 * Root layout. Which area is reachable depends on the auth state:
 * signed out -> (auth), new user -> profile-setup, signed in -> tabs + call.
 */
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NewCallProvider } from '../contexts/NewCallContext';

function InnerLayout() {
  const { userPhone, isLoading, needsProfileSetup } = useAuth();
  const signedIn = !!userPhone;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && !needsProfileSetup}>
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
      </Stack.Protected>
      <Stack.Protected guard={signedIn && needsProfileSetup}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
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
