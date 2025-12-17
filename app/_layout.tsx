/**
 * app/_layout.tsx - Modern calling system with native CallKit (iOS) / custom UI (Android)
 * WhatsApp-style implementation: Pure native on iOS, custom overlay on Android
 */
import { Stack } from 'expo-router';
import { ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NewCallProvider, useNewCall } from '../contexts/NewCallContext';
import IncomingCallScreen from '../components/IncomingCallScreen';
import { resolveContact } from '../utils/contactResolver';

function InnerLayout() {
  const { userPhone, isLoading } = useAuth();
  const { activeCall, answerCall, declineCall } = useNewCall();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isIncomingCall = activeCall?.callState === 'incoming';

  // On iOS, CallKit handles the native UI - don't show custom overlay
  // On Android, show custom IncomingCallScreen
  const shouldShowCustomCallScreen = isIncomingCall && Platform.OS === 'android';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {userPhone ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>

      {/* Show custom incoming call screen on Android only (iOS uses native CallKit) */}
      {shouldShowCustomCallScreen && activeCall && (
        <IncomingCallScreen
          visible={true}
          callerName={activeCall.callerName || resolveContact(activeCall.callerPhone).name}
          callerPhone={activeCall.callerPhone}
          callerAvatar={resolveContact(activeCall.callerPhone).avatarUrl}
          onAnswer={answerCall}
          onDecline={declineCall}
        />
      )}
    </>
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