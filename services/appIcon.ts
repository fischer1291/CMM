/**
 * Alternate app icons (Wanna yap+). The icon sets live in the iOS asset
 * catalog (docs/brand/icons.js); builds without the native module simply
 * don't offer the choice.
 */
import type { ImageSourcePropType } from 'react-native';

let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-alternate-app-icons');
} catch {
  mod = null;
}

export type AppIconOption = { id: string | null; name: string; preview: ImageSourcePropType };

export const APP_ICONS: AppIconOption[] = [
  { id: null, name: 'Standard', preview: require('../assets/images/icon.png') },
  { id: 'AppIcon-Sunset', name: 'Sunset', preview: require('../assets/images/icons/sunset.png') },
  { id: 'AppIcon-Ocean', name: 'Ocean', preview: require('../assets/images/icons/ocean.png') },
  { id: 'AppIcon-Lilac', name: 'Lilac', preview: require('../assets/images/icons/lilac.png') },
  { id: 'AppIcon-Mono', name: 'Mono', preview: require('../assets/images/icons/mono.png') },
];

export const iconsSupported = (): boolean => !!mod?.supportsAlternateIcons;

export function currentIcon(): string | null {
  try {
    return mod?.getAppIconName?.() ?? null;
  } catch {
    return null;
  }
}

export async function setIcon(id: string | null): Promise<void> {
  if (!mod) throw new Error('unsupported');
  await mod.setAlternateAppIcon(id);
}
