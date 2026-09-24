/**
 * Root layout. Which area is reachable depends on the auth state:
 * signed out -> (auth), new user -> profile-setup, signed in -> tabs + call.
 */
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ContactsProvider } from '../contexts/ContactsContext';
import { NewCallProvider } from '../contexts/NewCallContext';
import { NotificationRouter } from '../components/NotificationRouter';
import { fetchPreviewState } from '../dev/previewControl';
import { setupNotifications } from '../services/notifications';
import { colors } from '../ui/theme';

setupNotifications();

function InnerLayout() {
  const { userPhone, isLoading, needsProfileSetup } = useAuth();
  const signedIn = !!userPhone;
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Development: the simulator shows the component gallery instead of the app
  // when the local preview control server says so (see dev/previewControl.ts)
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!__DEV__) return;
    fetchPreviewState().then((state) => setShowPreview(!!state?.open));
  }, []);
  const ready = !isLoading && fontsLoaded;

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </View>
    );
  }

  if (__DEV__ && showPreview) {
    const { DevPreview } = require('../dev/DevPreview');
    return <DevPreview />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={signedIn && !needsProfileSetup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="friend" />
        <Stack.Screen name="notifications" />
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
      {signedIn && <NotificationRouter />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ContactsProvider>
          <NewCallProvider>
            <StatusBar style="light" />
            <InnerLayout />
          </NewCallProvider>
        </ContactsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
