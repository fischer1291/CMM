// contexts/AuthContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  setUserPhone: (phone: string | null) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  reloadProfile: () => void;
};

const AuthContext = createContext<AuthContextType>({
  userPhone: null,
  userProfile: null,
  isLoading: true,
  isProfileLoading: false,
  setUserPhone: () => {},
  updateUserProfile: () => {},
  reloadProfile: () => {},
});

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userPhone, setUserPhoneState] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Load user profile from backend
  const loadProfile = useCallback(async (phone: string) => {
    setIsProfileLoading(true);
    try {
      const response = await fetch(`${baseUrl}/me?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        const profile: UserProfile = {
          name: data.user.name || '',
          avatarUrl: data.user.avatarUrl || '',
          lastOnline: data.user.lastOnline || '',
          momentActiveUntil: data.user.momentActiveUntil || null,
        };
        setUserProfile(profile);
      } else {
        // Create empty profile if none exists
        setUserProfile({
          name: '',
          avatarUrl: '',
          lastOnline: '',
          momentActiveUntil: null,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Create empty profile on error
      setUserProfile({
        name: '',
        avatarUrl: '',
        lastOnline: '',
        momentActiveUntil: null,
      });
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  // Update user profile
  const updateUserProfile = useCallback(async (profileUpdate: Partial<UserProfile>) => {
    if (!userPhone) {
      throw new Error('No user phone available');
    }

    setIsProfileLoading(true);
    try {
      const response = await fetch(`${baseUrl}/me/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: userPhone,
          ...profileUpdate,
        }),
      });

      if (response.ok) {
        // Update was successful, update local state optimistically
        setUserProfile(prev => prev ? { ...prev, ...profileUpdate } : null);
        
        // Also reload the profile to get the latest data from server
        loadProfile(userPhone);
      } else {
        // Try to parse error response, but handle cases where it's not JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        } catch (parseError) {
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error; // Re-throw so the calling component can handle it
    } finally {
      setIsProfileLoading(false);
    }
  }, [userPhone]);

  // Reload profile
  const reloadProfile = useCallback(() => {
    if (userPhone) {
      loadProfile(userPhone);
    }
  }, [userPhone, loadProfile]);

  // Load stored phone number on startup
  useEffect(() => {
    SecureStore.getItemAsync('userPhone')
      .then((stored) => {
        setUserPhoneState(stored || null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Load profile when phone number changes
  useEffect(() => {
    if (userPhone) {
      loadProfile(userPhone);
    } else {
      setUserProfile(null);
    }
  }, [userPhone, loadProfile]);

  const setUserPhone = useCallback(async (phone: string | null) => {
    if (phone) {
      await SecureStore.setItemAsync('userPhone', phone);
      setUserPhoneState(phone);
    } else {
      await SecureStore.deleteItemAsync('userPhone');
      setUserPhoneState(null);
      setUserProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        userPhone, 
        userProfile, 
        isLoading, 
        isProfileLoading,
        setUserPhone, 
        updateUserProfile,
        reloadProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);