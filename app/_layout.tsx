// app/_layout.tsx
import { Stack, useNavigation } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CallProvider, useCall } from '../contexts/CallContext';
import IncomingCallModal from './components/IncomingCallModal';

function InnerLayout() {
  const { userPhone, isLoading } = useAuth();
  const { incomingCall, callerPhoneNumber, acceptCall, declineCall } = useCall();
  const navigation = useNavigation();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {userPhone ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <IncomingCallModal
        visible={incomingCall}
        callerPhone={callerPhoneNumber || 'Unbekannt'}
        onAccept={() => acceptCall(navigation)}
        onDecline={declineCall}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CallProvider>
        <InnerLayout />
      </CallProvider>
    </AuthProvider>
  );
}