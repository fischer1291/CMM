/**
 * Minimum version, notice banner and feature flags from /app-config. Read on
 * start and whenever the app comes back to the foreground; open apps also get
 * changes live over the socket.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../config/env';
import { socket } from '../services/socket';
import { appHeaders, isOutdated } from '../services/appInfo';
import { fetchWithTimeout } from '../utils/apiUtils';

export type AppBanner = { text: string; level: 'info' | 'warning'; until: string | null };
export type AppConfig = {
  minVersion: string | null;
  minBuild: number | null;
  updateUrl: string | null;
  banner: AppBanner | null;
  flags: Record<string, boolean>;
};

const EMPTY: AppConfig = { minVersion: null, minBuild: null, updateUrl: null, banner: null, flags: {} };

type Value = { config: AppConfig; outdated: boolean; flag: (key: string) => boolean };
const AppConfigContext = createContext<Value>({ config: EMPTY, outdated: false, flag: () => false });

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/app-config`, { headers: appHeaders }, 8000);
      const data = await res.json();
      if (data?.success) setConfig({ ...EMPTY, ...data, flags: data.flags || {} });
    } catch {
      // Offline: keep what we had
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load());
    const onLive = (data: AppConfig) => setConfig({ ...EMPTY, ...data, flags: data.flags || {} });
    socket.on('appConfig', onLive);
    return () => {
      sub.remove();
      socket.off('appConfig', onLive);
    };
  }, [load]);

  const flag = useCallback((key: string) => !!config.flags[key], [config.flags]);
  return <AppConfigContext.Provider value={{ config, outdated: isOutdated(config), flag }}>{children}</AppConfigContext.Provider>;
}

export const useAppConfig = () => useContext(AppConfigContext);
