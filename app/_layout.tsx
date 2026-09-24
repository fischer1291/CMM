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
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ContactsProvider } from '../contexts/ContactsContext';
import { NewCallProvider } from '../contexts/NewCallContext';
import { InAppBanner } from '../components/InAppBanner';
import { LaunchScreen } from '../components/LaunchScreen';
import { NotificationRouter } from '../components/NotificationRouter';
import { fetchPreviewState } from '../dev/previewControl';
import { setupNotifications } from '../services/notifications';
import { colors } from '../ui/theme';

setupNotifications();
// The native splash stays until the animated launch screen takes over
SplashScreen.preventAutoHideAsync().catch(() => {});

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

  // Animated launch screen on top until the app is ready (then it zooms away).
  // The key keeps it the same instance while the content around it changes.
  const [launchDone, setLaunchDone] = useState(false);
  const launch = launchDone ? null : (
    <LaunchScreen key="launch" ready={ready} fontsLoaded={fontsLoaded} onDone={() => setLaunchDone(true)} />
  );

  if (!ready) {
    return (
      <>
        <View style={{ flex: 1, backgroundColor: colors.bg }} />
        {launch}
      </>
    );
  }

  if (__DEV__ && showPreview) {
    // Loaded lazily so release bundles don't evaluate the dev gallery
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DevPreview } = require('../dev/DevPreview');
    return (
      <>
        <DevPreview />
        {launch}
      </>
    );
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
          <Stack.Screen name="circles" />
          <Stack.Screen name="blocked" />
          <Stack.Screen name="memories" />
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
        {/* Public: also reachable before signing in and on the web. Listed
            last: when the start route is guarded, the router falls back to
            the first allowed screen, which must be onboarding, not these. */}
        <Stack.Screen name="datenschutz" />
        <Stack.Screen name="impressum" />
        <Stack.Screen name="einladung" />
      </Stack>
      {signedIn && <NotificationRouter />}
      {signedIn && !needsProfileSetup && <InAppBanner />}
      {launch}
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
