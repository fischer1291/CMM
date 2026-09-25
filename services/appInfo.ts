/**
 * This build's version, sent with every request (support and the admin's
 * version overview) and compared with the minimum version from /app-config.
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export const APP_VERSION = Application.nativeApplicationVersion ?? '0.0.0';
export const APP_BUILD = Application.nativeBuildVersion ?? '0';

export const appHeaders: Record<string, string> = {
  'X-App-Version': APP_VERSION,
  'X-App-Build': APP_BUILD,
  'X-Platform': Platform.OS,
  'X-OS-Version': String(Platform.Version),
};

export const appInfo = { version: APP_VERSION, build: APP_BUILD, platform: Platform.OS, os: String(Platform.Version) };

/** -1, 0 or 1 for "1.2.3"-style versions. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Is this build older than what the server requires? */
export function isOutdated(config: { minVersion: string | null; minBuild: number | null }): boolean {
  if (config.minVersion && compareVersions(APP_VERSION, config.minVersion) < 0) return true;
  if (config.minBuild && (parseInt(APP_BUILD, 10) || 0) < config.minBuild) return true;
  return false;
}
