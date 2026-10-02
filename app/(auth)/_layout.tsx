// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
  const { pendingPhone } = useAuth();

  return (
    // Re-verification after the token-auth update goes straight to the SMS step
    <Stack initialRouteName={pendingPhone ? 'verify' : 'onboarding'} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="verify" />
      {/* "Ist das dein Konto?" for a recycled number (plan 2.9) */}
      <Stack.Screen name="account-check" />
    </Stack>
  );
}
