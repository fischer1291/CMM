import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AppBanner } from '../contexts/AppConfigContext';
import { AppText, colors, radius, spacing } from '../ui';

const DISMISSED_KEY = 'noticeBannerDismissed';

/** The admin's notice (e.g. maintenance). Hidden once closed, until the text changes. */
export function NoticeBanner({ banner }: { banner: AppBanner | null }) {
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then(setDismissed)
      .catch(() => setDismissed(null));
  }, []);

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
