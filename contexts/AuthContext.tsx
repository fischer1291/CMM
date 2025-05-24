// contexts/AuthContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  userPhone: string | null;
  isLoading: boolean;
  setUserPhone: (phone: string | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  userPhone: null,
  isLoading: true,
  setUserPhone: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userPhone, setUserPhoneState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('userPhone')
      .then((stored) => {
        setUserPhoneState(stored || null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setUserPhone = useCallback(async (phone: string | null) => {
    if (phone) {
      await SecureStore.setItemAsync('userPhone', phone);
      setUserPhoneState(phone);
    } else {
      await SecureStore.deleteItemAsync('userPhone');
      setUserPhoneState(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userPhone, isLoading, setUserPhone }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);