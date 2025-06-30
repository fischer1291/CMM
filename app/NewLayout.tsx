/**
 * NewLayout - Simplified layout using new call system
 * Replaces the complex _layout.tsx
 */
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
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

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {userPhone ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      
      {/* Show incoming call screen for incoming calls only */}
      {isIncomingCall && activeCall && (
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

export default function NewRootLayout() {
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