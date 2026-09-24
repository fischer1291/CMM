// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import PushTokenService from '../services/PushTokenService';
import { session } from '../services/session';
import { apiFetch, apiPostJson } from '../utils/api';

export type UserProfile = {
  name: string;
  avatarUrl: string;
  lastOnline: string;
  momentActiveUntil: string | null;
};

type AuthContextType = {
  userPhone: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  /**
   * Set when a login from before token auth must be confirmed by SMS once.
   * The user is signed out and the verify screen is prefilled with it.
   */
  pendingPhone: string | null;
  /** New user who still has to set up name/avatar (shown before the tabs). */
  needsProfileSetup: boolean;
  signIn: (phone: string, token: string | null, options?: { needsProfileSetup?: boolean }) => Promise<void>;
  completeProfileSetup: () => void;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  reloadProfile: () => void;
};

const AuthContext = createContext<AuthContextType>({
  userPhone: null,
  userProfile: null,
  isLoading: true,
  isProfileLoading: false,
  pendingPhone: null,
  needsProfileSetup: false,
  signIn: async () => {},
  completeProfileSetup: () => {},
  signOut: async () => {},
  updateUserProfile: async () => {},
  reloadProfile: () => {},
});

// Readable while the device is locked (after the first unlock since boot), so a
// VoIP push that wakes the app on the lock screen still finds the logged-in user.
const KEYCHAIN_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

// Accessibility is only applied when an item is created, so delete first.
async function storeSecure(key: string, value: string | null) {
  await SecureStore.deleteItemAsync(key);
  if (value) await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
}

const EMPTY_PROFILE: UserProfile = { name: '', avatarUrl: '', lastOnline: '', momentActiveUntil: null };

/** True when the backend issues tokens, so a token-less login must be re-verified. */
async function backendRequiresTokens(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/push-health', {}, 8000);
    const data = await res.json();
    return data?.authConfigured === true;
  } catch {
    return false; // offline: keep the user signed in
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userPhone, setUserPhoneState] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  // loadProfile reads the phone through a ref so it stays stable
  const userPhoneRef = useRef<string | null>(null);
  userPhoneRef.current = userPhone;

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    try {
      const phone = userPhoneRef.current;
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const response = await apiFetch(`/me${query}`, {}, 10000);
      const data = await response.json();
      setUserProfile(
        data.success && data.user
          ? {
              name: data.user.name || '',
              avatarUrl: data.user.avatarUrl || '',
              lastOnline: data.user.lastOnline || '',
              momentActiveUntil: data.user.momentActiveUntil || null,
            }
          : EMPTY_PROFILE
      );
    } catch (error) {
      console.error('Failed to load profile:', error);
      setUserProfile(EMPTY_PROFILE);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(
    async (profileUpdate: Partial<UserProfile>) => {
      if (!userPhone) {
        throw new Error('No user phone available');
      }

      setIsProfileLoading(true);
      try {
        // phone is only read by backends without token auth
        const response = await apiPostJson('/me/update', { phone: userPhone, ...profileUpdate }, 10000);
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Server error: ${response.status}`);
        }
        setUserProfile((prev) => (prev ? { ...prev, ...profileUpdate } : null));
        loadProfile();
      } finally {
        setIsProfileLoading(false);
      }
    },
    [userPhone, loadProfile]
  );

  const reloadProfile = useCallback(() => {
    if (userPhone) loadProfile();
  }, [userPhone, loadProfile]);

  const signOut = useCallback(async (options?: { tokenRejected?: boolean }) => {
    // While the auth token still works: this device stops getting pushes/calls.
    // Skipped when the server just rejected the token (it would fail again).
    if (session.getToken() && !options?.tokenRejected) await PushTokenService.unregister();
    session.setToken(null);
    await storeSecure('authToken', null);
    await storeSecure('userPhone', null);
    setUserPhoneState(null);
    setUserProfile(null);
    setNeedsProfileSetup(false);
  }, []);

  const completeProfileSetup = useCallback(() => setNeedsProfileSetup(false), []);

  const signIn = useCallback(
    async (phone: string, token: string | null, options?: { needsProfileSetup?: boolean }) => {
      session.setToken(token);
      await storeSecure('authToken', token);
      await storeSecure('userPhone', phone);
      await AsyncStorage.setItem('userPhoneKeychainMigrated', '1');
      setPendingPhone(null);
      setNeedsProfileSetup(!!options?.needsProfileSetup);
      setUserPhoneState(phone);
      // Only if already allowed; the app asks later, with an explanation
      PushTokenService.register(phone);
    },
    []
  );

  // A rejected token (expired/revoked) signs the user out
  useEffect(() => {
    session.onUnauthorized(() => {
      signOut({ tokenRejected: true });
    });
    return () => session.onUnauthorized(null);
  }, [signOut]);

  // Restore the session on startup
  useEffect(() => {
    (async () => {
      try {
        const [storedPhone, storedToken] = await Promise.all([
          SecureStore.getItemAsync('userPhone'),
          SecureStore.getItemAsync('authToken'),
        ]);
        if (!storedPhone) return;

        if (!storedToken && (await backendRequiresTokens())) {
          // Logged in before token auth existed: confirm the number once by SMS
          setPendingPhone(storedPhone);
          return;
        }

        // Migrate items saved before KEYCHAIN_OPTIONS existed
        if (!(await AsyncStorage.getItem('userPhoneKeychainMigrated'))) {
          await storeSecure('userPhone', storedPhone).catch(() => {});
          await AsyncStorage.setItem('userPhoneKeychainMigrated', '1');
        }

        session.setToken(storedToken);
        setUserPhoneState(storedPhone);
        PushTokenService.register(storedPhone);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (userPhone) {
      loadProfile();
    } else {
      setUserProfile(null);
    }
  }, [userPhone, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        userPhone,
        userProfile,
        isLoading,
        isProfileLoading,
        pendingPhone,
        needsProfileSetup,
        signIn,
        completeProfileSetup,
        signOut,
        updateUserProfile,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
