import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AppBanner } from '../contexts/AppConfigContext';
import { AppText, colors, radius, spacing } from '../ui';

const DISMISSED_KEY = 'noticeBannerDismissed';

/**
 * Whether a closed banner is forgotten: a real config (loaded from
 * /app-config or live over the socket, never the empty start value) shows a
 * different banner or none at all. Outage banners from alerts (plan 2.15)
 * reuse the same text each time, so a line closed during one outage must
 * show again at the next. This also holds after a cold start: the first
 * successful load without that banner clears the stored dismissal, even if
 * the app never saw the banner end.
 */
export const forgetsDismissal = (dismissed: string | null | undefined, current: string | null | undefined, loaded: boolean) =>
  loaded && !!dismissed && dismissed !== (current || null);

/**
 * The admin's notice (e.g. maintenance) or an outage banner from an alert.
 * Hidden once closed, until a loaded config shows another banner or none.
 * loaded comes from AppConfigContext; without it (previews) a dismissal stays.
 */
export function NoticeBanner({ banner, loaded = false }: { banner: AppBanner | null; loaded?: boolean }) {
  // undefined until AsyncStorage answered, so a stored dismissal is never raced
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then(setDismissed)
      .catch(() => setDismissed(null));
  }, []);
  const text = banner?.text || null;
  useEffect(() => {
    if (forgetsDismissal(dismissed, text, loaded)) {
      setDismissed(null);
      AsyncStorage.removeItem(DISMISSED_KEY).catch(() => {});
    }
  }, [dismissed, text, loaded]);

  if (!banner || dismissed === undefined || dismissed === banner.text) return null;
  const warning = banner.level === 'warning';
  const accent = warning ? colors.warning : colors.cyan;
  return (
    <View style={[styles.box, { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]} accessibilityRole="alert">
      <Ionicons name={warning ? 'warning' : 'information-circle'} size={20} color={accent} />
      <AppText variant="caption" style={{ flex: 1 }}>
        {banner.text}
      </AppText>
      <Pressable
        onPress={() => {
          setDismissed(banner.text);
          AsyncStorage.setItem(DISMISSED_KEY, banner.text).catch(() => {});
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Hinweis ausblenden"
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
});
