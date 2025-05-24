// ✅ AuthContext.tsx (unter /contexts)
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

type AuthContextType = {
    userPhone: string | null;
    setUserPhone: (phone: string | null) => void;
};

const AuthContext = createContext<AuthContextType>({
    userPhone: null,
    setUserPhone: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userPhone, setUserPhone] = useState<string | null>(null);

    useEffect(() => {
        SecureStore.getItemAsync('userPhone').then(setUserPhone);
    }, []);

    return (
        <AuthContext.Provider value={{ userPhone, setUserPhone }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
