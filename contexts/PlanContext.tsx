/**
 * The user's Wanna yap+ plan: limits for hints in the app (the server enforces
 * them), refreshed on start, when the app comes back and on planChanged.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { fetchPlan, Plan } from '../services/planApi';
import { configurePurchases } from '../services/purchases';
import { socket } from '../services/socket';

type Value = { plan: Plan | null; isPlus: boolean; refresh: () => Promise<void> };
const PlanContext = createContext<Value>({ plan: null, isPlus: false, refresh: async () => {} });

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { userPhone } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);

  const refresh = useCallback(async () => {
    if (!userPhone) return;
    try {
      const next = await fetchPlan();
      setPlan(next);
      configurePurchases(next.userId).catch(() => {});
    } catch {
      // keep the last known plan
    }
  }, [userPhone]);

  useEffect(() => {
    if (!userPhone) {
      setPlan(null);
      return;
    }
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const onChanged = () => refresh();
    socket.on('planChanged', onChanged);
    return () => {
      sub.remove();
      socket.off('planChanged', onChanged);
    };
  }, [userPhone, refresh]);

  return <PlanContext.Provider value={{ plan, isPlus: plan?.plan === 'plus', refresh }}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
